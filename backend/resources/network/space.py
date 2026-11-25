from datetime import datetime, timedelta, timezone
import logging
import math
import random
from typing import Callable, Dict, List, Optional

from bson import ObjectId
import gridfs
from pymongo import ReturnDocument
from pymongo.database import Database
import requests
from exceptions import (
    AlreadyAdminError,
    AlreadyMemberError,
    AlreadyRequestedJoinError,
    NotRequestedJoinError,
    OnlyAdminError,
    SpaceDoesntExistError,
    UserNotAdminError,
    UserNotInvitedError,
    UserNotMemberError,
)
from resources.elasticsearch_integration import ElasticsearchConnector
from resources.network.profile import Profiles
from resources.network.profile_option_labels import PROFILE_OPTION_LABELS_DE
from resources.network.space_files import SpaceFiles
from resources.planner.ve_plan import VEPlanResource
from model import Space
import util

logger = logging.getLogger(__name__)

# errors of a failed or unexpected elasticsearch response. Elasticsearch is only a
# replica, so the space suggestions leave out its signals then instead of failing
ELASTICSEARCH_ERRORS = (requests.RequestException, KeyError, ValueError)


class Spaces:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            ...

    """

    # weights of the signals of the space suggestions, see `get_space_suggestions()`
    SUGGESTION_WEIGHTS = {
        "similar_members": 0.35,
        "network": 0.25,
        "topic": 0.2,
        "activity": 0.2,
    }
    # number of profile matching hits that count as similar users
    SUGGESTION_SIMILAR_USERS_COUNT = 100
    # a space gets the full network score with this many members of the network
    SUGGESTION_NETWORK_SATURATION = 3
    # posts of this many past days count as activity
    SUGGESTION_ACTIVITY_DAYS = 90
    # the suggestions are drawn from this many best scored spaces ...
    SUGGESTION_POOL_SIZE = 8
    # ... except for this many, which are drawn from the remaining active spaces
    SUGGESTION_DISCOVER_COUNT = 2
    # remaining spaces count as active with a recent post or this many members
    SUGGESTION_DISCOVER_MIN_MEMBERS = 3
    # spaces without any score are still drawn, just very unlikely
    SUGGESTION_MIN_DRAW_WEIGHT = 0.01
    # the fields of a space that a suggestion consists of
    SUGGESTION_FIELDS = ("_id", "name", "space_pic", "space_description")

    def __init__(self, db: Database):
        self.db = db

        # the randomness of the suggestions
        # TODO can be fixed to a number with evidence from realworld data
        self.suggestion_random = random.Random()

        self.space_attributes = {
            "name": str,
            "invisible": bool,
            "joinable": bool,
            "members": list,
            "admins": list,
            "invites": list,
            "requests": list,
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

    def get_bulk_space_snippets(
        self, space_ids: List[str | ObjectId], member: str = None
    ) -> List[Dict]:
        """
        request the space snippets (i.e. name, space_description, space_pic, joinable and requests)
        for every given _id in `space_id` and return them as a Dict.
        Optionally, you can specify a username as the `member`-parameter to
        exclude spaces from the response, that the user is already a member of.
        If any of the space_id's does not exist, it is omitted from the response,
        meaning the length of the response list and the given list of _id's
        might differ.
        """

        if not isinstance(space_ids, list):
            raise TypeError(
                "expected type 'list' for argument 'space_ids', got {}".format(
                    type(space_ids)
                )
            )
        space_ids = [util.parse_object_id(space_id) for space_id in space_ids]

        if not space_ids:
            return []

        if member:
            return list(
                self.db.spaces.find(
                    {
                        "_id": {"$in": space_ids},
                        "invisible": False,
                        "members": {"$ne": member},
                        "admins": {"$ne": member},
                    },
                )
            )
        else:
            return list(
                self.db.spaces.find(
                    {
                        "_id": {"$in": space_ids},
                        "invisible": False,
                    },
                )
            )

    def create_space(
        self, space: dict, elasticsearch_collection: str = "spaces"
    ) -> ObjectId:
        """
        create a new space, validating the existence of the necessary attributes
        beforehand. mandatory attributes are: name (str), invisible (bool),
        joinable (bool), members (list<str>), admins (list<str>), invites (list<str>),
        requests (list<str>), space_pic (str), space_description (str)

        You can also specify the elasticsearch collection in which the profile
        should be replicated. The default is "spaces" just as in the mongodb.

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

        # for each admin, count towards the achievement "join_groups" and
        # "admin_groups"
        for admin in space["admins"]:
            profile_manager = Profiles(self.db)
            profile_manager.achievement_count_up(admin, "join_groups")
            profile_manager.achievement_count_up(admin, "admin_groups")

        # for regular members, count towards the achievement "join_groups"
        # but only if they are not already an admin --> otherwise they would
        # count twice
        for member in space["members"]:
            if member not in space["admins"]:
                profile_manager.achievement_count_up(member, "join_groups")

        # replicate the insert to elasticsearch
        ElasticsearchConnector().on_insert(
            result.inserted_id, space, elasticsearch_collection
        )

        return result.inserted_id

    def delete_space(
        self, space_id: str | ObjectId, elasticsearch_collection: str = "spaces"
    ) -> None:
        """
        delete the space and all data associated with it, i.e.:
        - space data (description, ...)
        - the complete file share of the space
        - all posts that were posted into the space (including their files)
        - all space acl rules
        """

        space_id = util.parse_object_id(space_id)

        if not self.check_space_exists(space_id):
            raise SpaceDoesntExistError()

        # delete the file share of the space
        SpaceFiles(self.db).delete_all_of_space(space_id)

        self.db.spaces.delete_one({"_id": space_id})

        from resources.network.post import Posts
        from resources.network.acl import ACL

        with util.get_mongodb() as db:
            post_manager = Posts(db)
            acl = ACL(db)

            post_manager.delete_post_by_space(space_id)
            acl.space_acl.delete(space_id=space_id)

        ElasticsearchConnector().on_delete(space_id, elasticsearch_collection)

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

        # since all checks have passed, count towards the achievement "join_groups"
        profile_manager = Profiles(self.db)
        profile_manager.achievement_count_up(username, "join_groups")

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

        # since all checks have passed, count towards the achievement "admin_groups"
        profile_manager = Profiles(self.db)
        profile_manager.achievement_count_up(username, "admin_groups")

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
        # store in gridfs (mime type and uploader live in the file's metadata)
        _id = util.gridfs_put(fs, picture, filename, content_type, "me")

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

    def set_space_description(
        self,
        space_id: str | ObjectId,
        description: str,
        elasticsearch_collection: str = "spaces",
    ) -> None:
        """
        set (or update) the description of the space.
        :param space_id: the space which description should be updated
        :param description: the new description of the space
        """

        space_id = util.parse_object_id(space_id)

        update_result = self.db.spaces.find_one_and_update(
            {"_id": space_id},
            {"$set": {"space_description": description}},
            return_document=ReturnDocument.AFTER,
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result is None:
            raise SpaceDoesntExistError()

        ElasticsearchConnector().on_update(
            space_id, elasticsearch_collection, update_result
        )

    def set_space_name(
        self,
        space_id: str | ObjectId,
        name: str,
        elasticsearch_collection: str = "spaces",
    ) -> None:
        """
        rename the space.
        :param space_id: the space to rename
        :param name: the new name of the space
        """

        space_id = util.parse_object_id(space_id)

        update_result = self.db.spaces.find_one_and_update(
            {"_id": space_id},
            {"$set": {"name": name}},
            return_document=ReturnDocument.AFTER,
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result is None:
            raise SpaceDoesntExistError()

        ElasticsearchConnector().on_update(
            space_id, elasticsearch_collection, update_result
        )

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

        # since all checks have passed, count towards the achievement "join_groups"
        profile_manager = Profiles(self.db)
        profile_manager.achievement_count_up(username, "join_groups")

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

        # since all checks have passed, count towards the achievement "join_groups"
        profile_manager = Profiles(self.db)
        profile_manager.achievement_count_up(username, "join_groups")

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

    def toggle_visibility(
        self, space_id: str | ObjectId, elasticsearch_collection: str = "spaces"
    ) -> None:
        """
        toggle the visiblity of the space, i.e. visible --> invisible, invisible --> visible
        """

        space_id = util.parse_object_id(space_id)

        # toggle visibility
        update_result = self.db.spaces.find_one_and_update(
            {"_id": space_id},
            [{"$set": {"invisible": {"$not": "$invisible"}}}],
            return_document=ReturnDocument.AFTER,
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result is None:
            raise SpaceDoesntExistError()

        ElasticsearchConnector().on_update(
            space_id, elasticsearch_collection, update_result
        )

    def toggle_joinability(
        self, space_id: str | ObjectId, elasticsearch_collection: str = "spaces"
    ) -> None:
        """
        toggle the joinability of the space, i.e. joinable --> not joinable, not joinable --> joinable
        """

        space_id = util.parse_object_id(space_id)

        # toggle joinability
        update_result = self.db.spaces.find_one_and_update(
            {"_id": space_id},
            [{"$set": {"joinable": {"$not": "$joinable"}}}],
            return_document=ReturnDocument.AFTER,
        )

        # the filter didnt match any document, so the space doesnt exist
        if update_result is None:
            raise SpaceDoesntExistError()

        ElasticsearchConnector().on_update(
            space_id, elasticsearch_collection, update_result
        )

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

    def get_space_suggestions(self, profile: Dict, limit: int = 5) -> List[Dict]:
        """
        suggest at most `limit` spaces to join to the user of the given `profile`,
        best scored first. Never suggested are invisible spaces and spaces that the
        user is a member or admin of, was invited to or requested to join.

        Every space gets a score of 0 to 1, weighing these signals (each scaled to 0
        to 1, see `SUGGESTION_WEIGHTS`):

        - similar members: members whose profiles match the profile of the user,
          (using the profile matching approach)
        - network: members that the user follows or plans VEs with
        - topic: the name and description of the space match the expertise, VE
          interests and goals, research tags and courses of the user
        - activity: posts of the last days and the number of members

        The suggestions are drawn from the best scored spaces, weighted by their
        score, plus a few active spaces from the rest, so that users also come
        across spaces beyond their profile. As long as there are few spaces and
        sparse profiles, mostly the activity tells the spaces apart, which still
        favors lively spaces. Since they are drawn randomly, the suggestions vary
        between calls.

        This operation is relatively compute-expensive, so should be cached where possible.

        :return: the suggested spaces, each with its _id, name, space_pic and
                 space_description
        """

        spaces = self.score_spaces_for_suggestions(profile)
        pool = spaces[: self.SUGGESTION_POOL_SIZE]
        rest = spaces[self.SUGGESTION_POOL_SIZE :]

        active_rest = [
            space
            for space in rest
            if space["recent_posts"]
            or len(space["members"]) >= self.SUGGESTION_DISCOVER_MIN_MEMBERS
        ]
        suggestions = self._draw_suggestions(
            active_rest,
            lambda space: space["scores"]["activity"],
            min(self.SUGGESTION_DISCOVER_COUNT, limit),
        )
        suggestions += self._draw_suggestions(
            pool, lambda space: space["score"], limit - len(suggestions)
        )

        # only if `limit` exceeds the pool: fill up with the remaining spaces
        drawn = {space["_id"] for space in suggestions}
        leftover = [space for space in spaces if space["_id"] not in drawn]
        suggestions += self._draw_suggestions(
            leftover, lambda space: space["score"], limit - len(suggestions)
        )

        suggestions.sort(key=lambda space: space["score"], reverse=True)
        return [
            {field: space[field] for field in self.SUGGESTION_FIELDS if field in space}
            for space in suggestions
        ]

    def score_spaces_for_suggestions(self, profile: Dict) -> List[Dict]:
        """
        score all spaces that may be suggested to the user of the given `profile`
        (see `get_space_suggestions()`).

        :return: the spaces (their suggestion fields and members) along with their
                 number of "recent_posts", their "scores" per signal and their total
                 "score", best scored first
        """

        username = profile["username"]
        spaces = list(
            self.db.spaces.find(
                {
                    "invisible": {"$ne": True},
                    "members": {"$ne": username},
                    "admins": {"$ne": username},
                    "invites": {"$ne": username},
                    "requests": {"$ne": username},
                },
                projection={field: True for field in self.SUGGESTION_FIELDS}
                | {"members": True},
            )
        )
        if not spaces:
            return []

        recent_posts = self._recent_post_counts(spaces)
        for space in spaces:
            space["recent_posts"] = recent_posts.get(space["_id"], 0)

        signals = {
            "similar_members": self._suggestion_similar_members_scores(profile, spaces),
            "network": self._suggestion_network_scores(profile, spaces),
            "topic": self._suggestion_topic_scores(profile, spaces),
            "activity": self._suggestion_activity_scores(spaces),
        }
        for space in spaces:
            space["scores"] = {
                signal: scores[space["_id"]] for signal, scores in signals.items()
            }
            space["score"] = sum(
                self.SUGGESTION_WEIGHTS[signal] * score
                for signal, score in space["scores"].items()
            )

        return sorted(spaces, key=lambda space: space["score"], reverse=True)

    def _suggestion_similar_members_scores(
        self, profile: Dict, spaces: List[Dict]
    ) -> Dict[ObjectId, float]:
        """
        the matching scores of the members, summed up per space. The sum is divided
        by the square root of the number of members, so that big spaces don't win by
        their size alone
        """

        try:
            # the matching flattens the lists of the profile in place
            hits = ElasticsearchConnector().search_profile_match(
                dict(profile), None, None, size=self.SUGGESTION_SIMILAR_USERS_COUNT
            )
            user_scores = {hit["_source"]["username"]: hit["_score"] for hit in hits}
        except ELASTICSEARCH_ERRORS as e:
            logger.warning("could not match profiles for space suggestions: %s", e)
            user_scores = {}

        return self._scaled(
            {
                space["_id"]: (
                    sum(user_scores.get(member, 0) for member in space["members"])
                    / math.sqrt(len(space["members"]))
                    if space["members"]
                    else 0
                )
                for space in spaces
            }
        )

    def _suggestion_network_scores(
        self, profile: Dict, spaces: List[Dict]
    ) -> Dict[ObjectId, float]:
        """
        the number of members that the user follows or plans VEs with (as author or
        partner of a plan), up to `SUGGESTION_NETWORK_SATURATION`
        """

        username = profile["username"]
        network = set(profile["follows"])
        network.update(VEPlanResource(self.db).get_ve_partners(username))
        network.discard(username)

        return {
            space["_id"]: min(
                len(network.intersection(space["members"])),
                self.SUGGESTION_NETWORK_SATURATION,
            )
            / self.SUGGESTION_NETWORK_SATURATION
            for space in spaces
        }

    def _suggestion_topic_scores(
        self, profile: Dict, spaces: List[Dict]
    ) -> Dict[ObjectId, float]:
        """
        how well the names and descriptions of the spaces match the topics of the
        profile
        """

        try:
            space_scores = ElasticsearchConnector().search_space_topic_match(
                self._suggestion_topic_text(profile),
                [space["_id"] for space in spaces],
            )
        except ELASTICSEARCH_ERRORS as e:
            logger.warning("could not match topics for space suggestions: %s", e)
            space_scores = {}

        return self._scaled(
            {space["_id"]: space_scores.get(str(space["_id"]), 0) for space in spaces}
        )

    @staticmethod
    def _suggestion_topic_text(profile: Dict) -> str:
        """
        the topics of the profile as a single text: its expertise, VE interests and
        VE goals (with their English keys and German labels), its research tags and
        the titles of its courses
        """

        terms = []
        options = [profile["expertise"], *profile["ve_interests"], *profile["ve_goals"]]
        for option in options:
            if option:
                terms += [option, PROFILE_OPTION_LABELS_DE.get(option, "")]
        terms += profile["research_tags"]
        terms += [course["title"] for course in profile["courses"]]

        return " ".join(term for term in terms if term)

    def _recent_post_counts(self, spaces: List[Dict]) -> Dict[ObjectId, int]:
        """
        the number of posts of the last `SUGGESTION_ACTIVITY_DAYS` days per space,
        spaces without such posts are not contained
        """

        since = datetime.now(timezone.utc) - timedelta(
            days=self.SUGGESTION_ACTIVITY_DAYS
        )
        return {
            row["_id"]: row["count"]
            for row in self.db.posts.aggregate(
                [
                    {
                        "$match": {
                            "space": {"$in": [space["_id"] for space in spaces]},
                            "creation_date": {"$gte": since},
                        }
                    },
                    {"$group": {"_id": "$space", "count": {"$sum": 1}}},
                ]
            )
        }

    def _suggestion_activity_scores(self, spaces: List[Dict]) -> Dict[ObjectId, float]:
        """
        the recent posts and the members of the spaces, both on a logarithmic scale,
        since the first few make the biggest difference. The posts weigh more,
        members alone don't make a space lively
        """

        posts = self._scaled(
            {space["_id"]: math.log1p(space["recent_posts"]) for space in spaces}
        )
        members = self._scaled(
            {space["_id"]: math.log1p(len(space["members"])) for space in spaces}
        )
        return {
            space["_id"]: 0.7 * posts[space["_id"]] + 0.3 * members[space["_id"]]
            for space in spaces
        }

    @staticmethod
    def _scaled(values: Dict[ObjectId, float]) -> Dict[ObjectId, float]:
        """
        scale the values to 0 to 1 by dividing them by the biggest one
        """

        highest = max(values.values(), default=0)
        if highest <= 0:
            return {key: 0.0 for key in values}
        return {key: value / highest for key, value in values.items()}

    def _draw_suggestions(
        self, spaces: List[Dict], weight: Callable[[Dict], float], count: int
    ) -> List[Dict]:
        """
        draw `count` of the `spaces` (or all of them, if there are fewer) without
        replacement, each one with a chance proportional to its `weight`
        """

        if count <= 0:
            return []

        # weighted random sampling: the highest keys
        # of random() ** (1 / weight) are a weighted sample
        keyed = [
            (
                self.suggestion_random.random()
                ** (1 / max(weight(space), self.SUGGESTION_MIN_DRAW_WEIGHT)),
                space,
            )
            for space in spaces
        ]
        keyed.sort(key=lambda pair: pair[0], reverse=True)
        return [space for _, space in keyed[:count]]
