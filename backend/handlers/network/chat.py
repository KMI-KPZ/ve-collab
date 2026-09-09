import json
from typing import List, Optional

from bson.errors import InvalidId
import tornado.web
from exceptions import RoomDoesntExistError, UserNotMemberError

from error_reasons import (
    INSUFFICIENT_PERMISSIONS,
    INVALID_OBJECT_ID,
    MEMBERS_NOT_LIST_OF_STR,
    MISSING_KEY_IN_HTTP_BODY_SLUG,
    MISSING_KEY_SLUG,
    NAME_NOT_STR,
    ROOM_DOESNT_EXIST,
    USER_DOESNT_EXIST,
)
from handlers.base_handler import BaseHandler, auth_needed
from resources.network.chat import Chat
from resources.network.profile import Profiles
import util


class RoomHandler(BaseHandler):
    def options(self, slug):
        self.set_status(204)

    @auth_needed
    def get(self, slug):
        """
        GET /chatroom/get
            get room by either supplying a member list, the name, both or the room id itself

            query params:
                TODO

            http body:
                None

            returns:
                the matching room
                TODO

        GET /chatroom/get_mine
            get all rooms of current user (i.e. those where he/she is a member)

            query params:
                None

            http body:
                None

            returns:
                200 OK
                (contains snippets of all rooms where the current user is a member)
                {
                    "success": True,
                    "rooms": [
                        {
                            "_id": str,
                            "name": str,
                            "members": [str, ...],
                            "last_message": {
                                "_id": str,
                                "message": str,
                                "sender": str,
                                "creation_date": str,
                                "send_states": [
                                    {
                                        "username": "<username>",
                                        "state": "pending|sent|acknowledged"
                                    },
                                    ...
                                ],
                            }
                        },
                        {...}
                    ]
                }

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

        GET /chatroom/get_messages
            get all messages of a room

            query params:
                room_id: str, the _id of the room

            http body:
                None

            returns:
                200 OK
                (contains all messages of this room)
                {
                    "success": True,
                    "room_id": str,
                    "messages": [
                        {
                            "_id": str,
                            "message": str,
                            "sender": str,
                            "creation_date": str,
                            "send_states": [
                                {
                                    "username": "<username>",
                                    "state": "pending|sent|acknowledged"
                                },
                                ...
                            ],
                        },
                        {...},
                    ]}

                400 Bad Request
                (the request misses the room_id query parameter)
                {"success": False,
                 "reason": "missing_key:room_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (the current user is not a member of the room)
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                (the room does not exist)
                {"success": False,
                 "reason": "room_doesnt_exist"}

        GET /chatroom/get_messages_after
            Get a number of messages that are older then the message with the given message id.
            Useful to determine the messages that have to be requested on scroll up by specifying
            the oldest message that was sent via the socket.

            TODO
        """

        if slug == "get":
            self.set_status(501)  # not yet implemented, TODO

        elif slug == "get_mine":
            with util.get_mongodb() as db:
                chat_manager = Chat(db)

                rooms = chat_manager.get_room_snippets_for_user(
                    self.current_user.username
                )
                self.serialize_and_write({"success": True, "rooms": rooms})

        elif slug == "get_messages":
            try:
                room_id = self.get_argument("room_id")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + "room_id"})
                return

            self.get_messages(room_id)
            return

        elif slug == "get_messages_after":
            self.set_status(501)  # not yet implemented, TODO

        else:
            self.set_status(404)

    @auth_needed
    def post(self, slug):
        """
        POST /chatroom/create_or_get
            Create a new chatroom for a given list of members, if the combination of members
            and room name (optional) does not already exist. Return the room id, either
            freshly inserted or already existing.

            query params:

            http body:
                example:
                    {
                        "members": ["user1", "user2", "user3"], // if the current_user is not already in the list, he/she will be added automatically
                        "name": "room name"                     // optional
                    }

            returns:
                200 OK,
                (sucessful, contains created or already existing room id)
                {"success": True,
                 "room_id": str}

                400 Bad Request
                (the request body is not valid json)
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                (the request body misses the members key)
                {"success": False,
                 "reason": "missing_key:members"}

                400 Bad Request
                (members is not a list of usernames, e.g. not a list at all,
                empty, or contains non-string elements)
                {"success": False,
                 "reason": "members_not_list_of_str"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

        POST /chatroom/add_members
            Add further users to an already existing chatroom.
            Users that already are members of the room are skipped, making the request
            idempotent.

            query params:
                None

            http body:
                example:
                    {
                        "room_id": "<room_id>",
                        "members": ["user1", "user2"]   // the users that should be added
                    }

            returns:
                200 OK
                (successful, contains the resulting member list of the room)
                {"success": True,
                 "members": [str, ...]}

                400 Bad Request
                (the request body is not valid json)
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                (the request body misses the room_id or the members key)
                {"success": False,
                 "reason": "missing_key_in_http_body:<key>"}

                400 Bad Request
                (members is not a list of usernames, e.g. not a list at all,
                empty, or contains non-string elements)
                {"success": False,
                 "reason": "members_not_list_of_str"}

                400 Bad Request
                (the room_id is not a valid ObjectId)
                {"success": False,
                 "reason": "invalid_object_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (the current user is not a member of the room)
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                (the room does not exist)
                {"success": False,
                 "reason": "room_doesnt_exist"}

                409 Conflict
                (at least one of the users that should be added has no profile)
                {"success": False,
                 "reason": "user_doesnt_exist"}

        POST /chatroom/rename
            Set (or remove) the name of an already existing chatroom.
            Any member of the room may rename it.

            query params:
                None

            http body:
                example:
                    {
                        "room_id": "<room_id>",
                        "name": "new room name"     // an empty string (or null) removes the name
                    }

            returns:
                200 OK
                (successful, contains the name the room now has)
                {"success": True,
                 "name": str | None}

                400 Bad Request
                (the request body is not valid json)
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                (the request body misses the room_id or the name key)
                {"success": False,
                 "reason": "missing_key_in_http_body:<key>"}

                400 Bad Request
                (the name is neither a string nor null)
                {"success": False,
                 "reason": "name_not_str"}

                400 Bad Request
                (the room_id is not a valid ObjectId)
                {"success": False,
                 "reason": "invalid_object_id"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (the current user is not a member of the room)
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                (the room does not exist)
                {"success": False,
                 "reason": "room_doesnt_exist"}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": "json_parsing_error"})
            return

        if slug == "create_or_get":
            # ensure necessary keys are present
            if "members" not in http_body:
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "members",
                    }
                )
                return

            # members has to be a non-empty list of usernames (str)
            if not util._is_list_of_str(http_body["members"]):
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": MEMBERS_NOT_LIST_OF_STR,
                    }
                )
                return

            # set name to provided value or None
            name = (
                http_body["name"]
                if "name" in http_body and http_body["name"] != ""
                else None
            )

            self.create_or_get_room_id(http_body["members"], name)
            return

        elif slug == "add_members":
            # ensure necessary keys are present
            for key in ["room_id", "members"]:
                if key not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + key,
                        }
                    )
                    return

            # members has to be a non-empty list of usernames (str)
            if not util._is_list_of_str(http_body["members"]):
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": MEMBERS_NOT_LIST_OF_STR,
                    }
                )
                return

            self.add_members(http_body["room_id"], http_body["members"])
            return

        elif slug == "rename":
            # ensure necessary keys are present
            for key in ["room_id", "name"]:
                if key not in http_body:
                    self.set_status(400)
                    self.write(
                        {
                            "success": False,
                            "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + key,
                        }
                    )
                    return

            # the name has to be a str, or null to remove the name again
            if http_body["name"] is not None and not isinstance(http_body["name"], str):
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": NAME_NOT_STR,
                    }
                )
                return

            # an empty name is the same as no name at all
            name = http_body["name"] if http_body["name"] != "" else None

            self.rename_room(http_body["room_id"], name)
            return

        else:
            self.set_status(404)

    def get_messages(self, room_id: str) -> None:
        """
        Request all messages of a room.

        Returns:
            200 OK -> contains all messages of the room
            403 Forbidden -> the current user is not a member of the room
            409 Conflict -> the room does not exist
        """

        with util.get_mongodb() as db:
            chat_manager = Chat(db)

            try:
                if not chat_manager.check_is_user_chatroom_member(
                    room_id, self.current_user.username
                ):
                    self.set_status(403)
                    self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                    return
            except RoomDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": ROOM_DOESNT_EXIST})
                return

            messages = chat_manager.get_all_messages_of_room(room_id)
            self.serialize_and_write(
                {"success": True, "room_id": room_id, "messages": messages}
            )

    def create_or_get_room_id(self, members: List[str], name: str = None):
        """
        exchange a list of usernames (`members`) and a room name (optional)
        for the _id of the room, creating a new room if necessary.
        """

        # add current user to members list if not already present
        if self.current_user.username not in members:
            members.append(self.current_user.username)

        with util.get_mongodb() as db:
            chat_manager = Chat(db)
            room_id = chat_manager.get_or_create_room_id(members, name)

            self.serialize_and_write({"success": True, "room_id": room_id})

    def add_members(self, room_id: str, new_members: List[str]) -> None:
        """
        Add the given users to the room, i.e. from now on they are part of the
        conversation and receive its messages.

        Returns:
            200 OK -> contains the resulting member list of the room
            400 Bad Request -> the room_id is not a valid ObjectId
            403 Forbidden -> the current user is not a member of the room
            409 Conflict -> the room does not exist, or one of the users doesn't exist
        """

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            chat_manager = Chat(db)

            try:
                # only members of the room can add new members
                if not chat_manager.check_is_user_chatroom_member(
                    room_id, self.current_user.username
                ):
                    self.set_status(403)
                    self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                    return

                # only users that actually have a profile can be added
                existing_users = [
                    profile["username"]
                    for profile in profile_manager.get_bulk_profiles(
                        new_members, projection={"username": True}
                    )
                ]
                if any(member not in existing_users for member in new_members):
                    self.set_status(409)
                    self.write({"success": False, "reason": USER_DOESNT_EXIST})
                    return

                members = chat_manager.add_members_to_room(room_id, new_members)
            except InvalidId:
                self.set_status(400)
                self.write({"success": False, "reason": INVALID_OBJECT_ID})
                return
            except RoomDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": ROOM_DOESNT_EXIST})
                return

            self.serialize_and_write({"success": True, "members": members})

    def rename_room(self, room_id: str, name: Optional[str]) -> None:
        """
        Set the name of the room, or remove it again by passing None as the `name`.

        Returns:
            200 OK -> contains the name the room now has
            400 Bad Request -> the room_id is not a valid ObjectId
            403 Forbidden -> the current user is not a member of the room
            409 Conflict -> the room does not exist
        """

        with util.get_mongodb() as db:
            chat_manager = Chat(db)

            try:
                # only allow members of the room to rename it
                if not chat_manager.check_is_user_chatroom_member(
                    room_id, self.current_user.username
                ):
                    self.set_status(403)
                    self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                    return

                chat_manager.set_room_name(room_id, name)
            except InvalidId:
                self.set_status(400)
                self.write({"success": False, "reason": INVALID_OBJECT_ID})
                return
            except RoomDoesntExistError:
                self.set_status(409)
                self.write({"success": False, "reason": ROOM_DOESNT_EXIST})
                return

            self.serialize_and_write({"success": True, "name": name})
