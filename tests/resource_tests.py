from datetime import datetime
import json
from unittest import TestCase
from bson import ObjectId

import pymongo
from tornado.options import options
from exceptions import PlanDoesntExistError

import global_vars
from model import Step, Task, VEPlan
from resources.planner.ve_plan import VEPlanResource
import util


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

    def create_step(self, name: str) -> Step:
        """
        convenience method to create a Step object with non-default values
        """

        return Step(
            _id=ObjectId(),
            name=name,
            workload=10,
            timestamp_from=datetime(2023, 1, 1),
            timestamp_to=datetime(2023, 1, 8),
            learning_env="test",
            tasks=[Task()],
            evaluation_tools=["test", "test"],
            attachments=[ObjectId()],
            custom_attributes={"test": "test"},
        )


class PlanResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        # manually set up a VEPlan in the db
        self.plan_id = ObjectId()
        self.step = self.create_step("test")
        self.default_plan = {
            "_id": self.plan_id,
            "name": "test",
            "topic_description": "test",
            "learning_goal": "test",
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
                self.assertEqual(plan.name, self.default_plan["name"])
                self.assertEqual(plan.topic_description, self.default_plan["topic_description"])
                self.assertEqual(plan.learning_goal, self.default_plan["learning_goal"])
                self.assertEqual([step.to_dict() for step in plan.steps], self.default_plan["steps"])
                self.assertEqual(plan.workload, self.step.workload)
                self.assertEqual(plan.duration, self.step.duration)

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
        self.assertIsInstance(plans[0], VEPlan)
        self.assertEqual(plans[0]._id, self.default_plan["_id"])
        self.assertEqual(plans[0].name, self.default_plan["name"])
        self.assertEqual(plans[0].topic_description, self.default_plan["topic_description"])
        self.assertEqual(plans[0].learning_goal, self.default_plan["learning_goal"])
        self.assertEqual([step.to_dict() for step in plans[0].steps], self.default_plan["steps"])
        self.assertEqual(plans[0].workload, self.step.workload)
        self.assertEqual(plans[0].duration, self.step.duration)

    def test_insert_plan(self):
        """
        expect: successfully insert a new plan into the db
        (i.e. _id did not exist previously)
        """

        # don't supply a _id, letting the system create a fresh one
        plan = {
            "name": "new plan",
            "topic_description": "test",
            "learning_goal": "test",
            "steps": [self.step.to_dict()],
        }

        # expect an "inserted" response
        result = self.planner.insert_or_update(VEPlan.from_dict(plan))
        self.assertIsInstance(result, tuple)
        self.assertEqual(result[0], "inserted")
        self.assertIsInstance(result[1], ObjectId)

        # expect the plan to be in the db
        db_state = self.db.plans.find_one({"name": plan["name"]})
        self.assertIsNotNone(db_state)
        self.assertIn("duration", db_state)
        self.assertIn("workload", db_state)
        self.assertEqual(db_state["duration"], self.step.duration.total_seconds())
        self.assertEqual(db_state["workload"], self.step.workload)

        # this time supply a _id, but if I "know" that it is not already existing,
        # the result will despite that be an insert as expected
        plan_with_id = {
            "_id": ObjectId(),
            "name": "new plan with _id",
            "topic_description": "test",
            "learning_goal": "test",
            "steps": [self.step.to_dict()],
        }

        # expect an "inserted" response
        result_with_id = self.planner.insert_or_update(VEPlan.from_dict(plan_with_id))
        self.assertIsInstance(result_with_id, tuple)
        self.assertEqual(result_with_id[0], "inserted")
        self.assertIsInstance(result_with_id[1], ObjectId)

        # expect the plan to be in the db
        db_state_with_id = self.db.plans.find_one({"name": plan_with_id["name"]})
        self.assertIsNotNone(db_state_with_id)
        self.assertIn("duration", db_state_with_id)
        self.assertIn("workload", db_state_with_id)
        self.assertEqual(
            db_state_with_id["duration"], self.step.duration.total_seconds()
        )
        self.assertEqual(db_state_with_id["workload"], self.step.workload)

    def test_update_plan(self):
        """
        expect: successfully update a plan by supplying one with a _id that already exists
        """

        # use the default plan, but change its name
        existing_plan = VEPlan.from_dict(self.default_plan)
        existing_plan.name = "updated_name"

        # expect an "updated" response
        result = self.planner.insert_or_update(existing_plan)
        self.assertIsInstance(result, tuple)
        self.assertEqual(result[0], "updated")
        self.assertIsInstance(result[1], ObjectId)
        self.assertEqual(result[1], existing_plan._id)

        # expect that the name was updated in the db
        db_state = self.db.plans.find_one({"_id": existing_plan._id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], existing_plan.name)

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
