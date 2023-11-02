import csv
from typing import List
import uuid

from keycloak.exceptions import KeycloakPostError

import global_vars
from resources.network.profile import Profiles
import util

class Course(dict):
    def __init__(self, title: str, academic_course: str, semester: str):
        self.title = title
        self.academic_course = academic_course
        self.semester = semester

    def __str__(self):
        return str(self.__dict__)

    def __repr__(self):
        return str(self)

    def to_dict(self):
        return self.__dict__


class Education(dict):
    def __init__(
        self,
        institution: str,
        degree: str,
        department: str,
        timestamp_from: str,
        timestamp_to: str,
        additional_info: str,
    ):
        self.institution = institution
        self.degree = degree
        self.department = department
        self.timestamp_from = timestamp_from
        self.timestamp_to = timestamp_to
        self.additional_info = additional_info

    def __str__(self):
        return str(self.__dict__)

    def __repr__(self):
        return str(self)

    def to_dict(self):
        return self.__dict__


class WorkExperience(dict):
    def __init__(
        self,
        position: str,
        institution: str,
        department: str,
        timestamp_from: str,
        timestamp_to: str,
        city: str,
        country: str,
        additional_info: str,
    ):
        self.position = position
        self.institution = institution
        self.department = department
        self.timestamp_from = timestamp_from
        self.timestamp_to = timestamp_to
        self.city = city
        self.country = country
        self.additional_info = additional_info

    def __str__(self):
        return str(self.__dict__)

    def __repr__(self):
        return str(self)

    def to_dict(self):
        return self.__dict__


class Persona:
    def __init__(
        self,
        first_name: str,
        last_name: str,
        institution: str,
        bio: str,
        expertise: str,
        birthday: str,
        languages: List[str],
        ve_interests: List[str],
        ve_goals: List[str],
        experience: List[str],
        preferred_formats: List[str],
        research_tags: List[str],
        courses: List[Course],
        educations: List[Education],
        work_experience: List[WorkExperience],
    ):
        self.first_name = first_name
        self.last_name = last_name
        self.username = self.first_name + "_" + self.last_name
        self.institution = institution
        self.bio = bio
        self.expertise = expertise
        self.birthday = birthday
        self.languages = languages
        self.ve_interests = ve_interests
        self.ve_goals = ve_goals
        self.experience = experience
        self.preferred_formats = preferred_formats
        self.research_tags = research_tags
        self.courses = courses
        self.educations = educations
        self.work_experience = work_experience

    def __str__(self):
        return str(self.__dict__)

    def __repr__(self):
        return str(self)

    def to_dict(self):
        ret_dict = self.__dict__.copy()
        ret_dict["courses"] = [course.to_dict() for course in ret_dict["courses"]]
        ret_dict["educations"] = [
            education.to_dict() for education in ret_dict["educations"]
        ]
        ret_dict["work_experience"] = [
            work_experience.to_dict() for work_experience in ret_dict["work_experience"]
        ]

        return ret_dict


def load_csv(
    path: str = "personas/Personas.csv", delimiter: str = ","
) -> List[List[str]]:
    """
    Load the CSV file at the given path with the given delimiter (default: ",").
    Skips the header row.

    Returns a list of lists, where each inner list is a row of the CSV file.
    """

    with open(path, "r") as csvfile:
        reader = csv.reader(csvfile, delimiter=delimiter)
        reader.__next__()  # skip header
        return [row for row in reader]


