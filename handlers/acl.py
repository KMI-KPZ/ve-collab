from handlers.base_handler import BaseHandler
import util


class PermissionHandler(BaseHandler):

    async def get(self):
        if self.current_user:
            role = await util.request_role(self.current_user.username)
            self.set_status(200)
            self.write({"status": 200,
                        "role": role})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})
