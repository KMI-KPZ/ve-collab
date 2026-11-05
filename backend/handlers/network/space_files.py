from concurrent.futures import ThreadPoolExecutor
import json
import logging
from typing import Any, Callable, Optional

from bson import ObjectId
from bson.errors import InvalidId
import tornado.ioloop
import tornado.web

from error_reasons import (
    FILE_DOESNT_EXIST,
    FILE_TOO_LARGE,
    FOLDER_DEPTH_EXCEEDED,
    INSUFFICIENT_PERMISSIONS,
    INVALID_MOVE_TARGET,
    INVALID_NAME,
    INVALID_OBJECT_ID,
    JSON_PARSING_ERROR,
    MISSING_FILE_SLUG,
    MISSING_KEY_IN_HTTP_BODY_SLUG,
    MISSING_KEY_SLUG,
    NAME_ALREADY_EXISTS,
    NODE_DOESNT_EXIST,
    NOT_A_FILE,
    NOT_A_FOLDER,
    READ_ONLY_NODE,
    SPACE_DOESNT_EXIST,
    STORAGE_QUOTA_EXCEEDED,
    USER_NOT_MEMBER_OF_SPACE,
)
from exceptions import (
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
from handlers.base_handler import BaseHandler, auth_needed
from resources.network.acl import ACL
from resources.network.space import Spaces
from resources.network.space_files import SpaceFiles
import util

logger = logging.getLogger(__name__)

# uploading, copying and deleting files moves up to `MAX_FILE_SIZE_BYTES` per file
# through gridfs, which would block the event loop (and with it every other
# request and the socket.io connections) for that long, so it runs in this pool.
# The small size also limits how many large files are held in memory at once.
_file_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="space_files")


