import json

from bson.errors import InvalidId
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
        with util.get_mongodb() as db:
            planner = VEPlanResource(db)

            if slug == "get":
                try:
                    _id = self.get_argument("_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write({"success": False, "reason": MISSING_KEY_SLUG + "_id"})
                    return

                try:
                    plan = planner.get_plan(_id)
                except PlanDoesntExistError:
                    self.set_status(409)
                    self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
                    return

                self.serialize_and_write({"success": True, "plan": plan.to_dict()})

            elif slug == "get_all":
                # reject if user is not admin
                if not self.is_current_user_lionet_admin():
                    self.set_status(403)
                    self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                    return

                plans = [plan.to_dict() for plan in planner.get_all()]
                self.serialize_and_write({"success": True, "plans": plans})

            else:
                self.set_status(404)

    @auth_needed
    def post(self, slug):
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
            planner = VEPlanResource(db)
            mode, _id = planner.insert_or_update(plan)

            self.serialize_and_write(
                {"success": True, "write_mode": mode, "inserted_or_updated_id": _id}
            )

    @auth_needed
    def delete(self, slug):
        with util.get_mongodb() as db:
            planner = VEPlanResource(db)
            try:
                _id = self.get_argument("_id")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + "_id"})
                return

            try:
                planner.delete_plan(_id)
            except PlanDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
                return

            self.write({"success": True})
