from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional

import jose
import keycloak
from tornado.options import options

import global_vars
from error_reasons import (
    INSUFFICIENT_PERMISSIONS,
    MISSING_KEY_SLUG,
    ROOM_DOESNT_EXIST,
    UNAUTHENTICATED,
)
from exceptions import MessageDoesntExistError, RoomDoesntExistError, UserNotMemberError
from resources.network.chat import Chat
from resources.notifications import NotificationResource
import util

logger = logging.getLogger(__name__)

#######################################################################
# do not top-of-file-import functions from these files, it will crash #
# the socketio server for whatever reason, import the functions       #
# whenever needed in your functions directly                          #
#######################################################################


async def emit_event(event_name: str, payload: Dict, room: str | List[str] | None):
    """
    Wrapper around `socketio.AsyncServer.emit()` that json
    serializes the dict payload.
    """

    await global_vars.socket_io.emit(
        event_name,
        util.json_serialize_response(payload.copy()),
        room=room,
    )


@global_vars.socket_io.event
async def connect(sid, environment, auth):
    """
    Event: connect

    A new (a priori unauthenticated) socket connection is etablished.
    To access protected data and events, an `authenticate` has to be fired
    afterwards.

    Payload:
        None

    Returns:
        None
    """

    logger.info("connected " + sid)
    return "hi"


@global_vars.socket_io.event
async def disconnect(sid):
    """
    Event: disconnect

    Close a socket connection and invalidate the corresponding user session
    (if there was one initiated by an `authenticate` event).

    This can be interpreted as a user "going offline" if desired.

    Payload:
        None

    Returns:
        None
    """

    logger.info("disconnect " + sid)

    session = await global_vars.socket_io.get_session(sid)

    try:
        # delete the mapping username <--> socket id and remove any existing
        # write locks on plans
        del global_vars.username_sid_map[session["preferred_username"]]
        for plan_id, lock_obj in global_vars.plan_write_lock_map.items():
            if lock_obj["username"] == session["preferred_username"]:
                del global_vars.plan_write_lock_map[plan_id]
    except KeyError:
        # not finding the mapping is obviously a success as well
        pass


@global_vars.socket_io.event
async def authenticate(sid, data):
    """
    Event: authenticate

    Authenticate a user by validating and decoding the presented JWT (issued by
    Keycloak). This event was separated from the connect-event such that clients
    can use the same socket for unauthenticated requests as well as later authenticate
    and from there on access protected data.

    The token information is stored in a user session and kept throughout the lifespan
    of the socket connection, so as long as the token does not reach its expiry time,
    emitting this event once is enough, further requests don't need to specify the token
    again.

    The server emits the state of authentication as the event acknowledgment (see below).

    Since this event can be treated as the "real" connect event, the server will emit
    all notification events and message events that have happened since the last time the user
    had a valid, open socket connection, i.e. that last time the user was "online".

    Payload:
        {
            "token": "<jwt_token>"
        }

    Returns:
        Success:
            - {"status": 200, "success": True}
        Failure:
            - {"status": 400, "success": False, "reason": "missing_key:token"}
              The payload is missing the token

            - {
                "status": 401,
                "success": False,
                "reason": "keycloak_public_key_not_retrieveable",
              }
              An error occured while trying to retrieve the public key from keycloak.
              This error is usually not caused by clients, but by a server error, a
              retry is encouraged.

            - {"status": 401, "success": False, "reason": "jwt_invalid"}
              The JWT didn't validate and therefore the authentication was rejected

    """

    logger.info("authenticate " + sid)

    if "token" not in data:
        return {"status": 400, "success": False, "reason": MISSING_KEY_SLUG + "token"}

    # make authentication exception if we are in test mode,
    # otherwise check the supplied token for validity
    if options.test_admin:
        token_info = {
            "preferred_username": "test_admin",
            "given_name": "Test",
            "family_name": "admin",
            "email": "test_admin@mail.de",
        }
    elif options.test_user:
        token_info = {
            "preferred_username": "test_user",
            "given_name": "Test",
            "family_name": "user",
            "email": "test_user@mail.de",
        }
    else:
        try:
            token_info = util.validate_keycloak_jwt(data["token"])
        except keycloak.KeycloakGetError:
            return {
                "status": 401,
                "success": False,
                "reason": "keycloak_public_key_not_retrieveable",
            }
        except jose.exceptions.JWTError:
            return {"status": 401, "success": False, "reason": "jwt_invalid"}

    # save the session
    await global_vars.socket_io.save_session(sid, token_info)

    # globally map the username towards the socket id to be able to send messages
    # from outside the handlers to specific clients
    global_vars.username_sid_map[token_info["preferred_username"]] = sid

    # get notifications that appeared while user was offline or were maybe send,
    # but not acknowledged;
    # dispatch them all to the user and set their state to "sent"
    with util.get_mongodb() as db:
        notification_manager = NotificationResource(db)
        new_notifications = (
            notification_manager.get_unacknowledged_notifications_for_user(
                token_info["preferred_username"]
            )
        )
        if new_notifications:
            new_notification_ids = []
            for notification in new_notifications:
                # dispatch any new notifications
                await emit_event(
                    "notification",
                    notification,
                    room=sid,
                )
                new_notification_ids.append(notification["_id"])
            # set the notifactions from "pending" to "sent" to signify that
            # they have been atleast tried to be delivered to the client
            # and are awaiting acknowledgement
            notification_manager.bulk_set_send_state(new_notification_ids)

        # emit messages that appeared while this user was offline, i.e. all
        # messages that dont have send state "acknowledged" for the user and
        # set their send states to "sent"
        chat_manager = Chat(db)
        rooms = chat_manager.get_rooms_with_unacknowledged_messages_for_user(
            token_info["preferred_username"]
        )

        room_ids = []
        message_ids = []

        # only the unacknowledged messages are included, so we can just ship them
        for room in rooms:
            for message in room["messages"]:
                await emit_event(
                    "message",
                    {
                        "_id": message["_id"],
                        "message": message["message"],
                        "sender": message["sender"],
                        "recipients": room["members"],
                        "room_id": room["_id"],
                        "creation_date": message["creation_date"],
                    },
                    room=sid,
                )
                message_ids.append(message["_id"])
            room_ids.append(room["_id"])

        # set the message from "pending" to "sent" to signify that
        # they have been atleast tried to be delivered to the client
        # and are awaiting acknowledgement
        chat_manager.bulk_set_message_sent_state(
            room_ids, message_ids, token_info["preferred_username"]
        )

    return {"status": 200, "success": True}


