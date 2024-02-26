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
        """
        initialize a `Task`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `"title"`, `"description"`, `"learning_goal"`, `"tools"`.
        However values are not required, any attributes may be
        initialized with None (title/description/learning_goal) or [] (tools).

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
        "social_form": (str, type(None)),
        "learning_env": (str, type(None)),
        "ve_approach": (str, type(None)),
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
        social_form: str = None,
        learning_env: str = None,
        ve_approach: str = None,
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

        self.social_form = social_form
        self.learning_env = learning_env
        self.ve_approach = ve_approach

        self.tasks = tasks

        # ensure that tasks have unique titles
        if not self._check_unique_task_titles(self.tasks):
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
            "social_form": self.social_form,
            "learning_env": self.learning_env,
            "ve_approach": self.ve_approach,
            "tasks": [task.to_dict() for task in self.tasks],
            "evaluation_tools": self.evaluation_tools,
            "attachments": self.attachments,
            "custom_attributes": self.custom_attributes,
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
        `"learning_goal"`, `"tasks"`, `"attachments"`, `"custom_attributes"`.
        However only `name` requires a value, all other attributes may be
        initialized with None (description/learning_goal), 0 (duration/workload)
        or [] (tasks/attachements).

        If tasks are supplied, they have to be in a list of dictionary-representations
        that are parseable by `Task.from_dict()`. Additionally, those tasks have to have
        unique `"title"`-attributes within this step.

        The `attachments`-key is a list containing ObjectId's which are
        references to files that are stored separately in GridFS.

        Returns an instance of `Step`.

        Raises `TypeError` if params is not a dictionary, or any of the values in the
        dict have the wrong type.

        Raises `MissingKeyError` if any of the required keys is missing in the `params`-dict.

        Raises `NonUniqueTasksError` if the titles of tasks are not unique to each other.

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
        if not cls._check_unique_task_titles(tasks):
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
        # "_id": (str, ObjectId, type(None)),
        "name": (str, type(None)),
        "age_min": (int, str, type(None)),
        "age_max": (int, str, type(None)),
        "experience": (str, type(None)),
        "academic_course": (str, type(None)),
        "mother_tongue": str,
        "foreign_languages": (dict, str, type(None)),
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        name: str = None,
        age_min: int | str = None,
        age_max: int | str = None,
        experience: str = None,
        academic_course: str = None,
        mother_tongue: str = None,
        foreign_languages: Dict[str, str] | str = None,
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
        self.mother_tongue = mother_tongue
        self.foreign_languages = foreign_languages

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
            "mother_tongue": self.mother_tongue,
            "foreign_languages": self.foreign_languages,
        }

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> TargetGroup:
        """
        initialize a `TargetGroup`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `"name"`, `"age_min"`, `"age_max"`, `"experience"`, `"academic_course"`,
        `"mother_tongue"`, `"foreign_languages"`.
        However values are not required, any attributes may be
        initialized with None (name/experience/academic_course/mother_tongue),
        0 (age_min/age_max) or {} (foreign_languages).

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
        "academic_courses": list,
    }

    def __init__(
        self,
        _id: str | ObjectId = None,
        name: str = None,
        school_type: str = None,
        country: str = None,
        departments: List[str] = [],
        academic_courses: List[str] = [],
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
        in the database since it is simply a model; to get Institutions with the
        actual data in them, use the `VEPlanResource` class.
        """

        # ensure _id becomes type ObjectId, either using the given value or
        # creating a fresh ID
        self._id = util.parse_object_id(_id) if _id != None else ObjectId()

        self.name = name
        self.school_type = school_type
        self.country = country
        self.departments = departments
        self.academic_courses = academic_courses

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
            "academic_courses": self.academic_courses,
        }

    @classmethod
    def from_dict(cls, params: Dict[str, Any]) -> Institution:
        """
        initialize an `Institution`-object from a dictionary (`params`).
        All of the followings keys have to be present in the dict:
        `"name"`, `"school_type"`, `"country"`, `"departments"`,
        `"academic_courses"`.
        However no values are required, any attributes may be
        initialized with None (name/school_type/country) or [] (departments,
        academic_courses).

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
        "learning_goals": list,
        "audience": list,
        "languages": list,
        "involved_parties": list,
        "realization": (str, type(None)),
        "learning_env": (str, type(None)),
        "tools": list,
        "new_content": (bool, type(None)),
        "formalities": list,
        "steps": list,
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
        learning_goals: List[str] = [],
        audience: List[TargetGroup] = [],
        languages: List[str] = [],
        involved_parties: List[str] = [],
        realization: str = None,
        learning_env: str = None,
        tools: List[str] = [],
        new_content: bool = None,
        formalities: list = [],
        steps: List[Step] = [],
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
        self.learning_goals = learning_goals
        self.audience = audience
        self.languages = languages
        self.involved_parties = involved_parties
        self.realization = realization
        self.learning_env = learning_env
        self.tools = tools
        self.new_content = new_content
        self.steps = steps

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
                "audience": "not_started",
                "languages": "not_started",
                "involved_parties": "not_started",
                "realization": "not_started",
                "learning_env": "not_started",
                "tools": "not_started",
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
            "learning_goals": self.learning_goals,
            "audience": [target_group.to_dict() for target_group in self.audience],
            "languages": self.languages,
            "timestamp_from": self.timestamp_from,
            "timestamp_to": self.timestamp_to,
            "involved_parties": self.involved_parties,
            "realization": self.realization,
            "learning_env": self.learning_env,
            "tools": self.tools,
            "new_content": self.new_content,
            "formalities": [formality for formality in self.formalities],
            "duration": self.duration.total_seconds() if self.duration else None,
            "workload": self.workload,
            "steps": [step.to_dict() for step in self.steps],
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

        Raises `NonUniqueTasksError` if the titles of tasks in the steps are not unique to
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
                        "academic_courses": [],
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
                "learning_goals": [],
                "audience": [
                    {
                        "_id": "object_id_str",
                        "name": None,
                        "age_min": 0,
                        "age_max": 99,
                        "experience": None,
                        "academic_course": None,
                        "mother_tongue": None,
                        "foreign_languages": {},
                    }
                ],
                "languages": [],
                "involved_parties": [],
                "realization": None,
                "learning_env": None,
                "tools": [],
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
                        "social_form": None,
                        "learning_env": None,
                        "ve_approach": None,
                        "tasks": [
                            {
                                "_id": "object_id_str",
                                "title": None,
                                "description": None,
                                "learning_goal": None,
                                "tools": [],
                            }
                        ],
                        "evaluation_tools": [],
                        "attachments": [],
                        "custom_attributes": {},
                    }
                ],
                "progress": {
                    "name": "<completed|uncompleted|not_started>",
                    "institutions": "<completed|uncompleted|not_started>",
                    "topics": "<completed|uncompleted|not_started>",
                    "lectures": "<completed|uncompleted|not_started>",
                    "learning_goals": "<completed|uncompleted|not_started>",
                    "audience": "<completed|uncompleted|not_started>",
                    "languages": "<completed|uncompleted|not_started>",
                    "involved_parties": "<completed|uncompleted|not_started>",
                    "realization": "<completed|uncompleted|not_started>",
                    "learning_env": "<completed|uncompleted|not_started>",
                    "tools": "<completed|uncompleted|not_started>",
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
            steps=steps, audience=audience, institutions=institutions, lectures=lectures
        )
        instance.__dict__.update(params)
        return instance


if __name__ == "__main__":
    pass
