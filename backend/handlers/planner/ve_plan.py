import datetime
import json
import logging
from typing import Any, Dict, List, Literal, Optional

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.database import Database
import tornado.web

from error_reasons import (
    FILE_DOESNT_EXIST,
    INSUFFICIENT_PERMISSIONS,
    MAXIMUM_FILES_EXCEEDED,
    MISSING_KEY_IN_HTTP_BODY_SLUG,
    MISSING_KEY_SLUG,
    NON_UNIQUE_STEP_NAMES,
    NON_UNIQUE_TASKS,
    PLAN_ALREADY_EXISTS,
    PLAN_DOESNT_EXIST,
    PLAN_LOCKED,
)
from exceptions import (
    FileDoesntExistError,
    MaximumFilesExceededError,
    MissingKeyError,
    NoReadAccessError,
    NoWriteAccessError,
    NonUniqueStepsError,
    NonUniqueTasksError,
    PlanAlreadyExistsError,
    PlanDoesntExistError,
)
import global_vars
from handlers.base_handler import auth_needed, BaseHandler
from model import Evaluation, IndividualLearningGoal, Step, VEPlan
from resources.network.profile import Profiles
from resources.notifications import NotificationResource
from resources.planner.etherpad_integration import EtherpadResouce
from resources.planner.ve_plan import VEPlanResource
from xml.etree.ElementTree import ElementTree
import util

import os
import zipfile
from io import BytesIO
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)


