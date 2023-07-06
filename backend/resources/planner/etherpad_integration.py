import datetime
import json
import math
import time
from bson import ObjectId
from pymongo.database import Database
import requests

import global_vars


class EtherpadResouce:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            etherpad = EtherpadResouce(db)
            ...

    """

    def __init__(self, db: Database):
        """
        Initialize this class by passing a mongo `Database` object
        that holds an open connection.

        Obtain a connection e.g. via::

            with util.get_mongodb() as db:
                etherpad = EtherpadResouce(db)
                ...
        """

        self.db = db

    def create_etherpad_author_for_user_if_not_exists(
        self, user_id: str | ObjectId, username: str
    ) -> str:
        """
        Using the etherpad API, create a user in the database over there (if it doesnt
        already exist) for a user that exists in our platform,
        i.e. generate a direct mapping between a user object here and a user object there.

        Returns the author id of the freshly created or already existing user.
        """

        if isinstance(user_id, ObjectId):
            user_id = str(user_id)

        response = requests.get(
            global_vars.etherpad_base_url
            + "/api/1.3.0/createAuthorIfNotExistsFor?authorMapper={}&name={}&apikey={}".format(
                user_id, username, global_vars.etherpad_api_key
            )
        )

        response_content = json.loads(response.text)

        print(response_content)

        return response_content["data"]["authorID"]

    def create_etherpad_group_for_plan_if_not_exists(
        self, plan_id: str | ObjectId
    ) -> str:
        """
        Using the etherpad API, create a group for the plan given by `plan_id` if no such
        group already exists. Even though this group will only hold one pad (the plan for the plan),
        so our mapping is 1(pad) : 1(group), we have to create a group because pad access can
        only be restricted at the group level, meaning we can grant/deny access to a group, but not
        directly to a pad.

        Returns the group id of the freshly created or already existing group of the plan.
        """

        if isinstance(plan_id, ObjectId):
            plan_id = str(plan_id)

        response = requests.get(
            global_vars.etherpad_base_url
            + "/api/1.3.0/createGroupIfNotExistsFor?groupMapper={}&apikey={}".format(
                plan_id, global_vars.etherpad_api_key
            )
        )

        response_content = json.loads(response.text)

        print(response_content)

        return response_content["data"]["groupID"]

    def create_etherpad_group_pad_for_plan(
        self, group_id: str, plan_id: str | ObjectId
    ) -> None:
        """
        Using the etherpad API, create a new pad within the group given by `group_id`. This group
        has to already exist, e.g. by using the `create_etherpad_group_for_plan_if_not_exists`-function.

        Returns nothing, since the resulting padID that is needed to access the pad can
        be derived as follows: <group_id>$<plan_id>
        """

        if isinstance(plan_id, ObjectId):
            plan_id = str(plan_id)

        response = requests.get(
            global_vars.etherpad_base_url
            + "/api/1.3.0/createGroupPad?groupID={}&padName={}&apikey={}".format(
                group_id, plan_id, global_vars.etherpad_api_key
            )
        )

        response_content = json.loads(response.text)

        print(response_content)

    def create_etherpad_user_session_for_plan(
        self, group_id: str, author_id: str
    ) -> str:
        """
        Using the etherpad API, create a long-lasting user sessionID that is needed to gain
        access when opening the pad in the browser. Therefore, this sessionID has to be placed in a cookie.

        Returns the SessionID (has to be placed in a cookie to be recognizable by etherpad)
        """
        # 01.01.3000 as unix timestamp in seconds as int
        valid_unti = math.floor(time.mktime(datetime.datetime(3000, 1, 1).timetuple()))

        response = requests.get(
            global_vars.etherpad_base_url
            + "/api/1.3.0/createSession?groupID={}&authorID={}&validUntil={}&apikey={}".format(
                group_id, author_id, valid_unti, global_vars.etherpad_api_key
            )
        )

        response_content = json.loads(response.text)

        print(response_content)

        return response_content["data"]["sessionID"]