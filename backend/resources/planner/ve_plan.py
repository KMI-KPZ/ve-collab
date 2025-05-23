import copy
import datetime

from bson import ObjectId
from bson.errors import InvalidId
import gridfs
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError
from typing import Any, Dict, List, Literal
import tornado

import logging
import logging.handlers

logger = logging.getLogger(__name__)


from exceptions import (
    FileDoesntExistError,
    InvitationDoesntExistError,
    MaximumFilesExceededError,
    MissingKeyError,
    NoReadAccessError,
    NoWriteAccessError,
    NonUniqueStepsError,
    PlanAlreadyExistsError,
    PlanDoesntExistError,
)
from model import (
    Evaluation,
    IndividualLearningGoal,
    Institution,
    Lecture,
    PhysicalMobility,
    Step,
    TargetGroup,
    VEPlan,
)
from resources.notifications import NotificationResource
from resources.elasticsearch_integration import ElasticsearchConnector
from resources.network.profile import Profiles
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

    def get_plan(self, _id: str | ObjectId, requesting_username: str = None) -> VEPlan:
        """
        Request a specific `VEPlan` by specifying its `_id`.

        The _id can either be an instance of `bson.ObjectId` or a
        corresponding str-representation.

        If the `requesting_username` is not None, sanity checks will be applied, i.e.
        this user has to have read access to the plan (determined by his name being in the
        read_access list). If this is not the case, a `NoReadAccessError` is thrown.

        Returns an instance of `VEPlan`.

        Raises `PlanDoesntExistError` if no plan with the supplied `_id` is found.
        Raises `NoReadAccessError` if `requesting_username` is given and has no
        read access to this plan.
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

        if requesting_username is not None:
            if (
                result["is_good_practise"] is False
                or result["is_good_practise"] is None
            ):
                if requesting_username not in result["read_access"]:
                    raise NoReadAccessError()

        return VEPlan.from_dict(result)

    def get_bulk_plans(self, plan_ids: List[str | ObjectId]) -> List[VEPlan]:
        """
        Request multiple plans by specifying their `_id`s in a list.

        The _id can either be an instance of `bson.ObjectId` or a
        corresponding str-representation.

        Returns a list of `VEPlan` instances.

        In case of a non-existing plan _id, it is simply skipped, meaning that
        the length of the returned list may be less than the length of the supplied
        plan_ids list.
        """

        # if supplied _id is no valid ObjectId, we can also raise the PlanDoesntExistError,
        # since there logically can't be any matching plan
        try:
            plan_ids = [util.parse_object_id(plan_id) for plan_id in plan_ids]
        except InvalidId:
            pass

        result = self.db.plans.find({"_id": {"$in": plan_ids}})

        return [VEPlan.from_dict(res) for res in result]

    def get_plans_for_user(
        self,
        username: str,
        filter_good_practice_only: bool | None = None,
        filter_access: Literal["all", "own", "shared"] = "all",
        search_query: str | None = None,
        limit: int = 10,
        offset: int = 0,
        sort: Literal["name", "last_modified", "creation_timestamp"] = "last_modified",
        order: int = -1,
    ) -> List[VEPlan]:
        """
        Request all plans that are avaible to the user determined by their `username`,
        i.e. their own plans and those that he/she has read or write access to and those
        that are marked as good practise examples (read only).

        Optionally, apply the following filters (including combinations):
        - `filter_good_practice_only`: if set to True, only plans that are marked as good practise
           are returned
        - `filter_access`: filter the plans by their access level, i.e. "all" (default), "own"
        (plans where i am the author) or "shared" (plans where i have received read/write access from external)
        - `search_query`: a search query to filter plans by their `name` attribute

        The `limit` and `offset` parameters can be used to paginate the results.

        Returns a list of `VEPlan` objects, or an empty list, if there are no plans
        that match the criteria.
        """

        gp_filter = {"is_good_practise": True}

        access_filters = {}
        if filter_access == "own":
            access_filters = {"author": username}
        elif filter_access == "shared":
            access_filters = {
                "$and": [
                    {"author": {"$ne": username}},
                    {
                        "$or": [
                            {"read_access": username},
                            {"write_access": username},
                        ]
                    },
                ]
            }
        elif filter_access == "all":
            access_filters = {
                "$or": [
                    {"author": username},
                    {"read_access": username},
                    {"write_access": username},
                    {"is_good_practise": True},
                ]
            }

        search_filter = {
            "$or": [
                {"name": {"$regex": search_query, "$options": "i"}},
                {"topics": {"$regex": search_query, "$options": "i"}},
                {"abstract": {"$regex": search_query, "$options": "i"}},
            ]
        }

        # apply filters and query for results,
        # access filters (OR) and search query are applied first with an AND,
        # then the good practise filter is applied on top of that result
        stages = [
            {"$match": access_filters},
            {"$match": search_filter if search_query else {}},
            {"$match": gp_filter if filter_good_practice_only else {}},
            {"$sort": {sort: order}},
            {"$skip": offset},
            {"$limit": limit},
        ]
        result = self.db.plans.aggregate(stages)

        return [VEPlan.from_dict(res) for res in result]

    def get_public_plans_of_user(self, username: str) -> List[VEPlan]:
        """
        Request all plans that the user given by `username` is an author of and are
        publically readable (TODO).

        Returns a list of `VEPlan` objects, or an empty list, if there are no plans
        that match the criteria.
        """

        # omit the "public readability" criteria since access to foreign
        # plans is not yet implemented
        result = self.db.plans.find({"author": username, "is_good_practise": True})
        return [VEPlan.from_dict(res) for res in result]

    def find_plans_for_user_by_slug(self, username: str, slug: str) -> List[VEPlan]:
        """
        Search all available plans of given user (author, read/write access, GoodPracticePlans)
        by given slug (name, topics, abstract)

        Returns a list of `VEPlan` objects, or an empty list, if there are no plans
        that match the criteria.
        """

        # TODO use ElasticSearch query instead

        # query plans where the user is the author or has read or write access
        # regex with given slug
        result = self.db.plans.find(
            {
                "$and": [
                    {
                        "$or": [
                            {"author": username},
                            {"read_access": username},
                            {"write_access": username},
                            {"is_good_practise": True},
                        ]
                    },
                    {
                        "$or": [
                            {"name": {"$regex": slug, "$options": "i"}},
                            {"topics": {"$regex": slug, "$options": "i"}},
                            {"abstract": {"$regex": slug, "$options": "i"}},
                        ]
                    },
                ]
            }
        )
        return [VEPlan.from_dict(res) for res in result]

    def get_good_practise_plans(self) -> List[VEPlan]:
        """
        Request all plans that are marked as good practise.

        Returns a list of `VEPlan` objects, or an empty list, if there are no plans
        that match the criteria.
        """

        result = self.db.plans.find({"is_good_practise": True})
        return [VEPlan.from_dict(res) for res in result]

    def _get_plan_for_elastic(self, plan: VEPlan) -> Dict:
        """
        Get minimized copy of a plan for elastic
        """

        elastic_plan = {
            "_id": plan._id,
            "name": plan.name,
            "author": plan.author,
            "read_access": plan.read_access,
            "write_access": plan.write_access,
            "topics": plan.topics,
            "is_good_practise": plan.is_good_practise,
            "abstract": plan.abstract,
        }

        return elastic_plan.copy()

    def _update_elastic_plan(
        self, plan_id: str | ObjectId, elasticsearch_collection: str = "plans"
    ) -> None:
        """
        Simply update existing plan in Elasticsearch by given plan_id
        """

        elastic_plan = self._get_plan_for_elastic(self.get_plan(plan_id))

        ElasticsearchConnector().on_update(
            plan_id, elasticsearch_collection, elastic_plan
        )

    def insert_plan(
        self, plan: VEPlan, elasticsearch_collection: str = "plans"
    ) -> ObjectId:
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

        elastic_plan = self._get_plan_for_elastic(plan)
        # replicate the insert to elasticsearch
        ElasticsearchConnector().on_insert(
            result.inserted_id, elastic_plan, elasticsearch_collection
        )

        return result.inserted_id

    def _check_write_access(self, plan_id: str | ObjectId, username: str) -> bool:
        """
        Determine if the user given by his `username` has write access to the plan
        given by its _id, i.e. check if the username is within the write_access list.

        Returns True if the user has write access, False otherwise.

        Raises `PlanDoesntExistError`if no such plan with the given `plan_id` is found in
        the db.
        """

        try:
            plan_id = util.parse_object_id(plan_id)
        except InvalidId:
            raise PlanDoesntExistError()

        result = self.db.plans.find_one({"_id": plan_id}, {"write_access": True})

        if not result:
            raise PlanDoesntExistError()

        return username in result["write_access"]

    def _check_user_is_author(self, plan_id: str | ObjectId, username: str) -> bool:
        """
        Determine if the user given by his `username` is the author of the plan given
        by its _id.

        Returns True if the user is the author, False otherwise.

        Raises `PlanDoesntExistError`if no such plan with the given `plan_id` is found in
        the db.
        """

        try:
            plan_id = util.parse_object_id(plan_id)
        except InvalidId:
            raise PlanDoesntExistError()

        result = self.db.plans.find_one({"_id": plan_id}, {"author": True})

        if not result:
            raise PlanDoesntExistError()

        return username == result["author"]

    def _check_user_is_author_or_partner(
        self, plan_id: str | ObjectId, username: str
    ) -> bool:
        """
        Determine if the user given by his `username` is the author of the plan given
        by its _id or a partner of the plan.

        Returns True if the user is the author or partner, False otherwise.

        Raises `PlanDoesntExistError`if no such plan with the given `plan_id` is found in
        the db.
        """

        try:
            plan_id = util.parse_object_id(plan_id)
        except InvalidId:
            raise PlanDoesntExistError()

        result = self.db.plans.find_one(
            {"_id": plan_id}, {"author": True, "partners": True}
        )

        if not result:
            raise PlanDoesntExistError()

        return username == result["author"] or username in result["partners"]

    def _check_plan_exists(self, plan_id: str | ObjectId) -> bool:
        """
        Determine if a plan with the given _id exists in the database.

        Returns True if the plan exists, False otherwise.
        """

        try:
            plan_id = util.parse_object_id(plan_id)
        except InvalidId:
            return False

        return (
            self.db.plans.find_one({"_id": plan_id}, projection={"_id": True})
            is not None
        )

    def _check_below_max_literature_files(self, plan_id: str | ObjectId) -> bool:
        """
        Determine if a plan with the given _id has less than 5 literature files.

        Returns True if the plan has less than 5 literature files, False otherwise.

        Raises `PlanDoesntExistError`if no such plan with the given `plan_id` is found.
        """

        plan_id = util.parse_object_id(plan_id)

        result = self.db.plans.find_one(
            {"_id": plan_id}, projection={"literature_files": True}
        )
        if not result:
            raise PlanDoesntExistError()

        if len(result["literature_files"]) < 5:
            return True
        return False

    def update_full_plan(
        self, plan: VEPlan, upsert: bool = False, requesting_username: str = None
    ) -> ObjectId:
        """
        Update an already existing plan in the db by completely overwriting it
        with the specified one, i.e. the plan in the db will have all the attributes that
        this supplied plan has. If no match was found, a PlanDoesntExistError is raised.

        Optionally, the `upsert` parameter may be set to True to insert the plan freshly instead
        if no matching plan was found, resulting in an "insert".

        If the `requesting_username` is not None, sanity checks will be applied, i.e.
        this user has to have write access to the plan (determined by his name being in the
        write_access list). If this is not the case, a `NoWriteAccessError` is thrown.

        Returns the updated, or (in case of an upsert) inserted _id, which is be
        identical to the _id of the supplied plan.

        Raises `PlanDoesntExistError` if upsert is False and no plan with the same _id
        already exists.
        Raises `NoWriteAccessError` if the requesting user (if supplied) has no write access
        to the plan.
        """

        now_timestamp = datetime.datetime.now()
        plan.last_modified = now_timestamp
        plan_dict = plan.to_dict()
        # make sure meta attributes are not overwritten
        del plan_dict["creation_timestamp"]
        del plan_dict["author"]
        del plan_dict["read_access"]
        del plan_dict["write_access"]

        # if a user is given, check if he/she has appropriate write access
        if requesting_username is not None:
            try:
                if not self._check_write_access(plan._id, requesting_username):
                    raise NoWriteAccessError()
            except PlanDoesntExistError:
                # since non-existence can already happen here, we simply re-raise
                # if upsert is not True
                if not upsert:
                    raise

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

        # Update Elasticsearch
        self._update_elastic_plan(plan._id)

        return plan._id

    def update_field(
        self,
        plan_id: str | ObjectId,
        field_name: str,
        value: Any,
        upsert: bool = False,
        requesting_username: str = None,
    ) -> ObjectId:
        """
        update a single field (i.e. attribute) of a VEPlan by specifying
        the _id of the plan to update, which field should be updated and
        the corresponding `value`. The `field_name` may be any attribute of
        a VEPlan as indicated by `VEPlan.EXPECTED_DICT_ENTRIES`, except `evaluation_file`,
        which has a separate updating function (`put_evaluation_file`).

        In case of a compound attribute like steps, target_groups, ... the full
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

        If the `requesting_username` is not None, sanity checks will be applied, i.e.
        this user has to have write access to the plan (determined by his name being in the
        write_access list). If this is not the case, a `NoWriteAccessError` is thrown.

        Returns the updated, or (in case of an upsert) inserted _id.

        Raises `PlanDoesntExistError` if upsert is False and no plan with the same _id
        already exists.
        Raises `NoWriteAccessError` if the requesting username (if supplied) has no write access
        to the plan.
        """

        plan_id = util.parse_object_id(plan_id)

        value_copy = copy.deepcopy(value)

        # any of these attributes is of type List[Object], therefore
        # we typecheck by parsing each list element into its object form
        # and listen for errors
        if field_name in [
            "institutions",
            "lectures",
            "target_groups",
            "physical_mobilities",
            "evaluation",
            "individual_learning_goals",
            "steps",
        ]:
            value_copy = []

            # object-like attributes are always in lists, because there can be
            # more than one
            if not isinstance(value, list):
                raise TypeError("compound objects have to be enclosed by lists")

            key_object_mapper = {
                "institutions": Institution,
                "lectures": Lecture,
                "target_groups": TargetGroup,
                "physical_mobilities": PhysicalMobility,
                "evaluation": Evaluation,
                "individual_learning_goals": IndividualLearningGoal,
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

            # checklist is another special case that enforces keys in the dict
            if field_name == "checklist":
                for checklist_item in value_copy:
                    # ensure that each checklist_item entry is associated with a user
                    if "username" not in checklist_item:
                        raise MissingKeyError(
                            "Missing key 'username' in checklist dictionary",
                            "username",
                            "checklist",
                        )

                    # ensure that any other values are of type bool or None
                    for attr, value in checklist_item.items():
                        if attr != "username":
                            if not isinstance(value, (bool, type(None), list)):
                                raise TypeError(
                                    "expected type 'bool|None' for attribute 'formalitites[{}]', got {} instead".format(
                                        attr, type(value)
                                    )
                                )

        # attribute is not expected in a VEPlan, so reject it
        else:
            raise ValueError(
                "attribute '{}' is not expected by VEPlan".format(field_name)
            )

        # if a user is given, check if he/she has appropriate write access
        if requesting_username is not None:
            try:
                if not self._check_write_access(plan_id, requesting_username):
                    raise NoWriteAccessError()
            except PlanDoesntExistError:
                # since non-existence can already happen here, we simply re-raise
                # if upsert is not True
                if not upsert:
                    raise

        # typechecks an access checks were successfull, we can finally do the update
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

        # Update Elasticsearch
        self._update_elastic_plan(plan_id)

        # if the updated field was partners, two side effects happen:
        # - the partners will automatically gain write access to the plan
        # - when they are added the first time, a notification will be dispatched to them
        if field_name == "partners":
            profile_manager = Profiles(self.db)
            plan_state = self.get_plan(plan_id)

            # get the partners that are not already in the write_access list
            partners = list(set(value_copy) - set(plan_state.write_access))

            # remove users that are not real users
            not_existing_users = list(
                set(partners)
                - set(
                    [
                        elem["username"]
                        for elem in profile_manager.get_bulk_profiles(partners)
                    ]
                )
            )
            partners_existing = list(set(partners) - set(not_existing_users))

            if partners_existing:
                # add the partners to the write_access list
                self.db.plans.update_one(
                    {"_id": plan_id},
                    {
                        "$addToSet": {
                            "write_access": {"$each": partners_existing},
                            "read_access": {"$each": partners_existing},
                        }
                    },
                )

                # dispatch a notification to the partners
                async def _notification_send(usernames, payload):
                    # since this will be run in a separate task, we need to acquire a new db connection
                    with util.get_mongodb() as db:
                        notification_resources = NotificationResource(db)
                        for username in usernames:
                            await notification_resources.send_notification(
                                username, "plan_added_as_partner", payload
                            )

                # create async task to avoid having to declare the function async
                # everywhere
                tornado.ioloop.IOLoop.current().add_callback(
                    _notification_send,
                    partners_existing,
                    {
                        "plan_id": plan_id,
                        "plan_name": plan_state.name,
                        "author": plan_state.author,
                    },
                )

        # return either the plan_id itself, or,
        # in case of an upsert, the freshly upserted _id
        return (
            update_result.upserted_id
            if update_result.upserted_id is not None
            else plan_id
        )

    def append_step(
        self, plan_id: str | ObjectId, step: Step, requesting_username: str = None
    ) -> ObjectId:
        """
        Append a new step object to a given plan. The `name` of the step
        must not have a name that already exists within the other steps
        of this plan, otherwise a `NonUniqueStepsError` is thrown.

        If the `requesting_username` is not None, sanity checks will be applied, i.e.
        this user has to have write access to the plan (determined by his name being in the
        write_access list). If this is not the case, a `NoWriteAccessError` is thrown.

        Raises `PlanDoesntExistError` if no plan with the _id exists.
        Raises `NoWriteAccessError` if the requesting_user (if supplied) has no write access
        to the plan.
        """

        plan_id = util.parse_object_id(plan_id)

        # if a user is given, check if he/she has appropriate write access
        if requesting_username is not None:
            try:
                if not self._check_write_access(plan_id, requesting_username):
                    raise NoWriteAccessError()
            except PlanDoesntExistError:
                # since non-existence can already happen here, we simply re-raise
                raise

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

        self.db.plans.update_one(
            {"_id": plan_id},
            {
                "$push": {"steps": step.to_dict()},
                "$set": {"last_modified": datetime.datetime.now()},
            },
        )

        return plan_id

    def put_evaluation_file(
        self,
        plan_id: str | ObjectId,
        file_name: str,
        file_content: bytes,
        content_type: str,
        requesting_username: str = None,
    ) -> ObjectId:
        """
        Upload a new evalution file to gridfs and associate it with the plan
        given by its _id. the _id of the uploaded file is stored in the plan's
        `evaluation_file` attribute and can be retrieved using the `GridFSStaticFileHandler`.

        If the `requesting_username` is not None, sanity checks will be applied, i.e.
        this user has to have write access to the plan (determined by his name being in the
        write_access list). If this is not the case, a `NoWriteAccessError` is thrown.

        Returns the _id of the uploaded file.

        Raises `PlanDoesntExistError` if no plan with the same _id already exists.
        Raises `NoWriteAccessError` if the requesting username (if supplied) has no write access
        to the plan.
        """

        plan_id = util.parse_object_id(plan_id)

        if not self._check_plan_exists(plan_id):
            raise PlanDoesntExistError()

        # if a user is given, check if he/she has appropriate write access
        if requesting_username is not None:
            if not self._check_write_access(plan_id, requesting_username):
                raise NoWriteAccessError()

        # store file in gridfs
        # TODO: if there was a file before, delete the old one
        fs = gridfs.GridFS(self.db)
        _id = fs.put(
            file_content,
            filename=file_name,
            content_type=content_type,
            metadata={"uploader": requesting_username},
        )

        self.db.plans.update_one(
            {"_id": plan_id},
            {
                "$set": {
                    "evaluation_file": {
                        "file_id": _id,
                        "file_name": file_name,
                    }
                }
            },
        )

        return _id

    def remove_evaluation_file(
        self,
        plan_id: str | ObjectId,
        file_id: str | ObjectId,
        requesting_username: str = None,
    ) -> None:
        """
        Remove the evaluation file from its plan (and gridfs) by specifying the plan's _id
        and the file's _id.

        If the `requesting_username` is not None, sanity checks will be applied, i.e.
        this user has to have write access to the plan (determined by his name being in the
        write_access list). If this is not the case, a `NoWriteAccessError` is thrown.

        Returns nothing.

        Raises `PlanDoesntExistError` if no plan with the given _id exists.
        Raises `NoWriteAccessError` if the requesting username (if supplied) has no write access
        to the plan.
        Raises `FileDoesntExistError` if no file with the given _id exists.
        """

        plan_id = util.parse_object_id(plan_id)
        file_id = util.parse_object_id(file_id)

        if not self._check_plan_exists(plan_id):
            raise PlanDoesntExistError()

        # if a user is given, check if he/she has appropriate write access
        if requesting_username is not None:
            if not self._check_write_access(plan_id, requesting_username):
                raise NoWriteAccessError()

        # remove the file from gridfs
        fs = gridfs.GridFS(self.db)
        if not fs.exists(file_id):
            raise FileDoesntExistError()

        fs.delete(file_id)

        # remove the reference from the plan
        self.db.plans.update_one(
            {"_id": plan_id},
            {"$set": {"evaluation_file": None}},
        )

    def put_literature_file(
        self,
        plan_id: str | ObjectId,
        file_name: str,
        file_content: bytes,
        content_type: str,
        requesting_username: str = None,
    ) -> ObjectId:
        """
        Upload a new literature file to gridfs and associate it with the plan
        given by its _id. Only a maximum of 5 literature files is allowed per plan.
        the _id of the uploaded file is stored in the plan's `literature_files` attribute
        and can be retrieved using the `GridFSStaticFileHandler`.

        If the `requesting_username` is not None, sanity checks will be applied, i.e.
        this user has to have write access to the plan (determined by his name being in the
        write_access list). If this is not the case, a `NoWriteAccessError` is thrown.

        Returns the _id of the uploaded file.

        Raises `PlanDoesntExistError` if no plan with the same _id already exists.
        Raises `NoWriteAccessError` if the requesting username (if supplied) has no write access
        to the plan.
        Raises `MaximumFilesExceededError` if the maximum number of literature files would be larger than
        5 after the update.
        """

        plan_id = util.parse_object_id(plan_id)

        if not self._check_plan_exists(plan_id):
            raise PlanDoesntExistError()

        if not self._check_below_max_literature_files(plan_id):
            raise MaximumFilesExceededError()

        # if a user is given, check if he/she has appropriate write access
        if requesting_username is not None:
            if not self._check_write_access(plan_id, requesting_username):
                raise NoWriteAccessError()

        # store file in gridfs
        fs = gridfs.GridFS(self.db)
        _id = fs.put(
            file_content,
            filename=file_name,
            content_type=content_type,
            metadata={"uploader": requesting_username},
        )

        self.db.plans.update_one(
            {"_id": plan_id},
            {
                "$push": {
                    "literature_files": {
                        "file_id": _id,
                        "file_name": file_name,
                    }
                }
            },
        )

        return _id

    def remove_literature_file(
        self,
        plan_id: str | ObjectId,
        file_id: str | ObjectId,
        requesting_username: str = None,
    ) -> None:
        """
        Remove one literature file from the list in its plan (and gridfs) by specifying
        the plan's _id and the file's _id.

        If the `requesting_username` is not None, sanity checks will be applied, i.e.
        this user has to have write access to the plan (determined by his name being in the
        write_access list). If this is not the case, a `NoWriteAccessError` is thrown.

        Returns nothing.

        Raises `PlanDoesntExistError` if no plan with the given _id exists.
        Raises `NoWriteAccessError` if the requesting username (if supplied) has no write access
        to the plan.
        Raises `FileDoesntExistError` if no file with the given _id exists.
        """

        plan_id = util.parse_object_id(plan_id)
        file_id = util.parse_object_id(file_id)

        if not self._check_plan_exists(plan_id):
            raise PlanDoesntExistError()

        # if a user is given, check if he/she has appropriate write access
        if requesting_username is not None:
            if not self._check_write_access(plan_id, requesting_username):
                raise NoWriteAccessError()

        # remove the file from gridfs
        fs = gridfs.GridFS(self.db)
        if not fs.exists(file_id):
            raise FileDoesntExistError()

        fs.delete(file_id)

        # remove the reference from the plan
        self.db.plans.update_one(
            {"_id": plan_id},
            {"$pull": {"literature_files": {"file_id": file_id}}},
        )

    def copy_plan(self, plan_id: str | ObjectId, new_author: str = None) -> ObjectId:
        """
        Create an identical copy of the plan given by its _id and return the _id of the
        freshly created plan.
        The new plan's `name` will have " (Kopie)" appended to it, the `author` will be
        updated to the `new_author` if specified and the read and write access is reset
        (author only), i.e. private copy.

        Returns the _id of the freshly created plan.

        Raises `PlanDoesntExistError` if no plan with the given _id exists.
        """

        plan_id = util.parse_object_id(plan_id)

        plan = self.get_plan(plan_id)

        # create a private copy of the plan
        plan_copy = copy.deepcopy(plan)
        plan_copy._id = ObjectId()
        plan_copy.name += " (Kopie)"
        plan_copy.author = new_author if new_author is not None else plan.author
        plan_copy.read_access = [plan_copy.author]
        plan_copy.write_access = [plan_copy.author]
        plan_copy.is_good_practise = False

        # insert the copy into the db
        return self.insert_plan(plan_copy)

    def set_read_permissions(self, plan_id: str | ObjectId, username: str) -> None:
        """
        Set read permissions for the user given by `username` for the plan with the
        `plan_id`, i.e. the username gets added to the read_access list.

        The plan_id can either be an instance of `bson.ObjectId` or a
        corresponding str-representation.

        Returns nothing.

        Raises `PlanDoesntExistError` if no plan with such a _id exists.
        """

        try:
            plan_id = util.parse_object_id(plan_id)
        except InvalidId:
            raise PlanDoesntExistError()

        update_result = self.db.plans.update_one(
            {"_id": plan_id}, {"$addToSet": {"read_access": username}}
        )

        if update_result.matched_count != 1:
            raise PlanDoesntExistError()

        # Update Elasticsearch
        self._update_elastic_plan(plan_id)

    def set_write_permissions(self, plan_id: str | ObjectId, username: str) -> None:
        """
        Set write permissions for the user given by `username` for the plan with the
        `plan_id`, i.e. the username gets added to the write_access list.
        Obviously, write permission without read permission are quite useless, so
        setting write permission automatically also sets the corresponding read permission.

        The plan_id can either be an instance of `bson.ObjectId` or a
        corresponding str-representation.

        Returns nothing.

        Raises `PlanDoesntExistError` if no plan with such a _id exists.
        """

        try:
            plan_id = util.parse_object_id(plan_id)
        except InvalidId:
            raise PlanDoesntExistError()

        update_result = self.db.plans.update_one(
            {"_id": plan_id},
            {"$addToSet": {"read_access": username, "write_access": username}},
        )

        if update_result.matched_count != 1:
            raise PlanDoesntExistError()

        # Update Elasticsearch
        self._update_elastic_plan(plan_id)

    def revoke_read_permissions(self, plan_id: str | ObjectId, username: str) -> None:
        """
        Revoke read permissions for the user given by `username` for the plan with the
        `plan_id`, i.e. the username gets removed from the read_access list.

        Since being able to write without reading is useless, write permissions are also
        automatically revoked.

        The plan_id can either be an instance of `bson.ObjectId` or a
        corresponding str-representation.

        Returns nothing.

        Raises `PlanDoesntExistError` if no plan with such a _id exists.
        """

        try:
            plan_id = util.parse_object_id(plan_id)
        except InvalidId:
            raise PlanDoesntExistError()

        update_result = self.db.plans.update_one(
            {"_id": plan_id},
            {"$pull": {"read_access": username, "write_access": username}},
        )

        if update_result.matched_count != 1:
            raise PlanDoesntExistError()

        # Update Elasticsearch
        self._update_elastic_plan(plan_id)

    def revoke_write_permissions(self, plan_id: str | ObjectId, username: str) -> None:
        """
        Revoke write permissions for the user given by `username` for the plan with the
        `plan_id`, i.e. the username gets removed from the write_access list. Note that
        the read access state is not modified, the user still has read permissions.

        The plan_id can either be an instance of `bson.ObjectId` or a
        corresponding str-representation.

        Returns nothing.

        Raises `PlanDoesntExistError` if no plan with such a _id exists.
        """

        try:
            plan_id = util.parse_object_id(plan_id)
        except InvalidId:
            raise PlanDoesntExistError()

        update_result = self.db.plans.update_one(
            {"_id": plan_id},
            {"$pull": {"write_access": username}},
        )

        if update_result.matched_count != 1:
            raise PlanDoesntExistError()

        # Update Elasticsearch
        self._update_elastic_plan(plan_id)

    def add_partner(self, plan_id: str | ObjectId, username: str) -> None:
        """
        Add username as partner to a plan, set readt/write access,
        add user in checklist, evaluation, individual_learning_goals
        """

        try:
            plan_id = util.parse_object_id(plan_id)
        except InvalidId:
            raise PlanDoesntExistError()

        try:
            plan = self.get_plan(plan_id)
        except:
            raise PlanDoesntExistError()

        partners = plan.partners
        partners.append(username)
        self.update_field(plan_id, "partners", partners)

        individual_learning_goals = [
            a.to_dict() for a in plan.individual_learning_goals
        ]
        individual_learning_goals.append({"username": username, "learning_goal": None})
        self.update_field(
            plan_id, "individual_learning_goals", individual_learning_goals
        )

        checklist = plan.checklist
        checklist.append({"username": username})
        self.update_field(plan_id, "checklist", checklist)

        evaluation = [a.to_dict() for a in plan.evaluation]
        evaluation.append(
            {
                "username": "test_user",
                "is_graded": False,
                "task_type": None,
                "assessment_type": None,
                "evaluation_before": "",
                "evaluation_while": None,
                "evaluation_after": None,
            }
        )
        self.update_field(plan_id, "evaluation", evaluation)

        self._update_elastic_plan(plan_id)

    def delete_plan(
        self, _id: str | ObjectId, elasticsearch_collection: str = "plans"
    ) -> None:
        """
        Remove a plan from the database by specifying its `_id`.

        The _id can either be an instance of `bson.ObjectId` or a
        corresponding str-representation.

        Raises `PlanDoesntExistError` if no plan with the supplied `_id` is found.
        However it also results in success in the sense that no document with this
        `_id` is in the database. So this error may be not be treated as an actual
        error but as a neat way to provide response feedback to an end user.
        """

        # TODO may delete assocciated invitations?!

        # if supplied _id is no valid ObjectId, we can also raise the PlanDoesntExistError,
        # since there logically can't be any matching plan
        try:
            _id = util.parse_object_id(_id)
        except InvalidId:
            raise PlanDoesntExistError()

        fs = gridfs.GridFS(self.db)
        plan = self.get_plan(_id)
        if plan.evaluation_file and plan.evaluation_file["file_id"]:
            fs.delete(plan.evaluation_file["file_id"])

        if plan.literature_files:
            for file in plan.literature_files:
                fs.delete(file["file_id"])

        result = self.db.plans.delete_one({"_id": _id})

        if result.deleted_count != 1:
            raise PlanDoesntExistError()

        # update elastic
        ElasticsearchConnector().on_delete(_id, elasticsearch_collection)

    def delete_step_by_id(
        self,
        _id: str | ObjectId,
        step_id: str | ObjectId,
        requesting_username: str = None,
    ):
        """
        Remove a step from a plan by specifying the plans _id and the steps _id as well.

        The id's can either be an instance of `bson.ObjectId` or a
        corresponding str-representation.

        If the `requesting_username` is not None, sanity checks will be applied, i.e.
        this user has to have write access to the plan (determined by his name being in the
        write_access list). If this is not the case, a `NoWriteAccessError` is thrown.

        Returns nothing.

        Raises `PlanDoesntExistError` if no plan with the supplied `_id` is found.
        Raises `NoWriteAccessError` if the requesting_user (if supplied) has no write access
        to the plan.
        """

        # if supplied _id is no valid ObjectId, we can also raise the PlanDoesntExistError,
        # since there logically can't be any matching plan
        try:
            _id = util.parse_object_id(_id)
        except InvalidId:
            raise PlanDoesntExistError()

        try:
            step_id = util.parse_object_id(step_id)
        except InvalidId:
            pass

        # if a user is given, check if he/she has appropriate write access
        if requesting_username is not None:
            try:
                if not self._check_write_access(_id, requesting_username):
                    raise NoWriteAccessError()
            except PlanDoesntExistError:
                # since non-existence can already happen here, we simply re-raise
                raise

        result = self.db.plans.update_one(
            {"_id": _id}, {"$pull": {"steps": {"_id": step_id}}}
        )

        if result.matched_count != 1:
            raise PlanDoesntExistError()

    def delete_step_by_name(
        self, _id: str | ObjectId, step_name: str, requesting_username: str = None
    ):
        """
        Remove a step from a plan by specifying the plans _id and the name
        of the step.

        The _id can either be an instance of `bson.ObjectId` or a
        corresponding str-representation.

        If the `requesting_username` is not None, sanity checks will be applied, i.e.
        this user has to have write access to the plan (determined by his name being in the
        write_access list). If this is not the case, a `NoWriteAccessError` is thrown.

        Returns nothing.

        Raises `PlanDoesntExistError` if no plan with the supplied `_id` is found.
        Raises `NoWriteAccessError` if the requesting_user (if supplied) has no write access
        to the plan.
        """

        # if supplied _id is no valid ObjectId, we can also raise the PlanDoesntExistError,
        # since there logically can't be any matching plan
        try:
            _id = util.parse_object_id(_id)
        except InvalidId:
            raise PlanDoesntExistError()

        # if a user is given, check if he/she has appropriate write access
        if requesting_username is not None:
            try:
                if not self._check_write_access(_id, requesting_username):
                    raise NoWriteAccessError()
            except PlanDoesntExistError:
                # since non-existence can already happen here, we simply re-raise
                raise

        result = self.db.plans.update_one(
            {"_id": _id}, {"$pull": {"steps": {"name": step_name}}}
        )

        if result.matched_count != 1:
            raise PlanDoesntExistError()

    def insert_plan_invitation(
        self,
        plan_id: str | ObjectId | None,
        message: str,
        inviter_username: str,
        invited_username: str,
    ) -> ObjectId:
        """
        Store a new VE Invitation in the database, which is interpreted as `inviter_username`
        sends `invited_username` an invitation to participate in a VE, includes a `message` in
        the invitation and optionally, an already existing `plan_id` as a reference to an already
        existing plan.

        Returns the _id of the freshly inserted invitation.

        Raises `PlanDoesntExistError` if a `plan_id` is supplied, but no such plan actually exists.
        """

        # if supplied _id is no valid ObjectId, we can also raise the PlanDoesntExistError,
        # since there logically can't be any matching plan
        if plan_id is not None:
            try:
                plan_id = util.parse_object_id(plan_id)
            except InvalidId:
                raise PlanDoesntExistError()

            # if no plan with the given _id exists, raise PlanDoesntExistError
            try:
                self.get_plan(plan_id)
            except:
                raise

        result = self.db.invitations.insert_one(
            {
                "plan_id": plan_id,
                "message": message,
                "sender": inviter_username,
                "recipient": invited_username,
                "accepted": None,
            }
        )

        return result.inserted_id

    def get_plan_invitation(self, _id: str | ObjectId) -> Dict:
        """
        Request a VE invitation record by specifying it's _id in
        either a `str` or `ObjectId` representation.

        Returns the VE invitation as a dict.

        Raise `InvitationDoesntExistError` if no invitation with
        such a _id exists.
        """

        try:
            _id = util.parse_object_id(_id)
        except InvalidId:
            raise InvitationDoesntExistError()

        result = self.db.invitations.find_one({"_id": _id})

        if not result:
            raise InvitationDoesntExistError()

        return result

    def set_invitation_reply(
        self, invitation_id: str | ObjectId, accepted: bool
    ) -> None:
        """
        update the already sent invitation with a reply from the recipient user, i.e. setting
        the `accepted` attribute to True or False depending on the user's choice.

        Returns nothing.

        Raises `InvitationDoesntExistError` if no ve invitation with that _id exists.
        """

        try:
            invitation_id = util.parse_object_id(invitation_id)
        except InvalidId:
            raise InvitationDoesntExistError()

        update_result = self.db.invitations.update_one(
            {"_id": invitation_id}, {"$set": {"accepted": accepted}}
        )

        if update_result.matched_count == 0:
            raise InvitationDoesntExistError()
