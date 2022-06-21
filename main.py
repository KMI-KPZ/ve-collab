import asyncio
import json
import os
import sys

sys.path.append(os.path.dirname(__file__))
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from keycloak import KeycloakOpenID
import tornado.httpserver
import tornado.ioloop
import tornado.locks
from tornado.options import define, options

import global_vars
from handlers.follow import FollowHandler
from handlers.permissions import GlobalACLHandler, PermissionHandler, RoleHandler, SpaceACLHandler
from handlers.post import *
from handlers.render import *
from handlers.space import SpaceHandler
from handlers.task import TaskHandler
from handlers.timeline import *
from handlers.user import *
from handlers.wiki import *
import signing
from socket_client import get_socket_instance


define("no_wiki", default=False, type=bool,
       help="start without wiki integration (use if u don't have the wiki software installed and running)")
define("config", default="config.json", type=str,
       help="path to config file, defaults to config.json")


class RoutingHandler(BaseHandler):

    def get(self):
        """
        /routing
        """

        self.set_status(200)
        self.write({"routing": global_vars.routing_table})


def make_app(cookie_secret):
    return tornado.web.Application([
        (r"/", MainRedirectHandler),
        (r"/main", MainHandler),
        (r"/admin", AdminHandler),
        (r"/acl", ACLHandler),
        (r"/myprofile", MyProfileHandler),
        (r"/profile/([a-zA-Z\-0-9\.:,_%]+)", ProfileHandler),
        (r"/posts", PostHandler),
        (r"/comment", CommentHandler),
        (r"/like", LikePostHandler),
        (r"/repost", RepostHandler),
        (r"/pin", PinHandler),
        (r"/follow", FollowHandler),
        (r"/updates", NewPostsSinceTimestampHandler),
        (r"/spaceadministration/([a-zA-Z\-0-9\.:,_%]+)", SpaceHandler),
        (r"/space/([a-zA-Z\-0-9\.:,_%]+)", SpaceRenderHandler),
        (r"/spaces", SpaceOverviewHandler),
        (r"/timeline", TimelineHandler),
        (r"/timeline/space/([a-zA-Z\-0-9\.:,_%]+)", SpaceTimelineHandler),
        (r"/timeline/user/([a-zA-Z\-0-9\.:,_%]+)", UserTimelineHandler),
        (r"/timeline/you", PersonalTimelineHandler),
        (r"/profileinformation", ProfileInformationHandler),
        (r"/users/([a-zA-Z\-0-9\.:,_%]+)", UserHandler),
        (r"/tasks", TaskHandler),
        (r"/wiki_pages", WikiPageNamesHandler),
        (r"/wiki_page", WikiPageHandler),
        (r"/permissions", PermissionHandler),
        (r"/role/([a-zA-Z\-0-9\.:,_%]+)", RoleHandler),
        (r"/global_acl/([a-zA-Z\-0-9\.:,_%]+)", GlobalACLHandler),
        (r"/space_acl/([a-zA-Z\-0-9\.:,_%]+)", SpaceACLHandler),
        (r"/routing", RoutingHandler),
        (r"/template", TemplateHandler),
        (r"/css/(.*)", tornado.web.StaticFileHandler, {"path": "./css/"}),
        (r"/html/(.*)", tornado.web.StaticFileHandler, {"path": "./html/"}),
        (r"/javascripts/(.*)", tornado.web.StaticFileHandler, {"path": "./javascripts/"}),
        (r"/uploads/(.*)", tornado.web.StaticFileHandler, {"path": "./uploads/"})
    ], cookie_secret=cookie_secret, template_path="html")


async def main():
    signing.create_signing_key_if_not_exists()

    tornado.options.parse_command_line()
    with open(options.config, "r") as fp:
        conf = json.load(fp)

    # assure config contains expected keys
    expected_config_keys = ["port", "platform_host", "platform_port", "cookie_secret", "keycloak_base_url", "keycloak_realm",
                            "keycloak_client_id", "keycloak_client_secret", "mongodb_host", "mongodb_port", "mongodb_username",
                            "mongodb_password", "wiki_url", "wiki_username", "wiki_password", "routing_table"]
    for key in expected_config_keys:
        if key not in conf:
            raise RuntimeError("config misses {}".format(key))

    # set global vars from config
    global_vars.platform_host = conf["platform_host"]
    global_vars.platform_port = conf["platform_port"]
    global_vars.mongodb_host = conf["mongodb_host"]
    global_vars.mongodb_port = conf["mongodb_port"]
    global_vars.mongodb_username = conf["mongodb_username"]
    global_vars.mongodb_password = conf["mongodb_password"]
    global_vars.wiki_url = conf["wiki_url"]
    global_vars.wiki_username = conf["wiki_username"]
    global_vars.wiki_password = conf["wiki_password"]
    global_vars.routing_table = conf["routing_table"]
    global_vars.keycloak = KeycloakOpenID(conf["keycloak_base_url"], realm_name=conf["keycloak_realm"],
                                          client_id=conf["keycloak_client_id"], client_secret_key=conf["keycloak_client_secret"])

    cookie_secret = conf["cookie_secret"]
    app = make_app(cookie_secret)
    server = tornado.httpserver.HTTPServer(app)
    port = conf["port"]
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
