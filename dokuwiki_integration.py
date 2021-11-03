from __future__ import annotations
from pprint import pprint

from typing import List

import dokuwiki


class Wiki:
    def __init__(self, url: str, username: str = None, password: str = None, **kwargs) -> None:
        self.url = url
        self.username = username
        self.password = password
        self._wiki = dokuwiki.DokuWiki(url, username, password, **kwargs)

    def get_page_names(self) -> List[str]:
        """
        retrieve a list of all existing page names in the wiki
        :return: list of page names
        """

        return [element["id"] for element in self._wiki.pages.list()]

    def get_page_names_in_namespace(self, namespace: str) -> List[str]:
        """
        retrieve a list of all existing pages within a given namespace
        :param namespace: the namespace to restrict the search within
        :return: list of pages names
        """

        return [element["id"] for element in self._wiki.pages.list(namespace=namespace)]

    def get_page(self, name: str, html: bool = False) -> str:
        """
        retrieve a specified page
        :param name: the name of the page
        :param html: boolean switch, set to True to get a html representation of the page. otherwise returns the default (markdown/text) representation. default False
        :return: the wiki page in the chosen representation
        """

        if html:
            return self._wiki.pages.html(name)
        else:
            return self._wiki.pages.get(name)

    def create_page(self, name: str, content: str) -> None:
        """
        create a page with content
        :param name: the name of the wiki page, use <level1>:<level2>:... for hierarchy
        :param content: the content of the page. Markdown is supported by Dokuwiki
        """
        self._wiki.pages.set(name, content)


if __name__ == "__main__":
    wiki = Wiki("http://localhost/", "test_user", "test123")
    print(wiki.get_page_names())
    print(wiki.get_page("test_space:start"))
    print(wiki.get_page("test_space:start", html=True))
