import json
import logging
import logging.handlers
import os

from apscheduler.schedulers.tornado import TornadoScheduler
from apscheduler.triggers.cron import CronTrigger
import bson.json_util
from dotenv import load_dotenv
import gridfs
from jinja2 import Environment, FileSystemLoader
from keycloak import KeycloakOpenID, KeycloakAdmin
import pymongo
import pymongo.errors
import socketio
import tornado.httpserver
import tornado.ioloop
import tornado.locks
import tornado.log
from tornado.options import define, options, parse_command_line
import tornado.web

import global_vars
from handlers.authentication import LoginHandler, LoginCallbackHandler, LogoutHandler
from handlers.db_static_files import GridFSStaticFileHandler
from handlers.healthcheck import HealthCheckHandler
from handlers.import_personas import ImportDummyPersonasHandler
from handlers.mail_invitation import EmailInvitationHandler
from handlers.material_taxonomy import (
    MBRSyncHandler,
    MBRTestHandler,
    MaterialTaxonomyHandler,
)
from handlers.network.chat import RoomHandler
from handlers.network.follow import FollowHandler
from handlers.network.notifications import NotificationHandler
from handlers.network.permissions import (
    GlobalACLHandler,
    RoleHandler,
    SpaceACLHandler,
)
from handlers.network.post import *
from handlers.network.search import SearchHandler
from handlers.network.space import SpaceHandler
from handlers.network.timeline import *
from handlers.network.user import *
from resources.network.acl import ACL, cleanup_unused_rules
from resources.network.profile import ProfileDoesntExistException, Profiles
from resources.network.space import Spaces
from handlers.planner.etherpad_integration import EtherpadIntegrationHandler
from handlers.planner.ve_plan import VEPlanHandler
from handlers.planner.ve_invite import VeInvitationHandler
from handlers.report import ReportHandler
from handlers.template_debug_handler import TemplateDebugHandler
from resources.notifications import (
    new_message_mail_notification_dispatch,
    periodic_notification_dispatch,
)
import util
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

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

# load environment variables from .env file
load_dotenv()


def make_app(cookie_secret: str, debug: bool = False):
    # setup socketio server
    global_vars.socket_io = socketio.AsyncServer(
        async_mode="tornado", cors_allowed_origins="*"
    )
    # imports have to be done lazily here, because otherwise the socket_io server in global
    # vars would not be ready, causing the event handling to crash
    # but in turn if they don't get imported at all, the handler functions would not be
    # invoked.
    # that's the price we gotta pay, but atleast the socket server is accessible from anywhere
    from handlers.socket_io import (
        connect,
        disconnect,
        authenticate,
        acknowledge_notification,
    )

    return tornado.web.Application(
        [
            (r"/login", LoginHandler),
            (r"/login/callback", LoginCallbackHandler),
            (r"/logout", LogoutHandler),
            (r"/health", HealthCheckHandler),
            (r"/posts", PostHandler),
            (r"/comment", CommentHandler),
            (r"/like", LikePostHandler),
            (r"/repost", RepostHandler),
            (r"/pin", PinHandler),
            (r"/follow", FollowHandler),
            (r"/updates", NewPostsSinceTimestampHandler),
            (r"/spaceadministration/(.+)", SpaceHandler),
            (r"/timeline", TimelineHandler),
            (r"/timeline/space/(.+)", SpaceTimelineHandler),
            (r"/timeline/user/(.+)", UserTimelineHandler),
            (r"/timeline/you", PersonalTimelineHandler),
            (r"/profileinformation", ProfileInformationHandler),
            (r"/profile_snippets", BulkProfileSnippets),
            (r"/users/(.+)", UserHandler),
            (r"/role/(.+)", RoleHandler),
            (r"/global_acl/(.+)", GlobalACLHandler),
            (r"/space_acl/(.+)", SpaceACLHandler),
            (r"/search", SearchHandler),
            (r"/planner/(.+)", VEPlanHandler),
            (r"/orcid", OrcidProfileHandler),
            (r"/matching_exclusion_info", MatchingExclusionHandler),
            (r"/matching", MatchingHandler),
            (r"/etherpad_integration/(.+)", EtherpadIntegrationHandler),
            (r"/ve_invitation/(.+)", VeInvitationHandler),
            (r"/notifications", NotificationHandler),
            (r"/chatroom/(.*)", RoomHandler),
            (r"/material_taxonomy", MaterialTaxonomyHandler),
            (r"/mail_invitation/(.+)", EmailInvitationHandler),
            (r"/import_personas", ImportDummyPersonasHandler),
            (r"/admin_check", AdminCheckHandler),
            (r"/report/(.+)", ReportHandler),
            (r"/mbr_sync", MBRSyncHandler),
            (r"/mbr_test", MBRTestHandler),
            (r"/css/(.*)", tornado.web.StaticFileHandler, {"path": "./css/"}),
            (r"/assets/(.*)", tornado.web.StaticFileHandler, {"path": "./assets/"}),
            (r"/html/(.*)", tornado.web.StaticFileHandler, {"path": "./html/"}),
            (
                r"/javascripts/(.*)",
                tornado.web.StaticFileHandler,
                {"path": "./javascripts/"},
            ),
            (r"/uploads/(.*)", GridFSStaticFileHandler, {"path": ""}),
            (r"/socket.io/", socketio.get_tornado_handler(global_vars.socket_io)),
            (
                r"/knowledgeworker/(.*)",
                tornado.web.StaticFileHandler,
                {"path": "./knowledgeworker_courses", "default_filename": "index.html"},
            ),
            (r"/template/(.*)", TemplateDebugHandler),
        ],
        cookie_secret=cookie_secret,
        template_path="html",
        debug=debug,
    )


