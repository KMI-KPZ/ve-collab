import functools
import json
import os
import shutil

from typing import Awaitable, Callable, Optional

from keycloak import KeycloakGetError
from keycloak.exceptions import KeycloakAuthenticationError
from pymongo import MongoClient
from tornado.options import options
import tornado.web

import CONSTANTS
from dokuwiki_integration import Wiki
import global_vars
from model import User

def auth_needed(method: Callable[..., Optional[Awaitable[None]]]) -> Callable[..., Optional[Awaitable[None]]]:
    """
    logging decorator
    decorate your handlers http methods with @log_access, and the access and origin will be logged to the logfile
    """

    @functools.wraps(method)
    def wrapper(self: tornado.web.RequestHandler, *args, **kwargs) -> Optional[Awaitable[None]]:
        if not self.current_user:
            self.set_status(401)
            self.write({"status": 401, "reason": "no_logged_in_user"})
            return
        return method(self, *args, **kwargs)
    return wrapper


class BaseHandler(tornado.web.RequestHandler):

    def initialize(self):
        self.client = MongoClient('localhost', 27017, username=CONSTANTS.MONGODB_USERNAME, password=CONSTANTS.MONGODB_PASSWORD)
        self.db = self.client['lionet']  # TODO make this generic via config

        self.upload_dir = "uploads/"
        if not os.path.isdir(self.upload_dir):
            os.mkdir(self.upload_dir)
        if not os.path.isfile(self.upload_dir + "default_profile_pic.jpg"):
            shutil.copy2("assets/default_profile_pic.jpg", self.upload_dir)

        if options.no_wiki:
            self.wiki = None
        else:
            self.wiki = Wiki("http://soserve.rz.uni-leipzig.de:8079/", "user", "password")  # use fixed user for now, TODO integration platform users into wiki (plugin authPDO?)

    async def prepare(self):
        token = self.get_secure_cookie("access_token")
        if token is not None:
            token = json.loads(token)
        else:
            self.redirect(CONSTANTS.ROUTING_TABLE["platform"] + "/login")

        try:
            # try to refresh the token and fetch user info. this will fail if there is no valid session
            token = global_vars.keycloak.refresh_token(token['refresh_token'])

            userinfo = global_vars.keycloak.userinfo(token['access_token'])
            # if token is still valid --> successfull authentication --> we set the current_user
            if userinfo:
                self.current_user = User(userinfo["preferred_username"], userinfo["sub"], userinfo["email"])
                self._access_token = token
        except KeycloakGetError as e:
            print(e)
            # something wrong with request
            # decode error message
            decoded = json.loads(e.response_body.decode())
            # no active session means user is not logged in --> redirect him straight to login
            if decoded["error"] == "invalid_grant" and decoded["error_description"] == "Session not active":
                self.current_user = None
                self._access_token = None
                self.redirect(CONSTANTS.ROUTING_TABLE["platform"] + "/login")
        except KeycloakAuthenticationError as e:
            print(e)
            self.current_user = None
            self.current_userinfo = None
            self._access_token = None
            self.redirect(CONSTANTS.ROUTING_TABLE["platform"] + "/login")

    def json_serialize_posts(self, query_result):
        # parse datetime objects into ISO 8601 strings for JSON serializability
        posts = []
        for post in query_result:
            # post creation date
            post['creation_date'] = post['creation_date'].isoformat()
            if('originalCreationDate' in post):
                post['originalCreationDate'] = post['originalCreationDate'].isoformat()

            if 'comments' in post and post['comments'] is not None: #PLACEHOLDER FOR HANDLING COMMENTS WITH NULL VALUE
                # creation date of each comment

                for i in range(len(post['comments'])):
                    post['comments'][i]['creation_date'] = post['comments'][i]['creation_date'].isoformat()
                    post['comments'][i]['_id'] = str(post['comments'][i]['_id'])
            post['_id'] = str(post['_id'])
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
