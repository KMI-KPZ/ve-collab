from __future__ import annotations

from typing import Optional, Dict, List

from pymongo import MongoClient

import global_vars

the_acl = None


def get_acl() -> ACL:
    """
    access function for the ACL class. since it is a singleton, only use this function. Never create an instance of ACL() yourself!
    """

    global the_acl
    if the_acl is None:
        the_acl = ACL()
    return the_acl


class ACL:
    def __init__(self):
        # TODO keeping this client open will leak memory, should switch to using it as Resource with __enter__/__exit__ and with-statement
        self.client = MongoClient(global_vars.mongodb_host, global_vars.mongodb_port, username=global_vars.mongodb_username, password=global_vars.mongodb_password)
        self.global_acl = _GlobalACL(self.client)
        self.space_acl = _SpaceACL(self.client)


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

    def insert_default(self, role: str) -> None:
        """
        insert the standard rule for the give role. standard is: create_space: False
        :param role: name of the role to insert
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

    def ask(self, role: str, permission_key: str) -> bool:
        """
        "ask" the acl for a permission value on a give role
        :param role: which role to query
        :param permission_key: the name of the permission. these are the same as the keys stored in the db, e.g. "create_space"
        :return: boolean indicator whether the role has the requested permission or not
        """
        if permission_key not in self._EXISTING_KEYS:
            raise KeyError("Key '{}' does not match any permission key in the db".format(permission_key))

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
            raise KeyError("Key '{}' does not match any permission key in the db".format(permission_key))

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
                raise KeyError("Key '{}' does not match any permission key in the db".format(key))

        self.db.global_acl.update_one(
            {"role": acl_entry["role"]},
            {"$set": acl_entry},
            upsert=True
        )


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

    def insert_default(self, role: str, space: str) -> None:
        """
        insert the standard rule for the given role.
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

    def insert_admin(self, space: str) -> None:
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

    def ask(self, role: str, space: str, permission_key: str) -> bool:
        """
        "ask" the acl for a permission value on a give role
        :param space: the space where the rules apply
        :param role: which role to query
        :param permission_key: the name of the permission. these are the same as the keys stored in the db, e.g. "create_space"
        :return: boolean indicator whether the role has the requested permission or not
        """

        if permission_key not in self._EXISTING_KEYS:
            raise KeyError("Key '{}' does not match any permission key in the db".format(permission_key))

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

    def set(self, role: str, space: str, permission_key: str, value: bool) -> None:
        """
        set a value for a specific permission for a role
        :param space: the space where the rules apply
        :param role: the role to set the permission for
        :param permission_key: which permission to set. use the same identifier as in the db, e.g. "create_space"
        :param value: the value to set (True/False)
        """

        if permission_key not in self._EXISTING_KEYS:
            raise KeyError("Key '{}' does not match any permission key in the db".format(permission_key))

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
                raise KeyError("Key '{}' does not match any permission key in the db".format(key))

        self.db.space_acl.update_one(
            {"role": acl_entry["role"], "space": acl_entry["space"]},
            {"$set": acl_entry},
            upsert=True
        )


if __name__ == "__main__":
    pass
