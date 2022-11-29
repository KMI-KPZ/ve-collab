from typing import Dict, List, Tuple

from datetime import datetime, timedelta
import dateutil.parser

from resources.acl import ACL
from handlers.base_handler import BaseHandler, auth_needed
from logger_factory import log_access


class BaseTimelineHandler(BaseHandler):
    def parse_timeframe_args(self) -> Tuple[datetime, datetime]:
        """
        Parse the timestamps defining the windows the posts have to be in.
        They are given as query parameters ("from" and "to").
        The parser will guess the timestamp format,
        however, using ISO 8601 format will guarantee success.
        :returns: the parsed timestamps as datetime objects in a tuple
        """

        time_from = self.get_argument(
            "from", (datetime.utcnow() - timedelta(days=1)).isoformat()
        )  # default value is 24h ago
        time_to = self.get_argument(
            "to", datetime.utcnow().isoformat()
        )  # default value is now

        # parse time strings into datetime objects (dateutil is able to guess format)
        # however safe way is to use ISO 8601 format
        time_from = dateutil.parser.parse(time_from)
        time_to = dateutil.parser.parse(time_to)

        return time_from, time_to

    def add_profile_pic_to_author(self, posts: List[Dict]) -> List[Dict]:
        """
        modify the "author" key of the post and comments to not only be the username,
        but a mix of "username" and "profile_pic" as a nested dict
        :returns: the modified posts
        """

        pic_cache = {}

        for post in posts:
            author_name = post["author"]
            # if we have already requested the picture in this loop,
            # simply use a cached version of the picture to reduce db
            # connections
            if author_name in pic_cache:
                post["author"] = {
                    "username": author_name,
                    "profile_pic": pic_cache[author_name],
                }
            # we haven't yet requested the profile picture
            # query it from the db and save it in the cache for further iterations
            else:
                profile = self.db.profiles.find_one({"username": author_name})
                pic_val = (
                    profile["profile_pic"] if profile else "default_profile_pic.jpg"
                )

                pic_cache[author_name] = pic_val

                post["author"] = {
                    "username": author_name,
                    "profile_pic": pic_val,
                }

            # exactly the same procedure for the comments
            for comment in post["comments"]:
                comment_author_name = comment["author"]
                if comment_author_name in pic_cache:
                    comment["author"] = {
                        "username": comment_author_name,
                        "profile_pic": pic_cache[comment_author_name],
                    }
                else:
                    profile = self.db.profiles.find_one({"username": comment_author_name})
                    comment_pic_val = (
                        profile["profile_pic"] if profile else "default_profile_pic.jpg"
                    )
                    pic_cache[comment_author_name] = comment_pic_val
                    comment["author"] = {
                        "username": comment_author_name,
                        "profile_pic": comment_pic_val,
                    }

        return posts


class TimelineHandler(BaseTimelineHandler):
    """
    Timeline of all posts (all users and all spaces)
    no use case in production, maybe use case for moderators?
    """

    @log_access
    @auth_needed
    async def get(self):
        """
        GET /timeline
            watch the full timeline of all posts whatsoever, requires global admin privileges
        query params:
            "from" : ISO timestamp string (fetch posts not older than this), default: now-24h
            "to" : ISO timestamp string (fetch posts younger than this), default: now
        return:
            200 OK,
            {"success": True, "posts": [...]}

            403 Forbidden
            {"success": False, "reason": "insufficient_permission"}
        """

        # abort if user is not global admin
        if not self.is_current_user_lionet_admin():
            self.set_status(403)
            self.write({"success": False, "reason": "insufficient_permission"})
            return

        time_from, time_to = self.parse_timeframe_args()

        result = self.db.posts.find(
            {"creation_date": {"$gte": time_from, "$lte": time_to}}
        )

        # serialize post objects to dicts and enhance author information
        posts = self.add_profile_pic_to_author(self.json_serialize_posts(result))

        self.set_status(200)
        self.write({"success": True, "posts": posts})


