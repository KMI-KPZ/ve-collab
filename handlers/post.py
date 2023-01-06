from datetime import datetime
import json
import logging

from bson.objectid import ObjectId
import tornado.web

from handlers.base_handler import BaseHandler, auth_needed
from resources.acl import ACL
from resources.post import (
    AlreadyLikerException,
    NotLikerException,
    Posts,
    PostNotExistingException,
)
from resources.space import FileAlreadyInRepoError, Spaces, SpaceDoesntExistError

logger = logging.getLogger(__name__)


class PostHandler(BaseHandler):
    """
    Make a new post
    """

    def get(self):
        pass

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
                with Spaces() as db_manager:
                    if not db_manager.check_space_exists(space):
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

            with Posts() as post_manager:

                # handle files
                file_amount = self.get_body_argument("file_amount", None)
                files = []
                if file_amount:
                    # save every file
                    for i in range(0, int(file_amount)):
                        file_obj = self.request.files["file" + str(i)][0]

                        stored_id = post_manager.add_new_post_file(
                            file_obj["filename"],
                            file_obj["body"],
                            file_obj["content_type"],
                            self.current_user.username,
                        )

                        files.append(stored_id)

                        # if the post was in a space, also store the file in the repo,
                        # indicating it is part of a post by setting manually_uploaded to False
                        if space:
                            with Spaces() as space_manager:
                                try:
                                    space_manager.add_new_post_file(
                                        space,
                                        self.current_user.username,
                                        stored_id,
                                    )
                                except FileAlreadyInRepoError:
                                    pass

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

                with Posts() as db_manager:
                    db_manager.insert_post(post)

                self.set_status(200)
                self.write({"status": 200, "success": True})

        # _id field present in request, therefore update the existing post
        else:
            try:
                text = self.get_body_argument("text")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_body_argument:text"})
                return

            with Posts() as db_manager:
                post = db_manager.get_post(_id)

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
                try:
                    db_manager.update_post_text(_id, text)
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                    )
                    return

            self.set_status(200)
            self.write({"status": 200, "success": True})

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

        with Posts() as db_manager:
            post_to_delete = db_manager.get_post(http_body["post_id"])

            if not post_to_delete:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

            # if the post is in a space, one of the following allows the user to delete the post:
            # 1. user is author of the post
            # 2. user is lionet global admin
            # 3. user is space admin
            if post_to_delete["space"]:
                if self.current_user.username != post_to_delete["author"]:
                    if not self.is_current_user_lionet_admin():
                        with Spaces() as space_manager:
                            if not space_manager.check_user_is_space_admin(
                                post_to_delete["space"], self.current_user.username
                            ):
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
                try:
                    db_manager.delete_post(post_to_delete["_id"])
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                    )
                    return

            # if the post is not in a space, the option to be space admin
            # to remove the post doesnt hold anymore, check only the other 2 options
            else:
                if self.current_user.username != post_to_delete["author"]:
                    if not self.is_current_user_lionet_admin():
                        # none of the two permission cases apply, deny removal
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
                try:
                    db_manager.delete_post(post_to_delete["_id"])
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                    )
                    return

        self.set_status(200)
        self.write({"status": 200, "success": True})


class CommentHandler(BaseHandler):
    """
    Make a new comment to a certain post
    """

    def get(self):
        pass

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

        with Posts() as db_manager:
            post = db_manager.get_post(http_body["post_id"])

            # abort if post doesnt exist at all
            if not post:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
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

            # create and store the comment
            comment = {
                "author": self.current_user.username,
                "creation_date": datetime.utcnow(),
                "text": http_body["text"],
                "pinned": False,
            }
            try:
                db_manager.add_comment(post["_id"], comment)
            except PostNotExistingException:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

        self.set_status(200)
        self.write({"status": 200, "success": True})

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

        with Posts() as db_manager:
            comment_id = ObjectId(http_body["comment_id"])

            post = db_manager.get_post_by_comment_id(
                comment_id, projection={"comments": True, "space": True}
            )

            # reject if the post doesnt exist
            if not post:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

            # get the author of the desired comment
            comment_author = None
            for comment_iter in post["comments"]:
                if comment_iter["_id"] == comment_id:
                    comment_author = comment_iter["author"]
                    break

            # if the post is in a space,
            # one of the following allows the user to delete the desired comment:
            # 1. user is author of the comment
            # 2. user is lionet global admin
            # 3. user is space admin
            if post["space"]:
                if self.current_user.username != comment_author:
                    if not self.is_current_user_lionet_admin():
                        with Spaces() as space_manager:
                            if not space_manager.check_user_is_space_admin(
                                post["space"], self.current_user.username
                            ):
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
                try:
                    db_manager.delete_comment(comment_id, post_id=post["_id"])
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                    )
                    return

            # if the post is not in a space, the option to be space admin
            # to remove the comment doesnt hold anymore, check only the other 2 options
            else:
                if self.current_user.username != comment_author:
                    if not self.is_current_user_lionet_admin():
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

                # one of the two conditions applied, remove the post
                try:
                    db_manager.delete_comment(comment_id, post_id=post["_id"])
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                    )
                    return

        self.set_status(200)
        self.write({"status": 200, "success": True})


