from typing import Dict, List

import requests
import tornado.web
from tornado.options import options

import global_vars
from handlers.base_handler import BaseHandler, auth_needed
from resources.network.post import Posts
from resources.network.profile import Profiles
from resources.network.space import Spaces
from resources.planner.ve_plan import VEPlanResource

import util


class SearchHandler(BaseHandler):
    @auth_needed
    def get(self):
        """
        GET /search
        search the database for posts, tags, spaces, users and plans
        required parameters:
            query - search query
                (if you search for tags, u may use a comma-delimited list of strings to search for multiple tags)

        optional parameters: (at least one needs to be true obviously, default behaviour is "false", i.e. not included in search)
            posts - bool to include posts in the search (only "true" will evaluate to True!)
            tags - bool to include tags in the search (only "true" will evaluate to True!)
            users - bool to include users in the search (only "true" will evaluate to True!)
            spaces - bool to include spaces in the search (only "true" will evaluate to True!)
            plans - bool to include plans in the search (only "true" will evaluate to True!)

        returns:
            200 OK
            {"status": 200,
             "success": True,
             "users": [list_of_users_with_matching_profile_content],
             "tags": [list_of_posts_with_matching_tags],
             "posts": [list_of_posts_with_matching_content],
             "spaces": [list_of_spaces_with_matching_content]},
             "plans": [list_of_plans_with_matching_content]}

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
        search_spaces = self.get_argument("spaces", "false")
        search_plans = self.get_argument("plans", "false")

        # ensure type safety: only "true" will be True, everything else will evaluate to False
        search_posts = search_posts == "true"
        search_tags = search_tags == "true"
        search_users = search_users == "true"
        search_spaces = search_spaces == "true"
        search_plans = search_plans == "true"

        # reject if all search categories are false
        if not any([search_posts, search_tags, search_users, search_spaces, search_plans]):
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
        spaces_search_result = []
        plans_search_result = []

        # depending on flags, gather search results
        if search_users:
            users_search_result = self._search_users(query)

        if search_tags:
            tags_search_result = self._search_tags(query.split(","))

        if search_posts:
            posts_search_result = self._search_posts(query)

        if search_spaces:
            spaces_search_result = self._search_spaces(query)

        if search_plans:
            plans_search_result = self._search_plans(query)

        response = self.json_serialize_response(
            {
                "status": 200,
                "success": True,
                "users": users_search_result,
                "tags": tags_search_result,
                "posts": posts_search_result,
                "spaces": spaces_search_result,
                "plans": plans_search_result,
            }
        )

        self.set_status(200)
        self.write(response)

    def _search_users(self, query: str) -> List[Dict]:
        """
        suggestion search on user profiles based on names
        (i.e. first_name, last_name, username)
        :param query: search query
        :return: any users matching the query
        """

        # the prefix queries allow for autocompletion,
        # while fuzzy matches allow for typos, but only if the query
        # is fully typed out
        # TODO ideally prefix and fuzziness is combined somehow
        query = {
            "size": 5,
            "query": {
                "bool": {
                    "should": [
                        {
                            "prefix": {
                                "first_name": {"value": query, "case_insensitive": True}
                            }
                        },
                        {
                            "fuzzy": {
                                "first_name": {
                                    "value": query,
                                    "fuzziness": 1,
                                    "prefix_length": 1,
                                }
                            }
                        },
                        {
                            "prefix": {
                                "last_name": {"value": query, "case_insensitive": True}
                            }
                        },
                        {
                            "fuzzy": {
                                "last_name": {
                                    "value": query,
                                    "fuzziness": 1,
                                    "prefix_length": 1,
                                }
                            }
                        },
                        {
                            "prefix": {
                                "username": {"value": query, "case_insensitive": True}
                            }
                        },
                        {
                            "fuzzy": {
                                "username": {
                                    "value": query,
                                    "fuzziness": 1,
                                    "prefix_length": 1,
                                }
                            }
                        },
                    ],
                }
            },
        }

        search_url = "{}/{}/_search?".format(
            global_vars.elasticsearch_base_url, "profiles"
        )

        # catch test mode, because test_mode forces "test" index
        if options.test_admin or options.test_user:
            search_url = "{}/{}/_search?".format(
                global_vars.elasticsearch_base_url, "test"
            )

        response = requests.post(
            search_url,
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
            json=query,
        )

        # map usernames to exchange them for full profiles
        usernames = [
            elem["_source"]["username"] for elem in response.json()["hits"]["hits"]
        ]

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            return profile_manager.get_bulk_profiles(usernames)

    def _search_spaces(self, query: str) -> List[Dict]:
        """
        suggestion search on spaces profiles based on name and description
        :param query: search query
        :return: any spaces matching the query
        """

        query = {
            "query": {
                "bool": {
                    "should": [
                        {
                            "prefix": {
                                "name": {"value": query, "case_insensitive": True}
                            }
                        },
                        {
                            "fuzzy": {
                                "name": {
                                    "value": query,
                                    "fuzziness": 1,
                                    "prefix_length": 1,
                                }
                            }
                        },
                        {
                            "prefix": {
                                "space_description": {
                                    "value": query,
                                    "case_insensitive": True,
                                }
                            }
                        },
                        {
                            "fuzzy": {
                                "space_description": {
                                    "value": query,
                                    "fuzziness": 1,
                                    "prefix_length": 1,
                                }
                            }
                        },
                    ]
                }
            },
        }

        search_url = "{}/{}/_search?".format(
            global_vars.elasticsearch_base_url, "spaces"
        )

        # catch test mode, because test_mode forces "test" index
        if options.test_admin or options.test_user:
            search_url = "{}/{}/_search?".format(
                global_vars.elasticsearch_base_url, "test"
            )

        response = requests.post(
            search_url,
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
            json=query,
        )

        # map _id's to exchange them for full spaces
        space_ids = [elem["_id"] for elem in response.json()["hits"]["hits"]]

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            return space_manager.get_bulk_space_snippets(
                space_ids
            )

    def _search_tags(self, tags: List[str]) -> List[Dict]:
        """
        search tags of posts. since tags are only short and precise,
        this search is an exact match instead of full text search.
        Results are restricted to posts that the current_user is allowed to see
        (i.e. his own posts, posts in his spaces, posts from persons that he follows)
        :param tags: search tags
        :return: any posts that has tags that match the query
        """

        # tags is an exact match query, therefore explicitely search without using index
        with util.get_mongodb() as db:
            post_manager = Posts(db)
            matched_posts = post_manager.get_posts_by_tags(tags)

        if matched_posts:
            return self.reduce_disallowed_posts(matched_posts)
        else:
            return []

    def _search_posts(self, query: str) -> List[Dict]:
        """
        full text search on the contents of a post (i.e. text, tags, and files(-names))
        Results are restricted to posts that the current_user is allowed to see
        (i.e. his own posts, posts in his spaces, posts from persons that he follows)
        :param query: search query
        :return: any posts whose contents match the query
        """

        # full text search
        with util.get_mongodb() as db:
            post_manager = Posts(db)
            matched_posts = post_manager.fulltext_search(query)

        if matched_posts:
            matched_posts = self.add_authors_profile(matched_posts)
            return self.reduce_disallowed_posts(matched_posts)
        else:
            return []

    def reduce_disallowed_posts(self, posts: List[Dict]) -> List[Dict]:
        """
        Sort out posts from the input list that the current_user is not allowed to see,
        i.e. only posts will remain, that are
        a) in spaces where the current_user is a member of, or
        b) from users that he follows, or
        c) his own posts
        :param posts: list of posts (as dicts) that should be reduced
        :return: the reduced list of posts
        """

        reduced = []
        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            profile_manager = Profiles(db)
            space_ids_of_user = space_manager.get_space_ids_of_user(
                self.current_user.username
            )
            follows_of_user = profile_manager.get_follows(self.current_user.username)

        # iterate matched posts and sort out those that user is not allowed to see
        for post in posts:
            # if the post was in a space, the user has to be a member of it
            if post["space"]:
                if post["space"] in space_ids_of_user:
                    reduced.append(post)

            # if the post was not in a space, the user has to follow the author (or be the author himself)
            else:
                if (
                    post["author"] in follows_of_user
                    or post["author"] == self.current_user.username
                ):
                    reduced.append(post)

        return reduced

    def _search_plans(self, slug: str) -> List[Dict]:
        """
        suggestion search on public and own plans on plan name, topics and abstract
        :param slug: search slug
        :return: any plan matching the slug
        """

        # TODO may move directly to elasticsearch_integration ?!

        query = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "bool": {
                                "should": [
                                    {
                                        "match": { "author": self.current_user.username}
                                    },
                                    {
                                        "match": { "read_access": self.current_user.username}
                                    },
                                    {
                                        "match": { "write_access": self.current_user.username}
                                    },
                                    {
                                        "term": { "is_good_practise": True}
                                    }
                                ]
                            }
                        },
                        {
                            "bool": {
                                "should": [
                                    {
                                        "match": { "name": {
                                            "query": slug,
                                            "fuzziness": "AUTO"
                                        }}
                                    },
                                    {
                                        "match": { "topics": {
                                            "query": slug,
                                            "fuzziness": "AUTO"
                                        }}
                                    },
                                    {
                                        "match": { "abstract": {
                                            "query": slug,
                                            "fuzziness": "AUTO"
                                        }}
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
        }

        search_url = "{}/{}/_search?".format(
            global_vars.elasticsearch_base_url, "plans"
        )

        # catch test mode, because test_mode forces "test" index
        if options.test_admin or options.test_user:
            search_url = "{}/{}/_search?".format(
                global_vars.elasticsearch_base_url, "test"
            )

        response = requests.post(
            search_url,
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
            json=query,
        )

        # map _id's to exchange them for full plans
        plans_ids = [elem["_id"] for elem in response.json()["hits"]["hits"]]

        with util.get_mongodb() as db:
            plans_manager = VEPlanResource(db)

            matched_plans = [
                plan.to_dict()
                for plan in plans_manager.get_bulk_plans(plans_ids)
            ]
            matched_plans = self.add_authors_profile(matched_plans)

        if matched_plans:
            return matched_plans
        else:
            return []

    def _search_plans_old(self, query: str) -> List[Dict]:
        """
        suggestion search on public and own plans on plan name, topics and abstract
        :param query: search query
        :return: any plans matching the query
        """

        with util.get_mongodb() as db:
            plans_manager = VEPlanResource(db)
            matched_plans = [
                plan.to_dict()
                for plan in plans_manager.find_plans_for_user_by_slug(self.current_user.username, query)
            ]
            matched_plans = self.add_authors_profile(matched_plans)

        if matched_plans:
            return matched_plans
        else:
            return []

    def add_authors_profile(self, assets: List[Dict]) -> List[Dict]:
        """
        Add author profile information like first_name, last_name profile_pic to any list with "author" property
        :param assets: list with "author" property
        :return: assets list
        """

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)

            # collect all usernames that we have to request the profile information for, avoiding duplicates
            usernames_to_request = []
            for asset in assets:
                if asset["author"] not in usernames_to_request:
                    usernames_to_request.append(asset["author"])

            profile_snippets = profile_manager.get_profile_snippets(
                usernames_to_request
            )

            for asset in assets:
                asset["author"] = next(
                    (
                        profile
                        for profile in profile_snippets
                        if profile["username"] == asset["author"]
                    ),
                    [None],
                )

        return assets