@global_vars.socket_io.event
async def acknowledge_notification(sid, data):
    """
    Event: acknowledge_notification

    A client acknowledges the notification, expecting it not be sent again
    when the client connects again.

    Payload:
        {
            "notification_id": "<_id_of_notification>"
        }

    Returns:
        Success:
            - {"status": 200, "success": True}
        Failure:
            - {"status": 400, "success": False, "reason": "missing_key:notification_id"}
              The payload is missing the notification_id

            - {"status": 401, "success": False, "reason": "unauthenticated"}
              This socket connection is not authenticated (use `authenticate` event)
    """

    logger.info("acknowledge_notification " + sid)

    if "notification_id" not in data:
        return {
            "status": 400,
            "success": False,
            "reason": MISSING_KEY_SLUG + "notification_id",
        }

    notification_id = data["notification_id"]

    # authentication check
    token = await global_vars.socket_io.get_session(sid)
    if not token:
        return {"status": 401, "success": False, "reason": "unauthenticated"}

    with util.get_mongodb() as db:
        notification_manager = NotificationResource(db)

        # authorization check: only allow acknowledgement if user is
        # the recipient of the notification by checking the session
        if token[
            "preferred_username"
        ] != notification_manager.get_notification_recipient(notification_id):
            return {"status": 403, "reason": INSUFFICIENT_PERMISSIONS}

        notification_manager.acknowledge_notification(notification_id)

        return {"status": 200, "success": True}


