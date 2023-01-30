from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Dict, List

from bson import ObjectId
import dateutil.parser

from exceptions import (
    NonUniqueStepsError,
    NonUniqueTasksError,
    PlanKeyError,
    StepKeyError,
    TaskKeyError,
)
import util


class User:
    def __init__(self, username: str, user_id: str, email: str):
        # ensure types
        if not isinstance(username, str):
            raise TypeError(
                "expected type '{}' for attribute 'username', got '{}'".format(
                    str, type(username)
                )
            )
        if not isinstance(user_id, str):
            raise TypeError(
                "expected type '{}' for attribute 'user_id', got '{}'".format(
                    str, type(user_id)
                )
            )
        if not isinstance(email, str):
            raise TypeError(
                "expected type '{}' for attribute 'email', got '{}'".format(
                    str, type(email)
                )
            )

        self.username = username
        self.user_id = user_id
        self.email = email

    def to_dict(self) -> dict:
        return {"username": self.username, "user_id": self.user_id, "email": self.email}


class Task:
    """
    model class for a Task within a Step of a VE-Plan
    """

    # when initializing a task from a dict using 'Task.from_dict()',
    # this lookup allows to check for the correct types
    EXPECTED_DICT_ENTRIES = {
        "_id": (str, ObjectId, type(None)),
        "title": (str, type(None)),
        "description": (str, type(None)),
        "learning_goal": (str, type(None)),
        "tools": list,
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        title: str = None,
        description: str = None,
        learning_goal: str = None,
        tools: List[str] = [],
    ) -> None:
        """
        Initialization of a `Task` instance.

        Sets all of the function parameters as equivalent instance attributes.

        Usually a `Task` is of no standalone use, but rather a part of a `Step`-object,
        which in turn is part of a `VE-Plan`-object.

        If `_id` is given, the indication is conveyed that this instance represents
        an already existing Task (e.g. `VEPlanResource` will set correct _id fields
        as in the database when requesting them).
        If no `_id` is given, a "new" `Task` is meant, resulting in a fresh `_id` being
        created.
        However, initializing this class does not interact with the actual resources
        in the database since it is simply a model; to get Tasks of VEPlans with the
        actual data in them, use the `VEPlanResource` class.
        """

        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        self.title = title
        self.description = description
        self.learning_goal = learning_goal
        self.tools = tools

    def __str__(self) -> str:
        return str(self.__dict__)

    def __repr__(self) -> str:
        return str(self)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, self.__class__):
            return self.__dict__ == other.__dict__
        else:
            return False

    def to_dict(self):
        """
        serialize the object into a dictionary containing all attributes
        """

        return {
            "_id": self._id,
            "title": self.title,
            "description": self.description,
            "learning_goal": self.learning_goal,
            "tools": self.tools,
        }

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> Task:
        if not isinstance(params, dict):
            raise TypeError(
                "expected type 'dict' for argument 'params', got {}".format(
                    type(params)
                )
            )

        # ensure all necessary keys are in the dict
        for expected_key in cls.EXPECTED_DICT_ENTRIES.keys():
            if expected_key not in params:
                raise TaskKeyError(
                    "Missing key {} in Task dictionary".format(expected_key)
                )

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization)
        for key in list(params.keys()):
            if key not in cls.EXPECTED_DICT_ENTRIES.keys():
                del params[key]

        # ensure types of attributes are correct
        for key in params:
            if not isinstance(params[key], cls.EXPECTED_DICT_ENTRIES[key]):
                raise TypeError(
                    "expected type '{}' for key '{}', got '{}'".format(
                        cls.EXPECTED_DICT_ENTRIES[key],
                        key,
                        type(key),
                    )
                )

        # handle existence and correct type of object id's
        if "_id" in params:
            params["_id"] = util.parse_object_id(params["_id"])
        else:
            params["_id"] = ObjectId()

        # create and return object
        instance = cls()
        instance.__dict__.update(params)
        return instance


