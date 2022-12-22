import asyncio
import json
import os
import sys
import shutil

sys.path.append(os.path.dirname(__file__))
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from keycloak import KeycloakOpenID, KeycloakAdmin
import pymongo
import pymongo.errors
import tornado.httpserver
import tornado.ioloop
import tornado.locks
from tornado.options import define, options, parse_command_line
import tornado.web

import global_vars
from handlers.authentication import LoginHandler, LoginCallbackHandler, LogoutHandler
from handlers.follow import FollowHandler
from handlers.permissions import (
    GlobalACLHandler,
    RoleHandler,
    SpaceACLHandler,
)
from handlers.post import *
from handlers.render import *
from handlers.search import SearchHandler
from handlers.space import SpaceHandler
from handlers.timeline import *
from handlers.user import *
from handlers.wordpress import WordpressCollectionHandler, WordpressPostHandler
from logger_factory import get_logger
from resources.acl import ACL
from resources.profile import ProfileDoesntExistException, Profiles
from resources.space import Spaces


logger = get_logger(__name__)

define(
    "config",
    default="config.json",
    type=str,
    help="path to config file, defaults to config.json",
)
define(
    "build_indexes",
    default=False,
    type=bool,
    help="force the application to (re)build the indexes for full text search and query optimization. Warning: this might take a long time depending on your database size",
)
define(
    "create_admin",
    default="admin",
    type=str,
    help="Create an initial admin user with this username in the ACL",
)

# never start app in test mode, only needed for unit tests
define(
    "test_admin",
    default=False,
    type=bool,
    help="start application in test mode (bypass authentication) as an admin. never run the app in this mode, it is purely for unit tests!",
)
define(
    "test_user",
    default=False,
    type=bool,
    help="start application in test mode (bypass authentication) as a user. never run the app in this mode, it is purely for unit tests!",
)


def make_app(cookie_secret):
    return tornado.web.Application(
        [
            (r"/", MainRedirectHandler),
            (r"/login", LoginHandler),
            (r"/login/callback", LoginCallbackHandler),
            (r"/logout", LogoutHandler),
            (r"/main", MainHandler),
            (r"/acl", ACLHandler),
            (r"/myprofile", MyProfileHandler),
            (r"/profile/(.+)", ProfileHandler),
            (r"/posts", PostHandler),
            (r"/comment", CommentHandler),
            (r"/like", LikePostHandler),
            (r"/repost", RepostHandler),
            (r"/pin", PinHandler),
            (r"/follow", FollowHandler),
            (r"/updates", NewPostsSinceTimestampHandler),
            (r"/spaceadministration/(.+)", SpaceHandler),
            (r"/space/(.+)", SpaceRenderHandler),
            (r"/spaces", SpaceOverviewHandler),
            (r"/timeline", TimelineHandler),
            (r"/timeline/space/(.+)", SpaceTimelineHandler),
            (r"/timeline/user/(.+)", UserTimelineHandler),
            (r"/timeline/you", PersonalTimelineHandler),
            (r"/profileinformation", ProfileInformationHandler),
            (r"/users/(.+)", UserHandler),
            (r"/role/(.+)", RoleHandler),
            (r"/global_acl/(.+)", GlobalACLHandler),
            (r"/space_acl/(.+)", SpaceACLHandler),
            (r"/search", SearchHandler),
            (r"/template", TemplateHandler),
            (r"/wordpress/posts", WordpressCollectionHandler),
            (r"/wordpress/posts/([0-9]+)", WordpressPostHandler),
            (r"/css/(.*)", tornado.web.StaticFileHandler, {"path": "./css/"}),
            (r"/assets/(.*)", tornado.web.StaticFileHandler, {"path": "./assets/"}),
            (r"/html/(.*)", tornado.web.StaticFileHandler, {"path": "./html/"}),
            (
                r"/javascripts/(.*)",
                tornado.web.StaticFileHandler,
                {"path": "./javascripts/"},
            ),
            # TODO custom handler for uploads that checks if user is in space or admin if
            # request is towards files of a space
            (r"/uploads/(.*)", tornado.web.StaticFileHandler, {"path": "./uploads/"}),
        ],
        cookie_secret=cookie_secret,
        template_path="html",
    )


