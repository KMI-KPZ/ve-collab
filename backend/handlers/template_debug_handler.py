from email.utils import make_msgid
import tornado.web
import global_vars


class TemplateDebugHandler(tornado.web.RequestHandler):

    def get(self, slug):
        # base layout images
        background_cid_bare = "/assets/images/background.png"
        logo_cid_bare = "/assets/images/logo.png"
        bmbf_cid_bare = "/assets/images/bmbf_logo.png"
        eu_cid_bare = "/assets/images/eu_funding.png"

        # html template
        template = global_vars.email_template_env.get_template("{}.html".format(slug))
        rendered = template.render(
            logo_cid=logo_cid_bare,
            bmbf_cid=bmbf_cid_bare,
            eu_cid=eu_cid_bare,
            background_cid=background_cid_bare,
            text="Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy \n \n eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.",
        )
        self.write(rendered)