class Step:
    """
    model class for one step of a VE-Plan
    """

    # when initializing a step from a dict using 'Step.from_dict()',
    # this lookup allows to check for the correct types
    EXPECTED_DICT_ENTRIES = {
        "_id": (str, ObjectId, type(None)),
        "name": str,
        "workload": int,
        "timestamp_from": (str, datetime, type(None)),
        "timestamp_to": (str, datetime, type(None)),
        "learning_env": (str, type(None)),
        "tasks": list,
        "evaluation_tools": list,
        "attachments": list,
        "custom_attributes": dict
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        name: str = None,
        workload: int = 0,
        timestamp_from: str | datetime = None,
        timestamp_to: str | datetime = None,
        learning_env: str = None,
        tasks: List[Task] = [],
        evaluation_tools: List[str] = [],
        attachments: List[ObjectId] = [],
        custom_attributes: Dict = {}
    ) -> None:
        """
        Initialization of a `Step` instance.

        Sets all of the function parameters as equivalent instance attributes.

        Usually a `Step` is of no standalone use, but rather a part of a `VEPlan`-object.

        If `_id` is given, the indication is conveyed that this instance represents
        an already existing Step (e.g. `VEPlanResource` will set correct _id fields
        as in the database when requesting them).
        If no `_id` is given, a "new" `Step` is meant, resulting in a fresh `_id` being
        created.
        However, initializing this class does not interact with the actual resources
        in the database since it is simply a model; to get Steps of VEPlans with the
        actual data in them, use the `VEPlanResource` class.

        The arguments `timestamp_from` and `timestamp_to` may be given as either a
        `datetime.datetime` object or a corresponding ISO-8601 datetime string, which will
        be parsed into a `datetime.datetime` object.
        However, if no timestamps are given that determine the duration, they will be set as None.
        All timestamps should use UTC time for easier comparison between users across the globe,
        however the model does not enforce it.

        Additionally to the timestamps, an attribute `duration` is computed as the difference
        of the start and end timestamp, as a `datetime.timedelta` object.
        """

        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        self.name = name
        self.workload = workload

        # ensure type of timestamps, parsing them from str where required
        self.timestamp_from = util.parse_datetime(timestamp_from)
        self.timestamp_to = util.parse_datetime(timestamp_to)

        # duration is a timedelta between start and end,
        # or None if any of the timestamps are None
        if self.timestamp_from is None or self.timestamp_to is None:
            self.duration = None
        else:
            self.duration = self.timestamp_to - self.timestamp_from

        self.learning_env = learning_env
        self.tasks = tasks
        self.evaluation_tools = evaluation_tools
        self.attachments = attachments
        self.custom_attributes = custom_attributes

    def __str__(self) -> str:
        return str(self.__dict__)

    def __repr__(self) -> str:
        return str(self)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, self.__class__):
            return self.__dict__ == other.__dict__
        else:
            return False

    def to_dict(self) -> Dict:
        """
        serialize the object into a dictionary containing all attributes
        """

        return {
            "_id": self._id,
            "name": self.name,
            "workload": self.workload,
            "timestamp_from": self.timestamp_from,
            "timestamp_to": self.timestamp_to,
            "duration": self.duration,
            "learning_env": self.learning_env,
            "tasks": [task.to_dict() for task in self.tasks],
            "evaluation_tools": self.evaluation_tools,
            "attachments": self.attachments,
            "custom_attributes": self.custom_attributes
        }

    @classmethod
    def _check_unique_task_titles(cls, tasks: List[Task]) -> bool:
        """
        assert that the title-attributes of the tasks in the given list are unique
        and return True if so, False otherwise.
        """

        seen_set = set()
        for task in tasks:
            if task.title in seen_set:
                return False
            seen_set.add(task.title)
        return True

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> Step:
        """
        initialize a `Step`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `"name"`, `"duration"`, `"workload"`, `"description"`,
        `"learning_goal"`, `"tasks"`, `"attachments"`.
        However only `name` requires a value, all other attributes may be
        initialized with None (description/learning_goal), 0 (duration/workload)
        or [] (tasks/attachements).

        The optional `attachments`-key is a list containing ObjectId's which are
        references to files that are stored separately in GridFS.

        Returns an instance of `Step`.

        Raises `TypeError` if params is not a dictionary, or any of the values in the
        dict have the wrong type.

        Raises `StepKeyError` if any of the required keys is missing in the `params`-dict.

        Raises `ValueError` if the required key `name` is None.

        Usage example::

            step = Step.from_dict(params)
        """

        if not isinstance(params, dict):
            raise TypeError(
                "expected type 'dict' for argument 'params', got {}".format(
                    type(params)
                )
            )

        # ensure all necessary keys are in the dict
        for expected_key in cls.EXPECTED_DICT_ENTRIES.keys():
            if expected_key not in params:
                raise StepKeyError(
                    "Missing key {} in Step dictionary".format(expected_key)
                )

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization)
        for key in list(params.keys()):
            if key not in cls.EXPECTED_DICT_ENTRIES.keys():
                del params[key]

        # ensure types of attributes are correct
        for key in params:
            if not isinstance(params[key], cls.EXPECTED_DICT_ENTRIES[key]):
                raise TypeError(
                    "expected type '{}' for key '{}', got '{}'".format(
                        cls.EXPECTED_DICT_ENTRIES[key],
                        key,
                        type(key),
                    )
                )

        # handle existence and correct type of object id's
        if "_id" in params:
            params["_id"] = util.parse_object_id(params["_id"])
        else:
            params["_id"] = ObjectId()

        # handle correct type of timestamps
        if "timestamp_from" in params:
            params["timestamp_from"] = util.parse_datetime(params["timestamp_from"])
        else:
            params["timestamp_from"] = None
        if "timestamp_to" in params:
            params["timestamp_to"] = util.parse_datetime(params["timestamp_to"])
        else:
            params["timestamp_to"] = None

        # handle duration attribute depending on timestamps
        if params["timestamp_from"] is None or params["timestamp_to"] is None:
            params["duration"] = None
        else:
            params["duration"] = params["timestamp_to"] - params["timestamp_from"]

        # build tasks objects, asserting that the names of the tasks are unique,
        # gotta do this manually, since __dict__.update doesn't initialize nested objects
        tasks = [Task.from_dict(task) for task in params["tasks"]]
        if not cls._check_unique_task_titles(tasks):
            raise NonUniqueTasksError
        del params["tasks"]

        # create and return object
        instance = cls(tasks=tasks)
        instance.__dict__.update(params)
        return instance


