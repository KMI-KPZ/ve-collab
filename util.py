from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
import dateutil.parser
from pymongo import MongoClient

import global_vars


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
