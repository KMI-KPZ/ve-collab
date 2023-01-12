from unittest import TestCase

from bson import ObjectId
from exceptions import StepKeyError

from model import Step


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
        step = Step("test")
        self.assertEqual(step.name, "test")
        self.assertEqual(step.duration, 0)
        self.assertEqual(step.workload, 0)
        self.assertEqual(step.description, None)
        self.assertEqual(step.learning_goal, None)
        self.assertEqual(step.tasks, [])
        self.assertEqual(step.attachments, [])

    def test_init_(self):
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
        self.assertRaises(TypeError, Step.from_dict, "wrong_type")

    def test_from_dict_error_missing_key(self):
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

    