class SpaceTimelineHandler(BaseTimelineHandler):
    """
    Timeline of a certain space
    """

    @log_access
    @auth_needed
    def get(self, space_name):
        """
        GET /timeline/space/[name]
        query params:
            "from" : ISO timestamp string (fetch posts not older than this), default: now-24h
            "to" : ISO timestamp string (fetch posts younger than this), default: now
        return:
            200 OK,
            {"posts": [post1, post2,...]}

             401 Unauthorized,
             {"success": False,
              "reason": "no_logged_in_user"}


            403 Forbidden,
            {"success": False,
             "reason": "insufficient_permission"}

            409 Conflict,
            {"success": False,
             "reason": "user_not_member_of_space"}
        """

        time_from, time_to = self.parse_timeframe_args()

        # reject if user is not member of the space
        space = self.db.spaces.find_one({"name": space_name})
        if self.current_user.username not in space["members"]:
            self.set_status(409)
            self.write({"success": False, "reason": "user_not_member_of_space"})
            return

        # ask for permission to read timeline
        with ACL() as acl:
            if not acl.space_acl.ask(
                self.get_current_user_role(), space_name, "read_timeline"
            ):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

        # query posts in the space that match the timeframe or have been pinned
        result = self.db.posts.find(
            {
                "space": {"$eq": space_name},
                "$or": [
                    {"creation_date": {"$gte": time_from, "$lte": time_to}},
                    {"pinned": True},
                ],
            }
        )

        posts = self.add_profile_pic_to_author(self.json_serialize_posts(result))

        self.set_status(200)
        self.write({"success": True, "posts": posts})


class UserTimelineHandler(BaseTimelineHandler):
    """
    Timeline of a user (e.g. for his profile)
    """

    @log_access
    @auth_needed
    def get(self, author):
        """
        GET /timeline/user/[username]
        query params:
            "from" : ISO timestamp string (fetch posts not older than this), default: now-24h
            "to" : ISO timestamp string (fetch posts younger than this), default: now
        return:
            200 OK,
            {"posts": [post1, post2,...]}

            401 Unauthorized
            {"status": 401,
             "reason": "no_logged_in_user"}
        """

        time_from, time_to = self.parse_timeframe_args()

        # TODO what about posts in spaces? include? exclude?
        # include only those that current user is also in?
        result = self.db.posts.find(
            {
                "creation_date": {"$gte": time_from, "$lte": time_to},
                "author": {"$eq": author},
            }
        )

        posts = self.add_profile_pic_to_author(self.json_serialize_posts(result))

        self.set_status(200)
        self.write({"success": True, "posts": posts})


