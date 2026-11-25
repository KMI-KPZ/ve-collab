from datetime import datetime, timezone
from typing import Dict, Optional

from pymongo import ReturnDocument
from pymongo.database import Database

from exceptions import InvalidAssessmentAnswersError


# the questions of the teacher profile self-assessment per dimension.
# The question texts live in the frontend, only their ids are known here.
TEACHER_PROFILE_QUESTIONS = {
    "digital_teaching": [
        "describe_online_methods",
        "describe_planning_aspects",
        "conduct_scenarios",
        "advise_others",
    ],
    "communication_collaboration": [
        "identify_online_communication_issues",
        "support_learner_cooperation",
        "guide_cooperation_design",
    ],
    "it_competence": [
        "operate_learning_platforms",
        "protect_digital_data",
        "guide_web20_tools",
        "guide_learning_platforms",
    ],
}

# answers are given on a likert scale from 1-5
LIKERT_MIN = 1
LIKERT_MAX = 5


class TeacherProfileAssessments:
    """
    The self-assessment a user made for their teacher profile. It only serves the
    user to see where they are on the teacher profile filter of the methods, so it is
    stored separately from the profile, which is visible to other users.

    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            assessment_manager = TeacherProfileAssessments(db)
            ...

    """

    def __init__(self, db: Database):
        self.db = db

    def get_assessment(self, username: str) -> Optional[Dict]:
        """
        get the assessment of the user, i.e. their `answers` (question id -> likert
        value) and when they were last `updated_at`, or None if the user has not
        made the assessment yet.
        """

        return self.db.teacher_profile_assessments.find_one(
            {"username": username}, projection={"_id": False}
        )

    def set_assessment(self, username: str, answers: Dict[str, int]) -> Dict:
        """
        save the `answers` of the user, replacing their previous ones. The answers
        have to cover each question of `TEACHER_PROFILE_QUESTIONS` with an integer
        between `LIKERT_MIN` and `LIKERT_MAX`, otherwise an
        `InvalidAssessmentAnswersError` is raised.

        :return: the saved assessment
        """

        self._validate_answers(answers)

        return self.db.teacher_profile_assessments.find_one_and_update(
            {"username": username},
            {"$set": {"answers": answers, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
            projection={"_id": False},
            return_document=ReturnDocument.AFTER,
        )

    def delete_assessment(self, username: str) -> None:
        """
        delete the assessment of the user, if they made one
        """

        self.db.teacher_profile_assessments.delete_one({"username": username})

    @staticmethod
    def _validate_answers(answers: Dict[str, int]) -> None:
        """
        raise an `InvalidAssessmentAnswersError` unless `answers` holds exactly one
        valid likert value per question
        """

        if not isinstance(answers, dict):
            raise InvalidAssessmentAnswersError("answers have to be an object")

        question_ids = {
            question_id
            for questions in TEACHER_PROFILE_QUESTIONS.values()
            for question_id in questions
        }
        if set(answers) != question_ids:
            raise InvalidAssessmentAnswersError(
                "answers have to cover exactly these questions: {}".format(
                    sorted(question_ids)
                )
            )

        for question_id, value in answers.items():
            # bool is a subclass of int, but no likert value
            if (
                not isinstance(value, int)
                or isinstance(value, bool)
                or not LIKERT_MIN <= value <= LIKERT_MAX
            ):
                raise InvalidAssessmentAnswersError(
                    "answer to '{}' has to be an integer from {} to {}".format(
                        question_id, LIKERT_MIN, LIKERT_MAX
                    )
                )
