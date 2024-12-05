from typing import Dict, List, Literal, Optional
from bson import ObjectId

import gridfs
from pymongo import ReturnDocument
from pymongo.database import Database
from resources.elasticsearch_integration import ElasticsearchConnector

from exceptions import (
    AlreadyFollowedException,
    NotFollowedException,
    ProfileDoesntExistException,
)
import util


class Profiles:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            profile_manager = Profiles(db)
            ...

    """

    def __init__(self, db: Database):
        self.db = db

        self.profile_attributes = {
            "bio": (str, type(None)),
            "institutions": list,
            "chosen_institution_id": (str, type(None)),
            "first_name": (str, type(None)),
            "last_name": (str, type(None)),
            "gender": (str, type(None)),
            "address": (str, type(None)),
            "birthday": (str, type(None)),
            "experience": list,
            "expertise": (str, type(None)),
            "languages": list,
            "ve_ready": bool,
            "excluded_from_matching": bool,
            "ve_interests": list,
            "ve_contents": list,
            "ve_goals": list,
            "interdisciplinary_exchange": bool,
            "preferred_format": (str, type(None)),
            "research_tags": list,
            "courses": list,
            "lms": list,
            "tools": list,
            "educations": list,
            "work_experience": list,
            "ve_window": list,
            "notification_settings": dict,
            "achievements": dict,
            "chosen_achievement": (str, type(None)),
        }

        # TODO fine tune multipliers
        self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS = {
            "create_posts": 1,  # x posts created
            "create_comments": 1,  # x comments created
            "give_likes": 1,  # x posts and/or comments liked
            "posts_liked": 1,  # posts of user has received x likes (combined)
            "join_groups": 1,  # member of x groups
            "admin_groups": 1,  # admin of x groups
        }
        self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS = {
            "ve_plans": 1,  # x update operations done on VE plans
            "good_practice_plans": 1,  # x VE plans marked as good practise examples
            "unique_partners": 1,  # x unique partners across all VE plans
        }

    def get_profile(self, username: str, projection: dict = None) -> Optional[Dict]:
        """
        get the profile data of the given user. optionally specify a projection
        to reduce query to the necessary fields (increases performance).

        Raises `ProfileDoesntExistException` if no profile exists for the given username.

        :return: the profile data as a dict
        """

        result = self.db.profiles.find_one(
            {"username": username}, projection=projection
        )
        if not result:
            raise ProfileDoesntExistException()

        # hide the achievement tracking from the frontend
        if "achievements" in result and "tracking" in result["achievements"]:
            del result["achievements"]["tracking"]

        return result

    def get_all_profiles(self, projection: dict = None) -> List[Dict]:
        """
        get all profiles from the database. optionally specify a projection to
        reduce response to the necessary fields (increases performance)
        """

        profiles = list(self.db.profiles.find(projection=projection))

        # hide the achievement tracking from the frontend
        for profile in profiles:
            if "achievements" in profile and "tracking" in profile["achievements"]:
                del profile["achievements"]["tracking"]

        return profiles

    def get_bulk_profiles(
        self, usernames: List[str], projection: dict = None
    ) -> List[Dict]:
        """
        get the profiles of all the users specified in the `usernames` list.
        If any of the usernames in this list does not exist, it is skipped,
        meaning the length of the response list and the given list of usernames
        can differ.
        """

        profiles = list(
            self.db.profiles.find(
                {"username": {"$in": usernames}}, projection=projection
            )
        )

        # hide the achievement tracking from the frontend
        for profile in profiles:
            if "achievements" in profile and "tracking" in profile["achievements"]:
                del profile["achievements"]["tracking"]

        return profiles

    def insert_default_profile(
        self,
        username: str,
        first_name: str = "",
        last_name: str = "",
        elasticsearch_collection: str = "profiles",
    ) -> Dict:
        """
        insert a default profile into the db, initializing the role as 'guest' and the
        default profile picture and setting all other values to false.
        Optionally, if known, the first and last name can be already set.
        You can also specify the elasticsearch collection in which the profile
        should be replicated. The default is "profiles" just as in the mongodb.
        :param username: the username of the new user
        :return: the freshly created profile
        """
        profile = {
            "username": username,
            "role": "guest",
            "follows": [],
            "bio": "",
            "institutions": [],
            "chosen_institution_id": "",
            "profile_pic": "default_profile_pic.jpg",
            "first_name": first_name,
            "last_name": last_name,
            "gender": "",
            "address": "",
            "birthday": "",
            "experience": [""],
            "expertise": "",
            "languages": [],
            "ve_ready": True,
            "excluded_from_matching": False,
            "ve_interests": [""],
            "ve_contents": [""],
            "ve_goals": [""],
            "interdisciplinary_exchange": True,
            "preferred_format": "",
            "research_tags": [],
            "courses": [],
            "lms": [],
            "tools": [],
            "educations": [],
            "work_experience": [],
            "ve_window": [],
            "notification_settings": {
                "messages": "email",
                "ve_invite": "email",
                "group_invite": "email",
                "system": "email",
            },
            "achievements": {
                "social": {"level": 0, "progress": 0, "next_level": 10},
                "ve": {"level": 0, "progress": 0, "next_level": 10},
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
            "chosen_achievement": None,
        }
        result = self.db.profiles.insert_one(profile)

        # replicate the insert to elasticsearch
        ElasticsearchConnector().on_insert(
            result.inserted_id, profile.copy(), elasticsearch_collection
        )

        profile["_id"] = result.inserted_id
        return profile

    def insert_default_admin_profile(
        self,
        username: str,
        first_name: str = "",
        last_name: str = "",
        elasticsearch_collection: str = "profiles",
    ) -> Dict:
        """
        insert a default admin profile into the db,
        initializing the role as 'admin' and the default profile picture and
        setting all other values to false or empty strings/lists.
        Optionally, if known, the first and last name can be already set.
        You can also specify the elasticsearch collection in which the profile
        should be replicated. The default is "profiles" just as in the mongodb.
        :param username: the username of the new user
        :return: the freshly created profile
        """

        profile = {
            "username": username,
            "role": "admin",
            "follows": [],
            "bio": "",
            "institutions": [],
            "chosen_institution_id": "",
            "profile_pic": "default_profile_pic.jpg",
            "first_name": first_name,
            "last_name": last_name,
            "gender": "",
            "address": "",
            "birthday": "",
            "experience": [""],
            "expertise": "",
            "languages": [],
            "ve_ready": True,
            "excluded_from_matching": False,
            "ve_interests": [""],
            "ve_contents": [""],
            "ve_goals": [""],
            "interdisciplinary_exchange": True,
            "preferred_format": "",
            "research_tags": [],
            "courses": [],
            "lms": [],
            "tools": [],
            "educations": [],
            "work_experience": [],
            "ve_window": [],
            "notification_settings": {
                "messages": "email",
                "ve_invite": "email",
                "group_invite": "email",
                "system": "email",
            },
            "achievements": {
                "social": {"level": 0, "progress": 0, "next_level": 10},
                "ve": {"level": 0, "progress": 0, "next_level": 10},
                "tracking": {
                    "good_practice_plans": [],
                    "unique_partners": [],
                },
            },
            "chosen_achievement": None,
        }
        result = self.db.profiles.insert_one(profile)

        # replicate the insert to elasticsearch
        ElasticsearchConnector().on_insert(
            result.inserted_id, profile, elasticsearch_collection
        )

        profile["_id"] = result.inserted_id
        return profile

    def ensure_profile_exists(
        self,
        username: str,
        first_name: str = "",
        last_name: str = "",
        elasticsearch_collection: str = "profiles",
        projection: Dict = None,
    ) -> Dict:
        """
        ensure that a profile exists for the given user and return it.
        if no profile exists, create a default one, and also let the
        acl create a default entry if it does not exist
        :param username: the username of which to check for a profile
        :param first_name: optional, the first name of the user
                           (only used for creation, can be added later)
        :param last_name: optional, the last name of the user
                          (only used for creation, can be added later)
        :param elasticsearch_collection: optional, the elasticsearch index in which the profile
                                            should be replicated. The default is "profiles"
                                            just as in the mongodb.
        :return: the profile of the user, either existing or created
        """
        try:
            profile = self.get_profile(username, projection=projection)
        except ProfileDoesntExistException:
            # create a profile since it does not exist

            profile = self.insert_default_profile(
                username, first_name, last_name, elasticsearch_collection
            )

            # check if the guest role exists, since we might do this for the very first time
            from resources.network.acl import ACL

            with util.get_mongodb() as db:
                acl_manager = ACL(db)
                acl_manager.ensure_acl_entries("guest")

        return profile

    def get_follows(self, username: str) -> List[str]:
        """
        get the list of users the the given user follows.
        Raises `ProfileDoesntExistException` if no profile exists for the given username.
        :param username: the user the data is requested from
        :return: list of usernames the user follows
        """
        try:
            result = self.get_profile(
                username, projection={"_id": False, "follows": True}
            )
        except ProfileDoesntExistException:
            raise

        return result["follows"]

    def add_follows(self, username: str, username_to_follow: str) -> None:
        """
        let the user behind 'username' follow the user behind 'username_to_follow'.
        Raises `ProfileDoesntExistException` if no profile exists for the given username.
        Raises `AlreadyFollowedException` if the user is already following that person.
        :param username: the username of the user wanting to follow another one
        :param username_to_follow: the username the user wants to follow
        """

        update_result = self.db.profiles.update_one(
            {"username": username},
            {"$addToSet": {"follows": username_to_follow}},
        )

        # if no document was matched, the user profile doesnt exist
        if update_result.matched_count != 1:
            raise ProfileDoesntExistException()

        # if no document was modified, the username is already in the follows set
        if update_result.modified_count != 1:
            raise AlreadyFollowedException()

    def remove_follows(self, username: str, username_to_unfollow: str) -> None:
        """
        let the user behind 'username' unfollow the user behind 'username_to_follow'.
        Raises `ProfileDoesntExistException` if no profile exists for the given username.
        If the user is not following this person, a `NotFollowedException` is thrown.
        :param username: the username of the user wanting to unfollow another one
        :param username_to_follow: the username the user wants to unfollow
        """

        update_result = self.db.profiles.update_one(
            {"username": username}, {"$pull": {"follows": username_to_unfollow}}
        )

        # if no document was matched, the user profile doesnt exist
        if update_result.matched_count != 1:
            raise ProfileDoesntExistException()

        # if no document was modified, the username was not in the follows set
        if update_result.modified_count != 1:
            raise NotFollowedException()

    def get_followers(self, username: str) -> List[str]:
        """
        get a list of usernames that follow the given user
        """

        return [
            user["username"]
            for user in self.db.profiles.find(
                {"follows": username}, projection={"_id": False, "username": True}
            )
        ]

    def get_role(self, username: str) -> str:
        """
        get the role of the user. If no profile exists for the user,
        a `ProfileDoesntExistException` is thrown.
        """

        try:
            role_result = self.get_profile(username, projection={"role": True})
        except ProfileDoesntExistException:
            raise

        return role_result["role"]

    def set_role(self, username: str, role: str) -> None:
        """
        set the role of a user. If no profile exists for the user,
        a `ProfileDoesntExistException` is thrown.
        """

        update_result = self.db.profiles.update_one(
            {"username": username}, {"$set": {"role": role}}
        )
        # if no document was matched, the user profile doesnt exist
        if update_result.matched_count != 1:
            raise ProfileDoesntExistException()

    def check_role_exists(self, role: str) -> bool:
        """
        check if the given role exists, i.e. atleast one user has this role.
        :param role: the role to check for
        :return: True if the role exists, False otherwise
        """

        if self.db.profiles.find_one({"role": role}, projection={"_id": True}):
            return True
        else:
            return False

    def get_all_roles(
        self,
        keycloak_user_list: List[Dict],
        auto_create_elastic_collection: str = "profiles",
    ) -> List[dict]:
        """
        produce a list of dicts containing the following information:
        {"username": <username>, "role": <role>}
        by joining a list of keycloak user with our profile database on the username.
        This extra step is needed, because users are only recognized in our database
        when they first log in, but they should be referencable by other users before that.
        To achieve that, we create a profile for them if it does not already exist.
        In this case, by setting `auto_create_elastic_collection` you can control in which
        elasticsearch index the freshly created profile gets replicated. The default is
        "profiles" just as in the mongodb.
        """

        existing_users_and_roles = self.get_all_profiles(
            projection={"_id": False, "username": True, "role": True}
        )

        ret_list = []

        # match the platform users and if they have, existing lionet roles
        for platform_user in keycloak_user_list:
            already_in = False
            for existing_user in existing_users_and_roles:
                if platform_user["username"] == existing_user["username"]:
                    ret_list.append(existing_user)
                    already_in = True
                    break
            if already_in:  # skip if user is already processed
                continue

            # if the user does not already exist, add him with guest role
            self.insert_default_profile(
                platform_user["username"],
                elasticsearch_collection=auto_create_elastic_collection,
            )
            # manually create return entry
            # because otherwise non-json-serializable ObjectId is in payload
            ret_list.append(
                {
                    "username": platform_user["username"],
                    "role": "guest",
                }
            )

            # check once if the guest role was present
            # (once is enough, there might be many keycloak users coming in,
            # checking for the same role on everyone is useless overhead)
            # if there was no user that has been added as guest, we dont even
            # need to do the check at all because this statement would always
            # be skipped
            checked_guest_role_present = False
            if not checked_guest_role_present:
                from resources.network.acl import ACL

                with util.get_mongodb() as db:
                    acl_manager = ACL(db)
                    acl_manager.ensure_acl_entries("guest")
                checked_guest_role_present = True

        return ret_list

    def get_distinct_roles(self) -> List[str]:
        """
        get a list of distinct roles, i.e. all roles that atleast one user has
        """

        return self.db.profiles.distinct("role")

    def get_profile_pic(self, username: str) -> str:
        """
        get the profile pic of the given user, or the default value, if he has not set
        a custom profile picture
        """

        try:
            profile = self.get_profile(
                username, projection={"_id": False, "profile_pic": True}
            )
        except ProfileDoesntExistException:
            raise

        if "profile_pic" not in profile:
            return "default_profile_pic.jpg"
        else:
            return profile["profile_pic"]

    def update_profile_information(
        self,
        username: str,
        updated_profile: Dict,
        profile_pic: bytes = None,
        profile_pic_content_type: str = None,
        elasticsearch_collection: str = "profiles",
    ) -> Optional[ObjectId]:
        """
        update the profile information including (optionally) the profile picture.
        The following keys are necessary in the `updated_profile` dict:
        see `self.profile_attributes` of class `Profiles`
        The following keys are optional:
        profile_pic, profile_pic_content_type, elasticsearch_collection.

        If a profile_pic was updated, its inserted _id is returned, otherwise (regular
        update of profile data) None is returned.
        """

        # verify profile has all the necessary attributes
        # if not all(attr in updated_profile for attr in self.profile_attributes.keys()):
        #    raise ValueError("Profile misses required attribute")

        # verify types of attributes
        for attr_key in updated_profile:
            if attr_key in self.profile_attributes:
                if not isinstance(
                    updated_profile[attr_key], self.profile_attributes[attr_key]
                ):
                    raise TypeError(
                        "Type mismatch on attribute '{}'. expected type '{}', got '{}'".format(
                            attr_key,
                            self.profile_attributes[attr_key],
                            updated_profile[attr_key],
                        )
                    )

        # handle optional profile image
        if "profile_pic" in updated_profile:
            # if dict supplies one, we need the actual image
            if profile_pic is None:
                raise TypeError(
                    """if profile_pic is supplied in the dict, 
                    provide an actual image as bytes!"""
                )

            # save image to gridfs
            fs = gridfs.GridFS(self.db)
            _id = fs.put(
                profile_pic,
                filename=updated_profile["profile_pic"],
                content_type=profile_pic_content_type,
                metadata={"uploader": "system"},
            )
            updated_profile["profile_pic"] = _id

        # ensure that plan_id inside a ve_window entry is an ObjectId
        if "ve_window" in updated_profile:
            for ve_window_entry in updated_profile["ve_window"]:
                ve_window_entry["plan_id"] = util.parse_object_id(
                    ve_window_entry["plan_id"]
                )

        # ensure that institutions objects contain an _id field with an ObjectId
        # and the corresponding chosen_institution_id is also an ObjectId
        if "institutions" in updated_profile:
            for institution in updated_profile["institutions"]:
                if (
                    "_id" not in institution
                    or not institution["_id"]
                    or institution["_id"] == ""
                ):
                    institution["_id"] = ObjectId()
                else:
                    institution["_id"] = util.parse_object_id(institution["_id"])
        if (
            "chosen_institution_id" in updated_profile
            and updated_profile["chosen_institution_id"] != ""
        ):
            updated_profile["chosen_institution_id"] = util.parse_object_id(
                updated_profile["chosen_institution_id"]
            )

        # achievements cannot be modified here obviously (they are auto-updated)
        # so we remove them from the update dict
        if "achievements" in updated_profile:
            del updated_profile["achievements"]

        # if user has updated the chosen achievement, we need to check if it is valid,
        # i.e. either "social", "ve" or None
        if "chosen_achievement" in updated_profile:
            if updated_profile["chosen_achievement"] not in ["social", "ve", None]:
                raise ValueError("Invalid chosen achievement")

        # all checks passed, update the profile
        result = self.db.profiles.find_one_and_update(
            {"username": username},
            {
                "$set": updated_profile,
                # set default values only on insert
                "$setOnInsert": {"username": username, "role": "guest", "follows": []},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

        # replicate the update to elasticsearch
        updated_profile["username"] = username
        ElasticsearchConnector().on_update(
            result["_id"], elasticsearch_collection, result
        )

        return (
            updated_profile["profile_pic"] if "profile_pic" in updated_profile else None
        )

    def get_profile_snippets(self, usernames: List[str]) -> List[Dict]:
        """
        request the profile snippet (i.e. username, first_name, last_name, institution,
        profile_pic and chosen_achievement) for every given username in `usernames`
        and return them as a Dict.
        The `institution` field is somewhat special, as it is the name of the currently chosen
        institution of the user instead of all institutions that he has supplied. The user's
        currently chosen institution is determined by the `chosen_institution_id`. If the user
        has not chosen an institution, the field is an empty string (""), even if he might have
        listed institution in his profile (in case he has listed them, but not yet chosen one as
        the current one).
        If any of the usernames has no profile, it is omitted from the response,
        meaning the length of the response list and the given list of usernames
        might differ.
        """

        if not isinstance(usernames, list):
            raise TypeError(
                "expected type 'list' for argument 'usernames', got {}".format(
                    type(usernames)
                )
            )

        if not usernames:
            return []

        profiles = self.get_bulk_profiles(
            usernames,
            projection={
                "_id": False,
                "username": True,
                "first_name": True,
                "last_name": True,
                "institutions": True,
                "chosen_institution_id": True,
                "profile_pic": True,
                "chosen_achievement": True,
            },
        )

        # refactor the institutions: only keep the name of the chosen institution as
        # "institution" and discard "institutions" and "chosen_institution_id"
        for profile in profiles:
            profile["institution"] = ""  # default empty string
            for institution in profile["institutions"]:
                if institution["_id"] == profile["chosen_institution_id"]:
                    profile["institution"] = institution["name"]
                    break
            del profile["institutions"]
            del profile["chosen_institution_id"]

        return profiles

    def get_matching_exclusion(self, username: str) -> bool:
        """
        Retrieve the information from the profile if a user given by its username
        is currently excluded from matching.

        Returns a boolean indication if the user is excluded or not.

        If no profile exists for the user, a `ProfileDoesntExistException` is thrown.
        """
        try:
            result = self.get_profile(
                username, projection={"excluded_from_matching": True}
            )
        except ProfileDoesntExistException:
            raise

        # if somehow the field is missing in the profile, return False, as
        # it also means that the user has not actively excluded himself
        if "excluded_from_matching" not in result:
            return False
        else:
            return result["excluded_from_matching"]

    def remove_ve_windows_entry_by_plan_id(self, plan_id: str | ObjectId):
        """
        Remove all VE windows entries from all profiles that contain the given plan_id.

        This function can be called as a side effect of deleting a VE plan.
        """

        # ensure valid ObjectId
        plan_id = util.parse_object_id(plan_id)

        self.db.profiles.update_many(
            {"ve_window.plan_id": plan_id},
            {"$pull": {"ve_window": {"plan_id": plan_id}}},
        )

    def get_notification_setting(
        self,
        username: str,
        setting: Literal["messages", "ve_invite", "group_invite", "system"],
    ) -> str:
        """
        Returns the notification setting for the given user and the specified setting.

        Raises `ProfileDoesntExistException`, if no profile for the given username is found.
        """

        try:
            result = self.get_profile(
                username, projection={"notification_settings": True}
            )
        except ProfileDoesntExistException:
            raise

        return result["notification_settings"][setting]

    def get_all_notification_settings(self, username) -> Dict:
        """
        Returns all notification settings for the given user.

        Raises `ProfileDoesntExistException`, if no profile for the given username is found.
        """
        try:
            result = self.get_profile(
                username, projection={"notification_settings": True}
            )
        except ProfileDoesntExistException:
            raise

        return result["notification_settings"]

    def achievement_count_up(
        self,
        username: str,
        reason: Literal[
            "create_posts",
            "create_comments",
            "give_likes",
            "posts_liked",
            "join_groups",
            "admin_groups",
            "ve_plans",
            "good_practice_plans",
            "unique_partners",
        ],
        amount: int = 1,
    ) -> None:
        """
        Increase the progress of the "social" or "ve" achievement depending on the `reason`.
        The actual progress increase is determined by the progress multiplier
        of the given `reason` (see `self.SOCIAL_ACHIEVEMENT_PROGRESS_MULTIPLIERS` and
        `self.VE_ACHIEVEMENT_PROGRESS_MULTIPLIERS`).
        If the user has reached the next level (as determined by the achievements `next_level`
        attribute), it will also be updated accordingly and in thise case the `progress` reset
        to 0. The next level requirement is subsequently doubled.

        Optionally, you can specify the `amount` by which the progress should be increased.
        I.e. an amount of 2 would act as if the achievement was issued twice, not simply
        adding 2 to the progress, but also applying the `reason`'s progress multiplier.
        Default amount is 1.
        """

        # sanity check
        if (
            reason
            not in self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS.keys()
            | self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS.keys()
        ):
            raise ValueError("Invalid achievement reason")

        # get current achievement status of user
        profile = self.db.profiles.find_one(
            {"username": username}, projection={"achievements": True}
        )
        if not profile:
            raise ProfileDoesntExistException()

        achievements = profile["achievements"]

        # determin by the reason if it is a social or ve achievement
        achievement_type = None
        if reason in self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS:
            achievement_type = "social"
        elif reason in self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS:
            achievement_type = "ve"

        # count up the progress
        achievements[achievement_type]["progress"] += (
            int(amount * self.SOCIAL_ACHIEVEMENTS_PROGRESS_MULTIPLIERS[reason])
            if achievement_type == "social"
            else int(amount * self.VE_ACHIEVEMENTS_PROGRESS_MULTIPLIERS[reason])
        )

        # determine if the user has reached the next level and update it
        # TODO send notification to user
        if (
            achievements[achievement_type]["progress"]
            >= achievements[achievement_type]["next_level"]
        ):
            achievements[achievement_type]["level"] += 1
            achievements[achievement_type]["progress"] = 0

            # next level increases exponentially
            achievements[achievement_type]["next_level"] = (
                achievements[achievement_type]["next_level"] * 2
            )

        # update the profile with the new achievement status
        self.db.profiles.update_one(
            {"username": username},
            {"$set": {"achievements": achievements}},
        )

    def achievement_count_up_check_constraint_good_practice(
        self, username: str, plan_id: str | ObjectId
    ):
        """
        check if the `plan_id` in question is accountable for the achievement
        "good_practice_plans" (i.e. it has not been marked as good practice before) and
        if so, count up the achievement. Otherwise do nothing.

        Raises `ProfileDoesntExistException`, if no profile for the given username is found.
        """

        # ensure valid ObjectId
        plan_id = util.parse_object_id(plan_id)

        # get current achievement status of user
        profile = self.db.profiles.find_one(
            {"username": username}, projection={"achievements": True}
        )
        if not profile:
            raise ProfileDoesntExistException()

        if plan_id not in profile["achievements"]["tracking"]["good_practice_plans"]:
            # count up the achievement
            self.achievement_count_up(username, "good_practice_plans")

            # update the tracking list that this plan does not count again anymore
            self.db.profiles.update_one(
                {"username": username},
                {"$addToSet": {"achievements.tracking.good_practice_plans": plan_id}},
            )

    def achievement_count_up_check_constraint_unique_partners(
        self, username: str, partners: List[str]
    ):
        """
        check if any of the users in the `partners` list is a new unique partner
        for the user and if so, count up the achievement "unique_partners"
        for each one. Otherwise do nothing.

        The user himself is not counted as a partner, so he is removed from the list
        if he is in there.

        Raises `ProfileDoesntExistException`, if no profile for the given username is found.
        """

        # nothing to do if there are no partners to check
        if not partners:
            return

        # remove the user himself from the list, if he is in there
        if username in partners:
            partners.remove(username)

        # if the list is empty now, there is nothing to do again
        if not partners:
            return

        # get current achievement status of user
        profile = self.db.profiles.find_one(
            {"username": username}, projection={"achievements": True}
        )
        if not profile:
            raise ProfileDoesntExistException()

        # determine which users are new unique partners, if any
        new_unique_partners = [
            partner
            for partner in partners
            if partner not in profile["achievements"]["tracking"]["unique_partners"]
        ]

        # there is nothing to do if there are no new unique partners
        if not new_unique_partners:
            return

        # count up the achievement for each new unique partner
        self.achievement_count_up(
            username, "unique_partners", amount=len(new_unique_partners)
        )

        # update the tracking list that these partners do not count again anymore
        self.db.profiles.update_one(
            {"username": username},
            {
                "$addToSet": {
                    "achievements.tracking.unique_partners": {
                        "$each": new_unique_partners
                    }
                }
            },
        )
