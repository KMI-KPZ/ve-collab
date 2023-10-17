from typing import Dict, List, Optional
from bson import ObjectId
import jose
import keycloak

import global_vars
from error_reasons import INSUFFICIENT_PERMISSIONS, MISSING_KEY_SLUG
from resources.notifications import NotificationResource
import util

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

    print("connected ", sid)


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

    session = await global_vars.socket_io.get_session(sid)
    print("disconnect ", sid)

    try:
        # delete the mapping username <--> socket id
        del global_vars.username_sid_map[session["preferred_username"]]
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
    all notification events that have happened since the last time the user had a valid,
    open socket connection, i.e. that last time the user was "online".

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

    print("authenticate ", sid)

    if "token" not in data:
        return {"status": 400, "success": False, "reason": MISSING_KEY_SLUG + "token"}

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

    # TODO emit messages that appeared while this user was offline and set their state to "sent"

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

    print("acknowledge_notification ", sid)

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
async def acknowledge_message(sid, data):
    """ 
    TODO:
    - check if user is recipient of to-be-acknowledged message
        - yes: set message state to "acknowledged"
        - no: insufficient permission error
    """

    pass


@global_vars.socket_io.event
async def message(sid, data):
    """
    TODO:

    - read message
    - determine if combination of sender and recipients already have a "room" (has to be kinda efficient, probably index?)
        - yes: store message in this room,
        - no: create new room, store room and message in this room
    - dispatch message to all recipients (do each):
        - currently online: via socketio, set message state for corresponding recipient to "sent"
        - currently offline: set message state for corresponding recipient to "pending"
    """

    pass


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
