import os
import sys
sys.path.append(os.path.dirname(__file__))
import asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import tornado.ioloop
import tornado.web
import tornado.locks
import dateutil.parser
import SOCIALSERV_CONSTANTS
import re
import shutil
import util
import socket
import json
from contextlib import closing
from bson.objectid import ObjectId
from datetime import datetime, timedelta
from pymongo import MongoClient
from socket_client import get_socket_instance
from model import User
from socialserv_token_cache import get_token_cache
from tornado.options import define, options
from base64 import b64encode

define("standalone_dev", default=False, type=bool, help="start in standalone dev mode (no auth)")


class BaseHandler(tornado.web.RequestHandler):

    def initialize(self):
        self.client = MongoClient('localhost', 27017)
        self.db = self.client['social_serv']  # TODO make this generic via config

        self.upload_dir = "uploads/"
        if SOCIALSERV_CONSTANTS.STARTED_BY_PLATFORM:
            self.upload_dir = "modules/SocialServ/uploads/"

        if not os.path.isdir(self.upload_dir):
            os.mkdir(self.upload_dir)

        if SOCIALSERV_CONSTANTS.STARTED_BY_PLATFORM:
            if not os.path.isfile(self.upload_dir + "default_profile_pic.jpg"):
                shutil.copy2("modules/SocialServ/assets/default_profile_pic.jpg", self.upload_dir)
        else:
            if not os.path.isfile(self.upload_dir + "default_profile_pic.jpg"):
                shutil.copy2("assets/default_profile_pic.jpg", self.upload_dir)

    async def prepare(self):
        # standalone dev mode: no auth, dummy platform
        if options.standalone_dev:
            self.current_user = User("test_user1", -1, "dev@test.de")
            return

        token = self.get_secure_cookie("access_token")
        if token is not None:
            token = token.decode("utf-8")

        # first look in own cache
        cached_user = get_token_cache().get(token)
        if cached_user is not None:
            self.current_user = User(cached_user["username"], cached_user["id"], cached_user["email"])
            print(self.current_user.username)
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

        # TODO if validation succeeds to periodic callback with ttl to tell platform that token is still valid (action taken here) and instruct platform to update their ttl too

    def json_serialize_posts(self, query_result):
        # parse datetime objects into ISO 8601 strings for JSON serializability
        posts = []
        for post in query_result:
            # post creation date
            post['creation_date'] = post['creation_date'].isoformat()
            if('originalCreationDate' in post):
                post['originalCreationDate'] = post['originalCreationDate'].isoformat()

            if 'comments' in post:
                # creation date of each comment
                for i in range(len(post['comments'])):
                    post['comments'][i]['creation_date'] = post['comments'][i]['creation_date'].isoformat()
                    post['comments'][i]['_id'] = str(post['comments'][i]['_id'])
            post['_id'] = str(post['_id'])
            posts.append(post)
        return posts


class MainHandler(BaseHandler):

    def get(self):
        self.render("html/main.html")


class AdminHandler(BaseHandler):

    def get(self):
        self.render("html/newsfeed.html")


class MyProfileHandler(BaseHandler):

    def get(self):
        self.render("html/myProfile.html")


class ProfileHandler(BaseHandler):

    def get(self, slug):
        self.render("html/profile.html")


class SpaceRenderHandler(BaseHandler):

    def get(self, slug):
        self.render("html/space.html")


