import datetime
from typing import Dict

from bson import ObjectId
from pymongo.database import Database


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
