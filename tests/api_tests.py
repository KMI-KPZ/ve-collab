import json

from keycloak import KeycloakAdmin, KeycloakOpenID
from tornado.options import options
from tornado.testing import AsyncHTTPTestCase, gen_test

import global_vars
from main import make_app

def setup():
    # deal with config properties
    with open(options.config) as json_file:
        config = json.load(json_file)

    global_vars.keycloak = KeycloakOpenID(config["keycloak_base_url"], realm_name=config["keycloak_realm"], client_id=config["keycloak_client_id"],
                                          client_secret_key=config["keycloak_client_secret"])
    global_vars.keycloak_admin = KeycloakAdmin(config["keycloak_base_url"], realm_name=config["keycloak_realm"], username=config["keycloak_admin_username"],
                                               password=config["keycloak_admin_password"], verify=True, auto_refresh_token=['get', 'put', 'post', 'delete'])
    global_vars.keycloak_callback_url = config["keycloak_callback_url"]
    global_vars.config_path = options.config
    global_vars.domain = config["domain"]
    global_vars.keycloak_client_id = config["keycloak_client_id"]
    global_vars.cookie_secret = config["cookie_secret"]

    global_vars.mongodb_host = config["mongodb_host"]
    global_vars.mongodb_port = config["mongodb_port"]
    global_vars.mongodb_username = config["mongodb_username"]
    global_vars.mongodb_password = config["mongodb_password"]
    global_vars.mongodb_db_name = config["mongodb_db_name"]

    if "routing" in config:
        global_vars.routing = config["routing"]

    # set test mode to bypass authentication
    options.test = True


def validate_json_str(suspect_str: str) -> bool:
    try:
        json.loads(suspect_str)
    except:
        return False
    return True


class RenderHandlerBaseTest(AsyncHTTPTestCase):

    def get_app(self):
        setup() # have to do our setup here, because get_app and setUp seemingly have a race condition, but we need to make sure cookie_secret is set before make_app
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
