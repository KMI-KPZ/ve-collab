import json

from acl import get_acl
from handlers.base_handler import BaseHandler, auth_needed
import util


class PermissionHandler(BaseHandler):

    @auth_needed
    async def get(self):
        role = await util.request_role(self.current_user.username)
        self.set_status(200)
        self.write({"status": 200,
                    "role": role})


class RoleHandler(BaseHandler):

    @auth_needed
    def get(self):
        """
        GET /role
            request the role of the current user
        """

        role_result = self.db.roles.find_one(
            {"username": self.current_user.username}
        )
        print(role_result)

        if role_result:
            self.set_status(200)
            self.write({"username": role_result["username"],
                        "role": role_result["role"]})
        else:
            # no record for this user was found, insert as guest (default role)
            # TODO guest as default role?
            self.db.roles.insert_one(
                {"username": self.current_user.username,
                 "role": "guest"}
            )

            self.set_status(200)
            self.write({"username": self.current_user.username,
                        "role": "guest"})
    # TODO get_all

    @auth_needed
    async def post(self):
        """
        POST /role
            update or set the role of a user

            http body:
            {
                "username": "<user>",
                "role": "<role>"
            }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                 401 Unauthorized
                {"status": 401,
                 "reason": "user_not_admin"}
        """

        if await util.is_admin(self.current_user.username):
            http_body = json.loads(self.request.body)

            if any(key not in http_body for key in ("username", "role")):
                self.set_status(400)
                self.write({"status": 400,
                            "reason": "missing_key_in_http_body"})
                return

            username = http_body["username"]
            role = http_body["role"]

            self.db.roles.update_one(
                {"username": username},
                {"$set":
                     {
                         "username": username,
                         "role": role
                      }
                },
                upsert=True
            )

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})
        else:
            self.set_status(403)
            self.write({"status": 403,
                        "reason": "user_not_admin"})


class GlobalACLHandler(BaseHandler):

    @auth_needed
    async def get(self, slug):
        """
        GET /global_acl/get
            get the current user's acl entry

            returns:
                200 OK,
                {"status": 200,
                 "acl_entry": <entry_dict>}

                409 Conflict
                {"status": 409,
                 "reason": "user_has_no_role"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

        or

        GET /global_acl/get_all
            get the full set of rules from the acl (requires admin)

            returns:
                200 OK,
                {"status": 200,
                 "acl_entries": [<entry_dicts>]}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                 401 Unauthorized
                {"status": 401,
                 "reason": "user_not_admin"}

        """

        if slug == "get":
            acl = get_acl().global_acl
            # since acl is role-based, we need to query for the current user's role
            current_user_role = self.get_current_user_role()
            if current_user_role:
                acl_entry = acl.get(current_user_role)

                # inconsistency problem: the role exists, but no acl entry. construct an acl entry that has all permissions set to false
                if not acl_entry:
                    acl_entry = {}
                    for acl_key in acl.get_existing_keys():
                        if acl_key != "role":
                            acl_entry[acl_key] = False
                    acl_entry["role"] = current_user_role["role"]

                self.set_status(200)
                self.write({"status": 200,
                            "acl_entry": acl_entry})
            else:
                self.set_status(409)
                self.write({"status": 409,
                            "reason": "user_has_no_role"})

        elif slug == "get_all":
            if await util.is_admin(self.current_user.username):
                acl = get_acl().global_acl
                entries = acl.get_all()

                self.set_status(200)
                self.write({"status": 200,
                            "acl_entries": entries})
            else:
                self.set_status(403)
                self.write({"status": 403,
                            "reason": "user_not_admin"})

        else:
            self.set_status(404)

    @auth_needed
    async def post(self, slug):
        """
        POST /global_acl/update
            update or set the value(s) of an acl entry.
            an acl entry is of the following structure in the http body:

            {
                "role": "<name of role>",
                "create_space": "True/False"
            }

        """

        if slug == "update":
            if await util.is_admin(self.current_user.username):
                acl = get_acl().global_acl
                http_body = json.loads(self.request.body)

                # check if the http body only contains valid keys (i.e. keys that exist in the acl)
                if any(key not in acl.get_existing_keys() for key in http_body):
                    self.set_status(400)
                    self.write({"status": 400,
                                "reason": "unrecognizable_key_in_http_body"})
                    return

                # check if http body only contains boolean values, except for the role attribute
                for key in http_body:
                    if key != "role":
                        if not isinstance(http_body[key], bool):
                            self.set_status(400)
                            self.write({"status": 400,
                                        "reason": "value_not_bool_in_http_body"})
                            return

                acl.set_all(http_body)

                self.set_status(200)
                self.write({"status": 200,
                            "success": True})
            else:
                self.set_status(403)
                self.write({"status": 403,
                            "reason": "user_not_admin"})
        else:
            self.set_status(404)


