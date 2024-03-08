import logging

import tornado

from error_reasons import INSUFFICIENT_PERMISSIONS, MISSING_KEY_SLUG, PLAN_DOESNT_EXIST
from exceptions import PlanDoesntExistError
from handlers.base_handler import BaseHandler, auth_needed
from resources.planner.etherpad_integration import EtherpadResouce
from resources.planner.ve_plan import VEPlanResource
import util


logger = logging.getLogger(__name__)


class EtherpadIntegrationHandler(BaseHandler):
    @auth_needed
    def get(self, slug):
        with util.get_mongodb() as db:
            if slug == "get_pad_session":
                try:
                    plan_id = self.get_argument("plan_id")
                except tornado.web.MissingArgumentError:
                    self.set_status(400)
                    self.write({"success": False, "reason": MISSING_KEY_SLUG + "_id"})
                    return

                # give the curently authenticated user access to this pad
                # only for demo purpose, ofc this flow has to be placed at the access-setting of plans, i.e.:
                # - as user gets access rights to a plan --> user gets access to the pad (create a long lasting session for him
                #   and store it somwhere (backend(?)), retrieve it whenever this page is loaded and set the coookie.
                # - deletion of sessionID vice versa whenever access to plan gets revoked
                # - creation of the pad gets moved to where a new plan gets created

                # if the user has no write access to the plan nor is the author
                # reject access to the plan
                # in the same pass also catch the error case if no such plan even
                # exists
                planner = VEPlanResource(db)
                try:
                    if not (
                        planner._check_write_access(plan_id, self.current_user.username)
                        or planner._check_user_is_author(
                            plan_id, self.current_user.username
                        )
                    ):
                        self.set_status(403)
                        self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                        return
                except PlanDoesntExistError:
                    self.set_status(409)
                    self.write({"success": False, "reason": PLAN_DOESNT_EXIST})
                    return

                # user has access, so we obtain a session for him and invalidate
                # all other previous sessions
                er = EtherpadResouce(db)
                try:
                    authorID = er.create_etherpad_author_for_user_if_not_exists(
                        self.current_user.user_id, self.current_user.username
                    )
                    groupID = er.create_etherpad_group_for_plan_if_not_exists(plan_id)
                    er.revoke_all_session_for_user_in_group(authorID, groupID)
                    sessionID = er.create_etherpad_user_session_for_plan(groupID, authorID)
                except Exception:
                    logger.warn("etherpad is possibly down")
                    sessionID = None
                    groupID = None

                self.write(
                    {
                        "success": True,
                        "session_id": sessionID,
                        "pad_id": "$".join([groupID, plan_id]),
                    }
                )

    @auth_needed
    def post(self, slug):
        pass
