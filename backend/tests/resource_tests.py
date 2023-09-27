from bson import ObjectId
from datetime import datetime, timedelta
import os
import time
from unittest import TestCase
from bson import ObjectId
import gridfs

from dotenv import load_dotenv
import pymongo
import requests
from tornado.options import options
from exceptions import (
    AlreadyAdminError,
    AlreadyLikerException,
    AlreadyMemberError,
    AlreadyRequestedJoinError,
    FileAlreadyInRepoError,
    FileDoesntExistError,
    InvitationDoesntExistError,
    MissingKeyError,
    NoReadAccessError,
    NoWriteAccessError,
    NonUniqueTasksError,
    NotLikerException,
    NotRequestedJoinError,
    OnlyAdminError,
    PlanAlreadyExistsError,
    PlanDoesntExistError,
    PostFileNotDeleteableError,
    PostNotExistingException,
    ProfileDoesntExistException,
    SpaceAlreadyExistsError,
    SpaceDoesntExistError,
    UserNotAdminError,
    UserNotInvitedError,
    UserNotMemberError,
)

import global_vars
from model import (
    Institution,
    Lecture,
    Step,
    TargetGroup,
    Task,
    User,
    VEPlan,
)
from resources.network.space import Spaces
from resources.network.post import Posts
from resources.network.profile import Profiles
from resources.planner.ve_plan import VEPlanResource
import util

# don't change, these values match with the ones in BaseHandler
CURRENT_ADMIN = User(
    "test_admin", "aaaaaaaa-bbbb-0000-cccc-dddddddddddd", "test_admin@mail.de"
)
CURRENT_USER = User(
    "test_user", "aaaaaaaa-bbbb-0000-cccc-dddddddddddd", "test_user@mail.de"
)

load_dotenv()


def setUpModule():
    """
    initial one time setup that deals with config properties.
    unittest will call this method itself.
    """

    global_vars.mongodb_host = os.getenv("MONGODB_HOST", "localhost")
    global_vars.mongodb_port = int(os.getenv("MONGODB_PORT", "27017"))
    global_vars.mongodb_username = os.getenv("MONGODB_USERNAME")
    global_vars.mongodb_password = os.getenv("MONGODB_PASSWORD")
    global_vars.mongodb_db_name = "test_db"
    global_vars.elasticsearch_base_url = os.getenv(
        "ELASTICSEARCH_BASE_URL", "http://localhost:9200"
    )
    global_vars.elasticsearch_username = os.getenv("ELASTICSEARCH_USERNAME", "elastic")
    global_vars.elasticsearch_password = os.getenv("ELASTICSEARCH_PASSWORD")


def tearDownModule():
    """
    after all tests from all cases have run, wipe the whole db for safety's sake
    in case any of the test cases missed to clean up.
    unittest will call this method itself.
    """

    with util.get_mongodb() as db:
        db.drop_collection("plans")


class BaseResourceTestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        # initialize mongodb connection
        cls._client = pymongo.MongoClient(
            global_vars.mongodb_host,
            global_vars.mongodb_port,
            username=global_vars.mongodb_username,
            password=global_vars.mongodb_password,
        )
        cls._db = cls._client[global_vars.mongodb_db_name]

    def setUp(self) -> None:
        super().setUp()

        # initialize mongodb connection
        self.client = self.__class__._client
        self.db = self.__class__._db

    def tearDown(self) -> None:
        self.client = None
        super().tearDown()

    @classmethod
    def tearDownClass(cls) -> None:
        # close mongodb connection
        cls._client.close()

    def create_step(
        self,
        name: str,
        timestamp_from: datetime = datetime(2023, 1, 1),
        timestamp_to: datetime = datetime(2023, 1, 8),
    ) -> Step:
        """
        convenience method to create a Step object with non-default values
        """

        return Step(
            name=name,
            workload=10,
            timestamp_from=timestamp_from,
            timestamp_to=timestamp_to,
            social_form="test",
            learning_env="test",
            ve_approach="test",
            tasks=[Task()],
            evaluation_tools=["test", "test"],
            attachments=[ObjectId()],
            custom_attributes={"test": "test"},
        )

    def create_target_group(self, name: str) -> TargetGroup:
        """
        convenience method to create a TargetGroup object with non-default values
        """
        return TargetGroup(
            name=name,
            age_min=30,
            age_max=40,
            experience="test",
            academic_course="test",
            mother_tongue="test",
            foreign_languages={"test": "l1"},
            learning_goal="test",
        )

    def create_institution(self, name: str = "test") -> Institution:
        """
        convenience method to create an institution with non-default values
        """

        return Institution(
            name=name,
            school_type="test",
            country="test",
            departments=["test", "test"],
            academic_courses=["test", "test"],
        )

    def create_lecture(self, name: str = "test") -> Lecture:
        """
        convenience method to create a lecture with non-default values
        """

        return Lecture(
            name=name,
            lecture_format="test",
            lecture_type="test",
            participants_amount=10,
        )


class ACLResourceTest(BaseResourceTestCase):
    pass


class PostResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.post_id = ObjectId()
        self.comment_id = ObjectId()
        self.default_comment = {
            "_id": self.comment_id,
            "author": CURRENT_USER.username,
            "creation_date": datetime(2023, 1, 1, 9, 5, 0),
            "text": "test_comment",
            "pinned": False,
        }
        self.default_post = {
            "_id": self.post_id,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [self.default_comment],
            "likers": [],
        }
        self.db.posts.insert_one(self.default_post)

        # insert a default profile for CURRENT_ADMIN (needed for timeline)
        self.db.profiles.insert_one(
            {
                "username": CURRENT_ADMIN.username,
                "role": "admin",
                "follows": [],
                "bio": "",
                "institution": "",
                "profile_pic": "default_profile_pic.jpg",
                "first_name": "",
                "last_name": "",
                "gender": "",
                "address": "",
                "birthday": "",
                "experience": [""],
                "expertise": "",
                "languages": [],
                "ve_ready": True,
                "excluded_from_matching": False,
                "ve_interests": [""],
                "ve_goals": [""],
                "preferred_formats": [""],
                "research_tags": [],
                "courses": [],
                "educations": [],
                "work_experience": [],
                "ve_window": [],
            }
        )

    def tearDown(self) -> None:
        super().tearDown()

        self.db.posts.delete_many({})
        self.db.profiles.delete_many({})

        # delete all created files in gridfs
        fs = gridfs.GridFS(self.db)
        for fs_file in fs.find():
            fs.delete(fs_file._id)

    def test_get_post(self):
        """
        expect: successfully get post
        """

        post_manager = Posts(self.db)
        post = post_manager.get_post(self.post_id)
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.default_post["_id"])
        self.assertEqual(post["author"], self.default_post["author"])
        self.assertEqual(post["creation_date"], self.default_post["creation_date"])
        self.assertEqual(post["text"], self.default_post["text"])
        self.assertEqual(post["space"], self.default_post["space"])
        self.assertEqual(post["pinned"], self.default_post["pinned"])
        self.assertEqual(post["isRepost"], self.default_post["isRepost"])
        self.assertEqual(
            post["wordpress_post_id"], self.default_post["wordpress_post_id"]
        )
        self.assertEqual(post["tags"], self.default_post["tags"])
        self.assertEqual(post["files"], self.default_post["files"])
        self.assertEqual(post["comments"], self.default_post["comments"])
        self.assertEqual(post["likers"], self.default_post["likers"])

        # again with supplying _id as str
        post = post_manager.get_post(str(self.post_id))
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.default_post["_id"])
        self.assertEqual(post["author"], self.default_post["author"])
        self.assertEqual(post["creation_date"], self.default_post["creation_date"])
        self.assertEqual(post["text"], self.default_post["text"])
        self.assertEqual(post["space"], self.default_post["space"])
        self.assertEqual(post["pinned"], self.default_post["pinned"])
        self.assertEqual(post["isRepost"], self.default_post["isRepost"])
        self.assertEqual(
            post["wordpress_post_id"], self.default_post["wordpress_post_id"]
        )
        self.assertEqual(post["tags"], self.default_post["tags"])
        self.assertEqual(post["files"], self.default_post["files"])
        self.assertEqual(post["comments"], self.default_post["comments"])
        self.assertEqual(post["likers"], self.default_post["likers"])

        # again with projection to only get _id, text, tags and author
        post = post_manager.get_post(
            self.post_id, {"text": True, "tags": True, "author": True}
        )
        self.assertEqual(post["_id"], self.default_post["_id"])
        self.assertEqual(post["author"], self.default_post["author"])
        self.assertEqual(post["tags"], self.default_post["tags"])
        self.assertEqual(post["text"], self.default_post["text"])
        self.assertNotIn("creation_date", post)

    def test_get_post_by_comment_id(self):
        """
        expect: successfully get post by comment id
        """

        post_manager = Posts(self.db)
        post = post_manager.get_post_by_comment_id(self.comment_id)
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.default_post["_id"])
        self.assertEqual(post["author"], self.default_post["author"])
        self.assertEqual(post["creation_date"], self.default_post["creation_date"])
        self.assertEqual(post["text"], self.default_post["text"])
        self.assertEqual(post["space"], self.default_post["space"])
        self.assertEqual(post["pinned"], self.default_post["pinned"])
        self.assertEqual(post["isRepost"], self.default_post["isRepost"])
        self.assertEqual(
            post["wordpress_post_id"], self.default_post["wordpress_post_id"]
        )
        self.assertEqual(post["tags"], self.default_post["tags"])
        self.assertEqual(post["files"], self.default_post["files"])
        self.assertEqual(post["comments"], self.default_post["comments"])
        self.assertEqual(post["likers"], self.default_post["likers"])

        # again with _id as str
        post = post_manager.get_post_by_comment_id(str(self.comment_id))
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.default_post["_id"])
        self.assertEqual(post["author"], self.default_post["author"])
        self.assertEqual(post["creation_date"], self.default_post["creation_date"])
        self.assertEqual(post["text"], self.default_post["text"])
        self.assertEqual(post["space"], self.default_post["space"])
        self.assertEqual(post["pinned"], self.default_post["pinned"])
        self.assertEqual(post["isRepost"], self.default_post["isRepost"])
        self.assertEqual(
            post["wordpress_post_id"], self.default_post["wordpress_post_id"]
        )
        self.assertEqual(post["tags"], self.default_post["tags"])
        self.assertEqual(post["files"], self.default_post["files"])
        self.assertEqual(post["comments"], self.default_post["comments"])
        self.assertEqual(post["likers"], self.default_post["likers"])

    def test_get_posts_by_tags(self):
        """
        expect: successfully get posts that have all of the supplied tags
        """

        # add more posts,
        additional_posts = [
            # this one should be included in the result
            {
                "_id": ObjectId(),
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                "text": "test",
                "space": None,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test", "test2"],
                "files": [],
                "comments": [],
                "likers": [],
            },
            # this one not
            {
                "_id": ObjectId(),
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                "text": "test",
                "space": None,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test2", "test3"],
                "files": [],
                "comments": [],
                "likers": [],
            },
        ]

        self.db.posts.insert_many(additional_posts)

        post_manamger = Posts(self.db)
        posts = post_manamger.get_posts_by_tags(["test"])
        self.assertEqual(len(posts), 2)
        _ids = [post["_id"] for post in posts]
        self.assertIn(self.default_post["_id"], _ids)
        self.assertIn(additional_posts[0]["_id"], _ids)

        # test again, searching for two tags
        posts = post_manamger.get_posts_by_tags(["test", "test2"])
        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0]["_id"], additional_posts[0]["_id"])

    def test_insert_post(self):
        """
        expect: successfully insert new post
        """

        new_post = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "new_test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
        }

        post_manager = Posts(self.db)
        post_manager.insert_post(new_post)

        # check if post was inserted
        post = self.db.posts.find_one({"text": "new_test"})
        self.assertIsNotNone(post)
        self.assertIsInstance(post["_id"], ObjectId)
        self.assertEqual(post["author"], new_post["author"])
        self.assertEqual(post["creation_date"], new_post["creation_date"])
        self.assertEqual(post["text"], new_post["text"])
        self.assertEqual(post["space"], new_post["space"])
        self.assertEqual(post["pinned"], new_post["pinned"])
        self.assertEqual(post["isRepost"], new_post["isRepost"])
        self.assertEqual(post["wordpress_post_id"], new_post["wordpress_post_id"])
        self.assertEqual(post["tags"], new_post["tags"])
        self.assertEqual(post["files"], new_post["files"])
        self.assertEqual(post["comments"], new_post["comments"])
        self.assertEqual(post["likers"], new_post["likers"])

    def test_insert_post_error_missing_attributes(self):
        """
        expect: ValueError is raised because post dict is missing an attribute
        """

        # text is missing
        new_post = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
        }

        post_manager = Posts(self.db)
        self.assertRaises(ValueError, post_manager.insert_post, new_post)

    def test_insert_post_update_instead(self):
        """
        expect: since new post dict contains an _id, update the existing post instead,
        but only the text is updateable
        """

        new_post = {
            "_id": self.post_id,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "updated_test",
            "space": None,
            "pinned": True,  # change this too, expecting it to not be updated
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],  # change this too, expecting it to not be updated
            "likers": [],
        }

        post_manager = Posts(self.db)
        post_manager.insert_post(new_post)

        # check if post was updated
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.post_id)
        self.assertEqual(post["text"], new_post["text"])
        self.assertNotEqual(post["pinned"], new_post["pinned"])
        self.assertNotEqual(post["comments"], new_post["comments"])
        # rest is just pure sanity checks
        self.assertEqual(post["author"], new_post["author"])
        self.assertEqual(post["creation_date"], new_post["creation_date"])
        self.assertEqual(post["space"], new_post["space"])
        self.assertEqual(post["isRepost"], new_post["isRepost"])
        self.assertEqual(post["wordpress_post_id"], new_post["wordpress_post_id"])
        self.assertEqual(post["tags"], new_post["tags"])
        self.assertEqual(post["files"], new_post["files"])
        self.assertEqual(post["likers"], new_post["likers"])

    def test_insert_post_update_instead_error_missing_attribute(self):
        """
        expect: ValueError is raised because post dict that contains an _id and therefore
        triggers the post text update misses the text attribute
        """

        new_post = {
            "_id": self.post_id,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "space": None,
            "pinned": True,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
        }

        post_manager = Posts(self.db)
        self.assertRaises(ValueError, post_manager.insert_post, new_post)

    def test_update_post_text(self):
        """
        expect: successfully update post text
        """

        post_manager = Posts(self.db)
        post_manager.update_post_text(self.post_id, "updated_test")

        # check if post was updated
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], self.post_id)
        self.assertEqual(post["text"], "updated_test")

    def test_update_post_text_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because post doesn't exist
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.update_post_text, ObjectId(), "test"
        )

    def test_delete_post(self):
        """
        expect: successfully delete post
        """

        post_manager = Posts(self.db)
        post_manager.delete_post(self.post_id)

        # check if post was deleted
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNone(post)

    def test_delete_post_file(self):
        """
        expect: successfully delete post and corresponding files from gridfs
        """

        # first add new post with file
        fs = gridfs.GridFS(self.db)
        file_id = fs.put(b"test", filename="test.txt")
        new_post = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "new_test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [file_id],
            "comments": [],
            "likers": [],
        }
        self.db.posts.insert_one(new_post)

        post_manager = Posts(self.db)
        post_manager.delete_post(new_post["_id"])

        # check if post was deleted
        post = self.db.posts.find_one({"_id": new_post["_id"]})
        self.assertIsNone(post)

        # check if file was deleted
        self.assertIsNone(fs.find_one({"_id": file_id}))

    def test_delete_post_file_space(self):
        """
        expect: successfully delete post and corresponding files from gridfs and the space's
        repository
        """

        # first add new file
        fs = gridfs.GridFS(self.db)
        file_id = fs.put(b"test", filename="test.txt")

        # create a space
        space_id = ObjectId()
        space_name = "test"
        space = {
            "_id": space_id,
            "name": space_name,
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [
                {
                    "file_id": file_id,
                    "author": CURRENT_ADMIN.username,
                    "manually_uploaded": True,
                }
            ],
        }
        self.db.spaces.insert_one(space)

        # create a post in the space
        post_id = ObjectId()
        post = {
            "_id": post_id,
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 0, 0),
            "text": "new_test",
            "space": space_name,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [file_id],
            "comments": [],
            "likers": [],
        }
        self.db.posts.insert_one(post)

        post_manager = Posts(self.db)
        post_manager.delete_post(post_id)

        # check if post was deleted
        post = self.db.posts.find_one({"_id": post_id})
        self.assertIsNone(post)

        # check if file was deleted
        self.assertIsNone(fs.find_one({"_id": file_id}))

        # check if file was deleted from space's repository
        space = self.db.spaces.find_one({"_id": space_id})
        self.assertEqual(space["files"], [])

    def test_delete_post_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because post doesn't exist
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.delete_post, ObjectId()
        )

    def test_delete_post_by_space(self):
        """
        expect: successfully delete all posts in the space
        """

        # add 2 more space posts
        additional_posts = [
            {
                "_id": ObjectId(),
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                "text": "test",
                "space": "test_space",
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test"],
                "files": [],
                "comments": [],
                "likers": [],
            },
            {
                "_id": ObjectId(),
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime(2023, 1, 1, 9, 0, 0),
                "text": "test",
                "space": "test_space",
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test"],
                "files": [],
                "comments": [],
                "likers": [],
            },
        ]
        self.db.posts.insert_many(additional_posts)

        post_manager = Posts(self.db)
        post_manager.delete_post_by_space("test_space")

        # check if posts were deleted
        posts = list(self.db.posts.find({"space": "test_space"}))
        self.assertEqual(len(posts), 0)

        # check that default post is still there
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)

    def test_like_post(self):
        """
        expect: successfully like post
        """

        post_manager = Posts(self.db)
        post_manager.like_post(self.post_id, CURRENT_USER.username)

        # check if post was liked
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertIn(CURRENT_USER.username, post["likers"])

    def test_like_post_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.like_post, ObjectId(), "test"
        )

    def test_like_post_error_already_liker(self):
        """
        expect: AlreadyLikerException is raised because user has already liked this post
        """

        # manually set liker
        self.db.posts.update_one(
            {"_id": self.post_id}, {"$set": {"likers": [CURRENT_ADMIN.username]}}
        )

        post_manager = Posts(self.db)
        self.assertRaises(
            AlreadyLikerException,
            post_manager.like_post,
            self.post_id,
            CURRENT_ADMIN.username,
        )

    def test_unlike_post(self):
        """
        expect: successfully remove like from post
        """

        # manually set liker
        self.db.posts.update_one(
            {"_id": self.post_id}, {"$set": {"likers": [CURRENT_ADMIN.username]}}
        )

        post_manager = Posts(self.db)
        post_manager.unlike_post(self.post_id, CURRENT_ADMIN.username)

        # check if post was unliked
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertNotIn(CURRENT_ADMIN.username, post["likers"])

    def test_unlike_post_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.unlike_post, ObjectId(), "test"
        )

    def test_unlike_post_error_not_liker(self):
        """
        expect: NotLikerException is raised because the user has not previoulsy
        liked thist post
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            NotLikerException,
            post_manager.unlike_post,
            self.post_id,
            CURRENT_ADMIN.username,
        )

    def test_add_comment(self):
        """
        expect: successfully add comment to the post
        """

        comment = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 5, 0),
            "text": "new_comment",
            "pinned": False,
        }

        post_manager = Posts(self.db)
        post_manager.add_comment(self.post_id, comment)

        # check if comment was added
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(len(post["comments"]), 2)
        comment_text = [comment["text"] for comment in post["comments"]]
        self.assertIn(comment["text"], comment_text)

    def test_add_comment_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        comment = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 5, 0),
            "text": "new_comment",
            "pinned": False,
        }

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.add_comment, ObjectId(), comment
        )

    def test_add_comment_error_missing_attributes(self):
        """
        expect: ValueError is raised because comment dict is missing an attribute
        """

        # text is missing
        comment = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 1, 9, 5, 0),
            "pinned": False,
        }

        post_manager = Posts(self.db)
        self.assertRaises(ValueError, post_manager.add_comment, self.post_id, comment)

    def test_delete_comment(self):
        """
        expect: successfully delete a comment
        """

        post_manager = Posts(self.db)
        post_manager.delete_comment(self.comment_id, self.post_id)

        # check if comment was deleted
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(len(post["comments"]), 0)

    def test_delete_comment_no_post_id(self):
        """
        expect: successfully delete a comment without supplying the corresponding
        post id
        """

        post_manager = Posts(self.db)
        post_manager.delete_comment(self.comment_id)

        # check if comment was deleted
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertEqual(len(post["comments"]), 0)

    def test_delet_comment_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException,
            post_manager.delete_comment,
            self.comment_id,
            ObjectId(),
        )

        self.assertRaises(
            PostNotExistingException, post_manager.delete_comment, ObjectId()
        )

    def test_insert_repost(self):
        """
        expect: successuflly insert new repost
        """

        repost = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "text": "test",
            "space": "test_space",
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": True,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
            "repostText": "test_repost",
        }

        post_manager = Posts(self.db)
        post_manager.insert_repost(repost)

        # check if repost was added
        post = self.db.posts.find_one({"repostText": "test_repost"})
        self.assertIsNotNone(post)
        self.assertEqual(post["author"], repost["author"])
        self.assertEqual(post["creation_date"], repost["creation_date"])
        self.assertEqual(post["text"], repost["text"])
        self.assertEqual(post["space"], repost["space"])
        self.assertEqual(post["pinned"], repost["pinned"])
        self.assertEqual(post["wordpress_post_id"], repost["wordpress_post_id"])
        self.assertEqual(post["tags"], repost["tags"])
        self.assertEqual(post["files"], repost["files"])
        self.assertEqual(post["comments"], repost["comments"])
        self.assertEqual(post["likers"], repost["likers"])
        self.assertEqual(post["isRepost"], repost["isRepost"])
        self.assertEqual(post["repostAuthor"], repost["repostAuthor"])
        self.assertEqual(post["originalCreationDate"], repost["originalCreationDate"])
        self.assertEqual(post["repostText"], repost["repostText"])

    def test_insert_repost_update_instead(self):
        """
        expect: since new repost dict contains an _id, update the existing repost instead
        """

        # insert a repost into the db
        repost = {
            "_id": ObjectId(),
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "text": "test",
            "space": "test_space",
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": True,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
            "repostText": "test_repost",
        }
        self.db.posts.insert_one(repost)

        repost = {
            "_id": repost["_id"],
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(
                2023, 1, 3, 9, 0, 0
            ),  # changed, but shouldnt be updated
            "text": "test",
            "space": "test_space",
            "pinned": True,  # changed, but shouldnt be updated
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": True,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
            "repostText": "updated_test_repost",
        }
        post_manager = Posts(self.db)
        post_manager.insert_repost(repost)

        # check if repost was updated, but only the repostText is updateable
        post = self.db.posts.find_one({"_id": repost["_id"]})
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], repost["_id"])
        self.assertEqual(post["author"], repost["author"])
        self.assertNotEqual(post["creation_date"], repost["creation_date"])
        self.assertEqual(post["text"], repost["text"])
        self.assertEqual(post["space"], repost["space"])
        self.assertNotEqual(post["pinned"], repost["pinned"])
        self.assertEqual(post["wordpress_post_id"], repost["wordpress_post_id"])
        self.assertEqual(post["tags"], repost["tags"])
        self.assertEqual(post["files"], repost["files"])
        self.assertEqual(post["comments"], repost["comments"])
        self.assertEqual(post["likers"], repost["likers"])
        self.assertEqual(post["isRepost"], repost["isRepost"])
        self.assertEqual(post["repostAuthor"], repost["repostAuthor"])
        self.assertEqual(post["originalCreationDate"], repost["originalCreationDate"])
        self.assertEqual(post["repostText"], repost["repostText"])

    def test_insert_repost_error_missing_attributes(self):
        """
        expect: ValueError is raised because repost dict is missing an attribute
        """

        # first, a normal post attribute is missing: text
        repost = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "space": "test_space",
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": False,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
            "repostText": "test_repost",
        }

        post_manager = Posts(self.db)
        self.assertRaises(ValueError, post_manager.insert_repost, repost)

        # now, a repost attribute is missing: repostText
        repost = {
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "text": "test",
            "space": "test_space",
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": False,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
        }

        post_manager = Posts(self.db)
        self.assertRaises(ValueError, post_manager.insert_repost, repost)

    def test_update_repost_text(self):
        """
        expect: successfully update repost text
        """

        # insert a repost into the db
        repost = {
            "_id": ObjectId(),
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime(2023, 1, 2, 9, 0, 0),
            "text": "test",
            "space": "test_space",
            "pinned": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
            "isRepost": True,
            "repostAuthor": CURRENT_USER.username,
            "originalCreationDate": datetime(2023, 1, 1, 9, 0, 0),
            "repostText": "test_repost",
        }
        self.db.posts.insert_one(repost)

        post_manager = Posts(self.db)
        post_manager.update_repost_text(repost["_id"], "updated_test_repost")

        # check if repost was updated
        post = self.db.posts.find_one({"_id": repost["_id"]})
        self.assertIsNotNone(post)
        self.assertEqual(post["_id"], repost["_id"])
        self.assertEqual(post["repostText"], "updated_test_repost")

    def test_update_repost_text_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException,
            post_manager.update_repost_text,
            ObjectId(),
            "test",
        )

    def test_pin_post(self):
        """
        expect: successfully set pinned attribute of post to True
        """

        post_manager = Posts(self.db)
        post_manager.pin_post(self.post_id)

        # check if post was pinned
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertTrue(post["pinned"])

    def test_pin_post_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(PostNotExistingException, post_manager.pin_post, ObjectId())

    def test_unpin_post(self):
        """
        expect: successfully set pinned attribute of post to False
        """

        # manually set pinned to True
        self.db.posts.update_one({"_id": self.post_id}, {"$set": {"pinned": True}})

        post_manager = Posts(self.db)
        post_manager.unpin_post(self.post_id)

        # check if post was unpinned
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertFalse(post["pinned"])

    def test_unpin_post_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(PostNotExistingException, post_manager.unpin_post, ObjectId())

    def test_pin_comment(self):
        """
        expect: successfully set pinned attribute of comment to True
        """

        post_manager = Posts(self.db)
        post_manager.pin_comment(self.comment_id)

        # check if comment was pinned
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertTrue(post["comments"][0]["pinned"])

    def test_pin_comment_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.pin_comment, ObjectId()
        )

    def test_unpin_comment(self):
        """
        expect: successfully set pinned attribute of comment to False
        """

        # manually set pinned to True
        self.db.posts.update_one(
            {"_id": self.post_id}, {"$set": {"comments.0.pinned": True}}
        )

        post_manager = Posts(self.db)
        post_manager.unpin_comment(self.comment_id)

        # check if comment was unpinned
        post = self.db.posts.find_one({"_id": self.post_id})
        self.assertIsNotNone(post)
        self.assertFalse(post["comments"][0]["pinned"])

    def test_unpin_comment_error_post_doesnt_exist(self):
        """
        expect: PostNotExistingException is raised because no post with this _id
        exists
        """

        post_manager = Posts(self.db)
        self.assertRaises(
            PostNotExistingException, post_manager.unpin_comment, ObjectId()
        )

    def test_add_new_post_file(self):
        """
        expect: successfully store new file in gridfs
        """

        post_manager = Posts(self.db)
        file_id = post_manager.add_new_post_file(
            "test.txt", b"test", "text/plain", CURRENT_ADMIN.username
        )

        # check if file was stored in gridfs
        fs = gridfs.GridFS(self.db)
        self.assertIsNotNone(fs.find_one({"_id": file_id}))

    def test_get_full_timeline(self):
        """
        expect: successfully get all posts within the time frame
        """

        # add 5 posts with creation date now
        for i in range(5):
            post = {
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "test",
                "space": None,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test"],
                "files": [],
                "comments": [],
                "likers": [],
            }
            self.db.posts.insert_one(post)

        post_manager = Posts(self.db)
        # this should include the 5 posts, but not the default one because its creation date is
        # in the past
        posts = post_manager.get_full_timeline(
            datetime.now() - timedelta(days=1), datetime.now()
        )
        self.assertEqual(len(posts), 5)

    def test_get_space_timeline(self):
        """
        expect: successfully get all posts within the time frame and in a space
        """

        # add 5 posts, 3 of them in the space
        for i in range(5):
            post = {
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "test",
                "space": None,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test"],
                "files": [],
                "comments": [],
                "likers": [],
            }
            if i % 2 == 0:
                post["space"] = "test_space"
            self.db.posts.insert_one(post)

        post_manager = Posts(self.db)
        # this should include only the 3 posts in the space
        posts = post_manager.get_space_timeline(
            "test_space", datetime.now() - timedelta(days=1), datetime.now()
        )
        self.assertEqual(len(posts), 3)

    def test_get_user_timeline(self):
        """
        expect: successfully get all posts within the time frame and of a user
        """

        # add 5 posts, 3 of them by the user
        for i in range(5):
            post = {
                "author": CURRENT_ADMIN.username,
                "creation_date": datetime.now(),
                "text": "test",
                "space": None,
                "pinned": False,
                "isRepost": False,
                "wordpress_post_id": None,
                "tags": ["test"],
                "files": [],
                "comments": [],
                "likers": [],
            }
            if i % 2 == 0:
                post["author"] = CURRENT_USER.username
            self.db.posts.insert_one(post)

        post_manager = Posts(self.db)
        # this should include only the 3 posts by the user
        posts = post_manager.get_user_timeline(
            CURRENT_USER.username, datetime.now() - timedelta(days=1), datetime.now()
        )
        self.assertEqual(len(posts), 3)

    def test_get_personal_timeline(self):
        """
        expect: successfully get all posts that are in the time frame and match the criteria (OR match):
        - from people that the user follows,
        - in spaces that the user is a member of
        - the users own posts
        """

        # follow CURRENT_USER.username
        self.db.profiles.update_one(
            {"username": CURRENT_ADMIN.username},
            {"$push": {"follows": CURRENT_USER.username}},
        )

        # add one post of CURRENT_USER.username and one of a different username
        post1 = {
            "_id": ObjectId(),
            "author": CURRENT_USER.username,
            "creation_date": datetime.now(),
            "text": "test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
        }
        post2 = {
            "_id": ObjectId(),
            "author": "non_following_user",
            "creation_date": datetime.now(),
            "text": "test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
        }

        # create space test_space
        space = {
            "_id": ObjectId(),
            "name": "test_space",
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }
        self.db.spaces.insert_one(space)

        # add one post in a space that CURRENT_USER.username is a member of and one in a space that
        # he is not a member of
        post3 = {
            "_id": ObjectId(),
            "author": "doesnt_matter",
            "creation_date": datetime.now(),
            "text": "test",
            "space": "test_space",
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
        }
        post4 = {
            "_id": ObjectId(),
            "author": "doesnt_matter",
            "creation_date": datetime.now(),
            "text": "test",
            "space": "non_member_space",
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
        }

        # add one post by the user himself
        post5 = {
            "_id": ObjectId(),
            "author": CURRENT_ADMIN.username,
            "creation_date": datetime.now(),
            "text": "test",
            "space": None,
            "pinned": False,
            "isRepost": False,
            "wordpress_post_id": None,
            "tags": ["test"],
            "files": [],
            "comments": [],
            "likers": [],
        }

        self.db.posts.insert_many([post1, post2, post3, post4, post5])

        post_manager = Posts(self.db)
        # this should include post1 because it is from a user that the user follows,
        # post3 because it is from a space that the user is a member of,
        # and post5 because it is the users own post
        # but not the default post because it is out of time frame
        posts = post_manager.get_personal_timeline(
            CURRENT_ADMIN.username, datetime.now() - timedelta(days=1), datetime.now()
        )
        self.assertEqual(len(posts), 3)
        post_ids = [post["_id"] for post in posts]
        self.assertIn(post1["_id"], post_ids)
        self.assertIn(post3["_id"], post_ids)
        self.assertIn(post5["_id"], post_ids)

    def test_check_new_posts_since_timestamp(self):
        """
        expect: successfully query for new posts within a timeframe
        """

        post_manager = Posts(self.db)
        # this timeframe should return True (default post after that)
        self.assertTrue(
            post_manager.check_new_posts_since_timestamp(datetime(2022, 12, 31))
        )
        # this timeframe should return False (default post before that)
        self.assertFalse(
            post_manager.check_new_posts_since_timestamp(datetime(2023, 1, 2))
        )


class ProfileResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.profile_id = ObjectId()
        self.default_profile = self.create_profile(
            CURRENT_ADMIN.username, self.profile_id
        )
        self.default_profile["follows"] = [CURRENT_USER.username]
        self.db.profiles.insert_one(self.default_profile)

    def tearDown(self) -> None:
        super().tearDown()

        self.db.profiles.delete_many({})
        self.db.global_acl.delete_many({})
        self.db.space_acl.delete_many({})

    @classmethod
    def tearDownClass(cls) -> None:
        super().tearDownClass()

        # clear out elastisearch index, only once after all tests
        # because otherwise there would be too many http requests
        response = requests.delete(
            "{}/test".format(global_vars.elasticsearch_base_url),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        if response.status_code != 200:
            print(response.content)

    def create_profile(self, username: str, user_id: ObjectId) -> dict:
        return {
            "_id": user_id,
            "username": username,
            "role": "guest",
            "follows": [],
            "bio": "test",
            "institution": "test",
            "profile_pic": "default_profile_pic.jpg",
            "first_name": "Test",
            "last_name": "Admin",
            "gender": "male",
            "address": "test",
            "birthday": "2023-01-01",
            "experience": ["test", "test"],
            "expertise": "test",
            "languages": ["german", "english"],
            "ve_ready": True,
            "excluded_from_matching": False,
            "ve_interests": ["test", "test"],
            "ve_goals": ["test", "test"],
            "preferred_formats": ["test"],
            "research_tags": ["test"],
            "courses": [
                {"title": "test", "academic_course": "test", "semester": "test"}
            ],
            "educations": [
                {
                    "institution": "test",
                    "degree": "test",
                    "department": "test",
                    "timestamp_from": "2023-01-01",
                    "timestamp_to": "2023-02-01",
                    "additional_info": "test",
                }
            ],
            "work_experience": [
                {
                    "position": "test",
                    "institution": "test",
                    "department": "test",
                    "timestamp_from": "2023-01-01",
                    "timestamp_to": "2023-02-01",
                    "city": "test",
                    "country": "test",
                    "additional_info": "test",
                }
            ],
            "ve_window": [
                {
                    "plan_id": ObjectId(),
                    "title": "test",
                    "description": "test",
                }
            ],
        }

    def test_get_profile(self):
        """
        expect: successfully request profile
        """

        profile_manager = Profiles(self.db)
        profile = profile_manager.get_profile(CURRENT_ADMIN.username)
        self.assertIsNotNone(profile)
        self.assertEqual(profile["username"], self.default_profile["username"])
        self.assertEqual(profile["role"], self.default_profile["role"])
        self.assertEqual(profile["follows"], self.default_profile["follows"])
        self.assertEqual(profile["bio"], self.default_profile["bio"])
        self.assertEqual(profile["institution"], self.default_profile["institution"])
        self.assertEqual(profile["profile_pic"], self.default_profile["profile_pic"])
        self.assertEqual(profile["first_name"], self.default_profile["first_name"])
        self.assertEqual(profile["last_name"], self.default_profile["last_name"])
        self.assertEqual(profile["gender"], self.default_profile["gender"])
        self.assertEqual(profile["address"], self.default_profile["address"])
        self.assertEqual(profile["birthday"], self.default_profile["birthday"])
        self.assertEqual(profile["experience"], self.default_profile["experience"])
        self.assertEqual(profile["expertise"], self.default_profile["expertise"])
        self.assertEqual(profile["languages"], self.default_profile["languages"])
        self.assertEqual(profile["ve_ready"], self.default_profile["ve_ready"])
        self.assertEqual(
            profile["excluded_from_matching"],
            self.default_profile["excluded_from_matching"],
        )
        self.assertEqual(profile["ve_interests"], self.default_profile["ve_interests"])
        self.assertEqual(profile["ve_goals"], self.default_profile["ve_goals"])
        self.assertEqual(
            profile["preferred_formats"], self.default_profile["preferred_formats"]
        )
        self.assertEqual(
            profile["research_tags"], self.default_profile["research_tags"]
        )
        self.assertEqual(profile["courses"], self.default_profile["courses"])
        self.assertEqual(profile["educations"], self.default_profile["educations"])
        self.assertEqual(
            profile["work_experience"], self.default_profile["work_experience"]
        )
        self.assertEqual(profile["ve_window"], self.default_profile["ve_window"])

        # test again, but specify a projection of only first_name, last_name and expertise
        profile = profile_manager.get_profile(
            CURRENT_ADMIN.username,
            projection={"first_name": True, "last_name": True, "expertise": True},
        )
        self.assertIsNotNone(profile)
        self.assertIn("first_name", profile)
        self.assertIn("last_name", profile)
        self.assertIn("expertise", profile)
        self.assertNotIn("username", profile)
        self.assertNotIn("role", profile)
        self.assertNotIn("follows", profile)
        self.assertNotIn("bio", profile)
        self.assertNotIn("institution", profile)
        self.assertNotIn("profile_pic", profile)
        self.assertNotIn("gender", profile)
        self.assertNotIn("address", profile)
        self.assertNotIn("birthday", profile)
        self.assertNotIn("experience", profile)
        self.assertNotIn("languages", profile)
        self.assertNotIn("ve_ready", profile)
        self.assertNotIn("excluded_from_matching", profile)
        self.assertNotIn("ve_interests", profile)
        self.assertNotIn("ve_goals", profile)
        self.assertNotIn("preferred_formats", profile)
        self.assertNotIn("research_tags", profile)
        self.assertNotIn("courses", profile)
        self.assertNotIn("educations", profile)
        self.assertNotIn("work_experience", profile)
        self.assertNotIn("ve_window", profile)
        self.assertEqual(profile["first_name"], self.default_profile["first_name"])
        self.assertEqual(profile["last_name"], self.default_profile["last_name"])
        self.assertEqual(profile["expertise"], self.default_profile["expertise"])

    def test_get_profile_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException, profile_manager.get_profile, "non_existing"
        )

    def test_get_all_profiles(self):
        """
        expect: successfully request all profiles
        """

        # add 2 more profiles
        profile1 = self.create_profile("test1", ObjectId())
        profile2 = self.create_profile("test2", ObjectId())
        self.db.profiles.insert_many([profile1, profile2])

        profile_manager = Profiles(self.db)
        profiles = profile_manager.get_all_profiles()
        self.assertEqual(len(profiles), 3)
        self.assertIn(self.default_profile, profiles)
        self.assertIn(profile1, profiles)
        self.assertIn(profile2, profiles)

    def test_get_bulk_profiles(self):
        """
        expect: successfully request some profiles
        """

        # add 2 more profiles
        profile1 = self.create_profile("test1", ObjectId())
        profile2 = self.create_profile("test2", ObjectId())
        self.db.profiles.insert_many([profile1, profile2])

        # request profiles of CURRENT_ADMIN.username and test1
        profile_manager = Profiles(self.db)
        profiles = profile_manager.get_bulk_profiles([CURRENT_ADMIN.username, "test1"])
        self.assertEqual(len(profiles), 2)
        self.assertIn(self.default_profile, profiles)
        self.assertIn(profile1, profiles)
        self.assertNotIn(profile2, profiles)

        # request profiles where one of them doesnt exist, so it should be skipped
        profiles = profile_manager.get_bulk_profiles(
            [CURRENT_ADMIN.username, "test1", "non_existing"]
        )
        self.assertEqual(len(profiles), 2)
        self.assertIn(self.default_profile, profiles)
        self.assertIn(profile1, profiles)
        self.assertNotIn(profile2, profiles)

    def test_insert_default_profile(self):
        """
        expect: successfully create a default profile
        """

        profile_manager = Profiles(self.db)
        result = profile_manager.insert_default_profile(
            CURRENT_USER.username, "Test", "User", "test"
        )

        # check if profile was created
        profile = self.db.profiles.find_one({"_id": result["_id"]})
        self.assertIsNotNone(profile)
        self.assertEqual(profile["username"], CURRENT_USER.username)
        self.assertEqual(profile["role"], "guest")
        self.assertEqual(profile["follows"], [])
        self.assertEqual(profile["bio"], "")
        self.assertEqual(profile["institution"], "")
        self.assertEqual(profile["profile_pic"], "default_profile_pic.jpg")
        self.assertEqual(profile["first_name"], "Test")
        self.assertEqual(profile["last_name"], "User")
        self.assertEqual(profile["gender"], "")
        self.assertEqual(profile["address"], "")
        self.assertEqual(profile["birthday"], "")
        self.assertEqual(profile["experience"], [""])
        self.assertEqual(profile["expertise"], "")
        self.assertEqual(profile["languages"], [])
        self.assertEqual(profile["ve_ready"], True)
        self.assertEqual(profile["excluded_from_matching"], False)
        self.assertEqual(profile["ve_interests"], [""])
        self.assertEqual(profile["ve_goals"], [""])
        self.assertEqual(profile["preferred_formats"], [""])
        self.assertEqual(profile["research_tags"], [])
        self.assertEqual(profile["courses"], [])
        self.assertEqual(profile["educations"], [])
        self.assertEqual(profile["work_experience"], [])
        self.assertEqual(profile["ve_window"], [])

        # check that the profile was also replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", result["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)

    def test_insert_default_admin_profile(self):
        """
        expect: successfully create profile that has role "admin"
        """

        profile_manager = Profiles(self.db)
        result = profile_manager.insert_default_admin_profile(
            "test_admin2", "Test", "Admin2", "test"
        )

        # check if profile was created
        profile = self.db.profiles.find_one({"_id": result["_id"]})
        self.assertIsNotNone(profile)
        self.assertEqual(profile["username"], "test_admin2")
        self.assertEqual(profile["role"], "admin")
        self.assertEqual(profile["follows"], [])
        self.assertEqual(profile["bio"], "")
        self.assertEqual(profile["institution"], "")
        self.assertEqual(profile["profile_pic"], "default_profile_pic.jpg")
        self.assertEqual(profile["first_name"], "Test")
        self.assertEqual(profile["last_name"], "Admin2")
        self.assertEqual(profile["gender"], "")
        self.assertEqual(profile["address"], "")
        self.assertEqual(profile["birthday"], "")
        self.assertEqual(profile["experience"], [""])
        self.assertEqual(profile["expertise"], "")
        self.assertEqual(profile["languages"], [])
        self.assertEqual(profile["ve_ready"], True)
        self.assertEqual(profile["excluded_from_matching"], False)
        self.assertEqual(profile["ve_interests"], [""])
        self.assertEqual(profile["ve_goals"], [""])
        self.assertEqual(profile["preferred_formats"], [""])
        self.assertEqual(profile["research_tags"], [])
        self.assertEqual(profile["courses"], [])
        self.assertEqual(profile["educations"], [])
        self.assertEqual(profile["work_experience"], [])
        self.assertEqual(profile["ve_window"], [])

        # check that the profile was also replicated to elasticsearch
        response = requests.get(
            "{}/{}/_doc/{}".format(
                global_vars.elasticsearch_base_url, "test", result["_id"]
            ),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
        self.assertEqual(response.status_code, 200)

    def test_ensure_profile_exists(self):
        """
        expect: successfully create a default profile if it doesnt exist
        """

        # test with already existing profile
        profile_manager = Profiles(self.db)
        result = profile_manager.ensure_profile_exists(CURRENT_ADMIN.username)
        self.assertEqual(result["_id"], self.default_profile["_id"])

        # test with non existing username
        result = profile_manager.ensure_profile_exists("non_existing_user")
        self.assertIsNotNone(result)
        self.assertEqual(result["username"], "non_existing_user")
        self.assertEqual(result["role"], "guest")
        self.assertEqual(result["follows"], [])
        self.assertEqual(result["bio"], "")
        self.assertEqual(result["institution"], "")
        self.assertEqual(result["profile_pic"], "default_profile_pic.jpg")
        self.assertEqual(result["first_name"], "")
        self.assertEqual(result["last_name"], "")
        self.assertEqual(result["gender"], "")
        self.assertEqual(result["address"], "")
        self.assertEqual(result["birthday"], "")
        self.assertEqual(result["experience"], [""])
        self.assertEqual(result["expertise"], "")
        self.assertEqual(result["languages"], [])
        self.assertEqual(result["ve_ready"], True)
        self.assertEqual(result["excluded_from_matching"], False)
        self.assertEqual(result["ve_interests"], [""])
        self.assertEqual(result["ve_goals"], [""])
        self.assertEqual(result["preferred_formats"], [""])
        self.assertEqual(result["research_tags"], [])
        self.assertEqual(result["courses"], [])
        self.assertEqual(result["educations"], [])
        self.assertEqual(result["work_experience"], [])
        self.assertEqual(result["ve_window"], [])

        # also test that in this case an acl entry for "guest" was created if it not
        # already existed
        # only global acl tested here because we have no spaces
        global_acl = self.db.global_acl.find_one({"role": "guest"})
        self.assertIsNotNone(global_acl)

    def test_get_follows(self):
        """
        expect: successfully get follows
        """

        profile_manager = Profiles(self.db)
        follows = profile_manager.get_follows(CURRENT_ADMIN.username)
        self.assertEqual(len(follows), 1)
        self.assertEqual(follows[0], CURRENT_USER.username)

    def test_get_follow_error_profile_doesnt_exist(self):
        """
        expect: ProfileDoesntExistException is raised because no profile with this username exists
        """

        profile_manager = Profiles(self.db)
        self.assertRaises(
            ProfileDoesntExistException, profile_manager.get_follows, "non_existing"
        )


class SpaceResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.space_id = ObjectId()
        self.space_name = "test"
        self.default_space = {
            "_id": self.space_id,
            "name": self.space_name,
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }

        self.db.spaces.insert_one(self.default_space)

    def tearDown(self) -> None:
        super().tearDown()

        self.db.spaces.delete_many({})

        # delete all created files in gridfs
        fs = gridfs.GridFS(self.db)
        for fs_file in fs.find():
            fs.delete(fs_file._id)

    def test_check_space_exists_success(self):
        """
        expect: True because space exists
        """

        space_manager = Spaces(self.db)
        self.assertTrue(space_manager.check_space_exists(self.space_name))

    def test_check_space_exists_failure(self):
        """
        expect: False because either space doesn't exist or name is None
        """

        space_manager = Spaces(self.db)
        self.assertFalse(space_manager.check_space_exists("non_existing_space"))
        self.assertFalse(space_manager.check_space_exists(None))

    def test_check_user_is_space_admin(self):
        """
        expect: True because user is admin in the space
        """

        space_manager = Spaces(self.db)
        self.assertTrue(
            space_manager.check_user_is_space_admin(
                self.space_name, CURRENT_ADMIN.username
            )
        )

    def test_check_user_is_space_admin_failure(self):
        """
        expect: False because user is not admin in the space
        """

        space_manager = Spaces(self.db)
        self.assertFalse(
            space_manager.check_user_is_space_admin(
                self.space_name, CURRENT_USER.username
            )
        )

    def test_check_user_is_space_admin_error(self):
        """
        expect: SpaceDoesntExistError is raised because space name doesnt exist
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.check_user_is_space_admin,
            "non_existing_space",
            CURRENT_ADMIN.username,
        )

    def test_check_user_is_member(self):
        """
        expect: True because user is member
        """

        space_manager = Spaces(self.db)
        self.assertTrue(
            space_manager.check_user_is_member(self.space_name, CURRENT_ADMIN.username)
        )

    def test_check_user_is_member_failure(self):
        """
        expect: False because user is not member
        """

        space_manager = Spaces(self.db)
        self.assertFalse(
            space_manager.check_user_is_member(self.space_name, CURRENT_USER.username)
        )

    def test_check_user_is_member_error(self):
        """
        expect: SpaceDoesntExistError is raised because space name doesnt exist
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.check_user_is_member,
            "non_existing_space",
            CURRENT_ADMIN.username,
        )

    def test_get_space(self):
        """
        expect: successfully get space
        """

        space_manager = Spaces(self.db)
        space = space_manager.get_space(self.space_name)
        self.assertIsNotNone(space)
        self.assertEqual(space._id, self.default_space["_id"])
        self.assertEqual(space.invisible, self.default_space["invisible"])
        self.assertEqual(space.joinable, self.default_space["joinable"])
        self.assertEqual(space.members, self.default_space["members"])
        self.assertEqual(space.admins, self.default_space["admins"])
        self.assertEqual(space.invites, self.default_space["invites"])
        self.assertEqual(space.requests, self.default_space["requests"])
        self.assertEqual(space.files, self.default_space["files"])

    def test_get_space_failure(self):
        """
        expect: None returned because no space with this name was found
        """

        space_manager = Spaces(self.db)
        space = space_manager.get_space("non_existing_space")
        self.assertIsNone(space)

    def test_get_all_spaces(self):
        """
        expect: successfully get a list of all spaces
        """

        # add one more space
        additional_space = {
            "_id": ObjectId(),
            "name": "test2",
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }
        self.db.spaces.insert_one(additional_space)

        space_manager = Spaces(self.db)
        spaces = space_manager.get_all_spaces()
        self.assertEqual(len(spaces), 2)

    def test_get_all_spaces_visible_to_user(self):
        """
        expect: successfully get all spaces that are not invisible or where
        the user is a member
        """

        # add 3 more spaces
        additional_spaces = [
            # user can see this one because it is not invisible
            {
                "_id": ObjectId(),
                "name": "test2",
                "invisible": False,
                "joinable": True,
                "members": [],
                "admins": [],
                "invites": [],
                "requests": [],
                "files": [],
            },
            # user can see this one because it is invisible, but he is a member
            {
                "_id": ObjectId(),
                "name": "test3",
                "invisible": True,
                "joinable": True,
                "members": [CURRENT_ADMIN.username],
                "admins": [CURRENT_ADMIN.username],
                "invites": [],
                "requests": [],
                "files": [],
            },
            # user cannot see this one
            {
                "_id": ObjectId(),
                "name": "test4",
                "invisible": True,
                "joinable": True,
                "members": [],
                "admins": [],
                "invites": [],
                "requests": [],
                "files": [],
            },
        ]
        self.db.spaces.insert_many(additional_spaces)

        space_manager = Spaces(self.db)
        spaces = space_manager.get_all_spaces_visible_to_user(CURRENT_ADMIN.username)
        self.assertEqual(len(spaces), 3)
        space_names = [space.name for space in spaces]
        self.assertIn("test", space_names)
        self.assertIn("test2", space_names)
        self.assertIn("test3", space_names)
        self.assertNotIn("test4", space_names)

    def test_get_space_names(self):
        """
        expect: successfully get a list of all space names
        """

        # add one more space
        additional_space = {
            "_id": ObjectId(),
            "name": "test2",
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }
        self.db.spaces.insert_one(additional_space)

        space_manager = Spaces(self.db)
        space_names = space_manager.get_space_names()
        self.assertEqual(len(space_names), 2)
        self.assertIn("test", space_names)
        self.assertIn("test2", space_names)

    def test_get_spaces_of_user(self):
        """
        expect: successfully get a list of all spaces the user is a member of
        """

        # add 2 more space
        additional_spaces = [
            {
                "_id": ObjectId(),
                "name": "test2",
                "invisible": False,
                "joinable": True,
                "members": [CURRENT_ADMIN.username],
                "admins": [CURRENT_ADMIN.username],
                "invites": [],
                "requests": [],
                "files": [],
            },
            {
                "_id": ObjectId(),
                "name": "test3",
                "invisible": False,
                "joinable": True,
                "members": [],
                "admins": [],
                "invites": [],
                "requests": [],
                "files": [],
            },
        ]

        self.db.spaces.insert_many(additional_spaces)

        space_manager = Spaces(self.db)
        spaces = space_manager.get_spaces_of_user(CURRENT_ADMIN.username)
        self.assertEqual(len(spaces), 2)
        self.assertIn("test", spaces)
        self.assertIn("test2", spaces)

    def test_get_space_invites_of_user(self):
        """
        expect: successfully get a list of all pending invites that the user has
        """

        space_manager = Spaces(self.db)

        # as default, there should be no invites right now
        invites = space_manager.get_space_invites_of_user(CURRENT_ADMIN.username)
        self.assertEqual(invites, [])

        # add a space and set the user as invited
        additional_space = {
            "_id": ObjectId(),
            "name": "test2",
            "invisible": False,
            "joinable": True,
            "members": [],
            "admins": [],
            "invites": [CURRENT_ADMIN.username],
            "requests": [],
            "files": [],
        }
        self.db.spaces.insert_one(additional_space)

        invites = space_manager.get_space_invites_of_user(CURRENT_ADMIN.username)
        self.assertEqual(invites, ["test2"])

    def test_create_space(self):
        """
        expect: successfully create new space
        """

        new_space = {
            "name": "new_space",
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }

        space_manager = Spaces(self.db)
        space_manager.create_space(new_space)

        # check if space was created
        space = self.db.spaces.find_one({"name": "new_space"})
        self.assertIsNotNone(space)
        self.assertIsInstance(space["_id"], ObjectId)
        self.assertEqual(space["name"], new_space["name"])
        self.assertEqual(space["invisible"], new_space["invisible"])
        self.assertEqual(space["joinable"], new_space["joinable"])
        self.assertEqual(space["members"], new_space["members"])
        self.assertEqual(space["admins"], new_space["admins"])
        self.assertEqual(space["invites"], new_space["invites"])
        self.assertEqual(space["requests"], new_space["requests"])
        self.assertEqual(space["files"], new_space["files"])

    def test_create_space_failure_space_already_exists(self):
        """
        expect: SpaceAlreadyExistsError is raised because space with this name already exists
        """

        new_space = {
            "name": self.space_name,
            "invisible": False,
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceAlreadyExistsError, space_manager.create_space, new_space
        )

    def test_create_space_failure_invalid_attributes(self):
        """
        expect: a) ValueError is raised because space is missing an attribute,
        and b) TypeError is raised because an attribute has the wrong type
        """

        new_space = {
            "name": "new_space",
            "joinable": True,
            "members": [CURRENT_ADMIN.username],
            "admins": [CURRENT_ADMIN.username],
            "invites": [],
            "requests": [],
            "files": [],
        }

        # invisible is missing
        space_manager = Spaces(self.db)
        self.assertRaises(ValueError, space_manager.create_space, new_space)

        # invisible has wrong type
        new_space["invisible"] = "test"
        self.assertRaises(TypeError, space_manager.create_space, new_space)

    def test_delete_space(self):
        """
        expect: successfully delete space
        """

        space_manager = Spaces(self.db)
        space_manager.delete_space(self.space_name)

        # check if space was deleted
        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertIsNone(space)

    def test_delete_space_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError, space_manager.delete_space, "non_existing_space"
        )

    def test_is_space_directly_joinable(self):
        """
        expect: successfully retrieve joinable attribute of space
        """

        space_manager = Spaces(self.db)
        joinable = space_manager.is_space_directly_joinable(self.space_name)
        self.assertEqual(joinable, self.default_space["joinable"])

    def test_is_space_directly_joinable_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.is_space_directly_joinable,
            "non_existing_space",
        )

    def test_join_space(self):
        """
        expect: successfully add user to the space members list
        """

        space_manager = Spaces(self.db)
        space_manager.join_space(self.space_name, CURRENT_USER.username)

        # check if user was added to members list
        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertIn(CURRENT_USER.username, space["members"])

    def test_join_space_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.join_space,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_join_space_error_already_member(self):
        """
        expect: AlreadyMemberError is raised because is already a member of
        the space
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            AlreadyMemberError,
            space_manager.join_space,
            self.space_name,
            CURRENT_ADMIN.username,
        )

    def test_join_space_request(self):
        """
        expect: successfully add the user to the space requests list
        """

        space_manager = Spaces(self.db)
        space_manager.join_space_request(self.space_name, CURRENT_USER.username)

        # check if user was added to requests list
        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertIn(CURRENT_USER.username, space["requests"])

    def test_join_space_request_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.join_space_request,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_join_space_request_error_already_requested_join(self):
        """
        expect: AlreadyRequestJoinError is raised because user already requested
        to join the space previously
        """

        # manually add user to requests list
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"requests": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        self.assertRaises(
            AlreadyRequestedJoinError,
            space_manager.join_space_request,
            self.space_name,
            CURRENT_USER.username,
        )

    def test_add_space_admin(self):
        """
        expect: successfully set user as space admin
        """

        space_manager = Spaces(self.db)
        space_manager.add_space_admin(self.space_name, CURRENT_USER.username)

        # check if user was added to admins list, which includes being in the members list
        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertIn(CURRENT_USER.username, space["admins"])
        self.assertIn(CURRENT_USER.username, space["members"])

    def test_add_space_admin_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.add_space_admin,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_add_space_admin_error_already_admin(self):
        """
        expect: AlreadyAdminError is raised because user is already an admin in this space
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            AlreadyAdminError,
            space_manager.add_space_admin,
            self.space_name,
            CURRENT_ADMIN.username,
        )

    def test_set_space_picture(self):
        """
        expect: successfully set picture of space with dummy bytes string
        """

        space_manager = Spaces(self.db)
        space_manager.set_space_picture(
            self.space_name, "test_pic", b"test", "image/jpg"
        )

        space = self.db.spaces.find_one({"name": self.space_name})
        space_pic_id = space["space_pic"]

        fs = gridfs.GridFS(self.db)
        space_pic = fs.get(space_pic_id)
        self.assertEqual(space_pic.read(), b"test")

    def test_set_space_picture_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.set_space_picture,
            "non_existing_space",
            "test_pic",
            b"test",
            "image/jpg",
        )

    def test_set_space_description(self):
        """
        expect: successfully set space description
        """

        space_manager = Spaces(self.db)
        space_manager.set_space_description(self.space_name, "test_description")

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(space["space_description"], "test_description")

    def test_set_space_description_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.set_space_description,
            "non_existing_space",
            "test_description",
        )

    def test_invite_user(self):
        """
        expect: successfully add user to invites list
        """

        space_manager = Spaces(self.db)
        space_manager.invite_user(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertIn(CURRENT_USER.username, space["invites"])

    def test_invite_user_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.invite_user,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_accept_space_invite(self):
        """
        expect: successfully remove user from invites list and
        add him to members list
        """

        # manually add user to invites list
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"invites": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.accept_space_invite(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["invites"])
        self.assertIn(CURRENT_USER.username, space["members"])

    def test_accept_space_invite_error_user_not_invited(self):
        """
        expect: UserNotInvitedError is raised because user is not invited to the space
        and can therefore not gain entry by fake-accepting a request
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            UserNotInvitedError,
            space_manager.accept_space_invite,
            self.space_name,
            CURRENT_USER.username,
        )

    def test_accept_space_invite_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.accept_space_invite,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_decline_space_invite(self):
        """
        expect: successfully decline invite to a space, i.e. not get added to members list
        """

        # manually add user to invites list
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"invites": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.decline_space_invite(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["invites"])
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_decline_space_invite_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.decline_space_invite,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_accept_join_request(self):
        """
        expect: successfully accept join request, i.e. get added to members list
        """

        # manually add user to requests list
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"requests": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.accept_join_request(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["requests"])
        self.assertIn(CURRENT_USER.username, space["members"])

    def test_accept_join_request_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.accept_join_request,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_accept_join_request_error_not_request_to_join(self):
        """
        expect: NotRequestedJoinError is raised because user didnt request
        to join in the first place, so cannot be accepted
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            NotRequestedJoinError,
            space_manager.accept_join_request,
            self.space_name,
            CURRENT_USER.username,
        )

    def test_reject_join_request(self):
        """
        expect: successfully reject join request, i.e. not get added to members list
        """

        # manually add user to requests list
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"requests": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.reject_join_request(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["requests"])
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_reject_join_request_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no
        space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.reject_join_request,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_toggle_visibility(self):
        """
        expect: set visibility attribute to True if it was False and False if it was True
        """

        current_visibility = self.default_space["invisible"]
        space_manager = Spaces(self.db)
        space_manager.toggle_visibility(self.space_name)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(space["invisible"], not current_visibility)

        # try again backwards
        space_manager.toggle_visibility(self.space_name)
        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(space["invisible"], current_visibility)

    def test_leave_space_member(self):
        """
        expect: successfully leave space as member
        """

        # manually add other user to space first
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"members": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.leave_space(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_leave_space_admin(self):
        """
        expect: successfully leave space as admin
        """

        # manually add another admin first, becuase otherwise OnylAdminError should raise
        self.db.spaces.update_one(
            {"name": self.space_name},
            {
                "$push": {
                    "admins": CURRENT_USER.username,
                    "members": CURRENT_USER.username,
                }
            },
        )

        space_manager = Spaces(self.db)
        space_manager.leave_space(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["admins"])
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_leave_space_error_only_admin(self):
        """
        expect: OnlyAdminError is raised because user is the only admin of the space,
        and therefore cannot leave without giving admin rights to somebody else before
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            OnlyAdminError,
            space_manager.leave_space,
            self.space_name,
            CURRENT_ADMIN.username,
        )

    def test_leave_space_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.leave_space,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_kick_user(self):
        """
        expect: successfully kick user from space
        """

        # manually add user to space first
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"members": CURRENT_USER.username}},
        )

        space_manager = Spaces(self.db)
        space_manager.kick_user(self.space_name, CURRENT_USER.username)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["members"])

    def test_kick_user_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.kick_user,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_kick_user_error_user_not_member(self):
        """
        expect: UserNotMemberError is raised because user is not a member of the space
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            UserNotMemberError,
            space_manager.kick_user,
            self.space_name,
            CURRENT_USER.username,
        )

    def test_revoke_space_admin_privilege(self):
        """
        expect: successfully remove user from admins list
        """

        # manually add user to admins list first
        self.db.spaces.update_one(
            {"name": self.space_name},
            {
                "$push": {
                    "admins": CURRENT_USER.username,
                    "members": CURRENT_USER.username,
                }
            },
        )

        space_manager = Spaces(self.db)
        space_manager.revoke_space_admin_privilege(
            self.space_name, CURRENT_USER.username
        )

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertNotIn(CURRENT_USER.username, space["admins"])
        self.assertIn(CURRENT_USER.username, space["members"])

    def test_revoke_space_admin_privileges_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.revoke_space_admin_privilege,
            "non_existing_space",
            CURRENT_USER.username,
        )

    def test_revoke_space_admin_privileges_error_user_not_admin(self):
        """
        expect: UserNotAdminError is raised because user is not an admin of the space
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            UserNotAdminError,
            space_manager.revoke_space_admin_privilege,
            self.space_name,
            CURRENT_USER.username,
        )

    def test_revoke_space_admin_privileges_error_only_admin(self):
        """
        expect: OnlyAdminError is raised because the to-be-degraded user is
        the only admin of the space
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            OnlyAdminError,
            space_manager.revoke_space_admin_privilege,
            self.space_name,
            CURRENT_ADMIN.username,
        )

    def test_get_files(self):
        """
        expect: successfully get all files metadata of the space
        """

        space_manager = Spaces(self.db)

        # default case
        files = space_manager.get_files(self.space_name)
        self.assertEqual(files, self.default_space["files"])

        # add file metadata to space
        additional_file = {
            "author": CURRENT_USER.username,
            "file_id": ObjectId(),
            "manually_uploaded": True,
        }
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"files": additional_file}},
        )
        files = space_manager.get_files(self.space_name)
        self.assertEqual(files, [additional_file])

    def test_get_files_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError, space_manager.get_files, "non_existing_space"
        )

    def test_add_new_post_file(self):
        """
        expect: successfully add new file that was originally added from a post,
        therefore only metadata are inserted
        """

        file_id = ObjectId()
        space_manager = Spaces(self.db)
        space_manager.add_new_post_file(
            self.space_name,
            CURRENT_USER.username,
            file_id,
        )

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(
            space["files"],
            [
                {
                    "author": CURRENT_USER.username,
                    "file_id": file_id,
                    "manually_uploaded": False,
                }
            ],
        )

    def test_add_new_post_file_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        file_id = ObjectId()
        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.add_new_post_file,
            "non_existing_space",
            CURRENT_USER.username,
            file_id,
        )

    def test_add_new_post_file_error_file_already_in_repo(self):
        """
        expect: FileAlreadyInRepoError is raised because the same file already exists
        """

        # manually add post file
        file_obj = {
            "author": CURRENT_USER.username,
            "file_id": ObjectId(),
            "manually_uploaded": False,
        }
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        self.assertRaises(
            FileAlreadyInRepoError,
            space_manager.add_new_post_file,
            self.space_name,
            CURRENT_USER.username,
            file_obj["file_id"],
        )

    def test_add_new_repo_file(self):
        """
        expect: successfully add new file to the space repo
        """

        space_manager = Spaces(self.db)
        _id = space_manager.add_new_repo_file(
            self.space_name,
            "test_file",
            b"test",
            "image/jpg",
            CURRENT_ADMIN.username,
        )

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(
            space["files"],
            [
                {
                    "author": CURRENT_ADMIN.username,
                    "file_id": _id,
                    "manually_uploaded": True,
                }
            ],
        )
        fs = gridfs.GridFS(self.db)
        self.assertEqual(fs.get(_id).read(), b"test")

    def test_add_new_repo_file_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.add_new_repo_file,
            "non_existing_space",
            "test_file",
            b"test",
            "image/jpg",
            CURRENT_ADMIN.username,
        )

    def test_remove_file(self):
        """
        expect: successfully remove file from space repo
        """

        # manually add file to space repo
        file_id = gridfs.GridFS(self.db).put(b"test")
        file_obj = {
            "author": CURRENT_ADMIN.username,
            "file_id": file_id,
            "manually_uploaded": True,
        }
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        space_manager.remove_file(self.space_name, file_id)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(space["files"], [])
        self.assertFalse(gridfs.GridFS(self.db).exists(file_id))

    def test_remove_file_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        file_id = ObjectId()
        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.remove_file,
            "non_existing_space",
            file_id,
        )

    def test_remove_file_error_post_file_not_deletable(self):
        """
        expect: PostFileNotDeleteableError is raised because the file was originally
        added from a post and therefore cannot be deleted manually, only by
        deleting the corresponding post
        """

        # manually add post file metadata
        file_id = ObjectId()
        file_obj = {
            "author": CURRENT_ADMIN.username,
            "file_id": file_id,
            "manually_uploaded": False,
        }
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        self.assertRaises(
            PostFileNotDeleteableError,
            space_manager.remove_file,
            self.space_name,
            file_id,
        )

    def test_remove_file_error_file_doesnt_exist(self):
        """
        expect: FileDoesntExistError is raised because no file with this id exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            FileDoesntExistError,
            space_manager.remove_file,
            self.space_name,
            ObjectId(),
        )

    def test_remove_post_file(self):
        """
        expect: successfully remove file, even if it has manually_uploaded=False,
        should only be called in conjunction with deleting the corresponding post
        """

        # manually add post file metadata
        file_id = ObjectId()
        file_obj = {
            "author": CURRENT_ADMIN.username,
            "file_id": file_id,
            "manually_uploaded": False,
        }
        self.db.spaces.update_one(
            {"name": self.space_name},
            {"$push": {"files": file_obj}},
        )

        space_manager = Spaces(self.db)
        space_manager.remove_post_file(self.space_name, file_id)

        space = self.db.spaces.find_one({"name": self.space_name})
        self.assertEqual(space["files"], [])

    def test_remove_post_file_error_space_doesnt_exist(self):
        """
        expect: SpaceDoesntExistError is raised because no space with this name exists
        """

        file_id = ObjectId()
        space_manager = Spaces(self.db)
        self.assertRaises(
            SpaceDoesntExistError,
            space_manager.remove_post_file,
            "non_existing_space",
            file_id,
        )

    def test_remove_post_file_error_file_doesnt_exist(self):
        """
        expect: FileDoesntExistError is raised because no file with this id exists
        """

        space_manager = Spaces(self.db)
        self.assertRaises(
            FileDoesntExistError,
            space_manager.remove_post_file,
            self.space_name,
            ObjectId(),
        )


