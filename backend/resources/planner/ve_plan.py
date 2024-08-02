import copy
import datetime

from bson import ObjectId
from bson.errors import InvalidId
import gridfs
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError
from typing import Any, Dict, List

from exceptions import (
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
            if result["is_good_practise"] is False or result["is_good_practise"] is None:
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

    def get_plans_for_user(self, username: str) -> List[VEPlan]:
        """
        Request all plans that are avaible to the user determined by their `username`,
        i.e. their own plans and those that he/she has read or write access to.

        Returns a list of `VEPlan` objects, or an empty list, if there are no plans
        that match the criteria.
        """

        # query plans where the user is the author or has read or write access
        result = self.db.plans.find(
            {
                "$or": [
                    {"author": username},
                    {"read_access": username},
                    {"write_access": username},
                ]
            }
        )
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
        result = self.db.plans.find({"author": username})
        return [VEPlan.from_dict(res) for res in result]

    def get_good_practise_plans(self) -> List[VEPlan]:
        """
        Request all plans that are marked as good practise.

        Returns a list of `VEPlan` objects, or an empty list, if there are no plans
        that match the criteria.
        """

        result = self.db.plans.find({"is_good_practise": True})
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

        result = self.db.plans.find_one({"_id": plan_id}, projection={"literature_files": True})
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
        del plan_dict[
            "creation_timestamp"
        ]  # make sure creation timestamp doesn't get overridden

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
            "audience",
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
                "audience": TargetGroup,
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

            # formalities is another special case that enforces keys in the dict
            if field_name == "formalities":
                for formality in value_copy:
                    # ensure that each formality entry is associated with a user
                    if "username" not in formality:
                        raise MissingKeyError(
                            "Missing key 'username' in formalities dictionary",
                            "username",
                            "formalities",
                        )

                    # ensure that the username is also a partner of the plan
                    if not self._check_user_is_author_or_partner(
                        plan_id, formality["username"]
                    ):
                        raise ValueError(
                            "username '{}' in formalities is not a partner of the plan".format(
                                formality["username"]
                            )
                        )

                    # ensure that any other values are of type bool or None
                    for attr, value in formality.items():
                        if attr != "username":
                            if not isinstance(value, (bool, type(None))):
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

        update_result = self.db.plans.update_one(
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
