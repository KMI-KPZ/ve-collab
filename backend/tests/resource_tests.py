from bson import ObjectId
from datetime import datetime, timedelta, timezone
import os
import time
from unittest import TestCase, mock
from bson import ObjectId
import gridfs

from dotenv import load_dotenv
import pymongo
import requests
from tornado.testing import AsyncTestCase
from tornado.testing import gen_test
from tornado.options import options

from exceptions import (
    AlreadyAdminError,
    AlreadyFollowedException,
    AlreadyLikerException,
    AlreadyMemberError,
    AlreadyRequestedJoinError,
    FileAlreadyInRepoError,
    FileDoesntExistError,
    FileNodeDoesntExistError,
    FileTooLargeError,
    FilenameCollisionError,
    FolderDepthExceededError,
    InvalidFileNameError,
    InvalidMoveTargetError,
    InvitationDoesntExistError,
    MaximumFilesExceededError,
    MessageDoesntExistError,
    MissingKeyError,
    NoReadAccessError,
    NoWriteAccessError,
    NonUniqueTasksError,
    NotAFileError,
    NotAFolderError,
    NotFollowedException,
    NotLikerException,
    NotRequestedJoinError,
    OnlyAdminError,
    PlanAlreadyExistsError,
    PlanDoesntExistError,
    ReadOnlyNodeError,
    ReportDoesntExistError,
    RoomDoesntExistError,
    PostNotExistingException,
    ProfileDoesntExistException,
    SpaceDoesntExistError,
    StorageQuotaExceededError,
    UserNotAdminError,
    UserNotInvitedError,
    UserNotMemberError,
)
import global_vars
from main import make_app  # import, otherwise test mode will fail in the app
from migrations.chat_message_files import migrate as migrate_chat_message_files
from migrations.gridfs_content_type import migrate as migrate_gridfs_content_type
from migrations.space_files import migrate as migrate_space_files
from model import (
    Evaluation,
    IndividualLearningGoal,
    Institution,
    Lecture,
    PhysicalMobility,
    Step,
    TargetGroup,
    Task,
    User,
    VEPlan,
)
from resources.elasticsearch_integration import ElasticsearchConnector
from resources.mail_invitation import MailInvitation
from resources.network.acl import ACL
from resources.network.chat import Chat
from resources.network.post import Posts
from resources.network.profile import Profiles
from resources.network.space import Spaces
from resources.network.space_files import SpaceFiles
from resources.planner.ve_plan import VEPlanResource
from resources.reports import Reports
from resources.notifications import NotificationResource
import util

# don't change, these values match with the ones in BaseHandler
CURRENT_ADMIN = User(
    "test_admin", "aaaaaaaa-bbbb-0000-cccc-dddddddddddd", "test_admin@mail.de"
)
CURRENT_USER = User(
    "test_user", "aaaaaaaa-bbbb-0000-cccc-dddddddddddd", "test_user@mail.de"
)

load_dotenv()


def setUpModule():
    """
    initial one time setup that deals with config properties.
    unittest will call this method itself.
    """

    global_vars.mongodb_host = os.getenv("MONGODB_HOST", "localhost")
    global_vars.mongodb_port = int(os.getenv("MONGODB_PORT", "27017"))
    global_vars.mongodb_username = os.getenv("MONGODB_USERNAME")
    global_vars.mongodb_password = os.getenv("MONGODB_PASSWORD")
    global_vars.mongodb_db_name = "ve-collab-unittest"
    global_vars.elasticsearch_base_url = os.getenv(
        "ELASTICSEARCH_BASE_URL", "http://localhost:9200"
    )
    global_vars.elasticsearch_username = os.getenv("ELASTICSEARCH_USERNAME", "elastic")
    global_vars.elasticsearch_password = os.getenv("ELASTICSEARCH_PASSWORD")


def tearDownModule():
    """
    after all tests from all cases have run, wipe the whole db for safety's sake
    in case any of the test cases missed to clean up.
    unittest will call this method itself.
    """

    with util.get_mongodb() as db:
        for collection_name in db.list_collection_names():
            db.drop_collection(collection_name)


class BaseResourceTestCase(TestCase):
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

        # set test mode to bypass authentication as an admin as default for each test case (test cases where user view is required will set mode themselves)
        options.test_admin = True

        # initialize mongodb connection
        self.client = self.__class__._client
        self.db = self.__class__._db

        # multiplier values for achievements
        self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS = Profiles(
            self.db
        ).SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS
        self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS = Profiles(
            self.db
        ).VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS

    def tearDown(self) -> None:
        self.client = None
        super().tearDown()

    @classmethod
    def tearDownClass(cls) -> None:
        # close mongodb connection
        cls._client.close()

    def create_step(
        self,
        name: str,
        timestamp_from: datetime = datetime(2023, 1, 1),
        timestamp_to: datetime = datetime(2023, 1, 8),
    ) -> Step:
        """
        convenience method to create a Step object with non-default values
        """

        return Step(
            name=name,
            workload=10,
            timestamp_from=timestamp_from,
            timestamp_to=timestamp_to,
            learning_goal="test",
            learning_activity="test",
            has_tasks=True,
            tasks=[Task()],
            original_plan=ObjectId(),
        )

    def create_target_group(self, name: str) -> TargetGroup:
        """
        convenience method to create a TargetGroup object with non-default values
        """
        return TargetGroup(
            name=name,
            semester="test",
            experience="test",
            academic_course="test",
            languages=["test"],
        )

    def create_institution(self, name: str = "test") -> Institution:
        """
        convenience method to create an institution with non-default values
        """

        return Institution(
            name=name,
            school_type="test",
            country="test",
            department="test",
        )

    def create_lecture(self, name: str = "test") -> Lecture:
        """
        convenience method to create a lecture with non-default values
        """

        return Lecture(
            name=name,
            lecture_format="test",
            lecture_type="test",
            participants_amount=10,
        )

    def create_physical_mobility(self, location: str = "test") -> PhysicalMobility:
        """
        convenience method to create a physical mobility with non-default values
        """

        return PhysicalMobility(
            location=location,
            timestamp_from=datetime(2023, 1, 1),
            timestamp_to=datetime(2023, 1, 8),
        )

    def create_evaluation(self, username: str = "test_admin") -> Evaluation:
        """
        convenience method to create an evaluation with non-default values
        """

        return Evaluation(
            username=username,
            is_graded=True,
            task_type="test",
            assessment_type="test",
            evaluation_before="test",
            evaluation_while="test",
            evaluation_after="test",
        )

    def create_individual_learning_goal(
        self, username: str = "test_admin"
    ) -> IndividualLearningGoal:
        """
        convenience method to create an individual learning goal with non-default values
        """

        return IndividualLearningGoal(
            username=username,
            learning_goal="test",
        )


class GlobalACLRessourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.default_acl_entry = {"role": "guest", "create_space": True}
        self.db.global_acl.insert_one(self.default_acl_entry.copy())

    def tearDown(self) -> None:
        super().tearDown()

        self.db.global_acl.delete_many({})

    def test_get_existing_keys(self):
        """
        expect: successfully get expected keys for each acl entry
        """

        acl_manager = ACL(self.db)
        keys = acl_manager.global_acl.get_existing_keys()
        self.assertEqual(["role", "create_space"], keys)

    def test_insert_default(self):
        """
        expect: successfully insert default rule for given role
        """

        acl_manager = ACL(self.db)
        acl_manager.global_acl.insert_default("another_role")

        # check if default rule was inserted
        acl_entry = self.db.global_acl.find_one({"role": "another_role"})
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["role"], "another_role")
        self.assertEqual(acl_entry["create_space"], True)

    def test_insert_admin(self):
        """
        expect: successfully insert an admin rule
        """

        acl_manager = ACL(self.db)
        acl_manager.global_acl.insert_admin()

        # check if admin rule was inserted
        acl_entry = self.db.global_acl.find_one({"role": "admin"})
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["role"], "admin")
        self.assertEqual(acl_entry["create_space"], True)

    def test_ask(self):
        """
        expect: successfully ask the acl for a given rolen and permission key
        """

        acl_manager = ACL(self.db)
        self.assertTrue(acl_manager.global_acl.ask("guest", "create_space"))

    def test_ask_error_key_doesnt_exist(self):
        """
        expect: KeyError is raised because the supplied permission key doesn't exist
        """

        acl_manager = ACL(self.db)
        self.assertRaises(KeyError, acl_manager.global_acl.ask, "guest", "test")

    def test_ask_error_role_doesnt_exist(self):
        """
        expect: Value is raised because the supplied role doesn't exist
        """

        acl_manager = ACL(self.db)
        self.assertRaises(
            ValueError, acl_manager.global_acl.ask, "test", "create_space"
        )

    def test_get(self):
        """
        expect: successfully get acl entry for given role
        """

        acl_manager = ACL(self.db)
        acl_entry = acl_manager.global_acl.get("guest")
        self.assertEqual(acl_entry["role"], "guest")
        self.assertEqual(acl_entry["create_space"], True)

    def test_get_error_role_doesnt_exist(self):
        """
        expect: None is returned because the supplied role doesn't exist
        """

        acl_manager = ACL(self.db)
        acl_entry = acl_manager.global_acl.get("test")
        self.assertIsNone(acl_entry)

    def test_get_all(self):
        """
        expect: successfully get all acl rules
        """

        # add one more rule
        test_rule = {"role": "test", "create_space": False}
        self.db.global_acl.insert_one(test_rule.copy())

        acl_manager = ACL(self.db)
        acl_entries = acl_manager.global_acl.get_all()
        self.assertEqual(len(acl_entries), 2)
        self.assertIn(self.default_acl_entry, acl_entries)
        self.assertIn(test_rule, acl_entries)

    def test_set(self):
        """
        expect: successfully set a single permission key value for a given role
        """

        acl_manager = ACL(self.db)
        acl_manager.global_acl.set("guest", "create_space", False)

        # check if value was set
        acl_entry = self.db.global_acl.find_one({"role": "guest"})
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["role"], "guest")
        self.assertEqual(acl_entry["create_space"], False)

    def test_set_upsert(self):
        """
        expect: using set, successfully insert a new role with permission key value
        that didn't exist before
        """

        acl_manager = ACL(self.db)
        acl_manager.global_acl.set("test", "create_space", True)

        # check if value was set
        acl_entry = self.db.global_acl.find_one({"role": "test"})
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["role"], "test")
        self.assertEqual(acl_entry["create_space"], True)

    def test_set_error_key_doesnt_exist(self):
        """
        expect: KeyError is raised because the supplied permission key doesn't exist
        """

        acl_manager = ACL(self.db)
        self.assertRaises(KeyError, acl_manager.global_acl.set, "guest", "test", True)

    def test_set_all(self):
        """
        expect: successfully set all permission keys with values for a given role
        (not incredibly effective for global acl tho, as there is currently only one key)
        """

        acl_manager = ACL(self.db)
        acl_manager.global_acl.set_all({"role": "guest", "create_space": False})

        # check if value was set
        acl_entry = self.db.global_acl.find_one({"role": "guest"})
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["role"], "guest")
        self.assertEqual(acl_entry["create_space"], False)

    def test_set_all_upsert(self):
        """
        expect: using set_all, successfully insert a new role with permission key values
        that didn't exist before
        """

        acl_manager = ACL(self.db)
        acl_manager.global_acl.set_all({"role": "test", "create_space": True})

        # check if value was set
        acl_entry = self.db.global_acl.find_one({"role": "test"})
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["role"], "test")
        self.assertEqual(acl_entry["create_space"], True)

    def test_set_all_error_missing_role(self):
        """
        expect: KeyError is raised because "role" attribute is missing from the dict
        """

        acl_manager = ACL(self.db)
        self.assertRaises(KeyError, acl_manager.global_acl.set_all, {"test": True})

    def test_set_all_error_wrong_key(self):
        """
        expect: KeyError is raised because atleast one of the supplied
        permission keys doesn't exist
        """

        acl_manager = ACL(self.db)
        self.assertRaises(
            KeyError, acl_manager.global_acl.set_all, {"role": "guest", "test": True}
        )

    def test_delete(self):
        """
        expect: successfully delete acl entry for given role
        """

        acl_manager = ACL(self.db)
        acl_manager.global_acl.delete("guest")

        # check if entry was deleted
        acl_entry = self.db.global_acl.find_one({"role": "guest"})
        self.assertIsNone(acl_entry)


class SpaceACLResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        # create default space:
        self.space_id = ObjectId()
        self.space_name = "test"
        self.default_space = {
            "_id": self.space_id,
            "name": self.space_name,
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }
        self.db.spaces.insert_one(self.default_space)

        self.default_acl_entry = {
            "username": CURRENT_ADMIN.username,
            "space": self.space_id,
            "join_space": True,
            "read_timeline": True,
            "post": True,
            "comment": True,
            "read_wiki": True,
            "write_wiki": True,
            "read_files": True,
            "write_files": True,
        }
        self.db.space_acl.insert_one(self.default_acl_entry.copy())

    def tearDown(self) -> None:
        super().tearDown()

        self.db.spaces.delete_many({})
        self.db.space_acl.delete_many({})

    def test_get_existing_keys(self):
        """
        expect: successfully get expected keys for each acl entry
        """

        acl_manager = ACL(self.db)
        keys = acl_manager.space_acl.get_existing_keys()
        self.assertEqual(
            [
                "username",
                "space",
                "join_space",
                "read_timeline",
                "post",
                "comment",
                "read_wiki",
                "write_wiki",
                "read_files",
                "write_files",
            ],
            keys,
        )

    def test_insert_default(self):
        """
        expect: successfully insert default rule (everything except read_timeline False)
        for the given user in the given space
        """

        acl_manager = ACL(self.db)
        acl_manager.space_acl.insert_default(CURRENT_USER.username, self.space_id)

        # check if default rule was inserted
        acl_entry = self.db.space_acl.find_one(
            {"username": CURRENT_USER.username, "space": self.space_id}
        )
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["username"], CURRENT_USER.username)
        self.assertEqual(acl_entry["space"], self.space_id)
        self.assertEqual(acl_entry["join_space"], False)
        self.assertEqual(acl_entry["read_timeline"], True)
        self.assertEqual(acl_entry["post"], True)
        self.assertEqual(acl_entry["comment"], True)
        self.assertEqual(acl_entry["read_wiki"], True)
        self.assertEqual(acl_entry["write_wiki"], False)
        self.assertEqual(acl_entry["read_files"], True)
        self.assertEqual(acl_entry["write_files"], False)

    def test_insert_admin(self):
        """
        expect: successfully insert admin rule (everything True) for the given space
        """

        acl_manager = ACL(self.db)
        acl_manager.space_acl.insert_admin(CURRENT_USER.username, self.space_id)

        # check if admin rule was inserted
        acl_entry = self.db.space_acl.find_one(
            {"username": CURRENT_USER.username, "space": self.space_id}
        )
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["username"], CURRENT_USER.username)
        self.assertEqual(acl_entry["space"], self.space_id)
        self.assertEqual(acl_entry["join_space"], True)
        self.assertEqual(acl_entry["read_timeline"], True)
        self.assertEqual(acl_entry["post"], True)
        self.assertEqual(acl_entry["comment"], True)
        self.assertEqual(acl_entry["read_wiki"], True)
        self.assertEqual(acl_entry["write_wiki"], True)
        self.assertEqual(acl_entry["read_files"], True)
        self.assertEqual(acl_entry["write_files"], True)

    def test_insert_default_discussion(self):
        """
        expect: successfully insert default rule (everything except write_wiki True) for given
        user and given discussion space name
        """

        acl_manager = ACL(self.db)
        acl_manager.space_acl.insert_default_discussion(
            CURRENT_USER.username, self.space_id
        )

        # check if default rule was inserted
        acl_entry = self.db.space_acl.find_one(
            {"username": CURRENT_USER.username, "space": self.space_id}
        )
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["username"], CURRENT_USER.username)
        self.assertEqual(acl_entry["space"], self.space_id)
        self.assertEqual(acl_entry["join_space"], True)
        self.assertEqual(acl_entry["read_timeline"], True)
        self.assertEqual(acl_entry["post"], True)
        self.assertEqual(acl_entry["comment"], True)
        self.assertEqual(acl_entry["read_wiki"], True)
        self.assertEqual(acl_entry["write_wiki"], False)
        self.assertEqual(acl_entry["read_files"], True)
        self.assertEqual(acl_entry["write_files"], True)

    def test_ask(self):
        """
        expect: successfully ask the acl for a given username/space and permission key
        """

        acl_manager = ACL(self.db)
        self.assertTrue(
            acl_manager.space_acl.ask(
                self.default_acl_entry["username"], self.space_id, "join_space"
            )
        )
        self.assertTrue(
            acl_manager.space_acl.ask(
                self.default_acl_entry["username"], self.space_id, "read_timeline"
            )
        )
        self.assertTrue(
            acl_manager.space_acl.ask(
                self.default_acl_entry["username"], self.space_id, "post"
            )
        )
        self.assertTrue(
            acl_manager.space_acl.ask(
                self.default_acl_entry["username"], self.space_id, "comment"
            )
        )
        self.assertTrue(
            acl_manager.space_acl.ask(
                self.default_acl_entry["username"], self.space_id, "read_wiki"
            )
        )
        self.assertTrue(
            acl_manager.space_acl.ask(
                self.default_acl_entry["username"], self.space_id, "write_wiki"
            )
        )
        self.assertTrue(
            acl_manager.space_acl.ask(
                self.default_acl_entry["username"], self.space_id, "read_files"
            )
        )
        self.assertTrue(
            acl_manager.space_acl.ask(
                self.default_acl_entry["username"], self.space_id, "write_files"
            )
        )

    def test_ask_error_key_doesnt_exist(self):
        """
        expect: KeyError is raised because the supplied permission key doesn't exist
        """

        acl_manager = ACL(self.db)
        self.assertRaises(
            KeyError,
            acl_manager.space_acl.ask,
            self.default_acl_entry["username"],
            self.space_id,
            "test",
        )

    def test_ask_error_role_doesnt_exist(self):
        """
        expect: ValueError is raised because the supplied username doesn't exist
        """

        acl_manager = ACL(self.db)
        self.assertRaises(
            ValueError,
            acl_manager.space_acl.ask,
            "non_existing_user",
            self.space_id,
            "join_space",
        )

    def test_get(self):
        """
        expect: successfully get acl entry for given username/space
        """

        acl_manager = ACL(self.db)
        acl_entry = acl_manager.space_acl.get(
            self.default_acl_entry["username"], self.space_id
        )
        self.assertEqual(acl_entry["username"], self.default_acl_entry["username"])
        self.assertEqual(acl_entry["space"], self.space_id)
        self.assertEqual(acl_entry["join_space"], True)
        self.assertEqual(acl_entry["read_timeline"], True)
        self.assertEqual(acl_entry["post"], True)
        self.assertEqual(acl_entry["comment"], True)
        self.assertEqual(acl_entry["read_wiki"], True)
        self.assertEqual(acl_entry["write_wiki"], True)
        self.assertEqual(acl_entry["read_files"], True)
        self.assertEqual(acl_entry["write_files"], True)

    def test_get_error_username_doesnt_exist(self):
        """
        expect: None is returned because the supplied username doesn't exist
        """

        acl_manager = ACL(self.db)
        acl_entry = acl_manager.space_acl.get("non_existing_user", self.space_id)
        self.assertIsNone(acl_entry)

    def test_get_all(self):
        """
        expect: successfully get all acl rules of a space
        """

        # add one more rule for another space
        another_space_id = ObjectId()
        test_rule = {
            "username": "another_user",
            "space": another_space_id,
            "join_space": False,
            "read_timeline": False,
            "post": False,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False,
        }
        self.db.space_acl.insert_one(test_rule.copy())

        acl_manager = ACL(self.db)
        acl_entries = acl_manager.space_acl.get_all(another_space_id)
        # default rule should not be in, because it is in another space
        self.assertEqual(len(acl_entries), 1)
        self.assertIn(test_rule, acl_entries)

    def test_get_full_list(self):
        """
        expect: successfully get all acl rules of all spaces
        """

        # add one more rule for another space
        test_rule = {
            "username": "another_user",
            "space": ObjectId(),
            "join_space": False,
            "read_timeline": False,
            "post": False,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False,
        }
        self.db.space_acl.insert_one(test_rule.copy())

        acl_manager = ACL(self.db)
        acl_entries = acl_manager.space_acl.get_full_list()
        self.assertEqual(len(acl_entries), 2)
        self.assertIn(self.default_acl_entry, acl_entries)
        self.assertIn(test_rule, acl_entries)

    def test_set(self):
        """
        expect: successfully set a single permission key value for a given username/space
        """

        acl_manager = ACL(self.db)
        acl_manager.space_acl.set(
            self.default_acl_entry["username"], self.space_id, "join_space", False
        )

        # check if value was set
        acl_entry = self.db.space_acl.find_one(
            {"username": self.default_acl_entry["username"], "space": self.space_id}
        )
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["username"], self.default_acl_entry["username"])
        self.assertEqual(acl_entry["space"], self.space_id)
        self.assertEqual(acl_entry["join_space"], False)
        self.assertEqual(acl_entry["read_timeline"], True)
        self.assertEqual(acl_entry["post"], True)
        self.assertEqual(acl_entry["comment"], True)
        self.assertEqual(acl_entry["read_wiki"], True)
        self.assertEqual(acl_entry["write_wiki"], True)
        self.assertEqual(acl_entry["read_files"], True)
        self.assertEqual(acl_entry["write_files"], True)

    def test_set_upsert(self):
        """
        expect: using set, successfully insert a new username with permission key value
        that didn't exist before
        """

        acl_manager = ACL(self.db)
        acl_manager.space_acl.set("another_user", self.space_id, "join_space", False)

        # check if value was set
        acl_entry = self.db.space_acl.find_one(
            {"username": "another_user", "space": self.space_id}
        )
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["username"], "another_user")
        self.assertEqual(acl_entry["space"], self.space_id)
        self.assertEqual(acl_entry["join_space"], False)

    def test_set_error_key_doesnt_exist(self):
        """
        expect: KeyError is raised because the supplied permission key doesn't exist
        """

        acl_manager = ACL(self.db)
        self.assertRaises(
            KeyError,
            acl_manager.space_acl.set,
            self.default_acl_entry["username"],
            self.space_id,
            "test",
            True,
        )

    def test_set_all(self):
        """
        expect: successfully set all permission keys with values for a given username/space
        """

        acl_manager = ACL(self.db)
        acl_manager.space_acl.set_all(
            {
                "username": self.default_acl_entry["username"],
                "space": self.space_id,
                "join_space": False,
                "read_timeline": False,
                "post": False,
                "comment": False,
                "read_wiki": False,
                "write_wiki": False,
                "read_files": False,
                "write_files": False,
            },
        )

        # check if values were set
        acl_entry = self.db.space_acl.find_one(
            {"username": self.default_acl_entry["username"], "space": self.space_id}
        )
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["username"], self.default_acl_entry["username"])
        self.assertEqual(acl_entry["space"], self.space_id)
        self.assertEqual(acl_entry["join_space"], False)
        self.assertEqual(acl_entry["read_timeline"], False)
        self.assertEqual(acl_entry["post"], False)
        self.assertEqual(acl_entry["comment"], False)
        self.assertEqual(acl_entry["read_wiki"], False)
        self.assertEqual(acl_entry["write_wiki"], False)
        self.assertEqual(acl_entry["read_files"], False)
        self.assertEqual(acl_entry["write_files"], False)

    def test_set_all_upsert(self):
        """
        expect: using set_all, successfully insert a new username/space with permission key values
        that didn't exist before
        """

        acl_manager = ACL(self.db)
        acl_manager.space_acl.set_all(
            {
                "username": "test",
                "space": self.space_id,
                "join_space": False,
                "read_timeline": False,
                "post": False,
                "comment": False,
                "read_wiki": False,
                "write_wiki": False,
                "read_files": False,
                "write_files": False,
            },
        )

        # check if values were set
        acl_entry = self.db.space_acl.find_one(
            {"username": "test", "space": self.space_id}
        )
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["username"], "test")
        self.assertEqual(acl_entry["space"], self.space_id)
        self.assertEqual(acl_entry["join_space"], False)
        self.assertEqual(acl_entry["read_timeline"], False)
        self.assertEqual(acl_entry["post"], False)
        self.assertEqual(acl_entry["comment"], False)
        self.assertEqual(acl_entry["read_wiki"], False)
        self.assertEqual(acl_entry["write_wiki"], False)
        self.assertEqual(acl_entry["read_files"], False)
        self.assertEqual(acl_entry["write_files"], False)

    def test_set_all_error_missing_username(self):
        """
        expect: KeyError is raised because "username" attribute is missing from the dict
        """

        acl_manager = ACL(self.db)
        self.assertRaises(
            KeyError,
            acl_manager.space_acl.set_all,
            {
                "space": self.space_id,
                "join_space": False,
                "read_timeline": False,
                "post": False,
                "comment": False,
                "read_wiki": False,
                "write_wiki": False,
                "read_files": False,
                "write_files": False,
            },
        )

    def test_set_all_error_missing_space(self):
        """
        expect: KeyError is raised because "space" attribute is missing from the dict
        """

        acl_manager = ACL(self.db)
        self.assertRaises(
            KeyError,
            acl_manager.space_acl.set_all,
            {
                "username": self.default_acl_entry["username"],
                "join_space": False,
                "read_timeline": False,
                "post": False,
                "comment": False,
                "read_wiki": False,
                "write_wiki": False,
                "read_files": False,
                "write_files": False,
            },
        )

    def test_set_all_error_wrong_key(self):
        """
        expect: KeyError is raised because atleast one of the supplied
        permission keys doesn't exist
        """

        acl_manager = ACL(self.db)
        self.assertRaises(
            KeyError,
            acl_manager.space_acl.set_all,
            {
                "username": self.default_acl_entry["username"],
                "space": self.space_id,
                "test": True,
            },
        )

    def test_delete(self):
        """
        expect: successfully delete acl entries either by role or by space
        """

        acl_manager = ACL(self.db)
        acl_manager.space_acl.delete(self.default_acl_entry["username"], self.space_id)

        # check if entry was deleted
        acl_entry = self.db.space_acl.find_one(
            {"username": self.default_acl_entry["username"], "space": self.space_id}
        )
        self.assertIsNone(acl_entry)


class ACLResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        # create default space:
        self.space_id = ObjectId()
        self.space_name = "test"
        self.default_space = {
            "_id": self.space_id,
            "name": self.space_name,
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }
        self.db.spaces.insert_one(self.default_space)

    def tearDown(self) -> None:
        super().tearDown()

        self.db.global_acl.delete_many({})
        self.db.space_acl.delete_many({})
        self.db.spaces.delete_many({})

    def test_ensure_acl_entries(self):
        """
        expect: successfully ensure that all acl entries exist for the given role,
        """

        acl_manager = ACL(self.db)
        acl_manager.ensure_acl_entries("guest")

        # check if the default global acl entry was created
        acl_entry = self.db.global_acl.find_one({"role": "guest"})
        self.assertIsNotNone(acl_entry)
        self.assertEqual(acl_entry["role"], "guest")
        self.assertEqual(acl_entry["create_space"], True)


class PostResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.post_id = ObjectId()
        self.comment_id = ObjectId()
        self.default_comment = {
            "_id": self.comment_id,
            "author": CURRENT_USER.username,
            "creation_date": datetime(2023, 1, 1, 9, 5, 0),
            "text": "test_comment",
            "pinned": False,
        }
        self.default_post = {
            "_id": self.post_id,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [self.default_comment],
            "likers": [],
        }
        self.db.posts.insert_one(self.default_post)

        # insert a default profiles
        self.db.profiles.insert_many(
            [
                {
                    "username": CURRENT_ADMIN.username,
                    "role": "admin",
                    "follows": [],
                    "bio": "",
                    "institution": "",
                    "profile_pic": "default_profile_pic.jpg",
                    "first_name": "",
                    "last_name": "",
                    "gender": "",
                    "address": "",
                    "birthday": "",
                    "experience": [""],
                    "expertise": "",
                    "languages": [],
                    "ve_ready": True,
                    "excluded_from_matching": False,
                    "ve_interests": [""],
                    "ve_goals": [""],
                    "preferred_formats": [""],
                    "research_tags": [],
                    "courses": [],
                    "educations": [],
                    "work_experience": [],
                    "ve_window": [],
                    "notification_settings": {
                        "messages": "email",
                        "ve_invite": "email",
                        "group_invite": "email",
                        "system": "email",
                    },
                    "achievements": {
                        "social": {"level": 0, "progress": 0, "next_level": 10},
                        "ve": {"level": 0, "progress": 0, "next_level": 10},
                        "tracking": {
                            "good_practice_plans": [],
                            "unique_partners": [],
                        },
                    },
                    "chosen_achievement": {"type": "", "level": 0},
                },
                {
                    "username": CURRENT_USER.username,
                    "role": "user",
                    "follows": [],
                    "bio": "",
                    "institution": "",
                    "profile_pic": "default_profile_pic.jpg",
                    "first_name": "",
                    "last_name": "",
                    "gender": "",
                    "address": "",
                    "birthday": "",
                    "experience": [""],
                    "expertise": "",
                    "languages": [],
                    "ve_ready": True,
                    "excluded_from_matching": False,
                    "ve_interests": [""],
                    "ve_goals": [""],
                    "preferred_formats": [""],
                    "research_tags": [],
                    "courses": [],
                    "educations": [],
                    "work_experience": [],
                    "ve_window": [],
                    "notification_settings": {
                        "messages": "email",
                        "ve_invite": "email",
                        "group_invite": "email",
                        "system": "email",
                    },
                    "achievements": {
                        "social": {"level": 0, "progress": 0, "next_level": 10},
                        "ve": {"level": 0, "progress": 0, "next_level": 10},
                        "tracking": {
                            "good_practice_plans": [],
                            "unique_partners": [],
                        },
                    },
                    "chosen_achievement": {"type": "", "level": 0},
                },
            ]
        )

    def tearDown(self) -> None:
        super().tearDown()

        self.db.posts.delete_many({})
        self.db.profiles.delete_many({})
        self.db.spaces.delete_many({})

        # delete all created files in gridfs
        fs = gridfs.GridFS(self.db)
        for fs_file in fs.find():
            fs.delete(fs_file._id)

    def test_get_post(self):
        """
        expect: successfully get post
        """

        post_manager = Posts(self.db)
        post = post_manager.get_post(self.post_id)
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.default_post["_id"])
        self.assertEqual(post["author"], self.default_post["author"])
        self.assertEqual(post["creation_date"], self.default_post["creation_date"])
        self.assertEqual(post["text"], self.default_post["text"])
        self.assertEqual(post["space"], self.default_post["space"])
        self.assertEqual(post["pinned"], self.default_post["pinned"])
        self.assertEqual(post["isRepost"], self.default_post["isRepost"])
        self.assertEqual(
            post["wordpress_post_id"], self.default_post["wordpress_post_id"]
        )
        self.assertEqual(post["tags"], self.default_post["tags"])
        self.assertEqual(post["plans"], self.default_post["plans"])
        self.assertEqual(post["files"], self.default_post["files"])
        self.assertEqual(post["comments"], self.default_post["comments"])
        self.assertEqual(post["likers"], self.default_post["likers"])

        # again with supplying _id as str
        post = post_manager.get_post(str(self.post_id))
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.default_post["_id"])
        self.assertEqual(post["author"], self.default_post["author"])
        self.assertEqual(post["creation_date"], self.default_post["creation_date"])
        self.assertEqual(post["text"], self.default_post["text"])
        self.assertEqual(post["space"], self.default_post["space"])
        self.assertEqual(post["pinned"], self.default_post["pinned"])
        self.assertEqual(post["isRepost"], self.default_post["isRepost"])
        self.assertEqual(
            post["wordpress_post_id"], self.default_post["wordpress_post_id"]
        )
        self.assertEqual(post["tags"], self.default_post["tags"])
        self.assertEqual(post["plans"], self.default_post["plans"])
        self.assertEqual(post["files"], self.default_post["files"])
        self.assertEqual(post["comments"], self.default_post["comments"])
        self.assertEqual(post["likers"], self.default_post["likers"])

        # again with projection to only get _id, text, tags and author
        post = post_manager.get_post(
            self.post_id, {"text": True, "tags": True, "author": True}
        )
        self.assertEqual(post["_id"], self.default_post["_id"])
        self.assertEqual(post["author"], self.default_post["author"])
        self.assertEqual(post["tags"], self.default_post["tags"])
        self.assertEqual(post["text"], self.default_post["text"])
        self.assertNotIn("creation_date", post)

    def test_get_post_by_comment_id(self):
        """
        expect: successfully get post by comment id
        """

        post_manager = Posts(self.db)
        post = post_manager.get_post_by_comment_id(self.comment_id)
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.default_post["_id"])
        self.assertEqual(post["author"], self.default_post["author"])
        self.assertEqual(post["creation_date"], self.default_post["creation_date"])
        self.assertEqual(post["text"], self.default_post["text"])
        self.assertEqual(post["space"], self.default_post["space"])
        self.assertEqual(post["pinned"], self.default_post["pinned"])
        self.assertEqual(post["isRepost"], self.default_post["isRepost"])
        self.assertEqual(
            post["wordpress_post_id"], self.default_post["wordpress_post_id"]
        )
        self.assertEqual(post["tags"], self.default_post["tags"])
        self.assertEqual(post["plans"], self.default_post["plans"])
        self.assertEqual(post["files"], self.default_post["files"])
        self.assertEqual(post["comments"], self.default_post["comments"])
        self.assertEqual(post["likers"], self.default_post["likers"])

    def test_get_posts_of_user(self):
        """
        expect: get all posts authored by a given user
        """

        post_manager = Posts(self.db)

        # insert another post by CURRENT_ADMIN and one more not
        other_post = {
            "_id": ObjectId(),
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "text": "another",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": [],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }
        other_post2 = {
            "_id": ObjectId(),
            "author": CURRENT_USER.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "text": "another",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": [],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }
        self.db.posts.insert_one(other_post)
        self.db.posts.insert_one(other_post2)

        posts = post_manager.get_posts_of_user(CURRENT_ADMIN.username)
        self.assertIsInstance(posts, list)
        self.assertEqual(len(posts), 2)
        self.assertTrue(any(p for p in posts if p["_id"] == self.post_id))
        self.assertTrue(any(p for p in posts if p["_id"] == other_post["_id"]))

    def test_get_posts_with_comments_of_user(self):
        """
        expect: get posts that contain comments authored by the given user
        """

        post_manager = Posts(self.db)

        # create a post with a comment authored by CURRENT_USER
        post_with_comment = {
            "_id": ObjectId(),
            "author": "someone",
            "creation_date": datetime(2023, 1, 3, 9, 0, 0),
            "text": "post with comment",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": [],
            "plans": [],
            "files": [],
            "comments": [
                {
                    "_id": ObjectId(),
                    "author": CURRENT_USER.username,
                    "creation_date": datetime(2023, 1, 3, 9, 5, 0),
                    "text": "c",
                    "pinned": False,
                }
            ],
            "likers": [],
        }
        self.db.posts.insert_one(post_with_comment)

        posts = post_manager.get_posts_with_comments_of_user(CURRENT_USER.username)
        self.assertIsInstance(posts, list)
        # expect the inserted post to be present
        self.assertTrue(any(p for p in posts if p["_id"] == post_with_comment["_id"]))

        # again with _id as str
        post = post_manager.get_post_by_comment_id(str(self.comment_id))
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.default_post["_id"])
        self.assertEqual(post["author"], self.default_post["author"])
        self.assertEqual(post["creation_date"], self.default_post["creation_date"])
        self.assertEqual(post["text"], self.default_post["text"])
        self.assertEqual(post["space"], self.default_post["space"])
        self.assertEqual(post["pinned"], self.default_post["pinned"])
        self.assertEqual(post["isRepost"], self.default_post["isRepost"])
        self.assertEqual(
            post["wordpress_post_id"], self.default_post["wordpress_post_id"]
        )
        self.assertEqual(post["tags"], self.default_post["tags"])
        self.assertEqual(post["plans"], self.default_post["plans"])
        self.assertEqual(post["files"], self.default_post["files"])
        self.assertEqual(post["comments"], self.default_post["comments"])
        self.assertEqual(post["likers"], self.default_post["likers"])

    def test_get_posts_by_tags(self):
        """
        expect: successfully get posts that have all of the supplied tags
        """

        # add more posts,
        additional_posts = [
            # this one should be included in the result
            {
                "_id": ObjectId(),
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                "text": "test",
                "space": None,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test", "test2"],
                "plans": [],
                "files": [],
                "comments": [],
                "likers": [],
            },
            # this one not
            {
                "_id": ObjectId(),
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                "text": "test",
                "space": None,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test2", "test3"],
                "plans": [],
                "files": [],
                "comments": [],
                "likers": [],
            },
        ]

        self.db.posts.insert_many(additional_posts)

        post_manamger = Posts(self.db)
        posts = post_manamger.get_posts_by_tags(["test"])
        self.assertEqual(len(posts), 2)
        _ids = [post["_id"] for post in posts]
        self.assertIn(self.default_post["_id"], _ids)
        self.assertIn(additional_posts[0]["_id"], _ids)

        # test again, searching for two tags
        posts = post_manamger.get_posts_by_tags(["test", "test2"])
        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0]["_id"], additional_posts[0]["_id"])

    def test_insert_post(self):
        """
        expect: successfully insert new post
        """

        new_post = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "new_test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }

        post_manager = Posts(self.db)
        post_id = post_manager.insert_post(new_post)

        # check if post was inserted
        post = self.db.posts.find_one({"_id": post_id})
        self.assertIsNotNone(post)
        self.assertEqual(post["author"], new_post["author"])
        self.assertEqual(post["creation_date"], new_post["creation_date"])
        self.assertEqual(post["text"], new_post["text"])
        self.assertEqual(post["space"], new_post["space"])
        self.assertEqual(post["pinned"], new_post["pinned"])
        self.assertEqual(post["isRepost"], new_post["isRepost"])
        self.assertEqual(post["wordpress_post_id"], new_post["wordpress_post_id"])
        self.assertEqual(post["tags"], new_post["tags"])
        self.assertEqual(post["plans"], new_post["plans"])
        self.assertEqual(post["files"], new_post["files"])
        self.assertEqual(post["comments"], new_post["comments"])
        self.assertEqual(post["likers"], new_post["likers"])

        # check if post counted towards "create_posts" achievement of user
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["create_posts"],
        )
        prev_achievement_progress_counter = profile["achievements"]["social"][
            "progress"
        ]

        # add one more post with empty text that should not count towards achievement
        new_post = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }
        post_id = post_manager.insert_post(new_post)

        # check if post was inserted, but not counted towards achievement
        self.assertIsNotNone(self.db.posts.find_one({"_id": post_id}))
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            prev_achievement_progress_counter,
        )

    def test_insert_post_error_missing_attributes(self):
        """
        expect: ValueError is raised because post dict is missing an attribute
        """

        # text is missing
        new_post = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }

        post_manager = Posts(self.db)
        self.assertRaises(ValueError, post_manager.insert_post, new_post)

    def test_insert_post_update_instead(self):
        """
        expect: since new post dict contains an _id, update the existing post instead,
        but only the text is updateable
        """

        new_post = {
            "_id": self.post_id,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "updated_test",
            "space": None,
            "pinned": True,  # change this too, expecting it to not be updated
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],  # change this too, expecting it to not be updated
            "likers": [],
        }

        post_manager = Posts(self.db)
        post_manager.insert_post(new_post)

        # check if post was updated
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.post_id)
        self.assertEqual(post["text"], new_post["text"])
        self.assertNotEqual(post["pinned"], new_post["pinned"])
        self.assertNotEqual(post["comments"], new_post["comments"])
        # rest is just pure sanity checks
        self.assertEqual(post["author"], new_post["author"])
        self.assertEqual(post["creation_date"], new_post["creation_date"])
        self.assertEqual(post["space"], new_post["space"])
        self.assertEqual(post["isRepost"], new_post["isRepost"])
        self.assertEqual(post["wordpress_post_id"], new_post["wordpress_post_id"])
        self.assertEqual(post["tags"], new_post["tags"])
        self.assertEqual(post["plans"], new_post["plans"])
        self.assertEqual(post["files"], new_post["files"])
        self.assertEqual(post["likers"], new_post["likers"])

        # since it was an update, the post should not count towards "social" achievement
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            0,
        )

    def test_insert_post_update_instead_error_missing_attribute(self):
        """
        expect: ValueError is raised because post dict that contains an _id and therefore
        triggers the post text update misses the text attribute
        """

        new_post = {
            "_id": self.post_id,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "space": None,
            "pinned": True,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }

        post_manager = Posts(self.db)
        self.assertRaises(ValueError, post_manager.insert_post, new_post)

    def test_update_post_text(self):
        """
        expect: successfully update post text
        """

        post_manager = Posts(self.db)
        post_manager.update_post_text(self.post_id, "updated_test")

        # check if post was updated
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.post_id)
        self.assertEqual(post["text"], "updated_test")

    def test_update_post_text_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because post doesn't exist
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.update_post_text, ObjectId(), "test"
        )

    def test_delete_post(self):
        """
        expect: successfully delete post
        """

        post_manager = Posts(self.db)
        post_manager.delete_post(self.post_id)

        # check if post was deleted
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNone(post)

    def test_delete_post_file(self):
        """
        expect: successfully delete post and corresponding files from gridfs
        """

        # first add new post with file
        fs = gridfs.GridFS(self.db)
        file_id = fs.put(b"test", filename="test.txt")
        new_post = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "new_test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [
                {
                    "file_id": file_id,
                    "file_name": "test.txt",
                    "author": CURRENT_ADMIN.username,
                }
            ],
            "comments": [],
            "likers": [],
        }
        self.db.posts.insert_one(new_post)

        post_manager = Posts(self.db)
        post_manager.delete_post(new_post["_id"])

        # check if post was deleted
        post = self.db.posts.find_one({"_id": new_post["_id"]})
        self.assertIsNone(post)

        # check if file was deleted
        self.assertIsNone(fs.find_one({"_id": file_id}))

    def test_delete_post_file_space(self):
        """
        expect: successfully delete post and corresponding files from gridfs and the space's
        repository
        """

        # first add new file
        fs = gridfs.GridFS(self.db)
        file_id = fs.put(b"test", filename="test.txt")

        # create a space
        space_id = ObjectId()
        space_name = "test"
        space = {
            "_id": space_id,
            "name": space_name,
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
        }
        self.db.spaces.insert_one(space)

        # create a post in the space
        post_id = ObjectId()

        # mirror the file into the space's file share as a post file
        SpaceFiles(self.db).add_post_file(
            space_id, CURRENT_ADMIN.username, file_id, "test.txt", post_id
        )
        post = {
            "_id": post_id,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "new_test",
            "space": space_id,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [
                {
                    "file_id": file_id,
                    "file_name": "test.txt",
                    "author": CURRENT_ADMIN.username,
                }
            ],
            "comments": [],
            "likers": [],
        }
        self.db.posts.insert_one(post)

        post_manager = Posts(self.db)
        post_manager.delete_post(post_id)

        # check if post was deleted
        post = self.db.posts.find_one({"_id": post_id})
        self.assertIsNone(post)

        # check if file was deleted
        self.assertIsNone(fs.find_one({"_id": file_id}))

        # check if file was deleted from space's file share
        self.assertIsNone(self.db.space_files.find_one({"file_id": file_id}))

        self.db.space_files.delete_many({})

    def test_delete_post_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because post doesn't exist
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.delete_post, ObjectId()
        )

    def test_delete_post_by_space(self):
        """
        expect: successfully delete all posts in the space
        """

        # add 2 more space posts, one of them with a file
        space_id = ObjectId()
        fs = gridfs.GridFS(self.db)
        file_id = util.gridfs_put(
            fs, b"test", "test.txt", "text/plain", CURRENT_ADMIN.username
        )
        additional_posts = [
            {
                "_id": ObjectId(),
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                "text": "test",
                "space": space_id,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test"],
                "plans": [],
                "files": [
                    {
                        "file_id": file_id,
                        "file_name": "test.txt",
                        "file_type": "text/plain",
                        "author": CURRENT_ADMIN.username,
                    }
                ],
                "comments": [],
                "likers": [],
            },
            {
                "_id": ObjectId(),
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                "text": "test",
                "space": space_id,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test"],
                "plans": [],
                "files": [],
                "comments": [],
                "likers": [],
            },
        ]
        self.db.posts.insert_many(additional_posts)

        post_manager = Posts(self.db)
        post_manager.delete_post_by_space(space_id)

        # check if posts were deleted, including their files
        posts = list(self.db.posts.find({"space": space_id}))
        self.assertEqual(len(posts), 0)
        self.assertFalse(fs.exists(file_id))

        # check that default post is still there
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)

    def test_like_post(self):
        """
        expect: successfully like post
        """

        post_manager = Posts(self.db)
        post_manager.like_post(self.post_id, CURRENT_ADMIN.username)

        # check if post was liked
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertIn(CURRENT_ADMIN.username, post["likers"])

        # check if "give_likes" counted towards "social" achievement of user
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["give_likes"],
        )
        prev_achievement_progress_counter = profile["achievements"]["social"][
            "progress"
        ]

        post_manager.like_post(self.post_id, CURRENT_USER.username)

        # now check if "posts_liked" counted towards "social" achievement
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            prev_achievement_progress_counter
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["posts_liked"],
        )

    def test_like_post_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.like_post, ObjectId(), "test"
        )

    def test_like_post_error_already_liker(self):
        """
        expect: AlreadyLikerException is raised because user has already liked this post
        """

        # manually set liker
        self.db.posts.update_one(
            {"_id": self.post_id}, {"$set": {"likers": [CURRENT_ADMIN.username]}}
        )

        post_manager = Posts(self.db)
        self.assertRaises(
            AlreadyLikerException,
            post_manager.like_post,
            self.post_id,
            CURRENT_ADMIN.username,
        )

    def test_unlike_post(self):
        """
        expect: successfully remove like from post
        """

        # manually set liker
        self.db.posts.update_one(
            {"_id": self.post_id}, {"$set": {"likers": [CURRENT_ADMIN.username]}}
        )

        post_manager = Posts(self.db)
        post_manager.unlike_post(self.post_id, CURRENT_ADMIN.username)

        # check if post was unliked
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertNotIn(CURRENT_ADMIN.username, post["likers"])

    def test_unlike_post_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.unlike_post, ObjectId(), "test"
        )

    def test_unlike_post_error_not_liker(self):
        """
        expect: NotLikerException is raised because the user has not previoulsy
        liked thist post
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            NotLikerException,
            post_manager.unlike_post,
            self.post_id,
            CURRENT_ADMIN.username,
        )

    def test_add_comment(self):
        """
        expect: successfully add comment to the post
        """

        comment = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 5, 0),
            "text": "new_comment",
            "pinned": False,
        }

        post_manager = Posts(self.db)
        comment_id = post_manager.add_comment(self.post_id, comment)

        # check if comment was added
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(len(post["comments"]), 2)
        comment_ids = [comment["_id"] for comment in post["comments"]]
        comment_text = [comment["text"] for comment in post["comments"]]
        self.assertIn(comment["text"], comment_text)
        self.assertIn(comment_id, comment_ids)

        # check if comment counted towards "social" achievement of user
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["create_comments"],
        )
        prev_achievement_progress_counter = profile["achievements"]["social"][
            "progress"
        ]

        # try another comment with empty text that should not count towards achievement
        comment = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 5, 0),
            "text": "",
            "pinned": False,
        }

        post_manager.add_comment(self.post_id, comment)

        # check if comment was added, but not counted towards achievement
        self.assertIsNotNone(self.db.posts.find_one({"_id": self.post_id}))
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            prev_achievement_progress_counter,
        )

    def test_add_comment_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        comment = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 5, 0),
            "text": "new_comment",
            "pinned": False,
        }

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.add_comment, ObjectId(), comment
        )

        # since the post didnt exist, the comment should also not count towards
        # "social" achievement
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"]["progress"],
            0,
        )

    def test_add_comment_error_missing_attributes(self):
        """
        expect: ValueError is raised because comment dict is missing an attribute
        """

        # text is missing
        comment = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 5, 0),
            "pinned": False,
        }

        post_manager = Posts(self.db)
        self.assertRaises(ValueError, post_manager.add_comment, self.post_id, comment)

    def test_delete_comment(self):
        """
        expect: successfully delete a comment
        """

        post_manager = Posts(self.db)
        post_manager.delete_comment(self.comment_id, self.post_id)

        # check if comment was deleted
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(len(post["comments"]), 0)

    def test_delete_comment_no_post_id(self):
        """
        expect: successfully delete a comment without supplying the corresponding
        post id
        """

        post_manager = Posts(self.db)
        post_manager.delete_comment(self.comment_id)

        # check if comment was deleted
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(len(post["comments"]), 0)

    def test_delet_comment_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException,
            post_manager.delete_comment,
            self.comment_id,
            ObjectId(),
        )

        self.assertRaises(
            PostNotExistingException, post_manager.delete_comment, ObjectId()
        )

    def test_insert_repost(self):
        """
        expect: successuflly insert new repost
        """

        repost = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "text": "test",
            "space": ObjectId(),
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": True,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
            "repostText": "test_repost",
        }

        post_manager = Posts(self.db)
        repost_id = post_manager.insert_repost(repost)

        # check if repost was added
        post = self.db.posts.find_one({"_id": repost_id})
        self.assertIsNotNone(post)
        self.assertEqual(post["author"], repost["author"])
        self.assertEqual(post["creation_date"], repost["creation_date"])
        self.assertEqual(post["text"], repost["text"])
        self.assertEqual(post["space"], repost["space"])
        self.assertEqual(post["pinned"], repost["pinned"])
        self.assertEqual(post["wordpress_post_id"], repost["wordpress_post_id"])
        self.assertEqual(post["tags"], repost["tags"])
        self.assertEqual(post["plans"], repost["plans"])
        self.assertEqual(post["files"], repost["files"])
        self.assertEqual(post["comments"], repost["comments"])
        self.assertEqual(post["likers"], repost["likers"])
        self.assertEqual(post["isRepost"], repost["isRepost"])
        self.assertEqual(post["repostAuthor"], repost["repostAuthor"])
        self.assertEqual(post["originalCreationDate"], repost["originalCreationDate"])
        self.assertEqual(post["repostText"], repost["repostText"])

    def test_insert_repost_update_instead(self):
        """
        expect: since new repost dict contains an _id, update the existing repost instead
        """

        # insert a repost into the db
        space_id = ObjectId()
        repost = {
            "_id": ObjectId(),
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "text": "test",
            "space": space_id,
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": True,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
            "repostText": "test_repost",
        }
        self.db.posts.insert_one(repost)

        repost = {
            "_id": repost["_id"],
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(
                2023, 1, 3, 9, 0, 0
            ),  # changed, but shouldnt be updated
            "text": "test",
            "space": space_id,
            "pinned": True,  # changed, but shouldnt be updated
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": True,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
            "repostText": "updated_test_repost",
        }
        post_manager = Posts(self.db)
        returned_repost_id = post_manager.insert_repost(repost)

        self.assertEqual(returned_repost_id, repost["_id"])

        # check if repost was updated, but only the repostText is updateable
        post = self.db.posts.find_one({"_id": repost["_id"]})
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], repost["_id"])
        self.assertEqual(post["author"], repost["author"])
        self.assertNotEqual(post["creation_date"], repost["creation_date"])
        self.assertEqual(post["text"], repost["text"])
        self.assertEqual(post["space"], repost["space"])
        self.assertNotEqual(post["pinned"], repost["pinned"])
        self.assertEqual(post["wordpress_post_id"], repost["wordpress_post_id"])
        self.assertEqual(post["tags"], repost["tags"])
        self.assertEqual(post["plans"], repost["plans"])
        self.assertEqual(post["files"], repost["files"])
        self.assertEqual(post["comments"], repost["comments"])
        self.assertEqual(post["likers"], repost["likers"])
        self.assertEqual(post["isRepost"], repost["isRepost"])
        self.assertEqual(post["repostAuthor"], repost["repostAuthor"])
        self.assertEqual(post["originalCreationDate"], repost["originalCreationDate"])
        self.assertEqual(post["repostText"], repost["repostText"])

    def test_insert_repost_error_missing_attributes(self):
        """
        expect: ValueError is raised because repost dict is missing an attribute
        """

        # first, a normal post attribute is missing: text
        repost = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "space": ObjectId(),
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": False,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
            "repostText": "test_repost",
        }

        post_manager = Posts(self.db)
        self.assertRaises(ValueError, post_manager.insert_repost, repost)

        # now, a repost attribute is missing: repostText
        repost = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "text": "test",
            "space": ObjectId(),
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": False,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
        }

        post_manager = Posts(self.db)
        self.assertRaises(ValueError, post_manager.insert_repost, repost)

    def test_update_repost_text(self):
        """
        expect: successfully update repost text
        """

        # insert a repost into the db
        repost = {
            "_id": ObjectId(),
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "text": "test",
            "space": ObjectId(),
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": True,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
            "repostText": "test_repost",
        }
        self.db.posts.insert_one(repost)

        post_manager = Posts(self.db)
        post_manager.update_repost_text(repost["_id"], "updated_test_repost")

        # check if repost was updated
        post = self.db.posts.find_one({"_id": repost["_id"]})
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], repost["_id"])
        self.assertEqual(post["repostText"], "updated_test_repost")

    def test_update_repost_text_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException,
            post_manager.update_repost_text,
            ObjectId(),
            "test",
        )

    def test_pin_post(self):
        """
        expect: successfully set pinned attribute of post to True
        """

        post_manager = Posts(self.db)
        post_manager.pin_post(self.post_id)

        # check if post was pinned
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertTrue(post["pinned"])

    def test_pin_post_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(PostNotExistingException, post_manager.pin_post, ObjectId())

    def test_unpin_post(self):
        """
        expect: successfully set pinned attribute of post to False
        """

        # manually set pinned to True
        self.db.posts.update_one({"_id": self.post_id}, {"$set": {"pinned": True}})

        post_manager = Posts(self.db)
        post_manager.unpin_post(self.post_id)

        # check if post was unpinned
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertFalse(post["pinned"])

    def test_unpin_post_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(PostNotExistingException, post_manager.unpin_post, ObjectId())

    def test_pin_comment(self):
        """
        expect: successfully set pinned attribute of comment to True
        """

        post_manager = Posts(self.db)
        post_manager.pin_comment(self.comment_id)

        # check if comment was pinned
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertTrue(post["comments"][0]["pinned"])

    def test_pin_comment_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.pin_comment, ObjectId()
        )

    def test_unpin_comment(self):
        """
        expect: successfully set pinned attribute of comment to False
        """

        # manually set pinned to True
        self.db.posts.update_one(
            {"_id": self.post_id}, {"$set": {"comments.0.pinned": True}}
        )

        post_manager = Posts(self.db)
        post_manager.unpin_comment(self.comment_id)

        # check if comment was unpinned
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertFalse(post["comments"][0]["pinned"])

    def test_unpin_comment_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.unpin_comment, ObjectId()
        )

    def test_add_new_post_file(self):
        """
        expect: successfully store new file in gridfs
        """

        post_manager = Posts(self.db)
        file_id = post_manager.add_new_post_file(
            "test.txt", b"test", "text/plain", CURRENT_ADMIN.username
        )

        # check if file was stored in gridfs
        fs = gridfs.GridFS(self.db)
        self.assertIsNotNone(fs.find_one({"_id": file_id}))

    def test_get_full_timeline(self):
        """
        expect: successfully get all posts within the time frame
        """

        # add 5 posts with creation date now
        for i in range(5):
            post = {
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(timezone.utc),
                "text": "test",
                "space": None,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test"],
                "plans": [],
                "files": [],
                "comments": [],
                "likers": [],
            }
            self.db.posts.insert_one(post)

        # add one more post outside of the time frame (lies in the future just for the test)
        post = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime.now(timezone.utc) + timedelta(days=1),
            "text": "test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
        }
        self.db.posts.insert_one(post)

        post_manager = Posts(self.db)
        # this should include the 5 posts and the default one , but not the
        # future one
        posts = post_manager.get_full_timeline(datetime.now(timezone.utc), 10)
        self.assertEqual(len(posts), 6)

    def test_get_space_timeline(self):
        """
        expect: successfully get all posts within the time frame and in a space
        """

        # add 5 posts, 3 of them in the space
        space_id = ObjectId()
        for i in range(5):
            post = {
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(timezone.utc),
                "text": "test",
                "space": None,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test"],
                "plans": [],
                "files": [],
                "comments": [],
                "likers": [],
            }
            if i % 2 == 0:
                post["space"] = space_id
            self.db.posts.insert_one(post)

        # add one more space post outside of the time frame (lies in the future to check)
        # that is pinned
        post = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime.now(timezone.utc) + timedelta(days=1),
            "text": "test",
            "space": space_id,
            "pinned": True,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }
        self.db.posts.insert_one(post)

        post_manager = Posts(self.db)

        # this should include only the 3 posts in the space
        # and the pinned post should be in the pinned_posts list
        timeline_posts, pinned_posts = post_manager.get_space_timeline(
            space_id, datetime.now(timezone.utc), 10
        )
        self.assertEqual(len(timeline_posts), 3)
        self.assertEqual(len(pinned_posts), 1)

    def test_get_user_timeline(self):
        """
        expect: successfully get all posts within the time frame and of a user
        """

        # add 5 posts, 3 of them by the user
        for i in range(5):
            post = {
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(timezone.utc),
                "text": "test",
                "space": None,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test"],
                "plans": [],
                "files": [],
                "comments": [],
                "likers": [],
            }
            if i % 2 == 0:
                post["author"] = CURRENT_USER.username
            self.db.posts.insert_one(post)

        post_manager = Posts(self.db)
        # this should include only the 3 posts by the user
        posts = post_manager.get_user_timeline(
            CURRENT_USER.username, datetime.now(timezone.utc), 10
        )
        self.assertEqual(len(posts), 3)

    def test_get_personal_timeline(self):
        """
        expect: successfully get all posts that are in the time frame and match the criteria (OR match):
        - from people that the user follows,
        - in spaces that the user is a member of
        - the users own posts
        """

        # follow CURRENT_USER.username
        self.db.profiles.update_one(
            {"username": CURRENT_ADMIN.username},
            {"$push": {"follows": CURRENT_USER.username}},
        )

        # add one post of CURRENT_USER.username and one of a different username
        post1 = {
            "_id": ObjectId(),
            "author": CURRENT_USER.username,
            "creation_date": datetime.now(timezone.utc),
            "text": "test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }
        post2 = {
            "_id": ObjectId(),
            "author": "non_following_user",
            "creation_date": datetime.now(timezone.utc),
            "text": "test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }

        # create space test_space
        space_id = ObjectId()
        space = {
            "_id": space_id,
            "name": "test_space",
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }
        self.db.spaces.insert_one(space)

        # add one post in a space that CURRENT_USER.username is a member of and one in a space that
        # he is not a member of
        post3 = {
            "_id": ObjectId(),
            "author": "doesnt_matter",
            "creation_date": datetime.now(timezone.utc),
            "text": "test",
            "space": space_id,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }
        post4 = {
            "_id": ObjectId(),
            "author": "doesnt_matter",
            "creation_date": datetime.now(timezone.utc),
            "text": "test",
            "space": ObjectId(),
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }

        # add one post by the user himself
        post5 = {
            "_id": ObjectId(),
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime.now(timezone.utc),
            "text": "test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }

        # add one post that is out of the time frame (lies in the future to check
        # the time frame constraint, because backwards it would include up to <limit> posts)
        post6 = {
            "_id": ObjectId(),
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime.now(timezone.utc) + timedelta(days=1),
            "text": "test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }

        self.db.posts.insert_many([post1, post2, post3, post4, post5, post6])

        post_manager = Posts(self.db)
        # this should include post1 because it is from a user that the user follows,
        # post3 because it is from a space that the user is a member of,
        # and post5 and the default post because it is the users own post
        # but not the default post because it is out of time frame
        posts = post_manager.get_personal_timeline(
            CURRENT_ADMIN.username, datetime.now(timezone.utc)
        )
        self.assertEqual(len(posts), 4)
        post_ids = [post["_id"] for post in posts]
        self.assertIn(post1["_id"], post_ids)
        self.assertIn(post3["_id"], post_ids)
        self.assertIn(post5["_id"], post_ids)
        self.assertIn(self.post_id, post_ids)

    def test_check_new_posts_since_timestamp(self):
        """
        expect: successfully query for new posts within a timeframe
        """

        post_manager = Posts(self.db)
        # this timeframe should return True (default post after that)
        self.assertTrue(
            post_manager.check_new_posts_since_timestamp(datetime(2022, 12, 31))
        )
        # this timeframe should return False (default post before that)
        self.assertFalse(
            post_manager.check_new_posts_since_timestamp(datetime(2023, 1, 2))
        )

    def test_update_post_plans(self):
        """
        expect: successfully change the attached plans of a post
        """

        plan_ids = [ObjectId(), ObjectId(), ObjectId()]

        post_manager = Posts(self.db)
        post_manager.update_post_plans(self.post_id, plan_ids)

        # check if plans were updated
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(post["plans"], plan_ids)

    def test_update_post_plans_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.update_post_plans, ObjectId(), []
        )

    def test_update_post_files(self):
        """
        expect: successfully change the attached files of a post
        """

        new_files = [
            {
                "file_id": ObjectId(),
                "file_name": "test.txt",
                "file_type": "text/plain",
                "author": CURRENT_ADMIN.username,
            },
            {
                "file_id": ObjectId(),
                "file_name": "test2.txt",
                "file_type": "text/plain",
                "author": CURRENT_ADMIN.username,
            },
        ]

        post_manager = Posts(self.db)
        post_manager.update_post_files(self.post_id, new_files)

        # check if files were updated
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(post["files"], new_files)

    def test_update_post_files_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.update_post_files, ObjectId(), []
        )


class ProfileResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.profile_id = ObjectId()
        self.default_profile = self.create_profile(
            CURRENT_ADMIN.username, self.profile_id
        )
        self.default_profile["follows"] = [CURRENT_USER.username]
        self.db.profiles.insert_one(self.default_profile)

        self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS = Profiles(
            self.db
        ).SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS
        self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS = Profiles(
            self.db
        ).VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS

    def tearDown(self) -> None:
        super().tearDown()

        self.db.profiles.delete_many({})
        self.db.global_acl.delete_many({})
        self.db.space_acl.delete_many({})

        # delete all created files in gridfs
        fs = gridfs.GridFS(self.db)
        for fs_file in fs.find():
            fs.delete(fs_file._id)

    @classmethod
    def tearDownClass(cls) -> None:
        super().tearDownClass()

        # clear out elastisearch index, only once after all tests
        # because otherwise there would be too many http requests
        response = requests.delete(
            "{}/test".format(global_vars.elasticsearch_base_url),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        if response.status_code != 200:
            print(response.content)

    def create_profile(self, username: str, user_id: ObjectId) -> dict:
        institution_id = ObjectId()
        return {
            "_id": user_id,
            "username": username,
            "role": "guest",
            "follows": [],
            "bio": "test",
            "institutions": [
                {
                    "_id": institution_id,
                    "name": "test",
                    "department": "test",
                    "school_type": "test",
                    "country": "test",
                }
            ],
            "chosen_institution_id": institution_id,
            "profile_pic": "default_profile_pic.jpg",
            "first_name": "Test",
            "last_name": "Admin",
            "gender": "male",
            "address": "test",
            "birthday": "2023-01-01",
            "experience": ["test", "test"],
            "expertise": "test",
            "languages": ["german", "english"],
            "ve_ready": True,
            "excluded_from_matching": False,
            "ve_interests": ["test", "test"],
            "ve_contents": ["test", "test"],
            "ve_goals": ["test", "test"],
            "interdisciplinary_exchange": True,
            "preferred_format": "test",
            "research_tags": ["test"],
            "courses": [
                {"title": "test", "academic_course": "test", "semester": "test"}
            ],
            "lms": ["test"],
            "tools": ["test"],
            "educations": [
                {
                    "institution": "test",
                    "degree": "test",
                    "department": "test",
                    "timestamp_from": "2023-01-01",
                    "timestamp_to": "2023-02-01",
                    "additional_info": "test",
                }
            ],
            "work_experience": [
                {
                    "position": "test",
                    "institution": "test",
                    "department": "test",
                    "timestamp_from": "2023-01-01",
                    "timestamp_to": "2023-02-01",
                    "city": "test",
                    "country": "test",
                    "additional_info": "test",
                }
            ],
            "ve_window": [
                {
                    "plan_id": ObjectId(),
                    "title": "test",
                    "description": "test",
                }
            ],
            "notification_settings": {
                "messages": "push",
                "ve_invite": "push",
                "group_invite": "push",
                "system": "push",
            },
            "achievements": {
                "social": {"level": 0, "progress": 0, "next_level": 20},
                "ve": {"level": 0, "progress": 0, "next_level": 40},
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
            "chosen_achievement": {"type": "", "level": 0},
        }

    def test_get_profile(self):
        """
        expect: successfully request profile
        """

        profile_manager = Profiles(self.db)
        profile = profile_manager.get_profile(CURRENT_ADMIN.username)
        self.assertIsNotNone(profile)
        self.assertEqual(profile["username"], self.default_profile["username"])
        self.assertEqual(profile["role"], self.default_profile["role"])
        self.assertEqual(profile["follows"], self.default_profile["follows"])
        self.assertEqual(profile["bio"], self.default_profile["bio"])
        self.assertEqual(profile["institutions"], self.default_profile["institutions"])
        self.assertEqual(
            profile["chosen_institution_id"],
            self.default_profile["chosen_institution_id"],
        )
        self.assertEqual(profile["profile_pic"], self.default_profile["profile_pic"])
        self.assertEqual(profile["first_name"], self.default_profile["first_name"])
        self.assertEqual(profile["last_name"], self.default_profile["last_name"])
        self.assertEqual(profile["gender"], self.default_profile["gender"])
        self.assertEqual(profile["address"], self.default_profile["address"])
        self.assertEqual(profile["birthday"], self.default_profile["birthday"])
        self.assertEqual(profile["experience"], self.default_profile["experience"])
        self.assertEqual(profile["expertise"], self.default_profile["expertise"])
        self.assertEqual(profile["languages"], self.default_profile["languages"])
        self.assertEqual(profile["ve_ready"], self.default_profile["ve_ready"])
        self.assertEqual(
            profile["excluded_from_matching"],
            self.default_profile["excluded_from_matching"],
        )
        self.assertEqual(profile["ve_interests"], self.default_profile["ve_interests"])
        self.assertEqual(profile["ve_contents"], self.default_profile["ve_contents"])
        self.assertEqual(profile["ve_goals"], self.default_profile["ve_goals"])
        self.assertEqual(
            profile["interdisciplinary_exchange"],
            self.default_profile["interdisciplinary_exchange"],
        )
        self.assertEqual(
            profile["preferred_format"], self.default_profile["preferred_format"]
        )
        self.assertEqual(
            profile["research_tags"], self.default_profile["research_tags"]
        )
        self.assertEqual(profile["courses"], self.default_profile["courses"])
        self.assertEqual(profile["lms"], self.default_profile["lms"])
        self.assertEqual(profile["tools"], self.default_profile["tools"])
        self.assertEqual(profile["educations"], self.default_profile["educations"])
        self.assertEqual(
            profile["work_experience"], self.default_profile["work_experience"]
        )
        self.assertEqual(profile["ve_window"], self.default_profile["ve_window"])
        self.assertEqual(
            profile["notification_settings"],
            self.default_profile["notification_settings"],
        )
        self.assertNotIn("tracking", profile["achievements"])
        del self.default_profile["achievements"]["tracking"]
        self.assertEqual(profile["achievements"], self.default_profile["achievements"])
        self.assertEqual(
            profile["chosen_achievement"], self.default_profile["chosen_achievement"]
        )

        # test again, but specify a projection of only first_name, last_name and expertise
        profile = profile_manager.get_profile(
            CURRENT_ADMIN.username,
            projection={"first_name": True, "last_name": True, "expertise": True},
        )
        self.assertIsNotNone(profile)
        self.assertIn("first_name", profile)
        self.assertIn("last_name", profile)
        self.assertIn("expertise", profile)
        self.assertNotIn("username", profile)
        self.assertNotIn("role", profile)
        self.assertNotIn("follows", profile)
        self.assertNotIn("bio", profile)
        self.assertNotIn("institutions", profile)
        self.assertNotIn("chosen_institution_id", profile)
        self.assertNotIn("profile_pic", profile)
        self.assertNotIn("gender", profile)
        self.assertNotIn("address", profile)
        self.assertNotIn("birthday", profile)
        self.assertNotIn("experience", profile)
        self.assertNotIn("languages", profile)
        self.assertNotIn("ve_ready", profile)
        self.assertNotIn("excluded_from_matching", profile)
        self.assertNotIn("ve_interests", profile)
        self.assertNotIn("ve_contents", profile)
        self.assertNotIn("ve_goals", profile)
        self.assertNotIn("interdisciplinary_exchange", profile)
        self.assertNotIn("preferred_format", profile)
        self.assertNotIn("research_tags", profile)
        self.assertNotIn("courses", profile)
        self.assertNotIn("lms", profile)
        self.assertNotIn("tools", profile)
        self.assertNotIn("educations", profile)
        self.assertNotIn("work_experience", profile)
        self.assertNotIn("ve_window", profile)
        self.assertNotIn("notification_settings", profile)
        self.assertNotIn("achievements", profile)
        self.assertNotIn("chosen_achievement", profile)
        self.assertEqual(profile["first_name"], self.default_profile["first_name"])
        self.assertEqual(profile["last_name"], self.default_profile["last_name"])
        self.assertEqual(profile["expertise"], self.default_profile["expertise"])

    def test_get_profile_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException, profile_manager.get_profile, "non_existing"
        )

    def test_get_all_profiles(self):
        """
        expect: successfully request all profiles
        """

        # add 2 more profiles
        profile1 = self.create_profile("test1", ObjectId())
        profile2 = self.create_profile("test2", ObjectId())
        self.db.profiles.insert_many([profile1, profile2])

        # remove achievement tracking information from the profiles, because it
        # should not be included in the response (easier check for equality)
        del self.default_profile["achievements"]["tracking"]
        del profile1["achievements"]["tracking"]
        del profile2["achievements"]["tracking"]

        profile_manager = Profiles(self.db)
        profiles = profile_manager.get_all_profiles()
        self.assertEqual(len(profiles), 3)
        self.assertIn(self.default_profile, profiles)
        self.assertIn(profile1, profiles)
        self.assertIn(profile2, profiles)

    def test_get_bulk_profiles(self):
        """
        expect: successfully request some profiles
        """

        # add 2 more profiles
        profile1 = self.create_profile("test1", ObjectId())
        profile2 = self.create_profile("test2", ObjectId())
        self.db.profiles.insert_many([profile1, profile2])

        # remove achievement tracking information from the profiles, because it
        # should not be included in the response (easier check for equality)
        del self.default_profile["achievements"]["tracking"]
        del profile1["achievements"]["tracking"]
        del profile2["achievements"]["tracking"]

        # request profiles of CURRENT_ADMIN.username and test1
        profile_manager = Profiles(self.db)
        profiles = profile_manager.get_bulk_profiles([CURRENT_ADMIN.username, "test1"])
        self.assertEqual(len(profiles), 2)
        self.assertIn(self.default_profile, profiles)
        self.assertIn(profile1, profiles)
        self.assertNotIn(profile2, profiles)

        # request profiles where one of them doesnt exist, so it should be skipped
        profiles = profile_manager.get_bulk_profiles(
            [CURRENT_ADMIN.username, "test1", "non_existing"]
        )
        self.assertEqual(len(profiles), 2)
        self.assertIn(self.default_profile, profiles)
        self.assertIn(profile1, profiles)
        self.assertNotIn(profile2, profiles)

    def test_insert_default_profile(self):
        """
        expect: successfully create a default profile
        """

        profile_manager = Profiles(self.db)
        result = profile_manager.insert_default_profile(
            CURRENT_USER.username, "Test", "User", "test"
        )

        # check if profile was created
        profile = self.db.profiles.find_one({"_id": result["_id"]})
        self.assertIsNotNone(profile)
        self.assertEqual(profile["username"], CURRENT_USER.username)
        self.assertEqual(profile["role"], "guest")
        self.assertEqual(profile["follows"], [])
        self.assertEqual(profile["bio"], "")
        self.assertEqual(profile["institutions"], [])
        self.assertEqual(profile["chosen_institution_id"], "")
        self.assertEqual(profile["profile_pic"], "default_profile_pic.jpg")
        self.assertEqual(profile["first_name"], "Test")
        self.assertEqual(profile["last_name"], "User")
        self.assertEqual(profile["gender"], "")
        self.assertEqual(profile["address"], "")
        self.assertEqual(profile["birthday"], "")
        self.assertEqual(profile["experience"], [""])
        self.assertEqual(profile["expertise"], "")
        self.assertEqual(profile["languages"], [])
        self.assertEqual(profile["ve_ready"], True)
        self.assertEqual(profile["excluded_from_matching"], False)
        self.assertEqual(profile["ve_interests"], [""])
        self.assertEqual(profile["ve_contents"], [""])
        self.assertEqual(profile["ve_goals"], [""])
        self.assertEqual(profile["interdisciplinary_exchange"], True)
        self.assertEqual(profile["preferred_format"], "")
        self.assertEqual(profile["research_tags"], [])
        self.assertEqual(profile["courses"], [])
        self.assertEqual(profile["lms"], [])
        self.assertEqual(profile["tools"], [])
        self.assertEqual(profile["educations"], [])
        self.assertEqual(profile["work_experience"], [])
        self.assertEqual(profile["ve_window"], [])
        self.assertEqual(
            profile["notification_settings"],
            {
                "messages": "email",
                "ve_invite": "email",
                "group_invite": "email",
                "system": "email",
            },
        )
        self.assertEqual(
            profile["achievements"],
            {
                "social": {"level": 0, "progress": 0, "next_level": 20},
                "ve": {"level": 0, "progress": 0, "next_level": 40},
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
        )
        self.assertEqual(profile["chosen_achievement"], None)

        # check that the profile was also replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", result["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)

    def test_insert_default_admin_profile(self):
        """
        expect: successfully create profile that has role "admin"
        """

        profile_manager = Profiles(self.db)
        result = profile_manager.insert_default_admin_profile(
            "test_admin2", "Test", "Admin2", "test"
        )

        # check if profile was created
        profile = self.db.profiles.find_one({"_id": result["_id"]})
        self.assertIsNotNone(profile)
        self.assertEqual(profile["username"], "test_admin2")
        self.assertEqual(profile["role"], "admin")
        self.assertEqual(profile["follows"], [])
        self.assertEqual(profile["bio"], "")
        self.assertEqual(profile["institutions"], [])
        self.assertEqual(profile["chosen_institution_id"], "")
        self.assertEqual(profile["profile_pic"], "default_profile_pic.jpg")
        self.assertEqual(profile["first_name"], "Test")
        self.assertEqual(profile["last_name"], "Admin2")
        self.assertEqual(profile["gender"], "")
        self.assertEqual(profile["address"], "")
        self.assertEqual(profile["birthday"], "")
        self.assertEqual(profile["experience"], [""])
        self.assertEqual(profile["expertise"], "")
        self.assertEqual(profile["languages"], [])
        self.assertEqual(profile["ve_ready"], True)
        self.assertEqual(profile["excluded_from_matching"], False)
        self.assertEqual(profile["ve_interests"], [""])
        self.assertEqual(profile["ve_contents"], [""])
        self.assertEqual(profile["ve_goals"], [""])
        self.assertEqual(profile["interdisciplinary_exchange"], True)
        self.assertEqual(profile["preferred_format"], "")
        self.assertEqual(profile["research_tags"], [])
        self.assertEqual(profile["courses"], [])
        self.assertEqual(profile["lms"], [])
        self.assertEqual(profile["tools"], [])
        self.assertEqual(profile["educations"], [])
        self.assertEqual(profile["work_experience"], [])
        self.assertEqual(profile["ve_window"], [])
        self.assertEqual(
            profile["notification_settings"],
            {
                "messages": "email",
                "ve_invite": "email",
                "group_invite": "email",
                "system": "email",
            },
        )
        self.assertEqual(
            profile["achievements"],
            {
                "social": {"level": 0, "progress": 0, "next_level": 20},
                "ve": {"level": 0, "progress": 0, "next_level": 40},
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
        )
        self.assertEqual(profile["chosen_achievement"], None)

        # check that the profile was also replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", result["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)

    def test_ensure_profile_exists(self):
        """
        expect: successfully create a default profile if it doesnt exist
        """

        # test with already existing profile
        profile_manager = Profiles(self.db)
        result = profile_manager.ensure_profile_exists(CURRENT_ADMIN.username)
        self.assertEqual(result["_id"], self.default_profile["_id"])

        # test with non existing username
        result = profile_manager.ensure_profile_exists("non_existing_user")
        self.assertIsNotNone(result)
        self.assertEqual(result["username"], "non_existing_user")
        self.assertEqual(result["role"], "guest")
        self.assertEqual(result["follows"], [])
        self.assertEqual(result["bio"], "")
        self.assertEqual(result["institutions"], [])
        self.assertEqual(result["chosen_institution_id"], "")
        self.assertEqual(result["profile_pic"], "default_profile_pic.jpg")
        self.assertEqual(result["first_name"], "")
        self.assertEqual(result["last_name"], "")
        self.assertEqual(result["gender"], "")
        self.assertEqual(result["address"], "")
        self.assertEqual(result["birthday"], "")
        self.assertEqual(result["experience"], [""])
        self.assertEqual(result["expertise"], "")
        self.assertEqual(result["languages"], [])
        self.assertEqual(result["ve_ready"], True)
        self.assertEqual(result["excluded_from_matching"], False)
        self.assertEqual(result["ve_interests"], [""])
        self.assertEqual(result["ve_contents"], [""])
        self.assertEqual(result["ve_goals"], [""])
        self.assertEqual(result["interdisciplinary_exchange"], True)
        self.assertEqual(result["preferred_format"], "")
        self.assertEqual(result["research_tags"], [])
        self.assertEqual(result["courses"], [])
        self.assertEqual(result["lms"], [])
        self.assertEqual(result["tools"], [])
        self.assertEqual(result["educations"], [])
        self.assertEqual(result["work_experience"], [])
        self.assertEqual(result["ve_window"], [])
        self.assertEqual(
            result["notification_settings"],
            {
                "messages": "email",
                "ve_invite": "email",
                "group_invite": "email",
                "system": "email",
            },
        )
        self.assertEqual(
            result["achievements"],
            {
                "social": {"level": 0, "progress": 0, "next_level": 20},
                "ve": {"level": 0, "progress": 0, "next_level": 40},
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
        )
        self.assertEqual(result["chosen_achievement"], None)

        # also test that in this case an acl entry for "guest" was created if it not
        # already existed
        global_acl = self.db.global_acl.find_one({"role": "guest"})
        self.assertIsNotNone(global_acl)

    def test_get_follows(self):
        """
        expect: successfully get follows
        """

        profile_manager = Profiles(self.db)
        follows = profile_manager.get_follows(CURRENT_ADMIN.username)
        self.assertEqual(len(follows), 1)
        self.assertEqual(follows[0], CURRENT_USER.username)

    def test_get_follow_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException, profile_manager.get_follows, "non_existing"
        )

    def test_add_follows(self):
        """
        expect: successfully follow the user
        """

        profile_manager = Profiles(self.db)
        profile_manager.add_follows(CURRENT_ADMIN.username, "another_test_user")

        # check if the user is now followed
        follows = profile_manager.get_follows(CURRENT_ADMIN.username)
        self.assertIn("another_test_user", follows)

    def test_add_follows_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException,
            profile_manager.add_follows,
            "non_existing",
            "another_test_user",
        )

    def test_add_follows_error_already_followed(self):
        """
        expect: AlreadyFollowedException is raised because the user already follows this user
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            AlreadyFollowedException,
            profile_manager.add_follows,
            CURRENT_ADMIN.username,
            CURRENT_USER.username,
        )

    def test_remove_follows(self):
        """
        expect: successfully unfollow the user
        """

        profile_manager = Profiles(self.db)
        profile_manager.remove_follows(CURRENT_ADMIN.username, CURRENT_USER.username)

        # check if the user is now unfollowed
        follows = profile_manager.get_follows(CURRENT_ADMIN.username)
        self.assertNotIn(CURRENT_USER.username, follows)

    def test_remove_follows_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException,
            profile_manager.remove_follows,
            "non_existing",
            CURRENT_USER.username,
        )

    def test_remove_follows_error_not_followed(self):
        """
        expect: NotFollowedException is raised because the user doesnt follow this user
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            NotFollowedException,
            profile_manager.remove_follows,
            CURRENT_ADMIN.username,
            "another_test_user",
        )

    def test_get_followers(self):
        """
        expect: successfully list of users that follow this user
        """

        profile_manager = Profiles(self.db)
        followers = profile_manager.get_followers(CURRENT_USER.username)
        self.assertEqual(len(followers), 1)
        self.assertEqual(followers[0], CURRENT_ADMIN.username)

    def test_get_role(self):
        """
        expect: successfully get role
        """

        profile_manager = Profiles(self.db)
        role = profile_manager.get_role(CURRENT_ADMIN.username)
        self.assertEqual(role, self.default_profile["role"])

    def test_get_role_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException, profile_manager.get_role, "non_existing"
        )

    def test_set_role(self):
        """
        expect: successfully set role of the user
        """

        profile_manager = Profiles(self.db)
        profile_manager.set_role(CURRENT_ADMIN.username, "a_different_role")

        # check if the role was set
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(result["role"], "a_different_role")

    def test_set_role_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException,
            profile_manager.set_role,
            "non_existing",
            "a_different_role",
        )

    def test_check_role_exists(self):
        """
        expect: successfully check if a role exists or not
        """

        profile_manager = Profiles(self.db)
        self.assertTrue(profile_manager.check_role_exists(self.default_profile["role"]))
        self.assertFalse(profile_manager.check_role_exists("non_existing_role"))

    def test_get_all_roles(self):
        """
        expect: successfully retrieve a list of all username <-> role mappings
        """

        # add another user with a different role
        profile = self.create_profile("test1", ObjectId())
        profile["role"] = "a_different_role"
        self.db.profiles.insert_one(profile)

        profile_manager = Profiles(self.db)
        roles = profile_manager.get_all_roles(
            [{"username": i} for i in [CURRENT_ADMIN.username, "test1"]]
        )
        self.assertEqual(len(roles), 2)
        self.assertIn(
            {"username": CURRENT_ADMIN.username, "role": self.default_profile["role"]},
            roles,
        )
        self.assertIn({"username": "test1", "role": "a_different_role"}, roles)

    def test_get_all_roles_auto_create(self):
        """
        expect: since the supplied keycloak user list contains users that
        are not yet in mongodb, they get automatically created with default profiles
        """

        profile_manager = Profiles(self.db)
        roles = profile_manager.get_all_roles(
            [{"username": i} for i in [CURRENT_ADMIN.username, "test1"]], "test"
        )
        self.assertEqual(len(roles), 2)
        self.assertIn(
            {"username": CURRENT_ADMIN.username, "role": self.default_profile["role"]},
            roles,
        )
        self.assertIn({"username": "test1", "role": "guest"}, roles)

        # check that the "test1" profile was also created
        profile = self.db.profiles.find_one({"username": "test1"})
        self.assertIsNotNone(profile)
        self.assertEqual(profile["username"], "test1")
        self.assertEqual(profile["role"], "guest")
        self.assertEqual(profile["follows"], [])
        self.assertEqual(profile["bio"], "")
        self.assertEqual(profile["institutions"], [])
        self.assertEqual(profile["chosen_institution_id"], "")
        self.assertEqual(profile["profile_pic"], "default_profile_pic.jpg")
        self.assertEqual(profile["first_name"], "")
        self.assertEqual(profile["last_name"], "")
        self.assertEqual(profile["gender"], "")
        self.assertEqual(profile["address"], "")
        self.assertEqual(profile["birthday"], "")
        self.assertEqual(profile["experience"], [""])
        self.assertEqual(profile["expertise"], "")
        self.assertEqual(profile["languages"], [])
        self.assertEqual(profile["ve_ready"], True)
        self.assertEqual(profile["excluded_from_matching"], False)
        self.assertEqual(profile["ve_interests"], [""])
        self.assertEqual(profile["ve_contents"], [""])
        self.assertEqual(profile["ve_goals"], [""])
        self.assertEqual(profile["interdisciplinary_exchange"], True)
        self.assertEqual(profile["preferred_format"], "")
        self.assertEqual(profile["research_tags"], [])
        self.assertEqual(profile["courses"], [])
        self.assertEqual(profile["lms"], [])
        self.assertEqual(profile["tools"], [])
        self.assertEqual(profile["educations"], [])
        self.assertEqual(profile["work_experience"], [])
        self.assertEqual(profile["ve_window"], [])
        self.assertEqual(
            profile["notification_settings"],
            {
                "messages": "email",
                "ve_invite": "email",
                "group_invite": "email",
                "system": "email",
            },
        )
        self.assertEqual(
            profile["achievements"],
            {
                "social": {"level": 0, "progress": 0, "next_level": 20},
                "ve": {"level": 0, "progress": 0, "next_level": 40},
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
        )
        self.assertEqual(profile["chosen_achievement"], None)

        # also check that the "test1" profile was replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", profile["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)

    def test_get_distinct_roles(self):
        """
        expect: successfully retrieve a list of all distinct roles
        """

        # add another user with a different role
        profile = self.create_profile("test1", ObjectId())
        profile["role"] = "a_different_role"
        self.db.profiles.insert_one(profile)

        profile_manager = Profiles(self.db)
        roles = profile_manager.get_distinct_roles()
        self.assertEqual(len(roles), 2)
        self.assertIn(self.default_profile["role"], roles)
        self.assertIn("a_different_role", roles)

    def test_get_profile_pic(self):
        """
        expect: successfully get profile pic attribute
        """

        profile_manager = Profiles(self.db)
        profile_pic = profile_manager.get_profile_pic(CURRENT_ADMIN.username)
        self.assertEqual(profile_pic, self.default_profile["profile_pic"])

    def test_get_profile_pic_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException,
            profile_manager.get_profile_pic,
            "non_existing",
        )

    def test_update_profile_information(self):
        """
        expect: successfully update profile information
        """

        profile_manager = Profiles(self.db)
        profile_manager.update_profile_information(
            self.default_profile["username"],
            {"bio": "new_bio"},
            elasticsearch_collection="test",
        )

        # check if the profile was updated
        result = self.db.profiles.find_one(
            {"username": self.default_profile["username"]}
        )
        self.assertEqual(result["bio"], "new_bio")

        # check that the update was also replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", result["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["_source"]["bio"], "new_bio")

        # try again with updating the profile pic
        profile_pic_id = profile_manager.update_profile_information(
            CURRENT_ADMIN.username,
            {"profile_pic": "new_profile_pic.jpg", "bio": "newbio2"},
            b"test",
            "image/jpg",
            "test",
        )
        profile_pic_id = ObjectId(profile_pic_id)

        # check if the profile was updated
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(result["bio"], "newbio2")
        self.assertEqual(result["profile_pic"], profile_pic_id)

        # check that the profile pic was also replicated to gridfs
        fs = gridfs.GridFS(self.db)
        fs_file = fs.get(profile_pic_id)
        self.assertIsNotNone(fs_file)

        # try again with updating the achievements manually, expecting that they
        # will be ignored because they are auto-tracked
        profile_manager.update_profile_information(
            CURRENT_ADMIN.username,
            {"achievements": {"social": {"level": 1, "progress": 5, "next_level": 10}}},
        )
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"],
            self.default_profile["achievements"],
        )

        # try again choosing a new achievement, expecting that it will be set
        profile_manager.update_profile_information(
            CURRENT_ADMIN.username,
            {"chosen_achievement": {"type": "ve", "level": 0}},
        )
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["chosen_achievement"],
            {"type": "ve", "level": 0},
        )

    def test_update_profile_information_upsert(self):
        """
        expect: successfully upsert if no profile exists yet
        """

        profile_manager = Profiles(self.db)
        profile_manager.update_profile_information(
            "non_existing", {"bio": "new_bio"}, elasticsearch_collection="test"
        )

        # check if the profile was created
        result = self.db.profiles.find_one({"username": "non_existing"})
        self.assertIsNotNone(result)
        self.assertEqual(result["bio"], "new_bio")

        # check that the update was also replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", result["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["_source"]["bio"], "new_bio")

    def test_update_profile_information_error_type_error(self):
        """
        expect: TypeError is raised because some of the updated profile attributes
        have a wrong value
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            TypeError,
            profile_manager.update_profile_information,
            self.default_profile["username"],
            {"bio": 123},
        )

    def test_update_profile_information_error_not_earned_achievement(self):
        """
        expect: ValueError is raised because the achievement level is not yet earned
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ValueError,
            profile_manager.update_profile_information,
            self.default_profile["username"],
            {"chosen_achievement": {"type": "social", "level": 1}},
        )

    def test_update_profile_information_error_invalid_achievement(self):
        """
        expect: ValueError is raised because the achievement type or level is invalid
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ValueError,
            profile_manager.update_profile_information,
            self.default_profile["username"],
            {"chosen_achievement": {"type": "not_existing", "level": 0}},
        )

    def test_get_profile_snippets(self):
        """
        expect: successfully get snippets
        (username, first_name, last_name, institution, profile_pic, chosen_achievement)
        of the supplied users
        """

        # add one more profile, but unset "chosen_institution_id" to test if it is handled correctly:
        # "institution" in the snippet should be an empty string, even though the profile
        # contains institutions
        profile1 = self.create_profile("test1", ObjectId())
        profile1["chosen_institution_id"] = ""
        self.db.profiles.insert_one(profile1)

        profile_manager = Profiles(self.db)
        snippets = profile_manager.get_profile_snippets(
            [self.default_profile["username"], "test1"]
        )
        self.assertEqual(len(snippets), 2)
        self.assertIn(
            {
                "username": self.default_profile["username"],
                "first_name": self.default_profile["first_name"],
                "last_name": self.default_profile["last_name"],
                "institution": next(
                    (
                        inst["name"]
                        for inst in self.default_profile["institutions"]
                        if inst["_id"] == self.default_profile["chosen_institution_id"]
                    ),
                    None,
                ),
                "profile_pic": self.default_profile["profile_pic"],
                "chosen_achievement": self.default_profile["chosen_achievement"],
                "ve_ready": self.default_profile["ve_ready"],
            },
            snippets,
        )
        self.assertIn(
            {
                "username": profile1["username"],
                "first_name": profile1["first_name"],
                "last_name": profile1["last_name"],
                "institution": "",
                "profile_pic": profile1["profile_pic"],
                "chosen_achievement": profile1["chosen_achievement"],
                "ve_ready": self.default_profile["ve_ready"],
            },
            snippets,
        )

        # try again, but this time request a user that doesnt exist, expecting it
        # to be skipped
        snippets = profile_manager.get_profile_snippets(
            [self.default_profile["username"], "non_existing"]
        )
        self.assertEqual(len(snippets), 1)
        self.assertIn(
            {
                "username": self.default_profile["username"],
                "first_name": self.default_profile["first_name"],
                "last_name": self.default_profile["last_name"],
                "institution": next(
                    (
                        inst["name"]
                        for inst in self.default_profile["institutions"]
                        if inst["_id"] == self.default_profile["chosen_institution_id"]
                    ),
                    None,
                ),
                "profile_pic": self.default_profile["profile_pic"],
                "chosen_achievement": self.default_profile["chosen_achievement"],
                "ve_ready": self.default_profile["ve_ready"],
            },
            snippets,
        )

    def test_get_profile_snippets_error_type_error(self):
        """
        expect: TypeError is raised because supplied usernames is not a list
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(TypeError, profile_manager.get_profile_snippets, "test")

    def test_get_matching_exclusion(self):
        """
        expect: successfully retrieve excluded_from_matching attribute
        """

        profile_manager = Profiles(self.db)
        excluded_from_matching = profile_manager.get_matching_exclusion(
            CURRENT_ADMIN.username
        )
        self.assertEqual(
            excluded_from_matching, self.default_profile["excluded_from_matching"]
        )

    def test_get_matching_exclusion_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException,
            profile_manager.get_matching_exclusion,
            "non_existing",
        )

    def test_remove_ve_windows_entry_by_plan_id(self):
        """
        expect: successfully delete all ve_window entries
        that reference the supplied plan_id
        """

        # add one more profile, that has a ve_window entry with the same plan_id
        # as the default_profile
        profile1 = self.create_profile("test1", ObjectId())
        profile1["ve_window"].append(self.default_profile["ve_window"][0])
        self.db.profiles.insert_one(profile1)

        profile_manager = Profiles(self.db)
        profile_manager.remove_ve_windows_entry_by_plan_id(
            self.default_profile["ve_window"][0]["plan_id"]
        )

        # check if the ve_window entry was deleted from both profiles,
        # but profile1 should still have one entry left
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(len(result["ve_window"]), 0)
        result2 = self.db.profiles.find_one({"username": "test1"})
        self.assertEqual(len(result2["ve_window"]), 1)
        self.assertIn(profile1["ve_window"][0], result2["ve_window"])

    def test_get_notification_setting(self):
        """
        expect: successfully retrieve a single notification setting
        """

        profile_manager = Profiles(self.db)
        notification_setting = profile_manager.get_notification_setting(
            CURRENT_ADMIN.username, "messages"
        )
        self.assertEqual(
            notification_setting,
            self.default_profile["notification_settings"]["messages"],
        )

    def test_get_notification_setting_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException,
            profile_manager.get_notification_setting,
            "non_existing",
            "messages",
        )

    def test_get_notification_settings(self):
        """
        expect: successfully retrieve all notification settings
        """

        profile_manager = Profiles(self.db)
        notification_settings = profile_manager.get_all_notification_settings(
            CURRENT_ADMIN.username
        )
        self.assertEqual(
            notification_settings, self.default_profile["notification_settings"]
        )

    def test_get_notification_settings_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException,
            profile_manager.get_all_notification_settings,
            "non_existing",
        )

    def test_achievement_count_up(self):
        """
        expect: successfully increase the progress of an achievement
        """

        profile_manager = Profiles(self.db)
        profile_manager.achievement_count_up(CURRENT_ADMIN.username, "create_posts")

        # expect the progress to be increased by 1 for "social" achievement
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profile["achievements"]["social"]["progress"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["create_posts"],
        )

    def test_achievement_count_up_arbitrary_amount(self):
        """
        expect: successfully increase the progress of an achievement by an arbitrary amount
        """

        profile_manager = Profiles(self.db)
        profile_manager.achievement_count_up(CURRENT_ADMIN.username, "create_posts", 5)

        # expect the progress to be increased by 5 for "social" achievement
        # when executing it 5 times
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profile["achievements"]["social"]["progress"]
            + 5 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["create_posts"],
        )

    def test_achievement_count_up_level_up(self):
        """
        expect: successfully increase the progress of an achievement and level up
        """

        profile_manager = Profiles(self.db)

        # count up
        profile_manager.achievement_count_up(CURRENT_ADMIN.username, "admin_groups")

        # determine what level the user should be at (based on assumption that
        # the first level is reached at 20 progress points, check at profile resource)
        FIRST_LEVEL_THRESHOLD = 20

        def compute_level(progress):
            level = 0
            threshold = FIRST_LEVEL_THRESHOLD
            while progress >= threshold:
                level += 1
                threshold += threshold * 2
            return level

        # expect the level to be upped and next_level increased exponentially
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["social"]["level"],
            compute_level(result["achievements"]["social"]["progress"]),
        )
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profile["achievements"]["social"]["progress"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["admin_groups"],
        )
        next_threshold = FIRST_LEVEL_THRESHOLD
        for i in range(1, result["achievements"]["social"]["level"] + 1):
            next_threshold += next_threshold * 2
        self.assertEqual(result["achievements"]["social"]["next_level"], next_threshold)

    def test_achievement_count_up_error_invalid_achievement(self):
        """
        expect: ValueError is raised because the achievement type is invalid
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ValueError,
            profile_manager.achievement_count_up,
            CURRENT_ADMIN.username,
            "non_existing",
        )

    def test_achievement_count_up_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no
        profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException,
            profile_manager.achievement_count_up,
            "non_existing",
            "create_posts",
        )

    def test_achievement_count_up_constraint_good_practice_plans(self):
        """
        expect: successfully increase the progress of an achievement
        that satisfies the constraint of good_practice_plans
        """

        plan_id = ObjectId()

        profile_manager = Profiles(self.db)
        profile_manager.achievement_count_up_check_constraint_good_practice(
            CURRENT_ADMIN.username, plan_id
        )

        # expect the progress to be increased
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["ve"]["progress"],
            self.default_profile["achievements"]["ve"]["progress"]
            + self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["good_practice_plans"],
        )

        # expect the plan_id to be added to the tracking list
        self.assertIn(
            plan_id, result["achievements"]["tracking"]["good_practice_plans"]
        )

        # using the same plan_id again should not increase the progress any further
        profile_manager.achievement_count_up_check_constraint_good_practice(
            CURRENT_ADMIN.username, plan_id
        )
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["ve"]["progress"],
            self.default_profile["achievements"]["ve"]["progress"]
            + self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["good_practice_plans"],
        )

    def test_achievement_count_up_constraint_good_practice_plans_error_profile_doesnt_exist(
        self,
    ):
        """
        expect: ProfileDoesntExistException is raised because no
        profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException,
            profile_manager.achievement_count_up_check_constraint_good_practice,
            "non_existing",
            ObjectId(),
        )

    def test_achievement_count_up_constraint_unique_partners(self):
        """
        expect: successfully increase the progress of an achievement
        that satisfies the constraint of unique_partners
        """

        partners = ["test", "test2", CURRENT_ADMIN.username]

        profile_manager = Profiles(self.db)
        profile_manager.achievement_count_up_check_constraint_unique_partners(
            CURRENT_ADMIN.username, partners
        )

        # expect the progress to be increased 2 times (one for each partner, except the user self)
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["ve"]["progress"],
            self.default_profile["achievements"]["ve"]["progress"]
            + 2 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["unique_partners"],
        )

        # expect the partners to be added to the tracking list
        self.assertEqual(
            result["achievements"]["tracking"]["unique_partners"], ["test", "test2"]
        )

        # using any of the same partners again should not increase the progress any further
        profile_manager.achievement_count_up_check_constraint_unique_partners(
            CURRENT_ADMIN.username, ["test"]
        )
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["ve"]["progress"],
            self.default_profile["achievements"]["ve"]["progress"]
            + 2 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["unique_partners"],
        )

        # empty partners list should not increase the progress
        profile_manager.achievement_count_up_check_constraint_unique_partners(
            CURRENT_ADMIN.username, []
        )
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["ve"]["progress"],
            self.default_profile["achievements"]["ve"]["progress"]
            + 2 * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["unique_partners"],
        )

    def test_achievement_count_up_constraint_unique_partners_error_profile_doesnt_exist(
        self,
    ):
        """
        expect: ProfileDoesntExistException is raised because no
        profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException,
            profile_manager.achievement_count_up_check_constraint_unique_partners,
            "non_existing",
            ["test"],
        )


class SpaceResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.space_id = ObjectId()
        self.space_name = "test"
        self.default_space = {
            "_id": self.space_id,
            "name": self.space_name,
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "space_pic": "default_space_pic.jpg",
            "space_description": "test",
        }

        # insert default profiles
        self.default_profiles = [
            {
                "username": CURRENT_ADMIN.username,
                "role": "admin",
                "follows": [],
                "bio": "",
                "institution": "",
                "profile_pic": "default_profile_pic.jpg",
                "first_name": "",
                "last_name": "",
                "gender": "",
                "address": "",
                "birthday": "",
                "experience": [""],
                "expertise": "",
                "languages": [],
                "ve_ready": True,
                "excluded_from_matching": False,
                "ve_interests": [""],
                "ve_goals": [""],
                "preferred_formats": [""],
                "research_tags": [],
                "courses": [],
                "educations": [],
                "work_experience": [],
                "ve_window": [],
                "notification_settings": {
                    "messages": "email",
                    "ve_invite": "email",
                    "group_invite": "email",
                    "system": "email",
                },
                "achievements": {
                    "social": {"level": 0, "progress": 0, "next_level": 10},
                    "ve": {"level": 0, "progress": 0, "next_level": 10},
                    "tracking": {
                        "good_practice_plans": [],
                        "unique_partners": [],
                    },
                },
                "chosen_achievement": {"type": "", "level": 0},
            },
            {
                "username": CURRENT_USER.username,
                "role": "user",
                "follows": [],
                "bio": "",
                "institution": "",
                "profile_pic": "default_profile_pic.jpg",
                "first_name": "",
                "last_name": "",
                "gender": "",
                "address": "",
                "birthday": "",
                "experience": [""],
                "expertise": "",
                "languages": [],
                "ve_ready": True,
                "excluded_from_matching": False,
                "ve_interests": [""],
                "ve_goals": [""],
                "preferred_formats": [""],
                "research_tags": [],
                "courses": [],
                "educations": [],
                "work_experience": [],
                "ve_window": [],
                "notification_settings": {
                    "messages": "email",
                    "ve_invite": "email",
                    "group_invite": "email",
                    "system": "email",
                },
                "achievements": {
                    "social": {"level": 0, "progress": 0, "next_level": 10},
                    "ve": {"level": 0, "progress": 0, "next_level": 10},
                    "tracking": {
                        "good_practice_plans": [],
                        "unique_partners": [],
                    },
                },
                "chosen_achievement": {"type": "", "level": 0},
            },
        ]
        self.db.profiles.insert_many(self.default_profiles)

        self.db.spaces.insert_one(self.default_space)

    def tearDown(self) -> None:
        super().tearDown()

        self.db.spaces.delete_many({})
        self.db.profiles.delete_many({})
        self.db.space_files.delete_many({})

        # delete all created files in gridfs
        fs = gridfs.GridFS(self.db)
        for fs_file in fs.find():
            fs.delete(fs_file._id)

    @classmethod
    def tearDownClass(cls) -> None:
        super().tearDownClass()

        # clear out elastisearch index, only once after all tests
        # because otherwise there would be too many http requests
        response = requests.delete(
            "{}/test".format(global_vars.elasticsearch_base_url),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        if response.status_code != 200:
            print(response.content)

    def test_check_space_exists_success(self):
        """
        expect: True because space exists
        """

        space_manager = Spaces(self.db)
        self.assertTrue(space_manager.check_space_exists(self.space_id))

    def test_check_space_exists_failure(self):
        """
        expect: False because either space doesn't exist or name is None
        """

        space_manager = Spaces(self.db)
        self.assertFalse(space_manager.check_space_exists(ObjectId()))
        self.assertFalse(space_manager.check_space_exists(None))

    def test_check_user_is_space_admin(self):
        """
        expect: True because user is admin in the space
        """

        space_manager = Spaces(self.db)
        self.assertTrue(
            space_manager.check_user_is_space_admin(
                self.space_id, CURRENT_ADMIN.username
            )
        )

    def test_check_user_is_space_admin_failure(self):
        """
        expect: False because user is not admin in the space
        """

        space_manager = Spaces(self.db)
        self.assertFalse(
            space_manager.check_user_is_space_admin(
                self.space_id, CURRENT_USER.username
            )
        )

    def test_check_user_is_space_admin_error(self):
        """
        expect: SpaceDoesntExistError is raised because space name doesnt exist
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.check_user_is_space_admin,
            ObjectId(),
            CURRENT_ADMIN.username,
        )

    def test_check_user_is_member(self):
        """
        expect: True because user is member
        """

        space_manager = Spaces(self.db)
        self.assertTrue(
            space_manager.check_user_is_member(self.space_id, CURRENT_ADMIN.username)
        )

    def test_check_user_is_member_failure(self):
        """
        expect: False because user is not member
        """

        space_manager = Spaces(self.db)
        self.assertFalse(
            space_manager.check_user_is_member(self.space_id, CURRENT_USER.username)
        )

    def test_check_user_is_member_error(self):
        """
        expect: SpaceDoesntExistError is raised because space name doesnt exist
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.check_user_is_member,
            ObjectId(),
            CURRENT_ADMIN.username,
        )

    def test_get_space(self):
        """
        expect: successfully get space
        """

        space_manager = Spaces(self.db)
        space = space_manager.get_space(self.space_id)
        self.assertIsNotNone(space)
        self.assertEqual(space._id, self.default_space["_id"])
        self.assertEqual(space.name, self.default_space["name"])
        self.assertEqual(space.invisible, self.default_space["invisible"])
        self.assertEqual(space.joinable, self.default_space["joinable"])
        self.assertEqual(space.members, self.default_space["members"])
        self.assertEqual(space.admins, self.default_space["admins"])
        self.assertEqual(space.invites, self.default_space["invites"])
        self.assertEqual(space.requests, self.default_space["requests"])
        self.assertEqual(space.space_pic, self.default_space["space_pic"])
        self.assertEqual(
            space.space_description, self.default_space["space_description"]
        )

    def test_get_space_failure(self):
        """
        expect: None returned because no space with this name was found
        """

        space_manager = Spaces(self.db)
        space = space_manager.get_space(ObjectId())
        self.assertIsNone(space)

    def test_get_all_spaces(self):
        """
        expect: successfully get a list of all spaces
        """

        # add one more space
        additional_space = {
            "_id": ObjectId(),
            "name": "test2",
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "space_pic": "default_space_pic.jpg",
            "space_description": "test",
        }
        self.db.spaces.insert_one(additional_space)

        space_manager = Spaces(self.db)
        spaces = space_manager.get_all_spaces()
        self.assertEqual(len(spaces), 2)

    def test_get_all_spaces_visible_to_user(self):
        """
        expect: successfully get all spaces that are not invisible or where
        the user is a member
        """

        # add 3 more spaces
        additional_spaces = [
            # user can see this one because it is not invisible
            {
                "_id": ObjectId(),
                "name": "test2",
                "invisible": False,
                "joinable": True,
                "members": [],
                "admins": [],
                "invites": [],
                "requests": [],
                "space_pic": "default_space_pic.jpg",
                "space_description": "test",
            },
            # user can see this one because it is invisible, but he is a member
            {
                "_id": ObjectId(),
                "name": "test3",
                "invisible": True,
                "joinable": True,
                "members": [CURRENT_ADMIN.username],
                "admins": [CURRENT_ADMIN.username],
                "invites": [],
                "requests": [],
                "space_pic": "default_space_pic.jpg",
                "space_description": "test",
            },
            # user cannot see this one
            {
                "_id": ObjectId(),
                "name": "test4",
                "invisible": True,
                "joinable": True,
                "members": [],
                "admins": [],
                "invites": [],
                "requests": [],
                "space_pic": "default_space_pic.jpg",
                "space_description": "test",
            },
        ]
        self.db.spaces.insert_many(additional_spaces)

        space_manager = Spaces(self.db)
        spaces = space_manager.get_all_spaces_visible_to_user(CURRENT_ADMIN.username)
        self.assertEqual(len(spaces), 3)
        space_names = [space.name for space in spaces]
        self.assertIn(self.space_name, space_names)
        self.assertIn("test2", space_names)
        self.assertIn("test3", space_names)
        self.assertNotIn("test4", space_names)

    def test_get_space_names(self):
        """
        expect: successfully get a list of all space names
        """

        # add one more space
        additional_space = {
            "_id": ObjectId(),
            "name": "test2",
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "space_pic": "default_space_pic.jpg",
            "space_description": "test",
        }
        self.db.spaces.insert_one(additional_space)

        space_manager = Spaces(self.db)
        space_names = space_manager.get_space_names()
        self.assertEqual(len(space_names), 2)
        self.assertIn("test", space_names)
        self.assertIn("test2", space_names)

    def test_get_space_names_of_user(self):
        """
        expect: successfully get a list of all space names the user is a member of
        """

        # add 2 more space
        additional_spaces = [
            {
                "_id": ObjectId(),
                "name": "test2",
                "invisible": False,
                "joinable": True,
                "members": [CURRENT_ADMIN.username],
                "admins": [CURRENT_ADMIN.username],
                "invites": [],
                "requests": [],
                "space_pic": "default_space_pic.jpg",
                "space_description": "test",
            },
            {
                "_id": ObjectId(),
                "name": "test3",
                "invisible": False,
                "joinable": True,
                "members": [],
                "admins": [],
                "invites": [],
                "requests": [],
                "space_pic": "default_space_pic.jpg",
                "space_description": "test",
            },
        ]

        self.db.spaces.insert_many(additional_spaces)

        space_manager = Spaces(self.db)
        spaces = space_manager.get_space_names_of_user(CURRENT_ADMIN.username)
        self.assertEqual(len(spaces), 2)
        self.assertIn("test", spaces)
        self.assertIn("test2", spaces)

    def test_get_spaces_of_user(self):
        """
        expect: successfully get a list of all spaces the user is a member of
        """

        # add 2 more space
        additional_spaces = [
            {
                "_id": ObjectId(),
                "name": "test2",
                "invisible": False,
                "joinable": True,
                "members": [CURRENT_ADMIN.username],
                "admins": [CURRENT_ADMIN.username],
                "invites": [],
                "requests": [],
                "space_pic": "default_space_pic.jpg",
                "space_description": "test",
            },
            {
                "_id": ObjectId(),
                "name": "test3",
                "invisible": False,
                "joinable": True,
                "members": [],
                "admins": [],
                "invites": [],
                "requests": [],
                "space_pic": "default_space_pic.jpg",
                "space_description": "test",
            },
        ]

        self.db.spaces.insert_many(additional_spaces)

        space_manager = Spaces(self.db)
        spaces = space_manager.get_spaces_of_user(CURRENT_ADMIN.username)
        self.assertEqual(len(spaces), 2)
        self.assertIn(self.default_space, spaces)
        self.assertIn(additional_spaces[0], spaces)

    def test_get_space_invites_of_user(self):
        """
        expect: successfully get a list of all pending invites that the user has
        """

        space_manager = Spaces(self.db)

        # as default, there should be no invites right now
        invites = space_manager.get_space_invites_of_user(CURRENT_ADMIN.username)
        self.assertEqual(invites, [])

        # add a space and set the user as invited
        additional_space = {
            "_id": ObjectId(),
            "name": "test2",
            "invisible": False,
            "joinable": True,
            "members": [],
            "admins": [],
            "invites": [CURRENT_ADMIN.username],
            "requests": [],
            "space_pic": "default_space_pic.jpg",
            "space_description": "test",
        }
        self.db.spaces.insert_one(additional_space)

        invites = space_manager.get_space_invites_of_user(CURRENT_ADMIN.username)
        self.assertEqual(invites, [additional_space])

    def test_get_space_requests_of_user(self):
        """
        expect: successfully get a list of all pending requests that the user has
        """

        space_manager = Spaces(self.db)

        # as default, there should be no requests right now
        requests = space_manager.get_space_requests_of_user(CURRENT_ADMIN.username)
        self.assertEqual(requests, [])

        # add a space and set the user as requested
        additional_space = {
            "_id": ObjectId(),
            "name": "test2",
            "invisible": False,
            "joinable": True,
            "members": [],
            "admins": [],
            "invites": [],
            "requests": [CURRENT_ADMIN.username],
            "space_pic": "default_space_pic.jpg",
            "space_description": "test",
        }
        self.db.spaces.insert_one(additional_space)

        requests = space_manager.get_space_requests_of_user(CURRENT_ADMIN.username)
        self.assertEqual(requests, [additional_space])

    def test_create_space(self):
        """
        expect: successfully create new space
        """

        new_space = {
            "name": "new_space",
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "space_pic": "default_space_pic.jpg",
            "space_description": "test",
        }

        space_manager = Spaces(self.db)
        _id = space_manager.create_space(new_space.copy(), "test")

        # check if space was created
        space = self.db.spaces.find_one({"name": "new_space"})
        self.assertIsNotNone(space)
        self.assertIsInstance(space["_id"], ObjectId)
        self.assertEqual(space["_id"], _id)
        self.assertEqual(space["name"], new_space["name"])
        self.assertEqual(space["invisible"], new_space["invisible"])
        self.assertEqual(space["joinable"], new_space["joinable"])
        self.assertEqual(space["members"], new_space["members"])
        self.assertEqual(space["admins"], new_space["admins"])
        self.assertEqual(space["invites"], new_space["invites"])
        self.assertEqual(space["requests"], new_space["requests"])
        self.assertEqual(space["space_pic"], new_space["space_pic"])
        self.assertEqual(space["space_description"], new_space["space_description"])

        # check that the profile was also replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", space["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)

        # check count towards achievements:
        # admin user twice towards "social" (join_groups and admin_groups)
        # normal user once towards "social" (join_groups)
        result_admin = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        result_user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result_admin["achievements"]["social"]["progress"],
            self.default_profiles[0]["achievements"]["social"]["progress"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["admin_groups"],
        )
        self.assertEqual(
            result_user["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"],
        )

    def test_create_space_failure_invalid_attributes(self):
        """
        expect: a) ValueError is raised because space is missing an attribute,
        and b) TypeError is raised because an attribute has the wrong type
        """

        new_space = {
            "name": "new_space",
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "space_pic": "default_space_pic.jpg",
            "space_description": "test",
        }

        # invisible is missing
        space_manager = Spaces(self.db)
        self.assertRaises(ValueError, space_manager.create_space, new_space, "test")

        # check that the join didnt count towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[0]["achievements"]["social"]["progress"],
        )

        # invisible has wrong type
        new_space["invisible"] = "test"
        self.assertRaises(TypeError, space_manager.create_space, new_space, "test")

        # check that the join didnt count towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[0]["achievements"]["social"]["progress"],
        )

    def test_delete_space(self):
        """
        expect: successfully delete space
        """

        # put a folder with a file into the space's file share
        space_files = SpaceFiles(self.db)
        folder = space_files.create_folder(
            self.space_id, "docs", CURRENT_ADMIN.username
        )
        file_node = space_files.add_file(
            self.space_id, "a.txt", b"a", CURRENT_ADMIN.username, folder["_id"]
        )

        space_manager = Spaces(self.db)
        space_manager.delete_space(self.space_id, "test")

        # check if space was deleted
        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertIsNone(space)

        # check that the file share (nodes and gridfs files) was deleted as well
        self.assertEqual(
            self.db.space_files.count_documents({"space": self.space_id}), 0
        )
        self.assertFalse(gridfs.GridFS(self.db).exists(file_node["file_id"]))

    def test_delete_space_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError, space_manager.delete_space, ObjectId(), "test"
        )

    def test_is_space_directly_joinable(self):
        """
        expect: successfully retrieve joinable attribute of space
        """

        space_manager = Spaces(self.db)
        joinable = space_manager.is_space_directly_joinable(self.space_id)
        self.assertEqual(joinable, self.default_space["joinable"])

    def test_is_space_directly_joinable_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.is_space_directly_joinable,
            ObjectId(),
        )

    def test_join_space(self):
        """
        expect: successfully add user to the space members list
        """

        space_manager = Spaces(self.db)
        space_manager.join_space(self.space_id, CURRENT_USER.username)

        # check if user was added to members list
        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertIn(CURRENT_USER.username, space["members"])

        # check that join counted towards achievements "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"],
        )

    def test_join_space_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.join_space,
            ObjectId(),
            CURRENT_USER.username,
        )

        # check that the join didnt count towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"],
        )

    def test_join_space_error_already_member(self):
        """
        expect: AlreadyMemberError is raised because is already a member of
        the space
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            AlreadyMemberError,
            space_manager.join_space,
            self.space_id,
            CURRENT_ADMIN.username,
        )

        # check that the join didnt count towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"],
        )

    def test_join_space_request(self):
        """
        expect: successfully add the user to the space requests list
        """

        space_manager = Spaces(self.db)
        space_manager.join_space_request(self.space_id, CURRENT_USER.username)

        # check if user was added to requests list
        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertIn(CURRENT_USER.username, space["requests"])

    def test_join_space_request_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.join_space_request,
            ObjectId(),
            CURRENT_USER.username,
        )

    def test_join_space_request_error_already_requested_join(self):
        """
        expect: AlreadyRequestJoinError is raised because user already requested
        to join the space previously
        """

        # manually add user to requests list
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"requests": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        self.assertRaises(
            AlreadyRequestedJoinError,
            space_manager.join_space_request,
            self.space_id,
            CURRENT_USER.username,
        )

    def test_add_space_admin(self):
        """
        expect: successfully set user as space admin
        """

        space_manager = Spaces(self.db)
        space_manager.add_space_admin(self.space_id, CURRENT_USER.username)

        # check if user was added to admins list, which includes being in the members list
        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertIn(CURRENT_USER.username, space["admins"])
        self.assertIn(CURRENT_USER.username, space["members"])

        # check that the admin-set counted towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["admin_groups"],
        )

    def test_add_space_admin_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.add_space_admin,
            ObjectId(),
            CURRENT_USER.username,
        )

        # check that the join didnt count towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"],
        )

    def test_add_space_admin_error_already_admin(self):
        """
        expect: AlreadyAdminError is raised because user is already an admin in this space
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            AlreadyAdminError,
            space_manager.add_space_admin,
            self.space_id,
            CURRENT_ADMIN.username,
        )

        # check that the join didnt count towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"],
        )

    def test_set_space_picture(self):
        """
        expect: successfully set picture of space with dummy bytes string
        """

        space_manager = Spaces(self.db)
        space_manager.set_space_picture(self.space_id, "test_pic", b"test", "image/jpg")

        space = self.db.spaces.find_one({"_id": self.space_id})
        space_pic_id = space["space_pic"]

        fs = gridfs.GridFS(self.db)
        space_pic = fs.get(space_pic_id)
        self.assertEqual(space_pic.read(), b"test")

    def test_set_space_picture_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.set_space_picture,
            ObjectId(),
            "test_pic",
            b"test",
            "image/jpg",
        )

    def test_set_space_description(self):
        """
        expect: successfully set space description
        """

        space_manager = Spaces(self.db)
        space_manager.set_space_description(self.space_id, "test_description", "test")

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertEqual(space["space_description"], "test_description")

        # check that the update was replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", space["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["_source"]["space_description"], "test_description"
        )

    def test_set_space_description_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.set_space_description,
            ObjectId(),
            "test_description",
            "test",
        )

    def test_invite_user(self):
        """
        expect: successfully add user to invites list
        """

        space_manager = Spaces(self.db)
        space_manager.invite_user(self.space_id, CURRENT_USER.username)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertIn(CURRENT_USER.username, space["invites"])

    def test_invite_user_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.invite_user,
            ObjectId(),
            CURRENT_USER.username,
        )

    def test_accept_space_invite(self):
        """
        expect: successfully remove user from invites list and
        add him to members list
        """

        # manually add user to invites list
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"invites": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.accept_space_invite(self.space_id, CURRENT_USER.username)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertNotIn(CURRENT_USER.username, space["invites"])
        self.assertIn(CURRENT_USER.username, space["members"])

        # check that the join counted towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"],
        )

    def test_accept_space_invite_error_user_not_invited(self):
        """
        expect: UserNotInvitedError is raised because user is not invited to the space
        and can therefore not gain entry by fake-accepting a request
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            UserNotInvitedError,
            space_manager.accept_space_invite,
            self.space_id,
            CURRENT_USER.username,
        )

        # check that the join didnt count towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"],
        )

    def test_accept_space_invite_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.accept_space_invite,
            ObjectId(),
            CURRENT_USER.username,
        )

        # check that the join didnt count towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"],
        )

    def test_decline_space_invite(self):
        """
        expect: successfully decline invite to a space, i.e. not get added to members list
        """

        # manually add user to invites list
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"invites": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.decline_space_invite(self.space_id, CURRENT_USER.username)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertNotIn(CURRENT_USER.username, space["invites"])
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_decline_space_invite_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.decline_space_invite,
            ObjectId(),
            CURRENT_USER.username,
        )

    def test_revoke_space_invite(self):
        """
        expect: successfully remove user from invites list
        """

        # manually add user to invites list
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"invites": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.revoke_space_invite(self.space_id, CURRENT_USER.username)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertNotIn(CURRENT_USER.username, space["invites"])
        # for sanity, check that user is not added elsewhere
        self.assertNotIn(CURRENT_USER.username, space["requests"])
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_revoke_space_invite_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.revoke_space_invite,
            ObjectId(),
            CURRENT_USER.username,
        )

    def test_accept_join_request(self):
        """
        expect: successfully accept join request, i.e. get added to members list
        """

        # manually add user to requests list
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"requests": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.accept_join_request(self.space_id, CURRENT_USER.username)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertNotIn(CURRENT_USER.username, space["requests"])
        self.assertIn(CURRENT_USER.username, space["members"])

        # check that the join counted towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"]
            + 1 * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS["join_groups"],
        )

    def test_accept_join_request_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.accept_join_request,
            ObjectId(),
            CURRENT_USER.username,
        )

        # check that the join didnt count towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"],
        )

    def test_accept_join_request_error_not_request_to_join(self):
        """
        expect: NotRequestedJoinError is raised because user didnt request
        to join in the first place, so cannot be accepted
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            NotRequestedJoinError,
            space_manager.accept_join_request,
            self.space_id,
            CURRENT_USER.username,
        )

        # check that the join didnt count towards achievement "social"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"]["progress"],
            self.default_profiles[1]["achievements"]["social"]["progress"],
        )

    def test_reject_join_request(self):
        """
        expect: successfully reject join request, i.e. not get added to members list
        """

        # manually add user to requests list
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"requests": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.reject_join_request(self.space_id, CURRENT_USER.username)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertNotIn(CURRENT_USER.username, space["requests"])
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_reject_join_request_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.reject_join_request,
            ObjectId(),
            CURRENT_USER.username,
        )

    def test_revoke_join_request(self):
        """
        expect: successfully remove user from requests list
        """

        # manually add user to requests list
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"requests": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.revoke_join_request(self.space_id, CURRENT_USER.username)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertNotIn(CURRENT_USER.username, space["requests"])
        # for sanity, check that user is not added elsewhere
        self.assertNotIn(CURRENT_USER.username, space["invites"])
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_revoke_join_request_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.revoke_join_request,
            ObjectId(),
            CURRENT_USER.username,
        )

    def test_toggle_visibility(self):
        """
        expect: set visibility attribute to True if it was False and False if it was True
        """

        current_visibility = self.default_space["invisible"]
        space_manager = Spaces(self.db)
        space_manager.toggle_visibility(self.space_id, "test")

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertEqual(space["invisible"], not current_visibility)

        # also check that the change was replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", space["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["_source"]["invisible"], not current_visibility
        )

        # try again backwards
        space_manager.toggle_visibility(self.space_id, "test")
        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertEqual(space["invisible"], current_visibility)

        # also check that the change was replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", space["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["_source"]["invisible"], current_visibility)

    def test_toggle_visibility_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError, space_manager.toggle_visibility, ObjectId(), "test"
        )

    def test_toggle_joinability(self):
        """
        expect: set joinable attribute to True if it was False and False if it was True
        """

        current_joinability = self.default_space["joinable"]
        space_manager = Spaces(self.db)
        space_manager.toggle_joinability(self.space_id, "test")

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertEqual(space["joinable"], not current_joinability)

        # also check that the change was replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", space["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["_source"]["joinable"], not current_joinability
        )

        # try again backwards
        space_manager.toggle_joinability(self.space_id, "test")
        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertEqual(space["joinable"], current_joinability)

        # also check that the change was replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", space["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["_source"]["joinable"], current_joinability)

    def test_toggle_joinability_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError, space_manager.toggle_joinability, ObjectId(), "test"
        )

    def test_leave_space_member(self):
        """
        expect: successfully leave space as member
        """

        # manually add other user to space first
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"members": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.leave_space(self.space_id, CURRENT_USER.username)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_leave_space_admin(self):
        """
        expect: successfully leave space as admin
        """

        # manually add another admin first, becuase otherwise OnylAdminError should raise
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {
                "$push": {
                    "admins": CURRENT_USER.username,
                    "members": CURRENT_USER.username,
                }
            },
        )

        space_manager = Spaces(self.db)
        space_manager.leave_space(self.space_id, CURRENT_USER.username)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertNotIn(CURRENT_USER.username, space["admins"])
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_leave_space_error_only_admin(self):
        """
        expect: OnlyAdminError is raised because user is the only admin of the space,
        and therefore cannot leave without giving admin rights to somebody else before
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            OnlyAdminError,
            space_manager.leave_space,
            self.space_id,
            CURRENT_ADMIN.username,
        )

    def test_leave_space_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.leave_space,
            ObjectId(),
            CURRENT_USER.username,
        )

    def test_kick_user(self):
        """
        expect: successfully kick user from space
        """

        # manually add user to space first
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"members": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.kick_user(self.space_id, CURRENT_USER.username)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_kick_user_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.kick_user,
            ObjectId(),
            CURRENT_USER.username,
        )

    def test_kick_user_error_user_not_member(self):
        """
        expect: UserNotMemberError is raised because user is not a member of the space
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            UserNotMemberError,
            space_manager.kick_user,
            self.space_id,
            CURRENT_USER.username,
        )

    def test_revoke_space_admin_privilege(self):
        """
        expect: successfully remove user from admins list
        """

        # manually add user to admins list first
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {
                "$push": {
                    "admins": CURRENT_USER.username,
                    "members": CURRENT_USER.username,
                }
            },
        )

        space_manager = Spaces(self.db)
        space_manager.revoke_space_admin_privilege(self.space_id, CURRENT_USER.username)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertNotIn(CURRENT_USER.username, space["admins"])
        self.assertIn(CURRENT_USER.username, space["members"])

    def test_revoke_space_admin_privileges_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.revoke_space_admin_privilege,
            ObjectId(),
            CURRENT_USER.username,
        )

    def test_revoke_space_admin_privileges_error_user_not_admin(self):
        """
        expect: UserNotAdminError is raised because user is not an admin of the space
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            UserNotAdminError,
            space_manager.revoke_space_admin_privilege,
            self.space_id,
            CURRENT_USER.username,
        )

    def test_revoke_space_admin_privileges_error_only_admin(self):
        """
        expect: OnlyAdminError is raised because the to-be-degraded user is
        the only admin of the space
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            OnlyAdminError,
            space_manager.revoke_space_admin_privilege,
            self.space_id,
            CURRENT_ADMIN.username,
        )


