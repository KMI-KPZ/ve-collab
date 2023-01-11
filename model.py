from __future__ import annotations
from pprint import pprint
from typing import Any, Dict, List, Optional

from bson import ObjectId

from exceptions import NonUniqueStepsError, PlanKeyError, StepKeyError
import util


class User:
    def __init__(self, username, user_id, email):
        self.username = username
        self.user_id = user_id
        self.email = email

    def to_dict(self) -> dict:
        return {"username": self.username, "user_id": self.user_id, "email": self.email}


class Step:
    """
    model class for one step of a VE-Plan
    """

    EXPECTED_DICT_KEYS = [
        "name",
        "duration",
        "workload",
        "description",
        "learning_goal",
        "tasks",
        "attachments",
    ]

    def __init__(
        self,
        name: str,
        duration: int = 0,
        workload: int = 0,
        description: str = None,
        learning_goal: str = None,
        tasks: List[str] = None,
        attachments: List[ObjectId] = None,
    ) -> None:
        """
        Initialization of a `Step` instance.

        Sets all of the function parameters as equivalent instance attributes.

        Usually a `Step` is of no standalone use, but rather a part of a `VEPlan`-object.
        """

        self.name = name
        self.duration = duration
        self.workload = workload
        self.description = description
        self.learning_goal = learning_goal
        self.tasks = tasks
        self.attachments = attachments

    def __str__(self) -> str:
        return str(self.__dict__)

    def __repr__(self) -> str:
        return str(self)

    def to_dict(self) -> Dict:
        """
        serialize the object into a dictionary containing all attributes
        """

        return {
            "name": self.name,
            "duration": self.duration,
            "workload": self.workload,
            "description": self.description,
            "learning_goal": self.learning_goal,
            "tasks": self.tasks,
            "attachments": self.attachments,
        }

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

        Raises `TypeError` if params is not a dictionary.

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
        for expected_key in cls.EXPECTED_DICT_KEYS:
            if expected_key not in params:
                raise StepKeyError(
                    "Missing key {} in Step dictionary".format(expected_key)
                )

        # ensure the name has a value
        if not params["name"]:
            raise ValueError("Step name cannot be None")

        # create and return object
        instance = cls(params["name"])
        instance.__dict__.update(params)
        return instance


class VEPlan:
    """
    Model class to represent a VE-Plan
    """

    EXPECTED_DICT_KEYS = ["name", "topic_description", "learning_goal", "steps"]

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
        self.duration = 0
        self.workload = 0

        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        # set workload and duration as the sum of workload/duration of the steps
        if self.steps:
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

    @classmethod
    def __check_unique_step_names(self, steps: List[Step]) -> bool:
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
    def from_dict(cls, params: Dict[str, Any]) -> Step:
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

        Raises `TypeError` if params is not a dictionary.

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
        for expected_key in cls.EXPECTED_DICT_KEYS:
            if expected_key not in params:
                raise PlanKeyError(
                    "Missing key {} in VEPlan dictionary".format(expected_key),
                    expected_key,
                )

        # handle existence and correct type of object id's
        if "_id" in params:
            params["_id"] = util.parse_object_id(params["_id"])
        else:
            params["_id"] = ObjectId()

        # build step objects, asserting that the names of the steps are unique,
        # gotta do this manually, since __dict__.update doesn't initialize nested objects
        steps = [Step.from_dict(step) for step in params["steps"]]
        if not cls.__check_unique_step_names(steps):
            raise NonUniqueStepsError
        del params["steps"]

        # build VEPlan and set remaining values
        instance = cls(name=params["name"], steps=steps)
        instance.__dict__.update(params)
        return instance


if __name__ == "__main__":

    test_step = {
        "name": "test_step",
        "duration": 100,
        "workload": 100,
        "description": "test",
        "learning_goal": "test",
        "tasks": ["test", "test", "test"],
        "attachments": [ObjectId(), ObjectId()],
    }

    step = Step.from_dict(test_step)
    # pprint(step)
    # pprint(step.to_dict())

    _id = ObjectId()
    test_ve_plan = {
        "name": None,
        "topic_description": "test",
        "learning_goal": "test",
        "steps": [test_step],
        "_id": _id,
    }

    ve_plan = VEPlan.from_dict(test_ve_plan)
    pprint(ve_plan._id)
    pprint(_id)
    pprint(ve_plan.to_dict())
