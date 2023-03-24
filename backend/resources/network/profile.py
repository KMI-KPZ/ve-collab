from typing import Dict, List, Optional

import gridfs
from pymongo import MongoClient

from exceptions import (
    AlreadyFollowedException,
    NotFollowedException,
    ProfileDoesntExistException,
)
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

        self.profile_attributes = {
            "bio": str,
            "institution": str,
            "projects": list,
            "first_name": str,
            "last_name": str,
            "gender": str,
            "address": str,
            "birthday": str,
            "experience": list,
            "education": list,
            "expertise": str,
            "languages": list,
        }

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        self.client.close()

    def get_profile(self, username: str, projection: dict = None) -> Optional[Dict]:
        """
        get the profile data of the given user. optionally specify a projection
        to reduce query to the necessary fields (increases performance)
        :return: the profile data as a dict
        """

        return self.db.profiles.find_one({"username": username}, projection=projection)

    def get_all_profiles(self, projection: dict = None) -> List[Dict]:
        """
        get all profiles from the database. optionally specify a projection to
        reduce response to the necessary fields (increases performance)
        """

        return list(self.db.profiles.find(projection=projection))

    def insert_default_profile(
        self, username: str, first_name: str = None, last_name: str = None
    ) -> Dict:
        """
        insert a default profile into the db, initializing the role as 'guest' and the
        default profile picture and setting all other values to false.
        Optionally, if known, the first and last name can be already set.
        :param username: the username of the new user
        :return: the freshly created profile
        """
        profile = {
            "username": username,
            "role": "guest",
            "follows": [],
            "bio": None,
            "institution": None,
            "projects": [],
            "profile_pic": "default_profile_pic.jpg",
            "first_name": None,
            "last_name": None,
            "gender": None,
            "address": None,
            "birthday": None,
            "experience": [],
            "education": [],
            "expertise": None,
            "languages": [],
        }
        self.db.profiles.insert_one(profile)
        return profile

    def insert_default_admin_profile(self, username: str) -> Dict:
        """
        insert a default admin profile into the db,
        initializing the role as 'admin' and the default profile picture and
        setting all other values to false.
        :param username: the username of the new user
        :return: the freshly created profile
        """

        profile = {
            "username": username,
            "role": "admin",
            "follows": [],
            "bio": None,
            "institution": None,
            "projects": [],
            "profile_pic": "default_profile_pic.jpg",
            "first_name": None,
            "last_name": None,
            "gender": None,
            "address": None,
            "birthday": None,
            "experience": [],
            "education": [],
            "expertise": None,
            "languages": [],
        }
        self.db.profiles.insert_one(profile)
        return profile

    def ensure_profile_exists(
        self,
        username: str,
        first_name: str = None,
        last_name: str = None,
        projection: Dict = None,
    ) -> Dict:
        """
        ensure that a profile exists for the given user and return it.
        if no profile exists, create a default one, and also let the
        acl create a default entry if it does not exist
        :param username: the username of which to check for a profile
        :param first_name: optional, the first name of the user
                           (only used for creation, can be added later)
        :param last_name: optional, the last name of the user
                          (only used for creation, can be added later)
        :return: the profile of the user, either existing or created
        """

        profile = self.get_profile(username, projection=projection)
        # create a profile if it does not exist
        if not profile:
            profile = self.insert_default_profile(username, first_name, last_name)

            # check if the guest role exists, since we might do this for the very first time
            from resources.network.acl import ACL

            with ACL() as acl_manager:
                acl_manager.ensure_acl_entries("guest")

        return profile

    def get_follows(self, username: str) -> List[str]:
        """
        get the list of users the the given user follows
        :param username: the user the data is requested from
        :return: list of usernames the user follows, or an empty list
        """

        result = self.get_profile(username, projection={"_id": False, "follows": True})
        return result["follows"] if result else []

    def add_follows(self, username: str, username_to_follow: str) -> None:
        """
        let the user behind 'username' follow the user behind 'username_to_follow'.
        If the user is already following this person, an `AlreadyFollowedException`
        is thrown.
        :param username: the username of the user wanting to follow another one
        :param username_to_follow: the username the user wants to follow
        """

        update_result = self.db.profiles.update_one(
            {"username": username},
            {"$addToSet": {"follows": username_to_follow}},
        )

        # if no document was modified, the username is already in the follows set
        if update_result.modified_count != 1:
            raise AlreadyFollowedException()

    def remove_follows(self, username: str, username_to_unfollow: str) -> None:
        """
        let the user behind 'username' unfollow the user behind 'username_to_follow'.
        If the user is not following this person, a `NotFollowedException` is thrown.
        :param username: the username of the user wanting to unfollow another one
        :param username_to_follow: the username the user wants to unfollow
        """

        update_result = self.db.profiles.update_one(
            {"username": username}, {"$pull": {"follows": username_to_unfollow}}
        )

        # if no document was modified, the username was not in the follows set
        if update_result.modified_count != 1:
            raise NotFollowedException()

    def get_followers(self, username: str) -> List[str]:
        """
        get a list of usernames that follow the given user
        """

        return [
            user["username"]
            for user in self.db.profiles.find(
                {"follows": username}, projection={"_id": False, "username": True}
            )
        ]

    def get_role(self, username: str) -> str:
        """
        get the role of the user. If no profile exists for the user,
        a `ProfileDoesntExistException` is thrown.
        """

        role_result = self.get_profile(username, projection={"role": True})

        if not role_result:
            raise ProfileDoesntExistException()

        return role_result["role"]

    def set_role(self, username: str, role: str) -> None:
        """
        set the role of a user. If no profile exists for the user,
        a `ProfileDoesntExistException` is thrown.
        """

        update_result = self.db.profiles.update_one(
            {"username": username}, {"$set": {"role": role}}
        )
        # if no document was modified, the user profile doesnt exist
        if update_result.modified_count != 1:
            raise ProfileDoesntExistException()

    def check_role_exists(self, role: str) -> bool:
        """
        check if the given role exists, i.e. atleast one user has this role.
        :param role: the role to check for
        :return: True if the role exists, False otherwise
        """

        if self.db.profiles.find_one({"role": role}, projection={"_id": True}):
            return True
        else:
            return False

    def get_all_roles(self, keycloak_user_list: List[Dict]) -> List[dict]:
        """
        produce a list of dicts containing the following information:
        {"username": <username>, "role": <role>}
        by joining a list of keycloak user with our profile database on the username.
        This extra step is needed, because users are only recognized in our database
        when they first log in, but they should be referencable by other users before that.
        To achieve that, we create a profile for them if it does not already exist
        """

        existing_users_and_roles = self.get_all_profiles(
            projection={"_id": False, "username": True, "role": True}
        )

        ret_list = []

        # match the platform users and if they have, existing lionet roles
        for platform_user in keycloak_user_list:
            already_in = False
            for existing_user in existing_users_and_roles:
                if platform_user["username"] == existing_user["username"]:
                    ret_list.append(existing_user)
                    already_in = True
                    break
            if already_in:  # skip if user is already processed
                continue

            # if the user does not already exist, add him with guest role
            self.insert_default_profile(platform_user["username"])
            # manually create return entry
            # because otherwise non-json-serializable ObjectId is in payload
            ret_list.append(
                {
                    "username": platform_user["username"],
                    "role": "guest",
                }
            )

            # check once if the guest role was present
            # (once is enough, there might be many keycloak users coming in,
            # checking for the same role on everyone is useless overhead)
            # if there was no user that has been added as guest, we dont even
            # need to do the check at all because this statement would always
            # be skipped
            checked_guest_role_present = False
            if not checked_guest_role_present:
                from resources.network.acl import ACL

                with ACL() as acl_manager:
                    acl_manager.ensure_acl_entries("guest")
                checked_guest_role_present = True

        return ret_list

    def get_distinct_roles(self) -> List[str]:
        """
        get a list of distinct roles, i.e. all roles that atleast one user has
        """

        return self.db.profiles.distinct("role")

    def fulltext_search(self, query: str) -> List[Dict]:
        """
        do a fulltext search on the profile text index and return the matching profiles.
        :param query: the full text search query
        :return: List of profiles (as dicts) matching the query
        """

        return list(self.db.profiles.find({"$text": {"$search": query}}))

    def get_profile_pic(self, username: str) -> str:
        """
        get the profile pic of the given user, or the default value, if he has not set
        a custom profile picture
        """

        profile = self.get_profile(
            username, projection={"_id": False, "profile_pic": True}
        )
        return profile["profile_pic"] if profile else "default_profile_pic.jpg"

    def update_profile_information(
        self,
        username: str,
        updated_profile: Dict,
        profile_pic: bytes = None,
        profile_pic_content_type: str = None,
    ) -> None:
        """
        update the profile information including (optionally) the profile picture.
        The following keys are necessary in the `updated_profile` dict:
        bio, institution, projects, first_name, last_name, gender, address, birthday,
        experience, education.
        The following keys are optional:
        profile_pic
        """

        # verify space has all the necessary attributes
        #if not all(attr in updated_profile for attr in self.profile_attributes.keys()):
        #    raise ValueError("Profile misses required attribute")

        # verify types of attributes
        for attr_key in updated_profile:
            if attr_key in self.profile_attributes:
                if type(updated_profile[attr_key]) != self.profile_attributes[attr_key]:
                    raise TypeError(
                        "Type mismatch on attribute '{}'. expected type '{}', got '{}'".format(
                            attr_key,
                            self.profile_attributes[attr_key],
                            updated_profile[attr_key],
                        )
                    )

        # handle optional profile image
        if "profile_pic" in updated_profile:
            # if dict supplies one, we need the actual image
            if profile_pic is None:
                raise TypeError(
                    """if profile_pic is supplied in the dict, 
                    provide an actual image as bytes!"""
                )

            # save image to gridfs
            fs = gridfs.GridFS(self.db)
            _id = fs.put(
                profile_pic,
                filename=updated_profile["profile_pic"],
                content_type=profile_pic_content_type,
                metadata={"uploader": "system"},
            )
            updated_profile["profile_pic"] = _id

        self.db.profiles.update_one(
            {"username": username},
            {
                "$set": updated_profile,
                # set default values only on insert
                "$setOnInsert": {"username": username, "role": "guest", "follows": []},
            },
            upsert=True,
        )
