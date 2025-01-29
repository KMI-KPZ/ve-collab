import datetime
from typing import Dict, List

from bson import ObjectId
from bson.errors import InvalidId
import logging
from pymongo.database import Database

from exceptions import NotificationDoesntExistError
import global_vars
from resources.network.chat import Chat
from resources.network.profile import Profiles
import util

logger = logging.getLogger(__name__)


class NotificationResource:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            planner = NotificationResource(db)
            ...

    """

    def __init__(self, db: Database) -> None:
        self.db = db

        self.allowed_notification_types = [
            "new_messages",
            "space_join_request",
            "space_invitation",
            "ve_invitation",
            "ve_invitation_reply",
            "reminder_evaluation",
            "reminder_good_practise_examples",
            "reminder_icebreaker",
            "achievement_level_up",
            "plan_access_granted",
            "plan_added_as_partner"
        ]

        # mapping of notification types to the profile settings
        # that have to be obeyed
        self.notification_type_setting_mapper = {
            "new_messages": "messages",
            "space_join_request": "group_invite",
            "space_invitation": "group_invite",
            "ve_invitation": "ve_invite",
            "ve_invitation_reply": "ve_invite",
            "reminder_evaluation": "system",
            "reminder_good_practise_examples": "system",
            "reminder_icebreaker": "system",
            "achievement_level_up": "system",
            "plan_access_granted": "system",
            "plan_added_as_partner": "system"
        }

        # mapping of notification types to the email templates
        self.notification_type_template_mapper = {
            "new_messages": "new_messages.html",
            "space_join_request": "space_join_request.html",
            "space_invitation": "space_invitation.html",
            "ve_invitation": "ve_invitation.html",
            "ve_invitation_reply": "ve_invitation_reply.html",
            "reminder_evaluation": "reminder_evaluation.html",
            "reminder_good_practise_examples": "reminder_good_practise_examples.html",
            "reminder_icebreaker": "reminder_icebreaker.html",
            "achievement_level_up": "achievement_level_up.html",
            "plan_access_granted": "plan_access_granted.html",
            "plan_added_as_partner": "plan_added_as_partner.html"
        }

    async def send_notification(
        self, recipient: str, notification_type: str, payload: Dict
    ) -> None:
        """
        Dispatch a notification to the user given as `recipient` (username),
        by specifying the `notification_type` and the `payload` that
        represents the body of the notification.

        These notifications obey the rules the recipient user has set in their profile,
        i.e. if they want to receive notifications of this type via email and push, push only
        or not at all.

        Payload can be an arbitrary Dict, as long as the recipient is able to
        understand the content and react accordingly. The notification feature
        itself does not enforce any format or content.

        If the user has complied to push notifications:
        If the recipient user is currently "online" (i.e. has an open and authenticated
        socket connection) the notification is dispatched immediately via the socketio event
        "notification". Otherwise the notification is held back until the user is online
        the next time, when all notifications that appeared while he/she was offline
        will be sent (see `handlers.socket_io.authenticate` for further information).

        Notifications are expected to be acknowledged by the recipients, otherwise
        they will always be re-sent (only applicable to push-notifications). See details in
        `handlers.socket_io.acknowledge_notification` on how to send appropriate
        acknowledgements to notifications.

        Email notifications are sent instantly, if the user has complied to receive them.

        Returns nothing.

        Raises `ValueError` if the `notification_type` is not allowed.
        """

        # check if the notification type is allowed
        if notification_type not in self.allowed_notification_types:
            raise ValueError(
                "Notification type '{}' is not allowed.Allowed types are: {}".format(
                    notification_type, self.allowed_notification_types
                )
            )

        # determin user settings for notifications
        profile_manager = Profiles(self.db)
        notification_setting = profile_manager.get_notification_setting(
            recipient, self.notification_type_setting_mapper[notification_type]
        )

        # user doesn't want to receive any notifications of this type
        if notification_setting == "none":
            return
        # user wants to receive notifications of this type via push only
        elif notification_setting == "push":
            await self._notify_push(recipient, notification_type, payload)
        # user wants to receive notifications of this type via email and push
        elif notification_setting == "email":
            await self._notify_push(recipient, notification_type, payload)
            try:
                self._notify_email(recipient, notification_type, payload, None)
            except Exception as e:
                raise e

    async def _notify_push(
        self, recipient: str, notification_type: str, payload: Dict
    ) -> None:
        """
        helper function to dispatch a notification to the user given as `recipient` (username)
        via the internal platform push notification system.
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

    def _notify_email(
        self,
        recipient: str,
        notification_type: str,
        payload: Dict,
        email_subject: str | None,
    ) -> None:
        """
        helper function to dispatch a notification to the user given as `recipient` (username)
        via email
        """

        user_id = global_vars.keycloak_admin.get_user_id(recipient)
        recipient_email = global_vars.keycloak_admin.get_user(user_id)["email"]

        util.send_email(
            recipient,
            recipient_email,
            email_subject,
            self.notification_type_template_mapper[notification_type],
            payload,
        )

    async def bulk_send_notifications(
        self, notification_type: str, payload: Dict, email_subject: str
    ) -> None:
        """
        Dispatch a notification to ALL(!) users,
        by specifying the `notification_type` and the `payload` that
        represents the body of the notification.

        These notifications obey the rules the recipient user has set in their profile,
        i.e. if they want to receive notifications of this type via email and push, push only
        or not at all.

        Payload can be an arbitrary dict, as long as the recipient is able to
        understand the content and react accordingly. The notification feature
        itself does not enforce any format or content.

        Optionally, an `email_subject` can be specified, which will be used as the
        subject of the email notification. If `None` is passed, a generic default will
        be used.

        If the user has complied to push notifications:
        If the recipient user is currently "online" (i.e. has an open and authenticated
        socket connection) the notification is dispatched immediately via the socketio event
        "notification". Otherwise the notification is held back until the user is online
        the next time, when all notifications that appeared while he/she was offline
        will be sent (see `handlers.socket_io.authenticate` for further information).

        Notifications are expected to be acknowledged by the recipients, otherwise
        they will always be re-sent. See details in
        `handlers.socket_io.acknowledge_notification` on how to send appropriate
        acknowledgements to notifications.

        Email notifications are sent instantly, if the user has complied to receive them.

        Returns nothing.

        Raises `ValueError` if the `notification_type` is not allowed.
        """

        # check if the notification type is allowed
        if notification_type not in self.allowed_notification_types:
            raise ValueError(
                "Notification type '{}' is not allowed.Allowed types are: {}".format(
                    notification_type, self.allowed_notification_types
                )
            )

        # grab users and their notification settings
        all_users_notification_settings = Profiles(self.db).get_all_profiles(
            projection={"username": True, "notification_settings": True}
        )

        # determine relevant notification settings for the notification type
        notification_setting = self.notification_type_setting_mapper[notification_type]

        # dispatch the notification to each user, respecting their notification settings
        for recipient in all_users_notification_settings:
            # no notifications at all
            if recipient["notification_settings"][notification_setting] == "none":
                return
            # push only
            elif recipient["notification_settings"][notification_setting] == "push":
                await self._notify_push(
                    recipient["username"], notification_type, payload
                )
            # email and push
            elif recipient["notification_settings"][notification_setting] == "email":
                await self._notify_push(
                    recipient["username"], notification_type, payload
                )
                try:
                    self._notify_email(
                        recipient["username"], notification_type, payload, email_subject
                    )
                except Exception as e:
                    logger.error(e)

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
    periodic_notification_type: str, payload: Dict, email_subject: str
) -> None:
    with util.get_mongodb() as db:
        notification_resource = NotificationResource(db)

        # dispatch the notification to all users
        await notification_resource.bulk_send_notifications(
            periodic_notification_type, payload, email_subject
        )


