import json
from typing import List

from pymongo import ReturnDocument
import tornado.web

from error_reasons import MISSING_KEY_IN_HTTP_BODY_SLUG, MISSING_KEY_SLUG
from handlers.base_handler import BaseHandler, auth_needed
from resources.network.chat import Chat
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
            with util.get_mongodb() as db:
                chat_manager = Chat(db)
                messages = chat_manager.get_all_messages_of_room(room_id)

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

            self.create_or_get_room_id(http_body["members"], name)
            return

        else:
            self.set_status(404)

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