def init_indexes(force_rebuild: bool) -> None:
    """
    build the indexes for posts and profiles (for searching)
    and spaces, posts and profiles (for faster lookups).
    the weights of the fields are left default (1).
    indexes will be build if a) they don't exist or b) if rebuild is forced by setting force_rebuild to True)

    :param force_rebuild: boolean switch to trigger a forced rebuild of the text indexes
    """

    with util.get_mongodb() as db:
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


def create_initial_admin() -> None:
    """
    create an initial admin based on INITIAL_ADMIN_USERNAME env-variable
    or "admin" if not set
    """

    username = os.getenv("INITIAL_ADMIN_USERNAME", "admin")

    with util.get_mongodb() as db:
        profile_manager = Profiles(db)
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
        acl = ACL(db)
        space_manager = Spaces(db)

        acl.global_acl.insert_admin()

        for space in space_manager.get_space_names():
            acl.space_acl.insert_admin(space)

        logger.info(
            "inserted admin user '{}' and corresponding ACL rules".format(username)
        )


def load_default_taxonomy_if_exists(overwrite_existing: bool) -> None:
    """
    Load the default taxonomy from the assets folder

    :param overwrite_existing: boolean load taxonomy even if it already exists in DB
    """

    with util.get_mongodb() as db:
        # db already has one, skip
        if not overwrite_existing and db.material_taxonomy.count_documents({}) > 0:
            return

        # no default taxonomy file exists, skip
        if not os.path.isfile("assets/default_taxonomy.json"):
            logger.warning(
                "tried to load default taxonomy from assets folder, but no file found"
            )
            return

        if overwrite_existing and db.material_taxonomy.count_documents({}) > 0:
            logger.info("Deleted existing taxonomy")
            db.material_taxonomy.delete_many({})

        # db is empty and default taxonomy file exists, load it
        with open("assets/default_taxonomy.json", "r") as f:
            taxonomy = json.load(f)
            if "taxonomy" in taxonomy:
                db.material_taxonomy.insert_one(taxonomy)
                logger.info("Loaded default taxonomy from assets folder")


def load_default_good_practise_examples_if_exists() -> None:
    """
    load all default good practise examples from the assets folder
    into the db that dont already exist
    """

    # no default good practise examples file exists, skip
    if not os.path.isfile("assets/default_good_practise_plans.json"):
        logger.warning(
            "tried to load default good practise examples from assets folder, but no file found"
        )
        return

    with util.get_mongodb() as db:
        with open("assets/default_good_practise_plans.json", "r") as f:
            good_practise_examples = json.load(f)
            if "good_practise_plans" in good_practise_examples:
                insert_count = 0
                for gpe in good_practise_examples["good_practise_plans"]:
                    try:
                        # due to the fact that gpe's were exported from a previous
                        # active db, they have extended json syntax v2 that cannot be
                        # directly inserted into the db.
                        # thats why we dump them back to string and load with the bson
                        # utilities to get a valid bson document
                        db.plans.insert_one(bson.json_util.loads(json.dumps(gpe)))
                        insert_count += 1
                    except pymongo.errors.DuplicateKeyError:
                        pass
                if insert_count > 0:
                    logger.info(
                        "Loaded {} default good practise examples from assets folder".format(
                            insert_count
                        )
                    )


