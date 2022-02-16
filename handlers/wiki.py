from handlers.base_handler import BaseHandler, auth_needed
import tornado.web

from dokuwiki_integration import Wiki


class WikiPageNamesHandler(BaseHandler):

    @auth_needed
    def get(self):
        """
        GET /wiki_pages
            get a list of all existing pages in the wiki (optional: only in a certain namespace:

            optional query parameters:
                "namespace" : restrict page search only to this namespace

            returns:
                200 OK
                {"status": 200,
                 "page_names": ["page1", "page2", ...]}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        namespace = self.get_argument("namespace", None)

        if namespace:
            page_names = self.wiki.get_page_names_in_namespace(namespace)
        else:
            page_names = self.wiki.get_page_names()

        self.set_status(200)
        self.write({"status": 200,
                    "page_names": page_names})


class WikiPageHandler(BaseHandler):

    @auth_needed
    def get(self):
        """
        GET /wiki_page
            get the content of a wiki page as a html template

            query params:
                "page" : the name of the page

            returns:
                200 OK
                {"status": 200,
                 "page_name": <name_of_page>
                 "page_content": <content_as_html_string>}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        try:
            page_name = self.get_argument("page")
        except tornado.web.MissingArgumentError as e:
            print(e)

            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key"})
            return

        #request page from dokuwiki (wrapper)
        wiki = Wiki("http://soserve.rz.uni-leipzig.de:8079/", "user", "password")  # use fixed user for now, TODO integration platform users into wiki (plugin authPDO?)
        page_name="personalthemen"
        page_content = wiki.get_page(page_name, html=True)

        #rewrite relative links so they land on this handler again
        page_content = page_content.replace("doku.php?id", "wiki_page?page")

        self.set_status(200)
        self.write({"status": 200,
                    "page_name": page_name,
                    "page_content": page_content})
