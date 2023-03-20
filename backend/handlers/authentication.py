from abc import ABCMeta
import json

import tornado.web

import global_vars
from handlers.base_handler import BaseHandler
from resources.network.profile import Profiles


class LoginHandler(tornado.web.RequestHandler, metaclass=ABCMeta):
    """
    Authenticate a user towards the Platform
    """

    def get(self):
        """
        redirect to keycloak
        success:
            200, html
        error:
            n/a
        """

        url = global_vars.keycloak.auth_url(global_vars.keycloak_callback_url)
        self.redirect(url)


class LoginCallbackHandler(BaseHandler, metaclass=ABCMeta):

    async def get(self):
        # keycloak redirects you back here with this code
        code = self.get_argument("code", None)
        if code is None:
            self.set_status(400)
            self.write({"status": 400, "success": False, "reason": "missing_key:code"})
            return

        # exchange authorization code for token
        # (redirect_uri has to match the uri in keycloak.auth_url(...) as per openID standard)
        token = global_vars.keycloak.token(
            code=code,
            grant_type=["authorization_code"],
            redirect_uri=global_vars.keycloak_callback_url,
        )

        token_info = global_vars.keycloak.introspect(token["access_token"])

        # ensure that a profile exists for the user
        # if not, create one
        with Profiles() as profile_manager:
            profile_manager.ensure_profile_exists(
                token_info["preferred_username"],
                token_info["given_name"],
                token_info["family_name"],
            )

        # dump token dict to str and store it in a secure cookie (BaseHandler will decode it later to validate a user is logged in)
        self.set_secure_cookie("access_token", json.dumps(token))

        self.redirect("/main")


class LogoutHandler(BaseHandler, metaclass=ABCMeta):
    """
    Logout Endpoint
    """

    def post(self):
        """
        POST request of /logout
            perform logout, i.e. clear the token cache entry and delete the cookie
        success:
            200, {"status": 200, "success": True, "redirect_suggestions": ["/login"]}
        error:
            n/a
        """

        self.clear_cookie("access_token")

        # perform logout in keycloak
        global_vars.keycloak.logout(self._access_token["refresh_token"])

        self.set_status(200)
        self.write({"status": 200, "success": True, "redirect_suggestions": ["/login"]})
