import datetime
import json
import logging

from bson.objectid import ObjectId
import tornado.web

from error_reasons import (
    INSUFFICIENT_PERMISSIONS,
    MISSING_KEY_SLUG,
    POST_DOESNT_EXIST,
    SPACE_DOESNT_EXIST,
)
from exceptions import PlanDoesntExistError
from handlers.base_handler import BaseHandler, auth_needed
from resources.network.acl import ACL
from resources.network.post import (
    AlreadyLikerException,
    NotLikerException,
    Posts,
    PostNotExistingException,
)
from model import VEPlan
from resources.planner.ve_plan import VEPlanResource
from resources.network.profile import Profiles
from resources.network.space import (
    FileAlreadyInRepoError,
    Spaces,
    SpaceDoesntExistError,
)
from resources.planner.ve_plan import VEPlanResource
from handlers.network.timeline import BaseTimelineHandler
import util
import copy

# logger = logging.getLogger(__name__)


class PostHandler(BaseTimelineHandler):
    """
    Make a new post
    """

    def get(self):
        """
        GET /posts
            retrieve a post by its id (obeying the visibility/access rules)

            query params:
                post_id: id of the post to retrieve

            http body:
                None

            returns:
                200 OK,
                {"status": 200,
                 "success": True,
                 "post": {post}}

                400 Bad Request,
                {"status": 400,
                 "success": False,
                 "reason": "missing_query_param:post_id"}

                401 Unauthorized,
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
            post_id = self.get_argument("post_id")
        except tornado.web.MissingArgumentError:
            self.set_status(400)
            self.write({"success": False, "reason": MISSING_KEY_SLUG + "post_id"})
            return

        with util.get_mongodb() as db:
            post_manager = Posts(db)

            try:
                post = post_manager.get_post(post_id)
            except PostNotExistingException:
                self.set_status(409)
                self.write({"success": False, "reason": POST_DOESNT_EXIST})
                return

            # if the post is in a space, the user has to be a member and have
            # read_timeline permissions to see the post
            if post["space"]:
                space_manager = Spaces(db)
                space_id = util.parse_object_id(post["space"])
                try:
                    user_is_space_member = space_manager.check_user_is_member(
                        space_id, self.current_user.username
                    )
                except SpaceDoesntExistError:
                    self.set_status(409)
                    self.write({"success": False, "reason": SPACE_DOESNT_EXIST})
                    return

                if not user_is_space_member:
                    self.set_status(403)
                    self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                    return

                acl = ACL(db)
                if not acl.space_acl.ask(
                    self.current_user.username, space_id, "read_timeline"
                ):
                    self.set_status(403)
                    self.write({"success": False, "reason": INSUFFICIENT_PERMISSIONS})
                    return

        # permissions are fine, enhance the post with author profile details
        post = self.add_profile_information_to_author([post])[0]

        self.set_status(200)
        self.serialize_and_write({"success": True, "post": post})

    @auth_needed
    def post(self):
        """
        POST /posts
        IF id is in body, update post
        ELSE add new post (and return the inserted post)

        http body (as form data, json here is only for readability):
            {
                "_id": "optional, _id, if supplied, the post is updated instead of freshly inserted",
                "text": "text_of_post",
                "tags": ["tag1", "tag2"], (json encoded list)
                "space": "optional _id, post this post into a space, not directly into your profile",
                "wordpress_post_id": "optional, id of associated wordpress post"
                "plans": ["optional, list of plans to attach to the post"] (json encoded list)
            }
        return:
            200 OK,
            {"status": 200,
             "success": True,
             "inserted_post": {post}}

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

            409 Conflict
            {"status": 409,
             "success": False,
             "reason": "plan_doesnt_exist"}
        """

        _id = self.get_body_argument("_id", None)

        # no _id field means a new post is made
        if _id is None:
            author = self.current_user.username
            creation_date = datetime.datetime.now()
            text = self.get_body_argument("text")  # http_body['text']
            wordpress_post_id = self.get_body_argument("wordpress_post_id", None)
            tags = self.get_body_argument("tags", [])  # http_body['tags']
            plans = self.get_body_argument("plans", [])
            # convert tags and plans to list, because formdata will send it as a string

            try:
                tags = json.loads(tags)
            except Exception:
                pass

            try:
                plans = json.loads(plans)
            except Exception:
                pass

            # if space is set, this post belongs to a space (only visible inside)
            space_id = self.get_body_argument("space", None)

            with util.get_mongodb() as db:
                # check if space exists, if not, end with 400 Bad Request
                space_manager = Spaces(db)
                if space_id is not None:
                    space_id = util.parse_object_id(space_id)
                    if not space_manager.check_space_exists(space_id):
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
                    acl = ACL(db)
                    user_can_post = acl.space_acl.ask(
                        self.current_user.username, space_id, "post"
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

                post_manager = Posts(db)
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

                        files.append(
                            {
                                "file_id": stored_id,
                                "file_name": file_obj["filename"],
                                "file_type": file_obj["content_type"],
                                "author": self.current_user.username,
                            }
                        )

                        # if the post was in a space, also store the file in the repo,
                        # indicating it is part of a post by setting manually_uploaded to False
                        if space_id:
                            try:
                                space_manager.add_new_post_file(
                                    space_id,
                                    self.current_user.username,
                                    stored_id,
                                    file_obj["filename"],
                                )
                            except FileAlreadyInRepoError:
                                pass

                # if plans are referenced, they have to exist and
                # the user has to have write permission for them
                if plans:
                    plan_manager = VEPlanResource(db)
                    for plan_id in plans:
                        try:
                            plan = plan_manager.get_plan(plan_id)
                        except PlanDoesntExistError:
                            self.set_status(409)
                            self.write(
                                {
                                    "status": 409,
                                    "success": False,
                                    "reason": "plan_doesnt_exist",
                                }
                            )
                            return

                        # check if user has write permission for the plan
                        if (
                            self.current_user.username != plan.author
                            and self.current_user.username not in plan.write_access
                        ):
                            self.set_status(403)
                            self.write(
                                {
                                    "status": 403,
                                    "success": False,
                                    "reason": "insufficient_permission_plan",
                                }
                            )
                            return

                post = {
                    "author": author,
                    "creation_date": creation_date,
                    "text": text,
                    "space": space_id,
                    "pinned": False,
                    "wordpress_post_id": wordpress_post_id,
                    "tags": tags,
                    "plans": plans,
                    "files": files,
                    "comments": [],
                    "likers": [],
                }

                post_id = post_manager.insert_post(post)

                post["_id"] = post_id

                # enhance author with profile information
                profile_manager = Profiles(db)
                author_profile_snippet = profile_manager.get_profile_snippets([author])[
                    0
                ]
                post["author"] = author_profile_snippet

                # enhance the post with the full plan objects
                if post["plans"]:
                    plan_ids = []

                    for plan_id in post["plans"]:
                        if plan_id not in plan_ids:
                            plan_ids.append(plan_id)

                    plan_manager = VEPlanResource(db)
                    plans = plan_manager.get_bulk_plans(plan_ids)

                    # replace the plan_ids with the full plan objects
                    # post_plan_ids_copy = post["plans"].copy()
                    post["plans"] = []
                    for plan_id in plan_ids:
                        plan = self._filter_from_plan_objects(plan_id, plans)
                        if isinstance(plan, VEPlan):
                            plan = plan.to_dict()
                        post["plans"].append(plan)

                self.set_status(200)
                self.serialize_and_write(
                    {"status": 200, "success": True, "inserted_post": post}
                )

        # _id field present in request, therefore update the existing post
        else:
            try:
                text = self.get_body_argument("text")
            except tornado.web.MissingArgumentError:
                self.set_status(400)
                self.write({"success": False, "reason": "missing_body_argument:text"})
                return

            with util.get_mongodb() as db:
                post_manager = Posts(db)

                # reject update if the post doesnt exist
                try:
                    post = post_manager.get_post(_id)
                except PostNotExistingException:
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
                    post["space"] = util.parse_object_id(post["space"])

                    acl = ACL(db)
                    user_can_post = False
                    user_can_post = acl.space_acl.ask(
                        self.current_user.username, post["space"], "post"
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
                    post_manager.update_post_text(_id, text)
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                    )
                    return

                plans_ids = self.get_body_argument("plans", [])
                try:
                    plans_ids = json.loads(plans_ids)
                except Exception:
                    pass

                # may update attached plans
                plan_manager = VEPlanResource(db)
                if plans_ids:
                    # got plans from request -> update DB
                    for plan_id in plans_ids:
                        try:
                            if not plan_manager._check_write_access(plan_id, self.current_user.username):
                                raise NoWriteAccessError()
                        except PlanDoesntExistError:
                            raise
                    post_manager.update_post_plans(_id, plans_ids)
                elif post["plans"]:
                    # had plans in post but not in request -> remove in post!
                    post_manager.update_post_plans(_id, [])

                # may update attached files
                files = []
                existing_files_ids = self.get_body_argument("files", [])
                files_to_upload = self.get_body_argument("file_amount", None)

                # delete removed files
                if post["files"]:
                    for stored_file in post["files"]:
                        if str(stored_file["file_id"]) not in existing_files_ids:
                            post_manager.delete_post_file(_id, stored_file["file_id"])
                        else:
                            files.append(stored_file)

                # upload new files
                if files_to_upload:
                    # save every file
                    for i in range(0, int(files_to_upload)):
                        file_obj = self.request.files["file" + str(i)][0]

                        stored_id = post_manager.add_new_post_file(
                            file_obj["filename"],
                            file_obj["body"],
                            file_obj["content_type"],
                            self.current_user.username,
                        )

                        files.append(
                            {
                                "file_id": stored_id,
                                "file_name": file_obj["filename"],
                                "file_type": file_obj["content_type"],
                                "author": self.current_user.username,
                            }
                        )

                        # if the post was in a space, also store the file in the repo,
                        # indicating it is part of a post by setting manually_uploaded to False
                        if post["space"]:
                            try:
                                space_manager.add_new_post_file(
                                    post["space"],
                                    self.current_user.username,
                                    stored_id,
                                    file_obj["filename"],
                                )
                            except FileAlreadyInRepoError:
                                pass

                # update post with existing and news files
                post_manager.update_post_files(_id, files)

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

        with util.get_mongodb() as db:
            post_manager = Posts(db)

            try:
                post_to_delete = post_manager.get_post(http_body["post_id"])
            except PostNotExistingException:
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
                post_to_delete["space"] = util.parse_object_id(post_to_delete["space"])
                if self.current_user.username != post_to_delete["author"]:
                    if not self.is_current_user_lionet_admin():
                        space_manager = Spaces(db)
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
                    post_manager.delete_post(post_to_delete["_id"])
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
                    post_manager.delete_post(post_to_delete["_id"])
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
             "success": True,
             "inserted_comment": {
                    "author": {
                        "username": "string",
                        "first_name": "string",
                        "last_name": "string",
                        "profile_pic": "string",
                        "institution": "string",
                    },
                    "creation_date": "string",
                    "text": "string",
                    "pinned": "bool",
                },
             }

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

        with util.get_mongodb() as db:
            post_manager = Posts(db)

            # abort if post doesnt exist at all
            try:
                post = post_manager.get_post(http_body["post_id"])
            except PostNotExistingException:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

            # if post is in a space, we have to check the permissions to comment
            if post["space"]:
                post["space"] = util.parse_object_id(post["space"])

                acl = ACL(db)
                if not acl.space_acl.ask(
                    self.current_user.username, post["space"], "comment"
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
                "creation_date": datetime.datetime.now(),
                "text": http_body["text"],
                "pinned": False,
            }

            try:
                comment_id = post_manager.add_comment(post["_id"], comment)
            except PostNotExistingException:
                self.set_status(409)
                self.write(
                    {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                )
                return

            comment["_id"] = comment_id

            # enhance comment author with profile details to return
            profile_manager = Profiles(db)
            author_profile_snippet = profile_manager.get_profile_snippets(
                [comment["author"]]
            )[0]
            comment["author"] = author_profile_snippet

        self.set_status(200)
        self.serialize_and_write(
            {"status": 200, "success": True, "inserted_comment": comment}
        )

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

        with util.get_mongodb() as db:
            post_manager = Posts(db)
            comment_id = ObjectId(http_body["comment_id"])

            # reject if the post doesnt exist
            try:
                post = post_manager.get_post_by_comment_id(
                    comment_id, projection={"comments": True, "space": True}
                )
            except PostNotExistingException:
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
                post["space"] = util.parse_object_id(post["space"])

                if self.current_user.username != comment_author:
                    if not self.is_current_user_lionet_admin():
                        space_manager = Spaces(db)
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
                    post_manager.delete_comment(comment_id, post_id=post["_id"])
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
                    post_manager.delete_comment(comment_id, post_id=post["_id"])
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

        with util.get_mongodb() as db:
            post_manager = Posts(db)
            try:
                post_manager.like_post(http_body["post_id"], self.current_user.username)
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

        with util.get_mongodb() as db:
            post_manager = Posts(db)
            try:
                post_manager.unlike_post(
                    http_body["post_id"], self.current_user.username
                )
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
                        "space": "space _id, the space where to post, None if no space"
                        "plans": ["optional, list of plans to attach to the repost"] (json encoded list)
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
                 "success": True,
                 "inserted_repost": {repost}}

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

            with util.get_mongodb() as db:
                post_manager = Posts(db)

                # reject if original post doesnt exist
                try:
                    post = post_manager.get_post(http_body["post_id"])
                    originalPost = copy.deepcopy(post)
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                    )
                    return

                space_id = http_body["space"]
                # user requested to post into space
                # --> check if space exists
                if space_id is not None:
                    space_id = util.parse_object_id(space_id)
                    space_manager = Spaces(db)
                    if not space_manager.check_space_exists(space_id):
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
                    acl = ACL(db)
                    user_can_post = False
                    user_can_post = acl.space_acl.ask(
                        self.current_user.username, space_id, "post"
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
                post["creation_date"] = datetime.datetime.now()
                if "isRepost" in originalPost and originalPost["isRepost"]:
                    post["text"] = originalPost["repostText"]
                    post["author"] = originalPost["repostAuthor"]

                post["repostText"] = http_body["text"]
                post["space"] = space_id
                post["likers"] = []
                post["comments"] = []
                post["tags"] = []
                if "plans" in http_body:
                    post["plans"] = http_body["plans"]
                else:
                    post["plans"] = []
                del post["_id"]

                repost_id = post_manager.insert_repost(post)

                post["_id"] = repost_id

                # ennhance original author and repost author with profile details to return
                profile_manager = Profiles(db)
                author_profile_snippets = profile_manager.get_profile_snippets(
                    [post["author"], post["repostAuthor"]]
                )
                post["author"] = [
                    author_profile_snippet
                    for author_profile_snippet in author_profile_snippets
                    if author_profile_snippet["username"] == post["author"]
                ][0]
                post["repostAuthor"] = [
                    author_profile_snippet
                    for author_profile_snippet in author_profile_snippets
                    if author_profile_snippet["username"] == post["repostAuthor"]
                ][0]

                self.set_status(200)
                self.serialize_and_write(
                    {"status": 200, "success": True, "inserted_repost": post}
                )

        # _id was specified in the request: update the existing repost
        else:
            with util.get_mongodb() as db:
                post_manager = Posts(db)

                try:
                    repost = post_manager.get_post(
                        http_body["_id"],
                        projection={
                            "isRepost": True,
                            "repostAuthor": True,
                            "space": True,
                        },
                    )
                except PostNotExistingException:
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
                    repost["space"] = util.parse_object_id(repost["space"])
                    acl = ACL(db)
                    user_can_post = False
                    user_can_post = acl.space_acl.ask(
                        self.current_user.username, repost["space"], "post"
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
                    post_manager.update_repost_text(http_body["_id"], http_body["text"])
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
    def check_space_or_global_admin(self, space_id: str | ObjectId) -> bool:
        """
        check if the current user is either space admin or global admin
        :return: True if user is any of those admins, False otherwise
        :raises: ValueError, if space doesnt exist
        """

        space_id = util.parse_object_id(space_id)

        with util.get_mongodb() as db:
            space_manager = Spaces(db)
            try:
                if (
                    space_manager.check_user_is_space_admin(
                        space_id, self.current_user.username
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
            with util.get_mongodb() as db:
                post_manager = Posts(db)

                try:
                    post = post_manager.get_post(
                        http_body["id"], projection={"space": True}
                    )
                except PostNotExistingException:
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
                    post["space"] = util.parse_object_id(post["space"])

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
                    post_manager.pin_post(http_body["id"])
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
            with util.get_mongodb() as db:
                post_manager = Posts(db)

                try:
                    post = post_manager.get_post_by_comment_id(
                        http_body["id"], projection={"space": True, "author": True}
                    )
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                    )
                    return

                # have to check if the post was in a space first, because then also the space admin may pin comments
                if "space" in post and post["space"] is not None:
                    post["space"] = util.parse_object_id(post["space"])

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
                        post_manager.pin_comment(http_body["id"])
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
                        post_manager.pin_comment(http_body["id"])
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
            with util.get_mongodb() as db:
                post_manager = Posts(db)

                # reject if post doesnt exist
                try:
                    post = post_manager.get_post(
                        http_body["id"], projection={"space": True}
                    )
                except PostNotExistingException:
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
                    post["space"] = util.parse_object_id(post["space"])

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
                    post_manager.unpin_post(http_body["id"])
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
            with util.get_mongodb() as db:
                post_manager = Posts(db)

                try:
                    post = post_manager.get_post_by_comment_id(
                        http_body["id"], projection={"space": True, "author": True}
                    )
                except PostNotExistingException:
                    self.set_status(409)
                    self.write(
                        {"status": 409, "success": False, "reason": "post_doesnt_exist"}
                    )
                    return

                # have to check if the post was in a space first, because then also the space admin may unpin comments
                if "space" in post and post["space"] is not None:
                    post["space"] = util.parse_object_id(post["space"])

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
                    post_manager.unpin_comment(http_body["id"])

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
                        post_manager.unpin_comment(http_body["id"])
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
