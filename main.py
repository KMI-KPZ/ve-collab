import asyncio
import json
import os
import sys

sys.path.append(os.path.dirname(__file__))
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from keycloak import KeycloakOpenID
import pymongo
import pymongo.errors
import tornado.httpserver
import tornado.ioloop
import tornado.locks
from tornado.options import define, options

import global_vars
from handlers.follow import FollowHandler
from handlers.permissions import GlobalACLHandler, PermissionHandler, RoleHandler, SpaceACLHandler
from handlers.post import *
from handlers.render import *
from handlers.search import SearchHandler
from handlers.space import SpaceHandler
from handlers.task import TaskHandler
from handlers.timeline import *
from handlers.user import *
from handlers.wiki import *
from logger_factory import get_logger, log_access
import signing
from socket_client import get_socket_instance

logger = get_logger(__name__)

define("no_wiki", default=False, type=bool,
       help="start without wiki integration (use if u don't have the wiki software installed and running)")
define("config", default="config.json", type=str,
       help="path to config file, defaults to config.json")
define("build_text_index", default=False, type=bool,
       help="force the application to (re)build the text index for full text search")


class RoutingHandler(BaseHandler):

    @log_access
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
        (r"/search", SearchHandler),
        (r"/routing", RoutingHandler),
        (r"/template", TemplateHandler),
        (r"/css/(.*)", tornado.web.StaticFileHandler, {"path": "./css/"}),
        (r"/html/(.*)", tornado.web.StaticFileHandler, {"path": "./html/"}),
        (r"/javascripts/(.*)", tornado.web.StaticFileHandler, {"path": "./javascripts/"}),
        (r"/uploads/(.*)", tornado.web.StaticFileHandler, {"path": "./uploads/"})
    ], cookie_secret=cookie_secret, template_path="html")


def init_text_indexes(force_rebuild: bool) -> None:
    """
    build the text indexes for posts and profiles.
    the weights of the fields are left default (1).
    indexes will be build if a) they don't exist or b) if rebuild is forced by setting force_rebuild to True)
    
    :param force_rebuild: boolean switch to trigger a forced rebuild of the text indexes
    """
    
    client = pymongo.MongoClient(global_vars.mongodb_host, global_vars.mongodb_port,
                              username=global_vars.mongodb_username, password=global_vars.mongodb_password)
    db = client[global_vars.mongodb_db_name]

    # only build the index if they are either not present or we forced a rebuild
    if "posts" not in db.posts.index_information() or force_rebuild:
        try:
            db.posts.drop_index("posts")
        except pymongo.errors.OperationFailure:
            pass
        db.posts.create_index([("text", pymongo.TEXT),
                               ("tags", pymongo.TEXT),
                               ("files", pymongo.TEXT)],
                               name="posts")
        logger.info("Built text index named {} on collection {}".format("posts", "posts"))

    if "profiles" not in db.profiles.index_information() or force_rebuild:
        try:
            db.profiles.drop_index("profiles")
        except pymongo.errors.OperationFailure:
            pass
        db.profiles.create_index([("bio", pymongo.TEXT),
                                  ("institution", pymongo.TEXT),
                                  ("projects", pymongo.TEXT),
                                  ("first_name", pymongo.TEXT),
                                  ("last_name", pymongo.TEXT),
                                  ("gender", pymongo.TEXT),
                                  ("address", pymongo.TEXT),
                                  ("birthday", pymongo.TEXT),
                                  ("experience", pymongo.TEXT),
                                  ("education", pymongo.TEXT),
                                  ("user", pymongo.TEXT)],
                                  name="profiles")   
        logger.info("Built text index named {} on collection {}".format(
            "profiles", "profiles"))


async def main():
    signing.create_signing_key_if_not_exists()

    tornado.options.parse_command_line()
    with open(options.config, "r") as fp:
        conf = json.load(fp)

    # assure config contains expected keys
    expected_config_keys = ["port", "platform_host", "platform_port", "cookie_secret", "keycloak_base_url", "keycloak_realm",
                            "keycloak_client_id", "keycloak_client_secret", "mongodb_host", "mongodb_port", "mongodb_username",
                            "mongodb_password", "mongodb_db_name", "wiki_url", "wiki_username", "wiki_password", "routing_table"]
    for key in expected_config_keys:
        if key not in conf:
            raise RuntimeError("config misses {}".format(key))

    # set global vars from config
    global_vars.port = conf["port"]
    global_vars.platform_host = conf["platform_host"]
    global_vars.platform_port = conf["platform_port"]
    global_vars.mongodb_host = conf["mongodb_host"]
    global_vars.mongodb_port = conf["mongodb_port"]
    global_vars.mongodb_username = conf["mongodb_username"]
    global_vars.mongodb_password = conf["mongodb_password"]
    global_vars.mongodb_db_name = conf["mongodb_db_name"]
    global_vars.wiki_url = conf["wiki_url"]
    global_vars.wiki_username = conf["wiki_username"]
    global_vars.wiki_password = conf["wiki_password"]
    global_vars.routing_table = conf["routing_table"]
    global_vars.keycloak = KeycloakOpenID(conf["keycloak_base_url"], realm_name=conf["keycloak_realm"],
                                          client_id=conf["keycloak_client_id"], client_secret_key=conf["keycloak_client_secret"])

    # build and start server
    cookie_secret = conf["cookie_secret"]
    app = make_app(cookie_secret)
    server = tornado.httpserver.HTTPServer(app)
    logger.info("Starting server on port: " + str(global_vars.port))
    server.listen(global_vars.port)

    # setup text indexes for searching
    init_text_indexes(options.build_text_index)

    # register with the platform
    client = await get_socket_instance()
    response = await client.write({"type": "module_start",
                                   "module_name": "lionet",
                                   "port": global_vars.port})
    if response["status"] == "recognized":
        logger.info("Lionet has been recognized by platform")
        shutdown_event = tornado.locks.Event()
        await shutdown_event.wait()
    else:
        logger.critical("Lionet has not been recognized by the platform, app will exit now")

if __name__ == '__main__':
    tornado.ioloop.IOLoop.current().run_sync(main)
