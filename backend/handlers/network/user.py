import json
import pprint
from keycloak import KeycloakGetError
import requests

import tornado.web

from handlers.base_handler import BaseHandler, auth_needed
from resources.network.profile import Profiles
from resources.network.space import Spaces


class ProfileInformationHandler(BaseHandler):
    @auth_needed
    async def get(self):
        """
        GET /profileinformation
            request full information about a user. By default, information
            about the current user is returned. Supply a username to get
            information about an arbitrary user.

            query params:
                username: optional, request information about this user instead

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
                        "research_tags": [<string1>, <string2>, ...],
                        "first_name": <string>,
                        "last_name": <string>,
                        "gender": <string>,
                        "address": <string>,
                        "birthday": <string>,
                        "experience": [<string1>, <string2>, ...],
                        "languages": [<string1>, <string2>, ...],
                        "ve_interests": [<string1>, <string2>, ...],
                        "ve_goals": [<string1>, <string2>, ...],
                        "preferred_formats": [<string1>, <string2>, ...],
                        "courses": [
                            {
                                "title": "<string>",
                                "academic_course": "<string>",
                                "semester": "<string>",
                            },
                            ...
                        ],
                        "educations": [
                            {
                                institution: "<string>",
                                degree: "<string>",
                                department: "<string>",
                                timestamp_from: "<string>",
                                timestamp_to: "<string>",
                                additional_info: "<string>",
                            },
                            ...
                        ],
                        "work_experience": [
                            {
                                position: "<string>",
                                institution: "<string>",
                                department: "<string>",
                                timestamp_from: "<string>",
                                timestamp_to: "<string>",
                                city: "<string>",
                                country: "<string>",
                                additional_info: "<string>",
                            },
                        ],
                    },
                    "spaces": [<string1>, <string2>, ...],
                    "follows": [<string1>, <string2>, ...],
                    "followers": [<string1>, <string2>, ...]
                }

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                409 Conflict
                {"status": 409,
                 "reason": "user_doesnt_exist"}
        """
        username = self.get_argument("username", None)
        if not username:
            username = self.current_user.username

        # get account information from keycloak, abort if the requested user
        # doesnt exist there
        try:
            keycloak_info = self.get_keycloak_user(username)
        except KeycloakGetError as e:
            error_response = json.loads(e.error_message.decode())
            if error_response["error"] == "User not found":
                self.set_status(409)
                self.write({"success": False, "reason": "user_doesnt_exist"})
                return

        # add user data to response
        user_information_response = {
            "user_id": keycloak_info["id"],
            "username": username,
            "email": keycloak_info["email"],
        }

        with Profiles() as profile_manager:
            # grab and add profile details, putting role and follows out of
            # the nested profile dict
            profile = {}
            profile = profile_manager.ensure_profile_exists(username)
            role = profile["role"]
            follows = profile["follows"]
            # remove unnecessary (duplicate) keys from nested dict
            del profile["_id"]
            del profile["role"]
            del profile["follows"]

            # grab users that follow the user separately, because db model is 1:n
            followers = profile_manager.get_followers(username)
            user_information_response["followers"] = followers

            user_information_response["role"] = role
            user_information_response["follows"] = follows
            user_information_response["profile"] = profile

        # grab and add spaces
        with Spaces() as space_manager:
            spaces = space_manager.get_spaces_of_user(username)
            user_information_response["spaces"] = spaces

        self.set_status(200)
        self.write(self.json_serialize_response(user_information_response))

    @auth_needed
    def post(self):
        """
        POST /profileinformation

            update the profile information (bio, institution and projects)

            http body:
                {
                    "bio": <string>,
                    "institution": <string>,
                    "research_tags": [<string1>, <string2>, ...],
                    "first_name": <string>,
                    "last_name": <string>,
                    "gender": <string>,
                    "address": <string>,
                    "birthday": <string>,
                    "experience": [<string1>, <string2>, ...],
                    "ve_interests": [<string1>, <string2>, ...],
                    "ve_goals": [<string1>, <string2>, ...],
                    "preferred_formats": [<string1>, <string2>, ...],
                    "courses": [
                        {
                            "title": "<string>",
                            "academic_course: "<string>",
                            "semester": "<string>",
                        },
                        ...
                    ],
                    "educations": [
                        {
                            institution: "<string>",
                            degree: "<string>",
                            department: "<string>",
                            timestamp_from: "<string>",
                            timestamp_to: "<string>",
                            additional_info: "<string>",
                        },
                        ...
                    ],
                    "work_experience": [
                        {
                            position: "<string>",
                            institution: "<string>",
                            department: "<string>",
                            timestamp_from: "<string>",
                            timestamp_to: "<string>",
                            city: "<string>",
                            country: "<string>",
                            additional_info: "<string>",
                        },
                    ],
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

        updated_attribute_dict = json.loads(self.request.body)

        with Profiles() as profile_manager:
            # handle profile pic
            if "profile_pic" in self.request.files:
                profile_pic_obj = self.request.files["profile_pic"][0]
                updated_attribute_dict["profile_pic"] = profile_pic_obj["filename"]
                profile_manager.update_profile_information(
                    self.current_user.username,
                    updated_attribute_dict,
                    profile_pic_obj["body"],
                    profile_pic_obj["content_type"],
                )
            else:
                profile_manager.update_profile_information(
                    self.current_user.username, updated_attribute_dict
                )

            self.set_status(200)
            self.write({"status": 200, "success": True})


class OrcidProfileHandler(BaseHandler):
    """
    request profile data from ORCiD API
    """

    @auth_needed
    async def get(self):
        if not self.current_user.orcid:
            self.set_status(409)
            self.write({"success": False, "reason": "not_authenticated_via_orcid"})
            return

        orcid_api_response = requests.get(
            "https://pub.orcid.org/v3.0/{}/record".format(self.current_user.orcid),
            headers={"Accept": "application/json"},
        )
        orcid_record = json.loads(orcid_api_response.content)

        # if the orcid api said anything else then 200, report back the error
        if orcid_api_response.status_code != 200:
            self.set_status(409)
            self.write(
                {
                    "success": False,
                    "reason": "orcid_api_error",
                    "orcid_error": orcid_record,
                }
            )
            return

        pprint.pprint(orcid_record)

        bio = first_name = last_name = research_tags = institution = None
        educations = employments = []

        # TODO only a proof of concept and prone to breaking (adapted to one certain ORCiD for testing),
        # needs error checking for fields
        try:
            bio = orcid_record["person"]["biography"]
            first_name = orcid_record["person"]["name"]["given-names"]["value"]
            last_name = orcid_record["person"]["name"]["family-name"]["value"]
            research_tags = [
                elem["content"]
                for elem in orcid_record["person"]["keywords"]["keyword"]
            ]
            educations = [
                {
                    "institution": elem["summaries"][0]["education-summary"][
                        "organization"
                    ]["name"],
                    "degree": elem["summaries"][0]["education-summary"]["role-title"],
                    "department": "",
                    "timestamp_from": elem["summaries"][0]["education-summary"][
                        "start-date"
                    ]["year"]["value"],
                    "timestamp_to": elem["summaries"][0]["education-summary"][
                        "end-date"
                    ]["year"]["value"],
                    "additional_info": "",
                }
                for elem in orcid_record["activities-summary"]["educations"][
                    "affiliation-group"
                ]
            ]

            employments = [
                {
                    "position": elem["summaries"][0]["employment-summary"]["role-title"]
                    if elem["summaries"][0]["employment-summary"]["role-title"]
                    is not None
                    else "",
                    "institution": elem["summaries"][0]["employment-summary"][
                        "organization"
                    ]["name"],
                    "department": elem["summaries"][0]["employment-summary"][
                        "department-name"
                    ],
                    "city": elem["summaries"][0]["employment-summary"]["organization"][
                        "address"
                    ]["city"],
                    "country": elem["summaries"][0]["employment-summary"][
                        "organization"
                    ]["address"]["country"],
                    "timestamp_from": elem["summaries"][0]["employment-summary"][
                        "start-date"
                    ]["year"]["value"]
                    if elem["summaries"][0]["employment-summary"]["start-date"]
                    is not None
                    else "",
                    "timestamp_to": elem["summaries"][0]["employment-summary"][
                        "end-date"
                    ]["year"]["value"]
                    if elem["summaries"][0]["employment-summary"]["end-date"]
                    is not None
                    else "",
                    "additional_info": "",
                }
                for elem in orcid_record["activities-summary"]["employments"][
                    "affiliation-group"
                ]
            ]

            institution = employments[0]["institution"]
        except Exception as e:
            print("error caught")
            print(e)

        profile_response = {
            "bio": "" if bio == None else bio,
            "institution": "" if institution == None else institution,
            "research_tags": research_tags,
            "first_name": first_name,
            "last_name": last_name,
            "educations": educations,
            "work_experience": employments,
        }

        pprint.pprint(profile_response)

        self.write({"success": True, "suggested_profile": profile_response})

    @auth_needed
    async def post(self):
        self.write({"success": False})


class UserHandler(BaseHandler):
    """
    User management
    """

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

            with Profiles() as profile_manager:
                # add full profile data to response, moving role and follows out of
                # the nested profile dict
                profile = profile_manager.ensure_profile_exists(username)
                user_information_response["profile_pic"] = profile["profile_pic"]
                user_information_response["role"] = profile["role"]
                user_information_response["follows"] = profile["follows"]
                del profile["role"]
                del profile["follows"]
                user_information_response["profile"] = profile

                # add users that follow the user
                user_information_response["followers"] = profile_manager.get_followers(
                    username
                )

            self.set_status(200)
            self.write(self.json_serialize_response(user_information_response))

        elif slug == "list":
            user_list_kc = self.get_keycloak_user_list()

            # for the full user list, we dont include the full profile,
            # but only role, follows, followers and profile_pic
            user_list_response = {}
            with Profiles() as profile_manager:
                for user in user_list_kc:
                    profile_obj = profile_manager.ensure_profile_exists(
                        user["username"],
                        projection={
                            "_id": False,
                            "role": True,
                            "follows": True,
                            "profile_pic": True,
                        },
                    )
                    user_info = {
                        "id": user["id"],
                        "username": user["username"],
                        "email": user["email"],
                        "role": profile_obj["role"],
                        "follows": profile_obj["follows"],
                        "followers": profile_manager.get_followers(user["username"]),
                        "profile_pic": profile_obj["profile_pic"],
                    }
                    user_list_response[user["username"]] = user_info

            self.set_status(200)
            self.write(self.json_serialize_response(user_list_response))

        else:
            self.set_status(404)