def init_indexes(force_rebuild: bool) -> None:
    """
    build the indexes for posts and profiles (for searching)
    and spaces, posts and profiles (for faster lookups).
    the weights of the fields are left default (1).
    indexes will be build if a) they don't exist or b) if rebuild is forced by setting force_rebuild to True)

    :param force_rebuild: boolean switch to trigger a forced rebuild of the text indexes
    """

    with pymongo.MongoClient(
        global_vars.mongodb_host,
        global_vars.mongodb_port,
        username=global_vars.mongodb_username,
        password=global_vars.mongodb_password,
    ) as client:
        db = client[global_vars.mongodb_db_name]

        # full text search index on posts
        if "posts" not in db.posts.index_information() or force_rebuild:
            try:
                db.posts.drop_index("posts")
            except pymongo.errors.OperationFailure:
                pass
            db.posts.create_index(
                [
                    ("text", pymongo.TEXT),
                    ("tags", pymongo.TEXT),
                    ("files", pymongo.TEXT),
                ],
                name="posts",
            )
            logger.info(
                "Built text index named {} on collection {}".format("posts", "posts")
            )

        # ascending index on "creation_date" in posts
        if "posts_creation_date" not in db.posts.index_information() or force_rebuild:
            try:
                db.posts.drop_index("posts_creation_date")
            except pymongo.errors.OperationFailure:
                pass
            db.posts.create_index("creation_date", name="posts_creation_date")
            logger.info(
                "Built index named {} on collection {}".format(
                    "posts_creation_date", "posts"
                )
            )

        # full text search index on profiles
        if "profiles" not in db.profiles.index_information() or force_rebuild:
            try:
                db.profiles.drop_index("profiles")
            except pymongo.errors.OperationFailure:
                pass
            db.profiles.create_index(
                [
                    ("bio", pymongo.TEXT),
                    ("institution", pymongo.TEXT),
                    ("projects", pymongo.TEXT),
                    ("first_name", pymongo.TEXT),
                    ("last_name", pymongo.TEXT),
                    ("gender", pymongo.TEXT),
                    ("address", pymongo.TEXT),
                    ("birthday", pymongo.TEXT),
                    ("experience", pymongo.TEXT),
                    ("education", pymongo.TEXT),
                    ("username", pymongo.TEXT),
                ],
                name="profiles",
            )
            logger.info(
                "Built text index named {} on collection {}".format(
                    "profiles", "profiles"
                )
            )

        # ascending index on "username" field in profiles
        if "profiles_username" not in db.profiles.index_information() or force_rebuild:
            try:
                db.profiles.drop_index("profiles_username")
            except pymongo.errors.OperationFailure:
                pass
            db.profiles.create_index("username", name="profiles_username")
            logger.info(
                "Built index named {} on collection {}".format(
                    "profiles_username", "profiles"
                )
            )

        # ascending index on "name" field in spaces
        if "space_name" not in db.spaces.index_information() or force_rebuild:
            try:
                db.spaces.drop_index("space_name")
            except pymongo.errors.OperationFailure:
                pass
            db.spaces.create_index("name", name="space_name")
            logger.info(
                "Built index named {} on collection {}".format("space_name", "spaces")
            )


