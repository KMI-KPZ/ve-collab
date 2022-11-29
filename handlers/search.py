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

        returns:
            200 OK
            {"status": 200,
             "success": True,
             "users": [list_of_users_with_matching_profile_content],
             "tags": [list_of_posts_with_matching_tags],
             "posts": [list_of_posts_with_matching_content]}

            400 Bad Request
            {"status": 400,
             "success": False,
             "reason": "missing_key:query"}

            400 Bad Request
            {"status": 400,
             "success": False,
             "reason": "no_search_categories_included"}
            (all search category parameters are set to false, set atleast one to true)

            401 Unauthorized
            {"status": 401,
             "success": False,
             "reason": "no_logged_in_user"}
        """

        try:
            query = self.get_argument("query")
        except tornado.web.MissingArgumentError:
            self.set_status(400)
            self.write({"status": 400, "success": False, "reason": "missing_key:query"})
            return

        search_posts = self.get_argument("posts", "false")
        search_tags = self.get_argument("tags", "false")
        search_users = self.get_argument("users", "false")

        # ensure type safety: only "true" will be True, everything else will evaluate to False
        search_posts = search_posts == "true"
        search_tags = search_tags == "true"
        search_users = search_users == "true"

        # reject if all search categories are false
        if not any([search_posts, search_tags, search_users]):
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "no_search_categories_included",
                }
            )
            return

        users_search_result = []
        tags_search_result = []
        posts_search_result = []

        # depending on flags, gather search results
        if search_users:
            users_search_result = self._search_users(query)

        if search_tags:
            tags_search_result = self._search_tags(query)

        if search_posts:
            posts_search_result = self._search_posts(query)

        response = {
            "status": 200,
            "success": True,
            "users": users_search_result,
            "tags": tags_search_result,
            "posts": posts_search_result,
        }

        self.set_status(200)
        self.write(response)

    def _search_users(self, query: str) -> List[Dict]:
        """
        full text search on user profiles
        :param query: search query
        :return: any users matching the query
        """

        # TODO decide if user search should be limited to name, because like this it searches for anything on the profile
        res = self.db.profiles.find({"$text": {"$search": query}})
        ret = []
        for elem in res:
            elem["_id"] = str(elem["_id"])
            ret.append(elem)
        return ret

    def _search_tags(self, query: str) -> List[Dict]:
        """
        search tags of posts. since tags are only short and precise, this search is an exact match instead of full text search.
        :param query: search query
        :return: any posts that has tags that match the query
        """

        # tags is an exact match query, therefore explicitely search without using index
        matched_posts = self.db.posts.find({"tags": query})

        remaining_posts = []
        # iterate matched posts and sort out those that user is not allowed to see
        for post in matched_posts:
            # if the post was in a space, the user has to be a member of it
            if post["space"]:
                if post["space"] in self._get_spaces_of_current_user():
                    remaining_posts.append(post)

            # if the post was not in a space, the user has to follow the author (or be the author himself)
            else:
                if (
                    post["author"] in self._get_follows_of_current_user()
                    or post["author"] == self.current_user.username
                ):
                    remaining_posts.append(post)

        return self.json_serialize_posts(remaining_posts)

    def _search_posts(self, query: str) -> List[Dict]:
        """
        full text search on the contents of a post (i.e. text, tags, and files(-names))
        :param query: search query
        :return: any posts whose contents match the query
        """

        # full text search
        matched_posts = self.db.posts.find({"$text": {"$search": query}})

        remaining_posts = []
        # iterate matched posts and sort out those that user is not allowed to see
        for post in matched_posts:
            # if the post was in a space, the user has to be a member of it
            if post["space"]:
                if post["space"] in self._get_spaces_of_current_user():
                    remaining_posts.append(post)

            # if the post was not in a space, the user has to follow the author (or be the author himself)
            else:
                if (
                    post["author"] in self._get_follows_of_current_user()
                    or post["author"] == self.current_user.username
                ):
                    remaining_posts.append(post)

        return self.json_serialize_posts(remaining_posts)

    def _get_spaces_of_current_user(self) -> List[str]:
        """
        get a list of spaces the current_user is a member of
        """

        spaces_cursor = self.db.spaces.find(
            filter={"members": self.current_user.username}
        )
        spaces = []
        for space in spaces_cursor:
            spaces.append(space["name"])
        return spaces

    def _get_follows_of_current_user(self) -> List[str]:
        """
        get a list of users that the current_user follows (i.e. current_user FOLLOWS other_users)
        """

        followers_result = self.db.profiles.find_one(
            {"username": self.current_user.username},
            projection={"_id": False, "follows": True},
        )
        return followers_result["follows"] if followers_result else []
