import functools
import json
import os
import shutil
from typing import Awaitable, Callable, Optional

from keycloak import KeycloakGetError
from keycloak.exceptions import KeycloakError
from pymongo import MongoClient
from tornado.options import options
import tornado.web

import global_vars
from logger_factory import get_logger
from model import User

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
        self.client = MongoClient(
            global_vars.mongodb_host,
            global_vars.mongodb_port,
            username=global_vars.mongodb_username,
            password=global_vars.mongodb_password,
        )
        self.db = self.client[global_vars.mongodb_db_name]

        self.upload_dir = global_vars.upload_direcory

    def on_finish(self) -> None:
        self.client.close()

    async def prepare(self):
        # set user for test environments to bypass authentication in the handlers
        # mindlessly changing those values will most certainly break the tests
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

    def json_serialize_posts(self, query_result):
        # parse datetime objects into ISO 8601 strings for JSON serializability
        posts = []
        for post in query_result:
            # post creation date
            post["creation_date"] = post["creation_date"].isoformat()
            if "originalCreationDate" in post:
                post["originalCreationDate"] = post["originalCreationDate"].isoformat()

            # PLACEHOLDER FOR HANDLING COMMENTS WITH NULL VALUE
            if "comments" in post and post["comments"] is not None:
                # creation date of each comment

                for i in range(len(post["comments"])):
                    post["comments"][i]["creation_date"] = post["comments"][i][
                        "creation_date"
                    ].isoformat()
                    post["comments"][i]["_id"] = str(post["comments"][i]["_id"])
            post["_id"] = str(post["_id"])
            posts.append(post)
        return posts

    def get_current_user_role(self):
        if self.current_user:
            current_user_role = self.db.roles.find_one(
                {"username": self.current_user.username}
            )
            if current_user_role:
                return current_user_role["role"]
            else:
                return None
        else:
            return None

    def is_current_user_lionet_admin(self):
        return bool(self.get_current_user_role() == "admin")
