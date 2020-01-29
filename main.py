import tornado.ioloop
import tornado.web
import tornado.locks
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
            creation_date = datetime.now()
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


class TimelineHandler(BaseHandler):

    def get(self):
        self.write({"posts": [post for post in self.db.posts.find(projection={'_id': False, 'creation_date': False})]})
        # TODO sort by creation date
        # TODO include creation date in response (JSON serialize)
        # TODO make parameter with a time range for what posts to return (all is way too much)


def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/posts", PostHandler),
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