class GridFSHelpersTest(BaseResourceTestCase):
    """
    the gridfs helpers keep the mime type in the file metadata instead of the
    top-level contentType field, whose accessors are deprecated in PyMongo 4
    and removed in PyMongo 5
    """

    def setUp(self) -> None:
        super().setUp()
        self.fs = gridfs.GridFS(self.db)

    def tearDown(self) -> None:
        for fs_file in self.fs.find():
            self.fs.delete(fs_file._id)
        super().tearDown()

    def test_gridfs_put(self):
        """
        expect: the file is stored with mime type and uploader in its metadata
        and without the legacy top-level contentType field
        """

        file_id = util.gridfs_put(self.fs, b"data", "a.txt", "text/plain", "me")
        grid_file = self.fs.get(file_id)
        self.assertEqual(grid_file.read(), b"data")
        self.assertEqual(grid_file.filename, "a.txt")
        self.assertEqual(
            grid_file.metadata,
            {util.GRIDFS_CONTENT_TYPE_KEY: "text/plain", "uploader": "me"},
        )
        self.assertNotIn("contentType", self.db.fs.files.find_one({"_id": file_id}))

        # additional kwargs (e.g. a custom _id) are passed through
        custom = util.gridfs_put(
            self.fs, b"x", "custom", "image/png", "system", _id="custom_id"
        )
        self.assertEqual(custom, "custom_id")
        self.assertTrue(self.fs.exists("custom_id"))

    def test_gridfs_content_type(self):
        """
        expect: the mime type is read from the metadata, with a fallback to
        the legacy top-level field, and None if there is none at all
        """

        modern = self.fs.get(
            util.gridfs_put(self.fs, b"1", "a.txt", "text/plain", "me")
        )
        self.assertEqual(util.gridfs_content_type(modern), "text/plain")

        legacy = self.fs.get(
            self.fs.put(b"2", filename="b.png", contentType="image/png")
        )
        self.assertEqual(util.gridfs_content_type(legacy), "image/png")

        # metadata wins over the legacy field
        both = self.fs.get(
            self.fs.put(
                b"3",
                filename="c.pdf",
                contentType="text/plain",
                metadata={util.GRIDFS_CONTENT_TYPE_KEY: "application/pdf"},
            )
        )
        self.assertEqual(util.gridfs_content_type(both), "application/pdf")

        none = self.fs.get(self.fs.put(b"4", filename="d.bin"))
        self.assertIsNone(util.gridfs_content_type(none))

    def test_migrate_gridfs_content_type(self):
        """
        expect: legacy files get their mime type moved into the metadata (keeping
        other metadata), files that already carry one in the metadata keep it,
        the legacy field is removed everywhere and a second run is a no-op
        """

        legacy_no_metadata = self.fs.put(
            b"1", filename="a.png", contentType="image/png"
        )
        legacy_with_metadata = self.fs.put(
            b"2",
            filename="b.txt",
            contentType="text/plain",
            metadata={"uploader": "me"},
        )
        legacy_null_metadata = self.fs.put(
            b"3", filename="c.txt", contentType="text/csv", metadata=None
        )
        both = self.fs.put(
            b"4",
            filename="d.pdf",
            contentType="text/plain",
            metadata={
                util.GRIDFS_CONTENT_TYPE_KEY: "application/pdf",
                "uploader": "me",
            },
        )
        modern = util.gridfs_put(self.fs, b"5", "e.txt", "text/plain", "me")
        untyped = self.fs.put(b"6", filename="f.bin")

        self.assertEqual(migrate_gridfs_content_type(self.db), 4)

        expected = {
            legacy_no_metadata: {util.GRIDFS_CONTENT_TYPE_KEY: "image/png"},
            legacy_with_metadata: {
                util.GRIDFS_CONTENT_TYPE_KEY: "text/plain",
                "uploader": "me",
            },
            legacy_null_metadata: {util.GRIDFS_CONTENT_TYPE_KEY: "text/csv"},
            both: {util.GRIDFS_CONTENT_TYPE_KEY: "application/pdf", "uploader": "me"},
            modern: {util.GRIDFS_CONTENT_TYPE_KEY: "text/plain", "uploader": "me"},
        }
        for file_id, metadata in expected.items():
            with self.subTest(file_id=file_id):
                document = self.db.fs.files.find_one({"_id": file_id})
                self.assertEqual(document["metadata"], metadata)
                self.assertNotIn("contentType", document)

        # files without any mime type are left alone
        document = self.db.fs.files.find_one({"_id": untyped})
        self.assertNotIn("contentType", document)
        self.assertNotIn("metadata", document)

        # idempotent
        self.assertEqual(migrate_gridfs_content_type(self.db), 0)
        self.assertEqual(
            self.db.fs.files.find_one({"_id": legacy_with_metadata})["metadata"],
            expected[legacy_with_metadata],
        )
        self.assertEqual(
            self.db.fs.files.count_documents({"contentType": {"$exists": True}}), 0
        )


class SpaceFilesResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.space_id = ObjectId()
        self.default_space = {
            "_id": self.space_id,
            "name": "test",
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "space_pic": "default_space_pic.jpg",
            "space_description": "test",
        }
        self.db.spaces.insert_one(self.default_space)

        self.space_files = SpaceFiles(self.db)
        self.fs = gridfs.GridFS(self.db)

    def tearDown(self) -> None:
        self.db.spaces.delete_many({})
        self.db.space_files.delete_many({})
        self.db.posts.delete_many({})

        # delete all created files in gridfs
        for fs_file in self.fs.find():
            self.fs.delete(fs_file._id)

        super().tearDown()

    def _post_file(
        self, name: str = "attachment.txt", content: bytes = b"post"
    ) -> dict:
        """
        helper: store a file in gridfs and mirror it as a post file
        """

        file_id = util.gridfs_put(
            self.fs, content, name, "text/plain", CURRENT_USER.username
        )
        return self.space_files.add_post_file(
            self.space_id, CURRENT_USER.username, file_id, name, ObjectId()
        )

    def test_validate_name(self):
        """
        expect: valid names are returned stripped, invalid names raise
        InvalidFileNameError
        """

        self.assertEqual(self.space_files.validate_name("  report.pdf "), "report.pdf")

        for invalid in ["", "   ", ".", "..", "a/b", "a\\b", "a\nb", None, 12]:
            with self.subTest(name=invalid):
                self.assertRaises(
                    InvalidFileNameError, self.space_files.validate_name, invalid
                )

        self.assertRaises(
            InvalidFileNameError,
            self.space_files.validate_name,
            "a" * (self.space_files.MAX_NAME_LENGTH + 1),
        )

    def test_get_limits(self):
        """
        expect: the limits reflect the class constants
        """

        limits = self.space_files.get_limits()
        self.assertEqual(limits["max_folder_depth"], SpaceFiles.MAX_FOLDER_DEPTH)
        self.assertEqual(limits["max_file_size_bytes"], SpaceFiles.MAX_FILE_SIZE_BYTES)
        self.assertEqual(
            limits["max_space_storage_bytes"], SpaceFiles.MAX_SPACE_STORAGE_BYTES
        )
        self.assertEqual(limits["max_name_length"], SpaceFiles.MAX_NAME_LENGTH)

    def test_create_folder(self):
        """
        expect: successfully create a folder in the root and a nested one
        """

        folder = self.space_files.create_folder(
            self.space_id, " docs ", CURRENT_ADMIN.username
        )
        db_state = self.db.space_files.find_one({"_id": folder["_id"]})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["space"], self.space_id)
        self.assertIsNone(db_state["parent"])
        self.assertEqual(db_state["type"], "folder")
        self.assertEqual(db_state["name"], "docs")
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertIsNone(db_state["system"])
        self.assertIsInstance(db_state["created"], datetime)
        self.assertIsInstance(db_state["modified"], datetime)

        nested = self.space_files.create_folder(
            self.space_id, "2024", CURRENT_ADMIN.username, folder["_id"]
        )
        db_state = self.db.space_files.find_one({"_id": nested["_id"]})
        self.assertEqual(db_state["parent"], folder["_id"])

    def test_create_folder_error_invalid_name(self):
        """
        expect: InvalidFileNameError is raised for an invalid name
        """

        self.assertRaises(
            InvalidFileNameError,
            self.space_files.create_folder,
            self.space_id,
            "a/b",
            CURRENT_ADMIN.username,
        )

    def test_create_folder_error_parent_doesnt_exist(self):
        """
        expect: FileNodeDoesntExistError is raised because the parent folder
        doesn't exist in the space
        """

        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.create_folder,
            self.space_id,
            "docs",
            CURRENT_ADMIN.username,
            ObjectId(),
        )

        # a folder of another space is not visible either
        other_space_folder = self.space_files.create_folder(
            ObjectId(), "foreign", CURRENT_ADMIN.username
        )
        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.create_folder,
            self.space_id,
            "docs",
            CURRENT_ADMIN.username,
            other_space_folder["_id"],
        )

    def test_create_folder_error_not_a_folder(self):
        """
        expect: NotAFolderError is raised because the parent is a file
        """

        file_node = self.space_files.add_file(
            self.space_id, "a.txt", b"a", CURRENT_ADMIN.username
        )
        self.assertRaises(
            NotAFolderError,
            self.space_files.create_folder,
            self.space_id,
            "docs",
            CURRENT_ADMIN.username,
            file_node["_id"],
        )

    def test_create_folder_error_read_only_parent(self):
        """
        expect: ReadOnlyNodeError is raised because the parent is the
        system folder for post files
        """

        post_file = self._post_file()
        self.assertRaises(
            ReadOnlyNodeError,
            self.space_files.create_folder,
            self.space_id,
            "docs",
            CURRENT_ADMIN.username,
            post_file["parent"],
        )

    def test_create_folder_error_depth_exceeded(self):
        """
        expect: FolderDepthExceededError is raised when nesting deeper
        than MAX_FOLDER_DEPTH
        """

        parent_id = None
        for level in range(SpaceFiles.MAX_FOLDER_DEPTH):
            folder = self.space_files.create_folder(
                self.space_id,
                "level{}".format(level),
                CURRENT_ADMIN.username,
                parent_id,
            )
            parent_id = folder["_id"]

        self.assertRaises(
            FolderDepthExceededError,
            self.space_files.create_folder,
            self.space_id,
            "too_deep",
            CURRENT_ADMIN.username,
            parent_id,
        )

    def test_create_folder_error_name_collision(self):
        """
        expect: FilenameCollisionError is raised because a node with the
        same name (case-insensitive) already exists in the folder
        """

        self.space_files.create_folder(self.space_id, "Docs", CURRENT_ADMIN.username)
        self.assertRaises(
            FilenameCollisionError,
            self.space_files.create_folder,
            self.space_id,
            "docs",
            CURRENT_ADMIN.username,
        )

        # files count as well
        self.space_files.add_file(self.space_id, "a.txt", b"a", CURRENT_ADMIN.username)
        self.assertRaises(
            FilenameCollisionError,
            self.space_files.create_folder,
            self.space_id,
            "a.txt",
            CURRENT_ADMIN.username,
        )

    def test_add_file(self):
        """
        expect: successfully store a file in gridfs and add a node for it
        """

        folder = self.space_files.create_folder(
            self.space_id, "docs", CURRENT_ADMIN.username
        )
        node = self.space_files.add_file(
            self.space_id,
            "report.pdf",
            b"%PDF-1.4",
            CURRENT_ADMIN.username,
            folder["_id"],
        )

        db_state = self.db.space_files.find_one({"_id": node["_id"]})
        self.assertEqual(db_state["type"], "file")
        self.assertEqual(db_state["name"], "report.pdf")
        self.assertEqual(db_state["parent"], folder["_id"])
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertEqual(db_state["content_type"], "application/pdf")
        self.assertEqual(db_state["size"], 8)
        self.assertTrue(db_state["manually_uploaded"])
        self.assertIsNone(db_state["post_id"])

        grid_file = self.fs.get(db_state["file_id"])
        self.assertEqual(grid_file.read(), b"%PDF-1.4")
        self.assertEqual(grid_file.filename, "report.pdf")
        # the mime type lives in the metadata, not in the deprecated contentType field
        self.assertEqual(
            grid_file.metadata[util.GRIDFS_CONTENT_TYPE_KEY], "application/pdf"
        )
        self.assertEqual(util.gridfs_content_type(grid_file), "application/pdf")
        self.assertEqual(grid_file.metadata["uploader"], CURRENT_ADMIN.username)

    def test_add_file_content_type_from_name(self):
        """
        expect: the mime type is derived from the file name, both in the node
        and in gridfs, unknown extensions are generic binary data
        """

        node = self.space_files.add_file(
            self.space_id, "picture.png", b"png", CURRENT_ADMIN.username
        )
        self.assertEqual(node["content_type"], "image/png")
        grid_file = self.fs.get(node["file_id"])
        self.assertEqual(util.gridfs_content_type(grid_file), "image/png")

        node = self.space_files.add_file(
            self.space_id, "data.xyz123", b"?", CURRENT_ADMIN.username
        )
        self.assertEqual(node["content_type"], "application/octet-stream")

    def test_add_file_removes_bytes_if_node_fails(self):
        """
        expect: if the node can't be inserted, the already stored gridfs file
        is removed again, so nothing is left behind
        """

        with mock.patch.object(
            SpaceFiles, "_insert_file_node", side_effect=RuntimeError("db down")
        ):
            self.assertRaises(
                RuntimeError,
                self.space_files.add_file,
                self.space_id,
                "a.txt",
                b"a",
                CURRENT_ADMIN.username,
            )

        self.assertEqual(self.db.fs.files.count_documents({}), 0)
        self.assertEqual(self.db.space_files.count_documents({}), 0)

    def test_unique_name_index(self):
        """
        expect: the unique index rejects case-insensitive duplicates that slip
        past the name check (e.g. a concurrent request took the name in between):
        creating a folder fails, uploading retries with the next free name
        """

        SpaceFiles.create_indexes(self.db)
        self.addCleanup(self.db.space_files.drop_indexes)

        self.space_files.create_folder(self.space_id, "Docs", CURRENT_ADMIN.username)
        self.space_files.add_file(self.space_id, "a.txt", b"a", CURRENT_ADMIN.username)

        with mock.patch.object(SpaceFiles, "_name_exists", return_value=False):
            self.assertRaises(
                FilenameCollisionError,
                self.space_files.create_folder,
                self.space_id,
                "docs",
                CURRENT_ADMIN.username,
            )

        # the first computed name is already taken when inserting
        with mock.patch.object(
            SpaceFiles, "_deduplicate_name", side_effect=["A.txt", "a (1).txt"]
        ):
            node = self.space_files.add_file(
                self.space_id, "A.txt", b"b", CURRENT_ADMIN.username
            )
        self.assertEqual(node["name"], "a (1).txt")
        self.assertEqual(self.db.space_files.count_documents({"type": "file"}), 2)

        # same name in another folder is fine
        folder = self.space_files.create_folder(
            self.space_id, "other", CURRENT_ADMIN.username
        )
        self.space_files.add_file(
            self.space_id, "a.txt", b"c", CURRENT_ADMIN.username, folder["_id"]
        )

    def test_add_file_deduplicates_name(self):
        """
        expect: uploading the same name twice yields a numeric suffix
        """

        first = self.space_files.add_file(
            self.space_id, "report.pdf", b"1", CURRENT_ADMIN.username
        )
        second = self.space_files.add_file(
            self.space_id, "Report.PDF", b"2", CURRENT_ADMIN.username
        )
        third = self.space_files.add_file(
            self.space_id, "report.pdf", b"3", CURRENT_ADMIN.username
        )
        self.assertEqual(first["name"], "report.pdf")
        self.assertEqual(second["name"], "Report (1).PDF")
        self.assertEqual(third["name"], "report (2).pdf")

    def test_add_file_error_invalid_name(self):
        """
        expect: InvalidFileNameError is raised for an invalid name
        """

        self.assertRaises(
            InvalidFileNameError,
            self.space_files.add_file,
            self.space_id,
            "",
            b"a",
            CURRENT_ADMIN.username,
        )

    def test_add_file_error_file_too_large(self):
        """
        expect: FileTooLargeError is raised when the content exceeds
        MAX_FILE_SIZE_BYTES, nothing is stored
        """

        self.space_files.MAX_FILE_SIZE_BYTES = 4
        self.assertRaises(
            FileTooLargeError,
            self.space_files.add_file,
            self.space_id,
            "big.bin",
            b"12345",
            CURRENT_ADMIN.username,
        )
        self.assertEqual(self.db.space_files.count_documents({}), 0)
        self.assertIsNone(self.fs.find_one({"filename": "big.bin"}))

    def test_add_file_error_storage_quota_exceeded(self):
        """
        expect: StorageQuotaExceededError is raised when the space would
        exceed MAX_SPACE_STORAGE_BYTES
        """

        self.space_files.MAX_SPACE_STORAGE_BYTES = 6
        self.space_files.add_file(
            self.space_id, "a.txt", b"1234", CURRENT_ADMIN.username
        )
        self.assertRaises(
            StorageQuotaExceededError,
            self.space_files.add_file,
            self.space_id,
            "b.txt",
            b"123",
            CURRENT_ADMIN.username,
        )
        self.assertIsNone(self.db.space_files.find_one({"name": "b.txt"}))

    def test_add_file_error_parent_doesnt_exist(self):
        """
        expect: FileNodeDoesntExistError is raised because the parent doesn't exist
        """

        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.add_file,
            self.space_id,
            "a.txt",
            b"a",
            CURRENT_ADMIN.username,
            ObjectId(),
        )

    def test_add_file_error_not_a_folder(self):
        """
        expect: NotAFolderError is raised because the parent is a file
        """

        file_node = self.space_files.add_file(
            self.space_id, "a.txt", b"a", CURRENT_ADMIN.username
        )
        self.assertRaises(
            NotAFolderError,
            self.space_files.add_file,
            self.space_id,
            "b.txt",
            b"b",
            CURRENT_ADMIN.username,
            file_node["_id"],
        )

    def test_add_file_error_read_only_parent(self):
        """
        expect: ReadOnlyNodeError is raised because the parent is the
        system folder for post files
        """

        post_file = self._post_file()
        self.assertRaises(
            ReadOnlyNodeError,
            self.space_files.add_file,
            self.space_id,
            "b.txt",
            b"b",
            CURRENT_ADMIN.username,
            post_file["parent"],
        )

    def test_add_post_file(self):
        """
        expect: the post file lands in the (automatically created) system
        folder and is marked as not manually uploaded
        """

        post_id = ObjectId()
        file_id = util.gridfs_put(
            self.fs, b"post", "attachment.txt", "text/plain", CURRENT_USER.username
        )
        node = self.space_files.add_post_file(
            self.space_id,
            CURRENT_USER.username,
            file_id,
            "attachment.txt",
            post_id,
        )

        folder = self.db.space_files.find_one({"_id": node["parent"]})
        self.assertEqual(folder["type"], "folder")
        self.assertEqual(folder["system"], SpaceFiles.SYSTEM_FOLDER_POST_FILES)
        self.assertEqual(folder["name"], SpaceFiles.POST_FILES_FOLDER_NAME)
        self.assertIsNone(folder["parent"])

        db_state = self.db.space_files.find_one({"_id": node["_id"]})
        self.assertEqual(db_state["file_id"], file_id)
        self.assertEqual(db_state["author"], CURRENT_USER.username)
        self.assertEqual(db_state["size"], 4)
        self.assertEqual(db_state["content_type"], "text/plain")
        self.assertFalse(db_state["manually_uploaded"])
        self.assertEqual(db_state["post_id"], post_id)

        # a second post file reuses the system folder and gets a unique name
        second = self._post_file("attachment.txt")
        self.assertEqual(second["parent"], node["parent"])
        self.assertEqual(second["name"], "attachment (1).txt")
        self.assertEqual(
            self.db.space_files.count_documents(
                {"space": self.space_id, "system": SpaceFiles.SYSTEM_FOLDER_POST_FILES}
            ),
            1,
        )

    def test_add_post_file_error_file_already_in_repo(self):
        """
        expect: FileAlreadyInRepoError is raised because the file is already
        referenced in the space
        """

        post_file = self._post_file()
        self.assertRaises(
            FileAlreadyInRepoError,
            self.space_files.add_post_file,
            self.space_id,
            CURRENT_USER.username,
            post_file["file_id"],
            "attachment.txt",
        )

    def test_add_post_file_error_file_doesnt_exist(self):
        """
        expect: FileDoesntExistError is raised because the file is not in gridfs
        """

        self.assertRaises(
            FileDoesntExistError,
            self.space_files.add_post_file,
            self.space_id,
            CURRENT_USER.username,
            ObjectId(),
            "attachment.txt",
        )

    def test_import_file(self):
        """
        expect: an existing gridfs file is added as a regular file, taking
        content type, size and creation date from gridfs
        """

        file_id = util.gridfs_put(
            self.fs, b"legacy", "old.txt", "text/plain", CURRENT_ADMIN.username
        )
        node = self.space_files.import_file(
            self.space_id, CURRENT_ADMIN.username, file_id, "old.txt"
        )

        db_state = self.db.space_files.find_one({"_id": node["_id"]})
        self.assertIsNone(db_state["parent"])
        self.assertEqual(db_state["file_id"], file_id)
        self.assertEqual(db_state["content_type"], "text/plain")
        self.assertEqual(db_state["size"], 6)
        self.assertTrue(db_state["manually_uploaded"])
        self.assertEqual(db_state["created"], self.fs.get(file_id).upload_date)

    def test_import_file_content_type_from_name(self):
        """
        expect: the mime type of an imported file is derived from its name,
        regardless of what the (legacy, client-supplied) gridfs field says
        """

        # write the legacy field directly, bypassing the deprecated property
        file_id = self.fs.put(b"legacy", filename="old.txt", contentType="text/html")
        node = self.space_files.import_file(
            self.space_id, CURRENT_ADMIN.username, file_id, "old.txt"
        )
        self.assertEqual(node["content_type"], "text/plain")

        # unknown extensions are generic binary data
        file_id = self.fs.put(b"unknown", filename="unknown.xyz123")
        node = self.space_files.import_file(
            self.space_id, CURRENT_ADMIN.username, file_id, "unknown.xyz123"
        )
        self.assertEqual(node["content_type"], "application/octet-stream")

    def test_import_file_error_file_already_in_repo(self):
        """
        expect: FileAlreadyInRepoError is raised because the file is already
        referenced in the space
        """

        node = self.space_files.add_file(
            self.space_id, "a.txt", b"a", CURRENT_ADMIN.username
        )
        self.assertRaises(
            FileAlreadyInRepoError,
            self.space_files.import_file,
            self.space_id,
            CURRENT_ADMIN.username,
            node["file_id"],
            "a.txt",
        )

    def test_import_file_error_file_doesnt_exist(self):
        """
        expect: FileDoesntExistError is raised because the file is not in gridfs
        """

        self.assertRaises(
            FileDoesntExistError,
            self.space_files.import_file,
            self.space_id,
            CURRENT_ADMIN.username,
            ObjectId(),
            "a.txt",
        )

    ###########################################################################
    # read operations
    ###########################################################################

    def test_get_node(self):
        """
        expect: successfully get a node by its id
        """

        folder = self.space_files.create_folder(
            self.space_id, "docs", CURRENT_ADMIN.username
        )
        node = self.space_files.get_node(self.space_id, str(folder["_id"]))
        self.assertEqual(node["_id"], folder["_id"])
        self.assertEqual(node["name"], "docs")

    def test_get_node_error_node_doesnt_exist(self):
        """
        expect: FileNodeDoesntExistError is raised because the node doesn't
        exist (in this space)
        """

        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.get_node,
            self.space_id,
            ObjectId(),
        )

        foreign = self.space_files.create_folder(
            ObjectId(), "foreign", CURRENT_ADMIN.username
        )
        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.get_node,
            self.space_id,
            foreign["_id"],
        )

    def test_get_node_by_file_id(self):
        """
        expect: successfully resolve a gridfs id to its node, None if the
        file is not part of a file share
        """

        node = self.space_files.add_file(
            self.space_id, "a.txt", b"a", CURRENT_ADMIN.username
        )
        found = self.space_files.get_node_by_file_id(node["file_id"])
        self.assertEqual(found["_id"], node["_id"])

        self.assertIsNone(self.space_files.get_node_by_file_id(ObjectId()))

    def test_list_folder(self):
        """
        expect: children are listed with system folders first, then folders,
        then files, each sorted by name
        """

        self.space_files.add_file(self.space_id, "b.txt", b"b", CURRENT_ADMIN.username)
        self.space_files.add_file(self.space_id, "A.txt", b"a", CURRENT_ADMIN.username)
        zeta = self.space_files.create_folder(
            self.space_id, "zeta", CURRENT_ADMIN.username
        )
        self.space_files.create_folder(self.space_id, "alpha", CURRENT_ADMIN.username)
        self._post_file()
        self.space_files.add_file(
            self.space_id, "inner.txt", b"i", CURRENT_ADMIN.username, zeta["_id"]
        )

        root = self.space_files.list_folder(self.space_id)
        self.assertEqual(
            [node["name"] for node in root],
            [SpaceFiles.POST_FILES_FOLDER_NAME, "alpha", "zeta", "A.txt", "b.txt"],
        )

        inner = self.space_files.list_folder(self.space_id, zeta["_id"])
        self.assertEqual([node["name"] for node in inner], ["inner.txt"])

        # ids may be passed as str as well
        again = self.space_files.list_folder(self.space_id, str(zeta["_id"]))
        self.assertEqual([node["name"] for node in again], ["inner.txt"])

    def test_list_folder_error_folder_doesnt_exist(self):
        """
        expect: FileNodeDoesntExistError is raised because the folder doesn't exist
        """

        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.list_folder,
            self.space_id,
            ObjectId(),
        )

    def test_list_folder_error_not_a_folder(self):
        """
        expect: NotAFolderError is raised because the node is a file
        """

        file_node = self.space_files.add_file(
            self.space_id, "a.txt", b"a", CURRENT_ADMIN.username
        )
        self.assertRaises(
            NotAFolderError,
            self.space_files.list_folder,
            self.space_id,
            file_node["_id"],
        )

    def test_get_path(self):
        """
        expect: the path lists the ancestors from the root down to the node
        """

        a = self.space_files.create_folder(self.space_id, "a", CURRENT_ADMIN.username)
        b = self.space_files.create_folder(
            self.space_id, "b", CURRENT_ADMIN.username, a["_id"]
        )
        f = self.space_files.add_file(
            self.space_id, "f.txt", b"f", CURRENT_ADMIN.username, b["_id"]
        )

        self.assertEqual(self.space_files.get_path(self.space_id, None), [])

        path = self.space_files.get_path(self.space_id, f["_id"])
        self.assertEqual(
            [(p["_id"], p["name"], p["type"]) for p in path],
            [
                (a["_id"], "a", "folder"),
                (b["_id"], "b", "folder"),
                (f["_id"], "f.txt", "file"),
            ],
        )

        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.get_path,
            self.space_id,
            ObjectId(),
        )

    def test_get_folder_tree(self):
        """
        expect: all folders are returned as a nested tree, files are omitted
        """

        a = self.space_files.create_folder(self.space_id, "a", CURRENT_ADMIN.username)
        self.space_files.create_folder(
            self.space_id, "b", CURRENT_ADMIN.username, a["_id"]
        )
        self.space_files.create_folder(self.space_id, "c", CURRENT_ADMIN.username)
        self.space_files.add_file(
            self.space_id, "f.txt", b"f", CURRENT_ADMIN.username, a["_id"]
        )
        self._post_file()

        tree = self.space_files.get_folder_tree(self.space_id)
        self.assertEqual(
            [node["name"] for node in tree],
            [SpaceFiles.POST_FILES_FOLDER_NAME, "a", "c"],
        )
        self.assertEqual([node["name"] for node in tree[1]["children"]], ["b"])
        self.assertEqual(tree[1]["children"][0]["children"], [])
        self.assertEqual(tree[2]["children"], [])

        self.assertEqual(self.space_files.get_folder_tree(ObjectId()), [])

    def test_search(self):
        """
        expect: case-insensitive substring search on names across the whole
        tree, folders first, each result carries its parent path
        """

        a = self.space_files.create_folder(
            self.space_id, "Reports", CURRENT_ADMIN.username
        )
        self.space_files.add_file(
            self.space_id,
            "annual_report.pdf",
            b"r",
            CURRENT_ADMIN.username,
            a["_id"],
        )
        self.space_files.add_file(
            self.space_id, "notes.txt", b"n", CURRENT_ADMIN.username
        )
        # same name in another space must not be found
        self.space_files.add_file(
            ObjectId(), "report_foreign.pdf", b"x", CURRENT_ADMIN.username
        )

        results = self.space_files.search(self.space_id, "REPORT")
        self.assertEqual(
            [node["name"] for node in results], ["Reports", "annual_report.pdf"]
        )
        self.assertEqual(results[0]["path"], [])
        self.assertEqual([p["_id"] for p in results[1]["path"]], [a["_id"]])

        self.assertEqual(self.space_files.search(self.space_id, "   "), [])
        self.assertEqual(self.space_files.search(self.space_id, "nothing"), [])

        # regex special characters are matched literally
        self.space_files.add_file(
            self.space_id, "a (1).txt", b"a", CURRENT_ADMIN.username
        )
        self.assertEqual(
            [node["name"] for node in self.space_files.search(self.space_id, "(1)")],
            ["a (1).txt"],
        )

    def test_get_storage_usage(self):
        """
        expect: the sum of all file sizes of the space
        """

        self.assertEqual(self.space_files.get_storage_usage(self.space_id), 0)
        self.space_files.add_file(
            self.space_id, "a.txt", b"aaaa", CURRENT_ADMIN.username
        )
        self._post_file(content=b"pp")
        self.assertEqual(self.space_files.get_storage_usage(self.space_id), 6)

    ###########################################################################
    # rename
    ###########################################################################

    def test_rename_node(self):
        """
        expect: successfully rename a folder and a file (including the
        gridfs filename)
        """

        folder = self.space_files.create_folder(
            self.space_id, "docs", CURRENT_ADMIN.username
        )
        renamed = self.space_files.rename_node(
            self.space_id, folder["_id"], " documents "
        )
        self.assertEqual(renamed["name"], "documents")
        self.assertEqual(
            self.db.space_files.find_one({"_id": folder["_id"]})["name"], "documents"
        )

        file_node = self.space_files.add_file(
            self.space_id, "a.txt", b"a", CURRENT_ADMIN.username
        )
        self.space_files.rename_node(self.space_id, file_node["_id"], "b.txt")
        self.assertEqual(
            self.db.space_files.find_one({"_id": file_node["_id"]})["name"], "b.txt"
        )
        self.assertEqual(self.fs.get(file_node["file_id"]).filename, "b.txt")

        # renaming to the same name with different case is allowed
        self.space_files.rename_node(self.space_id, file_node["_id"], "B.txt")

    def test_rename_node_error_node_doesnt_exist(self):
        """
        expect: FileNodeDoesntExistError is raised because the node doesn't exist
        """

        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.rename_node,
            self.space_id,
            ObjectId(),
            "x",
        )

    def test_rename_node_error_read_only(self):
        """
        expect: ReadOnlyNodeError is raised for the system folder and post files
        """

        post_file = self._post_file()
        self.assertRaises(
            ReadOnlyNodeError,
            self.space_files.rename_node,
            self.space_id,
            post_file["parent"],
            "x",
        )
        self.assertRaises(
            ReadOnlyNodeError,
            self.space_files.rename_node,
            self.space_id,
            post_file["_id"],
            "x",
        )

    def test_rename_node_error_invalid_name(self):
        """
        expect: InvalidFileNameError is raised for an invalid name
        """

        folder = self.space_files.create_folder(
            self.space_id, "docs", CURRENT_ADMIN.username
        )
        self.assertRaises(
            InvalidFileNameError,
            self.space_files.rename_node,
            self.space_id,
            folder["_id"],
            "",
        )

    def test_rename_node_error_name_collision(self):
        """
        expect: FilenameCollisionError is raised because a sibling with the
        same name exists
        """

        self.space_files.create_folder(self.space_id, "docs", CURRENT_ADMIN.username)
        other = self.space_files.create_folder(
            self.space_id, "other", CURRENT_ADMIN.username
        )
        self.assertRaises(
            FilenameCollisionError,
            self.space_files.rename_node,
            self.space_id,
            other["_id"],
            "DOCS",
        )

    ###########################################################################
    # move
    ###########################################################################

    def test_move_node(self):
        """
        expect: successfully move a file into a folder, a folder into another
        folder and back to the root
        """

        a = self.space_files.create_folder(self.space_id, "a", CURRENT_ADMIN.username)
        b = self.space_files.create_folder(self.space_id, "b", CURRENT_ADMIN.username)
        f = self.space_files.add_file(
            self.space_id, "f.txt", b"f", CURRENT_ADMIN.username
        )

        moved = self.space_files.move_node(self.space_id, f["_id"], a["_id"])
        self.assertEqual(moved["parent"], a["_id"])
        self.assertEqual(
            self.db.space_files.find_one({"_id": f["_id"]})["parent"], a["_id"]
        )

        self.space_files.move_node(self.space_id, a["_id"], b["_id"])
        self.assertEqual(
            self.db.space_files.find_one({"_id": a["_id"]})["parent"], b["_id"]
        )
        # the file inside "a" is still inside "a"
        self.assertEqual(
            self.db.space_files.find_one({"_id": f["_id"]})["parent"], a["_id"]
        )

        self.space_files.move_node(self.space_id, a["_id"], None)
        self.assertIsNone(self.db.space_files.find_one({"_id": a["_id"]})["parent"])

    def test_move_node_error_node_doesnt_exist(self):
        """
        expect: FileNodeDoesntExistError is raised because the node or the
        target doesn't exist
        """

        a = self.space_files.create_folder(self.space_id, "a", CURRENT_ADMIN.username)
        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.move_node,
            self.space_id,
            ObjectId(),
            a["_id"],
        )
        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.move_node,
            self.space_id,
            a["_id"],
            ObjectId(),
        )

    def test_move_node_error_not_a_folder(self):
        """
        expect: NotAFolderError is raised because the target is a file
        """

        a = self.space_files.create_folder(self.space_id, "a", CURRENT_ADMIN.username)
        f = self.space_files.add_file(
            self.space_id, "f.txt", b"f", CURRENT_ADMIN.username
        )
        self.assertRaises(
            NotAFolderError,
            self.space_files.move_node,
            self.space_id,
            a["_id"],
            f["_id"],
        )

    def test_move_node_error_read_only(self):
        """
        expect: ReadOnlyNodeError is raised for post files, the system folder
        and when the target is the system folder
        """

        post_file = self._post_file()
        a = self.space_files.create_folder(self.space_id, "a", CURRENT_ADMIN.username)

        self.assertRaises(
            ReadOnlyNodeError,
            self.space_files.move_node,
            self.space_id,
            post_file["_id"],
            a["_id"],
        )
        self.assertRaises(
            ReadOnlyNodeError,
            self.space_files.move_node,
            self.space_id,
            post_file["parent"],
            a["_id"],
        )
        self.assertRaises(
            ReadOnlyNodeError,
            self.space_files.move_node,
            self.space_id,
            a["_id"],
            post_file["parent"],
        )

    def test_move_node_error_invalid_move_target(self):
        """
        expect: InvalidMoveTargetError is raised when moving a folder into
        itself or into one of its descendants
        """

        a = self.space_files.create_folder(self.space_id, "a", CURRENT_ADMIN.username)
        b = self.space_files.create_folder(
            self.space_id, "b", CURRENT_ADMIN.username, a["_id"]
        )
        self.assertRaises(
            InvalidMoveTargetError,
            self.space_files.move_node,
            self.space_id,
            a["_id"],
            a["_id"],
        )
        self.assertRaises(
            InvalidMoveTargetError,
            self.space_files.move_node,
            self.space_id,
            a["_id"],
            b["_id"],
        )

    def test_move_node_error_depth_exceeded(self):
        """
        expect: FolderDepthExceededError is raised when the moved subtree
        would exceed MAX_FOLDER_DEPTH
        """

        # chain of MAX_FOLDER_DEPTH - 1 folders
        parent_id = None
        for level in range(SpaceFiles.MAX_FOLDER_DEPTH - 1):
            folder = self.space_files.create_folder(
                self.space_id,
                "level{}".format(level),
                CURRENT_ADMIN.username,
                parent_id,
            )
            parent_id = folder["_id"]

        # a subtree of height 2 cannot be appended there, height 1 can
        x = self.space_files.create_folder(self.space_id, "x", CURRENT_ADMIN.username)
        self.space_files.create_folder(
            self.space_id, "y", CURRENT_ADMIN.username, x["_id"]
        )
        z = self.space_files.create_folder(self.space_id, "z", CURRENT_ADMIN.username)

        self.assertRaises(
            FolderDepthExceededError,
            self.space_files.move_node,
            self.space_id,
            x["_id"],
            parent_id,
        )
        self.space_files.move_node(self.space_id, z["_id"], parent_id)

    def test_move_node_error_name_collision(self):
        """
        expect: FilenameCollisionError is raised because the target folder
        already contains a node with the same name
        """

        a = self.space_files.create_folder(self.space_id, "a", CURRENT_ADMIN.username)
        self.space_files.add_file(
            self.space_id, "f.txt", b"1", CURRENT_ADMIN.username, a["_id"]
        )
        f = self.space_files.add_file(
            self.space_id, "F.txt", b"2", CURRENT_ADMIN.username
        )
        self.assertRaises(
            FilenameCollisionError,
            self.space_files.move_node,
            self.space_id,
            f["_id"],
            a["_id"],
        )

    ###########################################################################
    # copy
    ###########################################################################

    def test_copy_file(self):
        """
        expect: a copy of a post file is a regular file with a new gridfs
        file, the same content and the copying user as author
        """

        post_file = self._post_file(content=b"original")
        a = self.space_files.create_folder(self.space_id, "a", CURRENT_ADMIN.username)

        copy = self.space_files.copy_file(
            self.space_id, post_file["_id"], a["_id"], CURRENT_ADMIN.username
        )
        db_state = self.db.space_files.find_one({"_id": copy["_id"]})
        self.assertEqual(db_state["parent"], a["_id"])
        self.assertEqual(db_state["name"], post_file["name"])
        self.assertEqual(db_state["author"], CURRENT_ADMIN.username)
        self.assertTrue(db_state["manually_uploaded"])
        self.assertIsNone(db_state["post_id"])
        self.assertEqual(db_state["size"], 8)
        self.assertNotEqual(db_state["file_id"], post_file["file_id"])
        self.assertEqual(self.fs.get(db_state["file_id"]).read(), b"original")
        # the original is untouched
        self.assertTrue(self.fs.exists(post_file["file_id"]))

        # a second copy into the same folder gets a suffix, copying to root works
        second = self.space_files.copy_file(
            self.space_id, post_file["_id"], a["_id"], CURRENT_ADMIN.username
        )
        self.assertEqual(second["name"], "attachment (1).txt")
        third = self.space_files.copy_file(
            self.space_id, copy["_id"], None, CURRENT_USER.username
        )
        self.assertIsNone(third["parent"])
        self.assertEqual(third["author"], CURRENT_USER.username)

        # the copy is modifiable
        self.space_files.rename_node(self.space_id, copy["_id"], "renamed.txt")
        self.space_files.delete_node(self.space_id, copy["_id"])

    def test_copy_file_error_node_doesnt_exist(self):
        """
        expect: FileNodeDoesntExistError is raised because the source or the
        target doesn't exist
        """

        f = self.space_files.add_file(
            self.space_id, "f.txt", b"f", CURRENT_ADMIN.username
        )
        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.copy_file,
            self.space_id,
            ObjectId(),
            None,
            CURRENT_ADMIN.username,
        )
        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.copy_file,
            self.space_id,
            f["_id"],
            ObjectId(),
            CURRENT_ADMIN.username,
        )

    def test_copy_file_error_not_a_file(self):
        """
        expect: NotAFileError is raised because the source is a folder
        """

        a = self.space_files.create_folder(self.space_id, "a", CURRENT_ADMIN.username)
        self.assertRaises(
            NotAFileError,
            self.space_files.copy_file,
            self.space_id,
            a["_id"],
            None,
            CURRENT_ADMIN.username,
        )

    def test_copy_file_error_not_a_folder(self):
        """
        expect: NotAFolderError is raised because the target is a file
        """

        f = self.space_files.add_file(
            self.space_id, "f.txt", b"f", CURRENT_ADMIN.username
        )
        self.assertRaises(
            NotAFolderError,
            self.space_files.copy_file,
            self.space_id,
            f["_id"],
            f["_id"],
            CURRENT_ADMIN.username,
        )

    def test_copy_file_error_read_only_target(self):
        """
        expect: ReadOnlyNodeError is raised because the target is the system folder
        """

        post_file = self._post_file()
        self.assertRaises(
            ReadOnlyNodeError,
            self.space_files.copy_file,
            self.space_id,
            post_file["_id"],
            post_file["parent"],
            CURRENT_ADMIN.username,
        )

    def test_copy_file_error_storage_quota_exceeded(self):
        """
        expect: StorageQuotaExceededError is raised because the copy would
        exceed MAX_SPACE_STORAGE_BYTES
        """

        f = self.space_files.add_file(
            self.space_id, "f.txt", b"12345", CURRENT_ADMIN.username
        )
        self.space_files.MAX_SPACE_STORAGE_BYTES = 8
        self.assertRaises(
            StorageQuotaExceededError,
            self.space_files.copy_file,
            self.space_id,
            f["_id"],
            None,
            CURRENT_ADMIN.username,
        )

    def test_copy_file_error_file_doesnt_exist(self):
        """
        expect: FileDoesntExistError is raised because the source is missing in gridfs
        """

        f = self.space_files.add_file(
            self.space_id, "f.txt", b"f", CURRENT_ADMIN.username
        )
        self.fs.delete(f["file_id"])
        self.assertRaises(
            FileDoesntExistError,
            self.space_files.copy_file,
            self.space_id,
            f["_id"],
            None,
            CURRENT_ADMIN.username,
        )

    ###########################################################################
    # delete
    ###########################################################################

    def test_delete_node(self):
        """
        expect: deleting a file removes it from gridfs, deleting a folder
        removes everything below it
        """

        f = self.space_files.add_file(
            self.space_id, "f.txt", b"f", CURRENT_ADMIN.username
        )
        self.space_files.delete_node(self.space_id, f["_id"])
        self.assertIsNone(self.db.space_files.find_one({"_id": f["_id"]}))
        self.assertFalse(self.fs.exists(f["file_id"]))

        a = self.space_files.create_folder(self.space_id, "a", CURRENT_ADMIN.username)
        b = self.space_files.create_folder(
            self.space_id, "b", CURRENT_ADMIN.username, a["_id"]
        )
        inner = self.space_files.add_file(
            self.space_id, "inner.txt", b"i", CURRENT_ADMIN.username, b["_id"]
        )
        untouched = self.space_files.add_file(
            self.space_id, "untouched.txt", b"u", CURRENT_ADMIN.username
        )

        self.space_files.delete_node(self.space_id, a["_id"])
        self.assertEqual(
            self.db.space_files.count_documents(
                {"_id": {"$in": [a["_id"], b["_id"], inner["_id"]]}}
            ),
            0,
        )
        self.assertFalse(self.fs.exists(inner["file_id"]))
        self.assertIsNotNone(self.db.space_files.find_one({"_id": untouched["_id"]}))
        self.assertTrue(self.fs.exists(untouched["file_id"]))

    def test_delete_node_error_node_doesnt_exist(self):
        """
        expect: FileNodeDoesntExistError is raised because the node doesn't exist
        """

        self.assertRaises(
            FileNodeDoesntExistError,
            self.space_files.delete_node,
            self.space_id,
            ObjectId(),
        )

    def test_delete_node_error_read_only(self):
        """
        expect: ReadOnlyNodeError is raised for the system folder and post files
        """

        post_file = self._post_file()
        self.assertRaises(
            ReadOnlyNodeError,
            self.space_files.delete_node,
            self.space_id,
            post_file["parent"],
        )
        self.assertRaises(
            ReadOnlyNodeError,
            self.space_files.delete_node,
            self.space_id,
            post_file["_id"],
        )
        self.assertTrue(self.fs.exists(post_file["file_id"]))

    def test_remove_post_file(self):
        """
        expect: the reference to the post file is removed, the gridfs file
        is kept (the post takes care of that)
        """

        post_file = self._post_file()
        self.space_files.remove_post_file(self.space_id, post_file["file_id"])
        self.assertIsNone(self.db.space_files.find_one({"_id": post_file["_id"]}))
        self.assertTrue(self.fs.exists(post_file["file_id"]))

    def test_remove_post_file_error_file_doesnt_exist(self):
        """
        expect: FileDoesntExistError is raised because no post file with this
        id is referenced in the space (manually uploaded files don't count)
        """

        self.assertRaises(
            FileDoesntExistError,
            self.space_files.remove_post_file,
            self.space_id,
            ObjectId(),
        )

        f = self.space_files.add_file(
            self.space_id, "f.txt", b"f", CURRENT_ADMIN.username
        )
        self.assertRaises(
            FileDoesntExistError,
            self.space_files.remove_post_file,
            self.space_id,
            f["file_id"],
        )

    def test_delete_all_of_space(self):
        """
        expect: all nodes of the space are removed, manually uploaded gridfs
        files are deleted, post files are kept in gridfs, other spaces are
        untouched
        """

        f = self.space_files.add_file(
            self.space_id, "f.txt", b"f", CURRENT_ADMIN.username
        )
        post_file = self._post_file()
        other_space_id = ObjectId()
        other = self.space_files.add_file(
            other_space_id, "o.txt", b"o", CURRENT_ADMIN.username
        )

        self.space_files.delete_all_of_space(self.space_id)

        self.assertEqual(
            self.db.space_files.count_documents({"space": self.space_id}), 0
        )
        self.assertFalse(self.fs.exists(f["file_id"]))
        self.assertTrue(self.fs.exists(post_file["file_id"]))
        self.assertIsNotNone(self.db.space_files.find_one({"_id": other["_id"]}))
        self.assertTrue(self.fs.exists(other["file_id"]))


class SpaceFilesMigrationTest(BaseResourceTestCase):
    """
    the migration of the legacy flat file repository of spaces (embedded
    `files` array) into the hierarchical file share
    """

    def setUp(self) -> None:
        super().setUp()
        self.fs = gridfs.GridFS(self.db)
        self.space_id = ObjectId()

    def tearDown(self) -> None:
        self.db.spaces.delete_many({})
        self.db.space_files.delete_many({})
        self.db.posts.delete_many({})
        for fs_file in self.fs.find():
            self.fs.delete(fs_file._id)
        super().tearDown()

    def _put(self, name: str) -> ObjectId:
        return util.gridfs_put(
            self.fs, b"x", name, "text/plain", CURRENT_ADMIN.username
        )

    def _insert_post(self, files: list, is_repost: bool = False) -> ObjectId:
        post_id = ObjectId()
        self.db.posts.insert_one(
            {
                "_id": post_id,
                "author": CURRENT_USER.username,
                "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                "text": "test",
                "space": self.space_id,
                "pinned": False,
                "isRepost": is_repost,
                "files": [
                    {
                        "file_id": file_id,
                        "file_name": name,
                        "file_type": "text/plain",
                        "author": CURRENT_USER.username,
                    }
                    for file_id, name in files
                ],
                "comments": [],
                "likers": [],
            }
        )
        return post_id

    def test_migrate(self):
        """
        expect: manually uploaded files land in the root, post attachments in
        the post files folder (linked to their post, reposts are skipped),
        orphaned post file entries become regular files, missing gridfs files
        are skipped and the legacy `files` array is removed
        """

        manual = self._put("notes.txt")
        manual_same_name = self._put("Notes.txt")
        attachment = self._put("slides.pdf")
        orphaned = self._put("old.txt")
        reposted = self._put("repost.txt")
        missing = ObjectId()

        post_id = self._insert_post([(attachment, "slides.pdf")])
        self._insert_post([(reposted, "repost.txt")], is_repost=True)
        self.db.spaces.insert_one(
            {
                "_id": self.space_id,
                "name": "test",
                "members": [CURRENT_ADMIN.username],
                "admins": [CURRENT_ADMIN.username],
                "files": [
                    {
                        "author": CURRENT_ADMIN.username,
                        "file_id": manual,
                        "file_name": "notes.txt",
                        "manually_uploaded": True,
                    },
                    {
                        "author": CURRENT_USER.username,
                        "file_id": manual_same_name,
                        "file_name": "Notes.txt",
                        "manually_uploaded": True,
                    },
                    {
                        "author": CURRENT_USER.username,
                        "file_id": attachment,
                        "file_name": "slides.pdf",
                        "manually_uploaded": False,
                    },
                    # legacy entries had no manually_uploaded flag for post files
                    {
                        "author": CURRENT_USER.username,
                        "file_id": orphaned,
                        "file_name": "old.txt",
                    },
                    {
                        "author": CURRENT_ADMIN.username,
                        "file_id": missing,
                        "file_name": "gone.txt",
                        "manually_uploaded": True,
                    },
                ],
            }
        )

        stats = migrate_space_files(self.db)
        self.assertEqual(
            stats, {"spaces": 1, "imported": 3, "post_files": 1, "missing": 1}
        )

        root = {
            node["name"]: node
            for node in self.db.space_files.find(
                {"space": self.space_id, "parent": None}
            )
        }
        self.assertEqual(
            set(root.keys()),
            {
                "notes.txt",
                "Notes (1).txt",
                "old.txt",
                SpaceFiles.POST_FILES_FOLDER_NAME,
            },
        )
        self.assertEqual(root["notes.txt"]["file_id"], manual)
        self.assertEqual(root["notes.txt"]["author"], CURRENT_ADMIN.username)
        self.assertTrue(root["notes.txt"]["manually_uploaded"])
        self.assertEqual(root["Notes (1).txt"]["file_id"], manual_same_name)
        self.assertEqual(root["old.txt"]["file_id"], orphaned)
        self.assertTrue(root["old.txt"]["manually_uploaded"])

        post_files = list(
            self.db.space_files.find(
                {"parent": root[SpaceFiles.POST_FILES_FOLDER_NAME]["_id"]}
            )
        )
        self.assertEqual(len(post_files), 1)
        self.assertEqual(post_files[0]["file_id"], attachment)
        self.assertEqual(post_files[0]["post_id"], post_id)
        self.assertFalse(post_files[0]["manually_uploaded"])

        self.assertIsNone(self.db.space_files.find_one({"file_id": reposted}))
        self.assertNotIn("files", self.db.spaces.find_one({"_id": self.space_id}))

    def test_migrate_idempotent(self):
        """
        expect: a second run (or a run after an interruption) doesn't import
        anything twice
        """

        manual = self._put("notes.txt")
        attachment = self._put("slides.pdf")
        self._insert_post([(attachment, "slides.pdf")])
        self.db.spaces.insert_one(
            {
                "_id": self.space_id,
                "name": "test",
                "files": [
                    {
                        "author": CURRENT_ADMIN.username,
                        "file_id": manual,
                        "file_name": "notes.txt",
                        "manually_uploaded": True,
                    }
                ],
            }
        )

        migrate_space_files(self.db)
        node_count = self.db.space_files.count_documents({})

        # simulate an interrupted run: the files array is still there
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$set": {"files": [{"file_id": manual, "file_name": "notes.txt"}]}},
        )
        stats = migrate_space_files(self.db)
        self.assertEqual(stats["imported"], 0)
        self.assertEqual(stats["post_files"], 0)
        self.assertEqual(self.db.space_files.count_documents({}), node_count)

        # nothing left to migrate
        self.assertEqual(migrate_space_files(self.db)["spaces"], 0)


