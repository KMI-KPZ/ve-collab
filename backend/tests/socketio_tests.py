import asyncio
import logging
import os

from dotenv import load_dotenv
import pymongo
import socketio
import tornado
from tornado.options import options
from tornado.testing import AsyncHTTPTestCase
from tornado.testing import gen_test

import global_vars
from main import make_app
from model import User
import util

# load environment variables
load_dotenv()

# hack all loggers to not produce too much irrelevant (info) output here
for logger_name in logging.root.manager.loggerDict:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.ERROR)
logging.getLogger().setLevel(logging.ERROR)

# don't change, these values match with the ones in BaseHandler
CURRENT_ADMIN = User(
    "test_admin", "aaaaaaaa-bbbb-0000-cccc-dddddddddddd", "test_admin@mail.de"
)
CURRENT_USER = User(
    "test_user", "aaaaaaaa-bbbb-0000-cccc-dddddddddddd", "test_user@mail.de"
)

MISSING_KEY_ERROR_SLUG = "missing_key:"

def setUpModule():
    """
    initial one time setup that deals with config properties.
    unittest will call this method itself.
    """

    global_vars.port = int(os.getenv("PORT", "8888"))
    global_vars.cookie_secret = os.getenv("COOKIE_SECRET")
    global_vars.wordpress_url = os.getenv("WORDPRESS_URL")
    global_vars.mongodb_host = os.getenv("MONGODB_HOST", "localhost")
    global_vars.mongodb_port = int(os.getenv("MONGODB_PORT", "27017"))
    global_vars.mongodb_username = os.getenv("MONGODB_USERNAME")
    global_vars.mongodb_password = os.getenv("MONGODB_PASSWORD")
    global_vars.mongodb_db_name = "ve-collab-unittest"
    global_vars.etherpad_base_url = os.getenv("ETHERPAD_BASE_URL")
    global_vars.etherpad_api_key = os.getenv("ETHERPAD_API_KEY")
    global_vars.elasticsearch_base_url = os.getenv("ELASTICSEARCH_BASE_URL")
    global_vars.elasticsearch_username = os.getenv("ELASTICSEARCH_USERNAME", "elastic")
    global_vars.elasticsearch_password = os.getenv("ELASTICSEARCH_PASSWORD")
    global_vars.dummy_personas_passcode = os.getenv("DUMMY_PERSONAS_PASSCODE")
    global_vars.keycloak_base_url = os.getenv("KEYCLOAK_BASE_URL")
    global_vars.keycloak_realm = os.getenv("KEYCLOAK_REALM")
    global_vars.keycloak_client_id = os.getenv("KEYCLOAK_CLIENT_ID")
    global_vars.keycloak_client_secret = os.getenv("KEYCLOAK_CLIENT_SECRET")
    global_vars.keycloak_admin_username = os.getenv("KEYCLOAK_ADMIN_USERNAME")
    global_vars.keycloak_admin_password = os.getenv("KEYCLOAK_ADMIN_PASSWORD")


def tearDownModule():
    """
    after all tests from all cases have run, wipe the whole db for safety's sake
    in case any of the test cases missed to clean up.
    unittest will call this method itself.
    """

    with util.get_mongodb() as db:
        for collection_name in db.list_collection_names():
            db.drop_collection(collection_name)


class SocketIOHandlerTest(AsyncHTTPTestCase):
    def get_app(self):
        return make_app(global_vars.cookie_secret)

    @classmethod
    def setUpClass(cls):
        # initialize mongodb connection
        cls._client = pymongo.MongoClient(
            global_vars.mongodb_host,
            global_vars.mongodb_port,
            username=global_vars.mongodb_username,
            password=global_vars.mongodb_password,
        )
        cls._db = cls._client[global_vars.mongodb_db_name]

    def setUp(self) -> None:
        super().setUp()

        # set test mode to bypass authentication as an admin as default for each test case
        # (test cases where user view is required will set mode themselves)
        options.test_admin = True

        # initialize mongodb connection
        self.client = self.__class__._client
        self.db = self.__class__._db


    def tearDown(self) -> None:
        self.client = None
        super().tearDown()

    @classmethod
    def tearDownClass(cls) -> None:
        # close mongodb connection
        cls._client.close()

    async def socketio_connect(self, socketio_client: socketio.AsyncClient):
        await socketio_client.connect(
            "http://localhost:{}".format(self.get_http_port())
        )

    def assert_success(self, socketio_response: dict):
        """
        convenience wrapper to check for the success state of
        a socketio server response
        """

        self.assertIn("status", socketio_response)
        self.assertIn("success", socketio_response)
        self.assertEqual(socketio_response["status"], 200)
        self.assertTrue(socketio_response["success"])

    @gen_test(timeout=30)
    async def test(self):
        """
        for some reason, the individuel tests cannot be separated into
        different test cases, because seemingly the engineio layer
        of the socketio client is not properly reset between test cases.
        Might also be related to the way io loops are handled in the tornado
        test cases. Therefore, all tests are in this one test case and run
        sequentially.
        """

        async def test_connect(self):
            """
            expect: successfully connect to the socketio server
            """

            socketio_client = socketio.AsyncClient()
            await self.socketio_connect(socketio_client)
            await socketio_client.disconnect()

        async def test_authenticate(self):
            """
            expect: successfully emit an authenticate event to the server,
            and await a success response
            """

            socketio_client = socketio.AsyncClient()
            await self.socketio_connect(socketio_client)

            release_event = socketio_client.eio.create_event()

            async def authenticate_callback(data):
                self.assert_success(data)

                # check that server side session was created
                self.assertIn(CURRENT_ADMIN.username, global_vars.username_sid_map)
                self.assertEqual(
                    global_vars.username_sid_map[CURRENT_ADMIN.username],
                    socketio_client.get_sid(),
                )
                self.assertIsNotNone(
                    await global_vars.socket_io.get_session(socketio_client.get_sid())
                )

                release_event.set()

            @socketio_client.on("notification")
            def test(data):
                print("notification event recognized")
                print(data)

            @socketio_client.on("message")
            def message(data):
                print("message event recognized")
                print(data)

            try:
                # emit event to server and wait for response (i.e. return value from server handler function)
                # other events that appear meanwhile can be handled by the callback function, see above
                await socketio_client.emit(
                    "authenticate",
                    data={"token": "usually_valid_jwt_token"},
                    callback=authenticate_callback,
                )
                await asyncio.wait_for(release_event.wait(), timeout=5)
            finally:
                release_event.clear()
                await socketio_client.disconnect()

        async def test_authenticate_error_missing_token(self):
            """
            expect: error message from authenticate event because
            the access token is missing
            """

            socketio_client = socketio.AsyncClient()
            await self.socketio_connect(socketio_client)
            
            release_event = socketio_client.eio.create_event()

            async def authenticate_callback2(data, *args):
                self.assertFalse(data["success"])
                self.assertEqual(data["status"], 400)
                self.assertEqual(data["reason"], MISSING_KEY_ERROR_SLUG + "token")

                release_event.set()

            try:
                await socketio_client.emit(
                    "authenticate", data={"bla": "bla"}, callback=authenticate_callback2
                )
                await asyncio.wait_for(release_event.wait(), timeout=5)
            finally:
                release_event.clear()
                await socketio_client.disconnect()

        #################################################################################
        # run all tests                                                                 #
        #################################################################################
        await test_connect(self)
        await test_authenticate(self)
        await test_authenticate_error_missing_token(self)