class PostHandler(BaseHandler):
    """
    Make a new post
    """

    def get(self):
        pass

    def post(self):
        """
        POST /posts
        http body:
            {
                "text": "text_of_post",
                "tags": ["tag1", "tag2"],
                "space": "optional, post this post into a space, not directly into your profile"
            }
        return:
            200 OK,
            {"status": 200,
             "success": True}

            400 Bad Request,
            {"status": 400,
             "reason": "space_does_not_exist"}

            401 Unauthorized,
            {"status": 401,
             "reason": "no_logged_in_user"}
        """

        if self.current_user:
            author = self.current_user.username
            creation_date = datetime.utcnow()
            text = self.get_body_argument("text")  # http_body['text']
            tags = self.get_body_argument("tags")  # http_body['tags']
            space = self.get_body_argument("space", None)  # if space is set, this post belongs to a space (only visible inside)

            # check if space exists, if not, end with 400 Bad Request
            if space is not None:
                existing_spaces = []
                for existing_space in self.db.spaces.find(projection={"name": True, "_id": False}):
                    existing_spaces.append(existing_space["name"])
                if space not in existing_spaces:
                    self.set_status(400)
                    self.write({"status": 400,
                                "reason": "space_does_not_exist"})
                    self.finish()
                    return

            # handle files
            file_amount = self.get_body_argument("file_amount", None)
            files = []
            if file_amount:

                # save every file
                for i in range(0, int(file_amount)):
                    file_obj = self.request.files["file" + str(i)][0]
                    file_ext = os.path.splitext(file_obj["filename"])[1]
                    new_file_name = b64encode(os.urandom(32)).decode("utf-8")
                    new_file_name = re.sub('[^0-9a-zäöüßA-ZÄÖÜ]+', '_', new_file_name).lower() + file_ext
                    print(new_file_name)

                    with open(self.upload_dir + new_file_name, "wb") as fp:
                        fp.write(file_obj["body"])

                    files.append(new_file_name)

            post = {"author": author,
                    "creation_date": creation_date,
                    "text": text,
                    "space": space,
                    "tags": tags,
                    "files": files}

            self.db.posts.insert_one(post)

            self.set_status(200)
            self.write({'status': 200,
                        'success': True})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

    def delete(self):
        """
        DELETE /posts
            http_body:
                {
                    "post_id": <string>
                }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request,
                {"status": 400,
                 "reason": <string>}

                 401 Unauthorized
                 {"status": 401,
                  "reason": "no_logged_in_user"}
        """

        if self.current_user:
            http_body = tornado.escape.json_decode(self.request.body)

            if "post_id" in http_body:
                self.db.posts.delete_one({"_id": ObjectId(http_body["post_id"])})

                self.set_status(200)
                self.write({"status": 200,
                            "success": True})
            else:
                self.set_status(400)
                self.write({"status": 400,
                            "reason": "missing_key_in_http_body"})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


