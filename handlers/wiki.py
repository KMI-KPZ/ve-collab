from handlers.base_handler import BaseHandler, auth_needed
import tornado.web
import requests
from bs4 import BeautifulSoup
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
        #page_content = self.wiki.get_page(page_name, html=True)
        page_content = requests.get("https://soserve.rz.uni-leipzig.de:8078/doku.php?id=" + page_name).content.decode()

        #rewrite relative links so they land on this handler again
        page_content = page_content.replace("doku.php?id", "wiki_page?page")

        #rewrite media to query from wiki
        page_content = page_content.replace("/lib/", "https://soserve.rz.uni-leipzig.de:8078/lib/")

        #test
        page_content = page_content.replace("<body>", "<body><p>I Have added this paragraph right here from the server</p>")

        #test to remove login, search and other buttons with Beautifulsoup
        soup = BeautifulSoup(page_content, features="html.parser")
        elements = soup.find_all(attrs={"class": ["login", "search", "action recent", "action media", "action index"]})
        for element in elements:
            element.decompose()

        page_content = str(soup)

        self.set_status(200)
        self.write(page_content)
        #self.write({"status": 200,
        #            "page_name": page_name,
        #            "page_content": page_content})
