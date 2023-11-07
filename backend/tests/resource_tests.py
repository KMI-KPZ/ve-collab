from bson import ObjectId
from datetime import datetime
import os
import time
from unittest import IsolatedAsyncioTestCase, TestCase

from dotenv import load_dotenv
import pymongo
from tornado.options import options
from exceptions import (
    InvitationDoesntExistError,
    MessageDoesntExistError,
    MissingKeyError,
    NoReadAccessError,
    NoWriteAccessError,
    NonUniqueTasksError,
    PlanAlreadyExistsError,
    PlanDoesntExistError,
    RoomDoesntExistError,
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
from resources.network.chat import Chat
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
            "progress": {
                "name": "not_started",
                "institutions": "not_started",
                "topic": "not_started",
                "lectures": "not_started",
                "audience": "not_started",
                "languages": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "tools": "not_started",
                "new_content": "not_started",
                "formalities": "not_started",
                "steps": "not_started",
            },
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
                self.assertEqual(plan.progress, self.default_plan["progress"])
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
                "progress": {
                    "name": "not_started",
                    "institutions": "not_started",
                    "topic": "not_started",
                    "lectures": "not_started",
                    "audience": "not_started",
                    "languages": "not_started",
                    "involved_parties": "not_started",
                    "realization": "not_started",
                    "learning_env": "not_started",
                    "tools": "not_started",
                    "new_content": "not_started",
                    "formalities": "not_started",
                    "steps": "not_started",
                },
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
                "progress": {
                    "name": "not_started",
                    "institutions": "not_started",
                    "topic": "not_started",
                    "lectures": "not_started",
                    "audience": "not_started",
                    "languages": "not_started",
                    "involved_parties": "not_started",
                    "realization": "not_started",
                    "learning_env": "not_started",
                    "tools": "not_started",
                    "new_content": "not_started",
                    "formalities": "not_started",
                    "steps": "not_started",
                },
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
            "progress": {
                "name": "not_started",
                "institutions": "not_started",
                "topic": "not_started",
                "lectures": "not_started",
                "audience": "not_started",
                "languages": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "tools": "not_started",
                "new_content": "not_started",
                "formalities": "not_started",
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
            "progress": {
                "name": "not_started",
                "institutions": "not_started",
                "topic": "not_started",
                "lectures": "not_started",
                "audience": "not_started",
                "languages": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "tools": "not_started",
                "new_content": "not_started",
                "formalities": "not_started",
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
        self.planner.update_field(
            self.plan_id,
            "progress",
            {
                "name": "completed",
                "institutions": "not_started",
                "topic": "not_started",
                "lectures": "not_started",
                "audience": "not_started",
                "languages": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "tools": "not_started",
                "new_content": "not_started",
                "formalities": "not_started",
                "steps": "not_started",
            },
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
        self.assertEqual(db_state["progress"]["name"], "completed")
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
        self.planner.update_field(
            self.plan_id,
            "progress",
            {
                "name": "completed",
                "institutions": "not_started",
                "topic": "not_started",
                "lectures": "not_started",
                "audience": "not_started",
                "languages": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "tools": "not_started",
                "new_content": "not_started",
                "formalities": "not_started",
                "steps": "not_started",
            },
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
        self.assertEqual(db_state["progress"]["name"], "completed")
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


class ChatResourceTest(BaseResourceTestCase, IsolatedAsyncioTestCase):
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
            "send_states": {
                CURRENT_ADMIN.username: "acknowledged",
                CURRENT_USER.username: "sent",
            },
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
            "send_states": {
                CURRENT_ADMIN.username: "sent",
                CURRENT_USER.username: "acknowledged",
            },
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
            "send_states": {
                CURRENT_ADMIN.username: "sent",
                CURRENT_USER.username: "acknowledged",
            },
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
            "send_states": {
                CURRENT_ADMIN.username: "sent",
                CURRENT_USER.username: "acknowledged",
            },
        }

        self.assertRaises(
            RoomDoesntExistError,
            self.chat_manager.store_message,
            ObjectId(),
            message,
        )

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
        self.assertEqual(
            db_state["messages"][1]["send_states"][CURRENT_ADMIN.username],
            "acknowledged",
        )
        self.assertEqual(
            db_state["messages"][1]["send_states"][CURRENT_USER.username], "pending"
        )

    async def test_send_message_error_room_doesnt_exist(self):
        """
        expect: RoomDoesntExistError is raised because no room with this _id exists
        """

        with self.assertRaises(RoomDoesntExistError):
            await self.chat_manager.send_message(
                ObjectId(), "test_message", CURRENT_ADMIN.username
            )

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
        self.assertEqual(
            db_state["messages"][0]["send_states"][CURRENT_USER.username],
            "acknowledged",
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
                    "send_states": {
                        "some_other_user": "sent",
                        CURRENT_ADMIN.username: "acknowledged",
                    },
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
                    "send_states": {
                        CURRENT_ADMIN.username: "acknowledged",
                        CURRENT_USER.username: "acknowledged",
                    },
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
            "send_states": {
                CURRENT_ADMIN.username: "acknowledged",
                CURRENT_USER.username: "acknowledged",
            },
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
            "send_states": {
                CURRENT_ADMIN.username: "pending",
                CURRENT_USER.username: "acknowledged",
            },
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
                    "send_states": {
                        CURRENT_ADMIN.username: "acknowledged",
                        CURRENT_USER.username: "acknowledged",
                    },
                },
                {
                    "_id": ObjectId(),
                    "message": "test2",
                    "sender": CURRENT_USER.username,
                    "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                    "send_states": {
                        CURRENT_ADMIN.username: "pending",
                        CURRENT_USER.username: "acknowledged",
                    },
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
        self.assertEqual(
            list(filter(lambda m: m["_id"] == message["_id"], db_state["messages"]))[0][
                "send_states"
            ][CURRENT_ADMIN.username],
            "sent",
        )
        other_room = self.db.chatrooms.find_one({"_id": room1["_id"]})
        self.assertIsNotNone(other_room)
        self.assertEqual(
            list(
                filter(
                    lambda m: m["_id"] == room1["messages"][1]["_id"],
                    other_room["messages"],
                )
            )[0]["send_states"][CURRENT_ADMIN.username],
            "sent",
        )
