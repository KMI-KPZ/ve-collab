from __future__ import annotations
import logging
from typing import Optional, Dict, List
from bson import ObjectId

from pymongo.database import Database

import global_vars
import util

logger = logging.getLogger(__name__)


class ACL:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            acl_manager = ACL(db)
            ...

    """

    def __init__(self, db: Database):
        self.db = db
        self.global_acl = _GlobalACL(self.db)
        self.space_acl = _SpaceACL(self.db)

    def ensure_acl_entries(self, role: str) -> None:
        """
        ensure that acl entries exist for the current role,
        i.e. the role is present in both global acl and the space acl of all spaces.
        if any one does not exist, create it
        """
        from resources.network.space import Spaces

        if not self.global_acl.get(role):
            self.global_acl.insert_default(role)


        # TODO not needed anymore, insert default into space when user joins space
        # insert into space acl of all spaces
        #space_manager = Spaces(self.db)
        #spaces = space_manager.get_space_names()
        #for space in spaces:
        #    if not self.space_acl.get(role, space):
        #        self.space_acl.insert_default(role, space)

    def _cleanup_unused_rules(self):
        """
        Delete all ACL entries whose role (or space) does no longer exist, because those entries are orphans.
        This function is periodically scheduled (every 1 hour), but may also be manually called if desired
        """

        logger.info("Running ACL cleanup")

        # initiate new mongo connection, because old objects might have been GC'ed
        self.__init__()
        with self:
            db = self.client[global_vars.mongodb_db_name]
            currently_existing_roles = db.profiles.distinct("role")
            currently_existing_spaces = db.spaces.distinct("_id")

            # clean global acl (roles no longer exists)
            for global_acl_rule in self.global_acl.get_all():
                if global_acl_rule["role"] not in currently_existing_roles:
                    self.global_acl.delete(global_acl_rule["role"])

            # clean space acl (role or space no longer exist)
            for space_acl_rule in self.space_acl.get_full_list():
                if (space_acl_rule["role"] not in currently_existing_roles) or (
                    space_acl_rule["space"] not in currently_existing_spaces
                ):
                    self.space_acl.delete(
                        space_acl_rule["role"], space_acl_rule["space"]
                    )


class _GlobalACL:
    """
    This subgroup of the ACL System is for Network-wide permission, e.g. allowing a role to create spaces
    """

    def __init__(self, db: Database) -> None:
        self.db = db
        self._EXISTING_KEYS = ["role", "create_space"]

    def get_existing_keys(self):
        return self._EXISTING_KEYS

    def insert_default(self, role: str) -> dict:
        """
        insert the standard rule for the give role, returning the inserted rule. standard is: create_space: False
        :param role: name of the role to insert
        :return: inserted default rule
        """

        default_rule = {
            "role": role,
            "create_space": False,
        }
        self.db.global_acl.update_one(  # use update + upsert so this function can also be used to restore to default
            {"role": role}, {"$set": default_rule}, upsert=True
        )
        return default_rule

    def insert_admin(self) -> dict:
        """
        insert the standard rule for admins (everything true), returning the rule that was inserted
        :return: inserted admin rule
        """

        admin_rule = {"role": "admin", "create_space": True}
        self.db.global_acl.update_one(  # use update + upsert so this function can also be used to restore to default
            {"role": "admin"}, {"$set": admin_rule}, upsert=True
        )

        return admin_rule

    def ask(self, role: str, permission_key: str) -> bool:
        """
        "ask" the acl for a permission value on a give role
        :param role: which role to query
        :param permission_key: the name of the permission. these are the same as the keys stored in the db, e.g. "create_space"
        :return: boolean indicator whether the role has the requested permission or not
        """
        if permission_key not in self._EXISTING_KEYS:
            raise KeyError(
                "Key '{}' does not match any permission key in the db".format(
                    permission_key
                )
            )

        record = self.db.global_acl.find_one({"role": role})
        if not record:
            raise ValueError("no Global ACL entry exists for role '{}'".format(role))
        return record[permission_key]

    def get(self, role: str) -> Optional[Dict]:
        """
        request the entire set of permissions for the role
        :param role:
        :return: the dict containing the set of rules for the role, e.g.: {"role": "test", "create_space": False}, or None if the role does not exist
        """

        record = self.db.global_acl.find_one({"role": role})
        if record:
            del record["_id"]  # _id useless information here, can leave it out
        return record
        # TODO raise exception instead of returning None if the roles was not found

    def get_all(self) -> Optional[List[Dict]]:
        """
        request all entries from the acl
        :return: list of dict's containing all the entries, or None if no acl entry exists.
        """
        result_list = []
        records = self.db.global_acl.find()
        if records:
            for record in records:
                del record["_id"]
                result_list.append(record)
        return result_list

    def set(self, role: str, permission_key: str, value: bool) -> None:
        """
        set a value for a specific permission for a role
        :param role: the role to set the permission for
        :param permission_key: which permission to set. use the same identifier as in the db, e.g. "create_space"
        :param value: the value to set (True/False)
        """

        if permission_key not in self._EXISTING_KEYS:
            raise KeyError(
                "Key '{}' does not match any permission key in the db".format(
                    permission_key
                )
            )

        self.db.global_acl.update_one(
            {"role": role}, {"$set": {permission_key: value}}, upsert=True
        )

    def set_all(self, acl_entry: dict) -> None:
        """
        set all values of an entry of the acl. if the role already exist, the values will be updated, otherwise they will be freshly inserted.
        ACL entry needs to only contain:
        {
            "role": "<rolename>",
            "create_space": True/False
        }
        Having any other key(s) in this dictionary will result in a KeyError
        :param acl_entry: the acl entry to insert
        """

        if "role" not in acl_entry:
            raise KeyError("ACL Entry is missing mandatory key 'role'")
        for key in acl_entry.keys():
            if key not in self._EXISTING_KEYS:
                raise KeyError(
                    "Key '{}' does not match any permission key in the db".format(key)
                )

        self.db.global_acl.update_one(
            {"role": acl_entry["role"]}, {"$set": acl_entry}, upsert=True
        )

    def delete(self, role: str) -> None:
        """
        delete the entry associated with the given role
        """

        self.db.global_acl.delete_one({"role": role})


class _SpaceACL:
    """
    This subgroup of the acl applies for every space individually. it handles all neccessary CRUD operations.
    the full access rights for a space admin is given implicitely, no matter his network-wide role.
    """

    def __init__(self, db: Database) -> None:
        self.db = db
        self._EXISTING_KEYS = [
            "username",
            "space",
            "join_space",
            "read_timeline",
            "post",
            "comment",
            "read_wiki",
            "write_wiki",
            "read_files",
            "write_files",
        ]

    def get_existing_keys(self):
        return self._EXISTING_KEYS

    def insert_default(self, username: str, space_id: str | ObjectId) -> dict:
        """
        insert the standard rule for the given user, returning the inserted rule.
        standard is read timeline only:
            "join_space": False,
            "post": False,
            "read_timeline": True,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False
        :param space: the space for which the rules should apply
        :param username: name of the user to insert
        :return: inserted rule
        """

        space_id = util.parse_object_id(space_id)

        default_rule = {
            "username": username,
            "space": space_id,
            "join_space": False,
            "read_timeline": True,
            "post": False,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False,
        }
        self.db.space_acl.update_one(  # use update + upsert so this function can also be used to restore to default
            {"username": username, "space": space_id}, {"$set": default_rule}, upsert=True
        )

        return default_rule

    def insert_admin(self, username: str, space_id: str | ObjectId) -> dict:
        space_id = util.parse_object_id(space_id)

        admin_rule = {
            "username": username,
            "space": space_id,
            "join_space": True,
            "read_timeline": True,
            "post": True,
            "comment": True,
            "read_wiki": True,
            "write_wiki": True,
            "read_files": True,
            "write_files": True,
        }

        self.db.space_acl.update_one(
            {"username": username, "space": space_id}, {"$set": admin_rule}, upsert=True
        )
        return admin_rule

    def insert_default_discussion(self, username: str, space_id: str | ObjectId):
        space_id = util.parse_object_id(space_id)

        default_rule = {
            "username": username,
            "space": space_id,
            "join_space": True,
            "read_timeline": True,
            "post": True,
            "comment": True,
            "read_wiki": True,
            "write_wiki": False,
            "read_files": True,
            "write_files": True,
        }

        self.db.space_acl.update_one(  # use update + upsert so this function can also be used to restore to default
            {"username": username, "space": space_id}, {"$set": default_rule}, upsert=True
        )
        return default_rule

    def ask(self, username: str, space_id: str | ObjectId, permission_key: str) -> bool:
        """
        "ask" the acl for a permission value on a given user
        :param space_id: the space where the rules apply
        :param username: which user to query
        :param permission_key: the name of the permission. these are the same as the keys stored in the db, e.g. "create_space"
        :return: boolean indicator whether the user has the requested permission or not
        """

        space_id = util.parse_object_id(space_id)

        if permission_key not in self._EXISTING_KEYS:
            raise KeyError(
                "Key '{}' does not match any permission key in the db".format(
                    permission_key
                )
            )

        record = self.db.space_acl.find_one({"username": username, "space": space_id})
        if not record:
            raise ValueError(
                "no Space ACL entry exists for user '{}' in space '{}'".format(
                    username, str(space_id)
                )
            )
        return record[permission_key]

    def get(self, username: str, space_id: str | ObjectId) -> Optional[Dict]:
        """
        request the entire set of permissions for the user in the space
        :param space:
        :param username:
        :return: the dict containing the set of rules for the user, e.g.: {"username": "test", "create_space": False, ...}, 
        or None if the combination of user and space does not exist
        """

        space_id = util.parse_object_id(space_id)

        record = self.db.space_acl.find_one({"username": username, "space": space_id})
        if record:
            del record["_id"]  # _id useless information here, can leave it out
        return record
        # TODO raise exception instead of returning None if the role/space combination was not found

    def get_all(self, space_id: str | ObjectId) -> Optional[List[Dict]]:
        """
        request all entries of the give space from the acl
        :return: list of dict's containing all the entries, or None if no acl entry exists.
        """

        space_id = util.parse_object_id(space_id)

        result_list = []
        records = self.db.space_acl.find({"space": space_id})
        if records:
            for record in records:
                del record["_id"]
                result_list.append(record)
        return result_list

    def get_full_list(self) -> Optional[List[Dict]]:
        """
        request the full list of the space ACL, i.e. all spaces and all users
        :return: list of dict's containing all the entries, or None if no acl entry exists.
        """

        ret_list = []
        entries = self.db.space_acl.find()
        if entries:
            for entry in entries:
                del entry["_id"]
                ret_list.append(entry)
        return ret_list

    def set(self, username: str, space_id: str | ObjectId, permission_key: str, value: bool) -> None:
        """
        set a value for a specific permission in a space for a user
        :param space_id: the space where the rules apply
        :param username: the user to set the permission for
        :param permission_key: which permission to set. use the same identifier as in the db, e.g. "create_space"
        :param value: the value to set (True/False)
        """

        space_id = util.parse_object_id(space_id)

        if permission_key not in self._EXISTING_KEYS:
            raise KeyError(
                "Key '{}' does not match any permission key in the db".format(
                    permission_key
                )
            )

        self.db.space_acl.update_one(
            {"username": username, "space": space_id},
            {"$set": {permission_key: value}},
            upsert=True,
        )
        # TODO fix: we get an inconsistency problem here when using upsert, because all other keys would not be present

    def set_all(self, acl_entry: dict) -> None:
        """
        set all values of an entry of the acl. if the user/space combination already exist, 
        the values will be updated, otherwise they will be freshly inserted.
        ACL entry needs to only contain:
        {
            "username": "<username>",
            "space": "<space_id>",
            "join_space": True/False,
            "read_timeline": True/False,
            "post": True/False,
            "comment": True/False,
            "read_wiki": True/False,
            "write_wiki": True/False,
            "read_files": True/False,
            "write_files": True/False
        }
        Having any other key(s) in this dictionary will result in a KeyError
        :param acl_entry: the acl entry to insert
        """

        # check for mandatory keys
        if "username" not in acl_entry:
            raise KeyError("ACL Entry is missing mandatory key 'username'")
        if "space" not in acl_entry:
            raise KeyError("ACL Entry is missing mandatory key 'space'")
        
        # ensure object_id for space
        acl_entry["space"] = util.parse_object_id(acl_entry["space"])

        # check for any keys that are too much (or have a typo e.g.)
        for key in acl_entry.keys():
            if key not in self._EXISTING_KEYS:
                raise KeyError(
                    "Key '{}' does not match any permission key in the db".format(key)
                )

        self.db.space_acl.update_one(
            {"username": acl_entry["username"], "space": acl_entry["space"]},
            {"$set": acl_entry},
            upsert=True,
        )

    def delete(self, username: str = None, space_id: str | ObjectId = None):
        """
        Delete ACL entries either by username or by space
        """

        if space_id is not None:
            space_id = util.parse_object_id(space_id)

        self.db.space_acl.delete_many({"$or": [{"username": username}, {"space": space_id}]})


def cleanup_unused_rules() -> None:
    """
    Delete all ACL entries whose role (or space) does no longer exist,
    because those entries are orphans.
    This function is periodically scheduled (every 1 hour) from `main.py`,
    but may also be manually called if desired.
    """

    logger.info("Running ACL cleanup")

    # initiate new mongo connection, because old objects might have been GC'ed
    with util.get_mongodb() as db:
        acl_manager = ACL(db)
        currently_existing_roles = db.profiles.distinct("role")
        currently_existing_users = db.profiles.distinct("username")
        currently_existing_spaces = db.spaces.distinct("_id")

        # clean global acl (roles no longer exists)
        for global_acl_rule in acl_manager.global_acl.get_all():
            if global_acl_rule["role"] not in currently_existing_roles:
                acl_manager.global_acl.delete(global_acl_rule["role"])

        # clean space acl (username or space no longer exist)
        for space_acl_rule in acl_manager.space_acl.get_full_list():
            if (space_acl_rule["username"] not in currently_existing_users) or (
                space_acl_rule["space"] not in currently_existing_spaces
            ):
                acl_manager.space_acl.delete(
                    space_acl_rule["username"], space_acl_rule["space"]
                )


if __name__ == "__main__":
    pass
