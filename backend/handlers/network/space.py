from base64 import b64decode
import json
import logging
from typing import Optional

from bson import ObjectId
import tornado.web

from handlers.base_handler import BaseHandler, auth_needed
from resources.network.acl import ACL
from resources.network.space import (
    AlreadyAdminError,
    OnlyAdminError,
    PostFileNotDeleteableError,
    Spaces,
    SpaceDoesntExistError,
    UserNotAdminError,
    UserNotMemberError,
)
from resources.notifications import NotificationResource
import util

logger = logging.getLogger(__name__)


class SpaceHandler(BaseHandler):
    """
    handle existing and creation of new spaces
    """

    def options(self, slug):
        # no body
        self.set_status(200)
        self.finish()

    @auth_needed
    def get(self, slug):
        """
        GET /spaceadministration/list
            (view all spaces, except invisible ones that current user is not a member of)
            return:
                200 OK,
                {"success": True,
                 "spaces": [space1, space2,...]}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

        GET /spaceadministration/list_all
            (view all spaces, including invisible ones, requires global admin privilege)
            return:
                200 OK,
                {"success": True,
                 "spaces": [space1, space2,...]}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

        GET /spaceadministration/my
            (view all spaces that current user is a member of)
            return:
                200 OK,
                {"success": True,
                 "spaces": [space1, space2,...]}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

        GET /spaceadministration/info
            (view details about one space, if it is invisible, you need to be a member of the space
            or an admin)
            query param:
                id: the _id of the space you want details about
            return:
                200 OK,
                {"success": True,
                 "space": {...}}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

        GET /spaceadministration/pending_invites
            (get pending invites into spaces for current user)
            returns:
                200 OK
                {"success": True,
                 "pending_invites": [{...}, {...}, ...]}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

        GET /spaceadministration/pending_requests
            (get pending requests to join spaces for current user)
            returns:
                200 OK
                {"success": True,
                 "pending_requests": [{...}, {...}, ...]}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

        GET /spaceadministration/join_requests
            (view join requests for the space (requires space admin or global admin privileges))
            query param:
                "id": the space _id of which to view the requests

            returns:
                200 OK
                {"success": True,
                 "join_requests": ["username1", "username2", ...]}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:name}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

        GET /spaceadministration/invites
            (view invites for the space (requires space admin or global admin privileges))
            query param:
                "id": the space _id of which to view the invites

            returns:
                200 OK
                {"success": True,
                 "join_requests": ["username1", "username2", ...]}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:name}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

        GET /spaceadministration/files
            get the file metadata of the files uploaded to the given space
            use the static file handler on /uploads to retrieve the actual file
            query param:
                "id": the space _id of which to view the files

            returns:
                200 OK
                {"success": True,
                 "files": [{"author": <str>, "filename": <str>}, ...]}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:name}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}
        """

        if slug == "list":
            self.list_spaces_except_invisible()
            return

        elif slug == "list_all":
            self.list_spaces()
            return

        elif slug == "my":
            self.list_personal_spaces()
            return

        elif slug == "info":
            try:
                space_id = self.get_argument("id")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:id"})
                return

            self.get_space_info(space_id)
            return

        elif slug == "pending_invites":
            self.get_invites_for_current_user()
            return

        elif slug == "pending_requests":
            self.get_requests_for_current_user()
            return

        elif slug == "join_requests":
            try:
                space_id = self.get_argument("id")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:id"})
                return

            self.get_join_requests_for_space(space_id)
            return

        elif slug == "invites":
            try:
                space_id = self.get_argument("id")
            except:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:id"})
                return

            self.get_invites_for_space(space_id)
            return

        elif slug == "files":
            try:
                space_id = self.get_argument("id")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:id"})
                return

            self.get_files(space_id)
            return

        else:
            self.set_status(404)

    @auth_needed
    async def post(self, slug):
        """
        POST /spaceadministration/create
            query param:
                "name" : space name to create, mandatory argument
                "invisible" : boolean to mark if space should be visible to users in overview or not, optional argument, default False
                "joinable" : boolean to mark if space should be joinable to user or only upon request, optional argument, default True

            returns:
                200 OK,
                {"success": True,
                 "space_id": "<created_space_id>"}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:name}

                401 Unauthorized
                {"success": False,
                 "reason": "insufficient_permission"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

        POST /spaceadministration/join
            (currently authed user joins space or sends a join request (depending on permissions), which case happened is indicated by join_type in response)
            query param:
                "id" : space _id of which space to join, mandatory argument

            returns:
                200 OK,
                {"success": True
                 "join_type": "joined" OR "requested_join"}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

        POST /spaceadministration/add_admin
            (add given user to space admin list (only space admin or global admin can do that))
            query param:
                "id" : space _id in which the privilege should be granted, mandatory argument
                "user": the username which to add as a space admin, mandatory argument

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:user}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

        POST /spaceadministration/space_picture
            LEGACY COMPATIBILITY ROUTE, use /spaceadministration/space_information instead
            (update space picture)
            query param:
                "name" : space name of which space to update space picture, mandatory argument

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:name}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

        POST /spaceadministration/space_information
            (update the space's description and/or picture,
            requires space admin or global admin privileges)
            query param:
                "id" : space _id of which space to update, mandatory argument

            http body:
                {
                    "description": "<str>",
                    "picture": {
                        "payload": "<base64_encoded_image>",
                        "type": "<image/jpeg|image/png|...>"
                    }
                }

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:name}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

        POST /spaceadministration/invite
            (invite a user into a space (requires space admin or global admin privileges))
            query param:
                "id": space _id of which to invite the user into
                "user": username to invite

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:user}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

        POST /spaceadministration/accept_invite
            (current user accepts invite into a space)
            query param:
                "id": space _id of which the current user accepts the invite into

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_is_not_invited_into_space"}

        POST /spaceadministration/decline_invite
            (current user declines invite into a space)
            query param:
                "id": space _id of which the invite should be declined

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                400 Bad Request
                {"success": False,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_is_not_invited_into_space"}

        POST /spaceadministration/revoke_invite
            (space admin or global admin revokes the sent invite to a user)
            query param:
                "id": space _id of which the invite should be declined
                "user": username to revoke the invite from

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:user}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_is_not_invited_into_space"}

        POST /spaceadministration/accept_request
            (space admin or global admin accept join request of a user)
            query param:
                "id": space _id of which the request into will be accepted
                "user": username whose request will be accepted

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:user}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_didnt_request_to_join"}

        POST /spaceadministration/reject_request
            (space admin or global admin rejects join request of as user)
            query param:
                "id": space _id of which the request will be rejected
                "user": username whose request will be rejected

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:user}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_didnt_request_to_join"}

        POST /spaceadministration/revoke_request
            (current user revokes his own join request to a space)
            query param:
                "id": space _id of which the request will be rejected

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_didnt_request_to_join"}

        POST /spaceadministration/toggle_visibility
            (toggle invisible state of space, i.e. true --> false, false --> true, requires space admin or global admin privileges)
            query param:
                "id" : the space _id which to trigger

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                400 Bad Request
                {"success": False,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

        POST /spaceadministration/toggle_joinability
            (toggle joinable state of space, i.e. true --> false, false --> true, requires space admin or global admin privileges)
            query param:
                "id" : the space _id which to trigger

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                400 Bad Request
                {"success": False,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

        POST /spaceadministration/put_file
            add a new file to the space's repository
            query param:
                "id": the _id of the space

            form data:
                "file": the file to upload

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                400 Bad Request
                {"success": False,
                 "reason": missing_file:file}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_not_member_of_space"}
        """

        # join_discussion and create route doesnt need space id, so only
        # throw 400 for missing space name
        # if request is not towards this route
        if slug != "create":
            try:
                space_id = self.get_argument("id")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:id"})
                return

        if slug == "create":
            try:
                space_name = self.get_argument("name")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:name"})
                return
            invisible = self.get_argument("invisible", False)
            # apparentry the "false" str is true, pain
            if invisible == "false":
                invisible = False
            # explicit bool cast in case user puts any string or int value that is not already "true" (will be interpreted as true then)
            invisible = bool(invisible)

            joinable = self.get_argument("joinable", True)
            if joinable == "false":
                joinable = False
            joinable = bool(joinable)

            self.create_space(space_name, invisible, joinable)
            return

        elif slug == "join":
            await self.join_space(space_id)
            return

        elif slug == "add_admin":
            try:
                username = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:user"})
                return

            self.add_admin_to_space(space_id, username)
            return

        elif slug == "space_picture":
            space_description = self.get_body_argument("space_description", None)
            self.update_space_information_legacy(space_id, space_description)
            return

        elif slug == "space_information":
            http_body = json.loads(self.request.body)
            space_description = (
                http_body["description"] if "description" in http_body else None
            )

            if "picture" in http_body:
                space_pic_obj = {
                    "body": b64decode(http_body["picture"]["payload"]),
                    "content_type": http_body["picture"]["type"],
                }
                filename = "avatar_{}".format(space_id)
                self.update_space_information(
                    space_id,
                    space_description,
                    filename,
                    space_pic_obj["body"],
                    space_pic_obj["content_type"],
                )
            else:
                self.update_space_information(space_id, space_description)

        elif slug == "invite":
            try:
                username = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:user"})
                return

            await self.invite_user_into_space(space_id, username)
            return

        elif slug == "accept_invite":
            self.accept_space_invite(space_id)
            return

        elif slug == "decline_invite":
            self.decline_space_invite(space_id)
            return

        elif slug == "revoke_invite":
            try:
                username = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:user"})
                return

            self.revoke_space_invite(space_id, username)
            return

        elif slug == "accept_request":
            try:
                username = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:user"})
                return

            self.accept_join_space_request(space_id, username)
            return

        elif slug == "reject_request":
            try:
                username = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:user"})
                return

            self.reject_join_space_request(space_id, username)
            return

        elif slug == "revoke_request":
            self.revoke_join_space_request(space_id)
            return

        elif slug == "toggle_visibility":
            self.toggle_space_visibility(space_id)
            return

        elif slug == "toggle_joinability":
            self.toggle_space_joinability(space_id)
            return

        elif slug == "put_file":
            if "file" not in self.request.files or not self.request.files["file"][0]:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_file:file"})
                return

            file_obj = self.request.files["file"][0]
            self.put_new_file(
                space_id,
                file_obj["filename"],
                file_obj["body"],
                file_obj["content_type"],
            )
            return

        else:
            self.set_status(404)

    @auth_needed
    def delete(self, slug):
        """
        DELETE /spaceadministration/leave
            (currently authed user leaves space)
            query param:
                "id" : space _id to leave from, mandatory argument

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id"}

                400 Bad Request
                {"success": False,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "no_other_admins_left"}

        DELETE /spaceadministration/kick
            (kick a user from the space, requires being global or space admin)
            query param:
                "id" : space _id to kick the user from, mandatory argument
                "user" : user name to kick from the space, mandatory argument

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id"}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:user"}

                400 Bad Request
                {"success": False,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission}

        DELETE /spaceadministration/remove_admin
            (revoke space admin privileges from given user (requires global admin privileges to do that))
            query param:
                "id" : space _id in which the privilege should be revoked, mandatory argument
                "user": the username which to remove as a space admin, mandatory argument

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:id}

                400 Bad Request
                {"success": False,
                 "reason": missing_key:user}

                400 Bad Request
                {"success": False,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

        DELETE /spaceadministration/delete_file
            remove an uploaded file from the space, requires being the uploader
            or space admin / global admin
            query param:
                "id" : space _id of which space to delete, mandatory argument
                "file_id": id of the file to delete, mandatory argument

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "file_doesnt_exist_in_space"}

                409 Conflict
                {"success": False,
                 "reason": "file_belongs_to_post"}
                --> file was not uploaded manually but landed in the files as part of a
                    post, so it can only be deleted by deleting the post itself

        DELETE /spaceadministration/delete_space
            (space will be deleted, requires being global or space admin)
            query param:
                "id" : space _id of which space to delete, mandatory argument

            returns:
                200 OK,
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id"}

                400 Bad Request
                {"success": False,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission}
        """

        try:
            space_id = self.get_argument("id")
        except tornado.web.MissingArgumentError as e:
            self.set_status(400)
            self.write({"success": False, "reason": "missing_key:id"})
            return

        if slug == "leave":
            self.user_leave(space_id)
            return

        elif slug == "kick":
            try:
                user_name = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:user"})
                return

            self.user_kick(space_id, user_name)
            return

        elif slug == "remove_admin":
            try:
                username = self.get_argument("user")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:user"})
                return

            self.remove_admin_from_space(space_id, username)
            return

        elif slug == "delete_file":
            try:
                file_id = self.get_argument("file_id")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_key:file_id"})
                return

            self.delete_file(space_id, file_id)
            return

        elif slug == "delete_space":
            self.delete_space(space_id)
            return

        else:
            self.set_status(404)
            return

    ##############################################################################
    #                             helper functions                               #
    ##############################################################################

    def list_spaces(self) -> None:
        """
        list all available spaces, requires admin privilegs
        because it includes invisible spaces
        """

        # abort if user is not global admin
        if not self.get_current_user_role() == "admin":
            self.set_status(403)
            self.write({"success": False, "reason": "insufficient_permission"})
            return

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            spaces = space_manager.get_all_spaces()

        self.set_status(200)
        self.write(self.json_serialize_response({"success": True, "spaces": spaces}))
        return

    def list_spaces_except_invisible(self) -> None:
        """
        list available spaces (except invisible spaces, that you are not a member of)
        i.e. list spaces that:
            - have invisible parameter set to false
            - have no invisible parameter (for legacy spaces from before this feature was implemented)
            - you are a member of (no matter visibility setting)
        """

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            spaces = space_manager.get_all_spaces_visible_to_user(
                self.current_user.username
            )

        self.set_status(200)
        self.write(self.json_serialize_response({"success": True, "spaces": spaces}))
        return

    def list_personal_spaces(self) -> None:
        """
        list all spaces that the current user is a member of
        """

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            spaces = space_manager.get_spaces_of_user(self.current_user.username)

        self.set_status(200)
        self.write(self.json_serialize_response({"success": True, "spaces": spaces}))
        return

    def get_space_info(self, space_id: str | ObjectId) -> None:
        """
        get details about the space given by its _id.
        if it is invisible, you need to be a member or an admin to be allowed to see it
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(space_id)

        if not space:
            self.set_status(409)
            self.write({"success": False, "reason": "space_doesnt_exist"})
            return

        if "invisible" in space and space["invisible"] is True:
            if not (
                self.current_user.username in space["members"]
                or self.is_current_user_lionet_admin()
            ):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

        self.set_status(200)
        self.write(self.json_serialize_response({"success": True, "space": space}))
        return

    def get_invites_for_current_user(self) -> None:
        """
        get all pending invites into spaces for the current user
        """

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            pending_invites = space_manager.get_space_invites_of_user(
                self.current_user.username
            )

        self.set_status(200)
        self.write(
            self.json_serialize_response(
                {"success": True, "pending_invites": pending_invites}
            )
        )

    def get_requests_for_current_user(self) -> None:
        """
        get all pending requests to join spaces for the current user
        """

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            pending_requests = space_manager.get_space_requests_of_user(
                self.current_user.username
            )

        self.set_status(200)
        self.write(
            self.json_serialize_response(
                {"success": True, "pending_requests": pending_requests}
            )
        )

    def get_invites_for_space(self, space_id: str | ObjectId) -> None:
        """
        view invites for the given space (requires space admin or global admin privileges)
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(
                space_id,
                projection={"_id": False, "admins": True, "invites": True},
            )

        # abort if space doesnt exist
        if not space:
            self.set_status(409)
            self.write({"success": False, "reason": "space_doesnt_exist"})
            return

        # abort if user is neither space nor global admin
        if not (
            self.current_user.username in space["admins"]
            or self.get_current_user_role() == "admin"
        ):
            self.set_status(403)
            self.write({"success": False, "reason": "insufficient_permission"})
            return

        self.set_status(200)
        self.write(
            self.json_serialize_response({"success": True, "invites": space["invites"]})
        )

    def get_join_requests_for_space(self, space_id: str | ObjectId) -> None:
        """
        view join requests for the given space (requires space admin or global admin privileges)
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(
                space_id,
                projection={"_id": False, "admins": True, "requests": True},
            )

        # abort if space doesnt exist
        if not space:
            self.set_status(409)
            self.write({"success": False, "reason": "space_doesnt_exist"})
            return

        # abort if user is neither space nor global admin
        if not (
            self.current_user.username in space["admins"]
            or self.get_current_user_role() == "admin"
        ):
            self.set_status(403)
            self.write({"success": False, "reason": "insufficient_permission"})
            return

        self.set_status(200)
        self.write(
            self.json_serialize_response(
                {"success": True, "join_requests": space["requests"]}
            )
        )

    def get_files(self, space_id: str | ObjectId) -> None:
        """
        get the file metadata of all files in the space.
        metadata means author and filename, use the filename to retrieve the actual
        file from the `StaticFileHandler` on the /uploads endpoint by using
        /uploads/<space_id>/<filename>
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            acl = ACL(db)

            # reject if user is not a member or space doesnt exist at all
            try:
                if not space_manager.check_user_is_member(
                    space_id, self.current_user.username
                ):
                    self.set_status(409)
                    self.write({"success": False, "reason": "user_not_member_of_space"})
                    return
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # reject if user is not allowed to view files
            if not acl.space_acl.ask(
                self.current_user.username, space_id, "read_files"
            ):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

            files = space_manager.get_files(space_id)

            self.set_status(200)
            self.write(self.json_serialize_response({"success": True, "files": files}))

    def create_space(
        self, space_name: str, is_invisible: bool, is_joinable: bool
    ) -> None:
        """
        create a new space if the ncurrent user has sufficient permissions
        """

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            acl = ACL(db)

            # check if the user has permission
            if not acl.global_acl.ask(self.get_current_user_role(), "create_space"):
                self.set_status(403)
                self.write(
                    {
                        "success": False,
                        "reason": "insufficient_permission",
                    }
                )
                return

            space = {
                "name": space_name,
                "invisible": is_invisible,
                "joinable": is_joinable,
                "members": [self.current_user.username],
                "admins": [self.current_user.username],
                "invites": [],
                "requests": [],
                "files": [],
                "space_pic": "default_group_pic.jpg",
                "space_description": "",
            }

            try:
                # create the space
                _id = space_manager.create_space(space)
            except ValueError:
                self.set_status(500)
                self.write(
                    {
                        "success": False,
                        "reason": "unexpectedly_missing_required_attribute",
                    }
                )
                return
            except TypeError:
                self.set_status(500)
                self.write({"success": False, "reason": "unexpected_type_mismatch"})
                return

            # also create default acl entry for the space admin user
            acl.space_acl.insert_admin(self.current_user.username, _id)

        self.set_status(200)
        self.serialize_and_write({"success": True, "space_id": _id})

    async def join_space(self, space_id: str | ObjectId) -> None:
        """
        let current user join the space, if he has sufficient permissions
        if not, let him send a join request instead
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            acl = ACL(db)

            try:
                # reject if the user is already a space member
                if space_manager.check_user_is_member(
                    space_id, self.current_user.username
                ):
                    self.set_status(409)
                    self.write({"success": False, "reason": "user_already_member"})
                    return
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # if user is not allowed to join spaces directly,
            # or user doesnt have elevated permissions to join any space,
            # send join request instead of joining directly
            # and notify the space admins about the request
            if not space_manager.is_space_directly_joinable(space_id):
                if not self.is_current_user_lionet_admin():
                    space_manager.join_space_request(
                        space_id, self.current_user.username
                    )

                    # notify space admins about the join request
                    space = space_manager.get_space(space_id, projection={"admins": True, "name": True})
                    for admin in space["admins"]:
                        notification_payload = {
                            "join_request_sender": self.current_user.username,
                            "space_name": space["name"],
                            "space_id": space_id
                        }
                        notification_manager = NotificationResource(db)
                        await notification_manager.send_notification(
                            admin, "space_join_request", notification_payload
                        )

                    self.set_status(200)
                    self.write({"success": True, "join_type": "requested_join"})
                    return

            # user has permission to join spaces, directly add him as member
            space_manager.join_space(space_id, self.current_user.username)
            if self.is_current_user_lionet_admin():
                acl.space_acl.insert_admin(self.current_user.username, space_id)
            else:
                acl.space_acl.insert_default(self.current_user.username, space_id)

        self.set_status(200)
        self.write({"success": True, "join_type": "joined"})

    def add_admin_to_space(self, space_id: str | ObjectId, username: str) -> None:
        """
        add another user as a space admin to the space, requires space admin or global admin to perform this operation
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(
                space_id, projection={"_id": False, "members": True, "admins": True}
            )

            # reject if space doesnt exist
            if not space:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # reject is user is not even a member of the space
            # technically this could be allowed here and
            # we could also set the member status
            # but this would kinda be a side effect then
            if username not in space["members"]:
                self.set_status(409)
                self.write({"success": False, "reason": "user_not_member_of_space"})
                return

            # reject if calling user is neither global nor space admin
            if not (
                (self.current_user.username in space["admins"])
                or (self.get_current_user_role() == "admin")
            ):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

            # user is either space admin or global admin and
            # therefore is allowed to add space admin
            try:
                space_manager.add_space_admin(space_id, username)

                # also elevate the users permissions in the acl
                acl = ACL(db)
                acl.space_acl.insert_admin(username, space_id)

                self.set_status(200)
                self.write({"success": True})
            except AlreadyAdminError:
                self.set_status(409)
                self.write({"success": False, "reason": "user_already_admin"})
                # TODO test
                return

    def update_space_information(
        self,
        space_id: str | ObjectId,
        space_description: str = None,
        space_pic_filename: str = None,
        space_pic: bytes = None,
        space_pic_content_type: str = None,
    ):
        """
        update space information (description, picture)
        requires space admin or global admin privileges
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            # check if user is either space or global admin
            try:
                if not (
                    space_manager.check_user_is_space_admin(
                        space_id, self.current_user.username
                    )
                    or self.is_current_user_lionet_admin()
                ):
                    self.set_status(403)
                    self.write({"success": False, "reason": "insufficient_permission"})
                    return
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            if space_pic_filename and space_pic and space_pic_content_type:
                space_manager.set_space_picture(
                    space_id,
                    space_pic_filename,
                    space_pic,
                    space_pic_content_type,
                )

            if space_description:
                space_manager.set_space_description(space_id, space_description)

            self.set_status(200)
            self.write({"success": True})

    def update_space_information_legacy(
        self, space_name: str, space_description: Optional[str]
    ) -> None:
        """
        ONLY TO KEEP BACKWARDS COMPATIBILITY WITH OLD SYSTEM

        update space picture and space description,
        requires space admin or global admin privileges
        """

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            # check if user is either space or global admin
            try:
                if not (
                    space_manager.check_user_is_space_admin(
                        space_name, self.current_user.username
                    )
                    or self.is_current_user_lionet_admin()
                ):
                    self.set_status(403)
                    self.write({"success": False, "reason": "insufficient_permission"})
                    return
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # save the new picture to disk and store the filename
            # TODO transform to base64 in http body as in profile update request
            if "space_pic" in self.request.files:
                space_pic_obj = self.request.files["space_pic"][0]
                space_manager.set_space_picture(
                    space_name,
                    space_pic_obj["filename"],
                    space_pic_obj["body"],
                    space_pic_obj["content_type"],
                )

            # update the space description
            if space_description:
                space_manager.set_space_description(space_name, space_description)

            self.set_status(200)
            self.write({"success": True})

    async def invite_user_into_space(self, space_id: str | ObjectId, username: str) -> None:
        """
        invite a user into the space
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(
                space_id, projection={"members": True, "admins": True, "name": True}
            )

            # abort if space doesnt exist
            if not space:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # reject if user is already a member of the space
            if username in space["members"]:
                self.set_status(409)
                self.write({"success": False, "reason": "user_already_member"})
                return

            # abort if user is neither space nor global admin
            if not (
                self.current_user.username in space["admins"]
                or self.get_current_user_role() == "admin"
            ):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

            # add username to invited users set
            space_manager.invite_user(space_id, username)

            # trigger notification dispatch
            notification_payload = {
                "invitation_sender": self.current_user.username,
                "invitation_recipient": username,
                "space_name": space["name"],
                "space_id": space_id
            }
            notification_manager = NotificationResource(db)
            await notification_manager.send_notification(
                username, "space_invitation", notification_payload
            )

            self.set_status(200)
            self.write({"success": True})

    def accept_space_invite(self, space_id: str | ObjectId) -> None:
        """
        current user accept invite into space
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(
                space_id, projection={"_id": False, "invites": True}
            )

            # abort if space doesnt exist
            if not space:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # abort if user wasn't even invited into space in first place (= prevent sneaking in)
            if self.current_user.username not in space["invites"]:
                self.set_status(409)
                self.write(
                    {"success": False, "reason": "user_is_not_invited_into_space"}
                )
                return

            # add user to members and pull them from pending invites
            space_manager.accept_space_invite(space_id, self.current_user.username)

            self.set_status(200)
            self.write({"success": True})

    def decline_space_invite(self, space_id: str | ObjectId) -> None:
        """
        current user declines invite into space
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(
                space_id, projection={"_id": False, "invites": True}
            )

            # abort if space doesnt exist
            if not space:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # abort if user wasn't even invited into space in first place
            if self.current_user.username not in space["invites"]:
                self.set_status(409)
                self.write(
                    {"success": False, "reason": "user_is_not_invited_into_space"}
                )
                return

            # decline the invite
            space_manager.decline_space_invite(space_id, self.current_user.username)

            self.set_status(200)
            self.write({"success": True})

    def revoke_space_invite(self, space_id: str | ObjectId, username: str) -> None:
        """
        space admin or global admin revokes the invitation of a user
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(
                space_id,
                projection={
                    "_id": False,
                    "invites": True,
                    "admins": True,
                    "members": True,
                },
            )

            # abort if space doesnt exist
            if not space:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # abort if user wasn't even invited into space in first place
            if username not in space["invites"]:
                self.set_status(409)
                self.write(
                    {"success": False, "reason": "user_is_not_invited_into_space"}
                )
                return

            # abort if user is neither space nor global admin
            if not (
                self.current_user.username in space["admins"]
                or self.get_current_user_role() == "admin"
            ):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

            # revoke the invite, i.e. remove the user from the invites list
            space_manager.revoke_space_invite(space_id, username)

            self.set_status(200)
            self.write({"success": True})

    def accept_join_space_request(
        self, space_id: str | ObjectId, username: str
    ) -> None:
        """
        space admin or global admin accepts the request of a user to join the space
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(
                space_id, projection={"_id": False, "requests": True, "admins": True}
            )

            # abort if space doesnt exist
            if not space:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # abort if user didn't request to join
            if username not in space["requests"]:
                self.set_status(409)
                self.write({"success": False, "reason": "user_didnt_request_to_join"})
                return

            # abort if user is neither space nor global admin
            if not (
                self.current_user.username in space["admins"]
                or self.is_current_user_lionet_admin()
            ):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

            # accept request
            space_manager.accept_join_request(space_id, username)

            self.set_status(200)
            self.write({"success": True})

    def reject_join_space_request(
        self, space_id: str | ObjectId, username: str
    ) -> None:
        """
        space admin or global admin rejects join request of a user
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(
                space_id, projection={"_id": False, "requests": True, "admins": True}
            )

            # abort if space doesnt exist
            if not space:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # abort if user didn't request to join
            if username not in space["requests"]:
                self.set_status(409)
                self.write({"success": False, "reason": "user_didnt_request_to_join"})
                return

            # abort if user is neither space nor global admin
            if not (
                self.current_user.username in space["admins"]
                or self.is_current_user_lionet_admin()
            ):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

            # decline request
            space_manager.reject_join_request(space_id, username)

            self.set_status(200)
            self.write({"success": True})

    def revoke_join_space_request(self, space_id: str | ObjectId) -> None:
        """
        current user revokes his own request to join a space
        """

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(
                space_id, projection={"_id": False, "requests": True}
            )

            # abort if space doesnt exist
            if not space:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # abort if user didn't request to join
            if self.current_user.username not in space["requests"]:
                self.set_status(409)
                self.write({"success": False, "reason": "user_didnt_request_to_join"})
                return

            # revoke request
            space_manager.revoke_join_request(space_id, self.current_user.username)

            self.set_status(200)
            self.write({"success": True})

    def toggle_space_visibility(self, space_id: str | ObjectId) -> None:
        """
        toggle invisible state of space depending on current state, i.e. true --> false, false --> true
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            try:
                # abort if user is neither space nor global admin
                if not (
                    space_manager.check_user_is_space_admin(
                        space_id, self.current_user.username
                    )
                    or self.is_current_user_lionet_admin()
                ):
                    self.set_status(403)
                    self.write({"success": False, "reason": "insufficient_permission"})
                    return
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # toggle visibility
            space_manager.toggle_visibility(space_id)

            self.set_status(200)
            self.write({"success": True})

    def toggle_space_joinability(self, space_id: str | ObjectId) -> None:
        """
        toggle joinable state of space depending on current state, i.e. true --> false, false --> true
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            try:
                # abort if user is neither space nor global admin
                if not (
                    space_manager.check_user_is_space_admin(
                        space_id, self.current_user.username
                    )
                    or self.is_current_user_lionet_admin()
                ):
                    self.set_status(403)
                    self.write({"success": False, "reason": "insufficient_permission"})
                    return
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # toggle joinability
            space_manager.toggle_joinability(space_id)

            self.set_status(200)
            self.write({"success": True})

    def put_new_file(
        self,
        space_id: str | ObjectId,
        file_name: str,
        file_content: bytes,
        content_type: str,
    ) -> None:
        """
        add a new file to the space's 'repository'.
        each space has an own directory in the uploads directory, where the files will be stored.
        using the filename of the file that was just stored, you can retrieve the actual content
        of the file using the `StaticFileHandler` on the uploads-endpoint using
        /uploads/<space_id>/<file_name>
        :param space_id: the _id of the space where to upload the new file
        :param file_name: the name of the new file
        :param file_content: the body of the file as raw bytes
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            acl = ACL(db)

            # reject if user is not a member or space doesnt exist at all
            try:
                if not space_manager.check_user_is_member(
                    space_id, self.current_user.username
                ):
                    self.set_status(409)
                    self.write({"success": False, "reason": "user_not_member_of_space"})
                    return
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # reject if user is not allowed to add files
            if not acl.space_acl.ask(
                self.current_user.username, space_id, "write_files"
            ):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

            space_manager.add_new_repo_file(
                space_id,
                file_name,
                file_content,
                content_type,
                self.current_user.username,
            )

        self.set_status(200)
        self.write({"success": True})

    def user_leave(self, space_id: str | ObjectId) -> None:
        """
        let the current user leave the space
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            try:
                space_manager.leave_space(space_id, self.current_user.username)
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return
            except OnlyAdminError:
                self.set_status(409)
                self.write({"success": False, "reason": "no_other_admins_left"})
                return

            self.set_status(200)
            self.write({"success": True})

    def user_kick(self, space_id: str | ObjectId, user_name: str) -> None:
        """
        kick a user from the space, requires space admin or global admin privileges
        if the to-be-kicked user is a space admin himself,
        global admin privileges are required to prevent space admins from kicking each other
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            try:
                # in order to kick an admin from the space,
                # you have to be global admin (prevents space admins from kicking each other)
                # TODO reject kick if user is the only admin left, i.e. if he is the last admin
                # he cannot be kicked unless another admin is added first
                if space_manager.check_user_is_space_admin(space_id, user_name):
                    if not self.is_current_user_lionet_admin():
                        self.set_status(403)
                        self.write(
                            {
                                "success": False,
                                "reason": "insufficient_permission",
                                "hint": """need to be global admin to kick another admin from the space 
                                        (prevent kicking of space admins between each other)""",
                            }
                        )
                        return
                # if the user is just a normal member, a space admin is also eligible to kick him
                else:
                    # check if user is either space or global admin
                    if not (
                        space_manager.check_user_is_space_admin(
                            space_id, self.current_user.username
                        )
                        or self.is_current_user_lionet_admin()
                    ):
                        self.set_status(403)
                        self.write(
                            {"success": False, "reason": "insufficient_permission"}
                        )
                        return
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # permission were successful, kick user
            try:
                space_manager.kick_user(space_id, user_name)
            except UserNotMemberError:
                self.set_status(409)
                self.write({"success": False, "reason": "user_not_member_of_space"})
                return

            self.set_status(200)
            self.write({"success": True})

    def remove_admin_from_space(self, space_id: str | ObjectId, username: str) -> None:
        """
        remove user as space admin, requires global admin privileges
        to prevent space admins from degrading each other
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            # abort if current user is no global admin
            if not (self.is_current_user_lionet_admin()):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

            try:
                space_manager.revoke_space_admin_privilege(space_id, username)
                self.set_status(200)
                self.write({"success": True})
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return
            except UserNotAdminError:
                self.set_status(409)
                self.write({"success": False, "reason": "user_not_space_admin"})
                return
            except OnlyAdminError:
                # TODO test this case
                self.set_status(409)
                self.write({"success": False, "reason": "no_other_admins_left"})
                return

    def delete_space(self, space_id: str | ObjectId) -> None:
        """
        delete a space, requires space admin or global admin privileges
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            try:
                # abort if user is neither space nor global admin
                if not (
                    space_manager.check_user_is_space_admin(
                        space_id, self.current_user.username
                    )
                    or self.is_current_user_lionet_admin()
                ):
                    self.set_status(403)
                    self.write({"success": False, "reason": "insufficient_permission"})
                    return

                space_manager.delete_space(space_id)

                self.set_status(200)
                self.write({"success": True})
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

    def delete_file(self, space_id: str | ObjectId, file_id: str | ObjectId) -> None:
        """
        delete an uploaded file from the space
        the user has to be either global or space admin, or the author (==uploader)
        of the file.
        """

        space_id = util.parse_object_id(space_id)
        file_id = util.parse_object_id(file_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            space = space_manager.get_space(
                space_id, projection={"_id": False, "files": True, "admins": True}
            )

            # abort if space doesnt exist
            if not space:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # search for the desired file, if found, do permission checks
            for file_obj in space["files"]:
                if file_obj["file_id"] == file_id:
                    # to delete a file, the user either has to be the author (==uploader),
                    # a space admin or a global admin. if he is not any of these, reply
                    # with insufficient permission
                    if self.current_user.username != file_obj["author"]:
                        if self.current_user.username not in space["admins"]:
                            if not self.is_current_user_lionet_admin():
                                self.set_status(403)
                                self.write(
                                    {
                                        "success": False,
                                        "reason": "insufficient_permission",
                                    }
                                )
                                return

                    # permission checks have passed, delete the file
                    # last error is if the file belongs to a post
                    # in this case, it is not deletable directly,
                    # but only by deleting the whole post
                    try:
                        space_manager.remove_file(space_id, file_id)
                        self.set_status(200)
                        self.write({"success": True})
                        return
                    except PostFileNotDeleteableError:
                        self.set_status(409)
                        self.write({"success": False, "reason": "file_belongs_to_post"})
                        return

            # after iterating all files of the space, no match was found --> reply error
            self.set_status(409)
            self.write({"success": False, "reason": "file_doesnt_exist_in_space"})
