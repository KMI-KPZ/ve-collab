import json

from bson.objectid import ObjectId
from datetime import datetime
import tornado.escape

from handlers.base_handler import BaseHandler, auth_needed
from logger_factory import get_logger, log_access


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
        http body:
            {
                "_id": "id",
                "text": "text_of_post",
                "tags": ["tag1", "tag2"],
                "space": "optional, post this post into a space, not directly into your profile"
            }
        return:
            200 OK,
            {"status": 200,
             "success": True}

            400 Bad Request,
            {"status": 400,
             "reason": "space_does_not_exist"}

            401 Unauthorized,
            {"status": 401,
             "reason": "no_logged_in_user"}
        """
        _id = self.get_body_argument("_id", None)

        # no _id field means a new post is made
        if _id is None:
            author = self.current_user.username
            creation_date = datetime.utcnow()
            text = self.get_body_argument("text")  # http_body['text']
            tags = self.get_body_argument("tags")  # http_body['tags']
            # convert tags to list, because formdata will send it as a string
            try:
                tags = json.loads(tags)
            except Exception:
                pass
            space = self.get_body_argument("space", None)  # if space is set, this post belongs to a space (only visible inside)

            # check if space exists, if not, end with 400 Bad Request
            if space is not None:
                existing_spaces = []
                for existing_space in self.db.spaces.find(projection={"name": True, "_id": False}):
                    existing_spaces.append(existing_space["name"])
                if space not in existing_spaces:
                    self.set_status(400)
                    self.write({"status": 400,
                                "reason": "space_does_not_exist"})
                    self.finish()
                    return

            # handle files
            file_amount = self.get_body_argument("file_amount", None)
            files = []
            if file_amount:

                # save every file
                for i in range(0, int(file_amount)):
                    file_obj = self.request.files["file" + str(i)][0]
                    with open(self.upload_dir + file_obj["filename"], "wb") as fp:
                        fp.write(file_obj["body"])

                    files.append(file_obj["filename"])

            post = {"author": author,
                    "creation_date": creation_date,
                    "text": text,
                    "space": space,
                    "pinned": False,
                    "tags": tags,
                    "files": files}

            self.db.posts.insert_one(post)

            self.set_status(200)
            self.write({'status': 200,
                        'success': True})
        
        # _id field present in request, therefore update the existing post
        else:
            author = self.current_user.username
            text = self.get_body_argument("text")  # http_body['text']

            self.db.posts.update_one(
                {"_id": ObjectId(_id)},
                {"$set":
                    {
                        "text": text,
                    }
                },
                upsert=True
            )

            self.set_status(200)
            self.write({'status': 200,
                        'success': True})

    @log_access
    @auth_needed
    def delete(self):
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
                 "reason": <string>}

                 401 Unauthorized
                 {"status": 401,
                  "reason": "no_logged_in_user"}
        """

        http_body = tornado.escape.json_decode(self.request.body)

        if "post_id" in http_body:
            self.db.posts.delete_one({"_id": ObjectId(http_body["post_id"])})

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})
        else:
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key_in_http_body"})


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
                "post_id": "id_von_post"
            }
        return:
            200 OK
            {"status": 200,
             "success": True}

            400 Bad Request
            {"status": 400,
             "reason": "missing_key_in_http_body"}

            401 Unauthorized
            {"status": 401,
             "reason": "no_logged_in_user"}
        """

        http_body = tornado.escape.json_decode(self.request.body)

        if "post_id" not in http_body:  # exit if there is no post_id to associate the comment to
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key_in_http_body"})
            self.finish()
            return

        author = self.current_user.username
        creation_date = datetime.utcnow()
        text = http_body['text']
        post_ref = ObjectId(http_body['post_id'])

        self.db.posts.update_one(
            {"_id": post_ref},  # filter
            {                   # update
                "$push": {
                    "comments": {"_id": ObjectId(), "author": author, "creation_date": creation_date, "text": text, "pinned": False}
                }
            }
        )

        self.set_status(200)
        self.write({"status": 200,
                    "success": True})

    @log_access
    @auth_needed
    def delete(self):
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
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        http_body = tornado.escape.json_decode(self.request.body)

        if "comment_id" in http_body:
            self.db.posts.update_many(
                {},  # filter
                {    # update
                    "$pull": {
                        "comments": {"_id": ObjectId(http_body["comment_id"])}
                    }
                }
            )

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})
        else:
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key_in_http_body"})


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
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        http_body = tornado.escape.json_decode(self.request.body)

        if "post_id" not in http_body:
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key_in_http_body"})
            self.finish()
            return

        post_ref = ObjectId(http_body['post_id'])

        self.db.posts.update_one(
            {"_id": post_ref},  # filter
            {                   # update
                "$addToSet": {
                    "likers": self.current_user.username
                }
            }
        )

        self.set_status(200)
        self.write({"status": 200,
                    "success": True})

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
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        http_body = tornado.escape.json_decode(self.request.body)

        if "post_id" in http_body:
            self.db.posts.update_one(
                {"_id": ObjectId(http_body["post_id"])},
                {
                    "$pull": {
                        "likers": self.current_user.username
                    }
                }
            )

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})
        else:
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key_in_http_body"})


class RepostHandler(BaseHandler):

    @log_access
    @auth_needed
    def post(self):
        """
        POST /repost
            http body:
                {
                    "post_id": "id_of_post",
                    "text": "new text for the repost",
                    "space": "the space where to post"
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

        _id = self.get_body_argument("_id", None)

        # no _id field in the request means a new repost is made (not to confuse with post_id, which is the _id of the original post that is being reposted here)
        if _id is None:
            http_body = tornado.escape.json_decode(self.request.body)

            if "post_id" not in http_body:
                self.set_status(400)
                self.write({"status": 400,
                            "reason": "missing_key_in_http_body"})
                self.finish()
                return

            post_ref = ObjectId(http_body['post_id'])
            text = http_body['text']

            post = self.db.posts.find_one(
                {"_id": post_ref}
            )
            profile = self.db.profiles.find_one({"user": self.current_user.username})
            if profile:
                if "profile_pic" in profile:
                    post["repostAuthorProfilePic"] = profile["profile_pic"]
            post["isRepost"] = True
            post["repostAuthor"] = self.current_user.username
            post["originalCreationDate"] = post['creation_date']
            post["creation_date"] = datetime.utcnow()
            post["repostText"] = text

            space = http_body['space']

            # check if space exists, if not, end with 400 Bad Request
            if space is not None:
                existing_spaces = []
                for existing_space in self.db.spaces.find(projection={"name": True, "_id": False}):
                    existing_spaces.append(existing_space["name"])
                if space not in existing_spaces:
                    self.set_status(400)
                    self.write({"status": 400,
                                "reason": "space_does_not_exist"})
                    self.finish()
                    return
            post["space"] = space

            del post["_id"]
            if "likers" in post:
                del post["likers"]
            if "comments" in post:
                del post["comments"]
            if "tags" in post:
                post["tags"] = ""

            self.db.posts.insert_one(post)

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})

        else:
            #author = self.current_user.username
            text = self.get_body_argument("repostText")  # http_body['text']

            self.db.posts.update_one(
                {"_id": ObjectId(_id)},
                {"$set":
                    {
                        "repostText": text,
                    }
                },
                upsert=True
            )

            self.set_status(200)
            self.write({'status': 200,
                        'success': True})


