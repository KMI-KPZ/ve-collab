import json
from typing import Any, Optional

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.database import Database
import tornado.web

from error_reasons import (
    INSUFFICIENT_PERMISSIONS,
    MISSING_KEY_IN_HTTP_BODY_SLUG,
    MISSING_KEY_SLUG,
    NON_UNIQUE_STEP_NAMES,
    NON_UNIQUE_TASK_TITLES,
    PLAN_ALREADY_EXISTS,
    PLAN_DOESNT_EXIST,
)
from exceptions import (
    MissingKeyError,
    NonUniqueStepsError,
    NonUniqueTasksError,
    PlanAlreadyExistsError,
    PlanDoesntExistError,
)
from handlers.base_handler import auth_needed, BaseHandler
from model import Step, VEPlan
from resources.planner.ve_plan import VEPlanResource
import util


class VEPlanHandler(BaseHandler):

    def options(self, slug):
        # no body
        self.set_status(200)
        self.finish()

    #@auth_needed
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

                409 Conflict
                (no plan was found with the given _id)
                {"success": False,
                 "reason": "plan_doesnt_exist"}

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

            elif slug == "get_all":
                self.get_all_plans(db)
                return

            else:
                self.set_status(404)

    #@auth_needed
    def post(self, slug):
        """
        POST /planner/insert
            insert a new plan into the db. To do this, the safest approach is
            to omit any _id fields (not only for the plan itself, but also for steps,
            tasks, and audience) and let the system created them.

            HTTP Body:
                Supply a JSON containing the dictionary representation of a `VEPlan`,
                i.e. it must be parseable by `VEPlan.from_dict()`.
                Example:
                    {
                        "name": "test",
                        "institutions": [
                            {
                                "_id": "<object_id_str>",
                                "name": "test",
                                "school_type": "test",
                                "country": "test",
                                "departments": [
                                    {
                                        "_id": "<object_id_str>",
                                        "name": "test",
                                        "academic_courses": [
                                            {
                                                "_id": "<object_id_str>",
                                                "name": "test",
                                            }
                                        ],
                                    }
                                ],
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
                        "audience": [
                            {
                                "name": "test",
                                "age_min": 30,
                                "age_max": 40,
                                "experience": "test",
                                "academic_course": "test",
                                "mother_tongue": "test",
                                "foreign_languages": {}
                            }
                        ],
                        "languages": ["test"],
                        "goals": {"test":"test"},
                        "involved_parties": ["test"],
                        "realization": "test",
                        "learning_env": "test",
                        "tools": ["test"],
                        "new_content": False,
                        "steps": [
                            {
                                "name": "test",
                                "workload": 10,
                                "timestamp_from": "2000-01-01",
                                "timestamp_to": "2000-01-08",
                                "social_form": "test",
                                "learning_env": "test",
                                "ve_approach": "test",
                                "tasks": [
                                    {
                                        "title": "test",
                                        "description": "test",
                                        "learning_goal": "test",
                                        "tools": ["test"]
                                    }
                                ],
                                "evaluation_tools": ["test"],
                                "attachments": ["<object_id_str>", "<object_id_str>"],
                                "custom_attributes": {"my_attr": "my_value"}
                            }
                        ]
                    }

                The only really necessary values are the "name"-keys of the steps and the "title"-keys
                of tasks, they have to be unique to each other in this list, otherwise an error is thrown.
                Any other base attribute may have a null, or in case of a list, a [] value (the
                keys of complex attributes like "audience" should be supplied nonetheless, only
                primitive attributes are meant).

                Keep in mind, that some plan attributes are derived from it's steps and should
                not be included (timestamp_from, timestamp_to, workload, duration).

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



        POST /planner/update_full
            update an existing plan by overwriting all attributes, i.e. the HTTP body has to
            contain all required attributes and the plan will be fully overwritten by those.
            Adding to that, your payload has to include the _id of the plan you want to update.
            _ids of other attributes (steps, tasks, audience) may be supplied, but can be omitted
            to be regenerated by the system (all associated linked data to those attributes like e.g.
            comments will be lost though).

            query params:
                "upsert" : <boolean>, Indicator to insert a new plan instead of updating an existing one,
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
                        "institutions": [
                            {
                                "_id": "<object_id_str>",
                                "name": "test",
                                "school_type": "test",
                                "country": "test",
                                "departments": [
                                    {
                                        "_id": "<object_id_str>",
                                        "name": "test",
                                        "academic_courses": [
                                            {
                                                "_id": "<object_id_str>",
                                                "name": "test",
                                            }
                                        ],
                                    }
                                ],
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
                        "audience": [
                            {
                                "name": "test",
                                "age_min": 30,
                                "age_max": 40,
                                "experience": "test",
                                "academic_course": "test",
                                "mother_tongue": "test",
                                "foreign_languages": {}
                            }
                        ],
                        "languages": ["test"],
                        "goals": {"test":"test"},
                        "involved_parties": ["test"],
                        "realization": "test",
                        "learning_env": "test",
                        "tools": ["test"],
                        "new_content": False,
                        "steps": [
                            {
                                "name": "test",
                                "workload": 10,
                                "timestamp_from": "2000-01-01",
                                "timestamp_to": "2000-01-08",
                                "social_form": "test",
                                "learning_env": "test",
                                "ve_approach": "test",
                                "tasks": [
                                    {
                                        "title": "test",
                                        "description": "test",
                                        "learning_goal": "test",
                                        "tools": ["test"]
                                    }
                                ],
                                "evaluation_tools": ["test"],
                                "attachments": ["<object_id_str>", "<object_id_str>"],
                                "custom_attributes": {"my_attr": "my_value"}
                            }
                        ]
                    }

                The only really necessary values are the "name"-keys of the steps and the "title"-keys
                of tasks, they have to be unique to each other in this list, otherwise an error is thrown.
                Any other base attribute may have a null, or in case of a list, a [] value (the
                keys of complex attributes like "audience" should be supplied nonetheless, only
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
            The values are type-checked and also semantic checks like unique step names or task
            titles are enforced with respective error messages.

            If you want to update one of the object-like attributes of a VEPlan (e.g. audience,
            lectures, steps, ...), pay attention to supply all of those objects in a list (as
            there are naturally multiple possible as per model), because they will be overwritten
            (i.e. if you want to append a new step, send all other already existing steps as well).
            If you want to simple append or remove new objects to/from those list, 
            use the append/remove-endpoints (TODO) instead.

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
                (The titles of the tasks in a step in the http are not
                unique)
                {"success": False,
                 "reason": "non_unique_task_titles"}
        """

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
                plan = VEPlan(name=optional_name)
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
                    upsert=upsert
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

            else:
                self.set_status(404)

    #@auth_needed
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

            else:
                self.set_status(404)

    ##############################################################################
    #                             helper functions                               #
    ##############################################################################

    def load_plan_from_http_body_or_write_error(self, http_body: dict) -> Optional[VEPlan]:
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
            self.write({"success": False, "reason": "non_unique_task_titles"})
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
            409 Conflict --> no plan was found with the given _id
        """

        planner = VEPlanResource(db)
        try:
            plan = planner.get_plan(_id)
        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return

        self.serialize_and_write({"success": True, "plan": plan.to_dict()})

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

        # HACK QUICKLY BECAUSE SESSION MANAGEMENT IS NOT YET COMPLETED IN FRONTEND
        # reject if user is not admin
        #if not self.is_current_user_lionet_admin():
        #    self.set_status(403)
        #    self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
        #    return

        planner = VEPlanResource(db)
        plans = [plan.to_dict() for plan in planner.get_all()]
        self.serialize_and_write({"success": True, "plans": plans})

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

        planner = VEPlanResource(db)
        try:
            _id = planner.insert_plan(plan)
        except PlanAlreadyExistsError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_ALREADY_EXISTS})
            return

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
            200 OK       --> successfully updated the plan (full overwrite)
            409 Conflict --> no plan with the given _id exists in the db, consider
                             inserting it instead
        """

        planner = VEPlanResource(db)
        try:
            _id = planner.update_full_plan(plan, upsert=upsert)
        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return

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
        If you plan to update one of the attribute that are object-like, e.g. audience,
        lectures, etc. be sure to supply a list of all the dictionaries, as they are
        overwritten and not appended. Though, you may use the separate append-endpoints 
        (TODO) instead.

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
            409 Conflict    --> Steps don't have unique names
                            --> Tasks don't have unique titles
        """

        planner = VEPlanResource(db)
        error_reason = None
        _id = None

        try:
            plan_id = util.parse_object_id(plan_id)
            _id = planner.update_field(plan_id, field_name, field_value, upsert=upsert)
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
        except NonUniqueStepsError:
            error_reason = NON_UNIQUE_STEP_NAMES
            self.set_status(409)
        except NonUniqueTasksError:
            error_reason = NON_UNIQUE_TASK_TITLES
            self.set_status(409)

        if error_reason:
            self.write({"success": False, "reason": error_reason})
        else:
            self.serialize_and_write({"success": True, "updated_id": _id})

    def append_step_to_plan(self, db: Database, plan_id: str | ObjectId, step: dict | Step):
        planner = VEPlanResource(db)
        error_reason = None
        _id = None

        try:
            plan_id = util.parse_object_id(plan_id)
            step = Step.from_dict(step) if isinstance(step, dict) else step
            _id = planner.append_step(plan_id, step)
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
        except NonUniqueTasksError:
            error_reason = NON_UNIQUE_TASK_TITLES
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
            self.serialize_and_write({"success": True, "updated_id": _id})

    def delete_plan(self, db: Database, _id: str | ObjectId) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        Delete a plan by specifying its _id.

        Responses:
            200 OK --> successfully deleted
            409 Conflict --> no plan with the given _id was found.
                             therefore technically also success
        """

        planner = VEPlanResource(db)
        try:
            planner.delete_plan(_id)
        except PlanDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
            return

        self.write({"success": True})
