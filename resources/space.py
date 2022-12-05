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

        self.space_attributes = {
            "name": str,
            "invisible": bool,
            "members": list,
            "admins": list,
            "invites": list,
            "requests": list,
        }

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

        if self.get_space(name, projection={"_id": False, "name": True}):
            return True
        else:
            return False

    def check_user_is_space_admin(self, space_name: str, username: str) -> bool:
        """
        check if the given user is an admin in the given space
        """

        space = self.get_space(space_name, projection={"_id": False, "admins": True})

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

    def get_all_spaces(self, projection: dict = {}) -> List[dict]:
        """
        get the space data from all spaces in al list. Optionally specify a projection
        to reduce query to the necessary fields (increases performance)
        :return: the space data of all spaces as dicts, combined into a list
        """

        return list(self.db.spaces.find(projection=projection))

    def get_all_spaces_visible_to_user(
        self, username: str, projection: dict = {}
    ) -> List[dict]:
        """
        get data of all spaces the given user is allowed to see, i.e. get spaces that:
            - are not invisible
            - or have the user as a member
        Optionally specify a projection to reduce query to the necessary fields
        (increases performance)
        :return: the space data of all allowed spaces as dicts, combined into a list
        """

        return list(
            self.db.spaces.find(
                {
                    "$or": [
                        {"invisible": False},
                        {"invisible": {"$exists": False}},
                        {"members": username},
                    ]
                },
                projection=projection,
            )
        )

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

    def get_space_invites_of_user(self, username: str) -> List[str]:
        """
        get a list of pending invites into spaces for the given user
        :return: list of space names that the user is currently invited to (unanswered)
        """

        return [
            space["name"]
            for space in self.db.spaces.find(
                {"invites": username}, projection={"_id": False, "name": True}
            )
        ]

    def create_space(self, space: dict) -> None:
        """
        create a new space, validating the existence of the necessary attributes
        beforehand. mandatory attributes are: name (str), invisible (bool), members (list<str>),
        admins (list<str>), invites (list<str>), requests (list<str>)
        """

        # verify space has all the necessary attributes
        if not all(attr in space for attr in self.space_attributes.keys()):
            raise ValueError("Post misses required attribute")

        # verify types of attributes
        for attr_key in space:
            if type(space[attr_key]) != self.space_attributes[attr_key]:
                raise TypeError(
                    "Type mismatch on attribute '{}'. expected type '{}', got '{}'".format(
                        attr_key, self.space_attributes[attr_key], space[attr_key]
                    )
                )

        # raise error if another space with the same name already exists
        if self.check_space_exists(space["name"]):
            raise SpaceAlreadyExistsError()

        # finally, create it
        self.db.spaces.insert_one(space)

    def join_space(self, space_name: str, username: str) -> None:
        """
        let the user given by his username join the space identified by space_name
        :param space_name: the name of the space
        :param username: the name of the user
        """

        update_result = self.db.spaces.update_one(
            {"name": space_name}, {"$addToSet": {"members": username}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        # if no document was updated, we know that the user already is a member,
        # because a set doesnt allow duplicates, meaning his name is already in it
        if update_result.modified_count != 1:
            raise AlreadyMemberError()

    def join_space_request(self, space_name: str, username: str) -> None:
        """
        set the user given by his username as requested to join the space, i.e. add him
        to the requests set
        :param space_name: the name of the space
        :param username: the name of the user
        """

        update_result = self.db.spaces.update_one(
            {"name": space_name},
            {"$addToSet": {"requests": username}},
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        # if no document was updated, we know that the user already is a member,
        # because a set doesnt allow duplicates, meaning his name is already in it
        if update_result.modified_count != 1:
            raise AlreadyRequestedJoinError()

    def check_user_is_member(self, space_name: str, username: str) -> bool:
        """
        check if the give user is a member of the given space
        :return: True if the user is a member of the space, False otherwise
        """
        space = self.get_space(space_name, projection={"_id": False, "members": True})
        if not space:
            raise SpaceDoesntExistError()

        if username in space["members"]:
            return True
        else:
            return False

    def add_space_admin(self, space_name: str, username: str) -> None:
        """
        set a user as a space admin
        """

        update_result = self.db.spaces.update_one(
            {"name": space_name}, {"$addToSet": {"admins": username}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        # if no document was updated, we know that the user already is an admin,
        # because a set doesnt allow duplicates, meaning his name is already in it
        if update_result.modified_count != 1:
            raise AlreadyAdminError()


class SpaceDoesntExistError(Exception):
    pass


class SpaceAlreadyExistsError(Exception):
    pass


class AlreadyMemberError(Exception):
    pass


class AlreadyAdminError(Exception):
    pass


class AlreadyRequestedJoinError(Exception):
    pass


class UserNotMemberError(Exception):
    pass
