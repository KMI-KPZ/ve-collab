from handlers.base_handler import BaseHandler, auth_needed
import util


class PermissionHandler(BaseHandler):

    @auth_needed
    async def get(self):
        role = await util.request_role(self.current_user.username)
        self.set_status(200)
        self.write({"status": 200,
                    "role": role})


class GlobalACLHandler(BaseHandler):

    @auth_needed
    def get(self, slug):
        pass

    @auth_needed
    async def post(self, slug):
        pass
