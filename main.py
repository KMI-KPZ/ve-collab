import asyncio
from contextlib import closing
import json
import os
import socket
import sys
sys.path.append(os.path.dirname(__file__))
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import tornado.httpserver
import tornado.ioloop
import tornado.locks
from tornado.options import define, options

import CONSTANTS
from handlers.follow import FollowHandler
from handlers.permissions import GlobalACLHandler, PermissionHandler, RoleHandler
from handlers.post import *
from handlers.render import *
from handlers.space import SpaceHandler
from handlers.task import TaskHandler
from handlers.timeline import *
from handlers.user import *
from handlers.wiki import *
import signing
from socket_client import get_socket_instance


define("dev", default=False, type=bool, help="start in dev mode (no auth) with dummy platform")
define("no_wiki", default=False, type=bool, help="start without wiki integration (use if u don't have the wiki software installed and running)")
define("config", default="config.json", type=str, help="path to config file, defaults to config.json")


class RoutingHandler(BaseHandler):

    def get(self):
        """
        /routing
        """

        self.set_status(200)
        self.write({"routing": CONSTANTS.ROUTING_TABLE})


def make_app(cookie_secret):
    return tornado.web.Application([
        (r"/", MainRedirectHandler),
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
        (r"/spaces", SpaceOverviewHandler),
        (r"/timeline", TimelineHandler),
        (r"/timeline/space/([a-zA-Z\-0-9\.:,_]+)", SpaceTimelineHandler),
        (r"/timeline/user/([a-zA-Z\-0-9\.:,_]+)", UserTimelineHandler),
        (r"/timeline/you", PersonalTimelineHandler),
        (r"/profileinformation", ProfileInformationHandler),
        (r"/users/([a-zA-Z\-0-9\.:,_]+)", UserHandler),
        (r"/tasks", TaskHandler),
        (r"/wiki_pages", WikiPageNamesHandler),
        (r"/wiki_page", WikiPageHandler),
        (r"/permissions", PermissionHandler),
        (r"/role", RoleHandler),
        (r"/global_acl/([a-zA-Z\-0-9\.:,_]+)", GlobalACLHandler),
        (r"/routing", RoutingHandler),
        (r"/template", TemplateHandler),
        (r"/css/(.*)", tornado.web.StaticFileHandler, {"path": "./css/"}),
        (r"/html/(.*)", tornado.web.StaticFileHandler, {"path": "./html/"}),
        (r"/javascripts/(.*)", tornado.web.StaticFileHandler, {"path": "./javascripts/"}),
        (r"/uploads/(.*)", tornado.web.StaticFileHandler, {"path": "./uploads/"})
    ], cookie_secret=cookie_secret, template_path="html")

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
    signing.create_signing_key_if_not_exists()

    tornado.options.parse_command_line()
    with open(options.config, "r") as fp:
        conf = json.load(fp)
        cookie_secret = conf["cookie_secret"]

        if ("mongodb_username" in conf) and ("mongodb_password" in conf):
            CONSTANTS.MONGODB_USERNAME = conf["mongodb_username"]
            CONSTANTS.MONGODB_PASSWORD = conf["mongodb_password"]

    app = make_app(cookie_secret)
    server = tornado.httpserver.HTTPServer(app)
    port = 8903  # determine_free_port()
    print("Starting server on port: " + str(port))
    server.listen(port)

    client = await get_socket_instance()
    response = await client.write({"type": "module_start",
                                   "module_name": "lionet",
                                   "port": port})
    if response["status"] == "recognized":
        print("recognized by platform")
        shutdown_event = tornado.locks.Event()
        await shutdown_event.wait()
    else:
        print("not recognized by platform")
        print("exiting...")

if __name__ == '__main__':
    tornado.ioloop.IOLoop.current().run_sync(main)