@global_vars.socket_io.event
async def message(sid, data):
    """
    Event: message

    A client sends a message to a room and expects it to be delivered to all recipients,
    either immediately if they are online or whenever they connect again.
    A room can be created or it's id retrieved by using the `/chatroom/create_or_get`-endpoint
    of the API.

    Payload:
    {
        "message": "<str>",
        "room_id": "<str>"
    }

    Returns:
        Success:
            - the message is also sent to you as the sender for easier display

        Failure:
            - {"status": 400, "success": False, "reason": "missing_key:message"}
              The payload is missing the message

            - {"status": 400, "success": False, "reason": "missing_key:room_id"}
              The payload is missing the room_id

            - {"status": 401, "success": False, "reason": "unauthenticated"}
              This socket connection is not authenticated (use `authenticate` event)

            - {"status": 403, "success": False, "reason": "insufficient_permissions"}
              The user is not a member of the room

            - {"status": 409, "success": False, "reason": "room_doesnt_exist"}
              The room with the given _id doesn't exist
    """

    logger.info("message " + sid)

    # payload keys check
    if "message" not in data:
        return {"status": 400, "success": False, "reason": MISSING_KEY_SLUG + "message"}
    if "room_id" not in data:
        return {"status": 400, "success": False, "reason": MISSING_KEY_SLUG + "room_id"}

    # authentication check
    token = await global_vars.socket_io.get_session(sid)
    if not token:
        return {"status": 401, "success": False, "reason": UNAUTHENTICATED}

    with util.get_mongodb() as db:
        chat_manager = Chat(db)
        try:
            await chat_manager.send_message(
                data["room_id"], data["message"], token["preferred_username"]
            )
        except RoomDoesntExistError:
            return {"status": 409, "success": False, "reason": ROOM_DOESNT_EXIST}
        except UserNotMemberError:
            return {"status": 403, "success": False, "reason": INSUFFICIENT_PERMISSIONS}


@global_vars.socket_io.event
async def acknowledge_message(sid, data):
    """
    Event: acknowledge_message

    A client acknowledges the message, expecting it not be sent again
    when the client connects again.

    Payload:
        {
            "room_id": "<_id_of_room>",
            "message_id": "<_id_of_message>"
        }

    Returns:
        Success:
            - {"status": 200, "success": True}
        Failure:
            - {"status": 400, "success": False, "reason": "missing_key:message_id"}
              The payload is missing the message_id

            - {"status": 400, "success": False, "reason": "missing_key:room_id"}
              The payload is missing the room_id

            - {"status": 401, "success": False, "reason": "unauthenticated"}
              This socket connection is not authenticated (use `authenticate` event)

            - {"status": 403, "success": False, "reason": "insufficient_permissions"}
              The user is not a member of the room

            - {"status": 409, "success": False, "reason": "room_doesnt_exist"}
              The room with the given _id doesn't exist

            - {"status": 409, "success": False, "reason": "message_doesnt_exist"}
              The message with the given _id doesn't exist in the room


    """

    logger.info("acknowledge_message " + sid)

    # payload keys check
    if "message_id" not in data:
        return {
            "status": 400,
            "success": False,
            "reason": MISSING_KEY_SLUG + "message_id",
        }
    if "room_id" not in data:
        return {"status": 400, "success": False, "reason": MISSING_KEY_SLUG + "room_id"}

    # authentication check
    token = await global_vars.socket_io.get_session(sid)
    if not token:
        return {"status": 401, "success": False, "reason": "unauthenticated"}

    with util.get_mongodb() as db:
        chat_manager = Chat(db)

        try:
            chat_manager.acknowledge_message(
                data["room_id"], data["message_id"], token["preferred_username"]
            )
        except RoomDoesntExistError:
            return {"status": 409, "success": False, "reason": "room_doesnt_exist"}
        except MessageDoesntExistError:
            return {"status": 409, "success": False, "reason": "message_doesnt_exist"}
        except UserNotMemberError:
            return {"status": 403, "success": False, "reason": INSUFFICIENT_PERMISSIONS}

        return {"status": 200, "success": True}


