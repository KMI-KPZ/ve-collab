from datetime import datetime, timedelta
from unittest import TestCase

from bson import ObjectId
from bson.errors import InvalidId
from exceptions import (
    NonUniqueStepsError,
    PlanKeyError,
    StepKeyError,
    TargetGroupKeyError,
    TaskKeyError,
)

from model import Step, TargetGroup, Task, User, VEPlan


def setUpModule():
    pass


def tearDownModule():
    pass


class UserModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_init(self):
        """
        expect: successful creation of User object
        """

        name = "test"
        user_id = "abc123"
        mail = "test@mail.com"

        user = User(name, user_id, mail)
        self.assertEqual(user.username, name)
        self.assertEqual(user.user_id, user_id)
        self.assertEqual(user.email, mail)

    def test_init_error_wrong_types(self):
        """
        expect: creation of User object raises TypeError because attributes
        have the wrong type
        """

        name = "test"
        user_id = "abc123"
        mail = "test@mail.com"

        name = 123
        self.assertRaises(TypeError, User, name, user_id, mail)
        name = "test"

        user_id = 123
        self.assertRaises(TypeError, User, name, user_id, mail)
        user_id = "abc123"

        mail = 123
        self.assertRaises(TypeError, User, name, user_id, mail)
        mail = "test@mail.com"


class TaskModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_init_default(self):
        """
        expect: successful creation of a minimal Task object
        """
        task = Task()
        self.assertEqual(task.title, None)
        self.assertEqual(task.description, None)
        self.assertEqual(task.learning_goal, None)
        self.assertEqual(task.tools, [])
        self.assertIsInstance(task._id, ObjectId)

    def test_init(self):
        """
        expect: successful creation of a Task object, passing values
        for each attribute
        """

        _id = ObjectId()
        dummy_val = "test"
        task = Task(
            _id=_id,
            title=dummy_val,
            description=dummy_val,
            learning_goal=dummy_val,
            tools=[dummy_val],
        )

        self.assertEqual(task.title, dummy_val)
        self.assertEqual(task.description, dummy_val)
        self.assertEqual(task.learning_goal, dummy_val)
        self.assertEqual(task.tools, [dummy_val])
        self.assertEqual(task._id, _id)

    def test_to_dict(self):
        """
        expect: successful serialization of a task object into a dict conveying
        all attributes accordingly.
        """

        task = Task().to_dict()
        self.assertIn("title", task)
        self.assertIn("description", task)
        self.assertIn("learning_goal", task)
        self.assertIn("tools", task)
        self.assertIn("_id", task)
        self.assertEqual(task["title"], None)
        self.assertEqual(task["description"], None)
        self.assertEqual(task["learning_goal"], None)
        self.assertEqual(task["tools"], [])
        self.assertIsInstance(task["_id"], ObjectId)

    def test_from_dict(self):
        """
        expect: successful creation of a Task object from a dict
        """

        _id = ObjectId()
        task_dict = {
            "_id": _id,
            "title": "test",
            "description": "test",
            "learning_goal": "test",
            "tools": ["test"],
        }
        task = Task.from_dict(task_dict)
        self.assertEqual(task.title, "test")
        self.assertEqual(task.description, "test")
        self.assertEqual(task.learning_goal, "test")
        self.assertEqual(task.tools, ["test"])
        self.assertEqual(task._id, _id)

    def test_from_dict_error_params_no_dict(self):
        """
        expect: TypeError is raised because the params to `from_dict` is not
        a dictionary
        """

        self.assertRaises(TypeError, Task.from_dict, "no_dict")

    def test_from_dict_error_missing_key(self):
        """
        expect: TaskKeyError is raised because the params dictionary is missing
        a required key
        """

        # title is missing
        _id = ObjectId()
        task_dict = {
            "_id": _id,
            "description": "test",
            "learning_goal": "test",
            "tools": ["test"],
        }
        self.assertRaises(TaskKeyError, Task.from_dict, task_dict)

    def test_from_dict_error_wrong_types(self):
        """
        expect: TypeError is raised because an attribute in the params dictionary
        does not have the expected type
        """

        task_dict = {
            "_id": ObjectId(),
            "title": "test",
            "description": "test",
            "learning_goal": "test",
            "tools": ["test"],
        }

        # try out each attribute with a wrong type and expect ValueErrors
        task_dict["_id"] = 1
        self.assertRaises(TypeError, Task.from_dict, task_dict)
        task_dict["_id"] = ObjectId()

        task_dict["title"] = 1
        self.assertRaises(TypeError, Task.from_dict, task_dict)
        task_dict["title"] = "test"

        task_dict["description"] = 1
        self.assertRaises(TypeError, Task.from_dict, task_dict)
        task_dict["description"] = "test"

        task_dict["learning_goal"] = 1
        self.assertRaises(TypeError, Task.from_dict, task_dict)
        task_dict["learning_goal"] = "test"

        task_dict["tools"] = dict()
        self.assertRaises(TypeError, Task.from_dict, task_dict)
        task_dict["tools"] = ["test"]


class StepModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_init_default(self):
        """
        expect: successful creation of a minimal Step object
        """

        step = Step()
        self.assertEqual(step.name, None)
        self.assertEqual(step.workload, 0)
        self.assertEqual(step.timestamp_from, None)
        self.assertEqual(step.timestamp_to, None)
        self.assertEqual(step.duration, None)
        self.assertEqual(step.learning_env, None)
        self.assertEqual(step.tasks, [])
        self.assertEqual(step.evaluation_tools, [])
        self.assertEqual(step.attachments, [])
        self.assertEqual(step.custom_attributes, {})
        self.assertIsInstance(step._id, ObjectId)

    def test_init(self):
        """
        expect: successful creation of a Step object, passing values for each attribute
        """

        _id = ObjectId()
        attachment_id = ObjectId()
        timestamp_from = datetime(2023, 1, 1)
        timestamp_to = datetime(2023, 1, 8)
        task = Task()
        custom_attributes = {"test": "test"}
        step = Step(
            _id=_id,
            name="test",
            workload=10,
            timestamp_from=timestamp_from,
            timestamp_to=timestamp_to,
            learning_env="test",
            tasks=[task],
            evaluation_tools=["test", "test"],
            attachments=[attachment_id],
            custom_attributes=custom_attributes,
        )

        self.assertEqual(step.name, "test")
        self.assertEqual(step.workload, 10)
        self.assertEqual(step.timestamp_from, timestamp_from)
        self.assertEqual(step.timestamp_to, timestamp_to)
        self.assertEqual(step.duration, timedelta(days=7))
        self.assertEqual(step.learning_env, "test")
        self.assertEqual(step.tasks, [task])
        self.assertEqual(step.evaluation_tools, ["test", "test"])
        self.assertEqual(step.attachments, [attachment_id])
        self.assertEqual(step._id, _id)
        self.assertEqual(step.custom_attributes, custom_attributes)

        # test again, but this time let the timestamps be parsed from str's
        # into datetime objects
        step2 = Step(timestamp_from="2023-01-01", timestamp_to="2023-01-08")
        self.assertEqual(step2.timestamp_from, timestamp_from)
        self.assertEqual(step2.timestamp_to, timestamp_to)
        self.assertEqual(step2.duration, timedelta(days=7))

    def test_to_dict(self):
        """
        expect: successful serialization of a minimal Step object into
        its dictionary representation
        """

        step = Step()
        step_dict = step.to_dict()

        self.assertIsInstance(step_dict, dict)
        self.assertIn("_id", step_dict)
        self.assertIn("name", step_dict)
        self.assertIn("workload", step_dict)
        self.assertIn("timestamp_from", step_dict)
        self.assertIn("timestamp_to", step_dict)
        self.assertIn("duration", step_dict)
        self.assertIn("learning_env", step_dict)
        self.assertIn("tasks", step_dict)
        self.assertIn("evaluation_tools", step_dict)
        self.assertIn("attachments", step_dict)
        self.assertIn("custom_attributes", step_dict)
        self.assertIsInstance(step_dict["_id"], ObjectId)
        self.assertEqual(step_dict["name"], None)
        self.assertEqual(step_dict["workload"], 0)
        self.assertEqual(step_dict["timestamp_from"], None)
        self.assertEqual(step_dict["timestamp_to"], None)
        self.assertEqual(step_dict["duration"], None)
        self.assertEqual(step_dict["learning_env"], None)
        self.assertEqual(step_dict["tasks"], [])
        self.assertEqual(step_dict["evaluation_tools"], [])
        self.assertEqual(step_dict["attachments"], [])
        self.assertEqual(step_dict["custom_attributes"], {})

    def test_from_dict(self):
        """
        expect: successful creation of a Step object derived from a dictionary
        """

        attachment_id = ObjectId()
        _id = ObjectId()
        step_dict = {
            "_id": _id,
            "name": "test",
            "workload": 10,
            "timestamp_from": datetime(2023, 1, 1),
            "timestamp_to": datetime(2023, 1, 8),
            "learning_env": "test",
            "tasks": [Task().to_dict()],
            "evaluation_tools": ["test", "test"],
            "attachments": [attachment_id],
            "custom_attributes": {"test": "test"},
        }

        step = Step.from_dict(step_dict.copy())

        self.assertIsInstance(step, Step)
        self.assertEqual(step._id, _id)
        self.assertEqual(step.name, step_dict["name"])
        self.assertEqual(step.workload, step_dict["workload"])
        self.assertEqual(step.timestamp_from, step_dict["timestamp_from"])
        self.assertEqual(step.timestamp_to, step_dict["timestamp_to"])
        self.assertEqual(
            step.duration, step_dict["timestamp_to"] - step_dict["timestamp_from"]
        )
        self.assertEqual(step.learning_env, step_dict["learning_env"])
        self.assertEqual([task.to_dict() for task in step.tasks], step_dict["tasks"])
        self.assertEqual(step.evaluation_tools, step_dict["evaluation_tools"])
        self.assertEqual(step.attachments, step_dict["attachments"])
        self.assertEqual(step.custom_attributes, step_dict["custom_attributes"])

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
            "_id": ObjectId(),
            "name": "test",
            "workload": 10,
            "timestamp_from": datetime(2023, 1, 1),
            "timestamp_to": datetime(2023, 1, 8),
            "learning_env": "test",
            "tasks": [Task().to_dict()],
            "evaluation_tools": ["test", "test"],
            "custom_attributes": {"test": "test"},
        }
        self.assertRaises(StepKeyError, Step.from_dict, step_dict)

    def test_from_dict_error_wrong_types(self):
        """
        expect: creation of Step object from dict raises TypeError's because
        arguments have the wrong types
        """

        step_dict = {
            "_id": ObjectId(),
            "name": "test",
            "workload": 0,
            "timestamp_from": datetime(2023, 1, 1),
            "timestamp_to": datetime(2023, 1, 8),
            "learning_env": None,
            "tasks": [Task().to_dict(), Task().to_dict()],
            "evaluation_tools": ["test", "test"],
            "attachments": [],
            "custom_attributes": {},
        }

        # try out each attribute with a wrong type and expect ValueErrors
        step_dict["_id"] = 123
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["_id"] = ObjectId()

        step_dict["name"] = None
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["name"] = "test"

        step_dict["workload"] = "0"
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["workload"] = 0

        step_dict["timestamp_from"] = 1
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["timestamp_from"] = datetime(2023, 1, 1)

        step_dict["timestamp_to"] = 1
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["timestamp_to"] = datetime(2023, 1, 8)

        step_dict["learning_env"] = list()
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["learning_env"] = "test"

        step_dict["tasks"] = dict()
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["tasks"] = ["test"]

        step_dict["evaluation_tools"] = dict()
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["evaluation_tools"] = list()

        step_dict["attachments"] = "test"
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["attachments"] = []

        step_dict["custom_attributes"] = "test"
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["custom_attributes"] = {}


class TargetGroupModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_init_default(self):
        """
        expect: successful creation of a minimal Step object
        """

        target_group = TargetGroup()
        self.assertEqual(target_group.name, None)
        self.assertEqual(target_group.age_min, 0)
        self.assertEqual(target_group.age_max, 99)
        self.assertEqual(target_group.experience, None)
        self.assertEqual(target_group.academic_course, None)
        self.assertEqual(target_group.mother_tongue, None)
        self.assertEqual(target_group.foreign_languages, {})
        self.assertIsInstance(target_group._id, ObjectId)

    def test_init(self):
        """
        expect: successful creation of a Step object, passing values for each attribute
        """

        _id = ObjectId()
        target_group = TargetGroup(
            _id=_id,
            name="test",
            age_min=30,
            age_max=40,
            experience="test",
            academic_course="test",
            mother_tongue="test",
            foreign_languages={"test": "l1"},
        )

        self.assertEqual(target_group.name, "test")
        self.assertEqual(target_group.age_min, 30)
        self.assertEqual(target_group.age_max, 40)
        self.assertEqual(target_group.experience, "test")
        self.assertEqual(target_group.academic_course, "test")
        self.assertEqual(target_group.mother_tongue, "test")
        self.assertEqual(target_group.foreign_languages, {"test": "l1"})
        self.assertEqual(target_group._id, _id)

    def test_to_dict(self):
        """
        expect: successful serialization of a minimal Step object into
        its dictionary representation
        """

        target_group = TargetGroup()
        target_group_dict = target_group.to_dict()

        self.assertIsInstance(target_group_dict, dict)
        self.assertIn("_id", target_group_dict)
        self.assertIn("name", target_group_dict)
        self.assertIn("age_min", target_group_dict)
        self.assertIn("age_max", target_group_dict)
        self.assertIn("experience", target_group_dict)
        self.assertIn("academic_course", target_group_dict)
        self.assertIn("mother_tongue", target_group_dict)
        self.assertIn("foreign_languages", target_group_dict)
        self.assertIsInstance(target_group_dict["_id"], ObjectId)
        self.assertEqual(target_group_dict["name"], None)
        self.assertEqual(target_group_dict["age_min"], 0)
        self.assertEqual(target_group_dict["age_max"], 99)
        self.assertEqual(target_group_dict["experience"], None)
        self.assertEqual(target_group_dict["academic_course"], None)
        self.assertEqual(target_group_dict["mother_tongue"], None)
        self.assertEqual(target_group_dict["foreign_languages"], {})

    def test_from_dict(self):
        """
        expect: successful creation of a Step object derived from a dictionary
        """

        _id = ObjectId()
        target_group_dict = {
            "_id": _id,
            "name": "test",
            "age_min": 10,
            "age_max": 20,
            "experience": "test",
            "academic_course": "test",
            "mother_tongue": "test",
            "foreign_languages": {"test": "l1"},
        }

        target_group = TargetGroup.from_dict(target_group_dict.copy())

        self.assertIsInstance(target_group, TargetGroup)
        self.assertEqual(target_group._id, _id)
        self.assertEqual(target_group.name, target_group_dict["name"])
        self.assertEqual(target_group.age_min, target_group_dict["age_min"])
        self.assertEqual(target_group.age_max, target_group_dict["age_max"])
        self.assertEqual(target_group.experience, target_group_dict["experience"])
        self.assertEqual(
            target_group.academic_course, target_group_dict["academic_course"]
        )
        self.assertEqual(target_group.mother_tongue, target_group_dict["mother_tongue"])
        self.assertEqual(
            target_group.foreign_languages, target_group_dict["foreign_languages"]
        )

    def test_from_dict_error_params_no_dict(self):
        """
        expect: creation of Step object from dict raises TypeError because source is
        not a dict
        """

        self.assertRaises(TypeError, TargetGroup.from_dict, "wrong_type")

    def test_from_dict_error_missing_key(self):
        """
        expect: creation of Step object from dict raises StepKeyError because
        the dict is missing required keys
        """

        # foreign_languages is missing
        target_group_dict = {
            "_id": ObjectId(),
            "name": "test",
            "age_min": 10,
            "age_max": 20,
            "experience": "test",
            "academic_course": "test",
            "mother_tongue": "test",
        }
        self.assertRaises(TargetGroupKeyError, TargetGroup.from_dict, target_group_dict)

    def test_from_dict_error_wrong_types(self):
        """
        expect: creation of Step object from dict raises TypeError's because
        arguments have the wrong types
        """

        target_group_dict = {
            "_id": ObjectId(),
            "name": "test",
            "age_min": 10,
            "age_max": 20,
            "experience": "test",
            "academic_course": "test",
            "mother_tongue": "test",
            "foreign_languages": {"test": "l1"},
        }

        # try out each attribute with a wrong type and expect ValueErrors
        target_group_dict["_id"] = 123
        self.assertRaises(TypeError, TargetGroup.from_dict, target_group_dict)
        target_group_dict["_id"] = ObjectId()

        target_group_dict["name"] = 123
        self.assertRaises(TypeError, TargetGroup.from_dict, target_group_dict)
        target_group_dict["name"] = "test"

        target_group_dict["age_min"] = "0"
        self.assertRaises(TypeError, TargetGroup.from_dict, target_group_dict)
        target_group_dict["age_min"] = 0

        target_group_dict["age_max"] = list()
        self.assertRaises(TypeError, TargetGroup.from_dict, target_group_dict)
        target_group_dict["age_max"] = 99

        target_group_dict["experience"] = 1
        self.assertRaises(TypeError, TargetGroup.from_dict, target_group_dict)
        target_group_dict["experience"] = "test"

        target_group_dict["academic_course"] = list()
        self.assertRaises(TypeError, TargetGroup.from_dict, target_group_dict)
        target_group_dict["academic_course"] = "test"

        target_group_dict["mother_tongue"] = dict()
        self.assertRaises(TypeError, TargetGroup.from_dict, target_group_dict)
        target_group_dict["mother_tongue"] = "test"

        target_group_dict["foreign_languages"] = list()
        self.assertRaises(TypeError, TargetGroup.from_dict, target_group_dict)
        target_group_dict["foreign_languages"] = dict()


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
        self.assertEqual(plan.duration, timedelta(0))
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
        steps_duration = sum(
            [step.timestamp_to - step.timestamp_from for step in steps],
            start=timedelta(0),
        )
        self.assertEqual(plan.duration, steps_duration)

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
        self.assertEqual(plan2.duration, steps_duration)

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
        self.assertEqual(plan_dict["duration"], step.duration.total_seconds())
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
        self.assertEqual(plan.duration, step.duration)
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
        self.assertEqual(plan.duration, step.duration)
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
