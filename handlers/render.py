import global_vars
from handlers.base_handler import BaseHandler


class MainHandler(BaseHandler):

    def get(self):
        if self.current_user:
            self.render("main.html")
        else:
            # redirect to platform if there is no logged in user
            self.redirect(global_vars.routing_table["platform"])


class MainRedirectHandler(BaseHandler):

    def get(self):
        self.redirect("/main")


class AdminHandler(BaseHandler):

    def get(self):
        if self.current_user:
            self.render("newsfeed.html")
        else:
            # redirect to platform if there is no logged in user
            self.redirect(global_vars.routing_table["platform"])


class MyProfileHandler(BaseHandler):

    def get(self):
        if self.current_user:
            self.render("myProfile.html")
        else:
            # redirect to platform if there is no logged in user
            self.redirect(global_vars.routing_table["platform"])


class ProfileHandler(BaseHandler):

    def get(self, slug):
        if self.current_user:
            self.render("profile.html")
        else:
            # redirect to platform if there is no logged in user
            self.redirect(global_vars.routing_table["platform"])


class SpaceRenderHandler(BaseHandler):

    def get(self, slug):
        if self.current_user:
            self.render("space.html")
        else:
            # redirect to platform if there is no logged in user
            self.redirect(global_vars.routing_table["platform"])


class SpaceOverviewHandler(BaseHandler):
    def get(self):
        if self.current_user:
            self.render("space_overview.html")
        else:
            # redirect to platform if there is no logged in user
            self.redirect(global_vars.routing_table["platform"])


class TemplateHandler(BaseHandler):

    def get(self):
        if self.current_user:
            self.render("blocks.html")
        else:
            # redirect to platform if there is no logged in user
            self.redirect(global_vars.routing_table["platform"])

class ACLHandler(BaseHandler):
    def get(self):
        if self.current_user:
            with open("html/acl.html") as fp:
                self.write(fp.read())
        else:
            # redirect to platform if there is no logged in user
            self.redirect(global_vars.routing_table["platform"])
