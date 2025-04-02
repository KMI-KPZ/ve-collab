import json

from error_reasons import (
    INSUFFICIENT_PERMISSIONS,
    MISSING_KEY_IN_HTTP_BODY_SLUG,
    INVITATION_DOESNT_EXIST,
)
from exceptions import InvitationDoesntExistError
from handlers.base_handler import BaseHandler, auth_needed
from resources.notifications import NotificationResource
from resources.planner.ve_plan import VEPlanResource
import util


class VeInvitationHandler(BaseHandler):
    def options(self, slug):
        pass

    @auth_needed
    def get(self):
        pass

    @auth_needed
    async def post(self, slug):
        """
        POST /ve_invitation/send
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

        POST /ve_invitation/reply
            Reply to a received VE Invitation by either accepting or
            declining it.

            If the invitation is declined, the previously granted read
            access right will be revoked.

            The user who originally sent the VE invitation will receive
            a notification about the decision made.

            HTTP Body:
                {
                    "invitation_id": "<id_of_invitation>",
                    "accepted": <true|false>,
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
                (you are not the recipient of the invitation)
                {"success": False,
                 "reason": "insufficient_permissions"}

                409 Conflict
                (invitiation id does not exist)
                {"success": False,
                 "reason": "invitation_doesnt_exist"}
        """
        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": "json_parsing_error"})
            return

        if slug == "send":
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

            await self.send_ve_invitation(
                http_body["plan_id"], http_body["username"], http_body["message"]
            )
            return

        elif slug == "reply":
            if "accepted" not in http_body:
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "accepted",
                    }
                )
                return
            if "invitation_id" not in http_body:
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "invitation_id",
                    }
                )
                return

            await self.reply_to_ve_invitation(
                http_body["invitation_id"], http_body["accepted"]
            )
            return
        else:
            self.set_status(404)

    async def send_ve_invitation(
        self, plan_id: str | None, username: str, message: str
    ):
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Send a VE Invitation to another user which includes a message and optionally
        and already created plan. If a plan is included in the invitation, the recipient
        receives read access to this plan.

        The invited user receives a notification about the invitation.

        Responses:
            200 OK --> invitation send
            403 Forbidden --> inviting user is not the author of the appended
                              plan, therefore no read access can be granted to
                              the recipient, no invitation is sent.
        """

        with util.get_mongodb() as db:
            plan_manager = VEPlanResource(db)
            notification_manager = NotificationResource(db)

            # grant user read access to plan if one was appended to the invitation
            if plan_id is not None:
                # reject if the user is not the author of the plan --> cannot
                if not plan_manager._check_user_is_author(
                    plan_id, self.current_user.username
                ):
                    self.set_status(403)
                    self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                    return

                # set read permissions to invited user
                plan_manager.set_read_permissions(plan_id, username)

                # save plan invitation in db
                # invitation_id = plan_manager.insert_plan_invitation(
                #     plan_id,
                #     message,
                #     self.current_user.username,
                #     username,
                # )
                # # trigger notification dispatch
                # notification_payload = {
                #     "author": self.current_user.username,
                #     "message": message,
                #     "plan_id": plan_id,
                #     "plan_name": plan.name,
                #     "invitation_id": invitation_id,
                # }
                # await notification_manager.send_notification(
                #     username, "plan_added_as_partner", notification_payload
                # )

            # save plan invitation in db
            invitation_id = plan_manager.insert_plan_invitation(
                plan_id,
                message,
                self.current_user.username,
                username,
            )
            # trigger notification dispatch
            notification_payload = {
                "from": self.current_user.username,
                "message": message,
                "plan_id": plan_id,
                "invitation_id": invitation_id,
            }

            await notification_manager.send_notification(
                username, "ve_invitation", notification_payload
            )

        self.write({"success": True})

    async def reply_to_ve_invitation(self, invitation_id: str, accepted: bool):
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Reply to a received VE invitation by either accepting or declining it.

        If the invitation is declined, the granted read access rights will be
        revoked.

        The user who originally sent the invitation will receive a notification
        about the users decision.

        Responses:
            200 OK --> reply saved, notification to user sent
            403 Forbidden --> current user is not recipient of the invitation
            409 Conflict --> this invitation_id does not exist, therefore
                             no notification is sent
        """

        with util.get_mongodb() as db:
            plan_manager = VEPlanResource(db)
            try:
                plan_manager.set_invitation_reply(invitation_id, accepted)
            except InvitationDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": INVITATION_DOESNT_EXIST})
                return

            # reject if current user is not the recipient of invitation, i.e. it wasn't
            # even sent to him
            invitation = plan_manager.get_plan_invitation(invitation_id)
            if self.current_user.username != invitation["recipient"]:
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return

            # if invitation is declined (accepted == False) revoke read access rights again
            if accepted is False:
                if invitation["plan_id"] is not None:
                    plan_manager.revoke_read_permissions(
                        invitation["plan_id"], self.current_user.username
                    )
            else:
                if invitation["plan_id"] is not None:
                    # add as partner, set write/read access, add checklist etc
                    plan_manager.set_write_permissions(invitation["plan_id"], self.current_user.username)
                    # plan_manager.add_partner(invitation["plan_id"], self.current_user.username)

            # trigger notification to the original ve invitation sender
            # to notify him/her about the decision that the invited user
            # took
            notification_payload = {
                "from": self.current_user.username,
                "invitation_id": invitation_id,
                "accepted": accepted,
                "plan_id": invitation["plan_id"],
                "message": invitation["message"],
            }
            notification_manager = NotificationResource(db)
            await notification_manager.send_notification(
                invitation["sender"], "ve_invitation_reply", notification_payload
            )

        self.write({"success": True})