class SpaceACLHandler(BaseHandler):

    @auth_needed
    async def get(self, slug):
        """
        GET /space_acl/get
            get the current user's acl entry

            http_body:
            {
                "space": "<space_name>"
            }

            returns:
                200 OK,
                {"status": 200,
                 "acl_entry": <entry_dict>}

                409 Conflict
                {"status": 409,
                 "reason": "user_has_no_role"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

        or

        GET /space_acl/get_all
            get the full set of rules from the acl for a given space (requires either global or space admin)

            http_body:
            {
                "space": "<space_name>"
            }

            returns:
                200 OK,
                {"status": 200,
                 "acl_entries": [<entry_dicts>]}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                 401 Unauthorized
                {"status": 401,
                 "reason": "user_not_admin"}

        """
        http_body = json.loads(self.request.body)

        if slug == "get":
            if "space" not in http_body:
                self.set_status(400)
                self.write({"status": 400,
                            "reason": "missing_key_in_http_body"})
                return
            space_name = http_body["space"]

            acl = get_acl().space_acl
            # since acl is role-based, we need to query for the current user's role
            current_user_role = self.get_current_user_role()
            if current_user_role:
                acl_entry = acl.get(current_user_role, space_name)

                # inconsistency problem: the role exists, but no acl entry. construct an acl entry that has all permissions set to false
                if not acl_entry:
                    acl_entry = {}
                    for acl_key in acl.get_existing_keys():
                        if acl_key != "role" and acl_key != "space":
                            acl_entry[acl_key] = False
                    acl_entry["role"] = current_user_role["role"]
                    acl_entry["space"] = space_name

                self.set_status(200)
                self.write({"status": 200,
                            "acl_entry": acl_entry})
            else:
                self.set_status(409)
                self.write({"status": 409,
                            "reason": "user_has_no_role"})

        elif slug == "get_all":
            space_name = http_body["space"]
            # check if the user is either global admin or space admin, if not return
            if not await util.is_admin(self.current_user.username):
                space = self.db.spaces.find_one({"name": space_name})
                if not space:
                    self.set_status(400)
                    self.write({"status": 400,
                                "reason": "space_doesnt_exist"})
                    return
                if self.current_user.username not in space["admins"]:
                    self.set_status(403)
                    self.write({"status": 403,
                                "reason": "insufficient permission"})
                    return

            acl = get_acl().space_acl
            entries = acl.get_all(space_name)

            self.set_status(200)
            self.write({"status": 200,
                        "acl_entries": entries})

        else:
            self.set_status(404)

    @auth_needed
    async def post(self, slug):
        """
        POST /space_acl/update
            update or set the value(s) of an acl entry.
            an acl entry is of the following structure in the http body:

            {
                "role": "<role>",
                "space": "<space>",
                "join_space": True/False,
                "read_timeline": True/False,
                "post": True/False,
                "comment": True/False,
                "read_wiki": True/False,
                "write_wiki": True/False,
                "read_files": True/False,
                "write_files": True/False
            }

        """

        if slug == "update":
            http_body = json.loads(self.request.body)
            acl = get_acl().space_acl

            # check if the http body only contains valid keys (i.e. keys that exist in the acl)
            if any(key not in acl.get_existing_keys() for key in http_body):
                self.set_status(400)
                self.write({"status": 400,
                            "reason": "unrecognizable_key_in_http_body"})
                return

            # check if http body only contains boolean values, except for the role and space attribute
            for key in http_body:
                if key != "role" and key != "space":
                    if not isinstance(http_body[key], bool):
                        self.set_status(400)
                        self.write({"status": 400,
                                    "reason": "value_not_bool_in_http_body"})
                        return

            # check if the user is either global admin or space admin, if not return
            if not await util.is_admin(self.current_user.username):
                space = self.db.spaces.find_one({"name": http_body["space"]})
                if not space:
                    self.set_status(400)
                    self.write({"status": 400,
                                "reason": "space_doesnt_exist"})
                    return
                if self.current_user.username not in space["admins"]:
                    self.set_status(403)
                    self.write({"status": 403,
                                "reason": "insufficient permission"})
                    return

            acl.set_all(http_body)

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})
        else:
            self.set_status(404)
