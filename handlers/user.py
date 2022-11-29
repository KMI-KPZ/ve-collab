from base64 import b64encode
import os
import re
from typing import List, Optional, Tuple

import tornado.web

from handlers.base_handler import BaseHandler, auth_needed
from logger_factory import log_access


class ProfileInformationHandler(BaseHandler):
    @log_access
    @auth_needed
    async def get(self):
        """
        GET /profileinformation
            request full information about the current user

            returns:
                200 OK
                {
                 "user_id": <int>,
                 "username": <string>,
                 "email": <string>,
                 "role": <string>,
                 "profile": {
                    "bio": <string>,
                    "institution": <string>,
                    "projects": [<string1>, <string2>, ...],
                    "first_name": <string>,
                    "last_name": <string>,
                    "gender": <string>,
                    "address": <string>,
                    "birthday": <string>,
                    "experience": [<string1>, <string2>, ...],
                    "education": [<string1>, <string2>, ...]
                 },
                 "spaces": [<string1>, <string2>, ...],
                 "follows": [<string1>, <string2>, ...],
                 "followers": [<string1>, <string2>, ...]
                }

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """
        username = self.get_argument("username", None)
        if not username:
            username = self.current_user.username

        # get account information from keycloak
        keycloak_info = self.get_keycloak_user(username)

        # add user data to response
        user_information_response = {
            "user_id": keycloak_info["id"],
            "username": username,
            "email": keycloak_info["email"],
        }

        # grab and add spaces
        spaces = [space["name"] for space in self.db.spaces.find({"members": username})]
        user_information_response["spaces"] = spaces

        # grab users that follow the user
        followers = [
            user["username"]
            for user in self.db.profiles.find(
                {"follows": username}, projection={"username": True}
            )
        ]
        user_information_response["followers"] = followers

        # grab and add profile details
        profile = {}
        profile = self.db.profiles.find_one({"username": username})
        if profile:
            role = profile["role"]
            follows = profile["follows"]
            del profile["_id"]
            del profile["role"]
            del profile["follows"]
        else:
            # if for some reason no profile exists, create a default one
            profile = {
                "username": username,
                "role": "guest",
                "follows": [],
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
            self.db.profiles.insert_one(profile)
            self._create_acl_entry_if_not_exists("guest")
            role = "guest"
            follows = []
            del profile["role"]
            del profile["follows"]

        user_information_response["role"] = role
        user_information_response["follows"] = follows
        user_information_response["profile"] = profile

        self.set_status(200)
        self.write(user_information_response)

    @log_access
    @auth_needed
    def post(self):
        """
        POST /profileinformation

            update the profile information (bio, institution and projects)

            http body:
                {
                    "bio": <string>,
                    "institution": <string>,
                    "projects": [<string1>, <string2>, ...],

                    "first_name": <string>,
                    "last_name": <string>,
                    "gender": <string>,
                    "address": <string>,
                    "birthday": <string>,
                    "experience": [<string1>, <string2>, ...],
                    "education": [<string1>, <string2>, ...]
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
        """

        bio = self.get_body_argument("bio", None)
        institution = self.get_body_argument("institution", None)
        projects = self.get_body_argument("projects", None).split(",")
        first_name = self.get_body_argument("first_name", None)
        last_name = self.get_body_argument("last_name", None)
        gender = self.get_body_argument("gender", None)
        address = self.get_body_argument("address", None)
        birthday = self.get_body_argument("birthday", None)
        experience = self.get_body_argument("experience", None).split(",")
        education = self.get_body_argument("education", None).split(",")

        # handle profile pic
        new_file_name = None
        if "profile_pic" in self.request.files:
            profile_pic_obj = self.request.files["profile_pic"][0]

            # TODO deobfuscate
            # save file
            file_ext = os.path.splitext(profile_pic_obj["filename"])[1]
            new_file_name = b64encode(os.urandom(32)).decode("utf-8")
            new_file_name = (
                re.sub("[^0-9a-zäöüßA-ZÄÖÜ]+", "_", new_file_name).lower() + file_ext
            )

            with open(self.upload_dir + new_file_name, "wb") as fp:
                fp.write(profile_pic_obj["body"])

        if new_file_name:
            self.db.profiles.update_one(
                {"username": self.current_user.username},
                {
                    "$set": {
                        "bio": bio,
                        "institution": institution,
                        "projects": projects,
                        "profile_pic": new_file_name,
                        "first_name": first_name,
                        "last_name": last_name,
                        "gender": gender,
                        "address": address,
                        "birthday": birthday,
                        "experience": experience,
                        "education": education,
                    }
                },
                upsert=True,  # TODO on upsert case also set role "guest" and follows = []
            )
        else:
            self.db.profiles.update_one(
                {"username": self.current_user.username},
                {
                    "$set": {
                        "bio": bio,
                        "institution": institution,
                        "projects": projects,
                        "first_name": first_name,
                        "last_name": last_name,
                        "gender": gender,
                        "address": address,
                        "birthday": birthday,
                        "experience": experience,
                        "education": education,
                    }
                },
                upsert=True,  # TODO on upsert case also set role "guest" and follows = []
            )

        self.set_status(200)
        self.write({"status": 200, "success": True})


class UserHandler(BaseHandler):
    """
    User management
    """

    def get_user_role_follows_and_profile_pic(
        self, username: str
    ) -> Tuple[str, List[str], str]:
        role = None
        follows = []
        profile_pic = "default_profile_pic.jpg"

        result = self.db.profiles.find_one(
            {"username": username},
            projection={"role": True, "follows": True, "profile_pic": True},
        )
        if result:
            if "role" in result:
                role = result["role"]
            if "follows" in result:
                follows = result["follows"]
            if "profile_pic" in result:
                profile_pic = result["profile_pic"]

        return role, follows, profile_pic

    def get_followers_of_user(self, username: str) -> Optional[List[str]]:
        return [
            user["username"]
            for user in self.db.profiles.find(
                {"follows": username}, projection={"username": True}
            )
        ]

    @log_access
    @auth_needed
    async def get(self, slug):
        """
        GET /users/user_data
            query param: username : string
            return:
                200 OK
                {"user_id": <int>,
                 "username": <string>,
                 "email": <string>}

                 401 Unauthorized
                 {"status": 401,
                  "reason": "no_logged_in_user"}

        GET /users/list
            returns:
                200 OK,
                [user_data (look above)]

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if slug == "user_data":
            try:
                username = self.get_argument("username")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"status": 400, "reason": "missing_key:username"})
                return

            # get account information from keycloak
            keycloak_info = self.get_keycloak_user(username)

            # add user data to response
            user_information_response = {
                "id": keycloak_info["id"],
                "username": username,
                "email": keycloak_info["email"],
            }

            # add full profile data to response
            profile = self.db.profiles.find_one(
                {"username": username}, projection={"_id": False, "username": False}
            )
            if profile:
                user_information_response["profile_pic"] = profile["profile_pic"]
                user_information_response["role"] = profile["role"]
                user_information_response["follows"] = profile["follows"]
                del profile["role"]
                del profile["follows"]
                user_information_response["profile"] = profile
            else:
                user_information_response["profile_pic"] = "default_profile_pic.jpg"
                user_information_response["role"] = None
                user_information_response["follows"] = []

            # add users that follow the user
            user_information_response["followers"] = self.get_followers_of_user(
                username
            )

            self.set_status(200)
            self.write(user_information_response)

        elif slug == "list":
            user_list_kc = self.get_keycloak_user_list()

            user_list_response = {}
            for user in user_list_kc:
                role, follows, profile_pic = self.get_user_role_follows_and_profile_pic(
                    user["username"]
                )
                user_info = {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "role": role,
                    "follows": follows,
                    "followers": self.get_followers_of_user(user["username"]),
                    "profile_pic": profile_pic,
                }
                user_list_response[user["username"]] = user_info

            self.set_status(200)
            self.write(user_list_response)

        else:
            self.set_status(404)
