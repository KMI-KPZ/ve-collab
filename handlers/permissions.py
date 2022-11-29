import json

import tornado.web

from acl import ACL
from handlers.base_handler import BaseHandler, auth_needed
from logger_factory import get_logger, log_access


logger = get_logger(__name__)


class RoleHandler(BaseHandler):
    @log_access
    @auth_needed
    async def get(self, slug):
        """
        GET /role
            request the role of the current user
        """
        if slug == "my":
            role_result = self.db.profiles.find_one(
                {"username": self.current_user.username}
            )

            if role_result:
                self.set_status(200)
                self.write(
                    {
                        "success": True,
                        "username": role_result["username"],
                        "role": role_result["role"],
                    }
                )
            else:
                # no record for this user was found, insert as guest (default role)
                self.db.profiles.insert_one(
                    {
                        "username": self.current_user.username,
                        "role": "guest",
                        "bio": None,
                        "institution": None,
                        "projects": None,
                        "profile_pic": "default_profile_pic.jpg",
                        "first_name": None,
                        "last_name": None,
                        "gender": None,
                        "address": None,
                        "birthday": None,
                        "experience": None,
                        "education": None,
                    }
                )
                self._create_acl_entry_if_not_exists("guest")

                self.set_status(200)
                self.write(
                    {
                        "success": True,
                        "username": self.current_user.username,
                        "role": "guest",
                        "note": "created_because_no_previous_record",
                    }
                )

        elif slug == "all":
            if self.is_current_user_lionet_admin():
                ret_list = []
                user_list_kc = self.get_keycloak_user_list()
                existing_users_and_roles = list(
                    self.db.profiles.find(
                        projection={"_id": False, "username": True, "role": True}
                    )
                )

                # match the platform users and if they have, existing lionet roles
                for platform_user in user_list_kc:
                    already_in = False
                    for existing_user in existing_users_and_roles:
                        if platform_user["username"] == existing_user["username"]:
                            ret_list.append(existing_user)
                            already_in = True
                            break
                    if already_in:  # skip if user is already processed
                        continue

                    # if the user does not already exist, add him with guest role
                    payload = {
                        "username": platform_user["username"],
                        "role": "guest",
                        "bio": None,
                        "institution": None,
                        "projects": None,
                        "profile_pic": "default_profile_pic.jpg",
                        "first_name": None,
                        "last_name": None,
                        "gender": None,
                        "address": None,
                        "birthday": None,
                        "experience": None,
                        "education": None,
                    }
                    self.db.profiles.insert_one(payload)

                    # manually create return entry
                    # because otherwise non-json-serializable ObjectId is in payload
                    ret_list.append(
                        {
                            "username": platform_user["username"],
                            "role": "guest",
                        }
                    )

                    # check once if the guest role was present
                    # (once is enough, there might be many keycloak users coming in,
                    # checking for the same role on everyone is useless overhead)
                    # if there was no user that has been added as guest, we dont even
                    # need to do the check at all because this statement would always
                    # be skipped
                    checked_guest_role_present = False
                    if not checked_guest_role_present:
                        self._create_acl_entry_if_not_exists(payload["role"])
                        checked_guest_role_present = True

                self.set_status(200)
                self.write({"success": True, "users": ret_list})
            else:
                self.set_status(403)
                self.write(
                    {"status": 403, "success": False, "reason": "user_not_admin"}
                )

        elif slug == "distinct":
            if self.is_current_user_lionet_admin():
                roles = self.db.profiles.distinct("role")
                self.set_status(200)
                self.write({"success": True, "existing_roles": roles})

            else:
                self.set_status(403)
                self.write(
                    {"status": 403, "success": False, "reason": "user_not_admin"}
                )

        else:
            self.set_status(404)

    @log_access
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
                 "reason": "missing_key_in_http_body:username"}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body:role"}

                400 Bad Request
                {"status": 400,
                 "reason": "json_parsing_error"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                 401 Unauthorized
                {"status": 401,
                 "reason": "user_not_admin"}
        """
        if slug == "update":
            if self.is_current_user_lionet_admin():
                try:
                    http_body = json.loads(self.request.body)
                except json.JSONDecodeError:
                    self.set_status(400)
                    self.write(
                        {
                            "status": 400,
                            "success": False,
                            "reason": "json_parsing_error",
                        }
                    )
                    return

                if "username" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "status": 400,
                            "success": False,
                            "reason": "missing_key_in_http_body:username",
                        }
                    )
                    return
                if "role" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "status": 400,
                            "success": False,
                            "reason": "missing_key_in_http_body:role",
                        }
                    )
                    return

                username = http_body["username"]
                role = http_body["role"]

                self.db.profiles.update_one(
                    {"username": username}, {"$set": {"role": role}}
                )

                self._create_acl_entry_if_not_exists(role)

                self.set_status(200)
                self.write({"status": 200, "success": True})
            else:
                self.set_status(403)
                self.write(
                    {"status": 403, "success": False, "reason": "user_not_admin"}
                )
        else:
            self.set_status(404)


class GlobalACLHandler(BaseHandler):
    def resolve_inconsistency(self, role: str) -> dict:
        """
        resolve inconsistency problem when the role exists,
        but no acl entry for it: insert the default rule and return it
        """

        logger.warning(
            "Inconsistency Problem: the role '{}' exists, but no Global ACL entry for it. Inserting default rule".format(
                role
            )
        )

        with ACL() as acl:
            # if the role is admin, set everything to true instead of false
            # technically this should never happen, but better safe than sorry
            if role == "admin":
                return acl.global_acl.insert_admin()
            else:
                return acl.global_acl.insert_default(role)

    @log_access
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
            # since acl is role-based, we need to query for the current user's role
            current_user_role = self.get_current_user_role()
            if current_user_role:
                acl_entry = None
                with ACL() as acl:
                    acl_entry = acl.global_acl.get(current_user_role)

                # inconsistency problem: the role exists, but no acl entry. construct a default entry
                if not acl_entry:
                    acl_entry = self.resolve_inconsistency(current_user_role)

                self.set_status(200)
                self.write({"status": 200, "success": True, "acl_entry": acl_entry})
            else:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "user_has_no_role"}
                )

        elif slug == "get_all":
            if self.is_current_user_lionet_admin():
                entries = []
                with ACL() as acl:
                    # solve inconsistency problem of role existing but no acl_entry: whenever there is a role that has no acl_entry, create a default one
                    distinct_roles = self.db.profiles.distinct("role")
                    for role in distinct_roles:
                        if role not in [
                            entry["role"] for entry in acl.global_acl.get_all()
                        ]:
                            self.resolve_inconsistency(role)

                    entries = acl.global_acl.get_all()

                self.set_status(200)
                self.write({"status": 200, "success": True, "acl_entries": entries})
            else:
                self.set_status(403)
                self.write(
                    {"status": 403, "success": False, "reason": "user_not_admin"}
                )

        else:
            self.set_status(404)

    @log_access
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
            if self.is_current_user_lionet_admin():
                try:
                    http_body = json.loads(self.request.body)
                except json.JSONDecodeError:
                    self.set_status(400)
                    self.write(
                        {
                            "status": 400,
                            "success": False,
                            "reason": "json_parsing_error",
                        }
                    )
                    return

                with ACL() as acl:
                    # check if the http body only contains valid keys (i.e. keys that exist in the acl)
                    if any(
                        key not in acl.global_acl.get_existing_keys()
                        for key in http_body
                    ):
                        self.set_status(400)
                        self.write(
                            {
                                "status": 400,
                                "success": False,
                                "reason": "unrecognizable_key_in_http_body",
                            }
                        )
                        return

                    # check if http body only contains boolean values, except for the role attribute
                    for key in http_body:
                        if key != "role":
                            if not isinstance(http_body[key], bool):
                                self.set_status(400)
                                self.write(
                                    {
                                        "status": 400,
                                        "success": False,
                                        "reason": "value_not_bool_in_http_body",
                                    }
                                )
                                return

                    # forbid any modifications to the admin role to avoid deadlocks
                    if http_body["role"] == "admin":
                        self.set_status(409)
                        self.write(
                            {
                                "status": 409,
                                "success": False,
                                "reason": "admin_role_immutable",
                            }
                        )
                        return

                    # reject setting an entry of a role that does not exist to prevent dangling entries
                    if not self.db.profiles.find_one({"role": http_body["role"]}):
                        self.set_status(409)
                        self.write(
                            {
                                "status": 409,
                                "success": False,
                                "reason": "role_doesnt_exist",
                            }
                        )
                        return

                    acl.global_acl.set_all(http_body)

                self.set_status(200)
                self.write({"status": 200, "success": True})
            else:
                self.set_status(403)
                self.write(
                    {"status": 403, "success": False, "reason": "user_not_admin"}
                )
        else:
            self.set_status(404)


class SpaceACLHandler(BaseHandler):
    def resolve_inconsistency(self, role: str, space: str) -> dict:
        """
        resolve inconsistency problem when the role exists, but no acl entry for it: insert the default rule and return it
        """

        logger.warning(
            "Inconsistency Problem: the role '{}' exists, but no Global ACL entry for it. Inserting default rule".format(
                role
            )
        )

        with ACL() as acl:
            # if the role is admin, set everything to true instead of false
            # technically this should never happen, but better safe than sorry
            if role == "admin":
                return acl.space_acl.insert_admin(space)
            else:
                return acl.space_acl.insert_default(role, space)

    @log_access
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
            self.write({"status": 400, "success": False, "reason": "missing_key:space"})
            return

        if slug == "get":
            # if there is a role specified, query for this role instead of the current_user's one
            optional_role = self.get_argument("role", None)
            if optional_role:
                # check if the user is either global admin or space admin, if not return
                if not self.is_current_user_lionet_admin():
                    space = self.db.spaces.find_one({"name": space_name})
                    if not space:
                        self.set_status(400)
                        self.write(
                            {
                                "status": 400,
                                "success": False,
                                "reason": "space_doesnt_exist",
                            }
                        )
                        return
                    if self.current_user.username not in space["admins"]:
                        self.set_status(403)
                        self.write(
                            {
                                "status": 403,
                                "success": False,
                                "reason": "insufficient_permission",
                            }
                        )
                        return

                # query the acl
                acl_entry = None
                with ACL() as acl:
                    acl_entry = acl.space_acl.get(optional_role, space_name)

                # inconsistency problem: the role exists, but no acl entry. construct an acl entry that has all permissions set to false
                if not acl_entry:
                    acl_entry = self.resolve_inconsistency(optional_role, space_name)

                self.set_status(200)
                self.write({"status": 200, "success": True, "acl_entry": acl_entry})
                return

            # no role query parameter was passed, use current_user instead
            # since acl is role-based, we need to query for the current user's role
            current_user_role = self.get_current_user_role()
            if current_user_role:
                acl_entry = None
                with ACL() as acl:
                    acl_entry = acl.space_acl.get(current_user_role, space_name)

                # inconsistency problem: the role exists, but no acl entry. construct an acl entry that has all permissions set to false
                if not acl_entry:
                    acl_entry = self.resolve_inconsistency(
                        current_user_role, space_name
                    )

                self.set_status(200)
                self.write({"status": 200, "success": True, "acl_entry": acl_entry})
            else:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "user_has_no_role"}
                )

        elif slug == "get_all":
            # check if the user is either global admin or space admin, if not return
            if not self.is_current_user_lionet_admin():
                space = self.db.spaces.find_one({"name": space_name})
                if not space:
                    self.set_status(400)
                    self.write(
                        {
                            "status": 400,
                            "success": False,
                            "reason": "space_doesnt_exist",
                        }
                    )
                    return
                if self.current_user.username not in space["admins"]:
                    self.set_status(403)
                    self.write(
                        {
                            "status": 403,
                            "success": False,
                            "reason": "insufficient_permission",
                        }
                    )
                    return

            entries = None
            with ACL() as acl:
                entries = acl.space_acl.get_all(space_name)

            self.set_status(200)
            self.write({"status": 200, "success": True, "acl_entries": entries})

        else:
            self.set_status(404)

    @log_access
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
            try:
                http_body = json.loads(self.request.body)
            except json.JSONDecodeError:
                self.set_status(400)
                self.write(
                    {"status": 400, "success": False, "reason": "json_parsing_error"}
                )
                return

            with ACL() as acl:
                # check if the http body only contains valid keys (i.e. keys that exist in the acl)
                if any(
                    key not in acl.space_acl.get_existing_keys() for key in http_body
                ):
                    self.set_status(400)
                    self.write(
                        {
                            "status": 400,
                            "success": False,
                            "reason": "unrecognizable_key_in_http_body",
                        }
                    )
                    return

                # check if http body only contains boolean values, except for the role and space attribute
                for key in http_body:
                    if key != "role" and key != "space":
                        if not isinstance(http_body[key], bool):
                            self.set_status(400)
                            self.write(
                                {
                                    "status": 400,
                                    "success": False,
                                    "reason": "value_not_bool_in_http_body",
                                }
                            )
                            return

                # reject setting the acl entry if the space doesnt exist to prevent dangling entries
                space = self.db.spaces.find_one({"name": http_body["space"]})
                if not space:
                    self.set_status(409)
                    self.write(
                        {
                            "status": 409,
                            "success": False,
                            "reason": "space_doesnt_exist",
                        }
                    )
                    return

                # check if the user is either global admin or space admin, if not return
                if not self.is_current_user_lionet_admin():
                    if self.current_user.username not in space["admins"]:
                        self.set_status(403)
                        self.write(
                            {
                                "status": 403,
                                "success": False,
                                "reason": "insufficient_permission",
                            }
                        )
                        return

                # reject setting an entry of a role that does not exist to prevent dangling entries
                if not self.db.profiles.find_one({"role": http_body["role"]}):
                    self.set_status(409)
                    self.write(
                        {"status": 409, "success": False, "reason": "role_doesnt_exist"}
                    )
                    return

                # forbid any modifications to the admin role to avoid deadlocks
                if http_body["role"] == "admin":
                    self.set_status(409)
                    self.write(
                        {
                            "status": 409,
                            "success": False,
                            "reason": "admin_role_immutable",
                        }
                    )
                    return

                acl.space_acl.set_all(http_body)

            self.set_status(200)
            self.write({"status": 200, "success": True})
        else:
            self.set_status(404)
