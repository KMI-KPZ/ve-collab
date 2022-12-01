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