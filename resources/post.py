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

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        self.client.close()

    def get_post(self, post_id: str) -> Optional[Dict]:
        """
        query a post from the database given its _id
        :param post_id: str-representation of the post's _id (ObjectId)
        :return: the post as a dictionary, or None, if no post matched
                 the given id
        """
        if isinstance(post_id, str):
            post_id = ObjectId(post_id)

        return self.db.posts.find_one({"_id": post_id})

    def insert_post(self, post: dict) -> None:
        """
        insert a new post into the db, validating the attributes beforehand
        """

        if "_id" in post:
            # TODO update text instead
            pass

        if not all(attr in post for attr in self.post_attributes):
            raise ValueError("Post misses required attribute")

        self.db.posts.insert_one(post)

    def update_post_text(self, post_id: str|ObjectId, text: str) -> None:
        """
        update the text of an existing post
        """

        if post_id is None:
            raise TypeError("_id cannot be None")
        elif isinstance(post_id, str):
            post_id = ObjectId(post_id)

        # try to do the update
        update_result = self.db.posts.update_one(
            {"_id": post_id}, {"$set": {"text": text}}
        )

        # if no documents have been modified by the update
        # we know that there was no post with the given _id
        if update_result.modified_count != 1:
            raise PostNotExistingException()

    def delete_post(self, post_id: str|ObjectId) -> None:
        """
        delete a post by specifying its id
        """

        if post_id is None:
            raise TypeError("_id cannot be None")
        elif isinstance(post_id, str):
            post_id = ObjectId(post_id)

        delete_result = self.db.posts.delete_one({"_id": post_id})

        # if no documents have been removed by the delete
        # we know that there was no post with the given _id
        if delete_result.deleted_count != 1:
            raise PostNotExistingException()


class PostNotExistingException(Exception):
    pass
