from typing import Dict, Optional

from bson.objectid import ObjectId
from pymongo import MongoClient

import global_vars


class Posts:
    """
    implementation of Posts in the DB as a context manager, usage::

        with Posts() as db_manager:
            db_manager.get_posts()
            ...

    """

    def __init__(self):
        self.client = MongoClient(
            global_vars.mongodb_host,
            global_vars.mongodb_port,
            username=global_vars.mongodb_username,
            password=global_vars.mongodb_password,
        )
        self.db = self.client[global_vars.mongodb_db_name]

        self.post_attributes = [
            "author",
            "creation_date",
            "text",
            "space",
            "pinned",
            "wordpress_post_id",
            "tags",
            "files",
            "comments",
            "likers",
        ]

        self.comment_attributes = [
            "author",
            "creation_date",
            "text",
            "pinned",
        ]

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        self.client.close()

    def _parse_object_id(self, obj_id: str | ObjectId) -> ObjectId:
        """
        parse a str-representation of a mongodb objectid into an
        actual ObjectId-object. If the input id is already an ObjectId,
        it is returned unchanged.
        :param obj_id: the id to be transformed into a bson.ObjectId-object
        :return: the id as a bson.ObjectId
        """

        if obj_id is None:
            raise TypeError("_id cannot be None")
        elif isinstance(obj_id, str):
            return ObjectId(obj_id)
        elif isinstance(obj_id, ObjectId):
            return obj_id
        else:
            raise TypeError(
                """invalid object_id type, 
                can either be 'str' or 'bson.ObjectId', 
                got: '{}'
                """.format(
                    type(obj_id)
                )
            )

    def get_post(self, post_id: str, projection: dict = {}) -> Optional[Dict]:
        """
        query a post from the database given its _id
        :param post_id: str-representation of the post's _id (ObjectId)
        :param projection: optionally specify a projection to only return
                           a subset of the document's fields (limit your query
                           to only the necessary fields to increase performance)
        :return: the post as a dictionary, or None, if no post matched
                 the given id
        """

        post_id = self._parse_object_id(post_id)

        return self.db.posts.find_one({"_id": post_id}, projection=projection)

    def get_post_by_comment_id(
        self, comment_id: str, projection: dict = {}
    ) -> Optional[Dict]:
        """
        query a post from the database given any of its comment's _id's.
        Since this operation does a full collection scan, it might be very slow
        and thus should be used sparingly.
        :param comment_id: the _id of any of the comments belonging to the post
        :param projection: optionally specify a projection to only return
                           a subset of the document's fields (limit your query
                           to only the necessary fields to increase performance)
        :return: the post as a dictionary, or None, if no comments of any post
                 matched the given id
        """

        comment_id = self._parse_object_id(comment_id)

        return self.db.posts.find_one(
            {"comments": {"$elemMatch": {"_id": comment_id}}}, projection=projection
        )

    def insert_post(self, post: dict) -> None:
        """
        insert a new post into the db, validating the attributes beforehand.
        If the supplied post has an _id field, update the existing post instead.
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

        self.db.posts.insert_one(post)

    def update_post_text(self, post_id: str | ObjectId, text: str) -> None:
        """
        update the text of an existing post
        """

        post_id = self._parse_object_id(post_id)

        # try to do the update
        update_result = self.db.posts.update_one(
            {"_id": post_id}, {"$set": {"text": text}}
        )

        # if no documents have been modified by the update
        # we know that there was no post with the given _id
        if update_result.modified_count != 1:
            raise PostNotExistingException()

    def delete_post(self, post_id: str | ObjectId) -> None:
        """
        delete a post by specifying its id
        """

        post_id = self._parse_object_id(post_id)

        delete_result = self.db.posts.delete_one({"_id": post_id})

        # if no documents have been removed by the delete
        # we know that there was no post with the given _id
        if delete_result.deleted_count != 1:
            raise PostNotExistingException()

    def add_comment(self, post_id: str | ObjectId, comment: dict) -> None:
        """
        add the given comment to the post, validating the attributes beforehand
        """

        post_id = self._parse_object_id(post_id)

        # verify comment has all the necessary attributes
        if not all(attr in comment for attr in self.comment_attributes):
            raise ValueError("Comment misses required attribute")

        # assign an id to the comment
        comment["_id"] = ObjectId()
        # store the comment at the post
        update_result = self.db.posts.update_one(
            {"_id": post_id}, {"$push": {"comments": comment}}
        )

        # if no documents have been modified by the update
        # we know that there was no post with the given post_id
        if update_result.modified_count != 1:
            raise PostNotExistingException()

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

        comment_id = self._parse_object_id(comment_id)

        # use a faster query if the post_id is supplied, because it uses an index
        if post_id is not None:
            post_id = self._parse_object_id(post_id)
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
        if update_result.modified_count != 1:
            raise PostNotExistingException()


class PostNotExistingException(Exception):
    pass
