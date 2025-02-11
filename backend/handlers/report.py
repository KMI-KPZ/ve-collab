import json

import tornado

from handlers.base_handler import BaseHandler, auth_needed
from error_reasons import (
    INSUFFICIENT_PERMISSIONS,
    MISSING_KEY_IN_HTTP_BODY_SLUG,
    MISSING_KEY_SLUG,
    REPORT_DOESNT_EXIST,
)
from exceptions import ReportDoesntExistError
from resources.network.profile import Profiles
from resources.notifications import NotificationResource
from resources.reports import Reports
import util


class ReportHandler(BaseHandler):

    def options(self, slug):
        # no body
        self.set_status(200)
        self.finish()

    def get(self, slug):
        """
        GET /report/get
            get a single report. Requires admin privileges.

            Query params:
                report_id: string

            http body:
                None

            returns:
                200 OK
                {"success": true,
                 "report": {<report>}}

                400 Bad Request
                (a query param is missing)
                {"success": false,
                 "reason": "missing_key:report_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": false,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (user is not an admin)
                {"success": false,
                 "reason": "insufficient_permissions"}

                409 Conflict
                (the report does not exist)
                {"success": false,
                 "reason": "report_doesnt_exist"}

        GET /report/get_open
            get all open reports. Requires admin privileges.

            Query params:
                None

            http body:
                None

            returns:
                200 OK
                {"success": true,
                 "reports": [{<report>}]}

                401 Unauthorized
                (access token is not valid)
                {"success": false,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (user is not an admin)
                {"success": false,
                 "reason": "insufficient_permissions"}

        GET /report/get_all
            get all reports. Requires admin privileges.

            Query params:
                None

            http body:
                None

            returns:
                200 OK
                {"success": true,
                 "reports": [{<report>}]}

                401 Unauthorized
                (access token is not valid)
                {"success": false,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (user is not an admin)
                {"success": false,
                 "reason": "insufficient_permissions"}
        """

        if slug == "get":
            report_id = self.get_argument("report_id", None)
            if report_id is None:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + "report_id"})
                return

            if not self.is_current_user_lionet_admin():
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return

            with util.get_mongodb() as db:
                reports = Reports(db)
                try:
                    report = reports.get_report(report_id)
                except ReportDoesntExistError:
                    self.set_status(409)
                    self.write({"success": False, "reason": REPORT_DOESNT_EXIST})
                    return

                self.serialize_and_write({"success": True, "report": report})

        elif slug == "get_open":
            if not self.is_current_user_lionet_admin():
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return

            with util.get_mongodb() as db:
                reports = Reports(db)
                open_reports = reports.get_open_reports()
                self.serialize_and_write({"success": True, "reports": open_reports})

        elif slug == "get_all":
            if not self.is_current_user_lionet_admin():
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return

            with util.get_mongodb() as db:
                reports = Reports(db)
                all_reports = reports.get_all_reports()
                self.serialize_and_write({"success": True, "reports": all_reports})

        else:
            self.set_status(404)

    @auth_needed
    def post(self, slug):
        """
        POST /report/submit
            Submit a new report for any content in the platform.

            Query params:
                None

            http body:
                {
                    "type": "post|comment|plan|profile|group|chatroom",
                    "item_id": "_id_of_reported_item",
                    "reason": "string"
                }

            returns:

                200 OK
                (report was submitted)
                {"success": true}

                400 Bad Request
                (the http body is not valid json)
                {"success": false,
                "reason": "json_parsing_error"}

                400 Bad Request
                (the http body misses a required key)
                {"success": false,
                "reason": "missing_key_in_http_body:<attribute>"}

                401 Unauthorized
                (access token is not valid)
                {"success": false,
                "reason": "no_logged_in_user"}


        Post /report/close
            Close, i.e. resolve a report.
            Requires admin privileges.

            Query params:
                None

            http body:
                {
                    "report_id": "_id_of_report"
                }

            returns:

                200 OK
                (report was closed)
                {"success": true}

                400 Bad Request
                (the http body is not valid json)
                {"success": false,
                "reason": "json_parsing_error"}

                400 Bad Request
                (the http body misses a required key)
                {"success": false,
                "reason": "missing_key_in_http_body:<attribute>"}

                401 Unauthorized
                (access token is not valid)
                {"success": false,
                "reason": "no_logged_in_user"}

                403 Forbidden
                (user is not an admin)
                {"success": false,
                 "reason": "insufficient_permissions"}

                409 Conflict
                (the report does not exist)
                {"success": false,
                 "reason": "report_doesnt_exist"}

        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": "json_parsing_error"})
            return

        if slug == "submit":

            if "type" not in http_body:
                self.set_status(400)
                self.write(
                    {"success": False, "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "type"}
                )
                return
            if "item_id" not in http_body:
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "item_id",
                    }
                )
                return
            if "reason" not in http_body:
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "reason",
                    }
                )
                return

            # delete any other keys from the http body
            # and add reporter
            http_body = {key: http_body[key] for key in ["type", "item_id", "reason"]}
            http_body["reporter"] = self.current_user.username

            with util.get_mongodb() as db:
                reports = Reports(db)

                # TODO check if the item in question exists

                # TODO check if the user has already reported the same item before?

                # insert the report
                reports.insert_report(http_body)

                # notify admins about the new report
                profile_resource = Profiles(db)
                admin_usernames = [
                    result["username"]
                    for result in profile_resource.get_admin_profiles(
                        projection={"username": True}
                    )
                ]

                async def _notification_send(usernames, payload):
                    # since this will be run in a separate task, we need to acquire a new db connection
                    with util.get_mongodb() as db:
                        notification_resources = NotificationResource(db)
                        for username in usernames:
                            await notification_resources.send_notification(
                                username, "report_submitted", payload
                            )

                tornado.ioloop.IOLoop.current().add_callback(
                    _notification_send, admin_usernames, http_body
                )

            self.write({"success": True})

        elif slug == "close":
            if "report_id" not in http_body:
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "report_id",
                    }
                )
                return

            # require admin privileges
            if not self.is_current_user_lionet_admin():
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return

            with util.get_mongodb() as db:
                reports = Reports(db)
                try:
                    reports.close_report(http_body["report_id"])
                except ReportDoesntExistError:
                    self.set_status(409)
                    self.write({"success": False, "reason": REPORT_DOESNT_EXIST})
                    return

            self.write({"success": True})

        else:
            self.set_status(404)

    async def delete(self, slug):
        """
        DELETE /report/delete
            Given the reports _id, delete the reported item within.
            This may cause cascading deletions, e.g. deleting a post will
            also delete its comments, and also possibly unwanted side effects,
            like orphaned data.
            USE ONLY WHEN ABSOLUTELY NECESSARY.

            Query params:
                report_id: string

            http body:
                None

            returns:
                200 OK
                (reported item was deleted)
                {"success": true}

                400 Bad Request
                (a query param is missing)
                {"success": false,
                 "reason": "missing_key:report_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": false,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (user is not an admin)
                {"success": false,
                 "reason": "insufficient_permissions"}

                409 Conflict
                (the report does not exist)
                {"success": false,
                 "reason": "report_doesnt_exist"}
        """

        if slug == "delete":
            report_id = self.get_argument("report_id", None)
            if report_id is None:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + "report_id"})
                return

            if not self.is_current_user_lionet_admin():
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return

            with util.get_mongodb() as db:
                reports = Reports(db)
                try:
                    await reports.delete_reported_item(report_id)
                except ReportDoesntExistError:
                    self.set_status(409)
                    self.write({"success": False, "reason": REPORT_DOESNT_EXIST})
                    return

            self.write({"success": True})

        else:
            self.set_status(404)
