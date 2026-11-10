import json
from typing import List, Optional

from bson.errors import InvalidId
import tornado.web
from exceptions import (
    FileTooLargeError,
    InvalidFileNameError,
    MaximumFilesExceededError,
    RoomDoesntExistError,
    StorageQuotaExceededError,
    UserNotMemberError,
)

from error_reasons import (
    FILE_TOO_LARGE,
    INSUFFICIENT_PERMISSIONS,
    INVALID_NAME,
    INVALID_OBJECT_ID,
    MAXIMUM_FILES_EXCEEDED,
    MEMBERS_NOT_LIST_OF_STR,
    MISSING_FILE_SLUG,
    MISSING_KEY_IN_HTTP_BODY_SLUG,
    MISSING_KEY_SLUG,
    NAME_NOT_STR,
    ROOM_DOESNT_EXIST,
    STORAGE_QUOTA_EXCEEDED,
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
                                "files": [
                                    {
                                        "file_id": str,
                                        "file_name": str,
                                        "content_type": str,
                                        "size": int
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
                            "files": [
                                {
                                    "file_id": str,
                                    "file_name": str,
                                    "content_type": str,
                                    "size": int
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

        GET /chatroom/search_messages
            search the messages of a room (case-insensitive substring match on the text
            and the names of the files sent with them), newest first, at most 100 results

            query params:
                room_id: str, the _id of the room
                query: str, the search term

            http body:
                None

            returns:
                200 OK
                (contains the matching messages, without their send states)
                {
                    "success": True,
                    "room_id": str,
                    "messages": [
                        {
                            "_id": str,
                            "message": str,
                            "sender": str,
                            "creation_date": str,
                            "files": [
                                {
                                    "file_id": str,
                                    "file_name": str,
                                    "content_type": str,
                                    "size": int
                                },
                                ...
                            ]
                        },
                        {...}
                    ]
                }

                400 Bad Request
                (the request misses the room_id or the query parameter)
                {"success": False,
                 "reason": "missing_key:room_id" | "missing_key:query"}

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

        GET /chatroom/get_files
            get all files that were sent in a room (newest first), together with the
            message they were sent with and the storage the room uses

            query params:
                room_id: str, the _id of the room

            http body:
                None

            returns:
                200 OK
                {
                    "success": True,
                    "room_id": str,
                    "files": [
                        {
                            "file_id": str,
                            "file_name": str,
                            "content_type": str,
                            "size": int,
                            "message_id": str,
                            "sender": str,
                            "creation_date": str
                        },
                        {...}
                    ],
                    "storage": {"used_bytes": int, "max_bytes": int}
                }

                400 Bad Request
                (the request misses the room_id query parameter)
                {"success": False,
                 "reason": "missing_key:room_id"}

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

        GET /chatroom/file_limits
            get the boundaries of the files that can be sent in a chat, so that
            clients can validate before uploading

            query params:
                None

            http body:
                None

            returns:
                200 OK
                {
                    "success": True,
                    "limits": {
                        "max_message_files_bytes": int,   // all files of one message together
                        "max_files_per_message": int,
                        "max_room_storage_bytes": int,
                        "max_file_name_length": int
                    }
                }

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}
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

        elif slug == "search_messages":
            try:
                room_id = self.get_argument("room_id")
                query = self.get_argument("query")
            except tornado.web.MissingArgumentError as e:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + e.arg_name})
                return

            self.search_messages(room_id, query)
            return

        elif slug == "get_files":
            try:
                room_id = self.get_argument("room_id")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + "room_id"})
                return

            self.get_files(room_id)
            return

        elif slug == "file_limits":
            with util.get_mongodb() as db:
                limits = Chat(db).get_file_limits()
            self.write({"success": True, "limits": limits})
            return

        else:
            self.set_status(404)

    @auth_needed
    async def post(self, slug):
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

        POST /chatroom/upload
            Send a message with files to a room. The files are stored, then the message
            is delivered just like a message sent via the socket `message` event, i.e. it
            reaches all members (including the sender) as a `message` event that carries
            the files. The mime types are derived from the file names, the ones sent by
            the client are ignored.

            query params:
                room_id: str, the _id of the room

            form data (multipart):
                "file": the file(s) to send, may be repeated
                "message": the text of the message, optional

            returns:
                200 OK
                (successful, contains the references of the stored files)
                {"success": True,
                 "files": [
                     {"file_id": str, "file_name": str, "content_type": str, "size": int},
                     ...
                 ]}

                400 Bad Request
                (the request misses the room_id query parameter)
                {"success": False,
                 "reason": "missing_key:room_id"}

                400 Bad Request
                (the request contains no file)
                {"success": False,
                 "reason": "missing_file:file"}

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
                (more files than allowed per message, see /chatroom/file_limits)
                {"success": False,
                 "reason": "maximum_files_exceeded"}

                409 Conflict
                (a file name is empty, too long or contains forbidden characters)
                {"success": False,
                 "reason": "invalid_name"}

                409 Conflict
                (the files together exceed the maximum size of a message)
                {"success": False,
                 "reason": "file_too_large"}

                409 Conflict
                (the files would exceed the storage quota of the room)
                {"success": False,
                 "reason": "storage_quota_exceeded"}
        """

        # files are sent as multipart form data, not as json
        if slug == "upload":
            try:
                room_id = self.get_argument("room_id")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + "room_id"})
                return

            if "file" not in self.request.files or not self.request.files["file"]:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_FILE_SLUG + "file"})
                return

            await self.upload_files(
                room_id,
                self.get_body_argument("message", ""),
                self.request.files["file"],
            )
            return

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

    @auth_needed
    async def delete(self, slug):
        """
        DELETE /chatroom/delete
            Delete a chatroom for all of its members, including all messages and the
            files that were sent in it. Any member of the room may delete it.
            The other members that are currently online receive a `room_deleted`
            socket event with the payload {"room_id": "<room_id>"}.

            query params:
                room_id: str, the _id of the room

            http body:
                None

            returns:
                200 OK
                (successful)
                {"success": True}

                400 Bad Request
                (the request misses the room_id query parameter)
                {"success": False,
                 "reason": "missing_key:room_id"}

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

        if slug == "delete":
            try:
                room_id = self.get_argument("room_id")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + "room_id"})
                return

            await self.delete_room(room_id)
            return

        else:
            self.set_status(404)

    def _check_membership(self, chat_manager: Chat, room_id: str) -> bool:
        """
        check that the room exists and the current user is a member of it.
        If not, the error response is already written and False is returned,
        so the caller can simply `return`.
        """

        try:
            if not chat_manager.check_is_user_chatroom_member(
                room_id, self.current_user.username
            ):
                self.set_status(403)
                self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return False
        except InvalidId:
            self.set_status(400)
            self.write({"success": False, "reason": INVALID_OBJECT_ID})
            return False
        except RoomDoesntExistError:
            self.set_status(409)
            self.write({"success": False, "reason": ROOM_DOESNT_EXIST})
            return False

        return True

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

    def search_messages(self, room_id: str, query: str) -> None:
        """
        Search the messages of a room.

        Returns:
            200 OK -> contains the matching messages
            400 Bad Request -> the room_id is not a valid ObjectId
            403 Forbidden -> the current user is not a member of the room
            409 Conflict -> the room does not exist
        """

        with util.get_mongodb() as db:
            chat_manager = Chat(db)

            if not self._check_membership(chat_manager, room_id):
                return

            messages = chat_manager.search_messages(room_id, query)
            self.serialize_and_write(
                {"success": True, "room_id": room_id, "messages": messages}
            )

    def get_files(self, room_id: str) -> None:
        """
        Request all files sent in a room and its storage usage.

        Returns:
            200 OK -> contains the files and the storage usage
            400 Bad Request -> the room_id is not a valid ObjectId
            403 Forbidden -> the current user is not a member of the room
            409 Conflict -> the room does not exist
        """

        with util.get_mongodb() as db:
            chat_manager = Chat(db)

            if not self._check_membership(chat_manager, room_id):
                return

            files = chat_manager.get_files_of_room(room_id)
            storage = {
                "used_bytes": chat_manager.get_storage_usage(room_id),
                "max_bytes": chat_manager.MAX_ROOM_STORAGE_BYTES,
            }
            self.serialize_and_write(
                {
                    "success": True,
                    "room_id": room_id,
                    "files": files,
                    "storage": storage,
                }
            )

    async def upload_files(self, room_id: str, message: str, file_objs: list) -> None:
        """
        Store the files and send them as a message (with the optional text) to the room.

        Returns:
            200 OK -> contains the references of the stored files
            400 Bad Request -> the room_id is not a valid ObjectId
            403 Forbidden -> the current user is not a member of the room
            409 Conflict -> the room does not exist, or the files violate the limits
        """

        with util.get_mongodb() as db:
            chat_manager = Chat(db)

            if not self._check_membership(chat_manager, room_id):
                return

            files = [
                {"file_name": file_obj["filename"], "content": file_obj["body"]}
                for file_obj in file_objs
            ]
            try:
                # storing up to `MAX_MESSAGE_FILES_BYTES` would block the event loop
                stored = await util.run_in_file_executor(
                    chat_manager.store_message_files,
                    room_id,
                    files,
                    self.current_user.username,
                )
            except MaximumFilesExceededError:
                self.set_status(409)
                self.write({"success": False, "reason": MAXIMUM_FILES_EXCEEDED})
                return
            except InvalidFileNameError:
                self.set_status(409)
                self.write({"success": False, "reason": INVALID_NAME})
                return
            except FileTooLargeError:
                self.set_status(409)
                self.write({"success": False, "reason": FILE_TOO_LARGE})
                return
            except StorageQuotaExceededError:
                self.set_status(409)
                self.write({"success": False, "reason": STORAGE_QUOTA_EXCEEDED})
                return

            try:
                await chat_manager.send_message(
                    room_id, message, self.current_user.username, stored
                )
            except (RoomDoesntExistError, UserNotMemberError) as e:
                # the room was deleted or the user removed in the meantime
                chat_manager.delete_stored_files(stored)
                if isinstance(e, RoomDoesntExistError):
                    self.set_status(409)
                    self.write({"success": False, "reason": ROOM_DOESNT_EXIST})
                else:
                    self.set_status(403)
                    self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                return

            self.serialize_and_write({"success": True, "files": stored})

    async def delete_room(self, room_id: str) -> None:
        """
        Delete the room including its messages and files, and inform the other
        members that are online.

        Returns:
            200 OK -> the room was deleted
            400 Bad Request -> the room_id is not a valid ObjectId
            403 Forbidden -> the current user is not a member of the room
            409 Conflict -> the room does not exist
        """

        with util.get_mongodb() as db:
            chat_manager = Chat(db)

            if not self._check_membership(chat_manager, room_id):
                return

            try:
                # removing all files of the room may take a while
                members = await util.run_in_file_executor(
                    chat_manager.delete_room, room_id
                )
            except RoomDoesntExistError:
                # another member deleted it in the meantime
                self.set_status(409)
                self.write({"success": False, "reason": ROOM_DOESNT_EXIST})
                return

        # i really don't know why, but top level import crashes the socketio server...
        from handlers.socket_io import emit_event, get_sid_of_user, recipient_online

        for member in members:
            if member != self.current_user.username and recipient_online(member):
                await emit_event(
                    "room_deleted", {"room_id": room_id}, room=get_sid_of_user(member)
                )

        self.write({"success": True})