class PostSpaceACLResourceIntegrationTest(BaseResourceTestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_delete_space_side_effects(self):
        """
        expect: when deleting a space, all posts and corresponding ACL
        entries get deleted as well
        """

        # TODO


class PlanResourceTest(BaseResourceTestCase):
    def setUp(self) -> None:
        super().setUp()

        # manually set up a VEPlan in the db
        self.plan_id = ObjectId()
        self.step = self.create_step("test")
        self.target_group = self.create_target_group("test")
        self.institution = self.create_institution("test")
        self.lecture = self.create_lecture("test")
        self.default_plan = {
            "_id": self.plan_id,
            "author": "test_user",
            "read_access": ["test_user", "test_admin"],
            "write_access": ["test_user"],
            "creation_timestamp": datetime.now(),
            "last_modified": datetime.now(),
            "name": "test",
            "partners": ["test_admin"],
            "institutions": [self.institution.to_dict()],
            "topic": "test",
            "lectures": [self.lecture.to_dict()],
            "audience": [self.target_group.to_dict()],
            "languages": ["test", "test"],
            "timestamp_from": self.step.timestamp_from,
            "timestamp_to": self.step.timestamp_to,
            "involved_parties": ["test", "test"],
            "realization": "test",
            "learning_env": "test",
            "tools": ["test", "test"],
            "new_content": False,
            "formalities": {
                "technology": False,
                "exam_regulations": False,
            },
            "duration": self.step.duration.total_seconds(),
            "workload": self.step.workload,
            "steps": [self.step.to_dict()],
        }
        self.db.plans.insert_one(self.default_plan)

        # initialize planner
        self.planner = VEPlanResource(self.db)

    def tearDown(self) -> None:
        # delete all plans
        self.db.plans.delete_many({})
        return super().tearDown()

    def test_get_plan(self):
        """
        expect: sucessfully get the plan from the db, both by passing the _id as str
        or as an ObjectId
        """

        # test with both input types (str and ObjectId)
        for id_input in [self.plan_id, str(self.plan_id)]:
            with self.subTest(id_input=id_input):
                plan = self.planner.get_plan(id_input)
                self.assertIsInstance(plan, VEPlan)
                self.assertEqual(plan._id, self.default_plan["_id"])
                self.assertEqual(plan.author, self.default_plan["author"])
                self.assertEqual(plan.name, self.default_plan["name"])
                self.assertEqual(plan.partners, self.default_plan["partners"])
                self.assertEqual(
                    [institution.to_dict() for institution in plan.institutions],
                    self.default_plan["institutions"],
                )
                self.assertEqual(plan.topic, self.default_plan["topic"])
                self.assertEqual(
                    [lecture.to_dict() for lecture in plan.lectures],
                    self.default_plan["lectures"],
                )
                self.assertEqual(
                    [target_group.to_dict() for target_group in plan.audience],
                    self.default_plan["audience"],
                )
                self.assertEqual(plan.languages, self.default_plan["languages"])
                self.assertEqual(
                    plan.involved_parties, self.default_plan["involved_parties"]
                )
                self.assertEqual(plan.realization, self.default_plan["realization"])
                self.assertEqual(plan.learning_env, self.default_plan["learning_env"])
                self.assertEqual(plan.tools, self.default_plan["tools"])
                self.assertEqual(plan.new_content, self.default_plan["new_content"])
                self.assertEqual(plan.formalities, self.default_plan["formalities"])
                self.assertEqual(
                    [step.to_dict() for step in plan.steps], self.default_plan["steps"]
                )
                self.assertEqual(plan.timestamp_from, self.step.timestamp_from)
                self.assertEqual(plan.timestamp_to, self.step.timestamp_to)
                self.assertEqual(plan.workload, self.step.workload)
                self.assertEqual(plan.duration, self.step.duration)
                self.assertIsNotNone(plan.creation_timestamp)
                self.assertIsNotNone(plan.last_modified)

    def test_get_plan_with_user(self):
        """
        expect: sucessfully get the plan from the db, both by passing the _id as str
        or as an ObjectId and passing the access checks
        """

        # test with both input types (str and ObjectId)
        for id_input in [self.plan_id, str(self.plan_id)]:
            with self.subTest(id_input=id_input):
                plan = self.planner.get_plan(id_input, "test_user")
                self.assertIsInstance(plan, VEPlan)
                self.assertEqual(plan._id, self.default_plan["_id"])
                self.assertEqual(plan.author, self.default_plan["author"])
                self.assertEqual(plan.name, self.default_plan["name"])
                self.assertEqual(plan.partners, self.default_plan["partners"])
                self.assertEqual(
                    [institution.to_dict() for institution in plan.institutions],
                    self.default_plan["institutions"],
                )
                self.assertEqual(plan.topic, self.default_plan["topic"])
                self.assertEqual(
                    [lecture.to_dict() for lecture in plan.lectures],
                    self.default_plan["lectures"],
                )
                self.assertEqual(
                    [target_group.to_dict() for target_group in plan.audience],
                    self.default_plan["audience"],
                )
                self.assertEqual(plan.languages, self.default_plan["languages"])
                self.assertEqual(
                    plan.involved_parties, self.default_plan["involved_parties"]
                )
                self.assertEqual(plan.realization, self.default_plan["realization"])
                self.assertEqual(plan.learning_env, self.default_plan["learning_env"])
                self.assertEqual(plan.tools, self.default_plan["tools"])
                self.assertEqual(plan.new_content, self.default_plan["new_content"])
                self.assertEqual(plan.formalities, self.default_plan["formalities"])
                self.assertEqual(
                    [step.to_dict() for step in plan.steps], self.default_plan["steps"]
                )
                self.assertEqual(plan.timestamp_from, self.step.timestamp_from)
                self.assertEqual(plan.timestamp_to, self.step.timestamp_to)
                self.assertEqual(plan.workload, self.step.workload)
                self.assertEqual(plan.duration, self.step.duration)
                self.assertIsNotNone(plan.creation_timestamp)
                self.assertIsNotNone(plan.last_modified)

    def test_get_plan_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with the given _id
        exists
        """
        non_existing_id = ObjectId()

        # test with both input types (str and ObjectId)
        for id_input in [non_existing_id, str(non_existing_id)]:
            with self.subTest(id_input=id_input):
                self.assertRaises(PlanDoesntExistError, self.planner.get_plan, id_input)

    def test_get_plan_error_no_read_access(self):
        """
        expect: fail message because username has no read access
        """

        # test with both input types (str and ObjectId)
        for id_input in [self.plan_id, str(self.plan_id)]:
            with self.subTest(id_input=id_input):
                self.assertRaises(
                    NoReadAccessError,
                    self.planner.get_plan,
                    id_input,
                    "user_with_no_access",
                )

    def test_get_plan_error_plan_doesnt_exist_invalid_id(self):
        """
        expect: PlanDoesntExistError is raised because the given _id is not a valid
        ObjectId, therefore no plan can exist with this _id
        """

        wrong_id_format = "123"
        self.assertRaises(PlanDoesntExistError, self.planner.get_plan, wrong_id_format)

    def test_get_all_plans(self):
        """
        expect: a list with exactly one VEPlan object inside
        (the one inserted by `setUp()`)
        """

        plans = self.planner.get_all()
        self.assertIsInstance(plans, list)
        self.assertEqual(len(plans), 1)
        plan = plans[0]
        self.assertIsInstance(plan, VEPlan)
        self.assertEqual(plan._id, self.default_plan["_id"])
        self.assertEqual(plan.author, self.default_plan["author"])
        self.assertEqual(plan.name, self.default_plan["name"])
        self.assertEqual(plan.partners, self.default_plan["partners"])
        self.assertEqual(
            [institution.to_dict() for institution in plan.institutions],
            self.default_plan["institutions"],
        )
        self.assertEqual(plan.topic, self.default_plan["topic"])
        self.assertEqual(
            [lecture.to_dict() for lecture in plan.lectures],
            self.default_plan["lectures"],
        )
        self.assertEqual(
            [target_group.to_dict() for target_group in plan.audience],
            self.default_plan["audience"],
        )
        self.assertEqual(plan.languages, self.default_plan["languages"])
        self.assertEqual(plan.involved_parties, self.default_plan["involved_parties"])
        self.assertEqual(plan.realization, self.default_plan["realization"])
        self.assertEqual(plan.learning_env, self.default_plan["learning_env"])
        self.assertEqual(plan.tools, self.default_plan["tools"])
        self.assertEqual(plan.new_content, self.default_plan["new_content"])
        self.assertEqual(plan.formalities, self.default_plan["formalities"])
        self.assertEqual(
            [step.to_dict() for step in plan.steps], self.default_plan["steps"]
        )
        self.assertEqual(plan.timestamp_from, self.step.timestamp_from)
        self.assertEqual(plan.timestamp_to, self.step.timestamp_to)
        self.assertEqual(plan.workload, self.step.workload)
        self.assertEqual(plan.duration, self.step.duration)
        self.assertIsNotNone(plan.creation_timestamp)
        self.assertIsNotNone(plan.last_modified)

    def test_get_plans_for_user(self):
        """
        expect: only show plans that the user is allowed to see, i.e. their
        own and those with read/write permissions.
        """

        # insert 2 more plans with different authorships
        additional_plans = [
            {
                "_id": ObjectId(),
                "author": "test_admin",
                "creation_timestamp": datetime.now(),
                "last_modified": datetime.now(),
                "name": "admin",
                "partners": ["test_user"],
                "institutions": [self.institution.to_dict()],
                "topic": "test",
                "lectures": [self.lecture.to_dict()],
                "audience": [self.target_group.to_dict()],
                "languages": ["test", "test"],
                "timestamp_from": self.step.timestamp_from,
                "timestamp_to": self.step.timestamp_to,
                "involved_parties": ["test", "test"],
                "realization": "test",
                "learning_env": "test",
                "tools": ["test", "test"],
                "new_content": False,
                "formalities": {
                    "technology": False,
                    "exam_regulations": False,
                },
                "duration": self.step.duration.total_seconds(),
                "workload": self.step.workload,
                "steps": [self.step.to_dict()],
            },
            {
                "_id": ObjectId(),
                "creation_timestamp": datetime.now(),
                "last_modified": datetime.now(),
                "name": "user",
                "partners": [],
                "institutions": [self.institution.to_dict()],
                "topic": "test",
                "lectures": [self.lecture.to_dict()],
                "audience": [self.target_group.to_dict()],
                "languages": ["test", "test"],
                "timestamp_from": self.step.timestamp_from,
                "timestamp_to": self.step.timestamp_to,
                "involved_parties": ["test", "test"],
                "realization": "test",
                "learning_env": "test",
                "tools": ["test", "test"],
                "new_content": False,
                "formalities": {
                    "technology": False,
                    "exam_regulations": False,
                },
                "duration": self.step.duration.total_seconds(),
                "workload": self.step.workload,
                "steps": [self.step.to_dict()],
            },
        ]
        self.db.plans.insert_many(additional_plans)

        plans = self.planner.get_plans_for_user("test_admin")
        # since one of the plans belong to the user and he has read_access to the default one,
        # we expect the result to be filtered accordingly (2 results here)
        self.assertEqual(len(plans), 2)
        plan = plans[0]
        for plan in plans:
            self.assertIn(
                plan._id, [self.default_plan["_id"], additional_plans[0]["_id"]]
            )

    def test_insert_plan(self):
        """
        expect: successfully insert a new plan into the db
        """

        # don't supply a _id, letting the system create a fresh one
        plan = {
            "name": "new plan",
            "partners": ["test_admin"],
            "author": "test_user",
            "read_access": ["test_user"],
            "write_access": ["test_user"],
            "institutions": [self.institution.to_dict()],
            "topic": "test",
            "lectures": [self.lecture.to_dict()],
            "audience": [self.target_group.to_dict()],
            "languages": ["test", "test"],
            "timestamp_from": self.step.timestamp_from,
            "timestamp_to": self.step.timestamp_to,
            "involved_parties": ["test", "test"],
            "realization": "test",
            "learning_env": "test",
            "tools": ["test", "test"],
            "new_content": False,
            "formalities": {
                "technology": False,
                "exam_regulations": False,
            },
            "duration": self.step.duration.total_seconds(),
            "workload": self.step.workload,
            "steps": [self.step.to_dict()],
        }

        # expect the _id of the freshly inserted plan as a response
        inserted_id = self.planner.insert_plan(VEPlan.from_dict(plan))
        self.assertIsInstance(inserted_id, ObjectId)

        # expect the plan to be in the db
        db_state = self.db.plans.find_one({"_id": inserted_id})
        self.assertIsNotNone(db_state)
        self.assertIn("duration", db_state)
        self.assertIn("workload", db_state)
        self.assertEqual(db_state["duration"], self.step.duration.total_seconds())
        self.assertEqual(db_state["workload"], self.step.workload)
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

        # this time supply a _id, but if I "know" that it is not already existing,
        # the result will despite that be an insert as expected
        plan_with_id = {
            "_id": ObjectId(),
            "author": "test_user",
            "read_access": ["test_user"],
            "write_access": ["test_user"],
            "name": "new plan",
            "partners": ["test_admin"],
            "institutions": [self.institution.to_dict()],
            "topic": "test",
            "lectures": [self.lecture.to_dict()],
            "audience": [self.target_group.to_dict()],
            "languages": ["test", "test"],
            "timestamp_from": self.step.timestamp_from,
            "timestamp_to": self.step.timestamp_to,
            "involved_parties": ["test", "test"],
            "realization": "test",
            "learning_env": "test",
            "tools": ["test", "test"],
            "new_content": False,
            "formalities": {
                "technology": False,
                "exam_regulations": False,
            },
            "duration": self.step.duration.total_seconds(),
            "workload": self.step.workload,
            "steps": [self.step.to_dict()],
        }

        # expect an "inserted" response
        result_with_id = self.planner.insert_plan(VEPlan.from_dict(plan_with_id))
        self.assertIsInstance(result_with_id, ObjectId)

        # expect the plan to be in the db
        db_state_with_id = self.db.plans.find_one({"_id": result_with_id})
        self.assertIsNotNone(db_state_with_id)
        self.assertIn("duration", db_state_with_id)
        self.assertIn("workload", db_state_with_id)
        self.assertEqual(
            db_state_with_id["duration"], self.step.duration.total_seconds()
        )
        self.assertEqual(db_state_with_id["workload"], self.step.workload)
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

    def test_insert_plan_error_plan_already_exists(self):
        """
        expect: PlanAlreadyExistsError is raised because a plan with the specified _id
        already exists in the db
        """

        plan = VEPlan(_id=self.plan_id)
        self.assertRaises(PlanAlreadyExistsError, self.planner.insert_plan, plan)

    def test_update_plan(self):
        """
        expect: successfully update a plan by supplying one with a _id that already exists
        """

        # we need to delay our execution here just a little bit, because otherwise
        # the update would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)

        # use the default plan, but change its name and topic
        existing_plan = VEPlan.from_dict(self.default_plan)
        existing_plan.name = "updated_name"
        existing_plan.topic = "new_topic"

        # expect an "updated" response
        result = self.planner.update_full_plan(existing_plan)
        self.assertIsInstance(result, ObjectId)
        self.assertEqual(result, existing_plan._id)

        # expect that the name and topic was updated in the db, but other values
        # remain the same
        db_state = self.db.plans.find_one({"_id": existing_plan._id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], existing_plan.name)
        self.assertEqual(db_state["topic"], existing_plan.topic)
        self.assertEqual(db_state["realization"], self.default_plan["realization"])
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_plan_with_user(self):
        """
        expect: successfully update a plan by supplying one with a _id that already exists and passing
        access checks
        """

        # we need to delay our execution here just a little bit, because otherwise
        # the update would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)

        # use the default plan, but change its name and topic
        existing_plan = VEPlan.from_dict(self.default_plan)
        existing_plan.name = "updated_name"
        existing_plan.topic = "new_topic"

        # expect an "updated" response
        result = self.planner.update_full_plan(
            existing_plan, requesting_username="test_user"
        )
        self.assertIsInstance(result, ObjectId)
        self.assertEqual(result, existing_plan._id)

        # expect that the name and topic was updated in the db, but other values
        # remain the same
        db_state = self.db.plans.find_one({"_id": existing_plan._id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], existing_plan.name)
        self.assertEqual(db_state["topic"], existing_plan.topic)
        self.assertEqual(db_state["realization"], self.default_plan["realization"])
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_plan_upsert(self):
        """
        expect: even though the update function is called, a new plan is inserted
        because the upsert flag was set to True
        """

        plan = VEPlan(name="upsert_test")

        result = self.planner.update_full_plan(plan, upsert=True)
        self.assertIsInstance(result, ObjectId)
        self.assertEqual(result, plan._id)

        # expect the plan to be in the db
        db_state = self.db.plans.find_one({"_id": plan._id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], plan.name)
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

    def test_update_plan_upsert_with_user(self):
        """
        expect: even though the update function is called, a new plan is inserted
        because the upsert flag was set to True. write access checks don't matter, since
        the plan gets inserted freshly.
        """

        plan = VEPlan(name="upsert_test")

        result = self.planner.update_full_plan(
            plan,
            upsert=True,
            requesting_username="access_doesnt_matter_in_this_case_user",
        )
        self.assertIsInstance(result, ObjectId)
        self.assertEqual(result, plan._id)

        # expect the plan to be in the db
        db_state = self.db.plans.find_one({"_id": plan._id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["name"], plan.name)
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

    def test_update_plan_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with the specified
        _id is present in the db and the upsert flag is set to False
        """

        self.assertRaises(PlanDoesntExistError, self.planner.update_full_plan, VEPlan())

    def test_update_plan_erro_no_write_access(self):
        """
        expect: NoWriteAccessError is raised because user has no write permission
        """

        self.assertRaises(
            NoWriteAccessError,
            self.planner.update_full_plan,
            VEPlan(_id=self.default_plan["_id"], name="trying_to_update"),
            False,
            "user_with_no_write_access",
        )

    def test_update_field(self):
        """
        expect: successfully update a single field of a VEPlan
        """

        self.planner.update_field(self.plan_id, "topic", "updated_topic")
        self.planner.update_field(
            self.plan_id, "involved_parties", ["update1", "update2"]
        )
        self.planner.update_field(self.plan_id, "realization", "updated_realization")
        self.planner.update_field(self.plan_id, "learning_env", "updated_learning_env")
        self.planner.update_field(self.plan_id, "tools", ["update1", "update2"])
        self.planner.update_field(self.plan_id, "new_content", True)
        self.planner.update_field(
            self.plan_id, "formalities", {"technology": True, "exam_regulations": True}
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["topic"], "updated_topic")
        self.assertEqual(db_state["involved_parties"], ["update1", "update2"])
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertEqual(db_state["learning_env"], "updated_learning_env")
        self.assertEqual(db_state["tools"], ["update1", "update2"])
        self.assertEqual(db_state["new_content"], True)
        self.assertEqual(
            db_state["formalities"], {"technology": True, "exam_regulations": True}
        )
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_field_with_user(self):
        """
        expect: successfully update a single field of a VEPlan and passing access checks
        """

        self.planner.update_field(
            self.plan_id, "topic", "updated_topic", requesting_username="test_user"
        )
        self.planner.update_field(
            self.plan_id,
            "involved_parties",
            ["update1", "update2"],
            requesting_username="test_user",
        )
        self.planner.update_field(
            self.plan_id,
            "realization",
            "updated_realization",
            requesting_username="test_user",
        )
        self.planner.update_field(
            self.plan_id,
            "learning_env",
            "updated_learning_env",
            requesting_username="test_user",
        )
        self.planner.update_field(
            self.plan_id,
            "tools",
            ["update1", "update2"],
            requesting_username="test_user",
        )
        self.planner.update_field(
            self.plan_id, "new_content", True, requesting_username="test_user"
        )
        self.planner.update_field(
            self.plan_id,
            "formalities",
            {"technology": True, "exam_regulations": True},
            requesting_username="test_user",
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["topic"], "updated_topic")
        self.assertEqual(db_state["involved_parties"], ["update1", "update2"])
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertEqual(db_state["learning_env"], "updated_learning_env")
        self.assertEqual(db_state["tools"], ["update1", "update2"])
        self.assertEqual(db_state["new_content"], True)
        self.assertEqual(
            db_state["formalities"], {"technology": True, "exam_regulations": True}
        )
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_field_object(self):
        """
        expect: successfully update a single field of a VEPlan that
        is not a primitive type
        """

        tg = TargetGroup(
            name="updated_name",
            age_min=10,
            age_max=20,
            experience="updated_experience",
            academic_course="updated_academic_course",
            mother_tongue="de",
            foreign_languages={"en": "c1"},
            learning_goal="test",
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(self.plan_id, "audience", [tg.to_dict()])

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIsInstance(db_state["audience"][0]["_id"], ObjectId)
        self.assertEqual(db_state["audience"][0]["name"], tg.name)
        self.assertEqual(db_state["audience"][0]["age_min"], str(tg.age_min))
        self.assertEqual(db_state["audience"][0]["experience"], tg.experience)
        self.assertEqual(db_state["audience"][0]["academic_course"], tg.academic_course)
        self.assertEqual(db_state["audience"][0]["mother_tongue"], tg.mother_tongue)
        self.assertEqual(
            db_state["audience"][0]["foreign_languages"], tg.foreign_languages
        )
        self.assertEqual(db_state["audience"][0]["learning_goal"], tg.learning_goal)
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

        # same, but this time manually specify a _id
        tg2 = TargetGroup(
            _id=ObjectId(),
            name="updated_name2",
            age_min=10,
            age_max=20,
            experience="updated_experience2",
            academic_course="updated_academic_course2",
            mother_tongue="de2",
            foreign_languages={"en": "c1"},
            learning_goal="test",
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(self.plan_id, "audience", [tg2.to_dict()])

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["audience"][0]["_id"], tg2._id)
        self.assertEqual(db_state["audience"][0]["name"], tg2.name)
        self.assertEqual(db_state["audience"][0]["age_min"], str(tg2.age_min))
        self.assertEqual(db_state["audience"][0]["experience"], tg2.experience)
        self.assertEqual(
            db_state["audience"][0]["academic_course"], tg2.academic_course
        )
        self.assertEqual(db_state["audience"][0]["mother_tongue"], tg2.mother_tongue)
        self.assertEqual(
            db_state["audience"][0]["foreign_languages"], tg2.foreign_languages
        )
        self.assertEqual(db_state["audience"][0]["learning_goal"], tg.learning_goal)
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_field_object_with_user(self):
        """
        expect: successfully update a single field of a VEPlan that
        is not a primitive type and passing access checks
        """

        tg = TargetGroup(
            name="updated_name",
            age_min=10,
            age_max=20,
            experience="updated_experience",
            academic_course="updated_academic_course",
            mother_tongue="de",
            foreign_languages={"en": "c1"},
            learning_goal="test",
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(
            self.plan_id, "audience", [tg.to_dict()], requesting_username="test_user"
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIsInstance(db_state["audience"][0]["_id"], ObjectId)
        self.assertEqual(db_state["audience"][0]["name"], tg.name)
        self.assertEqual(db_state["audience"][0]["age_min"], str(tg.age_min))
        self.assertEqual(db_state["audience"][0]["experience"], tg.experience)
        self.assertEqual(db_state["audience"][0]["academic_course"], tg.academic_course)
        self.assertEqual(db_state["audience"][0]["mother_tongue"], tg.mother_tongue)
        self.assertEqual(
            db_state["audience"][0]["foreign_languages"], tg.foreign_languages
        )
        self.assertEqual(db_state["audience"][0]["learning_goal"], tg.learning_goal)
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

        # same, but this time manually specify a _id
        tg2 = TargetGroup(
            _id=ObjectId(),
            name="updated_name2",
            age_min=10,
            age_max=20,
            experience="updated_experience2",
            academic_course="updated_academic_course2",
            mother_tongue="de2",
            foreign_languages={"en": "c1"},
            learning_goal="test",
        )
        # we need to delay our execution here just a little bit, because otherwise
        # the updated would happen too fast relative to the setup, which would result
        # in creation_timestamp and last_modified being equal, despite correctly being
        # executed after each other
        time.sleep(0.1)
        self.planner.update_field(
            self.plan_id, "audience", [tg2.to_dict()], requesting_username="test_user"
        )

        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["audience"][0]["_id"], tg2._id)
        self.assertEqual(db_state["audience"][0]["name"], tg2.name)
        self.assertEqual(db_state["audience"][0]["age_min"], str(tg2.age_min))
        self.assertEqual(db_state["audience"][0]["experience"], tg2.experience)
        self.assertEqual(
            db_state["audience"][0]["academic_course"], tg2.academic_course
        )
        self.assertEqual(db_state["audience"][0]["mother_tongue"], tg2.mother_tongue)
        self.assertEqual(
            db_state["audience"][0]["foreign_languages"], tg2.foreign_languages
        )
        self.assertEqual(db_state["audience"][0]["learning_goal"], tg.learning_goal)
        self.assertGreater(db_state["last_modified"], db_state["creation_timestamp"])

    def test_update_field_upsert(self):
        """
        expect: successfully upsert field, i.e. create new plan with only this field set
        to non-default
        """

        _id = ObjectId()

        # first try a primitve attribute
        self.planner.update_field(
            _id, "realization", "updated_realization", upsert=True
        )
        db_state = self.db.plans.find_one({"_id": _id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertIsNone(db_state["name"])
        self.assertEqual(db_state["tools"], [])
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

        # now same test, but with a complex attribute
        self.db.plans.delete_one({"_id": _id})

        institution = Institution(
            name="updated_institution_name",
            departments=["updated", "updated"],
            academic_courses=["updated", "updated"],
        )
        institution_dict = institution.to_dict()

        self.planner.update_field(_id, "institutions", [institution_dict], upsert=True)
        db_state = self.db.plans.find_one({"_id": _id})
        self.assertIsNotNone(db_state)
        self.assertIsNone(db_state["realization"])
        self.assertIsInstance(db_state["institutions"][0]["_id"], ObjectId)
        self.assertEqual(
            db_state["institutions"][0]["name"], "updated_institution_name"
        )
        self.assertEqual(
            db_state["institutions"][0]["departments"], ["updated", "updated"]
        )
        self.assertEqual(
            db_state["institutions"][0]["academic_courses"],
            ["updated", "updated"],
        )
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

    def test_update_field_upsert_with_user(self):
        """
        expect: successfully upsert field, i.e. create new plan with only this field set
        to non-default
        """

        _id = ObjectId()

        # first try a primitve attribute
        self.planner.update_field(
            _id,
            "realization",
            "updated_realization",
            upsert=True,
            requesting_username="doesnt_matter",
        )
        db_state = self.db.plans.find_one({"_id": _id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["realization"], "updated_realization")
        self.assertIsNone(db_state["name"])
        self.assertEqual(db_state["tools"], [])
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

        # now same test, but with a complex attribute
        self.db.plans.delete_one({"_id": _id})

        institution = Institution(
            name="updated_institution_name",
            departments=["updated", "updated"],
            academic_courses=["updated", "updated"],
        )
        institution_dict = institution.to_dict()

        self.planner.update_field(
            _id,
            "institutions",
            [institution_dict],
            upsert=True,
            requesting_username="doesnt_matter",
        )
        db_state = self.db.plans.find_one({"_id": _id})
        self.assertIsNotNone(db_state)
        self.assertIsNone(db_state["realization"])
        self.assertIsInstance(db_state["institutions"][0]["_id"], ObjectId)
        self.assertEqual(
            db_state["institutions"][0]["name"], "updated_institution_name"
        )
        self.assertEqual(
            db_state["institutions"][0]["departments"], ["updated", "updated"]
        )
        self.assertEqual(
            db_state["institutions"][0]["academic_courses"],
            ["updated", "updated"],
        )
        self.assertEqual(db_state["creation_timestamp"], db_state["last_modified"])

    def test_update_field_error_wrong_type(self):
        """
        expect: TypeError is raised because either primitive or complex attribute
        has a wrong type
        """

        # primitive attribute
        self.assertRaises(
            TypeError, self.planner.update_field, self.plan_id, "tools", "123"
        )

        # object_like_attribute
        lecture = Lecture().to_dict()
        # not enclosed by list
        self.assertRaises(
            TypeError, self.planner.update_field, self.plan_id, "lectures", lecture
        )
        # wrong attribute type
        lecture["name"] = 123
        self.assertRaises(
            TypeError, self.planner.update_field, self.plan_id, "lectures", [lecture]
        )
        # attribute not in dict representation
        self.assertRaises(
            TypeError,
            self.planner.update_field,
            self.plan_id,
            "lectures",
            ["wrong_type"],
        )

    def test_update_field_object_error_model_error(self):
        """
        expect: semantic error from underlying models is thrown (e.g. non unique task names)
        """

        step = Step(name="test").to_dict()
        step["tasks"] = [Task(title="test").to_dict(), Task(title="test").to_dict()]

        self.assertRaises(
            NonUniqueTasksError,
            self.planner.update_field,
            self.plan_id,
            "steps",
            [step],
        )

        del step["ve_approach"]

        self.assertRaises(
            MissingKeyError,
            self.planner.update_field,
            self.plan_id,
            "steps",
            [step],
        )

    def test_update_field_error_invalid_attribute(self):
        """
        expect: ValueError is thrown because attribute is not valid
        (i.e. not recognized by model)
        """

        self.assertRaises(
            ValueError,
            self.planner.update_field,
            self.plan_id,
            "not_existing_attr",
            "value",
        )

    def test_update_field_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is thrown because no match was found and
        upsert is False
        """

        self.assertRaises(
            PlanDoesntExistError,
            self.planner.update_field,
            ObjectId(),
            "realization",
            "updated",
        )

    def test_update_field_error_no_write_access(self):
        """
        expect: NoWriteAccessError is raised because user has no write access to
        the plan
        """

        self.assertRaises(
            NoWriteAccessError,
            self.planner.update_field,
            self.plan_id,
            "name",
            "trying_update",
            False,
            "user_with_no_access_rights",
        )

    def test_set_read_permission(self):
        """
        expect: successfully set read permission for the user
        """

        self.planner.set_read_permissions(str(self.plan_id), "another_test_user")

        # expect the user to be in the read_permission list
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIn("another_test_user", db_state["read_access"])
        self.assertNotIn("another_test_user", db_state["write_access"])

    def test_set_write_permission(self):
        """
        expect: successfully set write permission for the user, which also includes read
        permissions
        """

        self.planner.set_write_permissions(str(self.plan_id), "another_test_user")

        # expect the user to be in the read_access and write_access list
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIn("another_test_user", db_state["read_access"])
        self.assertIn("another_test_user", db_state["write_access"])

    def test_revoke_read_permission(self):
        """
        expect: successfully revoke read permission of user, which includes revoking read permissions
        """

        # manually add another user
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$addToSet": {
                    "read_access": "another_test_user",
                    "write_access": "another_test_user",
                }
            },
        )

        self.planner.revoke_read_permissions(str(self.plan_id), "another_test_user")
        # expect the user not to be in the read_access nor write_access list
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertNotIn("another_test_user", db_state["read_access"])
        self.assertNotIn("another_test_user", db_state["write_access"])

    def test_revoke_write_permission(self):
        """
        expect: successfully revoke write permission of user, but keep read permissions
        """

        # manually add another user
        self.db.plans.update_one(
            {"_id": self.plan_id},
            {
                "$addToSet": {
                    "read_access": "another_test_user",
                    "write_access": "another_test_user",
                }
            },
        )

        self.planner.revoke_write_permissions(str(self.plan_id), "another_test_user")
        # expect the user not to be in the write_access, but still in the read_access list
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNotNone(db_state)
        self.assertIn("another_test_user", db_state["read_access"])
        self.assertNotIn("another_test_user", db_state["write_access"])

    def test_delete_plan_str(self):
        """
        expect: successfully delete plan by passing _id as str
        """

        self.planner.delete_plan(str(self.plan_id))

        # expect no record with this _id after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNone(db_state)

    def test_delete_plan_oid(self):
        """
        expect: successfully delete plan by passing _id as ObjectId
        """

        self.planner.delete_plan(self.plan_id)

        # expect no record with this _id after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertIsNone(db_state)

    def test_delete_plan_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan exists with the given _id
        """

        self.assertRaises(PlanDoesntExistError, self.planner.delete_plan, ObjectId())
        self.assertRaises(
            PlanDoesntExistError, self.planner.delete_plan, str(ObjectId())
        )

    def test_delete_plan_error_plan_doesnt_exist_invalid_id(self):
        """
        expect: PlanDoesntExistError is raised because the supplied _id is not
        a valid ObjectId, resulting in the fact that no plan can even exist with this _id
        """

        self.assertRaises(PlanDoesntExistError, self.planner.delete_plan, "123")

    def test_delete_step_by_name(self):
        """
        expect: successfully delete step from the plan by name
        """

        self.planner.delete_step_by_name(self.plan_id, self.step.name)

        # expect no step in the plan after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["steps"], [])

    def test_delete_step_by_name_with_user(self):
        """
        expect: successfully delete step from the plan by name by passing access checks
        """

        self.planner.delete_step_by_name(
            self.plan_id, self.step.name, requesting_username="test_user"
        )

        # expect no step in the plan after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["steps"], [])

    def test_delete_step_by_id(self):
        """
        expect: successfully delete step from the plan by id
        """

        self.planner.delete_step_by_id(self.plan_id, str(self.step._id))

        # expect no step in the plan after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["steps"], [])

    def test_delete_step_by_id_with_user(self):
        """
        expect: successfully delete step from the plan by id by passing access checks
        """

        self.planner.delete_step_by_id(
            self.plan_id, str(self.step._id), requesting_username="test_user"
        )

        # expect no step in the plan after deletion
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(db_state["steps"], [])

    def test_delete_step_error_invalid_id(self):
        """
        expect: PlanDoesntExistError is raised because an invalid _id is specified
        --> such a plan cannot exist
        """

        self.assertRaises(
            PlanDoesntExistError, self.planner.delete_step_by_id, "123", "123"
        )
        self.assertRaises(
            PlanDoesntExistError, self.planner.delete_step_by_name, "123", "123"
        )

    def test_delete_step_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with the given _id exists
        (step id doesnt matter)
        """

        self.assertRaises(
            PlanDoesntExistError, self.planner.delete_step_by_id, ObjectId(), "123"
        )
        self.assertRaises(
            PlanDoesntExistError, self.planner.delete_step_by_name, ObjectId(), "123"
        )

    def test_delete_step_error_no_write_access(self):
        """
        expect: NoWriteAccessError is raised because user has no write access to the plan
        """

        self.assertRaises(
            NoWriteAccessError,
            self.planner.delete_step_by_id,
            self.plan_id,
            self.step._id,
            "user_without_write_access",
        )

        self.assertRaises(
            NoWriteAccessError,
            self.planner.delete_step_by_id,
            self.plan_id,
            str(self.step._id),
            "user_without_write_access",
        )

        self.assertRaises(
            NoWriteAccessError,
            self.planner.delete_step_by_name,
            self.plan_id,
            self.step.name,
            "user_without_write_access",
        )

    def test_delete_step_step_doesnt_exist(self):
        """
        expect: when an non-existing step_id or step_name is provided no error should appear
        because it is technically a success that no such record exists
        """

        self.planner.delete_step_by_id(self.plan_id, str(ObjectId()))

        # expect step to still be there
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(len(db_state["steps"]), 1)

        self.planner.delete_step_by_name(self.plan_id, "not_existing")

        # expect step to still be there
        db_state = self.db.plans.find_one({"_id": self.plan_id})
        self.assertEqual(len(db_state["steps"]), 1)

    def test_insert_plan_invitation(self):
        """
        expect: successfully insert a plan invitation
        """

        inserted_id = self.planner.insert_plan_invitation(
            self.plan_id, "invitation", "test_admin", "test_user"
        )

        # expect invitation to be in the plan
        db_state = self.db.invitations.find_one({"_id": inserted_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["plan_id"], self.plan_id)
        self.assertEqual(db_state["message"], "invitation")
        self.assertEqual(db_state["sender"], "test_admin")
        self.assertEqual(db_state["recipient"], "test_user")
        self.assertEqual(db_state["accepted"], None)

    def test_insert_plan_invitation_error_plan_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no plan with this _id exists
        """

        self.assertRaises(
            PlanDoesntExistError,
            self.planner.insert_plan_invitation,
            ObjectId(),
            "invitation",
            "test_admin",
            "test_user",
        )

    def test_get_plan_invitation(self):
        """
        expect: successfully get a plan invitation
        """
        invitation_id = ObjectId()

        self.db.invitations.insert_one(
            {
                "_id": invitation_id,
                "plan_id": self.plan_id,
                "message": "invitation",
                "sender": "test_admin",
                "recipient": "test_user",
                "accepted": None,
            }
        )

        invitation = self.planner.get_plan_invitation(invitation_id)

        # expect invitation to be in the db
        self.assertIsNotNone(invitation)
        self.assertEqual(invitation["plan_id"], self.plan_id)
        self.assertEqual(invitation["message"], "invitation")
        self.assertEqual(invitation["sender"], "test_admin")
        self.assertEqual(invitation["recipient"], "test_user")
        self.assertEqual(invitation["accepted"], None)

        # try again, but this time with a string id
        invitation = self.planner.get_plan_invitation(str(invitation_id))
        self.assertIsNotNone(invitation)
        self.assertEqual(invitation["plan_id"], self.plan_id)
        self.assertEqual(invitation["message"], "invitation")
        self.assertEqual(invitation["sender"], "test_admin")
        self.assertEqual(invitation["recipient"], "test_user")
        self.assertEqual(invitation["accepted"], None)

    def test_get_plan_invitation_error_invitation_doesnt_exist(self):
        """
        expect: PlanDoesntExistError is raised because no invitation
        with this _id exists
        """

        self.assertRaises(
            InvitationDoesntExistError, self.planner.get_plan_invitation, ObjectId()
        )

    def test_set_invitation_reply(self):
        """
        expect: successfully set the reply of an invitation
        """

        invitation_id = ObjectId()

        self.db.invitations.insert_one(
            {
                "_id": invitation_id,
                "plan_id": self.plan_id,
                "message": "invitation",
                "sender": "test_admin",
                "recipient": "test_user",
                "accepted": None,
            }
        )

        self.planner.set_invitation_reply(invitation_id, True)

        # expect invitation's accepted state to be True
        db_state = self.db.invitations.find_one({"_id": invitation_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["accepted"], True)

        # try again, but this time with a string id and False accept state
        self.planner.set_invitation_reply(str(invitation_id), False)
        db_state = self.db.invitations.find_one({"_id": invitation_id})
        self.assertIsNotNone(db_state)
        self.assertEqual(db_state["accepted"], False)

    def test_set_invitation_reply_error_invitation_doesnt_exist(self):
        """
        expect: InvitationDoesntExistError is raised because no invitation
        with this _id exists
        """

        self.assertRaises(
            InvitationDoesntExistError,
            self.planner.set_invitation_reply,
            ObjectId(),
            True,
        )

    def test_set_invitation_reply_error_invalid_id(self):
        """
        expect: InvitationDoesntExistError is raised because the provided
        id is not a valid ObjectId
        """

        self.assertRaises(
            InvitationDoesntExistError,
            self.planner.set_invitation_reply,
            "invalid_id",
            True,
        )


class ElasticsearchIntegrationTest(BaseResourceTestCase):
    pass


class NotificationIntegrationTest(BaseResourceTestCase):
    pass
