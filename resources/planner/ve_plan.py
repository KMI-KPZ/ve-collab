from bson import ObjectId
from pymongo.database import Database
from typing import List, Optional, Tuple

from exceptions import PlanDoesntExistError
from model import VEPlan
import util


class VEPlanResource:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            planner = VEPlanResource(db)
            ...

    """

    def __init__(self, db: Database):
        """
        Initialize this class by passing a mongo `Database` object
        that holds an open connection.

        Obtain a connection e.g. via::

            with util.get_mongodb() as db:
                planner = VEPlanResource(db)
                ...
        """

        self.db = db

    def get_all(self) -> List[VEPlan]:
        """
        Request all plans from the database.

        Returns a list of `VEPLan` objects, or an empty list,
        if there a no plans
        """

        return [VEPlan.from_dict(res) for res in self.db.plans.find()]

    def get_plan(self, _id: str | ObjectId) -> VEPlan:
        """
        Request a specific `VEPlan` by specifying its `_id`.

        The _id can either be an instance of `bson.ObjectId` or a
        corresponding str-representation.

        Returns an instance of `VEPlan`.

        Raises `PlanDoesntExistError` if no plan with the supplied `_id` is found.
        """

        _id = util.parse_object_id(_id)
        result = self.db.plans.find_one({"_id": _id})

        if not result:
            raise PlanDoesntExistError()

        return VEPlan.from_dict(result)

    def insert_or_update(self, plan: VEPlan) -> Tuple[str, ObjectId]:
        """
        Insert a new `VEPlan` into the database or update an existing one.

        Existence is determined by the `_id` attribute, i.e. if a plan with
        the given `_id` already exists in the database, the plan is updated (overwritten)
        by this given plan. Contrary, if no matching plan is found, this plan is inserted
        as a new one.

        Returns a tuple containing two values: the first is either "inserted" or "updated"
        and the second is the inserted/updated `_id` of the plan as an instance of
        `ObjectId`.
        """

        result = self.db.plans.update_one(
            {"_id": plan._id},
            {
                "$set": {
                    "name": plan.name,
                    "duration": plan.duration,
                    "workload": plan.workload,
                    "topic_description": plan.topic_description,
                    "learning_goal": plan.learning_goal,
                    "steps": [step.to_dict() for step in plan.steps],
                }
            },
            upsert=True,
        )

        if result.matched_count == 1:
            return "updated", plan._id
        else:
            return "inserted", result.upserted_id

    def delete_plan(self, _id: str | ObjectId) -> None:
        """
        Remove a plan from the database by specifying its `_id`.

        The _id can either be an instance of `bson.ObjectId` or a
        corresponding str-representation.

        Raises `PlanDoesntExistError` if no plan with the supplied `_id` is found. 
        However it also results in success in the sense that no document with this
        `_id` is in the database. So this error may be not be treated as an actual 
        error but as a neat way to provide response feedback to an end user.
        """
        _id = util.parse_object_id(_id)

        result = self.db.plans.delete_one({"_id": _id})

        if result.deleted_count != 1:
            raise PlanDoesntExistError()
