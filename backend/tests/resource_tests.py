from bson import ObjectId
from datetime import datetime, timedelta
import os
import time
from unittest import TestCase
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
    InvitationDoesntExistError,
    MaximumFilesExceededError,
    MessageDoesntExistError,
    MissingKeyError,
    NoReadAccessError,
    NoWriteAccessError,
    NonUniqueTasksError,
    NotFollowedException,
    NotLikerException,
    NotRequestedJoinError,
    OnlyAdminError,
    PlanAlreadyExistsError,
    PlanDoesntExistError,
    RoomDoesntExistError,
    PostFileNotDeleteableError,
    PostNotExistingException,
    ProfileDoesntExistException,
    SpaceAlreadyExistsError,
    SpaceDoesntExistError,
    UserNotAdminError,
    UserNotInvitedError,
    UserNotMemberError,
)
import global_vars
from main import make_app  # import, otherwise test mode will fail in the app
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
from resources.network.acl import ACL
from resources.network.chat import Chat
from resources.network.post import Posts
from resources.network.profile import Profiles
from resources.network.space import Spaces
from resources.planner.ve_plan import VEPlanResource
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
        self.assertEqual(acl_entry["post"], False)
        self.assertEqual(acl_entry["comment"], False)
        self.assertEqual(acl_entry["read_wiki"], False)
        self.assertEqual(acl_entry["write_wiki"], False)
        self.assertEqual(acl_entry["read_files"], False)
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
                        "social": [
                            {"type": "create_posts", "progress": 0, "level": None},
                            {"type": "create_comments", "progress": 0, "level": None},
                            {"type": "give_likes", "progress": 0, "level": None},
                            {"type": "posts_liked", "progress": 0, "level": None},
                            {"type": "join_groups", "progress": 0, "level": None},
                            {"type": "admin_groups", "progress": 0, "level": None},
                        ],
                        "ve": [
                            {"type": "ve_plans", "progress": 0, "level": None},
                            {
                                "type": "good_practice_plans",
                                "progress": 0,
                                "level": None,
                            },
                            {"type": "unique_partners", "progress": 0, "level": None},
                        ],
                        "tracking": {
                            "good_practice_plans": [],
                            "unique_partners": [],
                        },
                    },
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
                        "social": [
                            {"type": "create_posts", "progress": 0, "level": None},
                            {"type": "create_comments", "progress": 0, "level": None},
                            {"type": "give_likes", "progress": 0, "level": None},
                            {"type": "posts_liked", "progress": 0, "level": None},
                            {"type": "join_groups", "progress": 0, "level": None},
                            {"type": "admin_groups", "progress": 0, "level": None},
                        ],
                        "ve": [
                            {"type": "ve_plans", "progress": 0, "level": None},
                            {
                                "type": "good_practice_plans",
                                "progress": 0,
                                "level": None,
                            },
                            {"type": "unique_partners", "progress": 0, "level": None},
                        ],
                        "tracking": {
                            "good_practice_plans": [],
                            "unique_partners": [],
                        },
                    },
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
            profile["achievements"]["social"][0]["progress"],
            1,
        )

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
            profile["achievements"]["social"][0]["progress"],
            1,
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

        # since it was an update, the post should not count towards "create_posts" achievement
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"][0]["progress"],
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
            "files": [
                {
                    "file_id": file_id,
                    "author": CURRENT_ADMIN.username,
                    "manually_uploaded": True,
                }
            ],
        }
        self.db.spaces.insert_one(space)

        # create a post in the space
        post_id = ObjectId()
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

        # check if file was deleted from space's repository
        space = self.db.spaces.find_one({"_id": space_id})
        self.assertEqual(space["files"], [])

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

        # add 2 more space posts
        space_id = ObjectId()
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
                "files": [],
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

        # check if posts were deleted
        posts = list(self.db.posts.find({"space": space_id}))
        self.assertEqual(len(posts), 0)

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

        # check if like counted towards "give_likes" achievement of user
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"][2]["progress"],
            1,
        )

        # since this was the users own post, the like should not count towards
        # "posts_liked" achievement
        self.assertEqual(
            profile["achievements"]["social"][3]["progress"],
            0,
        )

        post_manager.like_post(self.post_id, CURRENT_USER.username)

        # now check if like counted towards "posts_liked" achievement, because
        # it was from a different user
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"][3]["progress"],
            1,
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

        # check if comment counted towards "create_comments" achievement of user
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"][1]["progress"],
            1,
        )

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
            profile["achievements"]["social"][1]["progress"],
            1,
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
        # "create_comments" achievement
        profile = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            profile["achievements"]["social"][1]["progress"],
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
                "creation_date": datetime.now(),
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
            "creation_date": datetime.now() + timedelta(days=1),
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
        posts = post_manager.get_full_timeline(datetime.now(), 10)
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
                "creation_date": datetime.now(),
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
            "creation_date": datetime.now() + timedelta(days=1),
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
            space_id, datetime.now(), 10
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
                "creation_date": datetime.now(),
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
            CURRENT_USER.username, datetime.now(), 10
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
            "creation_date": datetime.now(),
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
            "creation_date": datetime.now(),
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
            "creation_date": datetime.now(),
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
            "creation_date": datetime.now(),
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
            "creation_date": datetime.now(),
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
            "creation_date": datetime.now() + timedelta(days=1),
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
            CURRENT_ADMIN.username, datetime.now()
        )
        self.assertEqual(len(posts), 4)
        post_ids = [post["_id"] for post in posts]
        self.assertIn(post1["_id"], post_ids)
        self.assertIn(post3["_id"], post_ids)
        self.assertIn(post5["_id"], post_ids)
        self.assertIn(self.post_id, post_ids)

    def test_get_personal_timeline_legacy(self):
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
            "creation_date": datetime.now(),
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
            "creation_date": datetime.now(),
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
            "creation_date": datetime.now(),
            "text": "testgydfgdfg",
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
            "creation_date": datetime.now(),
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
            "creation_date": datetime.now(),
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

        self.db.posts.insert_many([post1, post2, post3, post4, post5])

        post_manager = Posts(self.db)
        # this should include post1 because it is from a user that the user follows,
        # post3 because it is from a space that the user is a member of,
        # and post5 because it is the users own post
        # but not the default post because it is out of time frame
        posts = post_manager.get_personal_timeline_legacy(
            CURRENT_ADMIN.username, datetime.now() - timedelta(days=1), datetime.now()
        )
        self.assertEqual(len(posts), 3)
        post_ids = [post["_id"] for post in posts]
        self.assertIn(post1["_id"], post_ids)
        self.assertIn(post3["_id"], post_ids)
        self.assertIn(post5["_id"], post_ids)

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


class ProfileResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.profile_id = ObjectId()
        self.default_profile = self.create_profile(
            CURRENT_ADMIN.username, self.profile_id
        )
        self.default_profile["follows"] = [CURRENT_USER.username]
        self.db.profiles.insert_one(self.default_profile)

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
                "social": [
                    {"type": "create_posts", "progress": 105, "level": "platinum"},
                    {"type": "create_comments", "progress": 0, "level": None},
                    {"type": "give_likes", "progress": 0, "level": None},
                    {"type": "posts_liked", "progress": 0, "level": None},
                    {"type": "join_groups", "progress": 0, "level": None},
                    {"type": "admin_groups", "progress": 0, "level": None},
                ],
                "ve": [
                    {"type": "ve_plans", "progress": 0, "level": None},
                    {"type": "good_practice_plans", "progress": 1, "level": "bronze"},
                    {"type": "unique_partners", "progress": 0, "level": None},
                ],
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
            "chosen_achievement": {
                "type": "create_posts",
                "level": "platinum",
            },
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
                "social": [
                    {"type": "create_posts", "progress": 0, "level": None},
                    {"type": "create_comments", "progress": 0, "level": None},
                    {"type": "give_likes", "progress": 0, "level": None},
                    {"type": "posts_liked", "progress": 0, "level": None},
                    {"type": "join_groups", "progress": 0, "level": None},
                    {"type": "admin_groups", "progress": 0, "level": None},
                ],
                "ve": [
                    {"type": "ve_plans", "progress": 0, "level": None},
                    {"type": "good_practice_plans", "progress": 0, "level": None},
                    {"type": "unique_partners", "progress": 0, "level": None},
                ],
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
        )
        self.assertEqual(profile["chosen_achievement"], {"type": None, "level": None})

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
                "social": [
                    {"type": "create_posts", "progress": 0, "level": None},
                    {"type": "create_comments", "progress": 0, "level": None},
                    {"type": "give_likes", "progress": 0, "level": None},
                    {"type": "posts_liked", "progress": 0, "level": None},
                    {"type": "join_groups", "progress": 0, "level": None},
                    {"type": "admin_groups", "progress": 0, "level": None},
                ],
                "ve": [
                    {"type": "ve_plans", "progress": 0, "level": None},
                    {"type": "good_practice_plans", "progress": 0, "level": None},
                    {"type": "unique_partners", "progress": 0, "level": None},
                ],
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
        )
        self.assertEqual(profile["chosen_achievement"], {"type": None, "level": None})

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
                "social": [
                    {"type": "create_posts", "progress": 0, "level": None},
                    {"type": "create_comments", "progress": 0, "level": None},
                    {"type": "give_likes", "progress": 0, "level": None},
                    {"type": "posts_liked", "progress": 0, "level": None},
                    {"type": "join_groups", "progress": 0, "level": None},
                    {"type": "admin_groups", "progress": 0, "level": None},
                ],
                "ve": [
                    {"type": "ve_plans", "progress": 0, "level": None},
                    {"type": "good_practice_plans", "progress": 0, "level": None},
                    {"type": "unique_partners", "progress": 0, "level": None},
                ],
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
        )
        self.assertEqual(result["chosen_achievement"], {"type": None, "level": None})

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
                "social": [
                    {"type": "create_posts", "progress": 0, "level": None},
                    {"type": "create_comments", "progress": 0, "level": None},
                    {"type": "give_likes", "progress": 0, "level": None},
                    {"type": "posts_liked", "progress": 0, "level": None},
                    {"type": "join_groups", "progress": 0, "level": None},
                    {"type": "admin_groups", "progress": 0, "level": None},
                ],
                "ve": [
                    {"type": "ve_plans", "progress": 0, "level": None},
                    {"type": "good_practice_plans", "progress": 0, "level": None},
                    {"type": "unique_partners", "progress": 0, "level": None},
                ],
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
        )
        self.assertEqual(profile["chosen_achievement"], {"type": None, "level": None})

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
            {"achievements": [{"type": "join_groups", "progress": 100}]},
        )
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"],
            self.default_profile["achievements"],
        )

        # try again choosing a new achievement, expecting that it will be set
        # because user has reached the needed level
        # TODO for now, set arbitrary achievement since tracking is not yet implemented
        # after tracking is implemented, check if the to-bet-set level is actually achieved
        profile_manager.update_profile_information(
            CURRENT_ADMIN.username,
            {"chosen_achievement": {"type": "join_groups", "level": "bronze"}},
        )
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["chosen_achievement"],
            {"type": "join_groups", "level": "bronze"},
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

    def test_update_profile_information_error_invalid_achievement(self):
        """
        expect: ValueError is raised because the achievement type or level is invalid
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ValueError,
            profile_manager.update_profile_information,
            self.default_profile["username"],
            {"chosen_achievement": {"type": "non_existing", "level": "bronze"}},
        )
        self.assertRaises(
            ValueError,
            profile_manager.update_profile_information,
            self.default_profile["username"],
            {"chosen_achievement": {"type": "create_posts", "level": "non_existing"}},
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

        # expect the progress to be increased by 1
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["social"][0]["progress"],
            self.default_profile["achievements"]["social"][0]["progress"] + 1,
        )

    def test_achievement_count_up_arbitrary_amount(self):
        """
        expect: successfully increase the progress of an achievement by an arbitrary amount
        """

        profile_manager = Profiles(self.db)
        profile_manager.achievement_count_up(CURRENT_ADMIN.username, "create_posts", 5)

        # expect the progress to be increased by 5
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["social"][0]["progress"],
            self.default_profile["achievements"]["social"][0]["progress"] + 5,
        )

    def test_achievement_count_up_level_up(self):
        """
        expect: successfully increase the progress of an achievement and level up
        """

        profile_manager = Profiles(self.db)

        # use unique_partners, default is 0 and level up to bronze is at 1
        profile_manager.achievement_count_up(CURRENT_ADMIN.username, "unique_partners")

        # expect the progress to be increased by 1 and level to be set to bronze
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["ve"][2]["progress"],
            self.default_profile["achievements"]["ve"][2]["progress"] + 1,
        )
        self.assertEqual(result["achievements"]["ve"][2]["level"], "bronze")

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

        # expect the progress to be increased by 1
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["ve"][1]["progress"],
            self.default_profile["achievements"]["ve"][1]["progress"] + 1,
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
            result["achievements"]["ve"][1]["progress"],
            self.default_profile["achievements"]["ve"][1]["progress"] + 1,
        )

    def test_achievement_count_up_constraint_good_practice_plans_eroor_profile_doesnt_exist(
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

        # expect the progress to be increased by 2 (one for each partner, except the user self)
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["ve"][2]["progress"],
            self.default_profile["achievements"]["ve"][2]["progress"] + 2,
        )

        # expect the partners to be added to the tracking list
        self.assertEqual(
            result["achievements"]["tracking"]["unique_partners"], ["test", "test2"]
        )

        # using yn of the same partners again should not increase the progress any further
        profile_manager.achievement_count_up_check_constraint_unique_partners(
            CURRENT_ADMIN.username, ["test"]
        )
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["ve"][2]["progress"],
            self.default_profile["achievements"]["ve"][2]["progress"] + 2,
        )

        # empty partners list should not increase the progress
        profile_manager.achievement_count_up_check_constraint_unique_partners(
            CURRENT_ADMIN.username, []
        )
        result = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        self.assertEqual(
            result["achievements"]["ve"][2]["progress"],
            self.default_profile["achievements"]["ve"][2]["progress"] + 2,
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
            "files": [],
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
                    "social": [
                        {"type": "create_posts", "progress": 0, "level": None},
                        {"type": "create_comments", "progress": 0, "level": None},
                        {"type": "give_likes", "progress": 0, "level": None},
                        {"type": "posts_liked", "progress": 0, "level": None},
                        {"type": "join_groups", "progress": 0, "level": None},
                        {"type": "admin_groups", "progress": 0, "level": None},
                    ],
                    "ve": [
                        {"type": "ve_plans", "progress": 0, "level": None},
                        {
                            "type": "good_practice_plans",
                            "progress": 0,
                            "level": None,
                        },
                        {"type": "unique_partners", "progress": 0, "level": None},
                    ],
                    "tracking": {
                        "good_practice_plans": [],
                        "unique_partners": [],
                    },
                },
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
                    "social": [
                        {"type": "create_posts", "progress": 0, "level": None},
                        {"type": "create_comments", "progress": 0, "level": None},
                        {"type": "give_likes", "progress": 0, "level": None},
                        {"type": "posts_liked", "progress": 0, "level": None},
                        {"type": "join_groups", "progress": 0, "level": None},
                        {"type": "admin_groups", "progress": 0, "level": None},
                    ],
                    "ve": [
                        {"type": "ve_plans", "progress": 0, "level": None},
                        {
                            "type": "good_practice_plans",
                            "progress": 0,
                            "level": None,
                        },
                        {"type": "unique_partners", "progress": 0, "level": None},
                    ],
                    "tracking": {
                        "good_practice_plans": [],
                        "unique_partners": [],
                    },
                },
            },
        ]
        self.db.profiles.insert_many(self.default_profiles)

        self.db.spaces.insert_one(self.default_space)

    def tearDown(self) -> None:
        super().tearDown()

        self.db.spaces.delete_many({})
        self.db.profiles.delete_many({})

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
        self.assertEqual(space.files, self.default_space["files"])
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
            "files": [],
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
                "files": [],
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
                "files": [],
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
                "files": [],
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
            "files": [],
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
                "files": [],
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
                "files": [],
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
                "files": [],
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
                "files": [],
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
            "files": [],
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
            "files": [],
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
            "files": [],
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
        self.assertEqual(space["files"], new_space["files"])
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
        # admin user towards join_groups and admin_groups
        # normal user towards join_groups
        result_admin = self.db.profiles.find_one({"username": CURRENT_ADMIN.username})
        result_user = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result_admin["achievements"]["social"][4]["progress"],
            self.default_profiles[0]["achievements"]["social"][4]["progress"] + 1,
        )
        self.assertEqual(
            result_admin["achievements"]["social"][5]["progress"],
            self.default_profiles[0]["achievements"]["social"][5]["progress"] + 1,
        )
        self.assertEqual(
            result_user["achievements"]["social"][4]["progress"],
            self.default_profiles[1]["achievements"]["social"][4]["progress"] + 1,
        )
        self.assertEqual(
            result_user["achievements"]["social"][5]["progress"],
            self.default_profiles[1]["achievements"]["social"][5]["progress"],
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
            "files": [],
            "space_pic": "default_space_pic.jpg",
            "space_description": "test",
        }

        # invisible is missing
        space_manager = Spaces(self.db)
        self.assertRaises(ValueError, space_manager.create_space, new_space, "test")

        # check that the join didnt count towards achievement "join_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][4]["progress"],
            self.default_profiles[0]["achievements"]["social"][4]["progress"],
        )

        # invisible has wrong type
        new_space["invisible"] = "test"
        self.assertRaises(TypeError, space_manager.create_space, new_space, "test")

        # check that the join didnt count towards achievement "join_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][4]["progress"],
            self.default_profiles[0]["achievements"]["social"][4]["progress"],
        )

    def test_delete_space(self):
        """
        expect: successfully delete space
        """

        space_manager = Spaces(self.db)
        space_manager.delete_space(self.space_id, "test")

        # check if space was deleted
        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertIsNone(space)

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

        # check that join counted towards achievements "join_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][4]["progress"],
            self.default_profiles[1]["achievements"]["social"][4]["progress"] + 1,
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

        # check that the join didnt count towards achievement "join_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][4]["progress"],
            self.default_profiles[1]["achievements"]["social"][4]["progress"],
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

        # check that the join didnt count towards achievement "join_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][4]["progress"],
            self.default_profiles[1]["achievements"]["social"][4]["progress"],
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

        # check that the join counted towards achievement "admin_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][5]["progress"],
            self.default_profiles[1]["achievements"]["social"][5]["progress"] + 1,
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

        # check that the join didnt count towards achievement "admin_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][5]["progress"],
            self.default_profiles[1]["achievements"]["social"][5]["progress"],
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

        # check that the join didnt count towards achievement "admin_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][5]["progress"],
            self.default_profiles[1]["achievements"]["social"][5]["progress"],
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

        # check that the join counted towards achievement "join_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][4]["progress"],
            self.default_profiles[1]["achievements"]["social"][4]["progress"] + 1,
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

        # check that the join didnt count towards achievement "join_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][4]["progress"],
            self.default_profiles[1]["achievements"]["social"][4]["progress"],
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

        # check that the join didnt count towards achievement "join_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][4]["progress"],
            self.default_profiles[1]["achievements"]["social"][4]["progress"],
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

        # check that the join counted towards achievement "join_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][4]["progress"],
            self.default_profiles[1]["achievements"]["social"][4]["progress"] + 1,
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

        # check that the join didnt count towards achievement "join_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][4]["progress"],
            self.default_profiles[1]["achievements"]["social"][4]["progress"],
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

        # check that the join didnt count towards achievement "join_groups"
        result = self.db.profiles.find_one({"username": CURRENT_USER.username})
        self.assertEqual(
            result["achievements"]["social"][4]["progress"],
            self.default_profiles[1]["achievements"]["social"][4]["progress"],
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

    def test_get_files(self):
        """
        expect: successfully get all files metadata of the space
        """

        space_manager = Spaces(self.db)

        # default case
        files = space_manager.get_files(self.space_id)
        self.assertEqual(files, self.default_space["files"])

        # add file metadata to space
        additional_file = {
            "author": CURRENT_USER.username,
            "file_id": ObjectId(),
            "manually_uploaded": True,
        }
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"files": additional_file}},
        )
        files = space_manager.get_files(self.space_id)
        self.assertEqual(files, [additional_file])

    def test_get_files_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(SpaceDoesntExistError, space_manager.get_files, ObjectId())

    def test_add_new_post_file(self):
        """
        expect: successfully add new file that was originally added from a post,
        therefore only metadata are inserted
        """

        file_id = ObjectId()
        filename = "test"
        space_manager = Spaces(self.db)
        space_manager.add_new_post_file(
            self.space_id, CURRENT_USER.username, file_id, filename
        )

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertEqual(
            space["files"],
            [
                {
                    "author": CURRENT_USER.username,
                    "file_id": file_id,
                    "file_name": filename,
                    "manually_uploaded": False,
                }
            ],
        )

    def test_add_new_post_file_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        file_id = ObjectId()
        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.add_new_post_file,
            ObjectId(),
            CURRENT_USER.username,
            file_id,
            "test",
        )

    def test_add_new_post_file_error_file_already_in_repo(self):
        """
        expect: FileAlreadyInRepoError is raised because the same file already exists
        """

        # manually add post file
        file_obj = {
            "author": CURRENT_USER.username,
            "file_id": ObjectId(),
            "file_name": "test",
            "manually_uploaded": False,
        }
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        self.assertRaises(
            FileAlreadyInRepoError,
            space_manager.add_new_post_file,
            self.space_id,
            CURRENT_USER.username,
            file_obj["file_id"],
            file_obj["file_name"],
        )

    def test_add_new_repo_file(self):
        """
        expect: successfully add new file to the space repo
        """

        space_manager = Spaces(self.db)
        _id = space_manager.add_new_repo_file(
            self.space_id,
            "test_file",
            b"test",
            "image/jpg",
            CURRENT_ADMIN.username,
        )

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertEqual(
            space["files"],
            [
                {
                    "author": CURRENT_ADMIN.username,
                    "file_id": _id,
                    "file_name": "test_file",
                    "manually_uploaded": True,
                }
            ],
        )
        fs = gridfs.GridFS(self.db)
        self.assertEqual(fs.get(_id).read(), b"test")

    def test_add_new_repo_file_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.add_new_repo_file,
            ObjectId(),
            "test_file",
            b"test",
            "image/jpg",
            CURRENT_ADMIN.username,
        )

    def test_remove_file(self):
        """
        expect: successfully remove file from space repo
        """

        # manually add file to space repo
        file_id = gridfs.GridFS(self.db).put(b"test")
        file_obj = {
            "author": CURRENT_ADMIN.username,
            "file_id": file_id,
            "manually_uploaded": True,
        }
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        space_manager.remove_file(self.space_id, file_id)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertEqual(space["files"], [])
        self.assertFalse(gridfs.GridFS(self.db).exists(file_id))

    def test_remove_file_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        file_id = ObjectId()
        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.remove_file,
            ObjectId(),
            file_id,
        )

    def test_remove_file_error_post_file_not_deletable(self):
        """
        expect: PostFileNotDeleteableError is raised because the file was originally
        added from a post and therefore cannot be deleted manually, only by
        deleting the corresponding post
        """

        # manually add post file metadata
        file_id = ObjectId()
        file_obj = {
            "author": CURRENT_ADMIN.username,
            "file_id": file_id,
            "manually_uploaded": False,
        }
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        self.assertRaises(
            PostFileNotDeleteableError,
            space_manager.remove_file,
            self.space_id,
            file_id,
        )

    def test_remove_file_error_file_doesnt_exist(self):
        """
        expect: FileDoesntExistError is raised because no file with this id exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            FileDoesntExistError,
            space_manager.remove_file,
            self.space_id,
            ObjectId(),
        )

    def test_remove_post_file(self):
        """
        expect: successfully remove file, even if it has manually_uploaded=False,
        should only be called in conjunction with deleting the corresponding post
        """

        # manually add post file metadata
        file_id = ObjectId()
        file_obj = {
            "author": CURRENT_ADMIN.username,
            "file_id": file_id,
            "manually_uploaded": False,
        }
        self.db.spaces.update_one(
            {"_id": self.space_id},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        space_manager.remove_post_file(self.space_id, file_id)

        space = self.db.spaces.find_one({"_id": self.space_id})
        self.assertEqual(space["files"], [])

    def test_remove_post_file_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        file_id = ObjectId()
        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.remove_post_file,
            ObjectId(),
            file_id,
        )

    def test_remove_post_file_error_file_doesnt_exist(self):
        """
        expect: FileDoesntExistError is raised because no file with this id exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            FileDoesntExistError,
            space_manager.remove_post_file,
            self.space_id,
            ObjectId(),
        )


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
            "creation_timestamp": datetime.now(),
            "last_modified": datetime.now(),
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

        # initialize planner
        self.planner = VEPlanResource(self.db)

    def tearDown(self) -> None:
        # delete all plans
        self.db.plans.delete_many({})

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
                "creation_timestamp": datetime.now(),
                "last_modified": datetime.now(),
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
                "creation_timestamp": datetime.now(),
                "last_modified": datetime.now(),
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
                "creation_timestamp": datetime.now(),
                "last_modified": datetime.now(),
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

        super().tearDown()

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

        # wrong types
        message["send_states"] = "wrong_type"
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
    pass