class VEPlanHandler(BaseHandler):
    def options(self, slug):
        # no body
        self.set_status(200)
        self.finish()

    def _check_lock_is_held(self, plan_id: str | ObjectId) -> bool:
        """
        check if the current user is currently holding the lock for the plan
        and is therefore entitled to make changes to it.

        :param plan_id: the id of the plan in str or ObjectId representation

        Returns `True` if the lock is held by the user, `False` otherwise
        """

        plan_id = util.parse_object_id(plan_id)

        # nobody currently holds a lock at all
        if plan_id not in global_vars.plan_write_lock_map:
            return False

        # check if the username of the lock holder matches the current user
        # and if so, the lock has to be not yet expired
        if (
                global_vars.plan_write_lock_map[plan_id]["username"]
                == self.current_user.username
        ):
            return (
                    global_vars.plan_write_lock_map[plan_id]["expires"]
                    > datetime.datetime.now()
            )

    def _get_lock_holder(self, plan_id: str | ObjectId) -> str | None:
        """
        get the username of the user who is currently holding the lock for the plan,
        if there is any. If the plan is not locked, return None.

        :param plan_id: the id of the plan in str or ObjectId representation

        Returns the username of the lock holder
        """

        plan_id = util.parse_object_id(plan_id)

        if plan_id not in global_vars.plan_write_lock_map:
            return None

        return global_vars.plan_write_lock_map[plan_id]["username"]

    def _extend_lock(self, plan_id: str | ObjectId) -> None:
        """
        extend the lock of the plan that the current user is holding
        """

        plan_id = util.parse_object_id(plan_id)

        try:
            # extend the lock by 1 hour
            global_vars.plan_write_lock_map[plan_id][
                "expires"
            ] = datetime.datetime.now() + datetime.timedelta(hours=1)
        except KeyError:
            # if the plan is not locked, do nothing
            pass

    def _release_lock(self, plan_id: str | ObjectId) -> None:
        """
        release the lock of the plan that the current user is holding
        """

        plan_id = util.parse_object_id(plan_id)

        # only release the lock if the user is actually holding it
        if not self._check_lock_is_held(plan_id):
            return

        try:
            del global_vars.plan_write_lock_map[plan_id]
        except KeyError:
            # if the plan is not locked, do nothing
            pass

    @auth_needed
    def get(self, slug):
        """
        GET /planner/get
            request a plan by specifying its id

            query params:
                _id: the _id of the plan as str (24 bit hex str)

            http body:

            returns:
                200 OK,
                (the plan in its dictionary representation (= product of
                `to_dict()` of `VEPlan` instance))
                {"success": True,
                 "plan": <VEPlan.to_dict()>}

                400 Bad Request
                (the request misses the _id query parameter)
                {"success": False,
                 "reason": "missing_key:_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you don't have read access to the plan)
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                (no plan was found with the given _id)
                {"success": False,
                 "reason": "plan_doesnt_exist"}

        GET /planner/get_available
            request all plans that are available to the current user,
            i.e. their own plans and those that he/she has read or write
            access to and those that are marked as good practise examples
            (read only).

            query params:
                filter_gp: <true|false>, if true, only return good practise examples
                filter_access: <all|own|shared>, if "all", return all plans that i have access to (default),
                    if "own", return only my own plans, if "shared", return only plans that i have gotten read/write access to
                query: <str>, if given, only return plans that contain the query in their name, topics or abstract
                limit: <int>, if given, limit the amount of returned plans to this number (default 10)
                offset: <int>, if given, skip this amount of plans before returning the results (default 0)
                sort: <name|last_modified|creation_timestamp> sort by given proerty
                order: <-1|1> order DESC or ASC

            http body:

            returns:
                200 OK,
                (the plans in a list of their dictionary representation
                (= product of `to_dict()` of `VEPlan` instance))
                {"success": True,
                 "plans": [<VEPlan.to_dict()>, ...]}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

        GET /planner/get_good_practise
            request all plans that are marked as good practise examples

            query params:

            http body:

            returns:
                200 OK,
                (the plans in a list of their dictionary representation
                (= product of `to_dict()` of `VEPlan` instance))
                {"success": True,
                 "plans": [<VEPlan.to_dict()>, ...]}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

        GET /planner/get_all
            request all plans, requires admin privileges

            query params:

            http body:

            returns:
                200 OK,
                (the plans in a list of their dictionary representation
                (= product of `to_dict()` of `VEPlan` instance))
                {"success": True,
                 "plans": [<VEPlan.to_dict()>, ...]}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you are not an admin)
                {"success": False,
                 "reason": "insufficient_permissions"}

        GET /planner/get_scorm_zip
            request plan in scorm format compressed as zip

            query params:
                _id: the _id of the plan as str (24 bit hex str)

            http body:

            returns:
                200 OK,
                (the plan in scorm format zipped
                (= product of `to_dict()` of `VEPlan` instance))
                {"success": True,
                 "zip": FileResponse(zipfile)}

                400 Bad Request
                (the request misses the _id query parameter)
                {"success": False,
                 "reason": "missing_key:_id"}
        """

        with util.get_mongodb() as db:
            if slug == "get":
                try:
                    _id = self.get_argument("_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write({"success": False, "reason": MISSING_KEY_SLUG + "_id"})
                    return

                self.get_plan_by_id(db, _id)
                return

            elif slug == "get_available":
                filter_good_practice_only = self.get_argument("filter_gp", False)
                filter_access = self.get_argument("filter_access", "all")
                if filter_access not in ["all", "own", "shared"]:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": "invalid_filter_access_value",
                        }
                    )
                    return
                query = self.get_argument("query", None)
                limit = int(self.get_argument("limit", 10))
                offset = int(self.get_argument("offset", 0))
                sort = self.get_argument("sort_by", 'last_modified')
                order = int(self.get_argument("order", -1))

                self.get_available_plans_for_user(
                    db, filter_good_practice_only, filter_access, query, limit, offset, sort, order
                )
                return

            elif slug == "get_good_practise":
                self.get_good_practise_plans(db)
                return

            elif slug == "get_public_of_user":
                try:
                    username = self.get_argument("username")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write(
                        {"success": False, "reason": MISSING_KEY_SLUG + "username"}
                    )
                    return

                self.get_public_plans_of_user(db, username)
                return

            elif slug == "get_all":
                self.get_all_plans(db)
                return

            elif slug == "get_scorm_zip":
                try:
                    _id = self.get_argument("_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write({"success": False, "reason": MISSING_KEY_SLUG + "_id"})
                    return
                self.get_scorm_files(_id)
                return

            else:
                self.set_status(404)

    @auth_needed
    async def post(self, slug):
        """
        POST /planner/insert
            insert a new plan into the db. To do this, the safest approach is
            to omit any _id fields (not only for the plan itself, but also for steps,
            tasks, target_groups, institutions and lectures) and let the system create them.

            HTTP Body:
                Supply a JSON containing the dictionary representation of a `VEPlan`,
                i.e. it must be parseable by `VEPlan.from_dict()`.
                Example:
                    {
                        "name": "test",
                        "partners": ["username1", "username2"],
                        "institutions": [
                            {
                                "_id": "<object_id_str>",
                                "name": "test",
                                "school_type": "test",
                                "country": "test",
                                "department": "test",
                            }
                        ],
                        "topic": "test",
                        "lectures": [
                            {
                                "_id": "object_id_str",
                                "name": None,
                                "lecture_format": None,
                                "lecture_type": None,
                                "participants_amount": 0,
                            }
                        ],
                        "major_learning_goals": ["test"],
                        "individual_learning_goals": [
                            {
                                "username": "username1",
                                "learning_goal": "test",
                            }
                        ],
                        "methodical_approaches": ["test"],
                        "target_groups": [
                            {
                                "name": "test",
                                "semester": "test",
                                "experience": "test",
                                "academic_course": "test",
                                "languages": ["test"],
                            }
                        ],
                        "languages": ["test"],
                        "evaluation": [
                            {
                                "username": "username1",
                                "is_graded": True,
                                "task_type": "test",
                                "assessment_type": "test",
                                "evaluation_before": "test",
                                "evaluation_while": "test",
                                "evaluation_after": "test",
                            }
                        ],
                        "involved_parties": ["test"],
                        "realization": "test",
                        "physical_mobility": True,
                        "physical_mobilities": [
                            {
                                "location": "test",
                                "timestamp_from": "2000-01-01",
                                "timestamp_to": "2000-01-08",
                            }
                        ],
                        "learning_env": "test",
                        "tools": ["test"],
                        "checklist": {{
                            "username": "username1",
                            "technology": False,
                            "exam_regulations": False,
                        }},
                        "steps": [
                            {
                                "name": "test",
                                "workload": 10,
                                "timestamp_from": "2000-01-01",
                                "timestamp_to": "2000-01-08",
                                "learning_goal": "test",
                                "learning_activity": "test",
                                "has_tasks": False,
                                "tasks": [
                                    {
                                        "task_formulation": "test",
                                        "work_mode": "test",
                                        "notes": "test",
                                        "tools": ["test"],
                                        "materials": ["test"]
                                    }
                                ],
                                "original_plan": "<object_id_str>"
                            }
                        ],
                        "is_good_practise": True,
                        "is_good_practise_planned": True,
                        "is_good_practise_ro": True,
                        "abstract": "test",
                        "underlying_ve_model": "test",
                        "reflection": "test",
                        "literature": "test",
                        "evaluation_file": {                // or None instead
                            "file_id": "<object_id_str>",
                            "file_name": "test",
                        },
                        "literature_files": [               // max 5
                            {
                                "file_id": "<object_id_str>",
                                "file_name": "test",
                            },
                        ],
                        ]
                        "progress": {
                            "name": "<completed|uncompleted|not_started>",
                            "institutions": "<completed|uncompleted|not_started>",
                            "topic": "<completed|uncompleted|not_started>",
                            "lectures": "<completed|uncompleted|not_started>",
                            "learning_goals": "<completed|uncompleted|not_started>",
                            "methodical_approaches": "<completed|uncompleted|not_started>",
                            "target_groups": "<completed|uncompleted|not_started>",
                            "languages": "<completed|uncompleted|not_started>",
                            "evaluation": "<completed|uncompleted|not_started>",
                            "involved_parties": "<completed|uncompleted|not_started>",
                            "realization": "<completed|uncompleted|not_started>",
                            "learning_env": "<completed|uncompleted|not_started>",
                            "tools": "<completed|uncompleted|not_started>",
                            "checklist": "<completed|uncompleted|not_started>",
                            "steps": "<completed|uncompleted|not_started>",
                        },
                    }

                The only really necessary values are the "name"-keys of the steps and the "task_formulation"-keys
                of tasks, they have to be unique to each other in this list, otherwise an error is thrown.
                Any other base attribute may have a null, or in case of a list, a [] value (the
                keys of complex attributes like "target_groups" should be supplied nonetheless, only
                primitive attributes are meant).

                Keep in mind, that some plan attributes are derived from it's steps (timestamp_from,
                timestamp_to, workload, duration) or generally system derived (creation_timestamp,
                last_modified) and should therefore not be included.

                The attachments list of a step is somewhat special, as this list holds references
                to uploaded files, but not the files directly. Upload the files separately
                using the (TODO endpoint)-endpoint to get their inserted _id's and use them
                here to reference those files in the plan.

                Check the documentation of `VEPlan` and especially `VEPlan.from_dict()`,
                as this function will be invoked by this handler to assure the correct format.

            returns:
                200 OK,
                (insert successful, contains the inserted _id)
                {"success": True,
                 "inserted_id": str}

                400 Bad Request
                (the http does not contain valid json)
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                (the http misses a required key, i.e. your plan is missing a
                 required attribute)
                {"success": False,
                 "reason": "missing_key_in_http_body:<missing_key>"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                (The names of the steps in the http body are not unique)
                {"success": False,
                 "reason": "non_unique_step_names"}

                409 Conflict
                (A plan with the same _id already exists in the db. This might only
                 happen if you choose to include ObjectId's yourself, which is strongly
                 discouraged.)
                {"success": False,
                 "reason": "plan_already_exists"}


        POST /planner/insert_empty
            Insert an fresh empty plan into the db and return its _id to work with further.
            This endpoint is usually used by the plan to initiate a new planning process by
            a user.
            The only automation that is already applied is that the author is added to the
            `partners` field an in-turn the partners-dependent fields `evaluation`,
            `individual_learning_goals` and `checklist` are also initiated (empty) for the author.

            query params:
                None

            http body:
                None required, however the fresh plan can already be given a name by supplying
                the following JSON:
                    {
                        "name": "<name_of_the_plan>"
                    }

            returns:
                200 OK,
                (insert successful, contains the inserted _id)
                {"success": True,
                 "inserted_id": str}

                400 Bad Request
                (the http does not contain valid json)
                {"success": False,
                 "reason": "json_parsing_error"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}



        POST /planner/update_full
            update an existing plan by overwriting all attributes, i.e. the HTTP body has to
            contain all required attributes and the plan will be fully overwritten by those.
            Adding to that, your payload has to include the _id of the plan you want to update.
            _ids of other attributes (steps, tasks, target_groups, institutions, lectures) may be supplied,
            but can be omitted to be regenerated by the system (all associated linked data
            to those attributes like e.g. comments will be lost though).

            query params:
                "upsert" : <boolean>, Indicator to insert a new plan instead of updating an existing one
                                      if no match was found. If set to false and no matching plan was found,
                                      nothing will happen.
                                      default: false

            http body:
                supply a dictionary-resprentation of a `VEPlan`, i.e.
                parseable by `VEPlan.from_dict()`, including an _id
                Minimal example:
                    {
                        "_id": "<object_id_str>",
                        "name": "test",
                        "partners": ["username1", "username2"],
                        "institutions": [
                            {
                                "_id": "<object_id_str>",
                                "name": "test",
                                "school_type": "test",
                                "country": "test",
                                "department": "test",
                            }
                        ],
                        "topic": "test",
                        "lectures": [
                            {
                                "_id": "object_id_str",
                                "name": None,
                                "lecture_format": None,
                                "lecture_type": None,
                                "participants_amount": 0,
                            }
                        ],
                        "major_learning_goals": ["test"],
                        "individual_learning_goals": [
                            {
                                "username": "username1",
                                "learning_goal": "test",
                            }
                        ],
                        "methodical_approaches": ["test"],
                        "target_groups": [
                            {
                                "name": "test",
                                "semester": "test",
                                "experience": "test",
                                "academic_course": "test",
                                "languages": ["test"],
                            }
                        ],
                        "languages": ["test"],
                        "evaluation": [
                            {
                                "username": "username1",
                                "is_graded": True,
                                "task_type": "test",
                                "assessment_type": "test",
                                "evaluation_before": "test",
                                "evaluation_while": "test",
                                "evaluation_after": "test",
                            }
                        ],
                        "involved_parties": ["test"],
                        "realization": "test",
                        "physical_mobility": True,
                        "physical_mobilities": [
                            {
                                "location": "test",
                                "timestamp_from": "2000-01-01",
                                "timestamp_to": "2000-01-08",
                            }
                        ],
                        "learning_env": "test",
                        "tools": ["test"],
                        "checklist": [{
                            "username": "username1",
                            "technology": False,
                            "exam_regulations": False,
                        }],
                        "steps": [
                            {
                                "name": "test",
                                "workload": 10,
                                "timestamp_from": "2000-01-01",
                                "timestamp_to": "2000-01-08",
                                "learning_goal": "test",
                                "learning_activity": "test",
                                "has_tasks": False,
                                "tasks": [
                                    {
                                        "task_formulation": "test",
                                        "work_mode": "test",
                                        "notes": "test",
                                        "tools": ["test"],
                                        "materials": ["test"]
                                    }
                                ],
                                "original_plan": "<object_id_str>"
                            }
                        ],
                        "is_good_practise": True,
                        "is_good_practise_planned": True,
                        "is_good_practise_ro": True,
                        "abstract": "test",
                        "underlying_ve_model": "test",
                        "reflection": "test",
                        "literature": "test",
                        "evaluation_file": {                // or None instead
                            "file_id": "<object_id_str>",
                            "file_name": "test",
                        },
                        "literature_files": [               // max 5
                            {
                                "file_id": "<object_id_str>",
                                "file_name": "test",
                            },
                        ],
                        "progress": {
                            "name": "<completed|uncompleted|not_started>",
                            "institutions": "<completed|uncompleted|not_started>",
                            "topic": "<completed|uncompleted|not_started>",
                            "lectures": "<completed|uncompleted|not_started>",
                            "learning_goals": "<completed|uncompleted|not_started>",
                            "methodical_approaches": "<completed|uncompleted|not_started>",
                            "target_groups": "<completed|uncompleted|not_started>",
                            "languages": "<completed|uncompleted|not_started>",
                            "evaluation": "<completed|uncompleted|not_started>",
                            "involved_parties": "<completed|uncompleted|not_started>",
                            "realization": "<completed|uncompleted|not_started>",
                            "learning_env": "<completed|uncompleted|not_started>",
                            "tools": "<completed|uncompleted|not_started>",
                            "checklist": "<completed|uncompleted|not_started>",
                            "steps": "<completed|uncompleted|not_started>",
                        },
                    }

                The only really necessary values are the "name"-keys of the steps and the "task-formulation"-keys
                of tasks, they have to be unique to each other in this list, otherwise an error is thrown.
                Any other base attribute may have a null, or in case of a list, a [] value (the
                keys of complex attributes like "target_groups" should be supplied nonetheless, only
                primitive attributes are meant).

                The attachments list is somewhat special, as this list holds references
                to uploaded files, but not the files directly. Upload the files separately
                using the (TODO endpoint)-endpoint to get their inserted _id's and use them
                here to reference those files in the plan.

                See also the documentation of `VEPlan` and especially `VEPlan.from_dict()`,
                as this function will be invoked by this handler to assure the correct format.

            returns:
                200 OK,
                (indicates if an insert or update has taken place and also includes
                the inserted or updated _id)
                {"success": True,
                 "updated_id": str}

                400 Bad Request
                (the http does not contain valid json)
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                (if supplied, the value of "_id" is not a valid ObjectId,
                should be a 24 bit hex str)
                {"success": False,
                 "reason": "invalid_object_id"}

                400 Bad Request
                (the http misses a required key)
                {"success": False,
                 "reason": "missing_key_in_http_body:<missing_key>"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you are not an admin)
                {"success": False,
                 "reason": "insufficient_permissions"}

                409 Conflict
                (The names of the steps in the http body are not unique)
                {"success": False,
                 "reason": "non_unique_step_names"}


        POST /planner/update_field
            update a single field of a VEPlan by supplying expected data via the HTTP Body.
            The values are type-checked and also semantic checks like unique step names or tasks
            are enforced with respective error messages.

            If you want to update one of the object-like attributes of a VEPlan (e.g. target_groups,
            lectures, steps, ...), pay attention to supply all of those objects in a list (as
            there are naturally multiple possible as per model), because they will be overwritten
            (i.e. if you want to append a new step, send all other already existing steps as well).
            If you want to simple append or remove new objects to/from those list,
            use the append/remove-endpoints instead.

            The only field that is not updateable via this endpoint is the `evaluation_file` attribute.
            Use /planner/put_evaluation_file instead.

            query params:
                "upsert" : <boolean>, Indicator to insert a new plan instead of updating an existing one,
                                      if no match was found. If set to false and no matching plan was found,
                                      nothing will happen.
                                      default: false

            http body:
                the body has to contain the following entries as JSON:

                {
                    "plan_id": "object_id_str",
                    "field_name": "str_identifier_of_attribute",
                    "value": "<Any corresponding value>"
                }

                e.g.
                {
                    "plan_id": "object_id_str",
                    "field_name": "realization",
                    "value": "new value"
                }
                will update the attribute "realization" to "new value".


            returns:
                200 OK,
                (indicates if an insert or update has taken place and also includes
                the inserted or updated _id)
                {"success": True,
                 "updated_id": str}

                400 Bad Request
                (the http does not contain valid json)
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                (if supplied, the value of "_id" is not a valid ObjectId,
                should be a 24 bit hex str)
                {"success": False,
                 "reason": "invalid_object_id"}

                400 Bad Request
                (the http misses a required key)
                {"success": False,
                 "reason": "missing_key_in_http_body:<missing_key>"}

                400 Bad Request
                (some of the transmitted data is malformed)
                {"success": False,
                 "reason": "TypeError:<human readable description>"}

                400 Bad Request
                (the supplied field_name does not belong to an attribute
                of VEPlan)
                {"success": False,
                 "reason": "unexpected_attribute"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                (The names of the steps in the http body are not unique)
                {"success": False,
                 "reason": "non_unique_step_names"}

                409 Conflict
                (The task_formulation of the tasks in a step in the http are not
                unique)
                {"success": False,
                 "reason": "non_unique_tasks"}

        POST /planner/update_fields
            update multiple fields of a VEPlan by supplying expected data via the HTTP Body.
            The syntax and semantics are equivalent to the /planner/update_field - endpoint,
            only that here multiple update dicts are supplied in a list in the http body and
            upserts are not allowed.

            The values are type-checked and also semantic checks like unique step names or tasks
            are enforced with respective error messages.

            If you want to update one of the object-like attributes of a VEPlan (e.g. target_groups,
            lectures, steps, ...), pay attention to supply all of those objects in a list (as
            there are naturally multiple possible as per model), because they will be overwritten
            (i.e. if you want to append a new step, send all other already existing steps as well).
            If you want to simple append or remove new objects to/from those list,
            use the append/remove-endpoints instead.

            The only field that is not updateable via this endpoint is the `evaluation_file` attribute.
            Use /planner/put_evaluation_file instead.

            Technically, one could also provide multiple update instructions to different plans
            as they are handled sequentially, though for clear structure it is not recommended.

            Note that this query does not provide an "all-or-nothing"-approach, i.e. if some update
            instructions fail due to conflicts or malformed syntax, the other successfull instructions
            will still be executed.

            query params:
                None

            http body:
                the body has to contain a list of update-instructions that each are the same
                as for the single-field-update-endpoint:
                {
                    "update": [
                        {
                            "plan_id": "object_id_str",
                            "field_name": "str_identifier_of_attribute",
                            "value": "<Any corresponding value>"
                        },
                        {
                            "plan_id": "object_id_str",
                            "field_name": "str_identifier_of_attribute",
                            "value": "<Any corresponding value>"
                        },
                    ]
                }

                e.g.
                {
                    "update": [
                        {
                            "plan_id": "object_id_str",
                            "field_name": "realization",
                            "value": "new value"
                        },
                        {
                            "plan_id": "object_id_str",
                            "field_name": "topic",
                            "value": "new value2"
                        },
                    ]
                }
                will update the attributes "realization" to "new value" and "topic" to "new value2".


            returns:
                200 OK,
                (indicates that all update instructions were successfull)
                {"success": True}

                400 Bad Request
                (the http does not contain valid json)
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                (the http misses a required key)
                {"success": False,
                 "reason": "missing_key_in_http_body:<missing_key>"}

                400 Bad Request
                (you tried to update the `evaluation_file` attribute, which is not allowed here)
                {"success": False,
                 "reason": "unsupported_field:evaluation_file"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                (Atleast one of the update instructions failed,
                 the errors list contains those that failed, possible
                 error message are the same as in the singular update field
                 endpoint)
                {"success": False,
                 "reason": "operation_errors",
                 "errors": [
                    {
                        "update_instruction": {                            --> the instruction that caused the error
                            "plan_id": "object_id_str",
                            "field_name": "str_identifier_of_attribute",
                            "value": "<Any corresponding value>"
                        },
                        "error_status_code": "<http_error_code>",
                        "error_reason": "<error_description>",
                    }
                ]}

        POST /planner/append_step
            Append a new step to an already existing plan by specifying the
            plan's id and the desired step in the http body.

            The step-object in the http body has to be parseable by
            `Step.from_dict()`. Additionally, the constraint that step names
            have to be unique within a plan is also enforced.

            query params:
                None

            http body:
                {
                    "plan_id": <id_of_plan>,
                    "step": {
                        "name": "test",
                        "workload": 10,
                        "timestamp_from": "2000-01-01",
                        "timestamp_to": "2000-01-08",
                        "learning_goal": "test",
                        "learning_activity": "test",
                        "has_tasks": False,
                        "tasks": [
                            {
                                "task_formulation": "test",
                                "work_mode": "test",
                                "notes": "test",
                                "tools": ["test"],
                                "materials": ["test"]
                            }
                        ],
                        "original_plan": "<object_id_str>"
                    }
                }

        POST /planner/put_evaluation_file
            Upload a file and store it under the given plan's `evaluation_file` attribute.
            The file will be stored in the gridfs and the plan's `evaluation_file` attribute
            will be set to the ObjectId of the uploaded file. Use this id to request the actual
            file from gridfs using the static file endpoint (`GridFSStaticFileHandler`).

            query params:
                plan_id: the id of the plan to which the file should be attached

            http body:
                the file itself, as multipart/form-data

            returns:
                200 OK
                (the file was successfully uploaded and attached to the plan)
                {"success": True}

                400 Bad Request
                (the request misses the plan_id query parameter)
                {"success": False,
                 "reason": "missing_key:plan_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you don't have write access to the plan)
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                (No plan was found with the given plan_id)
                {"success": False,
                 "reason": "plan_doesnt_exist"}

        POST /planner/put_literature_file
            Upload a file and store it in the given plan's `literature_files` attribute.
            The file will be stored in the gridfs and the plan's `literature_files` attribute
            will contain the ObjectId of the uploaded file. Use this id to request the actual
            file from gridfs using the static file endpoint (`GridFSStaticFileHandler`).

            Each plan is allowed to have up to 5 literature files attached to it.

            query params:
                plan_id: the id of the plan to which the file should be attached

            http body:
                the file itself, as multipart/form-data

            returns:
                200 OK
                (the file was successfully uploaded and attached to the plan)
                {"success": True}

                400 Bad Request
                (the request misses the plan_id query parameter)
                {"success": False,
                 "reason": "missing_key:plan_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you don't have write access to the plan)
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                (No plan was found with the given plan_id)
                {"success": False,
                 "reason": "plan_doesnt_exist"}

                409 Conflict
                (The plan already has 5 literature files attached)
                {"success": False,
                 "reason": "maximum_files_exceeded"}

                409 Conflict
                (then plan is locked, i.e. another user is currently editing it)
                {"success": False,
                 "reason": "plan_locked"}

        POST /planner/grant_access
            As the author of a plan, grant another user read and/or write access to
            this plan.

            Since write access without being able to read is quite useless, allowing write
            access always includes read access automatically.

            query params:
                None

            http body:
                {
                    "plan_id": <id_of_plan>,
                    "username": "<username_who_should_get_access>",
                    "read": "<true|false>",     --> read access will be granted if true
                    "write": "<true|false>",    --> write access will be granted if true
                }

            returns:
                200 OK
                (successfully granted access)
                {"sucess": True}

                400 Bad Request
                (the http body misses a required key)
                {"success": False,
                 "reason": "missing_key_in_http_body:<missing_key>"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you are not the author of the plan)
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                (No plan with the given id exists)
                {"success": False,
                 "reason": "plan_doesnt_exist"}

        POST /planner/revoke_access
            As the author of a plan, revoke read and/or write access to
            this plan for other users.

            Removing write access does not automatically revoke read access,
            it also has to be revoked explicitely. However the opposite applies,
            when revoking read access, write access is also automatically revoked.

            query params:
                None

            http body:
                {
                    "plan_id": <id_of_plan>,
                    "username": "<username_who_should_get_access>",
                    "read": "<true|false>",     --> read access will be revoked if true
                    "write": "<true|false>",    --> write access will be revoked if true
                }

            returns:
                200 OK
                (successfully revoked access)
                {"sucess": True}

                400 Bad Request
                (the http body misses a required key)
                {"success": False,
                 "reason": "missing_key_in_http_body:<missing_key>"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you are not the author of the plan)
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                (No plan with the given id exists)
                {"success": False,
                 "reason": "plan_doesnt_exist"}

        POST /planner/copy
            Create a copy of an existing plan and return the new plan's id.
            Copying is only possible if the user either is the author of the plan,
            has write access to it or the plan is marked as a good practise example.

            query params:
                None

            http body:
                {
                    "plan_id": "<id_of_plan>"
                }

            returns:
                200 OK
                (the plan was successfully copied)
                {"success": True,
                 "copied_id": "<id_of_new_plan>"}

                400 Bad Request
                (the http body misses a required key)
                {"success": False,
                 "reason": "missing_key_in_http_body:<missing_key>"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you don't have write access to the plan)
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                (No plan with the given id exists)
                {"success": False,
                 "reason": "plan_doesnt_exist"}
        """

        # all endpoints except file uploads require a json body
        if slug not in ["put_evaluation_file", "put_literature_file"]:
            try:
                http_body = json.loads(self.request.body)
            except json.JSONDecodeError:
                self.set_status(400)
                self.write({"success": False, "reason": "json_parsing_error"})
                return

        # check that upsert query param is either "true" or "false"
        upsert = self.get_argument("upsert", "false")
        if not (upsert == "true" or upsert == "false"):
            self.set_status(400)
            self.write(
                {
                    "success": False,
                    "reason": "invalid_query_parameter:{}".format("upsert"),
                }
            )
            return
        # transform to bool type, only the "true"-str will be interpreted
        # as True
        if upsert == "true":
            upsert = True
        else:
            upsert = False

        with util.get_mongodb() as db:
            if slug == "insert":
                plan = self.load_plan_from_http_body_or_write_error(http_body)
                if not plan:
                    return

                self.insert_plan(db, plan)
                return

            if slug == "insert_empty":
                if "name" in http_body:
                    optional_name = http_body["name"]
                else:
                    optional_name = None

                plan = VEPlan(
                    name=optional_name,
                    partners=[self.current_user.username],
                    evaluation=[Evaluation(username=self.current_user.username)],
                    individual_learning_goals=[
                        IndividualLearningGoal(username=self.current_user.username)
                    ],
                    checklist=[{"username": self.current_user.username}],
                )

                self.insert_plan(db, plan)
                return

            elif slug == "update_full":
                plan = self.load_plan_from_http_body_or_write_error(http_body)
                if not plan:
                    return
                self.update_full_plan(db, plan, upsert=upsert)
                return

            elif slug == "update_field":
                # ensure necessary keys are present
                if "plan_id" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "plan_id",
                        }
                    )
                    return
                if "field_name" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "field_name",
                        }
                    )
                    return
                if "value" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "value",
                        }
                    )
                    return

                self.update_field_in_plan(
                    db,
                    http_body["plan_id"],
                    http_body["field_name"],
                    http_body["value"],
                    upsert=upsert,
                )
                return

            elif slug == "update_fields":
                if "update" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "plan_id",
                        }
                    )
                    return
                for update_instruction in http_body["update"]:
                    # ensure necessary keys are present in each update instruction
                    if "plan_id" not in update_instruction:
                        self.set_status(400)
                        self.write(
                            {
                                "success": False,
                                "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "plan_id",
                            }
                        )
                        return
                    if "field_name" not in update_instruction:
                        self.set_status(400)
                        self.write(
                            {
                                "success": False,
                                "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "field_name",
                            }
                        )
                        return
                    if "value" not in update_instruction:
                        self.set_status(400)
                        self.write(
                            {
                                "success": False,
                                "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "value",
                            }
                        )
                        return

                self.bulk_update_fields_in_plan(
                    db,
                    http_body["update"],
                )
                return

            elif slug == "append_step":
                if "plan_id" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "plan_id",
                        }
                    )
                    return
                if "step" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "step",
                        }
                    )
                    return

                step = Step.from_dict(http_body["step"])

                self.append_step_to_plan(db, http_body["plan_id"], step)

            elif slug == "put_evaluation_file":
                try:
                    plan_id = self.get_argument("plan_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_SLUG + "plan_id",
                        }
                    )
                    return
                if (
                        "file" not in self.request.files
                        or not self.request.files["file"][0]
                ):
                    self.set_status(400)
                    self.write({"success": False, "reason": "missing_file:file"})
                    return

                file_obj = self.request.files["file"][0]
                self.put_evaluation_file(
                    plan_id,
                    file_obj["filename"],
                    file_obj["body"],
                    file_obj["content_type"],
                )
                return

            elif slug == "put_literature_file":
                try:
                    plan_id = self.get_argument("plan_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_SLUG + "plan_id",
                        }
                    )
                    return
                if (
                        "file" not in self.request.files
                        or not self.request.files["file"][0]
                ):
                    self.set_status(400)
                    self.write({"success": False, "reason": "missing_file:file"})
                    return

                file_obj = self.request.files["file"][0]
                self.put_literature_file(
                    plan_id,
                    file_obj["filename"],
                    file_obj["body"],
                    file_obj["content_type"],
                )
                return

            elif slug == "grant_access":
                if "plan_id" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "plan_id",
                        }
                    )
                    return
                if "username" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "username",
                        }
                    )
                    return
                if "read" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "read",
                        }
                    )
                    return
                if "write" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "write",
                        }
                    )
                    return

                # assert bool type in case the inputs are "true" and "false" strings
                if not isinstance(http_body["read"], bool):
                    http_body["read"] = True if http_body["read"] == "true" else False
                if not isinstance(http_body["write"], bool):
                    http_body["write"] = True if http_body["write"] == "true" else False

                await self.grant_acces_right(
                    db,
                    http_body["plan_id"],
                    http_body["username"],
                    http_body["read"],
                    http_body["write"],
                )
                return

            elif slug == "revoke_access":
                if "plan_id" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "plan_id",
                        }
                    )
                    return
                if "username" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "username",
                        }
                    )
                    return
                if "read" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "read",
                        }
                    )
                    return
                if "write" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "write",
                        }
                    )
                    return

                # assert bool type in case the inputs are "true" and "false" strings
                if not isinstance(http_body["read"], bool):
                    http_body["read"] = True if http_body["read"] == "true" else False
                if not isinstance(http_body["write"], bool):
                    http_body["write"] = True if http_body["write"] == "true" else False

                self.revoke_access_rights(
                    db,
                    http_body["plan_id"],
                    http_body["username"],
                    http_body["read"],
                    http_body["write"],
                )
                return

            elif slug == "copy":
                if "plan_id" not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "plan_id",
                        }
                    )
                    return

                self.copy_plan(db, http_body["plan_id"])

            else:
                self.set_status(404)

    @auth_needed
    def delete(self, slug):
        """
        DELETE /planner/delete
            delete a plan by specifying its _id

            query params:
                _id: the _id of the plan that should be deleted

            http body:

            returns:
                200 OK,
                (plan was deleted)
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                (no plan with the given _id was found, technically
                also a success)
                {"success": False,
                 "reason": "plan_doesnt_exist"}

        DELETE /planner/delete_step
            delete a step from a plan by specifying the plans _id and
            the steps name or _id. Speciy either step_id or step_name, if
            both are given, the step_id takes precedence.

            query params:
                _id: the _id of the plan whose step should be removed from
                step_id: the _id of the step that should be removed
                step_name: the name of the step that should be removed

            http body:

            returns:
                200 OK,
                (step was deleted)
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                409 Conflict
                (no plan with the given _id was found)
                {"success": False,
                 "reason": "plan_doesnt_exist"}

        DELETE /planner/remove_evaluation_file
            delete an evaluation from a plan by specifying the plans _id
            and the file's _id.

            query params:
                plan_id: the _id of the plan whose evaluation file should be removed
                file_id: the _id of the file that should be removed

            http body:

            returns:
                200 OK,
                (file was deleted)
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:plan_id"}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:file_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you don't have write access to the plan)
                {"success": False,
                 "reason": "insufficient_permission"}

                403 Forbidden
                (the plan is locked, i.e. another user is currently editing it)
                {"success": False,
                 "reason": "plan_locked"}

                409 Conflict
                (no plan with the given plan_id was found)
                {"success": False,
                 "reason": "plan_doesnt_exist"}

                409 Conflict
                (the plan does not have an evaluation file with the given file_id)
                {"success": False,
                 "reason": "file_doesnt_exist"}

        DELETE /planner/remove_literature_file
            delete a literature from the list in a plan by specifying the plans _id
            and the file's _id.

            query params:
                plan_id: the _id of the plan whose literature file should be removed
                file_id: the _id of the file that should be removed

            http body:

            returns:
                200 OK,
                (file was deleted)
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:plan_id"}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:file_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you don't have write access to the plan)
                {"success": False,
                 "reason": "insufficient_permission"}

                403 Forbidden
                (the plan is locked, i.e. another user is currently editing it)
                {"success": False,
                 "reason": "plan_locked"}

                409 Conflict
                (no plan with the given plan_id was found)
                {"success": False,
                 "reason": "plan_doesnt_exist"}

                409 Conflict
                (the plan does not have a literature file with the given file_id)
                {"success": False,
                 "reason": "file_doesnt_exist"}
        """
        with util.get_mongodb() as db:
            if slug == "delete":
                try:
                    _id = self.get_argument("_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write({"success": False, "reason": MISSING_KEY_SLUG + "_id"})
                    return

                self.delete_plan(db, _id)
                return

            elif slug == "delete_step":
                try:
                    _id = self.get_argument("_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write({"success": False, "reason": MISSING_KEY_SLUG + "_id"})
                    return

                step_id = self.get_argument("step_id", None)
                step_name = self.get_argument("step_name", None)

                if step_id is not None:
                    self.delete_step_by_id(db, _id, step_id)
                    return
                elif step_name is not None:
                    self.delete_step_by_name(db, _id, step_name)
                    return
                else:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_SLUG + "step_id_or_step_name",
                        }
                    )
                    return

            elif slug == "remove_evaluation_file":
                try:
                    plan_id = self.get_argument("plan_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_SLUG + "plan_id",
                        }
                    )
                    return
                try:
                    file_id = self.get_argument("file_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_SLUG + "file_id",
                        }
                    )
                    return

                self.remove_evaluation_file(db, plan_id, file_id)
                return

            elif slug == "remove_literature_file":
                try:
                    plan_id = self.get_argument("plan_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_SLUG + "plan_id",
                        }
                    )
                    return
                try:
                    file_id = self.get_argument("file_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_SLUG + "file_id",
                        }
                    )
                    return

                self.remove_literature_file(db, plan_id, file_id)
                return

            else:
                self.set_status(404)

    ##############################################################################
    #                             helper functions                               #
    ##############################################################################

    def load_plan_from_http_body_or_write_error(
            self, http_body: dict
    ) -> Optional[VEPlan]:
        """
        helper function to parse a VEPlan from the dict (should be http body of the request)
        and enforce type and model checks.
        """
        try:
            plan = VEPlan.from_dict(http_body)
        except InvalidId:
            self.set_status(400)
            self.write({"success": False, "reason": "invalid_object_id"})
            return None
        except MissingKeyError as e:
            self.set_status(400)
            self.write(
                {
                    "success": False,
                    "reason": "missing_key_in_http_body:{}".format(e.missing_value),
                }
            )
            return None
        except NonUniqueStepsError:
            self.set_status(409)
            self.write({"success": False, "reason": "non_unique_step_names"})
            return None
        except NonUniqueTasksError:
            self.set_status(409)
            self.write({"success": False, "reason": "non_unique_tasks"})
            return None

        return plan

    def get_plan_by_id(self, db: Database, _id: str | ObjectId) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Request a plan from the database by specifying its _id and handing over an
        open database connection.

        Responses:
            200 OK --> contains the requested plan as a dictionary
            403 Forbidden --> no read access to plan
            409 Conflict --> no plan was found with the given _id
        """

        planner = VEPlanResource(db)
        profile_manager = Profiles(db)
        try:
            plan = planner.get_plan(_id, requesting_username=self.current_user.username)
            plan_dict = plan.to_dict()
            if plan.author:
                profile_snippets = profile_manager.get_profile_snippets([plan.author])
                if profile_snippets:
                    author_snippet = profile_snippets[0]
                else:
                    author_snippet = {
                        "username": plan.author,
                        "first_name": None,
                        "last_name": None,
                        "institution": None,
                        "profile_pic": None,
                    }
            else:
                author_snippet = {
                    "username": None,
                    "first_name": None,
                    "last_name": None,
                    "institution": None,
                    "profile_pic": None,
                }
            plan_dict["author"] = author_snippet

        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return
        except NoReadAccessError:
            self.set_status(403)
            self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
            return

        self.serialize_and_write({"success": True, "plan": plan_dict})

    def find_available_plans_for_user_by_slug(self, slug: str, db: Database) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Search for all available plans (name, topics, abstract) of the current user by given slug

        Responses:
            200 OK --> contains all found plans in a list of dictionaries
        """

        planner = VEPlanResource(db)
        plans = [
            plan.to_dict()
            for plan in planner.find_plans_for_user_by_slug(
                self.current_user.username, slug
            )
        ]
        plans = self.add_profile_information_to_author(plans)

        self.serialize_and_write({"success": True, "plans": plans})

    def get_available_plans_for_user(
            self,
            db: Database,
            filter_good_practice_only: bool,
            filter_access: Literal["all", "own", "shared"],
            search_query: str | None,
            limit: int = 10,
            offset: int = 0,
            sort: Literal["name", "last_modified", "creation_timestamp"] = "last_modified",
            order: int = -1
    ) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Request all available plans for the current user, i.e. their own plans and
        those that he/she has read/write access to and those that are marked as
        good practise examples (read only).

        Optionally, apply the following filters and searches:
        - `filter_good_practice_only`: only return good practise plans
        - `filter_access`:
            - all: return all plans that the user has access to, i.e. own plans,
                   read/write access and good practise plans
            - own: return only the user's own plans
            - shared: return only plans that the user has read/write access to
        - `search_query`: a string to search for in the plans' names, topics and abstracts

        `filter_access` and `search_query` are first combined with an AND operator and afterwards
        the `filter_good_practice_only` is applied on top of this result.

        `limit` and `offset` are used for pagination.

        Responses:
            200 OK --> contains all available plans in a list of dictionaries
        """

        planner = VEPlanResource(db)
        plans = [
            plan.to_dict()
            for plan in planner.get_plans_for_user(
                self.current_user.username,
                filter_good_practice_only,
                filter_access,
                search_query,
                limit,
                offset,
                sort,
                order
            )
        ]
        plans = self.add_profile_information_to_author(plans)

        self.serialize_and_write({"success": True, "plans": plans})

    def get_good_practise_plans(self, db: Database) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Request all plans that are marked as good practise.

        Responses:
            200 OK --> contains all good practise plans in a list of dictionaries
        """

        planner = VEPlanResource(db)
        plans = [plan.to_dict() for plan in planner.get_good_practise_plans()]
        plans = self.add_profile_information_to_author(plans)

        self.serialize_and_write({"success": True, "plans": plans})

    def get_public_plans_of_user(self, db: Database, username: str) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Request all the public plans that the user given by the `username` is the author
        of and, in addtion, are publically readable.

        Responses:
            200 OK --> contains all plans that the user is an author of
        """

        planner = VEPlanResource(db)
        plans = [plan.to_dict() for plan in planner.get_public_plans_of_user(username)]
        plans = self.add_profile_information_to_author(plans)

        self.serialize_and_write({"success": True, "plans": plans})

    def get_all_plans(self, db: Database) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Request all plans from the database. Requires admin privileges to do so.

        Responses:
            200 OK --> contains the plans in a list of dictionaries
            403 Forbidden --> user is not an admin
        """

        # reject if user is not admin
        if not self.is_current_user_lionet_admin():
            self.set_status(403)
            self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
            return

        planner = VEPlanResource(db)
        plans = [plan.to_dict() for plan in planner.get_all()]
        plans = self.add_profile_information_to_author(plans)

        self.serialize_and_write({"success": True, "plans": plans})

    def add_profile_information_to_author(self, plans: List[VEPlan]) -> List[VEPlan]:
        """
        helper function to enhace the authors (which are only usernames) of the given
        plans with additional profile information, which are username, first_name, last_name,
        institution and profile_pic.

        Returns the plans with the enhanced author information.
        """

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)

            # collect all usernames that we have to request the profile information for, avoiding duplicates
            usernames_to_request = []
            for plan in plans:
                if plan["author"] not in usernames_to_request:
                    usernames_to_request.append(plan["author"])

            profile_snippets = profile_manager.get_profile_snippets(
                usernames_to_request
            )

            for plan in plans:
                plan["author"] = next(
                    (
                        profile
                        for profile in profile_snippets
                        if profile["username"] == plan["author"]
                    ),
                    [None],
                )

        return plans

    def insert_plan(self, db: Database, plan: VEPlan) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Inserts the given plan into the database.

        Responses:
            200 OK       --> successfully inserted, contains the inserted _id to
                             use in further updates
            409 Conflict --> a plan with the same _id already exists in the db,
                             consider using the update endpoint instead
        """

        plan.author = self.current_user.username
        plan.read_access = [self.current_user.username]
        plan.write_access = [self.current_user.username]

        planner = VEPlanResource(db)
        try:
            _id = planner.insert_plan(plan)
        except PlanAlreadyExistsError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_ALREADY_EXISTS})
            return

        er = EtherpadResouce(db)
        try:
            er.initiate_etherpad_for_plan(_id)
        except Exception:
            logger.warn("etherpad is possibly down")

        # count towards the achievements "ve_plans" and
        # conditionally count towards the "good_practice_plans" and
        # "unique_partners" achievements (obeying their constraints)
        profile_manager = Profiles(db)
        profile_manager.achievement_count_up(self.current_user.username, "ve_plans")
        profile_manager.achievement_count_up_check_constraint_unique_partners(
            self.current_user.username, plan.partners
        )
        if plan.is_good_practise:
            profile_manager.achievement_count_up_check_constraint_good_practice(
                self.current_user.username, plan._id
            )

        self.serialize_and_write({"success": True, "inserted_id": _id})

    def update_full_plan(
            self, db: Database, plan: VEPlan, upsert: bool = False
    ) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Fully update an already existing plan, i.e. overwrite all fields with those
        of the given plan.

        Optionally, by setting the "upsert"-parameter to True, the plan will be inserted
        if no matching plan was found. By default, this is set to False, resulting in
        no action if no matching plan was found.

        Responses:
            200 OK        --> successfully updated the plan (full overwrite)
            403 Forbidden --> no write access to the plan
                          --> another user currently holds a write lock on this plan
            409 Conflict  --> no plan with the given _id exists in the db, consider
                              inserting it instead
        """

        planner = VEPlanResource(db)
        try:
            if upsert is False:
                if not planner._check_plan_exists(plan._id):
                    raise PlanDoesntExistError

            # if the user updates an existing plan, he has to hold the lock for it
            if upsert is False and not self._check_lock_is_held(plan._id):
                self.set_status(403)
                self.write(
                    {
                        "success": False,
                        "reason": PLAN_LOCKED,
                        "lock_holder": self._get_lock_holder(plan._id),
                    }
                )
                return

            _id = planner.update_full_plan(
                plan, upsert=upsert, requesting_username=self.current_user.username
            )

            # after a successful update, extend the lock expiry
            self._extend_lock(_id)
        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return
        except NoWriteAccessError:
            self.set_status(403)
            self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
            return

        if upsert is True:
            er = EtherpadResouce(db)
            try:
                er.initiate_etherpad_for_plan(_id)
            except Exception:
                logger.warn("etherpad is possibly down")

        # count towards the achievement "ve_plans" since update was successfull
        # conditionally count towards the "good_practice_plans" and
        # "unique_partners" achievements (obeying their constraints)
        profile_manager = Profiles(db)
        profile_manager.achievement_count_up(self.current_user.username, "ve_plans")
        profile_manager.achievement_count_up_check_constraint_unique_partners(
            self.current_user.username, plan.partners
        )
        if plan.is_good_practise:
            profile_manager.achievement_count_up_check_constraint_good_practice(
                self.current_user.username, plan._id
            )

        self.serialize_and_write({"success": True, "updated_id": _id})

    def update_field_in_plan(
            self,
            db: Database,
            plan_id: str | ObjectId,
            field_name: str,
            field_value: Any,
            upsert: bool = False,
    ) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Update a single field (i.e. attribute) of a VEPlan by specifying the _id of
        the plan that should be updated (`plan_id`), the identifier which field should
        be updated (`field_name`) and the corresponding `value` that should be set.
        If you plan to update one of the attribute that are object-like, e.g. target_groups,
        lectures, etc. be sure to supply a list of all the dictionaries, as they are
        overwritten and not appended. Though, you may use the separate append-endpoints
        instead.

        Optionally, by setting the "upsert"-parameter to True, the plan will be inserted
        if no matching plan was found. By default, this is set to False, resulting in
        no action if no matching plan was found.

        Responses:
            200 OK          --> successfully updated the field of the plan
            400 Bad Request --> invalid object id format
                            --> TypeError, something wrong with format of the supplied
                                data
                            --> supplied field_name is not an attribute of a VEPlan
                            --> missing key in http body
            403 Forbidden   --> no write access to plan
                            --> another user currently holds a write lock on this plan
            409 Conflict    --> Steps don't have unique names
                            --> Tasks don't have unique task_formulation's
        """

        planner = VEPlanResource(db)
        error_reason = None
        _id = None

        # revoke the possibility to update the evaluation_file attribute
        if field_name == "evaluation_file":
            self.set_status(400)
            self.write(
                {
                    "success": False,
                    "reason": "unsupported_field:evaluation_file",
                }
            )
            return

        try:
            plan_id = util.parse_object_id(plan_id)

            # if another holds a write lock on the existing plan, deny the update
            if upsert is False and not self._check_lock_is_held(plan_id):
                self.set_status(403)
                self.write(
                    {
                        "success": False,
                        "reason": PLAN_LOCKED,
                        "lock_holder": self._get_lock_holder(plan_id),
                    }
                )
                return

            _id = planner.update_field(
                plan_id,
                field_name,
                field_value,
                upsert=upsert,
                requesting_username=self.current_user.username,
            )

            # after a successful update, extend the lock expiry
            self._extend_lock(plan_id)
        except InvalidId:
            error_reason = "invalid_object_id"
            self.set_status(400)
        except TypeError as e:
            error_reason = "TypeError: " + str(e)
            self.set_status(400)
        except ValueError:
            error_reason = "unexpected_attribute"
            self.set_status(400)
        except MissingKeyError as e:
            error_reason = MISSING_KEY_IN_HTTP_BODY_SLUG + e.missing_value
            self.set_status(400)
        except NoWriteAccessError:
            error_reason = INSUFFICIENT_PERMISSIONS
            self.set_status(403)
        except NonUniqueStepsError:
            error_reason = NON_UNIQUE_STEP_NAMES
            self.set_status(409)
        except NonUniqueTasksError:
            error_reason = NON_UNIQUE_TASKS
            self.set_status(409)

        if error_reason:
            self.write({"success": False, "reason": error_reason})
        else:
            if upsert is True:
                er = EtherpadResouce(db)
                try:
                    er.initiate_etherpad_for_plan(_id)
                except Exception:
                    logger.warn("etherpad is possibly down")

            # count towards the achievement "ve_plans" since update was successfull
            # conditionally count towards the "good_practice_plans" and
            # "unique_partners" achievements (obeying their constraints)
            profile_manager = Profiles(db)
            profile_manager.achievement_count_up(self.current_user.username, "ve_plans")
            if field_name == "is_good_practise" and field_value is True:
                profile_manager.achievement_count_up_check_constraint_good_practice(
                    self.current_user.username, plan_id
                )
            if field_name == "partners":
                profile_manager.achievement_count_up_check_constraint_unique_partners(
                    self.current_user.username, field_value
                )

            self.serialize_and_write({"success": True, "updated_id": _id})

    def bulk_update_fields_in_plan(self, db: Database, update_instructions: List[Dict]):
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Execute all the `update_instructions` sequentially, not providing all-or-nothing
        security (successfull queries pass, others might fail, but there is no rollback!).

        This function works similar to `update_field_in_plan`, but grabs all the errors that
        could occur there for a single update instructions and bundles them into a list in case
        that some queries might fail.

        Responses:
            200 OK       --> all update instructions were successfull
            409 Conflict --> atleast one failure, further information about each occured error
                             is contained in the "errors" list in the response
        """

        planner = VEPlanResource(db)
        profile_manager = Profiles(db)
        errors = []

        for update_instruction in update_instructions:
            error_reason = None
            error_status_code = None
            additional_error_fields = {}

            # skip evaluation_file updates
            if update_instruction["field_name"] == "evaluation_file":
                continue

            try:
                plan_id = util.parse_object_id(update_instruction["plan_id"])

                # only allow the update if the user holds the write lock
                # deny with 403 otherwise
                if self._check_lock_is_held(plan_id):
                    planner.update_field(
                        plan_id,
                        update_instruction["field_name"],
                        update_instruction["value"],
                        requesting_username=self.current_user.username,
                    )
                    # after a successful update, extend the lock expiry
                    self._extend_lock(plan_id)

                    # conditionally count towards the "good_practice_plans" and
                    # "unique_partners" achievements (obeying their constraints)
                    if (
                            update_instruction["field_name"] == "is_good_practise"
                            and update_instruction["value"] is True
                    ):
                        profile_manager.achievement_count_up_check_constraint_good_practice(
                            self.current_user.username, plan_id
                        )
                    if update_instruction["field_name"] == "partners":
                        profile_manager.achievement_count_up_check_constraint_unique_partners(
                            self.current_user.username, update_instruction["value"]
                        )
                else:
                    error_reason = PLAN_LOCKED
                    error_status_code = 403
                    additional_error_fields["lock_holder"] = self._get_lock_holder(
                        plan_id
                    )

            except InvalidId:
                error_reason = "invalid_object_id"
                error_status_code = 400
            except TypeError as e:
                error_reason = "TypeError: " + str(e)
                error_status_code = 400
            except ValueError:
                error_reason = "unexpected_attribute"
                error_status_code = 400
            except MissingKeyError as e:
                error_reason = MISSING_KEY_IN_HTTP_BODY_SLUG + e.missing_value
                error_status_code = 400
            except NoWriteAccessError:
                error_reason = INSUFFICIENT_PERMISSIONS
                error_status_code = 403
            except NonUniqueStepsError:
                error_reason = NON_UNIQUE_STEP_NAMES
                error_status_code = 409
            except NonUniqueTasksError:
                error_reason = NON_UNIQUE_TASKS
                error_status_code = 409

            if error_reason or error_status_code:
                errors.append(
                    {
                        "update_instruction": update_instruction,
                        "error_status_code": error_status_code,
                        "error_reason": error_reason,
                    }
                )
                if additional_error_fields:
                    for key, value in additional_error_fields.items():
                        errors[-1][key] = value

        if errors:
            self.set_status(409)
            self.serialize_and_write(
                {"success": False, "reason": "operation_errors", "errors": errors}
            )
        else:
            # count towards the achievement "ve_plans" since update was successfull
            profile_manager.achievement_count_up(self.current_user.username, "ve_plans")

            self.serialize_and_write({"success": True})

    def append_step_to_plan(
            self, db: Database, plan_id: str | ObjectId, step: dict | Step
    ):
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Append the given step to the steps of the plan that is associated with
        the given `plan_id`.

        Responses:
            200 OK          --> successfully appended the step to the plan
            400 Bad Request --> invalid object id format
                            --> TypeError, something wrong with format of the supplied
                                data
                            --> there was an unexpected additional attribute in the dict
                            --> missing key in http body
            403 Forbidden   --> no write access to plan
            409 Conflict    --> Steps don't have unique names (i.e. the to-be-added step
                                has a name that is already present in the db)
                            --> Tasks don't have unique task_formulation attributes within a step
        """

        planner = VEPlanResource(db)
        error_reason = None
        _id = None

        try:
            plan_id = util.parse_object_id(plan_id)

            if not planner._check_plan_exists(plan_id):
                raise PlanDoesntExistError

            # if another holds a write lock on the plan, deny the update
            if not self._check_lock_is_held(plan_id):
                self.set_status(403)
                self.write(
                    {
                        "success": False,
                        "reason": PLAN_LOCKED,
                        "lock_holder": self._get_lock_holder(plan_id),
                    }
                )
                return

            step = Step.from_dict(step) if isinstance(step, dict) else step
            _id = planner.append_step(
                plan_id, step, requesting_username=self.current_user.username
            )

            # after a successful update, extend the lock expiry
            self._extend_lock(plan_id)
        except InvalidId:
            error_reason = "invalid_object_id"
            self.set_status(400)
        except TypeError as e:
            error_reason = "TypeError: " + str(e)
            self.set_status(400)
        except ValueError:
            error_reason = "unexpected_attribute"
            self.set_status(400)
        except MissingKeyError as e:
            error_reason = MISSING_KEY_IN_HTTP_BODY_SLUG + e.missing_value
            self.set_status(400)
        except NoWriteAccessError:
            error_reason = INSUFFICIENT_PERMISSIONS
            self.set_status(403)
        except NonUniqueTasksError:
            error_reason = NON_UNIQUE_TASKS
            self.set_status(409)
        except NonUniqueStepsError:
            error_reason = NON_UNIQUE_STEP_NAMES
            self.set_status(409)
        except PlanDoesntExistError:
            error_reason = PLAN_DOESNT_EXIST
            self.set_status(409)

        if error_reason:
            self.write({"success": False, "reason": error_reason})
        else:
            # count towards the achievement "ve_plans" since update was successfull
            profile_manager = Profiles(db)
            profile_manager.achievement_count_up(self.current_user.username, "ve_plans")

            self.serialize_and_write({"success": True, "updated_id": _id})

    def put_evaluation_file(
            self,
            plan_id: str | ObjectId,
            file_name: str,
            file_content: bytes,
            content_type: str,
    ) -> None:
        """
        add a new file to the plan, resembling the evaluation.
        each plan has an own attribute `evaluation_file`, where the _id of the corresponding
        file will be stored.
        using this _id of the file that was just stored, you can retrieve the actual content
        of the file using the `StaticFileHandler` on the uploads-endpoint using
        /uploads/<file_id>
        :param space_id: the _id of the space where to upload the new file
        :param file_name: the name of the new file
        :param file_content: the body of the file as raw bytes
        """

        plan_id = util.parse_object_id(plan_id)

        with util.get_mongodb() as db:
            planner = VEPlanResource(db)
            try:
                if not planner._check_plan_exists(plan_id):
                    raise PlanDoesntExistError

                # if another holds a write lock on the plan, deny the update
                if not self._check_lock_is_held(plan_id):
                    self.set_status(403)
                    self.write(
                        {
                            "success": False,
                            "reason": PLAN_LOCKED,
                            "lock_holder": self._get_lock_holder(plan_id),
                        }
                    )
                    return

                file_id = planner.put_evaluation_file(
                    plan_id,
                    file_name,
                    file_content,
                    content_type,
                    self.current_user.username,
                )

                # after a successful update, extend the lock expiry
                self._extend_lock(plan_id)
            except PlanDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
                return
            except NoWriteAccessError:
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return

            # count towards the achievement "ve_plans" since update was successfull
            profile_manager = Profiles(db)
            profile_manager.achievement_count_up(self.current_user.username, "ve_plans")

        self.set_status(200)
        self.serialize_and_write({"success": True, "inserted_file_id": file_id})

    def put_literature_file(
            self,
            plan_id: str | ObjectId,
            file_name: str,
            file_content: bytes,
            content_type: str,
    ) -> None:
        """
        add a new literature file to the plan.
        each plan has an own attribute `literature_files`, where the _id of the corresponding
        file will be stored (up to a maximum of 5 files).
        using this _id of the file that was just stored, you can retrieve the actual content
        of the file using the `StaticFileHandler` on the uploads-endpoint using
        /uploads/<file_id>
        :param space_id: the _id of the space where to upload the new file
        :param file_name: the name of the new file
        :param file_content: the body of the file as raw bytes
        """

        plan_id = util.parse_object_id(plan_id)

        with util.get_mongodb() as db:
            planner = VEPlanResource(db)
            try:
                if not planner._check_plan_exists(plan_id):
                    raise PlanDoesntExistError

                if not planner._check_below_max_literature_files(plan_id):
                    raise MaximumFilesExceededError

                # if another holds a write lock on the plan, deny the update
                if not self._check_lock_is_held(plan_id):
                    self.set_status(403)
                    self.write(
                        {
                            "success": False,
                            "reason": PLAN_LOCKED,
                            "lock_holder": self._get_lock_holder(plan_id),
                        }
                    )
                    return

                file_id = planner.put_literature_file(
                    plan_id,
                    file_name,
                    file_content,
                    content_type,
                    self.current_user.username,
                )

                # after a successful update, extend the lock expiry
                self._extend_lock(plan_id)
            except PlanDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
                return
            except NoWriteAccessError:
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return
            except MaximumFilesExceededError:
                self.set_status(409)
                self.write({"success": False, "reason": MAXIMUM_FILES_EXCEEDED})
                return

            # count towards the achievement "ve_plans" since update was successfull
            profile_manager = Profiles(db)
            profile_manager.achievement_count_up(self.current_user.username, "ve_plans")

        self.set_status(200)
        self.serialize_and_write({"success": True, "inserted_file_id": file_id})

    async def grant_acces_right(
            self,
            db: Database,
            plan_id: str | ObjectId,
            username: str,
            read: bool,
            write: bool,
    ):
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Grant access to the user (given by `username`) to the plan (given by `plan_id`).
        `read` and `write` determine which kind of permission will be set, i.e.
        if `read` is `True`, read permission will be set, and if `write` is `True`,
        write permission will be set respectively. However, setting write permissions
        will obviously include read permissions.

        Only the author of the plan is able to set read/write access.

        Responses:
            200 OK          --> succesfully set permissions
            400 Bad Request --> both read and write are False, i.e. there is nothing to do
            403 Forbidden   --> you are not the author of the plan
            409 Conflict    --> no plan with the specified id exists
        """

        planner = VEPlanResource(db)

        # if no rights should be granted, there is nothing to do here
        if read is False and write is False:
            self.set_status(400)
            self.write({"success": False, "reason": "read_and_write_false"})
            return

        try:
            if not planner._check_user_is_author(plan_id, self.current_user.username):
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return

            if write is True:
                planner.set_write_permissions(plan_id, username)
            # since write permission includes read, we can skip if read == True and write == True,
            # so we only gotta check read == True and write == False
            if read is True and write is False:
                planner.set_read_permissions(plan_id, username)

            plan_name = planner.get_plan(plan_id).name
            notification_resource = NotificationResource(db)
            await notification_resource.send_notification(
                username,
                "plan_access_granted",
                {
                    "plan_id": plan_id,
                    "plan_name": plan_name,
                    "author": self.current_user.username,
                    "read": read,
                    "write": write,
                },
            )

        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return

        self.write({"success": True})

    def revoke_access_rights(
            self,
            db: Database,
            plan_id: str | ObjectId,
            username: str,
            read: bool,
            write: bool,
    ):
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Revoke access of the user (given by `username`) to the plan (given by `plan_id`).
        `read` and `write` determine which kind of permission will be removed, i.e.
        if `read` is `True`, read permission will be removed, and if `write` is `True`,
        write permission will be removed respectively. However, removing write permissions
        does not automatically remove read permission as well, they will remain unless also
        explicitely revoked.

        Only the author of the plan is able to set read/write access.

        Responses:
            200 OK          --> succesfully revoked permissions
            400 Bad Request --> both read and write are False, i.e. there is nothing to do
            403 Forbidden   --> you are not the author of the plan
            409 Conflict    --> no plan with the specified id exists
        """

        planner = VEPlanResource(db)

        # if no rights should be revoked, there is nothing to do here
        if read is False and write is False:
            self.set_status(400)
            self.write({"success": False, "reason": "read_and_write_false"})
            return

        try:
            if not planner._check_user_is_author(plan_id, self.current_user.username):
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return

            if write is True:
                planner.revoke_write_permissions(plan_id, username)
            if read is True:
                planner.revoke_read_permissions(plan_id, username)

        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return

        self.write({"success": True})

    def copy_plan(self, db: Database, plan_id: str | ObjectId) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Copy a plan by specifying its _id. Requires being the author of the plan, or
        having write access to it, or if the plan is marked as good practise.

        Responses:
            200 OK        --> successfully copied the plan
            403 Forbidden --> user is not author of the plan
            409 Conflict  --> no plan with the given _id was found
        """

        plan_id = util.parse_object_id(plan_id)
        planner = VEPlanResource(db)

        try:
            plan = planner.get_plan(plan_id)

            # permission check: author, write access or good practise
            # TODO check if is_good_practise_ro is not True
            if plan.is_good_practise is not True:
                if plan.author != self.current_user.username:
                    if self.current_user.username not in plan.write_access:
                        self.set_status(403)
                        self.write(
                            {"success": False, "reason": INSUFFICIENT_PERMISSIONS}
                        )
                        return
        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return

        copied_plan_id = planner.copy_plan(plan_id, self.current_user.username)

        self.serialize_and_write({"success": True, "copied_id": copied_plan_id})

    def delete_plan(self, db: Database, _id: str | ObjectId) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Delete a plan by specifying its _id. Only the author of a plan is able to do that,
        write access is not sufficient.

        As a side effect, the deletion of a plan will also remove it from all VE Windows
        on the profile, where this plan was inside.

        Responses:
            200 OK        --> successfully deleted
            403 Forbidden --> user is not author of the plan
            409 Conflict  --> no plan with the given _id was found.
                              therefore technically also success
        """

        planner = VEPlanResource(db)
        try:
            if not planner._check_user_is_author(_id, self.current_user.username):
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return

            planner.delete_plan(_id)
        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return

        profile_manager = Profiles(db)
        profile_manager.remove_ve_windows_entry_by_plan_id(_id)
        self._release_lock(_id)

        # TODO dispatch a notification to clients that were affected by
        # the removal from their window

        self.write({"success": True})

    def delete_step_by_id(
            self, db: Database, plan_id: str | ObjectId, step_id: str | ObjectId
    ) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Remove a step from a plan by specifying its _id and the _id of the
        corresponding step.

        Responses:
            200 OK        --> successfully deleted
            403 Forbidden --> no write access to plan
            409 Conflict  --> no plan with the given _id was found.
                              therefore technically also success
        """

        planner = VEPlanResource(db)
        try:
            if not planner._check_plan_exists(plan_id):
                raise PlanDoesntExistError

            # if another holds a write lock on the plan, deny the update
            if not self._check_lock_is_held(plan_id):
                self.set_status(403)
                self.write(
                    {
                        "success": False,
                        "reason": PLAN_LOCKED,
                        "lock_holder": self._get_lock_holder(plan_id),
                    }
                )
                return

            planner.delete_step_by_id(
                plan_id, step_id, requesting_username=self.current_user.username
            )

            # after a successful update, extend the lock expiry
            self._extend_lock(plan_id)

        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return
        except NoWriteAccessError:
            self.set_status(403)
            self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
            return

        self.write({"success": True})

    def delete_step_by_name(
            self, db: Database, plan_id: str | ObjectId, step_name: str
    ) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Remove a step from a plan by specifying its _id and the name of the
        corresponding step.

        Responses:
            200 OK        --> successfully deleted
            403 Forbidden --> user is not author of the plan
            409 Conflict  --> no plan with the given _id was found.
                              therefore technically also success
        """

        planner = VEPlanResource(db)
        try:
            if not planner._check_plan_exists(plan_id):
                raise PlanDoesntExistError

            # if another holds a write lock on the plan, deny the update
            if not self._check_lock_is_held(plan_id):
                self.set_status(403)
                self.write(
                    {
                        "success": False,
                        "reason": PLAN_LOCKED,
                        "lock_holder": self._get_lock_holder(plan_id),
                    }
                )
                return

            planner.delete_step_by_name(
                plan_id, step_name, requesting_username=self.current_user.username
            )

            # after a successful update, extend the lock expiry
            self._extend_lock(plan_id)
        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return
        except NoWriteAccessError:
            self.set_status(403)
            self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
            return

        self.write({"success": True})

    def remove_evaluation_file(
            self, db: Database, plan_id: str | ObjectId, file_id: str | ObjectId
    ) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Remove an evaluation file from a plan by specifying the plan's _id and
        the file's _id.

        Responses:
            200 OK        --> successfully removed the file
            403 Forbidden --> user is not author of the plan
                          --> another user currently holds a write lock on this plan
            409 Conflict  --> no plan with the given _id was found
                          --> no file with the given _id was found in the plan
        """

        plan_id = util.parse_object_id(plan_id)
        file_id = util.parse_object_id(file_id)

        planner = VEPlanResource(db)

        try:
            if not planner._check_plan_exists(plan_id):
                raise PlanDoesntExistError

            # if another holds a write lock on the plan, deny the update
            if not self._check_lock_is_held(plan_id):
                self.set_status(403)
                self.write(
                    {
                        "success": False,
                        "reason": PLAN_LOCKED,
                        "lock_holder": self._get_lock_holder(plan_id),
                    }
                )
                return

            planner.remove_evaluation_file(
                plan_id, file_id, requesting_username=self.current_user.username
            )

            # after a successful update, extend the lock expiry
            self._extend_lock(plan_id)
        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return
        except NoWriteAccessError:
            self.set_status(403)
            self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
            return
        except FileDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": FILE_DOESNT_EXIST})
            return

        self.write({"success": True})

    def remove_literature_file(
            self, db: Database, plan_id: str | ObjectId, file_id: str | ObjectId
    ) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Remove a literature file from the list in a plan by specifying the
        plan's _id and the file's _id.

        Responses:
            200 OK        --> successfully removed the file
            403 Forbidden --> user is not author of the plan
                          --> another user currently holds a write lock on this plan
            409 Conflict  --> no plan with the given _id was found
                          --> no file with the given _id was found in the plan
        """

        plan_id = util.parse_object_id(plan_id)
        file_id = util.parse_object_id(file_id)

        planner = VEPlanResource(db)

        try:
            if not planner._check_plan_exists(plan_id):
                raise PlanDoesntExistError

            # if another holds a write lock on the plan, deny the update
            if not self._check_lock_is_held(plan_id):
                self.set_status(403)
                self.write(
                    {
                        "success": False,
                        "reason": PLAN_LOCKED,
                        "lock_holder": self._get_lock_holder(plan_id),
                    }
                )
                return

            planner.remove_literature_file(
                plan_id, file_id, requesting_username=self.current_user.username
            )

            # after a successful update, extend the lock expiry
            self._extend_lock(plan_id)
        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return
        except NoWriteAccessError:
            self.set_status(403)
            self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
            return
        except FileDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": FILE_DOESNT_EXIST})
            return

        self.write({"success": True})

    def get_scorm_files(self, _id: str | ObjectId) -> None:
        """
        This function is invoked by the handler when the corresponding endpoint
        is requested. It reads the planning steps, fills the step data into the
        imsmanifest.xml file and HTML files, and returns the SCORM files compressed as ZIP file.

        Responses:
           200 OK --> ZIP file contains the SCORM files (xml, xsd, js and html files)
           400 missing plan_id --> no plan_id was provided
        """

        with util.get_mongodb() as db:
            plan_db = VEPlanResource(db)
            plan = plan_db.get_plan(_id)

            steps = plan.steps
            project_title = plan.name

            step_scorm = []
            for i, step in enumerate(steps, start=1):
                step_data = {
                    "step_name": step.name,
                    "ressource_id": f"resource_{i}",
                    "item_id": f"item_id_{i}",
                    "filename": f"filename{i}.html"
                }
                step_scorm.append(step_data)

            zipFile = BytesIO()  # temporary file in memory
            with zipfile.ZipFile(zipFile, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
                # Fill the step data into the imsmanifest.xml file & write it to zip stream
                imsmanifest_content = self.fill_imsmanifest(step_scorm, project_title)
                zf.writestr("imsmanifest.xml", ET.tostring(imsmanifest_content, encoding='utf-8'))

                # Fill the step data into the html files & copy xsd files ->  write it to zip stream
                self.fill_html_files(step_scorm, zf)
                self.copy_xsd_files(zf)

            # Set headers for file download
            self.set_status(200)
            self.set_header("Content-Type", "application/zip")
            self.set_header("Content-Disposition", 'attachment; filename="ve_collab_scorm.zip"')
            self.set_header("Content-Length", str(len(zipFile.getvalue())))  # FIXED VARIABLE NAME

            # Send the file as a response
            self.write(zipFile.getvalue())
            self.finish()

    @staticmethod
    def fill_imsmanifest(steps: List, project_title: str) -> ET.Element:
        # Implement the logic to fill the imsmanifest.xml content with the steps data
        manifest = ET.Element("manifest", {
            "identifier": "com.scorm.golfsamples.contentpackaging.singlesco.12",
            "version": "1",
            "xmlns": "http://www.imsproject.org/xsd/imscp_rootv1p1p2",
            "xmlns:adlcp": "http://www.adlnet.org/xsd/adlcp_rootv1p2",
            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "xsi:schemaLocation": "http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd "
                                  "http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd "
                                  "http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd"
        })

        # Metadata
        metadata = ET.SubElement(manifest, "metadata")
        ET.SubElement(metadata, "schema").text = "ADL SCORM"
        ET.SubElement(metadata, "schemaversion").text = "1.2"

        # Organizations
        organizations = ET.SubElement(manifest, "organizations", {"default": "test_structure"})
        organization = ET.SubElement(organizations, "organization", {"identifier": "test_structure"})

        # Project title
        ET.SubElement(organization, "title").text = project_title

        # Items
        for item in steps:
            item_element = ET.SubElement(organization, "item",
                                         {"identifier": item["item_id"], "identifierref": item["ressource_id"]})
            ET.SubElement(item_element, "title").text = item["step_name"]

        # Ressources
        resources = ET.SubElement(manifest, "resources")
        for res in steps:
            resource = ET.SubElement(resources, "resource", {
                "identifier": res["ressource_id"],
                "type": "webcontent",
                "adlcp:scormtype": "asset",
                "href": f"{res['filename']}"
            })
            ET.SubElement(resource, "file", {"href": f"{res['filename']}"})

        return manifest

    @staticmethod
    def fill_html_files(steps: List, zf: zipfile.ZipFile) -> None:
        # Implement the logic to fill the HTML files content with the steps data
        html_template = """<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
                    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html xmlns='http://www.w3.org/1999/xhtml' dir='ltr' lang='en-US'>
                <head>
                    <title>{title}</title>
                    <!--to include SCORM-specific functions-->
                    <script type='text/javascript' src='../shared/scormfunctions.js'></script>
                </head>
                <body>
                <p> Your custom course {title} </p>
                </body>
                </html>"""

        for step in steps:
            html_content = html_template.format(title=step["step_name"])
            zf.writestr(step["filename"], html_content.encode("utf-8"))

    @staticmethod
    def copy_xsd_files(zf: zipfile.ZipFile) -> None:
        source_folder = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'scorm_copy_files')

        for filename in os.listdir(source_folder):
            source_file = os.path.join(source_folder, filename)
            if os.path.isfile(source_file):
                with open(source_file, "rb") as f:
                    zf.writestr(filename, f.read())
