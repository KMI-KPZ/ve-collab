from datetime import datetime
import json
import time
from unittest import TestCase
from bson import ObjectId
import gridfs

import pymongo
from tornado.options import options
from exceptions import (
    AlreadyAdminError,
    AlreadyMemberError,
    AlreadyRequestedJoinError,
    FileAlreadyInRepoError,
    FileDoesntExistError,
    InvitationDoesntExistError,
    MissingKeyError,
    NoReadAccessError,
    NoWriteAccessError,
    NonUniqueTasksError,
    NotRequestedJoinError,
    OnlyAdminError,
    PlanAlreadyExistsError,
    PlanDoesntExistError,
    PostFileNotDeleteableError,
    SpaceAlreadyExistsError,
    SpaceDoesntExistError,
    UserNotAdminError,
    UserNotInvitedError,
    UserNotMemberError,
)

import global_vars
from model import (
    Institution,
    Lecture,
    Step,
    TargetGroup,
    Task,
    User,
    VEPlan,
)
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


def setUpModule():
    """
    initial one time setup that deals with config properties.
    unittest will call this method itself.
    """

    with open(options.config) as json_file:
        config = json.load(json_file)

    global_vars.mongodb_host = config["mongodb_host"]
    global_vars.mongodb_port = config["mongodb_port"]
    global_vars.mongodb_username = config["mongodb_username"]
    global_vars.mongodb_password = config["mongodb_password"]
    global_vars.mongodb_db_name = "test_db"


