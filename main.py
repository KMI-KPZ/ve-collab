import tornado.ioloop
import tornado.web
import tornado.locks
import dateutil.parser
from bson.objectid import ObjectId
from datetime import datetime, timedelta
from pymongo import MongoClient


class BaseHandler(tornado.web.RequestHandler):

    def initialize(self):
        self.client = MongoClient('localhost', 27017)
        self.db = self.client['social_serv']  # TODO make this generic via config

    def prepare(self):
        self.current_user = 2

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
        pass


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
            author = self.current_user
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
            author = self.current_user
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
    Timeline of a user
    """

    def get(self, author):
        """
        GET /timeline/user/[user_id]         FUTURE: USERNAME INSTEAD OF USER ID

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
                                "author":         {"$eq": int(author)}})

        posts = self.json_serialize_posts(result)

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
                members = [self.current_user]

                # only create space if no other space with the same name exists
                if space_name not in self.db.spaces.find(projection={"name": True, "_id": False}):
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
                        "$push": {"members": self.current_user}
                    }
                )

                self.set_status(200)
                self.write({'status': 200,
                            'success': True})


class UserHandler(BaseHandler):

    def get(self):
        # get a list of all users
        # TODO need communication to platform because platform does user handling
        pass


def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/posts", PostHandler),
        (r"/comment", CommentHandler),
        (r"/space/([a-zA-Z\-0-9\.:,_]+)", SpaceHandler),
        (r"/timeline", TimelineHandler),
        (r"/timeline/space/([a-zA-Z\-0-9\.:,_]+)", SpaceTimelineHandler),
        (r"/timeline/user/([a-zA-Z\-0-9\.:,_]+)", UserTimelineHandler),
        (r"/users", UserHandler)
    ])


async def main():
    app = make_app()
    server = tornado.httpserver.HTTPServer(app)
    server.listen(8889)

    shutdown_event = tornado.locks.Event()
    await shutdown_event.wait()

if __name__ == '__main__':
    tornado.ioloop.IOLoop.current().run_sync(main)
