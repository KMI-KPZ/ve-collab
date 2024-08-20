from datetime import datetime, timedelta
from unittest import TestCase

from bson import ObjectId
from bson.errors import InvalidId
from exceptions import (
    MissingKeyError,
    NonUniqueStepsError,
)

from model import (
    Evaluation,
    IndividualLearningGoal,
    Institution,
    Lecture,
    PhysicalMobility,
    Space,
    Step,
    TargetGroup,
    Task,
    User,
    VEPlan,
)


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
        self.assertEqual(user.orcid, "")

        orcid = "0000-0000-0000-0000"
        user = User(name, user_id, mail, orcid)
        self.assertEqual(user.username, name)
        self.assertEqual(user.user_id, user_id)
        self.assertEqual(user.email, mail)
        self.assertEqual(user.orcid, orcid)

    def test_init_error_wrong_types(self):
        """
        expect: creation of User object raises TypeError because attributes
        have the wrong type
        """

        name = "test"
        user_id = "abc123"
        mail = "test@mail.com"
        orcid = "0000-0000-0000-0000"

        name = 123
        self.assertRaises(TypeError, User, name, user_id, mail)
        name = "test"

        user_id = 123
        self.assertRaises(TypeError, User, name, user_id, mail)
        user_id = "abc123"

        mail = 123
        self.assertRaises(TypeError, User, name, user_id, mail)
        mail = "test@mail.com"

        orcid = 123
        self.assertRaises(TypeError, User, name, user_id, mail, orcid)
        orcid = "0000-0000-0000-0000"


class SpaceModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_init_default(self):
        """
        expect: object-like and dict-like access to default
        attributes
        """

        space = Space({})
        self.assertEqual(space.name, None)
        self.assertEqual(space.invisible, False)
        self.assertEqual(space.joinable, True)
        self.assertEqual(space.members, [])
        self.assertEqual(space.admins, [])
        self.assertEqual(space.invites, [])
        self.assertEqual(space.requests, [])
        self.assertEqual(space.files, [])
        self.assertEqual(space.space_pic, None)
        self.assertEqual(space.space_description, None)

        self.assertEqual(space["name"], None)
        self.assertEqual(space["invisible"], False)
        self.assertEqual(space["joinable"], True)
        self.assertEqual(space["members"], [])
        self.assertEqual(space["admins"], [])
        self.assertEqual(space["invites"], [])
        self.assertEqual(space["requests"], [])
        self.assertEqual(space["files"], [])
        self.assertEqual(space["space_pic"], None)
        self.assertEqual(space["space_description"], None)

    def test_init(self):
        """
        expect: object-like and dict-like access to non-default
        attributes
        """

        space = Space(
            {
                "name": "test",
                "invisible": False,
                "joinable": True,
                "members": ["test"],
                "admins": ["test"],
                "invites": ["test"],
                "requests": ["test"],
                "files": ["test"],
                "space_pic": "test",
                "space_description": "test",
            }
        )

        self.assertEqual(space.name, "test")
        self.assertEqual(space.invisible, False)
        self.assertEqual(space.joinable, True)
        self.assertEqual(space.members, ["test"])
        self.assertEqual(space.admins, ["test"])
        self.assertEqual(space.invites, ["test"])
        self.assertEqual(space.requests, ["test"])
        self.assertEqual(space.files, ["test"])
        self.assertEqual(space.space_pic, "test")
        self.assertEqual(space.space_description, "test")

        self.assertEqual(space["name"], "test")
        self.assertEqual(space["invisible"], False)
        self.assertEqual(space["joinable"], True)
        self.assertEqual(space["members"], ["test"])
        self.assertEqual(space["admins"], ["test"])
        self.assertEqual(space["invites"], ["test"])
        self.assertEqual(space["requests"], ["test"])
        self.assertEqual(space["files"], ["test"])
        self.assertEqual(space["space_pic"], "test")
        self.assertEqual(space["space_description"], "test")

        # again, but omit some values to let them be default created
        space2 = Space(
            {
                "name": "test",
                "invisible": False,
                "joinable": True,
                "admins": ["test"],
                "invites": ["test"],
                "requests": ["test"],
                "files": ["test"],
            }
        )

        self.assertEqual(space2.name, "test")
        self.assertEqual(space2.invisible, False)
        self.assertEqual(space2.joinable, True)
        self.assertEqual(space2.members, [])


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
        self.assertEqual(task.task_formulation, None)
        self.assertEqual(task.work_mode, None)
        self.assertEqual(task.notes, None)
        self.assertEqual(task.tools, [])
        self.assertEqual(task.materials, [])
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
            task_formulation=dummy_val,
            work_mode=dummy_val,
            notes=dummy_val,
            tools=[dummy_val],
            materials=[dummy_val],
        )

        self.assertEqual(task.task_formulation, dummy_val)
        self.assertEqual(task.work_mode, dummy_val)
        self.assertEqual(task.notes, dummy_val)
        self.assertEqual(task.tools, [dummy_val])
        self.assertEqual(task.materials, [dummy_val])
        self.assertEqual(task._id, _id)

        # test again, without supplying and _id
        task = Task(
            task_formulation=dummy_val,
            work_mode=dummy_val,
            notes=dummy_val,
            tools=[dummy_val],
            materials=[dummy_val],
        )

        self.assertEqual(task.task_formulation, dummy_val)
        self.assertEqual(task.work_mode, dummy_val)
        self.assertEqual(task.notes, dummy_val)
        self.assertEqual(task.tools, [dummy_val])
        self.assertEqual(task.materials, [dummy_val])
        self.assertIsInstance(task._id, ObjectId)

    def test_to_dict(self):
        """
        expect: successful serialization of a task object into a dict conveying
        all attributes accordingly.
        """

        task = Task().to_dict()
        self.assertIn("task_formulation", task)
        self.assertIn("work_mode", task)
        self.assertIn("notes", task)
        self.assertIn("tools", task)
        self.assertIn("materials", task)
        self.assertIn("_id", task)
        self.assertEqual(task["task_formulation"], None)
        self.assertEqual(task["work_mode"], None)
        self.assertEqual(task["notes"], None)
        self.assertEqual(task["tools"], [])
        self.assertEqual(task["materials"], [])
        self.assertIsInstance(task["_id"], ObjectId)

    def test_from_dict(self):
        """
        expect: successful creation of a Task object from a dict
        """

        _id = ObjectId()
        task_dict = {
            "_id": _id,
            "task_formulation": "test",
            "work_mode": "test",
            "notes": "test",
            "tools": ["test"],
            "materials": ["test"],
        }
        task = Task.from_dict(task_dict)
        self.assertEqual(task.task_formulation, "test")
        self.assertEqual(task.work_mode, "test")
        self.assertEqual(task.notes, "test")
        self.assertEqual(task.tools, ["test"])
        self.assertEqual(task.materials, ["test"])
        self.assertEqual(task._id, _id)

        # test again, without supplying an _id
        task_dict = {
            "task_formulation": "test",
            "work_mode": "test",
            "notes": "test",
            "tools": ["test"],
            "materials": ["test"],
        }
        task = Task.from_dict(task_dict)
        self.assertEqual(task.task_formulation, "test")
        self.assertEqual(task.work_mode, "test")
        self.assertEqual(task.notes, "test")
        self.assertEqual(task.tools, ["test"])
        self.assertEqual(task.materials, ["test"])
        self.assertIsInstance(task._id, ObjectId)

    def test_from_dict_error_params_no_dict(self):
        """
        expect: TypeError is raised because the params to `from_dict` is not
        a dictionary
        """

        self.assertRaises(TypeError, Task.from_dict, "no_dict")

    def test_from_dict_error_missing_key(self):
        """
        expect: MissingKeyError is raised because the params dictionary is missing
        a required key
        """

        # task_formulation is missing
        _id = ObjectId()
        task_dict = {
            "_id": _id,
            "work_mode": "test",
            "notes": "test",
            "tools": ["test"],
            "materials": ["test"],
        }
        self.assertRaises(MissingKeyError, Task.from_dict, task_dict)

    def test_from_dict_error_wrong_types(self):
        """
        expect: TypeError is raised because an attribute in the params dictionary
        does not have the expected type
        """

        task_dict = {
            "_id": ObjectId(),
            "task_formulation": "test",
            "work_mode": "test",
            "notes": "test",
            "tools": ["test"],
            "materials": ["test"],
        }

        # try out each attribute with a wrong type and expect ValueErrors
        task_dict["_id"] = 1
        self.assertRaises(TypeError, Task.from_dict, task_dict)
        task_dict["_id"] = ObjectId()

        task_dict["task_formulation"] = 1
        self.assertRaises(TypeError, Task.from_dict, task_dict)
        task_dict["task_formulation"] = "test"

        task_dict["work_mode"] = 1
        self.assertRaises(TypeError, Task.from_dict, task_dict)
        task_dict["work_mode"] = "test"

        task_dict["notes"] = 1
        self.assertRaises(TypeError, Task.from_dict, task_dict)
        task_dict["notes"] = "test"

        task_dict["tools"] = dict()
        self.assertRaises(TypeError, Task.from_dict, task_dict)
        task_dict["tools"] = ["test"]

        task_dict["materials"] = dict()
        self.assertRaises(TypeError, Task.from_dict, task_dict)
        task_dict["materials"] = ["test"]


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
        self.assertEqual(step.learning_goal, None)
        self.assertEqual(step.learning_activity, None)
        self.assertEqual(step.has_tasks, False)
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
            learning_goal="test",
            learning_activity="test",
            has_tasks=True,
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
        self.assertEqual(step.learning_goal, "test")
        self.assertEqual(step.learning_activity, "test")
        self.assertEqual(step.has_tasks, True)
        self.assertEqual(step.tasks, [task])
        self.assertEqual(step.evaluation_tools, ["test", "test"])
        self.assertEqual(step.attachments, [attachment_id])
        self.assertEqual(step._id, _id)
        self.assertEqual(step.custom_attributes, custom_attributes)

        # test again, but this time let the timestamps be parsed from str's
        # into datetime objects and let _id be system-derived
        step2 = Step(timestamp_from="2023-01-01", timestamp_to="2023-01-08")
        self.assertEqual(step2.timestamp_from, timestamp_from)
        self.assertEqual(step2.timestamp_to, timestamp_to)
        self.assertEqual(step2.duration, timedelta(days=7))
        self.assertIsInstance(step2._id, ObjectId)

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
        self.assertIn("learning_goal", step_dict)
        self.assertIn("learning_activity", step_dict)
        self.assertIn("has_tasks", step_dict)
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
        self.assertEqual(step_dict["learning_goal"], None)
        self.assertEqual(step_dict["learning_activity"], None)
        self.assertEqual(step_dict["has_tasks"], False)
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
            "learning_goal": "test",
            "learning_activity": "test",
            "has_tasks": True,
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
        self.assertEqual(step.learning_goal, step_dict["learning_goal"])
        self.assertEqual(step.learning_activity, step_dict["learning_activity"])
        self.assertEqual(step.has_tasks, step_dict["has_tasks"])
        self.assertEqual([task.to_dict() for task in step.tasks], step_dict["tasks"])
        self.assertEqual(step.evaluation_tools, step_dict["evaluation_tools"])
        self.assertEqual(step.attachments, step_dict["attachments"])
        self.assertEqual(step.custom_attributes, step_dict["custom_attributes"])

        # test again without supplying _ids for step and task
        task_dict = Task().to_dict()
        del task_dict["_id"]
        step_dict = {
            "name": "test",
            "workload": 10,
            "timestamp_from": datetime(2023, 1, 1),
            "timestamp_to": datetime(2023, 1, 8),
            "learning_goal": "test",
            "learning_activity": "test",
            "has_tasks": True,
            "tasks": [task_dict],
            "evaluation_tools": ["test", "test"],
            "attachments": [attachment_id],
            "custom_attributes": {"test": "test"},
        }
        step = Step.from_dict(step_dict.copy())

        self.assertIsInstance(step, Step)
        self.assertIsInstance(step._id, ObjectId)
        self.assertEqual(step.name, step_dict["name"])
        self.assertEqual(step.workload, step_dict["workload"])
        self.assertEqual(step.timestamp_from, step_dict["timestamp_from"])
        self.assertEqual(step.timestamp_to, step_dict["timestamp_to"])
        self.assertEqual(
            step.duration, step_dict["timestamp_to"] - step_dict["timestamp_from"]
        )
        self.assertEqual(step.evaluation_tools, step_dict["evaluation_tools"])
        self.assertEqual(step.attachments, step_dict["attachments"])
        self.assertEqual(step.custom_attributes, step_dict["custom_attributes"])
        self.assertEqual(step.learning_goal, step_dict["learning_goal"])
        self.assertEqual(step.learning_activity, step_dict["learning_activity"])
        self.assertEqual(step.has_tasks, step_dict["has_tasks"])
        self.assertIsInstance(step.tasks, list)
        self.assertEqual(len(step.tasks), 1)
        self.assertIsInstance(step.tasks[0], Task)
        self.assertIsInstance(step.tasks[0]._id, ObjectId)

    def test_from_dict_error_params_no_dict(self):
        """
        expect: creation of Step object from dict raises TypeError because source is
        not a dict
        """

        self.assertRaises(TypeError, Step.from_dict, "wrong_type")

    def test_from_dict_error_missing_key(self):
        """
        expect: creation of Step object from dict raises MissingKeyError because
        the dict is missing required keys
        """

        # attachments is missing
        step_dict = {
            "_id": ObjectId(),
            "name": "test",
            "workload": 10,
            "timestamp_from": datetime(2023, 1, 1),
            "timestamp_to": datetime(2023, 1, 8),
            "learning_goal": "test",
            "learning_activity": "test",
            "has_tasks": True,
            "tasks": [Task().to_dict()],
            "evaluation_tools": ["test", "test"],
            "custom_attributes": {"test": "test"},
        }
        self.assertRaises(MissingKeyError, Step.from_dict, step_dict)

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
            "learning_goal": "test",
            "learning_activity": "test",
            "has_tasks": True,
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

        step_dict["learning_goal"] = 123
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["learning_goal"] = "test"

        step_dict["learning_activity"] = 123
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["learning_activity"] = "test"

        step_dict["has_tasks"] = "True"
        self.assertRaises(TypeError, Step.from_dict, step_dict)
        step_dict["has_tasks"] = True

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

    def test_check_unique_tasks(self):
        """
        expect: the check for unique tasks work, i.e. returns False if a step
        has duplicate tasks (determined by their task_formulations)
        """
        self.assertTrue(
            Step._check_unique_tasks(
                [Task(task_formulation="test1"), Task(task_formulation="test2")]
            )
        )
        self.assertFalse(
            Step._check_unique_tasks(
                [Task(task_formulation="test"), Task(task_formulation="test")]
            )
        )


class TargetGroupModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_init_default(self):
        """
        expect: successful creation of a minimal TargetGroup object
        """

        target_group = TargetGroup()
        self.assertEqual(target_group.name, None)
        self.assertEqual(target_group.age_min, None)
        self.assertEqual(target_group.age_max, None)
        self.assertEqual(target_group.experience, None)
        self.assertEqual(target_group.academic_course, None)
        self.assertEqual(target_group.languages, None)
        self.assertIsInstance(target_group._id, ObjectId)

    def test_init(self):
        """
        expect: successful creation of a TargetGroup object, passing values for each attribute
        """

        _id = ObjectId()
        target_group = TargetGroup(
            _id=_id,
            name="test",
            age_min=30,
            age_max=40,
            experience="test",
            academic_course="test",
            languages="test",
        )

        self.assertEqual(target_group.name, "test")
        self.assertEqual(target_group.age_min, 30)
        self.assertEqual(target_group.age_max, 40)
        self.assertEqual(target_group.experience, "test")
        self.assertEqual(target_group.academic_course, "test")
        self.assertEqual(target_group.languages, "test")
        self.assertEqual(target_group._id, _id)

        _id = ObjectId()
        target_group = TargetGroup(
            _id=_id,
            name="test",
            age_min="30",
            age_max="40",
            experience="test",
            academic_course="test",
            languages="test",
        )

        self.assertEqual(target_group.name, "test")
        self.assertEqual(target_group.age_min, 30)
        self.assertEqual(target_group.age_max, 40)
        self.assertEqual(target_group.experience, "test")
        self.assertEqual(target_group.academic_course, "test")
        self.assertEqual(target_group.languages, "test")
        self.assertEqual(target_group._id, _id)

        _id = ObjectId()
        target_group = TargetGroup(
            _id=_id,
            name="test",
            age_min=30,
            age_max=40,
            experience="test",
            academic_course="test",
            languages="test",
        )

        self.assertEqual(target_group.name, "test")
        self.assertEqual(target_group.age_min, 30)
        self.assertEqual(target_group.age_max, 40)
        self.assertEqual(target_group.experience, "test")
        self.assertEqual(target_group.academic_course, "test")
        self.assertEqual(target_group.languages, "test")
        self.assertEqual(target_group._id, _id)

        # test again without supplying a _id

        target_group = TargetGroup(
            name="test",
            age_min=30,
            age_max=40,
            experience="test",
            academic_course="test",
            languages="test",
        )
        self.assertEqual(target_group.name, "test")
        self.assertEqual(target_group.age_min, 30)
        self.assertEqual(target_group.age_max, 40)
        self.assertEqual(target_group.experience, "test")
        self.assertEqual(target_group.academic_course, "test")
        self.assertEqual(target_group.languages, "test")
        self.assertIsInstance(target_group._id, ObjectId)

    def test_to_dict(self):
        """
        expect: successful serialization of a minimal TargetGroup object into
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
        self.assertIn("languages", target_group_dict)
        self.assertIsInstance(target_group_dict["_id"], ObjectId)
        self.assertEqual(target_group_dict["name"], None)
        self.assertEqual(target_group_dict["age_min"], None)
        self.assertEqual(target_group_dict["age_max"], None)
        self.assertEqual(target_group_dict["experience"], None)
        self.assertEqual(target_group_dict["academic_course"], None)
        self.assertEqual(target_group_dict["languages"], None)

        target_group = TargetGroup(age_min=10, age_max=20)
        target_group_dict = target_group.to_dict()

        self.assertIsInstance(target_group_dict, dict)
        self.assertIn("_id", target_group_dict)
        self.assertIn("name", target_group_dict)
        self.assertIn("age_min", target_group_dict)
        self.assertIn("age_max", target_group_dict)
        self.assertIn("experience", target_group_dict)
        self.assertIn("academic_course", target_group_dict)
        self.assertIn("languages", target_group_dict)
        self.assertIsInstance(target_group_dict["_id"], ObjectId)
        self.assertEqual(target_group_dict["name"], None)
        self.assertEqual(target_group_dict["age_min"], "10")
        self.assertEqual(target_group_dict["age_max"], "20")
        self.assertEqual(target_group_dict["experience"], None)
        self.assertEqual(target_group_dict["academic_course"], None)
        self.assertEqual(target_group_dict["languages"], None)

    def test_from_dict(self):
        """
        expect: successful creation of a TargetGroup object derived from a dictionary
        """

        _id = ObjectId()
        target_group_dict = {
            "_id": _id,
            "name": "test",
            "age_min": 10,
            "age_max": 20,
            "experience": "test",
            "academic_course": "test",
            "languages": "test",
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
        self.assertEqual(target_group.languages, target_group_dict["languages"])

        _id = ObjectId()
        target_group_dict = {
            "_id": _id,
            "name": "test",
            "age_min": "10",
            "age_max": "20",
            "experience": "test",
            "academic_course": "test",
            "languages": "test",
        }

        target_group = TargetGroup.from_dict(target_group_dict.copy())

        self.assertIsInstance(target_group, TargetGroup)
        self.assertEqual(target_group._id, _id)
        self.assertEqual(target_group.name, target_group_dict["name"])
        self.assertEqual(target_group.age_min, 10)
        self.assertEqual(target_group.age_max, 20)
        self.assertEqual(target_group.experience, target_group_dict["experience"])
        self.assertEqual(
            target_group.academic_course, target_group_dict["academic_course"]
        )
        self.assertEqual(target_group.languages, target_group_dict["languages"])

        # test again without supplying a _id
        target_group_dict = {
            "name": "test",
            "age_min": 10,
            "age_max": 20,
            "experience": "test",
            "academic_course": "test",
            "languages": "test",
        }

        target_group = TargetGroup.from_dict(target_group_dict.copy())

        self.assertIsInstance(target_group, TargetGroup)
        self.assertIsInstance(target_group._id, ObjectId)
        self.assertEqual(target_group.name, target_group_dict["name"])
        self.assertEqual(target_group.age_min, target_group_dict["age_min"])
        self.assertEqual(target_group.age_max, target_group_dict["age_max"])
        self.assertEqual(target_group.experience, target_group_dict["experience"])
        self.assertEqual(
            target_group.academic_course, target_group_dict["academic_course"]
        )
        self.assertEqual(target_group.languages, target_group_dict["languages"])

    def test_from_dict_error_params_no_dict(self):
        """
        expect: creation of TargetGroup object from dict raises TypeError because source is
        not a dict
        """

        self.assertRaises(TypeError, TargetGroup.from_dict, "wrong_type")

    def test_from_dict_error_missing_key(self):
        """
        expect: creation of TargetGroup object from dict raises MissingKeyError because
        the dict is missing required keys
        """

        # languages is missing
        target_group_dict = {
            "_id": ObjectId(),
            "name": "test",
            "age_min": 10,
            "age_max": 20,
            "experience": "test",
            "academic_course": "test",
        }
        self.assertRaises(MissingKeyError, TargetGroup.from_dict, target_group_dict)

    def test_from_dict_error_wrong_types(self):
        """
        expect: creation of TargetGroup object from dict raises TypeError's because
        arguments have the wrong types
        """

        target_group_dict = {
            "_id": ObjectId(),
            "name": "test",
            "age_min": 10,
            "age_max": 20,
            "experience": "test",
            "academic_course": "test",
            "languages": "test",
        }

        # try out each attribute with a wrong type and expect ValueErrors
        target_group_dict["_id"] = 123
        self.assertRaises(TypeError, TargetGroup.from_dict, target_group_dict)
        target_group_dict["_id"] = ObjectId()

        target_group_dict["name"] = 123
        self.assertRaises(TypeError, TargetGroup.from_dict, target_group_dict)
        target_group_dict["name"] = "test"

        target_group_dict["age_min"] = list()
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

        target_group_dict["languages"] = 1
        self.assertRaises(TypeError, TargetGroup.from_dict, target_group_dict)
        target_group_dict["languages"] = "test"


class InstitutionModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_init_default(self):
        """
        expect: successful creation of a minimal Institution object
        """

        institution = Institution()
        self.assertIsInstance(institution._id, ObjectId)
        self.assertEqual(institution.name, None)
        self.assertEqual(institution.school_type, None)
        self.assertEqual(institution.country, None)
        self.assertEqual(institution.department, None)

    def test_init(self):
        """
        expect: successful creation of a Institution object, passing values for each attribute
        """

        _id = ObjectId()
        institution = Institution(
            _id=_id,
            name="test",
            school_type="test",
            country="de",
            department="test",
        )
        self.assertEqual(institution._id, _id)
        self.assertEqual(institution.name, "test")
        self.assertEqual(institution.school_type, "test")
        self.assertEqual(institution.country, "de")
        self.assertEqual(institution.department, "test")

    def test_to_dict(self):
        """
        expect: successful serialization of a minimal Institution object into
        its dictionary representation
        """

        _id = ObjectId()
        institution = Institution(
            _id=_id,
            name="test",
            school_type="test",
            country="de",
            department="test",
        ).to_dict()

        self.assertIn("_id", institution)
        self.assertIn("name", institution)
        self.assertIn("school_type", institution)
        self.assertIn("country", institution)
        self.assertIn("department", institution)
        self.assertEqual(institution["_id"], _id)
        self.assertEqual(institution["name"], "test")
        self.assertEqual(institution["school_type"], "test")
        self.assertEqual(institution["country"], "de")
        self.assertEqual(institution["department"], "test")

    def test_from_dict(self):
        """
        expect: successful creation of a Institution object derived from a dictionary
        """

        # without _ids
        params = {
            "name": "test",
            "school_type": "test",
            "country": "de",
            "department": "test",
        }

        institution = Institution.from_dict(params)

        self.assertIsInstance(institution._id, ObjectId)
        self.assertEqual(institution.name, "test")
        self.assertEqual(institution.school_type, "test")
        self.assertEqual(institution.country, "de")
        self.assertEqual(institution.department, "test")

        # with _ids
        _id = ObjectId()
        params = {
            "_id": _id,
            "name": "test",
            "school_type": "test",
            "country": "de",
            "department": "test",
        }

        institution = Institution.from_dict(params)
        self.assertEqual(institution._id, _id)
        self.assertEqual(institution.name, "test")
        self.assertEqual(institution.school_type, "test")
        self.assertEqual(institution.country, "de")
        self.assertEqual(institution.department, "test")

    def test_from_dict_error_params_not_dict(self):
        """
        expect: creation of Institution object from dict raises TypeError because source is
        not a dict
        """

        self.assertRaises(TypeError, Institution.from_dict, "wrong_type")

    def test_from_dict_error_missing_key(self):
        """
        expect: creation of Institution object from dict raises MissingKeyError because
        the dict is missing required keys
        """

        # school_type is missing
        params = {
            "name": "test",
            "country": "de",
            "department": "test",
        }

        self.assertRaises(MissingKeyError, Institution.from_dict, params)

    def test_from_dict_error_wrong_types(self):
        """
        expect: creation of Institution object from dict raises TypeError's because
        arguments have the wrong types
        """

        params = {
            "name": "test",
            "school_type": "test",
            "country": "de",
            "department": "test",
        }

        params["name"] = list()
        self.assertRaises(TypeError, Institution.from_dict, params)
        params["name"] = None

        params["school_type"] = 123
        self.assertRaises(TypeError, Institution.from_dict, params)
        params["school_type"] = None

        params["country"] = dict()
        self.assertRaises(TypeError, Institution.from_dict, params)
        params["country"] = None

        params["department"] = []
        self.assertRaises(TypeError, Institution.from_dict, params)
        params["department"] = "test"


class LectureModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_init_default(self):
        """
        expect: successful creation of a minimal Lecture object
        """

        lecture = Lecture()

        self.assertIsInstance(lecture._id, ObjectId)
        self.assertIsNone(lecture.lecture_type)
        self.assertIsNone(lecture.lecture_format)
        self.assertIsNone(lecture.participants_amount)

    def test_init(self):
        """
        expect: successful creation of a Lecture object, passing values for each attribute
        """

        _id = ObjectId()
        lecture = Lecture(
            _id=_id,
            name="test",
            lecture_type="test",
            lecture_format="test",
            participants_amount=10,
        )

        self.assertEqual(lecture._id, _id)
        self.assertEqual(lecture.lecture_type, "test")
        self.assertEqual(lecture.lecture_format, "test")
        self.assertEqual(lecture.participants_amount, 10)

        # try str as participants amount input and expect int outcome
        _id = ObjectId()
        lecture = Lecture(
            _id=_id,
            name="test",
            lecture_type="test",
            lecture_format="test",
            participants_amount="10",
        )

        self.assertEqual(lecture._id, _id)
        self.assertEqual(lecture.lecture_type, "test")
        self.assertEqual(lecture.lecture_format, "test")
        self.assertEqual(lecture.participants_amount, 10)

        # try an empty string and expect None
        _id = ObjectId()
        lecture = Lecture(
            _id=_id,
            name="test",
            lecture_type="test",
            lecture_format="test",
            participants_amount="",
        )

        self.assertEqual(lecture._id, _id)
        self.assertEqual(lecture.lecture_type, "test")
        self.assertEqual(lecture.lecture_format, "test")
        self.assertIsNone(lecture.participants_amount)

    def test_to_dict(self):
        """
        expect: successful serialization of a minimal Lecture object into
        its dictionary representation
        """

        _id = ObjectId()
        lecture = Lecture(
            _id=_id,
            name="test",
            lecture_type="test",
            lecture_format="test",
            participants_amount=10,
        ).to_dict()

        self.assertIn("_id", lecture)
        self.assertIn("name", lecture)
        self.assertIn("lecture_type", lecture)
        self.assertIn("lecture_format", lecture)
        self.assertIn("participants_amount", lecture)
        self.assertEqual(lecture["_id"], _id)
        self.assertEqual(lecture["name"], "test")
        self.assertEqual(lecture["lecture_type"], "test")
        self.assertEqual(lecture["lecture_format"], "test")
        self.assertEqual(lecture["participants_amount"], "10")

    def test_from_dict(self):
        """
        expect: successful creation of a Lecture object derived from a dictionary
        """

        # with _id
        params = {
            "_id": ObjectId(),
            "name": "test",
            "lecture_type": "test",
            "lecture_format": "test",
            "participants_amount": 10,
        }

        lecture = Lecture.from_dict(params)

        self.assertEqual(lecture._id, params["_id"])
        self.assertEqual(lecture.name, params["name"])
        self.assertEqual(lecture.lecture_type, params["lecture_type"])
        self.assertEqual(lecture.lecture_format, params["lecture_format"])
        self.assertEqual(lecture.participants_amount, params["participants_amount"])

        params = {
            "_id": ObjectId(),
            "name": "test",
            "lecture_type": "test",
            "lecture_format": "test",
            "participants_amount": "10",
        }

        lecture = Lecture.from_dict(params)

        self.assertEqual(lecture._id, params["_id"])
        self.assertEqual(lecture.name, params["name"])
        self.assertEqual(lecture.lecture_type, params["lecture_type"])
        self.assertEqual(lecture.lecture_format, params["lecture_format"])
        self.assertEqual(lecture.participants_amount, 10)

        # without _id
        params = {
            "name": "test",
            "lecture_type": "test",
            "lecture_format": "test",
            "participants_amount": 10,
        }

        lecture = Lecture.from_dict(params)

        self.assertIsInstance(lecture._id, ObjectId)
        self.assertEqual(lecture.name, params["name"])
        self.assertEqual(lecture.lecture_type, params["lecture_type"])
        self.assertEqual(lecture.lecture_format, params["lecture_format"])
        self.assertEqual(lecture.participants_amount, params["participants_amount"])

    def test_from_dict_error_params_not_dict(self):
        """
        expect: creation of Lecture object from dict raises TypeError because source is
        not a dict
        """

        self.assertRaises(TypeError, Lecture.from_dict, "wrong_type")

    def test_from_dict_error_missing_key(self):
        """
        expect: creation of Lecture object from dict raises MissingKeyError because
        the dict is missing required keys
        """

        # participants_amount is missing
        params = {
            "name": "test",
            "lecture_type": "test",
            "lecture_format": "test",
        }

        self.assertRaises(MissingKeyError, Lecture.from_dict, params)

    def test_from_dict_error_wrong_types(self):
        """
        expect: creation of Lecture object from dict raises TypeError's because
        arguments have the wrong types
        """

        params = {
            "name": "test",
            "lecture_type": "test",
            "lecture_format": "test",
            "participants_amount": 10,
        }

        params["name"] = list()
        self.assertRaises(TypeError, Lecture.from_dict, params)
        params["name"] = None

        params["lecture_type"] = 123
        self.assertRaises(TypeError, Lecture.from_dict, params)
        params["lecture_type"] = None

        params["lecture_format"] = list()
        self.assertRaises(TypeError, Lecture.from_dict, params)
        params["lecture_format"] = None

        params["participants_amount"] = list()
        self.assertRaises(TypeError, Lecture.from_dict, params)
        params["participants_amount"] = 10


class PhysicalMobilityModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_init_default(self):
        """
        expect: successful creation of a minimal PhysicalMobility object
        """

        physical_mobility = PhysicalMobility()
        self.assertIsInstance(physical_mobility._id, ObjectId)
        self.assertIsNone(physical_mobility.location)
        self.assertIsNone(physical_mobility.timestamp_from)
        self.assertIsNone(physical_mobility.timestamp_to)

    def test_init(self):
        """
        expect: successful creation of a PhysicalMobility object, passing values for each attribute
        """

        _id = ObjectId()
        physical_mobility = PhysicalMobility(
            _id=_id,
            location="test",
            timestamp_from=datetime(2023, 1, 1),
            timestamp_to=datetime(2023, 1, 8),
        )

        self.assertEqual(physical_mobility._id, _id)
        self.assertEqual(physical_mobility.location, "test")
        self.assertEqual(physical_mobility.timestamp_from, datetime(2023, 1, 1))
        self.assertEqual(physical_mobility.timestamp_to, datetime(2023, 1, 8))

    def test_to_dict(self):
        """
        expect: successful serialization of a minimal PhysicalMobility object into
        its dictionary representation
        """

        _id = ObjectId()
        physical_mobility = PhysicalMobility(
            _id=_id,
            location="test",
            timestamp_from=datetime(2023, 1, 1),
            timestamp_to=datetime(2023, 1, 8),
        ).to_dict()

        self.assertIn("_id", physical_mobility)
        self.assertIn("location", physical_mobility)
        self.assertIn("timestamp_from", physical_mobility)
        self.assertIn("timestamp_to", physical_mobility)
        self.assertEqual(physical_mobility["_id"], _id)
        self.assertEqual(physical_mobility["location"], "test")
        self.assertEqual(physical_mobility["timestamp_from"], datetime(2023, 1, 1))
        self.assertEqual(physical_mobility["timestamp_to"], datetime(2023, 1, 8))

    def test_from_dict(self):
        """
        expect: successful creation of a PhysicalMobility object derived from a dictionary
        """

        # with _id
        params = {
            "_id": ObjectId(),
            "location": "test",
            "timestamp_from": datetime(2023, 1, 1),
            "timestamp_to": datetime(2023, 1, 8),
        }

        physical_mobility = PhysicalMobility.from_dict(params)

        self.assertEqual(physical_mobility._id, params["_id"])
        self.assertEqual(physical_mobility.location, params["location"])
        self.assertEqual(physical_mobility.timestamp_from, params["timestamp_from"])
        self.assertEqual(physical_mobility.timestamp_to, params["timestamp_to"])

        # without _id
        params = {
            "location": "test",
            "timestamp_from": datetime(2023, 1, 1),
            "timestamp_to": datetime(2023, 1, 8),
        }

        physical_mobility = PhysicalMobility.from_dict(params)

        self.assertIsInstance(physical_mobility._id, ObjectId)
        self.assertEqual(physical_mobility.location, params["location"])
        self.assertEqual(physical_mobility.timestamp_from, params["timestamp_from"])
        self.assertEqual(physical_mobility.timestamp_to, params["timestamp_to"])

    def test_from_dict_error_params_not_dict(self):
        """
        expect: creation of PhysicalMobility object from dict raises TypeError because source is
        not a dict
        """

        self.assertRaises(TypeError, PhysicalMobility.from_dict, "wrong_type")

    def test_from_dict_error_missing_key(self):
        """
        expect: creation of PhysicalMobility object from dict raises MissingKeyError because
        the dict is missing required keys
        """

        # timestamp_from is missing
        params = {
            "location": "test",
            "timestamp_to": datetime(2023, 1, 8),
        }

        self.assertRaises(MissingKeyError, PhysicalMobility.from_dict, params)

    def test_from_dict_error_wrong_types(self):
        """
        expect: creation of PhysicalMobility object from dict raises TypeError's because
        arguments have the wrong types
        """

        params = {
            "location": "test",
            "timestamp_from": 1,
            "timestamp_to": datetime(2023, 1, 8),
        }

        self.assertRaises(TypeError, PhysicalMobility.from_dict, params)

        params = {
            "location": "test",
            "timestamp_from": datetime(2023, 1, 1),
            "timestamp_to": 1,
        }

        self.assertRaises(TypeError, PhysicalMobility.from_dict, params)


class EvaluationModelTest(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_init_default(self):
        """
        expect: successful creation of a minimal Evaluation object
        """

        evaluation = Evaluation()
        self.assertIsInstance(evaluation._id, ObjectId)
        self.assertIsNone(evaluation.username)
        self.assertFalse(evaluation.is_graded)
        self.assertIsNone(evaluation.task_type)
        self.assertIsNone(evaluation.assessment_type)
        self.assertIsNone(evaluation.evaluation_while)
        self.assertIsNone(evaluation.evaluation_after)

    def test_init(self):
        """
        expect: successful creation of a Evaluation object, passing values for each attribute
        """

        _id = ObjectId()
        evaluation = Evaluation(
            _id=_id,
            username="test",
            is_graded=True,
            task_type="test",
            assessment_type="test",
            evaluation_while="test",
            evaluation_after="test",
        )

        self.assertEqual(evaluation._id, _id)
        self.assertEqual(evaluation.username, "test")
        self.assertTrue(evaluation.is_graded)
        self.assertEqual(evaluation.task_type, "test")
        self.assertEqual(evaluation.assessment_type, "test")
        self.assertEqual(evaluation.evaluation_while, "test")
        self.assertEqual(evaluation.evaluation_after, "test")

    def test_to_dict(self):
        """
        expect: successful serialization of a minimal Evaluation object into
        its dictionary representation
        """

        _id = ObjectId()
        evaluation = Evaluation(
            _id=_id,
            username="test",
            is_graded=True,
            task_type="test",
            assessment_type="test",
            evaluation_while="test",
            evaluation_after="test",
        ).to_dict()

        self.assertIn("_id", evaluation)
        self.assertIn("username", evaluation)
        self.assertIn("is_graded", evaluation)
        self.assertIn("task_type", evaluation)
        self.assertIn("assessment_type", evaluation)
        self.assertIn("evaluation_while", evaluation)
        self.assertIn("evaluation_after", evaluation)
        self.assertEqual(evaluation["_id"], _id)
        self.assertEqual(evaluation["username"], "test")
        self.assertTrue(evaluation["is_graded"])
        self.assertEqual(evaluation["task_type"], "test")
        self.assertEqual(evaluation["assessment_type"], "test")
        self.assertEqual(evaluation["evaluation_while"], "test")
        self.assertEqual(evaluation["evaluation_after"], "test")

    def test_from_dict(self):
        """
        expect: successful creation of a Evaluation object derived from a dictionary
        """

        # with _id
        params = {
            "_id": ObjectId(),
            "username": "test",
            "is_graded": True,
            "task_type": "test",
            "assessment_type": "test",
            "evaluation_while": "test",
            "evaluation_after": "test",
        }

        evaluation = Evaluation.from_dict(params)

        self.assertEqual(evaluation._id, params["_id"])
        self.assertEqual(evaluation.username, params["username"])
        self.assertTrue(evaluation.is_graded)
        self.assertEqual(evaluation.task_type, params["task_type"])
        self.assertEqual(evaluation.assessment_type, params["assessment_type"])
        self.assertEqual(evaluation.evaluation_while, params["evaluation_while"])
        self.assertEqual(evaluation.evaluation_after, params["evaluation_after"])

        # without _id
        params = {
            "username": "test",
            "is_graded": True,
            "task_type": "test",
            "assessment_type": "test",
            "evaluation_while": "test",
            "evaluation_after": "test",
        }

        evaluation = Evaluation.from_dict(params)

        self.assertIsInstance(evaluation._id, ObjectId)
        self.assertEqual(evaluation.username, params["username"])
        self.assertTrue(evaluation.is_graded)
        self.assertEqual(evaluation.task_type, params["task_type"])
        self.assertEqual(evaluation.assessment_type, params["assessment_type"])
        self.assertEqual(evaluation.evaluation_while, params["evaluation_while"])
        self.assertEqual(evaluation.evaluation_after, params["evaluation_after"])

    def test_from_dict_error_params_not_dict(self):
        """
        expect: creation of Evaluation object from dict raises TypeError because source is
        not a dict
        """

        self.assertRaises(TypeError, Evaluation.from_dict, "wrong_type")

    def test_from_dict_error_missing_key(self):
        """
        expect: creation of Evaluation object from dict raises MissingKeyError because
        the dict is missing required keys
        """

        # evaluation_after is missing
        params = {
            "username": "test",
            "is_graded": True,
            "task_type": "test",
            "assessment_type": "test",
            "evaluation_while": "test",
        }

        self.assertRaises(MissingKeyError, Evaluation.from_dict, params)

    def test_from_dict_error_wrong_types(self):
        """
        expect: creation of Evaluation object from dict raises TypeError's because
        arguments have the wrong types
        """

        params = {
            "username": "test",
            "is_graded": True,
            "task_type": "test",
            "assessment_type": "test",
            "evaluation_while": "test",
            "evaluation_after": "test",
        }

        params["username"] = list()
        self.assertRaises(TypeError, Evaluation.from_dict, params)
        params["username"] = "test"

        params["is_graded"] = 123
        self.assertRaises(TypeError, Evaluation.from_dict, params)
        params["is_graded"] = True

        params["task_type"] = list()
        self.assertRaises(TypeError, Evaluation.from_dict, params)
        params["task_type"] = "test"

        params["assessment_type"] = list()
        self.assertRaises(TypeError, Evaluation.from_dict, params)
        params["assessment_type"] = "test"

        params["evaluation_while"] = list()
        self.assertRaises(TypeError, Evaluation.from_dict, params)
        params["evaluation_while"] = "test"

        params["evaluation_after"] = list()
        self.assertRaises(TypeError, Evaluation.from_dict, params)
        params["evaluation_after"] = "test"


class VEPlanModelTest(TestCase):
    def setUp(self) -> None:
        self.default_progress = {
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
            "new_content": "not_started",
            "checklist": "not_started",
            "steps": [],
        }
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

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
            languages="test",
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
        convenience method to create a PhysicalMobility object with non-default values
        """

        return PhysicalMobility(
            location=location,
            timestamp_from=datetime(2023, 1, 1),
            timestamp_to=datetime(2023, 1, 8),
        )

    def create_evaluation(self, username: str = "test_admin") -> Evaluation:
        """
        convenience method to create a Evaluation object with non-default values
        """

        return Evaluation(
            username=username,
            is_graded=True,
            task_type="test",
            assessment_type="test",
            evaluation_while="test",
            evaluation_after="test",
        )

    def create_individual_learning_goal(
        self, username: str = "test_admin"
    ) -> IndividualLearningGoal:
        """
        convenience method to create a IndividualLearningGoal object with non-default values
        """

        return IndividualLearningGoal(
            username=username,
            learning_goal="test",
        )

    def test_init_default(self):
        """
        expect: successful creation of a minimal VEPlan object (default values)
        """

        plan = VEPlan()
        self.assertIsInstance(plan._id, ObjectId)
        self.assertIsNone(plan.author)
        self.assertEqual(plan.read_access, [])
        self.assertEqual(plan.write_access, [])
        self.assertIsNone(plan.name)
        self.assertEqual(plan.partners, [])
        self.assertEqual(plan.institutions, [])
        self.assertEqual(plan.topics, [])
        self.assertEqual(plan.lectures, [])
        self.assertEqual(plan.major_learning_goals, [])
        self.assertEqual(plan.individual_learning_goals, [])
        self.assertEqual(plan.methodical_approaches, [])
        self.assertEqual(plan.target_groups, [])
        self.assertEqual(plan.languages, [])
        self.assertEqual(plan.evaluation, [])
        self.assertEqual(plan.involved_parties, [])
        self.assertIsNone(plan.realization)
        self.assertIsNone(plan.physical_mobility)
        self.assertEqual(plan.physical_mobilities, [])
        self.assertIsNone(plan.learning_env)
        self.assertEqual(plan.new_content, None)
        self.assertEqual(plan.checklist, [])
        self.assertEqual(plan.steps, [])
        self.assertEqual(plan.is_good_practise, False)
        self.assertIsNone(plan.abstract)
        self.assertIsNone(plan.underlying_ve_model)
        self.assertIsNone(plan.reflection)
        self.assertIsNone(plan.good_practise_evaluation)
        self.assertIsNone(plan.literature)
        self.assertIsNone(plan.evaluation_file)
        self.assertEqual(plan.literature_files, [])
        self.assertEqual(plan.progress, self.default_progress)
        self.assertEqual(plan.duration, None)
        self.assertEqual(plan.workload, 0)
        self.assertIsNone(plan.timestamp_from)
        self.assertIsNone(plan.timestamp_to)

    def test_init(self):
        """
        expect: successful creation of a VEPlan object, both passing an _id and letting
        it creat one itself
        """

        # pass an _id to init
        _id = ObjectId()
        steps = [
            self.create_step(
                "test1",
                timestamp_from=datetime(2023, 1, 1),
                timestamp_to=datetime(2023, 1, 8),
            ),
            self.create_step(
                "test2",
                timestamp_from=datetime(2023, 1, 9),
                timestamp_to=datetime(2023, 1, 16),
            ),
        ]
        target_groups = [
            self.create_target_group("test1"),
            self.create_target_group("test2"),
        ]
        institutions = [
            self.create_institution("test1"),
            self.create_institution("test2"),
        ]
        lectures = [self.create_lecture("test1"), self.create_lecture("test2")]
        physical_mobilities = [
            self.create_physical_mobility(),
            self.create_physical_mobility(),
        ]
        evaluation = [self.create_evaluation(), self.create_evaluation()]
        evaluation_file = {
            "file_id": ObjectId(),
            "file_name": "test",
        }
        literature_files = [
            {
                "file_id": ObjectId(),
                "file_name": "test",
            },
            {
                "file_id": ObjectId(),
                "file_name": "test2",
            },
        ]
        individual_learning_goals = [
            self.create_individual_learning_goal(),
            self.create_individual_learning_goal(),
        ]

        plan = VEPlan(
            _id=_id,
            author="test",
            read_access=["test"],
            write_access=["test"],
            name="test",
            partners=["test2"],
            institutions=institutions,
            topics=["test"],
            lectures=lectures,
            major_learning_goals=["test", "test"],
            individual_learning_goals=individual_learning_goals,
            methodical_approaches=["test"],
            target_groups=target_groups,
            languages=["test", "test"],
            evaluation=evaluation,
            involved_parties=["test", "test"],
            realization="test",
            physical_mobility=True,
            physical_mobilities=physical_mobilities,
            learning_env="test",
            new_content=True,
            checklist=[
                {"username": "test", "technology": True, "exam_regulations": False}
            ],
            steps=steps,
            is_good_practise=True,
            abstract="test",
            underlying_ve_model="test",
            reflection="test",
            good_practise_evaluation="test",
            literature="test",
            evaluation_file=evaluation_file,
            literature_files=literature_files,
            progress={
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
                "new_content": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        )

        self.assertEqual(plan._id, _id)
        self.assertEqual(plan.author, "test")
        self.assertEqual(plan.read_access, ["test"])
        self.assertEqual(plan.write_access, ["test"])
        self.assertEqual(plan.name, "test")
        self.assertEqual(plan.partners, ["test2"])
        self.assertEqual(plan.institutions, institutions)
        self.assertEqual(plan.topics, ["test"])
        self.assertEqual(plan.lectures, lectures)
        self.assertEqual(plan.major_learning_goals, ["test", "test"])
        self.assertEqual(plan.individual_learning_goals, individual_learning_goals)
        self.assertEqual(plan.methodical_approaches, ["test"])
        self.assertEqual(plan.target_groups, target_groups)
        self.assertEqual(plan.languages, ["test", "test"])
        self.assertEqual(plan.evaluation, evaluation)
        self.assertEqual(plan.involved_parties, ["test", "test"])
        self.assertEqual(plan.realization, "test")
        self.assertEqual(plan.physical_mobility, True)
        self.assertEqual(plan.physical_mobilities, physical_mobilities)
        self.assertEqual(plan.learning_env, "test")
        self.assertEqual(plan.new_content, True)
        self.assertEqual(
            plan.checklist,
            [{"username": "test", "technology": True, "exam_regulations": False}],
        )
        self.assertEqual(plan.steps, steps)
        self.assertEqual(plan.is_good_practise, True)
        self.assertEqual(plan.abstract, "test")
        self.assertEqual(plan.underlying_ve_model, "test")
        self.assertEqual(plan.reflection, "test")
        self.assertEqual(plan.good_practise_evaluation, "test")
        self.assertEqual(plan.literature, "test")
        self.assertEqual(plan.evaluation_file, evaluation_file)
        self.assertEqual(plan.literature_files, literature_files)
        self.assertEqual(plan.progress["name"], "completed")
        self.assertEqual(plan.workload, 20)
        self.assertEqual(plan.timestamp_from, datetime(2023, 1, 1))
        self.assertEqual(plan.timestamp_to, datetime(2023, 1, 16))
        self.assertEqual(plan.duration, datetime(2023, 1, 16) - datetime(2023, 1, 1))

        # again, this time without passing _ids and
        # without a "to" timestamp, expecting duration to become None
        steps = [
            self.create_step(
                "test1", timestamp_from=datetime(2023, 1, 1), timestamp_to=None
            )
        ]
        plan = VEPlan(
            name="test",
            author="test",
            partners=["test2"],
            institutions=institutions,
            topics=["test"],
            lectures=lectures,
            major_learning_goals=["test", "test"],
            individual_learning_goals=individual_learning_goals,
            methodical_approaches=["test"],
            target_groups=target_groups,
            languages=["test", "test"],
            evaluation=evaluation,
            involved_parties=["test", "test"],
            realization="test",
            physical_mobility=True,
            physical_mobilities=physical_mobilities,
            learning_env="test",
            new_content=True,
            checklist=[],
            steps=steps,
            is_good_practise=True,
            abstract="test",
            underlying_ve_model="test",
            reflection="test",
            good_practise_evaluation="test",
            literature="test",
            evaluation_file=evaluation_file,
            literature_files=literature_files,
            progress={
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
                "new_content": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        )
        self.assertIsInstance(plan._id, ObjectId)
        self.assertEqual(plan.name, "test")
        self.assertEqual(plan.partners, ["test2"])
        self.assertEqual(plan.institutions, institutions)
        self.assertEqual(plan.topics, ["test"])
        self.assertEqual(plan.lectures, lectures)
        self.assertEqual(plan.major_learning_goals, ["test", "test"])
        self.assertEqual(plan.individual_learning_goals, individual_learning_goals)
        self.assertEqual(plan.methodical_approaches, ["test"])
        self.assertEqual(plan.target_groups, target_groups)
        self.assertEqual(plan.languages, ["test", "test"])
        self.assertEqual(plan.evaluation, evaluation)
        self.assertEqual(plan.involved_parties, ["test", "test"])
        self.assertEqual(plan.realization, "test")
        self.assertEqual(plan.physical_mobility, True)
        self.assertEqual(plan.physical_mobilities, physical_mobilities)
        self.assertEqual(plan.learning_env, "test")
        self.assertEqual(plan.new_content, True)
        self.assertEqual(plan.checklist, [])
        self.assertEqual(plan.steps, steps)
        self.assertIsInstance(plan.steps[0]._id, ObjectId)
        self.assertEqual(plan.is_good_practise, True)
        self.assertEqual(plan.abstract, "test")
        self.assertEqual(plan.underlying_ve_model, "test")
        self.assertEqual(plan.reflection, "test")
        self.assertEqual(plan.good_practise_evaluation, "test")
        self.assertEqual(plan.literature, "test")
        self.assertEqual(plan.evaluation_file, evaluation_file)
        self.assertEqual(plan.literature_files, literature_files)
        self.assertEqual(plan.progress["name"], "completed")
        self.assertEqual(plan.workload, 10)
        self.assertEqual(plan.timestamp_from, datetime(2023, 1, 1))
        self.assertEqual(plan.timestamp_to, None)
        self.assertEqual(plan.duration, None)

    def test_init_checklist_type_safety(self):
        """
        check that, if specified, checklist are type-safe
        """

        # username is missing
        self.assertRaises(MissingKeyError, VEPlan, checklist=[{"technology": True}])

        # ValueError because user is not a partner or author of the plan
        self.assertRaises(
            ValueError,
            VEPlan,
            author="test",
            checklist=[
                {"username": "not_test", "technology": False, "exam_regulations": True}
            ],
        )

        # TypeError because technology is not a bool
        self.assertRaises(
            TypeError,
            VEPlan,
            author="test",
            checklist=[
                {"username": "test", "technology": None, "exam_regulations": 123}
            ],
        )

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

        step = self.create_step(
            "test",
            timestamp_from=None,
            timestamp_to=None,
        )
        institution = self.create_institution()
        lecture = self.create_lecture()
        physical_mobility = self.create_physical_mobility()
        expected_progress = self.default_progress
        expected_progress["steps"] = [{"step_id": step._id, "progress": "not_started"}]
        individual_learning_goal = self.create_individual_learning_goal()
        plan_dict = VEPlan(
            steps=[step],
            institutions=[institution],
            lectures=[lecture],
            individual_learning_goals=[individual_learning_goal],
            physical_mobility=True,
            physical_mobilities=[physical_mobility],
        ).to_dict()

        self.assertIn("_id", plan_dict)
        self.assertIn("author", plan_dict)
        self.assertIn("read_access", plan_dict)
        self.assertIn("write_access", plan_dict),
        self.assertIn("name", plan_dict)
        self.assertIn("partners", plan_dict)
        self.assertIn("institutions", plan_dict)
        self.assertIn("topics", plan_dict)
        self.assertIn("lectures", plan_dict)
        self.assertIn("major_learning_goals", plan_dict)
        self.assertIn("individual_learning_goals", plan_dict)
        self.assertIn("methodical_approaches", plan_dict)
        self.assertIn("target_groups", plan_dict)
        self.assertIn("languages", plan_dict)
        self.assertIn("evaluation", plan_dict)
        self.assertIn("timestamp_from", plan_dict)
        self.assertIn("timestamp_to", plan_dict)
        self.assertIn("involved_parties", plan_dict)
        self.assertIn("realization", plan_dict)
        self.assertIn("physical_mobility", plan_dict)
        self.assertIn("physical_mobilities", plan_dict)
        self.assertIn("learning_env", plan_dict)
        self.assertIn("new_content", plan_dict)
        self.assertIn("checklist", plan_dict)
        self.assertIn("duration", plan_dict)
        self.assertIn("workload", plan_dict)
        self.assertIn("steps", plan_dict)
        self.assertIn("is_good_practise", plan_dict)
        self.assertIn("abstract", plan_dict)
        self.assertIn("underlying_ve_model", plan_dict)
        self.assertIn("reflection", plan_dict)
        self.assertIn("good_practise_evaluation", plan_dict)
        self.assertIn("literature", plan_dict)
        self.assertIn("evaluation_file", plan_dict)
        self.assertIn("literature_files", plan_dict)
        self.assertIn("progress", plan_dict)
        self.assertIsInstance(plan_dict["_id"], ObjectId)
        self.assertIsNone(plan_dict["author"])
        self.assertEqual(plan_dict["read_access"], [])
        self.assertEqual(plan_dict["write_access"], [])
        self.assertIsNone(plan_dict["name"])
        self.assertEqual(plan_dict["partners"], [])
        self.assertEqual(plan_dict["institutions"], [institution.to_dict()])
        self.assertEqual(plan_dict["topics"], [])
        self.assertEqual(plan_dict["lectures"], [lecture.to_dict()])
        self.assertEqual(plan_dict["major_learning_goals"], [])
        self.assertEqual(
            plan_dict["individual_learning_goals"], [individual_learning_goal.to_dict()]
        )
        self.assertEqual(plan_dict["methodical_approaches"], [])
        self.assertEqual(plan_dict["target_groups"], [])
        self.assertEqual(plan_dict["languages"], [])
        self.assertEqual(plan_dict["evaluation"], [])
        self.assertEqual(plan_dict["involved_parties"], [])
        self.assertIsNone(plan_dict["realization"])
        self.assertEqual(plan_dict["physical_mobility"], True)
        self.assertEqual(
            plan_dict["physical_mobilities"], [physical_mobility.to_dict()]
        )
        self.assertIsNone(plan_dict["learning_env"])
        self.assertIsNone(plan_dict["new_content"])
        self.assertEqual(plan_dict["checklist"], [])
        self.assertEqual(plan_dict["workload"], 10)
        self.assertEqual(plan_dict["duration"], None)
        self.assertEqual(plan_dict["steps"], [step.to_dict()])
        self.assertEqual(plan_dict["is_good_practise"], False)
        self.assertIsNone(plan_dict["abstract"])
        self.assertIsNone(plan_dict["underlying_ve_model"])
        self.assertIsNone(plan_dict["reflection"])
        self.assertIsNone(plan_dict["good_practise_evaluation"])
        self.assertIsNone(plan_dict["literature"])
        self.assertIsNone(plan_dict["evaluation_file"])
        self.assertEqual(plan_dict["literature_files"], [])
        self.assertEqual(plan_dict["progress"], expected_progress)

    def test_from_dict(self):
        """
        expect: successful creation of a VEPlan object from a dict, both by
        supplying an _id and letting it create one itself
        """

        # first, try a manually set _id
        _id = ObjectId()
        step = self.create_step("test")
        target_group = self.create_target_group("test")
        institution = self.create_institution("test")
        lecture = self.create_lecture("test")
        physical_mobility = self.create_physical_mobility("test")
        evaluation = self.create_evaluation("test")
        evaluation_file = {
            "file_id": ObjectId(),
            "file_name": "test",
        }
        literature_files = [
            {
                "file_id": ObjectId(),
                "file_name": "test",
            },
            {
                "file_id": ObjectId(),
                "file_name": "test2",
            },
        ]
        individual_learning_goal = self.create_individual_learning_goal("test")
        plan_dict = {
            "_id": _id,
            "name": None,
            "partners": ["test"],
            "institutions": [
                {
                    "_id": institution._id,
                    "name": institution.name,
                    "school_type": institution.school_type,
                    "country": institution.country,
                    "department": institution.department,
                }
            ],
            "topics": [],
            "lectures": [
                {
                    "_id": lecture._id,
                    "name": lecture.name,
                    "lecture_format": lecture.lecture_format,
                    "lecture_type": lecture.lecture_type,
                    "participants_amount": lecture.participants_amount,
                }
            ],
            "major_learning_goals": ["test", "test"],
            "individual_learning_goals": [
                {
                    "_id": individual_learning_goal._id,
                    "username": individual_learning_goal.username,
                    "learning_goal": individual_learning_goal.learning_goal,
                }
            ],
            "methodical_approaches": ["test"],
            "target_groups": [
                {
                    "_id": target_group._id,
                    "name": target_group.name,
                    "age_min": target_group.age_min,
                    "age_max": target_group.age_max,
                    "experience": target_group.experience,
                    "academic_course": target_group.academic_course,
                    "languages": target_group.languages,
                }
            ],
            "languages": [],
            "evaluation": [
                {
                    "_id": evaluation._id,
                    "username": evaluation.username,
                    "is_graded": evaluation.is_graded,
                    "task_type": evaluation.task_type,
                    "assessment_type": evaluation.assessment_type,
                    "evaluation_while": evaluation.evaluation_while,
                    "evaluation_after": evaluation.evaluation_after,
                }
            ],
            "involved_parties": [],
            "realization": None,
            "physical_mobility": True,
            "physical_mobilities": [
                {
                    "_id": physical_mobility._id,
                    "location": physical_mobility.location,
                    "timestamp_from": physical_mobility.timestamp_from,
                    "timestamp_to": physical_mobility.timestamp_to,
                }
            ],
            "learning_env": None,
            "new_content": False,
            "checklist": [
                {
                    "username": "test",
                    "technology": None,
                    "exam_regulations": None,
                }
            ],
            "steps": [
                {
                    "_id": step._id,
                    "name": step.name,
                    "workload": step.workload,
                    "timestamp_from": step.timestamp_from,
                    "timestamp_to": step.timestamp_to,
                    "learning_goal": step.learning_goal,
                    "learning_activity": step.learning_activity,
                    "has_tasks": True,
                    "tasks": [task.to_dict() for task in step.tasks],
                    "evaluation_tools": step.evaluation_tools,
                    "attachments": step.attachments,
                    "custom_attributes": step.custom_attributes,
                }
            ],
            "is_good_practise": True,
            "abstract": "test",
            "underlying_ve_model": "test",
            "reflection": "test",
            "good_practise_evaluation": "test",
            "literature": "test",
            "evaluation_file": evaluation_file,
            "literature_files": literature_files,
            "progress": {
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
                "new_content": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        }

        plan = VEPlan.from_dict(plan_dict)

        self.assertIsNone(plan.name)
        self.assertEqual(plan.partners, ["test"])
        self.assertIsNone(plan.author)
        self.assertEqual(plan.read_access, [])
        self.assertEqual(plan.write_access, [])
        self.assertEqual(plan.institutions, [institution])
        self.assertEqual(plan.topics, [])
        self.assertEqual(plan.lectures, [lecture])
        self.assertEqual(plan.major_learning_goals, ["test", "test"])
        self.assertEqual(plan.individual_learning_goals, [individual_learning_goal])
        self.assertEqual(plan.methodical_approaches, ["test"])
        self.assertEqual(plan.target_groups, [target_group])
        self.assertEqual(plan.languages, [])
        self.assertEqual(plan.evaluation, [evaluation])
        self.assertEqual(plan.involved_parties, [])
        self.assertIsNone(plan.realization)
        self.assertEqual(plan.physical_mobility, True)
        self.assertEqual(plan.physical_mobilities, [physical_mobility])
        self.assertIsNone(plan.learning_env)
        self.assertEqual(plan.new_content, False)
        self.assertEqual(
            plan.checklist,
            [{"username": "test", "technology": None, "exam_regulations": None}],
        )
        self.assertEqual(plan._id, _id)
        self.assertEqual(plan.steps, [step])
        self.assertEqual(plan.is_good_practise, True)
        self.assertEqual(plan.abstract, "test")
        self.assertEqual(plan.underlying_ve_model, "test")
        self.assertEqual(plan.reflection, "test")
        self.assertEqual(plan.good_practise_evaluation, "test")
        self.assertEqual(plan.literature, "test")
        self.assertEqual(plan.evaluation_file, evaluation_file)
        self.assertEqual(plan.literature_files, literature_files)
        self.assertEqual(plan.progress["name"], "completed")
        self.assertEqual(plan.duration, step.duration)
        self.assertEqual(plan.timestamp_from, step.timestamp_from)
        self.assertEqual(plan.timestamp_to, step.timestamp_to)
        self.assertEqual(plan.workload, 10)

        # again, but this time don't set an _id ourselves
        plan_dict = {
            "author": "test",
            "read_access": ["test"],
            "name": None,
            "partners": ["test"],
            "institutions": [
                {
                    "name": institution.name,
                    "school_type": institution.school_type,
                    "country": institution.country,
                    "department": institution.department,
                }
            ],
            "topics": [],
            "lectures": [
                {
                    "name": lecture.name,
                    "lecture_format": lecture.lecture_format,
                    "lecture_type": lecture.lecture_type,
                    "participants_amount": lecture.participants_amount,
                }
            ],
            "major_learning_goals": ["test", "test"],
            "individual_learning_goals": [
                {
                    "username": individual_learning_goal.username,
                    "learning_goal": individual_learning_goal.learning_goal,
                }
            ],
            "methodical_approaches": ["test"],
            "target_groups": [
                {
                    "name": target_group.name,
                    "age_min": target_group.age_min,
                    "age_max": target_group.age_max,
                    "experience": target_group.experience,
                    "academic_course": target_group.academic_course,
                    "languages": target_group.languages,
                }
            ],
            "languages": [],
            "evaluation": [
                {
                    "username": evaluation.username,
                    "is_graded": evaluation.is_graded,
                    "task_type": evaluation.task_type,
                    "assessment_type": evaluation.assessment_type,
                    "evaluation_while": evaluation.evaluation_while,
                    "evaluation_after": evaluation.evaluation_after,
                }
            ],
            "involved_parties": [],
            "realization": None,
            "physical_mobility": True,
            "physical_mobilities": [
                {
                    "location": physical_mobility.location,
                    "timestamp_from": physical_mobility.timestamp_from,
                    "timestamp_to": physical_mobility.timestamp_to,
                }
            ],
            "learning_env": None,
            "new_content": False,
            "checklist": [
                {
                    "username": "test",
                    "technology": None,
                    "exam_regulations": None,
                }
            ],
            "steps": [
                {
                    "name": step.name,
                    "workload": step.workload,
                    "timestamp_from": step.timestamp_from,
                    "timestamp_to": step.timestamp_to,
                    "learning_goal": step.learning_goal,
                    "learning_activity": step.learning_activity,
                    "has_tasks": True,
                    "tasks": [task.to_dict() for task in step.tasks],
                    "evaluation_tools": step.evaluation_tools,
                    "attachments": step.attachments,
                    "custom_attributes": step.custom_attributes,
                }
            ],
            "is_good_practise": True,
            "abstract": "test",
            "underlying_ve_model": "test",
            "reflection": "test",
            "good_practise_evaluation": "test",
            "literature": "test",
            "evaluation_file": None,
            "literature_files": [],
            "progress": {
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
                "new_content": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        }

        plan = VEPlan.from_dict(plan_dict)

        self.assertEqual(plan.author, "test")
        self.assertEqual(plan.read_access, ["test"])
        self.assertEqual(plan.write_access, [])
        self.assertIsNone(plan.name)
        self.assertEqual(plan.partners, ["test"])
        self.assertEqual(len(plan.institutions), 1)
        self.assertIsInstance(plan.institutions[0], Institution)
        self.assertEqual(plan.topics, [])
        self.assertEqual(len(plan.lectures), 1)
        self.assertIsInstance(plan.lectures[0], Lecture)
        self.assertEqual(plan.major_learning_goals, ["test", "test"])
        self.assertEqual(len(plan.individual_learning_goals), 1)
        self.assertIsInstance(plan.individual_learning_goals[0], IndividualLearningGoal)
        self.assertEqual(plan.methodical_approaches, ["test"])
        self.assertEqual(plan.languages, [])
        self.assertEqual(len(plan.evaluation), 1)
        self.assertIsInstance(plan.evaluation[0], Evaluation)
        self.assertEqual(plan.involved_parties, [])
        self.assertIsNone(plan.realization)
        self.assertEqual(plan.physical_mobility, True)
        self.assertEqual(len(plan.physical_mobilities), 1)
        self.assertIsInstance(plan.physical_mobilities[0], PhysicalMobility)
        self.assertIsNone(plan.learning_env)
        self.assertEqual(plan.new_content, False)
        self.assertEqual(
            plan.checklist,
            [{"username": "test", "technology": None, "exam_regulations": None}],
        )
        self.assertEqual(plan.duration, step.duration)
        self.assertEqual(plan.timestamp_from, step.timestamp_from)
        self.assertEqual(plan.timestamp_to, step.timestamp_to)
        self.assertEqual(plan.workload, 10)
        self.assertEqual(plan.progress["name"], "completed")
        self.assertEqual(plan.is_good_practise, True)
        self.assertEqual(plan.abstract, "test")
        self.assertEqual(plan.underlying_ve_model, "test")
        self.assertEqual(plan.reflection, "test")
        self.assertEqual(plan.good_practise_evaluation, "test")
        self.assertEqual(plan.literature, "test")
        self.assertIsNone(plan.evaluation_file)
        self.assertEqual(plan.literature_files, [])
        self.assertIsInstance(plan._id, ObjectId)
        self.assertIsInstance(plan.steps[0]._id, ObjectId)
        self.assertIsInstance(plan.target_groups[0]._id, ObjectId)
        self.assertIsInstance(plan.lectures[0]._id, ObjectId)
        self.assertIsInstance(plan.institutions[0]._id, ObjectId)
        self.assertIsInstance(plan.evaluation[0]._id, ObjectId)

    def test_from_dict_error_params_not_dict(self):
        """
        expect: creation of a VEPlan from a dict raises TypeError because source
        is not a dict
        """

        self.assertRaises(TypeError, VEPlan.from_dict, "wrong_type")

    def test_from_dict_error_missing_key(self):
        """
        expect: creation of a VEPlan from a dict raises MissingKeyError because the
        dict is missing a required key
        """

        # steps is missing
        plan_dict = {
            "_id": ObjectId(),
            "name": None,
            "partners": ["test"],
            "institutions": [],
            "topics": [],
            "lectures": [],
            "major_learning_goals": [],
            "individual_learning_goals": [],
            "methodical_approaches": [],
            "target_groups": [],
            "languages": [],
            "evaluation": [],
            "involved_parties": [],
            "realization": None,
            "physical_mobility": None,
            "physical_mobilities": [],
            "learning_env": None,
            "new_content": None,
            "checklist": [
                {
                    "username": "test",
                    "technology": None,
                    "exam_regulations": None,
                }
            ],
            "is_good_practise": None,
            "abstract": None,
            "underlying_ve_model": None,
            "reflection": None,
            "good_practise_evaluation": None,
            "literature": None,
            "evaluation_file": None,
            "literature_files": [],
            "progress": {
                "name": "not_started",
                "institutions": "not_started",
                "topic": "not_started",
                "lectures": "not_started",
                "learning_goals": "not_started",
                "methodical_approaches": "not_started",
                "target_groups": "not_started",
                "languages": "not_started",
                "evaluation": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "new_content": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        }
        self.assertRaises(MissingKeyError, VEPlan.from_dict, plan_dict)

    def test_from_dict_error_wrong_types(self):
        """
        expect: creation of a VEPlan from a dict raises TypeErrors and InvalidId
        because values have the wrong types
        """

        plan_dict = {
            "_id": ObjectId(),
            "name": None,
            "partners": ["test"],
            "institutions": [],
            "topics": [],
            "lectures": [],
            "major_learning_goals": [],
            "individual_learning_goals": [],
            "methodical_approaches": [],
            "target_groups": [],
            "languages": [],
            "evaluation": [],
            "involved_parties": [],
            "realization": None,
            "physical_mobility": None,
            "physical_mobilities": [],
            "learning_env": None,
            "new_content": False,
            "checklist": [
                {
                    "username": "test",
                    "technology": None,
                    "exam_regulations": None,
                }
            ],
            "steps": [],
            "is_good_practise": None,
            "abstract": None,
            "underlying_ve_model": None,
            "reflection": None,
            "good_practise_evaluation": None,
            "literature": None,
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
                "new_content": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        }

        # try wrong types for all fields
        plan_dict["_id"] = "123"
        self.assertRaises(InvalidId, VEPlan.from_dict, plan_dict)
        plan_dict["_id"] = ObjectId()

        plan_dict["name"] = 1
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["name"] = None

        plan_dict["partners"] = 1
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["partners"] = []

        plan_dict["institutions"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["institutions"] = list()

        plan_dict["topics"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["topics"] = []

        plan_dict["lectures"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["lectures"] = list()

        plan_dict["major_learning_goals"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["major_learning_goals"] = list()

        plan_dict["individual_learning_goals"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["individual_learning_goals"] = list()

        plan_dict["methodical_approaches"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["methodical_approaches"] = []

        plan_dict["target_groups"] = dict()
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["target_groups"] = list()

        plan_dict["languages"] = "test"
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["languages"] = list()

        plan_dict["evaluation"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["evaluation"] = list()

        plan_dict["involved_parties"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["involved_parties"] = list()

        plan_dict["realization"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["realization"] = None

        plan_dict["physical_mobility"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["physical_mobility"] = None

        plan_dict["physical_mobilities"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["physical_mobilities"] = list()

        plan_dict["learning_env"] = list()
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["learning_env"] = None

        plan_dict["new_content"] = list()
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["new_content"] = True

        plan_dict["checklist"] = "test"
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["checklist"] = dict()

        plan_dict["steps"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["steps"] = list()

        plan_dict["is_good_practise"] = "test"
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["is_good_practise"] = None

        plan_dict["abstract"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["abstract"] = None

        plan_dict["underlying_ve_model"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["underlying_ve_model"] = None

        plan_dict["reflection"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["reflection"] = None

        plan_dict["good_practise_evaluation"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["good_practise_evaluation"] = None

        plan_dict["literature"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["literature"] = None

        plan_dict["evaluation_file"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["evaluation_file"] = ObjectId()

        plan_dict["literature_files"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["literature_files"] = list()

        plan_dict["progress"] = 123
        self.assertRaises(TypeError, VEPlan.from_dict, plan_dict)
        plan_dict["progress"] = {}

    def test_from_dict_error_non_unique_steps(self):
        """
        expect: creation of a VEPlan object from a dict raises NonUniqueStepsError
        because steps contain duplicate names
        """

        plan_dict = {
            "_id": ObjectId(),
            "name": None,
            "partners": ["test"],
            "institutions": [],
            "topics": [],
            "lectures": [],
            "major_learning_goals": [],
            "individual_learning_goals": [],
            "methodical_approaches": [],
            "target_groups": [],
            "languages": [],
            "evaluation": [],
            "involved_parties": [],
            "realization": None,
            "physical_mobility": None,
            "physical_mobilities": [],
            "learning_env": None,
            "new_content": None,
            "checklist": [
                {
                    "username": "test",
                    "technology": None,
                    "exam_regulations": None,
                }
            ],
            "steps": [
                self.create_step("test").to_dict(),
                self.create_step("test").to_dict(),
            ],
            "is_good_practise": None,
            "abstract": None,
            "underlying_ve_model": None,
            "reflection": None,
            "good_practise_evaluation": None,
            "literature": None,
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
                "new_content": "not_started",
                "checklist": "not_started",
                "steps": "not_started",
            },
        }
        self.assertRaises(NonUniqueStepsError, VEPlan.from_dict, plan_dict)
