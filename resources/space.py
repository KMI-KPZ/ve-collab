import os
from typing import Dict, List, Optional

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
            "joinable": bool,
            "members": list,
            "admins": list,
            "invites": list,
            "requests": list,
            "files": list,
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

    def check_user_is_member(self, space_name: str, username: str) -> bool:
        """
        check if the given user is a member of the given space
        """

        space = self.get_space(space_name, projection={"_id": False, "members": True})

        if not space:
            raise SpaceDoesntExistError()

        if username in space["members"]:
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
            raise ValueError("Space misses required attribute")

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

    def is_space_directly_joinable(self, space_name: str) -> bool:
        """
        determine if the space is directly joinable (regardless of role).
        This is equivalent to checking if the space is public or private.
        :param space_name: the name of the space to check the joinable attribute of
        """

        space = self.db.spaces.find_one(
            {"name": space_name}, projection={"_id": False, "joinable": True}
        )

        if not space:
            raise SpaceDoesntExistError()

        return space["joinable"]

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

    def create_or_join_discussion_space(self, wp_post: dict, username: str) -> str:
        """
        the given user joins the discussion space about the given wordpress post.
        If this space doesnt exist, create one and let the user join
        :param wp_post: the wordpress from the wordpress api (needs at least id and title keys)
        :param username: the user who wants to create or join the space
        :return: the name of the space
        """

        self.db.spaces.update_one(
            {"wp_post_id": wp_post["id"]},
            {
                "$addToSet": {"members": username},
                # in case the wordpress post name was changed, simply always update the name
                "$set": {"name": "Discussion: {}".format(wp_post["title"]["rendered"])},
                # only when inserting a new space, those additional parameters will be set
                "$setOnInsert": {
                    "invisible": True,
                    "joinable": True,
                    "admins": [],
                    "invites": [],
                    "requests": [],
                    "files": [],
                    "is_discussion": True,
                    "wp_post_id": wp_post["id"],
                },
            },
            upsert=True,
        )

        # return name of the space
        return "Discussion: {}".format(wp_post["title"]["rendered"])

    def get_files(self, space_name: str) -> List[Dict]:
        """
        get the metadata of the files from the given space as a list of dicts.
        If no files are in the space, an empty list is returned instead.
        Metdata contains the `author` and the `filename` as a dict.
        use the filenames to retrieve the actual files via the `StaticFileHandler`
        on the /uploads - endpoint by using /uploads/<space_name>/<filename>
        :param space_name: the name of the space to get the files of
        :return: list of dicts of file metadata, or an empty list, if no files are
                 in the space
        """

        db_result = self.db.spaces.find_one(
            {"name": space_name}, projection={"_id": False, "files": True}
        )

        if db_result is None:
            raise SpaceDoesntExistError()

        return db_result["files"]

    def _ensure_space_uploads_directory_exists(self, space_name: str) -> None:
        """
        check if the given space has a dedicated uploads subdirectory inside the uploads-directory.
        if not, create one
        """

        if not os.path.isdir(os.path.join(global_vars.upload_direcory, space_name)):
            os.mkdir(os.path.join(global_vars.upload_direcory, space_name))

    def add_new_file(
        self, space_name: str, author: str, file_name: str, file_content: bytes, manually_uploaded: bool
    ) -> None:
        """
        add a new file to the space's 'repository'.
        each space has an own directory in the uploads directory, where the files will be stored.
        if this directory doesnt exist, it will be created.
        the `manually_uploaded` flag indicates if the file was uploaded into the space by a user (== True)
        or inserted by uploading this file as part of a post (==False). If it was uploaded as
        part of a post, it can only be deleted by deleting the post, but not the file itself!
        """

        space = self.get_space(space_name, projection={"_id": False, "files": True})

        # raise error if space doesnt exist
        if not space:
            raise SpaceDoesntExistError()

        # check if the same filename already exists in that space, raise error if so
        for file_obj in space["files"]:
            if file_obj["filename"] == file_name:
                raise FilenameCollisionError()

        # append file metadata to files array of space
        self.db.spaces.update_one(
            {"name": space_name},
            {
                "$push": {
                    "files": {
                        "author": author,
                        "filename": file_name,
                        "manually_uploaded": manually_uploaded,
                    }
                }
            },
        )

        # store file content on the FS
        self._ensure_space_uploads_directory_exists(space_name)
        with open(
            os.path.join(global_vars.upload_direcory, space_name, file_name), "wb"
        ) as fp:
            fp.write(file_content)

    def remove_file(self, space_name: str, file_name: str) -> None:
        """
        remove a file from the space, i.e. remove the reference from the db and
        also remove it physically from disk
        """

        # search for the file first to check existence of the space and the file
        # in the first place. if it is found, do the necessary checks before commiting
        # to the deletion
        try:
            files = self.get_files(space_name)
        except SpaceDoesntExistError:
            raise
        for file in files:
            if file["filename"] == file_name:
                # if the file was not manually uploaded to the file repo,
                # it belongs to a post, which makes it only deletable by
                # deleting the post itself.
                if (
                    "manually_uploaded" not in file
                    or file["manually_uploaded"] is False
                ):
                    raise PostFileNotDeleteableError()
                # finally we can delete the file from space and from the FS
                else:
                    self.db.spaces.update_one(
                        {"name": space_name},
                        {"$pull": {"files": {"filename": file_name}}},
                    )
                    try:
                        os.remove(
                            os.path.join(
                                global_vars.upload_direcory, space_name, file_name
                            )
                        )
                    except FileNotFoundError:
                        pass
            return
        # after iterating the whole loop, the file wasnt found, so we raise an error
        raise FileDoesntExistError()

    def remove_post_file(self, space_name: str, file_name: str) -> None:
        """
        remove a file from the space that belongs to a post. this function should ONLY be used,
        when the corresponding post is deleted. For any files that were uploaded via
        the regular space's repository, use `remove_file` instead, otherwise inconsistent states would
        arise.
        """

        update_result = self.db.spaces.update_one(
            {"name": space_name},
            {"$pull": {"files": {"filename": file_name}}},
        )

        # if no document was matched, the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        # if no document was modified, the file wasn't in the space files metadata
        if update_result.modified_count != 1:
            raise FileDoesntExistError()

        # if the file was removed from the space's metadata, also delete it from disk
        try:
            os.remove(
                os.path.join(
                    global_vars.upload_direcory, space_name, file_name
                )
            )
        except FileNotFoundError:
            pass

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


class FilenameCollisionError(Exception):
    pass


class FileDoesntExistError(Exception):
    pass


class PostFileNotDeleteableError(Exception):
    pass
