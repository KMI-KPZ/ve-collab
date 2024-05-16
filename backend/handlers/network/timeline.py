from datetime import datetime, timedelta
import logging
from typing import Dict, List, Tuple

from bson import ObjectId
import dateutil.parser

from handlers.base_handler import BaseHandler, auth_needed
from model import VEPlan
from resources.network.acl import ACL
from resources.network.post import Posts
from resources.network.profile import Profiles
from resources.network.space import SpaceDoesntExistError, Spaces
from resources.planner.ve_plan import VEPlanResource
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

    def _filter_from_profile_snippets(
        self, username: str, snippets: list[Dict]
    ) -> Dict:
        """
        from the list of profile snippets, filter the one with the matching username
        """

        for snippet in snippets:
            if snippet["username"] == username:
                return snippet
        return None

    def add_profile_information_to_author(self, posts: List[Dict]) -> List[Dict]:
        """
        modify the "author" key of the post and comments to not only be the username,
        but a mix of "username", "profile_pic", "first_name", "last_name" and "institution"
        as a nested dict.
        :returns: the modified posts
        """

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)

            # collect all usernames that we have to request the profile information for, avoiding duplicates
            usernames_to_request = []
            for post in posts:
                if post["author"] not in usernames_to_request:
                    usernames_to_request.append(post["author"])
                if "isRepost" in post and post["isRepost"]:
                    if post["repostAuthor"] not in usernames_to_request:
                        usernames_to_request.append(post["repostAuthor"])
                if "comments" in post and post["comments"]:
                    for comment in post["comments"]:
                        if comment["author"] not in usernames_to_request:
                            usernames_to_request.append(comment["author"])

            profile_snippets = profile_manager.get_profile_snippets(
                usernames_to_request
            )

            # replace the author keys with the respecting profile_information
            for post in posts:
                post["author"] = self._filter_from_profile_snippets(
                    post["author"], profile_snippets
                )

                # if the post is a repost, we also have to handle their profile pic
                if "isRepost" in post and post["isRepost"]:
                    post["repostAuthor"] = self._filter_from_profile_snippets(
                        post["repostAuthor"], profile_snippets
                    )

                # exactly the same procedure for the comments
                if "comments" in post and post["comments"]:
                    for comment in post["comments"]:
                        comment["author"] = self._filter_from_profile_snippets(
                            comment["author"], profile_snippets
                        )

            return posts

    def _filter_from_plan_objects(
        self, plan_id: str | ObjectId, plans: list[VEPlan]
    ) -> Dict:
        """
        from the list of plan objects, filter the one with the matching plan_id,
        if no matching plan is found, the plan_id is returned back instead
        """

        plan_id = util.parse_object_id(plan_id)

        for plan in plans:
            if plan._id == plan_id:
                return plan
        return plan_id

    def add_plan_to_posts(self, posts: List[Dict]) -> List[Dict]:
        """
        In case posts have plan(s) attached, update the information from only the _id
        to the full plan object.

        However, if no matching plan is found (e.g. it got deleted), the plan_id is returned back.
        """

        from pprint import pprint
        #pprint(posts)

        # collect all plan_ids without duplicates
        plan_ids = []
        for post in posts:
            if "plans" in post and post["plans"] != []:
                for plan_id in post["plans"]:
                    if plan_id not in plan_ids:
                        plan_ids.append(plan_id)

        with util.get_mongodb() as db:
            plan_manager = VEPlanResource(db)
            plans = plan_manager.get_bulk_plans(plan_ids)

            # replace the plan_ids with the full plan objects
            for post in posts:
                if "plans" in post and post["plans"] != []:
                    post_plan_ids_copy = post["plans"].copy()
                    post["plans"] = []
                    for plan_id in post_plan_ids_copy:
                        plan = self._filter_from_plan_objects(plan_id, plans)
                        if isinstance(plan, VEPlan):
                            plan = plan.to_dict()
                        post["plans"].append(plan)

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
        posts = self.add_profile_information_to_author(result)

        # add plan information to posts if there are any associated plans with the posts
        posts = self.add_plan_to_posts(posts)

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
    def get(self, space_id):
        """
        GET /timeline/space/[space_id]
            Retrieve the timeline of a certain space (includes pinned posts).

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
                {"success": True,
                 "posts": [post1, post2,...],
                 "pinned_posts": [post1, post2,...]}

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

        _, time_to = self.parse_timeframe_args()
        limit = int(self.get_argument("limit", "10"))

        # reject if user is not member of the space
        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            try:
                if not space_manager.check_user_is_member(
                    space_id, self.current_user.username
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
                self.current_user.username, space_id, "read_timeline"
            ):
                self.set_status(403)
                self.write({"success": False, "reason": "insufficient_permission"})
                return

            # query space timeline
            post_manager = Posts(db)
            timeline_posts, pinned_posts = post_manager.get_space_timeline(
                space_id, time_to, limit
            )

        # postprocessing
        timeline_posts = self.add_profile_information_to_author(timeline_posts)
        pinned_posts = self.add_profile_information_to_author(pinned_posts)

        # add plan information to posts if there are any associated plans with the posts
        timeline_posts = self.add_plan_to_posts(timeline_posts)
        pinned_posts = self.add_plan_to_posts(pinned_posts)

        self.set_status(200)
        self.write(
            self.json_serialize_response(
                {"success": True, "posts": timeline_posts, "pinned_posts": pinned_posts}
            )
        )


class UserTimelineHandler(BaseTimelineHandler):
    """
    Timeline of a user (e.g. for his profile)
    """

    def options(self, slug):
        self.set_status(204)
        self.finish()

    @auth_needed
    def get(self, author):
        """
        GET /timeline/user/[username]
            Retrieve the timeline of a certain user (for their profile).

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

        # query user timeline
        with util.get_mongodb() as db:
            post_manager = Posts(db)
            result = post_manager.get_user_timeline(author, time_to, limit)

        posts = self.add_profile_information_to_author(result)

        # add plan information to posts if there are any associated plans with the posts
        posts = self.add_plan_to_posts(posts)

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

        posts = self.add_profile_information_to_author(result)
        posts = self.add_plan_to_posts(posts)

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

        posts = self.add_profile_information_to_author(result)

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
