from email.utils import make_msgid
import tornado.web
import global_vars


class TemplateDebugHandler(tornado.web.RequestHandler):

    def get(self, slug):
        # base layout images
        logo_cid_bare = "/assets/images/logo.png"
        bmbf_cid_bare = "/assets/images/bmbf_logo.png"
        eu_cid_bare = "/assets/images/eu_funding.png"

        # html template
        template = global_vars.email_template_env.get_template("{}.html".format(slug))
        rendered = template.render(
            logo_cid=logo_cid_bare,
            bmbf_cid=bmbf_cid_bare,
            eu_cid=eu_cid_bare,
        )
        self.write(rendered)
