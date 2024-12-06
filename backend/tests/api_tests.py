from base64 import b64encode
from datetime import datetime, timedelta
import io
import json
import logging
import os
import requests
from typing import List

from bson import ObjectId
from dotenv import load_dotenv
import gridfs
import pymongo
import pymongo.errors
from requests_toolbelt import MultipartEncoder
from tornado.options import options
from tornado.testing import AsyncHTTPTestCase

import global_vars
from main import make_app
from model import (
    Evaluation,
    IndividualLearningGoal,
    Institution,
    Lecture,
    PhysicalMobility,
    Step,
    TargetGroup,
    Task,
    User,
    VEPlan,
)
from resources.elasticsearch_integration import ElasticsearchConnector
from resources.network.acl import ACL
from resources.network.profile import Profiles
import util

# load environment variables
load_dotenv()

# hack all loggers to not produce too much irrelevant (info) output here
for logger_name in logging.root.manager.loggerDict:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.ERROR)
logging.getLogger().setLevel(logging.ERROR)


MISSING_KEY_ERROR_SLUG = "missing_key:"
INVALID_KEY_ERROR_SLUG = "invalid_query_parameter:"
MISSING_KEY_HTTP_BODY_ERROR_SLUG = "missing_key_in_http_body:"
MISSING_FILE_ERROR_SLUG = "missing_file:"
JSON_PARSING_ERROR = "json_parsing_error"
INVALID_OBJECT_ID = "invalid_object_id"
USER_NOT_ADMIN_ERROR = "user_not_admin"
INSUFFICIENT_PERMISSION_ERROR = "insufficient_permission"
UNRECOGNIZABLE_KEY_ERROR = "unrecognizable_key_in_http_body"
NON_BOOL_VALUE_ERROR = "value_not_bool_in_http_body"
SPACE_DOESNT_EXIST_ERROR = "space_doesnt_exist"
POST_DOESNT_EXIST_ERROR = "post_doesnt_exist"
USER_NOT_AUTHOR_ERROR = "user_not_author"
INVALID_PIN_TYPE_ERROR = "invalid_pin_type_in_http_body"
USER_ALREADY_MEMBER_ERROR = "user_already_member"
USER_NOT_INVITED_ERROR = "user_is_not_invited_into_space"
USER_DIDNT_REQUEST_TO_JOIN_ERROR = "user_didnt_request_to_join"
USER_NOT_MEMBER_ERROR = "user_not_member_of_space"

PLAN_DOESNT_EXIST_ERROR = "plan_doesnt_exist"
PLAN_ALREADY_EXISTS_ERROR = "plan_already_exists"
NON_UNIQUE_STEPS_ERROR = "non_unique_step_names"
NON_UNIQUE_TASKS_ERROR = "non_unique_tasks"
PLAN_LOCKED_ERROR = "plan_locked"
MAXIMUM_FILES_EXCEEDED_ERROR = "maximum_files_exceeded"
FILE_DOESNT_EXIST_ERROR = "file_doesnt_exist"

INVITATION_DOESNT_EXIST_ERROR = "invitation_doesnt_exist"

ROOM_DOESNT_EXIST_ERROR = "room_doesnt_exist"

# don't change, these values match with the ones in BaseHandler
CURRENT_ADMIN = User(
    "test_admin", "aaaaaaaa-bbbb-0000-cccc-dddddddddddd", "test_admin@mail.de"
)
CURRENT_USER = User(
    "test_user", "aaaaaaaa-bbbb-0000-cccc-dddddddddddd", "test_user@mail.de"
)


def validate_json_str(suspect_str: str) -> bool:
    try:
        json.loads(suspect_str)
    except:
        return False
    return True


def setUpModule():
    """
    initial one time setup that deals with config properties.
    unittest will call this method itself.
    """

    global_vars.port = int(os.getenv("PORT", "8888"))
    global_vars.cookie_secret = os.getenv("COOKIE_SECRET")
    global_vars.wordpress_url = os.getenv("WORDPRESS_URL")
    global_vars.mongodb_host = os.getenv("MONGODB_HOST", "localhost")
    global_vars.mongodb_port = int(os.getenv("MONGODB_PORT", "27017"))
    global_vars.mongodb_username = os.getenv("MONGODB_USERNAME")
    global_vars.mongodb_password = os.getenv("MONGODB_PASSWORD")
    global_vars.mongodb_db_name = "ve-collab-unittest"
    global_vars.etherpad_base_url = os.getenv("ETHERPAD_BASE_URL")
    global_vars.etherpad_api_key = os.getenv("ETHERPAD_API_KEY")
    global_vars.elasticsearch_base_url = os.getenv("ELASTICSEARCH_BASE_URL")
    global_vars.elasticsearch_username = os.getenv("ELASTICSEARCH_USERNAME", "elastic")
    global_vars.elasticsearch_password = os.getenv("ELASTICSEARCH_PASSWORD")
    global_vars.dummy_personas_passcode = os.getenv("DUMMY_PERSONAS_PASSCODE")
    global_vars.keycloak_base_url = os.getenv("KEYCLOAK_BASE_URL")
    global_vars.keycloak_realm = os.getenv("KEYCLOAK_REALM")
    global_vars.keycloak_client_id = os.getenv("KEYCLOAK_CLIENT_ID")
    global_vars.keycloak_client_secret = os.getenv("KEYCLOAK_CLIENT_SECRET")
    global_vars.keycloak_admin_username = os.getenv("KEYCLOAK_ADMIN_USERNAME")
    global_vars.keycloak_admin_password = os.getenv("KEYCLOAK_ADMIN_PASSWORD")


def tearDownModule():
    """
    after all tests from all cases have run, wipe the whole db for safety's sake
    in case any of the test cases missed to clean up.
    unittest will call this method itself.
    """

    with util.get_mongodb() as db:
        for collection_name in db.list_collection_names():
            db.drop_collection(collection_name)

    # clear out elastisearch index, only once after all tests
    # because otherwise there would be too many http requests
    response = requests.delete(
        "{}/test".format(global_vars.elasticsearch_base_url),
        auth=(
            global_vars.elasticsearch_username,
            global_vars.elasticsearch_password,
        ),
    )
    if response.status_code != 200:
        print(response.content)


class BaseApiTestCase(AsyncHTTPTestCase):
    @classmethod
    def setUpClass(cls):
        # initialize mongodb connection
        cls._client = pymongo.MongoClient(
            global_vars.mongodb_host,
            global_vars.mongodb_port,
            username=global_vars.mongodb_username,
            password=global_vars.mongodb_password,
        )
        cls._db = cls._client[global_vars.mongodb_db_name]

    def setUp(self) -> None:
        super().setUp()

        # set test mode to bypass authentication as an admin as default for each test case (test cases where user view is required will set mode themselves)
        options.test_admin = True

        # initialize mongodb connection
        self.client = self.__class__._client
        self.db = self.__class__._db

    def tearDown(self) -> None:
        self.client = None
        super().tearDown()

    @classmethod
    def tearDownClass(cls) -> None:
        # close mongodb connection
        cls._client.close()

    def get_app(self):
        return make_app(global_vars.cookie_secret)

    def base_permission_environment_setUp(self) -> None:
        # insert test data
        self.test_space_id = ObjectId()
        self.test_space = "unittest_space"
        self.test_roles = {
            CURRENT_ADMIN.username: "admin",
            CURRENT_USER.username: "user",
        }

        current_admin_institution_id = ObjectId()

        self.test_profiles = {
            CURRENT_ADMIN.username: {
                "username": CURRENT_ADMIN.username,
                "role": self.test_roles[CURRENT_ADMIN.username],
                "follows": [],
                "bio": None,
                "institutions": [
                    {
                        "_id": current_admin_institution_id,
                        "name": "test",
                        "department": "test",
                        "school_type": "test",
                        "country": "test",
                    }
                ],
                "chosen_institution_id": current_admin_institution_id,
                "profile_pic": "default_profile_pic.jpg",
                "first_name": "CURRENT",
                "last_name": "ADMIN",
                "gender": None,
                "address": None,
                "birthday": None,
                "experience": None,
                "expertise": None,
                "languages": [],
                "ve_interests": [],
                "ve_goals": [],
                "preferred_formats": [],
                "research_tags": [],
                "courses": [],
                "educations": [],
                "work_experience": [],
                "ve_window": [],
                "notification_settings": {
                    "messages": "push",
                    "ve_invite": "push",
                    "group_invite": "push",
                    "system": "push",
                },
                "achievements": {
                    "social": {"level": 3, "progress": 105, "next_level": 160},
                    "ve": {"level": 0, "progress": 1, "next_level": 10},
                    "tracking": {
                        "good_practice_plans": [],
                        "unique_partners": [],
                    },
                },
                "chosen_achievement": "social",
            },
            CURRENT_USER.username: {
                "username": CURRENT_USER.username,
                "role": self.test_roles[CURRENT_USER.username],
                "follows": [],
                "bio": None,
                "institutions": [
                    {
                        "_id": ObjectId(),
                        "name": "test",
                        "department": "test",
                        "school_type": "test",
                        "country": "test",
                    }
                ],
                "chosen_institution_id": "",
                "profile_pic": "default_profile_pic.jpg",
                "first_name": None,
                "last_name": None,
                "gender": None,
                "address": None,
                "birthday": None,
                "experience": None,
                "expertise": None,
                "languages": [],
                "ve_interests": [],
                "ve_goals": [],
                "preferred_formats": [],
                "research_tags": [],
                "courses": [],
                "educations": [],
                "work_experience": [],
                "ve_window": [],
                "notification_settings": {
                    "messages": "push",
                    "ve_invite": "push",
                    "group_invite": "push",
                    "system": "push",
                },
                "achievements": {
                    "social": {"level": 0, "progress": 0, "next_level": 10},
                    "ve": {"level": 0, "progress": 0, "next_level": 10},
                    "tracking": {
                        "good_practice_plans": [],
                        "unique_partners": [],
                    },
                },
                "chosen_achievement": None,
            },
        }

        self.test_global_acl_rules = {
            CURRENT_ADMIN.username: {
                "role": self.test_roles[CURRENT_ADMIN.username],
                "create_space": True,
            },
            CURRENT_USER.username: {
                "role": self.test_roles[CURRENT_USER.username],
                "create_space": False,
            },
        }

        self.test_space_acl_rules = {
            CURRENT_ADMIN.username: {
                "username": CURRENT_ADMIN.username,
                "space": self.test_space_id,
                "join_space": True,
                "read_timeline": True,
                "post": True,
                "comment": True,
                "read_wiki": True,
                "write_wiki": True,
                "read_files": True,
                "write_files": True,
            },
            CURRENT_USER.username: {
                "username": CURRENT_USER.username,
                "space": self.test_space_id,
                "join_space": True,
                "read_timeline": True,
                "post": False,
                "comment": True,
                "read_wiki": False,
                "write_wiki": False,
                "read_files": False,
                "write_files": False,
            },
        }

        self.db.spaces.insert_one(
            {
                "_id": self.test_space_id,
                "name": self.test_space,
                "invisible": False,
                "joinable": False,
                "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
                "admins": [CURRENT_ADMIN.username],
                "invites": [],
                "requests": [],
                "files": [],
            }
        )
        self.db.profiles.insert_many(
            [value.copy() for value in self.test_profiles.values()]
        )
        # pymongo modifies parameters in place (adds _id fields), thats why we give it a copy...
        self.db.space_acl.insert_many(
            [value.copy() for value in self.test_space_acl_rules.values()]
        )
        self.db.global_acl.insert_many(
            [value.copy() for value in self.test_global_acl_rules.values()]
        )

        self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS = Profiles(
            self.db
        ).SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS
        self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS = Profiles(
            self.db
        ).VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS

    def base_permission_environments_tearDown(self) -> None:
        # cleanup test data
        self.db.profiles.delete_many({})
        self.db.global_acl.delete_many({})
        self.db.space_acl.delete_many({})
        self.db.spaces.delete_many({})

    def base_checks(
        self,
        method: str,
        url: str,
        expect_success: bool,
        expect_response_code: str,
        headers: dict = None,
        body: dict = None,
    ) -> dict:
        """
        convenience wrapper to assert the following:
        - response matches expected http code
        - response contains valid json
        - response json contains a "success" key
        - "success" matches expected success value

        :returns: response content
        """

        # convert body to string, if it is not already one
        if body is not None:
            if isinstance(body, dict):
                body = json.dumps(body)
            elif isinstance(body, (str, bytes)):
                pass
            else:
                raise ValueError(
                    "Body can either be Dict or str, but is {}".format(type(body))
                )

        response = self.fetch(
            url,
            method=method,
            headers=headers,
            body=body,
            allow_nonstandard_methods=True,
        )
        content = response.buffer.getvalue().decode()

        # expect valid json as response content
        self.assertIsInstance(content, str)
        is_json = validate_json_str(content)
        self.assertEqual(is_json, True)

        content = json.loads(content)

        try:
            # match expected response code
            self.assertEqual(response.code, expect_response_code)

            # expect a "success" key and match expected value
            self.assertIn("success", content)
            self.assertEqual(content["success"], expect_success)

            # if we expect an error, we also need to have reason in the message
            if expect_success == False:
                self.assertIn("reason", content)
        except AssertionError:
            print(content)
            raise

        return content


class FollowHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.base_permission_environment_setUp()

        self.user_follows = ["test_user1", "test_user2"]

        # insert test data
        self.db.profiles.update_one(
            {"username": CURRENT_ADMIN.username},
            {"$set": {"follows": self.user_follows}},
        )
        self.db.profiles.update_one(
            {"username": CURRENT_USER.username},
            {"$set": {"follows": self.user_follows}},
        )

    def _db_get_follows(self) -> List[str]:
        """
        get list of follows for CURRENT_ADMIN from db
        """

        db_response = self.db.profiles.find_one(
            {"username": CURRENT_ADMIN.username}, projection={"follows": True}
        )
        if db_response:
            return db_response["follows"]

    def test_get_follows(self):
        """
        expect: a dict containing the above set-up follow-relation
        """

        response = self.base_checks(
            "GET", "/follow?user={}".format(CURRENT_USER.username), True, 200
        )

        # expect a users and a follows key
        self.assertIn("user", response)
        self.assertIn("follows", response)

        # expect user to be the requested one and the users he follows as stated in the setup
        self.assertEqual(response["user"], CURRENT_USER.username)
        self.assertEqual(response["follows"], self.user_follows)

    def test_get_follows_default_current_user(self):
        """
        expect: current user is used, since user query param is not specified
        """

        response = self.base_checks("GET", "/follow", True, 200)

        # expect a users and a follows key
        self.assertIn("user", response)
        self.assertIn("follows", response)

        # expect user to be the current user and the users he follows as stated in the setup
        self.assertEqual(response["user"], CURRENT_ADMIN.username)
        self.assertEqual(response["follows"], self.user_follows)

    def test_post_follow(self):
        """
        expect: the added follow to afterwards be present in the list
        """

        # post the request to follow this user
        followed_username = "test_user_added"
        self.base_checks("POST", "/follow?user={}".format(followed_username), True, 200)

        # we now expect to be following those 3 users
        db_state = self._db_get_follows()
        self.assertIn(followed_username, db_state)

    def test_post_follow_error_missing_key(self):
        """
        expect: missing key error due to user parameter left out of request
        """

        response = self.base_checks("POST", "/follow", False, 400)

        # expect a missing_key:user error as the reason
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "user")

    def test_post_follow_error_already_following(self):
        """
        expect: fail message because user already follows the other user
        """

        # manually follow user
        followed_username = "test_user_added"
        self.db.profiles.update_one(
            {"username": CURRENT_ADMIN.username},
            {"$addToSet": {"follows": followed_username}},
        )

        # post the request to follow this user and expect 304
        response = self.fetch(
            "/follow?user={}".format(followed_username),
            method="POST",
            allow_nonstandard_methods=True,
        )
        self.assertEqual(response.code, 304)

    def test_delete_follow(self):
        """
        expect: the removed follow disappears from the list
        """

        # remove the first one, because it was definetly in (manually added in setup)
        remove_follow = self.user_follows[0]
        self.base_checks("DELETE", "/follow?user={}".format(remove_follow), True, 200)

        # we now expect to no longer follow the removed user (first from list)
        db_state = self._db_get_follows()
        self.assertNotIn(remove_follow, db_state)

    def test_delete_follow_error_missing_key(self):
        """
        expect: missing key error due to user parameter left out of request
        """

        response = self.base_checks("DELETE", "/follow", False, 400)

        # expect a missing_key:user error as the reason
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "user")

    def test_delete_follow_error_not_following(self):
        """
        expect: 304 because we didnt follow the user at all
        """

        response = self.fetch(
            "/follow?user={}".format("not_followed_user"), method="DELETE"
        )
        self.assertEqual(response.code, 304)

    def tearDown(self) -> None:
        # cleanup test data
        self.base_permission_environments_tearDown()
        super().tearDown()


class RoleHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        # insert test data
        self.base_permission_environment_setUp()

    def tearDown(self) -> None:
        self.base_permission_environments_tearDown()
        super().tearDown()

    def _get_my_role(self):
        return self.base_checks("GET", "/role/my", True, 200)

    def test_get_my_role(self):
        """
        expect: personal role to be returned as initiazlized in setup
        """

        response = self._get_my_role()
        # expect returned role to be as in set up
        self.assertIn("role", response)
        self.assertEqual(response["role"], self.test_roles[CURRENT_ADMIN.username])

    def test_get_my_role_auto_created(self):
        """
        expect: personal role to returned is "guest" and it is also stored in db
        this is a side effect if no record is in the db for the given user: create entry with the lowest possible permissions
        """

        # gotta clean up first to see effect if no record is stored
        self.db.profiles.delete_many({})

        response = self._get_my_role()

        # expect role to be guest
        self.assertIn("role", response)
        self.assertEqual(response["role"], "guest")

        # also expect the note that this role entry was auto-created
        self.assertIn("note", response)
        self.assertEqual(response["note"], "created_because_no_previous_record")

    def test_get_all_roles(self):
        """
        expect: alle roles as defined in setup
        """

        response = self.base_checks("GET", "/role/all", True, 200)

        # expect the test_roles from the setup to appear in the response
        # careful: we cannot check for equality here, because there might be other users coming from keycloak as well
        # (they are aggregated)
        self.assertIn("users", response)
        expected_entries = [
            {"username": key, "role": value} for key, value in self.test_roles.items()
        ]
        self.assertTrue(all(entry in response["users"] for entry in expected_entries))

    def test_get_all_roles_error_no_admin(self):
        """
        expect: fail message because user is not an admin
        """
        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        response = self.base_checks("GET", "/role/all", False, 403)

        self.assertEqual(response["reason"], USER_NOT_ADMIN_ERROR)

    def test_get_distinct_roles(self):
        """
        expect: a list containing atleast the roles in setup
        """

        response = self.base_checks("GET", "/role/distinct", True, 200)

        # expect the roles from the setup to be in the response
        self.assertIn("existing_roles", response)
        self.assertTrue(
            role in response["existing_roles"] for role in self.test_roles.values()
        )

    def test_get_distinct_roles_error_no_admin(self):
        """
        expect: fail message because user is not an admin
        """

        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        response = self.base_checks("GET", "/role/distinct", False, 403)

        self.assertEqual(response["reason"], USER_NOT_ADMIN_ERROR)

    def test_post_update_role(self):
        """
        expect: updated role appears in the db
        """
        updated_user_role = "updated_role"
        http_body = {"username": CURRENT_USER.username, "role": updated_user_role}

        self.base_checks("POST", "/role/update", True, 200, body=http_body)

        db_state = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertIn("role", db_state)
        self.assertEqual(db_state["role"], updated_user_role)

    def test_post_update_role_error_missing_username(self):
        """
        expect: missing_key_in_http_body error
        """

        http_body = {"role": "irrelevant"}

        response = self.base_checks("POST", "/role/update", False, 400, body=http_body)

        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "username"
        )

    def test_post_update_role_error_missing_role(self):
        """
        expect: missing_key_in_http_body error
        """

        http_body = {
            "username": CURRENT_USER.username,
        }

        response = self.base_checks("POST", "/role/update", False, 400, body=http_body)

        self.assertEqual(response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "role")

    def test_post_update_role_error_no_admin(self):
        """
        expect: fail message because user is not an admin
        """

        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        response = self.base_checks("POST", "/role/update", False, 403)

        self.assertEqual(response["reason"], USER_NOT_ADMIN_ERROR)


class GlobalACLHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.base_permission_environment_setUp()

    def tearDown(self) -> None:
        self.base_permission_environments_tearDown()
        super().tearDown()

    def test_get_global_acl(self):
        """
        expect: responded acl entry matches the one in setup
        """

        response = self.base_checks("GET", "/global_acl/get", True, 200)

        self.assertIn("acl_entry", response)
        self.assertEqual(
            response["acl_entry"], self.test_global_acl_rules[CURRENT_ADMIN.username]
        )

    def test_get_global_acl_error_user_has_no_role(self):
        """
        expect: fail message because user has no role
        """

        self.db.profiles.delete_many({})

        response = self.base_checks("GET", "/global_acl/get", False, 409)

        self.assertEqual(response["reason"], "user_has_no_role")

    def test_get_global_acl_all(self):
        """
        expect: list of all acl entries, matching those in setup
        """

        response = self.base_checks("GET", "/global_acl/get_all", True, 200)

        self.assertIn("acl_entries", response)
        self.assertEqual(
            response["acl_entries"],
            [value for value in self.test_global_acl_rules.values()],
        )

    def test_get_global_acl_all_error_no_admin(self):
        """
        expect: fail message because user is not an admin
        """

        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        response = self.base_checks("GET", "/global_acl/get_all", False, 403)

        self.assertEqual(response["reason"], USER_NOT_ADMIN_ERROR)

    def test_post_global_acl_update(self):
        """
        expect: updated entries get persisted into the db
        """

        updated_acl_entry = {
            "role": self.test_roles[CURRENT_USER.username],
            "create_space": False,
        }

        self.base_checks(
            "POST", "/global_acl/update", True, 200, body=updated_acl_entry
        )

        db_state = self.db.global_acl.find_one(
            {"role": self.test_roles[CURRENT_USER.username]}
        )

        self.assertIn("role", db_state)
        self.assertEqual(db_state["create_space"], updated_acl_entry["create_space"])

    def test_post_global_acl_update_error_no_admin(self):
        """
        expect: fail message because user is not an admin
        """

        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        response = self.base_checks("POST", "/global_acl/update", False, 403)

        self.assertEqual(response["reason"], USER_NOT_ADMIN_ERROR)

    def test_post_global_acl_update_error_unrecognizable_key(self):
        """
        expect fail message because request contains invalid key
        """

        updated_acl_entry = {
            "role": self.test_roles[CURRENT_USER.username],
            "create_space": False,
            "invalid_key": True,
        }

        response = self.base_checks(
            "POST", "/global_acl/update", False, 400, body=updated_acl_entry
        )

        self.assertEqual(response["reason"], UNRECOGNIZABLE_KEY_ERROR)

    def test_post_global_acl_update_error_non_bool_value(self):
        """
        expect fail message because request contains non-boolean value
        """

        updated_acl_entry = {
            "role": self.test_roles[CURRENT_USER.username],
            "create_space": "str_val",
        }

        response = self.base_checks(
            "POST", "/global_acl/update", False, 400, body=updated_acl_entry
        )

        self.assertEqual(response["reason"], NON_BOOL_VALUE_ERROR)

    def test_post_global_acl_update_error_admin_immutable(self):
        """
        expect fail message because admin role is immutable
        """

        updated_acl_entry = {
            "role": "admin",
            "create_space": False,
        }

        response = self.base_checks(
            "POST", "/global_acl/update", False, 409, body=updated_acl_entry
        )

        self.assertEqual(response["reason"], "admin_role_immutable")


class SpaceACLHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.base_permission_environment_setUp()

    def tearDown(self) -> None:
        self.base_permission_environments_tearDown()
        super().tearDown()

    def test_get_space_acl(self):
        """
        expect: responded acl entry matches the one in setup
        """

        response = self.base_checks(
            "GET", "/space_acl/get?space={}".format(str(self.test_space_id)), True, 200
        )

        # for quality checks, convert the id to ObjectId
        response["acl_entry"]["space"] = ObjectId(response["acl_entry"]["space"])

        self.assertIn("acl_entry", response)
        self.assertEqual(
            response["acl_entry"], self.test_space_acl_rules[CURRENT_ADMIN.username]
        )

    def test_get_space_acl_other_user(self):
        """
        expect: acl entry of CURRENT_USER instead of CURRENT_ADMIN
        """

        response = self.base_checks(
            "GET",
            "/space_acl/get?space={}&username={}".format(
                str(self.test_space_id), CURRENT_USER.username
            ),
            True,
            200,
        )

        # for quality checks, convert the id to ObjectId
        response["acl_entry"]["space"] = ObjectId(response["acl_entry"]["space"])

        self.assertIn("acl_entry", response)
        self.assertEqual(
            response["acl_entry"], self.test_space_acl_rules[CURRENT_USER.username]
        )

    def test_get_space_acl_no_space(self):
        """
        expect: fail message because query parameter 'space' is missing
        """

        response = self.base_checks("GET", "/space_acl/get", False, 400)

        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "space")

    def test_get_space_acl_all(self):
        """
        expect: list of all acl entries, matching those in setup
        """

        response = self.base_checks(
            "GET",
            "/space_acl/get_all?space={}".format(str(self.test_space_id)),
            True,
            200,
        )

        # for quality checks, convert the id to ObjectId
        for entry in response["acl_entries"]:
            entry["space"] = ObjectId(entry["space"])

        self.assertIn("acl_entries", response)
        self.assertEqual(
            response["acl_entries"],
            [value for value in self.test_space_acl_rules.values()],
        )

    def test_get_space_acl_all_error_no_space(self):
        """
        expect: fail message because space doesnt exist
        """

        # explicitely switch to user mode for this test,
        # because space existence is only checked if user is not global admin (--> might be space admin)
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "GET",
            "/space_acl/get_all?space={}".format(str(ObjectId())),
            False,
            400,
        )

        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_get_space_acl_all_error_no_admin(self):
        """
        expect: fail message because user is not admin (neither global nor space)
        """

        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "GET",
            "/space_acl/get_all?space={}".format(str(self.test_space_id)),
            False,
            403,
        )

        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_acl_update(self):
        """
        expect: updated entries get persisted into the db
        """

        updated_acl_entry = {
            "username": CURRENT_USER.username,
            "space": str(self.test_space_id),
            "join_space": True,
            "read_timeline": True,
            "post": False,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False,
        }

        self.base_checks("POST", "/space_acl/update", True, 200, body=updated_acl_entry)

        db_state = self.db.space_acl.find_one(
            {"username": CURRENT_USER.username, "space": self.test_space_id}
        )

        # for equality checks, delete the id
        # and convert the space id to ObjectId
        del db_state["_id"]
        updated_acl_entry["space"] = ObjectId(updated_acl_entry["space"])

        self.assertIn("username", db_state)
        self.assertEqual(db_state, updated_acl_entry)

    def test_post_space_acl_update_error_no_admin(self):
        """
        expect: fail message because user is not an admin
        """

        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        # have to include the update payload here,
        # because acl checks for space admin, therefore space has to be included
        updated_acl_entry = {
            "username": CURRENT_USER.username,
            "space": str(self.test_space_id),
            "join_space": True,
            "read_timeline": True,
            "post": False,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False,
        }

        response = self.base_checks(
            "POST", "/space_acl/update", False, 403, body=updated_acl_entry
        )

        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_acl_update_error_unrecognizable_key(self):
        """
        expect fail message because request contains invalid key
        """

        updated_acl_entry = {
            "username": CURRENT_USER.username,
            "space": str(self.test_space_id),
            "join_space": True,
            "read_timeline": True,
            "post": False,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False,
            "invalid_key": True,
        }

        response = self.base_checks(
            "POST", "/space_acl/update", False, 400, body=updated_acl_entry
        )

        self.assertEqual(response["reason"], UNRECOGNIZABLE_KEY_ERROR)

    def test_post_space_acl_update_error_non_bool_value(self):
        """
        expect fail message because request contains non-boolean value
        """

        updated_acl_entry = {
            "username": CURRENT_USER.username,
            "space": str(self.test_space_id),
            "join_space": "non_bool_value",
            "read_timeline": True,
            "post": False,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False,
        }

        response = self.base_checks(
            "POST", "/space_acl/update", False, 400, body=updated_acl_entry
        )

        self.assertEqual(response["reason"], NON_BOOL_VALUE_ERROR)

    def test_post_space_acl_update_error_username_doesnt_exist(self):
        """
        expect: fail message because the username doesnt exist
        """

        updated_acl_entry = {
            "username": "non_existent_username",
            "space": str(self.test_space_id),
            "join_space": True,
            "read_timeline": True,
            "post": False,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False,
        }

        response = self.base_checks(
            "POST", "/space_acl/update", False, 409, body=updated_acl_entry
        )

        self.assertEqual(response["reason"], "user_doesnt_exist")

    def test_post_space_acl_update_error_space_doesnt_exist(self):
        """
        expect: fail message because the space doesnt exist
        """

        updated_acl_entry = {
            "username": CURRENT_USER.username,
            "space": str(ObjectId()),
            "join_space": True,
            "read_timeline": True,
            "post": False,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False,
        }

        response = self.base_checks(
            "POST", "/space_acl/update", False, 409, body=updated_acl_entry
        )

        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_acl_update_error_admin_immutable(self):
        """
        expect: fail message because the admin users should not be modifiable
        """

        updated_acl_entry = {
            "username": CURRENT_ADMIN.username,
            "space": str(self.test_space_id),
            "join_space": True,
            "read_timeline": True,
            "post": False,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False,
        }

        response = self.base_checks(
            "POST", "/space_acl/update", False, 409, body=updated_acl_entry
        )

        self.assertEqual(response["reason"], "admin_role_immutable")


class RoleACLIntegrationTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        # setup basic permissions
        self.base_permission_environment_setUp()

    def tearDown(self) -> None:
        # cleanup test data
        self.base_permission_environments_tearDown()
        super().tearDown()

    def test_acl_entry_creation_on_role_request_of_no_role(self):
        """
        expect: when requesting the role of the current_user, but he has no role, the role and a corresponding acl entry should be created
        """

        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        # delete the role entry
        self.db.profiles.delete_one({"username": CURRENT_USER.username})

        role_response = self.base_checks("GET", "/role/my", True, 200)

        # expect the role "guest" to be assigned to me automatically
        self.assertIn("role", role_response)
        self.assertEqual(role_response["role"], "guest")

        # also expect a corresponding global acl entry to be created
        global_acl_db_state = self.db.global_acl.find_one({"role": "guest"})
        self.assertNotEqual(global_acl_db_state, None)

    def test_acl_entry_creation_on_role_creation(self):
        """
        expect: creating a new role via update/upsert should also create a corresponding acl entry
        """

        new_role = {"username": CURRENT_USER.username, "role": "new_role"}

        self.base_checks("POST", "/role/update", True, 200, body=new_role)

        # expect a corresponding global acl entry to be created
        global_acl_db_state = self.db.global_acl.find_one({"role": "new_role"})
        self.assertNotEqual(global_acl_db_state, None)

    def test_cleanup_unused_acl_rules(self):
        """
        expect: removing all roles should cleanup the full acl
        according to the cleanup procedure removing any entries,
        that no longer have a matching role or username/space
        """

        self.db.profiles.delete_many({})

        from resources.network.acl import cleanup_unused_rules

        cleanup_unused_rules()

        # expect an empty global acl
        global_acl_db_state = list(self.db.global_acl.find())
        self.assertEqual(global_acl_db_state, [])

        # also expect an empty space acl
        space_acl_db_state = list(self.db.space_acl.find())
        self.assertEqual(space_acl_db_state, [])


class PostHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        # setup basic environment of permissions
        self.base_permission_environment_setUp()

        self.test_file_name = "test_file.txt"

    def tearDown(self) -> None:
        # cleanup test data
        self.base_permission_environments_tearDown()
        self.db.posts.delete_many({})
        self.db.plans.delete_many({})

        # delete uploaded files that were generated by file-repo tests
        fs = gridfs.GridFS(self.db)
        files = list(fs.find())
        for file in files:
            fs.delete(file._id)

        super().tearDown()

    def test_get_post(self):
        """
        expect: successfully request a single post by id
        """

        # create a post
        post_id = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": post_id,
                "author": CURRENT_USER.username,
                "creation_date": datetime.now(),
                "text": "unittest_test_post",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
                "comments": [],
                "likers": [],
            },
        )

        response = self.base_checks(
            "GET", "/posts?post_id={}".format(str(post_id)), True, 200
        )

        # expect the post to be in the response
        self.assertIn("post", response)
        self.assertEqual(ObjectId(response["post"]["_id"]), post_id)

        # expect author to be enhanced with profile details
        post = response["post"]
        self.assertIn("author", post)
        self.assertIn("username", post["author"])
        self.assertIn("profile_pic", post["author"])
        self.assertIn("first_name", post["author"])
        self.assertIn("last_name", post["author"])
        self.assertIn("institution", post["author"])

    def test_get_post_error_missing_key(self):
        """
        expect: fail message because post_id is missing
        """

        response = self.base_checks("GET", "/posts", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "post_id")

    def test_get_post_error_post_doesnt_exist(self):
        """
        expect: fail message because post doesnt exist
        """

        response = self.base_checks(
            "GET", "/posts?post_id={}".format(str(ObjectId())), False, 409
        )
        self.assertEqual(response["reason"], POST_DOESNT_EXIST_ERROR)

    def test_get_post_error_space_doesnt_exist(self):
        """
        expect: fail message because space that post belongs to doesnt exist
        """

        # create a post in a space that doesnt exist
        post_id = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": post_id,
                "author": CURRENT_USER.username,
                "creation_date": datetime.now(),
                "text": "unittest_test_post",
                "space": ObjectId(),
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
                "comments": [],
                "likers": [],
            },
        )

        response = self.base_checks(
            "GET", "/posts?post_id={}".format(str(post_id)), False, 409
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_get_post_error_insufficient_permission_no_space_member(self):
        """
        expect: fail message because user is not a member of the space
        """

        # create a space
        space_id = ObjectId()
        self.db.spaces.insert_one(
            {
                "_id": space_id,
                "name": "post_space_test",
                "invisible": False,
                "joinable": False,
                "members": [CURRENT_USER.username],
                "admins": [CURRENT_USER.username],
                "invites": [],
                "requests": [],
                "files": [],
            }
        )

        # create a post in the space
        post_id = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": post_id,
                "author": CURRENT_USER.username,
                "creation_date": datetime.now(),
                "text": "unittest_test_post",
                "space": space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
                "comments": [],
                "likers": [],
            },
        )

        response = self.base_checks(
            "GET", "/posts?post_id={}".format(str(post_id)), False, 403
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_get_post_error_insufficient_permission_no_read_access(self):
        """
        expect: fail message because user has no read_timeline right in the space
        """

        # create a space
        space_id = ObjectId()
        self.db.spaces.insert_one(
            {
                "_id": space_id,
                "name": "post_space_test",
                "invisible": False,
                "joinable": False,
                "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
                "admins": [CURRENT_USER.username],
                "invites": [],
                "requests": [],
                "files": [],
            }
        )

        # create the acl entry for the user in the space
        self.db.space_acl.insert_one(
            {
                "username": CURRENT_ADMIN.username,
                "space": space_id,
                "join_space": True,
                "read_timeline": False,
                "post": False,
                "comment": False,
                "read_wiki": False,
                "write_wiki": False,
                "read_files": True,
                "write_files": False,
            }
        )

        # create a post in the space
        post_id = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": post_id,
                "author": CURRENT_USER.username,
                "creation_date": datetime.now(),
                "text": "unittest_test_post",
                "space": space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
                "comments": [],
                "likers": [],
            },
        )

        response = self.base_checks(
            "GET", "/posts?post_id={}".format(str(post_id)), False, 403
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_create_post(self):
        """
        expect: successfully create a new post
        """

        # create a plan to be referenced
        plan_dict = VEPlan(write_access=[CURRENT_ADMIN.username]).to_dict()
        self.db.plans.insert_one(plan_dict)

        request_json = {
            "text": "unittest_test_post",
            "tags": json.dumps(["tag1", "tag2"]),
            "plans": json.dumps([str(plan_dict["_id"])]),
        }

        request = MultipartEncoder(fields=request_json)

        response = self.base_checks(
            "POST",
            "/posts",
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        db_state = list(self.db.posts.find())

        # expect exactly this one post in the db
        self.assertEqual(len(db_state), 1)

        # since we asserted len == 1, we can safely use the first (and only) element
        db_state = db_state[0]

        # check if the response contains the inserted post and the db state is the same
        self.assertIn("inserted_post", response)
        self.assertEqual(ObjectId(response["inserted_post"]["_id"]), db_state["_id"])
        self.assertEqual(response["inserted_post"]["text"], db_state["text"])
        self.assertEqual(response["inserted_post"]["tags"], db_state["tags"])
        # expect the referenced plan in the response to be enhanced with data
        self.assertIn("plans", response["inserted_post"])
        self.assertEqual(len(response["inserted_post"]["plans"]), 1)
        self.assertIn("name", response["inserted_post"]["plans"][0])
        self.assertIn("partners", response["inserted_post"]["plans"][0])
        self.assertIn("steps", response["inserted_post"]["plans"][0])
        self.assertEqual(
            response["inserted_post"]["plans"][0]["_id"], str(plan_dict["_id"])
        )
        # the author has enhanced profile information to check for
        self.assertIn("author", response["inserted_post"])
        self.assertIn("username", response["inserted_post"]["author"])
        self.assertIn("first_name", response["inserted_post"]["author"])
        self.assertIn("last_name", response["inserted_post"]["author"])
        self.assertIn("profile_pic", response["inserted_post"]["author"])
        self.assertIn("institution", response["inserted_post"]["author"])
        db_author_profile = self.db.profiles.find_one(
            {"username": CURRENT_ADMIN.username}
        )
        self.assertEqual(
            response["inserted_post"]["author"]["username"],
            db_author_profile["username"],
        )
        self.assertEqual(
            response["inserted_post"]["author"]["first_name"],
            db_author_profile["first_name"],
        )
        self.assertEqual(
            response["inserted_post"]["author"]["last_name"],
            db_author_profile["last_name"],
        )
        self.assertEqual(
            response["inserted_post"]["author"]["profile_pic"],
            db_author_profile["profile_pic"],
        )
        self.assertEqual(
            response["inserted_post"]["author"]["institution"],
            next(
                (
                    inst["name"]
                    for inst in db_author_profile["institutions"]
                    if inst["_id"] == db_author_profile["chosen_institution_id"]
                ),
                None,
            ),
        )
        # for some odd reason, the ms in the timestamps jitter
        self.assertAlmostEqual(
            datetime.fromisoformat(response["inserted_post"]["creation_date"]),
            db_state["creation_date"],
            delta=timedelta(seconds=1),
        )
        self.assertEqual(response["inserted_post"]["space"], db_state["space"])
        self.assertEqual(response["inserted_post"]["pinned"], db_state["pinned"])
        self.assertEqual(
            response["inserted_post"]["wordpress_post_id"],
            db_state["wordpress_post_id"],
        )
        self.assertEqual(response["inserted_post"]["files"], db_state["files"])

        # expect content
        expected_keys = [
            "author",
            "creation_date",
            "text",
            "space",
            "pinned",
            "wordpress_post_id",
            "tags",
            "plans",
            "files",
        ]
        self.assertTrue(all(key in db_state for key in expected_keys))
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertEqual(db_state["text"], request_json["text"])
        self.assertIsNone(db_state["space"])
        self.assertFalse(db_state["pinned"])
        self.assertIsNone(db_state["wordpress_post_id"])
        self.assertEqual(db_state["tags"], json.loads(request_json["tags"]))
        self.assertEqual(db_state["plans"], json.loads(request_json["plans"]))
        self.assertEqual(db_state["files"], [])

        # check that the post counted towards the achievement "social"
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["create_posts"],
        )

    def test_post_create_post_space(self):
        """
        expect: successful post creation into space
        """

        request_json = {
            "text": "unittest_test_post",
            "tags": json.dumps(["tag1", "tag2"]),
            "plans": json.dumps([]),
            "space": str(self.test_space_id),
        }

        request = MultipartEncoder(fields=request_json)

        self.base_checks(
            "POST",
            "/posts",
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        db_state = list(self.db.posts.find(projection={"_id": False}))

        # expect exactly this one post in the db
        self.assertEqual(len(db_state), 1)

        # since we asserted len == 1, we can safely use the first (and only) element
        db_state = db_state[0]

        # expect content
        expected_keys = [
            "author",
            "creation_date",
            "text",
            "space",
            "pinned",
            "wordpress_post_id",
            "tags",
            "plans",
            "files",
        ]
        self.assertTrue(all(key in db_state for key in expected_keys))
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertEqual(db_state["text"], request_json["text"])
        self.assertEqual(db_state["space"], self.test_space_id)
        self.assertFalse(db_state["pinned"])
        self.assertIsNone(db_state["wordpress_post_id"])
        self.assertEqual(db_state["tags"], json.loads(request_json["tags"]))
        self.assertEqual(db_state["plans"], json.loads(request_json["plans"]))
        self.assertEqual(db_state["files"], [])

        # check that the post counted towards the achievement "social"
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["create_posts"],
        )

    def test_post_create_post_space_with_file(self):
        """
        expect: adding a file to the post also stores this file in the space's repository
        """

        # create file with IO Buffer
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        request_json = {
            "text": "unittest_test_post",
            "tags": json.dumps(["tag1", "tag2"]),
            "plans": json.dumps([]),
            "space": str(self.test_space_id),
            "file_amount": "1",
            "file0": (self.test_file_name, file, "text/plain"),
        }

        request = MultipartEncoder(fields=request_json)

        self.base_checks(
            "POST",
            "/posts",
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        # assert file is stored in db
        fs = gridfs.GridFS(self.db)
        file = fs.find_one({"filename": self.test_file_name})
        self.assertIsNotNone(file)

        db_state = list(self.db.posts.find(projection={"_id": False}))

        # expect exactly this one post in the db
        self.assertEqual(len(db_state), 1)

        # since we asserted len == 1, we can safely use the first (and only) element
        db_state = db_state[0]

        # expect content
        expected_keys = [
            "author",
            "creation_date",
            "text",
            "space",
            "pinned",
            "wordpress_post_id",
            "tags",
            "plans",
            "files",
        ]
        self.assertTrue(all(key in db_state for key in expected_keys))
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertEqual(db_state["text"], request_json["text"])
        self.assertEqual(db_state["space"], self.test_space_id)
        self.assertFalse(db_state["pinned"])
        self.assertIsNone(db_state["wordpress_post_id"])
        self.assertEqual(db_state["tags"], json.loads(request_json["tags"]))
        self.assertEqual(db_state["plans"], json.loads(request_json["plans"]))
        self.assertEqual(
            db_state["files"],
            [
                {
                    "file_id": file._id,
                    "file_name": self.test_file_name,
                    "file_type": "text/plain",
                    "author": CURRENT_ADMIN.username,
                }
            ],
        )

        # expect file to be in space as well
        space_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn("files", space_state)
        self.assertIn(
            {
                "author": CURRENT_ADMIN.username,
                "file_id": file._id,
                "file_name": self.test_file_name,
                "manually_uploaded": False,
            },
            space_state["files"],
        )

        # check that the post counted towards the achievement "social"
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["create_posts"],
        )

    def test_post_create_post_error_insufficient_permission(self):
        """
        expect: post creation should fail,
        because user has not enough permission to post into that space
        """

        # explicitely switch to user mode for this test, because test_user has
        # post permission set to False
        options.test_admin = False
        options.test_user = True

        request_json = {
            "text": "unittest_test_post",
            "tags": json.dumps(["tag1", "tag2"]),
            "space": str(self.test_space_id),
        }

        request = MultipartEncoder(fields=request_json)

        response = self.base_checks(
            "POST",
            "/posts",
            False,
            403,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_create_post_error_insufficient_permission_plan(self):
        """
        expect: post creation should fail,
        because user has no write access to the plan that is referenced
        """

        # create a plan to be referenced without write access
        plan_dict = VEPlan().to_dict()
        self.db.plans.insert_one(plan_dict)

        request_json = {
            "text": "unittest_test_post",
            "plans": json.dumps([str(plan_dict["_id"])]),
        }

        request = MultipartEncoder(fields=request_json)

        response = self.base_checks(
            "POST",
            "/posts",
            False,
            403,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        self.assertEqual(response["reason"], "insufficient_permission_plan")

    def test_post_create_post_error_space_doesnt_exist(self):
        """
        expect: fail message, because space doesnt exist in which the post should land
        """

        request_json = {
            "text": "unittest_test_post",
            "tags": json.dumps(["tag1", "tag2"]),
            "space": str(ObjectId()),
        }

        request = MultipartEncoder(fields=request_json)

        response = self.base_checks(
            "POST",
            "/posts",
            False,
            400,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_edit_post(self):
        """
        expect: updated text of post to be persisted into the db
        """

        # manually insert test post
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        # construct update request payload
        updated_text = "updated_post_text"
        request = MultipartEncoder(
            fields={
                "_id": str(oid),
                "text": updated_text,
            }
        )

        # do the update request
        self.base_checks(
            "POST",
            "/posts",
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        # assert that text has been updated
        updated_post = self.db.posts.find_one({"_id": oid})
        self.assertIn("text", updated_post)
        self.assertEqual(updated_post["text"], updated_text)

        # check that the update did not count towards the achievement "social"
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_edit_post_space(self):
        """
        expect: successfully edit post
        """

        # manually insert test post
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        # construct update request payload
        updated_text = "updated_post_text"
        request = MultipartEncoder(
            fields={
                "_id": str(oid),
                "text": updated_text,
            }
        )

        # do the update request
        self.base_checks(
            "POST",
            "/posts",
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        # assert that text has been updated
        updated_post = self.db.posts.find_one({"_id": oid})
        self.assertIn("text", updated_post)
        self.assertEqual(updated_post["text"], updated_text)

        # check that the update did not count towards the achievement "social"
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_edit_post_space_error_insufficient_permission(self):
        """
        expect: fail message because user is not permitted to post into
        the space, so editing is also forbidden
        """

        # switch to user mode, because he has no post permission in the space
        options.test_admin = False
        options.test_user = True

        # manually insert test post
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_USER.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        # construct update request payload
        updated_text = "updated_post_text"
        request = MultipartEncoder(
            fields={
                "_id": str(oid),
                "text": updated_text,
            }
        )

        # do the update request
        response = self.base_checks(
            "POST",
            "/posts",
            False,
            403,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_edit_post_error_post_id_doesnt_exist(self):
        """
        expect: fail message because the post that should be edited doesnt exist
        """

        # manually insert test post
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        # construct update request payload, using another _id this time
        updated_text = "updated_post_text"
        request = MultipartEncoder(
            fields={
                "_id": str(ObjectId()),
                "text": updated_text,
            }
        )

        # do the update request
        response = self.base_checks(
            "POST",
            "/posts",
            False,
            409,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        self.assertEqual(response["reason"], POST_DOESNT_EXIST_ERROR)

    def test_post_edit_post_error_user_not_author(self):
        """
        expect: fail message because the requesting user is not the author
        """

        # manually insert test post (note that author is other user)
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_USER.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        # construct update request payload
        updated_text = "updated_post_text"
        request = MultipartEncoder(
            fields={
                "_id": str(oid),
                "text": updated_text,
            }
        )

        # do the update request
        response = self.base_checks(
            "POST",
            "/posts",
            False,
            403,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        self.assertEqual(response["reason"], USER_NOT_AUTHOR_ERROR)

    def test_delete_post_author(self):
        """
        expect: successfully remove post from db, permission is granted because
        user is the author of the post
        """

        # explicitely switch to user mode for this test,
        # such that delete is possible because user is the author
        options.test_admin = False
        options.test_user = True

        # manually insert test post
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_USER.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        self.base_checks("DELETE", "/posts", True, 200, body={"post_id": str(oid)})

        self.assertEqual(list(self.db.posts.find()), [])

    def test_delete_post_global_admin(self):
        """
        expect: successfully remove post from db, permission is granted because
        user is global admin
        """

        # manually insert test post
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_USER.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        self.base_checks("DELETE", "/posts", True, 200, body={"post_id": str(oid)})

        self.assertEqual(list(self.db.posts.find()), [])

    def test_delete_post_space_author(self):
        """
        expect: successfully remove space post from db, permission is granted because
        user is the author of the post
        """

        # explicitely switch to user mode for this test,
        # such that delete is possible because user is the author
        options.test_admin = False
        options.test_user = True

        # manually insert test post
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_USER.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        self.base_checks("DELETE", "/posts", True, 200, body={"post_id": str(oid)})

        self.assertEqual(list(self.db.posts.find()), [])

    def test_delete_post_space_global_admin(self):
        """
        expect: successfully remove space post from db, permission is granted because
        user is global admin
        """

        # manually insert test post
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_USER.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        self.base_checks("DELETE", "/posts", True, 200, body={"post_id": str(oid)})

        self.assertEqual(list(self.db.posts.find()), [])

    def test_delete_post_space_space_admin(self):
        """
        expect: successfully remove space post from db, permission is granted because
        user is space admin
        """

        # explicitely switch to user mode for this test,
        # such that delete is possible because user space admin,
        # but neither global admin or author
        options.test_admin = False
        options.test_user = True

        # add test_user to space admins for this test
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {"$addToSet": {"admins": CURRENT_USER.username}},
        )

        # manually insert test post (into space this time)
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        self.base_checks("DELETE", "/posts", True, 200, body={"post_id": str(oid)})

        self.assertEqual(list(self.db.posts.find()), [])

    def test_delete_post_space_with_file(self):
        """
        expect: successfully delete post, "regular" file and file in space
        """

        # create file in uploads and space repo

        # create file with IO Buffer
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        fs = gridfs.GridFS(self.db)
        _id = fs.put(
            file,
            filename=self.test_file_name,
            content_type="text/plain",
            metadata={"uploader": "me"},
        )
        # manually insert test post and into space
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [
                    {
                        "file_id": _id,
                        "file_name": self.test_file_name,
                        "author": CURRENT_ADMIN.username,
                    }
                ],
            }
        )
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$push": {
                    "files": {
                        "author": CURRENT_ADMIN.username,
                        "file_id": _id,
                    }
                }
            },
        )

        self.base_checks("DELETE", "/posts", True, 200, body={"post_id": str(oid)})

        # expect post deleted
        self.assertEqual(list(self.db.posts.find()), [])

        # expect files to be removed from disk and from space
        self.assertIsNone(fs.find_one({"_id": _id}))
        self.assertEqual(
            self.db.spaces.find_one({"_id": self.test_space_id})["files"], []
        )

    def test_delete_post_error_post_doesnt_exist(self):
        """
        expect: fail message because the post_id doesnt exist
        """

        # use random non-existent post_id
        response = self.base_checks(
            "DELETE", "/posts", False, 409, body={"post_id": str(ObjectId())}
        )

        self.assertEqual(response["reason"], POST_DOESNT_EXIST_ERROR)

    def test_delete_post_error_insufficient_permission(self):
        """
        expect: delete is rejected because user is neither global admin,
        platform admin or author
        """

        # explicitely switch to user mode for this test,
        # such that delete is possible because user space admin,
        # but neither global admin or author
        options.test_admin = False
        options.test_user = True

        # manually insert test post (into space this time)
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        self.base_checks("DELETE", "/posts", False, 403, body={"post_id": str(oid)})

        self.assertNotEqual(list(self.db.posts.find()), [])

    def test_delete_post_space_error_insufficient_permission(self):
        """
        expect: delete is rejected because user is neither global admin,
        platform admin, space admin or author
        """

        # explicitely switch to user mode for this test,
        # such that delete is possible because user space admin,
        # but neither global admin or author
        options.test_admin = False
        options.test_user = True

        # manually insert test post (into space this time)
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

        self.base_checks("DELETE", "/posts", False, 403, body={"post_id": str(oid)})

        self.assertNotEqual(list(self.db.posts.find()), [])


class CommentHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        # setup basic environment of permissions
        self.base_permission_environment_setUp()

        self.post_oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": self.post_oid,
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "plans": [],
                "files": [],
            }
        )

    def tearDown(self) -> None:
        # cleanup test data
        self.base_permission_environments_tearDown()
        self.db.posts.delete_many({})
        super().tearDown()

    def assert_comments_empty(self):
        # assert that comments are empty after the successful delete
        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertEqual(db_state["comments"], [])

    def test_post_comment(self):
        """
        expect: successfully add comment to a post
        """

        request = {"post_id": str(self.post_oid), "text": "test_comment"}

        response = self.base_checks("POST", "/comment", True, 200, body=request)

        # expect the inserted comment to be in the response
        self.assertIn("inserted_comment", response)
        self.assertEqual(response["inserted_comment"]["text"], request["text"])

        # expect the author of the comment to be enhanced with profile information
        self.assertIn("author", response["inserted_comment"])
        self.assertIn("username", response["inserted_comment"]["author"])
        self.assertIn("first_name", response["inserted_comment"]["author"])
        self.assertIn("last_name", response["inserted_comment"]["author"])
        self.assertIn("profile_pic", response["inserted_comment"]["author"])
        self.assertIn("institution", response["inserted_comment"]["author"])
        db_author_profile = self.db.profiles.find_one(
            {"username": CURRENT_ADMIN.username}
        )
        self.assertEqual(
            response["inserted_comment"]["author"]["username"],
            db_author_profile["username"],
        )
        self.assertEqual(
            response["inserted_comment"]["author"]["first_name"],
            db_author_profile["first_name"],
        )
        self.assertEqual(
            response["inserted_comment"]["author"]["last_name"],
            db_author_profile["last_name"],
        )
        self.assertEqual(
            response["inserted_comment"]["author"]["profile_pic"],
            db_author_profile["profile_pic"],
        )
        self.assertEqual(
            response["inserted_comment"]["author"]["institution"],
            next(
                (
                    inst["name"]
                    for inst in db_author_profile["institutions"]
                    if inst["_id"] == db_author_profile["chosen_institution_id"]
                ),
                None,
            ),
        )

        db_state = self.db.posts.find_one({"_id": self.post_oid})

        # assert exactly one comment to the post that matches the text in the request
        self.assertIn("comments", db_state)
        self.assertEqual(len(db_state["comments"]), 1)
        self.assertEqual(db_state["comments"][0]["text"], request["text"])

        # check that the comment counted towards the achievement "social"
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["create_comments"],
        )

    def test_post_comment_error_missing_post_id(self):
        """
        expect: fail message because post_id is not in the request
        """

        request = {"text": "test_comment"}

        response = self.base_checks("POST", "/comment", False, 400, body=request)

        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "post_id"
        )

    def test_post_comment_error_post_doesnt_exist(self):
        """
        expect: fail message because post_id doesnt exist
        """

        request = {"post_id": str(ObjectId()), "text": "test_comment"}

        response = self.base_checks("POST", "/comment", False, 409, body=request)

        self.assertEqual(response["reason"], POST_DOESNT_EXIST_ERROR)

        # check that the comment did not count towards the achievement "social",
        # because the post does not exist at all
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_comment_space_error_insufficient_permission(self):
        """
        expect: fail message because user has no permission to comment
        """

        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        # revoke comment permission for this test
        self.db.space_acl.update_one(
            {"username": CURRENT_USER.username, "space": self.test_space_id},
            {"$set": {"comment": False}},
        )

        request = {"post_id": str(self.post_oid), "text": "test_comment"}

        response = self.base_checks("POST", "/comment", False, 403, body=request)

        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_comment_author(self):
        """
        expect: successful removal of comment, permission is granted because user
        is the author of the comment
        """

        # explicitely switch to user mode for this test
        # such that user is not an admin
        options.test_admin = False
        options.test_user = True

        comment_id = ObjectId()

        # manually add the comment
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {
                "$set": {"space": None},
                "$push": {
                    "comments": {
                        "_id": comment_id,
                        "author": CURRENT_USER.username,
                        "creation_date": datetime.now(),
                        "text": "test_comment",
                        "pinned": False,
                    }
                },
            },
        )

        request = {"comment_id": str(comment_id)}

        self.base_checks("DELETE", "/comment", True, 200, body=request)

        self.assert_comments_empty()

    def test_delete_comment_global_admin(self):
        """
        expect: successful removal of comment, permission is granted because user
        is global admin
        """

        comment_id = ObjectId()

        # manually add the comment
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {
                "$set": {"space": None},
                "$push": {
                    "comments": {
                        "_id": comment_id,
                        "author": CURRENT_USER.username,
                        "creation_date": datetime.now(),
                        "text": "test_comment",
                        "pinned": False,
                    }
                },
            },
        )

        request = {"comment_id": str(comment_id)}

        self.base_checks("DELETE", "/comment", True, 200, body=request)

        self.assert_comments_empty()

    def test_delete_comment_space_author(self):
        """
        expect: successful removal of comment, permission is granted because user
        is the author of the comment
        """

        # explicitely switch to user mode for this test
        # such that user is not an admin
        options.test_admin = False
        options.test_user = True

        comment_id = ObjectId()

        # manually add the comment
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {
                "$push": {
                    "comments": {
                        "_id": comment_id,
                        "author": CURRENT_USER.username,
                        "creation_date": datetime.now(),
                        "text": "test_comment",
                        "pinned": False,
                    }
                },
            },
        )

        request = {"comment_id": str(comment_id)}

        self.base_checks("DELETE", "/comment", True, 200, body=request)

        self.assert_comments_empty()

    def test_delete_comment_space_global_admin(self):
        """
        expect: successful removal of comment, permission is granted because user
        is global admin
        """

        comment_id = ObjectId()

        # manually add the comment
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {
                "$push": {
                    "comments": {
                        "_id": comment_id,
                        "author": CURRENT_USER.username,
                        "creation_date": datetime.now(),
                        "text": "test_comment",
                        "pinned": False,
                    }
                },
            },
        )

        request = {"comment_id": str(comment_id)}

        self.base_checks("DELETE", "/comment", True, 200, body=request)

        self.assert_comments_empty()

    def test_delete_comment_space_space_admin(self):
        """
        expect: successful removal of comment, permission is granted because user
        is space admin
        """

        # explicitely switch to user mode for this test
        # such that user is not a global admin
        options.test_admin = False
        options.test_user = True

        # grant the user space admin permissions
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {"$addToSet": {"admins": CURRENT_USER.username}},
        )

        comment_id = ObjectId()

        # manually add the comment
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {
                "$push": {
                    "comments": {
                        "_id": comment_id,
                        "author": CURRENT_ADMIN.username,
                        "creation_date": datetime.now(),
                        "text": "test_comment",
                        "pinned": False,
                    }
                },
            },
        )

        request = {"comment_id": str(comment_id)}

        self.base_checks("DELETE", "/comment", True, 200, body=request)

        self.assert_comments_empty()

    def test_delete_comment_error_insufficient_permission(self):
        """
        expect: fail message because user is not allowed to remove the comment
        since he is neither the author or a global admin
        """

        # explicitely switch to user mode for this test
        # such that user is not an admin
        options.test_admin = False
        options.test_user = True

        comment_id = ObjectId()

        # manually add the comment
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {
                "$set": {"space": None},
                "$push": {
                    "comments": {
                        "_id": comment_id,
                        "author": CURRENT_ADMIN.username,
                        "creation_date": datetime.now(),
                        "text": "test_comment",
                        "pinned": False,
                    }
                },
            },
        )

        request = {"comment_id": str(comment_id)}

        response = self.base_checks("DELETE", "/comment", False, 403, body=request)

        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_comment_space_error_insufficient_permission(self):
        """
        expect: fail message because user is not allowed to remove the comment
        since he is neither the author, a global admin or a space admin
        """

        # explicitely switch to user mode for this test
        # such that user is not an admin
        options.test_admin = False
        options.test_user = True

        comment_id = ObjectId()

        # manually add the comment
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {
                "$push": {
                    "comments": {
                        "_id": comment_id,
                        "author": CURRENT_ADMIN.username,
                        "creation_date": datetime.now(),
                        "text": "test_comment",
                        "pinned": False,
                    }
                },
            },
        )

        request = {"comment_id": str(comment_id)}

        response = self.base_checks("DELETE", "/comment", False, 403, body=request)

        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)


class LikePostHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        # setup basic environment of permissions
        self.base_permission_environment_setUp()

        self.post_oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": self.post_oid,
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "files": [],
            }
        )

    def tearDown(self) -> None:
        # cleanup test data
        self.base_permission_environments_tearDown()
        self.db.posts.delete_many({})
        super().tearDown()

    def test_post_like(self):
        """
        expect: successfully like the post
        """

        request = {"post_id": str(self.post_oid)}

        self.base_checks("POST", "/like", True, 200, body=request)

        # assert that the like is persisted in the db
        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertIn("likers", db_state)
        self.assertIn(CURRENT_ADMIN.username, db_state["likers"])

        # check that the like counted towards the achievement "social"
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["give_likes"],
        )
        prev_achievement_progress_counter = profile["achievements"]["social"]["progress"]

        # switch to user mode to test the achievement "social"
        options.test_admin = False
        options.test_user = True

        request = {"post_id": str(self.post_oid)}

        self.base_checks("POST", "/like", True, 200, body=request)

        # check that the like of another person counted towards the achievement "social"
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["posts_liked"],
        )

    def test_post_like_error_no_post_id(self):
        """
        expect: fail message because request misses post_id
        """

        response = self.base_checks("POST", "/like", False, 400, body={})
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "post_id"
        )

    def test_post_like_error_post_doesnt_exist(self):
        """
        expect: fail message because post doesnt exist
        """

        request = {"post_id": str(ObjectId())}

        response = self.base_checks("POST", "/like", False, 409, body=request)
        self.assertEqual(response["reason"], POST_DOESNT_EXIST_ERROR)

        # check that the like did not count towards the achievement "social",
        # because the post does not exist at all
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

        # check that the like did not count towards the achievement "social",
        # because the post does not exist at all
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_like_error_already_liker(self):
        """
        expect: fail message because person already liked post
        """

        # set user as liked
        self.db.posts.update_one(
            {"_id": self.post_oid}, {"$addToSet": {"likers": CURRENT_ADMIN.username}}
        )

        request = {"post_id": str(self.post_oid)}

        # cannot use base_checks because 304 doesnt not allow to send content
        response = self.fetch(
            "/like",
            method="POST",
            body=json.dumps(request),
            allow_nonstandard_methods=True,
        )
        self.assertEqual(response.code, 304)

        # check that the like did not count towards the achievement "social",
        # because the post does not exist at all
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

        # check that the like did not count towards the achievement "social",
        # because the post does not exist at all
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_delete_like(self):
        """
        like gets deleted from db
        """

        # manually insert like
        self.db.posts.update_one(
            {"_id": self.post_oid}, {"$addToSet": {"likers": CURRENT_ADMIN.username}}
        )

        request = {"post_id": str(self.post_oid)}

        self.base_checks("DELETE", "/like", True, 200, body=request)

        # assert likers to be empty
        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertIn("likers", db_state)
        self.assertEqual(db_state["likers"], [])

    def test_delete_like_error_no_post_id(self):
        """
        expect: fail message because request misses post_id
        """

        response = self.base_checks("DELETE", "/like", False, 400, body={})
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "post_id"
        )

    def test_delete_like_error_post_doesnt_exist(self):
        """
        expect: fail message because post doesnt exist
        """

        request = {"post_id": str(ObjectId())}

        response = self.base_checks("DELETE", "/like", False, 409, body=request)
        self.assertEqual(response["reason"], POST_DOESNT_EXIST_ERROR)

    def test_delete_like_error_not_liker(self):
        """
        expect: fail message because person already liked post
        """

        request = {"post_id": str(self.post_oid)}

        # cannot use base_checks because 304 doesnt not allow to send content
        response = self.fetch(
            "/like",
            method="DELETE",
            body=json.dumps(request),
            allow_nonstandard_methods=True,
        )
        self.assertEqual(response.code, 304)


class RepostHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        # setup basic environment of permissions
        self.base_permission_environment_setUp()

        self.post_oid = ObjectId()
        self.post_json = {
            "_id": self.post_oid,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime.now(),
            "text": "initial_post_text",
            "space": self.test_space_id,
            "pinned": False,
            "wordpress_post_id": None,
            "tags": [],
            "files": [],
        }
        self.db.posts.insert_one(self.post_json)

    def tearDown(self) -> None:
        # cleanup test data
        self.base_permission_environments_tearDown()
        self.db.posts.delete_many({})
        super().tearDown()

    def test_post_create_repost(self):
        """
        expect: successfully create repost
        """

        request = {"post_id": str(self.post_oid), "text": "test_repost", "space": None}

        response = self.base_checks("POST", "/repost", True, 200, body=request)

        # expect the repost to be in the response
        self.assertIn("inserted_repost", response)
        self.assertEqual(response["inserted_repost"]["repostText"], request["text"])
        self.assertEqual(response["inserted_repost"]["isRepost"], True)
        self.assertIn("originalCreationDate", response["inserted_repost"])
        self.assertIn("creation_date", response["inserted_repost"])
        self.assertEqual(response["inserted_repost"]["space"], None)

        # expect the author and repostAuther to be enhanced with profile information
        self.assertIn("author", response["inserted_repost"])
        self.assertIn("username", response["inserted_repost"]["author"])
        self.assertIn("first_name", response["inserted_repost"]["author"])
        self.assertIn("last_name", response["inserted_repost"]["author"])
        self.assertIn("profile_pic", response["inserted_repost"]["author"])
        self.assertIn("institution", response["inserted_repost"]["author"])
        db_author_profile = self.db.profiles.find_one(
            {"username": CURRENT_ADMIN.username}
        )
        self.assertEqual(
            response["inserted_repost"]["author"]["username"],
            db_author_profile["username"],
        )
        self.assertEqual(
            response["inserted_repost"]["author"]["first_name"],
            db_author_profile["first_name"],
        )
        self.assertEqual(
            response["inserted_repost"]["author"]["last_name"],
            db_author_profile["last_name"],
        )
        self.assertEqual(
            response["inserted_repost"]["author"]["profile_pic"],
            db_author_profile["profile_pic"],
        )
        self.assertEqual(
            response["inserted_repost"]["author"]["institution"],
            next(
                (
                    inst["name"]
                    for inst in db_author_profile["institutions"]
                    if inst["_id"] == db_author_profile["chosen_institution_id"]
                ),
                None,
            ),
        )
        self.assertIn("repostAuthor", response["inserted_repost"])
        self.assertIn("username", response["inserted_repost"]["repostAuthor"])
        self.assertIn("first_name", response["inserted_repost"]["repostAuthor"])
        self.assertIn("last_name", response["inserted_repost"]["repostAuthor"])
        self.assertIn("profile_pic", response["inserted_repost"]["repostAuthor"])
        self.assertIn("institution", response["inserted_repost"]["repostAuthor"])
        self.assertEqual(
            response["inserted_repost"]["repostAuthor"]["username"],
            db_author_profile["username"],
        )
        self.assertEqual(
            response["inserted_repost"]["repostAuthor"]["first_name"],
            db_author_profile["first_name"],
        )
        self.assertEqual(
            response["inserted_repost"]["repostAuthor"]["last_name"],
            db_author_profile["last_name"],
        )
        self.assertEqual(
            response["inserted_repost"]["repostAuthor"]["profile_pic"],
            db_author_profile["profile_pic"],
        )
        self.assertEqual(
            response["inserted_repost"]["repostAuthor"]["institution"],
            next(
                (
                    inst["name"]
                    for inst in db_author_profile["institutions"]
                    if inst["_id"] == db_author_profile["chosen_institution_id"]
                ),
                None,
            ),
        )

        db_state = self.db.posts.find_one(
            {"_id": ObjectId(response["inserted_repost"]["_id"])}
        )
        self.assertNotEqual(db_state, None)

    def test_post_create_repost_space(self):
        """
        expect: successfully create repost
        """

        request = {
            "post_id": str(self.post_oid),
            "text": "test_repost",
            "space": str(self.test_space_id),
        }

        self.base_checks("POST", "/repost", True, 200, body=request)

        db_state = self.db.posts.find_one({"repostText": request["text"]})
        self.assertNotEqual(db_state, None)

    def test_post_create_repost_error_no_text(self):
        """
        expect: fail message because http body missing "text" key
        """

        request = {
            "post_id": str(self.post_oid),
            "space": None,
        }

        response = self.base_checks("POST", "/repost", False, 400, body=request)

        self.assertEqual(response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "text")

    def test_post_create_repost_error_no_post_id(self):
        """
        expect: fail messgea because http body misses "post_id" key
        """

        request = {
            "text": "test_repost",
            "space": None,
        }

        response = self.base_checks("POST", "/repost", False, 400, body=request)

        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "post_id"
        )

    def test_post_create_repost_error_no_space(self):
        """
        expect: fail message because http body misses "space" key
        """

        request = {
            "post_id": str(self.post_oid),
            "text": "test_repost",
        }

        response = self.base_checks("POST", "/repost", False, 400, body=request)

        self.assertEqual(response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "space")

    def test_post_create_repost_error_post_doesnt_exist(self):
        """
        expect: fail message because the original post doesnt exist
        """

        request = {
            "post_id": str(ObjectId()),
            "text": "test_repost",
            "space": None,
        }

        response = self.base_checks("POST", "/repost", False, 409, body=request)

        self.assertEqual(response["reason"], POST_DOESNT_EXIST_ERROR)

    def test_post_create_repost_space_error_insufficient_permission(self):
        """
        expect: fail message because user has no permission to post into the space
        """

        # switch to user mode because user has no post permission
        options.test_admin = False
        options.test_user = True

        request = {
            "post_id": str(self.post_oid),
            "text": "test_repost",
            "space": str(self.test_space_id),
        }

        response = self.base_checks("POST", "/repost", False, 403, body=request)

        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_create_repost_space_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        request = {
            "post_id": str(self.post_oid),
            "text": "test_repost",
            "space": str(ObjectId()),
        }

        response = self.base_checks("POST", "/repost", False, 409, body=request)

        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_edit_repost(self):
        """
        expect: successfully edit text of repost
        """

        # manually insert repost
        post = self.post_json
        post["_id"] = ObjectId()
        post["space"] = None
        post["isRepost"] = True
        post["repostAuthor"] = CURRENT_ADMIN.username
        post["repostText"] = "test_repost"
        post["originalCreationDate"] = post["creation_date"]
        post["creation_date"] = datetime.now()
        self.db.posts.insert_one(post)

        request = {"_id": str(post["_id"]), "text": "updated_repost_text"}

        self.base_checks("POST", "/repost", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": post["_id"]})
        self.assertNotEqual(db_state, None)
        self.assertEqual(db_state["repostText"], request["text"])

    def test_post_edit_repost_post_doesnt_exist(self):
        """
        expect: fail message because repost doesnt exist and therefore cant be edited
        """

        # manually insert repost
        post = self.post_json
        post["_id"] = ObjectId()
        post["space"] = None
        post["isRepost"] = True
        post["repostAuthor"] = CURRENT_ADMIN.username
        post["repostText"] = "test_repost"
        post["originalCreationDate"] = post["creation_date"]
        post["creation_date"] = datetime.now()
        self.db.posts.insert_one(post)

        # use other random oid in the request that doesnt exist
        request = {"_id": str(ObjectId()), "text": "updated_repost_text"}

        response = self.base_checks("POST", "/repost", False, 409, body=request)
        self.assertEqual(response["reason"], POST_DOESNT_EXIST_ERROR)

    def test_post_edit_repost_error_post_not_repost(self):
        """
        expect: fail message because the post that should be edited is no repost
        but actually a regular post
        """

        # manually insert repost
        post = self.post_json
        post["_id"] = ObjectId()
        post["space"] = None
        post["isRepost"] = True
        post["repostAuthor"] = CURRENT_ADMIN.username
        post["repostText"] = "test_repost"
        post["originalCreationDate"] = post["creation_date"]
        post["creation_date"] = datetime.now()
        self.db.posts.insert_one(post)

        # use oid of original post instead of repost
        request = {"_id": str(self.post_oid), "text": "updated_repost_text"}

        response = self.base_checks("POST", "/repost", False, 409, body=request)
        self.assertEqual(response["reason"], "post_is_no_repost")

    def test_post_edit_repost_error_user_not_author(self):
        """
        expect: fail message because user is not the author of the repost
        """

        # manually insert repost
        post = self.post_json
        post["_id"] = ObjectId()
        post["space"] = None
        post["isRepost"] = True
        post["repostAuthor"] = CURRENT_USER.username
        post["repostText"] = "test_repost"
        post["originalCreationDate"] = post["creation_date"]
        post["creation_date"] = datetime.now()
        self.db.posts.insert_one(post)

        request = {"_id": str(post["_id"]), "text": "updated_repost_text"}

        response = self.base_checks("POST", "/repost", False, 403, body=request)
        self.assertEqual(response["reason"], USER_NOT_AUTHOR_ERROR)

    def test_post_edit_repost_space(self):
        """
        expect: successfully edit the repost in the space
        """

        # manually insert repost
        post = self.post_json
        post["_id"] = ObjectId()
        post["space"] = self.test_space_id
        post["isRepost"] = True
        post["repostAuthor"] = CURRENT_ADMIN.username
        post["repostText"] = "test_repost"
        post["originalCreationDate"] = post["creation_date"]
        post["creation_date"] = datetime.now()
        self.db.posts.insert_one(post)

        request = {"_id": str(post["_id"]), "text": "updated_repost_text"}

        self.base_checks("POST", "/repost", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": post["_id"]})
        self.assertNotEqual(db_state, None)
        self.assertEqual(db_state["repostText"], request["text"])

    def test_post_edit_repost_space_error_insufficient_permission(self):
        """
        expect: fail message because user has no post permission in the space
        and therefore is also not allowed to edit his post
        """

        # switch to user mode because user has no post permission in space
        options.test_admin = False
        options.test_user = True

        # manually insert repost
        post = self.post_json
        post["_id"] = ObjectId()
        post["space"] = self.test_space_id
        post["isRepost"] = True
        post["repostAuthor"] = CURRENT_USER.username
        post["repostText"] = "test_repost"
        post["originalCreationDate"] = post["creation_date"]
        post["creation_date"] = datetime.now()
        self.db.posts.insert_one(post)

        request = {"_id": str(post["_id"]), "text": "updated_repost_text"}

        response = self.base_checks("POST", "/repost", False, 403, body=request)
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)


class PinHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        # setup basic environment of permissions
        self.base_permission_environment_setUp()

        self.post_oid = ObjectId()
        self.comment_oid = ObjectId()
        self.post_json = {
            "_id": self.post_oid,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime.now(),
            "text": "initial_post_text",
            "space": self.test_space_id,
            "pinned": False,
            "wordpress_post_id": None,
            "tags": [],
            "files": [],
            "comments": [
                {
                    "_id": self.comment_oid,
                    "author": CURRENT_USER.username,
                    "creation_date": datetime.now(),
                    "text": "test_comment",
                    "pinned": False,
                }
            ],
        }
        self.db.posts.insert_one(self.post_json)

    def tearDown(self) -> None:
        # cleanup test data
        self.base_permission_environments_tearDown()
        self.db.posts.delete_many({})
        super().tearDown()

    def _set_post_pin(self):
        self.db.posts.update_one({"_id": self.post_oid}, {"$set": {"pinned": True}})

    def _set_comment_pin(self):
        self.db.posts.update_one(
            {"comments._id": self.comment_oid}, {"$set": {"comments.0.pinned": True}}
        )

    def test_post_pin_error_no_id(self):
        """
        expect: fail message because http body misses id key
        """

        request = {"pin_type": "post"}

        response = self.base_checks("POST", "/pin", False, 400, body=request)
        self.assertEqual(response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "id")

    def test_post_pin_error_no_pin_type(self):
        """
        expect: fail message because http body misses pin_type key
        """

        request = {"id": str(self.post_oid)}

        response = self.base_checks("POST", "/pin", False, 400, body=request)
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "pin_type"
        )

    def test_post_pin_error_invalid_pin_type(self):
        """
        expect: fail message because pin type is neither "post" or "comment"
        """

        request = {"id": str(self.post_oid), "pin_type": "something_else"}

        response = self.base_checks("POST", "/pin", False, 400, body=request)
        self.assertEqual(response["reason"], INVALID_PIN_TYPE_ERROR)

    def test_post_pin_post_global_admin(self):
        """
        expect: successful pin, permission is granted because user is global admin
        """
        # set auther as the other user, such that we trigger permission as global admin
        self.db.posts.update_one(
            {"_id": self.post_oid}, {"$set": {"author": CURRENT_USER.username}}
        )

        request = {"id": str(self.post_oid), "pin_type": "post"}

        self.base_checks("POST", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertTrue(db_state["pinned"])

    def test_post_pin_post_space_admin(self):
        """
        expect: successful pin, permission is granted because user is space admin
        """

        # switch to user mode to avoid being global admin instead
        options.test_admin = False
        options.test_user = True

        # set user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        request = {"id": str(self.post_oid), "pin_type": "post"}

        self.base_checks("POST", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertTrue(db_state["pinned"])

    def test_post_pin_post_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """
        # set space to a non-existing one
        self.db.posts.update_one(
            {"_id": self.post_oid}, {"$set": {"space": ObjectId()}}
        )

        request = {"id": str(self.post_oid), "pin_type": "post"}

        response = self.base_checks("POST", "/pin", False, 409, body=request)
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_pin_post_error_post_not_in_space(self):
        """
        expect: fail message because post is not in space (only posts in spaces)
        can be pinned
        """

        self.db.posts.update_one({"_id": self.post_oid}, {"$set": {"space": None}})

        request = {"id": str(self.post_oid), "pin_type": "post"}

        response = self.base_checks("POST", "/pin", False, 409, body=request)
        self.assertEqual(response["reason"], "post_not_in_space")

    def test_post_pin_post_error_insufficient_permission(self):
        """
        expect: fail message because user is neither space nor global admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        request = {"id": str(self.post_oid), "pin_type": "post"}

        response = self.base_checks("POST", "/pin", False, 403, body=request)
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_pin_comment_author(self):
        """
        expect: successfully pin comment, permission is granted
        because user is the author of the post
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as author
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {"$set": {"author": CURRENT_USER.username, "space": None}},
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}

        self.base_checks("POST", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertTrue(db_state["comments"][0]["pinned"])

    def test_post_pin_comment_global_admin(self):
        """
        expect: successful pin, permission is granted because user is global admin
        """

        # set user as author, such that we dont trigger author permission first
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {"$set": {"author": CURRENT_USER.username, "space": None}},
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}

        self.base_checks("POST", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertTrue(db_state["comments"][0]["pinned"])

    def test_post_pin_comment_space_author(self):
        """
        expect: successful pin, permission is granted because user is space admin
        """

        # switch to user mode to avoid being global admin instead
        options.test_admin = False
        options.test_user = True

        # set user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}

        self.base_checks("POST", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertTrue(db_state["comments"][0]["pinned"])

    def test_post_pin_comment_space_global_admin(self):
        """
        expect: succcessful pin, permission is granted because user is global admin
        """

        # set user as author, such that we dont trigger author permission first
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {"$set": {"author": CURRENT_USER.username}},
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}

        self.base_checks("POST", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertTrue(db_state["comments"][0]["pinned"])

    def test_post_pin_comment_space_space_admin(self):
        """
        expect: successful pin, permission is granted because user is space admin
        """

        # switch to user mode to avoid being global admin instead
        options.test_admin = False
        options.test_user = True

        # set user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}

        self.base_checks("POST", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertTrue(db_state["comments"][0]["pinned"])

    def test_post_pin_comment_space_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """
        # set space to a non-existing one
        self.db.posts.update_one(
            {"_id": self.post_oid}, {"$set": {"space": ObjectId()}}
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}

        response = self.base_checks("POST", "/pin", False, 409, body=request)
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_pin_comment_space_error_post_doesnt_exist(self):
        """
        expect: fail message because comment id has no associated post to it
        """

        request = {"id": str(ObjectId()), "pin_type": "comment"}

        response = self.base_checks("POST", "/pin", False, 409, body=request)
        self.assertEqual(response["reason"], POST_DOESNT_EXIST_ERROR)

    def test_post_pin_comment_space_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin, space admin
        or post author
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        request = {"id": str(self.comment_oid), "pin_type": "comment"}

        response = self.base_checks("POST", "/pin", False, 403, body=request)
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_pin_error_no_id(self):
        """
        expect: fail message because http body misses id key
        """

        request = {"pin_type": "post"}

        response = self.base_checks("DELETE", "/pin", False, 400, body=request)
        self.assertEqual(response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "id")

    def test_delete_pin_error_no_pin_type(self):
        """
        expect: fail message because http body misses pin_type key
        """

        request = {"id": str(self.post_oid)}

        response = self.base_checks("DELETE", "/pin", False, 400, body=request)
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "pin_type"
        )

    def test_delete_pin_error_invalid_pin_type(self):
        """
        expect: fail message because pin type is neither "post" or "comment"
        """

        request = {"id": str(self.post_oid), "pin_type": "something_else"}

        response = self.base_checks("DELETE", "/pin", False, 400, body=request)
        self.assertEqual(response["reason"], INVALID_PIN_TYPE_ERROR)

    def test_delete_pin_post_global_admin(self):
        """
        expect: successfully unpin the post, permission is granted because
        user is global admin
        """

        # pull user out of space admins to trigger global admin privilege
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        # manually set pin
        self._set_post_pin()

        request = {"id": str(self.post_oid), "pin_type": "post"}
        self.base_checks("DELETE", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertFalse(db_state["pinned"])

    def test_delete_pin_post_space_admin(self):
        """
        expect: successfully unpin the post, permission is granted because
        user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        # manually set pin
        self._set_post_pin()

        request = {"id": str(self.post_oid), "pin_type": "post"}
        self.base_checks("DELETE", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertFalse(db_state["pinned"])

    def test_delete_pin_post_error_post_doesnt_exist(self):
        """
        expect: fail message because post doesnt exist
        """

        # manually pin the post
        self._set_post_pin()

        request = {"id": str(ObjectId()), "pin_type": "post"}

        response = self.base_checks("DELETE", "/pin", False, 409, body=request)
        self.assertEqual(response["reason"], POST_DOESNT_EXIST_ERROR)

    def test_delete_pin_post_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        # manually pin the post
        self._set_post_pin()

        # set space as non existing
        self.db.posts.update_one(
            {"_id": self.post_oid}, {"$set": {"space": ObjectId()}}
        )

        request = {"id": str(self.post_oid), "pin_type": "post"}

        response = self.base_checks("DELETE", "/pin", False, 409, body=request)
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_delete_pin_post_error_post_not_in_space(self):
        """
        expect: fail message because post is not in a space
        (but only posts in spaces can be pinned)
        """

        # manually pin the post
        self._set_post_pin()

        # unset space
        self.db.posts.update_one({"_id": self.post_oid}, {"$set": {"space": None}})

        request = {"id": str(self.post_oid), "pin_type": "post"}

        response = self.base_checks("DELETE", "/pin", False, 409, body=request)
        self.assertEqual(response["reason"], "post_not_in_space")

    def test_delete_pin_post_error_insufficient_permission(self):
        """
        expect: fail message because user is neither space nor global admin
        """

        # manually pin the post
        self._set_post_pin()

        # switch to user mode, such that no admin privileges trigger
        options.test_admin = False
        options.test_user = True

        request = {"id": str(self.post_oid), "pin_type": "post"}

        response = self.base_checks("DELETE", "/pin", False, 403, body=request)
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_pin_comment_author(self):
        """
        expect: successful unpin of comment, permission is granted because user
        is the author of the post
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # manually pin the comment
        self._set_comment_pin()

        # manually set user as author
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {"$set": {"author": CURRENT_USER.username, "space": None}},
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}
        self.base_checks("DELETE", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"comments._id": self.comment_oid})
        self.assertFalse(db_state["comments"][0]["pinned"])

    def test_delete_pin_comment_global_admin(self):
        """
        expect: successfully unpin comment, permission is granted because user
        is global admin
        """

        # manually pin the comment
        self._set_comment_pin()

        # manually set other user as author so that admin privileges trigger
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {"$set": {"author": CURRENT_USER.username, "space": None}},
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}
        self.base_checks("DELETE", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"comments._id": self.comment_oid})
        self.assertFalse(db_state["comments"][0]["pinned"])

    def test_delete_pin_comment_error_post_doesnt_exist(self):
        """
        expect: fail message because the corresponding post of the comment
        doesnt exist
        """

        # manually pin the comment
        self._set_comment_pin()

        # remove space from post to check correct case
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {"$set": {"space": None}},
        )

        # use non existing object_id
        request = {"id": str(ObjectId()), "pin_type": "comment"}
        response = self.base_checks("DELETE", "/pin", False, 409, body=request)
        self.assertEqual(response["reason"], POST_DOESNT_EXIST_ERROR)

    def test_delete_pin_comment_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor post author
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # manually pin the comment
        self._set_comment_pin()

        # remove space from post to check correct case
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {"$set": {"space": None}},
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}
        response = self.base_checks("DELETE", "/pin", False, 403, body=request)
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_pin_comment_space_author(self):
        """
        expect: successful unpin of comment in space, permission is granted
        because user is the author of the post
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # manually pin the comment
        self._set_comment_pin()

        # manually set user as author
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {"$set": {"author": CURRENT_USER.username}},
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}
        self.base_checks("DELETE", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"comments._id": self.comment_oid})
        self.assertFalse(db_state["comments"][0]["pinned"])

    def test_delete_pin_comment_space_global_admin(self):
        """
        expect: successfully unpin comment, permission is granted because user
        is global admin
        """

        # manually pin the comment
        self._set_comment_pin()

        # pull user out of space admins to trigger global admin privilege
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        # manually set other user as author so that admin privileges trigger
        self.db.posts.update_one(
            {"_id": self.post_oid},
            {"$set": {"author": CURRENT_USER.username}},
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}
        self.base_checks("DELETE", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"comments._id": self.comment_oid})
        self.assertFalse(db_state["comments"][0]["pinned"])

    def test_delete_pin_comment_space_space_admin(self):
        """
        expect: successfully unpin comment, permission is granted
        because user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # manually pin the comment
        self._set_comment_pin()

        # set user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}
        self.base_checks("DELETE", "/pin", True, 200, body=request)

        db_state = self.db.posts.find_one({"comments._id": self.comment_oid})
        self.assertFalse(db_state["comments"][0]["pinned"])

    def test_delete_pin_comment_space_error_space_doesnt_exist(self):
        """
        fail message because space doesnt exist
        """

        # manually pin the comment
        self._set_comment_pin()

        # set space to non-existing one
        self.db.posts.update_one(
            {"_id": self.post_oid}, {"$set": {"space": ObjectId()}}
        )

        request = {"id": str(self.comment_oid), "pin_type": "comment"}
        response = self.base_checks("DELETE", "/pin", False, 409, body=request)
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_delete_pin_comment_space_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin, space admin
        nor post author
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # manually pin the comment
        self._set_comment_pin()

        request = {"id": str(self.comment_oid), "pin_type": "comment"}
        response = self.base_checks("DELETE", "/pin", False, 403, body=request)
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)


