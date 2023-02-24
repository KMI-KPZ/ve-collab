from bson import ObjectId
from bson.errors import InvalidId
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError
from typing import List

from exceptions import PlanAlreadyExistsError, PlanDoesntExistError
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

        # if supplied _id is no valid ObjectId, we can also raise the PlanDoesntExistError,
        # since there logically can't be any matching plan
        try:
            _id = util.parse_object_id(_id)
        except InvalidId:
            raise PlanDoesntExistError()

        result = self.db.plans.find_one({"_id": _id})

        if not result:
            raise PlanDoesntExistError()

        return VEPlan.from_dict(result)

    def insert_plan(self, plan: VEPlan) -> ObjectId:
        """
        Insert the given plan into the database, returning the ObjectId of the
        freshly generated document.
        
        If a plan with the same _id as the specified one already exists in the database,
        a PlanAlreadyExistsError is raised and the plan will not be inserted. In that case,
        either delete it and insert it again, or update it instead.

        :param plan: the VEPlan instance to insert into the db
        :returns: the _id of the freshly inserted plan
        """

        try:
            result = self.db.plans.insert_one(plan.to_dict())
        except DuplicateKeyError:
            raise PlanAlreadyExistsError()

        return result.inserted_id

    def update_full_plan(self, plan: VEPlan, upsert: bool = False) -> ObjectId:
        """
        Update an already existing plan in the db by completely overwriting it 
        with the specified one, i.e. the plan in the db will have all the attributes that
        this supplied plan has. If no match was found, a PlanDoesntExistError is raised.

        Optionally, the `upsert` parameter may be set to True to insert the plan freshly instead
        if no matching plan was found, resulting in an "insert".

        Returns the updated, or (in case of an upsert) inserted _id, which is be
        identical to the _id of the supplied plan.
        """

        update_result = self.db.plans.update_one(
            {"_id": plan._id}, {"$set": plan.to_dict()},
            upsert=upsert
        )

        # if no match was found, and no upsert was requested by the caller,
        # raise PlanDoesntExistError
        if update_result.matched_count != 1:
            if update_result.upserted_id is None:
                raise PlanDoesntExistError()

        return plan._id

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

        # if supplied _id is no valid ObjectId, we can also raise the PlanDoesntExistError,
        # since there logically can't be any matching plan
        try:
            _id = util.parse_object_id(_id)
        except InvalidId:
            raise PlanDoesntExistError()

        result = self.db.plans.delete_one({"_id": _id})

        if result.deleted_count != 1:
            raise PlanDoesntExistError()
