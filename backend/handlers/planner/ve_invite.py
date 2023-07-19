import json

from bson import ObjectId

from error_reasons import MISSING_KEY_IN_HTTP_BODY_SLUG
import global_vars
from handlers.base_handler import BaseHandler
from resources.planner.ve_plan import VEPlanResource
import util


class VeInvitationHandler(BaseHandler):
    def acknowledge_notification(self, notification_id):
        print("direct aknowledge")
        print(notification_id)
        with util.get_mongodb() as db:
            print(list(db.notifications.find({})))
            update_res = db.notifications.update_one(
                {"_id": ObjectId(notification_id)},
                {"$set": {"receive_state": "acknowledged"}},
            )
            print(update_res.matched_count)
            print(update_res.modified_count)

    def get(self):
        pass

    async def post(self):
        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": "json_parsing_error"})
            return

        if "message" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "success": False,
                    "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "message",
                }
            )
            return
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

        # give user read access to plan
        with util.get_mongodb() as db:
            plan_manager = VEPlanResource(db)
            plan_manager.set_read_permissions(
                http_body["plan_id"], http_body["username"]
            )


            # if recipient of the invitation is currently "online" (i.e. connected via socket),
            # emit the notification instantly
            if http_body["username"] in global_vars.username_sid_map:
                notification_payload = {
                    "_id": ObjectId(),
                    "type": "ve_invitation",
                    "from": self.current_user.username,
                    "to": http_body["username"],
                    "message": http_body["message"],
                    "plan_id": http_body["plan_id"],
                    "receive_state": "sent",
                }
                await global_vars.socket_io.emit(
                    "notification",
                    self.json_serialize_response(notification_payload.copy()),
                    room=global_vars.username_sid_map[http_body["username"]],
                    callback=self.acknowledge_notification,
                )

                # store notification as "sent", which will be changed to "acknowledged"
                # once the client sends the appropriate callback to the emitted event
                db.notifications.insert_one(notification_payload)
            else:
                # user is not currently connected via socket, save the event as "pending"
                # will be dispatched automatically when the user connects next time
                db.notifications.insert_one(
                    {
                        "type": "ve_invitation",
                        "from": self.current_user.username,
                        "to": http_body["username"],
                        "message": http_body["message"],
                        "plan_id": http_body["plan_id"],
                        "receive_state": "pending",
                    }
                )

        self.write({"success": True})
