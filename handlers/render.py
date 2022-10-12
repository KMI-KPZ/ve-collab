from handlers.base_handler import BaseHandler, auth_needed
from logger_factory import log_access


class MainHandler(BaseHandler):

    @log_access
    @auth_needed
    def get(self):
        self.render("main.html")


class MainRedirectHandler(BaseHandler):

    @log_access
    @auth_needed
    def get(self):
        self.redirect("/main")


class MyProfileHandler(BaseHandler):

    @log_access
    @auth_needed
    def get(self):
        self.render("myProfile.html")


class ProfileHandler(BaseHandler):

    @log_access
    @auth_needed
    def get(self, slug):
        self.render("profile.html")


class SpaceRenderHandler(BaseHandler):

    @log_access
    @auth_needed
    def get(self, slug):
        self.render("space.html")


class SpaceOverviewHandler(BaseHandler):

    @log_access
    @auth_needed
    def get(self):
        self.render("space_overview.html")


class TemplateHandler(BaseHandler):

    @log_access
    @auth_needed
    def get(self):
        self.render("blocks.html")

class ACLHandler(BaseHandler):
    
    @log_access
    @auth_needed
    def get(self):
        with open("html/acl.html") as fp:
            self.write(fp.read())
