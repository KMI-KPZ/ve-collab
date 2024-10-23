import datetime
from typing import Dict, List

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.database import Database

from exceptions import NotificationDoesntExistError
import global_vars
import util


class NotificationResource:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            planner = NotificationResource(db)
            ...

    """

    def __init__(self, db: Database) -> None:
        self.db = db

    async def send_notification(
        self, recipient: str, notification_type: str, payload: Dict
    ) -> None:
        """
        Dispatch a notification to the user given as `recipient` (username),
        by specifying the `notification_type` and the `payload` that
        represents the body of the notification.

        Both type and payload can be an arbitrary str, respectively an arbitrary dict,
        as long as the recipient is able the understand the content and react
        accordingly. The notification feature itself does not enforce any format or content.

        If the recipient user is currently "online" (i.e. has an open and authenticated
        socket connection) the notification is dispatched immediately via the socketio event
        "notification". Otherwise the notification is held back until the user is online
        the next time, when all notifications that appeared while he/she was offline
        will be sent (see `handlers.socket_io.authenticate` for further information).

        Notifications are expected to be acknowledged by the recipients, otherwise
        they will always be re-sent. See details in
        `handlers.socket_io.acknowledge_notification` on how to send appropriate
        acknowledgements to notifications.
        """

        notification_payload = {
            "_id": ObjectId(),
            "type": notification_type,
            "to": recipient,
            "receive_state": "pending",
            "creation_timestamp": datetime.datetime.now(),
            "payload": payload,
        }

        # i really don't know why, but top level import crashes the socketio server...
        from handlers.socket_io import emit_event, get_sid_of_user, recipient_online

        # if recipient of the invitation is currently "online" (i.e. connected via socket),
        # emit the notification instantly, otherwise it will be held back until
        # until the user connects the next time
        if recipient_online(recipient):
            user_sid = get_sid_of_user(recipient)
            if user_sid is not None:
                await emit_event("notification", notification_payload, user_sid)

                # store notification as "sent", because user was online
                # and notification is already dispatched
                notification_payload["receive_state"] = "sent"

        # store notification, either as "pending" or "sent",
        # depending on if the user was currently online or not.
        # once the client sends the appropriate acknowledgement event,
        # the receive_state will be changed to "acknowledged" by the
        # responsible event handler
        self.db.notifications.insert_one(notification_payload)

    async def bulk_send_notifications(
        self, notification_type: str, payload: Dict
    ) -> None:
        """
        Dispatch a notification to ALL(!) users,
        by specifying the `notification_type` and the `payload` that
        represents the body of the notification.

        Both type and payload can be an arbitrary str, respectively an arbitrary dict,
        as long as the recipient is able the understand the content and react
        accordingly. The notification feature itself does not enforce any format or content.

        If the recipient user is currently "online" (i.e. has an open and authenticated
        socket connection) the notification is dispatched immediately via the socketio event
        "notification". Otherwise the notification is held back until the user is online
        the next time, when all notifications that appeared while he/she was offline
        will be sent (see `handlers.socket_io.authenticate` for further information).

        Notifications are expected to be acknowledged by the recipients, otherwise
        they will always be re-sent. See details in
        `handlers.socket_io.acknowledge_notification` on how to send appropriate
        acknowledgements to notifications.
        """

        # i really don't know why, but top level import crashes the socketio server...
        from handlers.socket_io import emit_event, get_sid_of_user, recipient_online

        all_users = [
            user["username"]
            for user in global_vars.keycloak_admin.get_users()
        ]

        for recipient in all_users:
            notification_payload = {
                "_id": ObjectId(),
                "type": notification_type,
                "to": recipient,
                "receive_state": "pending",
                "creation_timestamp": datetime.datetime.now(),
                "payload": payload,
            }

            # if recipient of the invitation is currently "online" (i.e. connected via socket),
            # emit the notification instantly, otherwise it will be held back until
            # until the user connects the next time
            if recipient_online(recipient):
                user_sid = get_sid_of_user(recipient)
                if user_sid is not None:
                    await emit_event("notification", notification_payload, user_sid)

                    # store notification as "sent", because user was online
                    # and notification is already dispatched
                    notification_payload["receive_state"] = "sent"

            # store notification, either as "pending" or "sent",
            # depending on if the user was currently online or not.
            # once the client sends the appropriate acknowledgement event,
            # the receive_state will be changed to "acknowledged" by the
            # responsible event handler
            self.db.notifications.insert_one(notification_payload)

    def acknowledge_notification(self, notification_id: str | ObjectId) -> None:
        """
        Acknowledge a notification, causing it not to be sent again
        when the recipient user logs in.

        Returns nothing.

        Raises `NotificationDoesntExistError` if no notification with the specified
        _id exists.
        """

        try:
            notification_id = util.parse_object_id(notification_id)
        except InvalidId:
            raise NotificationDoesntExistError()

        result = self.db.notifications.update_one(
            {"_id": notification_id}, {"$set": {"receive_state": "acknowledged"}}
        )

        if result.matched_count == 0:
            raise NotificationDoesntExistError()

    def bulk_set_send_state(self, notification_ids: List[str | ObjectId]) -> None:
        """
        Set the `receive_state` attribute of all notifications specified by their _id's
        in `notification_ids` to "sent", signifying that they have been atleast
        delivered once to the user (but not yet acknowledged).

        The ids in the `notification_ids` list can either be of type `ObjectId` or
        their corresponding `str`-representations.

        Returns nothing.
        """

        for _id in notification_ids:
            try:
                _id = util.parse_object_id(_id)
            except InvalidId:
                pass

        self.db.notifications.update_many(
            {"_id": {"$in": notification_ids}}, {"$set": {"receive_state": "sent"}}
        )

    def get_unacknowledged_notifications_for_user(self, username: str) -> List[Dict]:
        """
        get all notifications for the user specified by its `username` that
        are not yet acknowledged, i.e. those that are "pending", because the
        user was not yet online again since they appeared; or those that have
        already been "sent" to him/her before, but are not yet acknowledged.

        Returns a list of dicts containing the notifications, or an empty list,
        if there are no new notifications available.
        """

        return list(
            self.db.notifications.find(
                {
                    "to": username,
                    "receive_state": {"$ne": "acknowledged"},
                }
            )
        )

    def get_notification_recipient(self, notification_id: str | ObjectId) -> str:
        """
        Request the recipient of the notification that is given by its _id as
        `notification_id`. It can either be of type `ObjectId` or a corresponding
        `str`-representation.

        Returns the notification's recipient as a `str`.

        Raises `NotificationDoesntExistError` if no notification with
        such a _id exists.
        """

        try:
            notification_id = util.parse_object_id(notification_id)
        except InvalidId:
            raise NotificationDoesntExistError()

        notification = self.db.notifications.find_one(
            {"_id": notification_id}, projection={"to": True}
        )

        if notification:
            return notification["to"]
        else:
            raise NotificationDoesntExistError()


async def periodic_notification_dispatch(
    periodic_notification_type: str, payload: Dict
) -> None:
    with util.get_mongodb() as db:
        notification_resource = NotificationResource(db)

        # dispatch the notification to all users
        await notification_resource.bulk_send_notifications(
            periodic_notification_type, payload
        )
