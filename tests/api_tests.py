import json
from typing import List

from keycloak import KeycloakAdmin, KeycloakOpenID
from pymongo import MongoClient
from tornado.options import options
from tornado.testing import AsyncHTTPTestCase

import global_vars
from main import make_app
from model import User

MISSING_KEY_ERROR_SLUG = "missing_key:"

CURRENT_USER = User(
    "test_admin", "aaaaaaaa-bbbb-0000-cccc-dddddddddddd", "test_admin@mail.de") # don't change, these values match with the ones in BaseHandler

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

    # set test mode to bypass authentication
    options.test = True


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
        options.test = False
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

    def base_checks(self, method: str, url: str, expect_success: bool, expect_response_code: str) -> dict:
        """
        convenience wrapper to assert the following:
        - response matches expected http code
        - response contains valid json
        - response json contains a "success" key
        - "success" matches expected success value
        
        :returns: response content
        """

        response = self.fetch(url, method=method, allow_nonstandard_methods=True)
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
        self.assertIn("reason", response)
        self.assertEqual(response["reason"], MISSING_KEY_ERROR_SLUG + "code")


class FollowHandlerTest(BaseApiTestCase):

    def setUp(self) -> None:
        super().setUp()

        self.user_follows = ["test_user1", "test_user2"]
        
        # insert test data
        self.db.follows.insert_one({
            "user": CURRENT_USER.username,
            "follows": self.user_follows
        })

    def _db_get_follows(self) -> List[str]:
        """
        get list of follows for CURRENT_USER from db
        """

        db_response = self.db.follows.find_one({"user": CURRENT_USER.username})
        if db_response:
            return db_response["follows"]

    def test_get_follows(self):
        """
        expect: a dict containing the above set-up follow-relation
        """

        response = self.base_checks(
            "GET", "/follow?user={}".format(CURRENT_USER.username), True, 200)

        # expect a users and a follows key
        self.assertIn("user", response)
        self.assertIn("follows", response)

        # expect user to be the requested one and the users he follows as stated in the setup
        self.assertEqual(response["user"], CURRENT_USER.username)
        self.assertEqual(response["follows"], self.user_follows)

    def test_get_follows_error_missing_key(self):
        """
        expect: missing key error due to user parameter left out of request
        """

        response = self.base_checks("GET", "/follow", False, 400)

        # expect a missing_key:user error as the reason
        self.assertIn("reason", response)
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
        self.assertIn("reason", response)
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
        self.assertIn("reason", response)
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
            CURRENT_USER.username: "admin",
            "test_user": "user"
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
        self.assertEqual(response["role"], self.test_roles[CURRENT_USER.username])

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

    def test_get_distinct_roles(self):
        """
        expect: a list containing atleast the roles in setup
        """

        response = self.base_checks("GET", "/role/distinct", True, 200)

        # expect the roles from the setup to be in the response
        self.assertIn("existing_roles", response)
        self.assertTrue(role in response["existing_roles"] for role in self.test_roles.values())