def set_global_vars() -> None:
    """
    setup global_vars from env properties
    """

    # assure config contains expected keys that do not have a default value
    expected_env_keys = [
        "COOKIE_SECRET",
        "WORDPRESS_URL",
        "KEYCLOAK_BASE_URL",
        "KEYCLOAK_REALM",
        "KEYCLOAK_CLIENT_ID",
        "KEYCLOAK_CLIENT_SECRET",
        "KEYCLOAK_CALLBACK_URL",
        "KEYCLOAK_ADMIN_USERNAME",
        "KEYCLOAK_ADMIN_PASSWORD",
        "MONGODB_USERNAME",
        "MONGODB_PASSWORD",
        "ETHERPAD_BASE_URL",
        "ETHERPAD_API_KEY",
        "ELASTICSEARCH_BASE_URL",
        "ELASTICSEARCH_PASSWORD",
        "DUMMY_PERSONAS_PASSCODE",
        "MBR_TOKEN_ENDPOINT",
        "MBR_CLIENT_ID",
        "MBR_CLIENT_SECRET",
        "MBR_METADATA_BASE_ENDPOINT",
        "MBR_METADATA_SOURCE_SLUG",
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USERNAME",
        "SMTP_PASSWORD",
    ]

    for key in expected_env_keys:
        if os.getenv(key) is None:
            raise RuntimeError("environment misses variable {}".format(key))

    # set global vars from config
    global_vars.port = int(os.getenv("PORT", "8888"))
    global_vars.cookie_secret = os.getenv("COOKIE_SECRET")
    global_vars.wordpress_url = os.getenv("WORDPRESS_URL")
    global_vars.mongodb_host = os.getenv("MONGODB_HOST", "localhost")
    global_vars.mongodb_port = int(os.getenv("MONGODB_PORT", "27017"))
    global_vars.mongodb_username = os.getenv("MONGODB_USERNAME")
    global_vars.mongodb_password = os.getenv("MONGODB_PASSWORD")
    global_vars.mongodb_db_name = os.getenv("MONGODB_DB_NAME", "ve_collab")
    global_vars.etherpad_base_url = os.getenv("ETHERPAD_BASE_URL")
    global_vars.etherpad_api_key = os.getenv("ETHERPAD_API_KEY")
    global_vars.elasticsearch_base_url = os.getenv("ELASTICSEARCH_BASE_URL")
    global_vars.elasticsearch_username = os.getenv("ELASTICSEARCH_USERNAME", "elastic")
    global_vars.elasticsearch_password = os.getenv("ELASTICSEARCH_PASSWORD")
    global_vars.dummy_personas_passcode = os.getenv("DUMMY_PERSONAS_PASSCODE")
    global_vars.mbr_token_endpoint = os.getenv("MBR_TOKEN_ENDPOINT")
    global_vars.mbr_client_id = os.getenv("MBR_CLIENT_ID")
    global_vars.mbr_client_secret = os.getenv("MBR_CLIENT_SECRET")
    global_vars.mbr_metadata_base_endpoint = os.getenv("MBR_METADATA_BASE_ENDPOINT")
    global_vars.mbr_metadata_source_slug = os.getenv("MBR_METADATA_SOURCE_SLUG")
    global_vars.smtp_host = os.getenv("SMTP_HOST")
    global_vars.smtp_port = int(os.getenv("SMTP_PORT", 587))
    global_vars.smtp_username = os.getenv("SMTP_USERNAME")
    global_vars.smtp_password = os.getenv("SMTP_PASSWORD")

    global_vars.keycloak_base_url = os.getenv("KEYCLOAK_BASE_URL")
    global_vars.keycloak_realm = os.getenv("KEYCLOAK_REALM")
    global_vars.keycloak_client_id = os.getenv("KEYCLOAK_CLIENT_ID")
    global_vars.keycloak_client_secret = os.getenv("KEYCLOAK_CLIENT_SECRET")
    global_vars.keycloak_callback_url = os.getenv("KEYCLOAK_CALLBACK_URL")
    global_vars.keycloak_admin_username = os.getenv("KEYCLOAK_ADMIN_USERNAME")
    global_vars.keycloak_admin_password = os.getenv("KEYCLOAK_ADMIN_PASSWORD")

    if not (options.test_admin or options.test_user):
        global_vars.keycloak = KeycloakOpenID(
            global_vars.keycloak_base_url,
            realm_name=global_vars.keycloak_realm,
            client_id=global_vars.keycloak_client_id,
            client_secret_key=global_vars.keycloak_client_secret,
        )
        global_vars.keycloak_admin = KeycloakAdmin(
            global_vars.keycloak_base_url,
            realm_name=global_vars.keycloak_realm,
            username=global_vars.keycloak_admin_username,
            password=global_vars.keycloak_admin_password,
            verify=True,
        )


def init_default_pictures():
    """
    copy the logo.png, default_profile_pic.jpg and default_group_pic.jpg from the
    assets folder into gridfs to be serveable by the GridFSFileHandler
    """

    with pymongo.MongoClient(
        global_vars.mongodb_host,
        global_vars.mongodb_port,
        username=global_vars.mongodb_username,
        password=global_vars.mongodb_password,
    ) as client:
        db = client[global_vars.mongodb_db_name]
        fs = gridfs.GridFS(db)

        if not fs.exists("default_profile_pic.jpg"):
            with open("assets/default_profile_pic.jpg", "rb") as fp:
                fs.put(
                    fp.read(),
                    _id="default_profile_pic.jpg",
                    content_type="image/jpg",
                    metadata={"uploader": "system"},
                )
                logger.info("default_profile_pic created")
        if not fs.exists("default_group_pic.jpg"):
            with open("assets/default_group_pic.jpg", "rb") as fp:
                fs.put(
                    fp.read(),
                    _id="default_group_pic.jpg",
                    content_type="image/jpg",
                    metadata={"uploader": "system"},
                )
                logger.info("default_group_pic created")


