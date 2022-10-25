from __future__ import annotations

from tornado.ioloop import PeriodicCallback
from tornado.options import options
from typing import Optional, Dict, List

from pymongo import MongoClient

import global_vars
from logger_factory import get_logger

logger = get_logger(__name__)


class ACL:
    """
    implementation of ACL as a context manager, usage::

        with ACL() as acl_manager:
            acl_manager.global_acl.get_all()
            ...

    """
    def __init__(self):
        self.client = MongoClient(global_vars.mongodb_host, global_vars.mongodb_port,
                                  username=global_vars.mongodb_username, password=global_vars.mongodb_password)
        self.global_acl = _GlobalACL(self.client)
        self.space_acl = _SpaceACL(self.client)

        # periodically schedule acl entry cleanup if we are not in test mode
        if not (options.test_admin or options.test_user):
            # cleanup happens every  3,600,000 ms = 1 hour
            PeriodicCallback(self._cleanup_unused_rules, 3_600_000).start()

    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_value, exc_traceback):
        self.client.close()

    def _cleanup_unused_rules(self):
        """
        Delete all ACL entries whose role (or space) does no longer exist, because those entries are orphans.
        This function is periodically scheduled (every 1 hour), but may also be manually called if desired
        """

        logger.info("Running ACL cleanup")
        
        with self:
            db = self.client[global_vars.mongodb_db_name]
            currently_existing_roles = db.roles.distinct("role")
            currently_existing_spaces = db.spaces.distinct("name")

            # clean global acl (roles no longer exists)
            for global_acl_rule in self.global_acl.get_all():
                if global_acl_rule["role"] not in currently_existing_roles:
                    self.global_acl.delete(global_acl_rule["role"])

            # clean space acl (role or space no longer exist)
            for space_acl_rule in self.space_acl.get_full_list():
                if (space_acl_rule["role"] not in currently_existing_roles) or (space_acl_rule["space"] not in currently_existing_spaces):
                    self.space_acl.delete(
                        space_acl_rule["role"], space_acl_rule["space"])


