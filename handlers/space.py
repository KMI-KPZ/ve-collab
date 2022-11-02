from base64 import b64encode
import os
import re
from typing import Dict, Optional

import tornado.web

from acl import ACL
from handlers.base_handler import BaseHandler, auth_needed
from logger_factory import log_access


class SpaceHandler(BaseHandler):
    """
    handle existing and creation of new spaces
    """

    @log_access
    @auth_needed
    def get(self, slug):
        """
        GET /spaceadministration/list
            (view all spaces, except invisible ones that current user is not a member of)
            return:
                200 OK,
                {"status": 200,
                 "success": True,
                 "spaces": [space1, space2,...]}

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}

        GET /spaceadministration/list_all
            (view all spaces, including invisible ones, requires global admin privilege)
            return:
                200 OK,
                {"status": 200,
                 "success": True,
                 "spaces": [space1, space2,...]}

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "success": False,
                 "reason": "insufficient_permission"}

        GET /spaceadministration/pending_invites
            (get pending invites into spaces for current user)
            returns:
                200 OK
                {"status": 200,
                 "success": True,
                 "pending_invites": ["space1", "space2", ...]}

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}

        GET /spaceadministration/join_requests
            (view join requests for the space (requires space admin or global admin privileges))
            query param:
                "name": the space name of which to view the requests

            returns:
                200 OK
                {"status": 200,
                 "success": True,
                 "join_requests": ["username1", "username2", ...]}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": missing_key:name}

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "space_doesnt_exist"}

        GET /spaceadministration/invites
            (view invites for the space (requires space admin or global admin privileges))
            query param:
                "name": the space name of which to view the invites

            returns:
                200 OK
                {"status": 200,
                 "success": True,
                 "join_requests": ["username1", "username2", ...]}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": missing_key:name}

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "space_doesnt_exist"}
        """

        if slug == "list":
            self.list_spaces_except_invisible()
            return

        elif slug == "list_all":
            self.list_spaces()
            return

        elif slug == "pending_invites":
            self.get_invites_for_current_user()
            return

        elif slug == "join_requests":
            try:
                space_name = self.get_argument("name")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write(
                    {"status": 400, "success": False, "reason": "missing_key:name"}
                )
                return

            self.get_join_requests_for_space(space_name)
            return

        elif slug == "invites":
            try:
                space_name = self.get_argument("name")
            except:
                self.set_status(400)
                self.write(
                    {"status": 400, "success": False, "reason": "missing_key:name"}
                )
                return

            self.get_invites_for_space(space_name)
            return

        else:
            self.set_status(404)

    @log_access
    @auth_needed
    def post(self, slug):
        """
        POST /spaceadministration/create
            query param:
                "name" : space name to create, mandatory argument
                "invisible" : boolean to mark if space should be visible to users in overview or not, optional argument, default False

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:name}

                401 Unauthorized
                {"status": 401,
                 "reason": "insufficient_permission"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                409 Conflict
                {"status": 409,
                 "reason": "space_name_already_exists"}

        POST /spaceadministration/join
            (currently authed user joins space or sends a join request (depending on permissions), which case happened is indicated by join_type in response)
            query param:
                "name" : space name of which space to join, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True
                 "join_type": "joined" OR "requested_join"}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:name}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

        POST /spaceadministration/add_admin
            (add given user to space admin list (only space admin or global admin can do that))
            query param:
                "name" : space name in which the privilege should be granted, mandatory argument
                "user": the username which to add as a space admin, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:name}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:user}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "reason": "insufficient_permission"}

        POST /spaceadministration/space_picture
            (update space picture)
            query param:
                "name" : space name of which space to update space picture, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:name}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "reason": "insufficient_permission"}

        POST /spaceadministration/invite
            (invite a user into a space (requires space admin or global admin privileges))
            query param:
                "name": space name of which to invite the user into
                "user": username to invite

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:name}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:user}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "reason": "insufficient_permission"}

        POST /spaceadministration/accept_invite
            (current user accepts invite into a space)
            query param:
                "name": space name of which the current user accepts the invite into

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:name}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                400 Conflict
                {"status": 400,
                 "reason": "user_is_not_invited_into_space"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

        POST /spaceadministration/decline_invite
            (current user declines invite into a space)
            query param:
                "name" space of which the invite should be declined

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:name}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                400 Conflict
                {"status": 400,
                 "reason": "user_is_not_invited_into_space"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

        POST /spaceadministration/accept_request
            (space admin or global admin accept join request of a user)
            query param:
                "name": space name of which the request into will be accepted
                "user": username whose request will be accepted

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:name}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:user}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                400 Bad Request
                {"status": 400,
                 "reason": "user_didnt_request_to_join"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "reason": "insufficient_permission"}

        POST /spaceadministration/reject_request
            (space admin or global admin rejects join request of as user)
            query param:
                "name": space name of which the request will be rejected
                "user": username whose request will be rejected

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:name}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:user}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                400 Bad Request
                {"status": 400,
                 "reason": "user_didnt_request_to_join"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "reason": "insufficient_permission"}

        POST /spaceadministration/toggle_visibility
            (toggle invisible state of space, i.e. true --> false, false --> true, requires space admin or global admin privileges)
            query param:
                "name" : the space which to trigger

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:name}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "reason": "insufficient_permission"}
        """

        try:
            space_name = self.get_argument("name")
        except tornado.web.MissingArgumentError as e:
            self.set_status(400)
            self.write({"status": 400, "reason": "missing_key:name"})
            return

        if slug == "create":
            invisible = self.get_argument("invisible", False)
            # apparentry the "false" str is true, pain
            if invisible == "false":
                invisible = False
            # explicit bool cast in case user puts any string or int value that is not already "true" (will be interpreted as true then)
            invisible = bool(invisible)

            self.create_space(space_name, invisible)
            return

        elif slug == "join":
            self.join_space(space_name)
            return

        elif slug == "add_admin":
            try:
                username = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"status": 400, "reason": "missing_key:user"})
                return

            self.add_admin_to_space(space_name, username)
            return

        elif slug == "space_picture":
            space_description = self.get_body_argument("space_description", None)
            self.update_space_information(space_name, space_description)
            return

        elif slug == "invite":
            try:
                username = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"status": 400, "reason": "missing_key:user"})
                return

            self.invite_user_into_space(space_name, username)
            return

        elif slug == "accept_invite":
            self.accept_space_invite(space_name)
            return

        elif slug == "decline_invite":
            self.decline_space_invite(space_name)
            return

        elif slug == "accept_request":
            try:
                username = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"status": 400, "reason": "missing_key:user"})
                return

            self.accept_join_space_request(space_name, username)
            return

        elif slug == "reject_request":
            try:
                username = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"status": 400, "reason": "missing_key:user"})
                return

            self.reject_join_space_request(space_name, username)
            return

        elif slug == "toggle_visibility":
            self.toggle_space_visibility(space_name)
            return

        else:
            self.set_status(404)

    @log_access
    @auth_needed
    def delete(self, slug):
        """
        DELETE /spaceadministration/leave
            (currently authed user leaves space)
            query param:
                "name" : space name to leave from, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key:name"}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

        DELETE /spaceadministration/kick
            (kick a user from the space, requires being global or space admin)
            query param:
                "name" : space name to kick the user from, mandatory argument
                "user" : user name to kick from the space, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key:name"}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key:username"}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "reason": "insufficient_permission}

        DELETE /spaceadministration/remove_admin
            (revoke space admin privileges from given user (requires global admin privileges to do that))
            query param:
                "name" : space name in which the privilege should be revoked, mandatory argument
                "user": the username which to remove as a space admin, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:name}

                400 Bad Request
                {"status": 400,
                 "reason": missing_key:user}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "reason": "insufficient_permission"}

        DELETE /spaceadministration/delete_space
            (space will be deleted, requires being global or space admin)
            query param:
                "name" : space name of which space to delete, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key:name"}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "reason": "insufficient_permission}
        """

        try:
            space_name = self.get_argument("name")
        except tornado.web.MissingArgumentError as e:
            self.set_status(400)
            self.write({"status": 400, "reason": "missing_key:name"})
            return

        space = self.db.spaces.find_one({"name": space_name})
        if not space:
            self.set_status(400)
            self.write({"status": 400, "reason": "space_doesnt_exist"})
            return

        if slug == "leave":
            self.user_leave(space)
            return

        elif slug == "kick":
            try:
                user_name = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"status": 400, "reason": "missing_key:user"})
                return

            self.user_kick(space, user_name)
            return

        elif slug == "remove_admin":
            try:
                username = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"status": 400, "reason": "missing_key:user"})
                return

            self.remove_admin_from_space(space_name, username)
            return

        elif slug == "delete_space":
            self.delete_space(space)
            return

        else:
            self.set_status(404)
            return

    ##############################################################################
    #                             helper functions                               #
    ##############################################################################

    def list_spaces(self) -> None:
        """
        list all available spaces, requires admin privilegs because it includes invisible spaces
        """

        # abort if user is not global admin
        if not self.get_current_user_role() == "admin":
            self.set_status(403)
            self.write(
                {"status": 403, "success": False, "reason": "insufficient_permission"}
            )
            return

        result = self.db.spaces.find({})

        spaces = []
        for space in result:
            space["_id"] = str(space["_id"])
            spaces.append(space)

        self.set_status(200)
        self.write({"status": 200, "success": True, "spaces": spaces})
        return

    def list_spaces_except_invisible(self) -> None:
        """
        list available spaces (except invisible spaces, that you are not a member of)
        i.e. list spaces that:
            - have invisible parameter set to false
            - have no invisible parameter (for legacy spaces from before this feature was implemented)
            - you are a member of (no matter visibility setting)
        """

        # query 3 criteria above
        result = self.db.spaces.find(
            {
                "$or": [
                    {"invisible": False},
                    {"invisible": {"$exists": False}},
                    {"members": self.current_user.username},
                ]
            }
        )

        # stringify ObjectId instance
        spaces = []
        for space in result:
            space["_id"] = str(space["_id"])
            spaces.append(space)

        self.set_status(200)
        self.write({"status": 200, "success": True, "spaces": spaces})
        return

    def get_invites_for_current_user(self) -> None:
        """
        get all pending invites into spaces for the current user
        """

        spaces = self.db.spaces.find({"invites": self.current_user.username})
        pending_invites = []
        for space in spaces:
            pending_invites.append(space["name"])

        self.set_status(200)
        self.write({"status": 200, "success": True, "pending_invites": pending_invites})

    def get_invites_for_space(self, space_name: str) -> None:
        """
        view invites for the given space (requires space admin or global admin privileges)
        """
        space = self.db.spaces.find_one({"name": space_name})

        # abort if space doesnt exist
        if not space:
            self.set_status(409)
            self.write(
                {"status": 409, "success": False, "reason": "space_doesnt_exist"}
            )
            return

        # abort if user is neither space nor global admin
        if not (
            self.current_user.username in space["admins"]
            or self.get_current_user_role() == "admin"
        ):
            self.set_status(403)
            self.write(
                {"status": 403, "success": False, "reason": "insufficient_permission"}
            )
            return

        self.set_status(200)
        self.write({"status": 200, "success": True, "invites": space["invites"]})

    def get_join_requests_for_space(self, space_name: str) -> None:
        """
        view join requests for the given space (requires space admin or global admin privileges)
        """

        space = self.db.spaces.find_one({"name": space_name})

        # abort if space doesnt exist
        if not space:
            self.set_status(409)
            self.write(
                {"status": 409, "success": False, "reason": "space_doesnt_exist"}
            )
            return

        # abort if user is neither space nor global admin
        if not (
            self.current_user.username in space["admins"]
            or self.get_current_user_role() == "admin"
        ):
            self.set_status(403)
            self.write(
                {"status": 403, "success": False, "reason": "insufficient_permission"}
            )
            return

        self.set_status(200)
        self.write({"status": 200, "success": True, "join_requests": space["requests"]})

    def create_space(self, space_name: str, is_invisible: bool) -> None:
        """
        create a new space if it does not already exist and if the current user has sufficient permissions
        """

        # check if the user has permission
        with ACL() as acl:
            if not acl.global_acl.ask(self.get_current_user_role(), "create_space"):
                self.set_status(403)
                self.write({"status": 403, "reason": "insufficient_permission"})
                return

        members = [self.current_user.username]

        # if space with same name already exists dont create and return conflict
        existing_spaces = []
        for existing_space in self.db.spaces.find(
            projection={"name": True, "_id": False}
        ):
            existing_spaces.append(existing_space["name"])
        if space_name in existing_spaces:
            self.set_status(409)
            self.write({"status": 409, "reason": "space_name_already_exists"})
            return

        space = {
            "name": space_name,
            "invisible": is_invisible,
            "members": members,
            "admins": [self.current_user.username],
            "invites": [],
            "requests": [],
        }
        self.db.spaces.insert_one(space)

        # create default acl entry for all different roles
        with ACL() as acl:
            acl.space_acl.insert_admin(space_name)
            roles = self.db.roles.distinct("role")
            for role in roles:
                if role != "admin":
                    acl.space_acl.insert_default(role, space_name)

        self.set_status(200)
        self.write({"status": 200, "success": True})

    def join_space(self, space_name: str) -> None:
        """
        let current user join the space, if he has sufficient permissions
        if not, let him send a join request instead
        """

        # abort if space doesnt exist
        space = self.db.spaces.find_one({"name": space_name})
        if not space:
            self.set_status(400)
            self.write({"status": 400, "reason": "space_doesnt_exist"})
            return

        with ACL() as acl:
            # user is not allowed to join spaces directly, therefore send join request instead of joining directly
            if not acl.space_acl.ask(
                self.get_current_user_role(), space_name, "join_space"
            ):
                self.db.spaces.update_one(
                    {"name": space_name},
                    {"$addToSet": {"requests": self.current_user.username}},
                )

                self.set_status(200)
                self.write(
                    {"status": 200, "success": True, "join_type": "requested_join"}
                )
                return

        # user has permission to join spaces, directly add him as member
        self.db.spaces.update_one(
            {"name": space_name}, {"$addToSet": {"members": self.current_user.username}}
        )

        self.set_status(200)
        self.write({"status": 200, "success": True, "join_type": "joined"})

    def add_admin_to_space(self, space_name: str, username: str) -> None:
        """
        add another user as a space admin to the space, requires space admin or global admin to perform this operation
        """

        space = self.db.spaces.find_one({"name": space_name})
        if not space:
            self.set_status(400)
            self.write({"status": 400, "reason": "space_doesnt_exist"})
            return

        if (self.current_user.username in space["admins"]) or (
            self.get_current_user_role() == "admin"
        ):
            # user is either space admin or global admin and therefore is allowed to add space admin
            self.db.spaces.update_one(
                {"name": space_name}, {"$addToSet": {"admins": username}}
            )

            self.set_status(200)
            self.write({"status": 200, "success": True})
        else:
            self.set_status(403)
            self.write({"status": 403, "reason": "insufficient_permission"})
            return

    def update_space_information(
        self, space_name: str, space_description: Optional[str]
    ) -> None:
        """
        update space picture and space description, requires space admin or global admin privileges
        """

        space = self.db.spaces.find_one({"name": space_name})

        if not space:
            self.set_status(400)
            self.write({"status": 400, "reason": "space_doesnt_exist"})
            return

        # check if user is either space or global admin
        if not (
            self.current_user.username in space["admins"]
            or self.get_current_user_role() == "admin"
        ):
            self.set_status(403)
            self.write({"status": 403, "reason": "insufficient_permission"})
            return

        new_file_name = None
        if "space_pic" in self.request.files:
            space_pic_obj = self.request.files["space_pic"][0]

            # save file
            file_ext = os.path.splitext(space_pic_obj["filename"])[1]
            new_file_name = b64encode(os.urandom(32)).decode("utf-8")
            new_file_name = (
                re.sub("[^0-9a-zäöüßA-ZÄÖÜ]+", "_", new_file_name).lower() + file_ext
            )

            with open(self.upload_dir + new_file_name, "wb") as fp:
                fp.write(space_pic_obj["body"])

        if new_file_name:
            self.db.spaces.update_one(
                {"name": space_name},
                {
                    "$set": {
                        "space_pic": new_file_name,
                        "space_description": space_description,
                    }
                },
                upsert=True,
            )
        else:
            self.db.spaces.update_one(
                {"name": space_name},
                {"$set": {"space_description": space_description}},
                upsert=True,
            )

        self.set_status(200)
        self.write({"status": 200, "success": True})

    def invite_user_into_space(self, space_name: str, username: str) -> None:
        """
        invite a user into the space
        """

        space = self.db.spaces.find_one({"name": space_name})

        # abort if space doesnt exist
        if not space:
            self.set_status(400)
            self.write({"status": 400, "reason": "space_doesnt_exist"})
            return

        # abort if user is neither space nor global admin
        if not (
            self.current_user.username in space["admins"]
            or self.get_current_user_role() == "admin"
        ):
            self.set_status(403)
            self.write({"status": 403, "reason": "insufficient_permission"})
            return

        # add username to invited users set
        self.db.spaces.update_one(
            {"name": space_name}, {"$addToSet": {"invites": username}}
        )

        self.set_status(200)
        self.write({"status": 200, "success": True})

    def accept_space_invite(self, space_name: str) -> None:
        """
        current user accept invite into space
        """

        space = self.db.spaces.find_one({"name": space_name})

        # abort if space doesnt exist
        if not space:
            self.set_status(400)
            self.write({"status": 400, "reason": "space_doesnt_exist"})
            return

        # abort if user wasn't even invited into space in first place (= prevent sneaking in)
        if self.current_user.username not in space["invites"]:
            self.set_status(400)
            self.write({"status": 400, "reason": "user_is_not_invited_into_space"})
            return

        # add user to members and pull them from pending invites
        self.db.spaces.update_one(
            {"name": space_name},
            {
                "$addToSet": {"members": self.current_user.username},
                "$pull": {"invites": self.current_user.username},
            },
        )

        self.set_status(200)
        self.write({"status": 200, "success": True})

    def decline_space_invite(self, space_name: str) -> None:
        """
        current user declines invite into space
        """

        space = self.db.spaces.find_one({"name": space_name})

        # abort if space doesnt exist
        if not space:
            self.set_status(400)
            self.write({"status": 400, "reason": "space_doesnt_exist"})
            return

        # abort if user wasn't even invited into space in first place
        if self.current_user.username not in space["invites"]:
            self.set_status(400)
            self.write({"status": 400, "reason": "user_is_not_invited_into_space"})
            return

        # pull user from pending invites to decline (dont add to members obviously)
        self.db.spaces.update_one(
            {"name": space_name}, {"$pull": {"invites": self.current_user.username}}
        )

        self.set_status(200)
        self.write({"status": 200, "success": True})

    def accept_join_space_request(self, space_name: str, username: str) -> None:
        """
        space admin or global admin accepts the request of a user to join the space
        """

        space = self.db.spaces.find_one({"name": space_name})

        # abort if space doesnt exist
        if not space:
            self.set_status(400)
            self.write({"status": 400, "reason": "space_doesnt_exist"})
            return

        # abort if user is neither space nor global admin
        if not (
            self.current_user.username in space["admins"]
            or self.get_current_user_role() == "admin"
        ):
            self.set_status(403)
            self.write({"status": 403, "reason": "insufficient_permission"})
            return

        # abort if user didn't request to join
        if username not in space["requests"]:
            self.set_status(400)
            self.write({"status": 400, "reason": "user_didnt_request_to_join"})
            return

        # add user to members and pull them from pending requests
        self.db.spaces.update_one(
            {"name": space_name},
            {"$addToSet": {"members": username}, "$pull": {"requests": username}},
        )

        self.set_status(200)
        self.write({"status": 200, "success": True})

    def reject_join_space_request(self, space_name: str, username: str) -> None:
        """
        space admin or global admin rejects join request of a user
        """

        space = self.db.spaces.find_one({"name": space_name})

        # abort if space doesnt exist
        if not space:
            self.set_status(400)
            self.write({"status": 400, "reason": "space_doesnt_exist"})
            return

        # abort if user is neither space nor global admin
        if not (
            self.current_user.username in space["admins"]
            or self.get_current_user_role() == "admin"
        ):
            self.set_status(403)
            self.write({"status": 403, "reason": "insufficient_permission"})
            return

        # abort if user didn't request to join
        if username not in space["requests"]:
            self.set_status(400)
            self.write({"status": 400, "reason": "user_didnt_request_to_join"})
            return

        # pull user from request to decline (obviously dont add as member)
        self.db.spaces.update_one(
            {"name": space_name}, {"$pull": {"requests": username}}
        )

        self.set_status(200)
        self.write({"status": 200, "success": True})

    def toggle_space_visibility(self, space_name: str) -> None:
        """
        toggle invisible state of space depending on current state, i.e. true --> false, false --> true
        """

        space = self.db.spaces.find_one({"name": space_name})

        # abort if space doesnt exist
        if not space:
            self.set_status(400)
            self.write({"status": 400, "reason": "space_doesnt_exist"})
            return

        # abort if user is neither space nor global admin
        if not (
            self.current_user.username in space["admins"]
            or self.get_current_user_role() == "admin"
        ):
            self.set_status(403)
            self.write({"status": 403, "reason": "insufficient_permission"})
            return

        # toggle visibility
        self.db.spaces.update_one(
            {"name": space_name}, {"$set": {"invisible": not space["invisible"]}}
        )

        self.set_status(200)
        self.write({"status": 200, "success": True})

    def user_leave(self, space: Dict) -> None:
        """
        let the current user leave the space
        """

        # TODO when group admin is implemented: block leaving if user is the only admin, he has to transfer this role first before being able to leave
        self.db.spaces.update_one(
            {"name": space["name"]}, {"$pull": {"members": self.current_user.username}}
        )
        self.set_status(200)
        self.write({"status": 200, "success": True})

    def user_kick(self, space: Dict, user_name: str) -> None:
        """
        kick a user from the space, requires space admin or global admin privileges
        if the to-be-kicked user is a space admin himself, global admin privileges are required to prevent space admins from kicking each other
        """

        # check if user is either space or global admin
        if not (
            self.current_user.username in space["admins"]
            or self.get_current_user_role() == "admin"
        ):
            self.set_status(403)
            self.write({"status": 403, "reason": "insufficient_permission"})
            return

        # in order to kick an admin from the space, you have to be global admin (prevents space admins from kicking each other)
        if user_name in space["admins"]:
            if self.get_current_user_role() == "admin":
                self.db.spaces.update_one(
                    {"name": space["name"]}, {"$pull": {"members": user_name}}
                )
            else:
                self.set_status(403)
                self.write(
                    {
                        "status": 403,
                        "reason": "insufficient_permission",
                        "hint": "need to be global admin to kick another admin from the space (prevent kicking of space admins between each other)",
                    }
                )
                return

        # user is not an admin, can kick him without doubt
        else:
            self.db.spaces.update_one(
                {"name": space["name"]}, {"$pull": {"members": user_name}}
            )

        self.set_status(200)
        self.write({"status": 200, "success": True})

    def remove_admin_from_space(self, space_name: str, username: str) -> None:
        """
        remove user as space admin, requires global admin privileges to prevent space admins from degrading each other
        """

        space = self.db.spaces.find_one({"name": space_name})

        # abort if space doesnt exist
        if not space:
            self.set_status(400)
            self.write({"status": 400, "reason": "space_doesnt_exist"})
            return

        # abort if user is no global admin
        if not (self.get_current_user_role() == "admin"):
            self.set_status(403)
            self.write({"status": 403, "reason": "insufficient_permission"})
            return

        # remove user from spaces admins list
        self.db.spaces.update_one({"name": space_name}, {"$pull": {"admins": username}})

        self.set_status(200)
        self.write({"status": 200, "success": True})

    def delete_space(self, space: Dict) -> None:
        """
        delete a space, requires space admin or global admin privileges
        """

        if (self.current_user.username in space["admins"]) or (
            self.get_current_user_role() == "admin"
        ):
            self.db.spaces.delete_one({"name": space["name"]})

            self.set_status(200)
            self.write({"status": 200, "success": True})
        else:
            self.set_status(403)
            self.write({"status": 403, "reason": "insufficient_permission"})
