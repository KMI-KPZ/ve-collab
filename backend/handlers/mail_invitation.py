import json

from error_reasons import MISSING_KEY_IN_HTTP_BODY_SLUG
from handlers.base_handler import BaseHandler, auth_needed
import util


class EmailInvitationHandler(BaseHandler):

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
    def post(self):
        """
        POST /mail_invitation
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
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": "json_parsing_error"})
            return

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

        if not self.is_valid_email(recipient_mail):
            self.set_status(400)
            self.write({"success": False, "reason": "invalid_email"})
            return

        # TODO check rate limit, e.g. allow only 5 invitations per 12 hours

        # send email
        with util.get_mongodb() as mongodb:
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