class CommentHandler(BaseHandler):
    """
    Make a new comment to a certain post
    """

    def get(self):
        pass

    def post(self):
        """
        POST /comment
        http body:
            {
                "text": "content_of_comment",
                "post_id": "id_von_post"
            }
        return:
            200 OK
            {"status": 200,
             "success": True}

            400 Bad Request
            {"status": 400,
             "reason": "missing_key_in_http_body"}

            401 Unauthorized
            {"status": 401,
             "reason": "no_logged_in_user"}
        """

        if self.current_user:
            http_body = tornado.escape.json_decode(self.request.body)

            if "post_id" not in http_body:  # exit if there is no post_id to associate the comment to
                self.set_status(400)
                self.write({"status": 400,
                            "reason": "missing_key_in_http_body"})
                self.finish()
                return

            author = self.current_user.username
            creation_date = datetime.utcnow()
            text = http_body['text']
            post_ref = ObjectId(http_body['post_id'])

            self.db.posts.update_one(
                {"_id": post_ref},  # filter
                {                   # update
                    "$push": {
                        "comments": {"_id": ObjectId(), "author": author, "creation_date": creation_date, "text": text}
                    }
                }
            )

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

    def delete(self):
        """
        DELETE /comment
            http_body:
                {
                    "comment_id": <string>
                }

            returns:
                200 OK
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            http_body = tornado.escape.json_decode(self.request.body)

            if "comment_id" in http_body:
                self.db.posts.update_many(
                    {},  # filter
                    {    # update
                        "$pull": {
                            "comments": {"_id": ObjectId(http_body["comment_id"])}
                        }
                    }
                )

                self.set_status(200)
                self.write({"status": 200,
                            "success": True})
            else:
                self.set_status(400)
                self.write({"status": 400,
                            "reason": "missing_key_in_http_body"})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


class LikePostHandler(BaseHandler):

    def post(self):
        """
        POST /like
            http body:
                {
                    "post_id": "id_of_post_to_like"
                }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            http_body = tornado.escape.json_decode(self.request.body)

            if "post_id" not in http_body:
                self.set_status(400)
                self.write({"status": 400,
                            "reason": "missing_key_in_http_body"})
                self.finish()
                return

            post_ref = ObjectId(http_body['post_id'])

            self.db.posts.update_one(
                {"_id": post_ref},  # filter
                {                   # update
                    "$addToSet": {
                        "likers": self.current_user.username
                    }
                }
            )

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})
        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

    def delete(self):
        """
        DELETE /like
            http_body:
                {
                    "post_id": <string>
                }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            http_body = tornado.escape.json_decode(self.request.body)

            if "post_id" in http_body:
                self.db.posts.update_one(
                    {"_id": ObjectId(http_body["post_id"])},
                    {
                        "$pull": {
                            "likers": self.current_user.username
                        }
                    }
                )

                self.set_status(200)
                self.write({"status": 200,
                            "success": True})
            else:
                self.set_status(400)
                self.write({"status": 400,
                            "reason": "missing_key_in_http_body"})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

class RepostHandler(BaseHandler):
    """
    POST /repost
        http body:
            {
                "post_id": "id_of_post",
                "text": "new text for the repost",
                "space": "the space where to post"
            }

        returns:
            200 OK,
            {"status": 200,
             "success": True}

            400 Bad Request
            {"status": 400,
             "reason": "missing_key_in_http_body"}

            401 Unauthorized
            {"status": 401,
             "reason": "no_logged_in_user"}
    """

    def post(self):
        if self.current_user:
            http_body = tornado.escape.json_decode(self.request.body)

            if "post_id" not in http_body:
                self.set_status(400)
                self.write({"status": 400,
                            "reason": "missing_key_in_http_body"})
                self.finish()
                return

            post_ref = ObjectId(http_body['post_id'])
            text = http_body['text']

            post = self.db.posts.find_one(
                {"_id": post_ref}
            )
            profile = self.db.profiles.find_one({"user": self.current_user.username})
            if profile:
                if "profile_pic" in profile:
                    post["repostAuthorProfilePic"] = profile["profile_pic"]
            post["isRepost"] = True
            post["repostAuthor"] = self.current_user.username
            post["originalCreationDate"] = post['creation_date']
            post["creation_date"] = datetime.utcnow()
            post["repostText"] = text

            space = http_body['space']

            # check if space exists, if not, end with 400 Bad Request
            if space is not None:
                existing_spaces = []
                for existing_space in self.db.spaces.find(projection={"name": True, "_id": False}):
                    existing_spaces.append(existing_space["name"])
                if space not in existing_spaces:
                    self.set_status(400)
                    self.write({"status": 400,
                                "reason": "space_does_not_exist"})
                    self.finish()
                    return
            post["space"] = space

            del post["_id"]
            if "likers" in post:
                del post["likers"]
            if "comments" in post:
                del post["comments"]
            if "tags" in post:
                post["tags"] = ""

            print(post)
            self.db.posts.insert_one(post)

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})
        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

class FollowHandler(BaseHandler):

    def get(self):
        """
        GET /follow
            get list of usernames that the current user follows
            query param: user : string (required)

            returns:
                200 OK,
                {"user": <string>,
                 "follows": ["username1", "username2", ...]}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """
        if self.current_user:
            username = self.get_argument("user")

            result = self.db.follows.find(
                filter={"user": username},
                projection={"_id": False}
            )

            follows = []  # need to instantiate it because if user follows nobody the iteration wont be run "follows" would get unassigned
            for user in result:  # even though there is only one item in result set we need to iterate because query returns a cursor instance
                follows = user["follows"]

            self.set_status(200)
            self.write({"user": username,
                        "follows": follows})
        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

    def post(self):
        """
        POST /follow
            follow a user
            query param: user : string (required; the username u want to follow)

            returns:
                200 OK
                {"status": 200,
                 "success": True}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            username = self.current_user.username
            user_to_follow = self.get_argument("user")

            self.db.follows.update_one(
                {"user": username},  # fitler
                {
                    "$addToSet": {  # update
                        "follows": user_to_follow
                    }
                },
                upsert=True  # if no document already present, create one (i.e. user follows somebody for first time)
            )

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

    def delete(self):
        """
        DELETE /follow
            unfollow a user
            query param: user : the user to unfollow

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            username = self.get_argument("user")

            self.db.follows.update_one(
                {"user": self.current_user.username},
                {
                    "$pull": {
                        "follows": username
                    }
                }
            )

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


class TimelineHandler(BaseHandler):
    """
    Timeline of all posts (all users and all spaces)
    no use case in production, maybe use case for moderators?
    """

    async def get(self):
        """
        GET /timeline
        query params:
            "from" : ISO timestamp string (fetch posts not older than this), default: now-24h
            "to" : ISO timestamp string (fetch posts younger than this), default: now
        return:
            200 OK,
            {"posts": [post1, post2,...]}
        """
        if await util.is_admin(self.current_user.username):
            time_from = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())  # default value is 24h ago
            time_to = self.get_argument("to", datetime.utcnow().isoformat())  # default value is now

            # parse time strings into datetime objects (dateutil is able to guess format)
            # however safe way is to use ISO 8601 format
            time_from = dateutil.parser.parse(time_from)
            time_to = dateutil.parser.parse(time_to)

            result = self.db.posts.find(
                            filter={"creation_date": {"$gte": time_from, "$lte": time_to}})

            posts = self.json_serialize_posts(result)
            # TODO more efficient
            for post in posts:
                author_name = post["author"]
                post["author"] = {}
                post["author"]["profile_pic"] = "default_profile_pic.jpg"
                profile = self.db.profiles.find_one({"user": author_name})
                if profile:
                    if "profile_pic" in profile:
                        post["author"]["profile_pic"] = profile["profile_pic"]
                post["author"]["username"] = author_name
                if "comments" in post:
                    for comment in post["comments"]:
                        comment_author_name = comment["author"]
                        comment["author"] = {}
                        comment["author"]["profile_pic"] = "default_profile_pic.jpg"
                        comment_author_profile = self.db.profiles.find_one({"user": comment_author_name})
                        if comment_author_profile:
                            if "profile_pic" in comment_author_profile:
                                comment["author"]["profile_pic"] = comment_author_profile["profile_pic"]
                        comment["author"]["username"] = comment_author_name

            self.set_status(200)
            self.write({"posts": posts})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "not_admin"})


class SpaceTimelineHandler(BaseHandler):
    """
    Timeline of a certain space
    """

    def get(self, space_name):
        """
        GET /timeline/space/[name]
        query params:
            "from" : ISO timestamp string (fetch posts not older than this), default: now-24h
            "to" : ISO timestamp string (fetch posts younger than this), default: now
        return:
            200 OK,
            {"posts": [post1, post2,...]}

            409 Conflict,
            {"status": 409,
             "reason": "user_not_member_of_space"}

             401 Unauthorized,
             {"status": 401,
              "reason": "no_logged_in_user"}
        """

        if self.current_user:
            time_from = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())  # default value is 24h ago
            time_to = self.get_argument("to", datetime.utcnow().isoformat())  # default value is now

            # parse time strings into datetime objects (dateutil is able to guess format)
            # however safe way is to use ISO 8601 format
            time_from = dateutil.parser.parse(time_from)
            time_to = dateutil.parser.parse(time_to)

            # check if current_user is in the space and only query for posts if yes
            space_data = self.db.spaces.find(
                {"name": space_name}
            )
            for space in space_data:
                if self.current_user.username in space["members"]:
                    result = self.db.posts.find(
                                    filter={"creation_date": {"$gte": time_from, "$lte": time_to},
                                            "space":         {"$eq": space_name}})

                    posts = self.json_serialize_posts(result)
                    # TODO more efficient
                    for post in posts:
                        author_name = post["author"]
                        post["author"] = {}
                        post["author"]["profile_pic"] = "default_profile_pic.jpg"
                        profile = self.db.profiles.find_one({"user": author_name})
                        if profile:
                            if "profile_pic" in profile:
                                post["author"]["profile_pic"] = profile["profile_pic"]
                        post["author"]["username"] = author_name
                        if "comments" in post:
                            for comment in post["comments"]:
                                comment_author_name = comment["author"]
                                comment["author"] = {}
                                comment["author"]["profile_pic"] = "default_profile_pic.jpg"
                                comment_author_profile = self.db.profiles.find_one({"user": comment_author_name})
                                if comment_author_profile:
                                    if "profile_pic" in comment_author_profile:
                                        comment["author"]["profile_pic"] = comment_author_profile["profile_pic"]
                                comment["author"]["username"] = comment_author_name

                    self.set_status(200)
                    print(posts)
                    self.write({"posts": posts})

                else:
                    self.set_status(409)
                    self.write({"status": 409,
                                "reason": "user_not_member_of_space"})
        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


class UserTimelineHandler(BaseHandler):
    """
    Timeline of a user (e.g. for his profile)
    """

    def get(self, author):
        """
        GET /timeline/user/[username]
        query params:
            "from" : ISO timestamp string (fetch posts not older than this), default: now-24h
            "to" : ISO timestamp string (fetch posts younger than this), default: now
        return:
            200 OK,
            {"posts": [post1, post2,...]}

            401 Unauthorized
            {"status": 401,
             "reason": "no_logged_in_user"}
        """

        if self.current_user:
            time_from = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())  # default value is 24h ago
            time_to = self.get_argument("to", datetime.utcnow().isoformat())  # default value is now

            # parse time strings into datetime objects (dateutil is able to guess format)
            # however safe way is to use ISO 8601 format
            time_from = dateutil.parser.parse(time_from)
            time_to = dateutil.parser.parse(time_to)

            # TODO what about posts in spaces? include? exclude? include only those that current user is also in?
            result = self.db.posts.find(
                            filter={"creation_date": {"$gte": time_from, "$lte": time_to},
                                    "author":         {"$eq": author}})

            posts = self.json_serialize_posts(result)
            # TODO more efficient
            for post in posts:
                author_name = post["author"]
                post["author"] = {}
                post["author"]["profile_pic"] = "default_profile_pic.jpg"
                profile = self.db.profiles.find_one({"user": author_name})
                if profile:
                    if "profile_pic" in profile:
                        post["author"]["profile_pic"] = profile["profile_pic"]
                post["author"]["username"] = author_name
                if "comments" in post:
                    for comment in post["comments"]:
                        comment_author_name = comment["author"]
                        comment["author"] = {}
                        comment["author"]["profile_pic"] = "default_profile_pic.jpg"
                        comment_author_profile = self.db.profiles.find_one({"user": comment_author_name})
                        if comment_author_profile:
                            if "profile_pic" in comment_author_profile:
                                comment["author"]["profile_pic"] = comment_author_profile["profile_pic"]
                        comment["author"]["username"] = comment_author_name

            self.set_status(200)
            self.write({"posts": posts})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


class PersonalTimelineHandler(BaseHandler):
    """
    the timeline of the currently authenticated user.
    i.e. your posts, posts of users you follow, posts in spaces you are in
    """

    def get(self):
        """
        GET /timeline/you
            query params:
                "from" : ISO timestamp string (fetch posts not older than this), default: now-24h
                "to" : ISO timestamp string (fetch posts younger than this), default: now
            return:
                200 OK,
                {"posts": [post1, post2,...]}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            time_from = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())  # default value is 24h ago
            time_to = self.get_argument("to", datetime.utcnow().isoformat())  # default value is now

            # parse time strings into datetime objects (dateutil is able to guess format)
            # however safe way is to use ISO 8601 format
            time_from = dateutil.parser.parse(time_from)
            time_to = dateutil.parser.parse(time_to)

            spaces_cursor = self.db.spaces.find(
                filter={"members": self.current_user.username}
            )
            spaces = []
            for space in spaces_cursor:
                spaces.append(space["name"])

            follows_cursor = self.db.follows.find(
                filter={"user": self.current_user.username},
                projection={"_id": False}
            )
            follows = []
            for user in follows_cursor:
                follows = user["follows"]
            follows.append(self.current_user.username)  # append yourself for easier query of posts

            result = self.db.posts.find(
                filter={"creation_date": {"$gte": time_from, "$lte": time_to}}
            )

            posts_to_keep = []
            for post in result:
                if ("author" in post and post["author"] in follows) or ("space" in post and post["space"] in spaces):
                    posts_to_keep.append(post)

            posts = self.json_serialize_posts(posts_to_keep)
            # TODO more efficient
            for post in posts:
                author_name = post["author"]
                post["author"] = {}
                post["author"]["profile_pic"] = "default_profile_pic.jpg"
                profile = self.db.profiles.find_one({"user": author_name})
                if profile:
                    if "profile_pic" in profile:
                        post["author"]["profile_pic"] = profile["profile_pic"]
                post["author"]["username"] = author_name
                if "comments" in post:
                    for comment in post["comments"]:
                        comment_author_name = comment["author"]
                        comment["author"] = {}
                        comment["author"]["profile_pic"] = "default_profile_pic.jpg"
                        comment_author_profile = self.db.profiles.find_one({"user": comment_author_name})
                        if comment_author_profile:
                            if "profile_pic" in comment_author_profile:
                                comment["author"]["profile_pic"] = comment_author_profile["profile_pic"]
                        comment["author"]["username"] = comment_author_name

            self.set_status(200)
            self.write({"posts": posts})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


