from unittest import TestCase

from bson import ObjectId
from bson.errors import InvalidId
from exceptions import NonUniqueStepsError, PlanKeyError, StepKeyError

from model import Step, VEPlan


def setUpModule():
    pass


def tearDownModule():
    pass


class StepModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_init_default(self):
        """
        expect: successful creation of a minimal Step object
        """

        step = Step("test")
        self.assertEqual(step.name, "test")
        self.assertEqual(step.duration, 0)
        self.assertEqual(step.workload, 0)
        self.assertEqual(step.description, None)
        self.assertEqual(step.learning_goal, None)
        self.assertEqual(step.tasks, [])
        self.assertEqual(step.attachments, [])

    def test_init(self):
        """
        expect: successful creation of a Step object, passing values for each attribute
        """

        attachment_id = ObjectId()
        step = Step(
            name="test",
            duration=10,
            workload=10,
            description="test",
            learning_goal="test",
            tasks=["test", "test"],
            attachments=[attachment_id],
        )

        self.assertEqual(step.name, "test")
        self.assertEqual(step.duration, 10)
        self.assertEqual(step.workload, 10)
        self.assertEqual(step.description, "test")
        self.assertEqual(step.learning_goal, "test")
        self.assertEqual(step.tasks, ["test", "test"])
        self.assertEqual(step.attachments, [attachment_id])

    def test_to_dict(self):
        """
        expect: successful serialization of a minimal Step object into
        its dictionary representation
        """

        step = Step("test")
        step_dict = step.to_dict()

        self.assertIsInstance(step_dict, dict)
        self.assertIn("name", step_dict)
        self.assertIn("duration", step_dict)
        self.assertIn("workload", step_dict)
        self.assertIn("description", step_dict)
        self.assertIn("learning_goal", step_dict)
        self.assertIn("tasks", step_dict)
        self.assertIn("attachments", step_dict)
        self.assertEqual(step_dict["name"], "test")
        self.assertEqual(step_dict["duration"], 0)
        self.assertEqual(step_dict["workload"], 0)
        self.assertEqual(step_dict["description"], None)
        self.assertEqual(step_dict["learning_goal"], None)
        self.assertEqual(step_dict["tasks"], [])
        self.assertEqual(step_dict["attachments"], [])

    def test_from_dict(self):
        """
        expect: successful creation of a Step object derived from a dictionary
        """

        attachment_id = ObjectId()
        step_dict = {
            "name": "test",
            "duration": 10,
            "workload": 10,
            "description": "test",
            "learning_goal": "test",
            "tasks": ["test", "test"],
            "attachments": [attachment_id],
        }

        step = Step.from_dict(step_dict)

        self.assertIsInstance(step, Step)
        self.assertEqual(step.name, step_dict["name"])
        self.assertEqual(step.duration, step_dict["duration"])
        self.assertEqual(step.workload, step_dict["workload"])
        self.assertEqual(step.description, step_dict["description"])
        self.assertEqual(step.learning_goal, step_dict["learning_goal"])
        self.assertEqual(step.tasks, step_dict["tasks"])
        self.assertEqual(step.attachments, step_dict["attachments"])

    def test_from_dict_error_params_no_dict(self):
        """
        expect: creation of Step object from dict raises TypeError because source is 
        not a dict
        """

        self.assertRaises(TypeError, Step.from_dict, "wrong_type")

    def test_from_dict_error_missing_key(self):
        """
        expect: creation of Step object from dict raises StepKeyError because
        the dict is missing required keys
        """

        # attachments is missing
        step_dict = {
            "name": "test",
            "duration": 10,
            "workload": 10,
            "description": "test",
            "learning_goal": "test",
            "tasks": ["test", "test"],
        }
        self.assertRaises(StepKeyError, Step.from_dict, step_dict)

    def test_from_dict_error_wrong_types(self):
        """
        expect: creation of Step object from dict raises TypeError's because
        arguments have the wrong types
        """

        step_dict = {
            "name": "test",
            "duration": 0,
            "workload": 0,
            "description": None,
            "learning_goal": None,
            "tasks": ["test", "test"],
            "attachments": [],
        }

        # try out each attribute with a wrong type and expect ValueErrors
        step_dict["name"] = None
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["name"] = "test"

        step_dict["duration"] = "0"
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["duration"] = 0

        step_dict["workload"] = "0"
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["workload"] = 0

        step_dict["description"] = list()
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["description"] = "test"

        step_dict["learning_goal"] = list()
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["learning_goal"] = "test"

        step_dict["tasks"] = dict()
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["tasks"] = ["test"]

        step_dict["attachments"] = "test"
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["attachments"] = []


class VEPlanModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def create_step(self, name: str) -> Step:
        """
        convenience method to create a Step object with non-default values
        """

        return Step(
            name=name,
            duration=10,
            workload=10,
            description="test",
            learning_goal="test",
            tasks=["test", "test"],
            attachments=[ObjectId()],
        )

    def test_init_default(self):
        """
        expect: successful creation of a minimal VEPlan object (default values)
        """

        plan = VEPlan()
        self.assertIsNone(plan.name)
        self.assertIsNone(plan.topic_description)
        self.assertIsNone(plan.learning_goal)
        self.assertIsNotNone(plan._id)
        self.assertEqual(plan.steps, [])
        self.assertEqual(plan.duration, 0)
        self.assertEqual(plan.workload, 0)

    def test_init(self):
        """
        expect: successful creation of a VEPlan object, both passing an _id and letting
        it creat one itself
        """

        # pass an _id to init
        _id = ObjectId()
        steps = [self.create_step("test1"), self.create_step("test2")]
        plan = VEPlan(
            _id=_id,
            name="test",
            topic_description="test",
            learning_goal="test",
            steps=steps,
        )

        self.assertEqual(plan._id, _id)
        self.assertEqual(plan.name, "test")
        self.assertEqual(plan.topic_description, "test")
        self.assertEqual(plan.learning_goal, "test")
        self.assertEqual(plan.steps, steps)
        self.assertEqual(plan.workload, 20)
        self.assertEqual(plan.duration, 20)

        # again, this time without passing an _id to init
        plan2 = VEPlan(
            name="test",
            topic_description="test",
            learning_goal="test",
            steps=steps,
        )
        self.assertNotEqual(plan2._id, _id)
        self.assertEqual(plan2.name, "test")
        self.assertEqual(plan2.topic_description, "test")
        self.assertEqual(plan2.learning_goal, "test")
        self.assertEqual(plan2.steps, steps)
        self.assertEqual(plan2.workload, 20)
        self.assertEqual(plan2.duration, 20)

    def test_check_unique_steps(self):
        """
        expect: class method `_check_unique_step_names` of a VEPlan correctly
        determines, if names of steps are unique or not
        """

        self.assertTrue(
            VEPlan._check_unique_step_names(
                [self.create_step("test1"), self.create_step("test2")]
            )
        )
        self.assertFalse(
            VEPlan._check_unique_step_names(
                [self.create_step("test1"), self.create_step("test1")]
            )
        )

    def test_init_error_non_unique_steps(self):
        """
        expect: creation of VEPlan object raises NonUniqueStepsError because step names
        have duplicates, which is not allowed
        """

        self.assertRaises(
            NonUniqueStepsError,
            VEPlan,
            steps=[self.create_step("test"), self.create_step("test")],
        )

    def test_to_dict(self):
        """
        expect: successful serialization of a VEPlan object into its dict
        representation
        """

        step = self.create_step("test")
        plan_dict = VEPlan(steps=[step]).to_dict()

        self.assertIn("_id", plan_dict)
        self.assertIn("name", plan_dict)
        self.assertIn("duration", plan_dict)
        self.assertIn("workload", plan_dict)
        self.assertIn("topic_description", plan_dict)
        self.assertIn("learning_goal", plan_dict)
        self.assertIn("steps", plan_dict)
        self.assertIsInstance(plan_dict["_id"], ObjectId)
        self.assertIsNone(plan_dict["name"])
        self.assertIsNone(plan_dict["topic_description"])
        self.assertIsNone(plan_dict["learning_goal"])
        self.assertEqual(plan_dict["workload"], 10)
        self.assertEqual(plan_dict["duration"], 10)
        self.assertEqual(plan_dict["steps"], [step.to_dict()])

    def test_from_dict(self):
        """
        expect: successful creation of a VEPlan object from a dict, both by 
        supplying an _id and letting it create one itself
        """

        # first, try a manually set _id
        _id = ObjectId()
        step = self.create_step("test")
        plan_dict = {
            "_id": _id,
            "name": None,
            "topic_description": None,
            "learning_goal": None,
            "steps": [step.to_dict()],
        }

        plan = VEPlan.from_dict(plan_dict)

        self.assertIsNone(plan.name)
        self.assertIsNone(plan.topic_description)
        self.assertIsNone(plan.learning_goal)
        self.assertEqual(plan._id, _id)
        self.assertEqual(plan.steps, [step])
        self.assertEqual(plan.duration, 10)
        self.assertEqual(plan.workload, 10)

        # again, but this time don't set an _id ourselves
        plan_dict = {
            "name": None,
            "topic_description": None,
            "learning_goal": None,
            "steps": [step.to_dict()],
        }

        plan = VEPlan.from_dict(plan_dict)

        self.assertIsNone(plan.name)
        self.assertIsNone(plan.topic_description)
        self.assertIsNone(plan.learning_goal)
        self.assertIsInstance(plan._id, ObjectId)
        self.assertNotEqual(plan._id, _id)
        self.assertEqual(plan.steps, [step])
        self.assertEqual(plan.duration, 10)
        self.assertEqual(plan.workload, 10)

    def test_from_dict_error_params_not_dict(self):
        """
        expect: creation of a VEPlan from a dict raises TypeError because source
        is not a dict
        """

        self.assertRaises(TypeError, VEPlan.from_dict, "wrong_type")

    def test_from_dict_error_missing_key(self):
        """
        expect: creation of a VEPlan from a dict raises PlanKeyError because the
        dict is missing a required key
        """

        # steps is missing
        plan_dict = {
            "name": None,
            "topic_description": None,
            "learning_goal": None,
        }
        self.assertRaises(PlanKeyError, VEPlan.from_dict, plan_dict)

    def test_from_dict_error_wrong_types(self):
        """
        expect: creation of a VEPlan from a dict raises TypeErrors and InvalidId
        because values have the wrong types
        """

        plan_dict = {
            "_id": ObjectId(),
            "name": None,
            "topic_description": None,
            "learning_goal": None,
            "steps": [self.create_step("test").to_dict()],
        }

        # try wrong types for all fields
        plan_dict["_id"] = "123"
        self.assertRaises(InvalidId, VEPlan.from_dict, plan_dict)
        plan_dict["_id"] = ObjectId()

        plan_dict["name"] = 1
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["name"] = None

        plan_dict["topic_description"] = list()
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["topic_description"] = None

        plan_dict["learning_goal"] = 1
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["learning_goal"] = None

    def test_from_dict_error_non_unique_steps(self):
        """
        expect: creation of a VEPlan object from a dict raises NonUniqueStepsError
        because steps contain duplicate names
        """

        plan_dict = {
            "name": None,
            "duration": 10,
            "workload": 10,
            "topic_description": None,
            "learning_goal": None,
            "steps": [
                self.create_step("test").to_dict(),
                self.create_step("test").to_dict(),
            ],
        }
        self.assertRaises(NonUniqueStepsError, VEPlan.from_dict, plan_dict)