class VEPlan:
    """
    Model class to represent a VE-Plan
    """

    EXPECTED_DICT_ENTRIES = {
        "name": (str, type(None)),
        "topic_description": (str, type(None)),
        "learning_goal": (str, type(None)),
        "steps": list,
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        name: str = None,
        topic_description: str = None,
        learning_goal: str = None,
        steps: List[Step] = [],
    ) -> None:
        """
        Initialization of a `VEPlan` object.

        Sets the function arguments as corresponding instance attributes.

        If `_id` is given, the indication is conveyed that this instance represents
        an already existing VEPlan (e.g. `VEPlanResource` will set correct _id fields
        as in the database when requesting them).
        If no `_id` is given, a "new" `VEPlan` is meant, resulting in a fresh `_id` being
        created.
        However, initializing this class does not interact with the actual resources
        in the database since it is simply a model; to get VEPlans with the actual
        data in them, use the `VEPlanResource` class.

        Additionally, a `workload` and `duration` attribute is computed
        as the sum of workloads/durations of each step.
        """

        self.name = name
        self.topic_description = topic_description
        self.learning_goal = learning_goal
        self.steps = steps

        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        # ensure that steps have unique names
        if not self._check_unique_step_names(self.steps):
            raise NonUniqueStepsError

        self.duration = timedelta()
        self.workload = 0

        # set workload and duration as the sum of workload/duration of the steps
        for step in self.steps:
            self.duration += step.duration
            self.workload += step.workload

    def to_dict(self) -> Dict:
        """
        serialize the attributes of this `VEPlan` into a dictionary.
        Calls `to_dict` on every step in the steps-list to serialize
        those as well.
        """

        return {
            "_id": self._id,
            "name": self.name,
            "duration": self.duration,
            "workload": self.workload,
            "topic_description": self.topic_description,
            "learning_goal": self.learning_goal,
            "steps": [step.to_dict() for step in self.steps],
        }

    def __str__(self) -> str:
        return str(self.__dict__)

    def __repr__(self) -> str:
        return str(self)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, self.__class__):
            return self.__dict__ == other.__dict__
        else:
            return False

    @classmethod
    def _check_unique_step_names(cls, steps: List[Step]) -> bool:
        """
        assert that the name-attributes of the steps in the given list are unique
        and return True if so, False otherwise.
        """

        seen_set = set()
        for step in steps:
            if step.name in seen_set:
                return False
            seen_set.add(step.name)
        return True

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> VEPlan:
        """
        initialize a VEPlan object from a dictionary containing the expected attributes.
        This dictionary has to atleast contain the following keys:
        `"name"`, `"topic_description"`, `"learning_goal"`, `"steps"`,
        however their values may be None. Note that `steps` is a list of
        dictionaries that in turn have to satisfy the `from_dict()` method
        of the `Step` class. The steps inside a VEPlan have to have unique names!

        Optionally, a `"_id"`-key may be supplied, indicating that an existing VEPlan is supposed
        to be referenced (e.g. update the plan), otherwise a fresh _id will be created on
        initialization.
        However, initializing this class (either by this method or also manually) does not interact
        with the actual resources in the database since it is simply a model,
        to get VEPlans with the actual data in them, use the `VEPlanResource` class.

        Returns an instance of `VEPlan`.

        Raises `TypeError` if params is not a dictionary or if any of the values in the
        dictionary have to wrong type.

        Raises `PlanKeyError` if an expected key is missing in the dictionary.

        Raises `InvalidId` if the optionally supplied _id is no matching the expected format
        for `bson.ObjectId`.

        Raises `NonUniqueStepsError` if the names of the steps in the `steps`-list are not
        unique to each other.

        Usage example::

            plan = VEPlan.from_dict(params)
        """

        if not isinstance(params, dict):
            raise TypeError(
                "Expecting type 'dict' of params, got {}".format(type(dict))
            )

        # ensure all necessary keys are in the dict
        for expected_key in cls.EXPECTED_DICT_ENTRIES.keys():
            if expected_key not in params:
                raise PlanKeyError(
                    "Missing key {} in VEPlan dictionary".format(expected_key),
                    expected_key,
                )

        # ensure types of attributes are correct (only those that are passed from the dict)
        for key in params:
            if key in cls.EXPECTED_DICT_ENTRIES:
                if not isinstance(params[key], cls.EXPECTED_DICT_ENTRIES[key]):
                    raise TypeError(
                        "expected type '{}' for key '{}', got '{}'".format(
                            cls.EXPECTED_DICT_ENTRIES[key],
                            key,
                            type(params[key]),
                        )
                    )

        # handle existence and correct type of object id's
        if "_id" in params:
            params["_id"] = util.parse_object_id(params["_id"])
        else:
            params["_id"] = ObjectId()

        # build step objects, asserting that the names of the steps are unique,
        # gotta do this manually, since __dict__.update doesn't initialize nested objects
        steps = [Step.from_dict(step) for step in params["steps"]]
        if not cls._check_unique_step_names(steps):
            raise NonUniqueStepsError
        del params["steps"]

        # build VEPlan and set remaining values
        instance = cls(steps=steps)
        instance.__dict__.update(params)
        return instance


if __name__ == "__main__":
    pass
