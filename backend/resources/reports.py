from datetime import datetime

from bson import ObjectId
from pymongo.database import Database

from exceptions import ReportDoesntExistError
import util


class Reports:

    def __init__(self, db: Database):
        self.db = db

        self.report_attributes = ["type", "item", "reason", "reporter"]

    def get_report(self, report_id: str | ObjectId) -> dict:
        """
        Retrieve a report by its _id.
        Returns the report as a dict.

        Raises `ReportDoesntExistError` if the report doesn't exist.

        :param report_id: the _id of the report to retrieve
        """

        report_id = util.parse_object_id(report_id)

        report = self.db.reports.find_one({"_id": ObjectId(report_id)})

        if report is None:
            raise ReportDoesntExistError("Report not found")

        return report

    def get_open_reports(self) -> list[dict]:
        """
        Retrieve all open reports.
        Returns a list of reports as dicts.
        """

        reports = self.db.reports.find({"state": "open"})
        return list(reports)

    def get_all_reports(self) -> list[dict]:
        """
        Retrieve all reports.
        Returns a list of reports as dicts.
        """

        reports = self.db.reports.find()
        return list(reports)

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
