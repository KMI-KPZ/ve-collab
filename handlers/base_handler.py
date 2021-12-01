import functools
import os
import shutil

from datetime import datetime, timedelta
from typing import Awaitable, Callable, Optional

from pymongo import MongoClient
from tornado.options import options
import tornado.web

import CONSTANTS
from dokuwiki_integration import Wiki
from model import User
from socket_client import get_socket_instance
from token_cache import get_token_cache

NEXT_UPDATE_TIMESTAMP = datetime.now()

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

    async def update_token_ttl_to_platform_in_10_min_frame(self):
        """
        update the platform that the current access token has done some action here and is still active. Therefore the platform should also renew their ttl of this token.
        to avoid bloating the network when sending this after each action, only send it in 10min frames. It might miss a renew then, but worst case is a relogin of the user.
        """

        now = datetime.now()
        global NEXT_UPDATE_TIMESTAMP
        if now > NEXT_UPDATE_TIMESTAMP:
            if self.current_user:
                # message the platform to update the ttl of this token
                # no need to await because it is just an information, worst case is a forced relogin
                client = await get_socket_instance()
                response = await client.write({"type": "update_token_ttl",
                                               "access_token": self._access_token})

                if not response["success"]:
                    get_token_cache().remove(self._access_token)
                    print("user removed from token_cache due to not found on platforms cache")

                NEXT_UPDATE_TIMESTAMP = now + timedelta(minutes=1)

                print("update ttl of " + self._access_token + " to platform")

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
            self.wiki = Wiki("http://localhost/", "test_user", "test123")  # use fixed user for now, TODO integration platform users into wiki (plugin authPDO?)

    async def prepare(self):
        # standalone dev mode: no auth, dummy platform
        if options.dev:
            self.current_user = User("test_user1", -1, "dev@test.de")
            return

        token = self.get_secure_cookie("access_token")
        if token is not None:
            token = token.decode("utf-8")
        self._access_token = token

        # first look in own cache
        cached_user = get_token_cache().get(token)
        if cached_user is not None:
            self.current_user = User(cached_user["username"], cached_user["id"], cached_user["email"])
            #print(self.current_user.username)
        else:  # not found in own cache -> ask platform and put into own cache if valid
            client = await get_socket_instance()
            result = await client.write({"type": "token_validation",
                                         "access_token": token})
            if result["success"]:
                self.current_user = User(result["user"]["username"], result["user"]["user_id"], result["user"]["email"])
                get_token_cache().insert(token, self.current_user.username, self.current_user.user_id, self.current_user.email)

            else:  # not valid in own cache and not valid in platform --> no user logged in
                self.current_user = None
                print("no logged in user")

        await self.update_token_ttl_to_platform_in_10_min_frame()

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
