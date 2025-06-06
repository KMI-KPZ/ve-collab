import tornado.web

from handlers.base_handler import BaseHandler, auth_needed
from resources.network.profile import (
    AlreadyFollowedException,
    NotFollowedException,
    Profiles,
)
import util


class FollowHandler(BaseHandler):
    @auth_needed
    def get(self):
        """
        GET /follow
            get list of usernames that the user follows
            query param: user : string (if not supplied, the current_user is used)

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

        username = self.get_argument("user", None)
        if username is None:
            username = self.current_user.username

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            follows = profile_manager.get_follows(username)

        self.set_status(200)
        self.write(
            self.json_serialize_response(
                {"success": True, "user": username, "follows": follows}
            )
        )

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

                304 Not Modified
                --> current user already follows this user

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

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            try:
                profile_manager.add_follows(self.current_user.username, user_to_follow)
            except AlreadyFollowedException:
                self.set_status(304)
                return

        self.set_status(200)
        self.write({"status": 200, "success": True})

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

                304 Not Modified
                current_user doesn't follow this user,
                therefore nothing is changed

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

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            try:
                profile_manager.remove_follows(self.current_user.username, username)
            except NotFollowedException:
                self.set_status(304)
                return

        self.set_status(200)
        self.write({"status": 200, "success": True})
