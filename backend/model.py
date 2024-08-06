from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Dict, List

from bson import ObjectId

from exceptions import (
    MissingKeyError,
    NonUniqueStepsError,
    NonUniqueTasksError,
)
import util


class User:
    def __init__(self, username: str, user_id: str, email: str, orcid: str = ""):
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
        if not isinstance(orcid, str):
            raise TypeError(
                "expected type '{}' for attribute 'orcid', got '{}'".format(
                    str, type(orcid)
                )
            )

        self.username = username
        self.user_id = user_id
        self.email = email
        self.orcid = orcid

    def to_dict(self) -> dict:
        return {"username": self.username, "user_id": self.user_id, "email": self.email}


class Space(dict):
    """
    model class for a space as a dict that enforces certain keys,
    i.e. only the values from EXPECTED_DICT_ENTRIES are allowed,
    others get deleted.

    Attributes can be accessed like normal classes, e.g. space.name,
    but also like dicts, e.g. space["name"].
    """

    EXPECTED_DICT_ENTRIES = {
        "name": (str, type(None)),
        "invisible": bool,
        "joinable": bool,
        "members": list,
        "admins": list,
        "invites": list,
        "requests": list,
        "files": list,
        "space_pic": (str, ObjectId, type(None)),
        "space_description": (str, type(None)),
    }

    def __init__(
        self,
        params: Dict[str, Any] = {},
    ) -> None:

        # init default values
        setattr(self, "_id", ObjectId())
        super().__setitem__("_id", ObjectId())
        setattr(self, "name", None)
        super().__setitem__("name", None)
        setattr(self, "invisible", False)
        super().__setitem__("invisible", False)
        setattr(self, "joinable", True)
        super().__setitem__("joinable", True)
        setattr(self, "members", [])
        super().__setitem__("members", [])
        setattr(self, "admins", [])
        super().__setitem__("admins", [])
        setattr(self, "invites", [])
        super().__setitem__("invites", [])
        setattr(self, "requests", [])
        super().__setitem__("requests", [])
        setattr(self, "files", [])
        super().__setitem__("files", [])
        setattr(self, "space_pic", None)
        super().__setitem__("space_pic", None)
        setattr(self, "space_description", None)
        super().__setitem__("space_description", None)

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization)
        for key in list(params.keys()):
            if key not in [*self.EXPECTED_DICT_ENTRIES.keys(), *["_id"]]:
                del params[key]

        # override default attributes from params
        for k, v in params.items():
            setattr(self, k, v)
            super().__setitem__(k, v)

    def __getitem__(self, key):
        return super().__getitem__(key)

    def __setitem__(self, key, value):
        if key in [*self.EXPECTED_DICT_ENTRIES.keys(), *["_id"]]:
            setattr(self, key, value)
            return super().__setitem__(key, value)

    def __delitem__(self, key):
        delattr(self, key)
        return super().__delitem__(key)

    def __str__(self) -> str:
        return super().__str__()

    def __repr__(self) -> str:
        return super().__repr__()


