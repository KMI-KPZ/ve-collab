import CONSTANTS
from handlers.base_handler import BaseHandler


class MainHandler(BaseHandler):

    def get(self):
        if self.current_user:
            self.render("main.html")
        else:
            self.redirect(CONSTANTS.ROUTING_TABLE["platform"])  # redirect to platform if there is no logged in user


class MainRedirectHandler(BaseHandler):

    def get(self):
        self.redirect("/main")


class AdminHandler(BaseHandler):

    def get(self):
        if self.current_user:
            self.render("newsfeed.html")
        else:
            self.redirect(CONSTANTS.ROUTING_TABLE["platform"])  # redirect to platform if there is no logged in user


class MyProfileHandler(BaseHandler):

    def get(self):
        if self.current_user:
            self.render("myProfile.html")
        else:
            self.redirect(CONSTANTS.ROUTING_TABLE["platform"])  # redirect to platform if there is no logged in user


class ProfileHandler(BaseHandler):

    def get(self, slug):
        if self.current_user:
            self.render("profile.html")
        else:
            self.redirect(CONSTANTS.ROUTING_TABLE["platform"])  # redirect to platform if there is no logged in user


class SpaceRenderHandler(BaseHandler):

    def get(self, slug):
        if self.current_user:
            self.render("space.html")
        else:
            self.redirect(CONSTANTS.ROUTING_TABLE["platform"])  # redirect to platform if there is no logged in user


class SpaceOverviewHandler(BaseHandler):
    def get(self):
        if self.current_user:
            self.render("space_overview.html")
        else:
            self.redirect(CONSTANTS.ROUTING_TABLE["platform"])  # redirect to platform if there is no logged in user


class TemplateHandler(BaseHandler):

    def get(self):
        if self.current_user:
            self.render("blocks.html")
        else:
            self.redirect(CONSTANTS.ROUTING_TABLE["platform"])  # redirect to platform if there is no logged in user
