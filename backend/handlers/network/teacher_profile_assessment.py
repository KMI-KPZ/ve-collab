import json

from error_reasons import (
    INVALID_ASSESSMENT_ANSWERS,
    JSON_PARSING_ERROR,
    MISSING_KEY_IN_HTTP_BODY_SLUG,
)
from exceptions import InvalidAssessmentAnswersError
from handlers.base_handler import BaseHandler, auth_needed
from resources.network.teacher_profile_assessment import TeacherProfileAssessments
import util


class TeacherProfileAssessmentHandler(BaseHandler):
    @auth_needed
    def get(self):
        """
        GET /teacher_profile_assessment
            get the teacher profile self-assessment results of the current user. 
            It is only ever available to the user themselves.

            returns:
                200 OK
                (assessment is null if the user has not made it yet)
                {"success": True,
                 "assessment": {
                    "answers": {"<question_id>": <int 1-5>, ...},
                    "updated_at": "<iso datetime>"
                 }}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}
        """

        with util.get_mongodb() as db:
            assessment = TeacherProfileAssessments(db).get_assessment(
                self.current_user.username
            )

        self.set_status(200)
        self.serialize_and_write(
            {"success": True, "assessment": self._public_view(assessment)}
        )

    @auth_needed
    def post(self):
        """
        POST /teacher_profile_assessment
            save the teacher profile self-assessment of the current user, replacing
            a previous one. Each question has to be answered (see
            `TEACHER_PROFILE_QUESTIONS` for the question ids).

            http body:
                {"answers": {"<question_id>": <int 1-5>, ...}}

            returns:
                200 OK
                {"success": True,
                 "assessment": {
                    "answers": {"<question_id>": <int 1-5>, ...},
                    "updated_at": "<iso datetime>"
                 }}

                400 Bad Request
                (the http body is no valid json)
                {"success": False,
                 "reason": "json_parsing_error"}

                400 Bad Request
                (the http body misses the answers)
                {"success": False,
                 "reason": "missing_key_in_http_body:answers"}

                400 Bad Request
                (a question is unanswered or unknown, or an answer is out of range)
                {"success": False,
                 "reason": "invalid_assessment_answers"}

                401 Unauthorized
                {"success": False,
                 "reason": "no_logged_in_user"}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": JSON_PARSING_ERROR})
            return

        if not isinstance(http_body, dict) or "answers" not in http_body:
            self.set_status(400)
            self.write(
                {"success": False, "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "answers"}
            )
            return

        with util.get_mongodb() as db:
            try:
                assessment = TeacherProfileAssessments(db).set_assessment(
                    self.current_user.username, http_body["answers"]
                )
            except InvalidAssessmentAnswersError:
                self.set_status(400)
                self.write({"success": False, "reason": INVALID_ASSESSMENT_ANSWERS})
                return

        self.set_status(200)
        self.serialize_and_write(
            {"success": True, "assessment": self._public_view(assessment)}
        )

    @staticmethod
    def _public_view(assessment: dict | None) -> dict | None:
        """
        reduce the stored `assessment` to what the user gets to see, i.e. without
        their username
        """

        if assessment is None:
            return None
        return {
            "answers": assessment["answers"],
            "updated_at": assessment["updated_at"],
        }
