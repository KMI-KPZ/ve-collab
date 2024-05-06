import datetime
import functools
import json
import logging
from typing import Awaitable, Callable, Dict, List, Optional

from bson import ObjectId
from jose import jwt
import jose.exceptions
from keycloak import KeycloakGetError
from keycloak.exceptions import KeycloakError
from tornado.options import options
import tornado.web

import global_vars
from model import User
from resources.network.profile import ProfileDoesntExistException, Profiles
import util

logger = logging.getLogger()


def auth_needed(
    method: Callable[..., Optional[Awaitable[None]]]
) -> Callable[..., Optional[Awaitable[None]]]:
    """
    authentication decorator that checks if a valid session exists (by checking that self.current_user has been set from the Basehandler's prepare()-function ),
    otherwise redirects to platform for the login procedure
    """

    @functools.wraps(method)
    def wrapper(
        self: tornado.web.RequestHandler, *args, **kwargs
    ) -> Optional[Awaitable[None]]:
        if not self.current_user:
            self.set_status(401)
            self.write({"status": 401, "reason": "no_logged_in_user"})
            # self.redirect("/login")
            return
        return method(self, *args, **kwargs)

    return wrapper


class BaseHandler(tornado.web.RequestHandler):
    async def prepare(self):
        # set user for test environments to bypass authentication in the handlers
        # warning: mindlessly changing those values will most certainly break the tests
        if options.test_admin:
            self.current_user = User(
                "test_admin",
                "aaaaaaaa-bbbb-0000-cccc-dddddddddddd",
                "test_admin@mail.de",
            )
            return
        elif options.test_user:
            self.current_user = User(
                "test_user",
                "aaaaaaaa-bbbb-1111-cccc-dddddddddddd",
                "test_user@mail.de",
            )
            return
        
        # abort if there is no Authorization header
        if "Authorization" not in self.request.headers:
            self.current_user = None
            self._access_token = None
            return

        # remove the Bearer prefix to only keep the token
        bearer_token = self.request.headers["Authorization"].replace(
            "Bearer ", ""
        )

        try:
            # in order to verify the JWT we need the public key from keycloak
            KEYCLOAK_PUBLIC_KEY = (
                "-----BEGIN PUBLIC KEY-----\n"
                + global_vars.keycloak.public_key()
                + "\n-----END PUBLIC KEY-----"
            )
        except KeycloakGetError:
            self.current_user = None
            self._access_token = None
            return

        # decode the JWT, if any error is thrown, the token
        # is definetly invalid and therefore no session is set
        # otherwise, set the current user as per the content of the
        # token
        try:
            token_info = jwt.decode(
                bearer_token, KEYCLOAK_PUBLIC_KEY, audience="account"
            )
        except jose.exceptions.JWTError as e:
            self.current_user = None
            self._access_token = None
            return

        self.current_user = User(
            token_info["preferred_username"],
            token_info["sub"],
            token_info["email"],
        )

        # if the user was authenticated via ORCiD,
        # or atleast has their ORCiD account linked,
        # set their id for use within the handlers
        if "orcid" in token_info:
            self.current_user.orcid = token_info["orcid"]

        self._access_token = bearer_token
        return

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header(
            "Access-Control-Allow-Headers", "x-requested-with, Authorization"
        )
        self.set_header(
            "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"
        )

    def options(self):
        # no body
        self.set_status(200)
        self.finish()

    def json_serialize_response(self, dictionary: dict) -> dict:
        """
        wrapper around `util.json_serialize_response()` to make
        a dictionary serializable by JSON. see this function for details.
        """

        return util.json_serialize_response(dictionary)

    def serialize_and_write(self, response: dict) -> None:
        self.write(self.json_serialize_response(response))

    def get_current_user_role(self):
        if not self.current_user:
            return None  # TODO could also raise exception?

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            try:
                return profile_manager.get_role(self.current_user.username)
            except ProfileDoesntExistException:
                return None

    def is_current_user_lionet_admin(self):
        return bool(self.get_current_user_role() == "admin")

    def get_keycloak_user(self, username: str) -> Dict:
        if options.test_admin:
            return {
                "id": "aaaaaaaa-bbbb-0000-cccc-dddddddddddd",
                "email": "test_admin@mail.de",
                "username": "test_admin",
            }
        if options.test_user:
            return {
                "id": "aaaaaaaa-bbbb-1111-cccc-dddddddddddd",
                "email": "test_user@mail.de",
                "username": "test_user",
            }

        try:
            # refresh the token to keycloak admin portal, because it might have timed out (resulting in the following requests not succeeding)
            global_vars.keycloak_admin.refresh_token()

            # request user data from keycloak
            user_id = global_vars.keycloak_admin.get_user_id(username)
            return global_vars.keycloak_admin.get_user(user_id)
        except KeycloakError as e:
            logger.warn(
                "Keycloak Error occured while trying to request user data: {}".format(e)
            )
            raise

    def get_keycloak_user_list(self) -> List[Dict]:
        """
        get a list of user from keycloak. if we are in test mode,
        get list of test users in the same format
        """

        if options.test_admin or options.test_user:
            # dont change these values, they match with the unit tests
            return [
                {
                    "access": {
                        "impersonate": False,
                        "manage": False,
                        "manageGroupMembership": False,
                        "mapRoles": False,
                        "view": True,
                    },
                    "createdTimestamp": 1000000000000,
                    "disableableCredentialTypes": [],
                    "email": "test_admin@mail.de",
                    "emailVerified": True,
                    "enabled": True,
                    "firstName": "Test",
                    "id": "aaaaaaaa-bbbb-0000-cccc-dddddddddddd",
                    "lastName": "Admin",
                    "notBefore": 0,
                    "requiredActions": [],
                    "totp": False,
                    "username": "test_admin",
                },
                {
                    "access": {
                        "impersonate": False,
                        "manage": False,
                        "manageGroupMembership": False,
                        "mapRoles": False,
                        "view": True,
                    },
                    "createdTimestamp": 1000000000000,
                    "disableableCredentialTypes": [],
                    "email": "test_user@mail.de",
                    "emailVerified": True,
                    "enabled": True,
                    "firstName": "Test",
                    "id": "aaaaaaaa-bbbb-1111-cccc-dddddddddddd",
                    "lastName": "User",
                    "notBefore": 0,
                    "requiredActions": [],
                    "totp": False,
                    "username": "test_user",
                },
            ]
        else:
            try:
                # refresh the token to keycloak admin portal, because it might have timed out (resulting in the following requests not succeeding)
                global_vars.keycloak_admin.refresh_token()
                return global_vars.keycloak_admin.get_users()
            except KeycloakError as e:
                logger.warn(
                    "Keycloak Error occured while trying to request user data: {}".format(
                        e
                    )
                )
                raise
