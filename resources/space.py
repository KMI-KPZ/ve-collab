from typing import List, Optional

from pymongo import MongoClient

import global_vars


class Spaces:
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

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        self.client.close()

    def check_space_exists(self, name: str) -> bool:
        """
        check if a space exists
        :returns: True if the space exists, False otherwise
        """

        if name is None:
            return False

        if self.db.spaces.find_one({"name": name}, projection={"_id": True}):
            return True
        else:
            return False

    def check_user_is_space_admin(self, space_name: str, username: str) -> bool:
        """
        check if the given user is an admin in the given space
        """

        space = self.db.spaces.find_one(
            {"name": space_name}, projection={"admins": True}
        )

        if not space:
            raise ValueError("Space doesnt exist")

        if username in space["admins"]:
            return True
        else:
            return False

    def get_space(self, space_name: str, projection: dict = {}) -> Optional[dict]:
        """
        get the space data of the space given by its name. optionally specify a projection
        to reduce query to the necessary fields (increases performance)
        :return: the space data as a dict or None, if the space doesnt exist
        """

        return self.db.spaces.find_one({"name": space_name}, projection=projection)

    def get_space_names(self) -> List[str]:
        """
        retrieve a list of all existing space names
        """

        return [
            space["name"] for space in self.db.spaces.find(projection={"name": True})
        ]

    def get_spaces_of_user(self, username: str) -> List[str]:
        """
        retrieve a list of space names that the given user is a member of.
        :param username: the user to query for
        :return: list of space names, or an empty list, if the user is not a member of any space
        """

        return [
            space["name"]
            for space in self.db.spaces.find(
                {"members": username}, projection={"name": True}
            )
        ]
