import json

from bson.objectid import ObjectId
from datetime import datetime
import tornado.escape

from acl import ACL
from handlers.base_handler import BaseHandler, auth_needed
from logger_factory import get_logger, log_access
import util


logger = get_logger(__name__)


class PostHandler(BaseHandler):
    """
    Make a new post
    """

    def get(self):
        pass

    @log_access
    @auth_needed
    def post(self):
        """
        POST /posts
        IF id is in body, update post
        ELSE add new post
        http body (as form data, json here is only for readability):
            {
                "_id": "optional, _id, if supplied, the post is updated instead of freshly inserted",
                "text": "text_of_post",
                "tags": ["tag1", "tag2"], (json encoded list)
                "space": "optional, post this post into a space, not directly into your profile",
                "wordpress_post_id": "optional, id of associated wordpress post"
            }
        return:
            200 OK,
            {"status": 200,
             "success": True}

            400 Bad Request,
            {"status": 400,
             "success": False,
             "reason": "space_does_not_exist"}

            401 Unauthorized,
            {"status": 401,
             "success": False,
             "reason": "no_logged_in_user"}

            403 Forbidden
            {"status": 403,
             "success": False,
             "reason": "insufficient_permission"}

            403 Forbidden
            {"status": 403,
             "success": False,
             "reason": "user_not_author"}

            409 Conflict
            {"status": 409,
             "success": False,
             "reason": "post_doesnt_exist"}
        """

        _id = self.get_body_argument("_id", None)

        # no _id field means a new post is made
        if _id is None:
            author = self.current_user.username
            creation_date = datetime.utcnow()
            text = self.get_body_argument("text")  # http_body['text']
            wordpress_post_id = self.get_body_argument("wordpress_post_id", None)
            tags = self.get_body_argument("tags")  # http_body['tags']
            # convert tags to list, because formdata will send it as a string
            try:
                tags = json.loads(tags)
            except Exception:
                pass
            # if space is set, this post belongs to a space (only visible inside)
            space = self.get_body_argument("space", None)

            # check if space exists, if not, end with 400 Bad Request
            if space is not None:
                existing_spaces = []
                for existing_space in self.db.spaces.find(
                    projection={"name": True, "_id": False}
                ):
                    existing_spaces.append(existing_space["name"])
                if space not in existing_spaces:
                    self.set_status(400)
                    self.write(
                        {
                            "status": 400,
                            "success": False,
                            "reason": "space_doesnt_exist",
                        }
                    )
                    return

                # space exists, now determine if user has permission
                # to post into that space, if not end with 403 insufficient permission
                user_can_post = False
                with ACL() as acl:
                    user_can_post = acl.space_acl.ask(
                        self.get_current_user_role(), space, "post"
                    )
                if not user_can_post:
                    self.set_status(403)
                    self.write(
                        {
                            "status": 403,
                            "success": False,
                            "reason": "insufficient_permission",
                        }
                    )
                    return

            # handle files
            file_amount = self.get_body_argument("file_amount", None)
            files = []
            if file_amount:
                # TODO store files in mongodb instead of filesystem
                # save every file
                for i in range(0, int(file_amount)):
                    file_obj = self.request.files["file" + str(i)][0]
                    with open(self.upload_dir + file_obj["filename"], "wb") as fp:
                        fp.write(file_obj["body"])

                    files.append(file_obj["filename"])

            post = {
                "author": author,
                "creation_date": creation_date,
                "text": text,
                "space": space,
                "pinned": False,
                "wordpress_post_id": wordpress_post_id,
                "tags": tags,
                "files": files,
                "comments": [],
                "likers": [],
            }

            self.db.posts.insert_one(post)

            self.set_status(200)
            self.write({"status": 200, "success": True})

        # _id field present in request, therefore update the existing post
        else:
            post = self.db.posts.find_one({"_id": ObjectId(_id)})
            # reject update if the post doesnt exist
            if not post:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

            # reject update if current_user is not the author
            if self.current_user.username != post["author"]:
                self.set_status(403)
                self.write(
                    {"status": 403, "success": False, "reason": "user_not_author"}
                )
                return

            # if the post is in a space, enforce write permission
            if post["space"]:
                user_can_post = False
                with ACL() as acl:
                    user_can_post = acl.space_acl.ask(
                        self.get_current_user_role(), post["space"], "post"
                    )
                if not user_can_post:
                    self.set_status(403)
                    self.write(
                        {
                            "status": 403,
                            "success": False,
                            "reason": "insufficient_permission",
                        }
                    )
                    return

            # update the text
            text = self.get_body_argument("text")
            self.db.posts.update_one(
                {"_id": ObjectId(_id)},
                {
                    "$set": {
                        "text": text,
                    }
                },
            )

            self.set_status(200)
            self.write({"status": 200, "success": True})

    @log_access
    @auth_needed
    async def delete(self):
        """
        DELETE /posts
            http_body:
                {
                    "post_id": <string>
                }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request,
                {"status": 400,
                 "success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request,
                {"status": 400,
                 "success": False,
                 "reason": "missing_key_in_http_body:post_id"}

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden,
                {"status": 403,
                 "success": False,
                 "reason": "insufficient_permission"}

                409 Conflict,
                {"status": 409,
                 "success": False,
                 "reason": "post_doesnt_exist"}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write(
                {"status": 400, "success": False, "reason": "json_parsing_error"}
            )
            return

        if "post_id" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "missing_key_in_http_body:post_id",
                }
            )
            return

        post_to_delete = self.db.posts.find_one(
            {"_id": ObjectId(http_body["post_id"])},
        )

        if not post_to_delete:
            self.set_status(409)
            self.write({"status": 409, "success": False, "reason": "post_doesnt_exist"})
            return

        # if the post is in a space, one of the following allows the user to delete the post:
        # 1. user is author of the post
        # 2. user is lionet global admin
        # 3. user is space admin
        # 4. user is platform admin (check this last because it is the slowest request)
        if post_to_delete["space"]:
            if self.current_user.username != post_to_delete["author"]:
                if not self.is_current_user_lionet_admin():
                    space = self.db.spaces.find_one({"name": post_to_delete["space"]})
                    if self.current_user.username not in space["admins"]:
                        if not await util.is_platform_admin(self.current_user.username):
                            # none of the four permission cases apply, deny removal
                            self.set_status(403)
                            self.write(
                                {
                                    "status": 403,
                                    "success": False,
                                    "reason": "insufficient_permission",
                                }
                            )
                            return

            # one of the four conditions applied, remove the post
            self.db.posts.delete_one({"_id": post_to_delete["_id"]})

        # if the post is not in a space, the option to be space admin
        # to remove the post doesnt hold anymore, check only the other 3 options
        else:
            if self.current_user.username != post_to_delete["author"]:
                if not self.is_current_user_lionet_admin():
                    if not await util.is_platform_admin(self.current_user.username):
                        # none of the three permission cases apply, deny removal
                        self.set_status(403)
                        self.write(
                            {
                                "status": 403,
                                "success": False,
                                "reason": "insufficient_permission",
                            }
                        )
                        return

            # one of the three conditions applied, remove the post
            self.db.posts.delete_one({"_id": ObjectId(http_body["post_id"])})

        self.set_status(200)
        self.write({"status": 200, "success": True})


class CommentHandler(BaseHandler):
    """
    Make a new comment to a certain post
    """

    def get(self):
        pass

    @log_access
    @auth_needed
    def post(self):
        """
        POST /comment
        http body:
            {
                "text": "content_of_comment",
                "post_id": "id_of_post"
            }
        return:
            200 OK
            {"status": 200,
             "success": True}

            400 Bad Request
            {"status": 400,
             "success": False,
             "reason": "json_parsing_error"}

            400 Bad Request
            {"status": 400,
             "success": False,
             "reason": "missing_key_in_http_body:post_id"}

            401 Unauthorized
            {"status": 401,
             "reason": "no_logged_in_user"}

            403 Forbidden
            {"status": 403,
             "success": False,
             "reason": "insufficient_permission"}

            409 Conflict
            {"status": 409,
             "success": False,
             "reason": "post_doesnt_exist"}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write(
                {"status": 400, "success": False, "reason": "json_parsing_error"}
            )
            return

        if "post_id" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "missing_key_in_http_body:post_id",
                }
            )
            return

        post_ref = ObjectId(http_body["post_id"])

        post = self.db.posts.find_one({"_id": post_ref})
        if not post:
            self.set_status(409)
            self.write({"status": 409, "success": False, "reason": "post_doesnt_exist"})
            return

        # if post is in a space, we have to check the permissions to comment
        if post["space"]:
            with ACL() as acl:
                if not acl.space_acl.ask(
                    self.get_current_user_role(), post["space"], "comment"
                ):
                    self.set_status(403)
                    self.write(
                        {
                            "status": 403,
                            "success": False,
                            "reason": "insufficient_permission",
                        }
                    )
                    return

        author = self.current_user.username
        creation_date = datetime.utcnow()
        text = http_body["text"]

        self.db.posts.update_one(
            {"_id": post_ref},  # filter
            {  # update
                "$push": {
                    "comments": {
                        "_id": ObjectId(),
                        "author": author,
                        "creation_date": creation_date,
                        "text": text,
                        "pinned": False,
                    }
                }
            },
        )

        self.set_status(200)
        self.write({"status": 200, "success": True})

    @log_access
    @auth_needed
    async def delete(self):
        """
        DELETE /comment
            http_body:
                {
                    "comment_id": <string>
                }

            returns:
                200 OK
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key_in_http_body:comment_id"}

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "success": False,
                 "reason": "insufficient_permission"}

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "post_doesnt_exist"}

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "comment_doesnt_exist"}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write(
                {"status": 400, "success": False, "reason": "json_parsing_error"}
            )
            return

        if "comment_id" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "missing_key_in_http_body:comment_id",
                }
            )
            return

        comment_id = ObjectId(http_body["comment_id"])

        post = self.db.posts.find_one({"comments": {"$elemMatch": {"_id": comment_id}}})

        # reject if the post doesnt exist
        if not post:
            self.set_status(409)
            self.write({"status": 409, "success": False, "reason": "post_doesnt_exist"})
            return

        # reject if there are no comments at all, meaning the desired comment to delete cannot exist
        if not post["comments"]:
            self.set_status(409)
            self.write(
                {"status": 409, "success": False, "reason": "comment_doesnt_exist"}
            )
            return

        # search for the desired comment
        comment = None
        for comment_iter in post["comments"]:
            if comment_iter["_id"] == comment_id:
                comment = comment_iter
                break

        # reject if the comment was not found
        if not comment:
            self.set_status(409)
            self.write(
                {"status": 409, "success": False, "reason": "comment_doesnt_exist"}
            )
            return

        # if the post is in a space,
        # one of the following allows the user to delete the desired comment:
        # 1. user is author of the comment
        # 2. user is lionet global admin
        # 3. user is space admin
        # 4. user is platform admin (check this last because it is the slowest request)
        if post["space"]:
            if self.current_user.username != comment["author"]:
                if not self.is_current_user_lionet_admin():
                    space = self.db.spaces.find_one({"name": post["space"]})
                    if self.current_user.username not in space["admins"]:
                        if not await util.is_platform_admin(self.current_user.username):
                            # none of the four permission cases apply, deny removal
                            self.set_status(403)
                            self.write(
                                {
                                    "status": 403,
                                    "success": False,
                                    "reason": "insufficient_permission",
                                }
                            )
                            return

            # one of the four conditions applied, remove the post
            self.db.posts.update_one(
                {"_id": post["_id"]},  # filter
                {"$pull": {"comments": {"_id": comment_id}}},  # update
            )

        # if the post is not in a space, the option to be space admin
        # to remove the comment doesnt hold anymore, check only the other 3 options
        else:
            if self.current_user.username != comment["author"]:
                if not self.is_current_user_lionet_admin():
                    if not await util.is_platform_admin(self.current_user.username):
                        # none of the three permission cases apply, deny removal
                        self.set_status(403)
                        self.write(
                            {
                                "status": 403,
                                "success": False,
                                "reason": "insufficient_permission",
                            }
                        )
                        return

            # one of the three conditions applied, remove the post
            self.db.posts.update_one(
                {"_id": post["_id"]},  # filter
                {"$pull": {"comments": {"_id": comment_id}}},  # update
            )

        self.set_status(200)
        self.write({"status": 200, "success": True})


class LikePostHandler(BaseHandler):
    @log_access
    @auth_needed
    def post(self):
        """
        POST /like
            http body:
                {
                    "post_id": "id_of_post_to_like"
                }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body:post_id"}

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write(
                {"status": 400, "success": False, "reason": "json_parsing_error"}
            )
            return

        if "post_id" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "missing_key_in_http_body:post_id",
                }
            )
            return

        self.db.posts.update_one(
            {"_id": ObjectId(http_body["post_id"])},  # filter
            {"$addToSet": {"likers": self.current_user.username}},  # update
        )

        self.set_status(200)
        self.write({"status": 200, "success": True})

    @log_access
    @auth_needed
    def delete(self):
        """
        DELETE /like
            http_body:
                {
                    "post_id": <string>
                }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key_in_http_body:post_id"}

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write(
                {"status": 400, "success": False, "reason": "json_parsing_error"}
            )
            return

        if "post_id" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "missing_key_in_http_body:post_id",
                }
            )
            return

        self.db.posts.update_one(
            {"_id": ObjectId(http_body["post_id"])},
            {"$pull": {"likers": self.current_user.username}},
        )

        self.set_status(200)
        self.write({"status": 200, "success": True})


class RepostHandler(BaseHandler):
    @log_access
    @auth_needed
    def post(self):
        """
        POST /repost
            create new repost:
                http body:
                    {
                        "post_id": "id_of_post",
                        "text": "new text for the repost",
                        "space": "the space where to post, None if no space"
                    }
            or update existing repost:
                http_body:
                    {
                        "_id": "id_of_repost",
                        "text": "updated_repost_text"
                    }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write(
                {"status": 400, "success": False, "reason": "json_parsing_error"}
            )
            return

        # in both cases test has to be in http body
        if "text" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "missing_key_in_http_body:text",
                }
            )
            return

        # no _id field in the request means a new repost is made (not to confuse with post_id, which is the _id of the original post that is being reposted here)
        if "_id" not in http_body:
            if "post_id" not in http_body:
                self.set_status(400)
                self.write(
                    {
                        "status": 400,
                        "success": False,
                        "reason": "missing_key_in_http_body:post_id",
                    }
                )
                return

            if "space" not in http_body:
                self.set_status(400)
                self.write(
                    {
                        "status": 400,
                        "success": False,
                        "reason": "missing_key_in_http_body:space",
                    }
                )
                return

            post_ref = ObjectId(http_body["post_id"])
            text = http_body["text"]

            post = self.db.posts.find_one({"_id": post_ref})

            # reject if original post doesnt exist
            if not post:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

            # TODO move this profile stuff to requesting timeline
            # because saving this info to the post is useless since it is changeable
            # when requesting timeline, up to date info is grabbed from profiles collection
            profile = self.db.profiles.find_one({"user": self.current_user.username})
            if profile:
                if "profile_pic" in profile:
                    post["repostAuthorProfilePic"] = profile["profile_pic"]
            post["isRepost"] = True
            post["repostAuthor"] = self.current_user.username
            post["originalCreationDate"] = post["creation_date"]
            post["creation_date"] = datetime.utcnow()
            post["repostText"] = text

            space_name = http_body["space"]

            # user requested to post into space
            # --> check if space exists
            if space_name is not None:
                space = self.db.spaces.find_one({"name": space_name})
                if not space:
                    self.set_status(409)
                    self.write(
                        {
                            "status": 409,
                            "success": False,
                            "reason": "space_doesnt_exist",
                        }
                    )
                    return

                # space exists, but also determine if user has permission
                # to post into that space
                user_can_post = False
                with ACL() as acl:
                    user_can_post = acl.space_acl.ask(
                        self.get_current_user_role(), space_name, "post"
                    )
                if not user_can_post:
                    self.set_status(403)
                    self.write(
                        {
                            "status": 403,
                            "success": False,
                            "reason": "insufficient_permission",
                        }
                    )
                    return

            # TODO make an explicit dict here (once profile stuff is moved to timeline)
            post["space"] = space_name
            del post["_id"]
            if "likers" in post:
                del post["likers"]
            if "comments" in post:
                del post["comments"]
            if "tags" in post:
                post["tags"] = ""

            self.db.posts.insert_one(post)

            self.set_status(200)
            self.write({"status": 200, "success": True})

        # _id was specified in the request: update the existing repost
        else:
            _id = ObjectId(http_body["_id"])
            repost = self.db.posts.find_one({"_id": _id})

            if not repost:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

            # reject if it is actually a normal post instead of a repost
            if "isRepost" not in repost or repost["isRepost"] == False:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_is_no_repost"}
                )
                return

            # reject if user is not the author
            if repost["repostAuthor"] != self.current_user.username:
                self.set_status(403)
                self.write(
                    {
                        "status": 403,
                        "success": False,
                        "reason": "user_not_author",
                    }
                )
                return

            # if post is in a space, reject if the user has no posting permission
            if repost["space"]:
                user_can_post = False
                with ACL() as acl:
                    user_can_post = acl.space_acl.ask(
                        self.get_current_user_role(), repost["space"], "post"
                    )
                if not user_can_post:
                    self.set_status(403)
                    self.write(
                        {
                            "status": 403,
                            "success": False,
                            "reason": "insufficient_permission",
                        }
                    )
                    return

            text = http_body["text"]

            self.db.posts.update_one(
                {"_id": _id},
                {
                    "$set": {
                        "repostText": text,
                    }
                },
                upsert=True,
            )

            self.set_status(200)
            self.write({"status": 200, "success": True})


