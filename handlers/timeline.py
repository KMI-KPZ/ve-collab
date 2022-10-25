from datetime import datetime, timedelta
import dateutil.parser

from acl import ACL
from handlers.base_handler import BaseHandler, auth_needed
from logger_factory import log_access
import util

class TimelineHandler(BaseHandler):
    """
    Timeline of all posts (all users and all spaces)
    no use case in production, maybe use case for moderators?
    """
    @log_access
    @auth_needed
    async def get(self):
        """
        GET /timeline
        query params:
            "from" : ISO timestamp string (fetch posts not older than this), default: now-24h
            "to" : ISO timestamp string (fetch posts younger than this), default: now
        return:
            200 OK,
            {"posts": [post1, post2,...]}
        """
        if await util.is_admin(self.current_user.username):
            time_from = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())  # default value is 24h ago
            time_to = self.get_argument("to", datetime.utcnow().isoformat())  # default value is now

            # parse time strings into datetime objects (dateutil is able to guess format)
            # however safe way is to use ISO 8601 format
            time_from = dateutil.parser.parse(time_from)
            time_to = dateutil.parser.parse(time_to)

            result = self.db.posts.find(
                            filter={"creation_date": {"$gte": time_from, "$lte": time_to}})

            posts = self.json_serialize_posts(result)
            # TODO more efficient
            for post in posts:
                author_name = post["author"]
                post["author"] = {}
                post["author"]["profile_pic"] = "default_profile_pic.jpg"
                profile = self.db.profiles.find_one({"user": author_name})
                if profile:
                    if "profile_pic" in profile:
                        post["author"]["profile_pic"] = profile["profile_pic"]
                post["author"]["username"] = author_name
                if "comments" in post:
                    for comment in post["comments"]:
                        comment_author_name = comment["author"]
                        comment["author"] = {}
                        comment["author"]["profile_pic"] = "default_profile_pic.jpg"
                        comment_author_profile = self.db.profiles.find_one({"user": comment_author_name})
                        if comment_author_profile:
                            if "profile_pic" in comment_author_profile:
                                comment["author"]["profile_pic"] = comment_author_profile["profile_pic"]
                        comment["author"]["username"] = comment_author_name

            self.set_status(200)
            self.write({"posts": posts})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "not_admin"})