def create_initial_admin(username: str) -> None:
    """
    create an initial admin with the given username
    """

    with Profiles() as profile_manager:

        # check if the user already has a non-admin role and issue a warning
        # about elevated permissions if so
        try:
            existing_role = profile_manager.get_role(username)
            if existing_role != "admin":
                logger.warning(
                    """
                    The user already exists with a non-admin role.
                    If you really wish to elevate his/her role, remove the corresponding
                    entry from the profiles collection manually and restart (warning: loss of profile data)
                    or simply set the value manually in a mongoshell.
                    For now, this operation is ignored. 
                    """
                )
            return
        except ProfileDoesntExistException:
            pass

        # user + admin-role combination didnt exist, create it
        profile_manager.insert_default_admin_profile(username)

        # also insert admin acl rules
        with (ACL() as acl, Spaces() as space_manager):
            acl.global_acl.insert_admin()

            for space in space_manager.get_space_names():
                acl.space_acl.insert_admin(space)

        logger.info(
            "inserted admin user '{}' and corresponding ACL rules".format(username)
        )


def init_uploads_directory() -> None:
    """
    create the uploads directory if it does not already exist
    and add the default_profile_pic.jpg into it
    """

    if not os.path.isdir(global_vars.upload_directory):
        os.mkdir(global_vars.upload_directory)
    if not os.path.isfile(
        os.path.join(global_vars.upload_directory, "default_profile_pic.jpg")
    ):
        shutil.copy2("assets/default_profile_pic.jpg", global_vars.upload_directory)


def set_global_vars(conf: dict) -> None:
    """
    setup global_vars from config properties
    """

    # assure config contains expected keys
    expected_config_keys = [
        "port",
        "domain",
        "upload_directory",
        "wordpress_url",
        "cookie_secret",
        "keycloak_base_url",
        "keycloak_realm",
        "keycloak_client_id",
        "keycloak_client_secret",
        "keycloak_admin_username",
        "keycloak_admin_password",
        "keycloak_callback_url",
        "mongodb_host",
        "mongodb_port",
        "mongodb_username",
        "mongodb_password",
        "mongodb_db_name",
    ]

    for key in expected_config_keys:
        if key not in conf:
            raise RuntimeError("config misses {}".format(key))

    # set global vars from config
    global_vars.port = conf["port"]
    global_vars.domain = conf["domain"]
    global_vars.upload_directory = conf["upload_directory"]
    global_vars.wordpress_url = conf["wordpress_url"]
    global_vars.mongodb_host = conf["mongodb_host"]
    global_vars.mongodb_port = conf["mongodb_port"]
    global_vars.mongodb_username = conf["mongodb_username"]
    global_vars.mongodb_password = conf["mongodb_password"]
    global_vars.mongodb_db_name = conf["mongodb_db_name"]

    if not (options.test_admin or options.test_user):
        global_vars.keycloak = KeycloakOpenID(
            conf["keycloak_base_url"],
            realm_name=conf["keycloak_realm"],
            client_id=conf["keycloak_client_id"],
            client_secret_key=conf["keycloak_client_secret"],
        )
        global_vars.keycloak_admin = KeycloakAdmin(
            conf["keycloak_base_url"],
            realm_name=conf["keycloak_realm"],
            username=conf["keycloak_admin_username"],
            password=conf["keycloak_admin_password"],
            verify=True,
            auto_refresh_token=["get", "put", "post", "delete"],
        )
    global_vars.keycloak_client_id = conf["keycloak_client_id"]
    global_vars.keycloak_callback_url = conf["keycloak_callback_url"]


async def main():
    parse_command_line()

    # setup global vars from config
    with open(options.config, "r") as fp:
        conf = json.load(fp)
        set_global_vars(conf)

    # setup uploads directory
    init_uploads_directory()

    # insert default admin role and acl templates
    create_initial_admin(options.create_admin)

    # setup text indexes for searching
    init_indexes(options.build_indexes)

    # build and start server
    cookie_secret = conf["cookie_secret"]
    app = make_app(cookie_secret)
    server = tornado.httpserver.HTTPServer(app)
    logger.info("Starting server on port: " + str(global_vars.port))
    server.listen(global_vars.port)

    shutdown_event = tornado.locks.Event()
    await shutdown_event.wait()


if __name__ == "__main__":
    tornado.ioloop.IOLoop.current().run_sync(main)
