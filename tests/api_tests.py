import json
import logging
from typing import List

from keycloak import KeycloakAdmin, KeycloakOpenID
from pymongo import MongoClient
from tornado.options import options
from tornado.testing import AsyncHTTPTestCase

from acl import ACL
import global_vars
from main import make_app
from model import User
from logger_factory import get_logger

# hack all loggers to not produce too much irrelevant (info) output here
for logger_name in logging.root.manager.loggerDict:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.ERROR)


MISSING_KEY_ERROR_SLUG = "missing_key:"
MISSING_KEY_HTTP_BODY_ERROR_SLUG = "missing_key_in_http_body:"
USER_NOT_ADMIN_ERROR = "user_not_admin"
INSUFFICIENT_PERMISSION_ERROR = "insufficient_permission"
UNRECOGNIZABLE_KEY_ERROR = "unrecognizable_key_in_http_body"
NON_BOOL_VALUE_ERROR = "value_not_bool_in_http_body"


# don't change, these values match with the ones in BaseHandler
CURRENT_ADMIN = User(
    "test_admin", "aaaaaaaa-bbbb-0000-cccc-dddddddddddd", "test_admin@mail.de")
CURRENT_USER = User(
    "test_user", "aaaaaaaa-bbbb-0000-cccc-dddddddddddd", "test_user@mail.de")

def setup():
    # deal with config properties
    with open(options.config) as json_file:
        config = json.load(json_file)

    global_vars.keycloak = KeycloakOpenID(config["keycloak_base_url"], realm_name=config["keycloak_realm"], client_id=config["keycloak_client_id"],
                                          client_secret_key=config["keycloak_client_secret"])
    global_vars.keycloak_admin = KeycloakAdmin(config["keycloak_base_url"], realm_name=config["keycloak_realm"], username=config["keycloak_admin_username"],
                                               password=config["keycloak_admin_password"], verify=True, auto_refresh_token=['get', 'put', 'post', 'delete'])
    global_vars.keycloak_callback_url = config["keycloak_callback_url"]
    global_vars.domain = config["domain"]
    global_vars.keycloak_client_id = config["keycloak_client_id"]
    global_vars.cookie_secret = config["cookie_secret"]

    global_vars.mongodb_host = config["mongodb_host"]
    global_vars.mongodb_port = config["mongodb_port"]
    global_vars.mongodb_username = config["mongodb_username"]
    global_vars.mongodb_password = config["mongodb_password"]
    global_vars.mongodb_db_name = "test_db"


def validate_json_str(suspect_str: str) -> bool:
    try:
        json.loads(suspect_str)
    except:
        return False
    return True


class RenderHandlerTest(AsyncHTTPTestCase):

    def get_app(self):
        setup() # have to do our setup here, because parent class calls get_app in its own setUp, so we would have to setup before super() otherwise, which might break something idk
        return make_app(global_vars.cookie_secret)

    def setUp(self) -> None:
        super().setUp()

        # set test mode to bypass authentication as an admin
        options.test_admin = True

        self.render_endpoints = ["/", "/main", "/myprofile", "/profile/test", "/space/test", "/spaces", "/template", "/acl"]

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

    def setUp(self) -> None:
        super().setUp()

        # set test mode to bypass authentication as an admin as default for each test case (test cases where user view is required will set mode themselves)
        options.test_admin = True

        # initialize mongodb connection
        self.client = MongoClient(global_vars.mongodb_host, global_vars.mongodb_port,
                                  username=global_vars.mongodb_username, password=global_vars.mongodb_password)
        self.db = self.client[global_vars.mongodb_db_name]

    def tearDown(self) -> None:
        # close mongodb connection
        self.client.close()
        super().tearDown()

    def get_app(self):
        setup()  # have to do our setup here, because parent class calls get_app in its own setUp, so we would have to setup before super() otherwise, which might break something idk
        return make_app(global_vars.cookie_secret)

    def base_checks(self, method: str, url: str, expect_success: bool, expect_response_code: str, body: dict = None) -> dict:
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
            elif isinstance(body, str):
                pass
            else:
                raise ValueError("Body can either be Dict or str, but is {}".format(type(body)))

        response = self.fetch(url, method=method, body=body, allow_nonstandard_methods=True)
        content = response.buffer.getvalue().decode()

        # match expected response code
        self.assertEqual(response.code, expect_response_code)

        # expect valid json as response content
        self.assertIsInstance(content, str)
        is_json = validate_json_str(content)
        self.assertEqual(is_json, True)

        content = json.loads(content)

        # expect a "success" key and match expected value
        self.assertIn("success", content)
        self.assertEqual(content["success"], expect_success)

        # if we expect an error, we also need to have reason in the message
        if expect_success == False:
            self.assertIn("reason", content)

        return content


