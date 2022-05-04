import json

import tornado.web

from acl import get_acl
from handlers.base_handler import BaseHandler, auth_needed
import util
from socket_client import get_socket_instance


class PermissionHandler(BaseHandler):

    @auth_needed
    async def get(self):
        role = await util.request_role(self.current_user.username)
        self.set_status(200)
        self.write({"status": 200,
                    "role": role})


class RoleHandler(BaseHandler):

    @auth_needed
    async def get(self, slug):
        """
        GET /role
            request the role of the current user
        """
        if slug == "my":
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

        elif slug == "all":
            if await util.is_admin(self.current_user.username):
                ret_list = []
                client = await get_socket_instance()
                user_list = await client.write({"type": "get_user_list"})
                existin_users_and_roles = self.db.roles.find(projection={"_id": False})
                existing_users_and_roles = [item for item in existin_users_and_roles]

                # match the platform users and if they have, existing lionet roles
                for platform_user in user_list["users"]:
                    already_in = False
                    for existing_user in existing_users_and_roles:
                        if user_list["users"][platform_user]["username"] == existing_user["username"]:
                            ret_list.append(existing_user)
                            already_in = True
                            break
                    if already_in:  # skip if user is already processed
                        continue

                    # if the user does not already exist, add him with guest role
                    payload = {"username": user_list["users"][platform_user]["username"], "role": "guest"}
                    self.db.roles.insert_one(payload)
                    # manually because otherwise non-json-serializable ObjectId is in payload
                    ret_list.append({"username": user_list["users"][platform_user]["username"], "role": "guest"})

                self.set_status(200)
                self.write({"users": ret_list})
            else:
                self.set_status(403)
                self.write({"status": 403,
                            "reason": "user_not_admin"})

        elif slug == "distinct":
            if await util.is_admin(self.current_user.username):
                roles = self.db.roles.distinct("role")
                self.set_status(200)
                self.write({"existing_roles": roles})

            else:
                self.set_status(403)
                self.write({"status": 403,
                            "reason": "user_not_admin"})


        else:
            self.set_status(404)

    @auth_needed
    async def post(self, slug):
        """
        POST /role/update
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
        if slug == "update":
            if await util.is_admin(self.current_user.username):
                http_body = json.loads(self.request.body)
                print(http_body)

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
        else:
            self.set_status(404)


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
                    acl.insert_default(current_user_role)

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

                # solve inconsistency problem of role existing but no acl_entry: whenever there is a role that has no acl_entry, create a default one
                distinct_roles = self.db.roles.distinct("role")
                for role in distinct_roles:
                    if role not in [entry["role"] for entry in acl.get_all()]:
                        acl.insert_default(role)

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
            get the current user's role acl entry

            query param:
                space: name of space

            optional query param:
                role: name of role (get the entry of the specified role, requires admin privileges)

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

            query param:
                space: name of space

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
        # since space query param is needed for both requests in this handler, check it first
        try:
            space_name = self.get_argument("space")
        except tornado.web.MissingArgumentError:
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_query_param:space"})
            return

        if slug == "get":
            acl = get_acl().space_acl

            # if there is a role specified, query for this role instead of the current_user's one
            optional_role = self.get_argument("role", None)
            if optional_role:
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

                # query the acl
                acl_entry = acl.get(optional_role, space_name)

                # inconsistency problem: the role exists, but no acl entry. construct an acl entry that has all permissions set to false
                if not acl_entry:
                    print("role no exist")
                    acl_entry = {}
                    for acl_key in acl.get_existing_keys():
                        if acl_key != "role" and acl_key != "space":
                            acl_entry[acl_key] = False
                    acl_entry["role"] = optional_role
                    acl_entry["space"] = space_name

                self.set_status(200)
                self.write({"status": 200,
                            "acl_entry": acl_entry})
                return

            # no role query parameter was passed, use current_user instead
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
