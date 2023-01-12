import json

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.database import Database
import tornado.web

from error_reasons import INSUFFICIENT_PERMISSIONS, MISSING_KEY_SLUG, PLAN_DOESNT_EXIST
from exceptions import NonUniqueStepsError, PlanDoesntExistError, PlanKeyError
from handlers.base_handler import auth_needed, BaseHandler
from model import VEPlan
from resources.planner.ve_plan import VEPlanResource
import util


class VEPlanHandler(BaseHandler):
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

    @auth_needed
    def post(self, slug):
        """
        POST /planner/update
            update or insert a plan. If a _id is supplied, an update will
            be triggered, trying to overwrite any existing plan. If no matching
            existing plan is found, or no _id is supplied, an insert will be triggered,
            auto-generating a valid _id.

            So, there are two basic use cases for this endpoint:
                1. Create a new Plan by not supplying an _id (it will be
                   created and is part of the response)
                2. update an existing plan by specifying its _id
            
            query params:

            http body:
                supply a dictionary-resprentation of a `VEPlan`, i.e.
                parseable by `VEPlan.from_dict()`.
                Minimal example:
                    {
                        "name": str,
                        "topic_description": str,
                        "learning_goal": str,
                        "steps": [
                            {
                                "name": str,
                                "duration": int,
                                "workload": int,
                                "description": str,
                                "learning_goal": str,
                                "tasks": [str, str, ...],
                                "attachments": [object_id, object_id, ...]
                            }, 
                            {...}
                        ]
                    }
                Optionally, specify a "_id"-key to update plans as described above.
                The only necessary values are the "name"-keys of the steps, they
                have to be unique to each other in this list.
                Any other entry may have a null, or in case of a list, a [] value.

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
                 "write_mode": <"inserted"|"updated">,
                 "inserted_or_update_id": str}

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
        """

        try:
            http_body = json.loads(self.request.body)
            plan = VEPlan.from_dict(http_body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": "json_parsing_error"})
            return
        except InvalidId:
            self.set_status(400)
            self.write({"success": False, "reason": "invalid_object_id"})
            return
        except PlanKeyError as e:
            self.set_status(400)
            self.write(
                {
                    "success": False,
                    "reason": "missing_key_in_http_body:{}".format(e.missing_value),
                }
            )
            return
        except NonUniqueStepsError:
            self.set_status(409)
            self.write({"success": False, "reason": "non_unique_step_names"})
            return

        with util.get_mongodb() as db:
            if slug == "update":
                self.insert_or_update_plan(db, plan)
                return

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

        # reject if user is not admin
        if not self.is_current_user_lionet_admin():
            self.set_status(403)
            self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
            return

        planner = VEPlanResource(db)
        plans = [plan.to_dict() for plan in planner.get_all()]
        self.serialize_and_write({"success": True, "plans": plans})

    def insert_or_update_plan(self, db: Database, plan: VEPlan) -> None:
        """
        This function is invoked by the handler when the correspoding endpoint
        is requested. It just de-crowds the handler function and should therefore
        not be called manually anywhere else.

        If a plan with the _id of the given plan already exists, the existing one
        will be overwritten by this plan (update). Otherwise, this plan is inserted
        into the database freshly (insert).

        Responses:
            200 OK --> Operation successful, contains information about insertion or
                       update and which _id was created if so
        """

        planner = VEPlanResource(db)
        mode, _id = planner.insert_or_update(plan)

        self.serialize_and_write(
            {"success": True, "write_mode": mode, "inserted_or_updated_id": _id}
        )

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