class AuthenticationHandlersTest(BaseApiTestCase):
    # the only authentication we can really effectively test is the redirect to keycloak and the error case for the callback...

    def test_login_redirect(self):
        """
        expect: 302 redirect to keycloak
        """

        response = self.fetch("/login", follow_redirects=False)
        self.assertEqual(response.code, 302)

    def test_login_callback_error_no_code(self):
        """
        expect: 400 Bad request, reason missing_key
        """

        response = self.base_checks("GET", "/login/callback", False, 400)

        # expect a missing_key:code error as the reason
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "code")


class FollowHandlerTest(BaseApiTestCase):

    def setUp(self) -> None:
        super().setUp()

        self.user_follows = ["test_user1", "test_user2"]
        
        # insert test data
        self.db.follows.insert_one({
            "user": CURRENT_ADMIN.username,
            "follows": self.user_follows
        })

    def _db_get_follows(self) -> List[str]:
        """
        get list of follows for CURRENT_USER from db
        """

        db_response = self.db.follows.find_one({"user": CURRENT_ADMIN.username})
        if db_response:
            return db_response["follows"]

    def test_get_follows(self):
        """
        expect: a dict containing the above set-up follow-relation
        """

        response = self.base_checks(
            "GET", "/follow?user={}".format(CURRENT_ADMIN.username), True, 200)

        # expect a users and a follows key
        self.assertIn("user", response)
        self.assertIn("follows", response)

        # expect user to be the requested one and the users he follows as stated in the setup
        self.assertEqual(response["user"], CURRENT_ADMIN.username)
        self.assertEqual(response["follows"], self.user_follows)

    def test_get_follows_error_missing_key(self):
        """
        expect: missing key error due to user parameter left out of request
        """

        response = self.base_checks("GET", "/follow", False, 400)

        # expect a missing_key:user error as the reason
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "user")

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

    def tearDown(self) -> None:
        # cleanup test data
        self.db.follows.delete_many({})
        super().tearDown()


class PermissionHandlerTest(BaseApiTestCase):

    def test_get_permissions(self):
        """
        expect: a role to be transmitted from keycloak
        """

        response = self.base_checks("GET", "/permissions", True, 200)

        # since we don't directly control setting what role the user has because it is done in keycloak,
        # we shouldn't assert any fixed value here. as long as a non-empty role is responded, we are fine
        self.assertIn("role", response)
        self.assertNotEqual(response["role"], None)


