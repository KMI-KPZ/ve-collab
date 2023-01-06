import functools
import json
import logging
from typing import Awaitable, Callable, Dict, List, Optional

from bson import ObjectId
from jose import jwt
import jose.exceptions
from keycloak.exceptions import KeycloakError
from tornado.options import options
import tornado.web

import global_vars
from model import User
from resources.profile import ProfileDoesntExistException, Profiles

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
            self.redirect("/login")
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

        # grab token from the cookie
        token = self.get_secure_cookie("access_token")

        # if there is no token in the cookie, try the Authorization Header for a JWT
        if not token:
            if "Authorization" in self.request.headers:
                # remove the Bearer prefix to only keep the token
                bearer_token = self.request.headers["Authorization"].replace(
                    "Bearer ", ""
                )

                # in order to verify the JWT we need the public key from keycloak
                KEYCLOAK_PUBLIC_KEY = (
                    "-----BEGIN PUBLIC KEY-----\n"
                    + global_vars.keycloak.public_key()
                    + "\n-----END PUBLIC KEY-----"
                )

                # decode the JWT, if any error is thrown, the token
                # is definetly invalid and therefore no session is set
                # otherwise, set the current user as per the content of the
                # token
                try:
                    token_info = jwt.decode(
                        bearer_token, KEYCLOAK_PUBLIC_KEY, audience="account"
                    )
                except jose.exceptions.JWTError as e:
                    logger.info("Caught Exception: {} ".format(e))
                    self.current_user = None
                    self._access_token = None
                    return

                self.current_user = User(
                    token_info["preferred_username"],
                    token_info["sub"],
                    token_info["email"],
                )
                self._access_token = bearer_token
                return
            
            # Authorization Header was not in the request
            # so we cannot authentication any user
            self.current_user = None
            self._access_token = None
            return

        # we got the token from the cookie, since this also has a refresh_token
        # and other info, we have to decode it as json
        # TODO once frontend is built with React, we can get rid of this whole
        # following section, because the backend will become Bearer-only (i.e.
        # never authenticate users itself).
        token = json.loads(token)

        # check if the token is still valid
        # this is quite costly, since its another API call round trip
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

    def json_serialize_response(self, dictionary: dict) -> dict:
        """
        recursively traverse the (variably) nested dict to find any fields that
        require a transformation from its object representation into a str.
        Fields that are transformed are those whose type is an instances of `ObjectId`
        and `datetime.datetime`.
        Parse those values using the `str()` function (for ObjectId's),
        or the `.isoformat()` function (for datetimes).
        """

        for key in dictionary:
            # check for keys whose values need to be transformed
            if isinstance(dictionary[key], ObjectId):
                dictionary[key] = str(dictionary[key])
            elif key == "creation_date" or key == "originalCreationDate":
                dictionary[key] = dictionary[key].isoformat()

            # if it is a nested dict, recursively run on subdict
            # and reassemble it
            elif isinstance(dictionary[key], dict):
                dictionary[key] = self.json_serialize_response(dictionary[key])

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
                        elem = self.json_serialize_response(elem)

        return dictionary

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
