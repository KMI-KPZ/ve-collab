from handlers.base_handler import BaseHandler, auth_needed


class MainHandler(BaseHandler):

    @auth_needed
    def get(self):
        self.render("main.html")


class MainRedirectHandler(BaseHandler):

    @auth_needed
    def get(self):
        self.redirect("/main")


class MyProfileHandler(BaseHandler):

    @auth_needed
    def get(self):
        self.render("myProfile.html")


class ProfileHandler(BaseHandler):

    @auth_needed
    def get(self, slug):
        self.render("profile.html")


class SpaceRenderHandler(BaseHandler):

    @auth_needed
    def get(self, slug):
        self.render("space.html")


class SpaceOverviewHandler(BaseHandler):

    @auth_needed
    def get(self):
        self.render("space_overview.html")


class TemplateHandler(BaseHandler):

    @auth_needed
    def get(self):
        self.render("blocks.html")


class ACLHandler(BaseHandler):

    @auth_needed
    def get(self):
        with open("html/acl.html") as fp:
            self.write(fp.read())
