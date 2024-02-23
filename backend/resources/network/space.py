from typing import Dict, List, Optional

from bson import ObjectId
import gridfs
from pymongo.database import Database
from exceptions import (
    AlreadyAdminError,
    AlreadyMemberError,
    AlreadyRequestedJoinError,
    FileAlreadyInRepoError,
    FileDoesntExistError,
    NotRequestedJoinError,
    OnlyAdminError,
    PostFileNotDeleteableError,
    SpaceAlreadyExistsError,
    SpaceDoesntExistError,
    UserNotAdminError,
    UserNotInvitedError,
    UserNotMemberError,
)
from model import Space
import util


class Spaces:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            ...

    """

    def __init__(self, db: Database):
        self.db = db

        self.space_attributes = {
            "name": str,
            "invisible": bool,
            "joinable": bool,
            "members": list,
            "admins": list,
            "invites": list,
            "requests": list,
            "files": list,
            "space_pic": str,
            "space_description": str,
        }

    def check_space_exists(self, space_id: str | ObjectId) -> bool:
        """
        check if a space exists
        :returns: True if the space exists, False otherwise
        """

        if space_id is None:
            return False

        if self.get_space(space_id, projection={"_id": True}):
            return True
        else:
            return False

    def check_user_is_space_admin(
        self, space_id: str | ObjectId, username: str
    ) -> bool:
        """
        check if the given user is an admin in the given space
        """

        space = self.get_space(space_id, projection={"_id": True, "admins": True})

        if not space:
            raise SpaceDoesntExistError()

        if username in space["admins"]:
            return True
        else:
            return False

    def check_user_is_member(self, space_id: str | ObjectId, username: str) -> bool:
        """
        check if the given user is a member of the given space
        """

        space = self.get_space(space_id, projection={"_id": True, "members": True})
        if not space:
            raise SpaceDoesntExistError()

        if username in space["members"]:
            return True
        else:
            return False

    def get_space(
        self, space_id: str | ObjectId, projection: dict = {}
    ) -> Optional[Space]:
        """
        get the space data of the space given by its _id. optionally specify a projection
        to reduce query to the necessary fields (increases performance)
        :return: the space data as a dict or None, if the space doesnt exist
        """

        space_id = util.parse_object_id(space_id)

        result = self.db.spaces.find_one({"_id": space_id}, projection=projection)
        return Space(result) if result is not None else None

    def get_all_spaces(self, projection: dict = {}) -> List[dict]:
        """
        get the space data from all spaces in al list. Optionally specify a projection
        to reduce query to the necessary fields (increases performance)
        :return: the space data of all spaces as dicts, combined into a list
        """

        spaces = []
        for space in self.db.spaces.find(projection=projection):
            spaces.append(Space(space))
        return spaces

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

        spaces = []
        for space in self.db.spaces.find(
            {
                "$or": [
                    {"invisible": False},
                    {"invisible": {"$exists": False}},
                    {"members": username},
                ]
            },
            projection=projection,
        ):
            spaces.append(Space(space))
        return spaces

    def get_spaces_of_user(self, username: str) -> List[Space]:
        """
        get data of all spaces the given user is a member (or admin) of
        :return: the space data of all spaces the user is a member (or admin) of
        """

        spaces = []
        for space in self.db.spaces.find(
            {"$or": [{"members": username}, {"admins": username}]}
        ):
            spaces.append(Space(space))
        return spaces

    def get_space_names(self) -> List[str]:
        """
        retrieve a list of all existing space names
        """

        return [
            space["name"] for space in self.db.spaces.find(projection={"name": True})
        ]

    def get_space_names_of_user(self, username: str) -> List[str]:
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
    
    def get_space_ids_of_user(self, username: str) -> List[ObjectId]:
        """
        retrieve a list of space _ids that the given user is a member of.
        :param username: the user to query for
        :return: list of space _ids, or an empty list, if the user is not a member of any space
        """

        return [
            space["_id"]
            for space in self.db.spaces.find(
                {"members": username}, projection={"_id": True}
            )
        ]

    def get_space_invites_of_user(self, username: str) -> List[Space]:
        """
        get a list of pending invites into spaces for the given user
        :return: list of spaces that the user is currently invited to (unanswered)
        """

        return list(self.db.spaces.find({"invites": username}))

    def get_space_requests_of_user(self, username: str) -> List[Space]:
        """
        get a list of pending join requests into spaces for the given user
        :return: list of spaces that the user has requested to join (unanswered)
        """

        return list(self.db.spaces.find({"requests": username}))

    def create_space(self, space: dict) -> ObjectId:
        """
        create a new space, validating the existence of the necessary attributes
        beforehand. mandatory attributes are: name (str), invisible (bool),
        joinable (bool), members (list<str>), admins (list<str>), invites (list<str>),
        requests (list<str>), files (list<ObjectId>)

        Returns the _id of the newly created space
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

        # if an _id is present, delete it to prevent collisions and
        # let the db create a new one
        if "_id" in space:
            del space["_id"]

        # raise error if another space with the same name already exists
        # TODO delete, allow multiple spaces with the same name from now on,
        # since we use _id as the unique identifier
        # if self.check_space_exists(space["name"]):
        #    raise SpaceAlreadyExistsError()

        # finally, create it
        result = self.db.spaces.insert_one(space)

        return result.inserted_id

    def delete_space(self, space_id: str | ObjectId) -> None:
        """
        delete the space and all data associated with it, i.e.:
        - space data (description, ...)
        - all posts that were posted into the space
        - all space acl rules
        """

        space_id = util.parse_object_id(space_id)

        # delete all files from the repository
        try:
            space_files = self.get_files(space_id)
        except SpaceDoesntExistError:
            raise
        fs = gridfs.GridFS(self.db)
        for file in space_files:
            fs.delete(file["file_id"])

        self.db.spaces.delete_one({"_id": space_id})

        from resources.network.post import Posts
        from resources.network.acl import ACL

        with util.get_mongodb() as db:
            post_manager = Posts(db)
            acl = ACL(db)

            post_manager.delete_post_by_space(space_id)
            acl.space_acl.delete(space_id=space_id)

    def is_space_directly_joinable(self, space_id: str | ObjectId) -> bool:
        """
        determine if the space is directly joinable (regardless of role).
        This is equivalent to checking if the space is public or private.
        :param space_id: the _id of the space to check the joinable attribute of
        """

        space_id = util.parse_object_id(space_id)

        space = self.db.spaces.find_one(
            {"_id": space_id}, projection={"_id": True, "joinable": True}
        )

        if not space:
            raise SpaceDoesntExistError()

        return space["joinable"]

    def join_space(self, space_id: str | ObjectId, username: str) -> None:
        """
        let the user given by his `username` join the space identified by `space_id`
        :param space_id: the _id of the space
        :param username: the name of the user
        """

        space_id = util.parse_object_id(space_id)

        update_result = self.db.spaces.update_one(
            {"_id": space_id}, {"$addToSet": {"members": username}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        # if no document was updated, we know that the user already is a member,
        # because a set doesnt allow duplicates, meaning his name is already in it
        if update_result.modified_count != 1:
            raise AlreadyMemberError()

    def join_space_request(self, space_id: str | ObjectId, username: str) -> None:
        """
        set the user given by his username as requested to join the space, i.e. add him
        to the requests set
        :param space_id: the _id of the space
        :param username: the name of the user
        """

        space_id = util.parse_object_id(space_id)

        update_result = self.db.spaces.update_one(
            {"_id": space_id},
            {"$addToSet": {"requests": username}},
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        # if no document was updated, we know that the user already is a member,
        # because a set doesnt allow duplicates, meaning his name is already in it
        if update_result.modified_count != 1:
            raise AlreadyRequestedJoinError()

    def add_space_admin(self, space_id: str | ObjectId, username: str) -> None:
        """
        set a user as a space admin
        """

        space_id = util.parse_object_id(space_id)

        update_result = self.db.spaces.update_one(
            {"_id": space_id},
            {"$addToSet": {"admins": username, "members": username}},
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        # if no document was updated, we know that the user already is an admin,
        # because a set doesnt allow duplicates, meaning his name is already in it
        if update_result.modified_count != 1:
            raise AlreadyAdminError()

    def set_space_picture(
        self, space_id: str | ObjectId, filename: str, picture: bytes, content_type: str
    ) -> None:
        """
        set a new picture for the space, i.e. store the picture on disk and set the correct file_id
        :param space_id: the space to update the picture of
        :param filename: the filename (including file extension) of the picture
        :param picture: the actual picture as bytes
        :param content_type: the MIME-Type of the picture, e.g. image/jpg or image/png
        """

        space_id = util.parse_object_id(space_id)

        fs = gridfs.GridFS(self.db)
        # store in gridfs
        _id = fs.put(
            picture,
            filename=filename,
            content_type=content_type,
            metadata={"uploader": "me"},
        )

        update_result = self.db.spaces.update_one(
            {"_id": space_id},
            {
                "$set": {
                    "space_pic": _id,
                }
            },
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def set_space_description(self, space_id: str | ObjectId, description: str) -> None:
        """
        set (or update) the description of the space.
        :param space_id: the space which description should be updated
        :param description: the new description of the space
        """

        space_id = util.parse_object_id(space_id)

        update_result = self.db.spaces.update_one(
            {"_id": space_id}, {"$set": {"space_description": description}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def invite_user(self, space_id: str | ObjectId, username: str) -> None:
        """
        invite a user into the give space, i.e. add him to the invites list
        """

        space_id = util.parse_object_id(space_id)

        update_result = self.db.spaces.update_one(
            {"_id": space_id}, {"$addToSet": {"invites": username}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def accept_space_invite(self, space_id: str | ObjectId, username: str) -> None:
        """
        the given user accepts his invite into the given space and
        is therefore moved from the invited list into the members list
        :param space_id: the space in which the invitation is accepted
        :param username: the user who accepts his invite
        """

        space_id = util.parse_object_id(space_id)

        space_invites = self.get_space(
            space_id, projection={"_id": True, "invites": True}
        )

        if not space_invites:
            raise SpaceDoesntExistError()

        if username not in space_invites["invites"]:
            raise UserNotInvitedError()

        # pull user from invites and add him to members
        self.db.spaces.update_one(
            {"_id": space_id},
            {
                "$addToSet": {"members": username},
                "$pull": {"invites": username},
            },
        )

    def _remove_user_from_invite_list(
        self, space_id: str | ObjectId, username: str
    ) -> None:
        """
        helper function to remove a user from the invite list of a space
        """

        space_id = util.parse_object_id(space_id)

        # pull user from pending invites
        update_result = self.db.spaces.update_one(
            {"_id": space_id}, {"$pull": {"invites": username}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def decline_space_invite(self, space_id: str | ObjectId, username: str) -> None:
        """
        the given user declines his invite into the given space,
        therefore he is removed from the invite list, but not added to the members
        obviously.
        :param space_id: the space in which the invitation is declined
        :param username: the user who declines his invite
        """

        # pull user from pending invites to decline (dont add to members obviously)
        self._remove_user_from_invite_list(space_id, username)

    def revoke_space_invite(self, space_id: str | ObjectId, username: str) -> None:
        """
        the invitation that was initially sent to the given user is revoked,
        removing him from the invites list as if nothing happened.
        :param space_id: the space in which the invitation is revoked
        :param username: the user whose invitation is revoked
        """

        # pull use from pending invites
        self._remove_user_from_invite_list(space_id, username)

    def accept_join_request(self, space_id: str | ObjectId, username: str) -> None:
        """
        the join request of the given user is accepted (usually by an admin, but permissions
        are not checked here!). Therefore the user will become a member
        :param space_id: the space where the join request is accepted.
        :param username: the user whose request is accepted
        """

        space_id = util.parse_object_id(space_id)

        space_requests = self.get_space(
            space_id, projection={"_id": True, "requests": True}
        )
        if not space_requests:
            raise SpaceDoesntExistError()

        if username not in space_requests["requests"]:
            raise NotRequestedJoinError()

        # add user to members and pull them from pending requests
        self.db.spaces.update_one(
            {"_id": space_id},
            {"$addToSet": {"members": username}, "$pull": {"requests": username}},
        )

    def _remove_user_from_requests_list(
        self, space_id: str | ObjectId, username: str
    ) -> None:
        """
        helper function to remove a user from the requests list of a space
        """

        space_id = util.parse_object_id(space_id)

        # pull user from pending requests
        update_result = self.db.spaces.update_one(
            {"_id": space_id}, {"$pull": {"requests": username}}
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def reject_join_request(self, space_id: str | ObjectId, username: str) -> None:
        """
        the join request of the given user is declined (usually by an admin, but permissions
        are not checked here!). Therefore the user will not become a member
        :param space_id: the space where the join request is declined.
        :param username: the user whose request is declined
        """

        self._remove_user_from_requests_list(space_id, username)

    def revoke_join_request(self, space_id: str | ObjectId, username: str) -> None:
        """
        the join request of the given user is revoked (usually by the user himself, but permissions
        are not checked here). Therefore the user will be removed from the requests list
        """

        self._remove_user_from_requests_list(space_id, username)

    def toggle_visibility(self, space_id: str | ObjectId) -> None:
        """
        toggle the visiblity of the space, i.e. visible --> invisible, invisible --> visible
        """

        space_id = util.parse_object_id(space_id)

        # toggle visibility
        update_result = self.db.spaces.update_one(
            {"_id": space_id}, [{"$set": {"invisible": {"$not": "$invisible"}}}]
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def toggle_joinability(self, space_id: str | ObjectId) -> None:
        """
        toggle the joinability of the space, i.e. joinable --> not joinable, not joinable --> joinable
        """

        space_id = util.parse_object_id(space_id)

        # toggle joinability
        update_result = self.db.spaces.update_one(
            {"_id": space_id}, [{"$set": {"joinable": {"$not": "$joinable"}}}]
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

    def leave_space(self, space_id: str | ObjectId, username: str) -> None:
        """
        the given user leaves the space. if he is a space admin, there has to be
        atleast one more admin, otherwise the operation is ignored, because it
        would leave the space without an admin. In that case the user has
        to nominate another space admin first
        :param space_id: the space the user want to leave from
        :param username: the user who wants to leave the space
        """

        space_id = util.parse_object_id(space_id)

        space = self.get_space(space_id, projection={"_id": True, "admins": True})
        if not space:
            raise SpaceDoesntExistError()

        # if user is the only space admin, block leaving
        # (he has to transform permission to someone else first)
        if username in space["admins"]:
            if len(space["admins"]) == 1:
                raise OnlyAdminError()

        # remove user from members and also admins (if he was one)
        self.db.spaces.update_one(
            {"_id": space_id},
            {
                "$pull": {
                    "members": username,
                    "admins": username,
                }
            },
        )

    def kick_user(self, space_id: str | ObjectId, username: str) -> None:
        """
        the given user is kicked from the space (usually by an admin, but permission are
        not checked here!). Therefore he will be removed from the members list.
        """

        space_id = util.parse_object_id(space_id)

        update_result = self.db.spaces.update_one(
            {"_id": space_id},
            {"$pull": {"members": username, "admins": username}},
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        # if no document was modified, we know that the user wasnt a member
        if update_result.modified_count != 1:
            raise UserNotMemberError()

    def revoke_space_admin_privilege(
        self, space_id: str | ObjectId, username: str
    ) -> None:
        """
        the given user gets his space admin privilege revoked, leaving him only as a
        normal member
        :param space_id: the space in which the permission will be revoked
        :param username: the user whose permissions will be revoked
        """

        space_id = util.parse_object_id(space_id)

        space_admins = self.get_space(
            space_id, projection={"_id": True, "admins": True}
        )
        if not space_admins:
            raise SpaceDoesntExistError()

        if username not in space_admins["admins"]:
            raise UserNotAdminError()

        # if the user is the only admin left, he cannot be degraded
        if len(space_admins["admins"]) == 1:
            raise OnlyAdminError()

        # remove user from spaces admins list
        self.db.spaces.update_one({"_id": space_id}, {"$pull": {"admins": username}})

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

    def get_files(self, space_id: str | ObjectId) -> List[Dict]:
        """
        get the metadata of the files from the given space as a list of dicts.
        If no files are in the space, an empty list is returned instead.
        Metdata contains the `author` and the `filename` as a dict.
        use the filenames to retrieve the actual files via the `StaticFileHandler`
        on the /uploads - endpoint by using /uploads/<space_id>/<filename>
        :param space_id: the _id of the space to get the files of
        :return: list of dicts of file metadata, or an empty list, if no files are
                 in the space
        """

        space_id = util.parse_object_id(space_id)

        db_result = self.get_space(space_id, projection={"_id": True, "files": True})

        if db_result is None:
            raise SpaceDoesntExistError()

        return db_result["files"]

    def add_new_post_file(
        self, space_id: str | ObjectId, author: str, file_id: ObjectId, file_name: str
    ) -> None:
        """
        add a new file to the space's 'repository', that was originally part of a post.
        therefore we don't save a new file, but only keep a reference to the file_id in the space,
        i.e. the actual saving of the file needs to be done by the post, and afterwards the
        stored _id is used here as a parameter.
        """

        space_id = util.parse_object_id(space_id)

        update_result = self.db.spaces.update_one(
            {"_id": space_id},
            {
                "$addToSet": {
                    "files": {
                        "author": author,
                        "file_id": file_id,
                        "file_name": file_name,
                        "manually_uploaded": False,
                    }
                }
            },
        )

        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        if update_result.modified_count != 1:
            raise FileAlreadyInRepoError()

    def add_new_repo_file(
        self,
        space_id: str | ObjectId,
        file_name: str,
        file_content: bytes,
        content_type: str,
        uploader: str,
    ) -> ObjectId:
        """
        add a new file to the space's 'repository', returning the _id of the newly
        created file
        """

        space_id = util.parse_object_id(space_id)

        if not self.check_space_exists(space_id):
            raise SpaceDoesntExistError()

        # store file in gridfs
        fs = gridfs.GridFS(self.db)
        _id = fs.put(
            file_content,
            filename=file_name,
            content_type=content_type,
            metadata={"uploader": uploader},
        )

        self.db.spaces.update_one(
            {"_id": space_id},
            {
                "$addToSet": {
                    "files": {
                        "author": uploader,
                        "file_id": _id,
                        "file_name": file_name,
                        "manually_uploaded": True,
                    }
                }
            },
        )

        return _id

    def remove_file(self, space_id: str | ObjectId, file_id: ObjectId) -> None:
        """
        remove a file from the space, i.e. remove the reference from the db and
        also remove it physically from gridfs
        """

        space_id = util.parse_object_id(space_id)

        # search for the file first to check existence of the space and the file
        # in the first place. if it is found, do the necessary checks before commiting
        # to the deletion
        try:
            files = self.get_files(space_id)
        except SpaceDoesntExistError:
            raise

        fs = gridfs.GridFS(self.db)
        for file in files:
            if file["file_id"] == file_id:
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
                        {"_id": space_id},
                        {"$pull": {"files": {"file_id": file_id}}},
                    )
                    fs.delete(file_id)
            return

        # after iterating the whole loop, the file wasnt found, so we raise an error
        raise FileDoesntExistError()

    def remove_post_file(self, space_id: str | ObjectId, file_id: ObjectId) -> None:
        """
        remove a file from the space that belongs to a post. this function should ONLY be used,
        when the corresponding post is deleted. For any files that were uploaded via
        the regular space's repository, use `remove_file` instead, otherwise inconsistent states would
        arise.
        """

        space_id = util.parse_object_id(space_id)

        update_result = self.db.spaces.update_one(
            {"_id": space_id},
            {"$pull": {"files": {"file_id": file_id}}},
        )

        # if no document was matched, the space doesnt exist
        if update_result.matched_count != 1:
            raise SpaceDoesntExistError()

        # if no document was modified, the file wasn't in the space files metadata
        if update_result.modified_count != 1:
            raise FileDoesntExistError()
