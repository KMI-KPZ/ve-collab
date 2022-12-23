import datetime
import io
import json
import logging
import os
import shutil
from typing import List

from bson import ObjectId
import gridfs
from keycloak import KeycloakAdmin, KeycloakOpenID
import pymongo
import pymongo.errors
from requests_toolbelt import MultipartEncoder
from tornado.options import options
from tornado.testing import AsyncHTTPTestCase

from resources.acl import ACL
import global_vars
from main import make_app
from model import User

# hack all loggers to not produce too much irrelevant (info) output here
for logger_name in logging.root.manager.loggerDict:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.ERROR)


MISSING_KEY_ERROR_SLUG = "missing_key:"
MISSING_KEY_HTTP_BODY_ERROR_SLUG = "missing_key_in_http_body:"
MISSING_FILE_ERROR_SLUG = "missing_file:"
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

    with open(options.config) as json_file:
        config = json.load(json_file)

    global_vars.keycloak_callback_url = config["keycloak_callback_url"]
    global_vars.domain = config["domain"]
    global_vars.keycloak_client_id = config["keycloak_client_id"]
    global_vars.cookie_secret = config["cookie_secret"]

    global_vars.mongodb_host = config["mongodb_host"]
    global_vars.mongodb_port = config["mongodb_port"]
    global_vars.mongodb_username = config["mongodb_username"]
    global_vars.mongodb_password = config["mongodb_password"]
    global_vars.mongodb_db_name = "test_db"


def tearDownModule():
    """
    after all tests from all cases have run, wipe the whole db for safety's sake
    in case any of the test cases missed to clean up.
    unittest will call this method itself.
    """
    with pymongo.MongoClient(
        global_vars.mongodb_host,
        global_vars.mongodb_port,
        username=global_vars.mongodb_username,
        password=global_vars.mongodb_password,
    ) as mongo_client:
        db = mongo_client[global_vars.mongodb_db_name]
        db.drop_collection("posts")
        db.drop_collection("spaces")
        db.drop_collection("profiles")
        db.drop_collection("global_acl")
        db.drop_collection("space_acl")
        db.drop_collection("fs.files")
        db.drop_collection("fs.chunks")



