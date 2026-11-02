import datetime
from typing import Generator, Optional

from bson.errors import InvalidId
from bson.objectid import ObjectId
import gridfs
import pymongo
import tornado.web
import tornado.ioloop

import global_vars
from handlers.base_handler import BaseHandler
from resources.network.acl import ACL
from resources.network.space import Spaces
from resources.network.space_files import SpaceFiles
import util


class GridFSStaticFileHandler(tornado.web.StaticFileHandler, BaseHandler):
    """
    use just like a normal static file handler, e.g.:
    (r"/uploads/(.*)", tornado.web.StaticFileHandler, {"path": ""}),
    path needs to be supplied because of the tornado internals, but its value has
    absolutely no use
    """

    # whether the requested file belongs to a space's file share (set while validating)
    is_space_file = False

    def options(self, slug):
        # no body
        self.set_status(200)
        self.finish()

    @classmethod
    def get_content(
        cls, abspath: str, start: Optional[int] = None, end: Optional[int] = None
    ) -> Generator[bytes, None, None]:
        """
        overridden
        because this is a classmethod, content has to be queried from mongo again,
        making this an instance method crashes caching,
        permissions need no to be checked again, because `validate_absolute_path` has
        already done that
        """

        # default pictures have no ObjectId as _id, but their names
        # so we have to make an exception if they are requested
        if (
            abspath == "default_profile_pic.jpg"
            or abspath == "default_group_pic.jpg"
            or abspath == "logo.png"
        ):
            pass
        else:
            abspath = ObjectId(abspath)

        with util.get_mongodb() as db:
            fs = gridfs.GridFS(db)

            # get file from gridfs
            try:
                file = fs.get(abspath)
            except gridfs.NoFile:
                raise tornado.web.HTTPError(404)

            # chunk it if desired by parameters
            if start is not None:
                file.seek(start)
            if end is not None:
                remaining = end - (start or 0)
            else:
                remaining = None
            while True:
                chunk_size = 64 * 1024
                if remaining is not None and remaining < chunk_size:
                    chunk_size = remaining
                chunk = file.read(chunk_size)
                if chunk:
                    if remaining is not None:
                        remaining -= len(chunk)
                    yield chunk
                else:
                    if remaining is not None:
                        assert remaining == 0
                    return

    def get_content_size(self) -> int:
        """
        overridden
        """

        return self.file.length

    def get_modified_time(self) -> Optional[datetime.datetime]:
        """
        overridden
        files dont get modified, so we just return the upload time
        """

        return self.file.upload_date

    @classmethod
    def get_absolute_path(cls, root: str, path: str) -> str:
        """
        overridden
        just return relative path, which is the stub
        from the url matcher regex that contains the filename
        """

        return path

    def _check_space_file_permission(self, db, file_id: ObjectId) -> bool:
        """
        if the file belongs to the file share of a space, the current user
        has to be a member of that space with the "read_files" permission
        (or a space/global admin), otherwise reply 403. This includes the
        attachments of posts in the space, which are mirrored into its file share.
        Files that are not part of any space's file share (profile pictures,
        personal post attachments, ...) are not restricted here.

        Returns whether the file belongs to a space's file share.
        """

        node = SpaceFiles(db).get_node_by_file_id(file_id)
        if node is None:
            return False

        if self.is_current_user_lionet_admin():
            return True

        space = Spaces(db).get_space(
            node["space"], projection={"_id": True, "members": True, "admins": True}
        )
        if space is None:
            # orphaned reference, nothing to protect anymore
            return True

        username = self.current_user.username
        if username in space["admins"]:
            return True

        if username not in space["members"]:
            raise tornado.web.HTTPError(403)

        try:
            if not ACL(db).space_acl.ask(username, space["_id"], "read_files"):
                raise tornado.web.HTTPError(403)
        except ValueError:
            raise tornado.web.HTTPError(403)

        return True

    def validate_absolute_path(self, root: str, absolute_path: str) -> Optional[str]:
        """
        overridden
        validate that there is a valid session (self.current_user),
        check that the user may access the file if it belongs to a space's
        file share (403 if not),
        check if the file exists (404 if not),
        set the file as instance attribute (that way other functions
        dont need to request from gridfs again and again)
        """

        # check user is authenticated
        if not self.current_user:
            raise tornado.web.HTTPError(401)

        if (
            absolute_path == "default_profile_pic.jpg"
            or absolute_path == "default_group_pic.jpg"
            or absolute_path == "logo.png"
        ):
            pass
        else:
            try:
                absolute_path = ObjectId(absolute_path)
            except InvalidId:
                raise tornado.web.HTTPError(404)

        with util.get_mongodb() as db:
            fs = gridfs.GridFS(db)

            try:
                self.file = fs.get(absolute_path)
            except gridfs.NoFile:
                raise tornado.web.HTTPError(404)

            self.is_space_file = isinstance(
                absolute_path, ObjectId
            ) and self._check_space_file_permission(db, absolute_path)

            return absolute_path

    def set_extra_headers(self, path: str) -> None:
        """
        overridden
        uploads are user content: browsers must not guess another type than the
        stored one, and if a file is ever rendered as a document (e.g. an html
        or svg file), the sandbox keeps it from running scripts in this origin.
        Files of a space's file share are permission-checked, so they may only
        be cached privately and have to be revalidated (i.e. checked) on every use.
        """

        self.set_header("X-Content-Type-Options", "nosniff")
        self.set_header("Content-Security-Policy", "sandbox")
        if self.is_space_file:
            self.set_header("Cache-Control", "private, no-cache")

    def get_content_type(self) -> str:
        """
        overridden
        get content type to match the content type of the uploaded file,
        very important, otherwise content type header is octet-stream and will always
        download every file instead of e.g. displaying images in browser
        """

        return util.gridfs_content_type(self.file) or "application/octet-stream"