class PinHandler(BaseHandler):
    def get_space(self, space_name):
        return self.db.spaces.find_one({"name": space_name})

    async def check_space_or_global_admin(self, space_name):
        space = self.get_space(space_name)
        if space is not None:
            if (
                (self.current_user.username in space["admins"])
                or (self.get_current_user_role() == "admin")
                or (await util.is_platform_admin(self.current_user.username))
            ):
                return True
            else:
                return False
        else:
            raise ValueError("Space doesnt exist")

    @log_access
    @auth_needed
    async def post(self):
        """
        POST /pin
            pin a post or comment (posts are only pinnable if they are in a space)
                post -> only group admin or global admin
                comment -> any admin or creator of post
            http body:
                {
                    "id": "id_of_post_or_comment"
                    "pin_type": "<post> or <comment>" (depending on what to pin)
                }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """
        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write(
                {"status": 400, "success": False, "reason": "json_parsing_error"}
            )
            return

        if "id" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "missing_key_in_http_body:id",
                }
            )
            return

        if "pin_type" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "missing_key_in_http_body:pin_type",
                }
            )
            return

        if http_body["pin_type"] == "post":
            post = self.db.posts.find_one({"_id": ObjectId(http_body["id"])})
            if not post:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

            # reject pin if post is not in a space
            if post["space"] is None:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_not_in_space"}
                )
                return

            try:
                # check if user is either space admin or global admin
                if not await self.check_space_or_global_admin(post["space"]):
                    # user is no group admin nor global admin --> no permission to pin
                    self.set_status(403)
                    self.write(
                        {
                            "status": 403,
                            "success": False,
                            "reason": "insufficient_permission",
                        }
                    )
                    return
            except ValueError:
                # getting space threw an error --> reject because space doesnt exist
                self.set_status(409)
                self.write(
                    {
                        "status": 409,
                        "success": False,
                        "reason": "space_doesnt_exist",
                    }
                )
                return

            # set the pin
            self.db.posts.update_one(
                {"_id": ObjectId(http_body["id"])},  # filter
                {"$set": {"pinned": True}},
            )

            self.set_status(200)
            self.write({"status": 200, "success": True})

        elif http_body["pin_type"] == "comment":
            post = self.db.posts.find_one({"comments._id": ObjectId(http_body["id"])})
            if not post:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

            # have to check if the post was in a space first, because then also the space admin may pin comments
            if "space" in post and post["space"] is not None:
                # deny pin if user is neither global admin, space admin nor post author
                try:
                    if not (
                        # check admin first even though it is slower, because
                        # that way we automatically check if the space exists
                        await self.check_space_or_global_admin(post["space"])
                        or self.current_user.username == post["author"]
                    ):
                        self.set_status(403)
                        self.write(
                            {
                                "status": 403,
                                "success": False,
                                "reason": "insufficient_permission",
                            }
                        )
                        return
                except ValueError:
                    # getting the space threw an error --> space doesnt exist
                    self.set_status(409)
                    self.write(
                        {
                            "status": 409,
                            "success": False,
                            "reason": "space_doesnt_exist",
                        }
                    )
                    return

                # set the pin
                self.db.posts.update_one(
                    {"comments._id": ObjectId(http_body["id"])},  # filter
                    {"$set": {"comments.$.pinned": True}},
                )

                self.set_status(200)
                self.write({"status": 200, "success": True})

            else:
                # post was not in space, only post author or global admin have permission to pin
                if not (
                    self.current_user.username == post["author"]
                    or self.get_current_user_role() == "admin"
                ):
                    self.set_status(403)
                    self.write(
                        {
                            "status": 403,
                            "success": False,
                            "reason": "insufficient_permission",
                        }
                    )
                    return

                # set the pin
                self.db.posts.update_one(
                    {"comments._id": ObjectId(http_body["id"])},  # filter
                    {"$set": {"comments.$.pinned": True}},
                )

                self.set_status(200)
                self.write({"status": 200, "success": True})

        else:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "invalid_pin_type_in_http_body",
                }
            )
            return

    @log_access
    @auth_needed
    async def delete(self):
        """
        DELETE /pin
            delete a pin of a post or a comment (posts are only pinnable if they are in a space)
                post -> only group admin or global admin
                comment -> any admin or creator of post
            http body:
                {
                    "id": "id_of_post_or_comment"
                    "pin_type": "<post> or <comment>" (depending on what to pin)
                }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write(
                {"status": 400, "success": False, "reason": "json_parsing_error"}
            )
            return

        if "id" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "missing_key_in_http_body:id",
                }
            )
            self.finish()
            return

        if "pin_type" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "missing_key_in_http_body:pin_type",
                }
            )
            self.finish()
            return

        if http_body["pin_type"] == "post":
            post = self.db.posts.find_one({"_id": ObjectId(http_body["id"])})
            # reject if post doesnt exist
            if not post:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

            # reject unpin if post is not in a space
            if post["space"] is None:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_not_in_space"}
                )
                return
            try:
                # reject if the user is neither space nor global admin
                if not await self.check_space_or_global_admin(post["space"]):
                    self.set_status(403)
                    self.write(
                        {
                            "status": 403,
                            "success": False,
                            "reason": "insufficient_permission",
                        }
                    )
                    return
            except ValueError:
                # error was thrown during space request --> space doesnt exist
                self.set_status(409)
                self.write(
                    {
                        "status": 409,
                        "success": False,
                        "reason": "space_doesnt_exist",
                    }
                )
                return

            # unset the pin
            self.db.posts.update_one(
                {"_id": ObjectId(http_body["id"])},  # filter
                {"$set": {"pinned": False}},
            )

            self.set_status(200)
            self.write({"status": 200, "success": True})

        elif http_body["pin_type"] == "comment":
            post = self.db.posts.find_one({"comments._id": ObjectId(http_body["id"])})
            if not post:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

            # have to check if the post was in a space first, because then also the space admin may unpin comments
            if "space" in post and post["space"] is not None:
                # deny unpin if user is neither global admin, space admin nor post author
                try:
                    if not (
                        # check admin first even though it is slower, because
                        # that way we automatically check if the space exists
                        await self.check_space_or_global_admin(post["space"])
                        or self.current_user.username == post["author"]
                    ):
                        self.set_status(403)
                        self.write(
                            {
                                "status": 403,
                                "success": False,
                                "reason": "insufficient_permission",
                            }
                        )
                        return
                except ValueError:
                    # getting the space threw an error --> space doesnt exist
                    self.set_status(409)
                    self.write(
                        {
                            "status": 409,
                            "success": False,
                            "reason": "space_doesnt_exist",
                        }
                    )
                    return

                # unset the pin
                self.db.posts.update_one(
                    {"comments._id": ObjectId(http_body["id"])},  # filter
                    {"$set": {"comments.$.pinned": False}},
                )

                self.set_status(200)
                self.write({"status": 200, "success": True})

            else:
                # post was not in space, only post author or global admin have permission to unpin
                if not (
                    self.current_user.username == post["author"]
                    or self.get_current_user_role() == "admin"
                ):
                    self.set_status(403)
                    self.write(
                        {
                            "status": 403,
                            "success": False,
                            "reason": "insufficient_permission",
                        }
                    )
                    return

                # set the unpin
                self.db.posts.update_one(
                    {"comments._id": ObjectId(http_body["id"])},  # filter
                    {"$set": {"comments.$.pinned": False}},
                )

                self.set_status(200)
                self.write({"status": 200, "success": True})
        else:
            self.set_status(400)
            self.write(
                {
                    "status": 400,
                    "success": False,
                    "reason": "invalid_pin_type_in_http_body",
                }
            )
            return
