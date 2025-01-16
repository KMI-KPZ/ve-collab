from base64 import b64decode
import json
from typing import Dict, List, Tuple
from bson import ObjectId
from keycloak import KeycloakGetError
import requests

import tornado.web
from resources.planner.ve_plan import VEPlanResource
from resources.elasticsearch_integration import ElasticsearchConnector
from error_reasons import USER_DOESNT_EXIST
from exceptions import ProfileDoesntExistException

from handlers.base_handler import BaseHandler, auth_needed
from resources.network.profile import Profiles
from resources.network.space import Spaces
import util


class ProfileInformationHandler(BaseHandler):
    @auth_needed
    async def get(self):
        """
        GET /profileinformation
            request full information about a user. By default, information
            about the current user is returned. Supply a username to get
            information about an arbitrary user.

            The profile_pic contains the _id of the resource that can be exchanged
            for the real image data at the `GridFSStaticFileHandler`.

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
                        "institutions": [
                            {
                                "_id": <string>,
                                "name": <string>,
                                "school_type": <string>,
                                "department": <string>,
                                "country": <string>,
                            }
                        ],
                        "chosen_institution_id": <string>,
                        "research_tags": [<string1>, <string2>, ...],
                        "first_name": <string>,
                        "last_name": <string>,
                        "gender": <string>,
                        "address": <string>,
                        "birthday": <string>,
                        "profile_pic": <string>,
                        "experience": [<string1>, <string2>, ...],
                        "languages": [<string1>, <string2>, ...],
                        "ve_ready": boolean,
                        "excluded_from_matching": boolean,
                        "ve_interests": [<string1>, <string2>, ...],
                        "ve-contents": [<string1>, <string2>, ...],
                        "ve_goals": [<string1>, <string2>, ...],
                        "interdisciplinary_exchange": <boolean>,
                        "preferred_format": <string>,
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
                        "lms": ["<string>", "<string2>"],
                        "tools": ["<string>", "<string2>"],
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
                        "ve_window": [
                            {
                                "plan_id": "<_id_of_ve_plan_object>",
                                "title": "<string>",
                                "description": "<string>",
                            }
                        ],
                        "notification_settings": {
                            "messages": "email|push",
                            "ve_invite": "email|push|none",
                            "group_invite": "email|push|none",
                            "system": "email|push",
                        },
                        "achievements" : {
                            "social": { level: <number>, progress: <number>, next_level: <number> },
                            "ve": { level: <number>, progress: <number>, next_level: <number> },
                        },
                        "chosen_achievement": {
                            "type": "<string>",           --> one of achievement types above
                            "level": "<number>"
                        }
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
        }

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            # grab and add profile details, putting role and follows out of
            # the nested profile dict
            profile = {}
            profile = profile_manager.ensure_profile_exists(
                username, keycloak_info["firstName"], keycloak_info["lastName"]
            )
            role = profile["role"]
            follows = profile["follows"]
            # remove unnecessary (duplicate) keys from nested dict
            del profile["_id"]
            del profile["role"]
            del profile["follows"]

            # agregate the ve_window with plan names in addition to the ids
            if "ve_window" in profile and profile["ve_window"]:
                plan_manager = VEPlanResource(db)
                for window in profile["ve_window"]:
                    window["plan_name"] = plan_manager.get_plan(window["plan_id"]).name

            # grab users that follow the user separately, because db model is 1:n
            followers = profile_manager.get_followers(username)
            user_information_response["followers"] = followers

            user_information_response["role"] = role
            user_information_response["follows"] = follows
            user_information_response["profile"] = profile

            # grab and add spaces
            space_manager = Spaces(db)
            spaces = space_manager.get_space_ids_of_user(username)
            user_information_response["spaces"] = spaces

        self.set_status(200)
        self.write(self.json_serialize_response(user_information_response))

    @auth_needed
    def post(self):
        """
        POST /profileinformation

            update the profile information by supplying any of the information
            that should be updated. Information that remains the same
            can be left out. See possible keys down below.
            Updating the profile pic is special, because JSON has no type for binary,
            so the image is expected to be a base64 encoded string.
            Whenever the profile_pic is updated, the response includes
            a "profile_pic_id" key that indicated the _id of the stored picture.
            Use this _id to retrieve it from /uploads/<_id> endpoint.

            http body:
                {
                    "bio": <string>,
                    "institutions": [
                        {
                            "_id": <string>,
                            "name": <string>,
                            "school_type": <string>,
                            "department": <string>,
                            "country": <string>,
                        }
                    ],
                    "chosen_institution_id": <string>,
                    "research_tags": [<string1>, <string2>, ...],
                    "first_name": <string>,
                    "last_name": <string>,
                    "gender": <string>,
                    "address": <string>,
                    "birthday": <string>,
                    "experience": [<string1>, <string2>, ...],
                    "ve_ready": boolean,
                    "excluded_from_matching": boolean,
                    "ve_interests": [<string1>, <string2>, ...],
                    "ve-contents": [<string1>, <string2>, ...],
                    "ve_goals": [<string1>, <string2>, ...],
                    "interdisciplinary_exchange": <boolean>,
                    "preferred_format": <string>,
                    "courses": [
                        {
                            "title": "<string>",
                            "academic_course: "<string>",
                            "semester": "<string>",
                        },
                        ...
                    ],
                    "lms": ["<string>", "<string>"],
                    "tools": ["<string>", "<string>"],
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
                    "ve_window": [
                        {
                            "plan_id": "<_id_of_ve_plan_object>",
                            "title": "<string>",
                            "description": "<string>",
                        }
                    ],
                    "notification_settings": {
                        "messages": "email|push",
                        "ve_invite": "email|push|none",
                        "group_invite": "email|push|none",
                        "system": "email|push",
                    },
                    "chosen_achievement": {
                        "type": "<string>",           --> one of ACHIEVEMENT_TYPES in class `Profiles`
                        "level": "<number>"
                    },
                    "profile_pic": {
                        "payload": "<base64_encoded_image>",
                        "type": "<image/jpeg|image/png|...>"
                    }
                }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                 200 OK,
                 --> profile pic was updated
                {"status": 200,
                 "success": True,
                 "profile_pic_id": "<_id>"}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                409 Conflict
                {"status": 409,
                 "reason": "user_doesnt_exist"}
        """

        updated_attribute_dict = json.loads(self.request.body)

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            # handle profile pic
            if "profile_pic" in updated_attribute_dict:
                profile_pic_obj = {
                    "body": b64decode(updated_attribute_dict["profile_pic"]["payload"]),
                    "content_type": updated_attribute_dict["profile_pic"]["type"],
                }
                updated_attribute_dict["profile_pic"] = "avatar_{}".format(
                    self.current_user.username
                )
                try:
                    profile_pic_id = profile_manager.update_profile_information(
                        self.current_user.username,
                        updated_attribute_dict,
                        profile_pic_obj["body"],
                        profile_pic_obj["content_type"],
                    )
                except ProfileDoesntExistException:
                    self.set_status(409)
                    self.write({"status": 409, "reason": USER_DOESNT_EXIST})
                    return
                except TypeError as e:
                    self.set_status(400)
                    self.write({"status": 400, "reason": str(e)})
                    return
                except ValueError as e:
                    self.set_status(400)
                    self.write({"status": 400, "reason": str(e)})
                    return

                self.set_status(200)
                self.write(
                    {
                        "status": 200,
                        "success": True,
                        "profile_pic_id": str(profile_pic_id),
                    }
                )
                return
            else:
                try:
                    profile_manager.update_profile_information(
                        self.current_user.username, updated_attribute_dict
                    )
                except ProfileDoesntExistException:
                    self.set_status(409)
                    self.write({"status": 409, "reason": USER_DOESNT_EXIST})
                    return
                except TypeError as e:
                    self.set_status(400)
                    self.write({"status": 400, "reason": str(e)})
                    return
                except ValueError as e:
                    self.set_status(400)
                    self.write({"status": 400, "reason": str(e)})
                    return

                self.set_status(200)
                self.write({"status": 200, "success": True})


class BulkProfileSnippets(BaseHandler):
    @auth_needed
    def post(self):
        """
        POST /profile_snippets
            request profile snippets, i.e. username, first_name, last_name,
            institution, profile_pic and chosen_achievement for a list of users.
            Specify this list of usernames in the body.
            The profile_pic is an identifier that can be exchanged for the actual
            profile image at the /uploads endpoint. See the documentation for
            `GridFSStaticFileHandler` for reference.

            query params:
                None

            http body:
                {
                    "usernames": ["username1", "username2"]
                }

            returns:
                200 OK,
                {"success": True,
                 "user_snippets": [
                    {
                        "username": "<string>",
                        "first_name": "<string>",
                        "last_name": "<string>",
                        "profile_pic": "<string>",
                        "institution": "<string>",
                        "chosen_achievement": {
                            "type": "<string>",           --> one of ACHIEVEMENT_TYPES in class `Profiles`
                            "level": <number>
                        }
                    }
                 ]
                }

                400 Bad Request
                --> http body is not valid json
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"sucess": False,
                 "reason": "no_logged_in_user"}
        """

        try:
            http_body = json.loads(self.request.body)
        except Exception:
            self.set_status(400)
            self.write({"success": False, "reason": "json_parsing_error"})
            return

        if "usernames" not in http_body:
            self.set_status(400)
            self.write({"success": False, "reason": "missing_key_in_http_body"})
            return

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            profiles = profile_manager.get_profile_snippets(http_body["usernames"])

            self.set_status(200)
            self.serialize_and_write({"success": True, "user_snippets": profiles})


class OrcidProfileHandler(BaseHandler):
    """
    request profile data from ORCiD API
    """

    @auth_needed
    async def get(self):
        """
        GET /orcid
            Extract profile information from the public ORCiD record of the user.
            This is only possible if the user is authenticated via ORCiD, i.e.
            on login he/she has chosen to login with their ORCiD, or the account
            is atleast linked (possible TODO, tbd).
            If the user just has a "regular" account, an error is thrown.

            The returned profile is a suggestion and therefore not directly stored
            as the users profile in the backend. Suggest this data to the user but give
            them control to change it to their wishes and save it manually afterwards
            using the `/profileinformation`-endpoint.

            The returned profile is only a subset of the full profile information that is
            stored, it contains only those values that are potentially extractable from ORCiD.

            Response structure:
            {
                "suggested_profile": {
                    "bio": "",
                    "institution": "",
                    "research_tags": ["", "", ""],
                    "first_name": "",
                    "last_name": "",
                    "educations": [
                        {
                            "institution": "",
                            "degree": "",
                            "department": "",
                            "timestamp_from": "",
                            "timestamp_to": "",
                            "additional_info": "",
                        }
                    ],
                    "work_experience": [
                        {
                            "position": "",
                            "institution": "",
                            "department": "",
                            "city": "",
                            "country": "",
                            "timestamp_from": "",
                            "timestamp_to": "",
                            "additional_info": "",
                        }
                    ],
                }
            }


            query params:
                None (the ORCiD is already stored in the access token if successfully
                      authenticated)

            http body:
                None

            returns:
                200 OK
                {"success": True,
                 "suggested_profile": "<see_above>"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                {"success": False,
                 "reason": "not_authenticated_via_orcid"}

                409 Conflict
                {"success": False,
                 "reason": "orcid_api_error",
                 "orcid_error": "<error_from_orcid_api>"}
        """

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

        first_name, last_name = self._parse_name(orcid_record)
        profile_response = {
            "bio": self._parse_bio(orcid_record),
            "institutions": self._parse_institutions(orcid_record),
            "research_tags": self._parse_keywords(orcid_record),
            "first_name": first_name,
            "last_name": last_name,
            "educations": self._parse_educations(orcid_record),
            "work_experience": self._parse_employments(orcid_record),
        }

        self.write({"success": True, "suggested_profile": profile_response})

    @auth_needed
    async def post(self):
        self.set_status(405)
        self.write({"success": False, "reason": "POST_not_implemented"})

    ##############################################################################
    #                             helper functions                               #
    ##############################################################################

    def __extract_start_date(self, summary_obj: dict) -> str:
        """
        helper function to extract a valid ISO-8601 date string
        from the very "special" representation of dates in an orcid summary
        object...
        """

        start_date = ""
        if summary_obj["start-date"] != None:
            if summary_obj["start-date"]["year"] != None:
                year = summary_obj["start-date"]["year"]["value"]
                if summary_obj["start-date"]["month"] != None:
                    month = summary_obj["start-date"]["month"]["value"]
                    start_date = "{}-{}".format(year, month)
                else:
                    start_date = year
        return start_date

    def __extract_end_date(self, summary_obj: dict) -> str:
        """
        helper function to extract a valid ISO-8601 date string
        from the very "special" representation of dates in an orcid summary
        object...
        """

        end_date = ""
        if summary_obj["end-date"] != None:
            if summary_obj["end-date"]["year"] != None:
                year = summary_obj["end-date"]["year"]["value"]
                if summary_obj["end-date"]["month"] != None:
                    month = summary_obj["end-date"]["month"]["value"]
                    end_date = "{}-{}".format(year, month)
                else:
                    end_date = year
        return end_date

    def _parse_bio(self, orcid_record: dict) -> str:
        """
        extract the bio from the orcid record and return it, if
        it exists. Otherwise returns an empty string
        """

        try:
            if orcid_record["person"]["biography"] == None:
                return ""
            else:
                return orcid_record["person"]["biography"]
        except Exception as e:
            print("caught exception @ bio parsing:")
            print(e)
            return ""

    def _parse_name(self, orcid_record: dict) -> Tuple[str, str]:
        """
        extract the given name and family name from the orcid record
        and return them, if they exist. if any of them does not exist,
        return an empty string instead.

        Returns a Tuple containing the given name in first position and
        family name in second position.
        """

        given_name = family_name = ""

        # split the extraction into separate try/excepts because if any one fails
        # we still want to try the other one
        try:
            if orcid_record["person"]["name"]["given-names"] is not None:
                given_name = orcid_record["person"]["name"]["given-names"]["value"]
        except Exception as e:
            print("caught exception @ given_name parsing:")
            print(e)

        try:
            if orcid_record["person"]["name"]["family-name"] is not None:
                family_name = orcid_record["person"]["name"]["family-name"]["value"]
        except Exception as e:
            print("caught exception @ family_name parsing:")
            print(e)

        return given_name, family_name

    def _parse_keywords(self, orcid_record: dict) -> List[str]:
        """
        extract the keywords from the orcid record and return them in a list
        if they exist. Otherwise return an empty list.
        """

        try:
            if orcid_record["person"]["keywords"]["keyword"] == []:
                return []
            else:
                return [
                    elem["content"]
                    for elem in orcid_record["person"]["keywords"]["keyword"]
                ]
        except Exception as e:
            print("caught exception @ family_name parsing:")
            print(e)
            return []

    def _parse_educations(self, orcid_record: dict) -> List[Dict]:
        """
        extract educations and qualifications from the orcid record
        and return them in a list of dicts if they exist. Whenever there is some
        information missing, empty strings are returned instead in the dicts.
        if no educations are present at all, an empty list is returned.
        """

        def __extract_educations(orcid_record: dict) -> List[Dict]:
            educations = []
            try:
                if (
                    orcid_record["activities-summary"]["educations"][
                        "affiliation-group"
                    ]
                    != []
                ):
                    for education_record in orcid_record["activities-summary"][
                        "educations"
                    ]["affiliation-group"]:
                        try:
                            education_record_summary = education_record["summaries"][0][
                                "education-summary"
                            ]

                            # parse the fields
                            department = (
                                education_record_summary["department-name"]
                                if education_record_summary["department-name"] != None
                                else ""
                            )
                            degree = (
                                education_record_summary["role-title"]
                                if education_record_summary["role-title"] != None
                                else ""
                            )
                            institution = education_record_summary["organization"][
                                "name"
                            ]
                            start_date = self.__extract_start_date(
                                education_record_summary
                            )
                            end_date = self.__extract_end_date(education_record_summary)

                            # add the record
                            educations.append(
                                {
                                    "institution": institution,
                                    "degree": degree,
                                    "department": department,
                                    "timestamp_from": start_date,
                                    "timestamp_to": end_date,
                                    "additional_info": "",
                                }
                            )
                        except Exception:
                            continue

            except Exception as e:
                print("caught exception @ educations parsing:")
                print(e)

            return educations

        def __extract_qualifications(orcid_record: dict) -> List[Dict]:
            qualifications = []
            try:
                if (
                    orcid_record["activities-summary"]["qualifications"][
                        "affiliation-group"
                    ]
                    != []
                ):
                    for qualification_record in orcid_record["activities-summary"][
                        "qualifications"
                    ]["affiliation-group"]:
                        try:
                            qualification_record_summary = qualification_record[
                                "summaries"
                            ][0]["qualification-summary"]

                            # parse the fields
                            department = (
                                qualification_record_summary["department-name"]
                                if qualification_record_summary["department-name"]
                                != None
                                else ""
                            )
                            degree = (
                                qualification_record_summary["role-title"]
                                if qualification_record_summary["role-title"] != None
                                else ""
                            )
                            institution = qualification_record_summary["organization"][
                                "name"
                            ]
                            start_date = self.__extract_start_date(
                                qualification_record_summary
                            )
                            end_date = self.__extract_end_date(
                                qualification_record_summary
                            )

                            # add the record
                            qualifications.append(
                                {
                                    "institution": institution,
                                    "degree": degree,
                                    "department": department,
                                    "timestamp_from": start_date,
                                    "timestamp_to": end_date,
                                    "additional_info": "",
                                }
                            )
                        except Exception:
                            continue

            except Exception as e:
                print("caught exception @ qualifications parsing:")
                print(e)

            return qualifications

        extracted_educations = __extract_educations(orcid_record)
        extracted_qualifications = __extract_qualifications(orcid_record)

        # join the two lists since we extract the same information
        extracted_educations.extend(extracted_qualifications)

        # sort in reverse order based on end times,
        # since orcid interprets no given end time as "present",
        # we do the same by putting them in first in the ordering
        extracted_educations.sort(key=lambda item: item["timestamp_from"], reverse=True)

        return extracted_educations

    def _parse_employments(self, orcid_record: dict) -> List[Dict]:
        """
        extract employments from the orcid record and return them in a list of dicts
        if they exist. Whenever there is some information missing,
        empty strings are returned instead in the dicts. if no employments
        are present at all, an empty list is returned.
        """

        employments = []
        try:
            if (
                orcid_record["activities-summary"]["employments"]["affiliation-group"]
                != []
            ):
                for employment_record in orcid_record["activities-summary"][
                    "employments"
                ]["affiliation-group"]:
                    try:
                        employment_record_summary = employment_record["summaries"][0][
                            "employment-summary"
                        ]

                        # parse the fields
                        department = (
                            employment_record_summary["department-name"]
                            if employment_record_summary["department-name"] != None
                            else ""
                        )
                        position = (
                            employment_record_summary["role-title"]
                            if employment_record_summary["role-title"] != None
                            else ""
                        )
                        institution = employment_record_summary["organization"]["name"]
                        city = employment_record_summary["organization"]["address"][
                            "city"
                        ]
                        country = employment_record_summary["organization"]["address"][
                            "country"
                        ]
                        start_date = self.__extract_start_date(
                            employment_record_summary
                        )
                        end_date = self.__extract_end_date(employment_record_summary)

                        # add the record
                        employments.append(
                            {
                                "position": position,
                                "institution": institution,
                                "department": department,
                                "city": city,
                                "country": country,
                                "timestamp_from": start_date,
                                "timestamp_to": end_date,
                                "additional_info": "",
                            }
                        )
                    except Exception:
                        # if something fails, still try to parse the next one
                        continue

        except Exception as e:
            print("caught exception @ employments parsing:")
            print(e)

        # sort in reverse order based on end times,
        # since orcid interprets no given end time as the "current employment",
        # we do the same by putting them in first in the ordering
        employments.sort(key=lambda item: item["timestamp_from"], reverse=True)

        return employments

    def _parse_institutions(self, orcid_record: dict) -> str:
        """
        Extract the institution from the orcid record.
        Since the current institution is not directly represented in the record,
        we will do an "educated guess" based on the following heuristic:
        1. if there are employments, take the institution from the first one
            (since employments are sorted, this is treated as the current employment)
        2. if there are no employments, take the first appearing institution from
            the educations (again, most current)
        3. if there is still no hit, we cannot determine an institution and return
            an empty string instead
        """

        employments = self._parse_employments(orcid_record)
        try:
            if employments:
                return {
                    "_id": ObjectId(),
                    "name": employments[0]["institution"],
                    "school_type": "",
                    "department": "",
                    "country": "",
                }
            else:
                educations = self._parse_educations(orcid_record)
                if educations:
                    return {
                        "_id": ObjectId(),
                        "name": educations[0]["institution"],
                        "school_type": "",
                        "department": "",
                        "country": "",
                    }

            # no hits, cannnot determine institution
            return {
                "_id": ObjectId(),
                "name": "",
                "school_type": "",
                "department": "",
                "country": "",
            }

        except Exception as e:
            print("caught exception @ institutions parsing:")
            print(e)
            return ""


class UserHandler(BaseHandler):
    """
    User management
    """

    def options(self, slug):
        # no body
        self.set_status(200)
        self.finish()

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
            }

            with util.get_mongodb() as db:
                profile_manager = Profiles(db)
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
            with util.get_mongodb() as db:
                profile_manager = Profiles(db)
                for user in user_list_kc:
                    profile_obj = profile_manager.ensure_profile_exists(
                        user["username"],
                        projection={
                            "_id": False,
                            "first_name": True,
                            "last_name": True,
                            "role": True,
                            "follows": True,
                            "profile_pic": True,
                        },
                    )
                    user_info = {
                        "id": user["id"],
                        "first_name": profile_obj["first_name"],
                        "last_name": profile_obj["last_name"],
                        "username": user["username"],
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


class MatchingExclusionHandler(BaseHandler):
    @auth_needed
    def get(self):
        """
        GET /matching_exclusion_info

            request information about a user if he/she is currently
            excluded from matching. By default, the current active user is
            requested. Use the query param `username` to request the info of
            a different user instead.

            This information is also represented in the profile information
            (see `ProfileInformationHandler` for details) but that endpoint
            requires way more computing resources. if the sole purpose is to
            determine if a user is excluded from matching and nothing else,
            use this endpoint right here to induce less load onto the server.

            To change the exclusion setting, use the profile information endpoint's
            update functionality (see `ProfileInformationHandler` again for details).

            query params:
                username: optional, request information about this user instead

            returns:
                200 OK,
                {"success": True,
                 "excluded_from_matching": True/False}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                {"success": False,
                 "reason": "user_doesnt_exist"}
        """

        username = self.get_argument("username", None)
        if not username:
            username = self.current_user.username

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            try:
                excluded = profile_manager.get_matching_exclusion(username)
            except ProfileDoesntExistException:
                self.set_status(409)
                self.write({"success": False, "reason": USER_DOESNT_EXIST})
                return
            # on key error the user has not EXPLICITELY excluded him/herself from matching
            # so the answer is false
            except KeyError:
                self.write({"success": True, "excluded_from_matching": False})
                return

            self.write({"success": True, "excluded_from_matching": excluded})


class MatchingHandler(BaseHandler):
    @auth_needed
    def get(self):
        """
        GET /matching

            trigger the matching algorithm to find matching users
            based on the profile information of the current user.

            query params:
                `size`: optional, number of hits to return, default is 10
                `offset`: optional, offset to start from (used for pagination), default is 0

            returns:
                200 OK
                {"success": True,
                 "matching_hits": [
                    {
                        "username": "<string>",
                        "first_name": "<string>",
                        "last_name": "<string>",
                        "institution": "<string>",
                        "profile_pic": "<string>",
                        "chosen_achievement": {
                            "type": "<string>",           --> one of ACHIEVEMENT_TYPES in class `Profiles`
                            "level": <number>
                        },
                        "score": <float>
                    },
                    ...
                 ]}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}
        """

        size = self.get_argument("size", None)
        offset = self.get_argument("offset", None)

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            current_user_profile = profile_manager.ensure_profile_exists(
                self.current_user.username
            )

            matching_users = ElasticsearchConnector().search_profile_match(
                current_user_profile, size, offset
            )

            # get profile snippets of matched users and add the score to the snippet
            username_score_map = {
                user["_source"]["username"]: user["_score"] for user in matching_users
            }
            profile_snippets = profile_manager.get_profile_snippets(
                list(username_score_map.keys())
            )
            for profile in profile_snippets:
                profile["score"] = username_score_map[profile["username"]]

        self.serialize_and_write({"success": True, "matching_hits": profile_snippets})

    @auth_needed
    def post(self):
        pass


class AdminCheckHandler(BaseHandler):

    @auth_needed
    def get(self):
        """
        GET /admin_check
            check if the current user is an admin

            returns:
                200 OK
                {"success": True,
                 "is_admin": True/False}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}
        """

        self.write({"success": True, "is_admin": self.is_current_user_lionet_admin()})
