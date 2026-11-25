from collections import Counter
import datetime
import logging
from typing import Dict, List, Optional, Set, Tuple

from bson.objectid import ObjectId
from exceptions import (
    AlreadyLikerException,
    CommentDoesntExistError,
    FileDoesntExistError,
    NotLikerException,
    PostNotExistingException,
    ProfileDoesntExistException,
)
import gridfs
from pymongo.database import Database

from resources.elasticsearch_integration import ElasticsearchConnector
from resources.network.profile import Profiles
from resources.network.space import ELASTICSEARCH_ERRORS, Spaces
from resources.network.space_files import SpaceFiles
from model import VEPlan
from resources.planner.ve_plan import VEPlanResource
import util

logger = logging.getLogger(__name__)


class Posts:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            post_manager = Posts(db)
            ...
    """

    # the weights of the signals that suggested posts are scored by (each scaled to
    # [0, 1]), see `get_personal_timeline_with_suggestions`
    SUGGESTION_WEIGHTS = {
        "similar_profile": 0.45,
        "extended_network": 0.35,
        "engagement": 0.2,
    }
    # the share of suggested posts on top of the posts of a timeline page (4 per 10)
    SUGGESTION_SHARE = 0.4
    # older posts are never suggested
    SUGGESTION_MAX_AGE = datetime.timedelta(days=60)
    # only this many of the newest posts in the time frame of a page are scored
    SUGGESTION_CANDIDATES = 100
    # the number of best matching profiles that count as similar
    SUGGESTION_SIMILAR_USERS_COUNT = 50
    # people followed by at least this many of the people that the user follows
    # belong to the extended network of the user
    SUGGESTION_MUTUAL_FOLLOWS = 2
    # likes + 2 * comments at which the engagement of a post counts as full
    SUGGESTION_ENGAGEMENT_SATURATION = 10
    # the profile matches and the extended network of a user change slowly, but take
    # some effort to determine, so they are cached for this long
    SUGGESTION_CONTEXT_TTL = datetime.timedelta(hours=6)

    # username -> (expiry, context) of the cached suggestion contexts
    suggestion_contexts: Dict[str, Tuple[datetime.datetime, Dict]] = {}

    def __init__(self, db: Database):
        self.db = db

        self.post_attributes = [
            "author",
            "creation_date",
            "text",
            "space",
            "pinned",
            "wordpress_post_id",
            "tags",
            "plans",
            "files",
            "comments",
            "likers",
        ]

        self.repost_attributes = [
            "isRepost",
            "repostAuthor",
            "originalCreationDate",
            "repostText",
        ]

        self.comment_attributes = [
            "author",
            "creation_date",
            "text",
            "pinned",
            "likers",
        ]

    def get_post(self, post_id: str, projection: dict = {}) -> Dict:
        """
        query a post from the database given its _id

        Raises `PostNotExistingException` if no post with the given _id exists.

        :param post_id: str-representation of the post's _id (ObjectId)
        :param projection: optionally specify a projection to only return
                           a subset of the document's fields (limit your query
                           to only the necessary fields to increase performance)
        :return: the post as a dictionary
        """

        post_id = util.parse_object_id(post_id)

        post = self.db.posts.find_one({"_id": post_id}, projection=projection)
        if not post:
            raise PostNotExistingException()

        # may add plans information
        if "plans" in post and post["plans"] != []:
            plan_ids = post["plans"].copy()
            with util.get_mongodb() as db:
                plan_manager = VEPlanResource(db)
                plans = plan_manager.get_bulk_plans(plan_ids)
                post["plans"] = []
                for plan in plans:
                    if isinstance(plan, VEPlan):
                        plan = plan.to_dict()
                    post["plans"].append(plan)

        return post

    def get_post_by_comment_id(self, comment_id: str, projection: dict = {}) -> Dict:
        """
        query a post from the database given any of its comment's _id's.
        Since this operation does a full collection scan, it might be very slow
        and thus should be used sparingly.

        Raises `PostNotExistingException` if no post with the given _id exists.

        :param comment_id: the _id of any of the comments belonging to the post
        :param projection: optionally specify a projection to only return
                           a subset of the document's fields (limit your query
                           to only the necessary fields to increase performance)
        :return: the post as a dictionary
        """

        comment_id = util.parse_object_id(comment_id)

        post = self.db.posts.find_one(
            {"comments._id": comment_id}, projection=projection
        )
        if not post:
            raise PostNotExistingException()

        return post

    def get_posts_by_tags(self, tags: List[str], projection: dict = {}) -> List[Dict]:
        """
        query all posts from the database that have the given tags.
        :param tags: the tag to search the posts for
        :param projection: optionally specify a projection to only return
                           a subset of the document's fields (limit your query
                           to only the necessary fields to increase performance)
        :return: List of posts (as dicts) that have the desired tag
        """

        return list(self.db.posts.find({"tags": {"$all": tags}}, projection=projection))

    def fulltext_search(self, query: str) -> List[Dict]:
        """
        do a fulltext search on the post text index and return the matching posts.
        :param query: the full text search query
        :return: List of posts (as dicts) matching the query
        """

        # TODO deprecate and use elasticsearch instead

        return list(self.db.posts.find({"$text": {"$search": query}}))

    def insert_post(self, post: dict) -> ObjectId:
        """
        insert a new post into the db, validating the attributes beforehand.
        If the supplied post has an _id field, update the existing post instead.
        Returns the _id of the inserted (or updated) post.
        :param post: the post to save as a dict
        """

        # if the post has an _id, update its text instead
        if "_id" in post:
            if "text" not in post:
                raise ValueError("Post misses required attribute")
            return self.update_post_text(post["_id"], post["text"])

        # verify post has all the necessary attributes
        if not all(attr in post for attr in self.post_attributes):
            raise ValueError("Post misses required attribute")

        post["text"] = util.sanitize_html(post["text"])

        result = self.db.posts.insert_one(post)

        # the post is viable for the achievement "create_posts", when the
        # text ist not empty
        if post["text"] and post["text"] != "":
            profile_manager = Profiles(self.db)
            profile_manager.achievement_count_up(post["author"], "create_posts")

        return result.inserted_id

    def update_post_text(self, post_id: str | ObjectId, text: str) -> ObjectId:
        """
        update the text of an existing post
        """

        post_id = util.parse_object_id(post_id)

        # try to do the update
        update_result = self.db.posts.update_one(
            {"_id": post_id}, {"$set": {"text": util.sanitize_html(text)}}
        )

        # if no documents matched the update, raise error
        if update_result.matched_count != 1:
            raise PostNotExistingException()
        return post_id

    def update_post_plans(
        self, post_id: str | ObjectId, plan_ids: List[str | ObjectId]
    ) -> ObjectId:
        """
        update the plans of an existing post
        """

        post_id = util.parse_object_id(post_id)
        for plan_id in plan_ids:
            plan_id = util.parse_object_id(plan_id)

        # try to do the update
        update_result = self.db.posts.update_one(
            {"_id": post_id}, {"$set": {"plans": plan_ids}}
        )

        # if no documents matched the update, raise error
        if update_result.matched_count != 1:
            raise PostNotExistingException()
        return post_id

    def update_post_files(self, post_id: str | ObjectId, files: List[Dict]) -> ObjectId:
        """
        update the files of an existing post
        """

        post_id = util.parse_object_id(post_id)

        # try to do the update
        update_result = self.db.posts.update_one(
            {"_id": post_id}, {"$set": {"files": files}}
        )

        # if no documents matched the update, raise error
        if update_result.matched_count != 1:
            raise PostNotExistingException()
        return post_id

    def delete_post(self, post_id: str | ObjectId) -> None:
        """
        delete a post by specifying its id
        """

        post_id = util.parse_object_id(post_id)

        try:
            post = self.get_post(post_id, projection={"space": True, "files": True})
        except PostNotExistingException:
            raise

        # delete post.files from gridfs and may the space
        if post["files"]:
            for file_obj in post["files"]:
                self.delete_post_file(post_id, file_obj["file_id"])

        # finally delete the post itself
        self.db.posts.delete_one({"_id": post_id})

    def delete_post_by_space(self, space_id: str | ObjectId) -> None:
        """
        delete all posts that were in the space given by its _id,
        including their files in gridfs
        """

        space_id = util.parse_object_id(space_id)

        fs = gridfs.GridFS(self.db)
        for post in self.db.posts.find(
            {"space": space_id, "files.0": {"$exists": True}},
            projection={"files": True},
        ):
            for file_obj in post["files"]:
                fs.delete(file_obj["file_id"])

        self.db.posts.delete_many({"space": space_id})

    def get_posts_of_user(self, username: str) -> List[Dict]:
        """
        Retrieve all posts authored by the given username.

        Returns a list of post dicts, or an empty list if none exist.
        """

        return list(self.db.posts.find({"author": username}))

    def get_posts_with_comments_of_user(self, username: str) -> List[Dict]:
        """
        Retrieve all posts that contain comments authored by the given username.

        Returns a list of post dicts (the posts containing such comments), or
        an empty list if none exist.
        """

        return list(self.db.posts.find({"comments.author": username}))

    def like_post(self, post_id: str | ObjectId, username: str) -> None:
        """
        Let the given user like a post given by its id
        :param post_id: the id of the post the user wants to like
        :param username: the username of the user
        """

        post_id = util.parse_object_id(post_id)

        update_result = self.db.posts.update_one(
            {"_id": post_id},
            {"$addToSet": {"likers": username}},
        )

        # no match was found --> post doesnt exist
        if update_result.matched_count != 1:
            raise PostNotExistingException()

        # we know that the post existed, so if no document was updated
        # the user already had liked the post before
        if update_result.modified_count != 1:
            raise AlreadyLikerException()

        # count towards the achievement "give_likes" for the liking user,
        # since all previous checks have succeeded
        profile_manager = Profiles(self.db)
        profile_manager.achievement_count_up(username, "give_likes")

        # count towards the achievement "posts_liked" of the post auther,
        # since all previous checks have succeeded, but only if the
        # liker is different than the author (liking own post doesnt count)
        post = self.get_post(post_id, projection={"author": True})
        if post["author"] != username:
            profile_manager.achievement_count_up(post["author"], "posts_liked")

    def unlike_post(self, post_id: str | ObjectId, username: str) -> None:
        """
        remove the users like on the post given by its id
        :param post_id: the id of the post to unlike
        :param username: the username of the user
        """

        post_id = util.parse_object_id(post_id)

        update_result = self.db.posts.update_one(
            {"_id": post_id},
            {"$pull": {"likers": username}},
        )

        # no match was found --> post doesnt exist
        if update_result.matched_count != 1:
            raise PostNotExistingException()

        # we know that the post existed, so if no document was updated, the user hadn't
        # liked the post before
        if update_result.modified_count != 1:
            raise NotLikerException()

    def like_comment(self, comment_id: str | ObjectId, username: str) -> None:
        """
        Let the given user like the comment given by its _id. Like liking a
        post, it counts towards the achievement "give_likes" of the user.

        Raises `CommentDoesntExistError` if no comment with the given _id exists.
        Raises `AlreadyLikerException` if the user already likes the comment.
        """

        comment_id = util.parse_object_id(comment_id)

        update_result = self.db.posts.update_one(
            {"comments._id": comment_id},
            {"$addToSet": {"comments.$.likers": username}},
        )

        if update_result.matched_count != 1:
            raise CommentDoesntExistError()

        # the comment exists, so if nothing changed, the user already liked it
        if update_result.modified_count != 1:
            raise AlreadyLikerException()

        profile_manager = Profiles(self.db)
        profile_manager.achievement_count_up(username, "give_likes")

    def unlike_comment(self, comment_id: str | ObjectId, username: str) -> None:
        """
        Remove the like of the given user from the comment given by its _id.

        Raises `CommentDoesntExistError` if no comment with the given _id exists.
        Raises `NotLikerException` if the user hadn't liked the comment before.
        """

        comment_id = util.parse_object_id(comment_id)

        update_result = self.db.posts.update_one(
            {"comments._id": comment_id},
            {"$pull": {"comments.$.likers": username}},
        )

        if update_result.matched_count != 1:
            raise CommentDoesntExistError()

        # the comment exists, so if nothing changed, the user hadn't liked it
        if update_result.modified_count != 1:
            raise NotLikerException()

    def add_comment(self, post_id: str | ObjectId, comment: dict) -> ObjectId:
        """
        add the given comment to the post, validating the attributes beforehand
        and returning the comment _id
        """

        post_id = util.parse_object_id(post_id)

        # verify comment has all the necessary attributes
        if not all(attr in comment for attr in self.comment_attributes):
            raise ValueError("Comment misses required attribute")

        comment["text"] = util.sanitize_html(comment["text"])

        # assign an id to the comment
        comment["_id"] = ObjectId()
        # store the comment at the post
        update_result = self.db.posts.update_one(
            {"_id": post_id}, {"$push": {"comments": comment}}
        )

        # if no documents have been matched by the update
        # we know that there was no post with the given post_id
        if update_result.matched_count != 1:
            raise PostNotExistingException()

        # the comment is viable for the achievement "create_comments", when the
        # text ist not empty
        if comment["text"] and comment["text"] != "":
            profile_manager = Profiles(self.db)
            profile_manager.achievement_count_up(comment["author"], "create_comments")

        return comment["_id"]

    def delete_comment(
        self, comment_id: str | ObjectId, post_id: str | ObjectId = None
    ) -> None:
        """
        delete a comment by specifying its _id. If the _id of the associated post
        can be supplied as well, the query will be significantly faster,
        because an index can be used.
        :param comment_id: the _id of the comment to be deleted
        :param post_id: optional, the _id of the corresponding post
                        to speed up the query
        """

        comment_id = util.parse_object_id(comment_id)

        # use a faster query if the post_id is supplied, because it uses an index
        if post_id is not None:
            post_id = util.parse_object_id(post_id)
            update_result = self.db.posts.update_one(
                {"_id": post_id}, {"$pull": {"comments": {"_id": comment_id}}}
            )
        # knowing only the comments _id is much slower because it needs to perform
        # a (worst case) full collection scan
        else:
            update_result = self.db.posts.update_one(
                {"comments": {"$elemMatch": {"_id": comment_id}}},
                {"$pull": {"comments": {"_id": comment_id}}},
            )

        # if no documents have been removed by the delete
        # we know that there was no post with the given _id
        if update_result.matched_count != 1:
            raise PostNotExistingException()

    def insert_repost(self, repost: dict) -> ObjectId:
        """
        insert a repost, validating the attributes beforehand.
        If the supplied repost has an _id field,
        update the existing repost text instead.
        Returns the _id of the inserted (or updated) repost.
        :param repost: the repost to save as a dict
        """

        # if the post has an _id, update its text instead
        if "_id" in repost:
            if "repostText" not in repost:
                raise ValueError("Post misses required attribute")
            return self.update_repost_text(repost["_id"], repost["repostText"])

        # verify post has all the necessary attributes
        if not all(
            attr in repost for attr in self.post_attributes + self.repost_attributes
        ):
            raise ValueError("Post misses required attribute")

        # the text is a copy of the original post's one
        repost["text"] = util.sanitize_html(repost["text"])
        repost["repostText"] = util.sanitize_html(repost["repostText"])

        result = self.db.posts.insert_one(repost)

        return result.inserted_id

    def update_repost_text(self, repost_id: str | ObjectId, text: str) -> ObjectId:
        """
        update the text of an existing repost
        """

        repost_id = util.parse_object_id(repost_id)

        # do the update
        update_result = self.db.posts.update_one(
            {"_id": repost_id}, {"$set": {"repostText": util.sanitize_html(text)}}
        )

        # if no documents matched the update, there was no post with the given
        # _id (an unchanged text matches, but modifies nothing)
        if update_result.matched_count != 1:
            raise PostNotExistingException()

        return repost_id

    def pin_post(self, post_id: str | ObjectId) -> None:
        """
        pin a post
        :param post_id: the id of the post
        """

        post_id = util.parse_object_id(post_id)

        update_result = self.db.posts.update_one(
            {"_id": post_id}, {"$set": {"pinned": True}}
        )

        # if no documents have been modified by the update
        # we know that there was no post with the given _id
        if update_result.matched_count != 1:
            raise PostNotExistingException()

    def unpin_post(self, post_id: str | ObjectId) -> None:
        """
        remove the pin of a post
        :param post_id: the id of the post
        """

        post_id = util.parse_object_id(post_id)

        update_result = self.db.posts.update_one(
            {"_id": post_id}, {"$set": {"pinned": False}}
        )

        # if no documents have been modified by the update
        # we know that there was no post with the given _id
        if update_result.matched_count != 1:
            raise PostNotExistingException()

    def pin_comment(self, comment_id: str | ObjectId) -> None:
        """
        pin a comment
        :param comment_id: the id of the comment
        """

        comment_id = util.parse_object_id(comment_id)

        update_result = self.db.posts.update_one(
            {"comments._id": comment_id}, {"$set": {"comments.$.pinned": True}}
        )

        # if no documents have been modified by the update
        # we know that there was no post with the given _id
        # TODO actually this only tells us that the comment_id doesnt exist,
        # but the post might still exist, either raise CommentNotExistingException
        # or check for the post itself
        if update_result.matched_count != 1:
            raise PostNotExistingException()

    def unpin_comment(self, comment_id: str | ObjectId) -> None:
        """
        remove the pin of a comment
        :param comment_id: the id of the comment
        """

        comment_id = util.parse_object_id(comment_id)

        update_result = self.db.posts.update_one(
            {"comments._id": comment_id}, {"$set": {"comments.$.pinned": False}}
        )

        # if no documents have been modified by the update
        # we know that there was no post with the given _id
        # TODO actually this only tells us that the comment_id doesnt exist,
        # but the post might still exist, either raise CommentNotExistingException
        # or check for the post itself
        if update_result.matched_count != 1:
            raise PostNotExistingException()

    def add_new_post_file(
        self, file_name: str, file_content: bytes, content_type: str, uploader: str
    ) -> None:
        """
        store a new file in the uploads directory
        """

        fs = gridfs.GridFS(self.db)

        # store in gridfs (mime type and uploader live in the file's metadata)
        _id = util.gridfs_put(fs, file_content, file_name, content_type, uploader)

        return _id

    def delete_post_file(
        self, post_id: str | ObjectId, file_id: str | ObjectId
    ) -> None:
        """
        delete a file from gridfs and, if the post was in a space,
        its reference in the space's file share
        """

        fs = gridfs.GridFS(self.db)
        post_id = util.parse_object_id(post_id)
        file_id = util.parse_object_id(file_id)

        try:
            post = self.get_post(post_id, projection={"space": True, "files": True})
        except PostNotExistingException:
            raise

        fs.delete(file_id)

        if post["space"]:
            try:
                SpaceFiles(self.db).remove_post_file(post["space"], file_id)
            except FileDoesntExistError:
                pass

    def get_full_timeline(
        self, time_to: datetime.datetime, limit: int = 10
    ) -> List[Dict]:
        """
        get the full timeline of all posts.

        The timeline will always include `limit` number of posts, that are older than the
        `time_to` timestamp. So, e.g. achieve endless scrolling, retrieve the next `limit`
        posts as kind of a pagination approach, use the oldest timestamp of your current
        result set as the new starting point.

        If there are not enough posts, the timeline will include as many
        posts as possible. In turn, if there are less then `limit` posts returned,
        this timeline does not contain any more posts, so further requests with an even
        older timestamp will not yield any more results.

        :param time_to: the maximum creation date of the posts to be returned (i.e. only
                        posts older than this date will be returned)
        :param limit: the maximum number of posts to be returned, default 10
        """

        return list(
            self.db.posts.find(
                {"creation_date": {"$lte": time_to}},
                limit=limit,
                sort=[("creation_date", -1)],
            )
        )

    def get_space_timeline(
        self, space_id: str | ObjectId, time_to: datetime.datetime, limit: int = 10
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        get the timeline of a space (as well as pinned posts).
        The timeline will always include `limit` number of posts, that are older than the
        `time_to` timestamp. So, e.g. achieve endless scrolling, retrieve the next `limit`
        posts as kind of a pagination approach, use the oldest timestamp of your current
        result set as the new starting point.

        If there are not enough posts, the timeline will include as many
        posts as possible. In turn, if there are less then `limit` posts returned,
        this timeline does not contain any more posts, so further requests with an even
        older timestamp will not yield any more results.

        Returns a tuple of two lists, the first one containing the posts that match the
        time & limit constraints in newest-first order, the second one containing the pinned
        posts in the space (if any).


        :param space_id: the _id of the space to view the timeline of
        :param time_to: the maximum creation date of the posts to be returned (i.e. only
                        posts older than this date will be returned)
        :param limit: the maximum number of posts to be returned, default 10
        """

        space_id = util.parse_object_id(space_id)

        posts_in_timeframe = list(
            self.db.posts.find(
                {
                    "space": space_id,
                    "$or": [
                        {"creation_date": {"$lte": time_to}},
                    ],
                },
                limit=limit,
                sort=[("creation_date", -1)],
            )
        )

        pinned_posts = list(
            self.db.posts.find(
                {
                    "space": space_id,
                    "pinned": True,
                }
            )
        )

        return (posts_in_timeframe, pinned_posts)

    def get_user_timeline(
        self, username: str, time_to: datetime.datetime, limit: int = 10
    ) -> List[Dict]:
        """
        get the timeline of the given user (aka the timeline on his profile)

        The timeline will always include `limit` number of posts, that are older than the
        `time_to` timestamp. So, e.g. achieve endless scrolling, retrieve the next `limit`
        posts as kind of a pagination approach, use the oldest timestamp of your current
        result set as the new starting point.

        If there are not enough posts, the timeline will include as many
        posts as possible. In turn, if there are less then `limit` posts returned,
        this timeline does not contain any more posts, so further requests with an even
        older timestamp will not yield any more results.

        :param username: the name of the user whose timeline is requested
        :param time_to: the maximum creation date of the posts to be returned (i.e. only
                        posts older than this date will be returned)
        :param limit: the maximum number of posts to be returned, default 10
        """

        # TODO what about posts in spaces? include? exclude?
        # include only those that current user is also in?
        return list(
            self.db.posts.find(
                {
                    "creation_date": {"$lte": time_to},
                    "author": username,
                },
                sort=[("creation_date", -1)],
                limit=limit,
            )
        )

    @staticmethod
    def _posted_by(usernames: List[str]) -> Dict:
        """
        the query filter for the posts that one of `usernames` has posted,
        i.e. reposts by whoever reposted them and all other posts by their author
        """

        return {
            "$or": [
                {"isRepost": True, "repostAuthor": {"$in": usernames}},
                {"isRepost": {"$ne": True}, "author": {"$in": usernames}},
            ]
        }

    def get_personal_timeline(
        self, username: str, time_to: datetime.datetime, limit: int = 10
    ) -> List[Dict]:
        """
        get the "personal" or rather frontpage timeline of a user, i.e.
        - posts of people that you follow (outside of spaces),
        - posts in spaces that you are a member of.

        Your own posts are left out. Reposts count as
        posted by whoever reposted them, not by the author of the original post.

        The timeline will always include `limit` number of posts, that are older than the
        `time_to` timestamp. So, e.g. to achieve endless scrolling and retrieve the next
        `limit` posts as kind of a pagination approach, use the oldest timestamp of your
        current result set as the new starting point.

        If there are not enough posts, the timeline will include as many
        posts as possible. In turn, if there are less then `limit` posts returned,
        this timeline does not contain any more posts, so further requests with an even
        older timestamp will not yield any more results.

        See `get_personal_timeline_with_suggestions` for the timeline that also
        suggests posts of people that you don't follow yet.

        :param username: the name of the user whose personal timeline is requested
        :param time_to: the maximum creation date of the posts to be returned (i.e. only
                        posts older than this date will be returned)
        :param limit: the maximum number of posts to be returned, default 10
        """

        try:
            follows = Profiles(self.db).get_follows(username)
        except ProfileDoesntExistException:
            follows = []

        return self._get_personal_timeline(username, follows, time_to, limit)

    def _get_personal_timeline(
        self,
        username: str,
        follows: List[str],
        time_to: datetime.datetime,
        limit: int,
    ) -> List[Dict]:
        """
        the personal timeline of `username` (see `get_personal_timeline`),
        with the `follows` of the user already known
        """

        # resolving the spaces (and follows) first lets the query below use the
        # index on the creation date, instead of joining them to every single post
        space_ids = Spaces(self.db).get_space_ids_of_user(username)

        return list(
            self.db.posts.find(
                {
                    "creation_date": {"$lte": time_to},
                    "$or": [
                        # posts in spaces are only visible to their members
                        {"space": {"$in": space_ids}},
                        {"space": None, **self._posted_by(follows)},
                    ],
                    "$nor": [self._posted_by([username])],
                },
                sort=[("creation_date", -1)],
                limit=limit,
            )
        )

    def get_personal_timeline_with_suggestions(
        self, profile: Dict, time_to: datetime.datetime, limit: int = 10
    ) -> List[Dict]:
        """
        get the personal timeline (see `get_personal_timeline`) of the user given by
        his `profile`, along with suggested posts of people that he doesn't follow yet,
        which are marked with `"suggested": True`. All posts are sorted newest first.

        Only posts outside of spaces (posts in spaces are only visible to their
        members) of the last `SUGGESTION_MAX_AGE` are suggested, but no reposts and
        no posts of users that excluded themselves from the matching. They are scored
        by the following signals (each scaled to [0, 1] and weighted by
        `SUGGESTION_WEIGHTS`):
        - similar_profile: how well the profile of the author matches the profile
          of the user (matching)
        - extended_network: the author plans VEs with the user or is followed by at
          least `SUGGESTION_MUTUAL_FOLLOWS` of the people that the user follows,
          or one of those people liked or commented the post
        - engagement: the likes and comments of the post, up to
          `SUGGESTION_ENGAGEMENT_SATURATION`

        A page holds up to `SUGGESTION_SHARE` suggestions on top of its `limit` posts,
        at most one per author, which need a similar profile or the extended network
        to be suggested. They lie in between the oldest post of the page and
        `time_to`, so that continuing from the oldest post skips none of the posts
        of the timeline.

        Once the timeline runs out of posts (e.g. for new users), suggestions fill the
        rest of the page instead, out of all posts of the last `SUGGESTION_MAX_AGE`.
        These may get by on their engagement alone, and there may be more than one
        per author, if there are not enough authors.

        :param profile: the profile of the user whose timeline is requested
        :param time_to: the maximum creation date of the posts to be returned (i.e. only
                        posts older than this date will be returned)
        :param limit: the number of posts of the timeline, default 10
        """

        timeline = self._get_personal_timeline(
            profile["username"], profile.get("follows", []), time_to, limit
        )
        suggestions = self._get_suggested_posts(profile, timeline, time_to, limit)

        return sorted(
            timeline + suggestions,
            key=lambda post: util.as_utc(post["creation_date"]),
            reverse=True,
        )

    def _get_suggested_posts(
        self,
        profile: Dict,
        timeline: List[Dict],
        time_to: datetime.datetime,
        limit: int,
    ) -> List[Dict]:
        """
        the suggested posts for the page `timeline` of the personal timeline,
        see `get_personal_timeline_with_suggestions`
        """

        filling = len(timeline) < limit
        count = round(limit * self.SUGGESTION_SHARE)
        if filling:
            count = max(count, limit - len(timeline))
        if count <= 0:
            return []

        time_from = util.utcnow() - self.SUGGESTION_MAX_AGE
        if not filling:
            time_from = max(time_from, util.as_utc(timeline[-1]["creation_date"]))

        username = profile["username"]
        follows = set(profile.get("follows", []))
        candidates = list(
            self.db.posts.find(
                {
                    "creation_date": {"$gte": time_from, "$lte": time_to},
                    "space": None,
                    "isRepost": {"$ne": True},
                    "author": {"$nin": [username, *follows]},
                },
                projection={
                    "author": True,
                    "creation_date": True,
                    "likers": True,
                    "comments.author": True,
                },
                sort=[("creation_date", -1)],
                limit=self.SUGGESTION_CANDIDATES,
            )
        )
        candidates = self._without_excluded_from_matching(candidates)
        if not candidates:
            return []

        context = self._suggestion_context(profile)
        for post in candidates:
            post["scores"] = self._suggestion_scores(post, context, follows)
            post["score"] = sum(
                self.SUGGESTION_WEIGHTS[signal] * score
                for signal, score in post["scores"].items()
            )
        if not filling:
            candidates = [
                post
                for post in candidates
                if post["scores"]["similar_profile"] > 0
                or post["scores"]["extended_network"] > 0
            ]

        picked_ids = self._pick_suggestions(candidates, count, filling)
        suggestions = list(self.db.posts.find({"_id": {"$in": picked_ids}}))
        for post in suggestions:
            post["suggested"] = True

        return suggestions

    def _without_excluded_from_matching(self, posts: List[Dict]) -> List[Dict]:
        """
        the `posts` without those of authors that excluded themselves from the matching
        """

        excluded = {
            profile["username"]
            for profile in self.db.profiles.find(
                {
                    "username": {"$in": list({post["author"] for post in posts})},
                    "excluded_from_matching": True,
                },
                projection={"username": True},
            )
        }

        return [post for post in posts if post["author"] not in excluded]

    def _suggestion_context(self, profile: Dict) -> Dict:
        """
        what the suggestions for the user given by his `profile` are scored against,
        cached for `SUGGESTION_CONTEXT_TTL`:
        - similar_profiles: the scores of the best matching profiles by username,
          scaled to [0, 1]
        - extended_network: the usernames of the people that the user plans VEs with
          and of those followed by at least `SUGGESTION_MUTUAL_FOLLOWS` of the people
          that the user follows
        """

        username = profile["username"]
        now = util.utcnow()
        cached = self.suggestion_contexts.get(username)
        if cached and cached[0] > now:
            return cached[1]

        similar_profiles = self._similar_profile_scores(profile)
        context = {
            "similar_profiles": similar_profiles or {},
            "extended_network": self._extended_network(profile),
        }

        # forget the expired contexts along the way
        expired = [
            key
            for key, (expiry, _) in self.suggestion_contexts.items()
            if expiry <= now
        ]
        for key in expired:
            del self.suggestion_contexts[key]
        # without the profile matching, the context is only used for this request,
        # so that an elasticsearch outage doesn't outlast itself in the cache
        if similar_profiles is not None:
            self.suggestion_contexts[username] = (
                now + self.SUGGESTION_CONTEXT_TTL,
                context,
            )

        return context

    def _similar_profile_scores(self, profile: Dict) -> Optional[Dict[str, float]]:
        """
        the matching scores of the `SUGGESTION_SIMILAR_USERS_COUNT` best matching
        profiles by username, scaled to [0, 1] (the best match being 1),
        or None if elasticsearch is unavailable
        """

        try:
            # the matching flattens the lists of the profile in place
            hits = ElasticsearchConnector().search_profile_match(
                dict(profile), None, None, size=self.SUGGESTION_SIMILAR_USERS_COUNT
            )
            scores = {hit["_source"]["username"]: hit["_score"] for hit in hits}
        except ELASTICSEARCH_ERRORS as e:
            logger.warning("could not match profiles for post suggestions: %s", e)
            return None

        best = max(scores.values(), default=0)
        if not best:
            return {}

        return {
            username: score / best for username, score in scores.items() if score > 0
        }

    def _extended_network(self, profile: Dict) -> Set[str]:
        """
        the usernames of the people that the user given by his `profile` plans VEs
        with and of those followed by at least `SUGGESTION_MUTUAL_FOLLOWS` of the
        people that the user follows
        """

        username = profile["username"]
        followed_by = Counter()
        for followed in self.db.profiles.find(
            {"username": {"$in": profile.get("follows", [])}},
            projection={"follows": True},
        ):
            followed_by.update(set(followed.get("follows", [])))

        network = {
            user
            for user, count in followed_by.items()
            if count >= self.SUGGESTION_MUTUAL_FOLLOWS
        }
        network.update(VEPlanResource(self.db).get_ve_partners(username))
        network.discard(username)

        return network

    def _suggestion_scores(
        self, post: Dict, context: Dict, follows: Set[str]
    ) -> Dict[str, float]:
        """
        the scores of the signals of the suggested `post` (see
        `get_personal_timeline_with_suggestions`), each scaled to [0, 1]
        """

        likers = post.get("likers", [])
        commenters = [comment["author"] for comment in post.get("comments", [])]
        in_extended_network = post["author"] in context["extended_network"]
        engaged_by_follows = bool(follows.intersection(likers + commenters))

        return {
            "similar_profile": context["similar_profiles"].get(post["author"], 0.0),
            "extended_network": (
                1.0 if in_extended_network or engaged_by_follows else 0.0
            ),
            "engagement": min(
                (len(likers) + 2 * len(commenters))
                / self.SUGGESTION_ENGAGEMENT_SATURATION,
                1,
            ),
        }

    @staticmethod
    def _pick_suggestions(
        candidates: List[Dict], count: int, filling: bool
    ) -> List[ObjectId]:
        """
        the _ids of the `count` best scored `candidates` (the newer one on a tie),
        at most one per author. When `filling` the timeline, more posts of the same
        authors are picked if there are not enough authors.
        """

        ranked = sorted(
            candidates,
            key=lambda post: (post["score"], util.as_utc(post["creation_date"])),
            reverse=True,
        )

        picked = []
        authors = set()
        for post in ranked:
            if len(picked) < count and post["author"] not in authors:
                picked.append(post["_id"])
                authors.add(post["author"])
        if filling:
            for post in ranked:
                if len(picked) < count and post["_id"] not in picked:
                    picked.append(post["_id"])

        return picked

    def check_new_posts_since_timestamp(self, timestamp: datetime.datetime) -> bool:
        """
        check if there are new posts since the given time stamp.
        This can be used instead of running the (much more expensive) timeline queries
        over and over again uselessly.
        """

        new_posts_count = self.db.posts.count_documents(
            {"creation_date": {"$gte": timestamp}}, limit=1
        )

        if new_posts_count == 0:
            return False
        else:
            return True