class SpaceTimelineHandler(BaseHandler):
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

            409 Conflict,
            {"status": 409,
             "reason": "user_not_member_of_space"}

             401 Unauthorized,
             {"status": 401,
              "reason": "no_logged_in_user"}
        """

        time_from = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())  # default value is 24h ago
        time_to = self.get_argument("to", datetime.utcnow().isoformat())  # default value is now

        # parse time strings into datetime objects (dateutil is able to guess format)
        # however safe way is to use ISO 8601 format
        time_from = dateutil.parser.parse(time_from)
        time_to = dateutil.parser.parse(time_to)

        # check if current_user is in the space and only query for posts if yes
        space = self.db.spaces.find_one(
            {"name": space_name}
        )
        if self.current_user.username in space["members"]:
            # ask for permission to read timeline
            with ACL() as acl:
                if not acl.space_acl.ask(self.get_current_user_role(), space_name, "read_timeline"):
                    self.set_status(403)
                    self.write({"status": 403,
                                "reason": "insufficient_permission"})
                    return

            result = self.db.posts.find(filter={
                "$or": [
                    {"creation_date": {"$gte": time_from, "$lte": time_to}},
                    {"pinned": True}
                ],
                "space": {"$eq": space_name}
            })

            posts = self.json_serialize_posts(result)
            # TODO more efficient
            for post in posts:
                author_name = post["author"]
                post["author"] = {}
                post["author"]["profile_pic"] = "default_profile_pic.jpg"
                profile = self.db.profiles.find_one({"user": author_name})
                if profile:
                    if "profile_pic" in profile:
                        post["author"]["profile_pic"] = profile["profile_pic"]
                post["author"]["username"] = author_name
                if "comments" in post and post['comments'] is not None: #PLACEHOLDER FOR HANDLING COMMENTS WITH NULL VALUE
                    for comment in post["comments"]:
                        comment_author_name = comment["author"]
                        comment["author"] = {}
                        comment["author"]["profile_pic"] = "default_profile_pic.jpg"
                        comment_author_profile = self.db.profiles.find_one({"user": comment_author_name})
                        if comment_author_profile:
                            if "profile_pic" in comment_author_profile:
                                comment["author"]["profile_pic"] = comment_author_profile["profile_pic"]
                        comment["author"]["username"] = comment_author_name

            self.set_status(200)
            self.write({"posts": posts})

        else:
            self.set_status(409)
            self.write({"status": 409,
                        "reason": "user_not_member_of_space"})


class UserTimelineHandler(BaseHandler):
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

        time_from = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())  # default value is 24h ago
        time_to = self.get_argument("to", datetime.utcnow().isoformat())  # default value is now

        # parse time strings into datetime objects (dateutil is able to guess format)
        # however safe way is to use ISO 8601 format
        time_from = dateutil.parser.parse(time_from)
        time_to = dateutil.parser.parse(time_to)

        # TODO what about posts in spaces? include? exclude? include only those that current user is also in?
        result = self.db.posts.find(
                        filter={"creation_date": {"$gte": time_from, "$lte": time_to},
                                "author":         {"$eq": author}})

        posts = self.json_serialize_posts(result)
        # TODO more efficient
        for post in posts:
            author_name = post["author"]
            post["author"] = {}
            post["author"]["profile_pic"] = "default_profile_pic.jpg"
            profile = self.db.profiles.find_one({"user": author_name})
            if profile:
                if "profile_pic" in profile:
                    post["author"]["profile_pic"] = profile["profile_pic"]
            post["author"]["username"] = author_name
            if "comments" in post and post['comments'] is not None: #PLACEHOLDER FOR HANDLING COMMENTS WITH NULL VALUE:
                for comment in post["comments"]:
                    comment_author_name = comment["author"]
                    comment["author"] = {}
                    comment["author"]["profile_pic"] = "default_profile_pic.jpg"
                    comment_author_profile = self.db.profiles.find_one({"user": comment_author_name})
                    if comment_author_profile:
                        if "profile_pic" in comment_author_profile:
                            comment["author"]["profile_pic"] = comment_author_profile["profile_pic"]
                    comment["author"]["username"] = comment_author_name

        self.set_status(200)
        self.write({"posts": posts})


class PersonalTimelineHandler(BaseHandler):
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

        time_from = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())  # default value is 24h ago
        time_to = self.get_argument("to", datetime.utcnow().isoformat())  # default value is now

        # parse time strings into datetime objects (dateutil is able to guess format)
        # however safe way is to use ISO 8601 format
        time_from = dateutil.parser.parse(time_from)
        time_to = dateutil.parser.parse(time_to)

        spaces_cursor = self.db.spaces.find(
            filter={"members": self.current_user.username}
        )
        spaces = []
        with ACL() as acl:
            for space in spaces_cursor:
                # only allow posts from spaces that you are in and have permission to read the timeline
                if acl.space_acl.ask(self.get_current_user_role(), space["name"], "read_timeline"):
                    spaces.append(space["name"])

        follows_cursor = self.db.follows.find(
            filter={"user": self.current_user.username},
            projection={"_id": False}
        )
        follows = []
        for user in follows_cursor:
            follows = user["follows"]
        follows.append(self.current_user.username)  # append yourself for easier query of posts

        result = self.db.posts.find(
            filter={"creation_date": {"$gte": time_from, "$lte": time_to}}
        )

        posts_to_keep = []
        for post in result:
            if ("author" in post and post["author"] in follows) or ("space" in post and post["space"] in spaces):
                posts_to_keep.append(post)

        posts = self.json_serialize_posts(posts_to_keep)
        # TODO more efficient
        for post in posts:
            author_name = post["author"]
            post["author"] = {}
            post["author"]["profile_pic"] = "default_profile_pic.jpg"
            profile = self.db.profiles.find_one({"user": author_name})
            if profile:
                if "profile_pic" in profile:
                    post["author"]["profile_pic"] = profile["profile_pic"]
            post["author"]["username"] = author_name
            if "comments" in post and post['comments'] is not None: #PLACEHOLDER FOR HANDLING COMMENTS WITH NULL VALUE:
                for comment in post["comments"]:
                    comment_author_name = comment["author"]
                    comment["author"] = {}
                    comment["author"]["profile_pic"] = "default_profile_pic.jpg"
                    comment_author_profile = self.db.profiles.find_one({"user": comment_author_name})
                    if comment_author_profile:
                        if "profile_pic" in comment_author_profile:
                            comment["author"]["profile_pic"] = comment_author_profile["profile_pic"]
                    comment["author"]["username"] = comment_author_name

        self.set_status(200)
        self.write({"posts": posts})


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

        timestamp = self.get_argument("from", (datetime.utcnow() - timedelta(days=1)).isoformat())
        timestamp = dateutil.parser.parse(timestamp)

        # TODO refine query: check only the valid posts for the current user (i.e. the spaces he's in, users he is following)
        new_posts_count = self.db.posts.count_documents(filter={"creation_date": {"$gte": timestamp}})

        if new_posts_count != 0:  # new posts since timestamp, user has to query the timeline handlers
            self.set_status(200)
            self.write({"status": 200,
                        "new_posts": True,
                        "since_timestamp": timestamp.isoformat()})
        else:  # no new posts since timestamp, return 304 not changed
            self.set_status(304)