class SearchHandlerTest(BaseApiTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls.profile = {
            "username": CURRENT_ADMIN.username,
            "role": "admin",
            "follows": [],
            "bio": "test",
            "institutions": [
                {
                    "_id": ObjectId(),
                    "name": "test",
                    "department": "test",
                    "school_type": "test",
                    "country": "test",
                }
            ],
            "chosen_institution_id": "",
            "projects": "test",
            "profile_pic": "test",
            "first_name": "test",
            "last_name": "test",
            "gender": "test",
            "address": "test",
            "birthday": "test",
            "experience": "test",
            "education": "test",
        }
        # replicate to ES
        ElasticsearchConnector().on_insert(str(ObjectId()), cls.profile, "profiles")

        # there seems to be a problem over at ES, because when the insert request
        # finishes, the data is not yet available for search, so tests would fail.
        # there is no real solution i can think of other than just wait a little bit
        # for ES to finish analyzing and indexing
        import time

        time.sleep(2)

    def setUp(self) -> None:
        super().setUp()

        # build search indices
        self.db.posts.create_index(
            [("text", pymongo.TEXT), ("tags", pymongo.TEXT), ("files", pymongo.TEXT)],
            name="posts",
        )

        # setup basic environment of permissions
        self.base_permission_environment_setUp()

        self.post_oid = ObjectId()
        self.comment_oid = ObjectId()
        self.post_json = {
            "_id": self.post_oid,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime.now(),
            "text": "test",
            "space": self.test_space_id,
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [
                {
                    "_id": self.comment_oid,
                    "author": CURRENT_USER.username,
                    "creation_date": datetime.now(),
                    "text": "test_comment",
                    "pinned": False,
                }
            ],
        }
        self.db.posts.insert_one(self.post_json)

        self.search_query = "test"

    def tearDown(self) -> None:
        # cleanup test data
        self.base_permission_environments_tearDown()
        self.db.posts.delete_many({})
        self.db.profiles.delete_many({})
        try:
            self.db.posts.drop_indexes()
            self.db.profiles.drop_indexes()
        except pymongo.errors.OperationFailure:
            pass
        super().tearDown()

    @classmethod
    def tearDownClass(cls) -> None:
        # clear out elastisearch index, only once after all tests
        # because otherwise there would be too many http requests
        response = requests.delete(
            "{}/test".format(global_vars.elasticsearch_base_url),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        if response.status_code != 200:
            print(response.content)

        return super().tearDownClass()

    def test_get_search_user(self):
        """
        expect: find admin user as search result
        """

        response = self.base_checks(
            "GET",
            "/search?query={}&users=true".format(self.search_query),
            True,
            200,
        )

        self.assertIn("users", response)
        self.assertIn("posts", response)
        self.assertIn("tags", response)

        # expect our user to be in the search result
        self.assertTrue(
            any("test_admin" in user["username"] for user in response["users"])
        )

        # expect posts and tags search categories to be empty
        # because we excluded them
        self.assertEqual(response["tags"], [])
        self.assertEqual(response["posts"], [])

    def test_get_search_tags(self):
        """
        expect: find post as search result, because it has "test" specified as a tag
        """

        response = self.base_checks(
            "GET",
            "/search?query={}&tags=true".format(self.search_query),
            True,
            200,
        )

        self.assertIn("users", response)
        self.assertIn("posts", response)
        self.assertIn("tags", response)

        # expect the post to be in the result
        self.assertTrue(
            any(str(self.post_oid) == post["_id"] for post in response["tags"])
        )

        # expect posts and users search categories to be empty
        # because we excluded them
        self.assertEqual(response["users"], [])
        self.assertEqual(response["posts"], [])

    def test_get_search_posts(self):
        """
        expect: find post as search result, because content contains the query
        """

        response = self.base_checks(
            "GET",
            "/search?query={}&posts=true".format(self.search_query),
            True,
            200,
        )

        self.assertIn("users", response)
        self.assertIn("posts", response)
        self.assertIn("tags", response)

        # expect the post to be in the result
        self.assertTrue(
            any(str(self.post_oid) == post["_id"] for post in response["posts"])
        )

        # expect tags and users search categories to be empty
        # because we excluded them
        self.assertEqual(response["users"], [])
        self.assertEqual(response["tags"], [])

    def test_get_search_combined(self):
        """
        expect: find a search result in all categories combined in one request
        """

        response = self.base_checks(
            "GET",
            "/search?query={}&posts=true&users=true&tags=true".format(
                self.search_query
            ),
            True,
            200,
        )

        self.assertIn("users", response)
        self.assertIn("posts", response)
        self.assertIn("tags", response)

        # expect a result, but dont check for further details (other test cases)
        self.assertNotEqual(response["users"], [])
        self.assertNotEqual(response["posts"], [])
        self.assertNotEqual(response["tags"], [])

    def test_get_search_error_no_query(self):
        """
        expect: fail message because query parameter is missing
        """

        response = self.base_checks("GET", "/search", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "query")

    def test_get_search_error_no_categories(self):
        """
        expect: fail message because request has no search categories
        set to true
        """

        response = self.base_checks(
            "GET", "/search?query={}".format(self.search_query), False, 400
        )

        self.assertEqual(response["reason"], "no_search_categories_included")


class SpaceHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        # setup basic environment of permissions
        self.base_permission_environment_setUp()

        self.db.profiles.update_one(
            {"username": CURRENT_ADMIN.username},
            {
                "$set": {
                    "username": CURRENT_ADMIN.username,
                    "role": "admin",
                    "follows": [],
                    "bio": "test",
                    "institutions": [
                        {
                            "_id": ObjectId(),
                            "name": "test",
                            "department": "test",
                            "school_type": "test",
                            "country": "test",
                        }
                    ],
                    "chosen_institution_id": "",
                    "projects": "test",
                    "profile_pic": "test",
                    "first_name": "test",
                    "last_name": "test",
                    "gender": "test",
                    "address": "test",
                    "birthday": "test",
                    "experience": "test",
                    "education": "test",
                }
            },
        )

        self.post_oid = ObjectId()
        self.comment_oid = ObjectId()
        self.post_json = {
            "_id": self.post_oid,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime.now(),
            "text": "test",
            "space": self.test_space_id,
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [
                {
                    "_id": self.comment_oid,
                    "author": CURRENT_USER.username,
                    "creation_date": datetime.now(),
                    "text": "test_comment",
                    "pinned": False,
                }
            ],
        }
        self.db.posts.insert_one(self.post_json)

    def tearDown(self) -> None:
        # cleanup test data
        self.base_permission_environments_tearDown()
        self.db.posts.delete_many({})

        # delete uploaded files that were generated by file-repo tests
        fs = gridfs.GridFS(self.db)
        files = list(fs.find())
        for file in files:
            fs.delete(file._id)

        super().tearDown()

    def test_get_space_list(self):
        """
        expect: list available spaces that are not invisible, or if invisible
        if i am a member of them
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # insert 2 more spaces, both invisible, but in one user is a member
        self.db.spaces.insert_many(
            [
                {
                    "name": "invisible_not_member",
                    "invisible": True,
                    "joinable": False,
                    "members": [CURRENT_ADMIN.username],
                    "admins": [CURRENT_ADMIN.username],
                    "invites": [],
                    "requests": [],
                    "files": [],
                },
                {
                    "name": "invisible_member",
                    "invisible": True,
                    "joinable": False,
                    "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
                    "admins": [CURRENT_ADMIN.username],
                    "invites": [],
                    "requests": [],
                    "files": [],
                },
            ]
        )

        response = self.base_checks("GET", "/spaceadministration/list", True, 200)

        self.assertIn("spaces", response)

        # out of the 3 spaces, only the "unittest_testspace" and "invisible_member"
        # should be visible to the normal user
        # "invisible_not_member" is hidden, because space is invisible and user is
        # not a member
        self.assertTrue(
            any(self.test_space == space["name"] for space in response["spaces"])
        )
        self.assertTrue(
            any("invisible_member" == space["name"] for space in response["spaces"])
        )
        self.assertFalse(
            any("invisible_not_member" == space["name"] for space in response["spaces"])
        )

    def test_get_space_list_all(self):
        """
        expect: return all spaces, including invisible ones. permission is granted
        because user is a global admin
        """

        # insert 2 more spaces, both invisible, in one user is not even member
        self.db.spaces.insert_many(
            [
                {
                    "name": "invisible_member",
                    "invisible": True,
                    "joinable": False,
                    "members": [CURRENT_ADMIN.username],
                    "admins": [CURRENT_ADMIN.username],
                    "invites": [],
                    "requests": [],
                    "files": [],
                },
                {
                    "name": "invisible_not_member",
                    "invisible": True,
                    "joinable": False,
                    "members": [CURRENT_USER.username],
                    "admins": [CURRENT_USER.username],
                    "invites": [],
                    "requests": [],
                    "files": [],
                },
            ]
        )

        response = self.base_checks("GET", "/spaceadministration/list_all", True, 200)

        # expect all three spaces to be returned, no matter visibilty/member setting
        # because user is a global admin
        self.assertIn("spaces", response)
        self.assertEqual(len(response["spaces"]), 3)
        self.assertTrue(
            any(self.test_space == space["name"] for space in response["spaces"])
        )
        self.assertTrue(
            any("invisible_member" == space["name"] for space in response["spaces"])
        )
        self.assertTrue(
            any("invisible_not_member" == space["name"] for space in response["spaces"])
        )

    def test_get_space_list_all_error_insufficient_permission(self):
        """
        expect: fail message because user is not a global admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks("GET", "/spaceadministration/list_all", False, 403)
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_get_personal_spaces(self):
        """
        expect: list all spaces that user is member of
        """

        # insert 2 more spaces, in one user member and one not
        self.db.spaces.insert_many(
            [
                {
                    "name": "another1",
                    "invisible": True,
                    "joinable": False,
                    "members": [CURRENT_ADMIN.username],
                    "admins": [CURRENT_ADMIN.username],
                    "invites": [],
                    "requests": [],
                    "files": [],
                },
                {
                    "name": "another2",
                    "invisible": False,
                    "joinable": False,
                    "members": [CURRENT_USER.username],
                    "admins": [CURRENT_USER.username],
                    "invites": [],
                    "requests": [],
                    "files": [],
                },
            ]
        )

        response = self.base_checks("GET", "/spaceadministration/my", True, 200)
        self.assertIn("spaces", response)
        self.assertTrue(
            any(self.test_space == space["name"] for space in response["spaces"])
        )
        self.assertTrue(
            any("another1" == space["name"] for space in response["spaces"])
        )

    def test_get_space_info(self):
        """
        expect: successfully request info about that space even though user is not member
        nor admin, because space is public
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from space
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"members": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/info?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        self.assertIn("space", response)
        self.assertIsNotNone(response["space"])
        self.assertNotEqual(response["space"], {})

    def test_get_space_info_invisible_member(self):
        """
        expect: successfully request info of invisible space because user is member
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # make space invisible
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$set": {"invisible": True}}
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/info?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        self.assertIn("space", response)
        self.assertIsNotNone(response["space"])
        self.assertNotEqual(response["space"], {})

    def test_get_space_info_invisible_admin(self):
        """
        expect: successfully request info of invisible space because user is global admin
        """

        # make space invisible and pull user from members
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$set": {"invisible": True},
                "$pull": {
                    "members": CURRENT_ADMIN.username,
                    "admins": CURRENT_ADMIN.username,
                },
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/info?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        self.assertIn("space", response)
        self.assertIsNotNone(response["space"])
        self.assertNotEqual(response["space"], {})

    def test_get_space_info_error_no_space_name(self):
        """
        expect: fail message because request misses name key
        """

        response = self.base_checks("GET", "/spaceadministration/info?", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "id")

    def test_get_space_infor_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "GET",
            "/spaceadministration/info?id={}".format(ObjectId()),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_get_space_info_error_insufficient_permission(self):
        """
        expect: fail message because space is invisible and user neither member nor
        global admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # make space invisible and pull user from members
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$set": {"invisible": True},
                "$pull": {
                    "members": CURRENT_USER.username,
                    "admins": CURRENT_USER.username,
                },
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/info?id={}".format(str(self.test_space_id)),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_get_space_pending_invites(self):
        """
        expect: see pending invites into spaces for current user
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove user from members and set an invite for him
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "GET", "/spaceadministration/pending_invites", True, 200
        )
        self.assertIn("pending_invites", response)
        self.assertEqual(len(response["pending_invites"]), 1)
        self.assertEqual(str(self.test_space_id), response["pending_invites"][0]["_id"])

    def test_get_space_pending_requests(self):
        """
        expect: see pending requests into spaces for current user
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove user from members and set him as join requested
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"requests": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "GET", "/spaceadministration/pending_requests", True, 200
        )
        self.assertIn("pending_requests", response)
        self.assertEqual(len(response["pending_requests"]), 1)
        self.assertEqual(
            str(self.test_space_id), response["pending_requests"][0]["_id"]
        )

    def test_get_space_join_requests_global_admin(self):
        """
        expect: get list of join requests for space, permission is granted because
        user is global admin
        """

        # remove user from members and set him as join requested
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"requests": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/join_requests?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        self.assertIn("join_requests", response)
        self.assertIn(CURRENT_USER.username, response["join_requests"])

    def test_get_space_join_requests_space_admin(self):
        """
        expect: get list of join requests for space, permission is granted because
        user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove other user from members and set him as join requested
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_ADMIN.username},
                "$push": {
                    "requests": CURRENT_ADMIN.username,
                    "admins": CURRENT_USER.username,
                },
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/join_requests?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        self.assertIn("join_requests", response)
        self.assertIn(CURRENT_ADMIN.username, response["join_requests"])

    def test_get_space_join_requests_error_no_name(self):
        """
        expect: fail message because space name is missing in the request
        """

        response = self.base_checks(
            "GET", "/spaceadministration/join_requests", False, 400
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "id")

    def test_get_space_join_requests_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "GET",
            "/spaceadministration/join_requests?id={}".format(ObjectId()),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_get_space_join_requests_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove other user from members and set him as join requested
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_ADMIN.username},
                "$push": {
                    "requests": CURRENT_ADMIN.username,
                },
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/join_requests?id={}".format(str(self.test_space_id)),
            False,
            403,
        )

        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_get_space_invites_global_admin(self):
        """
        expect: get list of space invites, permission is granted because user is
        global admin
        """

        # remove other user from members and set him as invited
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {
                    "invites": CURRENT_USER.username,
                },
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/invites?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        self.assertIn("invites", response)
        self.assertIn(CURRENT_USER.username, response["invites"])

    def test_get_space_invites_space_admin(self):
        """
        expect: get list of space invites, permission is granted because user is
        space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove other user from members and set him as invited
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_ADMIN.username},
                "$push": {
                    "invites": CURRENT_ADMIN.username,
                    "admins": CURRENT_USER.username,
                },
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/invites?id={}".format(str(self.test_space_id)),
            True,
            200,
        )
        self.assertIn("invites", response)
        self.assertIn(CURRENT_ADMIN.username, response["invites"])

    def test_get_space_invites_error_no_name(self):
        """
        expect: fail message because requests misses space name parameter
        """

        response = self.base_checks("GET", "/spaceadministration/invites", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "id")

    def test_get_space_invites_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "GET",
            "/spaceadministration/invites?id={}".format(ObjectId()),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_get_space_invites_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove other user from members and set him as invited
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_ADMIN.username},
                "$push": {"invites": CURRENT_ADMIN.username},
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/invites?id={}".format(str(self.test_space_id)),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_get_space_files(self):
        """
        expect: successfully request files of space
        """
        # manually add file
        file_id = ObjectId()
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$set": {
                    "files": [{"author": CURRENT_ADMIN.username, "file_id": file_id}]
                }
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/files?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        # expect the added file to be in the response
        self.assertIn("files", response)
        self.assertTrue(
            any(file_obj["file_id"] == str(file_id) for file_obj in response["files"])
        )

    def test_get_space_files_no_files(self):
        """
        expect: an empty list passed as response
        """

        response = self.base_checks(
            "GET",
            "/spaceadministration/files?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        # expect an empty list in the response
        self.assertIn("files", response)
        self.assertEqual(response["files"], [])

    def test_get_space_files_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "GET",
            "/spaceadministration/files?id={}".format(ObjectId()),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_get_space_files_error_user_not_member(self):
        """
        expect: fail message because user is not member of space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                    "admins": CURRENT_USER.username,
                }
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/files?id={}".format(str(self.test_space_id)),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_NOT_MEMBER_ERROR)

    def test_get_space_files_error_insufficient_permissions(self):
        """
        expect: fail message because user has no permission to view the files
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "GET",
            "/spaceadministration/files?id={}".format(str(self.test_space_id)),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_create_space(self):
        """
        expect: successfully create new space and corresponding space acl entries
        """

        new_space_name = "new_space"

        response = self.base_checks(
            "POST",
            "/spaceadministration/create?name={}".format(new_space_name),
            True,
            200,
        )

        # expect record for the space to be created
        db_state = self.db.spaces.find_one({"_id": ObjectId(response["space_id"])})
        self.assertIsNotNone(db_state)

        # expect user to be member and admin (because he created the space)
        self.assertIn("members", db_state)
        self.assertIn(CURRENT_ADMIN.username, db_state["members"])
        self.assertIn("admins", db_state)
        self.assertIn(CURRENT_ADMIN.username, db_state["admins"])

        # expect space_acl roles to be created
        space_acl_records = list(
            self.db.space_acl.find({"space": ObjectId(response["space_id"])})
        )
        self.assertEqual((len(space_acl_records)), 1)
        self.assertEqual(space_acl_records[0]["username"], CURRENT_ADMIN.username)

        # check that creation has counted towards achievements "social"
        # twice because "join_groups" and "admin_groups"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["admin_groups"],
        )

    def test_post_create_space_invisible(self):
        """
        expect: successfully create invisible space
        """

        new_space_name = "new_space"

        response = self.base_checks(
            "POST",
            "/spaceadministration/create?name={}&invisible=true".format(new_space_name),
            True,
            200,
        )

        # expect record for the space to be created
        db_state = self.db.spaces.find_one({"_id": ObjectId(response["space_id"])})
        self.assertIsNotNone(db_state)
        self.assertTrue(db_state["invisible"])

        # check that creation has counted towards achievements "social"
        # twice because "join_groups" and "admin_groups"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["admin_groups"],
        )

    def test_post_create_space_joinable(self):
        """
        expect: successfully create joinable (=public) space
        """

        new_space_name = "new_space"

        response = self.base_checks(
            "POST",
            "/spaceadministration/create?name={}&joinable=true".format(new_space_name),
            True,
            200,
        )

        # expect record for the space to be created
        db_state = self.db.spaces.find_one({"_id": ObjectId(response["space_id"])})
        self.assertIsNotNone(db_state)
        self.assertTrue(db_state["joinable"])

        # check that creation has counted towards achievements "social" twice
        # because  "join_groups" and "admin_groups"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["admin_groups"],
        )

    def test_post_create_space_invisible_and_joinable(self):
        """
        expect: successfully create invisible and joinable space
        """

        new_space_name = "new_space"

        response = self.base_checks(
            "POST",
            "/spaceadministration/create?name={}&invisible=true&joinable=true".format(
                new_space_name
            ),
            True,
            200,
        )

        # expect record for the space to be created
        db_state = self.db.spaces.find_one({"_id": ObjectId(response["space_id"])})
        self.assertIsNotNone(db_state)
        self.assertTrue(db_state["invisible"])
        self.assertTrue(db_state["joinable"])

        # check that creation has counted towards achievements "social"
        # twice because "join_groups" and "admin_groups"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["admin_groups"],
        )

    def test_post_create_space_error_no_name(self):
        """
        expect: fail message because request misses "name" parameter
        """

        response = self.base_checks("POST", "/spaceadministration/create", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "name")

        # check that creation has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_create_space_error_insufficient_permission(self):
        """
        expect: fail message because user has no permission to create spaces
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        new_space_name = "new_space"

        response = self.base_checks(
            "POST",
            "/spaceadministration/create?name={}".format(new_space_name),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

        # check that creation has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_join_space_joinable(self):
        """
        expect: successfully join space because it is joinable
        (no extra permission needed)
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove user from member list first
        # and set space as joinable (=public)
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {"$pull": {"members": CURRENT_USER.username}, "$set": {"joinable": True}},
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/join?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        # expect joined response
        self.assertIn("join_type", response)
        self.assertEqual(response["join_type"], "joined")

        # expect user to be a member now
        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn(CURRENT_USER.username, db_state["members"])

        # expect acl entry to be created
        acl_entry = self.db.space_acl.find_one(
            {"space": self.test_space_id, "username": CURRENT_USER.username}
        )
        self.assertIsNotNone(acl_entry)

        # check that joining has counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_USER.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"],
        )

    def test_post_join_space_admin(self):
        """
        expect: successfully join space because user is an admin and can join any space
        """

        # remove user from member list first
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"members": CURRENT_ADMIN.username}}
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/join?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        # expect joined response
        self.assertIn("join_type", response)
        self.assertEqual(response["join_type"], "joined")

        # expect user to be a member now
        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn(CURRENT_ADMIN.username, db_state["members"])

        # check that joining has counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"],
        )

    def test_post_join_space_join_request(self):
        """
        expect: user has no permission to directly join and space is not joinable,
        so request sets a join request instead
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove user from member list first
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"members": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/join?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        # expect requested_join response
        self.assertIn("join_type", response)
        self.assertEqual(response["join_type"], "requested_join")

        # expect user to be in the requests now
        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn(CURRENT_USER.username, db_state["requests"])

        # check that joining has not counted towards achievements "social", because it is
        # just a request
        user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_USER.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_join_space_error_no_name(self):
        """
        expect: fail message because request misses "name" parameter
        """

        response = self.base_checks("POST", "/spaceadministration/join", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "id")

        # check that joining has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_join_space_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/join?id={}".format(ObjectId()),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

        # check that joining has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_join_space_error_user_already_member(self):
        """
        expect: fail message because user is already a member of the space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "POST",
            "/spaceadministration/join?id={}".format(str(self.test_space_id)),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_ALREADY_MEMBER_ERROR)

        # check that joining has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_USER.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_space_add_admin_global_admin(self):
        """
        expect: successfully add another user as admin, permission is granted
        because user is global admin
        """

        # pull user from space admins to trigger global admin privilege
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        self.base_checks(
            "POST",
            "/spaceadministration/add_admin?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn(CURRENT_USER.username, db_state["admins"])

        # check that adding has counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_USER.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["admin_groups"],
        )

    def test_post_space_add_admin_space_admin(self):
        """
        expect: successfully add another user as admin, permission granted
        because user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$set": {"admins": [CURRENT_USER.username]}}
        )

        self.base_checks(
            "POST",
            "/spaceadministration/add_admin?id={}&user={}".format(
                self.test_space_id, CURRENT_ADMIN.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn(CURRENT_ADMIN.username, db_state["admins"])

        # check that adding has counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["admin_groups"],
        )

    def test_post_space_add_admin_error_no_user(self):
        """
        expect: fail message because request misses "user" parameter
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/add_admin?id={}".format(str(self.test_space_id)),
            False,
            400,
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "user")

    def test_post_space_add_admin_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/add_admin?id={}&user={}".format(
                ObjectId(), CURRENT_ADMIN.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

        # check that adding has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_space_add_admin_error_user_not_member(self):
        """
        expect: fail message because is not member of the space and thus
        cannot be set as an admin
        """

        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"members": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/add_admin?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_NOT_MEMBER_ERROR)

        # check that adding has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_USER.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_space_add_admin_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "POST",
            "/spaceadministration/add_admin?id={}&user={}".format(
                str(self.test_space_id), CURRENT_ADMIN.username
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

        # check that adding has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_space_information_global_admin(self):
        """
        expect: successfully edit description and picture of space, permission is granted
        because user is global admin
        """

        # pull user from space admins to trigger global admin privileges
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        request_json = {
            "picture": {
                "payload": b64encode(b"test_picture").decode("utf-8"),
                "type": "image/png",
            },
            "description": "updated_space_description",
        }

        self.base_checks(
            "POST",
            "/spaceadministration/space_information?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
            body=request_json,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state["space_description"], request_json["description"])

        # check that the profile pic was also replicated to gridfs
        fs = gridfs.GridFS(self.db)
        fs_file = fs.get(db_state["space_pic"])
        self.assertIsNotNone(fs_file)
        self.assertEqual(fs_file.read(), b"test_picture")

        # do another request, this time only updating the description
        request_json2 = {
            "description": "updated_space_description2",
        }

        self.base_checks(
            "POST",
            "/spaceadministration/space_information?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
            body=request_json2,
        )

        db_state2 = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state2["space_description"], request_json2["description"])

    def test_post_space_information_space_admin(self):
        """
        expect: successfully edit description and picture of space, permission is granted
        because user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        request_json = {
            "picture": {
                "payload": b64encode(b"test_picture").decode("utf-8"),
                "type": "image/png",
            },
            "description": "updated_space_description",
        }

        self.base_checks(
            "POST",
            "/spaceadministration/space_information?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
            body=request_json,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state["space_description"], request_json["description"])

        # check that the profile pic was also replicated to gridfs
        fs = gridfs.GridFS(self.db)
        fs_file = fs.get(db_state["space_pic"])
        self.assertIsNotNone(fs_file)
        self.assertEqual(fs_file.read(), b"test_picture")

        # do another request, this time only updating the description
        request_json2 = {
            "description": "updated_space_description2",
        }

        self.base_checks(
            "POST",
            "/spaceadministration/space_information?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
            body=request_json2,
        )

        db_state2 = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state2["space_description"], request_json2["description"])

    def test_post_space_information_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        request_json = {
            "description": "updated_space_text",
            "picture": {
                "payload": b64encode(b"test_picture").decode("utf-8"),
                "type": "image/png",
            },
        }

        response = self.base_checks(
            "POST",
            "/spaceadministration/space_information?id={}".format(ObjectId()),
            False,
            409,
            body=request_json,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_information_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        request_json = {
            "description": "updated_space_text",
            "picture": {
                "payload": b64encode(b"test_picture").decode("utf-8"),
                "type": "image/png",
            },
        }

        response = self.base_checks(
            "POST",
            "/spaceadministration/space_picture?id={}".format(str(self.test_space_id)),
            False,
            403,
            body=request_json,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_description_legacy_global_admin(self):
        """
        expect: successfully edit description of space, permission is granted
        because user is global admin
        """

        # pull user from space admins to trigger global admin privileges
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        request_json = {
            "space_description": "updated_space_text",
        }
        request = MultipartEncoder(fields=request_json)

        self.base_checks(
            "POST",
            "/spaceadministration/space_picture?id={}".format(str(self.test_space_id)),
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(
            db_state["space_description"], request_json["space_description"]
        )

    def test_post_space_description_legacy_space_admin(self):
        """
        expect: successfully edit description of space, permission is granted
        because user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        request_json = {
            "space_description": "updated_space_text",
        }
        request = MultipartEncoder(fields=request_json)

        self.base_checks(
            "POST",
            "/spaceadministration/space_picture?id={}".format(str(self.test_space_id)),
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(
            db_state["space_description"], request_json["space_description"]
        )

    def test_post_space_description_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        request_json = {
            "space_description": "updated_space_text",
        }
        request = MultipartEncoder(fields=request_json)

        response = self.base_checks(
            "POST",
            "/spaceadministration/space_picture?id={}".format(ObjectId()),
            False,
            409,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_description_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        request_json = {
            "space_description": "updated_space_text",
        }
        request = MultipartEncoder(fields=request_json)

        response = self.base_checks(
            "POST",
            "/spaceadministration/space_picture?id={}".format(str(self.test_space_id)),
            False,
            403,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_invite_global_admin(self):
        """
        expect: successfully invite other user into space, permission is granted
        because user is global admin
        """

        # pull user from space admins to trigger global admin privileges
        # and remove other user from space
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "admins": CURRENT_ADMIN.username,
                    "members": CURRENT_USER.username,
                }
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/invite?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn(CURRENT_USER.username, db_state["invites"])

    def test_post_space_invite_space_admin(self):
        """
        expect: successfully invite other user into space, permission is granted
        because user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove other user from member and set current user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$set": {"admins": [CURRENT_USER.username]},
                "$pull": {"members": CURRENT_ADMIN.username},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/invite?id={}&user={}".format(
                self.test_space_id, CURRENT_ADMIN.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn(CURRENT_ADMIN.username, db_state["invites"])

    def test_post_space_invite_error_no_user(self):
        """
        expect: fail message because request misses "user" parameter
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/invite?id={}".format(str(self.test_space_id)),
            False,
            400,
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "user")

    def test_post_space_invite_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/invite?id={}&user={}".format(
                ObjectId(), CURRENT_ADMIN.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_invite_error_user_already_member(self):
        """
        expect: fail message because user is already a member of the space
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/invite?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_ALREADY_MEMBER_ERROR)

    def test_post_space_invite_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove other user from member
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_ADMIN.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/invite?id={}&user={}".format(
                self.test_space_id, CURRENT_ADMIN.username
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_accept_invite(self):
        """
        expect: current user successfully accepts invite into space and is then a member
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as invited
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/accept_invite?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn(CURRENT_USER.username, db_state["members"])

        # check that joining has counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_USER.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"],
        )

    def test_post_space_accept_invite_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as invited
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/accept_invite?id={}".format(ObjectId()),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

        # check that joining has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_USER.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_space_accept_invite_error_user_not_invited(self):
        """
        expect: fail message because user wasnt event invited into the space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members, but dont invite him either
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/accept_invite?id={}".format(str(self.test_space_id)),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_NOT_INVITED_ERROR)

        # check that joining has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_USER.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_space_decline_invite(self):
        """
        expect: current user declines invite and will not become member of the space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as invited
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/decline_invite?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_USER.username, db_state["members"])

    def test_post_space_decline_invite_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as invited
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/decline_invite?id={}".format(ObjectId()),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_decline_invite_error_user_not_invited(self):
        """
        expect: fail message because user wasnt event invited into the space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members, but dont invite him either
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/decline_invite?id={}".format(str(self.test_space_id)),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_NOT_INVITED_ERROR)

    def test_post_space_revoke_invite_global_admin(self):
        """
        expect: successfully revoke invite of a user, permission is granted
        because user is global admin
        """

        # pull user from space admins to trigger global admin privileges
        # and remove other user from space and set him as invited
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "admins": CURRENT_ADMIN.username,
                    "members": CURRENT_USER.username,
                },
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/revoke_invite?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_USER.username, db_state["invites"])
        # for sanity, check that user is not added elsewhere
        self.assertNotIn(CURRENT_USER.username, db_state["members"])
        self.assertNotIn(CURRENT_USER.username, db_state["requests"])

    def test_post_space_revoke_invite_space_admin(self):
        """
        expect: successfully revoke invite of a user, permission is granted
        because user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove other user from member and set him as invited
        # and set current user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$set": {"admins": [CURRENT_USER.username]},
                "$pull": {"members": CURRENT_ADMIN.username},
                "$push": {"invites": CURRENT_ADMIN.username},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/revoke_invite?id={}&user={}".format(
                self.test_space_id, CURRENT_ADMIN.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_ADMIN.username, db_state["invites"])
        # for sanity, check that user is not added elsewhere
        self.assertNotIn(CURRENT_ADMIN.username, db_state["members"])
        self.assertNotIn(CURRENT_ADMIN.username, db_state["requests"])

    def test_post_space_revoke_invite_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        # set user as invited
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/revoke_invite?id={}&user={}".format(
                ObjectId(), CURRENT_USER.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_revoke_invite_error_user_not_invited(self):
        """
        expect: fail message because user wasnt event invited into the space
        """

        # pull user from members, but dont invite him either
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/revoke_invite?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_NOT_INVITED_ERROR)

    def test_post_space_revoke_invite_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove other user from member and set him as invited
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {"members": CURRENT_ADMIN.username},
                "$push": {"invites": CURRENT_ADMIN.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/revoke_invite?id={}&user={}".format(
                self.test_space_id, CURRENT_ADMIN.username
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_accept_request_global_admin(self):
        """
        expect: successfully accept join request of a user, making him a member
        permission is granted because current user is global admin
        """

        # pull user from members and set him as requested
        # also pull current user from admin to trigger global admin privileges
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                    "admins": CURRENT_ADMIN.username,
                },
                "$push": {"requests": CURRENT_USER.username},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/accept_request?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn(CURRENT_USER.username, db_state["members"])

        # check that joining has counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_USER.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"],
        )

    def test_post_space_accept_request_space_admin(self):
        """
        expect: successfully accept join request of a user, making him a member
        permission is granted because current user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as space admin and other user as requested
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$set": {
                    "members": [CURRENT_USER.username],
                    "admins": [CURRENT_USER.username],
                    "requests": [CURRENT_ADMIN.username],
                }
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/accept_request?id={}&user={}".format(
                self.test_space_id, CURRENT_ADMIN.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn(CURRENT_ADMIN.username, db_state["members"])

        # check that joining has counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"],
        )

    def test_post_space_accept_request_error_no_user(self):
        """
        expect: fail message because request misses "user" parameter
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/accept_request?id={}".format(str(self.test_space_id)),
            False,
            400,
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "user")

    def test_post_space_accept_request_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/accept_request?id={}&user={}".format(
                ObjectId(), CURRENT_ADMIN.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

        # check that joining has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_space_accept_request_error_user_didnt_request(self):
        """
        expect: fail message because user didnt even request to join the space
        """

        # pull user from members, but dont set join request
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                }
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/accept_request?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_DIDNT_REQUEST_TO_JOIN_ERROR)

        # check that joining has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_USER.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_space_accept_request_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members and set him as requested
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                },
                "$push": {"requests": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/accept_request?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

        # check that joining has not counted towards achievements "social"
        user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[CURRENT_USER.username]["achievements"]["social"][
                "progress"
            ],
        )

    def test_post_space_reject_request_global_admin(self):
        """
        expect: reject join request of a user, permission is granted
        because user is global admin
        """

        # pull user from members and set him as requested,
        # also remove admin from space_admins to trigger global admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                    "admins": CURRENT_ADMIN.username,
                },
                "$push": {"requests": CURRENT_USER.username},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/reject_request?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username  #
            ),
            True,
            200,
        )

        # expect user to be no longer requested and also not member
        # (because he was declined)
        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_USER.username, db_state["requests"])
        self.assertNotIn(CURRENT_USER.username, db_state["members"])

    def test_post_space_reject_request_space_admin(self):
        """
        expect: reject join request of a user, permission is granted
        because user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user as space admin and
        # pull other user from members and set him as requested,
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$set": {
                    "members": [CURRENT_USER.username],
                    "admins": [CURRENT_USER.username],
                    "requests": [CURRENT_ADMIN.username],
                },
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/reject_request?id={}&user={}".format(
                self.test_space_id, CURRENT_ADMIN.username
            ),
            True,
            200,
        )

        # expect user to be no longer requested and also not member
        # (because he was declined)
        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_ADMIN.username, db_state["requests"])
        self.assertNotIn(CURRENT_ADMIN.username, db_state["members"])

    def test_post_space_reject_request_error_no_user(self):
        """
        expect: fail message because request is missing user parameter
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/reject_request?id={}".format(str(self.test_space_id)),
            False,
            400,
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "user")

    def test_post_space_reject_request_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/reject_request?id={}&user={}".format(
                ObjectId(), CURRENT_USER.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_reject_request_error_user_didnt_request(self):
        """
        expect: fail message because user didnt even request to join
        """

        # pull user from members and dont set him as requested
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                },
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/reject_request?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_DIDNT_REQUEST_TO_JOIN_ERROR)

    def test_post_space_reject_request_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members and dont set him as requested
        # also dont set current user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_ADMIN.username,
                    "admins": CURRENT_ADMIN.username,
                },
                "$push": {"requests": CURRENT_ADMIN.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/reject_request?id={}&user={}".format(
                self.test_space_id, CURRENT_ADMIN.username
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_revoke_request(self):
        """
        expect: current user revokes his own join request
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members and set him as requested
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                },
                "$push": {"requests": CURRENT_USER.username},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/revoke_request?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        # expect user to be no longer requested and also not member
        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_USER.username, db_state["requests"])
        self.assertNotIn(CURRENT_USER.username, db_state["members"])

    def test_post_space_revoke_request_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/revoke_request?id={}".format(ObjectId()),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_revoke_request_error_user_didnt_request(self):
        """
        expect: fail message because user didnt even request to join
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members and dont set him as requested
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                },
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/revoke_request?id={}".format(str(self.test_space_id)),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_DIDNT_REQUEST_TO_JOIN_ERROR)

    def test_post_space_toggle_visibility_global_admin(self):
        """
        expect: successfully toggle visibility of space (false -> true, true -> false),
        permission is granted because user is global admin
        """

        visibility = False

        # pull user from space admins to trigger global admin
        # and set visibility explicitely
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "admins": CURRENT_ADMIN.username,
                },
                "$set": {"invisible": visibility},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/toggle_visibility?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state["invisible"], not visibility)

        # do the same thing once more to test the other toggle direction
        visibility = not visibility
        self.base_checks(
            "POST",
            "/spaceadministration/toggle_visibility?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state["invisible"], not visibility)

    def test_post_space_toggle_visibility_space_admin(self):
        """
        expect: successfully toggle visibility of space, permission is granted
        because user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        visibility = False

        # set user as space admin
        # and set visibility explicitely
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$push": {
                    "admins": CURRENT_USER.username,
                },
                "$set": {"invisible": visibility},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/toggle_visibility?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state["invisible"], not visibility)

        # do the same thing once more to test the other toggle direction
        visibility = not visibility
        self.base_checks(
            "POST",
            "/spaceadministration/toggle_visibility?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state["invisible"], not visibility)

    def test_post_space_toggle_visibility_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "POST",
            "/spaceadministration/toggle_visibility?id={}".format(
                str(self.test_space_id)
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_toggle_joinability_global_admin(self):
        """
        expect: successfully toggle joinability of space (false -> true, true -> false),
        permission is granted because user is global admin
        """

        joinability = False

        # pull user from space admins to trigger global admin
        # and set joinability explicitely
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "admins": CURRENT_ADMIN.username,
                },
                "$set": {"joinable": joinability},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/toggle_joinability?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state["joinable"], not joinability)

        # do the same thing once more to test the other toggle direction
        joinability = not joinability
        self.base_checks(
            "POST",
            "/spaceadministration/toggle_joinability?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state["joinable"], not joinability)

    def test_post_space_toggle_joinability_space_admin(self):
        """
        expect: successfully toggle joinability of space, permission is granted
        because user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        joinability = False

        # set user as space admin
        # and set joinability explicitely
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$push": {
                    "admins": CURRENT_USER.username,
                },
                "$set": {"joinable": joinability},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/toggle_joinability?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state["joinable"], not joinability)

        # do the same thing once more to test the other toggle direction
        joinability = not joinability
        self.base_checks(
            "POST",
            "/spaceadministration/toggle_joinability?id={}".format(
                str(self.test_space_id)
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertEqual(db_state["joinable"], not joinability)

    def test_post_space_toggle_joinability_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "POST",
            "/spaceadministration/toggle_joinability?id={}".format(
                str(self.test_space_id)
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_put_file(self):
        """
        expect: successfully add a new file
        """

        # create file with IO Buffer
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        self.base_checks(
            "POST",
            "/spaceadministration/put_file?id={}".format(str(self.test_space_id)),
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        # assert file is stored in db
        fs = gridfs.GridFS(self.db)
        file = fs.find_one({"filename": file_name})
        self.assertIsNotNone(file)

        # assert that space now has this file attached
        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn("files", db_state)
        self.assertIn(
            {
                "author": CURRENT_ADMIN.username,
                "file_id": file._id,
                "file_name": file_name,
                "manually_uploaded": True,
            },
            db_state["files"],
        )

    def test_post_space_put_file_error_no_name(self):
        """
        expect: fail message becase name parameter is missing
        """

        # create file with IO Buffer
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/spaceadministration/put_file",
            False,
            400,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "id")

    def test_post_space_put_file_error_no_file(self):
        """
        expect: fail message because no file is transferred
        """

        # encode file as formdata
        request = MultipartEncoder(fields={})

        response = self.base_checks(
            "POST",
            "/spaceadministration/put_file?id={}".format(str(self.test_space_id)),
            False,
            400,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], MISSING_FILE_ERROR_SLUG + "file")

        # second request has "file" key in formdata, but is not an actual file
        request2 = MultipartEncoder(fields={"file": "value"})

        response2 = self.base_checks(
            "POST",
            "/spaceadministration/put_file?id={}".format(str(self.test_space_id)),
            False,
            400,
            headers={"Content-Type": request2.content_type},
            body=request2.to_string(),
        )
        self.assertEqual(response2["reason"], MISSING_FILE_ERROR_SLUG + "file")

    def test_post_space_put_file_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        # create file with IO Buffer
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/spaceadministration/put_file?id={}".format(ObjectId()),
            False,
            409,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_put_file_error_user_not_member(self):
        """
        expect: fail message because user is not a member of the space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                    "admins": CURRENT_USER.username,
                }
            },
        )

        # create file with IO Buffer
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/spaceadministration/put_file?id={}".format(str(self.test_space_id)),
            False,
            409,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], USER_NOT_MEMBER_ERROR)

    def test_post_space_put_file_error_insufficient_permission(self):
        """
        expect: fail message because user has no permission to add new files
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # create file with IO Buffer
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/spaceadministration/put_file?id={}".format(str(self.test_space_id)),
            False,
            403,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_space_error_no_name(self):
        """
        expect: fail message because request is missing name parameter
        """

        response = self.base_checks("DELETE", "/spaceadministration/leave", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "id")

    def test_delete_space_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/leave?id={}".format(ObjectId()),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_delete_space_leave_space(self):
        """
        expect: successfully leave space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        self.base_checks(
            "DELETE",
            "/spaceadministration/leave?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_USER.username, db_state["members"])

    def test_delete_space_leave_space_space_admin(self):
        """
        expect: succesfully leave space as a space admin,
        allowed because there is another admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/leave?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_USER.username, db_state["members"])
        self.assertNotIn(CURRENT_USER.username, db_state["admins"])

    def test_delete_space_leave_space_error_no_other_admins(self):
        """
        expect: fail message because there would be no other space admin left
        """

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/leave?id={}".format(str(self.test_space_id)),
            False,
            409,
        )
        self.assertEqual(response["reason"], "no_other_admins_left")

    def test_delete_space_kick_user_global_admin(self):
        """
        expect: successfully kick another user,
        permission is granted because user is global admin
        """

        # pull user from space admins to trigger global admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/kick?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            True,
            200,
        )

        # expect other user to no longer be member
        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_USER.username, db_state["members"])

    def test_delete_space_kick_user_space_admin(self):
        """
        expect: successfull kick another user,
        permission is granted because user is space admin
        """

        self.base_checks(
            "DELETE",
            "/spaceadministration/kick?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            True,
            200,
        )

        # expect other user to no longer be member
        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_USER.username, db_state["members"])

    def test_delete_space_kick_space_admin_as_global_admin(self):
        """
        expect: successfully kick another space admin,
        permission is granted because user is global admin
        """

        # set other user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/kick?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            True,
            200,
        )

        # expect other user to no longer be member
        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_USER.username, db_state["members"])
        self.assertNotIn(CURRENT_USER.username, db_state["admins"])

    def test_delete_space_kick_user_error_user_not_member(self):
        """
        expect: fail message because user is not even member
        """

        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"members": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/kick?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_NOT_MEMBER_ERROR)

    def test_delete_space_kick_user_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove other user from admin, because kicking an admin is another case
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/kick?id={}&user={}".format(
                self.test_space_id, CURRENT_ADMIN.username
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_space_kick_space_admin_error_insufficient_permission(self):
        """
        expect: fail message because is not global admin
        (kicking space admin requires global admin)
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as space admin, which would be enough to kick a normal user
        # but not another space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/kick?id={}&user={}".format(
                self.test_space_id, CURRENT_ADMIN.username
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_space_remove_admin(self):
        """
        expect: successfully remove space admin, permission is granted
        because user is global admin
        """

        # set other user as admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/remove_admin?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertNotIn(CURRENT_USER.username, db_state["admins"])

    def test_delete_space_remove_admin_error_no_user(self):
        """
        expect: fail message because request misses "user" parameter
        """

        # set other user as admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/remove_admin?id={}".format(str(self.test_space_id)),
            False,
            400,
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "user")

    def test_delete_space_remove_admin_error_user_not_space_admin(self):
        """
        expect: fail message because to-delete-user isnt event a space admin
        """

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/remove_admin?id={}&user={}".format(
                self.test_space_id, CURRENT_USER.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], "user_not_space_admin")

    def test_delete_space_remove_admin_error_insufficient_permission(self):
        """
        expect: fail message because user is not a global admin
        (even space admin is not enough to kick another space admin)
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/remove_admin?id={}&user={}".format(
                self.test_space_id, CURRENT_ADMIN.username
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def _setup_space_file(self, author: str):
        """
        helper function to add a file to the space
        """

        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        fs = gridfs.GridFS(self.db)
        _id = fs.put(
            file,
            filename=file_name,
            content_type="text/plain",
            metadata={"uploader": "me"},
        )

        # add file metadata
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$push": {
                    "files": {
                        "author": author,
                        "file_id": _id,
                        "manually_uploaded": True,
                    }
                }
            },
        )

        return _id

    def _assert_file_removed_from_space_and_filesystem(self, file_id: ObjectId) -> None:
        """
        helper function to assert correct deletion of file
        """

        db_state = self.db.spaces.find_one({"_id": self.test_space_id})
        self.assertIn("files", db_state)
        self.assertFalse(any(file["file_id"] == file_id for file in db_state["files"]))
        fs = gridfs.GridFS(self.db)
        self.assertIsNone(fs.find_one({"_id": file_id}))

    def test_delete_space_delete_file_author(self):
        """
        expect: successfully delete file because user is uploader of it
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # manually add file
        file_id = self._setup_space_file(CURRENT_USER.username)
        self.base_checks(
            "DELETE",
            "/spaceadministration/delete_file?id={}&file_id={}".format(
                self.test_space_id, str(file_id)
            ),
            True,
            200,
        )

        # assert file has been removed from space metadata and filesystem
        self._assert_file_removed_from_space_and_filesystem(file_id)

    def test_delete_space_delete_file_space_admin(self):
        """
        expect: successfully delete file because user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        # manually add file
        file_id = self._setup_space_file(CURRENT_ADMIN.username)

        self.base_checks(
            "DELETE",
            "/spaceadministration/delete_file?id={}&file_id={}".format(
                self.test_space_id, str(file_id)
            ),
            True,
            200,
        )

        # assert file has been removed from space metadata and filesystem
        self._assert_file_removed_from_space_and_filesystem(file_id)

    def test_delete_space_delete_file_global_admin(self):
        """
        expect: successfully delete file because user is global admin
        """

        # pull user from space
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        # manually add file
        file_id = self._setup_space_file(CURRENT_ADMIN.username)

        self.base_checks(
            "DELETE",
            "/spaceadministration/delete_file?id={}&file_id={}".format(
                self.test_space_id, str(file_id)
            ),
            True,
            200,
        )

        # assert file has been removed from space metadata and filesystem
        self._assert_file_removed_from_space_and_filesystem(file_id)

    def test_delete_space_delete_file_error_no_file_name(self):
        """
        expect: fail message because request misses file name parameter
        """

        # manually add file
        file_id = self._setup_space_file(CURRENT_USER.username)

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/delete_file?id={}".format(str(self.test_space_id)),
            False,
            400,
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "file_id")

    def test_delete_space_delete_file_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        # manually add file
        file_id = self._setup_space_file(CURRENT_USER.username)

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/delete_file?id={}&file_id={}".format(
                ObjectId(), str(file_id)
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_delete_space_delete_file_error_file_doesnt_exist(self):
        """
        expect: fail message because file doesnt exist
        """

        # manually add file
        file_id = self._setup_space_file(CURRENT_USER.username)

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/delete_file?id={}&file_id={}".format(
                self.test_space_id, str(ObjectId())
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], "file_doesnt_exist_in_space")

    def test_delete_space_delete_file_error_insufficient_permission(self):
        """
        expect: fail message because user is neither uploader nor space or global admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # manually add file
        file_id = self._setup_space_file(CURRENT_ADMIN.username)

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/delete_file?id={}&file_id={}".format(
                self.test_space_id, str(file_id)
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_space_delete_file_error_file_belongs_to_post(self):
        """
        expect: fail message because file belongs to a post and is therefore not deletable
        """

        # file setup done manually, because manually_uploaded has to be unset
        def __setup(self):
            file_name = "test_file.txt"
            file = io.BytesIO()
            file.write(b"this is a binary test file")
            file.seek(0)

            fs = gridfs.GridFS(self.db)
            _id = fs.put(
                file,
                filename=file_name,
                content_type="text/plain",
                metadata={"uploader": "me"},
            )

            # add file metadata
            self.db.spaces.update_one(
                {"_id": self.test_space_id},
                {
                    "$push": {
                        "files": {
                            "author": CURRENT_ADMIN.username,
                            "file_id": _id,
                        }
                    }
                },
            )

            return _id

        file_id = __setup(self)
        response = self.base_checks(
            "DELETE",
            "/spaceadministration/delete_file?id={}&file_id={}".format(
                self.test_space_id, str(file_id)
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], "file_belongs_to_post")

    def test_delete_space_global_admin(self):
        """
        expect: successfully delete space and all associated data (posts, space_acl),
        permission is granted because user is global admin
        """

        # remove user from space admins to trigger global admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/delete_space?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        # expect all associated data to be deleted
        space = self.db.spaces.find_one({"_id": self.test_space_id})
        posts = list(self.db.posts.find({"space": self.test_space_id}))
        space_acl = list(self.db.space_acl.find({"space": self.test_space_id}))
        self.assertEqual(space, None)
        self.assertEqual(posts, [])
        self.assertEqual(space_acl, [])

    def test_delete_space_space_admin(self):
        """
        expect: successfully delete space and all associated data (posts, space_acl),
        permission is granted ebcause user is space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as space admin
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$push": {"admins": CURRENT_USER.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/delete_space?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        # expect all associated data to be deleted
        space = self.db.spaces.find_one({"_id": self.test_space_id})
        posts = list(self.db.posts.find({"space": self.test_space_id}))
        space_acl = list(self.db.space_acl.find({"space": self.test_space_id}))
        self.assertEqual(space, None)
        self.assertEqual(posts, [])
        self.assertEqual(space_acl, [])

    def test_delete_space_with_files(self):
        """
        expect: successfully delete space and all files that were in the space
        """

        # setup file in space
        file_id = self._setup_space_file(CURRENT_ADMIN.username)

        self.base_checks(
            "DELETE",
            "/spaceadministration/delete_space?id={}".format(str(self.test_space_id)),
            True,
            200,
        )

        # expect all associated data to be deleted
        space = self.db.spaces.find_one({"_id": self.test_space_id})
        posts = list(self.db.posts.find({"space": self.test_space_id}))
        space_acl = list(self.db.space_acl.find({"space": self.test_space_id}))
        self.assertEqual(space, None)
        self.assertEqual(posts, [])
        self.assertEqual(space_acl, [])
        fs = gridfs.GridFS(self.db)
        self.assertFalse(fs.exists(file_id))

    def test_delete_space_error_insufficient_permission(self):
        """
        expect: fail message because user is neither space admin nor global admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/delete_space?id={}".format(str(self.test_space_id)),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)


class TimelineHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        # setup basic environment of permissions
        self.base_permission_environment_setUp()

        self.db.profiles.update_one(
            {"username": CURRENT_ADMIN.username}, {"$set": {"profile_pic": "test"}}
        )
        self.db.profiles.update_one(
            {"username": CURRENT_USER.username},
            {"$set": {"profile_pic": "default_profile_pic.jpg"}},
        )

        # create test plan that is referenced in a post
        self.test_plan_id = ObjectId()
        self.test_plan = {
            "_id": self.test_plan_id,
            "author": CURRENT_ADMIN.username,
            "read_access": [CURRENT_ADMIN.username],
            "write_access": [CURRENT_ADMIN.username],
            "creation_timestamp": datetime.now(),
            "last_modified": datetime.now(),
            "name": "test",
            "partners": [CURRENT_USER.username],
            "institutions": [],
            "topics": ["test", "test"],
            "lectures": [],
            "major_learning_goals": ["test", "test"],
            "individual_learning_goals": [],
            "methodical_approaches": ["test"],
            "target_groups": [],
            "languages": ["test", "test"],
            "evaluation": [],
            "timestamp_from": datetime.now(),
            "timestamp_to": datetime.now(),
            "involved_parties": ["test", "test"],
            "realization": "test",
            "physical_mobility": True,
            "physical_mobilities": [],
            "learning_env": "test",
            "checklist": [
                {
                    "username": CURRENT_ADMIN.username,
                    "technology": False,
                    "exam_regulations": False,
                }
            ],
            "duration": 10,
            "workload": 10,
            "steps": [],
            "is_good_practise": True,
            "is_good_practise_ro": False,
            "abstract": "test",
            "underlying_ve_model": "test",
            "reflection": "test",
            "literature": "test",
            "evaluation_file": None,
            "literature_files": [],
            "progress": {
                "name": "not_started",
                "institutions": "not_started",
                "topics": "not_started",
                "lectures": "not_started",
                "learning_goals": "not_started",
                "target_groups": "not_started",
                "languages": "not_started",
                "evaluation": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        }
        self.db.plans.insert_one(self.test_plan)

        # 4 test posts, one in space and one normal for admin and for user
        self.post_oids = [ObjectId(), ObjectId(), ObjectId(), ObjectId()]
        self.posts = [
            {
                "_id": self.post_oids[0],
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.utcnow(),
                "text": "space_post_admin",
                "space": self.test_space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "files": [],
                "comments": [
                    {
                        "_id": ObjectId(),
                        "author": CURRENT_USER.username,
                        "creation_date": datetime.utcnow(),
                        "text": "test_comment",
                        "pinned": False,
                    }
                ],
                "likers": [],
                "plans": [self.test_plan_id],
            },
            {
                "_id": self.post_oids[1],
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.utcnow(),
                "text": "normal_post_admin",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "files": [],
                "comments": [],
                "likers": [],
                "plans": [],
            },
            {
                "_id": self.post_oids[2],
                "author": CURRENT_USER.username,
                "creation_date": datetime.utcnow(),
                "text": "space_post_user",
                "space": self.test_space_id,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "files": [],
                "comments": [],
                "likers": [],
                "plans": [],
            },
            {
                "_id": self.post_oids[3],
                "author": CURRENT_USER.username,
                "creation_date": datetime.utcnow(),
                "text": "normal_post_user",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "files": [],
                "comments": [],
                "likers": [],
                "plans": [],
            },
        ]
        self.db.posts.insert_many(self.posts)

    def tearDown(self) -> None:
        # cleanup test data
        self.base_permission_environments_tearDown()
        self.db.posts.delete_many({})
        super().tearDown()

    def assert_author_enhanced(self, posts: List[dict]):
        for post in posts:
            # expect author to be enhanced with profile details
            self.assertIn("author", post)
            self.assertIn("username", post["author"])
            self.assertIn("profile_pic", post["author"])
            self.assertIn("first_name", post["author"])
            self.assertIn("last_name", post["author"])
            self.assertIn("institution", post["author"])

            # admin has a profile pic set,
            # therefore expect his pic to not be the default one
            if post["author"]["username"] == CURRENT_ADMIN.username:
                self.assertEqual(post["author"]["profile_pic"], "test")
            elif post["author"]["username"] == CURRENT_USER.username:
                self.assertEqual(
                    post["author"]["profile_pic"], "default_profile_pic.jpg"
                )

    def assert_plan_object_enhanced(self, post: List[dict]):
        for plan in post["plans"]:
            self.assertIn("_id", plan)
            self.assertIn("name", plan)
            self.assertIn("author", plan)
            # omit the rest, if some of the args are in, all are in...

    def test_get_timeline(self):
        """
        expect: get all 4 test posts in the global timeline, permission is granted
        because user is global admin
        """

        response = self.base_checks("GET", "/timeline", True, 200)
        self.assertIn("posts", response)

        # expect every test post to be in the response
        self.assertEqual(len(response["posts"]), 4)

        # expect the author to be enhanced with the correct profile picture
        self.assert_author_enhanced(response["posts"])

        # first post has a plan attached, expect the plan to be enhanced
        self.assert_plan_object_enhanced(response["posts"][0])

    def test_get_timeline_out_of_range(self):
        """
        expect: no posts returned because they are not within the requested time frame
        """

        # request from 2 hours ago to 1 hour ago
        response = self.base_checks(
            "GET",
            "/timeline?from={}&to={}".format(
                (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            ),
            True,
            200,
        )
        self.assertIn("posts", response)
        self.assertEqual(response["posts"], [])

    def test_get_timeline_post_with_non_existing_plan(self):
        """
        expect: since the plan_id doesnt exist anymore, the post does not include
        the plan object but the plan_id itself
        """

        # set an invalid id for the first default plan
        non_existing_plan_id = ObjectId()
        self.db.posts.update_one(
            {"_id": self.post_oids[0]}, {"$set": {"plans": [non_existing_plan_id]}}
        )

        response = self.base_checks("GET", "/timeline", True, 200)
        self.assertIn("posts", response)

        # expect every test post to be in the response
        self.assertEqual(len(response["posts"]), 4)

        # expect the author to be enhanced with the correct profile picture
        self.assert_author_enhanced(response["posts"])

        # first post has a plan attached, but the plan_id is invalid,
        # expect the plan_id to be in the response
        self.assertIn("plans", response["posts"][0])
        self.assertEqual(response["posts"][0]["plans"], [str(non_existing_plan_id)])

    def test_get_timeline_error_insufficient_permission(self):
        """
        expect: fail message because user is not global admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks("GET", "/timeline", False, 403)
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_get_space_timeline(self):
        """
        expect: only 2 posts (the one's in spaces the be returned)
        """

        # add one more pinned space post out of time frame
        self.db.posts.insert_one(
            {
                "_id": ObjectId(),
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.utcnow() + timedelta(days=1),
                "text": "pinned_space_post_admin",
                "space": self.test_space_id,
                "pinned": True,
                "wordpress_post_id": None,
                "tags": [],
                "files": [],
                "comments": [],
                "likers": [],
            }
        )

        response = self.base_checks(
            "GET", "/timeline/space/{}".format(str(self.test_space_id)), True, 200
        )
        self.assertIn("posts", response)
        self.assertIn("pinned_posts", response)

        # expect only the posts in spaces to be in the response
        # as well as the pinned post
        self.assertEqual(len(response["posts"]), 2)
        self.assertEqual(len(response["pinned_posts"]), 1)

        # expect the author to be enhanced with the correct profile picture
        self.assert_author_enhanced(response["posts"])
        self.assert_author_enhanced(response["pinned_posts"])

    def test_get_space_timeline_error_user_not_member(self):
        """
        expect: fail message because user is not member of the space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members
        self.db.spaces.update_one(
            {"_id": self.test_space_id}, {"$pull": {"members": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "GET", "/timeline/space/{}".format(str(self.test_space_id)), False, 409
        )
        self.assertEqual(response["reason"], USER_NOT_MEMBER_ERROR)

    def test_get_space_timeline_error_insufficient_permission(self):
        """
        expect: fail message because user has no permission to read the timeline
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # revoke permission to view the timeline
        self.db.space_acl.update_one(
            {"space": self.test_space_id, "username": CURRENT_USER.username},
            {"$set": {"read_timeline": False}},
        )

        response = self.base_checks(
            "GET", "/timeline/space/{}".format(str(self.test_space_id)), False, 403
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_get_user_timeline(self):
        """
        expect: only 2 posts (those where requested user is the author)
        """

        response = self.base_checks(
            "GET", "/timeline/user/{}".format(CURRENT_USER.username), True, 200
        )
        self.assertIn("posts", response)

        # expect only the posts in spaces to be in the response
        self.assertEqual(len(response["posts"]), 2)

        # expect the author to be enhanced with the correct profile picture
        self.assert_author_enhanced(response["posts"])

    def test_get_personal_timeline_not_following_not_space_member(self):
        """
        expect: only 2 posts (own ones)
        """

        # pull user from space
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_ADMIN.username,
                    "admins": CURRENT_ADMIN.username,
                }
            },
        )

        response = self.base_checks("GET", "/timeline/you", True, 200)
        self.assertIn("posts", response)

        # expect only the posts in spaces to be in the response
        self.assertEqual(len(response["posts"]), 2)

        # expect the author to be enhanced with the correct profile picture
        self.assert_author_enhanced(response["posts"])

        # expect only my own posts
        for post in response["posts"]:
            self.assertEqual(CURRENT_ADMIN.username, post["author"]["username"])

    def test_get_personal_timeline_not_following_space_member(self):
        """
        expect: 3 posts (own ones and the one in space from other user)
        """

        response = self.base_checks("GET", "/timeline/you", True, 200)
        self.assertIn("posts", response)

        # expect only the posts in spaces to be in the response
        self.assertEqual(len(response["posts"]), 3)

        # expect the author to be enhanced with the correct profile picture
        self.assert_author_enhanced(response["posts"])

        # expect only my own posts and the one from the other user that is in space
        ids = [ObjectId(post["_id"]) for post in response["posts"]]
        self.assertEqual(
            sorted(ids),
            sorted([self.post_oids[0], self.post_oids[1], self.post_oids[2]]),
        )

    def test_get_personal_timeline_following_not_space_member(self):
        """
        expect: 3 posts (own ones and the one not in space from other user)
        """

        # follow other user
        self.db.profiles.update_one(
            {"username": CURRENT_ADMIN.username},
            {"$set": {"follows": [CURRENT_USER.username]}},
        )

        # pull user from space
        self.db.spaces.update_one(
            {"_id": self.test_space_id},
            {
                "$pull": {
                    "members": CURRENT_ADMIN.username,
                    "admins": CURRENT_ADMIN.username,
                }
            },
        )

        response = self.base_checks("GET", "/timeline/you", True, 200)
        self.assertIn("posts", response)

        # expect only the posts in spaces to be in the response
        self.assertEqual(len(response["posts"]), 3)

        # expect the author to be enhanced with the correct profile picture
        self.assert_author_enhanced(response["posts"])

        # expect only my own posts and the one from the other user that is in space
        ids = [ObjectId(post["_id"]) for post in response["posts"]]
        self.assertEqual(
            sorted(ids),
            sorted([self.post_oids[0], self.post_oids[1], self.post_oids[3]]),
        )

    def test_get_personal_timeline_follow_space_member(self):
        """
        expect: all 4 posts
        """

        # follow other user
        self.db.profiles.update_one(
            {"username": CURRENT_ADMIN.username},
            {"$set": {"follows": [CURRENT_USER.username]}},
        )

        response = self.base_checks("GET", "/timeline/you", True, 200)
        self.assertIn("posts", response)

        # expect only the posts in spaces to be in the response
        self.assertEqual(len(response["posts"]), 4)

        # expect the author to be enhanced with the correct profile picture
        self.assert_author_enhanced(response["posts"])

    def test_get_new_posts(self):
        """
        expect: handler replies that there were new posts
        """

        # query for new posts in the last 30 minutes
        # plenty of time, since setup happens right before the test
        timestamp = (datetime.utcnow() - timedelta(minutes=30)).isoformat()

        response = self.base_checks(
            "GET", "/updates?from={}".format(timestamp), True, 200
        )
        self.assertIn("new_posts", response)
        self.assertTrue(response["new_posts"])

        self.assertIn("since_timestamp", response)
        self.assertEqual(response["since_timestamp"], timestamp)

    def test_get_new_posts_no_posts(self):
        """
        expect: 304 reply since there are no new posts
        """

        # set the creation dates of posts 10 days into the past
        self.db.posts.update_many(
            {},
            {
                "$set": {
                    "creation_date": (
                        datetime.utcnow() - timedelta(days=10)
                    ).isoformat()
                }
            },
        )

        # cannot use the base checks here because 304 doesnt allow sending a response body
        response = self.fetch("/updates", method="GET", allow_nonstandard_methods=True)

        # match expected response code
        self.assertEqual(response.code, 304)


class VEPlanHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.base_permission_environment_setUp()
        self.default_plan_setup()

    def tearDown(self) -> None:
        self.base_permission_environments_tearDown()
        self.db.plans.delete_many({})

        # reset locks
        global_vars.plan_write_lock_map = {}

        # delete uploaded files that were generated by tests
        fs = gridfs.GridFS(self.db)
        files = list(fs.find())
        for file in files:
            fs.delete(file._id)

        super().tearDown()

    def create_step(
        self,
        name: str,
        timestamp_from: datetime = datetime(2023, 1, 1),
        timestamp_to: datetime = datetime(2023, 1, 8),
    ) -> Step:
        """
        convenience method to create a Step object with non-default values
        """

        return Step(
            name=name,
            workload=10,
            timestamp_from=timestamp_from,
            timestamp_to=timestamp_to,
            learning_goal="test",
            learning_activity="test",
            has_tasks=True,
            tasks=[Task()],
            original_plan=ObjectId(),
        )

    def create_target_group(self, name: str) -> TargetGroup:
        """
        convenience method to create a TargetGroup object with non-default values
        """
        return TargetGroup(
            name=name,
            semester="test",
            experience="test",
            academic_course="test",
            languages=["test"],
        )

    def create_institution(self, name: str = "test") -> Institution:
        """
        convenience method to create an institution with non-default values
        """

        return Institution(
            name=name,
            school_type="test",
            country="test",
            department="test",
        )

    def create_lecture(self, name: str = "test") -> Lecture:
        """
        convenience method to create a lecture with non-default values
        """

        return Lecture(
            name=name,
            lecture_format="test",
            lecture_type="test",
            participants_amount=10,
        )

    def create_physical_mobility(self, location: str = "test") -> PhysicalMobility:
        """
        convenience method to create a physical mobility with non-default values
        """

        return PhysicalMobility(
            location=location,
            timestamp_from=datetime(2023, 1, 1),
            timestamp_to=datetime(2023, 1, 8),
        )

    def create_evaluation(self, name: str = "test") -> Evaluation:
        """
        convenience method to create an evaluation with non-default values
        """

        return Evaluation(
            username=name,
            is_graded=True,
            task_type="test",
            assessment_type="test",
            evaluation_before="test",
            evaluation_while="test",
            evaluation_after="test",
        )

    def create_individual_learning_goal(
        self, name: str = "test"
    ) -> IndividualLearningGoal:
        """
        convenience method to create an individual learning goal with non-default values
        """

        return IndividualLearningGoal(
            username=name,
            learning_goal="test",
        )

    def create_individual_learning_goal(
        self, name: str = "test"
    ) -> IndividualLearningGoal:
        """
        convenience method to create an individual learning goal with non-default values
        """

        return IndividualLearningGoal(
            username=name,
            learning_goal="test",
        )

    def default_plan_setup(self):
        # manually set up a VEPlan in the db
        self.plan_id = ObjectId()
        self.step = self.create_step("test")
        self.target_group = self.create_target_group("test")
        self.institution = self.create_institution("test")
        self.lecture = self.create_lecture("test")
        self.physical_mobility = self.create_physical_mobility("test")
        self.evaluation = self.create_evaluation("test")
        self.individual_learning_goal = self.create_individual_learning_goal("test")
        self.default_plan = {
            "_id": self.plan_id,
            "author": CURRENT_ADMIN.username,
            "read_access": [CURRENT_ADMIN.username],
            "write_access": [CURRENT_ADMIN.username],
            "creation_timestamp": datetime.now(),
            "last_modified": datetime.now(),
            "name": "test",
            "partners": [CURRENT_USER.username],
            "institutions": [self.institution.to_dict()],
            "topics": ["test", "test"],
            "lectures": [self.lecture.to_dict()],
            "major_learning_goals": ["test", "test"],
            "individual_learning_goals": [self.individual_learning_goal.to_dict()],
            "methodical_approaches": ["test"],
            "target_groups": [self.target_group.to_dict()],
            "languages": ["test", "test"],
            "evaluation": [self.evaluation.to_dict()],
            "timestamp_from": self.step.timestamp_from,
            "timestamp_to": self.step.timestamp_to,
            "involved_parties": ["test", "test"],
            "realization": "test",
            "physical_mobility": True,
            "physical_mobilities": [self.physical_mobility.to_dict()],
            "learning_env": "test",
            "checklist": [
                {
                    "username": CURRENT_ADMIN.username,
                    "technology": False,
                    "exam_regulations": False,
                }
            ],
            "duration": self.step.duration.total_seconds(),
            "workload": self.step.workload,
            "steps": [self.step.to_dict()],
            "is_good_practise": False,
            "is_good_practise_ro": False,
            "abstract": "test",
            "underlying_ve_model": "test",
            "reflection": "test",
            "literature": "test",
            "evaluation_file": None,
            "literature_files": [],
            "progress": {
                "name": "not_started",
                "institutions": "not_started",
                "topics": "not_started",
                "lectures": "not_started",
                "learning_goals": "not_started",
                "methodical_approaches": "not_started",
                "target_groups": "not_started",
                "languages": "not_started",
                "evaluation": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        }
        self.db.plans.insert_one(self.default_plan)

        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_ADMIN.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

    def json_serialize(self, dictionary: dict) -> dict:
        """
        borrowed from base handler, transforms object ids and datetimes into strings
        from any dict
        """
        for key in dictionary:
            # check for keys whose values need to be transformed
            if isinstance(dictionary[key], ObjectId):
                dictionary[key] = str(dictionary[key])
            elif isinstance(dictionary[key], datetime):
                dictionary[key] = dictionary[key].isoformat()

            # if it is a nested dict, recursively run on subdict
            # and reassemble it
            elif isinstance(dictionary[key], dict):
                dictionary[key] = self.json_serialize(dictionary[key])

            # if it is a list, there are two options:
            # either the entries in the list are ObjectIds themselves, in that
            # case transform them as str's and reassemble the list,
            # or the list contains dicts again, in which case we run recursively
            # on each of those subdicts again.
            # This can be seen as an exclusive-or, meaning mixed-lists may cause
            # strange or undesired behaviour.
            elif isinstance(dictionary[key], list):
                for elem in dictionary[key]:
                    if isinstance(elem, ObjectId):
                        dictionary[key][dictionary[key].index(elem)] = str(elem)
                    elif isinstance(elem, dict):
                        elem = self.json_serialize(elem)

        return dictionary

    def _assert_no_achievement_progress(self, username: str):
        """
        helper function to check that the operations done in the tests
        did not cause any unwanted progress in the user's achievements
        """

        # check that the update has not counted towards achievement "ve"
        user = self.db.profiles.find_one({"username": username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            self.test_profiles[username]["achievements"]["ve"]["progress"],
        )
        # check that the update has not counted towards achievement "social"
        self.assertEqual(
            user["achievements"]["social"]["progress"],
            self.test_profiles[username]["achievements"]["social"]["progress"],
        )

    def test_get_plan(self):
        """
        expect: successfully request plan by _id
        """

        response = self.base_checks(
            "GET", "/planner/get?_id={}".format(self.plan_id), True, 200
        )
        self.assertIn("plan", response)
        self.assertIsInstance(response["plan"], dict)

        response_plan = response["plan"]
        default_plan = VEPlan.from_dict(self.default_plan)
        self.assertEqual(ObjectId(response_plan["_id"]), default_plan._id)
        self.assertIn("username", response_plan["author"])
        self.assertIn("first_name", response_plan["author"])
        self.assertIn("last_name", response_plan["author"])
        self.assertIn("profile_pic", response_plan["author"])
        self.assertEqual(response_plan["author"]["username"], default_plan.author)
        self.assertEqual(
            response_plan["author"]["first_name"],
            self.test_profiles[CURRENT_ADMIN.username]["first_name"],
        )
        self.assertEqual(
            response_plan["author"]["last_name"],
            self.test_profiles[CURRENT_ADMIN.username]["last_name"],
        )
        self.assertEqual(
            response_plan["author"]["profile_pic"],
            self.test_profiles[CURRENT_ADMIN.username]["profile_pic"],
        )
        self.assertEqual(response_plan["name"], default_plan.name)
        self.assertEqual(response_plan["partners"], default_plan.partners)
        self.assertEqual(
            [Institution.from_dict(inst) for inst in response_plan["institutions"]],
            default_plan.institutions,
        )
        self.assertEqual(response_plan["topics"], default_plan.topics)
        self.assertEqual(
            [Lecture.from_dict(lecture) for lecture in response_plan["lectures"]],
            default_plan.lectures,
        )
        self.assertEqual(
            response_plan["major_learning_goals"], default_plan.major_learning_goals
        )
        self.assertEqual(
            [
                IndividualLearningGoal.from_dict(goal)
                for goal in response_plan["individual_learning_goals"]
            ],
            default_plan.individual_learning_goals,
        )
        self.assertEqual(
            response_plan["methodical_approaches"], default_plan.methodical_approaches
        )
        self.assertEqual(
            [TargetGroup.from_dict(tg) for tg in response_plan["target_groups"]],
            default_plan.target_groups,
        )
        self.assertEqual(response_plan["languages"], default_plan.languages)
        self.assertEqual(
            [
                Evaluation.from_dict(evaluation)
                for evaluation in response_plan["evaluation"]
            ],
            default_plan.evaluation,
        )
        self.assertEqual(
            datetime.fromisoformat(response_plan["timestamp_from"]),
            default_plan.timestamp_from,
        )
        self.assertEqual(
            datetime.fromisoformat(response_plan["timestamp_to"]),
            default_plan.timestamp_to,
        )
        self.assertEqual(
            response_plan["involved_parties"], default_plan.involved_parties
        )
        self.assertEqual(response_plan["realization"], default_plan.realization)
        self.assertEqual(
            response_plan["physical_mobility"], default_plan.physical_mobility
        )
        self.assertEqual(
            [
                PhysicalMobility.from_dict(pm)
                for pm in response_plan["physical_mobilities"]
            ],
            default_plan.physical_mobilities,
        )
        self.assertEqual(response_plan["learning_env"], default_plan.learning_env)
        self.assertEqual(response_plan["checklist"], default_plan.checklist)
        self.assertAlmostEqual(
            response_plan["duration"], default_plan.duration.total_seconds()
        )
        self.assertEqual(response_plan["workload"], default_plan.workload)
        self.assertEqual(
            [Step.from_dict(step) for step in response_plan["steps"]],
            default_plan.steps,
        )
        self.assertEqual(
            response_plan["is_good_practise"], default_plan.is_good_practise
        )
        self.assertEqual(
            response_plan["is_good_practise_ro"], default_plan.is_good_practise_ro
        )
        self.assertEqual(response_plan["abstract"], default_plan.abstract)
        self.assertEqual(
            response_plan["underlying_ve_model"], default_plan.underlying_ve_model
        )
        self.assertEqual(response_plan["reflection"], default_plan.reflection)
        self.assertEqual(response_plan["literature"], default_plan.literature)
        self.assertEqual(response_plan["evaluation_file"], default_plan.evaluation_file)
        self.assertEqual(
            response_plan["literature_files"], default_plan.literature_files
        )
        self.assertEqual(response_plan["progress"], default_plan.progress)
        self.assertIsNotNone(response_plan["creation_timestamp"])
        self.assertIsNotNone(response_plan["last_modified"])

    def test_get_plan_good_practise(self):
        """
        expect: successfully request plan by _id,
        access is granted because plan is a good practise example
        and therefore public
        """

        # add new good practise plan
        _id = ObjectId()
        good_practise_plan = VEPlan(
            _id=_id,
            is_good_practise=True,
        ).to_dict()
        self.db.plans.insert_one(good_practise_plan)

        response = self.base_checks(
            "GET", "/planner/get?_id={}".format(str(_id)), True, 200
        )
        self.assertIn("plan", response)
        self.assertIsInstance(response["plan"], dict)

        response_plan = response["plan"]
        good_practise_plan = VEPlan.from_dict(good_practise_plan)

        self.assertEqual(ObjectId(response_plan["_id"]), good_practise_plan._id)
        self.assertIn("username", response_plan["author"])
        self.assertIn("first_name", response_plan["author"])
        self.assertIn("last_name", response_plan["author"])
        self.assertIn("profile_pic", response_plan["author"])
        self.assertEqual(response_plan["author"]["username"], good_practise_plan.author)
        self.assertEqual(
            response_plan["author"]["first_name"],
            None,
        )
        self.assertEqual(
            response_plan["author"]["last_name"],
            None,
        )
        self.assertEqual(
            response_plan["author"]["profile_pic"],
            None,
        )
        self.assertEqual(response_plan["name"], good_practise_plan.name)
        self.assertEqual(response_plan["partners"], good_practise_plan.partners)
        self.assertEqual(
            [Institution.from_dict(inst) for inst in response_plan["institutions"]],
            good_practise_plan.institutions,
        )
        self.assertEqual(response_plan["topics"], good_practise_plan.topics)
        self.assertEqual(
            [Lecture.from_dict(lecture) for lecture in response_plan["lectures"]],
            good_practise_plan.lectures,
        )
        self.assertEqual(
            response_plan["major_learning_goals"],
            good_practise_plan.major_learning_goals,
        )
        self.assertEqual(
            [
                IndividualLearningGoal.from_dict(goal)
                for goal in response_plan["individual_learning_goals"]
            ],
            good_practise_plan.individual_learning_goals,
        )
        self.assertEqual(
            response_plan["methodical_approaches"],
            good_practise_plan.methodical_approaches,
        )
        self.assertEqual(
            [TargetGroup.from_dict(tg) for tg in response_plan["target_groups"]],
            good_practise_plan.target_groups,
        )
        self.assertEqual(response_plan["languages"], good_practise_plan.languages)
        self.assertEqual(
            [
                Evaluation.from_dict(evaluation)
                for evaluation in response_plan["evaluation"]
            ],
            good_practise_plan.evaluation,
        )
        self.assertEqual(
            response_plan["involved_parties"], good_practise_plan.involved_parties
        )
        self.assertEqual(response_plan["realization"], good_practise_plan.realization)
        self.assertEqual(
            response_plan["physical_mobility"], good_practise_plan.physical_mobility
        )
        self.assertEqual(
            [
                PhysicalMobility.from_dict(pm)
                for pm in response_plan["physical_mobilities"]
            ],
            good_practise_plan.physical_mobilities,
        )
        self.assertEqual(response_plan["learning_env"], good_practise_plan.learning_env)
        self.assertEqual(response_plan["checklist"], good_practise_plan.checklist)
        self.assertEqual(response_plan["workload"], good_practise_plan.workload)
        self.assertEqual(
            [Step.from_dict(step) for step in response_plan["steps"]],
            good_practise_plan.steps,
        )
        self.assertEqual(
            response_plan["is_good_practise"], good_practise_plan.is_good_practise
        )
        self.assertEqual(
            response_plan["is_good_practise_ro"], good_practise_plan.is_good_practise_ro
        )
        self.assertEqual(response_plan["abstract"], good_practise_plan.abstract)
        self.assertEqual(
            response_plan["underlying_ve_model"], good_practise_plan.underlying_ve_model
        )
        self.assertEqual(response_plan["reflection"], good_practise_plan.reflection)
        self.assertEqual(response_plan["literature"], good_practise_plan.literature)
        self.assertEqual(
            response_plan["evaluation_file"], good_practise_plan.evaluation_file
        )
        self.assertEqual(
            response_plan["literature_files"], good_practise_plan.literature_files
        )
        self.assertEqual(response_plan["progress"], good_practise_plan.progress)

    def test_get_plan_error_missing_key(self):
        """
        expect: fail message because request is missing _id query param
        """

        response = self.base_checks("GET", "/planner/get", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "_id")

    def test_get_plan_error_plan_doesnt_exist(self):
        """
        expect: fail message because plan doesnt exist
        """

        response = self.base_checks(
            "GET", "/planner/get?_id={}".format(str(ObjectId())), False, 409
        )
        self.assertEqual(response["reason"], PLAN_DOESNT_EXIST_ERROR)

    def test_get_plan_error_insufficient_permission(self):
        """
        expect: fail message because user has no read access to plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "GET", "/planner/get?_id={}".format(str(self.plan_id)), False, 403
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_get_available_plans(self):
        """
        expect: successfully request all plans the user is allowed to view, i.e.
        own and with read/write permissions and good practise examples
        """

        # add one more plan to db that is should not be viewable and one that is
        # viewable because its a gpe
        self.db.plans.insert_one(VEPlan(author=CURRENT_USER.username).to_dict())
        gpe_id = ObjectId()
        self.db.plans.insert_one(VEPlan(_id=gpe_id, is_good_practise=True).to_dict())

        response = self.base_checks("GET", "/planner/get_available", True, 200)
        self.assertIn("plans", response)
        self.assertIsInstance(response["plans"], list)
        self.assertEqual(len(response["plans"]), 2)
        response_ids = [plan["_id"] for plan in response["plans"]]
        self.assertIn(str(self.plan_id), response_ids)
        self.assertIn(str(gpe_id), response_ids)

    def test_get_good_practise_plans(self):
        """
        expect: successfully request all good practise plans
        """

        # add one more plan that is marked as good practise example
        _id = ObjectId()
        self.db.plans.insert_one(VEPlan(_id=_id, is_good_practise=True).to_dict())

        response = self.base_checks("GET", "/planner/get_good_practise", True, 200)
        self.assertIn("plans", response)
        self.assertIsInstance(response["plans"], list)
        self.assertEqual(len(response["plans"]), 1)
        self.assertEqual(response["plans"][0]["_id"], str(_id))

    def test_get_all_plans(self):
        """
        expect: successfully request all plans (should be only the default plan)
        """

        response = self.base_checks("GET", "/planner/get_all", True, 200)
        self.assertIn("plans", response)
        self.assertIsInstance(response["plans"], list)
        self.assertEqual(len(response["plans"]), 1)

        response_plan = response["plans"][0]
        default_plan = VEPlan.from_dict(self.default_plan)
        self.assertEqual(ObjectId(response_plan["_id"]), default_plan._id)
        self.assertIn("username", response_plan["author"])
        self.assertIn("first_name", response_plan["author"])
        self.assertIn("last_name", response_plan["author"])
        self.assertIn("profile_pic", response_plan["author"])
        self.assertEqual(response_plan["author"]["username"], default_plan.author)
        self.assertEqual(
            response_plan["author"]["first_name"],
            self.test_profiles[CURRENT_ADMIN.username]["first_name"],
        )
        self.assertEqual(
            response_plan["author"]["last_name"],
            self.test_profiles[CURRENT_ADMIN.username]["last_name"],
        )
        self.assertEqual(
            response_plan["author"]["profile_pic"],
            self.test_profiles[CURRENT_ADMIN.username]["profile_pic"],
        )
        self.assertEqual(response_plan["name"], default_plan.name)
        self.assertEqual(response_plan["partners"], default_plan.partners)
        self.assertEqual(
            [Institution.from_dict(inst) for inst in response_plan["institutions"]],
            default_plan.institutions,
        )
        self.assertEqual(response_plan["topics"], default_plan.topics)
        self.assertEqual(
            [Lecture.from_dict(lecture) for lecture in response_plan["lectures"]],
            default_plan.lectures,
        )
        self.assertEqual(
            response_plan["major_learning_goals"], default_plan.major_learning_goals
        )
        self.assertEqual(
            [
                IndividualLearningGoal.from_dict(goal)
                for goal in response_plan["individual_learning_goals"]
            ],
            default_plan.individual_learning_goals,
        )
        self.assertEqual(
            response_plan["methodical_approaches"], default_plan.methodical_approaches
        )
        self.assertEqual(
            [TargetGroup.from_dict(tg) for tg in response_plan["target_groups"]],
            default_plan.target_groups,
        )
        self.assertEqual(response_plan["languages"], default_plan.languages)
        self.assertEqual(
            [
                Evaluation.from_dict(evaluation)
                for evaluation in response_plan["evaluation"]
            ],
            default_plan.evaluation,
        )
        self.assertEqual(
            datetime.fromisoformat(response_plan["timestamp_from"]),
            default_plan.timestamp_from,
        )
        self.assertEqual(
            datetime.fromisoformat(response_plan["timestamp_to"]),
            default_plan.timestamp_to,
        )
        self.assertEqual(
            response_plan["involved_parties"], default_plan.involved_parties
        )
        self.assertEqual(response_plan["realization"], default_plan.realization)
        self.assertEqual(
            response_plan["physical_mobility"], default_plan.physical_mobility
        )
        self.assertEqual(
            [
                PhysicalMobility.from_dict(pm)
                for pm in response_plan["physical_mobilities"]
            ],
            default_plan.physical_mobilities,
        )
        self.assertEqual(response_plan["learning_env"], default_plan.learning_env)
        self.assertEqual(response_plan["checklist"], default_plan.checklist)
        self.assertAlmostEqual(
            response_plan["duration"], default_plan.duration.total_seconds()
        )
        self.assertEqual(response_plan["workload"], default_plan.workload)
        self.assertEqual(
            [Step.from_dict(step) for step in response_plan["steps"]],
            default_plan.steps,
        )
        self.assertEqual(
            response_plan["is_good_practise"], default_plan.is_good_practise
        )
        self.assertEqual(
            response_plan["is_good_practise_ro"], default_plan.is_good_practise_ro
        )
        self.assertEqual(response_plan["abstract"], default_plan.abstract)
        self.assertEqual(
            response_plan["underlying_ve_model"], default_plan.underlying_ve_model
        )
        self.assertEqual(response_plan["reflection"], default_plan.reflection)
        self.assertEqual(response_plan["literature"], default_plan.literature)
        self.assertEqual(response_plan["evaluation_file"], default_plan.evaluation_file)
        self.assertEqual(
            response_plan["literature_files"], default_plan.literature_files
        )
        self.assertEqual(response_plan["progress"], default_plan.progress)
        self.assertIsNotNone(response_plan["creation_timestamp"])
        self.assertIsNotNone(response_plan["last_modified"])

    def test_get_all_plans_error_insufficient_permissions(self):
        """
        expect: fail message because user is not an admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks("GET", "/planner/get_all", False, 403)
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_error_no_json(self):
        """
        expect: fail message because payload is not in json
        """

        response = self.base_checks(
            "POST", "/planner/insert", False, 400, body="no_json"
        )
        self.assertEqual(response["reason"], JSON_PARSING_ERROR)

    def test_post_error_invalid_object_id(self):
        """
        expect: fail message because object id has the wrong format
        """
        plan = VEPlan().to_dict()
        plan["_id"] = "test123"

        response = self.base_checks(
            "POST", "/planner/update_full", False, 400, body=self.json_serialize(plan)
        )
        self.assertEqual(response["reason"], "invalid_object_id")

    def test_post_error_missing_key(self):
        """
        expect: fail message because plan misses a required key
        """

        plan = VEPlan().to_dict()
        del plan["_id"]
        del plan["realization"]

        response = self.base_checks("POST", "/planner/insert", False, 400, body=plan)
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "realization"
        )

    def test_post_error_non_unique_steps(self):
        """
        expect: fail message because steps of the plan dont have unique names
        """

        # gotta build malformed steps attribute manually, because otherwise VEPlan.from_dict()
        # would immediately raise the error
        steps = [self.create_step("test").to_dict(), self.create_step("test").to_dict()]
        del steps[0]["_id"]
        del steps[1]["_id"]
        plan = VEPlan().to_dict()
        del plan["_id"]
        plan["steps"] = steps

        response = self.base_checks(
            "POST", "/planner/insert", False, 409, body=self.json_serialize(plan)
        )
        self.assertEqual(response["reason"], NON_UNIQUE_STEPS_ERROR)

    def test_post_error_non_unique_tasks(self):
        """
        expect: fail message because a step of the plan contains duplicate tasks
        """
        step = self.create_step("test")
        step.tasks = [Task(task_formulation="test"), Task(task_formulation="test")]
        plan = VEPlan().to_dict()
        plan["steps"] = [step.to_dict()]

        response = self.base_checks(
            "POST", "/planner/insert", False, 409, body=self.json_serialize(plan)
        )
        self.assertEqual(response["reason"], NON_UNIQUE_TASKS_ERROR)

    def test_post_insert_plan(self):
        """
        expect: successfully insert new plan
        """

        # send valid dict without id to let system create one
        plan = VEPlan(name="new").to_dict()
        del plan["_id"]

        response = self.base_checks("POST", "/planner/insert", True, 200, body=plan)
        self.assertIn("inserted_id", response)
        # use inserted id to compare plans in the db
        plan["_id"] = ObjectId(response["inserted_id"])

        # expect plan to be in the db
        db_state = self.db.plans.find_one({"_id": ObjectId(response["inserted_id"])})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertIsNotNone(db_state["creation_timestamp"])
        self.assertIsNotNone(db_state["last_modified"])
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

        # just update the field in the supplied plan for easier equality check below
        plan["author"] = CURRENT_ADMIN.username
        plan["creation_timestamp"] = plan["last_modified"] = db_state[
            "creation_timestamp"
        ]
        plan["read_access"] = [CURRENT_ADMIN.username]
        plan["write_access"] = [CURRENT_ADMIN.username]

        self.assertEqual(db_state, plan)

        # check that the insert has counted towards achievement "ve"
        # because "ve_plans"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["ve"]["progress"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # one more plan as good practice to test achievement count up for "good_practise_plans"
        plan = VEPlan(name="new", is_good_practise=True).to_dict()
        del plan["_id"]

        response = self.base_checks("POST", "/planner/insert", True, 200, body=plan)
        self.assertIn("inserted_id", response)

        # check that plan was inserted
        self.assertIsNotNone(
            self.db.plans.find_one({"_id": ObjectId(response["inserted_id"])})
        )

        # check that the insert has counted towards achievement "ve"
        # twice because "ve_plans" and "good_practice_plans"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["good_practice_plans"],
        )
        self.assertIn(
            ObjectId(response["inserted_id"]),
            user["achievements"]["tracking"]["good_practice_plans"],
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # one more plan with partners to test achievement count up for "unique_partners"
        plan = VEPlan(name="new", partners=["test", CURRENT_ADMIN.username]).to_dict()
        del plan["_id"]

        response = self.base_checks("POST", "/planner/insert", True, 200, body=plan)
        self.assertIn("inserted_id", response)

        # check that plan was inserted
        self.assertIsNotNone(
            self.db.plans.find_one({"_id": ObjectId(response["inserted_id"])})
        )

        # check that the insert has counted towards achievement "ve"
        # twice because "ve_plans" and "unique_partners" 1x
        # (test only, because CURRENT_ADMIN.username is already in the list)
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["unique_partners"],
        )
        self.assertEqual(user["achievements"]["tracking"]["unique_partners"], ["test"])
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # supplying this partner again should not count towards the achievement
        plan = VEPlan(
            name="new", partners=["test", CURRENT_ADMIN.username, "test"]
        ).to_dict()
        del plan["_id"]

        response = self.base_checks("POST", "/planner/insert", True, 200, body=plan)
        self.assertIn("inserted_id", response)

        # check that plan was inserted
        self.assertIsNotNone(
            self.db.plans.find_one({"_id": ObjectId(response["inserted_id"])})
        )

        # check that the insert has now not counted towards achievement "ve"
        # only once more because "ve_plans"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        self.assertEqual(user["achievements"]["tracking"]["unique_partners"], ["test"])

    def test_post_insert_plan_error_plan_already_exists(self):
        """
        expect: fail message because a plan with the same _id already exists
        """

        plan = VEPlan(_id=self.plan_id).to_dict()
        response = self.base_checks(
            "POST", "/planner/insert", False, 409, body=self.json_serialize(plan)
        )
        self.assertEqual(response["reason"], PLAN_ALREADY_EXISTS_ERROR)

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_insert_empty_plan(self):
        """
        expect: successfully insert a new plan with no attributes set
        except for the automations on partners, author, evaluation,
        individual_learning_goals and checklist
        """

        response = self.base_checks(
            "POST",
            "/planner/insert_empty",
            True,
            200,
            body=self.json_serialize({"name": "test_plan"}),
        )
        self.assertIn("inserted_id", response)

        # expect plan to be in the db
        db_state = self.db.plans.find_one({"_id": ObjectId(response["inserted_id"])})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertIsNotNone(db_state["creation_timestamp"])
        self.assertIsNotNone(db_state["last_modified"])
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])
        self.assertEqual(db_state["name"], "test_plan")

        # expect automations
        self.assertEqual(db_state["partners"], [CURRENT_ADMIN.username])
        self.assertIsNotNone(db_state["evaluation"])
        self.assertEqual(len(db_state["evaluation"]), 1)
        self.assertEqual(db_state["evaluation"][0]["username"], CURRENT_ADMIN.username)
        self.assertIsNotNone(db_state["individual_learning_goals"])
        self.assertEqual(len(db_state["individual_learning_goals"]), 1)
        self.assertEqual(
            db_state["individual_learning_goals"][0]["username"], CURRENT_ADMIN.username
        )
        self.assertIsNotNone(db_state["checklist"])
        self.assertEqual(len(db_state["checklist"]), 1)
        self.assertEqual(db_state["checklist"][0]["username"], CURRENT_ADMIN.username)

        # check that the insert has counted towards achievement "ve"
        # because "ve_plan"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["ve"]["progress"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )

    def test_post_update_plan(self):
        """
        expect: successfully overwrite a plan
        """

        plan = VEPlan(_id=self.plan_id, name="updated_plan")

        response = self.base_checks(
            "POST",
            "/planner/update_full",
            True,
            200,
            body=self.json_serialize(plan.to_dict()),
        )
        # expect updated_id in response
        self.assertIn("updated_id", response)
        self.assertEqual(ObjectId(response["updated_id"]), plan._id)

        # expect plan is completely overwritten (name="updated_plan", other values = defaults)
        db_state = self.db.plans.find_one({"_id": ObjectId(response["updated_id"])})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], "updated_plan")
        self.assertEqual(db_state["topics"], [])
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

        # check that the update has counted towards achievement "ve"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["ve"]["progress"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # test one more time with setting the plan to a good practise example to trigger
        # the achievement count up for "good_practice_plans" once
        plan2 = VEPlan(_id=self.plan_id, name="updated_plan", is_good_practise=True)
        response = self.base_checks(
            "POST",
            "/planner/update_full",
            True,
            200,
            body=self.json_serialize(plan2.to_dict()),
        )
        self.assertIn("updated_id", response)
        self.assertEqual(ObjectId(response["updated_id"]), plan2._id)

        # check that the update has counted towards achievement "ve"
        # twice for "ve_plans" and "good_practice_plans"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["good_practice_plans"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        self.assertIn(
            ObjectId(response["updated_id"]),
            user["achievements"]["tracking"]["good_practice_plans"],
        )

        # if we update this plan one more time, the achievement count should
        # go up only once because "ve_plans" but not for "good_practice_plans"
        plan3 = VEPlan(_id=self.plan_id, name="updated_plan", is_good_practise=True)
        response = self.base_checks(
            "POST",
            "/planner/update_full",
            True,
            200,
            body=self.json_serialize(plan3.to_dict()),
        )
        self.assertIn("updated_id", response)
        self.assertEqual(ObjectId(response["updated_id"]), plan3._id)

        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        self.assertEqual(
            user["achievements"]["tracking"]["good_practice_plans"],
            [ObjectId(response["updated_id"])],
        )

        # one more test with partners to trigger the achievement count up for "ve"
        # three times because of "ve_plans" and "unique_partners" 2x
        plan4 = VEPlan(
            _id=self.plan_id,
            name="updated_plan",
            partners=["test", "test2", CURRENT_ADMIN.username],
        )
        response = self.base_checks(
            "POST",
            "/planner/update_full",
            True,
            200,
            body=self.json_serialize(plan4.to_dict()),
        )
        self.assertIn("updated_id", response)

        # check that the update has counted towards achievement "ve"
        # because "ve_plans" and "unique_partners" 2x
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"]
            + 2 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["unique_partners"],
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        self.assertEqual(
            user["achievements"]["tracking"]["unique_partners"], ["test", "test2"]
        )

        # if we update this plan one more time, the achievement count should go
        # up only once because "ve_plans" but not for "unique_partners"
        plan5 = VEPlan(
            _id=self.plan_id,
            name="updated_plan",
            partners=["test", CURRENT_ADMIN.username],
        )
        response = self.base_checks(
            "POST",
            "/planner/update_full",
            True,
            200,
            body=self.json_serialize(plan5.to_dict()),
        )
        self.assertIn("updated_id", response)

        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )

    def test_post_upsert_plan(self):
        """
        expect: successfully upsert new plan
        """

        plan = VEPlan(
            name="upsert_this",
            is_good_practise=True,
            partners=["test", CURRENT_ADMIN.username],
        ).to_dict()
        del plan["_id"]

        response = self.base_checks(
            "POST",
            "/planner/update_full?upsert=true",
            True,
            200,
            body=self.json_serialize(plan),
        )

        self.assertIn("updated_id", response)

        # expect plan to be upserted
        db_state = self.db.plans.find_one({"_id": ObjectId(response["updated_id"])})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], plan["name"])
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])
        # but also expect the other dummy plan to still be there
        default_plan = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(default_plan)

        # check that the update has counted towards achievement "ve"
        # 3 times for "ve_plans", "good_practice_plans" and "unique_partners"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["ve"]["progress"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["good_practice_plans"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["unique_partners"],
        )

    def test_post_update_plan_error_invalid_query_param(self):
        """
        expect: fail message because the "upsert" parameter is
        neither "true" nor "false"
        """

        response = self.base_checks(
            "POST",
            "/planner/update_full?upsert=test",
            False,
            400,
            body=self.json_serialize(VEPlan().to_dict()),
        )
        self.assertEqual(response["reason"], INVALID_KEY_ERROR_SLUG + "upsert")

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_plan_error_plan_doesnt_exist(self):
        """
        expect: fail message because no plan with a matching _id is found
        and upsert is false (default)
        """

        response = self.base_checks(
            "POST",
            "/planner/update_full",
            False,
            409,
            body=self.json_serialize(VEPlan().to_dict()),
        )
        self.assertEqual(response["reason"], PLAN_DOESNT_EXIST_ERROR)

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_plan_error_insufficient_permission(self):
        """
        expect: fail message because user has no write access to the plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        plan = VEPlan(_id=self.plan_id, name="updated_plan")

        response = self.base_checks(
            "POST",
            "/planner/update_full",
            False,
            403,
            body=self.json_serialize(plan.to_dict()),
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

        self._assert_no_achievement_progress(CURRENT_USER.username)

    def test_post_update_plan_error_plan_locked(self):
        """
        expect: fail message because plan is locked by another user
        """

        # set lock to other user
        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        plan = VEPlan(_id=self.plan_id, name="updated_plan")

        response = self.base_checks(
            "POST",
            "/planner/update_full",
            False,
            403,
            body=self.json_serialize(plan.to_dict()),
        )
        self.assertEqual(response["reason"], PLAN_LOCKED_ERROR)
        self.assertEqual(response["lock_holder"], CURRENT_USER.username)

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_field_primitive_attribute(self):
        """
        expect: successfully update the value of an attribute that has a primitive type
        """

        payload = {
            "plan_id": self.plan_id,
            "field_name": "realization",
            "value": "updated_realization",
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            True,
            200,
            body=self.json_serialize(payload),
        )

        self.assertEqual(response["updated_id"], str(self.plan_id))

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

        # check that the update has counted towards achievement "ve"
        # because "ve_plans"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["ve"]["progress"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # again, but this time updating is_good_practice and triggering the achievement count up
        payload = {
            "plan_id": self.plan_id,
            "field_name": "is_good_practise",
            "value": True,
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            True,
            200,
            body=self.json_serialize(payload),
        )

        self.assertEqual(response["updated_id"], str(self.plan_id))

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["is_good_practise"], True)

        # check that the update has counted towards achievement "ve"
        # twice because "good_practice_plans" and "ve_plans"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["good_practice_plans"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        self.assertIn(
            self.plan_id, user["achievements"]["tracking"]["good_practice_plans"]
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # doing the same update again should only count up the achievement once
        # because "ve_plans"
        payload = {
            "plan_id": self.plan_id,
            "field_name": "is_good_practise",
            "value": True,
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            True,
            200,
            body=self.json_serialize(payload),
        )

        self.assertEqual(response["updated_id"], str(self.plan_id))

        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        self.assertEqual(
            user["achievements"]["tracking"]["good_practice_plans"], [self.plan_id]
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # again with partners to test achievement count up for "unique_partners"
        payload = {
            "plan_id": self.plan_id,
            "field_name": "partners",
            "value": ["test", "test2", CURRENT_ADMIN.username],
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            True,
            200,
            body=self.json_serialize(payload),
        )

        self.assertEqual(response["updated_id"], str(self.plan_id))

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)

        # check that the update has counted towards achievement "ve"
        # 3 times because "ve_plans" and "unique_partners" 2x
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"]
            + 2 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["unique_partners"],
        )
        self.assertEqual(
            user["achievements"]["tracking"]["unique_partners"], ["test", "test2"]
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # doing the same update with any of those partner again should only
        # count up the achievement once because "ve_plans"
        payload = {
            "plan_id": self.plan_id,
            "field_name": "partners",
            "value": ["test", CURRENT_ADMIN.username],
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            True,
            200,
            body=self.json_serialize(payload),
        )

        self.assertEqual(response["updated_id"], str(self.plan_id))

        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # again with checklist dict attribute
        payload = {
            "plan_id": self.plan_id,
            "field_name": "checklist",
            "value": [
                {
                    "username": CURRENT_ADMIN.username,
                    "technology": True,
                    "exam_regulations": True,
                }
            ],
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            True,
            200,
            body=self.json_serialize(payload),
        )

        self.assertEqual(response["updated_id"], str(self.plan_id))

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(
            db_state["checklist"],
            [
                {
                    "username": CURRENT_ADMIN.username,
                    "technology": True,
                    "exam_regulations": True,
                }
            ],
        )
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

        # check that the update has counted towards achievement "ve"
        # because "ve_plans"
        # now multiple level ups happened because progress reached thresholds

        # determine what level the user should be at (based on assumption that
        # the first level is reached at 10 progress points, check at profile resource)
        FIRST_LEVEL_THRESHOLD = 10

        def compute_level(progress):
            level = 0
            threshold = FIRST_LEVEL_THRESHOLD
            while progress >= threshold:
                level += 1
                threshold += threshold * 2
            return level

        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        self.assertEqual(
            user["achievements"]["ve"]["level"],
            compute_level(user["achievements"]["ve"]["progress"]),
        )
        next_threshold = FIRST_LEVEL_THRESHOLD
        for i in range(1, user["achievements"]["ve"]["level"] + 1):
            next_threshold += next_threshold * 2
        self.assertEqual(user["achievements"]["ve"]["next_level"], next_threshold)
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # again, but this time upsert
        payload = {
            "plan_id": ObjectId(),
            "field_name": "topics",
            "value": ["updated_topic", "test"],
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field?upsert=true",
            True,
            200,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["updated_id"], str(payload["plan_id"]))

        db_state = self.db.plans.find_one({"_id": ObjectId(payload["plan_id"])})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["topics"], ["updated_topic", "test"])
        self.assertEqual(db_state["realization"], None)
        self.assertEqual(db_state["steps"], [])
        self.assertEqual(db_state["last_modified"], db_state["creation_timestamp"])

        # check that the update has counted towards achievement "ve"
        # because "ve_plans"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )

    def test_post_update_field_compound_attribute(self):
        """
        expect: successfully update the value of an attribute that has an object-like type
        """

        payload = {
            "plan_id": self.plan_id,
            "field_name": "target_groups",
            "value": [
                {
                    "name": "updated_name",
                    "semester": "updated_semester",
                    "experience": "updated_experience",
                    "academic_course": "updated_academic_course",
                    "languages": ["test", "updated_languages"],
                }
            ],
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            True,
            200,
            body=self.json_serialize(payload),
        )

        self.assertEqual(response["updated_id"], str(self.plan_id))

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(len(db_state["target_groups"]), 1)
        self.assertIsInstance(db_state["target_groups"][0]["_id"], ObjectId)
        self.assertEqual(db_state["target_groups"][0]["name"], "updated_name")
        self.assertEqual(db_state["target_groups"][0]["semester"], "updated_semester")
        self.assertEqual(
            db_state["target_groups"][0]["experience"], "updated_experience"
        )
        self.assertEqual(
            db_state["target_groups"][0]["academic_course"], "updated_academic_course"
        )
        self.assertEqual(
            db_state["target_groups"][0]["languages"], ["test", "updated_languages"]
        )
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

        # check that the update has counted towards achievement "ve"
        # because "ve_plans"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["ve"]["progress"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # again, but this time upsert
        payload = {
            "plan_id": ObjectId(),
            "field_name": "target_groups",
            "value": [
                {
                    "name": "updated_name",
                    "semester": "updated_semester",
                    "experience": "updated_experience",
                    "academic_course": "updated_academic_course",
                    "languages": ["test", "updated_languages2"],
                }
            ],
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field?upsert=true",
            True,
            200,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["updated_id"], str(payload["plan_id"]))

        db_state = self.db.plans.find_one({"_id": ObjectId(payload["plan_id"])})
        self.assertIsNotNone(db_state)
        self.assertEqual(len(db_state["target_groups"]), 1)
        self.assertIsInstance(db_state["target_groups"][0]["_id"], ObjectId)
        self.assertEqual(db_state["target_groups"][0]["name"], "updated_name")
        self.assertEqual(db_state["target_groups"][0]["semester"], "updated_semester")
        self.assertEqual(
            db_state["target_groups"][0]["experience"], "updated_experience"
        )
        self.assertEqual(
            db_state["target_groups"][0]["academic_course"], "updated_academic_course"
        )
        self.assertEqual(
            db_state["target_groups"][0]["languages"], ["test", "updated_languages2"]
        )
        self.assertEqual(db_state["topics"], [])
        self.assertEqual(db_state["steps"], [])
        self.assertEqual(db_state["last_modified"], db_state["creation_timestamp"])

        # check that the update has counted towards achievement "ve"
        # because "ve_plans"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )

    def test_post_update_field_error_missing_key(self):
        """
        expect: fail message because plan_id, field_name or value is missing
        """

        # plan_id is missing
        payload = {"field_name": "realization", "value": "updated"}

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            400,
            body=self.json_serialize(payload),
        )
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "plan_id"
        )

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

        # field_name is missing
        payload = {"plan_id": self.plan_id, "value": "updated"}

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            400,
            body=self.json_serialize(payload),
        )
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "field_name"
        )

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

        # value is missing
        payload = {
            "plan_id": self.plan_id,
            "field_name": "realization",
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            400,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "value")

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_field_error_invalid_id(self):
        """
        expect: fail message because the supplied _id is not a valid ObjectId
        """

        payload = {"plan_id": "123", "field_name": "realization", "value": "updated"}

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            400,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], INVALID_OBJECT_ID)

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

        # also test an invalid object id within a compound object
        payload = {
            "plan_id": self.plan_id,
            "field_name": "target_groups",
            "value": [
                {
                    "_id": "123",
                    "name": "updated_name",
                    "semester": "updated_semester",
                    "experience": "updated_experience",
                    "academic_course": "updated_academic_course",
                    "languages": ["test", "updated_languages"],
                }
            ],
        }
        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            400,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], INVALID_OBJECT_ID)

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_field_error_unexpected_attribute(self):
        """
        expect: fail message because the supplied field name that should be updated
        does not correspond to an attribute of a VEPlan
        """

        payload = {
            "plan_id": self.plan_id,
            "field_name": "not_existing_attr",
            "value": "test",
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            400,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], "unexpected_attribute")

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_field_error_wrong_type(self):
        """
        expect: fail message because the value is of wrong type
        """

        payload = {
            "plan_id": self.plan_id,
            "field_name": "realization",
            "value": 123,
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            400,
            body=self.json_serialize(payload),
        )
        self.assertTrue(response["reason"].startswith("TypeError"))

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

        # also check for object-like attribute case
        # experience is mistakenly a list
        payload = {
            "plan_id": self.plan_id,
            "field_name": "target_groups",
            "value": [
                {
                    "_id": ObjectId(),
                    "name": "updated_name",
                    "semester": "updated_semester",
                    "experience": ["updated_experience"],
                    "academic_course": "updated_academic_course",
                    "languages": ["test", "updated_languages"],
                }
            ],
        }
        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            400,
            body=self.json_serialize(payload),
        )
        self.assertTrue(response["reason"].startswith("TypeError"))

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_field_error_missing_key_model(self):
        """
        expect: fail message because update of compound attribute misses a required key
        """

        # semester is missing
        payload = {
            "plan_id": self.plan_id,
            "field_name": "target_groups",
            "value": [
                {
                    "name": "updated_name",
                    "experience": "updated_experience",
                    "academic_course": "updated_academic_course",
                    "languages": ["test", "updated_languages"],
                }
            ],
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            400,
            body=self.json_serialize(payload),
        )
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "semester"
        )

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_field_error_non_unique_steps(self):
        """
        expect: fail message because the semantic error if multiple steps have the same name
        appears
        """

        payload = {
            "plan_id": self.plan_id,
            "field_name": "steps",
            "value": [
                {
                    "_id": ObjectId(),
                    "name": "test",
                    "workload": 0,
                    "timestamp_from": None,
                    "timestamp_to": None,
                    "duration": None,
                    "learning_goal": None,
                    "learning_activity": None,
                    "has_tasks": False,
                    "tasks": [],
                    "original_plan": None,
                },
                {
                    "_id": ObjectId(),
                    "name": "test",
                    "workload": 0,
                    "timestamp_from": None,
                    "timestamp_to": None,
                    "duration": None,
                    "learning_goal": None,
                    "learning_activity": None,
                    "has_tasks": False,
                    "tasks": [],
                    "original_plan": None,
                },
            ],
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            409,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], NON_UNIQUE_STEPS_ERROR)

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_field_error_non_unique_tasks(self):
        """
        expect: fail message because tasks in the step don't have unique task_formulations
        """

        payload = {
            "plan_id": self.plan_id,
            "field_name": "steps",
            "value": [
                {
                    "_id": ObjectId(),
                    "name": "test",
                    "workload": 0,
                    "timestamp_from": None,
                    "timestamp_to": None,
                    "duration": None,
                    "learning_goal": None,
                    "learning_activity": None,
                    "has_tasks": True,
                    "tasks": [
                        Task(task_formulation="test").to_dict(),
                        Task(task_formulation="test").to_dict(),
                    ],
                    "original_plan": None,
                },
            ],
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            409,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], NON_UNIQUE_TASKS_ERROR)

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_field_error_insufficient_permission(self):
        """
        expect: fail message because user has no write access to plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        payload = {
            "plan_id": self.plan_id,
            "field_name": "realization",
            "value": "updated_realization",
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            403,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

        self._assert_no_achievement_progress(CURRENT_USER.username)

    def test_post_update_field_error_unsupported_field(self):
        """
        expect: fail message because the field `evaluation_file` is not
        updateable via update_field
        """

        payload = {
            "plan_id": self.plan_id,
            "field_name": "evaluation_file",
            "value": "test",
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            400,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], "unsupported_field:evaluation_file")

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_field_error_plan_locked(self):
        """
        expect: fail message because plan is locked by another user
        """

        # set lock to other user
        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        payload = {
            "plan_id": self.plan_id,
            "field_name": "methodical_approaches",
            "value": ["test", "updated_methodical_approaches"],
        }

        response = self.base_checks(
            "POST",
            "/planner/update_field",
            False,
            403,
            body=self.json_serialize(payload),
        )

        self.assertEqual(response["reason"], PLAN_LOCKED_ERROR)
        self.assertEqual(response["lock_holder"], CURRENT_USER.username)

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_update_fields(self):
        """
        expect: successfully update multiple fields
        """

        payload = {
            "update": [
                {
                    "plan_id": self.plan_id,
                    "field_name": "realization",
                    "value": "updated_realization",
                },
                {
                    "plan_id": self.plan_id,
                    "field_name": "topics",
                    "value": ["updated_topic", "test"],
                },
                {
                    "plan_id": self.plan_id,
                    "field_name": "is_good_practise",
                    "value": True,
                },
                {
                    "plan_id": self.plan_id,
                    "field_name": "partners",
                    "value": ["test", CURRENT_ADMIN.username],
                },
            ]
        }

        self.base_checks(
            "POST",
            "/planner/update_fields",
            True,
            200,
            body=self.json_serialize(payload),
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertEqual(db_state["topics"], ["updated_topic", "test"])
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

        # check that the update has counted towards achievement "ve"
        # 3 times for "ve_plans", "good_practice_plans" and "unique_partners"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["ve"]["progress"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["good_practice_plans"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["unique_partners"],
        )
        self.assertIn(
            self.plan_id, user["achievements"]["tracking"]["good_practice_plans"]
        )
        self.assertIn("test", user["achievements"]["tracking"]["unique_partners"])
        prev_achievement_progress_counter = user["achievements"]["ve"]["progress"]

        # doing an update to this plan again should only count up
        # once for "ve_plans", but not "good_practice_plans" and "unique_partners" again
        payload = {
            "update": [
                {
                    "plan_id": self.plan_id,
                    "field_name": "realization",
                    "value": "updated_realization",
                },
                {
                    "plan_id": self.plan_id,
                    "field_name": "topics",
                    "value": ["updated_topic", "test"],
                },
                {
                    "plan_id": self.plan_id,
                    "field_name": "is_good_practise",
                    "value": True,
                },
                {
                    "plan_id": self.plan_id,
                    "field_name": "partners",
                    "value": ["test", CURRENT_ADMIN.username],
                },
            ]
        }

        self.base_checks(
            "POST",
            "/planner/update_fields",
            True,
            200,
            body=self.json_serialize(payload),
        )

        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )
        self.assertEqual(
            user["achievements"]["tracking"]["good_practice_plans"], [self.plan_id]
        )
        self.assertEqual(user["achievements"]["tracking"]["unique_partners"], ["test"])

    def test_post_update_fields_errors(self):
        """
        expect: one query to be successfull and the other caused an error
        """

        payload = {
            "update": [
                {
                    "plan_id": self.plan_id,
                    "field_name": "realization",
                    "value": "updated_realization",
                },
                {
                    "plan_id": self.plan_id,
                    "field_name": "topics123",  # field name is wrong, should cause unexpected_attribute
                    "value": ["updated_topic", "test"],
                },
            ]
        }

        response = self.base_checks(
            "POST",
            "/planner/update_fields",
            False,
            409,
            body=self.json_serialize(payload),
        )

        self.assertEqual(response["reason"], "operation_errors")
        self.assertIn("errors", response)
        self.assertEqual(1, len(response["errors"]))
        error = response["errors"][0]
        self.assertIn("update_instruction", error)
        self.assertIn("error_status_code", error)
        self.assertIn("error_reason", error)
        self.assertEqual(error["error_status_code"], 400)
        self.assertEqual(error["error_reason"], "unexpected_attribute")

        # realization should be updated, but topic not
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertNotEqual(db_state["topics"], ["updated_topic", "test"])

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

        # try as a separate case that a plan is locked
        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        payload = {
            "update": [
                {
                    "plan_id": self.plan_id,
                    "field_name": "methodical_approaches",
                    "value": ["test", "updated_methodical_approaches"],
                },
                {
                    "plan_id": self.plan_id,
                    "field_name": "topics",
                    "value": ["updated_topic", "test"],
                },
                {
                    "plan_id": self.plan_id,
                    "field_name": "is_good_practise",
                    "value": True,
                },
                {
                    "plan_id": self.plan_id,
                    "field_name": "partners",
                    "value": ["test", CURRENT_ADMIN.username],
                },
            ]
        }

        response = self.base_checks(
            "POST",
            "/planner/update_fields",
            False,
            409,
            body=self.json_serialize(payload),
        )

        self.assertEqual(response["reason"], "operation_errors")
        self.assertIn("errors", response)
        self.assertEqual(4, len(response["errors"]))
        self.assertIn("update_instruction", response["errors"][0])
        self.assertIn("error_status_code", response["errors"][0])
        self.assertIn("error_reason", response["errors"][0])
        self.assertEqual(response["errors"][0]["error_status_code"], 403)
        self.assertEqual(response["errors"][0]["error_reason"], PLAN_LOCKED_ERROR)
        self.assertEqual(response["errors"][0]["lock_holder"], CURRENT_USER.username)
        self.assertIn("update_instruction", response["errors"][1])
        self.assertIn("error_status_code", response["errors"][1])
        self.assertIn("error_reason", response["errors"][1])
        self.assertEqual(response["errors"][1]["error_status_code"], 403)
        self.assertEqual(response["errors"][1]["error_reason"], PLAN_LOCKED_ERROR)
        self.assertEqual(response["errors"][1]["lock_holder"], CURRENT_USER.username)

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_put_evaluation_file(self):
        """
        expect: successfully upload an evaluation file
        """

        # create file with IO Buffer
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/planner/put_evaluation_file?plan_id={}".format(str(self.plan_id)),
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        # assert file is stored in db
        fs = gridfs.GridFS(self.db)
        file = fs.find({"_id": ObjectId(response["inserted_file_id"])})
        self.assertIsNotNone(file)

        # assert that plan now has the file
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIn("evaluation_file", db_state)
        self.assertEqual(
            {
                "file_id": ObjectId(response["inserted_file_id"]),
                "file_name": file_name,
            },
            db_state["evaluation_file"],
        )

        # check that the update has counted towards achievement "ve"
        # because "ve_plans"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["ve"]["progress"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )

    def test_post_put_evaluation_file_error_missing_key(self):
        """
        expect: fail message because no file is supplied or the plan_id is missing
        """

        # missing file
        request = MultipartEncoder(fields={})

        response = self.base_checks(
            "POST",
            "/planner/put_evaluation_file?plan_id={}".format(str(self.plan_id)),
            False,
            400,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], MISSING_FILE_ERROR_SLUG + "file")

        # missing plan_id
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/planner/put_evaluation_file",
            False,
            400,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "plan_id")

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_put_evaluation_file_error_insufficient_permission(self):
        """
        expect: fail message because user has no write access to the plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        # create file with IO Buffer
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/planner/put_evaluation_file?plan_id={}".format(str(self.plan_id)),
            False,
            403,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

        # expect plan to not have the file
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["evaluation_file"], None)

        # expect file to not be stored in db
        fs = gridfs.GridFS(self.db)
        file = fs.find_one({"filename": file_name})
        self.assertIsNone(file)

        self._assert_no_achievement_progress(CURRENT_USER.username)

    def test_post_put_evaluation_file_error_plan_locked(self):
        """
        expect: fail message because plan is locked by another user
        """

        # set lock to other user
        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        # create file with IO Buffer
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/planner/put_evaluation_file?plan_id={}".format(str(self.plan_id)),
            False,
            403,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], PLAN_LOCKED_ERROR)
        self.assertEqual(response["lock_holder"], CURRENT_USER.username)

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_put_literature_file(self):
        """
        expect: successfully upload a literature file
        """

        # create file with IO Buffer
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/planner/put_literature_file?plan_id={}".format(str(self.plan_id)),
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        # assert file is stored in db
        fs = gridfs.GridFS(self.db)
        file = fs.find({"_id": ObjectId(response["inserted_file_id"])})
        self.assertIsNotNone(file)

        # assert that plan now has the file
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIn("literature_files", db_state)
        self.assertIn(
            {
                "file_id": ObjectId(response["inserted_file_id"]),
                "file_name": file_name,
            },
            db_state["literature_files"],
        )

        # check that the update has counted towards achievement "ve"
        # because "ve_plans"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["ve"]["progress"]
            + 1 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["ve_plans"],
        )

    def test_post_put_literature_file_error_missing_key(self):
        """
        expect: fail message because no file is supplied or the plan_id is missing
        """

        # missing file
        request = MultipartEncoder(fields={})

        response = self.base_checks(
            "POST",
            "/planner/put_literature_file?plan_id={}".format(str(self.plan_id)),
            False,
            400,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], MISSING_FILE_ERROR_SLUG + "file")

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

        # missing plan_id
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/planner/put_literature_file",
            False,
            400,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "plan_id")

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_put_literature_file_error_insufficient_permission(self):
        """
        expect: fail message because user has no write access to the plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        # create file with IO Buffer
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/planner/put_literature_file?plan_id={}".format(str(self.plan_id)),
            False,
            403,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

        # expect plan to not have the file
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["literature_files"], [])

        # expect file to not be stored in db
        fs = gridfs.GridFS(self.db)
        file = fs.find_one({"filename": file_name})
        self.assertIsNone(file)

        self._assert_no_achievement_progress(CURRENT_USER.username)

    def test_post_put_literature_file_error_plan_locked(self):
        """
        expect: fail message because plan is locked by another user
        """

        # set lock to other user
        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        # create file with IO Buffer
        file_name = "test_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/planner/put_literature_file?plan_id={}".format(str(self.plan_id)),
            False,
            403,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], PLAN_LOCKED_ERROR)
        self.assertEqual(response["lock_holder"], CURRENT_USER.username)

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_put_literature_file_error_maximum_files_exceeded(self):
        """
        expect: fail message because the maximum number of literature files is exceeded
        """

        # assign 5 files to the plan
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "literature_files": [
                        {"file_id": ObjectId(), "file_name": "test_file.txt"}
                        for _ in range(5)
                    ]
                }
            },
        )

        # create file with IO Buffer
        file_name = "exceeding_file.txt"
        file = io.BytesIO()
        file.write(b"this is a binary test file")
        file.seek(0)

        # encode file as formdata
        request = MultipartEncoder(fields={"file": (file_name, file, "text/plain")})

        response = self.base_checks(
            "POST",
            "/planner/put_literature_file?plan_id={}".format(str(self.plan_id)),
            False,
            409,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )
        self.assertEqual(response["reason"], MAXIMUM_FILES_EXCEEDED_ERROR)

        # expect plan to not have the file
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(len(db_state["literature_files"]), 5)
        self.assertNotIn(
            file_name,
            [
                literature_file["file_name"]
                for literature_file in db_state["literature_files"]
            ],
        )

        self._assert_no_achievement_progress(CURRENT_ADMIN.username)

    def test_post_copy_plan_author(self):
        """
        expect: successfully copy a plan because user is the author
        """

        response = self.base_checks(
            "POST",
            "/planner/copy",
            True,
            200,
            body=self.json_serialize({"plan_id": self.plan_id}),
        )

        # expect the copied plan to be in the db
        db_state = self.db.plans.find_one({"_id": ObjectId(response["copied_id"])})
        self.assertIsNotNone(db_state)
        self.assertNotEqual(db_state["_id"], self.plan_id)
        self.assertEqual(db_state["name"], self.default_plan["name"] + " (Kopie)")
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertEqual(db_state["read_access"], [CURRENT_ADMIN.username])
        self.assertEqual(db_state["write_access"], [CURRENT_ADMIN.username])

    def test_post_copy_plan_good_practise_example(self):
        """
        expect: successfully copy a plan because plan is a good practise example
        """

        # add another plan as good practise example
        plan = VEPlan(name="test_plan", is_good_practise=True).to_dict()
        self.db.plans.insert_one(plan)

        response = self.base_checks(
            "POST",
            "/planner/copy",
            True,
            200,
            body=self.json_serialize({"plan_id": plan["_id"]}),
        )

        # expect the copied plan to be in the db
        db_state = self.db.plans.find_one({"_id": ObjectId(response["copied_id"])})
        self.assertIsNotNone(db_state)
        self.assertNotEqual(db_state["_id"], plan["_id"])
        self.assertEqual(db_state["name"], plan["name"] + " (Kopie)")
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertEqual(db_state["read_access"], [CURRENT_ADMIN.username])
        self.assertEqual(db_state["write_access"], [CURRENT_ADMIN.username])

        # check that the update has not counted towards achievement "ve"
        user = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            user["achievements"]["ve"]["progress"],
            self.test_profiles[CURRENT_ADMIN.username]["achievements"]["ve"][
                "progress"
            ],
        )

    def test_post_copy_plan_write_access(self):
        """
        expect: successfully copy a plan because user has write access
        """

        # add another plan with write access for the user
        plan = VEPlan(
            name="test_plan",
            author=[CURRENT_USER.username],
            write_access=[CURRENT_ADMIN.username],
        ).to_dict()
        self.db.plans.insert_one(plan)

        response = self.base_checks(
            "POST",
            "/planner/copy",
            True,
            200,
            body=self.json_serialize({"plan_id": plan["_id"]}),
        )

        # expect the copied plan to be in the db
        db_state = self.db.plans.find_one({"_id": ObjectId(response["copied_id"])})
        self.assertIsNotNone(db_state)
        self.assertNotEqual(db_state["_id"], plan["_id"])
        self.assertEqual(db_state["name"], plan["name"] + " (Kopie)")
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertEqual(db_state["read_access"], [CURRENT_ADMIN.username])
        self.assertEqual(db_state["write_access"], [CURRENT_ADMIN.username])

    def test_post_copy_plan_error_missing_key(self):
        """
        expect: fail message because plan_id is missing
        """

        response = self.base_checks(
            "POST", "/planner/copy", False, 400, body=self.json_serialize({})
        )
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "plan_id"
        )

    def test_post_copy_plan_error_plan_doesnt_exist(self):
        """
        expect: fail message because no plan with the id exists
        """

        response = self.base_checks(
            "POST",
            "/planner/copy",
            False,
            409,
            body=self.json_serialize({"plan_id": ObjectId()}),
        )
        self.assertEqual(response["reason"], PLAN_DOESNT_EXIST_ERROR)

    def test_post_copy_plan_error_insufficient_permission(self):
        """
        expect: fail message because user has access to the plan because
        a) plan is not a good practise example
        b) user is not the author of the plan
        c) user has no write access to the plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "POST",
            "/planner/copy",
            False,
            403,
            body=self.json_serialize({"plan_id": self.plan_id}),
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_grant_read_permission(self):
        """
        expect: successfully set read permissions for the user
        """

        payload = {
            "plan_id": self.plan_id,
            "username": "another_test_user",
            "read": "true",
            "write": "false",
        }

        self.base_checks(
            "POST",
            "/planner/grant_access",
            True,
            200,
            body=self.json_serialize(payload),
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIn("another_test_user", db_state["read_access"])
        self.assertNotIn("another_test_user", db_state["write_access"])

    def test_post_grant_read_permission_error_insufficient_permission(self):
        """
        expect: fail message because current user is not the author of the plan
        and therefore cannot set access rights
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        payload = {
            "plan_id": self.plan_id,
            "username": "another_test_user",
            "read": "true",
            "write": "false",
        }

        response = self.base_checks(
            "POST",
            "/planner/grant_access",
            False,
            403,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_grant_read_permission_error_plan_doesnt_exist(self):
        """
        expect: fail message because no plan with the id exists
        """

        payload = {
            "plan_id": ObjectId(),
            "username": "another_test_user",
            "read": "true",
            "write": "false",
        }

        response = self.base_checks(
            "POST",
            "/planner/grant_access",
            False,
            409,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], PLAN_DOESNT_EXIST_ERROR)

    def test_post_grant_write_permission(self):
        """
        expect: successfully set write permissions for the user, which includes
        read permissions
        """

        payload = {
            "plan_id": self.plan_id,
            "username": "another_test_user",
            "read": "true",
            "write": "true",
        }

        self.base_checks(
            "POST",
            "/planner/grant_access",
            True,
            200,
            body=self.json_serialize(payload),
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIn("another_test_user", db_state["read_access"])
        self.assertIn("another_test_user", db_state["write_access"])

    def test_post_grant_write_permission_error_insufficient_permission(self):
        """
        expect: fail message because current user is not the author of the plan
        and therefore cannot set access rights
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        payload = {
            "plan_id": self.plan_id,
            "username": "another_test_user",
            "read": "true",
            "write": "true",
        }

        response = self.base_checks(
            "POST",
            "/planner/grant_access",
            False,
            403,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_grant_write_permission_error_plan_doesnt_exist(self):
        """
        expect: fail message because no plan with the id exists
        """

        payload = {
            "plan_id": ObjectId(),
            "username": "another_test_user",
            "read": "true",
            "write": "true",
        }

        response = self.base_checks(
            "POST",
            "/planner/grant_access",
            False,
            409,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], PLAN_DOESNT_EXIST_ERROR)

    def test_post_revoke_read_permission(self):
        """
        expect: sucessfully revoke read permission of the user, which includes write permission
        """

        # manually add another user
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$addToSet": {
                    "read_access": "another_test_user",
                    "write_access": "another_test_user",
                }
            },
        )

        payload = {
            "plan_id": self.plan_id,
            "username": "another_test_user",
            "read": "true",
            "write": "true",
        }

        self.base_checks(
            "POST",
            "/planner/revoke_access",
            True,
            200,
            body=self.json_serialize(payload),
        )

        # expect the user not to be in the read_access nor write_access list
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertNotIn("another_test_user", db_state["read_access"])
        self.assertNotIn("another_test_user", db_state["write_access"])

    def test_post_revoke_read_permission_error_insufficient_permission(self):
        """
        expect: fail message because current user is not the author of the plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        payload = {
            "plan_id": self.plan_id,
            "username": "another_test_user",
            "read": "true",
            "write": "true",
        }

        response = self.base_checks(
            "POST",
            "/planner/revoke_access",
            False,
            403,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_revoke_read_permission_error_plan_doesnt_exist(self):
        """
        expect: fail message because no plan with the id exists
        """

        payload = {
            "plan_id": ObjectId(),
            "username": "another_test_user",
            "read": "true",
            "write": "true",
        }

        response = self.base_checks(
            "POST",
            "/planner/revoke_access",
            False,
            409,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], PLAN_DOESNT_EXIST_ERROR)

    def test_post_revoke_write_permission(self):
        """
        expect: sucessfully revoke write permission, but not read
        """

        # manually add another user
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$addToSet": {
                    "read_access": "another_test_user",
                    "write_access": "another_test_user",
                }
            },
        )

        payload = {
            "plan_id": self.plan_id,
            "username": "another_test_user",
            "read": "false",
            "write": "true",
        }

        self.base_checks(
            "POST",
            "/planner/revoke_access",
            True,
            200,
            body=self.json_serialize(payload),
        )

        # expect the user not to be in the write_access, but still in the read_access list
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIn("another_test_user", db_state["read_access"])
        self.assertNotIn("another_test_user", db_state["write_access"])

    def test_post_revoke_write_permission_error_insufficient_permission(self):
        """
        expect: fail message because current user is not the author of the plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        payload = {
            "plan_id": self.plan_id,
            "username": "another_test_user",
            "read": "false",
            "write": "true",
        }

        response = self.base_checks(
            "POST",
            "/planner/revoke_access",
            False,
            403,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_revoke_write_permission_error_plan_doesnt_exist(self):
        """
        expect: fail message because no plan with the id exists
        """

        payload = {
            "plan_id": ObjectId(),
            "username": "another_test_user",
            "read": "false",
            "write": "true",
        }

        response = self.base_checks(
            "POST",
            "/planner/revoke_access",
            False,
            409,
            body=self.json_serialize(payload),
        )
        self.assertEqual(response["reason"], PLAN_DOESNT_EXIST_ERROR)

    def test_delete_plan(self):
        """
        expect: successfully delete plan
        """

        self.base_checks(
            "DELETE", "/planner/delete?_id={}".format(str(self.plan_id)), True, 200
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNone(db_state)

    def test_delete_plan_side_effect_delete_from_ve_windows(self):
        """
        expect: successfully delete plan and also delete the plan from all VEWindows
        that reference it
        """

        # insert a user with a ve_window entry that references the plan
        self.db.profiles.insert_one(
            {
                "_id": ObjectId(),
                "username": "some_other_user",
                "role": "guest",
                "follows": [],
                "bio": "test",
                "institutions": [
                    {
                        "_id": ObjectId(),
                        "name": "test",
                        "department": "test",
                        "school_type": "test",
                        "country": "test",
                    }
                ],
                "chosen_institution_id": "",
                "profile_pic": "default_profile_pic.jpg",
                "first_name": "Test",
                "last_name": "Admin",
                "gender": "male",
                "address": "test",
                "birthday": "2023-01-01",
                "experience": ["test", "test"],
                "expertise": "test",
                "languages": ["german", "english"],
                "ve_ready": True,
                "excluded_from_matching": False,
                "ve_interests": ["test", "test"],
                "ve_goals": ["test", "test"],
                "preferred_formats": ["test"],
                "research_tags": ["test"],
                "courses": [
                    {"title": "test", "academic_course": "test", "semester": "test"}
                ],
                "educations": [
                    {
                        "institution": "test",
                        "degree": "test",
                        "department": "test",
                        "timestamp_from": "2023-01-01",
                        "timestamp_to": "2023-02-01",
                        "additional_info": "test",
                    }
                ],
                "work_experience": [
                    {
                        "position": "test",
                        "institution": "test",
                        "department": "test",
                        "timestamp_from": "2023-01-01",
                        "timestamp_to": "2023-02-01",
                        "city": "test",
                        "country": "test",
                        "additional_info": "test",
                    }
                ],
                "ve_window": [
                    {
                        "plan_id": self.plan_id,
                        "title": "test",
                        "description": "test",
                    }
                ],
            }
        )

        self.base_checks(
            "DELETE", "/planner/delete?_id={}".format(str(self.plan_id)), True, 200
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNone(db_state)

        # expect the plan to be deleted from the ve_window as well
        db_state = self.db.profiles.find_one({"username": "some_other_user"})
        self.assertIsNotNone(db_state)
        self.assertEqual(len(db_state["ve_window"]), 0)

    def test_delete_plan_error_missing_key(self):
        """
        expect: fail message because request is missing _id query parameter
        """

        response = self.base_checks("DELETE", "/planner/delete", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "_id")

    def test_delete_plan_error_plan_doesnt_exist(self):
        """
        expect: fail message because no plan was found matching the _id
        """

        response = self.base_checks(
            "DELETE", "/planner/delete?_id={}".format(str(ObjectId())), False, 409
        )
        self.assertEqual(response["reason"], PLAN_DOESNT_EXIST_ERROR)

    def test_delete_plan_error_insufficient_permission(self):
        """
        expect: fail message because user is not the author of the plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "DELETE", "/planner/delete?_id={}".format(str(self.plan_id)), False, 403
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_step_by_id(self):
        """
        expect: successfully delete step from plan
        """

        self.base_checks(
            "DELETE",
            "/planner/delete_step?_id={}&step_id={}".format(
                self.plan_id, self.step._id
            ),
            True,
            200,
        )

        # expect no step in the plan after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["steps"], [])

    def test_delete_step_by_name(self):
        """
        expect: successfully delete step from plan
        """

        self.base_checks(
            "DELETE",
            "/planner/delete_step?_id={}&step_name={}".format(
                self.plan_id, self.step.name
            ),
            True,
            200,
        )

        # expect no step in the plan after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["steps"], [])

    def test_delete_step_error_missing_key(self):
        """
        fail message because _id or any of step_id or step_name is missing
        """

        response = self.base_checks("DELETE", "/planner/delete_step?", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "_id")

        response2 = self.base_checks(
            "DELETE", "/planner/delete_step?_id={}".format(ObjectId()), False, 400
        )
        self.assertEqual(
            response2["reason"], MISSING_KEY_ERROR_SLUG + "step_id_or_step_name"
        )

    def test_delete_step_error_plan_doesnt_exist(self):
        """
        expect: fail message because plan doesnt exist
        """

        response = self.base_checks(
            "DELETE",
            "/planner/delete_step?_id={}&step_id={}".format(ObjectId(), ObjectId()),
            False,
            409,
        )
        self.assertEqual(response["reason"], PLAN_DOESNT_EXIST_ERROR)

        response2 = self.base_checks(
            "DELETE",
            "/planner/delete_step?_id={}&step_name={}".format(ObjectId(), "test"),
            False,
            409,
        )
        self.assertEqual(response2["reason"], PLAN_DOESNT_EXIST_ERROR)

    def test_delete_step_error_insufficient_permission(self):
        """
        expect: fail message because user has no write access to plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True
        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        response = self.base_checks(
            "DELETE",
            "/planner/delete_step?_id={}&step_id={}".format(
                str(self.plan_id), str(self.step._id)
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

        response2 = self.base_checks(
            "DELETE",
            "/planner/delete_step?_id={}&step_name={}".format(
                str(self.plan_id), self.step.name
            ),
            False,
            403,
        )
        self.assertEqual(response2["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_step_error_plan_locked(self):
        """
        expect: fail message because plan is locked by another user
        """

        # set lock to other user
        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        # by step id
        response = self.base_checks(
            "DELETE",
            "/planner/delete_step?_id={}&step_id={}".format(
                str(self.plan_id), str(self.step._id)
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], PLAN_LOCKED_ERROR)
        self.assertEqual(response["lock_holder"], CURRENT_USER.username)

        # by step name
        response2 = self.base_checks(
            "DELETE",
            "/planner/delete_step?_id={}&step_name={}".format(
                str(self.plan_id), self.step.name
            ),
            False,
            403,
        )
        self.assertEqual(response2["reason"], PLAN_LOCKED_ERROR)
        self.assertEqual(response2["lock_holder"], CURRENT_USER.username)

    def test_delete_step_step_doesnt_exist(self):
        """
        expect: when an non-existing step_id or step_name is provided no error should appear
        because it is technically a success that no such record exists
        """

        self.base_checks(
            "DELETE",
            "/planner/delete_step?_id={}&step_id={}".format(self.plan_id, ObjectId()),
            True,
            200,
        )

        # expect step to still be there
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(len(db_state["steps"]), 1)

        self.base_checks(
            "DELETE",
            "/planner/delete_step?_id={}&step_name={}".format(
                self.plan_id, "non_existing"
            ),
            True,
            200,
        )

        # expect step to still be there
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(len(db_state["steps"]), 1)

    def test_delete_remove_evaluation_file(self):
        """
        expect: successfully remove the evaluation file from the plan and gridfs
        """

        # create a file manually
        fs = gridfs.GridFS(self.db)
        file_id = fs.put(b"test", filename="test_file")
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "evaluation_file": {"file_id": file_id, "file_name": "test_file"}
                }
            },
        )

        self.base_checks(
            "DELETE",
            "/planner/remove_evaluation_file?plan_id={}&file_id={}".format(
                str(self.plan_id), str(file_id)
            ),
            True,
            200,
        )

        # expect the file to be removed from the plan
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNone(db_state["evaluation_file"])

        # expect the file to be removed from gridfs
        self.assertFalse(fs.exists(file_id))

    def test_delete_remove_evaluation_file_error_missing_key(self):
        """
        expect: fail message because plan_id or file_id is missing
        """

        response = self.base_checks(
            "DELETE",
            "/planner/remove_evaluation_file?file_id={}".format(str(ObjectId())),
            False,
            400,
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "plan_id")

        response2 = self.base_checks(
            "DELETE",
            "/planner/remove_evaluation_file?plan_id={}".format(self.plan_id),
            False,
            400,
        )
        self.assertEqual(response2["reason"], MISSING_KEY_ERROR_SLUG + "file_id")

    def test_delete_remove_evaluation_file_error_plan_doesnt_exist(self):
        """
        expect: fail message because no plan with the id exists
        """

        # create a file manually
        fs = gridfs.GridFS(self.db)
        file_id = fs.put(b"test", filename="test_file")
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "evaluation_file": {"file_id": file_id, "file_name": "test_file"}
                }
            },
        )

        response = self.base_checks(
            "DELETE",
            "/planner/remove_evaluation_file?plan_id={}&file_id={}".format(
                str(ObjectId()), str(file_id)
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], PLAN_DOESNT_EXIST_ERROR)

    def test_delete_remove_evaluation_file_error_file_doesnt_exist(self):
        """
        expect: fail message because plan does not contain an evaluation file with
        the given file_id
        """

        response = self.base_checks(
            "DELETE",
            "/planner/remove_evaluation_file?plan_id={}&file_id={}".format(
                str(self.plan_id), str(ObjectId())
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], FILE_DOESNT_EXIST_ERROR)

    def test_delete_remove_evaluation_file_error_insufficient_permission(self):
        """
        expect: fail message because user has no write access to the plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True
        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        # create a file manually
        fs = gridfs.GridFS(self.db)
        file_id = fs.put(b"test", filename="test_file")
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "evaluation_file": {"file_id": file_id, "file_name": "test_file"}
                }
            },
        )

        response = self.base_checks(
            "DELETE",
            "/planner/remove_evaluation_file?plan_id={}&file_id={}".format(
                str(self.plan_id), str(file_id)
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_remove_evaluation_file_error_plan_locked(self):
        """
        expect: fail message because plan is locked by another user
        """

        # set lock to other user
        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        # create a file manually
        fs = gridfs.GridFS(self.db)
        file_id = fs.put(b"test", filename="test_file")
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "evaluation_file": {"file_id": file_id, "file_name": "test_file"}
                }
            },
        )

        response = self.base_checks(
            "DELETE",
            "/planner/remove_evaluation_file?plan_id={}&file_id={}".format(
                str(self.plan_id), str(file_id)
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], PLAN_LOCKED_ERROR)

    def test_delete_remove_literature_file(self):
        """
        expect: successfully remove a literature file from the plan and gridfs
        """

        # create 3 files manually
        fs = gridfs.GridFS(self.db)
        file_ids = [fs.put(b"test", filename=f"test_file_{i}") for i in range(3)]
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "literature_files": [
                        {"file_id": file_id, "file_name": f"test_file_{i}"}
                        for i, file_id in enumerate(file_ids)
                    ]
                }
            },
        )

        self.base_checks(
            "DELETE",
            "/planner/remove_literature_file?plan_id={}&file_id={}".format(
                str(self.plan_id), str(file_ids[0])
            ),
            True,
            200,
        )

        # expect the file to be removed from the plan
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state["literature_files"])
        self.assertEqual(len(db_state["literature_files"]), 2)
        self.assertNotIn(
            {"file_id": file_ids[0], "file_name": "test_file_0"},
            db_state["literature_files"],
        )

        # expect the file to be removed from gridfs
        self.assertFalse(fs.exists(file_ids[0]))

    def test_delete_remove_literature_file_error_missing_key(self):
        """
        expect: fail message because plan_id or file_id is missing
        """

        response = self.base_checks(
            "DELETE",
            "/planner/remove_literature_file?file_id={}".format(str(ObjectId())),
            False,
            400,
        )
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "plan_id")

        response2 = self.base_checks(
            "DELETE",
            "/planner/remove_literature_file?plan_id={}".format(self.plan_id),
            False,
            400,
        )
        self.assertEqual(response2["reason"], MISSING_KEY_ERROR_SLUG + "file_id")

    def test_delete_remove_literature_file_error_plan_doesnt_exist(self):
        """
        expect: fail message because no plan with the id exists
        """

        # create 3 files manually
        fs = gridfs.GridFS(self.db)
        file_ids = [fs.put(b"test", filename=f"test_file_{i}") for i in range(3)]
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "literature_files": [
                        {"file_id": file_id, "file_name": f"test_file_{i}"}
                        for i, file_id in enumerate(file_ids)
                    ]
                }
            },
        )

        response = self.base_checks(
            "DELETE",
            "/planner/remove_literature_file?plan_id={}&file_id={}".format(
                str(ObjectId()), str(file_ids[0])
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], PLAN_DOESNT_EXIST_ERROR)

    def test_delete_remove_literature_file_error_file_doesnt_exist(self):
        """
        expect: fail message because plan does not contain a literature file with
        the given file_id
        """

        response = self.base_checks(
            "DELETE",
            "/planner/remove_literature_file?plan_id={}&file_id={}".format(
                str(self.plan_id), str(ObjectId())
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], FILE_DOESNT_EXIST_ERROR)

    def test_delete_remove_literature_file_error_insufficient_permission(self):
        """
        expect: fail message because user has no write access to the plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True
        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        # create 3 files manually
        fs = gridfs.GridFS(self.db)
        file_ids = [fs.put(b"test", filename=f"test_file_{i}") for i in range(3)]
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "literature_files": [
                        {"file_id": file_id, "file_name": f"test_file_{i}"}
                        for i, file_id in enumerate(file_ids)
                    ]
                }
            },
        )

        response = self.base_checks(
            "DELETE",
            "/planner/remove_literature_file?plan_id={}&file_id={}".format(
                str(self.plan_id), str(file_ids[0])
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_delete_remove_literature_file_error_plan_locked(self):
        """
        expect: fail message because plan is locked by another user
        """

        # set lock to other user
        global_vars.plan_write_lock_map[self.plan_id] = {
            "username": CURRENT_USER.username,
            "expires": datetime.now() + timedelta(hours=1),
        }

        # create 3 files manually
        fs = gridfs.GridFS(self.db)
        file_ids = [fs.put(b"test", filename=f"test_file_{i}") for i in range(3)]
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "literature_files": [
                        {"file_id": file_id, "file_name": f"test_file_{i}"}
                        for i, file_id in enumerate(file_ids)
                    ]
                }
            },
        )

        response = self.base_checks(
            "DELETE",
            "/planner/remove_literature_file?plan_id={}&file_id={}".format(
                str(self.plan_id), str(file_ids[0])
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], PLAN_LOCKED_ERROR)


class VeInvitationHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.base_permission_environment_setUp()
        self.plan_id = ObjectId()
        invitation_id = self.default_invitation_setup()
        self.invitation_id = invitation_id

    def tearDown(self) -> None:
        super().tearDown()

        self.base_permission_environments_tearDown()
        self.db.invitations.delete_many({})
        self.db.notifications.delete_many({})
        self.db.plans.delete_many({})

    def default_invitation_setup(self) -> ObjectId:
        self.db.plans.insert_one(
            VEPlan(self.plan_id, author=CURRENT_ADMIN.username).to_dict()
        )
        self.default_invitation = {
            "plan_id": self.plan_id,
            "message": "invitation",
            "sender": CURRENT_ADMIN.username,
            "recipient": CURRENT_USER.username,
            "accepted": None,
        }
        result = self.db.invitations.insert_one(self.default_invitation)
        return result.inserted_id

    def test_post_send_ve_invitation(self):
        """
        expect: successfully send invitation
        """

        payload = {
            "message": "this_is_an_invite",
            "plan_id": str(self.plan_id),
            "username": CURRENT_USER.username,
        }

        self.base_checks("POST", "/ve_invitation/send", True, 200, body=payload)

        # expect invitation to be in db
        db_state = self.db.invitations.find_one(
            {"plan_id": self.plan_id, "message": "this_is_an_invite"}
        )
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["sender"], CURRENT_ADMIN.username)
        self.assertEqual(db_state["recipient"], CURRENT_USER.username)
        self.assertIsNone(db_state["accepted"])

        # expect invited user to have read permissions to the plan
        plan = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIn(CURRENT_USER.username, plan["read_access"])

        # expect notifiation to be stored for the invited user,
        # but not yet dispatched (== receive_state = pending)
        notification = self.db.notifications.find_one(
            {
                "payload.from": CURRENT_ADMIN.username,
                "payload.message": "this_is_an_invite",
            }
        )
        self.assertIsNotNone(notification)
        self.assertEqual(notification["payload"]["plan_id"], str(self.plan_id))
        self.assertEqual(notification["receive_state"], "pending")
        self.assertEqual(notification["to"], CURRENT_USER.username)
        self.assertEqual(notification["type"], "ve_invitation")

        # again, but this time dont include a plan
        payload2 = {
            "message": "this_is_another_invite",
            "username": CURRENT_USER.username,
            "plan_id": None,
        }
        self.base_checks("POST", "/ve_invitation/send", True, 200, body=payload2)

        # expect invitation to be in db
        db_state2 = self.db.invitations.find_one({"message": "this_is_another_invite"})
        self.assertIsNotNone(db_state2)
        self.assertEqual(db_state2["sender"], CURRENT_ADMIN.username)
        self.assertEqual(db_state2["recipient"], CURRENT_USER.username)
        self.assertIsNone(db_state2["accepted"])
        self.assertIsNone(db_state2["plan_id"])

    def test_post_send_ve_invitation_error_missing_key(self):
        """
        expect: fail message because plan_id, message or username is missing
        """

        payload = {"message": "this_is_an_invite", "plan_id": str(self.plan_id)}
        response = self.base_checks(
            "POST", "/ve_invitation/send", False, 400, body=payload
        )
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "username"
        )

        payload2 = {"message": "this_is_an_invite", "username": CURRENT_USER.username}
        response2 = self.base_checks(
            "POST", "/ve_invitation/send", False, 400, body=payload2
        )
        self.assertEqual(
            response2["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "plan_id"
        )

        payload3 = {"plan_id": str(self.plan_id), "username": CURRENT_USER.username}
        response3 = self.base_checks(
            "POST", "/ve_invitation/send", False, 400, body=payload3
        )
        self.assertEqual(
            response3["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "message"
        )

    def test_post_send_ve_invitation_error_insufficient_permissions(self):
        """
        expect: fail message because user is not the author of the appended plan
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        payload = {
            "plan_id": str(self.plan_id),
            "username": CURRENT_ADMIN.username,
            "message": "invite",
        }

        response = self.base_checks(
            "POST", "/ve_invitation/send", False, 403, body=payload
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_reply_ve_invitation(self):
        """
        expect: successfully reply to invitation
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        payload = {
            "invitation_id": str(self.invitation_id),
            "accepted": True,
        }

        self.base_checks("POST", "/ve_invitation/reply", True, 200, body=payload)

        # expect invitation to be accepted
        db_state = self.db.invitations.find_one({"_id": self.invitation_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["accepted"], True)

        # expect notifcation to be stored for the origin sender of the invitation,
        # but not yet dispatched (== receive_state = pending)
        notification = self.db.notifications.find_one(
            {
                "payload.from": CURRENT_USER.username,
                "payload.invitation_id": str(self.invitation_id),
                "type": "ve_invitation_reply",
            }
        )
        self.assertIsNotNone(notification)
        self.assertEqual(notification["receive_state"], "pending")
        self.assertEqual(notification["to"], self.default_invitation["sender"])
        self.assertEqual(notification["payload"]["accepted"], True)
        self.assertEqual(
            notification["payload"]["message"], self.default_invitation["message"]
        )

        # again, but this time decline the invitation
        payload2 = {
            "invitation_id": str(self.invitation_id),
            "accepted": False,
        }
        self.base_checks("POST", "/ve_invitation/reply", True, 200, body=payload2)

        # expect invitation to be declined
        db_state2 = self.db.invitations.find_one({"_id": self.invitation_id})
        self.assertIsNotNone(db_state2)
        self.assertEqual(db_state2["accepted"], False)

        # this time also expect read access to the associated plan to be removed
        plan = self.db.plans.find_one({"_id": self.plan_id})
        self.assertNotIn(CURRENT_USER.username, plan["read_access"])

    def test_post_reply_ve_invitation_error_missing_key(self):
        """
        expect: fail message because invitation_id or accepted is missing
        """

        payload = {"invitation_id": str(self.invitation_id)}
        response = self.base_checks(
            "POST", "/ve_invitation/reply", False, 400, body=payload
        )
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "accepted"
        )

        payload2 = {"accepted": True}
        response2 = self.base_checks(
            "POST", "/ve_invitation/reply", False, 400, body=payload2
        )
        self.assertEqual(
            response2["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "invitation_id"
        )

    def test_post_reply_ve_invitation_error_invitation_doesnt_exist(self):
        """
        expect: fail message because invitation doesnt exist
        """

        payload = {
            "invitation_id": str(ObjectId()),
            "accepted": True,
        }

        response = self.base_checks(
            "POST", "/ve_invitation/reply", False, 409, body=payload
        )
        self.assertEqual(response["reason"], INVITATION_DOESNT_EXIST_ERROR)

    def test_post_reply_ve_invitation_error_insufficient_permissions(self):
        """
        expect: fail message because current user is not the recipient of the invitation
        """

        payload = {
            "invitation_id": str(self.invitation_id),
            "accepted": True,
        }

        response = self.base_checks(
            "POST", "/ve_invitation/reply", False, 403, body=payload
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)


class ChatHandlerTest(BaseApiTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.base_permission_environment_setUp()

        self.room_id = ObjectId()
        self.message_id = ObjectId()
        self.default_message = {
            "_id": self.message_id,
            "message": "test",
            "sender": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 8, 0, 0),
            "send_states": {
                CURRENT_ADMIN.username: "acknowledged",
                "other_user": "sent",
            },
        }
        self.default_room = {
            "_id": self.room_id,
            "name": "test_room",
            "members": [CURRENT_ADMIN.username, "other_user"],
            "messages": [self.default_message],
        }
        self.db.chatrooms.insert_one(self.default_room)

    def tearDown(self) -> None:
        self.base_permission_environments_tearDown()

        self.db.chatrooms.delete_many({})

        super().tearDown()

    def test_get_get_mine(self):
        """
        expect: successfully get chatroom snippets for all rooms where
        the current user is a member
        """

        # create two more rooms, one where the user is a member and one where not
        room1 = {
            "_id": ObjectId(),
            "name": "room1",
            "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
            "messages": [],
        }
        room2 = {
            "_id": ObjectId(),
            "name": "room2",
            "members": [CURRENT_USER.username, "some_other_user"],
            "messages": [],
        }
        self.db.chatrooms.insert_many([room1, room2])

        response = self.base_checks("GET", "/chatroom/get_mine", True, 200)
        self.assertIn("rooms", response)

        snippets = response["rooms"]
        self.assertEqual(len(snippets), 2)
        self.assertIn(
            str(self.default_room["_id"]), [snippet["_id"] for snippet in snippets]
        )
        self.assertIn(str(room1["_id"]), [snippet["_id"] for snippet in snippets])

        # expect the snippet is of the correct form
        for snippet in snippets:
            if snippet["_id"] == self.room_id:
                self.assertEqual(snippet["name"], self.default_room["name"])
                self.assertEqual(snippet["members"], self.default_room["members"])
                self.assertEqual(
                    snippet["last_message"]["_id"], str(self.default_message["_id"])
                )
            elif snippet["_id"] == room1["_id"]:
                self.assertEqual(snippet["name"], room1["name"])
                self.assertEqual(snippet["members"], room1["members"])
                self.assertEqual(snippet["last_message"], None)

    def test_get_get_messages(self):
        """
        expect: successfully get all messages of the given room
        """

        # add one more message to the default room
        message = {
            "_id": ObjectId(),
            "message": "test2",
            "sender": "other_user",
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "send_states": {
                CURRENT_ADMIN.username: "sent",
                "other_user": "acknowledged",
            },
        }
        self.db.chatrooms.update_one(
            {"_id": self.room_id}, {"$push": {"messages": message}}
        )

        response = self.base_checks(
            "GET",
            "/chatroom/get_messages?room_id={}".format(str(self.room_id)),
            True,
            200,
        )

        self.assertIn("room_id", response)
        self.assertIn("messages", response)
        self.assertEqual(len(response["messages"]), 2)
        self.assertIn(
            str(self.default_message["_id"]),
            [msg["_id"] for msg in response["messages"]],
        )
        self.assertIn(str(message["_id"]), [msg["_id"] for msg in response["messages"]])

    def test_get_get_messages_error_missing_key(self):
        """
        expect: fail message because room_id is missing
        """

        response = self.base_checks("GET", "/chatroom/get_messages", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "room_id")

    def test_get_get_messages_error_insufficient_permissions(self):
        """
        expect: fail message because user is not a member of the room
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "GET",
            "/chatroom/get_messages?room_id={}".format(str(self.room_id)),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_get_get_messages_error_room_doesnt_exist(self):
        """
        expect: fail message because no room with this _id exists
        """

        response = self.base_checks(
            "GET",
            "/chatroom/get_messages?room_id={}".format(str(ObjectId())),
            False,
            409,
        )
        self.assertEqual(response["reason"], ROOM_DOESNT_EXIST_ERROR)

    def test_post_create_or_get(self):
        """
        expect: successfully create a new room or get an existing one
        """

        # this should create a new room, because there is a room with the same members,
        # but is has a name
        payload = {
            "members": [CURRENT_ADMIN.username, "other_user"],
        }
        response = self.base_checks(
            "POST", "/chatroom/create_or_get", True, 200, body=payload
        )
        self.assertIn("room_id", response)

        # expect the room to be in the db
        db_state = self.db.chatrooms.find_one({"_id": ObjectId(response["room_id"])})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], None)
        self.assertEqual(db_state["members"], payload["members"])
        self.assertEqual(db_state["messages"], [])
        self.assertNotEqual(db_state["_id"], self.room_id)

        # this time, create a new room with a name, though again with the same members
        payload2 = {
            "members": [CURRENT_ADMIN.username, "other_user"],
            "name": "another_test_room",
        }
        response2 = self.base_checks(
            "POST", "/chatroom/create_or_get", True, 200, body=payload2
        )
        self.assertIn("room_id", response2)

        # expect the room to be in the db
        db_state2 = self.db.chatrooms.find_one({"_id": ObjectId(response2["room_id"])})
        self.assertIsNotNone(db_state2)
        self.assertEqual(db_state2["name"], payload2["name"])
        self.assertEqual(db_state2["members"], payload2["members"])
        self.assertEqual(db_state2["messages"], [])
        self.assertNotEqual(db_state2["_id"], self.room_id)

        # this time, create a room with an already existing name, but different members,
        # which should also be an independent room
        payload3 = {
            "members": [CURRENT_ADMIN.username, "another_other_user"],
            "name": self.default_room["name"],
        }
        response3 = self.base_checks(
            "POST", "/chatroom/create_or_get", True, 200, body=payload3
        )
        self.assertIn("room_id", response3)

        # expect the room to be in the db
        db_state3 = self.db.chatrooms.find_one({"_id": ObjectId(response3["room_id"])})
        self.assertIsNotNone(db_state3)
        self.assertEqual(db_state3["name"], payload3["name"])
        self.assertEqual(db_state3["members"], payload3["members"])
        self.assertEqual(db_state3["messages"], [])
        self.assertNotEqual(db_state3["_id"], self.room_id)

        # and finally, get the already existing room
        payload4 = {
            "members": self.default_room["members"],
            "name": self.default_room["name"],
        }
        response4 = self.base_checks(
            "POST", "/chatroom/create_or_get", True, 200, body=payload4
        )
        self.assertIn("room_id", response4)

        # expect the room to be in the db
        db_state4 = self.db.chatrooms.find_one({"_id": ObjectId(response4["room_id"])})
        self.assertIsNotNone(db_state4)
        self.assertEqual(db_state4["name"], payload4["name"])
        self.assertEqual(db_state4["members"], payload4["members"])
        self.assertEqual(db_state4["messages"], [self.default_message])
        self.assertEqual(db_state4["_id"], self.room_id)

    def test_post_create_or_get_eroror_missing_key(self):
        """
        expect: fail message because members is missing
        """

        response = self.base_checks(
            "POST", "/chatroom/create_or_get", False, 400, body={}
        )
        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "members"
        )