class Task:
    """
    model class for a Task within a Step of a VE-Plan
    """

    # when initializing a task from a dict using 'Task.from_dict()',
    # this lookup allows to check for the correct types
    EXPECTED_DICT_ENTRIES = {
        "task_formulation": (str, type(None)),
        "work_mode": (str, type(None)),
        "notes": (str, type(None)),
        "tools": list,
        "materials": list,
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        task_formulation: str = None,
        work_mode: str = None,
        notes: str = None,
        tools: List[str] = [],
        materials: List[str] = [],
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

        self.task_formulation = task_formulation
        self.work_mode = work_mode
        self.notes = notes
        self.tools = tools
        self.materials = materials

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
            "task_formulation": self.task_formulation,
            "work_mode": self.work_mode,
            "notes": self.notes,
            "tools": self.tools,
            "materials": self.materials,
        }

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> Task:
        """
        initialize a `Task`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `task_formulation`, `work_mode`, `"notes"`, `"tools"`, `materials`.
        However values are not required, any attributes may be
        initialized with None (notes/task_formulation/work_mode)
        or [] (tools/materials).

        Optionally, a `"_id"` may be supplied, conveying the semantics that this Task
        already exists. However, true existence is handled by the database itself and
        not by this model.
        If no "_id" is supplied, a fresh one will be generated by the system.

        Any other entries in `params` that do not represent an attribute
        of a Task will be ignored and deleted from the dictionary
        (keep in mind for further use of this dict).

        Returns an instance of `Task`.

        Raises `TypeError` if params is not a dictionary, or any of the values in the
        dict have the wrong type.

        Raises `MissingKeyError` if any of the required keys is missing in the `params`-dict.

        Usage example::

            task = Task.from_dict(params)
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
                raise MissingKeyError(
                    "Missing key {} in {} dictionary".format(
                        expected_key, cls.__name__
                    ),
                    expected_key,
                    cls.__name__,
                )

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization)
        for key in list(params.keys()):
            if key not in [*cls.EXPECTED_DICT_ENTRIES.keys(), *["_id"]]:
                del params[key]

        # ensure types of attributes are correct
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
        "name": str,
        "workload": int,
        "timestamp_from": (str, datetime, type(None)),
        "timestamp_to": (str, datetime, type(None)),
        "learning_goal": (str, type(None)),
        "learning_activity": (str, type(None)),
        "has_tasks": bool,
        "tasks": list,
        "evaluation_tools": list,
        "attachments": list,
        "custom_attributes": dict,
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        name: str = None,
        workload: int = 0,
        timestamp_from: str | datetime = None,
        timestamp_to: str | datetime = None,
        learning_goal: str = None,
        learning_activity: str = None,
        has_tasks: bool = False,
        tasks: List[Task] = [],
        evaluation_tools: List[str] = [],
        attachments: List[ObjectId] = [],
        custom_attributes: Dict = {},
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

        self.learning_goal = learning_goal
        self.learning_activity = learning_activity
        self.has_tasks = has_tasks
        self.tasks = tasks

        # ensure that tasks are unique by their task formulation
        if not self._check_unique_tasks(self.tasks):
            raise NonUniqueTasksError

        self.evaluation_tools = evaluation_tools
        self.attachments = [
            util.parse_object_id(attachment) for attachment in attachments
        ]
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
            "duration": self.duration.total_seconds() if self.duration else None,
            "learning_goal": self.learning_goal,
            "learning_activity": self.learning_activity,
            "has_tasks": self.has_tasks,
            "tasks": [task.to_dict() for task in self.tasks],
            "evaluation_tools": self.evaluation_tools,
            "attachments": self.attachments,
            "custom_attributes": self.custom_attributes,
        }

    @classmethod
    def _check_unique_tasks(cls, tasks: List[Task]) -> bool:
        """
        assert that the task_formulation-attributes of the tasks in the given list are unique
        and return True if so, False otherwise.
        """

        seen_set = set()
        for task in tasks:
            if task.task_formulation in seen_set:
                return False
            seen_set.add(task.task_formulation)
        return True

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> Step:
        """
        initialize a `Step`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `"name"`, `"duration"`, `"workload"`, `"description"`,
        `"learning_goal"`, `"has_tasks"`, `"tasks"`, `"attachments"`, `"custom_attributes"`.
        However only `name` requires a value, all other attributes may be
        initialized with None (description/learning_goal), 0 (duration/workload),
        False (has_tasks) or [] (tasks/attachements).

        If tasks are supplied, they have to be in a list of dictionary-representations
        that are parseable by `Task.from_dict()`. Additionally, those tasks have to have
        unique `"task-formulation"`-attributes within this step.

        The `attachments`-key is a list containing ObjectId's which are
        references to files that are stored separately in GridFS.

        Returns an instance of `Step`.

        Raises `TypeError` if params is not a dictionary, or any of the values in the
        dict have the wrong type.

        Raises `MissingKeyError` if any of the required keys is missing in the `params`-dict.

        Raises `NonUniqueTasksError` if the tasks are not unique to each other.

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
                raise MissingKeyError(
                    "Missing key {} in {} dictionary".format(
                        expected_key, cls.__name__
                    ),
                    expected_key,
                    cls.__name__,
                )

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization)
        for key in list(params.keys()):
            if key not in [*cls.EXPECTED_DICT_ENTRIES.keys(), *["_id"]]:
                del params[key]

        # ensure types of attributes are correct
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

        # handle correct types of attachments
        params["attachments"] = [
            util.parse_object_id(attachment) for attachment in params["attachments"]
        ]

        # build tasks objects, asserting that the names of the tasks are unique,
        # gotta do this manually, since __dict__.update doesn't initialize nested objects
        tasks = [Task.from_dict(task) for task in params["tasks"]]
        if not cls._check_unique_tasks(tasks):
            raise NonUniqueTasksError
        del params["tasks"]

        # create and return object
        instance = cls(tasks=tasks)
        instance.__dict__.update(params)
        return instance


class TargetGroup:
    """
    model class to represent a target group (typically of a VEPlan)
    """

    # when initializing a step from a dict using 'Step.from_dict()',
    # this lookup allows to check for the correct types
    EXPECTED_DICT_ENTRIES = {
        "name": (str, type(None)),
        "age_min": (int, str, type(None)),
        "age_max": (int, str, type(None)),
        "experience": (str, type(None)),
        "academic_course": (str, type(None)),
        "languages": (str, type(None)),
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        name: str = None,
        age_min: int | str = None,
        age_max: int | str = None,
        experience: str = None,
        academic_course: str = None,
        languages: str = None,
    ) -> None:
        """
        Initialization of a `TargetGroup` instance.

        Sets all of the function parameters as equivalent instance attributes.

        Usually a `TargetGroup` is of no standalone use, but rather a part of a
        `VE-Plan`-object.

        If `_id` is given, the indication is conveyed that this instance represents
        an already existing TargetGroup (e.g. `VEPlanResource` will set correct _id
        fields as in the database when requesting them).
        If no `_id` is given, a "new" `TargetGroup` is meant, resulting in a fresh
        `_id` being created.
        However, initializing this class does not interact with the actual resources
        in the database since it is simply a model; to get Target Groups of VEPlans
        with the actual data in them, use the `VEPlanResource` class.
        """

        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        self.name = name

        if isinstance(age_min, str):
            # since we allow empty string, we have to check for it
            # because otherwise it would try to cast it to int which
            # results in a value error
            if age_min == "":
                self.age_min = None
            else:
                self.age_min = int(age_min)
        else:
            self.age_min = age_min

        if isinstance(age_max, str):
            # since we allow empty string, we have to check for it
            # because otherwise it would try to cast it to int which
            # results in a value error
            if age_max == "":
                self.age_max = None
            else:
                self.age_max = int(age_max)
        else:
            self.age_max = age_max

        self.experience = experience
        self.academic_course = academic_course
        self.languages = languages

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
        serialize all attributes of this instance into a dictionary
        """

        return {
            "_id": self._id,
            "name": self.name,
            "age_min": str(self.age_min) if self.age_min != None else None,
            "age_max": str(self.age_max) if self.age_max != None else None,
            "experience": self.experience,
            "academic_course": self.academic_course,
            "languages": self.languages,
        }

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> TargetGroup:
        """
        initialize a `TargetGroup`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `"name"`, `"age_min"`, `"age_max"`, `"experience"`, `"academic_course"`,
        `"languages"`.
        However values are not required, any attributes may be
        initialized with None (name/experience/academic_course/languages) or
        0 (age_min/age_max).

        Optionally, a `"_id"` may be supplied, conveying the semantics that this TargetGroup
        already exists. However, true existence is handled by the database itself and
        not by this model.
        If no "_id" is supplied, a fresh one will be generated by the system.

        Any other entries in `params` that do not represent an attribute
        of a TargetGroup will be ignored and deleted from the dictionary
        (keep in mind for further use of the `params`-dict).

        Returns an instance of `TargetGroup`.

        Raises `TypeError` if params is not a dictionary, or any of the values in the
        dict have the wrong type.

        Raises `MissingKeyError` if any of the required keys is missing
        in the `params`-dict.

        Usage example::

            target_group = TargetGroup.from_dict(params)
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
                raise MissingKeyError(
                    "Missing key {} in {} dictionary".format(
                        expected_key, cls.__name__
                    ),
                    expected_key,
                    cls.__name__,
                )

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization)
        for key in list(params.keys()):
            if key not in [*cls.EXPECTED_DICT_ENTRIES.keys(), *["_id"]]:
                del params[key]

        # ensure types of attributes are correct
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

        # handle correct transformation of age_min to int or None
        # e.g. if a string is supplied
        if "age_min" in params:
            if params["age_min"] != None:
                if params["age_min"] == "":
                    params["age_min"] = None
                else:
                    params["age_min"] = int(params["age_min"])
        # handle correct transformation of age_max to int or None
        # e.g. if a string is supplied
        if "age_max" in params:
            if params["age_max"] != None:
                if params["age_max"] == "":
                    params["age_max"] = None
                else:
                    params["age_max"] = int(params["age_max"])

        # create and return object
        instance = cls()
        instance.__dict__.update(params)
        return instance