class RenderHandlerTest(AsyncHTTPTestCase):
    def get_app(self):
        return make_app(global_vars.cookie_secret)

    def setUp(self) -> None:
        super().setUp()

        # set test mode to bypass authentication as an admin
        options.test_admin = True

        self.render_endpoints = [
            "/",
            "/main",
            "/myprofile",
            "/profile/test",
            "/space/test",
            "/spaces",
            "/template",
            "/acl",
        ]

    def fetch_and_assert_is_html(self, endpoint: str):
        """
        expect: 200 response, containing a string, with an opening html tag (easy assertion that content is actual html)
        """

        response = self.fetch(endpoint)
        content = response.buffer.getvalue().decode()
        self.assertEqual(response.code, 200)
        self.assertIsInstance(content, str)
        self.assertIn("<html", content)

    def fetch_and_assert_is_302_redirect(self, endpoint: str):
        """
        expect: 302 redirect code
        """

        response = self.fetch(endpoint, follow_redirects=False)
        self.assertEqual(response.code, 302)

    def test_render_handlers_no_login_redirect(self):
        options.test_admin = False
        options.test_user = False
        for endpoint in self.render_endpoints:
            self.fetch_and_assert_is_302_redirect(endpoint)

    def test_render_handlers_success(self):
        for endpoint in self.render_endpoints:
            if endpoint == "/":
                # MainRedirectHandler is special, because also on success case we expect a redirect instead of html render
                self.fetch_and_assert_is_302_redirect(endpoint)
            else:
                self.fetch_and_assert_is_html(endpoint)


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
        self.test_space = "unittest_space"
        self.test_roles = {
            CURRENT_ADMIN.username: "admin",
            CURRENT_USER.username: "user",
        }

        self.test_profiles = {
            CURRENT_ADMIN.username: {
                "username": CURRENT_ADMIN.username,
                "role": self.test_roles[CURRENT_ADMIN.username],
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
            },
            CURRENT_USER.username: {
                "username": CURRENT_USER.username,
                "role": self.test_roles[CURRENT_USER.username],
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
                "role": "admin",
                "space": self.test_space,
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
                "role": "user",
                "space": self.test_space,
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
        # pymongo modifies parameters in place (adds _id fields), like WHAT THE FUCK!? anyway, thats why we give it a copy...
        self.db.space_acl.insert_many(
            [value.copy() for value in self.test_space_acl_rules.values()]
        )
        self.db.global_acl.insert_many(
            [value.copy() for value in self.test_global_acl_rules.values()]
        )

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
            "GET", "/space_acl/get?space={}".format(self.test_space), True, 200
        )

        self.assertIn("acl_entry", response)
        self.assertEqual(
            response["acl_entry"], self.test_space_acl_rules[CURRENT_ADMIN.username]
        )

    def test_get_space_acl_other_role(self):
        """
        expect: acl entry of CURRENT_USER instead of CURRENT_ADMIN
        """

        response = self.base_checks(
            "GET",
            "/space_acl/get?space={}&role={}".format(
                self.test_space, self.test_roles[CURRENT_USER.username]
            ),
            True,
            200,
        )

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

    def test_get_space_acl_error_user_has_no_role(self):
        """
        expect: fail message because user has no role
        """

        self.db.profiles.delete_many({})

        response = self.base_checks(
            "GET", "/space_acl/get?space={}".format(self.test_space), False, 409
        )

        self.assertEqual(response["reason"], "user_has_no_role")

    def test_get_space_acl_all(self):
        """
        expect: list of all acl entries, matching those in setup
        """

        response = self.base_checks(
            "GET", "/space_acl/get_all?space={}".format(self.test_space), True, 200
        )

        self.assertIn("acl_entries", response)
        self.assertEqual(
            response["acl_entries"],
            [value for value in self.test_space_acl_rules.values()],
        )

    def test_get_space_acl_all_error_no_space(self):
        """
        expect: fail message because space doesnt exist
        """

        # explicitely switch to user mode for this test, because space existence is only checked if user is not global admin (--> might be space admin)
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "GET",
            "/space_acl/get_all?space={}".format("not_existing_space"),
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
            "GET", "/space_acl/get_all?space={}".format(self.test_space), False, 403
        )

        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_acl_update(self):
        """
        expect: updated entries get persisted into the db
        """

        updated_acl_entry = {
            "role": self.test_roles[CURRENT_USER.username],
            "space": self.test_space,
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
            {"role": self.test_roles[CURRENT_USER.username]}
        )

        # for equality checks, delete the id
        del db_state["_id"]

        self.assertIn("role", db_state)
        self.assertEqual(db_state, updated_acl_entry)

    def test_post_space_acl_update_error_no_admin(self):
        """
        expect: fail message because user is not an admin
        """

        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        # have to include the update payload here, because acl checks for space admin, therefore space has to be included
        updated_acl_entry = {
            "role": self.test_roles[CURRENT_USER.username],
            "space": self.test_space,
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
            "role": self.test_roles[CURRENT_USER.username],
            "space": self.test_space,
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
            "role": self.test_roles[CURRENT_USER.username],
            "space": self.test_space,
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

    def test_post_space_acl_update_error_role_doesnt_exist(self):
        """
        expect: fail message because the role doesnt exist
        """

        updated_acl_entry = {
            "role": "non_existent_role",
            "space": self.test_space,
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

        self.assertEqual(response["reason"], "role_doesnt_exist")

    def test_post_space_acl_update_error_space_doesnt_exist(self):
        """
        expect: fail message because the space doesnt exist
        """

        updated_acl_entry = {
            "role": self.test_roles[CURRENT_USER.username],
            "space": "non_existing_space",
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
        expect: fail message because the admin role should not be modifiable
        """

        updated_acl_entry = {
            "role": "admin",
            "space": self.test_space,
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

        # also expect a corresponding space acl entry to be created (in all spaces, i.e. only in the test space here)
        space_acl_db_state = self.db.space_acl.find_one(
            {"role": "guest", "space": self.test_space}
        )
        self.assertNotEqual(space_acl_db_state, None)

    def test_acl_entry_creation_on_role_creation(self):
        """
        expect: creating a new role via update/upsert should also create a corresponding acl entry
        """

        new_role = {"username": CURRENT_USER.username, "role": "new_role"}

        self.base_checks("POST", "/role/update", True, 200, body=new_role)

        # expect a corresponding global acl entry to be created
        global_acl_db_state = self.db.global_acl.find_one({"role": "new_role"})
        self.assertNotEqual(global_acl_db_state, None)

        # also expect a corresponding space acl entry to be created (in all spaces, i.e. only in the test space here)
        space_acl_db_state = self.db.space_acl.find_one(
            {"role": "new_role", "space": self.test_space}
        )
        self.assertNotEqual(space_acl_db_state, None)

    def test_cleanup_unused_acl_rules(self):
        """
        expect: removing all roles should cleanup the full acl
        according to the cleanup procedure removing any entries,
        that no longer have a matching role or space
        """

        self.db.profiles.delete_many({})

        with ACL() as acl_manager:
            acl_manager._cleanup_unused_rules()

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

        # delete uploaded files that were generated by file-repo tests
        fs = gridfs.GridFS(self.db)
        files = list(fs.find())
        for file in files:
            fs.delete(file._id)

        super().tearDown()

    def test_post_create_post(self):
        """
        expect: successfully create a new post
        """

        request_json = {
            "text": "unittest_test_post",
            "tags": json.dumps(["tag1", "tag2"]),
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
            "files",
        ]
        self.assertTrue(all(key in db_state for key in expected_keys))
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertEqual(db_state["text"], request_json["text"])
        self.assertIsNone(db_state["space"])
        self.assertFalse(db_state["pinned"])
        self.assertIsNone(db_state["wordpress_post_id"])
        self.assertEqual(db_state["tags"], json.loads(request_json["tags"]))
        self.assertEqual(db_state["files"], [])

    def test_post_create_post_space(self):
        """
        expect: successful post creation into space
        """

        request_json = {
            "text": "unittest_test_post",
            "tags": json.dumps(["tag1", "tag2"]),
            "space": self.test_space,
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
            "files",
        ]
        self.assertTrue(all(key in db_state for key in expected_keys))
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertEqual(db_state["text"], request_json["text"])
        self.assertEqual(db_state["space"], self.test_space)
        self.assertFalse(db_state["pinned"])
        self.assertIsNone(db_state["wordpress_post_id"])
        self.assertEqual(db_state["tags"], json.loads(request_json["tags"]))
        self.assertEqual(db_state["files"], [])

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
            "space": self.test_space,
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
            "files",
        ]
        self.assertTrue(all(key in db_state for key in expected_keys))
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertEqual(db_state["text"], request_json["text"])
        self.assertEqual(db_state["space"], self.test_space)
        self.assertFalse(db_state["pinned"])
        self.assertIsNone(db_state["wordpress_post_id"])
        self.assertEqual(db_state["tags"], json.loads(request_json["tags"]))
        self.assertEqual(db_state["files"], [file._id])

        # expect file to be in space as well

        space_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertIn("files", space_state)
        self.assertIn(
            {
                "author": CURRENT_ADMIN.username,
                "file_id": file._id,
                "manually_uploaded": False,
            },
            space_state["files"],
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
            "space": self.test_space,
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

    def test_post_create_post_error_space_doesnt_exist(self):
        """
        expect: fail message, because space doesnt exist in which the post should land
        """

        request_json = {
            "text": "unittest_test_post",
            "tags": json.dumps(["tag1", "tag2"]),
            "space": "non_existent_space",
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
            {"name": self.test_space}, {"$addToSet": {"admins": CURRENT_USER.username}}
        )

        # manually insert test post (into space this time)
        oid = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": oid,
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "files": [_id],
            }
        )
        self.db.spaces.update_one(
            {"name": self.test_space},
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
            self.db.spaces.find_one({"name": self.test_space})["files"], []
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space,
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

    def assert_comments_empty(self):
        # assert that comments are empty after the successful delete
        db_state = self.db.posts.find_one({"_id": self.post_oid})
        self.assertEqual(db_state["comments"], [])

    def test_post_comment(self):
        """
        expect: successfully add comment to a post
        """

        request = {"post_id": str(self.post_oid), "text": "test_comment"}

        self.base_checks("POST", "/comment", True, 200, body=request)

        db_state = self.db.posts.find_one({"_id": self.post_oid})

        # assert exactly one comment to the post that matches the text in the request
        self.assertIn("comments", db_state)
        self.assertEqual(len(db_state["comments"]), 1)
        self.assertEqual(db_state["comments"][0]["text"], request["text"])

    def test_post_comment_error_missing_post_id(self):
        """
        expect: fail message because post_id is not in the request
        """

        request = {"text": "test_comment"}

        response = self.base_checks("POST", "/comment", False, 400, body=request)

        self.assertEqual(
            response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "post_id"
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
            {"role": self.test_roles[CURRENT_USER.username], "space": self.test_space},
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
                        "creation_date": datetime.datetime.now(),
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
                        "creation_date": datetime.datetime.now(),
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
                        "creation_date": datetime.datetime.now(),
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
                        "creation_date": datetime.datetime.now(),
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
            {"name": self.test_space}, {"$addToSet": {"admins": CURRENT_USER.username}}
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
                        "creation_date": datetime.datetime.now(),
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
                        "creation_date": datetime.datetime.now(),
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
                        "creation_date": datetime.datetime.now(),
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
                "creation_date": datetime.datetime.now(),
                "text": "initial_post_text",
                "space": self.test_space,
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
            "creation_date": datetime.datetime.now(),
            "text": "initial_post_text",
            "space": self.test_space,
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

        self.base_checks("POST", "/repost", True, 200, body=request)

        db_state = self.db.posts.find_one({"repostText": request["text"]})
        self.assertNotEqual(db_state, None)

    def test_post_create_repost_space(self):
        """
        expect: successfully create repost
        """

        request = {
            "post_id": str(self.post_oid),
            "text": "test_repost",
            "space": self.test_space,
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
            "space": self.test_space,
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
            "space": "non_existing_space",
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
        post["creation_date"] = datetime.datetime.now()
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
        post["creation_date"] = datetime.datetime.now()
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
        post["creation_date"] = datetime.datetime.now()
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
        post["creation_date"] = datetime.datetime.now()
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
        post["space"] = self.test_space
        post["isRepost"] = True
        post["repostAuthor"] = CURRENT_ADMIN.username
        post["repostText"] = "test_repost"
        post["originalCreationDate"] = post["creation_date"]
        post["creation_date"] = datetime.datetime.now()
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
        post["space"] = self.test_space
        post["isRepost"] = True
        post["repostAuthor"] = CURRENT_USER.username
        post["repostText"] = "test_repost"
        post["originalCreationDate"] = post["creation_date"]
        post["creation_date"] = datetime.datetime.now()
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
            "creation_date": datetime.datetime.now(),
            "text": "initial_post_text",
            "space": self.test_space,
            "pinned": False,
            "wordpress_post_id": None,
            "tags": [],
            "files": [],
            "comments": [
                {
                    "_id": self.comment_oid,
                    "author": CURRENT_USER.username,
                    "creation_date": datetime.datetime.now(),
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
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
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
            {"_id": self.post_oid}, {"$set": {"space": "not_existing"}}
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
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
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
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
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
            {"_id": self.post_oid}, {"$set": {"space": "not_existing"}}
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
            {"name": self.test_space}, {"$pull": {"admins": CURRENT_ADMIN.username}}
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
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
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
            {"_id": self.post_oid}, {"$set": {"space": "not_existing_space"}}
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
            {"name": self.test_space}, {"$pull": {"admins": CURRENT_ADMIN.username}}
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
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
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
            {"_id": self.post_oid}, {"$set": {"space": "not_existing"}}
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
    def setUp(self) -> None:
        super().setUp()

        # build search indices
        self.db.posts.create_index(
            [("text", pymongo.TEXT), ("tags", pymongo.TEXT), ("files", pymongo.TEXT)],
            name="posts",
        )
        self.db.profiles.create_index(
            [
                ("bio", pymongo.TEXT),
                ("institution", pymongo.TEXT),
                ("projects", pymongo.TEXT),
                ("first_name", pymongo.TEXT),
                ("last_name", pymongo.TEXT),
                ("gender", pymongo.TEXT),
                ("address", pymongo.TEXT),
                ("birthday", pymongo.TEXT),
                ("experience", pymongo.TEXT),
                ("education", pymongo.TEXT),
                ("username", pymongo.TEXT),
            ],
            name="profiles",
        )

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
                    "institution": "test",
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
            "creation_date": datetime.datetime.now(),
            "text": "test",
            "space": self.test_space,
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [
                {
                    "_id": self.comment_oid,
                    "author": CURRENT_USER.username,
                    "creation_date": datetime.datetime.now(),
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
                    "institution": "test",
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
            "creation_date": datetime.datetime.now(),
            "text": "test",
            "space": self.test_space,
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [
                {
                    "_id": self.comment_oid,
                    "author": CURRENT_USER.username,
                    "creation_date": datetime.datetime.now(),
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
            {"name": self.test_space}, {"$pull": {"members": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/info?name={}".format(self.test_space),
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
            {"name": self.test_space}, {"$set": {"invisible": True}}
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/info?name={}".format(self.test_space),
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
            {"name": self.test_space},
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
            "/spaceadministration/info?name={}".format(self.test_space),
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
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "name")

    def test_get_space_infor_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "GET",
            "/spaceadministration/info?name={}".format("not_existing_space"),
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
            {"name": self.test_space},
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
            "/spaceadministration/info?name={}".format(self.test_space),
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
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "GET", "/spaceadministration/pending_invites", True, 200
        )
        self.assertIn("pending_invites", response)
        self.assertIn(self.test_space, response["pending_invites"])

    def test_get_space_join_requests_global_admin(self):
        """
        expect: get list of join requests for space, permission is granted because
        user is global admin
        """

        # remove user from members and set him as join requested
        self.db.spaces.update_one(
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"requests": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/join_requests?name={}".format(self.test_space),
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
            {"name": self.test_space},
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
            "/spaceadministration/join_requests?name={}".format(self.test_space),
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
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "name")

    def test_get_space_join_requests_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "GET",
            "/spaceadministration/join_requests?name={}".format("not_existing_space"),
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
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_ADMIN.username},
                "$push": {
                    "requests": CURRENT_ADMIN.username,
                },
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/join_requests?name={}".format(self.test_space),
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
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {
                    "invites": CURRENT_USER.username,
                },
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/invites?name={}".format(self.test_space),
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
            {"name": self.test_space},
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
            "/spaceadministration/invites?name={}".format(self.test_space),
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
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "name")

    def test_get_space_invites_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "GET",
            "/spaceadministration/invites?name={}".format("not_existing_space"),
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
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_ADMIN.username},
                "$push": {"invites": CURRENT_ADMIN.username},
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/invites?name={}".format(self.test_space),
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
            {"name": self.test_space},
            {
                "$set": {
                    "files": [{"author": CURRENT_ADMIN.username, "file_id": file_id}]
                }
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/files?name={}".format(self.test_space),
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
            "/spaceadministration/files?name={}".format(self.test_space),
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
            "/spaceadministration/files?name={}".format("not_existing_space"),
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
            {"name": self.test_space},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                    "admins": CURRENT_USER.username,
                }
            },
        )

        response = self.base_checks(
            "GET",
            "/spaceadministration/files?name={}".format(self.test_space),
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
            "/spaceadministration/files?name={}".format(self.test_space),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_create_space(self):
        """
        expect: successfully create new space and corresponding space acl entries
        """

        new_space_name = "new_space"

        self.base_checks(
            "POST",
            "/spaceadministration/create?name={}".format(new_space_name),
            True,
            200,
        )

        # expect record for the space to be created
        db_state = self.db.spaces.find_one({"name": new_space_name})
        self.assertIsNotNone(db_state)

        # expect user to be member and admin (because he created the space)
        self.assertIn("members", db_state)
        self.assertIn(CURRENT_ADMIN.username, db_state["members"])
        self.assertIn("admins", db_state)
        self.assertIn(CURRENT_ADMIN.username, db_state["admins"])

        # expect space_acl roles to be created
        space_acl_records = self.db.space_acl.find({"space": new_space_name})
        for role in self.test_roles.values():
            self.assertTrue(any(role == record["role"] for record in space_acl_records))

    def test_post_create_space_invisible(self):
        """
        expect: successfully create invisible space
        """

        new_space_name = "new_space"

        self.base_checks(
            "POST",
            "/spaceadministration/create?name={}&invisible=true".format(new_space_name),
            True,
            200,
        )

        # expect record for the space to be created
        db_state = self.db.spaces.find_one({"name": new_space_name})
        self.assertIsNotNone(db_state)
        self.assertTrue(db_state["invisible"])

    def test_post_create_space_joinable(self):
        """
        expect: successfully create joinable (=public) space
        """

        new_space_name = "new_space"

        self.base_checks(
            "POST",
            "/spaceadministration/create?name={}&joinable=true".format(new_space_name),
            True,
            200,
        )

        # expect record for the space to be created
        db_state = self.db.spaces.find_one({"name": new_space_name})
        self.assertIsNotNone(db_state)
        self.assertTrue(db_state["joinable"])

    def test_post_create_space_invisible_and_joinable(self):
        """
        expect: successfully create invisible and joinable space
        """

        new_space_name = "new_space"

        self.base_checks(
            "POST",
            "/spaceadministration/create?name={}&invisible=true&joinable=true".format(
                new_space_name
            ),
            True,
            200,
        )

        # expect record for the space to be created
        db_state = self.db.spaces.find_one({"name": new_space_name})
        self.assertIsNotNone(db_state)
        self.assertTrue(db_state["invisible"])
        self.assertTrue(db_state["joinable"])

    def test_post_create_space_error_no_name(self):
        """
        expect: fail message because request misses "name" parameter
        """

        response = self.base_checks("POST", "/spaceadministration/create", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "name")

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

    def test_post_create_space_error_space_name_already_exists(self):
        """
        expect: fail message because a space with the same name already exists
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/create?name={}".format(self.test_space),
            False,
            409,
        )
        self.assertEqual(response["reason"], "space_name_already_exists")

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
            {"name": self.test_space},
            {"$pull": {"members": CURRENT_USER.username}, "$set": {"joinable": True}},
        )

        # unset role permission to join any space
        self.db.space_acl.update_one(
            {"role": self.test_roles[CURRENT_USER.username], "space": self.test_space},
            {"$set": {"join_space": False}},
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/join?name={}".format(self.test_space),
            True,
            200,
        )

        # expect joined response
        self.assertIn("join_type", response)
        self.assertEqual(response["join_type"], "joined")

        # expect user to be a member now
        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertIn(CURRENT_USER.username, db_state["members"])

    def test_post_join_space_role_permission(self):
        """
        expect: successfully join space because user has permission to join any space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # remove user from member list first
        self.db.spaces.update_one(
            {"name": self.test_space}, {"$pull": {"members": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/join?name={}".format(self.test_space),
            True,
            200,
        )

        # expect joined response
        self.assertIn("join_type", response)
        self.assertEqual(response["join_type"], "joined")

        # expect user to be a member now
        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertIn(CURRENT_USER.username, db_state["members"])

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
            {"name": self.test_space}, {"$pull": {"members": CURRENT_USER.username}}
        )

        # revoke join permision for user
        self.db.space_acl.update_one(
            {"space": self.test_space, "role": self.test_roles[CURRENT_USER.username]},
            {"$set": {"join_space": False}},
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/join?name={}".format(self.test_space),
            True,
            200,
        )

        # expect requested_join response
        self.assertIn("join_type", response)
        self.assertEqual(response["join_type"], "requested_join")

        # expect user to be in the requests now
        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertIn(CURRENT_USER.username, db_state["requests"])

    def test_post_join_space_error_no_name(self):
        """
        expect: fail message because request misses "name" parameter
        """

        response = self.base_checks("POST", "/spaceadministration/join", False, 400)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "name")

    def test_post_join_space_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/join?name={}".format("not_existing_space"),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_join_space_error_user_already_member(self):
        """
        expect: fail message because user is already a member of the space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "POST",
            "/spaceadministration/join?name={}".format(self.test_space),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_ALREADY_MEMBER_ERROR)

    def test_post_space_add_admin_global_admin(self):
        """
        expect: successfully add another user as admin, permission is granted
        because user is global admin
        """

        # pull user from space admins to trigger global admin privilege
        self.db.spaces.update_one(
            {"name": self.test_space}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        self.base_checks(
            "POST",
            "/spaceadministration/add_admin?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertIn(CURRENT_USER.username, db_state["admins"])

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
            {"name": self.test_space}, {"$set": {"admins": [CURRENT_USER.username]}}
        )

        self.base_checks(
            "POST",
            "/spaceadministration/add_admin?name={}&user={}".format(
                self.test_space, CURRENT_ADMIN.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertIn(CURRENT_ADMIN.username, db_state["admins"])

    def test_post_space_add_admin_error_no_user(self):
        """
        expect: fail message because request misses "user" parameter
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/add_admin?name={}".format(self.test_space),
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
            "/spaceadministration/add_admin?name={}&user={}".format(
                "not_existing_space", CURRENT_ADMIN.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_add_admin_error_user_not_member(self):
        """
        expect: fail message because is not member of the space and thus
        cannot be set as an admin
        """

        self.db.spaces.update_one(
            {"name": self.test_space}, {"$pull": {"members": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/add_admin?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_NOT_MEMBER_ERROR)

    def test_post_space_add_admin_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "POST",
            "/spaceadministration/add_admin?name={}&user={}".format(
                self.test_space, CURRENT_ADMIN.username
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_description_global_admin(self):
        """
        expect: successfully edit description of space, permission is granted
        because user is global admin
        """

        # pull user from space admins to trigger global admin privileges
        self.db.spaces.update_one(
            {"name": self.test_space}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        request_json = {
            "space_description": "updated_space_text",
        }
        request = MultipartEncoder(fields=request_json)

        self.base_checks(
            "POST",
            "/spaceadministration/space_picture?name={}".format(self.test_space),
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertEqual(
            db_state["space_description"], request_json["space_description"]
        )

    def test_post_space_description_space_admin(self):
        """
        expect: successfully edit description of space, permission is granted
        because user is global admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        self.db.spaces.update_one(
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
        )

        request_json = {
            "space_description": "updated_space_text",
        }
        request = MultipartEncoder(fields=request_json)

        self.base_checks(
            "POST",
            "/spaceadministration/space_picture?name={}".format(self.test_space),
            True,
            200,
            headers={"Content-Type": request.content_type},
            body=request.to_string(),
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
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
            "/spaceadministration/space_picture?name={}".format("not_existing_space"),
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
            {"name": self.test_space}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        request_json = {
            "space_description": "updated_space_text",
        }
        request = MultipartEncoder(fields=request_json)

        response = self.base_checks(
            "POST",
            "/spaceadministration/space_picture?name={}".format(self.test_space),
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
            {"name": self.test_space},
            {
                "$pull": {
                    "admins": CURRENT_ADMIN.username,
                    "members": CURRENT_USER.username,
                }
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/invite?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
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
            {"name": self.test_space},
            {
                "$set": {"admins": [CURRENT_USER.username]},
                "$pull": {"members": CURRENT_ADMIN.username},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/invite?name={}&user={}".format(
                self.test_space, CURRENT_ADMIN.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertIn(CURRENT_ADMIN.username, db_state["invites"])

    def test_post_space_invite_error_no_user(self):
        """
        expect: fail message because request misses "user" parameter
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/invite?name={}".format(self.test_space),
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
            "/spaceadministration/invite?name={}&user={}".format(
                "not_existing_space", CURRENT_ADMIN.username
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
            "/spaceadministration/invite?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
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
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_ADMIN.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/invite?name={}&user={}".format(
                self.test_space, CURRENT_ADMIN.username
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
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/accept_invite?name={}".format(self.test_space),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertIn(CURRENT_USER.username, db_state["members"])

    def test_post_space_accept_invite_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as invited
        self.db.spaces.update_one(
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/accept_invite?name={}".format("not_existing_space"),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_accept_invite_error_user_not_invited(self):
        """
        expect: fail message because user wasnt event invited into the space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members, but dont invite him either
        self.db.spaces.update_one(
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/accept_invite?name={}".format(self.test_space),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_NOT_INVITED_ERROR)

    def test_post_space_decline_invite(self):
        """
        expect: current user declines invite and will not become member of the space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # set user as invited
        self.db.spaces.update_one(
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/decline_invite?name={}".format(self.test_space),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
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
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_USER.username},
                "$push": {"invites": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/decline_invite?name={}".format("not_existing_space"),
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
            {"name": self.test_space},
            {
                "$pull": {"members": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/decline_invite?name={}".format(self.test_space),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_NOT_INVITED_ERROR)

    def test_post_space_accept_request_global_admin(self):
        """
        expect: successfully accept join request of a user, making him a member
        permission is granted because current user is global admin
        """

        # pull user from members and set him as requested
        # also pull current user from admin to trigger global admin privileges
        self.db.spaces.update_one(
            {"name": self.test_space},
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
            "/spaceadministration/accept_request?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertIn(CURRENT_USER.username, db_state["members"])

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
            {"name": self.test_space},
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
            "/spaceadministration/accept_request?name={}&user={}".format(
                self.test_space, CURRENT_ADMIN.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertIn(CURRENT_ADMIN.username, db_state["members"])

    def test_post_space_accept_request_error_no_user(self):
        """
        expect: fail message because request misses "user" parameter
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/accept_request?name={}".format(self.test_space),
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
            "/spaceadministration/accept_request?name={}&user={}".format(
                "not_existing_space", CURRENT_ADMIN.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], SPACE_DOESNT_EXIST_ERROR)

    def test_post_space_accept_request_error_user_didnt_request(self):
        """
        expect: fail message because user didnt even request to join the space
        """

        # pull user from members, but dont set join request
        self.db.spaces.update_one(
            {"name": self.test_space},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                }
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/accept_request?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
            ),
            False,
            409,
        )
        self.assertEqual(response["reason"], USER_DIDNT_REQUEST_TO_JOIN_ERROR)

    def test_post_space_accept_request_error_insufficient_permission(self):
        """
        expect: fail message because user is neither global admin nor space admin
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members and set him as requested
        self.db.spaces.update_one(
            {"name": self.test_space},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                },
                "$push": {"requests": CURRENT_USER.username},
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/accept_request?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_reject_request_global_admin(self):
        """
        expect: reject join request of a user, permission is granted
        because user is global admin
        """

        # pull user from members and set him as requested,
        # also remove admin from space_admins to trigger global admin
        self.db.spaces.update_one(
            {"name": self.test_space},
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
            "/spaceadministration/reject_request?name={}&user={}".format(
                self.test_space, CURRENT_USER.username  #
            ),
            True,
            200,
        )

        # expect user to be no longer requested and also not member
        # (because he was declined)
        db_state = self.db.spaces.find_one({"name": self.test_space})
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
            {"name": self.test_space},
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
            "/spaceadministration/reject_request?name={}&user={}".format(
                self.test_space, CURRENT_ADMIN.username
            ),
            True,
            200,
        )

        # expect user to be no longer requested and also not member
        # (because he was declined)
        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertNotIn(CURRENT_ADMIN.username, db_state["requests"])
        self.assertNotIn(CURRENT_ADMIN.username, db_state["members"])

    def test_post_space_reject_request_error_no_user(self):
        """
        expect: fail message because request is missing user parameter
        """

        response = self.base_checks(
            "POST",
            "/spaceadministration/reject_request?name={}".format(self.test_space),
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
            "/spaceadministration/reject_request?name={}&user={}".format(
                "not_existing_space", CURRENT_USER.username
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
            {"name": self.test_space},
            {
                "$pull": {
                    "members": CURRENT_USER.username,
                },
            },
        )

        response = self.base_checks(
            "POST",
            "/spaceadministration/reject_request?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
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
            {"name": self.test_space},
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
            "/spaceadministration/reject_request?name={}&user={}".format(
                self.test_space, CURRENT_ADMIN.username
            ),
            False,
            403,
        )
        self.assertEqual(response["reason"], INSUFFICIENT_PERMISSION_ERROR)

    def test_post_space_toggle_visibility_global_admin(self):
        """
        expect: successfully toggle visibility of space (false -> true, true -> false),
        permission is granted because user is global admin
        """

        visibility = False

        # pull user from space admins to trigger global admin
        # and set visibility explicitely
        self.db.spaces.update_one(
            {"name": self.test_space},
            {
                "$pull": {
                    "admins": CURRENT_ADMIN.username,
                },
                "$set": {"invisible": visibility},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/toggle_visibility?name={}".format(self.test_space),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertEqual(db_state["invisible"], not visibility)

        # do the same thing once more to test the other toggle direction
        visibility = not visibility
        self.base_checks(
            "POST",
            "/spaceadministration/toggle_visibility?name={}".format(self.test_space),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
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
            {"name": self.test_space},
            {
                "$push": {
                    "admins": CURRENT_USER.username,
                },
                "$set": {"invisible": visibility},
            },
        )

        self.base_checks(
            "POST",
            "/spaceadministration/toggle_visibility?name={}".format(self.test_space),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertEqual(db_state["invisible"], not visibility)

        # do the same thing once more to test the other toggle direction
        visibility = not visibility
        self.base_checks(
            "POST",
            "/spaceadministration/toggle_visibility?name={}".format(self.test_space),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
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
            "/spaceadministration/toggle_visibility?name={}".format(self.test_space),
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
            "/spaceadministration/put_file?name={}".format(self.test_space),
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
        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertIn("files", db_state)
        self.assertIn(
            {
                "author": CURRENT_ADMIN.username,
                "file_id": file._id,
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
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "name")

    def test_post_space_put_file_error_no_file(self):
        """
        expect: fail message because no file is transferred
        """

        # encode file as formdata
        request = MultipartEncoder(fields={})

        response = self.base_checks(
            "POST",
            "/spaceadministration/put_file?name={}".format(self.test_space),
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
            "/spaceadministration/put_file?name={}".format(self.test_space),
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
            "/spaceadministration/put_file?name={}".format("not_existing_space"),
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
            {"name": self.test_space},
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
            "/spaceadministration/put_file?name={}".format(self.test_space),
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
            "/spaceadministration/put_file?name={}".format(self.test_space),
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
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "name")

    def test_delete_space_error_space_doesnt_exist(self):
        """
        expect: fail message because space doesnt exist
        """

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/leave?name={}".format("not_existing_space"),
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
            "/spaceadministration/leave?name={}".format(self.test_space),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
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
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/leave?name={}".format(self.test_space),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertNotIn(CURRENT_USER.username, db_state["members"])
        self.assertNotIn(CURRENT_USER.username, db_state["admins"])

    def test_delete_space_leave_space_error_no_other_admins(self):
        """
        expect: fail message because there would be no other space admin left
        """

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/leave?name={}".format(self.test_space),
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
            {"name": self.test_space}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/kick?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
            ),
            True,
            200,
        )

        # expect other user to no longer be member
        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertNotIn(CURRENT_USER.username, db_state["members"])

    def test_delete_space_kick_user_space_admin(self):
        """
        expect: successfull kick another user,
        permission is granted because user is space admin
        """

        self.base_checks(
            "DELETE",
            "/spaceadministration/kick?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
            ),
            True,
            200,
        )

        # expect other user to no longer be member
        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertNotIn(CURRENT_USER.username, db_state["members"])

    def test_delete_space_kick_space_admin_as_global_admin(self):
        """
        expect: successfully kick another space admin,
        permission is granted because user is global admin
        """

        # set other user as space admin
        self.db.spaces.update_one(
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/kick?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
            ),
            True,
            200,
        )

        # expect other user to no longer be member
        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertNotIn(CURRENT_USER.username, db_state["members"])
        self.assertNotIn(CURRENT_USER.username, db_state["admins"])

    def test_delete_space_kick_user_error_user_not_member(self):
        """
        expect: fail message because user is not even member
        """

        self.db.spaces.update_one(
            {"name": self.test_space}, {"$pull": {"members": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/kick?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
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
            {"name": self.test_space}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/kick?name={}&user={}".format(
                self.test_space, CURRENT_ADMIN.username
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
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/kick?name={}&user={}".format(
                self.test_space, CURRENT_ADMIN.username
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
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/remove_admin?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
            ),
            True,
            200,
        )

        db_state = self.db.spaces.find_one({"name": self.test_space})
        self.assertNotIn(CURRENT_USER.username, db_state["admins"])

    def test_delete_space_remove_admin_error_no_user(self):
        """
        expect: fail message because request misses "user" parameter
        """

        # set other user as admin
        self.db.spaces.update_one(
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/remove_admin?name={}".format(self.test_space),
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
            "/spaceadministration/remove_admin?name={}&user={}".format(
                self.test_space, CURRENT_USER.username
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
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "DELETE",
            "/spaceadministration/remove_admin?name={}&user={}".format(
                self.test_space, CURRENT_ADMIN.username
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
            {"name": self.test_space},
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

        db_state = self.db.spaces.find_one({"name": self.test_space})
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
            "/spaceadministration/delete_file?name={}&file_id={}".format(
                self.test_space, str(file_id)
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
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
        )

        # manually add file
        file_id = self._setup_space_file(CURRENT_ADMIN.username)

        self.base_checks(
            "DELETE",
            "/spaceadministration/delete_file?name={}&file_id={}".format(
                self.test_space, str(file_id)
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
            {"name": self.test_space}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        # manually add file
        file_id = self._setup_space_file(CURRENT_ADMIN.username)

        self.base_checks(
            "DELETE",
            "/spaceadministration/delete_file?name={}&file_id={}".format(
                self.test_space, str(file_id)
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
            "/spaceadministration/delete_file?name={}".format(self.test_space),
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
            "/spaceadministration/delete_file?name={}&file_id={}".format(
                "not_existing_space", str(file_id)
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
            "/spaceadministration/delete_file?name={}&file_id={}".format(
                self.test_space, str(ObjectId())
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
            "/spaceadministration/delete_file?name={}&file_id={}".format(
                self.test_space, str(file_id)
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
                {"name": self.test_space},
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
            "/spaceadministration/delete_file?name={}&file_id={}".format(
                self.test_space, str(file_id)
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
            {"name": self.test_space}, {"$pull": {"admins": CURRENT_ADMIN.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/delete_space?name={}".format(self.test_space),
            True,
            200,
        )

        # expect all associated data to be deleted
        space = self.db.spaces.find_one({"name": self.test_space})
        posts = list(self.db.posts.find({"space": self.test_space}))
        space_acl = list(self.db.space_acl.find({"space": self.test_space}))
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
            {"name": self.test_space}, {"$push": {"admins": CURRENT_USER.username}}
        )

        self.base_checks(
            "DELETE",
            "/spaceadministration/delete_space?name={}".format(self.test_space),
            True,
            200,
        )

        # expect all associated data to be deleted
        space = self.db.spaces.find_one({"name": self.test_space})
        posts = list(self.db.posts.find({"space": self.test_space}))
        space_acl = list(self.db.space_acl.find({"space": self.test_space}))
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
            "/spaceadministration/delete_space?name={}".format(self.test_space),
            True,
            200,
        )

        # expect all associated data to be deleted
        space = self.db.spaces.find_one({"name": self.test_space})
        posts = list(self.db.posts.find({"space": self.test_space}))
        space_acl = list(self.db.space_acl.find({"space": self.test_space}))
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
            "/spaceadministration/delete_space?name={}".format(self.test_space),
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
        # 4 test posts, one in space and one normal for admin and for user
        self.post_oids = [ObjectId(), ObjectId(), ObjectId(), ObjectId()]
        self.posts = [
            {
                "_id": self.post_oids[0],
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.datetime.utcnow(),
                "text": "space_post_admin",
                "space": self.test_space,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "files": [],
                "comments": [
                    {
                        "_id": ObjectId(),
                        "author": CURRENT_USER.username,
                        "creation_date": datetime.datetime.utcnow(),
                        "text": "test_comment",
                        "pinned": False,
                    }
                ],
                "likers": [],
            },
            {
                "_id": self.post_oids[1],
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.datetime.utcnow(),
                "text": "normal_post_admin",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "files": [],
                "comments": [],
                "likers": [],
            },
            {
                "_id": self.post_oids[2],
                "author": CURRENT_USER.username,
                "creation_date": datetime.datetime.utcnow(),
                "text": "space_post_user",
                "space": self.test_space,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "files": [],
                "comments": [],
                "likers": [],
            },
            {
                "_id": self.post_oids[3],
                "author": CURRENT_USER.username,
                "creation_date": datetime.datetime.utcnow(),
                "text": "normal_post_user",
                "space": None,
                "pinned": False,
                "wordpress_post_id": None,
                "tags": [],
                "files": [],
                "comments": [],
                "likers": [],
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
            # expect author to be enhanced with profile pic
            self.assertIn("author", post)
            self.assertIn("username", post["author"])
            self.assertIn("profile_pic", post["author"])

            # admin has a profile pic set,
            # therefore expect his pic to not be the default one
            if post["author"]["username"] == CURRENT_ADMIN.username:
                self.assertEqual(post["author"]["profile_pic"], "test")
            elif post["author"]["username"] == CURRENT_USER.username:
                self.assertEqual(
                    post["author"]["profile_pic"], "default_profile_pic.jpg"
                )

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

    def test_get_timeline_out_of_range(self):
        """
        expect: no posts returned because they are not within the requested time frame
        """

        # request from 2 hours ago to 1 hour ago
        response = self.base_checks(
            "GET",
            "/timeline?from={}&to={}".format(
                (datetime.datetime.utcnow() - datetime.timedelta(hours=2)).isoformat(),
                (datetime.datetime.utcnow() - datetime.timedelta(hours=1)).isoformat(),
            ),
            True,
            200,
        )
        self.assertIn("posts", response)
        self.assertEqual(response["posts"], [])

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

        response = self.base_checks(
            "GET", "/timeline/space/{}".format(self.test_space), True, 200
        )
        self.assertIn("posts", response)

        # expect only the posts in spaces to be in the response
        self.assertEqual(len(response["posts"]), 2)

        # expect the author to be enhanced with the correct profile picture
        self.assert_author_enhanced(response["posts"])

    def test_get_space_timeline_error_user_not_member(self):
        """
        expect: fail message because user is not member of the space
        """

        # switch to user mode
        options.test_admin = False
        options.test_user = True

        # pull user from members
        self.db.spaces.update_one(
            {"name": self.test_space}, {"$pull": {"members": CURRENT_USER.username}}
        )

        response = self.base_checks(
            "GET", "/timeline/space/{}".format(self.test_space), False, 409
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
            {"space": self.test_space, "role": self.test_roles[CURRENT_USER.username]},
            {"$set": {"read_timeline": False}},
        )

        response = self.base_checks(
            "GET", "/timeline/space/{}".format(self.test_space), False, 403
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
            {"name": self.test_space},
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
            {"name": self.test_space},
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
        timestamp = (
            datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
        ).isoformat()

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
                        datetime.datetime.utcnow() - datetime.timedelta(days=10)
                    ).isoformat()
                }
            },
        )

        # cannot use the base checks here because 304 doesnt allow sending a response body
        response = self.fetch("/updates", method="GET", allow_nonstandard_methods=True)

        # match expected response code
        self.assertEqual(response.code, 304)
