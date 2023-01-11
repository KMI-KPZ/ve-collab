from contextlib import contextmanager

from bson import ObjectId
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