import os
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
            raise SpaceDoesntExistError()

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

    def delete_space(self, space_name: str) -> None:
        """
        delete the space and all data associated with it, i.e.:
        - space data (description, ...)
        - all posts that were posted into the space
        - all space acl rules
        """

        delete_result = self.db.spaces.delete_one({"name": space_name})
        if delete_result.deleted_count != 1:
            raise SpaceDoesntExistError()

        from resources.post import Posts
        from resources.acl import ACL

        with (Posts() as post_manager, ACL() as acl):
            post_manager.delete_post_by_space(space_name)
            acl.space_acl.delete(space=space_name)

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

    def set_space_picture(
        self, space_name: str, upload_dir: str, filename: str, picture: bytes
    ) -> None:
        """
        set a new picture for the space, i.e. store the picture on disk in the given directory
        and set the filename in the db
        :param space_name: the space to update the picture of
        :param upload_dir: the directory where to save the picture. This should be `BaseHandler`'s
                           `self.upload_dir` to be then accessible via static file handler
        :param filename: the filename (including file extension) of the picture
        :param picture: the actual picture as bytes
        """

        with open(os.path.join(upload_dir, filename), "wb") as fp:
            fp.write(picture)

        update_result = self.db.spaces.update_one(
            {"name": space_name},
            {
                "$set": {
                    "space_pic": filename,
                }
            },
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def set_space_description(self, space_name: str, description: str) -> None:
        """
        set (or update) the description of the space.
        :param space_name: the space which description should be updated
        :param description: the new description of the space
        """

        update_result = self.db.spaces.update_one(
            {"name": space_name}, {"$set": {"space_description": description}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def invite_user(self, space_name: str, username: str) -> None:
        """
        invite a user into the give space, i.e. add him to the invites list
        """

        update_result = self.db.spaces.update_one(
            {"name": space_name}, {"$addToSet": {"invites": username}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def accept_space_invite(self, space_name: str, username: str) -> None:
        """
        the given user accepts his invite into the given space and
        is therefore moved from the invited list into the members list
        :param space_name: the space in which the invitation is accepted
        :param username: the user who accepts his invite
        """

        # pull user from invites and add him to members
        update_result = self.db.spaces.update_one(
            {"name": space_name},
            {
                "$addToSet": {"members": username},
                "$pull": {"invites": username},
            },
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def decline_space_invite(self, space_name: str, username: str) -> None:
        """
        the given user declines his invite into the given space,
        therefore he is removed from the invite list, but not added to the members
        obviously.
        :param space_name: the space in which the invitation is declined
        :param username: the user who declines his invite
        """

        # pull user from pending invites to decline (dont add to members obviously)
        update_result = self.db.spaces.update_one(
            {"name": space_name}, {"$pull": {"invites": username}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def accept_join_request(self, space_name: str, username: str) -> None:
        """
        the join request of the given user is accepted (usually by an admin, but permissions
        are not checked here!). Therefore the user will become a member
        :param space_name: the space where the join request is accepted.
        :param username: the user whose request is accepted
        """

        # add user to members and pull them from pending requests
        update_result = self.db.spaces.update_one(
            {"name": space_name},
            {"$addToSet": {"members": username}, "$pull": {"requests": username}},
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def reject_join_request(self, space_name: str, username: str) -> None:
        """
        the join request of the given user is declined (usually by an admin, but permissions
        are not checked here!). Therefore the user will not become a member
        :param space_name: the space where the join request is declined.
        :param username: the user whose request is declined
        """

        # pull user from request to decline (obviously dont add as member)
        update_result = self.db.spaces.update_one(
            {"name": space_name}, {"$pull": {"requests": username}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def toggle_visibility(self, space_name: str) -> None:
        """
        toggle the visiblity of the space, i.e. visible --> invisible, invisible --> visible
        """

        # toggle visibility
        update_result = self.db.spaces.update_one(
            {"name": space_name}, [{"$set": {"invisible": {"$not": "$invisible"}}}]
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def leave_space(self, space_name: str, username: str) -> None:
        """
        the given user leaves the space. if he is a space admin, there has to be
        atleast one more admin, otherwise the operation is ignored, because it
        would leave the space without an admin. In that case the user has
        to nominate another space admin first
        :param space_name: the space the user want to leave from
        :param username: the user who wants to leave the space
        """

        space = self.get_space(space_name, projection={"_id": False, "admins": True})
        if not space:
            raise SpaceDoesntExistError()

        # if user is the only space admin, block leaving
        # (he has to transform permission to someone else first)
        if username in space["admins"]:
            if len(space["admins"]) == 1:
                raise OnlyAdminError()

        # remove user from members and also admins (if he was one)
        self.db.spaces.update_one(
            {"name": space_name},
            {
                "$pull": {
                    "members": username,
                    "admins": username,
                }
            },
        )

    def kick_user(self, space_name: str, username: str) -> None:
        """
        the given user is kicked from the space (usually by an admin, but permission are
        not checked here!). Therefore he will be removed from the members list.
        """

        update_result = self.db.spaces.update_one(
            {"name": space_name},
            {"$pull": {"members": username, "admins": username}},
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        # if no document was modified, we know that the user wasnt a member
        if update_result.modified_count != 1:
            raise UserNotMemberError()

    def revoke_space_admin_privilege(self, space_name: str, username: str) -> None:
        """
        the given user gets his space admin privilege revoked, leaving him only as a
        normal member
        :param space_name: the space in which the permission will be revoked
        :param username: the user whose permissions will be revoked
        """

        # remove user from spaces admins list
        update_result = self.db.spaces.update_one(
            {"name": space_name}, {"$pull": {"admins": username}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        # if no documents were modified, we know that the user was no admin
        if update_result.modified_count != 1:
            raise UserNotAdminError()


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


class UserNotAdminError(Exception):
    pass


class OnlyAdminError(Exception):
    pass
