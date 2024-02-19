from datetime import datetime, timedelta
import logging
from typing import Dict, List, Tuple

import dateutil.parser

from handlers.base_handler import BaseHandler, auth_needed
from resources.network.acl import ACL
from resources.network.post import Posts
from resources.network.profile import Profiles
from resources.network.space import SpaceDoesntExistError, Spaces
import util

logger = logging.getLogger(__name__)


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

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
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
                    pic_val = profile_manager.get_profile_pic(author_name)

                    pic_cache[author_name] = pic_val

                    post["author"] = {
                        "username": author_name,
                        "profile_pic": pic_val,
                    }

                # if the post is a repost, we also have to handle their profile pic
                if "isRepost" in post and post["isRepost"]:
                    repost_author_name = post["repostAuthor"]
                    if repost_author_name in pic_cache:
                        post["repostAuthorProfilePic"] = pic_cache[repost_author_name]
                    else:
                        repost_pic_val = profile_manager.get_profile_pic(
                            repost_author_name
                        )
                        pic_cache[repost_author_name] = repost_pic_val
                        post["repostAuthorProfilePic"] = repost_pic_val

                # exactly the same procedure for the comments
                if "comments" in post and post["comments"]:
                    for comment in post["comments"]:
                        comment_author_name = comment["author"]
                        if comment_author_name in pic_cache:
                            comment["author"] = {
                                "username": comment_author_name,
                                "profile_pic": pic_cache[comment_author_name],
                            }
                        else:
                            comment_pic_val = profile_manager.get_profile_pic(
                                comment_author_name
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

        with util.get_mongodb() as db:
            post_manager = Posts(db)
            result = post_manager.get_full_timeline(time_from, time_to)

        # serialize post objects to dicts and enhance author information
        posts = self.add_profile_pic_to_author(result)

        self.set_status(200)
        self.write(self.json_serialize_response({"success": True, "posts": posts}))


class SpaceTimelineHandler(BaseTimelineHandler):
    """
    Timeline of a certain space
    """

    def options(self, slug):
        self.set_status(204)
        self.finish()

    @auth_needed
    def get(self, space_name):
        """
        GET /timeline/space/[name]
            includes posts into that space that are either within the specified time frame
            or pinned
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
        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            try:
                if not space_manager.check_user_is_member(
                    space_name, self.current_user.username
                ):
                    self.set_status(409)
                    self.write({"success": False, "reason": "user_not_member_of_space"})
                    return
            except SpaceDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": "space_doesnt_exist"})
                return

            # ask for permission to read timeline
            acl = ACL(db)
            if not acl.space_acl.ask(
                self.current_user.username, space_name, "read_timeline"
            ):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

            # query space timeline
            post_manager = Posts(db)
            result = post_manager.get_space_timeline(space_name, time_from, time_to)

        # postprocessing
        posts = self.add_profile_pic_to_author(result)

        self.set_status(200)
        self.write(self.json_serialize_response({"success": True, "posts": posts}))


class UserTimelineHandler(BaseTimelineHandler):
    """
    Timeline of a user (e.g. for his profile)
    """

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

        # query user timeline
        with util.get_mongodb() as db:
            post_manager = Posts(db)
            result = post_manager.get_user_timeline(author, time_from, time_to)

        posts = self.add_profile_pic_to_author(result)

        self.set_status(200)
        self.write(self.json_serialize_response({"success": True, "posts": posts}))

class PersonalTimelineHandler(BaseTimelineHandler):
    """
    the timeline of the currently authenticated user.
    i.e. your posts, posts of users you follow, posts in spaces you are in
    """

    @auth_needed
    def get(self):
        """
        GET /timeline/you
            The timeline will always include `limit` number of posts, that are older than the 
            `time_to` timestamp. So, e.g. to achieve endless scrolling and retrieve the next `limit` 
            posts as kind of a pagination approach, use the oldest timestamp of your current 
            result set as the new starting point.
            
            If there are not enough posts, the timeline will include as many
            posts as possible. In turn, if there are less then `limit` posts returned, 
            this timeline does not contain any more posts, so further requests with an even 
            older timestamp will not yield any more results.

            query params:
                "to" : ISO timestamp string (fetch posts younger than this), default: now
                "limit": fetch the last n posts, default: 10
            return:
                200 OK,
                {"posts": [post1, post2,...]}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        _, time_to = self.parse_timeframe_args()
        limit = int(self.get_argument("limit", "10"))

        # query personal timeline
        with util.get_mongodb() as db:
            post_manager = Posts(db)
            result = post_manager.get_personal_timeline(
                self.current_user.username, time_to, limit
            )

        posts = self.add_profile_pic_to_author(result)

        self.set_status(200)
        self.write(self.json_serialize_response({"success": True, "posts": posts}))


class LegacyPersonalTimelineHandler(BaseTimelineHandler):
    """
    FOR BACKWARDS COMPATIBILITY ONLY
    the timeline of the currently authenticated user.
    i.e. your posts, posts of users you follow, posts in spaces you are in
    """

    @auth_needed
    def get(self):
        """
        GET /legacy/timeline/you
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

        # query personal timeline
        with util.get_mongodb() as db:
            post_manager = Posts(db)
            result = post_manager.get_personal_timeline_legacy(
                self.current_user.username, time_from, time_to
            )

        posts = self.add_profile_pic_to_author(result)

        self.set_status(200)
        self.write(self.json_serialize_response({"success": True, "posts": posts}))


class NewPostsSinceTimestampHandler(BaseHandler):
    """
    check if new posts have appeared since a certain timestamp
    TODO: this checks for new posts in general, not for posts in the specific timelines,
          include that
    """

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

        with util.get_mongodb() as db:
            post_manager = Posts(db)
            if post_manager.check_new_posts_since_timestamp(timestamp):
                # new posts since timestamp, user should query the timeline handlers
                self.set_status(200)
                self.write(
                    self.json_serialize_response(
                        {
                            "success": True,
                            "new_posts": True,
                            "since_timestamp": timestamp.isoformat(),
                        }
                    )
                )
            else:
                # no new posts happened since the requested timestamp,
                # reply with 304 Not Modified
                self.set_status(304)
