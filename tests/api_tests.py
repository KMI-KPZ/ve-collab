import json

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

        response = self.fetch(url, method=method)
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

    def test_get_follows(self):
        """
        expect: a dict containing the above set-up follow-relation
        """

        response = self.base_checks("GET", "/follow?user={}".format(CURRENT_USER.username), True, 200)

        # expect a users and a follows key
        self.assertIn("user", response)
        self.assertIn("follows", response)

        # expect user to be the requested one and the users he follows as stated in the setup
        self.assertEqual(response["user"], CURRENT_USER.username)
        self.assertEqual(response["follows"], self.user_follows)

    def tearDown(self) -> None:
        # cleanup test data
        self.db.follows.delete_many({})
        super().tearDown()