class LikePostHandler(BaseHandler):

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

                304 Not Modified
                --> current_user already likes the post

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

        with Posts() as db_manager:
            try:
                db_manager.like_post(http_body["post_id"], self.current_user.username)
            except AlreadyLikerException:
                self.set_status(304)
                return
            except PostNotExistingException:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

        self.set_status(200)
        self.write({"status": 200, "success": True})

    @auth_needed
    def delete(self):
        """
        DELETE /like
            remove your like from the post
            http_body:
                {
                    "post_id": <string>
                }

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                304 Not Modified
                --> user hadn't liked the post before

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

        with Posts() as db_manager:
            try:
                db_manager.unlike_post(http_body["post_id"], self.current_user.username)
            except NotLikerException:
                self.set_status(304)
                return
            except PostNotExistingException:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

        self.set_status(200)
        self.write({"status": 200, "success": True})


class RepostHandler(BaseHandler):

    @auth_needed
    def post(self):
        """
        POST /repost
            create new repost:
                http body:
                    {
                        "post_id": "id_of__original_post",
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
                 "success": False,
                 "reason": "json_parsing_error"}
                (http body is not valid json)

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key_in_http_body:text"}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key_in_http_body:post_id"}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key_in_http_body:space"}

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}
                (no valid session, you will be redirect to login automatically)

                403 Forbidden
                {"status": 403,
                 "success": False,
                 "reason": "insufficient_permissions"}
                (acl forbids action (might also require admin role sometimes))

                403 Forbidden
                {"status": 403,
                 "success": False,
                 "reason": "user_not_author"}
                (when updating your repost, you have to be the author of it)

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "post_doesnt_exist"}

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "post_is_no_repost"}
                (the updating post is not a repost, use post-endpoint instead)
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write(
                {"status": 400, "success": False, "reason": "json_parsing_error"}
            )
            return

        # in both cases text has to be in http body
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

            with Posts() as db_manager:
                post = db_manager.get_post(http_body["post_id"])

                # reject if original post doesnt exist
                if not post:
                    self.set_status(409)
                    self.write(
                        {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                    )
                    return

                space_name = http_body["space"]
                # user requested to post into space
                # --> check if space exists
                if space_name is not None:
                    with Spaces() as space_manager:
                        if not space_manager.check_space_exists(space_name):
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

                # set values for repost and remove old values of original post in the copy
                post["isRepost"] = True
                post["repostAuthor"] = self.current_user.username
                post["originalCreationDate"] = post["creation_date"]
                post["creation_date"] = datetime.utcnow()
                post["repostText"] = http_body["text"]
                post["space"] = space_name
                post["likers"] = []
                post["comments"] = []
                post["tags"] = []
                del post["_id"]

                db_manager.insert_repost(post)

                self.set_status(200)
                self.write({"status": 200, "success": True})

        # _id was specified in the request: update the existing repost
        else:
            with Posts() as db_manager:
                repost = db_manager.get_post(
                    http_body["_id"],
                    projection={"isRepost": True, "repostAuthor": True, "space": True},
                )

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

                # if repost is in a space, reject if the user has no posting permission
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

                try:
                    db_manager.update_repost_text(http_body["_id"], http_body["text"])
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {
                            "status": 409,
                            "success": False,
                            "reason": "post_doesnt_exist",
                        }
                    )
                    return

            self.set_status(200)
            self.write({"status": 200, "success": True})