@global_vars.socket_io.event
async def try_acquire_or_extend_plan_write_lock(sid, data):
    """
    Event: try_acquire_or_extend_plan_write_lock

    A client tries to acquire the write lock for a plan, ensuring him to be the only
    one to be able to modify the plan whilst he holds the lock.
    Lock expiry is set to 1 hour.
    If he already holds the lock, he can extend the lock's expiry time.

    Payload:
        {
            "plan_id": "<_id_of_plan>"
        }

    Returns:
        Success:
            - {"status": 200, "success": True}
        Failure:
            - {"status": 400, "success": False, "reason": "missing_key:plan_id"}
                The payload is missing the plan_id
            - {"status": 401, "success": False, "reason": "unauthenticated"}
                This socket connection is not authenticated (use `authenticate` event)
            - {"status": 403, "success": False, "reason": "plan_locked"}
                The plan is currently locked by another user
    """

    logger.info("try_acquire_or_extend_plan_write_lock " + sid)

    # paylod keys check
    if "plan_id" not in data:
        return {"status": 400, "success": False, "reason": MISSING_KEY_SLUG + "plan_id"}

    # authentication check
    token = await global_vars.socket_io.get_session(sid)
    if not token:
        return {"status": 401, "success": False, "reason": "unauthenticated"}

    plan_id = util.parse_object_id(data["plan_id"])

    LOCK_EXPIRY_HOURS = 1

    # no other user currently holds the lock --> assign it to the current user
    # lock expiry is set to 1 hour
    if plan_id not in global_vars.plan_write_lock_map:
        global_vars.plan_write_lock_map[plan_id] = {
            "username": token["preferred_username"],
            "expires": datetime.now() + timedelta(hours=LOCK_EXPIRY_HOURS),
        }
        print(global_vars.plan_write_lock_map)
        return {"status": 200, "success": True}

    else:
        # the lock is expired --> assign it to the current user
        if global_vars.plan_write_lock_map[plan_id]["expires"] < datetime.now():
            global_vars.plan_write_lock_map[plan_id] = {
                "username": token["preferred_username"],
                "expires": datetime.now() + timedelta(hours=LOCK_EXPIRY_HOURS),
            }
            print(global_vars.plan_write_lock_map)
            return {"status": 200, "success": True}
        # the lock is not expired, but the current user holds it --> extend the lock
        elif (
            global_vars.plan_write_lock_map[plan_id]["username"]
            == token["preferred_username"]
        ):
            global_vars.plan_write_lock_map[plan_id][
                "expires"
            ] = datetime.now() + timedelta(hours=LOCK_EXPIRY_HOURS)
            print(global_vars.plan_write_lock_map)
            return {"status": 200, "success": True}
        # the lock is not expired and is held by another user --> reject
        else:
            print(global_vars.plan_write_lock_map)
            return {"status": 403, "success": False, "reason": "plan_locked"}


@global_vars.socket_io.event
async def drop_plan_lock(sid, data):
    """
    Event: drop_plan_lock

    A client actively drops the write lock for a plan, allowing other users to acquire it.

    Payload:
        {
            "plan_id": "<_id_of_plan>"
        }

    Returns:
        Success:
            - {"status": 200, "success": True}
        Failure:
            - {"status": 400, "success": False, "reason": "missing_key:plan_id"}
                The payload is missing the plan_id
            - {"status": 401, "success": False, "reason": "unauthenticated"}
                This socket connection is not authenticated (use `authenticate` event)
            - {"status": 403, "success": False, "reason": "insufficient_permissions"}
                The user is not the one who holds the lock
            - {"status": 409, "success": False, "reason": "no_active_lock"}
                There is no active lock for the plan
            - {"status": 409, "success": False, "reason": "lock_expired"}
                The lock has already expired
    """

    logger.info("drop_plan_lock " + sid)

    # paylod keys check
    if "plan_id" not in data:
        return {"status": 400, "success": False, "reason": MISSING_KEY_SLUG + "plan_id"}

    # authentication check
    token = await global_vars.socket_io.get_session(sid)
    if not token:
        return {"status": 401, "success": False, "reason": "unauthenticated"}

    plan_id = util.parse_object_id(data["plan_id"])

    # reject if there is no active lock or if it is expired
    if plan_id not in global_vars.plan_write_lock_map:
        print(global_vars.plan_write_lock_map)
        return {"status": 409, "success": False, "reason": "no_active_lock"}
    if global_vars.plan_write_lock_map[plan_id]["expires"] < datetime.now():
        print(global_vars.plan_write_lock_map)
        return {"status": 409, "success": False, "reason": "lock_expired"}

    # only the user who holds the lock can drop it
    if (
        global_vars.plan_write_lock_map[plan_id]["username"]
        != token["preferred_username"]
    ):
        print(global_vars.plan_write_lock_map)
        return {"status": 403, "success": False, "reason": INSUFFICIENT_PERMISSIONS}

    # drop the lock after all checks have passed
    del global_vars.plan_write_lock_map[plan_id]
    print(global_vars.plan_write_lock_map)
    return {"status": 200, "success": True}


def recipient_online(recipient: str) -> bool:
    """
    Returns True, if the `recipient` username is currently
    online, i.e. has an open and authenticated socketio connection,
    or False otherwise.
    """

    return recipient in global_vars.username_sid_map


def get_sid_of_user(username: str) -> Optional[str]:
    """
    Returns the user's socketio sid if the user is currently online,
    or None otherwise.
    """

    try:
        return global_vars.username_sid_map[username]
    except KeyError:
        return None
