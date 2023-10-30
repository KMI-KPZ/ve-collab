import json
from typing import List

import tornado.web

from pymongo import ReturnDocument
from error_reasons import MISSING_KEY_IN_HTTP_BODY_SLUG, MISSING_KEY_SLUG
from handlers.base_handler import BaseHandler, auth_needed
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
                list of rooms
                TODO

        GET /chatroom/get_messages
            get all messages of a room

            query params:
                room_id: str, the _id of the room

            http body:
                None

            returns:
                list of messages
                TODO

        GET /chatroom/get_messages_after
            Get a number of messages that are older then the message with the given message id.
            Useful to determine the messages that have to be requested on scroll up by specifying
            the oldest message that was sent via the socket.

            TODO
        """

        if slug == "get":
            pass

        elif slug == "get_mine":
            with util.get_mongodb() as db:
                # TODO include last sent message in response
                rooms = list(
                    db.chatrooms.find(
                        {"members": self.current_user.username},
                        projection={"_id": True, "members": True, "name": True},
                    )
                )
                self.serialize_and_write({"success": True, "rooms": rooms})

        elif slug == "get_messages":
            try:
                room_id = self.get_argument("room_id")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + "room_id"})
                return
            with util.get_mongodb() as db:
                messages = db.chatrooms.find_one(
                    {"_id": util.parse_object_id(room_id)},
                    projection={"messages": True},
                )["messages"]

                self.serialize_and_write(
                    {"success": True, "room_id": room_id, "messages": messages}
                )

        elif slug == "get_messages_after":
            pass

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

            # set name to provided value or None
            name = (
                http_body["name"]
                if "name" in http_body and http_body["name"] != ""
                else None
            )
            print(name)

            # add current user to members list if not already present
            chatroom_members: List[str] = http_body["members"]
            if self.current_user.username not in http_body["members"]:
                chatroom_members.append(self.current_user.username)

            with util.get_mongodb() as db:
                # check if combination of sender and recipients already have a "room" together
                # (create one if not) and return the room id.
                # find + upsert + setOnInsert is shorthand for "insert if not exists".
                # have to use an ugly elemMatch because otherwise referencing members in the
                # match-clause and update-clause would trigger an error...
                room_id = db.chatrooms.find_one_and_update(
                    {
                        "members": {
                            "$size": len(chatroom_members),
                            "$all": [
                                {"$elemMatch": {"$eq": member}}
                                for member in chatroom_members
                            ],
                        },
                        "name": name,
                    },
                    {
                        "$setOnInsert": {
                            "members": chatroom_members,
                            "messages": [],
                            "name": name,
                        }
                    },
                    upsert=True,
                    return_document=ReturnDocument.AFTER,
                    projection={"_id": True},
                )["_id"]
            print("room _id:", str(room_id))

            self.serialize_and_write({"success": True, "room_id": room_id})
        else:
            self.set_status(404)
