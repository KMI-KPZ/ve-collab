import datetime
import json

from bson import ObjectId

from error_reasons import INSUFFICIENT_PERMISSIONS, MISSING_KEY_IN_HTTP_BODY_SLUG
import global_vars
from handlers.base_handler import BaseHandler, auth_needed
from resources.planner.ve_plan import VEPlanResource
import util


class VeInvitationHandler(BaseHandler):
    @auth_needed
    def get(self):
        pass

    @auth_needed
    async def post(self):
        """
        POST /ve_invitation
            Send a new VE invitation to a user.

            If the recipient is currently "online" (i.e. has an open and
            authenticated socket connection), a notification is instantly
            dispatched to him/her. Otherwise, the invitation is stored
            and sent to the user whenever he/she comes online.

            If a plan is attached to the invitation (by specifying a non-null
            `plan_id` in the body), read access to this particular plan is
            automatically granted to the recipient user.

            HTTP Body:
                {
                    "message" "<invitation_message>",
                    "plan_id": "<_id_of_attached_plan_or_null>",
                    "username": "<username_to_be_invited>"
                }

            returns:
                200 OK
                {"success": True}

                400 Bad Request
                (the http body does not contain valid json)
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                (the http body misses a required key, either message, plan_id or
                 username)
                {"success": False,
                 "reason": "missing_key_in_http_body:<missing_key>"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you are not the author of the attached plan)
                {"success": False,
                 "reason": "insufficient_permissions"}
        """
        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": "json_parsing_error"})
            return

        if "message" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "success": False,
                    "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "message",
                }
            )
            return
        if "plan_id" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "success": False,
                    "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "plan_id",
                }
            )
            return
        if "username" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "success": False,
                    "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "username",
                }
            )
            return

        with util.get_mongodb() as db:
            # give user read access to plan
            if http_body["plan_id"] is not None:
                plan_manager = VEPlanResource(db)

                # reject if the user is not the author of the plan --> cannot
                # set read permissions
                if not plan_manager._check_user_is_author(
                    http_body["plan_id"], self.current_user.username
                ):
                    self.set_status(403)
                    self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                    return

                plan_manager.set_read_permissions(
                    http_body["plan_id"], http_body["username"]
                )

            # if recipient of the invitation is currently "online" (i.e. connected via socket),
            # emit the notification instantly
            if http_body["username"] in global_vars.username_sid_map:
                notification_payload = {
                    "_id": ObjectId(),
                    "type": "ve_invitation",
                    "from": self.current_user.username,
                    "to": http_body["username"],
                    "message": http_body["message"],
                    "plan_id": http_body["plan_id"],
                    "receive_state": "sent",
                    "creation_timestamp": datetime.datetime.now(),
                }
                await global_vars.socket_io.emit(
                    "notification",
                    self.json_serialize_response(notification_payload.copy()),
                    room=global_vars.username_sid_map[http_body["username"]],
                )

                # store notification as "sent", which will be changed to "acknowledged"
                # once the client sends the appropriate acknowledgement event
                db.notifications.insert_one(notification_payload)
            else:
                # user is not currently connected via socket, save the event as "pending"
                # will be dispatched automatically when the user connects next time
                db.notifications.insert_one(
                    {
                        "type": "ve_invitation",
                        "from": self.current_user.username,
                        "to": http_body["username"],
                        "message": http_body["message"],
                        "plan_id": http_body["plan_id"],
                        "receive_state": "pending",
                        "creation_timestamp": datetime.datetime.now(),
                    }
                )

        self.write({"success": True})
