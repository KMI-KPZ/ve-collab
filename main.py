import tornado.ioloop
import tornado.web
import tornado.locks
import dateutil.parser
from bson.objectid import ObjectId
from datetime import datetime, timedelta
from pymongo import MongoClient
from socket_client import get_socket_instance
from model import User


class BaseHandler(tornado.web.RequestHandler):

    def initialize(self):
        self.client = MongoClient('localhost', 27017)
        self.db = self.client['social_serv']  # TODO make this generic via config

    def prepare(self):
        self.current_user = User("test_user1", 1, "test_user1@mail.com")

    def json_serialize_posts(self, query_result):
        # parse datetime objects into ISO 8601 strings for JSON serializability
        posts = []
        for post in query_result:
            # post creation date
            post['creation_date'] = post['creation_date'].isoformat()
            if 'comments' in post:
                # creation date of each comment
                for i in range(len(post['comments'])):
                    post['comments'][i]['creation_date'] = post['comments'][i]['creation_date'].isoformat()
            post['_id'] = str(post['_id'])
            posts.append(post)
        return posts


class MainHandler(BaseHandler):

    def get(self):
        self.render("html/newsfeed.html")


class ProfileHandler(BaseHandler):

    def get(self):
        self.render("html/profileFeed.html")


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
        """
        if self.current_user:
            author = self.current_user.username
            creation_date = datetime.utcnow()
            http_body = tornado.escape.json_decode(self.request.body)
            text = http_body['text']
            tags = http_body['tags']
            # if space is set, this post belongs to a space (only visible inside)
            # TODO check if space exists
            if 'space' in http_body:
                space = http_body['space']
            else:
                space = None

            post = {"author": author,
                    "creation_date": creation_date,
                    "text": text,
                    "space": space,
                    "tags": tags}

            self.db.posts.insert_one(post)

            self.set_status(200)
            self.write({'status': 200,
                        'success': True})


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
        """
        if self.current_user:
            author = self.current_user.username
            creation_date = datetime.utcnow()
            http_body = tornado.escape.json_decode(self.request.body)
            text = http_body['text']
            post_ref = ObjectId(http_body['post_id'])

            self.db.posts.update_one(
                {"_id": post_ref},  # filter
                {                   # update
                    "$push": {
                        "comments": {"author": author, "creation_date": creation_date, "text": text}
                    }
                }
            )

            self.set_status(200)


class LikePostHandler(BaseHandler):

    def post(self):
        """
        POST /like

        http body:
            {
                "post_id": "id_of_post_to_like"
            }

        """
        if self.current_user:
            http_body = tornado.escape.json_decode(self.request.body)
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


class FollowHandler(BaseHandler):

    def get(self):
        """
        GET /follow

            get list of followers of a user

            query param: user : string (required)
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

    def post(self):
        """
        POST /follow

            follow a user

            query param: user : string (required; the username u want to follow)
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


class TimelineHandler(BaseHandler):
    """
    Timeline of all posts (all users and all spaces)
    no use case in production, maybe use case for moderators?
    """

    def get(self):
        """
        GET /timeline

        query params:
            "from" : ISO timestamp string (fetch posts not older than this), default: now-24h
            "to" : ISO timestamp string (fetch posts younger than this), default: now

        return:
            200 OK,
            {"posts": [post1, post2,...]}

        """

        time_from = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())  # default value is 24h ago
        time_to = self.get_argument("to", datetime.utcnow().isoformat())  # default value is now

        # parse time strings into datetime objects (dateutil is able to guess format)
        # however safe way is to use ISO 8601 format
        time_from = dateutil.parser.parse(time_from)
        time_to = dateutil.parser.parse(time_to)

        result = self.db.posts.find(
                        filter={"creation_date": {"$gte": time_from, "$lte": time_to}})

        posts = self.json_serialize_posts(result)

        self.set_status(200)
        self.write({"posts": posts})


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

        """
        time_from = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())  # default value is 24h ago
        time_to = self.get_argument("to", datetime.utcnow().isoformat())  # default value is now

        # parse time strings into datetime objects (dateutil is able to guess format)
        # however safe way is to use ISO 8601 format
        time_from = dateutil.parser.parse(time_from)
        time_to = dateutil.parser.parse(time_to)

        # TODO check if current_user is in the space

        result = self.db.posts.find(
                        filter={"creation_date": {"$gte": time_from, "$lte": time_to},
                                "space":         {"$eq": space_name}})

        posts = self.json_serialize_posts(result)

        self.set_status(200)
        self.write({"posts": posts})


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

        """
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

        self.set_status(200)
        self.write({"posts": posts})


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
                if post["author"] in follows or post["space"] in spaces:
                    posts_to_keep.append(post)

            posts = self.json_serialize_posts(posts_to_keep)

            self.set_status(200)
            self.write({"posts": posts})


