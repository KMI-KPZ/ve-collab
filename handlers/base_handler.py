import functools
import json
from typing import Awaitable, Callable, Dict, List, Optional

from keycloak.exceptions import KeycloakError
from tornado.options import options
import tornado.web

import global_vars
from logger_factory import get_logger
from model import User
from resources.profile import ProfileDoesntExistException, Profiles

logger = get_logger(__name__)


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
            self.redirect("/login")
            return
        return method(self, *args, **kwargs)

    return wrapper


class BaseHandler(tornado.web.RequestHandler):
    def initialize(self):
        self.upload_dir = global_vars.upload_directory

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

        # grab token from the cookie
        token = self.get_secure_cookie("access_token")

        # if there is no token at all, obviously there will be no valid user session
        if not token:
            self.current_user = None
            self._access_token = None
            return

        token = json.loads(token)

        # check if the token is still valid
        # TODO this is quite costly, since its another API call round trip
        # in case we need more performance, we can instead do offline validation
        # by decoding the jwt and checking if it is not expired
        # (tradeoff: we dont know if it was manually invalidated)
        token_info = global_vars.keycloak.introspect(token["access_token"])

        # access token is still valid, successfully set current_user
        if token_info["active"]:
            self.current_user = User(
                token_info["preferred_username"], token_info["sub"], token_info["email"]
            )
            self._access_token = token
        # token is expired, try to refresh it
        else:
            try:
                # refresh the token to gain a new, valid access token
                # if this fails, the refresh token is also no longer active
                # and we set no current_user, demanding a new login
                new_token = global_vars.keycloak.refresh_token(token["refresh_token"])
                token_info = global_vars.keycloak.introspect(new_token["access_token"])
            except KeycloakError as e:
                logger.info("Caught Exception: {} ".format(e))
                self.current_user = None
                self._access_token = None
                return

            # update the cookie to the new token value
            self.set_secure_cookie("access_token", json.dumps(new_token))

            # refresh was successful, so we set current_user
            self.current_user = User(
                token_info["preferred_username"],
                token_info["sub"],
                token_info["email"],
            )
            self._access_token = new_token

    def json_serialize_posts(self, query_result: dict) -> List[dict]:
        """
        parse creation dates and _id's into string representations to achieve
        json-serializability
        """

        for post in query_result:
            # post creation date and _id
            post["_id"] = str(post["_id"])
            post["creation_date"] = post["creation_date"].isoformat()
            if "originalCreationDate" in post:
                post["originalCreationDate"] = post["originalCreationDate"].isoformat()

            # creation date and _id of each comment
            if "comments" in post and post["comments"] is not None:
                for comment in post["comments"]:
                    comment["creation_date"] = comment["creation_date"].isoformat()
                    comment["_id"] = str(comment["_id"])
        return query_result

    def get_current_user_role(self):
        if not self.current_user:
            return None  # TODO could also raise exception?

        with Profiles() as profile_manager:
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
            logger.info(
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
                logger.info(
                    "Keycloak Error occured while trying to request user data: {}".format(
                        e
                    )
                )
                raise
