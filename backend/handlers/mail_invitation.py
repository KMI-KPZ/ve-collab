import datetime
import json

from error_reasons import (
    MISSING_KEY_IN_HTTP_BODY_SLUG,
    INVITATION_DOESNT_EXIST,
    INSUFFICIENT_PERMISSIONS,
)
from exceptions import InvitationDoesntExistError
from handlers.base_handler import BaseHandler, auth_needed
from resources.mail_invitation import MailInvitation
from resources.planner.ve_plan import VEPlanResource
from resources.notifications import NotificationResource

import util

import logging
import logging.handlers

logger = logging.getLogger(__name__)


class EmailInvitationHandler(BaseHandler):

    def options(self, slug):
        # no body
        self.set_status(200)
        self.finish()

    def is_valid_email(self, email: str):
        """
        helper function to check validity of an email address
        for simplicity, we check for exactly one '@' character
        and atleast one '.' character after the '@'
        """

        if email.count("@") != 1:
            return False

        if "." not in email.split("@")[1]:
            return False

        return True

    def get(self):
        pass

    @auth_needed
    async def post(self, slug):
        """
        POST /mail_invitation/send
            The current user sends an invitation email to another person
            with an additional, optional message.

            query params:
                None

            http body:
                {
                    "recipient_mail": "recipient@mail.com"
                    "recipient_name": "name",
                    "message": "optional message"
                }

            returns:
                200 OK
                (invitation email was sent)
                {"success": True}

                400 Bad Request
                (the http body is not valid json)
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                (the http body misses a required key)
                {"success": False,
                 "reason": "missing_key_in_http_body:<missing_key>"}

                400 Bad Request
                (the recipient email is not valid)
                {"success": False,
                 "reason": "invalid_email"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                429 Too Many Requests
                (you have sent too many invitations in a given amount of time)
                {"success": False,
                 "reason": "too_many_requests"}

        POST /mail_invitation/reply
            Reply to mail invitation;
            If a plan was given it will give read_access and trigger a regular plan_invitation
            HTTP Body:
                {
                    "invitation_id": "<id_of_invitation>"
                }
            returns:
                200 OK
                (invitation email was sent)
                {"success": True}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": "json_parsing_error"})
            return

        if slug == "send":
            if "recipient_mail" not in http_body:
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "recipient_mail",
                    }
                )
                return
            if "recipient_name" not in http_body:
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "recipient_name",
                    }
                )
                return

            recipient_mail = http_body["recipient_mail"]
            recipient_name = http_body["recipient_name"]
            message = http_body["message"] if "message" in http_body else None
            plan_id = http_body["plan_id"] if "plan_id" in http_body else None
            await self.send_mail_invitation(
                recipient_mail, recipient_name, message, plan_id
            )
            return

        elif slug == "reply":
            if "invitation_id" not in http_body:
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "invitation_id",
                    }
                )
                return

            invitation_id = http_body["invitation_id"]
            await self.reply_to_mail_invitation(invitation_id)
            return

        else:
            self.set_status(404)

    async def send_mail_invitation(
        self,
        recipient_mail: str,
        recipient_name: str,
        message: str | None,
        plan_id: str | None,
    ):

        # logger.info("send_mail_invitation, planId={}".format(plan_id))

        if not self.is_valid_email(recipient_mail):
            self.set_status(400)
            self.write({"success": False, "reason": "invalid_email"})
            return

        with util.get_mongodb() as mongodb:
            invitation_manager = MailInvitation(mongodb)

            # TODO may check if meial already registered -> add as partner

            # check rate limit, i.e. allow only 10 invitations per 24 hours
            if not invitation_manager.check_within_rate_limit(
                self.current_user.username
            ):
                self.set_status(429)
                self.write({"success": False, "reason": "too_many_requests"})
                return

            # save invitation in database
            invitation = {
                "recipient_mail": recipient_mail,
                "recipient_name": recipient_name,
                "message": message,
                "sender": self.current_user.username,
                "plan_id": plan_id,
                "replied": False,
                "timestamp": datetime.datetime.now(),
            }
            invitation_id = invitation_manager.insert_invitation(invitation)

            # send email
            if plan_id is not None:
                plan_manager = VEPlanResource(mongodb)

                try:
                    plan = plan_manager.get_plan(plan_id, self.current_user.username)
                except:
                    self.set_status(403)
                    self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                    return

                util.send_email(
                    recipient_name,
                    recipient_mail,
                    "Einladung zum VE bei VE-Collab!",
                    "email_invitation_with_plan.html",
                    {
                        "message": message,
                        "sender": util._exchange_username_for_display_name(
                            self.current_user.username, mongodb
                        ),
                        "invitation_id": invitation_id,
                        "plan_name": plan.name,
                    },
                )
            else:
                util.send_email(
                    recipient_name,
                    recipient_mail,
                    "Tritt VE-Collab bei!",
                    "email_invitation.html",
                    {
                        "message": message,
                        "sender": util._exchange_username_for_display_name(
                            self.current_user.username, mongodb
                        ),
                    },
                )

        self.write({"success": True})

    async def reply_to_mail_invitation(self, invitation_id: str):
        # logger.info("reply_to_ve_invitation, invitation_id={}".format(invitation_id))

        with util.get_mongodb() as db:
            plan_manager = VEPlanResource(db)
            mail_invitation_manager = MailInvitation(db)
            notification_manager = NotificationResource(db)

            try:
                invitation = mail_invitation_manager.get_invitation(invitation_id)
            except InvitationDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": INVITATION_DOESNT_EXIST})
                return

            # already replied
            if "replied" in invitation and invitation["replied"] is True:
                self.write({"success": True})
                return

            plan_id = None

            if "plan_id" in invitation and invitation["plan_id"] is not None:
                plan_id = invitation["plan_id"]

                # give read access (required for the notification)
                try:
                    plan_manager.set_read_permissions(
                        plan_id, self.current_user.username
                    )
                except:
                    self.set_status(409)
                    self.write({"success": False, "reason": INVITATION_DOESNT_EXIST})
                    return

                # save normal plan invitation in db
                # invitation_id = plan_manager.insert_plan_invitation(
                #     plan_id,
                #     invitation["message"],
                #     invitation["sender"],
                #     self.current_user.username,
                # )
                # # trigger notification dispatch
                # notification_payload = {
                #     "author": invitation["sender"],
                #     "message": invitation["message"],
                #     "plan_id": plan_id,
                #     "plan_name": plan.name,
                #     "invitation_id": invitation_id,
                # }
                # await notification_manager.send_notification(
                #     self.current_user.username, "plan_added_as_partner", notification_payload
                # )

            mail_invitation_manager.reply_to_invitation(invitation_id)

            # save normal plan invitation in db
            invitation_id = plan_manager.insert_plan_invitation(
                plan_id,
                invitation["message"],
                invitation["sender"],
                self.current_user.username,
            )
            # trigger notification dispatch
            notification_payload = {
                "from": invitation["sender"],
                "message": invitation["message"],
                "plan_id": plan_id,
                "invitation_id": invitation_id,
            }

            await notification_manager.send_notification(
                self.current_user.username, "ve_invitation", notification_payload
            )

        self.write({"success": True})