def create_log_directory():
    """
    setup a directory "logs" in the current working directory
    """

    if not os.path.isdir("logs"):
        os.mkdir("logs")


def hook_tornado_access_log():
    """
    Create a FileHandler onto Tornado's access logger
    to capture them additionally in a separate file
    for external statistics, benchmarking, etc.
    """

    # create a log directory to hold all access logs
    create_log_directory()

    tornado_access_logger = logging.getLogger("tornado.access")
    handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join("logs", "access_log.log"),
        maxBytes=10 * 1000 * 1000,  # 10MB per file
        backupCount=100,  # max 100 files --> max. 1 GB of access logs
        encoding="utf-8",
    )
    handler.setFormatter(tornado.log.LogFormatter(color=False))
    tornado_access_logger.addHandler(handler)

    # prevent propagation to top level logger that prints to stdout/stderr
    # if the flag is set
    if options.supress_stdout_access_log is True:
        tornado_access_logger.propagate = False


def schedule_periodic_tasks():
    """
    Schedule and start all (periodic) notifications from
    `assets/periodic_notifications.json`.
    """

    scheduler = TornadoScheduler()
    executor = ThreadPoolExecutor(max_workers=4)

    def run_in_executor(func, *args, **kwargs):
        return executor.submit(func, *args, **kwargs)

    # reminder notifications
    with open("assets/periodic_notifications.json", "r") as fp:
        periodic_notifications = json.load(fp)["periodic_notifications"]

        for notification in periodic_notifications:
            for execution_dates in notification["triggers"]:
                trigger = CronTrigger(
                    year=execution_dates["year"],
                    month=execution_dates["month"],
                    day=execution_dates["day"],
                    hour=execution_dates["hour"],
                    minute=execution_dates["minute"],
                )
                scheduler.add_job(
                    run_in_executor,
                    trigger,
                    args=[
                        periodic_notification_dispatch,
                        notification["type"],
                        notification["payload"],
                        notification["email_subject"],
                    ],
                )

    # new message mail notifications
    scheduler.add_job(
        run_in_executor,
        CronTrigger(hour=2, minute=0),
        args=[new_message_mail_notification_dispatch],
    )

    scheduler.start()


def load_email_templates():
    """
    set up the jinja2 environment for email templates and
    store it in `global_vars.email_template_env`
    """

    jinja_env = Environment(
        loader=FileSystemLoader("assets/email_templates"), autoescape=True
    )
    global_vars.email_template_env = jinja_env


def main():
    define(
        "debug",
        default=False,
        type=bool,
        help="start application in debug mode (autoreload, etc.). don't use this flag in production",
    )
    define(
        "build_indexes",
        default=False,
        type=bool,
        help="force the application to (re)build the indexes for full text search and query optimization. Warning: this might take a long time depending on your database size",
    )
    define(
        "supress_stdout_access_log",
        default=False,
        type=bool,
        help="Prevent the tornado access logger from logging to stdout, only log file instead",
    )
    define(
        "load_taxonomy",
        default=False,
        type=bool,
        help="Load default taxonomy even if it already exists in DB",
    )

    parse_command_line()

    # setup global vars from env
    set_global_vars()

    # load email template env
    load_email_templates()

    # insert default admin role and acl templates
    create_initial_admin()

    # setup text indexes for searching
    init_indexes(options.build_indexes)

    # setup default group and profile pictures
    init_default_pictures()

    # load default taxonomy if none exists
    load_default_taxonomy_if_exists(options.load_taxonomy)

    # load those good practise examples that dont already exist
    load_default_good_practise_examples_if_exists()

    # write tornado access log to separate logfile
    hook_tornado_access_log()

    # schedule periodic tasks (new message and reminder notifications)
    schedule_periodic_tasks()

    # periodically schedule acl entry cleanup
    # cleanup happens every  3,600,000 ms = 1 hour
    # TODO can also do this using APScheduler since we have to use it now anyways
    tornado.ioloop.PeriodicCallback(cleanup_unused_rules, 3_600_000).start()

    # build and start server
    app = make_app(global_vars.cookie_secret, options.debug)
    server = tornado.httpserver.HTTPServer(app)
    logger.info("Starting server on port: " + str(global_vars.port))
    server.listen(global_vars.port)

    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    main()