class SpaceHandler(BaseHandler):
    """
    handle existing and creation of new spaces
    """

    def get(self, slug):
        """
        GET /spaceadministration/list
        return:
            200 OK,
            {"spaces": [space1, space2,...]}

            401 Unauthorized
            {"status": 401,
             "reason": "no_logged_in_user"}
        """

        if self.current_user:
            if slug == "list":
                result = self.db.spaces.find({})

                spaces = []
                for space in result:
                    space['_id'] = str(space['_id'])
                    spaces.append(space)

                self.write({"spaces": spaces})
        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

    def post(self, slug):
        """
        POST /spaceadministration/create
            query param:
                "name" : space name to create, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                409 Conflict
                {"status": 409,
                 "reason": "space_name_already_exists"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

        POST /spaceadministration/join
            (currently authed user joins space)
            query param:
                "name" : space name of which space to join, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            space_name = self.get_argument("name")

            if slug == "create":  # create new space
                members = [self.current_user.username]

                # only create space if no other space with the same name exists
                existing_spaces = []
                for existing_space in self.db.spaces.find(projection={"name": True, "_id": False}):
                    existing_spaces.append(existing_space["name"])
                if space_name not in existing_spaces:
                    space = {"name": space_name,
                             "members": members}
                    self.db.spaces.insert_one(space)

                    self.set_status(200)
                    self.write({'status': 200,
                                'success': True})
                else:
                    self.set_status(409)
                    self.write({"status": 409,
                                "reason": "space_name_already_exists"})

            elif slug == "join":  # add current user to space members
                self.db.spaces.update_one(
                    {"name": space_name},  # filter
                    {
                        "$addToSet": {"members": self.current_user.username}
                    }
                )

                self.set_status(200)
                self.write({'status': 200,
                            'success': True})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


class NewPostsSinceTimestampHandler(BaseHandler):
    """
    check for new posts
    """

    def get(self):
        """
        GET /updates
            query param: from (timestamp string), default now - 24h
            return:
                200 OK --> new posts, use timeline handlers to retrieve
                304 Not Modified --> no new posts since timestamp, no need to query timeline handlers
        """

        timestamp = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())
        timestamp = dateutil.parser.parse(timestamp)

        # TODO refine query: check only the valid posts for the current user (i.e. the spaces he's in, users he is following)
        new_posts_count = self.db.posts.count_documents(filter={"creation_date": {"$gte": timestamp}})

        if new_posts_count != 0:  # new posts since timestamp, user has to query the timeline handlers
            self.set_status(200)
            self.write({"status": 200,
                        "new_posts": True,
                        "since_timestamp": timestamp.isoformat()})
        else:  # no new posts since timestamp, return 304 not changed
            self.set_status(304)


class ProfileInformationHandler(BaseHandler):

    async def get(self):
        """
        GET /profileinformation
            request full information about the current user

            returns:
                200 OK
                {user: {
                    "user_id": <int>,
                    "username": <string>,
                    "email": <string>,
                 },
                 "profile": {
                    "bio": <string>,
                    "institution": <string>,
                    "projects": [<string1>, <string2>, ...],
                 },
                 "spaces": [<string1>, <string2>, ...],
                 "follows": [<string1>, <string2>, ...]
                }

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            username = self.get_argument("username", None)
            if not username:
                username = self.current_user.username

            # get account information from platform
            client = await get_socket_instance()
            user_result = await client.write({"type": "get_user",
                                              "username": username})

            # grab spaces
            spaces_cursor = self.db.spaces.find(
                filter={"members": username}
            )
            spaces = []
            for space in spaces_cursor:
                spaces.append(space["name"])

            # grab users that the current_user follows
            follows_cursor = self.db.follows.find(
                filter={"user": username}
            )
            follows = []
            for user in follows_cursor:
                follows = user["follows"]

            profile_cursor = self.db.profiles.find(
                filter={"user": username}
            )
            profile = {}
            profile["profile_pic"] = "default_profile_pic.jpg"
            for user_profile in profile_cursor:
                profile["bio"] = user_profile["bio"]
                profile["institution"] = user_profile["institution"]
                profile["projects"] = user_profile["projects"]
                if "profile_pic" in user_profile:
                    profile["profile_pic"] = user_profile["profile_pic"]

            user_information = {key: user_result["user"][key] for key in user_result["user"]}
            user_information["spaces"] = spaces
            user_information["follows"] = follows
            user_information["profile"] = profile

            self.set_status(200)
            self.write(user_information)

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

    def post(self):
        """
        POST /profileinformation

            update the profile information (bio, institution and projects)

            http body:
                {
                    "bio": <string>,
                    "institution": <string>,
                    "projects": [<string1>, <string2>, ...]
                }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            bio = self.get_body_argument("bio", None)
            institution = self.get_body_argument("institution", None)
            projects = self.get_body_argument("projects", None)

            # handle profile pic
            new_file_name = None
            if "profile_pic" in self.request.files:
                print("in file handling")
                profile_pic_obj = self.request.files["profile_pic"][0]

                # save file
                file_ext = os.path.splitext(profile_pic_obj["filename"])[1]
                new_file_name = b64encode(os.urandom(32)).decode("utf-8")
                new_file_name = re.sub('[^0-9a-zäöüßA-ZÄÖÜ]+', '_', new_file_name).lower() + file_ext
                print(new_file_name)

                with open(self.upload_dir + new_file_name, "wb") as fp:
                    fp.write(profile_pic_obj["body"])

            if new_file_name:
                self.db.profiles.update_one(
                    {"user": self.current_user.username},
                    {"$set":
                        {
                            "bio": bio,
                            "institution": institution,
                            "projects": projects,
                            "profile_pic": new_file_name
                        }
                    },
                    upsert=True
                )
            else:
                self.db.profiles.update_one(
                    {"user": self.current_user.username},
                    {"$set":
                        {
                            "bio": bio,
                            "institution": institution,
                            "projects": projects
                        }
                    },
                    upsert=True
                )

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


class UserHandler(BaseHandler):
    """
    User management
    """

    async def get(self, slug):
        """
        GET /users/user_data
            query param: username : string
            return:
                200 OK
                {"user_id": <int>,
                 "username": <string>,
                 "email": <string>}

                 401 Unauthorized
                 {"status": 401,
                  "reason": "no_logged_in_user"}

        GET /users/list
            returns:
                200 OK,
                [user_data (look above)]

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            print("in user handler")
            if slug == "user_data":
                username = self.get_argument("username", "test_user1")

                client = await get_socket_instance()
                user_result = await client.write({"type": "get_user",
                                                  "username": username})
                user_result["user"]["profile_pic"] = "default_profile_pic.jpg"
                profile = self.db.profiles.find_one({"user": username})
                if profile:
                    if "profile_pic" in profile:
                        user_result["user"]["profile_pic"] = profile["profile_pic"]

                self.set_status(200)
                self.write(user_result["user"])

            elif slug == "list":
                client = await get_socket_instance()
                user_list = await client.write({"type": "get_user_list"})

                for user in user_list["users"]:
                    user_list["users"][user]["profile_pic"] = "default_profile_pic.jpg"
                    profile = self.db.profiles.find_one({"user": user})
                    if profile:
                        if "profile_pic" in profile:
                            user_list["users"][user]["profile_pic"] = profile["profile_pic"]

                self.set_status(200)
                self.write(user_list["users"])

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