def tearDownModule():
    """
    after all tests from all cases have run, wipe the whole db for safety's sake
    in case any of the test cases missed to clean up.
    unittest will call this method itself.
    """

    with util.get_mongodb() as db:
        db.drop_collection("plans")


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
            social_form="test",
            learning_env="test",
            ve_approach="test",
            tasks=[Task()],
            evaluation_tools=["test", "test"],
            attachments=[ObjectId()],
            custom_attributes={"test": "test"},
        )

    def create_target_group(self, name: str) -> TargetGroup:
        """
        convenience method to create a TargetGroup object with non-default values
        """
        return TargetGroup(
            name=name,
            age_min=30,
            age_max=40,
            experience="test",
            academic_course="test",
            mother_tongue="test",
            foreign_languages={"test": "l1"},
            learning_goal="test",
        )

    def create_institution(self, name: str = "test") -> Institution:
        """
        convenience method to create an institution with non-default values
        """

        return Institution(
            name=name,
            school_type="test",
            country="test",
            departments=["test", "test"],
            academic_courses=["test", "test"],
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


class ACLResourceTest(BaseResourceTestCase):
    pass


class PostResourceTest(BaseResourceTestCase):
    pass


class ProfileResourceTest(BaseResourceTestCase):
    pass


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
        }

        self.db.spaces.insert_one(self.default_space)

    def tearDown(self) -> None:
        super().tearDown()

        self.db.spaces.delete_many({})

        # delete all created files in gridfs
        fs = gridfs.GridFS(self.db)
        for fs_file in fs.find():
            fs.delete(fs_file._id)

    def test_check_space_exists_success(self):
        """
        expect: True because space exists
        """

        space_manager = Spaces(self.db)
        self.assertTrue(space_manager.check_space_exists(self.space_name))

    def test_check_space_exists_failure(self):
        """
        expect: False because either space doesn't exist or name is None
        """

        space_manager = Spaces(self.db)
        self.assertFalse(space_manager.check_space_exists("non_existing_space"))
        self.assertFalse(space_manager.check_space_exists(None))

    def test_check_user_is_space_admin(self):
        """
        expect: True because user is admin in the space
        """

        space_manager = Spaces(self.db)
        self.assertTrue(
            space_manager.check_user_is_space_admin(
                self.space_name, CURRENT_ADMIN.username
            )
        )

    def test_check_user_is_space_admin_failure(self):
        """
        expect: False because user is not admin in the space
        """

        space_manager = Spaces(self.db)
        self.assertFalse(
            space_manager.check_user_is_space_admin(
                self.space_name, CURRENT_USER.username
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
            "non_existing_space",
            CURRENT_ADMIN.username,
        )

    def test_check_user_is_member(self):
        """
        expect: True because user is member
        """

        space_manager = Spaces(self.db)
        self.assertTrue(
            space_manager.check_user_is_member(self.space_name, CURRENT_ADMIN.username)
        )

    def test_check_user_is_member_failure(self):
        """
        expect: False because user is not member
        """

        space_manager = Spaces(self.db)
        self.assertFalse(
            space_manager.check_user_is_member(self.space_name, CURRENT_USER.username)
        )

    def test_check_user_is_member_error(self):
        """
        expect: SpaceDoesntExistError is raised because space name doesnt exist
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.check_user_is_member,
            "non_existing_space",
            CURRENT_ADMIN.username,
        )

    def test_get_space(self):
        """
        expect: successfully get space
        """

        space_manager = Spaces(self.db)
        space = space_manager.get_space(self.space_name)
        self.assertIsNotNone(space)
        self.assertEqual(space._id, self.default_space["_id"])
        self.assertEqual(space.invisible, self.default_space["invisible"])
        self.assertEqual(space.joinable, self.default_space["joinable"])
        self.assertEqual(space.members, self.default_space["members"])
        self.assertEqual(space.admins, self.default_space["admins"])
        self.assertEqual(space.invites, self.default_space["invites"])
        self.assertEqual(space.requests, self.default_space["requests"])
        self.assertEqual(space.files, self.default_space["files"])

    def test_get_space_failure(self):
        """
        expect: None returned because no space with this name was found
        """

        space_manager = Spaces(self.db)
        space = space_manager.get_space("non_existing_space")
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
            },
        ]
        self.db.spaces.insert_many(additional_spaces)

        space_manager = Spaces(self.db)
        spaces = space_manager.get_all_spaces_visible_to_user(CURRENT_ADMIN.username)
        self.assertEqual(len(spaces), 3)
        space_names = [space.name for space in spaces]
        self.assertIn("test", space_names)
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
        }
        self.db.spaces.insert_one(additional_space)

        space_manager = Spaces(self.db)
        space_names = space_manager.get_space_names()
        self.assertEqual(len(space_names), 2)
        self.assertIn("test", space_names)
        self.assertIn("test2", space_names)

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
            },
        ]

        self.db.spaces.insert_many(additional_spaces)

        space_manager = Spaces(self.db)
        spaces = space_manager.get_spaces_of_user(CURRENT_ADMIN.username)
        self.assertEqual(len(spaces), 2)
        self.assertIn("test", spaces)
        self.assertIn("test2", spaces)

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
        }
        self.db.spaces.insert_one(additional_space)

        invites = space_manager.get_space_invites_of_user(CURRENT_ADMIN.username)
        self.assertEqual(invites, ["test2"])

    def test_create_space(self):
        """
        expect: successfully create new space
        """

        new_space = {
            "name": "new_space",
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }

        space_manager = Spaces(self.db)
        space_manager.create_space(new_space)

        # check if space was created
        space = self.db.spaces.find_one({"name": "new_space"})
        self.assertIsNotNone(space)
        self.assertIsInstance(space["_id"], ObjectId)
        self.assertEqual(space["name"], new_space["name"])
        self.assertEqual(space["invisible"], new_space["invisible"])
        self.assertEqual(space["joinable"], new_space["joinable"])
        self.assertEqual(space["members"], new_space["members"])
        self.assertEqual(space["admins"], new_space["admins"])
        self.assertEqual(space["invites"], new_space["invites"])
        self.assertEqual(space["requests"], new_space["requests"])
        self.assertEqual(space["files"], new_space["files"])

    def test_create_space_failure_space_already_exists(self):
        """
        expect: SpaceAlreadyExistsError is raised because space with this name already exists
        """

        new_space = {
            "name": self.space_name,
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceAlreadyExistsError, space_manager.create_space, new_space
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
        }

        # invisible is missing
        space_manager = Spaces(self.db)
        self.assertRaises(ValueError, space_manager.create_space, new_space)

        # invisible has wrong type
        new_space["invisible"] = "test"
        self.assertRaises(TypeError, space_manager.create_space, new_space)

    def test_delete_space(self):
        """
        expect: successfully delete space
        """

        space_manager = Spaces(self.db)
        space_manager.delete_space(self.space_name)

        # check if space was deleted
        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertIsNone(space)

    def test_delete_space_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError, space_manager.delete_space, "non_existing_space"
        )

    def test_is_space_directly_joinable(self):
        """
        expect: successfully retrieve joinable attribute of space
        """

        space_manager = Spaces(self.db)
        joinable = space_manager.is_space_directly_joinable(self.space_name)
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
            "non_existing_space",
        )

    def test_join_space(self):
        """
        expect: successfully add user to the space members list
        """

        space_manager = Spaces(self.db)
        space_manager.join_space(self.space_name, CURRENT_USER.username)

        # check if user was added to members list
        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertIn(CURRENT_USER.username, space["members"])

    def test_join_space_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.join_space,
            "non_existing_space",
            CURRENT_USER.username,
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
            self.space_name,
            CURRENT_ADMIN.username,
        )

    def test_join_space_request(self):
        """
        expect: successfully add the user to the space requests list
        """

        space_manager = Spaces(self.db)
        space_manager.join_space_request(self.space_name, CURRENT_USER.username)

        # check if user was added to requests list
        space = self.db.spaces.find_one({"name": self.space_name})
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
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_join_space_request_error_already_requested_join(self):
        """
        expect: AlreadyRequestJoinError is raised because user already requested
        to join the space previously
        """

        # manually add user to requests list
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"requests": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        self.assertRaises(
            AlreadyRequestedJoinError,
            space_manager.join_space_request,
            self.space_name,
            CURRENT_USER.username,
        )

    def test_add_space_admin(self):
        """
        expect: successfully set user as space admin
        """

        space_manager = Spaces(self.db)
        space_manager.add_space_admin(self.space_name, CURRENT_USER.username)

        # check if user was added to admins list, which includes being in the members list
        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertIn(CURRENT_USER.username, space["admins"])
        self.assertIn(CURRENT_USER.username, space["members"])

    def test_add_space_admin_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.add_space_admin,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_add_space_admin_error_already_admin(self):
        """
        expect: AlreadyAdminError is raised because user is already an admin in this space
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            AlreadyAdminError,
            space_manager.add_space_admin,
            self.space_name,
            CURRENT_ADMIN.username,
        )

    def test_set_space_picture(self):
        """
        expect: successfully set picture of space with dummy bytes string
        """

        space_manager = Spaces(self.db)
        space_manager.set_space_picture(
            self.space_name, "test_pic", b"test", "image/jpg"
        )

        space = self.db.spaces.find_one({"name": self.space_name})
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
            "non_existing_space",
            "test_pic",
            b"test",
            "image/jpg",
        )

    def test_set_space_description(self):
        """
        expect: successfully set space description
        """

        space_manager = Spaces(self.db)
        space_manager.set_space_description(self.space_name, "test_description")

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(space["space_description"], "test_description")

    def test_set_space_description_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.set_space_description,
            "non_existing_space",
            "test_description",
        )

    def test_invite_user(self):
        """
        expect: successfully add user to invites list
        """

        space_manager = Spaces(self.db)
        space_manager.invite_user(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
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
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_accept_space_invite(self):
        """
        expect: successfully remove user from invites list and
        add him to members list
        """

        # manually add user to invites list
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"invites": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.accept_space_invite(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["invites"])
        self.assertIn(CURRENT_USER.username, space["members"])

    def test_accept_space_invite_error_user_not_invited(self):
        """
        expect: UserNotInvitedError is raised because user is not invited to the space
        and can therefore not gain entry by fake-accepting a request
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            UserNotInvitedError,
            space_manager.accept_space_invite,
            self.space_name,
            CURRENT_USER.username,
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
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_decline_space_invite(self):
        """
        expect: successfully decline invite to a space, i.e. not get added to members list
        """

        # manually add user to invites list
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"invites": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.decline_space_invite(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
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
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_accept_join_request(self):
        """
        expect: successfully accept join request, i.e. get added to members list
        """

        # manually add user to requests list
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"requests": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.accept_join_request(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["requests"])
        self.assertIn(CURRENT_USER.username, space["members"])

    def test_accept_join_request_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.accept_join_request,
            "non_existing_space",
            CURRENT_USER.username,
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
            self.space_name,
            CURRENT_USER.username,
        )

    def test_reject_join_request(self):
        """
        expect: successfully reject join request, i.e. not get added to members list
        """

        # manually add user to requests list
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"requests": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.reject_join_request(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
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
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_toggle_visibility(self):
        """
        expect: set visibility attribute to True if it was False and False if it was True
        """

        current_visibility = self.default_space["invisible"]
        space_manager = Spaces(self.db)
        space_manager.toggle_visibility(self.space_name)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(space["invisible"], not current_visibility)

        # try again backwards
        space_manager.toggle_visibility(self.space_name)
        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(space["invisible"], current_visibility)

    def test_leave_space_member(self):
        """
        expect: successfully leave space as member
        """

        # manually add other user to space first
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"members": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.leave_space(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_leave_space_admin(self):
        """
        expect: successfully leave space as admin
        """

        # manually add another admin first, becuase otherwise OnylAdminError should raise
        self.db.spaces.update_one(
            {"name": self.space_name},
            {
                "$push": {
                    "admins": CURRENT_USER.username,
                    "members": CURRENT_USER.username,
                }
            },
        )

        space_manager = Spaces(self.db)
        space_manager.leave_space(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
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
            self.space_name,
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
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_kick_user(self):
        """
        expect: successfully kick user from space
        """

        # manually add user to space first
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"members": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.kick_user(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_kick_user_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.kick_user,
            "non_existing_space",
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
            self.space_name,
            CURRENT_USER.username,
        )

    def test_revoke_space_admin_privilege(self):
        """
        expect: successfully remove user from admins list
        """

        # manually add user to admins list first
        self.db.spaces.update_one(
            {"name": self.space_name},
            {
                "$push": {
                    "admins": CURRENT_USER.username,
                    "members": CURRENT_USER.username,
                }
            },
        )

        space_manager = Spaces(self.db)
        space_manager.revoke_space_admin_privilege(
            self.space_name, CURRENT_USER.username
        )

        space = self.db.spaces.find_one({"name": self.space_name})
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
            "non_existing_space",
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
            self.space_name,
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
            self.space_name,
            CURRENT_ADMIN.username,
        )

    def test_get_files(self):
        """
        expect: successfully get all files metadata of the space
        """

        space_manager = Spaces(self.db)

        # default case
        files = space_manager.get_files(self.space_name)
        self.assertEqual(files, self.default_space["files"])

        # add file metadata to space
        additional_file = {
            "author": CURRENT_USER.username,
            "file_id": ObjectId(),
            "manually_uploaded": True,
        }
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"files": additional_file}},
        )
        files = space_manager.get_files(self.space_name)
        self.assertEqual(files, [additional_file])

    def test_get_files_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError, space_manager.get_files, "non_existing_space"
        )

    def test_add_new_post_file(self):
        """
        expect: successfully add new file that was originally added from a post,
        therefore only metadata are inserted
        """

        file_id = ObjectId()
        space_manager = Spaces(self.db)
        space_manager.add_new_post_file(
            self.space_name,
            CURRENT_USER.username,
            file_id,
        )

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(
            space["files"],
            [
                {
                    "author": CURRENT_USER.username,
                    "file_id": file_id,
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
            "non_existing_space",
            CURRENT_USER.username,
            file_id,
        )

    def test_add_new_post_file_error_file_already_in_repo(self):
        """
        expect: FileAlreadyInRepoError is raised because the same file already exists
        """

        # manually add post file
        file_obj = {
            "author": CURRENT_USER.username,
            "file_id": ObjectId(),
            "manually_uploaded": False,
        }
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        self.assertRaises(
            FileAlreadyInRepoError,
            space_manager.add_new_post_file,
            self.space_name,
            CURRENT_USER.username,
            file_obj["file_id"],
        )

    def test_add_new_repo_file(self):
        """
        expect: successfully add new file to the space repo
        """

        space_manager = Spaces(self.db)
        _id = space_manager.add_new_repo_file(
            self.space_name,
            "test_file",
            b"test",
            "image/jpg",
            CURRENT_ADMIN.username,
        )

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(
            space["files"],
            [
                {
                    "author": CURRENT_ADMIN.username,
                    "file_id": _id,
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
            "non_existing_space",
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
            {"name": self.space_name},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        space_manager.remove_file(self.space_name, file_id)

        space = self.db.spaces.find_one({"name": self.space_name})
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
            "non_existing_space",
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
            {"name": self.space_name},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        self.assertRaises(
            PostFileNotDeleteableError,
            space_manager.remove_file,
            self.space_name,
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
            self.space_name,
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
            {"name": self.space_name},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        space_manager.remove_post_file(self.space_name, file_id)

        space = self.db.spaces.find_one({"name": self.space_name})
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
            "non_existing_space",
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
            self.space_name,
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
            "topic": "test",
            "lectures": [self.lecture.to_dict()],
            "audience": [self.target_group.to_dict()],
            "languages": ["test", "test"],
            "timestamp_from": self.step.timestamp_from,
            "timestamp_to": self.step.timestamp_to,
            "involved_parties": ["test", "test"],
            "realization": "test",
            "learning_env": "test",
            "tools": ["test", "test"],
            "new_content": False,
            "formalities": {
                "technology": False,
                "exam_regulations": False,
            },
            "duration": self.step.duration.total_seconds(),
            "workload": self.step.workload,
            "steps": [self.step.to_dict()],
        }
        self.db.plans.insert_one(self.default_plan)

        # initialize planner
        self.planner = VEPlanResource(self.db)

    def tearDown(self) -> None:
        # delete all plans
        self.db.plans.delete_many({})
        return super().tearDown()

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
                self.assertEqual(plan.topic, self.default_plan["topic"])
                self.assertEqual(
                    [lecture.to_dict() for lecture in plan.lectures],
                    self.default_plan["lectures"],
                )
                self.assertEqual(
                    [target_group.to_dict() for target_group in plan.audience],
                    self.default_plan["audience"],
                )
                self.assertEqual(plan.languages, self.default_plan["languages"])
                self.assertEqual(
                    plan.involved_parties, self.default_plan["involved_parties"]
                )
                self.assertEqual(plan.realization, self.default_plan["realization"])
                self.assertEqual(plan.learning_env, self.default_plan["learning_env"])
                self.assertEqual(plan.tools, self.default_plan["tools"])
                self.assertEqual(plan.new_content, self.default_plan["new_content"])
                self.assertEqual(plan.formalities, self.default_plan["formalities"])
                self.assertEqual(
                    [step.to_dict() for step in plan.steps], self.default_plan["steps"]
                )
                self.assertEqual(plan.timestamp_from, self.step.timestamp_from)
                self.assertEqual(plan.timestamp_to, self.step.timestamp_to)
                self.assertEqual(plan.workload, self.step.workload)
                self.assertEqual(plan.duration, self.step.duration)
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
                self.assertEqual(plan.topic, self.default_plan["topic"])
                self.assertEqual(
                    [lecture.to_dict() for lecture in plan.lectures],
                    self.default_plan["lectures"],
                )
                self.assertEqual(
                    [target_group.to_dict() for target_group in plan.audience],
                    self.default_plan["audience"],
                )
                self.assertEqual(plan.languages, self.default_plan["languages"])
                self.assertEqual(
                    plan.involved_parties, self.default_plan["involved_parties"]
                )
                self.assertEqual(plan.realization, self.default_plan["realization"])
                self.assertEqual(plan.learning_env, self.default_plan["learning_env"])
                self.assertEqual(plan.tools, self.default_plan["tools"])
                self.assertEqual(plan.new_content, self.default_plan["new_content"])
                self.assertEqual(plan.formalities, self.default_plan["formalities"])
                self.assertEqual(
                    [step.to_dict() for step in plan.steps], self.default_plan["steps"]
                )
                self.assertEqual(plan.timestamp_from, self.step.timestamp_from)
                self.assertEqual(plan.timestamp_to, self.step.timestamp_to)
                self.assertEqual(plan.workload, self.step.workload)
                self.assertEqual(plan.duration, self.step.duration)
                self.assertIsNotNone(plan.creation_timestamp)
                self.assertIsNotNone(plan.last_modified)

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
        self.assertEqual(plan.topic, self.default_plan["topic"])
        self.assertEqual(
            [lecture.to_dict() for lecture in plan.lectures],
            self.default_plan["lectures"],
        )
        self.assertEqual(
            [target_group.to_dict() for target_group in plan.audience],
            self.default_plan["audience"],
        )
        self.assertEqual(plan.languages, self.default_plan["languages"])
        self.assertEqual(plan.involved_parties, self.default_plan["involved_parties"])
        self.assertEqual(plan.realization, self.default_plan["realization"])
        self.assertEqual(plan.learning_env, self.default_plan["learning_env"])
        self.assertEqual(plan.tools, self.default_plan["tools"])
        self.assertEqual(plan.new_content, self.default_plan["new_content"])
        self.assertEqual(plan.formalities, self.default_plan["formalities"])
        self.assertEqual(
            [step.to_dict() for step in plan.steps], self.default_plan["steps"]
        )
        self.assertEqual(plan.timestamp_from, self.step.timestamp_from)
        self.assertEqual(plan.timestamp_to, self.step.timestamp_to)
        self.assertEqual(plan.workload, self.step.workload)
        self.assertEqual(plan.duration, self.step.duration)
        self.assertIsNotNone(plan.creation_timestamp)
        self.assertIsNotNone(plan.last_modified)

    def test_get_plans_for_user(self):
        """
        expect: only show plans that the user is allowed to see, i.e. their
        own and those with read/write permissions.
        """

        # insert 2 more plans with different authorships
        additional_plans = [
            {
                "_id": ObjectId(),
                "author": "test_admin",
                "creation_timestamp": datetime.now(),
                "last_modified": datetime.now(),
                "name": "admin",
                "partners": ["test_user"],
                "institutions": [self.institution.to_dict()],
                "topic": "test",
                "lectures": [self.lecture.to_dict()],
                "audience": [self.target_group.to_dict()],
                "languages": ["test", "test"],
                "timestamp_from": self.step.timestamp_from,
                "timestamp_to": self.step.timestamp_to,
                "involved_parties": ["test", "test"],
                "realization": "test",
                "learning_env": "test",
                "tools": ["test", "test"],
                "new_content": False,
                "formalities": {
                    "technology": False,
                    "exam_regulations": False,
                },
                "duration": self.step.duration.total_seconds(),
                "workload": self.step.workload,
                "steps": [self.step.to_dict()],
            },
            {
                "_id": ObjectId(),
                "creation_timestamp": datetime.now(),
                "last_modified": datetime.now(),
                "name": "user",
                "partners": [],
                "institutions": [self.institution.to_dict()],
                "topic": "test",
                "lectures": [self.lecture.to_dict()],
                "audience": [self.target_group.to_dict()],
                "languages": ["test", "test"],
                "timestamp_from": self.step.timestamp_from,
                "timestamp_to": self.step.timestamp_to,
                "involved_parties": ["test", "test"],
                "realization": "test",
                "learning_env": "test",
                "tools": ["test", "test"],
                "new_content": False,
                "formalities": {
                    "technology": False,
                    "exam_regulations": False,
                },
                "duration": self.step.duration.total_seconds(),
                "workload": self.step.workload,
                "steps": [self.step.to_dict()],
            },
        ]
        self.db.plans.insert_many(additional_plans)

        plans = self.planner.get_plans_for_user("test_admin")
        # since one of the plans belong to the user and he has read_access to the default one,
        # we expect the result to be filtered accordingly (2 results here)
        self.assertEqual(len(plans), 2)
        plan = plans[0]
        for plan in plans:
            self.assertIn(
                plan._id, [self.default_plan["_id"], additional_plans[0]["_id"]]
            )

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
            "topic": "test",
            "lectures": [self.lecture.to_dict()],
            "audience": [self.target_group.to_dict()],
            "languages": ["test", "test"],
            "timestamp_from": self.step.timestamp_from,
            "timestamp_to": self.step.timestamp_to,
            "involved_parties": ["test", "test"],
            "realization": "test",
            "learning_env": "test",
            "tools": ["test", "test"],
            "new_content": False,
            "formalities": {
                "technology": False,
                "exam_regulations": False,
            },
            "duration": self.step.duration.total_seconds(),
            "workload": self.step.workload,
            "steps": [self.step.to_dict()],
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
            "topic": "test",
            "lectures": [self.lecture.to_dict()],
            "audience": [self.target_group.to_dict()],
            "languages": ["test", "test"],
            "timestamp_from": self.step.timestamp_from,
            "timestamp_to": self.step.timestamp_to,
            "involved_parties": ["test", "test"],
            "realization": "test",
            "learning_env": "test",
            "tools": ["test", "test"],
            "new_content": False,
            "formalities": {
                "technology": False,
                "exam_regulations": False,
            },
            "duration": self.step.duration.total_seconds(),
            "workload": self.step.workload,
            "steps": [self.step.to_dict()],
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
        existing_plan.topic = "new_topic"

        # expect an "updated" response
        result = self.planner.update_full_plan(existing_plan)
        self.assertIsInstance(result, ObjectId)
        self.assertEqual(result, existing_plan._id)

        # expect that the name and topic was updated in the db, but other values
        # remain the same
        db_state = self.db.plans.find_one({"_id": existing_plan._id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], existing_plan.name)
        self.assertEqual(db_state["topic"], existing_plan.topic)
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
        existing_plan.topic = "new_topic"

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
        self.assertEqual(db_state["topic"], existing_plan.topic)
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

    def test_update_plan_erro_no_write_access(self):
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

        self.planner.update_field(self.plan_id, "topic", "updated_topic")
        self.planner.update_field(
            self.plan_id, "involved_parties", ["update1", "update2"]
        )
        self.planner.update_field(self.plan_id, "realization", "updated_realization")
        self.planner.update_field(self.plan_id, "learning_env", "updated_learning_env")
        self.planner.update_field(self.plan_id, "tools", ["update1", "update2"])
        self.planner.update_field(self.plan_id, "new_content", True)
        self.planner.update_field(
            self.plan_id, "formalities", {"technology": True, "exam_regulations": True}
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["topic"], "updated_topic")
        self.assertEqual(db_state["involved_parties"], ["update1", "update2"])
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertEqual(db_state["learning_env"], "updated_learning_env")
        self.assertEqual(db_state["tools"], ["update1", "update2"])
        self.assertEqual(db_state["new_content"], True)
        self.assertEqual(
            db_state["formalities"], {"technology": True, "exam_regulations": True}
        )
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_field_with_user(self):
        """
        expect: successfully update a single field of a VEPlan and passing access checks
        """

        self.planner.update_field(
            self.plan_id, "topic", "updated_topic", requesting_username="test_user"
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
            "tools",
            ["update1", "update2"],
            requesting_username="test_user",
        )
        self.planner.update_field(
            self.plan_id, "new_content", True, requesting_username="test_user"
        )
        self.planner.update_field(
            self.plan_id,
            "formalities",
            {"technology": True, "exam_regulations": True},
            requesting_username="test_user",
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["topic"], "updated_topic")
        self.assertEqual(db_state["involved_parties"], ["update1", "update2"])
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertEqual(db_state["learning_env"], "updated_learning_env")
        self.assertEqual(db_state["tools"], ["update1", "update2"])
        self.assertEqual(db_state["new_content"], True)
        self.assertEqual(
            db_state["formalities"], {"technology": True, "exam_regulations": True}
        )
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_field_object(self):
        """
        expect: successfully update a single field of a VEPlan that
        is not a primitive type
        """

        tg = TargetGroup(
            name="updated_name",
            age_min=10,
            age_max=20,
            experience="updated_experience",
            academic_course="updated_academic_course",
            mother_tongue="de",
            foreign_languages={"en": "c1"},
            learning_goal="test",
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(self.plan_id, "audience", [tg.to_dict()])

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIsInstance(db_state["audience"][0]["_id"], ObjectId)
        self.assertEqual(db_state["audience"][0]["name"], tg.name)
        self.assertEqual(db_state["audience"][0]["age_min"], str(tg.age_min))
        self.assertEqual(db_state["audience"][0]["experience"], tg.experience)
        self.assertEqual(db_state["audience"][0]["academic_course"], tg.academic_course)
        self.assertEqual(db_state["audience"][0]["mother_tongue"], tg.mother_tongue)
        self.assertEqual(
            db_state["audience"][0]["foreign_languages"], tg.foreign_languages
        )
        self.assertEqual(db_state["audience"][0]["learning_goal"], tg.learning_goal)
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

        # same, but this time manually specify a _id
        tg2 = TargetGroup(
            _id=ObjectId(),
            name="updated_name2",
            age_min=10,
            age_max=20,
            experience="updated_experience2",
            academic_course="updated_academic_course2",
            mother_tongue="de2",
            foreign_languages={"en": "c1"},
            learning_goal="test",
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(self.plan_id, "audience", [tg2.to_dict()])

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["audience"][0]["_id"], tg2._id)
        self.assertEqual(db_state["audience"][0]["name"], tg2.name)
        self.assertEqual(db_state["audience"][0]["age_min"], str(tg2.age_min))
        self.assertEqual(db_state["audience"][0]["experience"], tg2.experience)
        self.assertEqual(
            db_state["audience"][0]["academic_course"], tg2.academic_course
        )
        self.assertEqual(db_state["audience"][0]["mother_tongue"], tg2.mother_tongue)
        self.assertEqual(
            db_state["audience"][0]["foreign_languages"], tg2.foreign_languages
        )
        self.assertEqual(db_state["audience"][0]["learning_goal"], tg.learning_goal)
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_field_object_with_user(self):
        """
        expect: successfully update a single field of a VEPlan that
        is not a primitive type and passing access checks
        """

        tg = TargetGroup(
            name="updated_name",
            age_min=10,
            age_max=20,
            experience="updated_experience",
            academic_course="updated_academic_course",
            mother_tongue="de",
            foreign_languages={"en": "c1"},
            learning_goal="test",
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(
            self.plan_id, "audience", [tg.to_dict()], requesting_username="test_user"
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIsInstance(db_state["audience"][0]["_id"], ObjectId)
        self.assertEqual(db_state["audience"][0]["name"], tg.name)
        self.assertEqual(db_state["audience"][0]["age_min"], str(tg.age_min))
        self.assertEqual(db_state["audience"][0]["experience"], tg.experience)
        self.assertEqual(db_state["audience"][0]["academic_course"], tg.academic_course)
        self.assertEqual(db_state["audience"][0]["mother_tongue"], tg.mother_tongue)
        self.assertEqual(
            db_state["audience"][0]["foreign_languages"], tg.foreign_languages
        )
        self.assertEqual(db_state["audience"][0]["learning_goal"], tg.learning_goal)
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

        # same, but this time manually specify a _id
        tg2 = TargetGroup(
            _id=ObjectId(),
            name="updated_name2",
            age_min=10,
            age_max=20,
            experience="updated_experience2",
            academic_course="updated_academic_course2",
            mother_tongue="de2",
            foreign_languages={"en": "c1"},
            learning_goal="test",
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(
            self.plan_id, "audience", [tg2.to_dict()], requesting_username="test_user"
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["audience"][0]["_id"], tg2._id)
        self.assertEqual(db_state["audience"][0]["name"], tg2.name)
        self.assertEqual(db_state["audience"][0]["age_min"], str(tg2.age_min))
        self.assertEqual(db_state["audience"][0]["experience"], tg2.experience)
        self.assertEqual(
            db_state["audience"][0]["academic_course"], tg2.academic_course
        )
        self.assertEqual(db_state["audience"][0]["mother_tongue"], tg2.mother_tongue)
        self.assertEqual(
            db_state["audience"][0]["foreign_languages"], tg2.foreign_languages
        )
        self.assertEqual(db_state["audience"][0]["learning_goal"], tg.learning_goal)
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
        self.assertEqual(db_state["tools"], [])
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

        # now same test, but with a complex attribute
        self.db.plans.delete_one({"_id": _id})

        institution = Institution(
            name="updated_institution_name",
            departments=["updated", "updated"],
            academic_courses=["updated", "updated"],
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
            db_state["institutions"][0]["departments"], ["updated", "updated"]
        )
        self.assertEqual(
            db_state["institutions"][0]["academic_courses"],
            ["updated", "updated"],
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
        self.assertEqual(db_state["tools"], [])
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

        # now same test, but with a complex attribute
        self.db.plans.delete_one({"_id": _id})

        institution = Institution(
            name="updated_institution_name",
            departments=["updated", "updated"],
            academic_courses=["updated", "updated"],
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
            db_state["institutions"][0]["departments"], ["updated", "updated"]
        )
        self.assertEqual(
            db_state["institutions"][0]["academic_courses"],
            ["updated", "updated"],
        )
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

    def test_update_field_error_wrong_type(self):
        """
        expect: TypeError is raised because either primitive or complex attribute
        has a wrong type
        """

        # primitive attribute
        self.assertRaises(
            TypeError, self.planner.update_field, self.plan_id, "tools", "123"
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
        step["tasks"] = [Task(title="test").to_dict(), Task(title="test").to_dict()]

        self.assertRaises(
            NonUniqueTasksError,
            self.planner.update_field,
            self.plan_id,
            "steps",
            [step],
        )

        del step["ve_approach"]

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


class ElasticsearchIntegrationTest(BaseResourceTestCase):
    pass


class NotificationIntegrationTest(BaseResourceTestCase):
    pass
