import json

from error_reasons import MISSING_KEY_IN_HTTP_BODY_SLUG
from handlers.base_handler import BaseHandler, auth_needed
import util

MODE_REQUIRED_FIELDS = {
    "date": ["date"],
    "timeframe": ["date", "start_time", "end_time"],
    "range": ["start_date", "end_date"],
}


class MaintenanceBannerHandler(BaseHandler):
    def get(self):
        """
        GET /maintenance_banner
            get the current maintenance banner configuration.
            public endpoint, no authentication required, since the
            banner has to be shown to every visitor, including
            anonymous ones.

            query params:
                None

            http body:
                None

            returns:
                200 OK
                {"success": True,
                 "banner": {"enabled": "<bool>", ...}}
        """

        with util.get_mongodb() as db:
            banner = db.maintenance_banner.find_one({})
            if banner is None:
                self.serialize_and_write(
                    {"success": True, "banner": {"enabled": False}}
                )
                return

            self.serialize_and_write({"success": True, "banner": banner})

    @auth_needed
    def post(self):
        """
        POST /maintenance_banner
            overwrite the maintenance banner configuration with a new one
            (i.e. an update has to contain the entire configuration).
            admin only.

            query params:
                None

            http body:
                {
                    "enabled": "<bool>",
                    "mode": "date" | "timeframe" | "range",
                    // depending on "mode", when "enabled" is true:
                    "date": "<YYYY-MM-DD>",
                    "start_time": "<HH:MM>",
                    "end_time": "<HH:MM>",
                    "start_date": "<YYYY-MM-DD>",
                    "end_date": "<YYYY-MM-DD>"
                }

            returns:
                200 OK
                {"success": True}

                400 Bad Request
                (the http body misses a required key)
                {"success": False,
                 "reason": "missing_key_in_http_body:<missing_key>"}

                400 Bad Request
                (the http body contains an invalid mode)
                {"success": False,
                 "reason": "invalid_mode"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you are not an admin)
                {"success": False,
                 "reason": "insufficient_permission"}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": "json_parsing_error"})
            return

        if "enabled" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "success": False,
                    "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "enabled",
                }
            )
            return

        if http_body["enabled"]:
            if http_body.get("mode") not in MODE_REQUIRED_FIELDS:
                self.set_status(400)
                self.write({"success": False, "reason": "invalid_mode"})
                return

            for key in MODE_REQUIRED_FIELDS[http_body["mode"]]:
                if key not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + key,
                        }
                    )
                    return

        # abort if user is not an admin
        if not self.is_current_user_lionet_admin():
            self.set_status(403)
            self.write(
                {
                    "success": False,
                    "reason": "insufficient_permission",
                }
            )
            return

        with util.get_mongodb() as db:
            db.maintenance_banner.update_one({}, {"$set": http_body}, upsert=True)

        self.write({"success": True})