class RoleHandlerTest(BaseApiTestCase):

    def setUp(self) -> None:
        super().setUp()

        # insert test data
        self.test_roles = {
            CURRENT_ADMIN.username: "admin",
            CURRENT_USER.username: "user"
        }
        self.db.roles.insert_many(
            [{"username": key, "role": value} for key, value in self.test_roles.items()]
        )

    def tearDown(self) -> None:
        # cleanup test data
        self.db.roles.delete_many({})
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
        self.db.roles.delete_many({})

        response = self._get_my_role()

        # expect role to be guest
        self.assertIn("role", response)
        self.assertEqual(response["role"], "guest")

        # also expect the note that this role entry was auto-created
        self.assertIn("note", response)
        self.assertEqual(response["note"],
                         "created_because_no_previous_record")

    def test_get_all_roles(self):
        """
        expect: alle roles as defined in setup
        """

        response = self.base_checks("GET", "/role/all", True, 200)

        # expect the test_roles from the setup to appear in the response
        # careful: we cannot check for equality here, because there might be other users coming from keycloak as well
        # (they are aggregated)
        self.assertIn("users", response)
        expected_entries = [{"username": key, "role": value}
                            for key, value in self.test_roles.items()]
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
        self.assertTrue(role in response["existing_roles"] for role in self.test_roles.values())

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
        http_body = {
            "username": CURRENT_USER.username,
            "role": updated_user_role
        }

        self.base_checks("POST", "/role/update", True, 200, body=http_body)

        db_state = self.db.roles.find_one({"username": CURRENT_USER.username})
        self.assertIn("role", db_state)
        self.assertEqual(db_state["role"], updated_user_role)

    def test_post_update_role_error_missing_username(self):
        """
        expect: missing_key_in_http_body error
        """

        http_body = {
            "role": "irrelevant"
        }

        response = self.base_checks("POST", "/role/update", False, 400, body=http_body)

        self.assertEqual(response["reason"], MISSING_KEY_HTTP_BODY_ERROR_SLUG + "username")

    def test_post_update_role_error_missing_role(self):
        """
        expect: missing_key_in_http_body error
        """

        http_body = {
            "username": CURRENT_USER.username,
        }

        response = self.base_checks(
            "POST", "/role/update", False, 400, body=http_body)

        self.assertEqual(response["reason"],
                         MISSING_KEY_HTTP_BODY_ERROR_SLUG + "role")

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

        # insert test data
        self.test_roles = {
            CURRENT_ADMIN.username: "admin",
            CURRENT_USER.username: "user"
        }
        self.test_global_acl_rules = {
            CURRENT_ADMIN.username: {
                "role": "admin",
                "create_space": True
            },
            CURRENT_USER.username: {
                "role": "user",
                "create_space": False
            }
        }
        self.db.roles.insert_many(
            [{"username": key, "role": value}
                for key, value in self.test_roles.items()]
        )
        # pymongo modifies parameters in place (adds _id fields), like WHAT THE FUCK!? anyway, thats why we give it a copy...
        self.db.global_acl.insert_many(
            [value.copy() for value in self.test_global_acl_rules.values()]
        )

    def tearDown(self) -> None:
        # cleanup test data
        self.db.roles.delete_many({})
        self.db.global_acl.delete_many({})
        super().tearDown()

    def test_get_global_acl(self):
        """
        expect: responded acl entry matches the one in setup
        """

        response = self.base_checks("GET", "/global_acl/get", True, 200)

        self.assertIn("acl_entry", response)
        self.assertEqual(response["acl_entry"], self.test_global_acl_rules[CURRENT_ADMIN.username])

    def test_get_global_acl_error_user_has_no_role(self):
        """
        expect: fail message because user has no role
        """

        self.db.roles.delete_many({})

        response = self.base_checks("GET", "/global_acl/get", False, 409)

        self.assertEqual(response["reason"], "user_has_no_role")

    def test_get_global_acl_all(self):
        """
        expect: list of all acl entries, matching those in setup
        """

        response = self.base_checks("GET", "/global_acl/get_all", True, 200)

        self.assertIn("acl_entries", response)
        self.assertEqual(response["acl_entries"], [value for value in self.test_global_acl_rules.values()])

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
            "create_space": False
        }

        self.base_checks("POST", "/global_acl/update", True, 200, body=updated_acl_entry)

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
            "invalid_key": True
        }

        response = self.base_checks("POST", "/global_acl/update", False, 400, body=updated_acl_entry)

        self.assertEqual(response["reason"], UNRECOGNIZABLE_KEY_ERROR)

    def test_post_global_acl_update_error_non_bool_value(self):
        """
        expect fail message because request contains non-boolean value
        """

        updated_acl_entry = {
            "role": self.test_roles[CURRENT_USER.username],
            "create_space": "str_val",
        }

        response = self.base_checks("POST", "/global_acl/update", False, 400, body=updated_acl_entry)

        self.assertEqual(response["reason"], NON_BOOL_VALUE_ERROR)

    def test_post_global_acl_update_error_admin_immutable(self):
        """
        expect fail message because admin role is immutable
        """

        updated_acl_entry = {
            "role": "admin",
            "create_space": False,
        }

        response = self.base_checks("POST", "/global_acl/update", False, 409, body=updated_acl_entry)

        self.assertEqual(response["reason"], "admin_role_immutable")