def new_message_mail_notification_dispatch() -> None:
    """
    determine all users that have received new messages within the last 24 hours
    that they haven't read yet, and send them an email notification about it
    (if user has complied to email notifications).
    """

    with util.get_mongodb() as db:
        chat_manager = Chat(db)

        # list of unread rooms and messages within the last 24 hours
        rooms_with_unread_msg = chat_manager.get_rooms_with_unacknowledged_messages()
        from pprint import pprint

        # for each user, count the number of unread messages and rooms with unread messages
        username_to_unread_msg_count = {}
        for room in rooms_with_unread_msg:
            for message in room["messages"]:
                for send_state in message["send_states"]:
                    if send_state["send_state"] != "acknowledged":
                        if send_state["username"] in username_to_unread_msg_count:
                            username_to_unread_msg_count[send_state["username"]][
                                "messages"
                            ] += 1
                            username_to_unread_msg_count[send_state["username"]][
                                "rooms"
                            ].add(room["_id"])
                        else:
                            username_to_unread_msg_count[send_state["username"]] = {
                                "messages": 1,
                                "rooms": set([room["_id"]]),
                            }

        # send email notifications to users
        notification_resounce = NotificationResource(db)
        profile_manager = Profiles(db)
        for username, unread_count in username_to_unread_msg_count.items():
            # skip the user if he/she doesn't want to receive email notifications
            if (
                profile_manager.get_notification_setting(username, "messages")
                != "email"
            ):
                continue

            email_payload = {
                "unread_messages_amount": unread_count["messages"],
                "unread_rooms_amount": len(unread_count["rooms"]),
            }
            notification_resounce._notify_email(
                username, "new_messages", email_payload, "neue Nachricht(en)"
            )