class TaskHandler(BaseHandler):

    def get(self):
        """
        GET /tasks
            returns:
                200 OK
                {"tasks": [{task1}, {task2}, ...]}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            task_cursor = self.db.tasks.find({})

            tasks = []
            for task in task_cursor:
                task["_id"] = str(task["_id"])
                if task["deadline"] is not None:
                    task["deadline"] = task["deadline"].isoformat()
                tasks.append(task)

            self.set_status(200)
            self.write({"tasks": tasks})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

    def post(self):
        """
        POST /tasks
            add a new task or update existing one

            http_body:
            {
                "task_id" : <string>,                       # optional, if set, updates the existing task, if not set creates one
                "headline": <string>,
                "text": <string>,
                "status": <"todo"/"doing"/"done">,
                "assigned": [<string1>, <string2>, ...],    # optional
                "deadline": <iso8601 string>,               # optional
            }

            returns:
                200 OK
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            http_body = tornado.escape.json_decode(self.request.body)

            # parse values or set defaults
            if "deadline" in http_body:  # parse time string into datetime object
                http_body["deadline"] = dateutil.parser.parse(http_body["deadline"])
            else:
                http_body["deadline"] = None

            if "assigned" not in http_body:
                http_body["assigned"] = []

            if "task_id" in http_body:
                http_body["task_id"] = ObjectId(http_body["task_id"])
            else:
                http_body["task_id"] = ObjectId()

            if all(key in http_body for key in ("task_id", "headline", "text", "deadline", "status", "assigned")):
                self.db.tasks.update_one(
                    {"_id": http_body["task_id"]},
                    {"$set":
                        {
                            "headline": http_body["headline"],
                            "text": http_body["text"],
                            "deadline": http_body["deadline"],
                            "status": http_body["status"],
                            "assigned": http_body["assigned"]
                        },
                    "$setOnInsert":
                        {
                            "creator": self.current_user.username
                        }
                    },
                    upsert=True
                )

                self.set_status(200)
                self.write({"status": 200,
                            "success": True})
            else:
                self.set_status(400)
                self.write({"status": 400,
                            "reason": "missing_key_in_http_body"})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