class SpaceACLHandlerTest(BaseApiTestCase):

    def setUp(self) -> None:
        super().setUp()

        # insert test data
        self.test_space = "unittest_space"
        self.test_roles = {
            CURRENT_ADMIN.username: "admin",
            CURRENT_USER.username: "user"
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
                "write_files": True
            },
            CURRENT_USER.username: {
                "role": "user",
                "space": self.test_space,
                "join_space": True,
                "read_timeline": True,
                "post": True,
                "comment": True,
                "read_wiki": False,
                "write_wiki": False,
                "read_files": True,
                "write_files": False
            }
        }

        self.db.spaces.insert_one({
            "name": self.test_space,
            "invisible": False,
            "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": []
        })
        self.db.roles.insert_many(
            [{"username": key, "role": value}
                for key, value in self.test_roles.items()]
        )
        # pymongo modifies parameters in place (adds _id fields), like WHAT THE FUCK!? anyway, thats why we give it a copy...
        self.db.space_acl.insert_many(
            [value.copy() for value in self.test_space_acl_rules.values()]
        )

    def tearDown(self) -> None:
        # cleanup test data
        self.db.roles.delete_many({})
        self.db.space_acl.delete_many({})
        self.db.spaces.delete_many({})
        super().tearDown()

    def test_get_space_acl(self):
        """
        expect: responded acl entry matches the one in setup
        """

        response = self.base_checks("GET", "/space_acl/get?space={}".format(self.test_space), True, 200)

        self.assertIn("acl_entry", response)
        self.assertEqual(
            response["acl_entry"], self.test_space_acl_rules[CURRENT_ADMIN.username])

    def test_get_space_acl_other_role(self):
        """
        expect: acl entry of CURRENT_USER instead of CURRENT_ADMIN
        """

        response = self.base_checks(
            "GET", "/space_acl/get?space={}&role={}".format(self.test_space, self.test_roles[CURRENT_USER.username]), True, 200)

        self.assertIn("acl_entry", response)
        self.assertEqual(
            response["acl_entry"], self.test_space_acl_rules[CURRENT_USER.username])

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

        self.db.roles.delete_many({})

        response = self.base_checks("GET", "/space_acl/get?space={}".format(self.test_space), False, 409)
        
        self.assertEqual(response["reason"], "user_has_no_role")

    def test_get_space_acl_all(self):
        """
        expect: list of all acl entries, matching those in setup
        """

        response = self.base_checks(
            "GET", "/space_acl/get_all?space={}".format(self.test_space), True, 200)

        self.assertIn("acl_entries", response)
        self.assertEqual(response["acl_entries"], [
                         value for value in self.test_space_acl_rules.values()])

    def test_get_space_acl_all_error_no_space(self):
        """
        expect: fail message because space doesnt exist
        """

        # explicitely switch to user mode for this test, because space existence is only checked if user is not global admin (--> might be space admin)
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "GET", "/space_acl/get_all?space={}".format("not_existing_space"), False, 400)

        self.assertEqual(response["reason"], "space_doesnt_exist")

    def test_get_space_acl_all_error_no_admin(self):
        """
        expect: fail message because user is not admin (neither global nor space)
        """

        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        response = self.base_checks(
            "GET", "/space_acl/get_all?space={}".format(self.test_space), False, 403)

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
            "write_files": False
        }

        self.base_checks("POST", "/space_acl/update",
                         True, 200, body=updated_acl_entry)

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
            "write_files": False
        }

        response = self.base_checks("POST", "/space_acl/update", False, 403, body=updated_acl_entry)

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
            "invalid_key": True
        }

        response = self.base_checks(
            "POST", "/space_acl/update", False, 400, body=updated_acl_entry)

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
            "POST", "/space_acl/update", False, 400, body=updated_acl_entry)

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
            "POST", "/space_acl/update", False, 409, body=updated_acl_entry)

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
            "POST", "/space_acl/update", False, 409, body=updated_acl_entry)

        self.assertEqual(response["reason"], "space_doesnt_exist")

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
            "POST", "/space_acl/update", False, 409, body=updated_acl_entry)

        self.assertEqual(response["reason"], "admin_role_immutable")


