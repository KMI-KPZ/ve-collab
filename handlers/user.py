from base64 import b64encode
import os
import re
from typing import List, Optional

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

        user_role = self.db.roles.find_one({"username": username})
        if user_role:
            # remove nesting from db response
            user_role = user_role["role"]

        # add user data to response
        user_information_response = {
            "user_id": keycloak_info["id"],
            "username": username,
            "email": keycloak_info["email"],
            "role": user_role,
        }

        # grab and add spaces
        spaces = [space["name"] for space in self.db.spaces.find({"members": username})]
        user_information_response["spaces"] = spaces

        # grab and add users that the user follows
        user_information_response["follows"] = []
        user_follows = self.db.follows.find_one({"user": username})
        if user_follows:
            user_information_response["follows"] = user_follows["follows"]

        # grab users that follow the user
        followers = [
            user["user"] for user in self.db.follows.find({"follows": username})
        ]
        user_information_response["followers"] = followers

        # grab and add profile details
        profile = {}
        profile = self.db.profiles.find_one({"username": username})
        if profile:
            del profile["_id"]
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
                upsert=True,
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
                upsert=True,
            )

        self.set_status(200)
        self.write({"status": 200, "success": True})


class UserHandler(BaseHandler):
    """
    User management
    """

    def get_user_role(self, username: str) -> Optional[str]:
        user_role = self.db.roles.find_one({"username": username})
        if user_role:
            return user_role["role"]
        else:
            return None

    def get_user_follows(self, username: str) -> Optional[List[str]]:
        user_follows = self.db.follows.find_one({"user": username})
        if user_follows:
            return user_follows["follows"]
        else:
            return []

    def get_followers_of_user(self, username: str) -> Optional[List[str]]:
        return [user["user"] for user in self.db.follows.find({"follows": username})]

    def get_profile_pic_of_user(self, username: str) -> str:
        profile = self.db.profiles.find_one({"username": username})
        if profile:
            if "profile_pic" in profile:
                return profile["profile_pic"]
        return "default_profile_pic.jpg"

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

            user_role = self.get_user_role(username)

            # add user data to response
            user_information_response = {
                "id": keycloak_info["id"],
                "username": username,
                "email": keycloak_info["email"],
                "role": user_role,
            }

            # add full profile data to response
            profile = self.db.profiles.find_one(
                {"username": username}, projection={"_id": False, "user": False}
            )
            if profile:
                user_information_response["profile_pic"] = profile["profile_pic"]
                user_information_response["profile"] = profile
            else:
                user_information_response["profile_pic"] = "default_profile_pic.jpg"

            # add users that the user follows
            user_information_response["follows"] = self.get_user_follows(username)

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
                user_info = {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "role": self.get_user_role(user["username"]),
                    "follows": self.get_user_follows(user["username"]),
                    "followers": self.get_followers_of_user(user["username"]),
                    "profile_pic": self.get_profile_pic_of_user(user["username"]),
                }
                user_list_response[user["username"]] = user_info

            self.set_status(200)
            self.write(user_list_response)

        else:
            self.set_status(404)