class PersonalTimelineHandler(BaseTimelineHandler):
    """
    the timeline of the currently authenticated user.
    i.e. your posts, posts of users you follow, posts in spaces you are in
    """

    @log_access
    @auth_needed
    def get(self):
        """
        GET /timeline/you
            query params:
                "from" : ISO timestamp string (fetch posts not older than this), default: now-24h
                "to" : ISO timestamp string (fetch posts younger than this), default: now
            return:
                200 OK,
                {"posts": [post1, post2,...]}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        time_from, time_to = self.parse_timeframe_args()

        # the full pipeline to gather the timeline, it includes posts that:
        # you posted yourself,
        # are posted by users that you follow,
        # are in spaces that you are a member of.
        # but only, if they are within the specified time frame
        pipeline = self.db.posts.aggregate(
            [
                # pre-filter for the time-frame (further operations are expensive
                # thats why it's smart to sort out as many as possible)
                {"$match": {"creation_date": {"$gte": time_from, "$lte": time_to}}},
                # add the current_user as a field,
                # we need this because looksups have to be on fields
                {"$addFields": {"curr_user": self.current_user.username}},
                # join with the space collection on the space name
                {
                    "$lookup": {
                        "from": "spaces",
                        "localField": "space",
                        "foreignField": "name",
                        "as": "space_obj",
                    }
                },
                # join with the follows collection on the current user
                {
                    "$lookup": {
                        "from": "profiles",
                        "localField": "curr_user",
                        "foreignField": "username",
                        "as": "profile_obj",
                    }
                },
                # lookup result is a list, but since it is a n:1-relation,
                # we only expect one space and can safely flatten the list to a dict
                {
                    "$unwind": {
                        "path": "$space_obj",
                        "preserveNullAndEmptyArrays": True,
                    }
                },
                # lookup result is a list, but since it is a n:1-relation,
                # we only expect one follow-record
                # and can safely flatten the list to a dict
                {
                    "$unwind": {
                        "path": "$profile_obj",
                        "preserveNullAndEmptyArrays": True,
                    }
                },
                # to make our lives easier with matching later
                # we extract the list of users the current_user follows from the dict
                # and also append the current_user himself to it
                # (that way we can simply match "author in flattened_follows").
                # this is rather complex, because if the lookup doesnt find any match,
                # the result is missing (instead of None or []), so we have to check for that
                {
                    "$addFields": {
                        "flattened_follows": {
                            "$cond": {
                                "if": {"$ne": [{"$type": "$profile_obj"}, "missing"]},
                                "then": {
                                    "$concatArrays": [
                                        "$profile_obj.follows",
                                        [self.current_user.username],
                                    ]
                                },
                                "else": {
                                    "$concatArrays": [
                                        [],
                                        [self.current_user.username],
                                    ]
                                },
                            }
                        }
                    }
                },
                # now the actual filtering begins:
                # - the time-frame was already checked above, so no need to do that here
                # we now have to check for the 3 cases described on top of the pipeline,
                # that allow for the post to be in the timeline
                {
                    "$match": {
                        "$or": [
                            # this catches the first and the second case
                            # (being either the author yourself or you are following
                            # the author of the post)
                            {"$expr": {"$in": ["$author", "$flattened_follows"]}},
                            # this catches the third case, being a member of the space
                            # the post was put into
                            # same story as for the flattened_follows:
                            # this is rather complex, because if the lookup doesnt find anything
                            # the expected dict is not present (instead of None or []),
                            # so we have to check existence, and only if it exists, if current_user
                            # is really a member of the space
                            {
                                "$expr": {
                                    "$in": [
                                        self.current_user.username,
                                        {
                                            "$cond": {
                                                "if": {
                                                    "$ne": [
                                                        {"$type": "$space_obj"},
                                                        "missing",
                                                    ]
                                                },
                                                "then": "$space_obj.members",
                                                "else": [],
                                            }
                                        },
                                    ]
                                }
                            },
                        ],
                        # the matches above actually cover all relevant cases, but one single detail is missing:
                        # they include posts from user that i follow, that they have posted into spaces
                        # where i am not a member.
                        # since i am not a member of that space, i shouldnt be allowed to view that post,
                        # so we have to filter those out as well by checking:
                        #   author is not current_user
                        #   AND post is in a space
                        #   AND current_user is not member of that space
                        # if that is true, we leave out the post
                        "$expr": {
                            "$eq": [
                                False,
                                {
                                    "$cond": {
                                        "if": {
                                            "$and": [
                                                # check author != cur_user
                                                {
                                                    "$ne": [
                                                        "$author",
                                                        "$curr_user",
                                                    ]
                                                },
                                                # check space not None
                                                {"$ne": ["$space", None]},
                                                # check cur_user not member of space
                                                {
                                                    "$not": {
                                                        "$in": [
                                                            self.current_user.username,
                                                            {
                                                                "$cond": {
                                                                    "if": {
                                                                        "$ne": [
                                                                            {
                                                                                "$type": "$space_obj"
                                                                            },
                                                                            "missing",
                                                                        ]
                                                                    },
                                                                    "then": "$space_obj.members",
                                                                    "else": [],
                                                                }
                                                            },
                                                        ]
                                                    }
                                                },
                                            ]
                                        },
                                        "then": True,
                                        "else": False,
                                    }
                                },
                            ]
                        },
                    }
                },
                # last step, cleanup all the extra fields we had to use along
                {
                    "$unset": [
                        "curr_user",
                        "flattened_follows",
                        "profile_obj",
                        "space_obj",
                    ]
                },
            ]
        )

        posts = self.add_profile_pic_to_author(self.json_serialize_posts(pipeline))

        self.set_status(200)
        self.write({"success": True, "posts": posts})


class NewPostsSinceTimestampHandler(BaseHandler):
    """
    check for new posts
    """

    @log_access
    @auth_needed
    def get(self):
        """
        GET /updates
            query param: from (timestamp string), default now - 24h
            return:
                200 OK --> new posts, use timeline handlers to retrieve
                304 Not Modified --> no new posts since timestamp, no need to query timeline handlers
        """

        timestamp = self.get_argument(
            "from", (datetime.utcnow() - timedelta(days=1)).isoformat()
        )
        timestamp = dateutil.parser.parse(timestamp)

        new_posts_count = self.db.posts.count_documents(
            {"creation_date": {"$gte": timestamp}}
        )

        # no new posts happened since the requested timestamp, reply with 304 Not Modified
        if new_posts_count == 0:
            self.set_status(304)
            return

        # new posts since timestamp, user should query the timeline handlers
        self.set_status(200)
        self.write(
            {
                "success": True,
                "new_posts": True,
                "since_timestamp": timestamp.isoformat(),
            }
        )
