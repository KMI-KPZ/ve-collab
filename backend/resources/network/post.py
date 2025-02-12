import datetime
from typing import Dict, List, Tuple

from bson.objectid import ObjectId
from exceptions import (
    AlreadyLikerException,
    NotLikerException,
    PostNotExistingException,
)
import gridfs
from pymongo.database import Database

from resources.network.profile import Profiles
from resources.network.space import FileDoesntExistError, SpaceDoesntExistError, Spaces
from model import VEPlan
from resources.planner.ve_plan import VEPlanResource
import util

# import logging
# logger = logging.getLogger(__name__)

class Posts:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            post_manager = Posts(db)
            ...

    """

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
            {"_id": post_id}, {"$set": {"text": text}}
        )

        # if no documents matched the update, raise error
        if update_result.matched_count != 1:
            raise PostNotExistingException()
        return post_id

    def update_post_plans(self, post_id: str | ObjectId, plan_ids: List[str | ObjectId]) -> ObjectId:
        """
        update the plans of an existing post
        """

        post_id = util.parse_object_id(post_id)
        for plan_id in plan_ids:
            try:
                plan_id = util.parse_object_id(plan_id)
            except InvalidId:
                pass

        # try to do the update
        update_result = self.db.posts.update_one(
            {"_id": post_id}, {"$set": {"plans": plan_ids}}
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

        # delete files from gridfs and - if post was in a space,
        # from the space's repository
        if post["files"]:
            fs = gridfs.GridFS(self.db)
            for file_obj in post["files"]:
                fs.delete(file_obj["file_id"])
            if post["space"]:
                space_manager = Spaces(self.db)
                for file_obj in post["files"]:
                    try:
                        space_manager.remove_post_file(
                            post["space"], file_obj["file_id"]
                        )
                    except SpaceDoesntExistError:
                        pass
                    except FileDoesntExistError:
                        pass

        # finally delete the post itself
        self.db.posts.delete_one({"_id": post_id})

    def delete_post_by_space(self, space_id: str | ObjectId) -> None:
        """
        delete all posts that were in the space given by its _id
        """

        space_id = util.parse_object_id(space_id)

        self.db.posts.delete_many({"space": space_id})

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

    def add_comment(self, post_id: str | ObjectId, comment: dict) -> ObjectId:
        """
        add the given comment to the post, validating the attributes beforehand
        and returning the comment _id
        """

        post_id = util.parse_object_id(post_id)

        # verify comment has all the necessary attributes
        if not all(attr in comment for attr in self.comment_attributes):
            raise ValueError("Comment misses required attribute")

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

        result = self.db.posts.insert_one(repost)

        return result.inserted_id

    def update_repost_text(self, repost_id: str | ObjectId, text: str) -> ObjectId:
        """
        update the text of an existing repost
        """

        repost_id = util.parse_object_id(repost_id)

        # do the update
        update_result = self.db.posts.update_one(
            {"_id": repost_id}, {"$set": {"repostText": text}}
        )

        # if no documents have been modified by the update
        # we know that there was no post with the given _id
        if update_result.modified_count != 1:
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

        # store in gridfs
        _id = fs.put(
            file_content,
            filename=file_name,
            content_type=content_type,
            metadata={"uploader": uploader},
        )

        return _id

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

    def get_personal_timeline(
        self, username: str, time_to: datetime.datetime, limit: int = 10
    ) -> List[Dict]:
        """
        get the "personal" or rather frontpage timeline of a user, i.e.
        - your own posts
        - posts of people that you follow,
        - posts in spaces that you are a member of

        The timeline will always include `limit` number of posts, that are older than the
        `time_to` timestamp. So, e.g. achieve endless scrolling, retrieve the next `limit`
        posts as kind of a pagination approach, use the oldest timestamp of your current
        result set as the new starting point.

        If there are not enough posts, the timeline will include as many
        posts as possible. In turn, if there are less then `limit` posts returned,
        this timeline does not contain any more posts, so further requests with an even
        older timestamp will not yield any more results.

        :param username: the name of the user whose personal timeline is requested
        :param time_to: the maximum creation date of the posts to be returned (i.e. only
                        posts older than this date will be returned)
        :param limit: the maximum number of posts to be returned, default 10
        """

        pipeline = self.db.posts.aggregate(
            [
                # add the current_user as a field,
                # we need this because looksups have to be on fields
                {"$addFields": {"curr_user": username}},
                # join with the space collection on the space name
                {
                    "$lookup": {
                        "from": "spaces",
                        "localField": "space",
                        "foreignField": "_id",
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
                                        [username],
                                    ]
                                },
                                "else": {
                                    "$concatArrays": [
                                        [],
                                        [username],
                                    ]
                                },
                            }
                        }
                    }
                },
                # now the actual filtering begins:
                # - we first check for the time frame to include only posts that are older than time_to
                # we now have to check for the 3 cases described on top of the pipeline,
                # that allow for the post to be in the timeline
                {
                    "$match": {
                        "creation_date": {"$lte": time_to},
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
                                        username,
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
                                                            username,
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
                # sort by creation date, descending
                {"$sort": {"creation_date": -1}},
                # only include the last `limit` posts
                {"$limit": limit},
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

        return list(pipeline)

    def get_personal_timeline_legacy(
        self, username: str, time_from: datetime.datetime, time_to: datetime.datetime
    ) -> List[Dict]:
        """
        FOR BACKWARDS COMPATIBILITY ONLY

        get the "personal" or rather frontpage timeline of a user, i.e.
        - your own posts
        - posts of people that you follow,
        - posts in spaces that you are a member of
        within the specified time frame. Usually this function is designed for the user
        requesting his own landing page
        :param username: the name of the user whose personal timeline is requested
        :param time_from: the starting datetime of the window in utc time
        :param time_to: the end datetime of the window in utc time
        """

        pipeline = self.db.posts.aggregate(
            [
                # pre-filter for the time-frame (further operations are expensive
                # thats why it's smart to sort out as many as possible)
                {"$match": {"creation_date": {"$gte": time_from, "$lte": time_to}}},
                # add the current_user as a field,
                # we need this because looksups have to be on fields
                {"$addFields": {"curr_user": username}},
                # join with the space collection on the space name
                {
                    "$lookup": {
                        "from": "spaces",
                        "localField": "space",
                        "foreignField": "_id",
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
                                        [username],
                                    ]
                                },
                                "else": {
                                    "$concatArrays": [
                                        [],
                                        [username],
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
                                        username,
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
                                                            username,
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

        return list(pipeline)

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
