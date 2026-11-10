import datetime
import os
import re
from typing import Any, Dict, List, Optional

from bson import ObjectId
import gridfs
import pymongo
from pymongo.collation import Collation
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from exceptions import (
    FileAlreadyInRepoError,
    FileDoesntExistError,
    FileNodeDoesntExistError,
    FileTooLargeError,
    FilenameCollisionError,
    FolderDepthExceededError,
    InvalidFileNameError,
    InvalidMoveTargetError,
    NotAFileError,
    NotAFolderError,
    ReadOnlyNodeError,
    StorageQuotaExceededError,
)
import util


class SpaceFiles:
    """
    manage the hierarchical file share of a space.

    Every file and every folder is a "node" in the `space_files` collection::

        {
            "_id": ObjectId,
            "space": ObjectId,            # the space the node belongs to
            "parent": ObjectId | None,    # None means the node lives in the root
            "type": "folder" | "file",
            "name": str,                  # unique (case-insensitive) within the parent
            "author": str,                # username of the creator/uploader
            "created": datetime,
            "modified": datetime,
            # folders only:
            "system": str | None,         # "post_files" marks the reserved folder
            # files only:
            "file_id": ObjectId,          # the gridfs _id holding the actual bytes
            "content_type": str,          # derived from the name, not from the client
            "size": int,                  # bytes
            "manually_uploaded": bool,    # False if the file came from a post
            "post_id": ObjectId | None,   # the post the file belongs to, if any
        }

    Files that are attached to posts in the space are mirrored into a reserved
    system folder (`SYSTEM_FOLDER_POST_FILES`). That folder and everything in it
    is read-only from the perspective of the file share; the files can only be
    copied out of it.

    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            space_files = SpaceFiles(db)
            ...

    """

    # boundaries of the file share
    # the depth counts folder levels, i.e. a folder directly in the root has depth 1
    MAX_FOLDER_DEPTH = 5
    MAX_FILE_SIZE_BYTES = 80 * 1024 * 1024  # 80 MB
    MAX_SPACE_STORAGE_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB
    MAX_NAME_LENGTH = 255
    MAX_SEARCH_RESULTS = 100

    NODE_TYPE_FOLDER = "folder"
    NODE_TYPE_FILE = "file"

    # the reserved folder holding the attachments of posts. the name is only
    # a fallback, the frontend translates it based on the `system` marker
    SYSTEM_FOLDER_POST_FILES = "post_files"
    POST_FILES_FOLDER_NAME = "Post files"

    # names are compared case-insensitively (but accent-sensitively). The unique
    # index on (space, parent, name) uses the same collation (see `init_indexes`
    # in main.py), so it is the final guard against duplicates of concurrent requests
    NAME_COLLATION = Collation(locale="en", strength=2)
    UNIQUE_NAME_INDEX = "space_files_unique_name"

    def __init__(self, db: Database):
        self.db = db

    def get_limits(self) -> Dict:
        """
        return the configured boundaries of the file share as a dict, so that
        they can be handed out to clients instead of being hardcoded there
        """

        return {
            "max_folder_depth": self.MAX_FOLDER_DEPTH,
            "max_file_size_bytes": self.MAX_FILE_SIZE_BYTES,
            "max_space_storage_bytes": self.MAX_SPACE_STORAGE_BYTES,
            "max_name_length": self.MAX_NAME_LENGTH,
        }

    @classmethod
    def create_indexes(cls, db: Database, force_rebuild: bool = False) -> List[str]:
        """
        create the indexes of the `space_files` collection if they don't exist yet
        (or always, if `force_rebuild` is set) and return the names of the built ones:
        - (space, parent) for folder listings
        - unique (space, parent, name) with `NAME_COLLATION` against duplicate names
        - file_id for the permission lookups when serving files
        """

        indexes = {
            "space_files_space_parent": (
                [("space", pymongo.ASCENDING), ("parent", pymongo.ASCENDING)],
                {},
            ),
            cls.UNIQUE_NAME_INDEX: (
                [
                    ("space", pymongo.ASCENDING),
                    ("parent", pymongo.ASCENDING),
                    ("name", pymongo.ASCENDING),
                ],
                {"unique": True, "collation": cls.NAME_COLLATION},
            ),
            "space_files_file_id": ([("file_id", pymongo.ASCENDING)], {}),
        }

        built = []
        existing = db.space_files.index_information()
        for index_name, (keys, options) in indexes.items():
            if index_name in existing and not force_rebuild:
                continue
            if index_name in existing:
                db.space_files.drop_index(index_name)
            db.space_files.create_index(keys, name=index_name, **options)
            built.append(index_name)

        return built

    ###########################################################################
    # validation helpers
    ###########################################################################

    def validate_name(self, name: str) -> str:
        """
        validate the name of a file or folder and return it stripped of
        surrounding whitespace.

        Raises `InvalidFileNameError` if the name is not a string, empty,
        longer than `MAX_NAME_LENGTH` or contains path separators or
        control characters.
        """

        return util.validate_file_name(name, self.MAX_NAME_LENGTH)

    @staticmethod
    def content_type_of(file_name: str) -> str:
        """
        derive the mime type of a file from its name. The type a client sends
        along is not trusted, so that the stored type always matches the
        extension (e.g. no "text/html" for a "picture.png").
        """

        return util.content_type_of(file_name)

    def _name_exists(
        self,
        space_id: ObjectId,
        parent_id: Optional[ObjectId],
        name: str,
        exclude_node_id: Optional[ObjectId] = None,
    ) -> bool:
        """
        check (case-insensitively) if a node with the given name already exists
        in the folder given by `parent_id` (None means root). Optionally exclude
        a node from the check, e.g. the node that is about to be renamed.
        """

        query: Dict[str, Any] = {"space": space_id, "parent": parent_id, "name": name}
        if exclude_node_id is not None:
            query["_id"] = {"$ne": exclude_node_id}

        return (
            self.db.space_files.find_one(
                query, projection={"_id": True}, collation=self.NAME_COLLATION
            )
            is not None
        )

    def _deduplicate_name(
        self, space_id: ObjectId, parent_id: Optional[ObjectId], name: str
    ) -> str:
        """
        if a node with the given name already exists in the folder, append a
        numeric suffix to the name (before the file extension) until it is
        unique, e.g. "report.pdf" --> "report (1).pdf" --> "report (2).pdf"
        """

        if not self._name_exists(space_id, parent_id, name):
            return name

        stem, extension = os.path.splitext(name)
        counter = 1
        while True:
            candidate = "{} ({}){}".format(stem, counter, extension)
            if not self._name_exists(space_id, parent_id, candidate):
                return candidate
            counter += 1

    def _insert_node(self, node: Dict, deduplicate: bool) -> Dict:
        """
        insert the node and return it including its `_id`. If its name is
        already taken in the parent folder, it either gets a numeric suffix
        (`deduplicate`) or `FilenameCollisionError` is raised. The unique index
        also catches names that a concurrent request took in the meantime.
        """

        if deduplicate:
            node["name"] = self._deduplicate_name(
                node["space"], node["parent"], node["name"]
            )

        while True:
            try:
                node["_id"] = self.db.space_files.insert_one(node).inserted_id
                return node
            except DuplicateKeyError:
                if not deduplicate:
                    raise FilenameCollisionError()
                node.pop("_id", None)
                node["name"] = self._deduplicate_name(
                    node["space"], node["parent"], node["name"]
                )

    def _resolve_folder(
        self, space_id: ObjectId, folder_id: Optional[str | ObjectId]
    ) -> Optional[Dict]:
        """
        resolve a folder id into its node. None (the root) resolves to None.

        Raises `FileNodeDoesntExistError` if the folder doesn't exist in the space
        and `NotAFolderError` if the node is a file.
        """

        if folder_id is None:
            return None

        folder = self.get_node(space_id, folder_id)
        if folder["type"] != self.NODE_TYPE_FOLDER:
            raise NotAFolderError()

        return folder

    def _get_depth(self, space_id: ObjectId, folder_id: Optional[ObjectId]) -> int:
        """
        compute the depth of the folder, i.e. the number of folder levels from
        the root down to and including the folder. The root itself has depth 0.
        """

        depth = 0
        current = folder_id
        while current is not None:
            node = self.db.space_files.find_one(
                {"_id": current, "space": space_id}, projection={"parent": True}
            )
            if node is None:
                break
            depth += 1
            current = node["parent"]

        return depth

    def _get_subtree_height(self, space_id: ObjectId, folder_id: ObjectId) -> int:
        """
        compute the height of the folder subtree, i.e. the number of folder
        levels including the folder itself (a folder without subfolders has
        height 1). Needs one query per level instead of one per folder.
        """

        height = 0
        level = [folder_id]
        while level:
            height += 1
            level = [
                subfolder["_id"]
                for subfolder in self.db.space_files.find(
                    {
                        "space": space_id,
                        "parent": {"$in": level},
                        "type": self.NODE_TYPE_FOLDER,
                    },
                    projection={"_id": True},
                )
            ]

        return height

    def _get_subtree(self, space_id: ObjectId, node: Dict) -> List[Dict]:
        """
        get the node and, if it is a folder, all nodes below it, using one
        query per folder level
        """

        nodes = [node]
        level = [node["_id"]] if node["type"] == self.NODE_TYPE_FOLDER else []
        while level:
            children = list(
                self.db.space_files.find(
                    {"space": space_id, "parent": {"$in": level}},
                    projection={"type": True, "file_id": True, "manually_uploaded": True},
                )
            )
            nodes.extend(children)
            level = [
                child["_id"]
                for child in children
                if child["type"] == self.NODE_TYPE_FOLDER
            ]

        return nodes

    def _is_descendant_of(
        self, space_id: ObjectId, node_id: ObjectId, ancestor_id: ObjectId
    ) -> bool:
        """
        check if the node given by `node_id` is `ancestor_id` itself or lies
        somewhere below it
        """

        current = node_id
        while current is not None:
            if current == ancestor_id:
                return True
            node = self.db.space_files.find_one(
                {"_id": current, "space": space_id}, projection={"parent": True}
            )
            if node is None:
                return False
            current = node["parent"]

        return False

    def _is_read_only(self, space_id: ObjectId, node: Dict) -> bool:
        """
        a node is read-only if it is a system folder or if it lies inside
        a system folder (i.e. files that belong to posts). System folders
        can't contain subfolders, so checking the direct parent is enough.
        """

        if node.get("system"):
            return True

        if node["type"] == self.NODE_TYPE_FILE and not node.get(
            "manually_uploaded", True
        ):
            return True

        if node["parent"] is not None:
            parent = self.db.space_files.find_one(
                {"_id": node["parent"], "space": space_id},
                projection={"system": True},
            )
            if parent is not None and parent.get("system"):
                return True

        return False

    def _assert_storage_available(self, space_id: ObjectId, additional_bytes: int):
        """
        raise `StorageQuotaExceededError` if adding `additional_bytes` to the
        space would exceed `MAX_SPACE_STORAGE_BYTES`. Concurrent uploads can
        overshoot the quota by at most one file each, which is accepted.
        """

        if (
            self.get_storage_usage(space_id) + additional_bytes
            > self.MAX_SPACE_STORAGE_BYTES
        ):
            raise StorageQuotaExceededError()

    ###########################################################################
    # read operations
    ###########################################################################

    def get_node(self, space_id: str | ObjectId, node_id: str | ObjectId) -> Dict:
        """
        get a single node (file or folder) of the space.

        Raises `FileNodeDoesntExistError` if no such node exists in the space.
        """

        space_id = util.parse_object_id(space_id)
        node_id = util.parse_object_id(node_id)

        node = self.db.space_files.find_one({"_id": node_id, "space": space_id})
        if node is None:
            raise FileNodeDoesntExistError()

        return node

    def get_node_by_file_id(self, file_id: str | ObjectId) -> Optional[Dict]:
        """
        get the file node that references the given gridfs file id, or None
        if the file is not part of any space's file share
        """

        file_id = util.parse_object_id(file_id)

        return self.db.space_files.find_one({"file_id": file_id})

    def list_folder(
        self, space_id: str | ObjectId, folder_id: Optional[str | ObjectId] = None
    ) -> List[Dict]:
        """
        list the direct children of the folder (None means root), folders
        first, each group sorted by name.

        Raises `FileNodeDoesntExistError` if the folder doesn't exist in the
        space and `NotAFolderError` if it is a file.
        """

        space_id = util.parse_object_id(space_id)
        folder = self._resolve_folder(space_id, folder_id)
        parent_id = folder["_id"] if folder else None

        nodes = list(self.db.space_files.find({"space": space_id, "parent": parent_id}))
        nodes.sort(
            key=lambda node: (
                node["type"] != self.NODE_TYPE_FOLDER,
                not node.get("system"),
                node["name"].lower(),
            )
        )

        return nodes

    def get_path(
        self, space_id: str | ObjectId, node_id: Optional[str | ObjectId]
    ) -> List[Dict]:
        """
        get the path from the root down to the node (inclusive) as a list of
        `{"_id", "name", "type", "system"}` snippets. The root itself is not
        part of the path, so the path of a root node has exactly one entry
        and the path of the root (None) is empty.

        Raises `FileNodeDoesntExistError` if the node doesn't exist in the space.
        """

        if node_id is None:
            return []

        space_id = util.parse_object_id(space_id)
        node = self.get_node(space_id, node_id)

        path = []
        current = node
        while current is not None:
            path.append(
                {
                    "_id": current["_id"],
                    "name": current["name"],
                    "type": current["type"],
                    "system": current.get("system"),
                }
            )
            if current["parent"] is None:
                break
            current = self.db.space_files.find_one(
                {"_id": current["parent"], "space": space_id}
            )

        path.reverse()
        return path

    def get_folder_tree(self, space_id: str | ObjectId) -> List[Dict]:
        """
        get all folders of the space as a nested tree. Each folder node gets
        an additional "children" key holding its subfolders (files are not
        included). Siblings are sorted by name, system folders first.
        """

        space_id = util.parse_object_id(space_id)

        folders = list(
            self.db.space_files.find({"space": space_id, "type": self.NODE_TYPE_FOLDER})
        )

        by_parent: Dict[Optional[ObjectId], List[Dict]] = {}
        for folder in folders:
            folder["children"] = []
            by_parent.setdefault(folder["parent"], []).append(folder)

        def sort_key(folder):
            return (not folder.get("system"), folder["name"].lower())

        def attach_children(folder: Dict) -> Dict:
            folder["children"] = sorted(by_parent.get(folder["_id"], []), key=sort_key)
            for child in folder["children"]:
                attach_children(child)
            return folder

        return [
            attach_children(root)
            for root in sorted(by_parent.get(None, []), key=sort_key)
        ]

    def search(self, space_id: str | ObjectId, query: str) -> List[Dict]:
        """
        search files and folders of the space by name (case-insensitive
        substring match). Each result gets an additional "path" key holding
        the path snippets of its parent folders (see `get_path`).
        Returns at most `MAX_SEARCH_RESULTS` results, folders first.
        """

        space_id = util.parse_object_id(space_id)

        query = query.strip() if isinstance(query, str) else ""
        if not query:
            return []

        # sort before limiting, so that folders really come first
        results = list(
            self.db.space_files.find(
                {
                    "space": space_id,
                    "name": {"$regex": re.escape(query), "$options": "i"},
                },
                collation=self.NAME_COLLATION,
            )
            .sort([("type", pymongo.DESCENDING), ("name", pymongo.ASCENDING)])
            .limit(self.MAX_SEARCH_RESULTS)
        )

        # resolve the parent paths with a single lookup of all folders
        folders = {
            folder["_id"]: folder
            for folder in self.db.space_files.find(
                {"space": space_id, "type": self.NODE_TYPE_FOLDER},
                projection={"name": True, "parent": True, "system": True},
            )
        }
        for node in results:
            path = []
            current = node["parent"]
            while current is not None and current in folders:
                folder = folders[current]
                path.append(
                    {
                        "_id": folder["_id"],
                        "name": folder["name"],
                        "type": self.NODE_TYPE_FOLDER,
                        "system": folder.get("system"),
                    }
                )
                current = folder["parent"]
            path.reverse()
            node["path"] = path

        return results

    def get_storage_usage(self, space_id: str | ObjectId) -> int:
        """
        get the sum of the sizes of all files in the space's file share in bytes
        """

        space_id = util.parse_object_id(space_id)

        result = list(
            self.db.space_files.aggregate(
                [
                    {"$match": {"space": space_id, "type": self.NODE_TYPE_FILE}},
                    {"$group": {"_id": None, "total": {"$sum": "$size"}}},
                ]
            )
        )

        return result[0]["total"] if result else 0

    ###########################################################################
    # write operations
    ###########################################################################

    def create_folder(
        self,
        space_id: str | ObjectId,
        name: str,
        author: str,
        parent_id: Optional[str | ObjectId] = None,
    ) -> Dict:
        """
        create a new folder inside the folder given by `parent_id` (None means
        root) and return the created node.

        Raises:
            `InvalidFileNameError` if the name is invalid,
            `FileNodeDoesntExistError` if the parent doesn't exist in the space,
            `NotAFolderError` if the parent is a file,
            `ReadOnlyNodeError` if the parent is a system folder,
            `FolderDepthExceededError` if the folder would be nested deeper than
                `MAX_FOLDER_DEPTH`,
            `FilenameCollisionError` if a node with this name already exists
                in the parent folder
        """

        space_id = util.parse_object_id(space_id)
        name = self.validate_name(name)
        parent = self._resolve_folder(space_id, parent_id)
        parent_id = parent["_id"] if parent else None

        if parent is not None and self._is_read_only(space_id, parent):
            raise ReadOnlyNodeError()

        if self._get_depth(space_id, parent_id) + 1 > self.MAX_FOLDER_DEPTH:
            raise FolderDepthExceededError()

        if self._name_exists(space_id, parent_id, name):
            raise FilenameCollisionError()

        now = util.utcnow()
        folder = {
            "space": space_id,
            "parent": parent_id,
            "type": self.NODE_TYPE_FOLDER,
            "name": name,
            "author": author,
            "created": now,
            "modified": now,
            "system": None,
        }

        return self._insert_node(folder, deduplicate=False)

    def _ensure_post_files_folder(self, space_id: ObjectId) -> Dict:
        """
        get the reserved post files folder of the space, creating it if it
        doesn't exist yet
        """

        folder = self.db.space_files.find_one(
            {"space": space_id, "system": self.SYSTEM_FOLDER_POST_FILES}
        )
        if folder is not None:
            return folder

        now = util.utcnow()
        folder = {
            "space": space_id,
            "parent": None,
            "type": self.NODE_TYPE_FOLDER,
            "name": self.POST_FILES_FOLDER_NAME,
            "author": "system",
            "created": now,
            "modified": now,
            "system": self.SYSTEM_FOLDER_POST_FILES,
        }

        return self._insert_node(folder, deduplicate=True)

    def _insert_file_node(
        self,
        space_id: ObjectId,
        parent_id: Optional[ObjectId],
        file_name: str,
        author: str,
        file_id: ObjectId,
        size: int,
        manually_uploaded: bool,
        post_id: Optional[ObjectId] = None,
        created: Optional[datetime.datetime] = None,
    ) -> Dict:
        """
        insert a file node referencing an already stored gridfs file and
        return it. If the name is taken in the folder, it gets a numeric
        suffix. No further validation happens here, callers are responsible.
        """

        created = created or util.utcnow()
        node = {
            "space": space_id,
            "parent": parent_id,
            "type": self.NODE_TYPE_FILE,
            "name": file_name,
            "author": author,
            "created": created,
            "modified": created,
            "file_id": file_id,
            "content_type": self.content_type_of(file_name),
            "size": size,
            "manually_uploaded": manually_uploaded,
            "post_id": post_id,
        }

        return self._insert_node(node, deduplicate=True)

    def _store_file(
        self,
        space_id: ObjectId,
        parent_id: Optional[ObjectId],
        file_name: str,
        data: Any,
        size: int,
        author: str,
    ) -> Dict:
        """
        store the data (bytes or a file-like object) as a new gridfs file and
        add a regular, manually uploaded file node for it. If adding the node
        fails, the stored bytes are removed again, so nothing is left behind.
        """

        fs = gridfs.GridFS(self.db)
        file_id = util.gridfs_put(
            fs, data, file_name, self.content_type_of(file_name), author
        )

        try:
            return self._insert_file_node(
                space_id,
                parent_id,
                file_name,
                author,
                file_id,
                size,
                manually_uploaded=True,
            )
        except Exception:
            fs.delete(file_id)
            raise

    def add_file(
        self,
        space_id: str | ObjectId,
        file_name: str,
        file_content: bytes,
        uploader: str,
        parent_id: Optional[str | ObjectId] = None,
    ) -> Dict:
        """
        store a new file in gridfs and add it to the folder given by
        `parent_id` (None means root). If a node with the same name already
        exists in the folder, the name gets a numeric suffix (see
        `_deduplicate_name`). The mime type is derived from the name.
        Returns the created node.

        Raises:
            `InvalidFileNameError` if the name is invalid,
            `FileTooLargeError` if the content exceeds `MAX_FILE_SIZE_BYTES`,
            `FileNodeDoesntExistError` if the parent doesn't exist in the space,
            `NotAFolderError` if the parent is a file,
            `ReadOnlyNodeError` if the parent is a system folder,
            `StorageQuotaExceededError` if the space would exceed
                `MAX_SPACE_STORAGE_BYTES`
        """

        space_id = util.parse_object_id(space_id)
        file_name = self.validate_name(file_name)

        if len(file_content) > self.MAX_FILE_SIZE_BYTES:
            raise FileTooLargeError()

        parent = self._resolve_folder(space_id, parent_id)
        parent_id = parent["_id"] if parent else None

        if parent is not None and self._is_read_only(space_id, parent):
            raise ReadOnlyNodeError()

        self._assert_storage_available(space_id, len(file_content))

        return self._store_file(
            space_id, parent_id, file_name, file_content, len(file_content), uploader
        )

    def import_file(
        self,
        space_id: str | ObjectId,
        author: str,
        file_id: str | ObjectId,
        file_name: str,
        parent_id: Optional[str | ObjectId] = None,
    ) -> Dict:
        """
        add a file that already exists in gridfs as a regular, manually uploaded
        file to the folder given by `parent_id` (None means root). Only meant
        for migrating the legacy flat file repository of spaces: the quota and
        read-only checks are skipped, since the files existed before.
        Size and creation date are taken from gridfs. If the name already exists
        in the folder, it gets a numeric suffix. Returns the created node.

        Raises:
            `FileAlreadyInRepoError` if the file is already referenced in the space,
            `FileDoesntExistError` if the file is not in gridfs,
            `FileNodeDoesntExistError` if the parent doesn't exist in the space,
            `NotAFolderError` if the parent is a file
        """

        space_id = util.parse_object_id(space_id)
        file_id = util.parse_object_id(file_id)

        if self.db.space_files.find_one(
            {"space": space_id, "file_id": file_id}, projection={"_id": True}
        ):
            raise FileAlreadyInRepoError()

        fs = gridfs.GridFS(self.db)
        try:
            grid_file = fs.get(file_id)
        except gridfs.NoFile:
            raise FileDoesntExistError()

        parent = self._resolve_folder(space_id, parent_id)
        parent_id = parent["_id"] if parent else None

        try:
            file_name = self.validate_name(file_name)
        except InvalidFileNameError:
            file_name = str(file_id)

        return self._insert_file_node(
            space_id,
            parent_id,
            file_name,
            author,
            file_id,
            grid_file.length,
            manually_uploaded=True,
            created=util.as_utc(grid_file.upload_date),
        )

    def add_post_file(
        self,
        space_id: str | ObjectId,
        author: str,
        file_id: str | ObjectId,
        file_name: str,
        post_id: Optional[str | ObjectId] = None,
    ) -> Dict:
        """
        mirror a file that was attached to a post into the reserved post files
        folder of the space. The file itself has to be stored in gridfs already
        (that is the responsibility of the post), only a reference is kept
        here. Returns the created node.

        Raises `FileAlreadyInRepoError` if the file is already referenced in
        the space and `FileDoesntExistError` if the file is not in gridfs.
        """

        space_id = util.parse_object_id(space_id)
        file_id = util.parse_object_id(file_id)
        post_id = util.parse_object_id(post_id) if post_id is not None else None

        if self.db.space_files.find_one(
            {"space": space_id, "file_id": file_id}, projection={"_id": True}
        ):
            raise FileAlreadyInRepoError()

        fs = gridfs.GridFS(self.db)
        try:
            grid_file = fs.get(file_id)
        except gridfs.NoFile:
            raise FileDoesntExistError()

        folder = self._ensure_post_files_folder(space_id)

        # post attachments keep their original name, but the file share
        # requires unique names within a folder
        try:
            file_name = self.validate_name(file_name)
        except InvalidFileNameError:
            file_name = str(file_id)

        return self._insert_file_node(
            space_id,
            folder["_id"],
            file_name,
            author,
            file_id,
            grid_file.length,
            manually_uploaded=False,
            post_id=post_id,
        )

    def rename_node(
        self, space_id: str | ObjectId, node_id: str | ObjectId, new_name: str
    ) -> Dict:
        """
        rename a file or folder and return the updated node. Files keep their
        mime type, it is derived from the name only once on upload.

        Raises:
            `FileNodeDoesntExistError` if the node doesn't exist in the space,
            `ReadOnlyNodeError` if the node is a system folder or a post file,
            `InvalidFileNameError` if the name is invalid,
            `FilenameCollisionError` if another node with this name already
                exists in the same folder
        """

        space_id = util.parse_object_id(space_id)
        node = self.get_node(space_id, node_id)
        new_name = self.validate_name(new_name)

        if self._is_read_only(space_id, node):
            raise ReadOnlyNodeError()

        if self._name_exists(space_id, node["parent"], new_name, node["_id"]):
            raise FilenameCollisionError()

        now = util.utcnow()
        try:
            self.db.space_files.update_one(
                {"_id": node["_id"]}, {"$set": {"name": new_name, "modified": now}}
            )
        except DuplicateKeyError:
            raise FilenameCollisionError()

        if node["type"] == self.NODE_TYPE_FILE:
            self.db.fs.files.update_one(
                {"_id": node["file_id"]}, {"$set": {"filename": new_name}}
            )

        node["name"] = new_name
        node["modified"] = now
        return node

    def move_node(
        self,
        space_id: str | ObjectId,
        node_id: str | ObjectId,
        new_parent_id: Optional[str | ObjectId],
    ) -> Dict:
        """
        move a file or folder into another folder (None means root) and
        return the updated node.

        Raises:
            `FileNodeDoesntExistError` if the node or the target folder doesn't
                exist in the space,
            `NotAFolderError` if the target is a file,
            `ReadOnlyNodeError` if the node is a system folder or a post file,
                or if the target is a system folder,
            `InvalidMoveTargetError` if a folder would be moved into itself or
                one of its descendants,
            `FolderDepthExceededError` if the moved subtree would exceed
                `MAX_FOLDER_DEPTH`,
            `FilenameCollisionError` if a node with the same name already
                exists in the target folder
        """

        space_id = util.parse_object_id(space_id)
        node = self.get_node(space_id, node_id)
        target = self._resolve_folder(space_id, new_parent_id)
        target_id = target["_id"] if target else None

        if self._is_read_only(space_id, node):
            raise ReadOnlyNodeError()

        if target is not None and self._is_read_only(space_id, target):
            raise ReadOnlyNodeError()

        if node["type"] == self.NODE_TYPE_FOLDER:
            if target_id is not None and self._is_descendant_of(
                space_id, target_id, node["_id"]
            ):
                raise InvalidMoveTargetError()

            if (
                self._get_depth(space_id, target_id)
                + self._get_subtree_height(space_id, node["_id"])
                > self.MAX_FOLDER_DEPTH
            ):
                raise FolderDepthExceededError()

        if self._name_exists(space_id, target_id, node["name"], node["_id"]):
            raise FilenameCollisionError()

        now = util.utcnow()
        try:
            self.db.space_files.update_one(
                {"_id": node["_id"]}, {"$set": {"parent": target_id, "modified": now}}
            )
        except DuplicateKeyError:
            raise FilenameCollisionError()

        node["parent"] = target_id
        node["modified"] = now
        return node

    def copy_file(
        self,
        space_id: str | ObjectId,
        node_id: str | ObjectId,
        target_folder_id: Optional[str | ObjectId],
        author: str,
    ) -> Dict:
        """
        create an independent copy of a file (new gridfs file, new node) in
        the target folder (None means root). The copy is a regular, manually
        uploaded file owned by `author`, regardless of whether the source is a
        post file. If the name already exists in the target folder, the copy
        gets a numeric suffix. Returns the created node.

        Raises:
            `FileNodeDoesntExistError` if the node or the target folder doesn't
                exist in the space,
            `NotAFileError` if the node is a folder,
            `NotAFolderError` if the target is a file,
            `ReadOnlyNodeError` if the target is a system folder,
            `StorageQuotaExceededError` if the space would exceed
                `MAX_SPACE_STORAGE_BYTES`,
            `FileDoesntExistError` if the source file is missing in gridfs
        """

        space_id = util.parse_object_id(space_id)
        node = self.get_node(space_id, node_id)

        if node["type"] != self.NODE_TYPE_FILE:
            raise NotAFileError()

        target = self._resolve_folder(space_id, target_folder_id)
        target_id = target["_id"] if target else None

        if target is not None and self._is_read_only(space_id, target):
            raise ReadOnlyNodeError()

        fs = gridfs.GridFS(self.db)
        try:
            source = fs.get(node["file_id"])
        except gridfs.NoFile:
            raise FileDoesntExistError()

        self._assert_storage_available(space_id, source.length)

        # the gridfs file is streamed chunk by chunk instead of read into memory
        return self._store_file(
            space_id, target_id, node["name"], source, source.length, author
        )

    def _delete_nodes(self, nodes: List[Dict]) -> None:
        """
        delete the nodes and afterwards the gridfs files of the manually uploaded
        files among them (post files are owned by their posts). Removing the
        nodes first means that a failure in between leaves unreferenced bytes
        behind instead of nodes that point to missing files.
        """

        self.db.space_files.delete_many({"_id": {"$in": [n["_id"] for n in nodes]}})

        fs = gridfs.GridFS(self.db)
        for node in nodes:
            if node["type"] == self.NODE_TYPE_FILE and node.get("manually_uploaded"):
                fs.delete(node["file_id"])

    def delete_node(self, space_id: str | ObjectId, node_id: str | ObjectId) -> None:
        """
        delete a file or a folder including all of its contents.

        Raises `FileNodeDoesntExistError` if the node doesn't exist in the
        space and `ReadOnlyNodeError` if the node is a system folder or a
        post file (those can only be removed by deleting the post).
        """

        space_id = util.parse_object_id(space_id)
        node = self.get_node(space_id, node_id)

        if self._is_read_only(space_id, node):
            raise ReadOnlyNodeError()

        self._delete_nodes(self._get_subtree(space_id, node))

    def remove_post_file(
        self, space_id: str | ObjectId, file_id: str | ObjectId
    ) -> None:
        """
        remove the reference to a post file from the space. This function
        should ONLY be used when the corresponding post (or the file in it) is
        deleted, the gridfs file itself is not touched here because the post
        takes care of that.

        Raises `FileDoesntExistError` if the file is not referenced in the space.
        """

        space_id = util.parse_object_id(space_id)
        file_id = util.parse_object_id(file_id)

        result = self.db.space_files.delete_one(
            {"space": space_id, "file_id": file_id, "manually_uploaded": False}
        )

        if result.deleted_count != 1:
            raise FileDoesntExistError()

    def delete_all_of_space(self, space_id: str | ObjectId) -> None:
        """
        delete the complete file share of the space, including all manually
        uploaded gridfs files. Post files are left in gridfs, because they are
        owned by their posts.
        """

        space_id = util.parse_object_id(space_id)

        self._delete_nodes(
            list(
                self.db.space_files.find(
                    {"space": space_id},
                    projection={"type": True, "file_id": True, "manually_uploaded": True},
                )
            )
        )
