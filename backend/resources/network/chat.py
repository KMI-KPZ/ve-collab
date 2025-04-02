import datetime
from typing import Dict, List

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.database import Database

from exceptions import MessageDoesntExistError, RoomDoesntExistError, UserNotMemberError
import util


class Chat:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            chat_manager = Chat(db)
            ...

    """

    def __init__(self, db: Database):
        self.db = db

        self.MESSAGE_ATTRIBUTES = {
            "_id": ObjectId,
            "message": str,
            "sender": str,
            "creation_date": datetime.datetime,
            "send_states": list,
        }

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
        self, room_id: str | ObjectId, message_content: str, sender: str
    ) -> None:
        """
        Send a message to the room given by its _id and additionally stores it in the db.
        The message is distributed to all members of the room, either
        immediately via socketio, if they are currently online,
        or later whenever they log in again.

        The `sender` is the username of the user who sent the message.

        Raises `RoomDoesntExistError` if no room with the given _id was found.

        """

        room_id = util.parse_object_id(room_id)
        message_id = ObjectId()
        creation_date = datetime.datetime.now()

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
        }
        self.store_message(room_id, message)

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
                                        "$gte": datetime.datetime.now()
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
