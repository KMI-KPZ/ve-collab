import datetime

from bson import ObjectId
from pymongo.database import Database
from bson.errors import InvalidId
from exceptions import InvitationDoesntExistError
from typing import Dict
import util

class MailInvitation:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            invitation_manager = MailInvitation(db)
            ...

    """

    def __init__(self, db: Database):
        self.db = db

        self.mail_invitation_attributes = [
            "recipient_mail",
            "recipient_name",
            "message",
            "sender",
            "plan_id",
            "replied",
            "timestamp",
        ]

    def insert_invitation(self, invitation: dict) -> ObjectId:
        """
        Insert a new invitation into the database.
        Returns the id of the inserted invitation.

        :param invitation: invitation to save as a dict
        """

        # verify invitation has all the necessary attributes
        if not all(attr in invitation for attr in self.mail_invitation_attributes):
            raise ValueError("Invitation misses required attribute")

        result = self.db.mail_invitations.insert_one(invitation)

        return result.inserted_id

    def reply_to_invitation(self, _id: str | ObjectId) -> None:
        """
        Set invitation.replied to True
        """

        try:
            _id = util.parse_object_id(_id)
        except InvalidId:
            raise InvitationDoesntExistError()

        result = self.db.mail_invitations.update_one(
            {"_id": _id}, {"$set": {"replied": True}}
        )

        if result.matched_count == 0:
            raise InvitationDoesntExistError()

    def get_invitation(self, _id: str | ObjectId) -> Dict:
        """
        Get an invitation from DB

        :param invitation: invitation to save as a dict
        """

        try:
            _id = util.parse_object_id(_id)
        except InvalidId:
            raise InvitationDoesntExistError()

        result = self.db.mail_invitations.find_one({"_id": _id})

        if not result:
            raise InvitationDoesntExistError()

        return result

    def check_within_rate_limit(self, username: str) -> bool:
        """
        check if the user is still within the rate limit for sending invitations,
        i.e. if the user has sent less than 10 invitations in the last 24 hours.

        Returns True if the user is within the rate limit, False otherwise.

        :param username: username of the user to check
        """

        # get the current time and time 24 hours ago
        current_time = datetime.datetime.now()
        time_24_hours_ago = current_time - datetime.timedelta(hours=24)

        # count the number of invitations sent by the user in the last 24 hours
        count = self.db.mail_invitations.count_documents(
            {"sender": username, "timestamp": {"$gt": time_24_hours_ago}}
        )

        return count < 10
