import tornado.web

from handlers.base_handler import BaseHandler, auth_needed
from logger_factory import log_access


class FollowHandler(BaseHandler):
    @log_access
    @auth_needed
    def get(self):
        """
        GET /follow
            get list of usernames that the current user follows
            query param: user : string (required)

            returns:
                200 OK,
                {"user": <string>,
                 "follows": ["username1", "username2", ...]}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key:user}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        try:
            username = self.get_argument("user")
        except tornado.web.MissingArgumentError:
            self.set_status(400)
            self.write({"status": 400, "success": False, "reason": "missing_key:user"})
            return

        result = self.db.profiles.find_one(
            {"username": username}, projection={"_id": False, "follows": True}
        )
        if not result:
            result = {"follows": []}

        self.set_status(200)
        self.write({"success": True, "user": username, "follows": result["follows"]})

    @log_access
    @auth_needed
    def post(self):
        """
        POST /follow
            follow a user
            query param: user : string (required; the username u want to follow)

            returns:
                200 OK
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key:user}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        try:
            user_to_follow = self.get_argument("user")
        except tornado.web.MissingArgumentError:
            self.set_status(400)
            self.write({"status": 400, "success": False, "reason": "missing_key:user"})
            return

        username = self.current_user.username

        self.db.profiles.update_one(
            {"username": username},  # fitler
            {"$addToSet": {"follows": user_to_follow}},  # update
        )

        self.set_status(200)
        self.write({"status": 200, "success": True})

    @log_access
    @auth_needed
    def delete(self):
        """
        DELETE /follow
            unfollow a user
            query param: user : the user to unfollow

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key:user}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        try:
            username = self.get_argument("user")
        except tornado.web.MissingArgumentError:
            self.set_status(400)
            self.write({"status": 400, "success": False, "reason": "missing_key:user"})
            return

        self.db.profiles.update_one(
            {"username": self.current_user.username}, {"$pull": {"follows": username}}
        )

        self.set_status(200)
        self.write({"status": 200, "success": True})