class PostSpaceACLResourceIntegrationTest(BaseResourceTestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_delete_space_side_effects(self):
        """
        expect: when deleting a space, all posts and corresponding ACL
        entries get deleted as well
        """

        # TODO


class PlanResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        # manually set up a VEPlan in the db
        self.plan_id = ObjectId()
        self.step = self.create_step("test")
        self.target_group = self.create_target_group("test")
        self.institution = self.create_institution("test")
        self.lecture = self.create_lecture("test")
        self.physical_mobility = self.create_physical_mobility("test")
        self.evaluation = self.create_evaluation("test")
        self.individual_learning_goal = self.create_individual_learning_goal("test")
        self.default_plan = {
            "_id": self.plan_id,
            "author": "test_user",
            "read_access": ["test_user", "test_admin"],
            "write_access": ["test_user"],
            "creation_timestamp": datetime.now(timezone.utc),
            "last_modified": datetime.now(timezone.utc),
            "name": "test",
            "partners": ["test_admin"],
            "institutions": [self.institution.to_dict()],
            "topics": ["test", "test"],
            "lectures": [self.lecture.to_dict()],
            "major_learning_goals": ["test", "test"],
            "individual_learning_goals": [self.individual_learning_goal.to_dict()],
            "methodical_approaches": ["test"],
            "target_groups": [self.target_group.to_dict()],
            "languages": ["test", "test"],
            "evaluation": [self.evaluation.to_dict()],
            "timestamp_from": self.step.timestamp_from,
            "timestamp_to": self.step.timestamp_to,
            "involved_parties": ["test", "test"],
            "realization": "test",
            "physical_mobility": True,
            "physical_mobilities": [self.physical_mobility.to_dict()],
            "learning_env": "test",
            "checklist": [
                {
                    "username": "test_user",
                    "technology": False,
                    "exam_regulations": False,
                },
                {
                    "username": "test_admin",
                    "technology": True,
                    "exam_regulations": True,
                },
            ],
            "duration": self.step.duration.total_seconds(),
            "workload": self.step.workload,
            "steps": [self.step.to_dict()],
            "is_good_practise": False,
            "is_good_practise_planned": False,
            "is_good_practise_ro": False,
            "abstract": "test",
            "underlying_ve_model": "test",
            "reflection": "test",
            "literature": "test",
            "evaluation_file": None,
            "literature_files": [],
            "progress": {
                "name": "not_started",
                "institutions": "not_started",
                "topics": "not_started",
                "lectures": "not_started",
                "learning_goals": "not_started",
                "methodical_approaches": "not_started",
                "target_groups": "not_started",
                "languages": "not_started",
                "evaluation": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        }
        self.db.plans.insert_one(self.default_plan)

        # insert default profiles
        self.db.profiles.insert_many(
            [
                {
                    "username": CURRENT_ADMIN.username,
                    "role": "admin",
                    "follows": [],
                    "bio": "",
                    "institution": "",
                    "profile_pic": "default_profile_pic.jpg",
                    "first_name": "",
                    "last_name": "",
                    "gender": "",
                    "address": "",
                    "birthday": "",
                    "experience": [""],
                    "expertise": "",
                    "languages": [],
                    "ve_ready": True,
                    "excluded_from_matching": False,
                    "ve_interests": [""],
                    "ve_goals": [""],
                    "preferred_formats": [""],
                    "research_tags": [],
                    "courses": [],
                    "educations": [],
                    "work_experience": [],
                    "ve_window": [],
                    "notification_settings": {
                        "messages": "email",
                        "ve_invite": "email",
                        "group_invite": "email",
                        "system": "email",
                    },
                    "achievements": {
                        "social": {"level": 0, "progress": 0, "next_level": 10},
                        "ve": {"level": 0, "progress": 0, "next_level": 10},
                        "tracking": {
                            "good_practice_plans": [],
                            "unique_partners": [],
                        },
                    },
                    "chosen_achievement": {"type": "", "level": 0},
                },
                {
                    "username": CURRENT_USER.username,
                    "role": "user",
                    "follows": [],
                    "bio": "",
                    "institution": "",
                    "profile_pic": "default_profile_pic.jpg",
                    "first_name": "",
                    "last_name": "",
                    "gender": "",
                    "address": "",
                    "birthday": "",
                    "experience": [""],
                    "expertise": "",
                    "languages": [],
                    "ve_ready": True,
                    "excluded_from_matching": False,
                    "ve_interests": [""],
                    "ve_goals": [""],
                    "preferred_formats": [""],
                    "research_tags": [],
                    "courses": [],
                    "educations": [],
                    "work_experience": [],
                    "ve_window": [],
                    "notification_settings": {
                        "messages": "email",
                        "ve_invite": "email",
                        "group_invite": "email",
                        "system": "email",
                    },
                    "achievements": {
                        "social": {"level": 0, "progress": 0, "next_level": 10},
                        "ve": {"level": 0, "progress": 0, "next_level": 10},
                        "tracking": {
                            "good_practice_plans": [],
                            "unique_partners": [],
                        },
                    },
                    "chosen_achievement": {"type": "", "level": 0},
                },
            ]
        )

        # initialize planner
        self.planner = VEPlanResource(self.db)

    def tearDown(self) -> None:
        # delete all plans
        self.db.plans.delete_many({})
        self.db.profiles.delete_many({})

        # delete all created files in gridfs
        fs = gridfs.GridFS(self.db)
        for fs_file in fs.find():
            fs.delete(fs_file._id)

        return super().tearDown()

    def test_check_plan_exists(self):
        """
        expect: True is returned if a plan with the given _id exists, False otherwise
        """

        self.assertTrue(self.planner._check_plan_exists(self.plan_id))
        self.assertFalse(self.planner._check_plan_exists(ObjectId()))

    def test_check_below_max_literature_files(self):
        """
        expect: True is returned if the amount of literature files is below the maximum (5),
        False otherwise
        """

        self.assertTrue(self.planner._check_below_max_literature_files(self.plan_id))

        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "literature_files": [
                        {"file_id": ObjectId(), "file_name": "test_file"}
                        for _ in range(5)
                    ]
                }
            },
        )
        self.assertFalse(self.planner._check_below_max_literature_files(self.plan_id))

    def test_check_below_max_literature_files_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with this _id exists
        """

        self.assertRaises(
            PlanDoesntExistError,
            self.planner._check_below_max_literature_files,
            ObjectId(),
        )

    def test_get_plan(self):
        """
        expect: sucessfully get the plan from the db, both by passing the _id as str
        or as an ObjectId
        """

        # test with both input types (str and ObjectId)
        for id_input in [self.plan_id, str(self.plan_id)]:
            with self.subTest(id_input=id_input):
                plan = self.planner.get_plan(id_input)
                self.assertIsInstance(plan, VEPlan)
                self.assertEqual(plan._id, self.default_plan["_id"])
                self.assertEqual(plan.author, self.default_plan["author"])
                self.assertEqual(plan.name, self.default_plan["name"])
                self.assertEqual(plan.partners, self.default_plan["partners"])
                self.assertEqual(
                    [institution.to_dict() for institution in plan.institutions],
                    self.default_plan["institutions"],
                )
                self.assertEqual(plan.topics, self.default_plan["topics"])
                self.assertEqual(
                    [lecture.to_dict() for lecture in plan.lectures],
                    self.default_plan["lectures"],
                )
                self.assertEqual(
                    plan.major_learning_goals, self.default_plan["major_learning_goals"]
                )
                self.assertEqual(
                    [
                        individual_learning_goal.to_dict()
                        for individual_learning_goal in plan.individual_learning_goals
                    ],
                    self.default_plan["individual_learning_goals"],
                )
                self.assertEqual(
                    plan.methodical_approaches,
                    self.default_plan["methodical_approaches"],
                )
                self.assertEqual(
                    [target_group.to_dict() for target_group in plan.target_groups],
                    self.default_plan["target_groups"],
                )
                self.assertEqual(plan.languages, self.default_plan["languages"])
                self.assertEqual(
                    [evaluation.to_dict() for evaluation in plan.evaluation],
                    self.default_plan["evaluation"],
                )
                self.assertEqual(
                    plan.involved_parties, self.default_plan["involved_parties"]
                )
                self.assertEqual(plan.realization, self.default_plan["realization"])
                self.assertEqual(
                    plan.physical_mobility, self.default_plan["physical_mobility"]
                )
                self.assertEqual(
                    [mobility.to_dict() for mobility in plan.physical_mobilities],
                    self.default_plan["physical_mobilities"],
                )
                self.assertEqual(plan.learning_env, self.default_plan["learning_env"])
                self.assertEqual(plan.checklist, self.default_plan["checklist"])
                self.assertEqual(
                    [step.to_dict() for step in plan.steps], self.default_plan["steps"]
                )
                self.assertEqual(
                    plan.is_good_practise, self.default_plan["is_good_practise"]
                )
                self.assertEqual(
                    plan.is_good_practise_planned,
                    self.default_plan["is_good_practise_planned"],
                )
                self.assertEqual(
                    plan.is_good_practise_ro, self.default_plan["is_good_practise_ro"]
                )
                self.assertEqual(plan.abstract, self.default_plan["abstract"])
                self.assertEqual(
                    plan.underlying_ve_model, self.default_plan["underlying_ve_model"]
                )
                self.assertEqual(plan.reflection, self.default_plan["reflection"])
                self.assertEqual(plan.literature, self.default_plan["literature"])
                self.assertEqual(
                    plan.evaluation_file, self.default_plan["evaluation_file"]
                )
                self.assertEqual(
                    plan.literature_files, self.default_plan["literature_files"]
                )
                self.assertEqual(plan.timestamp_from, self.step.timestamp_from)
                self.assertEqual(plan.timestamp_to, self.step.timestamp_to)
                self.assertEqual(plan.workload, self.step.workload)
                self.assertEqual(plan.duration, self.step.duration)
                self.assertEqual(plan.progress, self.default_plan["progress"])
                self.assertIsNotNone(plan.creation_timestamp)
                self.assertIsNotNone(plan.last_modified)

    def test_get_plan_with_user(self):
        """
        expect: sucessfully get the plan from the db, both by passing the _id as str
        or as an ObjectId and passing the access checks
        """

        # test with both input types (str and ObjectId)
        for id_input in [self.plan_id, str(self.plan_id)]:
            with self.subTest(id_input=id_input):
                plan = self.planner.get_plan(id_input, "test_user")
                self.assertIsInstance(plan, VEPlan)
                self.assertEqual(plan._id, self.default_plan["_id"])
                self.assertEqual(plan.author, self.default_plan["author"])
                self.assertEqual(plan.name, self.default_plan["name"])
                self.assertEqual(plan.partners, self.default_plan["partners"])
                self.assertEqual(
                    [institution.to_dict() for institution in plan.institutions],
                    self.default_plan["institutions"],
                )
                self.assertEqual(plan.topics, self.default_plan["topics"])
                self.assertEqual(
                    [lecture.to_dict() for lecture in plan.lectures],
                    self.default_plan["lectures"],
                )
                self.assertEqual(
                    plan.major_learning_goals, self.default_plan["major_learning_goals"]
                )
                self.assertEqual(
                    [
                        individual_learning_goal.to_dict()
                        for individual_learning_goal in plan.individual_learning_goals
                    ],
                    self.default_plan["individual_learning_goals"],
                )
                self.assertEqual(
                    plan.methodical_approaches,
                    self.default_plan["methodical_approaches"],
                )
                self.assertEqual(
                    [target_group.to_dict() for target_group in plan.target_groups],
                    self.default_plan["target_groups"],
                )
                self.assertEqual(plan.languages, self.default_plan["languages"])
                self.assertEqual(
                    [evaluation.to_dict() for evaluation in plan.evaluation],
                    self.default_plan["evaluation"],
                )
                self.assertEqual(
                    plan.involved_parties, self.default_plan["involved_parties"]
                )
                self.assertEqual(plan.realization, self.default_plan["realization"])
                self.assertEqual(
                    plan.physical_mobility, self.default_plan["physical_mobility"]
                )
                self.assertEqual(
                    [mobility.to_dict() for mobility in plan.physical_mobilities],
                    self.default_plan["physical_mobilities"],
                )
                self.assertEqual(plan.learning_env, self.default_plan["learning_env"])
                self.assertEqual(plan.checklist, self.default_plan["checklist"])
                self.assertEqual(
                    [step.to_dict() for step in plan.steps], self.default_plan["steps"]
                )
                self.assertEqual(
                    plan.is_good_practise, self.default_plan["is_good_practise"]
                )
                self.assertEqual(
                    plan.is_good_practise_planned,
                    self.default_plan["is_good_practise_planned"],
                )
                self.assertEqual(
                    plan.is_good_practise_ro, self.default_plan["is_good_practise_ro"]
                )
                self.assertEqual(plan.abstract, self.default_plan["abstract"])
                self.assertEqual(
                    plan.underlying_ve_model, self.default_plan["underlying_ve_model"]
                )
                self.assertEqual(plan.reflection, self.default_plan["reflection"])
                self.assertEqual(plan.literature, self.default_plan["literature"])
                self.assertEqual(
                    plan.evaluation_file, self.default_plan["evaluation_file"]
                )
                self.assertEqual(
                    plan.literature_files, self.default_plan["literature_files"]
                )
                self.assertEqual(plan.progress, self.default_plan["progress"])
                self.assertEqual(plan.timestamp_from, self.step.timestamp_from)
                self.assertEqual(plan.timestamp_to, self.step.timestamp_to)
                self.assertEqual(plan.workload, self.step.workload)
                self.assertEqual(plan.duration, self.step.duration)
                self.assertIsNotNone(plan.creation_timestamp)
                self.assertIsNotNone(plan.last_modified)

    def test_get_plan_with_user_good_practise(self):
        """
        expect: sucessfully get the plan from the db, both by passing the _id as str,
        or as an ObjectId. access is granted, because the plan is marked as a
        good practise example and therefore public
        """

        # create new good practise plan, user has no dedicated read access
        good_practise_plan_id = ObjectId()
        self.db.plans.insert_one(
            VEPlan(_id=good_practise_plan_id, is_good_practise=True).to_dict()
        )

        # test with both input types (str and ObjectId)
        for id_input in [good_practise_plan_id, str(good_practise_plan_id)]:
            with self.subTest(id_input=id_input):
                plan = self.planner.get_plan(id_input, "test_user")
                self.assertIsInstance(plan, VEPlan)
                self.assertEqual(plan._id, good_practise_plan_id)
                self.assertTrue(plan.is_good_practise)

    def test_get_plan_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with the given _id
        exists
        """
        non_existing_id = ObjectId()

        # test with both input types (str and ObjectId)
        for id_input in [non_existing_id, str(non_existing_id)]:
            with self.subTest(id_input=id_input):
                self.assertRaises(PlanDoesntExistError, self.planner.get_plan, id_input)

    def test_get_plan_error_no_read_access(self):
        """
        expect: fail message because username has no read access
        """

        # test with both input types (str and ObjectId)
        for id_input in [self.plan_id, str(self.plan_id)]:
            with self.subTest(id_input=id_input):
                self.assertRaises(
                    NoReadAccessError,
                    self.planner.get_plan,
                    id_input,
                    "user_with_no_access",
                )

    def test_get_plan_error_plan_doesnt_exist_invalid_id(self):
        """
        expect: PlanDoesntExistError is raised because the given _id is not a valid
        ObjectId, therefore no plan can exist with this _id
        """

        wrong_id_format = "123"
        self.assertRaises(PlanDoesntExistError, self.planner.get_plan, wrong_id_format)

    def test_get_bulk_plan(self):
        """
        expect: successfully get multiple plans from the db, both by passing the _ids as str
        """

        # create one more plan
        additional_plan_id = ObjectId()
        self.db.plans.insert_one(VEPlan(_id=additional_plan_id).to_dict())

        # test with both input types (str and ObjectId)
        for id_input in [
            [self.plan_id, additional_plan_id],
            [str(self.plan_id), str(additional_plan_id)],
        ]:
            with self.subTest(id_input=id_input):
                plans = self.planner.get_bulk_plans(id_input)
                self.assertEqual(len(plans), 2)
                for plan in plans:
                    self.assertIsInstance(plan, VEPlan)

    def test_get_all_plans(self):
        """
        expect: a list with exactly one VEPlan object inside
        (the one inserted by `setUp()`)
        """

        plans = self.planner.get_all()
        self.assertIsInstance(plans, list)
        self.assertEqual(len(plans), 1)
        plan = plans[0]
        self.assertIsInstance(plan, VEPlan)
        self.assertEqual(plan._id, self.default_plan["_id"])
        self.assertEqual(plan.author, self.default_plan["author"])
        self.assertEqual(plan.name, self.default_plan["name"])
        self.assertEqual(plan.partners, self.default_plan["partners"])
        self.assertEqual(
            [institution.to_dict() for institution in plan.institutions],
            self.default_plan["institutions"],
        )
        self.assertEqual(plan.topics, self.default_plan["topics"])
        self.assertEqual(
            [lecture.to_dict() for lecture in plan.lectures],
            self.default_plan["lectures"],
        )
        self.assertEqual(
            plan.major_learning_goals, self.default_plan["major_learning_goals"]
        )
        self.assertEqual(
            [
                individual_learning_goal.to_dict()
                for individual_learning_goal in plan.individual_learning_goals
            ],
            self.default_plan["individual_learning_goals"],
        )
        self.assertEqual(
            plan.methodical_approaches, self.default_plan["methodical_approaches"]
        )
        self.assertEqual(
            [target_group.to_dict() for target_group in plan.target_groups],
            self.default_plan["target_groups"],
        )
        self.assertEqual(plan.languages, self.default_plan["languages"])
        self.assertEqual(
            [evaluation.to_dict() for evaluation in plan.evaluation],
            self.default_plan["evaluation"],
        )
        self.assertEqual(plan.involved_parties, self.default_plan["involved_parties"])
        self.assertEqual(plan.realization, self.default_plan["realization"])
        self.assertEqual(plan.physical_mobility, self.default_plan["physical_mobility"])
        self.assertEqual(
            [mobility.to_dict() for mobility in plan.physical_mobilities],
            self.default_plan["physical_mobilities"],
        )
        self.assertEqual(plan.learning_env, self.default_plan["learning_env"])
        self.assertEqual(plan.checklist, self.default_plan["checklist"])
        self.assertEqual(
            [step.to_dict() for step in plan.steps], self.default_plan["steps"]
        )
        self.assertEqual(plan.is_good_practise, self.default_plan["is_good_practise"])
        self.assertEqual(
            plan.is_good_practise_planned, self.default_plan["is_good_practise_planned"]
        )
        self.assertEqual(
            plan.is_good_practise_ro, self.default_plan["is_good_practise_ro"]
        )
        self.assertEqual(plan.abstract, self.default_plan["abstract"])
        self.assertEqual(
            plan.underlying_ve_model, self.default_plan["underlying_ve_model"]
        )
        self.assertEqual(plan.reflection, self.default_plan["reflection"])
        self.assertEqual(plan.literature, self.default_plan["literature"])
        self.assertEqual(plan.evaluation_file, self.default_plan["evaluation_file"])
        self.assertEqual(plan.literature_files, self.default_plan["literature_files"])
        self.assertEqual(plan.progress, self.default_plan["progress"])
        self.assertEqual(plan.timestamp_from, self.step.timestamp_from)
        self.assertEqual(plan.timestamp_to, self.step.timestamp_to)
        self.assertEqual(plan.workload, self.step.workload)
        self.assertEqual(plan.duration, self.step.duration)
        self.assertIsNotNone(plan.creation_timestamp)
        self.assertIsNotNone(plan.last_modified)

    def test_get_plans_for_user(self):
        """
        expect: only show plans that the user is allowed to see, i.e. their
        own and those with read/write permissions and good practise examples.
        """

        # insert 3 more plans with different authorships
        additional_plans = [
            {
                "_id": ObjectId(),
                "author": "test_admin",
                "creation_timestamp": datetime.now(timezone.utc),
                "last_modified": datetime.now(timezone.utc),
                "name": "admin",
                "partners": ["test_user"],
                "institutions": [self.institution.to_dict()],
                "topics": ["test"],
                "lectures": [self.lecture.to_dict()],
                "major_learning_goals": ["test", "test"],
                "individual_learning_goals": [self.individual_learning_goal.to_dict()],
                "methodical_approaches": ["test"],
                "target_groups": [self.target_group.to_dict()],
                "languages": ["test", "test"],
                "evaluation": [self.evaluation.to_dict()],
                "timestamp_from": self.step.timestamp_from,
                "timestamp_to": self.step.timestamp_to,
                "involved_parties": ["test", "test"],
                "realization": "test",
                "physical_mobility": True,
                "physical_mobilities": [self.physical_mobility.to_dict()],
                "learning_env": "test",
                "checklist": [
                    {
                        "username": "test_user",
                        "technology": False,
                        "exam_regulations": False,
                    }
                ],
                "duration": self.step.duration.total_seconds(),
                "workload": self.step.workload,
                "steps": [self.step.to_dict()],
                "is_good_practise": True,
                "is_good_practise_planned": True,
                "is_good_practise_ro": False,
                "abstract": "test",
                "underlying_ve_model": "test",
                "reflection": "test",
                "literature": "test",
                "evaluation_file": None,
                "literature_files": [],
                "progress": {
                    "name": "not_started",
                    "institutions": "not_started",
                    "topics": "not_started",
                    "lectures": "not_started",
                    "learning_goals": "not_started",
                    "methodical_approaches": "not_started",
                    "target_groups": "not_started",
                    "languages": "not_started",
                    "evaluation": "not_started",
                    "involved_parties": "not_started",
                    "realization": "not_started",
                    "learning_env": "not_started",
                    "checklist": "not_started",
                    "steps": "not_started",
                },
            },
            {
                "_id": ObjectId(),
                "creation_timestamp": datetime.now(timezone.utc),
                "last_modified": datetime.now(timezone.utc),
                "name": "user",
                "partners": ["test_user"],
                "institutions": [self.institution.to_dict()],
                "topics": ["test"],
                "lectures": [self.lecture.to_dict()],
                "major_learning_goals": ["test", "test"],
                "individual_learning_goals": [self.individual_learning_goal.to_dict()],
                "methodical_approaches": ["test"],
                "target_groups": [self.target_group.to_dict()],
                "languages": ["test", "test"],
                "evaluation": [self.evaluation.to_dict()],
                "timestamp_from": self.step.timestamp_from,
                "timestamp_to": self.step.timestamp_to,
                "involved_parties": ["test", "test"],
                "realization": "test",
                "physical_mobility": True,
                "physical_mobilities": [self.physical_mobility.to_dict()],
                "learning_env": "test",
                "checklist": [
                    {
                        "username": "test_user",
                        "technology": False,
                        "exam_regulations": False,
                    }
                ],
                "duration": self.step.duration.total_seconds(),
                "workload": self.step.workload,
                "steps": [self.step.to_dict()],
                "is_good_practise": True,
                "is_good_practise_planned": True,
                "is_good_practise_ro": False,
                "abstract": "test",
                "underlying_ve_model": "test",
                "reflection": "test",
                "literature": "test",
                "evaluation_file": None,
                "literature_files": [],
                "progress": {
                    "name": "not_started",
                    "institutions": "not_started",
                    "topics": "not_started",
                    "lectures": "not_started",
                    "learning_goals": "not_started",
                    "methodical_approaches": "not_started",
                    "target_groups": "not_started",
                    "languages": "not_started",
                    "evaluation": "not_started",
                    "involved_parties": "not_started",
                    "realization": "not_started",
                    "learning_env": "not_started",
                    "checklist": "not_started",
                    "steps": "not_started",
                },
            },
            {
                "_id": ObjectId(),
                "creation_timestamp": datetime.now(timezone.utc),
                "last_modified": datetime.now(timezone.utc),
                "name": "user",
                "partners": ["test_user"],
                "institutions": [self.institution.to_dict()],
                "topics": ["test"],
                "lectures": [self.lecture.to_dict()],
                "major_learning_goals": ["test", "test"],
                "individual_learning_goals": [self.individual_learning_goal.to_dict()],
                "methodical_approaches": ["test"],
                "target_groups": [self.target_group.to_dict()],
                "languages": ["test", "test"],
                "evaluation": [self.evaluation.to_dict()],
                "timestamp_from": self.step.timestamp_from,
                "timestamp_to": self.step.timestamp_to,
                "involved_parties": ["test", "test"],
                "realization": "test",
                "physical_mobility": True,
                "physical_mobilities": [self.physical_mobility.to_dict()],
                "learning_env": "test",
                "checklist": [
                    {
                        "username": "test_user",
                        "technology": False,
                        "exam_regulations": False,
                    }
                ],
                "duration": self.step.duration.total_seconds(),
                "workload": self.step.workload,
                "steps": [self.step.to_dict()],
                "is_good_practise": False,
                "is_good_practise_planned": False,
                "is_good_practise_ro": False,
                "abstract": "test",
                "underlying_ve_model": "test",
                "reflection": "test",
                "literature": "test",
                "evaluation_file": None,
                "literature_files": [],
                "progress": {
                    "name": "not_started",
                    "institutions": "not_started",
                    "topics": "not_started",
                    "lectures": "not_started",
                    "learning_goals": "not_started",
                    "methodical_approaches": "not_started",
                    "target_groups": "not_started",
                    "languages": "not_started",
                    "evaluation": "not_started",
                    "involved_parties": "not_started",
                    "realization": "not_started",
                    "learning_env": "not_started",
                    "checklist": "not_started",
                    "steps": "not_started",
                },
            },
        ]
        self.db.plans.insert_many(additional_plans)

        plans = self.planner.get_plans_for_user("test_admin")
        # since one of the plans belong to the user and he has read_access to the default one,
        # we expect the result to be filtered accordingly (3 results here)
        self.assertEqual(len(plans), 3)
        plan = plans[0]
        for plan in plans:
            self.assertIn(
                plan._id,
                [
                    self.default_plan["_id"],
                    additional_plans[0]["_id"],
                    additional_plans[1]["_id"],
                ],
            )

    def test_get_good_practise_plans(self):
        """
        expect: get all plans that are marked as good practise examples
        """

        # create one more good practise plan
        additional_good_practise_plan_id = ObjectId()
        self.db.plans.insert_one(
            VEPlan(
                _id=additional_good_practise_plan_id, is_good_practise=True
            ).to_dict()
        )

        plans = self.planner.get_good_practise_plans()
        self.assertEqual(len(plans), 1)
        self.assertEqual(plans[0]._id, additional_good_practise_plan_id)

    def test_insert_plan(self):
        """
        expect: successfully insert a new plan into the db
        """

        # don't supply a _id, letting the system create a fresh one
        plan = {
            "name": "new plan",
            "partners": ["test_admin"],
            "author": "test_user",
            "read_access": ["test_user"],
            "write_access": ["test_user"],
            "institutions": [self.institution.to_dict()],
            "topics": ["test"],
            "lectures": [self.lecture.to_dict()],
            "major_learning_goals": ["test", "test"],
            "individual_learning_goals": [self.individual_learning_goal.to_dict()],
            "methodical_approaches": ["test"],
            "target_groups": [self.target_group.to_dict()],
            "languages": ["test", "test"],
            "evaluation": [self.evaluation.to_dict()],
            "timestamp_from": self.step.timestamp_from,
            "timestamp_to": self.step.timestamp_to,
            "involved_parties": ["test", "test"],
            "realization": "test",
            "physical_mobility": True,
            "physical_mobilities": [self.physical_mobility.to_dict()],
            "learning_env": "test",
            "checklist": [
                {
                    "username": "test_user",
                    "technology": False,
                    "exam_regulations": False,
                }
            ],
            "duration": self.step.duration.total_seconds(),
            "workload": self.step.workload,
            "steps": [self.step.to_dict()],
            "is_good_practise": True,
            "is_good_practise_planned": True,
            "is_good_practise_ro": False,
            "abstract": "test",
            "underlying_ve_model": "test",
            "reflection": "test",
            "literature": "test",
            "evaluation_file": None,
            "literature_files": [],
            "progress": {
                "name": "not_started",
                "institutions": "not_started",
                "topics": "not_started",
                "lectures": "not_started",
                "learning_goals": "not_started",
                "methodical_approaches": "not_started",
                "target_groups": "not_started",
                "languages": "not_started",
                "evaluation": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        }

        # expect the _id of the freshly inserted plan as a response
        inserted_id = self.planner.insert_plan(VEPlan.from_dict(plan))
        self.assertIsInstance(inserted_id, ObjectId)

        # expect the plan to be in the db
        db_state = self.db.plans.find_one({"_id": inserted_id})
        self.assertIsNotNone(db_state)
        self.assertIn("duration", db_state)
        self.assertIn("workload", db_state)
        self.assertEqual(db_state["duration"], self.step.duration.total_seconds())
        self.assertEqual(db_state["workload"], self.step.workload)
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

        # this time supply a _id, but if I "know" that it is not already existing,
        # the result will despite that be an insert as expected
        plan_with_id = {
            "_id": ObjectId(),
            "author": "test_user",
            "read_access": ["test_user"],
            "write_access": ["test_user"],
            "name": "new plan",
            "partners": ["test_admin"],
            "institutions": [self.institution.to_dict()],
            "topics": ["test"],
            "lectures": [self.lecture.to_dict()],
            "major_learning_goals": ["test", "test"],
            "individual_learning_goals": [self.individual_learning_goal.to_dict()],
            "methodical_approaches": ["test"],
            "target_groups": [self.target_group.to_dict()],
            "languages": ["test", "test"],
            "evaluation": [self.evaluation.to_dict()],
            "timestamp_from": self.step.timestamp_from,
            "timestamp_to": self.step.timestamp_to,
            "involved_parties": ["test", "test"],
            "realization": "test",
            "physical_mobility": True,
            "physical_mobilities": [self.physical_mobility.to_dict()],
            "learning_env": "test",
            "checklist": [
                {
                    "username": "test_user",
                    "technology": False,
                    "exam_regulations": False,
                }
            ],
            "duration": self.step.duration.total_seconds(),
            "workload": self.step.workload,
            "steps": [self.step.to_dict()],
            "is_good_practise": True,
            "is_good_practise_planned": True,
            "is_good_practise_ro": False,
            "abstract": "test",
            "underlying_ve_model": "test",
            "reflection": "test",
            "literature": "test",
            "evaluation_file": None,
            "literature_files": [],
            "progress": {
                "name": "not_started",
                "institutions": "not_started",
                "topics": "not_started",
                "lectures": "not_started",
                "learning_goals": "not_started",
                "methodical_approaches": "not_started",
                "target_groups": "not_started",
                "languages": "not_started",
                "evaluation": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        }

        # expect an "inserted" response
        result_with_id = self.planner.insert_plan(VEPlan.from_dict(plan_with_id))
        self.assertIsInstance(result_with_id, ObjectId)

        # expect the plan to be in the db
        db_state_with_id = self.db.plans.find_one({"_id": result_with_id})
        self.assertIsNotNone(db_state_with_id)
        self.assertIn("duration", db_state_with_id)
        self.assertIn("workload", db_state_with_id)
        self.assertEqual(
            db_state_with_id["duration"], self.step.duration.total_seconds()
        )
        self.assertEqual(db_state_with_id["workload"], self.step.workload)
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

    def test_insert_plan_error_plan_already_exists(self):
        """
        expect: PlanAlreadyExistsError is raised because a plan with the specified _id
        already exists in the db
        """

        plan = VEPlan(_id=self.plan_id)
        self.assertRaises(PlanAlreadyExistsError, self.planner.insert_plan, plan)

    def test_update_plan(self):
        """
        expect: successfully update a plan by supplying one with a _id that already exists
        """

        # we need to delay our execution here just a little bit, because otherwise
        # the update would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)

        # use the default plan, but change its name and topic
        existing_plan = VEPlan.from_dict(self.default_plan)
        existing_plan.name = "updated_name"
        existing_plan.topics = ["new_topic", "test"]

        # expect an "updated" response
        result = self.planner.update_full_plan(existing_plan)
        self.assertIsInstance(result, ObjectId)
        self.assertEqual(result, existing_plan._id)

        # expect that the name and topic was updated in the db, but other values
        # remain the same
        db_state = self.db.plans.find_one({"_id": existing_plan._id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], existing_plan.name)
        self.assertEqual(db_state["topics"], existing_plan.topics)
        self.assertEqual(db_state["realization"], self.default_plan["realization"])
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_plan_with_user(self):
        """
        expect: successfully update a plan by supplying one with a _id that already exists and passing
        access checks
        """

        # we need to delay our execution here just a little bit, because otherwise
        # the update would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)

        # use the default plan, but change its name and topic
        existing_plan = VEPlan.from_dict(self.default_plan)
        existing_plan.name = "updated_name"
        existing_plan.topics = ["new_topic", "test"]

        # expect an "updated" response
        result = self.planner.update_full_plan(
            existing_plan, requesting_username="test_user"
        )
        self.assertIsInstance(result, ObjectId)
        self.assertEqual(result, existing_plan._id)

        # expect that the name and topic was updated in the db, but other values
        # remain the same
        db_state = self.db.plans.find_one({"_id": existing_plan._id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], existing_plan.name)
        self.assertEqual(db_state["topics"], existing_plan.topics)
        self.assertEqual(db_state["realization"], self.default_plan["realization"])
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_plan_upsert(self):
        """
        expect: even though the update function is called, a new plan is inserted
        because the upsert flag was set to True
        """

        plan = VEPlan(name="upsert_test")

        result = self.planner.update_full_plan(plan, upsert=True)
        self.assertIsInstance(result, ObjectId)
        self.assertEqual(result, plan._id)

        # expect the plan to be in the db
        db_state = self.db.plans.find_one({"_id": plan._id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], plan.name)
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

    def test_update_plan_upsert_with_user(self):
        """
        expect: even though the update function is called, a new plan is inserted
        because the upsert flag was set to True. write access checks don't matter, since
        the plan gets inserted freshly.
        """

        plan = VEPlan(name="upsert_test")

        result = self.planner.update_full_plan(
            plan,
            upsert=True,
            requesting_username="access_doesnt_matter_in_this_case_user",
        )
        self.assertIsInstance(result, ObjectId)
        self.assertEqual(result, plan._id)

        # expect the plan to be in the db
        db_state = self.db.plans.find_one({"_id": plan._id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], plan.name)
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

    def test_update_plan_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with the specified
        _id is present in the db and the upsert flag is set to False
        """

        self.assertRaises(PlanDoesntExistError, self.planner.update_full_plan, VEPlan())

    def test_update_plan_error_no_write_access(self):
        """
        expect: NoWriteAccessError is raised because user has no write permission
        """

        self.assertRaises(
            NoWriteAccessError,
            self.planner.update_full_plan,
            VEPlan(_id=self.default_plan["_id"], name="trying_to_update"),
            False,
            "user_with_no_write_access",
        )

    def test_update_field(self):
        """
        expect: successfully update a single field of a VEPlan
        """

        self.planner.update_field(self.plan_id, "topics", ["updated_topic"])
        self.planner.update_field(
            self.plan_id, "involved_parties", ["update1", "update2"]
        )
        self.planner.update_field(self.plan_id, "realization", "updated_realization")
        self.planner.update_field(self.plan_id, "physical_mobility", False)
        self.planner.update_field(self.plan_id, "physical_mobilities", [])
        self.planner.update_field(self.plan_id, "learning_env", "updated_learning_env")
        self.planner.update_field(
            self.plan_id, "major_learning_goals", ["update1", "update2"]
        )
        self.planner.update_field(self.plan_id, "individual_learning_goals", [])
        self.planner.update_field(
            self.plan_id,
            "methodical_approaches",
            ["test", "updated_methodical_approaches"],
        )
        self.planner.update_field(
            self.plan_id,
            "checklist",
            [{"username": "test_user", "technology": True, "exam_regulations": True}],
        )
        self.planner.update_field(self.plan_id, "is_good_practise", False)
        self.planner.update_field(self.plan_id, "is_good_practise_planned", True)
        self.planner.update_field(self.plan_id, "is_good_practise_ro", True)
        self.planner.update_field(self.plan_id, "abstract", "updated_abstract")
        self.planner.update_field(self.plan_id, "underlying_ve_model", "updated_model")
        self.planner.update_field(self.plan_id, "reflection", "updated_reflection")
        self.planner.update_field(self.plan_id, "literature", "updated_literature")
        self.planner.update_field(
            self.plan_id,
            "progress",
            {
                "name": "completed",
                "institutions": "not_started",
                "topics": "not_started",
                "lectures": "not_started",
                "target_groups": "not_started",
                "languages": "not_started",
                "evaluation": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["topics"], ["updated_topic"])
        self.assertEqual(db_state["involved_parties"], ["update1", "update2"])
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertEqual(db_state["physical_mobility"], False)
        self.assertEqual(db_state["physical_mobilities"], [])
        self.assertEqual(db_state["learning_env"], "updated_learning_env")
        self.assertEqual(db_state["major_learning_goals"], ["update1", "update2"])
        self.assertEqual(db_state["individual_learning_goals"], [])
        self.assertEqual(
            db_state["methodical_approaches"], ["test", "updated_methodical_approaches"]
        )
        self.assertEqual(
            db_state["checklist"],
            [{"username": "test_user", "technology": True, "exam_regulations": True}],
        )
        self.assertEqual(db_state["is_good_practise"], False)
        self.assertEqual(db_state["is_good_practise_planned"], True)
        self.assertEqual(db_state["is_good_practise_ro"], True)
        self.assertEqual(db_state["abstract"], "updated_abstract")
        self.assertEqual(db_state["underlying_ve_model"], "updated_model")
        self.assertEqual(db_state["reflection"], "updated_reflection")
        self.assertEqual(db_state["literature"], "updated_literature")
        self.assertEqual(db_state["progress"]["name"], "completed")
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_field_with_user(self):
        """
        expect: successfully update a single field of a VEPlan and passing access checks
        """

        self.planner.update_field(
            self.plan_id, "topics", ["updated_topic"], requesting_username="test_user"
        )
        self.planner.update_field(
            self.plan_id,
            "involved_parties",
            ["update1", "update2"],
            requesting_username="test_user",
        )
        self.planner.update_field(
            self.plan_id,
            "realization",
            "updated_realization",
            requesting_username="test_user",
        )
        self.planner.update_field(
            self.plan_id,
            "learning_env",
            "updated_learning_env",
            requesting_username="test_user",
        )
        self.planner.update_field(
            self.plan_id,
            "major_learning_goals",
            ["update1", "update2"],
            requesting_username="test_user",
        )
        self.planner.update_field(
            self.plan_id,
            "methodical_approaches",
            ["test", "updated_methodical_approaches"],
            requesting_username="test_user",
        )
        self.planner.update_field(
            self.plan_id,
            "checklist",
            [{"username": "test_user", "technology": True, "exam_regulations": True}],
            requesting_username="test_user",
        )
        self.planner.update_field(
            self.plan_id,
            "progress",
            {
                "name": "completed",
                "institutions": "not_started",
                "topics": "not_started",
                "lectures": "not_started",
                "learning_goals": "not_started",
                "methodical_approaches": "not_started",
                "target_groups": "not_started",
                "languages": "not_started",
                "evaluation": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
            requesting_username="test_user",
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["topics"], ["updated_topic"])
        self.assertEqual(db_state["involved_parties"], ["update1", "update2"])
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertEqual(db_state["learning_env"], "updated_learning_env")
        self.assertEqual(db_state["major_learning_goals"], ["update1", "update2"])
        self.assertEqual(
            db_state["methodical_approaches"], ["test", "updated_methodical_approaches"]
        )
        self.assertEqual(
            db_state["checklist"],
            [{"username": "test_user", "technology": True, "exam_regulations": True}],
        )
        self.assertEqual(db_state["progress"]["name"], "completed")
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_field_object(self):
        """
        expect: successfully update a single field of a VEPlan that
        is not a primitive type
        """

        tg = TargetGroup(
            name="updated_name",
            semester="updated_semester",
            experience="updated_experience",
            academic_course="updated_academic_course",
            languages=["test", "updated_languages"],
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(self.plan_id, "target_groups", [tg.to_dict()])

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIsInstance(db_state["target_groups"][0]["_id"], ObjectId)
        self.assertEqual(db_state["target_groups"][0]["name"], tg.name)
        self.assertEqual(db_state["target_groups"][0]["semester"], tg.semester)
        self.assertEqual(db_state["target_groups"][0]["experience"], tg.experience)
        self.assertEqual(
            db_state["target_groups"][0]["academic_course"], tg.academic_course
        )
        self.assertEqual(db_state["target_groups"][0]["languages"], tg.languages)
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

        # same, but this time manually specify a _id
        tg2 = TargetGroup(
            _id=ObjectId(),
            name="updated_name2",
            semester="updated_semester2",
            experience="updated_experience2",
            academic_course="updated_academic_course2",
            languages=["test", "updated_languages"],
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(self.plan_id, "target_groups", [tg2.to_dict()])

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["target_groups"][0]["_id"], tg2._id)
        self.assertEqual(db_state["target_groups"][0]["name"], tg2.name)
        self.assertEqual(db_state["target_groups"][0]["semester"], tg2.semester)
        self.assertEqual(db_state["target_groups"][0]["experience"], tg2.experience)
        self.assertEqual(
            db_state["target_groups"][0]["academic_course"], tg2.academic_course
        )
        self.assertEqual(db_state["target_groups"][0]["languages"], tg2.languages)
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_field_object_with_user(self):
        """
        expect: successfully update a single field of a VEPlan that
        is not a primitive type and passing access checks
        """

        tg = TargetGroup(
            name="updated_name",
            semester="updated_semester",
            experience="updated_experience",
            academic_course="updated_academic_course",
            languages=["test", "updated_languages"],
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(
            self.plan_id,
            "target_groups",
            [tg.to_dict()],
            requesting_username="test_user",
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIsInstance(db_state["target_groups"][0]["_id"], ObjectId)
        self.assertEqual(db_state["target_groups"][0]["name"], tg.name)
        self.assertEqual(db_state["target_groups"][0]["semester"], tg.semester)
        self.assertEqual(db_state["target_groups"][0]["experience"], tg.experience)
        self.assertEqual(
            db_state["target_groups"][0]["academic_course"], tg.academic_course
        )
        self.assertEqual(db_state["target_groups"][0]["languages"], tg.languages)
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

        # same, but this time manually specify a _id
        tg2 = TargetGroup(
            _id=ObjectId(),
            name="updated_name2",
            semester="updated_semester2",
            experience="updated_experience2",
            academic_course="updated_academic_course2",
            languages=["test", "updated_languages2"],
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(
            self.plan_id,
            "target_groups",
            [tg2.to_dict()],
            requesting_username="test_user",
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["target_groups"][0]["_id"], tg2._id)
        self.assertEqual(db_state["target_groups"][0]["name"], tg2.name)
        self.assertEqual(db_state["target_groups"][0]["semester"], tg2.semester)
        self.assertEqual(db_state["target_groups"][0]["experience"], tg2.experience)
        self.assertEqual(
            db_state["target_groups"][0]["academic_course"], tg2.academic_course
        )
        self.assertEqual(db_state["target_groups"][0]["languages"], tg2.languages)
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_field_upsert(self):
        """
        expect: successfully upsert field, i.e. create new plan with only this field set
        to non-default
        """

        _id = ObjectId()

        # first try a primitve attribute
        self.planner.update_field(
            _id, "realization", "updated_realization", upsert=True
        )
        db_state = self.db.plans.find_one({"_id": _id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertIsNone(db_state["name"])
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

        # now same test, but with a complex attribute
        self.db.plans.delete_one({"_id": _id})

        institution = Institution(
            name="updated_institution_name",
            department="updated_department",
        )
        institution_dict = institution.to_dict()

        self.planner.update_field(_id, "institutions", [institution_dict], upsert=True)
        db_state = self.db.plans.find_one({"_id": _id})
        self.assertIsNotNone(db_state)
        self.assertIsNone(db_state["realization"])
        self.assertIsInstance(db_state["institutions"][0]["_id"], ObjectId)
        self.assertEqual(
            db_state["institutions"][0]["name"], "updated_institution_name"
        )
        self.assertEqual(
            db_state["institutions"][0]["department"], "updated_department"
        )
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

    def test_update_field_upsert_with_user(self):
        """
        expect: successfully upsert field, i.e. create new plan with only this field set
        to non-default
        """

        _id = ObjectId()

        # first try a primitve attribute
        self.planner.update_field(
            _id,
            "realization",
            "updated_realization",
            upsert=True,
            requesting_username="doesnt_matter",
        )
        db_state = self.db.plans.find_one({"_id": _id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertIsNone(db_state["name"])
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

        # now same test, but with a complex attribute
        self.db.plans.delete_one({"_id": _id})

        institution = Institution(
            name="updated_institution_name",
            department="updated_department",
        )
        institution_dict = institution.to_dict()

        self.planner.update_field(
            _id,
            "institutions",
            [institution_dict],
            upsert=True,
            requesting_username="doesnt_matter",
        )
        db_state = self.db.plans.find_one({"_id": _id})
        self.assertIsNotNone(db_state)
        self.assertIsNone(db_state["realization"])
        self.assertIsInstance(db_state["institutions"][0]["_id"], ObjectId)
        self.assertEqual(
            db_state["institutions"][0]["name"], "updated_institution_name"
        )
        self.assertEqual(
            db_state["institutions"][0]["department"], "updated_department"
        )
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

    def test_update_field_error_wrong_type(self):
        """
        expect: TypeError is raised because either primitive or complex attribute
        has a wrong type
        """

        # primitive attribute
        self.assertRaises(
            TypeError, self.planner.update_field, self.plan_id, "topics", "123"
        )

        # object_like_attribute
        lecture = Lecture().to_dict()
        # not enclosed by list
        self.assertRaises(
            TypeError, self.planner.update_field, self.plan_id, "lectures", lecture
        )
        # wrong attribute type
        lecture["name"] = 123
        self.assertRaises(
            TypeError, self.planner.update_field, self.plan_id, "lectures", [lecture]
        )
        # attribute not in dict representation
        self.assertRaises(
            TypeError,
            self.planner.update_field,
            self.plan_id,
            "lectures",
            ["wrong_type"],
        )

    def test_update_field_object_error_model_error(self):
        """
        expect: semantic error from underlying models is thrown (e.g. non unique task names)
        """

        step = Step(name="test").to_dict()
        step["tasks"] = [
            Task(task_formulation="test").to_dict(),
            Task(task_formulation="test").to_dict(),
        ]

        self.assertRaises(
            NonUniqueTasksError,
            self.planner.update_field,
            self.plan_id,
            "steps",
            [step],
        )

        del step["tasks"]

        self.assertRaises(
            MissingKeyError,
            self.planner.update_field,
            self.plan_id,
            "steps",
            [step],
        )

    def test_update_field_error_invalid_attribute(self):
        """
        expect: ValueError is thrown because attribute is not valid
        (i.e. not recognized by model)
        """

        self.assertRaises(
            ValueError,
            self.planner.update_field,
            self.plan_id,
            "not_existing_attr",
            "value",
        )

    def test_update_field_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is thrown because no match was found and
        upsert is False
        """

        self.assertRaises(
            PlanDoesntExistError,
            self.planner.update_field,
            ObjectId(),
            "realization",
            "updated",
        )

    def test_update_field_error_no_write_access(self):
        """
        expect: NoWriteAccessError is raised because user has no write access to
        the plan
        """

        self.assertRaises(
            NoWriteAccessError,
            self.planner.update_field,
            self.plan_id,
            "name",
            "trying_update",
            False,
            "user_with_no_access_rights",
        )

    def test_put_evaluation_file(self):
        """
        expect: successfully put evaluation file into the plan
        """

        file_id = self.planner.put_evaluation_file(
            self.plan_id, "test_file", b"test", "image/jpg", None
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(
            db_state["evaluation_file"],
            {
                "file_id": file_id,
                "file_name": "test_file",
            },
        )
        fs = gridfs.GridFS(self.db)
        self.assertEqual(fs.get(file_id).read(), b"test")

    def test_put_evaluation_file_with_user(self):
        """
        expect: successfully put evaluation file into the plan and passing access checks
        """

        file_id = self.planner.put_evaluation_file(
            self.plan_id, "test_file", b"test", "image/jpg", CURRENT_USER.username
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(
            db_state["evaluation_file"],
            {
                "file_id": file_id,
                "file_name": "test_file",
            },
        )
        fs = gridfs.GridFS(self.db)
        self.assertEqual(fs.get(file_id).read(), b"test")

    def test_put_evaluation_file_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with the specified _id
        exists
        """

        self.assertRaises(
            PlanDoesntExistError,
            self.planner.put_evaluation_file,
            ObjectId(),
            "test_file",
            b"test",
            "image/jpg",
            None,
        )

    def test_put_evaluation_file_error_no_write_access(self):
        """
        expect: NoWriteAccessError is raised because user has no write access to the plan
        """

        self.assertRaises(
            NoWriteAccessError,
            self.planner.put_evaluation_file,
            self.plan_id,
            "test_file",
            b"test",
            "image/jpg",
            "user_with_no_access_rights",
        )

    def test_remove_evaluation_file(self):
        """
        expect: successfully remove an evaluation file from the plan
        """

        # create a file manually
        fs = gridfs.GridFS(self.db)
        file_id = fs.put(b"test", filename="test_file")
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "evaluation_file": {"file_id": file_id, "file_name": "test_file"}
                }
            },
        )

        self.planner.remove_evaluation_file(self.plan_id, file_id)

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNone(db_state["evaluation_file"])
        self.assertFalse(fs.exists(file_id))

    def test_remove_evaluation_file_with_user(self):
        """
        expect: successfully remove an evaluation file from the plan and passing access checks
        """

        # create a file manually
        fs = gridfs.GridFS(self.db)
        file_id = fs.put(b"test", filename="test_file")
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "evaluation_file": {"file_id": file_id, "file_name": "test_file"}
                }
            },
        )

        self.planner.remove_evaluation_file(
            self.plan_id, file_id, requesting_username="test_user"
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNone(db_state["evaluation_file"])
        self.assertFalse(fs.exists(file_id))

    def test_remove_evaluation_file_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with the specified _id
        exists
        """

        self.assertRaises(
            PlanDoesntExistError,
            self.planner.remove_evaluation_file,
            ObjectId(),
            ObjectId(),
        )

    def test_remove_evaluation_file_error_no_write_access(self):
        """
        expect: NoWriteAccessError is raised because user has no write access to the plan
        """

        # create a file manually
        fs = gridfs.GridFS(self.db)
        file_id = fs.put(b"test", filename="test_file")
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "evaluation_file": {"file_id": file_id, "file_name": "test_file"}
                }
            },
        )

        self.assertRaises(
            NoWriteAccessError,
            self.planner.remove_evaluation_file,
            self.plan_id,
            file_id,
            "user_with_no_access_rights",
        )

    def test_remove_evaluation_file_error_file_doesnt_exist(self):
        """
        expect: FileDoesntExistError is raised because no file with the specified _id
        exists
        """

        self.assertRaises(
            FileDoesntExistError,
            self.planner.remove_evaluation_file,
            self.plan_id,
            ObjectId(),
        )

    def test_put_literature_file(self):
        """
        expect: successfully put literature file into the plan
        """

        file_id = self.planner.put_literature_file(
            self.plan_id, "test_file", b"test", "image/jpg", None
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIn(
            {
                "file_id": file_id,
                "file_name": "test_file",
            },
            db_state["literature_files"],
        )
        fs = gridfs.GridFS(self.db)
        self.assertEqual(fs.get(file_id).read(), b"test")

    def test_put_literature_file_with_user(self):
        """
        expect: successfully put literature file into the plan and passing access checks
        """

        file_id = self.planner.put_literature_file(
            self.plan_id, "test_file", b"test", "image/jpg", CURRENT_USER.username
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIn(
            {
                "file_id": file_id,
                "file_name": "test_file",
            },
            db_state["literature_files"],
        )
        fs = gridfs.GridFS(self.db)
        self.assertEqual(fs.get(file_id).read(), b"test")

    def test_put_literature_file_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with the specified _id
        exists
        """

        self.assertRaises(
            PlanDoesntExistError,
            self.planner.put_literature_file,
            ObjectId(),
            "test_file",
            b"test",
            "image/jpg",
            None,
        )

    def test_put_literature_file_error_no_write_access(self):
        """
        expect: NoWriteAccessError is raised because user has no write access to the plan
        """

        self.assertRaises(
            NoWriteAccessError,
            self.planner.put_literature_file,
            self.plan_id,
            "test_file",
            b"test",
            "image/jpg",
            "user_with_no_access_rights",
        )

    def test_put_literature_file_error_max_files_reached(self):
        """
        expect: MaximumFilesExceededError is raised because the maximum amount of
        literature files has been reached
        """

        # add 5 plans as max
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "literature_files": [
                        {"file_id": ObjectId(), "file_name": "test_file"}
                        for _ in range(5)
                    ]
                }
            },
        )

        self.assertRaises(
            MaximumFilesExceededError,
            self.planner.put_literature_file,
            self.plan_id,
            "test_file",
            b"test",
            "image/jpg",
            None,
        )

    def test_remove_literature_file(self):
        """
        expect: successfully remove a literature file from the plan's list
        """

        # create 3 files manually
        fs = gridfs.GridFS(self.db)
        file_ids = [fs.put(b"test", filename=f"test_file_{i}") for i in range(3)]
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "literature_files": [
                        {"file_id": file_id, "file_name": f"test_file_{i}"}
                        for i, file_id in enumerate(file_ids)
                    ]
                }
            },
        )

        self.planner.remove_literature_file(self.plan_id, file_ids[0])

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state["literature_files"])
        self.assertEqual(len(db_state["literature_files"]), 2)
        self.assertNotIn(
            {"file_id": file_ids[0], "file_name": "test_file_0"},
            db_state["literature_files"],
        )
        self.assertFalse(fs.exists(file_ids[0]))

    def test_remove_literature_file_with_user(self):
        """
        expect: successfully remove a literature file from its list
        in the plan and passing access checks
        """

        # create 3 files manually
        fs = gridfs.GridFS(self.db)
        file_ids = [fs.put(b"test", filename=f"test_file_{i}") for i in range(3)]
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "literature_files": [
                        {"file_id": file_id, "file_name": f"test_file_{i}"}
                        for i, file_id in enumerate(file_ids)
                    ]
                }
            },
        )

        self.planner.remove_literature_file(
            self.plan_id, file_ids[0], requesting_username="test_user"
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state["literature_files"])
        self.assertEqual(len(db_state["literature_files"]), 2)
        self.assertNotIn(
            {"file_id": file_ids[0], "file_name": "test_file_0"},
            db_state["literature_files"],
        )
        self.assertFalse(fs.exists(file_ids[0]))

    def test_remove_literature_file_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with the specified _id
        exists
        """

        self.assertRaises(
            PlanDoesntExistError,
            self.planner.remove_literature_file,
            ObjectId(),
            ObjectId(),
        )

    def test_remove_literature_file_error_no_write_access(self):
        """
        expect: NoWriteAccessError is raised because user has no write access to the plan
        """

        # create 3 files manually
        fs = gridfs.GridFS(self.db)
        file_ids = [fs.put(b"test", filename=f"test_file_{i}") for i in range(3)]
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$set": {
                    "literature_files": [
                        {"file_id": file_id, "file_name": f"test_file_{i}"}
                        for i, file_id in enumerate(file_ids)
                    ]
                }
            },
        )

        self.assertRaises(
            NoWriteAccessError,
            self.planner.remove_literature_file,
            self.plan_id,
            file_ids[0],
            "user_with_no_access_rights",
        )

    def test_remove_literature_file_error_file_doesnt_exist(self):
        """
        expect: FileDoesntExistError is raised because no file with the specified _id
        exists
        """

        self.assertRaises(
            FileDoesntExistError,
            self.planner.remove_literature_file,
            self.plan_id,
            ObjectId(),
        )

    def test_copy_plan(self):
        """
        expect: successfully copy plan
        """

        # copy the plan
        copied_id = self.planner.copy_plan(self.plan_id)

        # expect the plan to be in the db
        db_state = self.db.plans.find_one({"_id": copied_id})
        self.assertIsNotNone(db_state)
        self.assertNotEqual(copied_id, self.plan_id)
        self.assertEqual(db_state["name"], self.default_plan["name"] + " (Kopie)")
        self.assertEqual(db_state["author"], self.default_plan["author"])
        self.assertEqual(db_state["read_access"], [self.default_plan["author"]])
        self.assertEqual(db_state["write_access"], [self.default_plan["author"]])

        # copy the plan again with a different author
        copied_id2 = self.planner.copy_plan(self.plan_id, "another_test_user")

        # expect the plan to be in the db
        db_state = self.db.plans.find_one({"_id": copied_id2})
        self.assertIsNotNone(db_state)
        self.assertNotEqual(copied_id2, self.plan_id)
        self.assertEqual(db_state["name"], self.default_plan["name"] + " (Kopie)")
        self.assertEqual(db_state["author"], "another_test_user")
        self.assertEqual(db_state["read_access"], ["another_test_user"])
        self.assertEqual(db_state["write_access"], ["another_test_user"])

    def test_set_read_permission(self):
        """
        expect: successfully set read permission for the user
        """

        self.planner.set_read_permissions(str(self.plan_id), "another_test_user")

        # expect the user to be in the read_permission list
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIn("another_test_user", db_state["read_access"])
        self.assertNotIn("another_test_user", db_state["write_access"])

    def test_set_write_permission(self):
        """
        expect: successfully set write permission for the user, which also includes read
        permissions
        """

        self.planner.set_write_permissions(str(self.plan_id), "another_test_user")

        # expect the user to be in the read_access and write_access list
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIn("another_test_user", db_state["read_access"])
        self.assertIn("another_test_user", db_state["write_access"])

    def test_revoke_read_permission(self):
        """
        expect: successfully revoke read permission of user, which includes revoking read permissions
        """

        # manually add another user
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$addToSet": {
                    "read_access": "another_test_user",
                    "write_access": "another_test_user",
                }
            },
        )

        self.planner.revoke_read_permissions(str(self.plan_id), "another_test_user")
        # expect the user not to be in the read_access nor write_access list
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertNotIn("another_test_user", db_state["read_access"])
        self.assertNotIn("another_test_user", db_state["write_access"])

    def test_revoke_write_permission(self):
        """
        expect: successfully revoke write permission of user, but keep read permissions
        """

        # manually add another user
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$addToSet": {
                    "read_access": "another_test_user",
                    "write_access": "another_test_user",
                }
            },
        )

        self.planner.revoke_write_permissions(str(self.plan_id), "another_test_user")
        # expect the user not to be in the write_access, but still in the read_access list
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIn("another_test_user", db_state["read_access"])
        self.assertNotIn("another_test_user", db_state["write_access"])

    def test_delete_plan_str(self):
        """
        expect: successfully delete plan by passing _id as str
        """

        self.planner.delete_plan(str(self.plan_id))

        # expect no record with this _id after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNone(db_state)

    def test_delete_plan_oid(self):
        """
        expect: successfully delete plan by passing _id as ObjectId
        """

        self.planner.delete_plan(self.plan_id)

        # expect no record with this _id after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNone(db_state)

    def test_delete_plan_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan exists with the given _id
        """

        self.assertRaises(PlanDoesntExistError, self.planner.delete_plan, ObjectId())
        self.assertRaises(
            PlanDoesntExistError, self.planner.delete_plan, str(ObjectId())
        )

    def test_delete_plan_error_plan_doesnt_exist_invalid_id(self):
        """
        expect: PlanDoesntExistError is raised because the supplied _id is not
        a valid ObjectId, resulting in the fact that no plan can even exist with this _id
        """

        self.assertRaises(PlanDoesntExistError, self.planner.delete_plan, "123")

    def test_delete_step_by_name(self):
        """
        expect: successfully delete step from the plan by name
        """

        self.planner.delete_step_by_name(self.plan_id, self.step.name)

        # expect no step in the plan after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["steps"], [])

    def test_delete_step_by_name_with_user(self):
        """
        expect: successfully delete step from the plan by name by passing access checks
        """

        self.planner.delete_step_by_name(
            self.plan_id, self.step.name, requesting_username="test_user"
        )

        # expect no step in the plan after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["steps"], [])

    def test_delete_step_by_id(self):
        """
        expect: successfully delete step from the plan by id
        """

        self.planner.delete_step_by_id(self.plan_id, str(self.step._id))

        # expect no step in the plan after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["steps"], [])

    def test_delete_step_by_id_with_user(self):
        """
        expect: successfully delete step from the plan by id by passing access checks
        """

        self.planner.delete_step_by_id(
            self.plan_id, str(self.step._id), requesting_username="test_user"
        )

        # expect no step in the plan after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["steps"], [])

    def test_delete_step_error_invalid_id(self):
        """
        expect: PlanDoesntExistError is raised because an invalid _id is specified
        --> such a plan cannot exist
        """

        self.assertRaises(
            PlanDoesntExistError, self.planner.delete_step_by_id, "123", "123"
        )
        self.assertRaises(
            PlanDoesntExistError, self.planner.delete_step_by_name, "123", "123"
        )

    def test_delete_step_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with the given _id exists
        (step id doesnt matter)
        """

        self.assertRaises(
            PlanDoesntExistError, self.planner.delete_step_by_id, ObjectId(), "123"
        )
        self.assertRaises(
            PlanDoesntExistError, self.planner.delete_step_by_name, ObjectId(), "123"
        )

    def test_delete_step_error_no_write_access(self):
        """
        expect: NoWriteAccessError is raised because user has no write access to the plan
        """

        self.assertRaises(
            NoWriteAccessError,
            self.planner.delete_step_by_id,
            self.plan_id,
            self.step._id,
            "user_without_write_access",
        )

        self.assertRaises(
            NoWriteAccessError,
            self.planner.delete_step_by_id,
            self.plan_id,
            str(self.step._id),
            "user_without_write_access",
        )

        self.assertRaises(
            NoWriteAccessError,
            self.planner.delete_step_by_name,
            self.plan_id,
            self.step.name,
            "user_without_write_access",
        )

    def test_delete_step_step_doesnt_exist(self):
        """
        expect: when an non-existing step_id or step_name is provided no error should appear
        because it is technically a success that no such record exists
        """

        self.planner.delete_step_by_id(self.plan_id, str(ObjectId()))

        # expect step to still be there
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(len(db_state["steps"]), 1)

        self.planner.delete_step_by_name(self.plan_id, "not_existing")

        # expect step to still be there
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(len(db_state["steps"]), 1)

    def test_insert_plan_invitation(self):
        """
        expect: successfully insert a plan invitation
        """

        inserted_id = self.planner.insert_plan_invitation(
            self.plan_id, "invitation", "test_admin", "test_user"
        )

        # expect invitation to be in the plan
        db_state = self.db.invitations.find_one({"_id": inserted_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["plan_id"], self.plan_id)
        self.assertEqual(db_state["message"], "invitation")
        self.assertEqual(db_state["sender"], "test_admin")
        self.assertEqual(db_state["recipient"], "test_user")
        self.assertEqual(db_state["accepted"], None)

    def test_insert_plan_invitation_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with this _id exists
        """

        self.assertRaises(
            PlanDoesntExistError,
            self.planner.insert_plan_invitation,
            ObjectId(),
            "invitation",
            "test_admin",
            "test_user",
        )

    def test_get_plan_invitation(self):
        """
        expect: successfully get a plan invitation
        """
        invitation_id = ObjectId()

        self.db.invitations.insert_one(
            {
                "_id": invitation_id,
                "plan_id": self.plan_id,
                "message": "invitation",
                "sender": "test_admin",
                "recipient": "test_user",
                "accepted": None,
            }
        )

        invitation = self.planner.get_plan_invitation(invitation_id)

        # expect invitation to be in the db
        self.assertIsNotNone(invitation)
        self.assertEqual(invitation["plan_id"], self.plan_id)
        self.assertEqual(invitation["message"], "invitation")
        self.assertEqual(invitation["sender"], "test_admin")
        self.assertEqual(invitation["recipient"], "test_user")
        self.assertEqual(invitation["accepted"], None)

        # try again, but this time with a string id
        invitation = self.planner.get_plan_invitation(str(invitation_id))
        self.assertIsNotNone(invitation)
        self.assertEqual(invitation["plan_id"], self.plan_id)
        self.assertEqual(invitation["message"], "invitation")
        self.assertEqual(invitation["sender"], "test_admin")
        self.assertEqual(invitation["recipient"], "test_user")
        self.assertEqual(invitation["accepted"], None)

    def test_get_plan_invitation_error_invitation_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no invitation
        with this _id exists
        """

        self.assertRaises(
            InvitationDoesntExistError, self.planner.get_plan_invitation, ObjectId()
        )

    def test_set_invitation_reply(self):
        """
        expect: successfully set the reply of an invitation
        """

        invitation_id = ObjectId()

        self.db.invitations.insert_one(
            {
                "_id": invitation_id,
                "plan_id": self.plan_id,
                "message": "invitation",
                "sender": "test_admin",
                "recipient": "test_user",
                "accepted": None,
            }
        )

        self.planner.set_invitation_reply(invitation_id, True)

        # expect invitation's accepted state to be True
        db_state = self.db.invitations.find_one({"_id": invitation_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["accepted"], True)

        # try again, but this time with a string id and False accept state
        self.planner.set_invitation_reply(str(invitation_id), False)
        db_state = self.db.invitations.find_one({"_id": invitation_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["accepted"], False)

    def test_set_invitation_reply_error_invitation_doesnt_exist(self):
        """
        expect: InvitationDoesntExistError is raised because no invitation
        with this _id exists
        """

        self.assertRaises(
            InvitationDoesntExistError,
            self.planner.set_invitation_reply,
            ObjectId(),
            True,
        )

    def test_set_invitation_reply_error_invalid_id(self):
        """
        expect: InvitationDoesntExistError is raised because the provided
        id is not a valid ObjectId
        """

        self.assertRaises(
            InvitationDoesntExistError,
            self.planner.set_invitation_reply,
            "invalid_id",
            True,
        )

    def test_get_all_plans_for_user(self):
        """
        expect: retrieve all plans accessible to a given user
        """

        # create another plan authored by CURRENT_ADMIN, one shared via read_access,
        # and one not associated at all with CURRENT_ADMIN
        plan_by_admin = self.default_plan.copy()
        plan_by_admin["_id"] = ObjectId()
        plan_by_admin["author"] = CURRENT_ADMIN.username
        self.db.plans.insert_one(plan_by_admin)

        shared_plan = self.default_plan.copy()
        shared_plan["_id"] = ObjectId()
        shared_plan["author"] = "someone"
        shared_plan["read_access"] = [CURRENT_ADMIN.username]
        self.db.plans.insert_one(shared_plan)

        unrelated_plan = self.default_plan.copy()
        unrelated_plan["_id"] = ObjectId()
        unrelated_plan["author"] = "someone_else"
        unrelated_plan["read_access"] = ["another_user"]
        unrelated_plan["write_access"] = ["another_user"]
        self.db.plans.insert_one(unrelated_plan)

        plans = self.planner.get_plans_for_user(
            CURRENT_ADMIN.username, filter_access="access"
        )
        self.assertIsInstance(plans, list)
        self.assertEqual(len(plans), 3)
        ids = [p._id for p in plans]
        self.assertIn(plan_by_admin["_id"], ids)
        self.assertIn(shared_plan["_id"], ids)
        self.assertIn(self.default_plan["_id"], ids)

    def test_get_invitations_sent_by(self):
        """
        expect: retrieve invitations sent by given sender
        """

        inv = {
            "_id": ObjectId(),
            "plan_id": self.plan_id,
            "message": "invite",
            "sender": CURRENT_ADMIN.username,
            "recipient": CURRENT_USER.username,
            "accepted": None,
        }
        self.db.invitations.insert_one(inv)

        result = self.planner.get_invitations_sent_by(CURRENT_ADMIN.username)
        self.assertIsInstance(result, list)
        self.assertGreaterEqual(len(result), 1)


class ChatResourceTest(BaseResourceTestCase, AsyncTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.chat_manager = Chat(self.db)

        self.room_id = ObjectId()
        self.message_id = ObjectId()
        self.default_message = {
            "_id": self.message_id,
            "message": "test",
            "sender": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 8, 0, 0),
            "send_states": [
                {"username": CURRENT_ADMIN.username, "send_state": "acknowledged"},
                {"username": CURRENT_USER.username, "send_state": "sent"},
            ],
            "files": [],
        }
        self.default_room = {
            "_id": self.room_id,
            "name": "test_room",
            "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
            "messages": [self.default_message],
        }
        self.db.chatrooms.insert_one(self.default_room)

    def tearDown(self) -> None:
        self.db.chatrooms.delete_many({})
        self.chat_manager = None

        # delete all files that were sent in the chats
        fs = gridfs.GridFS(self.db)
        for fs_file in fs.find():
            fs.delete(fs_file._id)

        super().tearDown()

    def _store_files(self, *names: str) -> list:
        """
        helper: store files with the given names (and their names as content)
        for a message in the default room
        """

        return self.chat_manager.store_message_files(
            self.room_id,
            [{"file_name": name, "content": name.encode()} for name in names],
            CURRENT_ADMIN.username,
        )

    def _insert_message(self, text: str, date: datetime, files: list = None) -> dict:
        """
        helper: insert a message from the admin into the default room
        """

        message = {
            "_id": ObjectId(),
            "message": text,
            "sender": CURRENT_ADMIN.username,
            "creation_date": date,
            "send_states": [],
            "files": files or [],
        }
        self.db.chatrooms.update_one(
            {"_id": self.room_id}, {"$push": {"messages": message}}
        )
        return message

    def test_get_or_create_room_id(self):
        """
        expect: - successfully get room id if room exists
                - successfully create room and return id if room doesn't exist
        """

        # try for the existing room
        room_id = self.chat_manager.get_or_create_room_id(
            [CURRENT_ADMIN.username, CURRENT_USER.username], self.default_room["name"]
        )
        self.assertEqual(room_id, self.room_id)

        # try creating a new room with the same users, but different name
        room_id = self.chat_manager.get_or_create_room_id(
            [CURRENT_ADMIN.username, CURRENT_USER.username], "new_name"
        )
        self.assertNotEqual(room_id, self.room_id)
        self.assertIsNotNone(room_id)
        # expect the room to be in the db
        db_state = self.db.chatrooms.find_one({"_id": room_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], "new_name")
        self.assertEqual(
            db_state["members"], [CURRENT_ADMIN.username, CURRENT_USER.username]
        )
        self.assertEqual(db_state["messages"], [])

        # also try creating a new room with the same users, but no name, which should
        # be just another room as well
        room_id = self.chat_manager.get_or_create_room_id(
            [CURRENT_ADMIN.username, CURRENT_USER.username]
        )
        self.assertNotEqual(room_id, self.room_id)
        self.assertIsNotNone(room_id)
        # expect the room to be in the db
        db_state = self.db.chatrooms.find_one({"_id": room_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], None)
        self.assertEqual(
            db_state["members"], [CURRENT_ADMIN.username, CURRENT_USER.username]
        )
        self.assertEqual(db_state["messages"], [])

    def test_get_room_snippets_for_user(self):
        """
        expect: successfully get snippets of all rooms the user is a member of
        """

        # create two more rooms, one where the user is a member and one where not
        room1 = {
            "_id": ObjectId(),
            "name": "room1",
            "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
            "messages": [],
        }
        room2 = {
            "_id": ObjectId(),
            "name": "room2",
            "members": [CURRENT_USER.username, "some_other_user"],
            "messages": [],
        }
        self.db.chatrooms.insert_many([room1, room2])

        # expect snippets of the default room and room1
        snippets = self.chat_manager.get_room_snippets_for_user(CURRENT_ADMIN.username)
        self.assertEqual(len(snippets), 2)
        self.assertIn(
            self.default_room["_id"], [snippet["_id"] for snippet in snippets]
        )
        self.assertIn(room1["_id"], [snippet["_id"] for snippet in snippets])

        # expect the snippet is of the correct form
        for snippet in snippets:
            if snippet["_id"] == self.room_id:
                self.assertEqual(snippet["name"], self.default_room["name"])
                self.assertEqual(snippet["members"], self.default_room["members"])
                self.assertEqual(snippet["last_message"], self.default_message)
            elif snippet["_id"] == room1["_id"]:
                self.assertEqual(snippet["name"], room1["name"])
                self.assertEqual(snippet["members"], room1["members"])
                self.assertEqual(snippet["last_message"], None)

    def test_check_is_user_chatroom_member(self):
        """
        expect: successfully check if user is member of the room
        """

        # expect True because user is member
        self.assertTrue(
            self.chat_manager.check_is_user_chatroom_member(
                self.room_id, CURRENT_USER.username
            )
        )

        # expect False
        self.assertFalse(
            self.chat_manager.check_is_user_chatroom_member(
                self.room_id, "non_member_user"
            )
        )

    def test_check_is_user_chatroom_member_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because no room with this _id exists
        """

        self.assertRaises(
            RoomDoesntExistError,
            self.chat_manager.check_is_user_chatroom_member,
            ObjectId(),
            CURRENT_USER.username,
        )

    def test_add_members_to_room(self):
        """
        expect: successfully add new members to the room, skipping those
        that already are members
        """

        members = self.chat_manager.add_members_to_room(
            self.room_id, ["new_member", "another_new_member"]
        )

        # expect the new members to be appended to the already existing ones
        self.assertEqual(
            members,
            [
                CURRENT_ADMIN.username,
                CURRENT_USER.username,
                "new_member",
                "another_new_member",
            ],
        )

        db_state = self.db.chatrooms.find_one({"_id": self.room_id})
        self.assertEqual(db_state["members"], members)

        # the already existing messages are left untouched, i.e. they don't
        # get send states for the new members
        self.assertEqual(db_state["messages"], [self.default_message])

    def test_add_members_to_room_already_member(self):
        """
        expect: adding a user that already is a member doesn't duplicate him/her
        """

        members = self.chat_manager.add_members_to_room(
            self.room_id, [CURRENT_USER.username]
        )

        self.assertEqual(members, [CURRENT_ADMIN.username, CURRENT_USER.username])

        db_state = self.db.chatrooms.find_one({"_id": self.room_id})
        self.assertEqual(
            db_state["members"], [CURRENT_ADMIN.username, CURRENT_USER.username]
        )

    def test_add_members_to_room_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because no room with this _id exists
        """

        self.assertRaises(
            RoomDoesntExistError,
            self.chat_manager.add_members_to_room,
            ObjectId(),
            ["new_member"],
        )

    def test_set_room_name(self):
        """
        expect: successfully set the name of the room, and remove it again
        by setting it to None
        """

        self.chat_manager.set_room_name(self.room_id, "renamed_room")

        db_state = self.db.chatrooms.find_one({"_id": self.room_id})
        self.assertEqual(db_state["name"], "renamed_room")

        # setting the name to None removes it again
        self.chat_manager.set_room_name(self.room_id, None)

        db_state = self.db.chatrooms.find_one({"_id": self.room_id})
        self.assertEqual(db_state["name"], None)

    def test_set_room_name_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because no room with this _id exists
        """

        self.assertRaises(
            RoomDoesntExistError,
            self.chat_manager.set_room_name,
            ObjectId(),
            "renamed_room",
        )

    def test_get_all_messages_of_room(self):
        """
        expect: successfully get all messages of the room
        """

        # add one more message to the default room
        message = {
            "_id": ObjectId(),
            "message": "test2",
            "sender": CURRENT_USER.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "send_states": [
                {"username": CURRENT_ADMIN.username, "send_state": "sent"},
                {"username": CURRENT_USER.username, "send_state": "acknowledged"},
            ],
            "files": [],
        }
        self.db.chatrooms.update_one(
            {"_id": self.room_id}, {"$push": {"messages": message}}
        )

        # expect both messages to be returned
        messages = self.chat_manager.get_all_messages_of_room(self.room_id)
        self.assertEqual(len(messages), 2)
        self.assertIn(self.default_message, messages)
        self.assertIn(message, messages)

    def test_get_all_messages_of_room_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because no room with this _id exists
        """

        self.assertRaises(
            RoomDoesntExistError, self.chat_manager.get_all_messages_of_room, ObjectId()
        )

    def test_store_message(self):
        """
        expect: successfully add a message to the room
        """

        message = {
            "_id": ObjectId(),
            "message": "test2",
            "sender": CURRENT_USER.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "send_states": [
                {"username": CURRENT_ADMIN.username, "send_state": "sent"},
                {"username": CURRENT_USER.username, "send_state": "acknowledged"},
            ],
            "files": [],
        }

        self.chat_manager.store_message(self.room_id, message)

        # expect the message to be in the db
        db_state = self.db.chatrooms.find_one({"_id": self.room_id})
        self.assertIsNotNone(db_state)
        self.assertIn(message, db_state["messages"])

    def test_store_message_error_malformed_message(self):
        """
        expect: ValueError or TypeError is raised if message is missing required keys
                or has wrong types
        """

        # missing keys
        message = {
            "_id": ObjectId(),
            "message": "test2",
            "sender": CURRENT_USER.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
        }
        self.assertRaises(
            ValueError, self.chat_manager.store_message, self.room_id, message
        )

        # the files are required as well, even if there are none
        message["send_states"] = []
        self.assertRaises(
            ValueError, self.chat_manager.store_message, self.room_id, message
        )

        # wrong types
        message["files"] = []
        message["send_states"] = "wrong_type"
        self.assertRaises(
            TypeError, self.chat_manager.store_message, self.room_id, message
        )

        message["send_states"] = []
        message["files"] = "wrong_type"
        self.assertRaises(
            TypeError, self.chat_manager.store_message, self.room_id, message
        )

    def test_store_message_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because no room with this _id exists
        """

        message = {
            "_id": ObjectId(),
            "message": "test2",
            "sender": CURRENT_USER.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "send_states": [
                {"username": CURRENT_ADMIN.username, "send_state": "sent"},
                {"username": CURRENT_USER.username, "send_state": "acknowledged"},
            ],
            "files": [],
        }

        self.assertRaises(
            RoomDoesntExistError,
            self.chat_manager.store_message,
            ObjectId(),
            message,
        )

    @gen_test
    async def test_send_message(self):
        """
        expect: successfully send message. since the recipients are not currently online,
                expect them to be stored in the db with a send_state of "pending"
        """
        message_content = "test_message"
        await self.chat_manager.send_message(
            self.room_id, message_content, CURRENT_ADMIN.username
        )

        # expect the message to be in the db
        db_state = self.db.chatrooms.find_one({"_id": self.room_id})
        self.assertIsNotNone(db_state)
        self.assertIn(
            message_content, [message["message"] for message in db_state["messages"]]
        )
        self.assertIn(
            {"username": CURRENT_ADMIN.username, "send_state": "acknowledged"},
            db_state["messages"][1]["send_states"],
        )
        self.assertIn(
            {"username": CURRENT_USER.username, "send_state": "pending"},
            db_state["messages"][1]["send_states"],
        )
        self.assertEqual(db_state["messages"][1]["files"], [])

    @gen_test
    async def test_send_message_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because no room with this _id exists
        """

        with self.assertRaises(RoomDoesntExistError):
            await self.chat_manager.send_message(
                ObjectId(), "test_message", CURRENT_ADMIN.username
            )

    @gen_test
    async def test_send_message_error_user_not_room_member(self):
        """
        expect: UserNotMemberError is raised because the user is not a member of the room
        """

        with self.assertRaises(UserNotMemberError):
            await self.chat_manager.send_message(
                self.room_id, "test_message", "non_member_user"
            )

    def test_acknowledge_message(self):
        """
        expect: successfully acknowledge a message, i.e. set the send_state of the user
                to "acknowledged"
        """

        self.chat_manager.acknowledge_message(
            self.room_id, self.message_id, CURRENT_USER.username
        )

        # expect the send_state to be acknowledged now (was "sent" before)
        db_state = self.db.chatrooms.find_one({"_id": self.room_id})
        self.assertIsNotNone(db_state)
        self.assertIn(
            {"username": CURRENT_USER.username, "send_state": "acknowledged"},
            db_state["messages"][0]["send_states"],
        )

    def test_acknowledge_message_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because no room with this _id exists
        """

        self.assertRaises(
            RoomDoesntExistError,
            self.chat_manager.acknowledge_message,
            ObjectId(),
            self.message_id,
            CURRENT_USER.username,
        )

    def test_acknowledge_message_error_user_not_room_member(self):
        """
        expect: UserNotMemberError is raised because the user is not a member of the room
        """

        self.assertRaises(
            UserNotMemberError,
            self.chat_manager.acknowledge_message,
            self.room_id,
            self.message_id,
            "non_member_user",
        )

    def test_acknowledge_message_error_message_doesnt_exist(self):
        """
        expect: MessageDoesntExistError is raised because no message with this _id exists
        """

        self.assertRaises(
            MessageDoesntExistError,
            self.chat_manager.acknowledge_message,
            self.room_id,
            ObjectId(),
            CURRENT_USER.username,
        )

    def test_get_rooms_with_unacknowledged_messages_for_user(self):
        """
        expect: successfully get all rooms where the user has unacknowledged messages
        """

        # add one more room where the user is not even a member and one where he is a member
        # but has no unacknowledged messages
        room1 = {
            "_id": ObjectId(),
            "name": "room1",
            "members": [CURRENT_ADMIN.username, "some_other_user"],
            "messages": [
                {
                    "_id": ObjectId(),
                    "message": "test2",
                    "sender": CURRENT_USER.username,
                    "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                    "send_states": [
                        {"username": "some_other_user", "send_state": "sent"},
                        {
                            "username": CURRENT_ADMIN.username,
                            "send_state": "acknowledged",
                        },
                    ],
                    "files": [],
                }
            ],
        }
        room2 = {
            "_id": ObjectId(),
            "name": "room1",
            "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
            "messages": [
                {
                    "_id": ObjectId(),
                    "message": "test2",
                    "sender": CURRENT_USER.username,
                    "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                    "send_states": [
                        {
                            "username": CURRENT_ADMIN.username,
                            "send_state": "acknowledged",
                        },
                        {
                            "username": CURRENT_USER.username,
                            "send_state": "acknowledged",
                        },
                    ],
                    "files": [],
                }
            ],
        }
        self.db.chatrooms.insert_many([room1, room2])

        # also add one more acknowledged message to the default room
        # that should not be included in the result
        message = {
            "_id": ObjectId(),
            "message": "test2",
            "sender": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "send_states": [
                {"username": CURRENT_ADMIN.username, "send_state": "acknowledged"},
                {"username": CURRENT_USER.username, "send_state": "acknowledged"},
            ],
            "files": [],
        }
        self.db.chatrooms.update_one(
            {"_id": self.room_id}, {"$push": {"messages": message}}
        )

        # expect only the default room to be returned
        rooms = self.chat_manager.get_rooms_with_unacknowledged_messages_for_user(
            CURRENT_USER.username
        )
        self.assertEqual(len(rooms), 1)
        self.assertEqual(rooms[0]["_id"], self.room_id)
        self.assertEqual(len(rooms[0]["messages"]), 1)

    def test_bulk_sent_message_sent_state(self):
        """
        expect: successfully update message send state
        """

        # add one more message to the default room
        message = {
            "_id": ObjectId(),
            "message": "test2",
            "sender": CURRENT_USER.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "send_states": [
                {"username": CURRENT_ADMIN.username, "send_state": "pending"},
                {"username": CURRENT_USER.username, "send_state": "acknowledged"},
            ],
            "files": [],
        }
        self.db.chatrooms.update_one(
            {"_id": self.room_id}, {"$push": {"messages": message}}
        )

        # add one more room with two messages, one acknowledged and one pending
        room1 = {
            "_id": ObjectId(),
            "name": "room1",
            "members": [CURRENT_ADMIN.username, CURRENT_USER.username],
            "messages": [
                {
                    "_id": ObjectId(),
                    "message": "test2",
                    "sender": CURRENT_USER.username,
                    "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                    "send_states": [
                        {
                            "username": CURRENT_ADMIN.username,
                            "send_state": "acknowledged",
                        },
                        {
                            "username": CURRENT_USER.username,
                            "send_state": "acknowledged",
                        },
                    ],
                    "files": [],
                },
                {
                    "_id": ObjectId(),
                    "message": "test2",
                    "sender": CURRENT_USER.username,
                    "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                    "send_states": [
                        {"username": CURRENT_ADMIN.username, "send_state": "pending"},
                        {
                            "username": CURRENT_USER.username,
                            "send_state": "acknowledged",
                        },
                    ],
                    "files": [],
                },
            ],
        }
        self.db.chatrooms.insert_one(room1)

        self.chat_manager.bulk_set_message_sent_state(
            [self.room_id, room1["_id"]],
            [message["_id"], room1["messages"][1]["_id"]],
            CURRENT_ADMIN.username,
        )

        # expect the new message in the default room and the 2nd message in room1 to be updated
        # to sent
        db_state = self.db.chatrooms.find_one({"_id": self.room_id})
        self.assertIsNotNone(db_state)

        self.assertIn(
            {"username": CURRENT_ADMIN.username, "send_state": "sent"},
            list(filter(lambda m: m["_id"] == message["_id"], db_state["messages"]))[0][
                "send_states"
            ],
        )
        other_room = self.db.chatrooms.find_one({"_id": room1["_id"]})
        self.assertIsNotNone(other_room)
        self.assertIn(
            {"username": CURRENT_ADMIN.username, "send_state": "sent"},
            list(
                filter(
                    lambda m: m["_id"] == room1["messages"][1]["_id"],
                    other_room["messages"],
                )
            )[0]["send_states"],
        )

    def test_get_rooms_of_user(self):
        """
        expect: get full chatroom documents the user is a member of
        """

        # create another room where CURRENT_ADMIN is a member
        room_extra = {
            "_id": ObjectId(),
            "name": "extra_room",
            "members": [CURRENT_ADMIN.username, "someone_else"],
            "messages": [],
        }
        # create a room the user is not member of
        room_other = {
            "_id": ObjectId(),
            "name": "other_room",
            "members": ["user_a", "user_b"],
            "messages": [],
        }
        self.db.chatrooms.insert_many([room_extra, room_other])

        rooms = self.chat_manager.get_rooms_of_user(CURRENT_ADMIN.username)
        self.assertIsInstance(rooms, list)
        self.assertEqual(len(rooms), 2)
        # expect default room and extra room
        ids = [r["_id"] for r in rooms]
        self.assertIn(self.room_id, ids)
        self.assertIn(room_extra["_id"], ids)

    def test_get_file_limits(self):
        """
        expect: the limits reflect the class constants
        """

        limits = self.chat_manager.get_file_limits()
        self.assertEqual(
            limits["max_message_files_bytes"], Chat.MAX_MESSAGE_FILES_BYTES
        )
        self.assertEqual(limits["max_files_per_message"], Chat.MAX_FILES_PER_MESSAGE)
        self.assertEqual(limits["max_room_storage_bytes"], Chat.MAX_ROOM_STORAGE_BYTES)
        self.assertEqual(limits["max_file_name_length"], Chat.MAX_FILE_NAME_LENGTH)

    def test_store_message_with_files(self):
        """
        expect: the file references are stored as part of the message
        """

        stored = self._store_files("notes.txt")
        message = {**self.default_message, "_id": ObjectId(), "files": stored}
        self.chat_manager.store_message(self.room_id, message)

        db_state = self.db.chatrooms.find_one({"_id": self.room_id})
        self.assertEqual(db_state["messages"][1]["files"], stored)

    def test_store_message_files(self):
        """
        expect: the files are stored in gridfs (mime type derived from the name,
        uploader in the metadata) and their references are returned
        """

        stored = self._store_files("notes.txt", "picture.png")

        self.assertEqual([f["file_name"] for f in stored], ["notes.txt", "picture.png"])
        self.assertEqual(stored[0]["content_type"], "text/plain")
        self.assertEqual(stored[1]["content_type"], "image/png")
        self.assertEqual(stored[0]["size"], len(b"notes.txt"))

        fs = gridfs.GridFS(self.db)
        grid_file = fs.get(stored[1]["file_id"])
        self.assertEqual(grid_file.read(), b"picture.png")
        self.assertEqual(util.gridfs_content_type(grid_file), "image/png")
        self.assertEqual(grid_file.metadata["uploader"], CURRENT_ADMIN.username)

    def test_store_message_files_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because the room doesn't exist
        """

        self.assertRaises(
            RoomDoesntExistError,
            self.chat_manager.store_message_files,
            ObjectId(),
            [{"file_name": "a.txt", "content": b"a"}],
            CURRENT_ADMIN.username,
        )

    def test_store_message_files_error_user_not_member(self):
        """
        expect: UserNotMemberError is raised because the uploader is not a member
        of the room, nothing is stored
        """

        self.assertRaises(
            UserNotMemberError,
            self.chat_manager.store_message_files,
            self.room_id,
            [{"file_name": "a.txt", "content": b"a"}],
            "not_a_member",
        )
        self.assertEqual(self.db.fs.files.count_documents({}), 0)

    def test_store_message_files_error_maximum_files_exceeded(self):
        """
        expect: MaximumFilesExceededError is raised for no files at all and for
        more than MAX_FILES_PER_MESSAGE files, nothing is stored
        """

        self.assertRaises(
            MaximumFilesExceededError,
            self.chat_manager.store_message_files,
            self.room_id,
            [],
            CURRENT_ADMIN.username,
        )

        self.chat_manager.MAX_FILES_PER_MESSAGE = 2
        self.assertRaises(
            MaximumFilesExceededError,
            self._store_files,
            "a.txt",
            "b.txt",
            "c.txt",
        )
        self.assertEqual(self.db.fs.files.count_documents({}), 0)

    def test_store_message_files_error_invalid_name(self):
        """
        expect: InvalidFileNameError is raised for an invalid name, nothing is stored
        """

        self.assertRaises(
            InvalidFileNameError, self._store_files, "fine.txt", "../evil.txt"
        )
        self.assertEqual(self.db.fs.files.count_documents({}), 0)

    def test_store_message_files_error_file_too_large(self):
        """
        expect: FileTooLargeError is raised if the files together exceed
        MAX_MESSAGE_FILES_BYTES, nothing is stored
        """

        self.chat_manager.MAX_MESSAGE_FILES_BYTES = 10
        # 5 + 6 bytes, each one alone would fit
        self.assertRaises(FileTooLargeError, self._store_files, "a.txt", "bb.txt")
        self.assertEqual(self.db.fs.files.count_documents({}), 0)

    def test_store_message_files_error_storage_quota_exceeded(self):
        """
        expect: StorageQuotaExceededError is raised if the room would exceed
        MAX_ROOM_STORAGE_BYTES, nothing is stored
        """

        stored = self._store_files("a.txt")
        self._insert_message("", datetime(2023, 1, 2, tzinfo=timezone.utc), stored)

        self.chat_manager.MAX_ROOM_STORAGE_BYTES = len(b"a.txt") + 5
        self.assertRaises(StorageQuotaExceededError, self._store_files, "bb.txt")
        self.assertEqual(self.db.fs.files.count_documents({}), 1)

    def test_get_storage_usage(self):
        """
        expect: the sizes of all files sent in the room are summed up
        """

        self.assertEqual(self.chat_manager.get_storage_usage(self.room_id), 0)

        first = self._store_files("a.txt")
        second = self._store_files("bb.txt", "ccc.txt")
        self._insert_message("", datetime(2023, 1, 2, tzinfo=timezone.utc), first)
        self._insert_message("", datetime(2023, 1, 3, tzinfo=timezone.utc), second)

        self.assertEqual(
            self.chat_manager.get_storage_usage(self.room_id),
            len(b"a.txt") + len(b"bb.txt") + len(b"ccc.txt"),
        )

    @gen_test
    async def test_send_message_with_files(self):
        """
        expect: the files are stored as part of the message
        """

        stored = self._store_files("notes.txt")
        await self.chat_manager.send_message(
            self.room_id, "see attachment", CURRENT_ADMIN.username, stored
        )

        db_state = self.db.chatrooms.find_one({"_id": self.room_id})
        message = db_state["messages"][1]
        self.assertEqual(message["message"], "see attachment")
        self.assertEqual(message["files"], stored)

    def test_search_messages(self):
        """
        expect: messages are found case-insensitively by their text and by the
        names of their files, newest first and without send states; special
        characters are matched literally and an empty query yields nothing
        """

        older = self._insert_message(
            "Meeting on Monday", datetime(2023, 1, 2, tzinfo=timezone.utc)
        )
        newer = self._insert_message(
            "the meeting notes (draft)", datetime(2023, 1, 3, tzinfo=timezone.utc)
        )
        with_file = self._insert_message(
            "",
            datetime(2023, 1, 4, tzinfo=timezone.utc),
            [
                {
                    "file_id": ObjectId(),
                    "file_name": "Meeting-Slides.pdf",
                    "content_type": "application/pdf",
                    "size": 1,
                }
            ],
        )

        results = self.chat_manager.search_messages(self.room_id, " MEETING ")
        self.assertEqual(
            [m["_id"] for m in results],
            [with_file["_id"], newer["_id"], older["_id"]],
        )
        self.assertTrue(all("send_states" not in m for m in results))

        results = self.chat_manager.search_messages(self.room_id, "(draft)")
        self.assertEqual([m["_id"] for m in results], [newer["_id"]])

        self.assertEqual(self.chat_manager.search_messages(self.room_id, ".*"), [])
        self.assertEqual(self.chat_manager.search_messages(self.room_id, "   "), [])

    def test_search_messages_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because the room doesn't exist
        """

        self.assertRaises(
            RoomDoesntExistError, self.chat_manager.search_messages, ObjectId(), "test"
        )

    def test_get_files_of_room(self):
        """
        expect: all files of the room are returned newest first, together with
        the message they were sent with
        """

        first = self._store_files("a.txt")
        second = self._store_files("b.txt", "c.txt")
        first_message = self._insert_message(
            "", datetime(2023, 1, 2, tzinfo=timezone.utc), first
        )
        second_message = self._insert_message(
            "two files", datetime(2023, 1, 3, tzinfo=timezone.utc), second
        )

        files = self.chat_manager.get_files_of_room(self.room_id)
        self.assertEqual([f["file_name"] for f in files], ["b.txt", "c.txt", "a.txt"])
        self.assertEqual(files[0]["message_id"], second_message["_id"])
        self.assertEqual(files[2]["message_id"], first_message["_id"])
        self.assertEqual(files[2]["file_id"], first[0]["file_id"])
        self.assertEqual(files[2]["sender"], CURRENT_ADMIN.username)
        self.assertEqual(files[2]["content_type"], "text/plain")
        self.assertEqual(files[2]["size"], len(b"a.txt"))
        self.assertIsNotNone(files[2]["creation_date"])

    def test_get_files_of_room_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because the room doesn't exist
        """

        self.assertRaises(
            RoomDoesntExistError, self.chat_manager.get_files_of_room, ObjectId()
        )

    def test_get_room_members_by_file_id(self):
        """
        expect: the members of the room the file was sent in, or None for
        files that weren't sent in a chat
        """

        stored = self._store_files("a.txt")
        self._insert_message("", datetime(2023, 1, 2, tzinfo=timezone.utc), stored)

        self.assertEqual(
            self.chat_manager.get_room_members_by_file_id(stored[0]["file_id"]),
            self.default_room["members"],
        )
        self.assertIsNone(self.chat_manager.get_room_members_by_file_id(ObjectId()))

    def test_delete_room(self):
        """
        expect: the room is deleted including its messages and the files that
        were sent in it, files of other rooms are left alone
        """

        stored = self._store_files("a.txt", "b.txt")
        self._insert_message("", datetime(2023, 1, 2, tzinfo=timezone.utc), stored)

        other_room_id = ObjectId()
        self.db.chatrooms.insert_one(
            {
                "_id": other_room_id,
                "name": None,
                "members": [CURRENT_ADMIN.username],
                "messages": [],
            }
        )
        other_file = self.chat_manager.store_message_files(
            other_room_id,
            [{"file_name": "keep.txt", "content": b"x"}],
            CURRENT_ADMIN.username,
        )

        members = self.chat_manager.delete_room(self.room_id)

        self.assertEqual(members, self.default_room["members"])
        self.assertIsNone(self.db.chatrooms.find_one({"_id": self.room_id}))
        fs = gridfs.GridFS(self.db)
        self.assertFalse(any(fs.exists(f["file_id"]) for f in stored))
        self.assertTrue(fs.exists(other_file[0]["file_id"]))
        self.assertIsNotNone(self.db.chatrooms.find_one({"_id": other_room_id}))

    def test_delete_room_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because the room doesn't exist
        """

        self.assertRaises(
            RoomDoesntExistError, self.chat_manager.delete_room, ObjectId()
        )


class ElasticsearchIntegrationTest(BaseResourceTestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        super().tearDown()

        # clean elasticsearch index, if there is one
        response = requests.delete(
            "{}/test?ignore_unavailable=true".format(
                global_vars.elasticsearch_base_url
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        if response.status_code != 200:
            print(response.content)

    def test_dict_or_list_values_to_str(self):
        """
        expect: successfully flatten out dict or list values into a single str,
        effectively removing dict keys.
        """
        es = ElasticsearchConnector()

        # dict
        d = {"key1": "value1", "key2": "value2"}
        self.assertEqual(es._dict_or_list_values_to_str(d), "value1 value2")

        # list
        l = ["value1", "value2"]
        self.assertEqual(es._dict_or_list_values_to_str(l), "value1 value2")

        # mixed
        l = ["value1", {"key1": "value1", "key2": "value2"}]
        self.assertEqual(es._dict_or_list_values_to_str(l), "value1 value1 value2")

    def test_on_insert(self):
        """
        expect: successfully replicate profile document to elasticsearch
        """

        user_id = ObjectId()
        test_profile = {
            "_id": user_id,
            "username": "test_admin",
            "role": "guest",
            "follows": [],
            "bio": "test",
            "institution": "test",
            "profile_pic": "default_profile_pic.jpg",
            "first_name": "Test",
            "last_name": "Admin",
            "gender": "male",
            "address": "test",
            "birthday": "2023-01-01",
            "experience": ["test", "test"],
            "expertise": "test",
            "languages": ["german", "english"],
            "ve_ready": True,
            "excluded_from_matching": False,
            "ve_interests": ["test", "test"],
            "ve_goals": ["test", "test"],
            "preferred_formats": ["test"],
            "research_tags": ["test"],
            "courses": [
                {"title": "test", "academic_course": "test", "semester": "test"}
            ],
            "educations": [
                {
                    "institution": "test",
                    "degree": "test",
                    "department": "test",
                    "timestamp_from": "2023-01-01",
                    "timestamp_to": "2023-02-01",
                    "additional_info": "test",
                }
            ],
            "work_experience": [
                {
                    "position": "test",
                    "institution": "test",
                    "department": "test",
                    "timestamp_from": "2023-01-01",
                    "timestamp_to": "2023-02-01",
                    "city": "test",
                    "country": "test",
                    "additional_info": "test",
                }
            ],
            "ve_window": [
                {
                    "plan_id": ObjectId(),
                    "title": "test",
                    "description": "test",
                }
            ],
        }

        es = ElasticsearchConnector()
        es.on_insert(user_id, test_profile, "test")

        # check that the elastic document exists
        response = requests.get(
            "{}/{}/_doc/{}".format(global_vars.elasticsearch_base_url, "test", user_id),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)

    def test_on_update(self):
        """
        expect: successfully update the record of a profile document in elasticsearch
        by overriding it
        """

        # create a profile first
        user_id = ObjectId()
        test_profile = {
            "_id": user_id,
            "username": "test_admin",
            "role": "guest",
            "follows": [],
            "bio": "test",
            "institution": "test",
            "profile_pic": "default_profile_pic.jpg",
            "first_name": "Test",
            "last_name": "Admin",
            "gender": "male",
            "address": "test",
            "birthday": "2023-01-01",
            "experience": ["test", "test"],
            "expertise": "test",
            "languages": ["german", "english"],
            "ve_ready": True,
            "excluded_from_matching": False,
            "ve_interests": ["test", "test"],
            "ve_goals": ["test", "test"],
            "preferred_formats": ["test"],
            "research_tags": ["test"],
            "courses": [
                {"title": "test", "academic_course": "test", "semester": "test"}
            ],
            "educations": [
                {
                    "institution": "test",
                    "degree": "test",
                    "department": "test",
                    "timestamp_from": "2023-01-01",
                    "timestamp_to": "2023-02-01",
                    "additional_info": "test",
                }
            ],
            "work_experience": [
                {
                    "position": "test",
                    "institution": "test",
                    "department": "test",
                    "timestamp_from": "2023-01-01",
                    "timestamp_to": "2023-02-01",
                    "city": "test",
                    "country": "test",
                    "additional_info": "test",
                }
            ],
            "ve_window": [
                {
                    "plan_id": ObjectId(),
                    "title": "test",
                    "description": "test",
                }
            ],
        }
        es = ElasticsearchConnector()
        requests.put(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", str(user_id)
            ),
            json=util.json_serialize_response(test_profile),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )

        # now update the profile
        test_profile["username"] = "updated"
        es.on_update(user_id, "test", test_profile)

        # check that the elastic document exists and the username was updated
        response = requests.get(
            "{}/{}/_doc/{}".format(global_vars.elasticsearch_base_url, "test", user_id),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["_source"]["username"], "updated")

    def test_on_delete(self):
        """
        expect: successfully remove a profile from the elasticsearch index
        """

        # create a profile first
        user_id = ObjectId()
        test_profile = {
            "_id": user_id,
            "username": "test_admin",
            "role": "guest",
            "follows": [],
            "bio": "test",
            "institution": "test",
            "profile_pic": "default_profile_pic.jpg",
            "first_name": "Test",
            "last_name": "Admin",
            "gender": "male",
            "address": "test",
            "birthday": "2023-01-01",
            "experience": ["test", "test"],
            "expertise": "test",
            "languages": ["german", "english"],
            "ve_ready": True,
            "excluded_from_matching": False,
            "ve_interests": ["test", "test"],
            "ve_goals": ["test", "test"],
            "preferred_formats": ["test"],
            "research_tags": ["test"],
            "courses": [
                {"title": "test", "academic_course": "test", "semester": "test"}
            ],
            "educations": [
                {
                    "institution": "test",
                    "degree": "test",
                    "department": "test",
                    "timestamp_from": "2023-01-01",
                    "timestamp_to": "2023-02-01",
                    "additional_info": "test",
                }
            ],
            "work_experience": [
                {
                    "position": "test",
                    "institution": "test",
                    "department": "test",
                    "timestamp_from": "2023-01-01",
                    "timestamp_to": "2023-02-01",
                    "city": "test",
                    "country": "test",
                    "additional_info": "test",
                }
            ],
            "ve_window": [
                {
                    "plan_id": ObjectId(),
                    "title": "test",
                    "description": "test",
                }
            ],
        }
        es = ElasticsearchConnector()
        requests.put(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", str(user_id)
            ),
            json=util.json_serialize_response(test_profile),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )

        # now delete the profile
        es.on_delete(user_id, "test")

        # check that no elastic document with this id exists
        response = requests.get(
            "{}/{}/_doc/{}".format(global_vars.elasticsearch_base_url, "test", user_id),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 404)

    def test_search_profile_match(self):
        pass


class NotificationIntegrationTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        # insert some notifications
        self.notifications = [
            {
                "_id": ObjectId(),
                "type": "new_messages",
                "to": CURRENT_ADMIN.username,
                "receive_state": "pending",
                "creation_timestamp": datetime.now(timezone.utc),
                "payload": {},
            },
            {
                "_id": ObjectId(),
                "type": "space_invitation",
                "to": CURRENT_ADMIN.username,
                "receive_state": "sent",
                "creation_timestamp": datetime.now(timezone.utc),
                "payload": {},
            },
            {
                "_id": ObjectId(),
                "type": "new_messages",
                "to": CURRENT_USER.username,
                "receive_state": "pending",
                "creation_timestamp": datetime.now(timezone.utc),
                "payload": {},
            },
        ]
        self.db.notifications.insert_many(self.notifications)

        self.notification_manager = NotificationResource(self.db)

    def tearDown(self) -> None:
        super().tearDown()
        self.db.notifications.delete_many({})
        self.notification_manager = None

    def test_get_notifications_of_user(self):
        """
        expect: retrieve all notifications for a user
        """

        res = self.notification_manager.get_notifications_of_user(
            CURRENT_ADMIN.username
        )
        self.assertIsInstance(res, list)
        # expect at least the two notifications targeted at CURRENT_ADMIN
        self.assertGreaterEqual(len(res), 2)


class MailInvitationResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        # create default invitation:
        self.default_invitation = {
            "_id": ObjectId(),
            "sender": CURRENT_ADMIN.username,
            "recipient_name": "invitation_receiver",
            "recipient_mail": "invitation_receiver@mail.com",
            "message": "test",
            "timestamp": datetime.now(timezone.utc),
        }
        self.db.mail_invitations.insert_one(self.default_invitation)

        self.invitation_manager = MailInvitation(self.db)

    def tearDown(self) -> None:
        super().tearDown()

        self.db.mail_invitations.delete_many({})

    def test_check_within_rate_limit(self):
        """
        expect: successfully check if the user is within the rate limit
        """

        # expect True because the user has sent less than 10 invitations in the last 24 hours
        self.assertTrue(
            self.invitation_manager.check_within_rate_limit(CURRENT_ADMIN.username)
        )

        # add 10 more invitations
        for i in range(10):
            self.db.mail_invitations.insert_one(
                {
                    "_id": ObjectId(),
                    "sender": CURRENT_ADMIN.username,
                    "recipient_name": "invitation_receiver",
                    "recipient_mail": "invitation_receiver@mail.com",
                    "message": "test",
                    "timestamp": datetime.now(timezone.utc) - timedelta(hours=i),
                }
            )

        # expect False because the user has now sent more than 10 invitations in the last 24 hours
        self.assertFalse(
            self.invitation_manager.check_within_rate_limit(CURRENT_ADMIN.username)
        )

    def test_insert_invitation(self):
        """
        expect: successfully insert an invitation
        """

        invitation = {
            "sender": CURRENT_ADMIN.username,
            "recipient_name": "invitation_receiver",
            "recipient_mail": "invitation_receiver@mail.com",
            "message": "test",
            "plan_id": None,
            "replied": False,
            "timestamp": datetime.now(timezone.utc),
        }

        inserted_id = self.invitation_manager.insert_invitation(invitation)

        # expect the invitation to be in the db
        db_state = self.db.mail_invitations.find_one({"_id": inserted_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["sender"], invitation["sender"])
        self.assertEqual(db_state["recipient_name"], invitation["recipient_name"])
        self.assertEqual(db_state["recipient_mail"], invitation["recipient_mail"])
        self.assertEqual(db_state["message"], invitation["message"])
        self.assertIsNotNone(db_state["timestamp"])

    def test_insert_invitation_error_missing_attributes(self):
        """
        expect: ValueError is raised because the invitation is missing required attributes
        """

        # recipient_name missing
        invitation = {
            "sender": CURRENT_ADMIN.username,
            "recipient_mail": "invitation_receiver@mail.com",
            "message": "test",
            "timestamp": datetime.now(timezone.utc),
        }

        self.assertRaises(
            ValueError, self.invitation_manager.insert_invitation, invitation
        )

    def test_get_invitations_sent_by(self):
        """
        expect: retrieve invitations sent by given sender
        """

        # insert a few invitations and one fron another user
        for i in range(2):
            inv = {
                "_id": ObjectId(),
                "sender": CURRENT_ADMIN.username,
                "recipient_name": f"r{i}",
                "recipient_mail": f"r{i}@mail.com",
                "message": "hi",
                "plan_id": None,
                "replied": False,
                "timestamp": datetime.now(timezone.utc),
            }
            self.db.mail_invitations.insert_one(inv)
        other_inv = {
            "_id": ObjectId(),
            "sender": "other_user",
            "recipient_name": "other_recipient",
            "recipient_mail": "other_recipient@mail.com",
            "message": "hi",
            "plan_id": None,
            "replied": False,
            "timestamp": datetime.now(timezone.utc),
        }
        self.db.mail_invitations.insert_one(other_inv)

        result = self.invitation_manager.get_invitations_sent_by(CURRENT_ADMIN.username)
        self.assertIsInstance(result, list)
        self.assertGreaterEqual(len(result), 3)


class ReportResourceTest(BaseResourceTestCase, AsyncTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.report_manager = Reports(self.db)

        self.report_id = ObjectId()
        self.reported_item_id = ObjectId()

        self.default_report = {
            "_id": self.report_id,
            "reporter": CURRENT_ADMIN.username,
            "type": "post",
            "item_id": self.reported_item_id,
            "reason": "test",
            "state": "open",
            "timestamp": datetime.now(timezone.utc),
        }
        self.db.reports.insert_one(self.default_report)

        self.reported_post = {
            "_id": self.reported_item_id,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "plans": [],
            "files": [],
            "comments": [],
            "likers": [],
        }
        self.db.posts.insert_one(self.reported_post)

        self.db.profiles.insert_one(
            {
                "_id": ObjectId(),
                "username": CURRENT_ADMIN.username,
                "role": "guest",
                "follows": [],
                "bio": "test",
                "institutions": [
                    {
                        "_id": ObjectId(),
                        "name": "test",
                        "department": "test",
                        "school_type": "test",
                        "country": "test",
                    }
                ],
                "chosen_institution_id": None,
                "profile_pic": "default_profile_pic.jpg",
                "first_name": "Test",
                "last_name": "Admin",
                "gender": "male",
                "address": "test",
                "birthday": "2023-01-01",
                "experience": ["test", "test"],
                "expertise": "test",
                "languages": ["german", "english"],
                "ve_ready": True,
                "excluded_from_matching": False,
                "ve_interests": ["test", "test"],
                "ve_contents": ["test", "test"],
                "ve_goals": ["test", "test"],
                "interdisciplinary_exchange": True,
                "preferred_format": "test",
                "research_tags": ["test"],
                "courses": [
                    {"title": "test", "academic_course": "test", "semester": "test"}
                ],
                "lms": ["test"],
                "tools": ["test"],
                "educations": [
                    {
                        "institution": "test",
                        "degree": "test",
                        "department": "test",
                        "timestamp_from": "2023-01-01",
                        "timestamp_to": "2023-02-01",
                        "additional_info": "test",
                    }
                ],
                "work_experience": [
                    {
                        "position": "test",
                        "institution": "test",
                        "department": "test",
                        "timestamp_from": "2023-01-01",
                        "timestamp_to": "2023-02-01",
                        "city": "test",
                        "country": "test",
                        "additional_info": "test",
                    }
                ],
                "ve_window": [
                    {
                        "plan_id": ObjectId(),
                        "title": "test",
                        "description": "test",
                    }
                ],
                "notification_settings": {
                    "messages": "push",
                    "ve_invite": "push",
                    "group_invite": "push",
                    "system": "push",
                },
                "achievements": {
                    "social": {"level": 0, "progress": 0, "next_level": 20},
                    "ve": {"level": 0, "progress": 0, "next_level": 40},
                    "tracking": {
                        "good_practice_plans": [],
                        "unique_partners": [],
                    },
                },
                "chosen_achievement": {"type": "", "level": 0},
            }
        )

    def tearDown(self) -> None:
        super().tearDown()

        self.db.reports.delete_many({})
        self.db.posts.delete_many({})
        self.db.profiles.delete_many({})
        self.report_manager = None

    def test_get_report(self):
        """
        expect: successfully get a report
        """

        report = self.report_manager.get_report(self.report_id)

        self.assertIsNotNone(report)
        self.assertEqual(report["type"], self.default_report["type"])
        self.assertEqual(report["item_id"], self.reported_item_id)
        self.assertEqual(report["item"]["_id"], self.reported_item_id)
        self.assertEqual(report["reason"], self.default_report["reason"])
        self.assertEqual(report["reporter"], self.default_report["reporter"])
        self.assertEqual(report["state"], self.default_report["state"])

    def test_get_report_error_report_doesnt_exist(self):
        """
        expect: ReportDoesntExistError is raised because no report with this _id exists
        """

        self.assertRaises(
            ReportDoesntExistError, self.report_manager.get_report, ObjectId()
        )

    def test_get_report_item_none(self):
        """
        expect: get the report, but the item inside doesn't exist --> should be None
        instead of raising an errror
        """

        # add a report with an item that doesn't exist
        report_id = ObjectId()
        self.db.reports.insert_one(
            {
                "_id": report_id,
                "reporter": CURRENT_ADMIN.username,
                "type": "post",
                "item_id": ObjectId(),
                "reason": "test",
                "state": "open",
                "timestamp": datetime.now(timezone.utc),
            }
        )

        report = self.report_manager.get_report(report_id)

        self.assertIsNotNone(report)
        self.assertIsNone(report["item"])

    def test_get_open_reports(self):
        """
        expect: get all reports with state "open"
        """

        # add one more report with state "open" and one with state "closed"
        self.db.reports.insert_many(
            [
                {
                    "_id": ObjectId(),
                    "reporter": CURRENT_ADMIN.username,
                    "type": "post",
                    "item_id": ObjectId(),
                    "reason": "test",
                    "state": "open",
                    "timestamp": datetime.now(timezone.utc),
                },
                {
                    "_id": ObjectId(),
                    "reporter": CURRENT_ADMIN.username,
                    "type": "post",
                    "item_id": ObjectId(),
                    "reason": "test",
                    "state": "closed",
                    "timestamp": datetime.now(timezone.utc),
                },
            ]
        )

        reports = self.report_manager.get_open_reports()

        self.assertEqual(len(reports), 2)
        self.assertIsNotNone(reports[0])
        self.assertIsNotNone(reports[1])
        self.assertEqual(reports[0]["state"], "open")
        self.assertEqual(reports[1]["state"], "open")

    def test_get_all_reports(self):
        """
        expect: successfully get all reports
        """

        # add one more report with state "open" and one with state "closed"
        self.db.reports.insert_many(
            [
                {
                    "_id": ObjectId(),
                    "reporter": CURRENT_ADMIN.username,
                    "type": "post",
                    "item_id": ObjectId(),
                    "reason": "test",
                    "state": "open",
                    "timestamp": datetime.now(timezone.utc),
                },
                {
                    "_id": ObjectId(),
                    "reporter": CURRENT_ADMIN.username,
                    "type": "post",
                    "item_id": ObjectId(),
                    "reason": "test",
                    "state": "closed",
                    "timestamp": datetime.now(timezone.utc),
                },
            ]
        )

        reports = self.report_manager.get_all_reports()

        self.assertEqual(len(reports), 3)
        # two reports with state "open" and one with state "closed"
        self.assertEqual(len(list(filter(lambda r: r["state"] == "open", reports))), 2)
        self.assertEqual(
            len(list(filter(lambda r: r["state"] == "closed", reports))), 1
        )

    def test_get_reported_item(self):
        """
        expect: successfully get the reported item
        """

        reported_item = self.report_manager.get_reported_item(
            self.reported_item_id, "post"
        )

        self.assertIsNotNone(reported_item)
        self.assertEqual(reported_item["_id"], self.reported_item_id)
        self.assertEqual(reported_item["author"], self.reported_post["author"])
        self.assertEqual(reported_item["text"], self.reported_post["text"])
        self.assertEqual(
            reported_item["creation_date"], self.reported_post["creation_date"]
        )

    def test_get_reported_item_item_none(self):
        """
        expect: get the reported item, but the item doesn't exist --> should be None
        instead of raising an errror
        """

        # add a report with an item that doesn't exist
        report_id = ObjectId()
        self.db.reports.insert_one(
            {
                "_id": report_id,
                "reporter": CURRENT_ADMIN.username,
                "type": "post",
                "item_id": ObjectId(),
                "reason": "test",
                "state": "open",
                "timestamp": datetime.now(timezone.utc),
            }
        )

        reported_item = self.report_manager.get_reported_item(ObjectId(), "post")

        self.assertIsNone(reported_item)

    def test_insert_report(self):
        """
        expect: successfully insert a report
        """

        report = {
            "reporter": CURRENT_ADMIN.username,
            "type": "post",
            "item_id": self.reported_item_id,
            "reason": "another_report",
        }

        inserted_id = self.report_manager.insert_report(report)

        # expect the report to be in the db
        db_state = self.db.reports.find_one({"_id": inserted_id})
        self.assertIsNotNone(db_state)

        self.assertEqual(db_state["reporter"], report["reporter"])
        self.assertEqual(db_state["type"], report["type"])
        self.assertEqual(db_state["item_id"], report["item_id"])
        self.assertEqual(db_state["reason"], report["reason"])
        self.assertEqual(db_state["state"], "open")
        self.assertIsNotNone(db_state["timestamp"])

    def test_insert_report_error_missing_attributes(self):
        """
        expect: ValueError is raised because the report is missing required attributes
        """

        # reason missing
        report = {
            "reporter": CURRENT_ADMIN.username,
            "type": "post",
            "item_id": self.reported_item_id,
        }

        self.assertRaises(ValueError, self.report_manager.insert_report, report)

    def test_close_report(self):
        """
        expect: successfully set a report's state to closed
        """

        self.report_manager.close_report(self.report_id)

        # expect the report to be in the db with state "closed"
        db_state = self.db.reports.find_one({"_id": self.report_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["state"], "closed")

    def test_close_report_error_report_doesnt_exist(self):
        """
        expect: ReportDoesntExistError is raised because no report with this _id exists
        """

        self.assertRaises(
            ReportDoesntExistError, self.report_manager.close_report, ObjectId()
        )

    @gen_test
    async def test_delete_reported_item(self):
        """
        expect: successfully delete the reported item
        """

        await self.report_manager.delete_reported_item(self.report_id)

        # expect the reported item to be deleted
        db_state = self.db.posts.find_one({"_id": self.reported_item_id})
        self.assertIsNone(db_state)

    @gen_test
    async def test_delete_reported_item_error_report_doesnt_exist(self):
        """
        expect: ReportDoesntExistError is raised because no report with this _id exists
        """

        with self.assertRaises(ReportDoesntExistError):
            await self.report_manager.delete_reported_item(ObjectId())
