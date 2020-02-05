import tornado.ioloop
import tornado.web
import tornado.locks
import dateutil.parser
from bson.objectid import ObjectId
from datetime import datetime, timedelta
from datetime import datetime
from pymongo import MongoClient


class BaseHandler(tornado.web.RequestHandler):

    def initialize(self):
        self.client = MongoClient('localhost', 27017)
        self.db = self.client['social_serv']  # TODO make this generic via config

    def prepare(self):
        self.current_user = -1


class MainHandler(BaseHandler):

    def get(self):
        pass


class PostHandler(BaseHandler):

    def get(self):
        pass

    def post(self):
        if self.current_user:
            author = self.current_user
            creation_date = datetime.utcnow()
            http_body = tornado.escape.json_decode(self.request.body)
            text = http_body['text']
            tags = http_body['tags']

            post = {"author": author,
                    "creation_date": creation_date,
                    "text": text,
                    "tags": tags}

            self.db.posts.insert_one(post)

            self.set_status(200)
            self.write({'status': 200,
                        'success': True})


class CommentHandler(BaseHandler):

    def get(self):
        pass

    def post(self):
        if self.current_user:
            author = self.current_user
            creation_date = datetime.utcnow()
            http_body = tornado.escape.json_decode(self.request.body)
            text = http_body['text']
            post_ref = ObjectId(http_body['post_id'])

            self.db.posts.update_one(
                {"_id": post_ref},
                {
                    "$push": {
                        "comments": {"author": author, "creation_date": creation_date, "text": text}
                    }
                }
            )

            self.set_status(200)


class TimelineHandler(BaseHandler):

    def get(self):
        time_from = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())  # default value is 24h ago
        time_to = self.get_argument("to", datetime.utcnow().isoformat())  # default value is now

        # parse time strings into datetime objects (dateutil is able to guess format)
        # however safe way is to use ISO 8601 format
        time_from = dateutil.parser.parse(time_from)
        time_to = dateutil.parser.parse(time_to)

        result = self.db.posts.find(
                        filter={"creation_date": {"$gte": time_from, "$lte": time_to}})

        # parse datetime objects into ISO 8601 strings for JSON serializability
        posts = []
        for post in result:
            # post creation date
            post['creation_date'] = post['creation_date'].isoformat()
            if 'comments' in post:
                # creation date of each comment
                for i in range(len(post['comments'])):
                    post['comments'][i]['creation_date'] = post['comments'][i]['creation_date'].isoformat()
            post['_id'] = str(post['_id'])
            posts.append(post)

        self.set_status(200)
        self.write({"posts": posts})


def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/posts", PostHandler),
        (r"/comment", CommentHandler),
        (r"/timeline", TimelineHandler)
    ])


async def main():
    app = make_app()
    server = tornado.httpserver.HTTPServer(app)
    server.listen(8889)

    shutdown_event = tornado.locks.Event()
    await shutdown_event.wait()

if __name__ == '__main__':
    tornado.ioloop.IOLoop.current().run_sync(main)
