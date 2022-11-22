from abc import ABCMeta
import json

import tornado.web

import global_vars
from handlers.base_handler import BaseHandler
from logger_factory import log_access


class LoginHandler(tornado.web.RequestHandler, metaclass=ABCMeta):
    """
    Authenticate a user towards the Platform
    """

    @log_access
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
    @log_access
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
        print(token)

        # get user info
        userinfo = global_vars.keycloak.userinfo(token["access_token"])
        print(userinfo)

        # ensure that a profile exists for the user
        # if not, create one
        profile = self.db.profiles.find_one({"user": userinfo["preferred_username"]})
        if not profile:
            self.db.profiles.insert_one(
                {
                    "user": userinfo[
                        "preferred_username",
                        "bio": None,
                        "institution": None,
                        "projects": None,
                        "profile_pic": "default_profile_pic.jpg",
                        "first_name": userinfo["given_name"],
                        "last_name": userinfo["family_name"],
                        "gender": None,
                        "address": None,
                        "birthday": None,
                        "experience": None,
                        "education": None,
                    ]
                }
            )

        # dump token dict to str and store it in a secure cookie (BaseHandler will decode it later to validate a user is logged in)
        self.set_secure_cookie("access_token", json.dumps(token))

        self.redirect("/main")


class LogoutHandler(BaseHandler, metaclass=ABCMeta):
    """
    Logout Endpoint
    """

    @log_access
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
        print(self._access_token)
        global_vars.keycloak.logout(self._access_token["refresh_token"])

        self.set_status(200)
        self.write({"status": 200, "success": True, "redirect_suggestions": ["/login"]})
