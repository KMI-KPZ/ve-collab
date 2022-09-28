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

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        username = self.get_argument("user")

        result = self.db.follows.find(
            filter={"user": username},
            projection={"_id": False}
        )

        follows = []  # need to instantiate it because if user follows nobody the iteration wont be run "follows" would get unassigned
        for user in result:  # even though there is only one item in result set we need to iterate because query returns a cursor instance
            follows = user["follows"]

        self.set_status(200)
        self.write({"user": username,
                    "follows": follows})

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

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        username = self.current_user.username
        user_to_follow = self.get_argument("user")

        self.db.follows.update_one(
            {"user": username},  # fitler
            {
                "$addToSet": {  # update
                    "follows": user_to_follow
                }
            },
            upsert=True  # if no document already present, create one (i.e. user follows somebody for first time)
        )

        self.set_status(200)
        self.write({"status": 200,
                    "success": True})

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

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        username = self.get_argument("user")

        self.db.follows.update_one(
            {"user": self.current_user.username},
            {
                "$pull": {
                    "follows": username
                }
            }
        )

        self.set_status(200)
        self.write({"status": 200,
                    "success": True})