def parse_personas(csv_path: str = "personas/Personas.csv") -> List[Persona]:
    """
    Load the CSV file at the given path and parse it into a list of Persona objects
    that fit the data model of the backend.

    Returns a list of Personas.

    If an error occurs during the parsing of a persona, the item is skipped.
    """

    personas = []
    for persona in load_csv(csv_path):
        try:
            personas.append(
                Persona(
                    parse_first_name(persona),
                    parse_last_name(persona),
                    parse_institution(persona),
                    parse_bio(persona),
                    parse_experience(persona),
                    parse_birthday(persona),
                    parse_languages(persona),
                    parse_ve_interests(persona),
                    parse_ve_goals(persona),
                    parse_ve_experiences(persona),
                    parse_preferred_formats(persona),
                    parse_research_focus(persona),
                    parse_courses(persona),
                    parse_education(persona),
                    parse_work_experiences(persona),
                )
            )
        except Exception as e:
            print(f"Error parsing persona {persona[0]} {persona[1]}: {e}")
    return personas


def ensure_persona_profle_exists(persona: Persona) -> None:
    """
    Ensures that for the given persona a profile exists that already contains
    all necessary and expected keys. If not, the default profile is created in the db
    """

    with util.get_mongodb() as db:
        profile_manager = Profiles(db)
        profile_manager.ensure_profile_exists(
            persona.username,
            persona.first_name,
            persona.last_name,
        )


def aggregate_persona_profile(persona: Persona) -> None:
    """
    Aggregates the profile of the given persona in the database with the data
    that was extracted from the CSV file and stored inside the persona object.
    """

    persona_dict_copy_without_username = persona.to_dict()
    del persona_dict_copy_without_username["username"]
    with util.get_mongodb() as db:
        profile_manager = Profiles(db)
        profile_manager.update_profile_information(
            persona.username, persona_dict_copy_without_username
        )


def add_keycloak_user(persona: Persona) -> None:
    """
    create the user in Keycloak via the Keycloak Admin API
    """
    try:
        global_vars.keycloak_admin.create_user(
            {
                "email": "{}@example.com".format(uuid.uuid4()),
                "username": persona.username,
                "firstName": persona.first_name,
                "lastName": persona.last_name,
                "enabled": True,
            },
            exist_ok=True,
        )
    except KeycloakPostError:
        pass


def parse_first_name(persona: List[str]) -> str:
    return persona[0].strip()


def parse_last_name(persona: List[str]) -> str:
    return persona[1].strip()


def parse_institution(persona: List[str]) -> str:
    return persona[2].strip()


def parse_bio(persona: List[str]) -> str:
    return persona[3].strip()


def parse_experience(persona: List[str]) -> str:
    return persona[4].strip()


def parse_birthday(persona: List[str]) -> str:
    return persona[5].strip()


def parse_languages(persona: List[str]) -> List[str]:
    return [language.strip() for language in persona[6].split("|")]


def parse_ve_interests(persona: List[str]) -> List[str]:
    return [interest.strip() for interest in persona[7].split("|")]


def parse_ve_goals(persona: List[str]) -> List[str]:
    return [goal.strip() for goal in persona[8].split("|")]


def parse_ve_experiences(persona: List[str]) -> List[str]:
    return [experience.strip() for experience in persona[9].split("|")]


def parse_preferred_formats(persona: List[str]) -> List[str]:
    return [format.strip() for format in persona[10].split("|")]


def parse_research_focus(persona: List[str]) -> List[str]:
    return [focus.strip() for focus in persona[11].split("|")]


def parse_courses(persona: List[str]) -> List[Course]:
    courses = []
    for course in persona[12].split("|"):
        course = course.strip()
        if course:
            courses.append(Course(*course.split(";")))
    return courses


def parse_education(persona: List[str]) -> List[Education]:
    education = []
    for education_entry in persona[13].split("|"):
        education_entry = education_entry.strip()
        if education_entry:
            education.append(Education(*education_entry.split(";")))
    return education


def parse_work_experiences(persona: List[str]) -> List[WorkExperience]:
    work_experiences = []
    for work_experience in persona[14].split("|"):
        work_experience = work_experience.strip()
        if work_experience:
            work_experiences.append(WorkExperience(*work_experience.split(";")))
    return work_experiences


if __name__ == "__main__":
    pass
