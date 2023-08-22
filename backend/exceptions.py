class PostNotExistingException(Exception):
    pass


class AlreadyLikerException(Exception):
    pass


class NotLikerException(Exception):
    pass


class FilenameCollisionError(Exception):
    pass


class AlreadyFollowedException(Exception):
    pass


class NotFollowedException(Exception):
    pass


class ProfileDoesntExistException(Exception):
    pass


class SpaceDoesntExistError(Exception):
    pass


class SpaceAlreadyExistsError(Exception):
    pass


class AlreadyMemberError(Exception):
    pass


class AlreadyAdminError(Exception):
    pass


class AlreadyRequestedJoinError(Exception):
    pass


class UserNotMemberError(Exception):
    pass


class UserNotAdminError(Exception):
    pass


class OnlyAdminError(Exception):
    pass


class FileAlreadyInRepoError(Exception):
    pass


class FilenameCollisionError(Exception):
    pass


class FileDoesntExistError(Exception):
    pass


class PostFileNotDeleteableError(Exception):
    pass


class MissingKeyError(Exception):
    """Model Object initialization is missing a required key"""

    def __init__(self, message, missing_value=None, obj=None) -> None:
        super().__init__(message)
        self.missing_value = missing_value
        self.obj = obj


class NonUniqueTasksError(Exception):
    """Tasks in a Step of a VEPlan do not have unique names to each other"""

    pass


class NonUniqueStepsError(Exception):
    """Steps in a VEPlan do not have unique names to each other"""

    pass


class PlanDoesntExistError(Exception):
    """The requested VEPlan doesn't exist"""

    pass


class PlanAlreadyExistsError(Exception):
    """a VEPlan with this _id already exists"""

    pass


class NoReadAccessError(Exception):
    """a user has no read access to a VEPlan"""

    pass


class NoWriteAccessError(Exception):
    """a user has no write access to a VEPlan"""

    pass


class InvitationDoesntExistError(Exception):
    """The requested ve invitation doesn't exist"""

    pass


class NotificationDoesntExistError(Exception):
    """The requested notification doesn't exist"""

    pass
