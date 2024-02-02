from handlers.base_handler import BaseHandler, auth_needed
import util


class NotificationHandler(BaseHandler):
    @auth_needed
    def get(self):
        """
        GET /notifications
            get all notifications for the user
            TODO
        """

        username = self.get_argument("username", None)
        if username is None:
            username = self.current_user.username

        with util.get_mongodb() as db:
            notifications = list(db.notifications.find({"to": username}))

            self.serialize_and_write({"notifications": notifications})
