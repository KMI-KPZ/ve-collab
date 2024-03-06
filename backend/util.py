from contextlib import contextmanager
from datetime import datetime, timedelta
import logging
from typing import Dict, Optional

from bson import ObjectId
import dateutil.parser
from jose import jwt
import jose.exceptions
from keycloak import KeycloakGetError
from pymongo import MongoClient

import global_vars

logger = logging.getLogger(__name__)


@contextmanager
def get_mongodb():
    client = MongoClient(
        global_vars.mongodb_host,
        global_vars.mongodb_port,
        username=global_vars.mongodb_username,
        password=global_vars.mongodb_password,
    )
    try:
        yield client[global_vars.mongodb_db_name]
    finally:
        client.close()


def parse_object_id(obj_id: str | ObjectId) -> ObjectId:
    """
    parse a str-representation of a mongodb objectid into an
    actual ObjectId-object. If the input id is already an ObjectId,
    it is returned unchanged.
    :param obj_id: the id to be transformed into a bson.ObjectId-object
    :return: the id as a bson.ObjectId
    """

    if obj_id is None:
        raise TypeError("_id cannot be None")

    if isinstance(obj_id, ObjectId):
        return obj_id
    elif isinstance(obj_id, str):
        return ObjectId(obj_id)
    else:
        raise TypeError(
            """invalid object_id type, 
            can either be 'str' or 'bson.ObjectId', 
            got: '{}'
            """.format(
                type(obj_id)
            )
        )


def parse_datetime(timestamp: str | datetime) -> Optional[datetime]:
    if timestamp is None or isinstance(timestamp, datetime):
        return timestamp
    elif timestamp == "":
        return None
    else:
        # dateutil parses guesses format, best bet is to use ISO8601 despite
        return dateutil.parser.parse(timestamp)


def timedelta_to_seconds(timedelta_obj: timedelta) -> float:
    if not isinstance(timedelta_obj, timedelta):
        raise TypeError(
            """expected type `datetime.timedelta` for parameter `timedelta_obj`,
                got {}""".format(
                type(timedelta_obj)
            )
        )

    return timedelta_obj.total_seconds()


def seconds_to_timedelta(seconds: float | int) -> timedelta:
    if not isinstance(seconds, (float, int)):
        raise TypeError(
            """expected type `float` or `int` for parameter `seconds`,
                got {}""".format(
                type(seconds)
            )
        )
    return timedelta(seconds=seconds)


def construct_keycloak_public_key() -> str:
    """
    retrieve the public key from Keycloak itself and bring it into
    the correct pem format.

    Returns the public key.

    Raises `KeycloakGetError` if unable to request the key.
    """

    return (
        "-----BEGIN PUBLIC KEY-----\n"
        + global_vars.keycloak.public_key()
        + "\n-----END PUBLIC KEY-----"
    )


def validate_keycloak_jwt(jwt_token: str) -> Dict:
    """
    Decodes and validates the JWT access token issued by Keycloak.

    Returns the decoded token info as a dict if it is valid, raises one of the following
    errors otherwise:

        - `keycloak.KeycloakGetError` : could not retrieve the public key of keycloak
        - `jose.exceptions.JWTError` : token did not validate
    """

    try:
        keycloak_public_key = construct_keycloak_public_key()
    except KeycloakGetError:
        raise

    # try to decode the JWT, if any error is thrown, re-raise it to signal
    # to the caller that the token is invalid
    try:
        token_info = jwt.decode(jwt_token, keycloak_public_key, audience="account")
    except jose.exceptions.JWTError:
        raise

    return token_info

def json_serialize_response(dictionary: dict) -> dict:
    """
    recursively traverse the (variably) nested dict to find any fields that
    require a transformation from its object representation into a str.
    Fields that are transformed are those whose type is an instances of `ObjectId`
    and `datetime.datetime`.
    Parse those values using the `str()` function (for ObjectId's),
    or the `.isoformat()` function (for datetimes).
    """

    for key in dictionary:
        # check for keys whose values need to be transformed
        if isinstance(dictionary[key], ObjectId):
            dictionary[key] = str(dictionary[key])
        elif isinstance(dictionary[key], datetime):
            dictionary[key] = dictionary[key].isoformat()

        # if it is a nested dict, recursively run on subdict
        # and reassemble it
        elif isinstance(dictionary[key], dict):
            dictionary[key] = json_serialize_response(dictionary[key])

        # if it is a list, there are two options:
        # either the entries in the list are ObjectIds themselves, in that
        # case transform them as str's and reassemble the list,
        # or the list contains dicts again, in which case we run recursively
        # on each of those subdicts again.
        # This can be seen as an exclusive-or, meaning mixed-lists may cause
        # strange or undesired behaviour.
        elif isinstance(dictionary[key], list):
            for elem in dictionary[key]:
                if isinstance(elem, ObjectId):
                    dictionary[key][dictionary[key].index(elem)] = str(elem)
                elif isinstance(elem, dict):
                    elem = json_serialize_response(elem)

    return dictionary