class Institution:
    """
    model class to represent an Institution (typically of a `VEPlan`)
    """

    EXPECTED_DICT_ENTRIES = {
        "name": (str, type(None)),
        "school_type": (str, type(None)),
        "country": (str, type(None)),
        "departments": list,
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        name: str = None,
        school_type: str = None,
        country: str = None,
        departments: List[str] = [],
    ) -> None:
        """
        Initialization of an `Institution` instance.

        Sets all of the function parameters as equivalent instance attributes.

        Usually an `Institution` is of no standalone use, but rather a part
        of a `VEPlan`-object.

        If `_id` is given, the indication is conveyed that this instance represents
        an already existing Institution (e.g. `VEPlanResource` will set correct _id fields
        as in the database when requesting them).
        If no `_id` is given, a "new" `Institution` is meant, resulting in a fresh `_id` being
        created.
        However, initializing this class does not interact with the actual resources
        in the database since it is simply a model; to get Lectures with the
        actual data in them, use the `VEPlanResource` class.
        """

        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        self.name = name
        self.school_type = school_type
        self.country = country
        self.departments = departments

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
        serialize all attributes of this instance into a dictionary
        """

        return {
            "_id": self._id,
            "name": self.name,
            "school_type": self.school_type,
            "country": self.country,
            "departments": self.departments,
        }

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> Institution:
        """
        initialize an `Institution`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `"name"`, `"school_type"`, `"country"`, `"departments"`.
        However no values are required, any attributes may be
        initialized with None (name/school_type/country) or [] (departments).

        Returns an instance of `Institution`.

        Raises `TypeError` if params is not a dictionary, or any of the values in the
        dict have the wrong type.

        Raises `MissingKeyError` if any of the required keys is missing in the `params`-dict.

        Usage example::

            institution = Institution.from_dict(params)
        """

        if not isinstance(params, dict):
            raise TypeError(
                "Expecting type 'dict' of params, got {}".format(type(params))
            )

        # ensure all necessary keys are in the dict
        for expected_key in cls.EXPECTED_DICT_ENTRIES.keys():
            if expected_key not in params:
                raise MissingKeyError(
                    "Missing key {} in {} dictionary".format(
                        expected_key, cls.__name__
                    ),
                    expected_key,
                    cls.__name__,
                )

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization)
        # since _id is optional, we also allow it.
        for key in list(params.keys()):
            if key not in [*cls.EXPECTED_DICT_ENTRIES.keys(), *["_id"]]:
                del params[key]

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

        # build Institution and set remaining values
        instance = cls()
        instance.__dict__.update(params)
        return instance


class Lecture:
    EXPECTED_DICT_ENTRIES = {
        "name": (str, type(None)),
        "lecture_type": (str, type(None)),
        "lecture_format": (str, type(None)),
        "participants_amount": (int, str, type(None)),
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        name: str = None,
        lecture_type: str = None,
        lecture_format: str = None,
        participants_amount: int = None,
    ) -> None:
        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        self.name = name
        self.lecture_type = lecture_type
        self.lecture_format = lecture_format

        if isinstance(participants_amount, str):
            # since we allow empty string, we have to check for it
            # because otherwise it would try to cast it to int which
            # results in a value error
            if participants_amount == "":
                self.participants_amount = None
            else:
                self.participants_amount = int(participants_amount)
        else:
            self.participants_amount = participants_amount

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
        serialize all attributes of this instance into a dictionary
        """

        return {
            "_id": self._id,
            "name": self.name,
            "lecture_type": self.lecture_type,
            "lecture_format": self.lecture_format,
            "participants_amount": (
                str(self.participants_amount)
                if self.participants_amount != None
                else None
            ),
        }

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> Lecture:
        """
        initialize a `Lecture`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `"name"`, `"lecture_type"`, `"lecture_format"`, `"participants_amount"`.
        However values are not required, any attributes may be
        initialized with None / empty strings (name/lecture_type/lecture_format/
        participants_amount) or 0 (participants_amount).

        Optionally, a `"_id"` may be supplied, conveying the semantics that this Lecture
        already exists. However, true existence is handled by the database itself and
        not by this model.
        If no "_id" is supplied, a fresh one will be generated by the system.

        Any other entries in `params` that do not represent an attribute
        of a Lecture will be ignored and deleted from the dictionary
        (keep in mind for further use of the `params`-dict).

        Returns an instance of `Lecture`.

        Raises `TypeError` if params is not a dictionary, or any of the values in the
        dict have the wrong type.

        Raises `MissingKeyError` if any of the required keys is missing
        in the `params`-dict.

        Usage example::

            lecture = Lecture.from_dict(params)
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
                raise MissingKeyError(
                    "Missing key {} in {} dictionary".format(
                        expected_key, cls.__name__
                    ),
                    expected_key,
                    cls.__name__,
                )

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization)
        for key in list(params.keys()):
            if key not in [*cls.EXPECTED_DICT_ENTRIES.keys(), *["_id"]]:
                del params[key]

        # ensure types of attributes are correct
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

        # handle correct transformation from participants_amount to int or None
        # e.g. if a string is supplied
        if "participants_amount" in params:
            if params["participants_amount"] != None:
                if params["participants_amount"] == "":
                    params["participants_amount"] = None
                else:
                    params["participants_amount"] = int(params["participants_amount"])

        # create and return object
        instance = cls()
        instance.__dict__.update(params)
        return instance


class PhysicalMobility:
    EXPECTED_DICT_ENTRIES = {
        "location": (str, type(None)),
        "timestamp_from": (str, datetime, type(None)),
        "timestamp_to": (str, datetime, type(None)),
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        location: str = None,
        timestamp_from: str | datetime = None,
        timestamp_to: str | datetime = None,
    ) -> None:
        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        self.location = location

        # ensure type of timestamps, parsing them from str where required
        self.timestamp_from = util.parse_datetime(timestamp_from)
        self.timestamp_to = util.parse_datetime(timestamp_to)

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
        serialize all attributes of this instance into a dictionary
        """

        return {
            "_id": self._id,
            "location": self.location,
            "timestamp_from": self.timestamp_from,
            "timestamp_to": self.timestamp_to,
        }

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> PhysicalMobility:
        """
        initialize a `PhysicalMobility`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `"location"`, `"timestamp_from"`, `"timestamp_to"`.
        However values are not required, any attributes may be
        initialized with None (location/timestamp_from/timestamp_to).

        Optionally, a `"_id"` may be supplied, conveying the semantics that this PhysicalMobility
        already exists. However, true existence is handled by the database itself and
        not by this model.
        If no "_id" is supplied, a fresh one will be generated by the system.

        Any other entries in `params` that do not represent an attribute
        of a PhysicalMobility will be ignored and deleted from the dictionary
        (keep in mind for further use of the `params`-dict).

        Returns an instance of `PhysicalMobility`.

        Raises `TypeError` if params is not a dictionary, or any of the values in the
        dict have the wrong type.

        Raises `MissingKeyError` if any of the required keys is missing
        in the `params`-dict.

        Usage example::

            physical_mobility = PhysicalMobility.from_dict(params)
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
                raise MissingKeyError(
                    "Missing key {} in {} dictionary".format(
                        expected_key, cls.__name__
                    ),
                    expected_key,
                    cls.__name__,
                )

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization)
        for key in list(params.keys()):
            if key not in [*cls.EXPECTED_DICT_ENTRIES.keys(), *["_id"]]:
                del params[key]

        # ensure types of attributes are correct
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

        # handle correct type of timestamps
        if "timestamp_from" in params:
            params["timestamp_from"] = util.parse_datetime(params["timestamp_from"])
        else:
            params["timestamp_from"] = None
        if "timestamp_to" in params:
            params["timestamp_to"] = util.parse_datetime(params["timestamp_to"])
        else:
            params["timestamp_to"] = None

        # create and return object
        instance = cls()
        instance.__dict__.update(params)
        return instance


class Evaluation:
    EXPECTED_DICT_ENTRIES = {
        "username": (str, type(None)),
        "is_graded": bool,
        "task_type": (str, type(None)),
        "assessment_type": (str, type(None)),
        "evaluation_while": (str, type(None)),
        "evaluation_after": (str, type(None)),
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        username: str = None,
        is_graded: bool = None,
        task_type: str = None,
        assessment_type: str = None,
        evaluation_while: str = None,
        evaluation_after: str = None,
    ) -> None:
        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        self.username = username
        if is_graded == None:
            is_graded = False
        self.is_graded = is_graded
        self.task_type = task_type
        self.assessment_type = assessment_type
        self.evaluation_while = evaluation_while
        self.evaluation_after = evaluation_after

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
        serialize all attributes of this instance into a dictionary
        """

        return {
            "_id": self._id,
            "username": self.username,
            "is_graded": self.is_graded,
            "task_type": self.task_type,
            "assessment_type": self.assessment_type,
            "evaluation_while": self.evaluation_while,
            "evaluation_after": self.evaluation_after,
        }

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> Evaluation:
        """
        initialize an `Evaluation`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `"username"`, `"is_graded"`, `"task_type"`, `"assessment_type"`,
        `"evaluation_while"`, `"evaluation_after"`.
        However values are not required, any attributes may be
        initialized with None (username/task_type/assessment_type/evaluation_while/
        evaluation_after) or False (is_graded).

        Optionally, a `"_id"` may be supplied, conveying the semantics that this Evaluation
        already exists. However, true existence is handled by the database itself and
        not by this model.
        If no "_id" is supplied, a fresh one will be generated by the system.

        Any other entries in `params` that do not represent an attribute
        of an Evaluation will be ignored and deleted from the dictionary
        (keep in mind for further use of the `params`-dict).

        Returns an instance of `Evaluation`.

        Raises `TypeError` if params is not a dictionary, or any of the values in the
        dict have the wrong type.

        Raises `MissingKeyError` if any of the required keys is missing
        in the `params`-dict.

        Usage example::

            evaluation = Evaluation.from_dict(params)
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
                raise MissingKeyError(
                    "Missing key {} in {} dictionary".format(
                        expected_key, cls.__name__
                    ),
                    expected_key,
                    cls.__name__,
                )

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization)
        for key in list(params.keys()):
            if key not in [*cls.EXPECTED_DICT_ENTRIES.keys(), *["_id"]]:
                del params[key]

        # ensure types of attributes are correct
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

        # create and return object
        instance = cls()
        instance.__dict__.update(params)
        return instance


class IndividualLearningGoal:
    EXPECTED_DICT_ENTRIES = {
        "username": (str, type(None)),
        "learning_goal": (str, type(None)),
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        username: str = None,
        learning_goal: str = None,
    ) -> None:
        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        self.username = username
        self.learning_goal = learning_goal

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
        serialize all attributes of this instance into a dictionary
        """

        return {
            "_id": self._id,
            "username": self.username,
            "learning_goal": self.learning_goal,
        }

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> IndividualLearningGoal:
        """
        initialize an `IndividualLearningGoal`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `"username"`, `"learning_goal"`.
        However values are not required, any attributes may be
        initialized with None (username/learning_goal).

        Optionally, a `"_id"` may be supplied, conveying the semantics that this IndividualLearningGoal
        already exists. However, true existence is handled by the database itself and
        not by this model.
        If no "_id" is supplied, a fresh one will be generated by the system.

        Any other entries in `params` that do not represent an attribute
        of an IndividualLearningGoal will be ignored and deleted from the dictionary
        (keep in mind for further use of the `params`-dict).

        Returns an instance of `IndividualLearningGoal`.

        Raises `TypeError` if params is not a dictionary, or any of the values in the
        dict have the wrong type.

        Raises `MissingKeyError` if any of the required keys is missing
        in the `params`-dict.

        Usage example::

            individual_learning_goal = IndividualLearningGoal.from_dict(params)
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
                raise MissingKeyError(
                    "Missing key {} in {} dictionary".format(
                        expected_key, cls.__name__
                    ),
                    expected_key,
                    cls.__name__,
                )

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization)
        for key in list(params.keys()):
            if key not in [*cls.EXPECTED_DICT_ENTRIES.keys(), *["_id"]]:
                del params[key]

        # ensure types of attributes are correct
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

        # create and return object
        instance = cls()
        instance.__dict__.update(params)
        return instance


class VEPlan:
    """
    Model class to represent a VE-Plan
    """

    EXPECTED_DICT_ENTRIES = {
        "name": (str, type(None)),
        "partners": list,
        "institutions": list,
        "topics": list,
        "lectures": list,
        "major_learning_goals": list,
        "individual_learning_goals": list,
        "methodical_approaches": list,
        "audience": list,
        "languages": list,
        "evaluation": list,
        "involved_parties": list,
        "realization": (str, type(None)),
        "physical_mobility": (bool, type(None)),
        "physical_mobilities": list,
        "learning_env": (str, type(None)),
        "new_content": (bool, type(None)),
        "formalities": list,
        "steps": list,
        "is_good_practise": (bool, type(None)),
        "abstract": (str, type(None)),
        "underlying_ve_model": (str, type(None)),
        "reflection": (str, type(None)),
        "good_practise_evaluation": (str, type(None)),
        "literature": (str, type(None)),
        "evaluation_file": (dict, type(None)),
        "literature_files": list,
        "progress": dict,
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        author: str = None,
        read_access: List[str] = [],
        write_access: List[str] = [],
        creation_timestamp: str | datetime = None,
        last_modified: str | datetime = None,
        name: str = None,
        partners: List[str] = [],
        institutions: List[Institution] = [],
        topics: List[str] = [],
        lectures: List[Lecture] = [],
        major_learning_goals: List[str] = [],
        individual_learning_goals: List[IndividualLearningGoal] = [],
        methodical_approaches: List[str] = [],
        audience: List[TargetGroup] = [],
        languages: List[str] = [],
        evaluation: List[Evaluation] = [],
        involved_parties: List[str] = [],
        realization: str = None,
        physical_mobility: bool = None,
        physical_mobilities: List[PhysicalMobility] = [],
        learning_env: str = None,
        new_content: bool = None,
        formalities: list = [],
        steps: List[Step] = [],
        is_good_practise: bool = None,
        abstract: str = None,
        underlying_ve_model: str = None,
        reflection: str = None,
        good_practise_evaluation: str = None,
        literature: str = None,
        evaluation_file: dict = None,
        literature_files: List[dict] = [],
        progress: Dict = {},
    ) -> None:
        """
        Initialization of a `VEPlan` object.

        Sets the function arguments as corresponding instance attributes.
        Formalities is a dict expected to contain the keys "technology" and
        "exam_regulations" with either True, False or None value respectively.

        If `_id` is given, the indication is conveyed that this instance represents
        an already existing VEPlan (e.g. `VEPlanResource` will set correct _id fields
        as in the database when requesting them).
        If no `_id` is given, a "new" `VEPlan` is meant, resulting in a fresh `_id` being
        created.
        However, initializing this class does not interact with the actual resources
        in the database since it is simply a model; to get VEPlans with the actual
        data in them, use the `VEPlanResource` class.

        Additionally, a `workload` attribute is computed as the sum of workloads
        of each step.
        To represent the full timespan of this VEPlan, a `timestamp_from`,
        `timestamp_to` and `duration` attribute is computed based on the
        minimum/maximum timestamps of the steps.
        """

        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        self.author = author
        self.read_access = read_access
        self.write_access = write_access

        self.creation_timestamp = util.parse_datetime(creation_timestamp)
        self.last_modified = util.parse_datetime(last_modified)

        self.name = name
        self.partners = partners
        self.institutions = institutions
        self.topics = topics
        self.lectures = lectures
        self.major_learning_goals = major_learning_goals
        self.individual_learning_goals = individual_learning_goals
        self.methodical_approaches = methodical_approaches
        self.audience = audience
        self.languages = languages
        self.evaluation = evaluation
        self.involved_parties = involved_parties
        self.realization = realization
        self.learning_env = learning_env
        self.new_content = new_content
        self.steps = steps
        self.physical_mobility = physical_mobility
        self.physical_mobilities = physical_mobilities

        if not is_good_practise:
            is_good_practise = False
        self.is_good_practise = is_good_practise
        self.abstract = abstract
        self.underlying_ve_model = underlying_ve_model
        self.reflection = reflection
        self.good_practise_evaluation = good_practise_evaluation
        self.literature = literature

        if evaluation_file:
            if any([key not in evaluation_file for key in ["file_id", "file_name"]]):
                raise MissingKeyError(
                    "Missing a key in evaluation_file dictionary",
                    "file or filename",
                    "evaluation_file",
                )
            evaluation_file["file_id"] = util.parse_object_id(
                evaluation_file["file_id"]
            )
            self.evaluation_file = evaluation_file
        else:
            self.evaluation_file = None

        if literature_files:
            for literature_file in literature_files:
                if any([key not in literature_file for key in ["file_id", "file_name"]]):
                    raise MissingKeyError(
                        "Missing a key in literature_files dictionary",
                        "file or filename",
                        "literature_files",
                    )
                literature_file["file_id"] = util.parse_object_id(literature_file["file_id"])
            self.literature_files = literature_files
        else:
            self.literature_files = []

        if progress:
            # TODO check every expected key is inside as well
            self.progress = progress
        else:
            self.progress = {
                "name": "not_started",
                "institutions": "not_started",
                "topics": "not_started",
                "lectures": "not_started",
                "learning_goals": "not_started",
                "methodical_approaches": "not_started",
                "audience": "not_started",
                "languages": "not_started",
                "evaluation": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "new_content": "not_started",
                "formalities": "not_started",
                "steps": [
                    {"step_id": step._id, "progress": "not_started"}
                    for step in self.steps
                ],
            }

        # ensure that steps have unique names
        if not self._check_unique_step_names(self.steps):
            raise NonUniqueStepsError

        if formalities:
            self.formalities = formalities
            for formality in self.formalities:
                # ensure that each formality entry is associated with a user
                if "username" not in formality:
                    raise MissingKeyError(
                        "Missing key 'username' in formalities dictionary",
                        "username",
                        "formalities",
                    )

                # ensure that the username is also a partner of the plan
                if not (
                    formality["username"] in self.partners
                    or formality["username"] == self.author
                ):
                    raise ValueError(
                        "username '{}' in formalities is not a partner of the plan".format(
                            formality["username"]
                        )
                    )

                # ensure that any other values are of type bool or None
                for attr, value in formality.items():
                    if attr != "username":
                        if not isinstance(value, (bool, type(None))):
                            raise TypeError(
                                "expected type 'bool|None' for attribute 'formalitites[{}]', got {} instead".format(
                                    attr, type(value)
                                )
                            )
        else:
            self.formalities = []

        self.workload = 0

        # set workload as sum of workload of steps
        # and set timestamps/duration from minimal timestamp_from
        # and maximal timestamp_to of steps
        from_timestamps = []
        to_timestamps = []
        for step in self.steps:
            self.workload += step.workload
            if step.timestamp_from:
                from_timestamps.append(step.timestamp_from)
            if step.timestamp_to:
                to_timestamps.append(step.timestamp_to)
        self.timestamp_from = min(from_timestamps, default=None)
        self.timestamp_to = max(to_timestamps, default=None)
        if self.timestamp_from and self.timestamp_to:
            self.duration = self.timestamp_to - self.timestamp_from
        else:
            self.duration = None

    def to_dict(self) -> Dict:
        """
        Serialize the attributes of this `VEPlan` into a dictionary.
        Calls `to_dict` on every step in the steps-list, on every
        target group in the audience list, on all institutions and on
        all lectures to serialize those as well.

        The duration-attribute will be transformed from a `datetime.timedelta`
        object into an integer representing this timespan in total seconds.
        """

        return {
            "_id": self._id,
            "author": self.author,
            "read_access": self.read_access,
            "write_access": self.write_access,
            "creation_timestamp": self.creation_timestamp,
            "last_modified": self.last_modified,
            "name": self.name,
            "partners": self.partners,
            "institutions": [
                institution.to_dict() for institution in self.institutions
            ],
            "topics": self.topics,
            "lectures": [lecture.to_dict() for lecture in self.lectures],
            "major_learning_goals": self.major_learning_goals,
            "individual_learning_goals": [
                individual_learning_goal.to_dict()
                for individual_learning_goal in self.individual_learning_goals
            ],
            "methodical_approaches": self.methodical_approaches,
            "audience": [target_group.to_dict() for target_group in self.audience],
            "languages": self.languages,
            "evaluation": [evaluation.to_dict() for evaluation in self.evaluation],
            "timestamp_from": self.timestamp_from,
            "timestamp_to": self.timestamp_to,
            "involved_parties": self.involved_parties,
            "realization": self.realization,
            "physical_mobility": self.physical_mobility,
            "physical_mobilities": [
                physical_mobility.to_dict()
                for physical_mobility in self.physical_mobilities
            ],
            "learning_env": self.learning_env,
            "new_content": self.new_content,
            "formalities": [formality for formality in self.formalities],
            "duration": self.duration.total_seconds() if self.duration else None,
            "workload": self.workload,
            "steps": [step.to_dict() for step in self.steps],
            "is_good_practise": self.is_good_practise,
            "abstract": self.abstract,
            "underlying_ve_model": self.underlying_ve_model,
            "reflection": self.reflection,
            "good_practise_evaluation": self.good_practise_evaluation,
            "literature": self.literature,
            "evaluation_file": self.evaluation_file,
            "literature_files": self.literature_files,
            "progress": self.progress,
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
        This dictionary has to atleast contain all the keys that can be presented to `__init__`,
        however their values may be None, except for formalities (this dict has to contain the keys
        "technology" and "exam_regulations", but their values can be None again).
        Note that `steps` is a list of
        dictionaries that in turn have to satisfy the `from_dict()` method
        of the `Step` class. The steps inside a VEPlan have to have unique names!
        Same thing applies for the audience list. This list has to contain dictionaries that
        satisfy `TargetGroup.from_dict()` and also have to have unique "title"-attributes.
        `institutions` and `lectures` work exactly analogous, but there are no uniqueness-constraints.

        Optionally, a `"_id"`-key may be supplied, indicating that an existing VEPlan is supposed
        to be referenced (e.g. update the plan), otherwise a fresh _id will be created on
        initialization.
        However, initializing this class (either by this method or also manually) does not interact
        with the actual resources in the database since it is simply a model,
        to get VEPlans with the actual data in them, use the `VEPlanResource` class.

        Returns an instance of `VEPlan`.

        Raises `TypeError` if params is not a dictionary or if any of the values in the
        dictionary have to wrong type.

        Raises `MissingKeyError` if an expected key is missing in the dictionary.

        Raises `InvalidId` if the optionally supplied _id is no matching the expected format
        for `bson.ObjectId`.

        Raises `NonUniqueStepsError` if the names of the steps in the `steps`-list are not
        unique to each other.

        Raises `NonUniqueTasksError` if the tasks in the steps are not unique to
        each other.

        Usage example::

            plan = VEPlan.from_dict(params)

        Params example::

            params = {
                "_id": "object_id_str",
                "name": None,
                "partners": [],
                "institutions": [
                    {
                        "_id": "object_id_str",
                        "name": None,
                        "school_type": None,
                        "country": None,
                        "departments": [],
                    }
                ],
                "topics": [],
                "lectures": [
                    {
                        "_id": "object_id_str",
                        "name": None,
                        "lecture_format": None,
                        "lecture_type": None,
                        "participants_amount": 0,
                    }
                ],
                "major_learning_goals": [],
                "individual_learning_goals": [
                    {
                        "_id": "object_id_str",
                        "username": None,
                        "learning_goal": None,
                    }
                ],
                "methodical_approaches": [],
                "audience": [
                    {
                        "_id": "object_id_str",
                        "name": None,
                        "age_min": 0,
                        "age_max": 99,
                        "experience": None,
                        "academic_course": None,
                        "languages": None,
                    }
                ],
                "languages": [],
                "evaluation": [
                    {
                        "_id": "object_id_str",
                        "username": None,
                        "is_graded": False,
                        "task_type": None,
                        "assessment_type": None,
                        "evaluation_while": None,
                        "evaluation_after": None,
                    }
                ],
                "involved_parties": [],
                "realization": None,
                "physical_mobility": True,
                "physical_mobilities": [
                    {
                        "_id": "object_id_str",
                        "location": None,
                        "timestamp_from": None,
                        "timestamp_to": None,
                    }
                ],
                "learning_env": None,
                "new_content": None,
                "formalities": [{
                    "username": "partnerX",
                    "technology": None|True|False,
                    "exam_regulations": None|True|False,
                }],
                "steps": [
                    {
                        "_id": "object_id_str",
                        "name": None,
                        "workload": 0,
                        "timestamp_from": None,
                        "timestamp_to": None,
                        "learning_goal": None,
                        "has_tasks": False,
                        "tasks": [
                            {
                                "_id": "object_id_str",
                                "task_formulation": None,
                                "work_mode": None,
                                "description": None,
                                "tools": [],
                                "materials": [],
                            }
                        ],
                        "evaluation_tools": [],
                        "attachments": [],
                        "custom_attributes": {},
                    }
                ],
                "is_good_practise": True,
                "abstract": None,
                "underlying_ve_model": None,
                "reflection": None,
                "good_practise_evaluation": None,
                "literature": None,
                "evaluation_file": {                // or None instead
                    "file_id": "<object_id_str>",
                    "file_name": "test",
                },
                "literature_files": [               // or None instead
                    {
                        "file_id": "<object_id_str>",
                        "file_name": "test",
                    }
                ],
                "progress": {
                    "name": "<completed|uncompleted|not_started>",
                    "institutions": "<completed|uncompleted|not_started>",
                    "topics": "<completed|uncompleted|not_started>",
                    "lectures": "<completed|uncompleted|not_started>",
                    "learning_goals": "<completed|uncompleted|not_started>",
                    "methodical_approaches": "<completed|uncompleted|not_started>",
                    "audience": "<completed|uncompleted|not_started>",
                    "languages": "<completed|uncompleted|not_started>",
                    "evaluation": "<completed|uncompleted|not_started>",
                    "involved_parties": "<completed|uncompleted|not_started>",
                    "realization": "<completed|uncompleted|not_started>",
                    "learning_env": "<completed|uncompleted|not_started>",
                    "new_content": "<completed|uncompleted|not_started>",
                    "formalities": "<completed|uncompleted|not_started>",
                    "steps": "<completed|uncompleted|not_started>",
                },
            }
        """

        if not isinstance(params, dict):
            raise TypeError(
                "Expecting type 'dict' of params, got {}".format(type(params))
            )

        # ensure all necessary keys are in the dict
        for expected_key in cls.EXPECTED_DICT_ENTRIES.keys():
            if expected_key not in params:
                raise MissingKeyError(
                    "Missing key {} in {} dictionary".format(
                        expected_key, cls.__name__
                    ),
                    expected_key,
                    cls.__name__,
                )

        # delete any keys from params that are not expected to avoid having
        # any other additional attributes that might cause trouble
        # (e.g. on serialization).
        # but we also have to allow system derived attributes like _id or the author.
        for key in list(params.keys()):
            if key not in [
                *cls.EXPECTED_DICT_ENTRIES.keys(),
                *[
                    "_id",
                    "author",
                    "read_access",
                    "write_access",
                    "creation_timestamp",
                    "last_modified",
                ],
            ]:
                del params[key]

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

        # handle files
        if "evaluation_file" in params and params["evaluation_file"] is not None:
            if any(
                [
                    key not in params["evaluation_file"]
                    for key in ["file_id", "file_name"]
                ]
            ):
                raise MissingKeyError(
                    "Missing a key in evaluation_file dictionary",
                    "file or filename",
                    "evaluation_file",
                )
            params["evaluation_file"]["file_id"] = util.parse_object_id(
                params["evaluation_file"]["file_id"]
            )
        if "literature_files" in params and params["literature_files"] is not None:
            for literature_file in params["literature_files"]:
                if any(
                    [key not in literature_file for key in ["file_id", "file_name"]]
                ):
                    raise MissingKeyError(
                        "Missing a key in literature_files dictionary",
                        "file or filename",
                        "literature_files",
                    )
                literature_file["file_id"] = util.parse_object_id(
                    literature_file["file_id"]
                )

        # if present, handle correct type of creation and modified timestamps
        if "creation_timestamp" in params:
            params["creation_timestamp"] = util.parse_datetime(
                params["creation_timestamp"]
            )
        if "last_modified" in params:
            params["last_modified"] = util.parse_datetime(params["last_modified"])

        # handle correct type of formalities
        if "formalities" in params:
            for formality in params["formalities"]:
                # ensure that each formality entry is associated with a user
                if "username" not in formality:
                    raise MissingKeyError(
                        "Missing key 'username' in formalities dictionary",
                        "username",
                        "formalities",
                    )

                # ensure that the username is also a partner of the plan
                if "author" not in params:
                    params["author"] = None
                if not (
                    formality["username"] in params["partners"]
                    or formality["username"] == params["author"]
                ):
                    raise ValueError(
                        "username '{}' in formalities is not a partner of the plan".format(
                            formality["username"]
                        )
                    )

                # ensure that any other values are of type bool or None
                for attr, value in formality.items():
                    if attr != "username":
                        if not isinstance(value, (bool, type(None))):
                            raise TypeError(
                                "expected type 'bool|None' for attribute 'formalitites[{}]', got {} instead".format(
                                    attr, type(value)
                                )
                            )

        # build step objects, asserting that the names of the steps are unique,
        # gotta do this manually, since __dict__.update doesn't initialize nested objects
        steps = [Step.from_dict(step) for step in params["steps"]]
        if not cls._check_unique_step_names(steps):
            raise NonUniqueStepsError
        del params["steps"]

        # also build the audience manually
        audience = [
            TargetGroup.from_dict(target_group_dict)
            for target_group_dict in params["audience"]
        ]
        del params["audience"]

        # also build the institutions
        institutions = [
            Institution.from_dict(institution) for institution in params["institutions"]
        ]
        del params["institutions"]

        # also build the physical_mobilities
        physical_mobilities = [
            PhysicalMobility.from_dict(physical_mobility)
            for physical_mobility in params["physical_mobilities"]
        ]
        del params["physical_mobilities"]

        # also build the evaluations
        evaluations = [
            Evaluation.from_dict(evaluation) for evaluation in params["evaluation"]
        ]
        del params["evaluation"]

        # also build the individual learning goals
        individual_learning_goals = [
            IndividualLearningGoal.from_dict(individual_learning_goal)
            for individual_learning_goal in params["individual_learning_goals"]
        ]
        del params["individual_learning_goals"]

        # last but not least, build lectures
        lectures = [Lecture.from_dict(lecture) for lecture in params["lectures"]]
        del params["lectures"]

        # compute duration and workload as sum of duration/workload of steps
        # and set timestamp_from and timestamp_to as min/max timestamps of steps
        # to get start and end point for duration
        params["duration"] = timedelta()
        params["workload"] = 0
        from_timestamps = []
        to_timestamps = []
        for step in steps:
            params["duration"] += step.duration if step.duration else timedelta()
            params["workload"] += step.workload if step.workload else 0
            if step.timestamp_from:
                from_timestamps.append(step.timestamp_from)
            if step.timestamp_to:
                to_timestamps.append(step.timestamp_to)
        params["timestamp_from"] = min(from_timestamps, default=None)
        params["timestamp_to"] = max(to_timestamps, default=None)

        # duration was calculated as sum of step durations and
        # the start/end timestamp as min/max of step timestamps.
        # if they are not the same timedelta, there might have been some
        # semantic error at the step timestamps, e.g. end before start

        # if params["timestamp_to"] and params["timestamp_from"]:
        #   if params["duration"] != (
        #      params["timestamp_to"] - params["timestamp_from"]
        # ):
        #    raise ValueError(
        #       """
        #      duration and min/max timestamps do not match,
        #     maybe mixed up Step timestamps?
        #    """
        # )

        # build VEPlan and set remaining values
        instance = cls(
            steps=steps,
            audience=audience,
            institutions=institutions,
            evaluation=evaluations,
            individual_learning_goals=individual_learning_goals,
            lectures=lectures,
            physical_mobilities=physical_mobilities,
        )
        instance.__dict__.update(params)
        return instance


if __name__ == "__main__":
    pass