class _GlobalACL:
    """
    This subgroup of the ACL System is for Network-wide permission, e.g. allowing a role to create spaces
    """

    def __init__(self, mongo_client: MongoClient) -> None:
        self.client = mongo_client
        self.db = self.client[global_vars.mongodb_db_name]
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
            {"role": role},
            {"$set": default_rule},
            upsert=True
        )
        return default_rule

    def insert_admin(self) -> dict:
        """
        insert the standard rule for admins (everything true), returning the rule that was inserted
        :return: inserted admin rule
        """

        admin_rule = {
            "role": "admin",
            "create_space": True
        }
        self.db.global_acl.update_one(  # use update + upsert so this function can also be used to restore to default
            {"role": "admin"},
            {"$set": admin_rule},
            upsert=True
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
                "Key '{}' does not match any permission key in the db".format(permission_key))

        record = self.db.global_acl.find_one({"role": role})
        if record:
            return record[permission_key]
        else:
            return False

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
                "Key '{}' does not match any permission key in the db".format(permission_key))

        self.db.global_acl.update_one(
            {"role": role},
            {"$set":
                {
                    permission_key: value
                }
             },
            upsert=True
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
                    "Key '{}' does not match any permission key in the db".format(key))

        self.db.global_acl.update_one(
            {"role": acl_entry["role"]},
            {"$set": acl_entry},
            upsert=True
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

    def __init__(self, mongo_client: MongoClient) -> None:
        self.client = mongo_client
        self.db = self.client[global_vars.mongodb_db_name]
        self._EXISTING_KEYS = ["role", "space", "join_space", "read_timeline", "post", "comment", "read_wiki", "write_wiki", "read_files",
                               "write_files"]

    def get_existing_keys(self):
        return self._EXISTING_KEYS

    def insert_default(self, role: str, space: str) -> dict:
        """
        insert the standard rule for the given role, returning the inserted rule.
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
        :param role: name of the role to insert
        :return: inserted rule
        """

        default_rule = {
            "role": role,
            "space": space,
            "join_space": False,
            "read_timeline": True,
            "post": False,
            "comment": False,
            "read_wiki": False,
            "write_wiki": False,
            "read_files": False,
            "write_files": False
        }
        self.db.space_acl.update_one(  # use update + upsert so this function can also be used to restore to default
            {"role": role, "space": space},
            {"$set": default_rule},
            upsert=True
        )
        return default_rule

    def insert_admin(self, space: str) -> dict:
        admin_rule = {
            "role": "admin",
            "space": space,
            "join_space": True,
            "read_timeline": True,
            "post": True,
            "comment": True,
            "read_wiki": True,
            "write_wiki": True,
            "read_files": True,
            "write_files": True
        }

        self.db.space_acl.update_one(
            {"role": "admin", "space": space},
            {"$set": admin_rule},
            upsert=True
        )
        return admin_rule

    def ask(self, role: str, space: str, permission_key: str) -> bool:
        """
        "ask" the acl for a permission value on a give role
        :param space: the space where the rules apply
        :param role: which role to query
        :param permission_key: the name of the permission. these are the same as the keys stored in the db, e.g. "create_space"
        :return: boolean indicator whether the role has the requested permission or not
        """

        if permission_key not in self._EXISTING_KEYS:
            raise KeyError(
                "Key '{}' does not match any permission key in the db".format(permission_key))

        record = self.db.space_acl.find_one({"role": role, "space": space})
        if record:
            return record[permission_key]
        else:
            return False

    def get(self, role: str, space: str) -> Optional[Dict]:
        """
        request the entire set of permissions for the role in the space
        :param space:
        :param role:
        :return: the dict containing the set of rules for the role, e.g.: {"role": "test", "create_space": False, ...}, or None if the role does not exist
        """

        record = self.db.space_acl.find_one({"role": role, "space": space})
        if record:
            del record["_id"]  # _id useless information here, can leave it out
        return record

    def get_all(self, space: str) -> Optional[List[Dict]]:
        """
        request all entries of the give space from the acl
        :return: list of dict's containing all the entries, or None if no acl entry exists.
        """
        result_list = []
        records = self.db.space_acl.find({"space": space})
        if records:
            for record in records:
                del record["_id"]
                result_list.append(record)
        return result_list

    def get_full_list(self) -> Optional[List[Dict]]:
        """
        request the full list of the space ACL, i.e. all spaces and all roles
        :return: list of dict's containing all the entries, or None if no acl entry exists.
        """
        ret_list = []
        entries = self.db.space_acl.find()
        if entries:
            for entry in entries:
                del entry["_id"]
                ret_list.append(entry)
        return ret_list

    def set(self, role: str, space: str, permission_key: str, value: bool) -> None:
        """
        set a value for a specific permission for a role
        :param space: the space where the rules apply
        :param role: the role to set the permission for
        :param permission_key: which permission to set. use the same identifier as in the db, e.g. "create_space"
        :param value: the value to set (True/False)
        """

        if permission_key not in self._EXISTING_KEYS:
            raise KeyError(
                "Key '{}' does not match any permission key in the db".format(permission_key))

        self.db.space_acl.update_one(
            {"role": role, "space": space},
            {"$set":
                {
                    permission_key: value
                }
             },
            upsert=True
        )

    def set_all(self, acl_entry: dict) -> None:
        """
        set all values of an entry of the acl. if the role already exist, the values will be updated, otherwise they will be freshly inserted.
        ACL entry needs to only contain:
        {
            "role": "<role>",
            "space": "<space>",
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
        if "role" not in acl_entry:
            raise KeyError("ACL Entry is missing mandatory key 'role'")
        if "space" not in acl_entry:
            raise KeyError("ACL Entry is missing mandatory key 'space'")
        # check for any keys that are too much (or have a typo e.g.)
        for key in acl_entry.keys():
            if key not in self._EXISTING_KEYS:
                raise KeyError(
                    "Key '{}' does not match any permission key in the db".format(key))

        self.db.space_acl.update_one(
            {"role": acl_entry["role"], "space": acl_entry["space"]},
            {"$set": acl_entry},
            upsert=True
        )

    def delete(self, role: str = None, space: str = None):
        """
        Delete ACL entries either by role or by space
        """

        self.db.space_acl.delete_many({
            "$or": [
                {"role": role},
                {"space": space}
            ]
        })


if __name__ == "__main__":
    pass
