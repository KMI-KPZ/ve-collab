import datetime
import re
from typing import Dict, List, Optional

from bson import ObjectId
import gridfs
from pymongo import ReturnDocument
from pymongo.database import Database

from exceptions import (
    FileTooLargeError,
    MaximumFilesExceededError,
    MessageDoesntExistError,
    RoomDoesntExistError,
    StorageQuotaExceededError,
    UserNotMemberError,
)
import util


class Chat:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            chat_manager = Chat(db)
            ...

    Messages may carry files. The bytes live in gridfs, the message only keeps
    references to them in its `files` list::

        {
            "file_id": ObjectId,    # the gridfs _id
            "file_name": str,
            "content_type": str,    # derived from the name, not from the client
            "size": int,            # bytes
        }

    """

    # boundaries of the files that can be sent in a chat, in line with the file
    # shares of groups. All files of a message are uploaded in one request, so
    # together they have to fit into `MAX_MESSAGE_FILES_BYTES`
    MAX_MESSAGE_FILES_BYTES = 80 * 1024 * 1024  # 80 MB
    MAX_FILES_PER_MESSAGE = 10
    MAX_ROOM_STORAGE_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB
    MAX_FILE_NAME_LENGTH = 255
    MAX_SEARCH_RESULTS = 100

    def __init__(self, db: Database):
        self.db = db

        self.MESSAGE_ATTRIBUTES = {
            "_id": ObjectId,
            "message": str,
            "sender": str,
            "creation_date": datetime.datetime,
            "send_states": list,
            "files": list,
        }

    def get_file_limits(self) -> Dict:
        """
        return the boundaries of the files that can be sent in a chat as a dict,
        so that they can be handed out to clients instead of being hardcoded there
        """

        return {
            "max_message_files_bytes": self.MAX_MESSAGE_FILES_BYTES,
            "max_files_per_message": self.MAX_FILES_PER_MESSAGE,
            "max_room_storage_bytes": self.MAX_ROOM_STORAGE_BYTES,
            "max_file_name_length": self.MAX_FILE_NAME_LENGTH,
        }

    def _get_room_members(self, room_id: ObjectId) -> List[str]:
        """
        Returns the members of the room given by its _id.

        Raises `RoomDoesntExistError` if no room with the given _id was found.
        """

        room = self.db.chatrooms.find_one(
            {"_id": room_id}, projection={"members": True}
        )
        if not room:
            raise RoomDoesntExistError()

        return room["members"]

    def get_or_create_room_id(self, members: List[str], name: str = None) -> ObjectId:
        """
        Retrieve the _id of a room that matches the given list of usernames (`members`) and name
        (yes, that means two users can have multiple rooms with each other,
        as long as the room names are different).
        If no name is given, only the members list is used to find the room.

        If no matching room exists, a new one is created.

        Returns the _id of the room, regardless of whether it already existed or was created.
        """

        room_id = self.db.chatrooms.find_one_and_update(
            {
                # exacht match on the members list
                "members": {
                    "$size": len(members),
                    "$all": [{"$elemMatch": {"$eq": member}} for member in members],
                },
                "name": name,
            },
            {
                "$setOnInsert": {
                    "members": members,
                    "messages": [],
                    "name": name,
                }
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
            projection={"_id": True},
        )["_id"]

        return room_id

    def get_room_snippets_for_user(self, username: str) -> List[Dict]:
        """
        Retrieve snippets of all rooms that the given user is a member of.
        Snippets include: _id, members, name and the last sent message.

        Returns a list of dicts containing the room snippets, or an empty list
        if the user is not a member of any room.
        """

        return list(
            self.db.chatrooms.aggregate(
                [
                    {"$match": {"members": username}},
                    {
                        "$project": {
                            "_id": True,
                            "members": True,
                            "name": True,
                            "last_message": {
                                "$ifNull": [{"$arrayElemAt": ["$messages", -1]}, None]
                            },
                        }
                    },
                ]
            )
        )

    def check_is_user_chatroom_member(
        self, room_id: str | ObjectId, username: str
    ) -> bool:
        """
        Returns True if the user given by its `username` is a member of the chatroom
        (identified by the `room_id`), or False otherwise.

        Raises `RoomDoesntExistError` if no room with the given _id was found.
        """

        room_id = util.parse_object_id(room_id)

        room = self.db.chatrooms.find_one(
            {"_id": room_id},
            projection={"members": True},
        )

        if not room:
            raise RoomDoesntExistError()

        return username in room["members"]

    def add_members_to_room(
        self, room_id: str | ObjectId, new_members: List[str]
    ) -> List[str]:
        """
        Add the users given by their usernames (`new_members`) to the room identified
        by the `room_id`.
        Usernames that already are members of the room are silently skipped, i.e. calling
        this function repeatedly with the same users has no further effect.

        Note that the already existing messages of the room are deliberately left untouched,
        i.e. they don't get send states for the newly added members. Those members can read
        the history of the room, but the messages that were sent before they joined
        will not appear as unread to them.

        Returns the resulting member list of the room.

        Raises `RoomDoesntExistError` if no room with the given _id was found.
        """

        room_id = util.parse_object_id(room_id)

        room = self.db.chatrooms.find_one(
            {"_id": room_id},
            projection={"members": True},
        )

        if not room:
            raise RoomDoesntExistError()

        updated_room = self.db.chatrooms.find_one_and_update(
            {"_id": room_id},
            {"$addToSet": {"members": {"$each": new_members}}},
            return_document=ReturnDocument.AFTER,
            projection={"members": True},
        )

        return updated_room["members"]

    def set_room_name(self, room_id: str | ObjectId, name: Optional[str]) -> None:
        """
        Set the name of the room identified by the `room_id`.
        A `name` of None removes the name of the room again, causing the frontend
        to fall back to displaying the members instead.

        Raises `RoomDoesntExistError` if no room with the given _id was found.
        """

        room_id = util.parse_object_id(room_id)

        room = self.db.chatrooms.find_one(
            {"_id": room_id},
            projection={"members": True},
        )

        if not room:
            raise RoomDoesntExistError()

        self.db.chatrooms.update_one(
            {"_id": room_id},
            {"$set": {"name": name}},
        )

    def get_all_messages_of_room(self, room_id: str | ObjectId) -> List[Dict]:
        """
        Retrieve a list of all message of the room given by its _id.

        Returns a list of dicts containing the messages, or an empty list
        if no messages have yet been sent in the room.

        Raises `RoomDoesntExistError` if no room with the given _id was found.
        """

        room_id = util.parse_object_id(room_id)

        room = self.db.chatrooms.find_one(
            {"_id": room_id},
            projection={"messages": True},
        )

        if not room:
            raise RoomDoesntExistError()

        return room["messages"]

    def store_message(self, room_id: str | ObjectId, message: Dict) -> None:
        """
        Store the given message in the room given by its _id.

        Raises `ValueError` if the message dict misses required attributes.
        Raises `TypeError` if the types of the attributes in the message dict
        don't match the expected types.
        Raises `RoomDoesntExistError` if no room with the given _id was found.
        """

        # check correct message keys and their types in the dict
        if not all(key in message for key in self.MESSAGE_ATTRIBUTES.keys()):
            raise ValueError("Message misses required attribute")

        # verify types of attributes
        for attr_key in message:
            if type(message[attr_key]) != self.MESSAGE_ATTRIBUTES[attr_key]:
                raise TypeError(
                    "Type mismatch on attribute '{}'. expected type '{}', got '{}'".format(
                        attr_key, self.MESSAGE_ATTRIBUTES[attr_key], message[attr_key]
                    )
                )

        result = self.db.chatrooms.update_one(
            {"_id": room_id},
            {"$push": {"messages": message}},
        )

        if result.matched_count != 1:
            raise RoomDoesntExistError()

    async def send_message(
        self,
        room_id: str | ObjectId,
        message_content: str,
        sender: str,
        files: Optional[List[Dict]] = None,
    ) -> None:
        """
        Send a message to the room given by its _id and additionally stores it in the db.
        The message is distributed to all members of the room, either
        immediately via socketio, if they are currently online,
        or later whenever they log in again.

        The `sender` is the username of the user who sent the message.
        `files` are the references of the files sent along with the message,
        as returned by `store_message_files()`.

        Raises `RoomDoesntExistError` if no room with the given _id was found.
        Raises `UserNotMemberError` if the `sender` is not a member of the room.
        """

        room_id = util.parse_object_id(room_id)
        message_id = ObjectId()
        creation_date = util.utcnow()
        files = files or []

        room = self.db.chatrooms.find_one(
            {"_id": room_id}, projection={"members": True}
        )

        if not room:
            raise RoomDoesntExistError()

        if sender not in room["members"]:
            raise UserNotMemberError()

        # send states of the message for each recipient
        send_states = []

        # i really don't know why, but top level import crashes the socketio server...
        from handlers.socket_io import emit_event, get_sid_of_user, recipient_online

        # dispatch message to all recipients
        for recipient in room["members"]:
            if recipient_online(recipient):
                # recipient is online, send message via socketio and store as "sent"
                await emit_event(
                    "message",
                    {
                        "_id": message_id,
                        "message": message_content,
                        "sender": sender,
                        "recipients": room["members"],
                        "room_id": room_id,
                        "creation_date": creation_date,
                        "files": files,
                    },
                    room=get_sid_of_user(recipient),
                )
                send_state = "sent"
            else:
                # recipient is offline, message will be stored as "pending"
                send_state = "pending"

            # the sender obviously gets the state "acknowledged" already
            # because he sent the message, the others as per their online state
            if recipient == sender:
                send_states.append(
                    {"username": recipient, "send_state": "acknowledged"}
                )
            else:
                send_states.append({"username": recipient, "send_state": send_state})

        # store message and corresponding send states in the room
        message = {
            "_id": message_id,
            "message": message_content,
            "sender": sender,
            "creation_date": creation_date,
            "send_states": send_states,
            "files": files,
        }
        self.store_message(room_id, message)

    def get_storage_usage(self, room_id: str | ObjectId) -> int:
        """
        get the sum of the sizes of all files sent in the room in bytes
        """

        room_id = util.parse_object_id(room_id)

        result = list(
            self.db.chatrooms.aggregate(
                [
                    {"$match": {"_id": room_id}},
                    {"$unwind": "$messages"},
                    {"$unwind": "$messages.files"},
                    {
                        "$group": {
                            "_id": None,
                            "total": {"$sum": "$messages.files.size"},
                        }
                    },
                ]
            )
        )

        return result[0]["total"] if result else 0

    def store_message_files(
        self, room_id: str | ObjectId, files: List[Dict], uploader: str
    ) -> List[Dict]:
        """
        Store the files that are about to be sent with a message in gridfs and
        return their references for `send_message()`. `files` is a list of
        `{"file_name": str, "content": bytes}` dicts.
        All files are validated before anything is stored, and if storing fails
        halfway, the files that were already stored are removed again.

        Raises `RoomDoesntExistError` if no room with the given _id was found.
        Raises `UserNotMemberError` if the `uploader` is not a member of the room.
        Raises `MaximumFilesExceededError` if there are no files or more than
            `MAX_FILES_PER_MESSAGE`.
        Raises `InvalidFileNameError` if the name of a file is invalid.
        Raises `FileTooLargeError` if the files together exceed `MAX_MESSAGE_FILES_BYTES`.
        Raises `StorageQuotaExceededError` if the room would exceed
            `MAX_ROOM_STORAGE_BYTES`. Concurrent uploads can overshoot the quota
            by at most one message each, which is accepted.
        """

        room_id = util.parse_object_id(room_id)

        if uploader not in self._get_room_members(room_id):
            raise UserNotMemberError()

        if not files or len(files) > self.MAX_FILES_PER_MESSAGE:
            raise MaximumFilesExceededError()

        names = [
            util.validate_file_name(file["file_name"], self.MAX_FILE_NAME_LENGTH)
            for file in files
        ]

        total_size = sum(len(file["content"]) for file in files)
        if total_size > self.MAX_MESSAGE_FILES_BYTES:
            raise FileTooLargeError()

        if self.get_storage_usage(room_id) + total_size > self.MAX_ROOM_STORAGE_BYTES:
            raise StorageQuotaExceededError()

        fs = gridfs.GridFS(self.db)
        stored = []
        try:
            for name, file in zip(names, files):
                content_type = util.content_type_of(name)
                stored.append(
                    {
                        "file_id": util.gridfs_put(
                            fs, file["content"], name, content_type, uploader
                        ),
                        "file_name": name,
                        "content_type": content_type,
                        "size": len(file["content"]),
                    }
                )
        except Exception:
            self.delete_stored_files(stored)
            raise

        return stored

    def delete_stored_files(self, files: List[Dict]) -> None:
        """
        remove the given file references (e.g. from `store_message_files()`)
        from gridfs, in case the message they were stored for couldn't be sent
        """

        fs = gridfs.GridFS(self.db)
        for file in files:
            fs.delete(file["file_id"])

    def search_messages(self, room_id: str | ObjectId, query: str) -> List[Dict]:
        """
        Search the messages of the room given by its _id (case-insensitive
        substring match on the text and the names of the files sent with them).

        Returns at most `MAX_SEARCH_RESULTS` matching messages, newest first and
        without their send states, or an empty list if the query is empty.

        Raises `RoomDoesntExistError` if no room with the given _id was found.
        """

        room_id = util.parse_object_id(room_id)
        self._get_room_members(room_id)

        query = query.strip() if isinstance(query, str) else ""
        if not query:
            return []

        pattern = {"$regex": re.escape(query), "$options": "i"}
        return list(
            self.db.chatrooms.aggregate(
                [
                    {"$match": {"_id": room_id}},
                    {"$unwind": "$messages"},
                    {
                        "$match": {
                            "$or": [
                                {"messages.message": pattern},
                                {"messages.files.file_name": pattern},
                            ]
                        }
                    },
                    {"$sort": {"messages.creation_date": -1, "messages._id": -1}},
                    {"$limit": self.MAX_SEARCH_RESULTS},
                    {"$replaceRoot": {"newRoot": "$messages"}},
                    {"$project": {"send_states": False}},
                ]
            )
        )

    def get_files_of_room(self, room_id: str | ObjectId) -> List[Dict]:
        """
        Retrieve all files that were sent in the room given by its _id, newest
        first. Besides the file reference, each entry contains the `message_id`,
        `sender` and `creation_date` of the message it was sent with.

        Raises `RoomDoesntExistError` if no room with the given _id was found.
        """

        room_id = util.parse_object_id(room_id)
        self._get_room_members(room_id)

        return list(
            self.db.chatrooms.aggregate(
                [
                    {"$match": {"_id": room_id}},
                    {"$unwind": "$messages"},
                    # keep the order of the files within a message, $sort isn't stable
                    {
                        "$unwind": {
                            "path": "$messages.files",
                            "includeArrayIndex": "index",
                        }
                    },
                    {"$sort": {"messages.creation_date": -1, "index": 1}},
                    {
                        "$project": {
                            "_id": False,
                            "file_id": "$messages.files.file_id",
                            "file_name": "$messages.files.file_name",
                            "content_type": "$messages.files.content_type",
                            "size": "$messages.files.size",
                            "message_id": "$messages._id",
                            "sender": "$messages.sender",
                            "creation_date": "$messages.creation_date",
                        }
                    },
                ]
            )
        )

    def get_room_members_by_file_id(
        self, file_id: str | ObjectId
    ) -> Optional[List[str]]:
        """
        Returns the members of the room in which the file given by its gridfs _id
        was sent, or None if the file was not sent in any chat
        """

        file_id = util.parse_object_id(file_id)

        room = self.db.chatrooms.find_one(
            {"messages.files.file_id": file_id}, projection={"members": True}
        )

        return room["members"] if room else None

    def delete_room(self, room_id: str | ObjectId) -> List[str]:
        """
        Delete the room given by its _id for all of its members, including all
        messages and the files that were sent in it.
        Removing the room first means that a failure in between leaves
        unreferenced files behind instead of messages that point to missing files.

        Returns the members the room had, e.g. to inform them about the deletion.

        Raises `RoomDoesntExistError` if no room with the given _id was found.
        """

        room_id = util.parse_object_id(room_id)

        room = self.db.chatrooms.find_one(
            {"_id": room_id},
            projection={"members": True, "messages.files.file_id": True},
        )
        if not room:
            raise RoomDoesntExistError()

        self.db.chatrooms.delete_one({"_id": room_id})
        self.delete_stored_files(
            [file for message in room["messages"] for file in message["files"]]
        )

        return room["members"]

    def acknowledge_message(
        self,
        room_id: str | ObjectId,
        message_id: str | ObjectId,
        acknowledging_user: str,
    ) -> None:
        """
        Acknowledge a message in the name of the user, causing it not to be sent again
        when the recipient user logs in.
        The message is identified by its _id and the room it was sent in, the `acknowledging_user`
        the username.

        Raises `RoomDoesntExistError` if no room with the given _id was found.
        Raises `MessageDoesntExistError` if no message with the given _id was found in the room.
        Raises `UserNotMemberError` if the `acknowledging_user` is not a member of the room.
        """

        room_id = util.parse_object_id(room_id)
        message_id = util.parse_object_id(message_id)

        # check if room exists
        room = self.db.chatrooms.find_one({"_id": room_id})
        if not room:
            raise RoomDoesntExistError()

        # check if user is member of the room
        if acknowledging_user not in room["members"]:
            raise UserNotMemberError()

        # update the send state of this user to "acknowledged"
        result = self.db.chatrooms.update_one(
            {
                "_id": room_id,
                "messages._id": message_id,
                "messages.send_states.username": acknowledging_user,
            },
            {
                "$set": {
                    "messages.$[message].send_states.$[state].send_state": "acknowledged"
                }
            },
            array_filters=[
                {"message._id": message_id},
                {"state.username": acknowledging_user},
            ],
        )

        if result.modified_count != 1:
            raise MessageDoesntExistError()

    def get_rooms_with_unacknowledged_messages_for_user(
        self, username: str
    ) -> List[Dict]:
        """
        Retrieve all rooms in which the user given by its `username` is a member
        and has unacknowledged messages (i.e. messages that he has not yet seen).

        The messages in the result are only those that are unacknowledged.
        """

        return list(
            self.db.chatrooms.aggregate(
                [
                    # find rooms that the user is member in
                    # and has messages in it that are not yet acknowledged for the user
                    {
                        "$match": {
                            "members": username,
                            "messages": {
                                "$elemMatch": {
                                    "send_states": {
                                        "$elemMatch": {
                                            "username": username,
                                            "send_state": {"$ne": "acknowledged"},
                                        }
                                    }
                                }
                            },
                        }
                    },
                    # only return the messages that are not yet acknowledged
                    # for easier dispatching of the events and less data queried
                    {
                        "$project": {
                            "messages": {
                                "$filter": {
                                    "input": "$messages",
                                    "as": "message",
                                    "cond": {
                                        "$gt": [
                                            {
                                                "$size": {
                                                    "$filter": {
                                                        "input": "$$message.send_states",
                                                        "as": "state",
                                                        "cond": {
                                                            "$and": [
                                                                {
                                                                    "$eq": [
                                                                        "$$state.username",
                                                                        username,
                                                                    ]
                                                                },
                                                                {
                                                                    "$ne": [
                                                                        "$$state.send_state",
                                                                        "acknowledged",
                                                                    ]
                                                                },
                                                            ]
                                                        },
                                                    }
                                                }
                                            },
                                            0,
                                        ]
                                    },
                                }
                            },
                            "members": True,
                            "name": True,
                        }
                    },
                ]
            )
        )

    def get_rooms_with_unacknowledged_messages(self) -> List[Dict]:
        """
        Retrieve a list of rooms and messages that have unacknowledged messages
        within the past 24 hours.
        """

        return list(
            self.db.chatrooms.aggregate(
                [
                    # find rooms that have at max 24h old messages in it that are not yet acknowledged
                    {
                        "$match": {
                            "messages": {
                                "$elemMatch": {
                                    "creation_date": {
                                        "$gte": util.utcnow()
                                        - datetime.timedelta(days=1)
                                    },
                                    "send_states": {
                                        "$elemMatch": {
                                            "send_state": {"$ne": "acknowledged"},
                                        }
                                    },
                                }
                            },
                        }
                    },
                    # only return the messages that are not yet acknowledged
                    # for easier dispatching of the events and less data queried
                    {
                        "$project": {
                            "messages": {
                                "$filter": {
                                    "input": "$messages",
                                    "as": "message",
                                    "cond": {
                                        "$gt": [
                                            {
                                                "$size": {
                                                    "$filter": {
                                                        "input": "$$message.send_states",
                                                        "as": "state",
                                                        "cond": {
                                                            "$ne": [
                                                                "$$state.send_state",
                                                                "acknowledged",
                                                            ]
                                                        },
                                                    }
                                                }
                                            },
                                            0,
                                        ]
                                    },
                                }
                            },
                            "members": True,
                            "name": True,
                        }
                    },
                ]
            )
        )

    def get_rooms_of_user(self, username: str) -> List[Dict]:
        """
        Retrieve the full chatroom documents the given user is a member of.

        Returns a list of chatroom dicts (including messages), or an empty list
        if the user is not a member of any room.
        """

        return list(self.db.chatrooms.find({"members": username}))

    def bulk_set_message_sent_state(
        self,
        room_ids: List[str | ObjectId],
        message_ids: List[str | ObjectId],
        username: str,
    ) -> None:
        """
        Bulk operation to set send states of messages to "sent" for the given user.

        The `room_ids` list contains the _id's of the rooms in which the messages
        appeared.
        The `message_ids` list contains the _id's of the messages
        (all of them together, NOT separated by rooms).
        """

        for room_id in room_ids:
            room_id = util.parse_object_id(room_id)
        for message_id in message_ids:
            message_id = util.parse_object_id(message_id)

        self.db.chatrooms.update_many(
            {"_id": {"$in": room_ids}},
            {"$set": {"messages.$[message].send_states.$[state].send_state": "sent"}},
            array_filters=[
                {"message._id": {"$in": message_ids}},
                {"state.username": username},
            ],
        )