class SpaceFilesHandler(BaseHandler):
    """
    handle the hierarchical file share of spaces (folders, files, search)
    """

    def options(self, slug):
        # no body
        self.set_status(200)
        self.finish()

    ###########################################################################
    # request helpers
    ###########################################################################

    def _parse_object_id_or_400(self, value: str) -> Optional[ObjectId]:
        """
        parse a str into an ObjectId. If it is not a valid id, reply with
        400 and return None, so the caller can simply `return`.
        """

        try:
            return util.parse_object_id(value)
        except (InvalidId, TypeError):
            self.set_status(400)
            self.write({"success": False, "reason": INVALID_OBJECT_ID})
            return None

    def _get_space_id_or_400(self) -> Optional[ObjectId]:
        """
        read the mandatory "id" query param and parse it. replies with 400 and
        returns None if it is missing or not a valid ObjectId.
        """

        try:
            space_id = self.get_argument("id")
        except tornado.web.MissingArgumentError:
            self.set_status(400)
            self.write({"success": False, "reason": MISSING_KEY_SLUG + "id"})
            return None

        return self._parse_object_id_or_400(space_id)

    def _parse_json_body_or_400(self) -> Optional[dict]:
        """
        parse the request body as json. replies with 400 and returns None if
        the body is not valid json or not a json object.
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": JSON_PARSING_ERROR})
            return None

        if not isinstance(http_body, dict):
            self.set_status(400)
            self.write({"success": False, "reason": JSON_PARSING_ERROR})
            return None

        return http_body

    def _parse_optional_parent(self, value) -> "tuple[bool, Optional[ObjectId]]":
        """
        parse an optional parent folder reference (None / "" / missing means
        root). returns (ok, parent_id). replies with 400 if the value is not a
        valid ObjectId.
        """

        if value is None or value == "":
            return True, None

        parent_id = self._parse_object_id_or_400(value)
        if parent_id is None:
            return False, None

        return True, parent_id

    def _ask_space_acl(self, acl: ACL, space_id: ObjectId, permission_key: str) -> bool:
        """
        query the space acl for the current user, treating a missing entry
        as "no permission" instead of crashing
        """

        try:
            return acl.space_acl.ask(self.current_user.username, space_id, permission_key)
        except ValueError:
            return False

    def _authorize(self, db, space_id: ObjectId, permission_key: str) -> bool:
        """
        common access checks for every endpoint:
        - the space has to exist (409 otherwise)
        - the current user has to be a member of the space or is a global / space 
          admin (409 otherwise)
        - the user needs the given space acl permission ("read_files" or
          "write_files"), global admins and space admins implicitly have it
          (403 otherwise)

        returns whether the request is authorized. if not, the response has
        already been written and the caller can simply `return`.
        """

        space_manager = Spaces(db)
        acl = ACL(db)

        space = space_manager.get_space(
            space_id, projection={"_id": True, "members": True, "admins": True}
        )
        if space is None:
            self.set_status(409)
            self.write({"success": False, "reason": SPACE_DOESNT_EXIST})
            return False

        is_global_admin = self.is_current_user_lionet_admin()
        is_space_admin = self.current_user.username in space["admins"]
        is_admin = is_global_admin or is_space_admin

        if not is_global_admin and self.current_user.username not in space["members"]:
            self.set_status(409)
            self.write({"success": False, "reason": USER_NOT_MEMBER_OF_SPACE})
            return False

        if not is_admin and not self._ask_space_acl(acl, space_id, permission_key):
            self.set_status(403)
            self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
            return False

        return True

    def _run_blocking(self, func: Callable[..., Any], *args) -> Any:
        """
        run the blocking `func` with the given `args` in the file share's thread
        pool and return an awaitable of its result (or its exception)
        """

        return tornado.ioloop.IOLoop.current().run_in_executor(
            _file_executor, func, *args
        )

    def _write_node_error(self, error: Exception) -> None:
        """
        translate the domain exceptions of the `SpaceFiles` resource into
        http responses
        """

        reasons = {
            FileNodeDoesntExistError: NODE_DOESNT_EXIST,
            NotAFolderError: NOT_A_FOLDER,
            NotAFileError: NOT_A_FILE,
            FolderDepthExceededError: FOLDER_DEPTH_EXCEEDED,
            FileTooLargeError: FILE_TOO_LARGE,
            StorageQuotaExceededError: STORAGE_QUOTA_EXCEEDED,
            InvalidFileNameError: INVALID_NAME,
            FilenameCollisionError: NAME_ALREADY_EXISTS,
            InvalidMoveTargetError: INVALID_MOVE_TARGET,
            ReadOnlyNodeError: READ_ONLY_NODE,
            FileDoesntExistError: FILE_DOESNT_EXIST,
        }

        for error_type, reason in reasons.items():
            if isinstance(error, error_type):
                self.set_status(409)
                self.write({"success": False, "reason": reason})
                return

        raise error

    ###########################################################################
    # GET
    ###########################################################################

    @auth_needed
    def get(self, slug):
        """
        GET /space_files/limits
            get the configured boundaries of the file share (max folder depth,
            max file size, storage quota per space, max name length), so that
            clients can validate before sending requests.

            returns:
                200 OK
                {"success": True,
                 "limits": {"max_folder_depth": int,
                            "max_file_size_bytes": int,
                            "max_space_storage_bytes": int,
                            "max_name_length": int}}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

        GET /space_files/list
            list the contents of a folder of the space's file share. Requires
            membership and the "read_files" permission in the space.

            query params:
                "id": the _id of the space, mandatory
                "folder": the _id of the folder to list, omit for the root

            returns:
                200 OK
                {"success": True,
                 "folder": <folder node> | null (root),
                 "path": [<path snippet>, ...],
                 "items": [<node>, ...],
                 "storage": {"used_bytes": int, "max_bytes": int}}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id"}

                400 Bad Request
                {"success": False,
                 "reason": "invalid_object_id"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_not_member_of_space"}

                409 Conflict
                {"success": False,
                 "reason": "node_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "not_a_folder"}

        GET /space_files/node
            get a single file or folder including its path. Requires
            membership and the "read_files" permission in the space.

            query params:
                "id": the _id of the space, mandatory
                "node_id": the _id of the node, mandatory

            returns:
                200 OK
                {"success": True,
                 "node": <node>,
                 "path": [<path snippet>, ...]}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id" | "missing_key:node_id"}

                400 Bad Request
                {"success": False,
                 "reason": "invalid_object_id"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_not_member_of_space"}

                409 Conflict
                {"success": False,
                 "reason": "node_doesnt_exist"}

        GET /space_files/tree
            get the complete folder tree of the space's file share (folders
            only, each with a "children" list). Requires membership and the
            "read_files" permission in the space.

            query params:
                "id": the _id of the space, mandatory

            returns:
                200 OK
                {"success": True,
                 "tree": [<folder node with "children">, ...]}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_not_member_of_space"}

        GET /space_files/search
            search files and folders of the space by name (case-insensitive
            substring match). Requires membership and the "read_files"
            permission in the space.

            query params:
                "id": the _id of the space, mandatory
                "query": the search term, mandatory

            returns:
                200 OK
                {"success": True,
                 "results": [<node with "path">, ...]}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id" | "missing_key:query"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_not_member_of_space"}
        """

        if slug == "limits":
            with util.get_mongodb() as db:
                limits = SpaceFiles(db).get_limits()
            self.set_status(200)
            self.write({"success": True, "limits": limits})
            return

        space_id = self._get_space_id_or_400()
        if space_id is None:
            return

        if slug == "list":
            folder = self.get_argument("folder", None)
            ok, folder_id = self._parse_optional_parent(folder)
            if not ok:
                return
            self.list_folder(space_id, folder_id)
            return

        elif slug == "node":
            try:
                node_id = self.get_argument("node_id")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + "node_id"})
                return
            node_id = self._parse_object_id_or_400(node_id)
            if node_id is None:
                return
            self.get_node(space_id, node_id)
            return

        elif slug == "tree":
            self.get_tree(space_id)
            return

        elif slug == "search":
            try:
                query = self.get_argument("query")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + "query"})
                return
            self.search(space_id, query)
            return

        else:
            self.set_status(404)

    ###########################################################################
    # POST
    ###########################################################################

    @auth_needed
    async def post(self, slug):
        """
        POST /space_files/create_folder
            create a new folder. Requires membership and the "write_files"
            permission in the space.

            query params:
                "id": the _id of the space, mandatory

            http body (json):
                {"name": str,
                 "parent": str | null}   (the _id of the parent folder, null/omit for root)

            returns:
                200 OK
                {"success": True,
                 "folder": <folder node>}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id"}

                400 Bad Request
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key_in_http_body:name"}

                400 Bad Request
                {"success": False,
                 "reason": "invalid_object_id"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_not_member_of_space"}

                409 Conflict
                {"success": False,
                 "reason": "node_doesnt_exist"}
                --> the parent folder doesn't exist

                409 Conflict
                {"success": False,
                 "reason": "not_a_folder"}
                --> the parent is a file

                409 Conflict
                {"success": False,
                 "reason": "read_only_node"}
                --> the parent is a system folder (post files)

                409 Conflict
                {"success": False,
                 "reason": "invalid_name"}

                409 Conflict
                {"success": False,
                 "reason": "folder_depth_exceeded"}

                409 Conflict
                {"success": False,
                 "reason": "name_already_exists"}

        POST /space_files/upload
            upload one or more files into a folder. Requires membership and
            the "write_files" permission in the space. If a file with the same
            name already exists in the folder, the new file gets a numeric
            suffix (e.g. "report (1).pdf"). The mime type is derived from the
            file name, the one sent by the client is ignored.

            query params:
                "id": the _id of the space, mandatory

            form data (multipart):
                "file": the file(s) to upload, may be repeated
                "parent": the _id of the target folder, omit for root

            returns:
                200 OK
                {"success": True,
                 "files": [<file node>, ...]}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id"}

                400 Bad Request
                {"success": False,
                 "reason": "missing_file:file"}

                400 Bad Request
                {"success": False,
                 "reason": "invalid_object_id"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_not_member_of_space"}

                409 Conflict
                {"success": False,
                 "reason": "node_doesnt_exist"}
                --> the target folder doesn't exist

                409 Conflict
                {"success": False,
                 "reason": "not_a_folder"}

                409 Conflict
                {"success": False,
                 "reason": "read_only_node"}
                --> the target is a system folder (post files)

                409 Conflict
                {"success": False,
                 "reason": "invalid_name"}

                409 Conflict
                {"success": False,
                 "reason": "file_too_large"}

                409 Conflict
                {"success": False,
                 "reason": "storage_quota_exceeded"}

        POST /space_files/rename
            rename a file or folder. Requires membership and the "write_files"
            permission in the space. Post files and the post files folder
            cannot be renamed.

            query params:
                "id": the _id of the space, mandatory

            http body (json):
                {"node_id": str,
                 "name": str}

            returns:
                200 OK
                {"success": True,
                 "node": <node>}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id"}

                400 Bad Request
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key_in_http_body:node_id" | "missing_key_in_http_body:name"}

                400 Bad Request
                {"success": False,
                 "reason": "invalid_object_id"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_not_member_of_space"}

                409 Conflict
                {"success": False,
                 "reason": "node_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "read_only_node"}

                409 Conflict
                {"success": False,
                 "reason": "invalid_name"}

                409 Conflict
                {"success": False,
                 "reason": "name_already_exists"}

        POST /space_files/move
            move a file or folder into another folder. Requires membership and
            the "write_files" permission in the space. Post files and the post
            files folder cannot be moved, nor can anything be moved into it.

            query params:
                "id": the _id of the space, mandatory

            http body (json):
                {"node_id": str,
                 "parent": str | null}   (the _id of the target folder, null for root)

            returns:
                200 OK
                {"success": True,
                 "node": <node>}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id"}

                400 Bad Request
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key_in_http_body:node_id"}

                400 Bad Request
                {"success": False,
                 "reason": "invalid_object_id"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_not_member_of_space"}

                409 Conflict
                {"success": False,
                 "reason": "node_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "not_a_folder"}

                409 Conflict
                {"success": False,
                 "reason": "read_only_node"}

                409 Conflict
                {"success": False,
                 "reason": "invalid_move_target"}
                --> a folder cannot be moved into itself or its descendants

                409 Conflict
                {"success": False,
                 "reason": "folder_depth_exceeded"}

                409 Conflict
                {"success": False,
                 "reason": "name_already_exists"}

        POST /space_files/copy
            create an independent copy of a file in another folder. This is
            the way to get a modifiable version of a post file. Requires
            membership and the "write_files" permission in the space. The
            current user becomes the author of the copy.

            query params:
                "id": the _id of the space, mandatory

            http body (json):
                {"node_id": str,
                 "parent": str | null}   (the _id of the target folder, null for root)

            returns:
                200 OK
                {"success": True,
                 "node": <file node of the copy>}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id"}

                400 Bad Request
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key_in_http_body:node_id"}

                400 Bad Request
                {"success": False,
                 "reason": "invalid_object_id"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_not_member_of_space"}

                409 Conflict
                {"success": False,
                 "reason": "node_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "not_a_file"}

                409 Conflict
                {"success": False,
                 "reason": "not_a_folder"}

                409 Conflict
                {"success": False,
                 "reason": "read_only_node"}

                409 Conflict
                {"success": False,
                 "reason": "storage_quota_exceeded"}

                409 Conflict
                {"success": False,
                 "reason": "file_doesnt_exist"}
                --> the source file is missing in the storage
        """

        space_id = self._get_space_id_or_400()
        if space_id is None:
            return

        if slug == "upload":
            if "file" not in self.request.files or not self.request.files["file"]:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_FILE_SLUG + "file"})
                return

            ok, parent_id = self._parse_optional_parent(
                self.get_body_argument("parent", None)
            )
            if not ok:
                return

            await self.upload_files(space_id, parent_id, self.request.files["file"])
            return

        http_body = self._parse_json_body_or_400()
        if http_body is None:
            return

        if slug == "create_folder":
            if "name" not in http_body:
                self.set_status(400)
                self.write(
                    {"success": False, "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "name"}
                )
                return

            ok, parent_id = self._parse_optional_parent(http_body.get("parent"))
            if not ok:
                return

            self.create_folder(space_id, http_body["name"], parent_id)
            return

        # all remaining slugs operate on an existing node
        if "node_id" not in http_body:
            self.set_status(400)
            self.write(
                {"success": False, "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "node_id"}
            )
            return
        node_id = self._parse_object_id_or_400(http_body["node_id"])
        if node_id is None:
            return

        if slug == "rename":
            if "name" not in http_body:
                self.set_status(400)
                self.write(
                    {"success": False, "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "name"}
                )
                return

            self.rename_node(space_id, node_id, http_body["name"])
            return

        elif slug == "move":
            ok, parent_id = self._parse_optional_parent(http_body.get("parent"))
            if not ok:
                return

            self.move_node(space_id, node_id, parent_id)
            return

        elif slug == "copy":
            ok, parent_id = self._parse_optional_parent(http_body.get("parent"))
            if not ok:
                return

            await self.copy_file(space_id, node_id, parent_id)
            return

        else:
            self.set_status(404)

    ###########################################################################
    # DELETE
    ###########################################################################

    @auth_needed
    async def delete(self, slug):
        """
        DELETE /space_files/delete
            delete a file or a folder including all of its contents. Requires
            membership and the "write_files" permission in the space. Post
            files and the post files folder cannot be deleted here, only by
            deleting the post.

            query params:
                "id": the _id of the space, mandatory
                "node_id": the _id of the node to delete, mandatory

            returns:
                200 OK
                {"success": True}

                400 Bad Request
                {"success": False,
                 "reason": "missing_key:id" | "missing_key:node_id"}

                400 Bad Request
                {"success": False,
                 "reason": "invalid_object_id"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "user_not_member_of_space"}

                409 Conflict
                {"success": False,
                 "reason": "node_doesnt_exist"}

                409 Conflict
                {"success": False,
                 "reason": "read_only_node"}
        """

        space_id = self._get_space_id_or_400()
        if space_id is None:
            return

        if slug == "delete":
            try:
                node_id = self.get_argument("node_id")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": MISSING_KEY_SLUG + "node_id"})
                return
            node_id = self._parse_object_id_or_400(node_id)
            if node_id is None:
                return

            await self.delete_node(space_id, node_id)
            return

        else:
            self.set_status(404)

    ###########################################################################
    # operations
    ###########################################################################

    def list_folder(self, space_id: ObjectId, folder_id: Optional[ObjectId]) -> None:
        with util.get_mongodb() as db:
            authorized = self._authorize(db, space_id, "read_files")
            if not authorized:
                return

            space_files = SpaceFiles(db)
            try:
                folder = (
                    space_files.get_node(space_id, folder_id)
                    if folder_id is not None
                    else None
                )
                items = space_files.list_folder(space_id, folder_id)
                path = space_files.get_path(space_id, folder_id)
            except (FileNodeDoesntExistError, NotAFolderError) as e:
                self._write_node_error(e)
                return

            storage = {
                "used_bytes": space_files.get_storage_usage(space_id),
                "max_bytes": space_files.MAX_SPACE_STORAGE_BYTES,
            }

        self.set_status(200)
        self.serialize_and_write(
            {
                "success": True,
                "folder": folder,
                "path": path,
                "items": items,
                "storage": storage,
            }
        )

    def get_node(self, space_id: ObjectId, node_id: ObjectId) -> None:
        with util.get_mongodb() as db:
            authorized = self._authorize(db, space_id, "read_files")
            if not authorized:
                return

            space_files = SpaceFiles(db)
            try:
                node = space_files.get_node(space_id, node_id)
                path = space_files.get_path(space_id, node_id)
            except FileNodeDoesntExistError as e:
                self._write_node_error(e)
                return

        self.set_status(200)
        self.serialize_and_write({"success": True, "node": node, "path": path})

    def get_tree(self, space_id: ObjectId) -> None:
        with util.get_mongodb() as db:
            authorized = self._authorize(db, space_id, "read_files")
            if not authorized:
                return

            tree = SpaceFiles(db).get_folder_tree(space_id)

        self.set_status(200)
        self.serialize_and_write({"success": True, "tree": tree})

    def search(self, space_id: ObjectId, query: str) -> None:
        with util.get_mongodb() as db:
            authorized = self._authorize(db, space_id, "read_files")
            if not authorized:
                return

            results = SpaceFiles(db).search(space_id, query)

        self.set_status(200)
        self.serialize_and_write({"success": True, "results": results})

    def create_folder(
        self, space_id: ObjectId, name: str, parent_id: Optional[ObjectId]
    ) -> None:
        with util.get_mongodb() as db:
            authorized = self._authorize(db, space_id, "write_files")
            if not authorized:
                return

            try:
                folder = SpaceFiles(db).create_folder(
                    space_id, name, self.current_user.username, parent_id
                )
            except (
                InvalidFileNameError,
                FileNodeDoesntExistError,
                NotAFolderError,
                ReadOnlyNodeError,
                FolderDepthExceededError,
                FilenameCollisionError,
            ) as e:
                self._write_node_error(e)
                return

        self.set_status(200)
        self.serialize_and_write({"success": True, "folder": folder})

    async def upload_files(
        self, space_id: ObjectId, parent_id: Optional[ObjectId], file_objs: list
    ) -> None:
        with util.get_mongodb() as db:
            authorized = self._authorize(db, space_id, "write_files")
            if not authorized:
                return

            space_files = SpaceFiles(db)

            # validate names, sizes and the quota of all files up front, so that
            # a request with an invalid file doesn't store any of the others
            for file_obj in file_objs:
                try:
                    space_files.validate_name(file_obj["filename"])
                except InvalidFileNameError as e:
                    self._write_node_error(e)
                    return
                if len(file_obj["body"]) > space_files.MAX_FILE_SIZE_BYTES:
                    self._write_node_error(FileTooLargeError())
                    return

            total_size = sum(len(file_obj["body"]) for file_obj in file_objs)
            if (
                space_files.get_storage_usage(space_id) + total_size
                > space_files.MAX_SPACE_STORAGE_BYTES
            ):
                self._write_node_error(StorageQuotaExceededError())
                return

            stored = []
            for file_obj in file_objs:
                try:
                    stored.append(
                        await self._run_blocking(
                            space_files.add_file,
                            space_id,
                            file_obj["filename"],
                            file_obj["body"],
                            self.current_user.username,
                            parent_id,
                        )
                    )
                except (
                    InvalidFileNameError,
                    FileTooLargeError,
                    FileNodeDoesntExistError,
                    NotAFolderError,
                    ReadOnlyNodeError,
                    StorageQuotaExceededError,
                ) as e:
                    self._write_node_error(e)
                    return

        self.set_status(200)
        self.serialize_and_write({"success": True, "files": stored})

    def rename_node(self, space_id: ObjectId, node_id: ObjectId, name: str) -> None:
        with util.get_mongodb() as db:
            authorized = self._authorize(db, space_id, "write_files")
            if not authorized:
                return

            try:
                node = SpaceFiles(db).rename_node(space_id, node_id, name)
            except (
                FileNodeDoesntExistError,
                ReadOnlyNodeError,
                InvalidFileNameError,
                FilenameCollisionError,
            ) as e:
                self._write_node_error(e)
                return

        self.set_status(200)
        self.serialize_and_write({"success": True, "node": node})

    def move_node(
        self, space_id: ObjectId, node_id: ObjectId, parent_id: Optional[ObjectId]
    ) -> None:
        with util.get_mongodb() as db:
            authorized = self._authorize(db, space_id, "write_files")
            if not authorized:
                return

            try:
                node = SpaceFiles(db).move_node(space_id, node_id, parent_id)
            except (
                FileNodeDoesntExistError,
                NotAFolderError,
                ReadOnlyNodeError,
                InvalidMoveTargetError,
                FolderDepthExceededError,
                FilenameCollisionError,
            ) as e:
                self._write_node_error(e)
                return

        self.set_status(200)
        self.serialize_and_write({"success": True, "node": node})

    async def copy_file(
        self, space_id: ObjectId, node_id: ObjectId, parent_id: Optional[ObjectId]
    ) -> None:
        with util.get_mongodb() as db:
            authorized = self._authorize(db, space_id, "write_files")
            if not authorized:
                return

            try:
                node = await self._run_blocking(
                    SpaceFiles(db).copy_file,
                    space_id,
                    node_id,
                    parent_id,
                    self.current_user.username,
                )
            except (
                FileNodeDoesntExistError,
                NotAFileError,
                NotAFolderError,
                ReadOnlyNodeError,
                StorageQuotaExceededError,
                FileDoesntExistError,
            ) as e:
                self._write_node_error(e)
                return

        self.set_status(200)
        self.serialize_and_write({"success": True, "node": node})

    async def delete_node(self, space_id: ObjectId, node_id: ObjectId) -> None:
        with util.get_mongodb() as db:
            authorized = self._authorize(db, space_id, "write_files")
            if not authorized:
                return

            try:
                await self._run_blocking(SpaceFiles(db).delete_node, space_id, node_id)
            except (FileNodeDoesntExistError, ReadOnlyNodeError) as e:
                self._write_node_error(e)
                return

        self.set_status(200)
        self.write({"success": True})
