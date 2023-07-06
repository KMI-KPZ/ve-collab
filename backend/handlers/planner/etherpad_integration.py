import tornado

from error_reasons import MISSING_KEY_SLUG
from handlers.base_handler import BaseHandler, auth_needed
from resources.planner.etherpad_integration import EtherpadResouce
import util


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

                er = EtherpadResouce(db)
                authorID = er.create_etherpad_author_for_user_if_not_exists(
                    self.current_user.user_id, self.current_user.username
                )
                groupID = er.create_etherpad_group_for_plan_if_not_exists(plan_id)
                er.create_etherpad_group_pad_for_plan(groupID, plan_id)
                sessionID = er.create_etherpad_user_session_for_plan(groupID, authorID)

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
