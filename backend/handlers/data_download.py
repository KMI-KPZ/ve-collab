import json

from keycloak import KeycloakGetError

from handlers.base_handler import BaseHandler, auth_needed
from resources.mail_invitation import MailInvitation
from resources.network.chat import Chat
from resources.network.post import Posts
from resources.network.profile import Profiles
from resources.network.space import Spaces
from resources.notifications import NotificationResource
from resources.planner.ve_plan import VEPlanResource
from resources.reports import Reports
import util


class DataDownloadHandler(BaseHandler):

    def options(self):
        # no body
        self.set_status(200)
        self.finish()

    @auth_needed
    def get(self):

        try:
            keycloak_info = self.get_keycloak_user(self.current_user.username)
        except KeycloakGetError as e:
            error_response = json.loads(e.error_message.decode())
            if error_response["error"] == "User not found":
                self.set_status(409)
                self.write({"success": False, "reason": "user_doesnt_exist"})
                return

        with util.get_mongodb() as db:
            # profile data
            profile_manager = Profiles(db)
            profile_data = profile_manager.get_profile(self.current_user.username)

            # chatrooms and messages
            chat_manager = Chat(db)
            chatrooms = chat_manager.get_rooms_of_user(self.current_user.username)

            # notifications
            notification_manager = NotificationResource(db)
            notifications = notification_manager.get_notifications_of_user(
                self.current_user.username
            )

            # posts and comments
            post_manager = Posts(db)
            posts = post_manager.get_posts_of_user(self.current_user.username)
            comments = post_manager.get_posts_with_comments_of_user(
                self.current_user.username
            )

            # spaces
            space_manager = Spaces(db)
            spaces = space_manager.get_spaces_of_user(self.current_user.username)

            # ve plans
            plan_manager = VEPlanResource(db)
            ve_plans = plan_manager.get_plans_for_user(
                self.current_user.username, filter_access="access"
            )
            ve_plans = [plan.to_dict() for plan in ve_plans]

            # ve plan invitations
            ve_plan_invitations = plan_manager.get_invitations_sent_by(
                self.current_user.username
            )

            # mail invitations
            mail_inv_manager = MailInvitation(db)
            mail_invitations = mail_inv_manager.get_invitations_sent_by(
                self.current_user.username
            )

            # reports
            reports_manager = Reports(db)
            reports = reports_manager.get_reports_by_reporter(
                self.current_user.username
            )

            data = {
                "user_data": keycloak_info,
                "profile_data": profile_data,
                "chatrooms": chatrooms,
                "notifications": notifications,
                "posts": posts,
                "comments": comments,
                "spaces": spaces,
                "ve_plans": ve_plans,
                "ve_plan_invitations": ve_plan_invitations,
                "mail_invitations": mail_invitations,
                "reports": reports,
            }

            self.set_status(200)
            self.serialize_and_write({"success": True, "data": data})
