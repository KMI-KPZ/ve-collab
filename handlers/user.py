from base64 import b64encode
import os
import re

from handlers.base_handler import BaseHandler
from socket_client import get_socket_instance


class ProfileInformationHandler(BaseHandler):

    async def get(self):
        """
        GET /profileinformation
            request full information about the current user

            returns:
                200 OK
                {user: {
                    "user_id": <int>,
                    "username": <string>,
                    "email": <string>,
                 },
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
                 "follows": [<string1>, <string2>, ...]
                }

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            username = self.get_argument("username", None)
            if not username:
                username = self.current_user.username

            # get account information from platform
            client = await get_socket_instance()
            user_result = await client.write({"type": "get_user",
                                              "username": username})

            # grab spaces
            spaces_cursor = self.db.spaces.find(
                filter={"members": username}
            )
            spaces = []
            for space in spaces_cursor:
                spaces.append(space["name"])

            # grab users that the current_user follows
            follows_cursor = self.db.follows.find(
                filter={"user": username}
            )
            follows = []
            for user in follows_cursor:
                follows = user["follows"]

            profile_cursor = self.db.profiles.find(
                filter={"user": username}
            )
            profile = {}
            profile["profile_pic"] = "default_profile_pic.jpg"
            for user_profile in profile_cursor:
                profile["bio"] = user_profile["bio"]
                profile["institution"] = user_profile["institution"]
                profile["projects"] = user_profile["projects"]
                if "profile_pic" in user_profile:
                    profile["profile_pic"] = user_profile["profile_pic"]
                profile["first_name"] = user_profile["first_name"]
                profile["last_name"] = user_profile["last_name"]
                profile["gender"] = user_profile["gender"]
                profile["address"] = user_profile["address"]
                profile["birthday"] = user_profile["birthday"]
                profile["experience"] = user_profile["experience"]
                profile["education"] = user_profile["education"]

            user_information = {key: user_result["user"][key] for key in user_result["user"]}
            user_information["spaces"] = spaces
            user_information["follows"] = follows
            user_information["profile"] = profile

            self.set_status(200)
            self.write(user_information)

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

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

        if self.current_user:
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
                print("in file handling")
                profile_pic_obj = self.request.files["profile_pic"][0]

                # save file
                file_ext = os.path.splitext(profile_pic_obj["filename"])[1]
                new_file_name = b64encode(os.urandom(32)).decode("utf-8")
                new_file_name = re.sub('[^0-9a-zäöüßA-ZÄÖÜ]+', '_', new_file_name).lower() + file_ext
                print(new_file_name)

                with open(self.upload_dir + new_file_name, "wb") as fp:
                    fp.write(profile_pic_obj["body"])

            if new_file_name:
                self.db.profiles.update_one(
                    {"user": self.current_user.username},
                    {"$set":
                        {
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
                            "education": education
                        }
                    },
                    upsert=True
                )
            else:
                self.db.profiles.update_one(
                    {"user": self.current_user.username},
                    {"$set":
                        {
                            "bio": bio,
                            "institution": institution,
                            "projects": projects,
                            "first_name": first_name,
                            "last_name": last_name,
                            "gender": gender,
                            "address": address,
                            "birthday": birthday,
                            "experience": experience,
                            "education": education
                        }
                    },
                    upsert=True
                )

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


class UserHandler(BaseHandler):
    """
    User management
    """

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

        if self.current_user:
            print("in user handler")
            if slug == "user_data":
                username = self.get_argument("username", "test_user1")

                client = await get_socket_instance()
                user_result = await client.write({"type": "get_user",
                                                  "username": username})
                user_result["user"]["profile_pic"] = "default_profile_pic.jpg"
                user_result["user"]["profile"] = {}
                profile = self.db.profiles.find_one({"user": username})
                print("\n\n\n\n")
                print(profile)
                if profile:
                    if "profile_pic" in profile:
                        user_result["user"]["profile_pic"] = profile["profile_pic"]

                    """
                    Here set Profile Information to user in profile view
                    """
                    user_result["user"]["profile"]["first_name"] = profile["first_name"]
                    user_result["user"]["profile"]["last_name"] = profile["last_name"]
                    user_result["user"]["profile"]["gender"] = profile["gender"]
                    user_result["user"]["profile"]["bio"] = profile["bio"]
                    user_result["user"]["profile"]["address"] = profile["address"]
                    user_result["user"]["profile"]["birthday"] = profile["birthday"]
                    user_result["user"]["profile"]["institution"] = profile["institution"]
                    user_result["user"]["profile"]["education"] = profile["education"]
                    user_result["user"]["profile"]["experience"] = profile["experience"]

                self.set_status(200)
                self.write(user_result["user"])

            elif slug == "list":
                client = await get_socket_instance()
                user_list = await client.write({"type": "get_user_list"})

                for user in user_list["users"]:
                    user_list["users"][user]["profile_pic"] = "default_profile_pic.jpg"
                    profile = self.db.profiles.find_one({"user": user})
                    if profile:
                        if "profile_pic" in profile:
                            user_list["users"][user]["profile_pic"] = profile["profile_pic"]

                self.set_status(200)
                self.write(user_list["users"])

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})
