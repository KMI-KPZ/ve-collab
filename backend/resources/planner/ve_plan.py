import copy
import datetime

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError
from typing import Any, List

from exceptions import (
    MissingKeyError,
    NonUniqueStepsError,
    PlanAlreadyExistsError,
    PlanDoesntExistError,
)
from model import Institution, Lecture, Step, TargetGroup, VEPlan
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

    def get_plans_for_user(self, username: str) -> List[VEPlan]:
        """
        Request all plans that are avaible to the user determined by their `username`,
        i.e. their own plans and those that he/she has read or write access to (r/w TODO)

        Returns a list of `VEPlan` objects, or an empty list, if there are no plans
        that match the criteria.
        """

        result = self.db.plans.find({"author": username})
        return [VEPlan.from_dict(res) for res in result]

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

        # set creation and last modified attributes
        plan.creation_timestamp = plan.last_modified = datetime.datetime.now()

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

        now_timestamp = datetime.datetime.now()
        plan.last_modified = now_timestamp
        plan_dict = plan.to_dict()
        del plan_dict[
            "creation_timestamp"
        ]  # make sure creation timestamp doesn't get overridden

        update_result = self.db.plans.update_one(
            {"_id": plan._id},
            {"$set": plan_dict, "$setOnInsert": {"creation_timestamp": now_timestamp}},
            upsert=upsert,
        )

        # if no match was found, and no upsert was requested by the caller,
        # raise PlanDoesntExistError
        if update_result.matched_count != 1:
            if update_result.upserted_id is None:
                raise PlanDoesntExistError()

        return plan._id

    def update_field(
        self, plan_id: str | ObjectId, field_name: str, value: Any, upsert: bool = False
    ) -> ObjectId:
        """
        update a single field (i.e. attribute) of a VEPlan by specifying
        the _id of the plan to update, which field should be updated and
        the corresponding `value`. The `field_name` may be any attribute of
        a VEPlan as indicated by `VEPlan.EXPECTED_DICT_ENTRIES`.

        In case of a compound attribute like steps, audience, ... the full
        attributes of this object have to be passed within a list (because
        usually there might be more than one of those), otherwise a `MissingKeyError`
        might be raised.

        Additionally, any of the models underlying errors might be raised depending
        on their particular type checks (especially object-like attributes might have
        special semantics within their attributes that are ensured, e.g. distinct step names).

        Raises `ValueError`, if the supplied `field_name` is not a valid attribute
        of a VEPlan.

        Optionally, the `upsert` parameter may be set to True to insert the plan
        freshly instead if no matching plan was found, resulting in an "insert" of
        a new plan with the attribute passed to this function set to the corresponding value
        and any other attribute as default.

        Returns the updated, or (in case of an upsert) inserted _id.
        """

        plan_id = util.parse_object_id(plan_id)

        value_copy = copy.deepcopy(value)

        # any of these attributes is of type List[Object], therefore
        # we typecheck by parsing each list element into its object form
        # and listen for errors
        if field_name in ["institutions", "lectures", "audience", "steps"]:
            value_copy = []

            # object-like attributes are always in lists, because there can be
            # more than one
            if not isinstance(value, list):
                raise TypeError("compound objects have to be enclosed by lists")

            key_object_mapper = {
                "institutions": Institution,
                "lectures": Lecture,
                "audience": TargetGroup,
                "steps": Step,
            }

            # if any error appears, we definitely know something can't be right
            # about the format of the attribute, so we just re-raise the
            # exception to the caller to deal with it (e.g. user feedback)
            for obj_like_attr in value:
                if not isinstance(obj_like_attr, dict):
                    raise TypeError(
                        "expected type 'dict' for elements in '{}'-list, got {}".format(
                            field_name, type(obj_like_attr)
                        )
                    )

                try:
                    obj_correct_format = (
                        key_object_mapper[field_name].from_dict(obj_like_attr).to_dict()
                    )
                    value_copy.append(obj_correct_format)
                except Exception:
                    raise

            # the integrity for unique step names has to be checked manually, because it is not
            # part of the Step model logic, but of the VEPlan, which we don't build an instance
            # of here
            step_copy = copy.deepcopy(value_copy)
            if field_name == "steps":
                if not VEPlan._check_unique_step_names(
                    [Step.from_dict(val) for val in step_copy]
                ):
                    raise NonUniqueStepsError()

        # if the to-update attribute is not object-like, but a regular "primitive"
        # type, we typecheck via the expected values defined by the model
        elif field_name in VEPlan.EXPECTED_DICT_ENTRIES:
            if not isinstance(value, VEPlan.EXPECTED_DICT_ENTRIES[field_name]):
                raise TypeError(
                    "expected type {} for attribute {}, got {}".format(
                        VEPlan.EXPECTED_DICT_ENTRIES[field_name],
                        field_name,
                        type(value_copy),
                    )
                )

        # attribute is not expected in a VEPlan, so reject it
        else:
            raise ValueError(
                "attribute '{}' is not expected by VEPlan".format(field_name)
            )

        # typechecks were successfull, we can finally do the update
        # for the upsert case, we need to construct a plan dict that doesn't
        # contain the field we tried to update and all fields we want to
        # set in the query because of a write concern at mongodb
        now_timestamp = datetime.datetime.now()
        on_insert_plan_dict = VEPlan(creation_timestamp=now_timestamp).to_dict()
        del on_insert_plan_dict["_id"]
        del on_insert_plan_dict["last_modified"]
        del on_insert_plan_dict[field_name]
        update_result = self.db.plans.update_one(
            {"_id": plan_id},
            {
                "$set": {
                    "last_modified": now_timestamp,
                    field_name: value_copy,
                },
                "$setOnInsert": on_insert_plan_dict,
            },
            upsert=upsert,
        )

        # if no match was found, and no upsert was requested by the caller,
        # raise PlanDoesntExistError
        if update_result.matched_count != 1:
            if update_result.upserted_id is None:
                raise PlanDoesntExistError()

        # return either the plan_id itself, or,
        # in case of an upsert, the freshly upserted _id
        return (
            update_result.upserted_id
            if update_result.upserted_id is not None
            else plan_id
        )

    def append_step(self, plan_id: str | ObjectId, step: Step) -> ObjectId:
        """
        Append a new step object to a given plan. The `name` of the step
        must not have a name that already exists within the other steps
        of this plan, otherwise a `NonUniqueStepsError` is thrown.

        If no plan with the given `plan_id` is found, a `PlanDoesntExistError`
        is thrown.
        """

        plan_id = util.parse_object_id(plan_id)

        steps_of_plan = self.db.plans.find_one(
            {"_id": plan_id}, projection={"steps": True}
        )
        if not steps_of_plan:
            raise PlanDoesntExistError()

        step_names = []
        for elem in steps_of_plan["steps"]:
            if elem:
                step_names.append(elem["name"])

        if step.name in step_names:
            raise NonUniqueStepsError()

        update_result = self.db.plans.update_one(
            {"_id": plan_id},
            {
                "$push": {"steps": step.to_dict()},
                "$set": {"last_modified": datetime.datetime.now()},
            },
        )

        return plan_id

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
