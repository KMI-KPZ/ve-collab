from pymongo import MongoClient

import global_vars


class Profiles:
    """
    implementation of Profiles in the DB as a context manager, usage::

        with Profiles() as db_manager:
            db_manager.get_profiles()
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

    def ensure_profile_exists(
        self, username: str, first_name: str = None, last_name: str = None
    ) -> None:
        """
        ensure that a profile exists for the given user.
        if no profile exists, create a default one, and also let the
        acl create a default entry if it does not exist
        :param username: the username of which to check for a profile
        :param first_name: optional, the first name of the user 
                           (only used for creation, can be added later)
        :param last_name: optional, the last name of the user
                          (only used for creation, can be added later)
        """

        # create a profile if it does not exist
        if not self.db.profiles.find_one(
            {"username": username}, projection={"_id": True}
        ):
            self.db.profiles.insert_one(
                {
                    "username": username,
                    "role": "guest",
                    "follows": [],
                    "bio": None,
                    "institution": None,
                    "projects": None,
                    "profile_pic": "default_profile_pic.jpg",
                    "first_name": first_name,
                    "last_name": last_name,
                    "gender": None,
                    "address": None,
                    "birthday": None,
                    "experience": None,
                    "education": None,
                }
            )

            # check if the guest role exists, if we created a new user
            from resources.acl import ACL

            with ACL() as acl_manager:
                acl_manager.ensure_acl_entries("guest")
