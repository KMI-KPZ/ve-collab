from base64 import b64encode
import os
import re

from bson.objectid import ObjectId
from datetime import datetime
import tornado.escape

from handlers.base_handler import BaseHandler, auth_needed


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
        id = None
        try:
            id = self.get_body_argument("_id")
        except:
            print("Np # IDEA: ")
        if id is None:
            author = self.current_user.username
            creation_date = datetime.utcnow()
            text = self.get_body_argument("text")  # http_body['text']
            tags = self.get_body_argument("tags")  # http_body['tags']
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
                    file_ext = os.path.splitext(file_obj["filename"])[1]
                    new_file_name = b64encode(os.urandom(32)).decode("utf-8")
                    new_file_name = re.sub('[^0-9a-zäöüßA-ZÄÖÜ]+', '_', new_file_name).lower() + file_ext
                    print(new_file_name)

                    with open(self.upload_dir + new_file_name, "wb") as fp:
                        fp.write(file_obj["body"])

                    files.append(new_file_name)

            post = {"author": author,
                    "creation_date": creation_date,
                    "text": text,
                    "space": space,
                    "tags": tags,
                    "files": files}

            self.db.posts.insert_one(post)

            self.set_status(200)
            self.write({'status': 200,
                        'success': True})
        else:
            id = self.get_body_argument("_id");
            author = self.current_user.username
            text = self.get_body_argument("text")  # http_body['text']

            query = {"_id": id}
            post = { "$set": { "text": text } }

            self.db.posts.update_one(
                {"_id": ObjectId(id)},
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
                    "comments": {"_id": ObjectId(), "author": author, "creation_date": creation_date, "text": text}
                }
            }
        )

        self.set_status(200)
        self.write({"status": 200,
                    "success": True})

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

        id = None
        try:
            id = self.get_body_argument("_id")
        except:
            print("Np # IDEA: ")
        if id is None:
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

            print(post)
            self.db.posts.insert_one(post)

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})

        else:
            id = self.get_body_argument("_id");
            #author = self.current_user.username
            text = self.get_body_argument("repostText")  # http_body['text']

            query = {"_id": id}
            post = { "$set": { "repostText": text } }

            self.db.posts.update_one(
                {"_id": ObjectId(id)},
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
