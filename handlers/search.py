from typing import Dict, List
import tornado.web

from handlers.base_handler import BaseHandler, auth_needed
from logger_factory import log_access


class SearchHandler(BaseHandler):

    @log_access
    @auth_needed
    def get(self):
        """
        GET /search
        search the database for posts, tags, and users
        required parameters: 
            query - search query

        optional parameters: (at least one needs to be true obviously, default behaviour is "false", i.e. not included in search)
            posts - bool to include posts in the search (only "true" will evaluate to True!)
            tags - bool to include tags in the search (only "true" will evaluate to True!)
            users - bool to include users in the search (only "true" will evaluate to True!)
        """
        try:
            query = self.get_argument("query")
        except tornado.web.MissingArgumentError:
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key:query"})
            return

        search_posts = self.get_argument("posts", "false")
        search_tags = self.get_argument("tags", "false")
        search_users = self.get_argument("users", "false")

        # ensure type safety: only "true" will be True, everything else will evaluate to False
        search_posts = (search_posts == "true")
        search_tags = (search_tags == "true")
        search_users = (search_users == "true")

        users_search_result = []
        tags_search_result = []
        posts_search_result = []

        if search_users:
            users_search_result = self._search_users(query)

        if search_tags:
            tags_search_result = self._search_tags(query)

        if search_posts:
            posts_search_result = self._search_posts(query)

        response = {
            "users": users_search_result,
            "tags": tags_search_result,
            "posts": posts_search_result
        }

        self.set_status(200)
        self.write(response)


    def _search_users(self, query: str) -> List[Dict]:
        # TODO decide if user search should be limited to name, because like this it searches for anything on the profile
        res = self.db.profiles.find({"$text": {"$search": query}})
        ret = []
        for elem in res:
            elem["_id"] = str(elem["_id"])
            ret.append(elem)
        return ret

    def _search_tags(self, query: str) -> List[Dict]:
        # TODO sort out posts that user is not allowed to see, e.g. in spaces that he is not member of or person's he doesn't follow
        # i'd suggest tags is an exact match query, therefore explicitely search without using index
        res = self.db.posts.find({"tags": query})
        ret = []
        for elem in res:
            print(elem)
            elem["_id"] = str(elem["_id"])
            elem["creation_date"] = str(elem["creation_date"])
            if "comments" in elem:
                for comment in elem["comments"]:
                    comment["_id"] = str(comment["_id"])
                    comment["creation_date"] = str(comment["creation_date"])
            ret.append(elem)
        return ret

    def _search_posts(self, query: str) -> List[Dict]:
        # TODO sort out posts that user is not allowed to see, e.g. in spaces that he is not member of or person's he doesn't follow
        res = self.db.posts.find({"$text": {"$search": query}})
        ret = []
        for elem in res:
            elem["_id"] = str(elem["_id"])
            elem["creation_date"] = str(elem["creation_date"])
            if "comments" in elem:
                for comment in elem["comments"]:
                    comment["_id"] = str(comment["_id"])
                    comment["creation_date"] = str(comment["creation_date"])
            ret.append(elem)
        return ret

