from datetime import datetime

from bson import ObjectId
from pymongo.database import Database

from resources.network.chat import Chat
from resources.network.post import Posts
from resources.network.profile import Profiles
from resources.network.space import Spaces
from resources.planner.ve_plan import VEPlanResource
from exceptions import ReportDoesntExistError
import util


class Reports:

    def __init__(self, db: Database):
        self.db = db

        self.report_attributes = ["type", "item_id", "reason", "reporter"]

    def get_reported_item(self, item_id: str | ObjectId, item_type: str) -> dict:
        """
        based on the item_id and type from within the report, return the item that was reported
        """

        # profile identifiers are not ObjectIds, but usernames
        if item_type != "profile":
            item_id = util.parse_object_id(item_id)

        try:
            if item_type == "post":
                post_manager = Posts(self.db)
                return post_manager.get_post(item_id)
            elif item_type == "comment":
                post_manager = Posts(self.db)
                return post_manager.get_post_by_comment_id(item_id)
            elif item_type == "plan":
                plan_manager = VEPlanResource(self.db)
                return plan_manager.get_plan(item_id).to_dict()
            elif item_type == "profile":
                profile_manager = Profiles(self.db)
                return profile_manager.get_profile(item_id)
            elif item_type == "group":
                space_manager = Spaces(self.db)
                return space_manager.get_space(item_id)
            elif item_type == "chatroom":
                chat_manager = Chat(self.db)
                return chat_manager.get_all_messages_of_room(item_id)
            else:
                return None
        except Exception:
            return None

    def get_report(self, report_id: str | ObjectId) -> dict:
        """
        Retrieve a report by its _id.
        Returns the report as a dict.

        Raises `ReportDoesntExistError` if the report doesn't exist.

        :param report_id: the _id of the report to retrieve
        """

        report_id = util.parse_object_id(report_id)

        report = self.db.reports.find_one({"_id": ObjectId(report_id)})

        report["item"] = self.get_reported_item(report["item_id"], report["type"])

        if report is None:
            raise ReportDoesntExistError("Report not found")

        return report

    def get_open_reports(self) -> list[dict]:
        """
        Retrieve all open reports.
        Returns a list of reports as dicts.
        """

        reports = list(self.db.reports.find({"state": "open"}))

        for report in reports:
            report["item"] = self.get_reported_item(report["item_id"], report["type"])

        return list(reports)

    def get_all_reports(self) -> list[dict]:
        """
        Retrieve all reports.
        Returns a list of reports as dicts.
        """

        reports = list(self.db.reports.find())

        for report in reports:
            report["item"] = self.get_reported_item(report["item_id"], report["type"])

        return reports

    def insert_report(self, report: dict) -> ObjectId:
        """
        Insert a new report into the database.
        Returns the _id of the new report.

        Raises `ValueError` if the report is missing required attributes.

        :param report: dict containing the report attributes
        """

        if not all(attr in report for attr in self.report_attributes):
            raise ValueError("Report is missing required attributes")

        # add system attributes
        report["state"] = "open"
        report["timestamp"] = datetime.now()

        report_id = self.db.reports.insert_one(report)
        return report_id

    def close_report(self, report_id: str | ObjectId) -> None:
        """
        Close a report, i.e. setting its state to "closed" to signal
        the report has been resolved.

        Returns nothing.

        Raises `ReportDoesntExistError` if the report doesn't exist.

        :param report_id: the _id of the report to close
        """

        report_id = util.parse_object_id(report_id)

        result = self.db.reports.update_one(
            {"_id": ObjectId(report_id)}, {"$set": {"state": "closed"}}
        )

        if result.matched_count == 0:
            raise ReportDoesntExistError("Report not found")

    def delete_reported_item(self, report_id: str | ObjectId) -> None:
        """
        Given the `report_id`, delete the item that was reported within the report.
        This may cause cascading deletions, e.g. deleting a post will also delete its comments,
        and also possibly unwanted side effects, like orphaned data, because the
        deletion is delegated the the respective resources.

        Returns nothing.

        Raises `ReportDoesntExistError` if the report doesn't exist.
        """

        report_id = util.parse_object_id(report_id)

        report = self.get_report(report_id)

        # TODO dispatch notification to the respective owners / authors of the item,
        # informing them that their item has been deleted due to a report

        if report["type"] == "post":
            post_manager = Posts(self.db)
            post_manager.delete_post(report["item_id"])
        elif report["type"] == "comment":
            post_manager = Posts(self.db)
            post_manager.delete_comment(report["item_id"])
        elif report["type"] == "plan":
            plan_manager = VEPlanResource(self.db)
            plan_manager.delete_plan(report["item_id"])
        elif report["type"] == "profile":
            # TODO
            # we cant delete profiles completely, find solution what to do
            pass
        elif report["type"] == "group":
            space_manager = Spaces(self.db)
            space_manager.delete_space(report["item_id"])
        elif report["type"] == "chatroom":
            # TODO
            # we cant delete a whole room, and deleting messages completely
            # also disturbs context, maybe just set the message content to [deleted] or sth
            pass

        # after deleting the item, close the report automatically
        self.close_report(report_id)