class RoleACLIntegrationTest(BaseApiTestCase):

    def setUp(self) -> None:
        super().setUp()

        # insert test data
        self.test_space = "unittest_space"
        self.test_roles = {
            CURRENT_ADMIN.username: "admin",
            CURRENT_USER.username: "user"
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
                "write_files": True
            },
            CURRENT_USER.username: {
                "role": "user",
                "space": self.test_space,
                "join_space": True,
                "read_timeline": True,
                "post": True,
                "comment": True,
                "read_wiki": False,
                "write_wiki": False,
                "read_files": True,
                "write_files": False
            }
        }

        self.db.spaces.insert_one({
            "name": self.test_space,
            "invisible": False,
            "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": []
        })
        self.db.roles.insert_many(
            [{"username": key, "role": value}
                for key, value in self.test_roles.items()]
        )
        # pymongo modifies parameters in place (adds _id fields), like WHAT THE FUCK!? anyway, thats why we give it a copy...
        self.db.space_acl.insert_many(
            [value.copy() for value in self.test_space_acl_rules.values()]
        )

    def tearDown(self) -> None:
        # cleanup test data
        self.db.roles.delete_many({})
        self.db.space_acl.delete_many({})
        self.db.spaces.delete_many({})
        super().tearDown()


    def test_acl_entry_creation_on_role_request_of_no_role(self):
        """
        expect: when requesting the role of the current_user, but he has no role, the role and a corresponding acl entry should be created
        """

        # explicitely switch to user mode for this test
        options.test_admin = False
        options.test_user = True

        # delete the role entry
        self.db.roles.delete_one({"username": CURRENT_USER.username})

        role_response = self.base_checks("GET", "/role/my", True, 200)

        # expect the role "guest" to be assigned to me automatically
        self.assertIn("role", role_response)
        self.assertEqual(role_response["role"], "guest")

        # also expect a corresponding global acl entry to be created
        global_acl_db_state = self.db.global_acl.find_one({"role": "guest"})
        self.assertNotEqual(global_acl_db_state, None)

        # also expect a corresponding space acl entry to be created (in all spaces, i.e. only in the test space here)
        space_acl_db_state = self.db.space_acl.find_one({"role": "guest", "space": self.test_space})
        self.assertNotEqual(space_acl_db_state, None)


    def test_acl_entry_creation_on_role_creation(self):
        """
        expect: creating a new role via update/upsert should also create a corresponding acl entry
        """

        new_role = {
            "username": CURRENT_USER.username,
            "role": "new_role"
        }

        self.base_checks("POST", "/role/update", True, 200, body=new_role)

        # expect a corresponding global acl entry to be created
        global_acl_db_state = self.db.global_acl.find_one({"role": "new_role"})
        self.assertNotEqual(global_acl_db_state, None)

        # also expect a corresponding space acl entry to be created (in all spaces, i.e. only in the test space here)
        space_acl_db_state = self.db.space_acl.find_one(
            {"role": "new_role", "space": self.test_space})
        self.assertNotEqual(space_acl_db_state, None)


    def test_cleanup_unused_acl_rules(self):
        """
        expect: removing all roles should cleanup the full acl according to the cleanup procedure removing any entries, that no longer have a matching role or space
        """

        self.db.roles.delete_many({})

        with ACL() as acl_manager:
            acl_manager._cleanup_unused_rules()

        # expect an empty global acl
        global_acl_db_state = list(self.db.global_acl.find())
        self.assertEqual(global_acl_db_state, [])

        # also expect an empty space acl
        space_acl_db_state = list(self.db.space_acl.find())
        self.assertEqual(space_acl_db_state, [])
