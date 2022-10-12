import asyncio
import json
import os
import sys

sys.path.append(os.path.dirname(__file__))
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from keycloak import KeycloakOpenID, KeycloakAdmin
import pymongo
import pymongo.errors
import tornado.httpserver
import tornado.ioloop
import tornado.locks
import tornado.web
from tornado.options import define, options, parse_command_line

import global_vars
from handlers.authentication import LoginHandler, LoginCallbackHandler, LogoutHandler
from handlers.follow import FollowHandler
from handlers.permissions import GlobalACLHandler, PermissionHandler, RoleHandler, SpaceACLHandler
from handlers.post import *
from handlers.render import *
from handlers.search import SearchHandler
from handlers.space import SpaceHandler
from handlers.timeline import *
from handlers.user import *
from handlers.wordpress import WordpressCollectionHandler, WordpressPostHandler
from logger_factory import get_logger

logger = get_logger(__name__)

define("config", default="config.json", type=str,
       help="path to config file, defaults to config.json")
define("test", default=False, type=bool,
       help="start application in test mode (bypass authentication)")
define("build_text_index", default=False, type=bool,
       help="force the application to (re)build the text index for full text search")


def make_app(cookie_secret):
    return tornado.web.Application([
        (r"/", MainRedirectHandler),
        (r"/login", LoginHandler),
        (r"/login/callback", LoginCallbackHandler),
        (r"/logout", LogoutHandler),
        (r"/main", MainHandler),
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
        (r"/permissions", PermissionHandler),
        (r"/role/([a-zA-Z\-0-9\.:,_%]+)", RoleHandler),
        (r"/global_acl/([a-zA-Z\-0-9\.:,_%]+)", GlobalACLHandler),
        (r"/space_acl/([a-zA-Z\-0-9\.:,_%]+)", SpaceACLHandler),
        (r"/search", SearchHandler),
        (r"/template", TemplateHandler),
        (r"/wordpress/posts", WordpressCollectionHandler),
        (r"/wordpress/posts/([0-9]+)", WordpressPostHandler),
        (r"/css/(.*)", tornado.web.StaticFileHandler, {"path": "./css/"}),
        (r"/html/(.*)", tornado.web.StaticFileHandler, {"path": "./html/"}),
        (r"/javascripts/(.*)", tornado.web.StaticFileHandler,
         {"path": "./javascripts/"}),
        (r"/uploads/(.*)", tornado.web.StaticFileHandler,
         {"path": "./uploads/"})
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
        logger.info(
            "Built text index named {} on collection {}".format("posts", "posts"))

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
    parse_command_line()
    with open(options.config, "r") as fp:
        conf = json.load(fp)

    # assure config contains expected keys
    expected_config_keys = ["port", "domain", "cookie_secret", "keycloak_base_url", "keycloak_realm", "keycloak_client_id",
                            "keycloak_client_secret", "keycloak_admin_username", "keycloak_admin_password",
                            "keycloak_callback_url", "mongodb_host", "mongodb_port", "mongodb_username", "mongodb_password", "mongodb_db_name"]
    for key in expected_config_keys:
        if key not in conf:
            raise RuntimeError("config misses {}".format(key))

    # set global vars from config
    global_vars.port = conf["port"]
    global_vars.domain = conf["domain"]
    global_vars.mongodb_host = conf["mongodb_host"]
    global_vars.mongodb_port = conf["mongodb_port"]
    global_vars.mongodb_username = conf["mongodb_username"]
    global_vars.mongodb_password = conf["mongodb_password"]
    global_vars.mongodb_db_name = conf["mongodb_db_name"]
    global_vars.keycloak = KeycloakOpenID(conf["keycloak_base_url"], realm_name=conf["keycloak_realm"],
                                          client_id=conf["keycloak_client_id"], client_secret_key=conf["keycloak_client_secret"])
    global_vars.keycloak_admin = KeycloakAdmin(conf["keycloak_base_url"], realm_name=conf["keycloak_realm"], username=conf["keycloak_admin_username"],
                                               password=conf["keycloak_admin_password"], verify=True, auto_refresh_token=['get', 'put', 'post', 'delete'])
    global_vars.keycloak_client_id = conf["keycloak_client_id"]
    global_vars.keycloak_callback_url = conf["keycloak_callback_url"]

    # insert default role and acl templates if db is empty
    acl = get_acl().global_acl
    existing_roles = acl.db.roles.find_one({})
    if not existing_roles:
        with open("DummyData/role_templates.json", "r") as fp:
            role_templates = json.load(fp)
        for role in role_templates["roles"]:
            acl.db.roles.insert_one(
                {"username": role["username"], "role": role["role"]})

    if not acl.get_all():
        with open("DummyData/acl_templates.json", "r") as fp:
            acl_templates = json.load(fp)
        for entry in acl_templates["global_acl"]:
            acl.set_all(entry)

    # build and start server
    cookie_secret = conf["cookie_secret"]
    app = make_app(cookie_secret)
    server = tornado.httpserver.HTTPServer(app)
    logger.info("Starting server on port: " + str(global_vars.port))
    server.listen(global_vars.port)

    # setup text indexes for searching
    init_text_indexes(options.build_text_index)

    shutdown_event = tornado.locks.Event()
    await shutdown_event.wait()

if __name__ == '__main__':
    tornado.ioloop.IOLoop.current().run_sync(main)