class SpaceHandler(BaseHandler):
    """
    handle existing and creation of new spaces
    """

    def get(self, slug):
        """
        GET /space/list

        return:
            200 OK,
            {"spaces": [space1, space2,...]}
        """
        if slug == "list":
            result = self.db.spaces.find({})

            spaces = []
            for space in result:
                space['_id'] = str(space['_id'])
                spaces.append(space)

            self.write({"spaces": spaces})

    def post(self, slug):
        """
        POST /space/create

            query param:
                "name" : space name to create, mandatory argument

        POST /space/join
            (currently authed user joins space)
            query param:
                "name" : space name of which space to join, mandatory argument
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
        if self.current_user:
            # get account information from platform
            client = await get_socket_instance()
            user_result = await client.write({"type": "get_user",
                                              "username": self.current_user.username})

            # grab spaces
            spaces_cursor = self.db.spaces.find(
                filter={"members": self.current_user.username}
            )
            spaces = []
            for space in spaces_cursor:
                spaces.append(space["name"])

            # grab users that the current_user follows
            follows_cursor = self.db.follows.find(
                filter={"user": self.current_user.username}
            )
            follows = []
            for user in follows_cursor:
                follows = user["follows"]

            user_information = {key: user_result["user"][key] for key in user_result["user"]}
            user_information["spaces"] = spaces
            user_information["follows"] = follows

            self.set_status(200)
            self.write(user_information)


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
        """
        if self.current_user:
            if slug == "user_data":
                username = self.get_argument("username", "test_user1")

                client = await get_socket_instance()
                user_result = await client.write({"type": "get_user",
                                                  "username": username})

                self.set_status(200)
                self.write(user_result["user"])

            elif slug == "list":
                client = await get_socket_instance()
                user_list = await client.write({"type": "get_user_list"})

                self.set_status(200)
                self.write(user_list["users"])


def make_app():
    return tornado.web.Application([
        (r"/main", MainHandler),
        (r"/profile", ProfileHandler),
        (r"/posts", PostHandler),
        (r"/comment", CommentHandler),
        (r"/like", LikePostHandler),
        (r"/follow", FollowHandler),
        (r"/updates", NewPostsSinceTimestampHandler),
        (r"/space/([a-zA-Z\-0-9\.:,_]+)", SpaceHandler),
        (r"/timeline", TimelineHandler),
        (r"/timeline/space/([a-zA-Z\-0-9\.:,_]+)", SpaceTimelineHandler),
        (r"/timeline/user/([a-zA-Z\-0-9\.:,_]+)", UserTimelineHandler),
        (r"/timeline/you", PersonalTimelineHandler),
        (r"/profileinformation", ProfileInformationHandler),
        (r"/users/([a-zA-Z\-0-9\.:,_]+)", UserHandler),
        (r"/css/(.*)", tornado.web.StaticFileHandler, {"path": "./css/"}),
        (r"/html/(.*)", tornado.web.StaticFileHandler, {"path": "./html/"}),
        (r"/javascripts/(.*)", tornado.web.StaticFileHandler, {"path": "./javascripts/"})
    ])


async def main():
    app = make_app()
    server = tornado.httpserver.HTTPServer(app)
    server.listen(8889)

    shutdown_event = tornado.locks.Event()
    await shutdown_event.wait()

if __name__ == '__main__':
    tornado.ioloop.IOLoop.current().run_sync(main)