class PermissionHandler(BaseHandler):

    async def get(self):
        if self.current_user:
            role = await util.request_role(self.current_user.username)
            self.set_status(200)
            self.write({"status": 200,
                        "role": role})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})


def inherit_platform_port(port):  # invoked by platform
    SOCIALSERV_CONSTANTS.PLATFORM_PORT = port


def apply_config(config):  # invoked by platform, but we do not need a config for now
    pass


def stop_signal():  # invoked by platform
    # TODO
    pass


def make_app(called_by_platform, cookie_secret):
    if called_by_platform:
        SOCIALSERV_CONSTANTS.STARTED_BY_PLATFORM = True
        return tornado.web.Application([
            (r"/main", MainHandler),
            (r"/admin", AdminHandler),
            (r"/myprofile", MyProfileHandler),
            (r"/profile/([a-zA-Z\-0-9\.:,_]+)", ProfileHandler),
            (r"/posts", PostHandler),
            (r"/comment", CommentHandler),
            (r"/like", LikePostHandler),
            (r"/repost", RepostHandler),
            (r"/follow", FollowHandler),
            (r"/updates", NewPostsSinceTimestampHandler),
            (r"/spaceadministration/([a-zA-Z\-0-9\.:,_]+)", SpaceHandler),
            (r"/space/([a-zA-Z\-0-9\.:,_]+)", SpaceRenderHandler),
            (r"/timeline", TimelineHandler),
            (r"/timeline/space/([a-zA-Z\-0-9\.:,_]+)", SpaceTimelineHandler),
            (r"/timeline/user/([a-zA-Z\-0-9\.:,_]+)", UserTimelineHandler),
            (r"/timeline/you", PersonalTimelineHandler),
            (r"/profileinformation", ProfileInformationHandler),
            (r"/users/([a-zA-Z\-0-9\.:,_]+)", UserHandler),
            (r"/tasks", TaskHandler),
            (r"/permissions", PermissionHandler),
            (r"/css/(.*)", tornado.web.StaticFileHandler, {"path": "./modules/SocialServ/css/"}),
            (r"/html/(.*)", tornado.web.StaticFileHandler, {"path": "./modules/SocialServ/html/"}),
            (r"/javascripts/(.*)", tornado.web.StaticFileHandler, {"path": "./modules/SocialServ/javascripts/"}),
            (r"/uploads/(.*)", tornado.web.StaticFileHandler, {"path": "./modules/SocialServ/uploads/"})
        ])
    else:
        return tornado.web.Application([
            (r"/main", MainHandler),
            (r"/admin", AdminHandler),
            (r"/myprofile", MyProfileHandler),
            (r"/profile/([a-zA-Z\-0-9\.:,_]+)", ProfileHandler),
            (r"/posts", PostHandler),
            (r"/comment", CommentHandler),
            (r"/like", LikePostHandler),
            (r"/repost", RepostHandler),
            (r"/follow", FollowHandler),
            (r"/updates", NewPostsSinceTimestampHandler),
            (r"/spaceadministration/([a-zA-Z\-0-9\.:,_]+)", SpaceHandler),
            (r"/space/([a-zA-Z\-0-9\.:,_]+)", SpaceRenderHandler),
            (r"/timeline", TimelineHandler),
            (r"/timeline/space/([a-zA-Z\-0-9\.:,_]+)", SpaceTimelineHandler),
            (r"/timeline/user/([a-zA-Z\-0-9\.:,_]+)", UserTimelineHandler),
            (r"/timeline/you", PersonalTimelineHandler),
            (r"/profileinformation", ProfileInformationHandler),
            (r"/users/([a-zA-Z\-0-9\.:,_]+)", UserHandler),
            (r"/tasks", TaskHandler),
            (r"/permissions", PermissionHandler),
            (r"/css/(.*)", tornado.web.StaticFileHandler, {"path": "./css/"}),
            (r"/html/(.*)", tornado.web.StaticFileHandler, {"path": "./html/"}),
            (r"/javascripts/(.*)", tornado.web.StaticFileHandler, {"path": "./javascripts/"}),
            (r"/uploads/(.*)", tornado.web.StaticFileHandler, {"path": "./uploads/"})
        ], cookie_secret=cookie_secret)

def determine_free_port():
    """
    determines a free port number to which a module can later be bound. The port number is determined by the OS

    :returns: a free port number
    :rtype: int

    """
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(('', 0))  # binding a socket to 0 lets the OS assign a port
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)  # for threading scenario: the determined port can be used before this function returns
        return s.getsockname()[1]


async def main():
    tornado.options.parse_command_line()
    with open("config.json", "r") as fp:
        cookie_secret = json.load(fp)["cookie_secret"]
    app = make_app(False, cookie_secret)
    server = tornado.httpserver.HTTPServer(app)
    port = determine_free_port()
    print("Starting server on port: " + str(port))
    server.listen(port)

    client = await get_socket_instance()
    response = await client.write({"type": "module_start",
                                   "module_name": "SocialServ",
                                   "port": port})
    if response["status"] == "recognized":
        print("recognized by platform")

    shutdown_event = tornado.locks.Event()
    await shutdown_event.wait()

if __name__ == '__main__':
    tornado.ioloop.IOLoop.current().run_sync(main)