class PinHandler(BaseHandler):

    def get_space(self, space_name):
        return self.db.spaces.find_one({"name": space_name})

    def check_space_or_global_admin(self, space_name):
        space = self.get_space(space_name)
        if space is not None:
            if (self.current_user.username in space["admins"]) or (self.get_current_user_role() == "admin"):
                return True
            else:
                return False
        else:
            raise ValueError("Space doesnt exist")

    @log_access
    @auth_needed
    def post(self):
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
        http_body = tornado.escape.json_decode(self.request.body)

        if "id" not in http_body:
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key_in_http_body"})
            self.finish()
            return

        if "pin_type" not in http_body:
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key_in_http_body"})
            self.finish()
            return

        if http_body["pin_type"] == "post":
            post = self.db.posts.find_one({"_id": ObjectId(http_body["id"])})
            if "space" in post and post["space"] is not None:
                try:
                    # check if user is either space admin or global admin
                    if self.check_space_or_global_admin(post["space"]):
                        # set the pin
                        self.db.posts.update_one(
                            {"_id": ObjectId(http_body["id"])},  # filter
                            {
                                "$set": {"pinned": True}
                            }
                        )

                        self.set_status(200)
                        self.write({"status": 200,
                                    "success": True})
                    else:
                        # user is no group admin nor global admin --> no permission to pin
                        self.set_status(403)
                        self.write({"status": 403,
                                    "reason": "insufficient_permission"})
                        return
                except ValueError as e:
                    self.set_status(400)
                    self.write({'status': 400,
                                'reason': "space_doesnt_exist"})
                    return
            else:
                #cannot pin because post is not in space
                self.set_status(400)
                self.write({'status': 400,
                            'reason': "post_not_in_space"})
                return

        elif http_body["pin_type"] == "comment":
            post = self.db.posts.find_one({"comments._id": ObjectId(http_body["id"])})
            try:
                # have to check if the post was in a space first, because then also the space admin may pin comments
                if "space" in post and post["space"] is not None:
                    # check if user is either space admin or global admin or the post creator
                    if self.check_space_or_global_admin(post["space"]) or self.current_user.username == post["author"]:
                        # set the pin
                        self.db.posts.update_one(
                            {"comments._id": ObjectId(http_body["id"])},  # filter
                            {
                                "$set": {"comments.$.pinned": True}
                            }
                        )

                        self.set_status(200)
                        self.write({"status": 200,
                                    "success": True})

                    else:
                        # user is no group admin nor global admin nor post author --> no permission to pin
                        self.set_status(403)
                        self.write({"status": 403,
                                    "reason": "insufficient_permission"})
                        return
                else:
                    # post was not in space, only post author or global admin have permission to pin
                    if self.current_user.username == post["author"] or self.get_current_user_role() == "admin":
                        # set the pin
                        self.db.posts.update_one(
                            {"comments._id": ObjectId(http_body["id"])},  # filter
                            {
                                "$set": {"comments.$.pinned": True}
                            }
                        )

                        self.set_status(200)
                        self.write({"status": 200,
                                    "success": True})

                    else:
                        # user is no global admin nor post author --> no permission to pin
                        self.set_status(403)
                        self.write({"status": 403,
                                    "reason": "insufficient_permission"})
                        return
            except ValueError as e:
                self.set_status(400)
                self.write({'status': 400,
                            'reason': "space_doesnt_exist"})
                return

        else:
            self.set_status(400)
            self.write({'status': 400,
                        'reason': "invalid_pin_type_in_http_body"})
            return

    @log_access
    @auth_needed
    def delete(self):
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

        http_body = tornado.escape.json_decode(self.request.body)

        if "id" not in http_body:
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key_in_http_body"})
            self.finish()
            return

        if "pin_type" not in http_body:
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key_in_http_body"})
            self.finish()
            return

        if http_body["pin_type"] == "post":
            post = self.db.posts.find_one({"_id": ObjectId(http_body["id"])})
            if "space" in post and post["space"] is not None:
                try:
                    # check if user is either space admin or global admin
                    if self.check_space_or_global_admin(post["space"]):
                        # set the pin
                        self.db.posts.update_one(
                            {"_id": ObjectId(http_body["id"])},  # filter
                            {
                                "$set": {"pinned": False}
                            }
                        )

                        self.set_status(200)
                        self.write({"status": 200,
                                    "success": True})
                    else:
                        # user is no group admin nor global admin --> no permission to pin
                        self.set_status(403)
                        self.write({"status": 403,
                                    "reason": "insufficient_permission"})
                        return
                except ValueError as e:
                    self.set_status(400)
                    self.write({'status': 400,
                                'reason': "space_doesnt_exist"})
                    return
            else:
                #cannot pin because post is not in space
                self.set_status(400)
                self.write({'status': 400,
                            'reason': "post_not_in_space"})
                return

        elif http_body["pin_type"] == "comment":
            post = self.db.posts.find_one({"comments._id": ObjectId(http_body["id"])})
            try:
                # have to check if the post was in a space first, because then also the space admin may pin comments
                if "space" in post and post["space"] is not None:
                    # check if user is either space admin or global admin or the post creator
                    if self.check_space_or_global_admin(post["space"]) or self.current_user.username == post["author"]:
                        # set the pin
                        self.db.posts.update_one(
                            {"comments._id": ObjectId(http_body["id"])},  # filter
                            {
                                "$set": {"comments.$.pinned": False}
                            }
                        )

                        self.set_status(200)
                        self.write({"status": 200,
                                    "success": True})

                    else:
                        # user is no group admin nor global admin nor post author --> no permission to pin
                        self.set_status(403)
                        self.write({"status": 403,
                                    "reason": "insufficient_permission"})
                        return
                else:
                    # post was not in space, only post author or global admin have permission to pin
                    if self.current_user.username == post["author"] or self.get_current_user_role() == "admin":
                        # set the pin
                        self.db.posts.update_one(
                            {"comments._id": ObjectId(http_body["id"])},  # filter
                            {
                                "$set": {"comments.$.pinned": False}
                            }
                        )

                        self.set_status(200)
                        self.write({"status": 200,
                                    "success": True})

                    else:
                        # user is no global admin nor post author --> no permission to pin
                        self.set_status(403)
                        self.write({"status": 403,
                                    "reason": "insufficient_permission"})
                        return
            except ValueError as e:
                self.set_status(400)
                self.write({'status': 400,
                            'reason': "space_doesnt_exist"})
                return

        else:
            self.set_status(400)
            self.write({'status': 400,
                        'reason': "invalid_pin_type_in_http_body"})
            return
