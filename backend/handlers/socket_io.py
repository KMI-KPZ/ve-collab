from bson import ObjectId
import jose
import keycloak

import global_vars
from error_reasons import MISSING_KEY_SLUG
import util


@global_vars.socket_io.event
async def connect(sid, environment, auth):
    print("connected")
    print(sid)


@global_vars.socket_io.event
async def disconnect(sid):
    session = await global_vars.socket_io.get_session(sid)
    print("disconnect ", sid)

    try:
        # delete the mapping username <--> socket id
        del global_vars.username_sid_map[session["preferred_username"]]
    except KeyError:
        # not finding the mapping is obviously a success as well
        pass


def acknowledge_notification(notification_id):
    print("notification acknowledged")
    print(notification_id)

    with util.get_mongodb() as db:
        db.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"receive_state": "acknowledged"}},
        )


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

    print("authenticate")
    print(sid)

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
    # dispatch them all to the user
    with util.get_mongodb() as db:
        new_notifications = db.notifications.find(
            {
                "to": token_info["preferred_username"],
                "receive_state": {"$ne": "acknowledged"},
            }
        )
        if new_notifications:
            for notification in new_notifications:
                notification["_id"] = str(notification["_id"])
                await global_vars.socket_io.emit(
                    "notification",
                    notification,
                    room=sid,
                    callback=acknowledge_notification,
                )

    return {"status": 200, "success": True}


@global_vars.socket_io.event
async def bla(sid, data):
    token = await global_vars.socket_io.get_session(sid)
    if not token:
        return {"status": 401, "success": False, "reason": "unauthenticated"}

    print("BLABLABLABALAALBALBALBABL")
    return {"status": 200, "success": True}
