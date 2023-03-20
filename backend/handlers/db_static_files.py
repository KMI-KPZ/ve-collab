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


class GridFSStaticFileHandler(tornado.web.StaticFileHandler, BaseHandler):
    """
    use just like a normal static file handler, e.g.:
    (r"/uploads/(.*)", tornado.web.StaticFileHandler, {"path": ""}),
    path needs to be supplied because of the tornado internals, but its value has
    absolutely no use
    """

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

        with pymongo.MongoClient(
            global_vars.mongodb_host,
            global_vars.mongodb_port,
            username=global_vars.mongodb_username,
            password=global_vars.mongodb_password,
        ) as client:
            db = client[global_vars.mongodb_db_name]
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

    def validate_absolute_path(self, root: str, absolute_path: str) -> Optional[str]:
        """
        overridden
        validate that there is a valid session (self.current_user),
        do necessary permission checks with it (TODO),
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

        with pymongo.MongoClient(
            global_vars.mongodb_host,
            global_vars.mongodb_port,
            username=global_vars.mongodb_username,
            password=global_vars.mongodb_password,
        ) as client:
            db = client[global_vars.mongodb_db_name]
            fs = gridfs.GridFS(db)

            try:
                self.file = fs.get(absolute_path)
                return absolute_path
            except gridfs.NoFile:
                raise tornado.web.HTTPError(404)

    def get_content_type(self) -> str:
        """
        overridden
        get content type to match the content type of the uploaded file,
        very important, otherwise content type header is octet-stream and will always
        download every file instead of e.g. displaying images in browser
        """

        return self.file.content_type