class PinHandler(BaseHandler):
    def check_space_or_global_admin(self, space_name) -> bool:
        """
        check if the current user is either space admin or global admin
        :return: True if user is any of those admins, False otherwise
        :raises: ValueError, if space doesnt exist
        """

        with Spaces() as db_manager:
            try:
                if (
                    db_manager.check_user_is_space_admin(
                        space_name, self.current_user.username
                    )
                ) or (self.get_current_user_role() == "admin"):
                    return True
                else:
                    return False
            except SpaceDoesntExistError:
                raise  # just re-raise the exception to the caller (handler)

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
                 "success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key_in_http_body:id"}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key_in_http_body:pin_type"}

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "success": False,
                 "reason": "insufficient_permission"}
                (acl forbids action (might also require admin role sometimes))

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "post_doesnt_exist"}

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "post_not_in_space"}
                (a post can only be (un-)pinned, if it is in a space)
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
            with Posts() as db_manager:
                post = db_manager.get_post(http_body["id"], projection={"space": True})

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
                    if not self.check_space_or_global_admin(post["space"]):
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
                except SpaceDoesntExistError:
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
                try:
                    db_manager.pin_post(http_body["id"])
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {
                            "status": 409,
                            "success": False,
                            "reason": "post_doesnt_exist",
                        }
                    )
                    return

            self.set_status(200)
            self.write({"status": 200, "success": True})

        elif http_body["pin_type"] == "comment":
            with Posts() as db_manager:
                post = db_manager.get_post_by_comment_id(
                    http_body["id"], projection={"space": True, "author": True}
                )

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
                            self.check_space_or_global_admin(post["space"])
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
                    except SpaceDoesntExistError:
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
                    try:
                        db_manager.pin_comment(http_body["id"])
                    except PostNotExistingException:
                        self.set_status(409)
                        self.write(
                            {
                                "status": 409,
                                "success": False,
                                "reason": "post_doesnt_exist",
                            }
                        )
                        return

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
                    try:
                        db_manager.pin_comment(http_body["id"])
                    except PostNotExistingException:
                        self.set_status(409)
                        self.write(
                            {
                                "status": 409,
                                "success": False,
                                "reason": "post_doesnt_exist",
                            }
                        )
                        return

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
                 "success": False,
                 "reason": "json_parsing_error"}
                (http body is not valid json)

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key_in_http_body:id"}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "missing_key_in_http_body:pin_type"}

                400 Bad Request
                {"status": 400,
                 "success": False,
                 "reason": "invalid_pin_type_in_http_body"}
                (pin_type is neither "post" nor "comment")

                401 Unauthorized
                {"status": 401,
                 "success": False,
                 "reason": "no_logged_in_user"}
                (no valid session, you will be redirected to login automatically)

                403 Forbidden
                {"status": 403,
                 "success": False,
                 "reason": "insufficient_permission"}
                (acl forbids action (might also require admin role sometimes))

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "post_doesnt_exist"}

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "space_doesnt_exist"}

                409 Conflict
                {"status": 409,
                 "success": False,
                 "reason": "post_not_in_space"}
                (a post can only be (un-)pinned, if it is in a space)
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
            with Posts() as db_manager:
                post = db_manager.get_post(http_body["id"], projection={"space": True})

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
                    if not self.check_space_or_global_admin(post["space"]):
                        self.set_status(403)
                        self.write(
                            {
                                "status": 403,
                                "success": False,
                                "reason": "insufficient_permission",
                            }
                        )
                        return
                except SpaceDoesntExistError:
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
                try:
                    db_manager.unpin_post(http_body["id"])
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {
                            "status": 409,
                            "success": False,
                            "reason": "post_doesnt_exist",
                        }
                    )
                    return

            self.set_status(200)
            self.write({"status": 200, "success": True})

        elif http_body["pin_type"] == "comment":
            with Posts() as db_manager:
                post = db_manager.get_post_by_comment_id(
                    http_body["id"], projection={"space": True, "author": True}
                )

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
                            self.check_space_or_global_admin(post["space"])
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
                    except SpaceDoesntExistError:
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
                    db_manager.unpin_comment(http_body["id"])

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
                    try:
                        db_manager.unpin_comment(http_body["id"])
                    except PostNotExistingException:
                        self.set_status(409)
                        self.write(
                            {
                                "status": 409,
                                "success": False,
                                "reason": "post_doesnt_exist",
                            }
                        )
                        return

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
