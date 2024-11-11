from contextlib import contextmanager
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from email.utils import make_msgid
import logging
import mimetypes
import smtplib
from typing import Dict, Literal, Optional

from bson import ObjectId
import dateutil.parser
from jinja2 import TemplateNotFound
from pymongo import MongoClient
from pymongo.database import Database

from exceptions import ProfileDoesntExistException
import global_vars
from resources.network.profile import Profiles

logger = logging.getLogger(__name__)


@contextmanager
def get_mongodb():
    client = MongoClient(
        global_vars.mongodb_host,
        global_vars.mongodb_port,
        username=global_vars.mongodb_username,
        password=global_vars.mongodb_password,
    )
    try:
        yield client[global_vars.mongodb_db_name]
    finally:
        client.close()


def parse_object_id(obj_id: str | ObjectId) -> ObjectId:
    """
    parse a str-representation of a mongodb objectid into an
    actual ObjectId-object. If the input id is already an ObjectId,
    it is returned unchanged.
    :param obj_id: the id to be transformed into a bson.ObjectId-object
    :return: the id as a bson.ObjectId
    """

    if obj_id is None:
        raise TypeError("_id cannot be None")

    if isinstance(obj_id, ObjectId):
        return obj_id
    elif isinstance(obj_id, str):
        return ObjectId(obj_id)
    else:
        raise TypeError(
            """invalid object_id type, 
            can either be 'str' or 'bson.ObjectId', 
            got: '{}'
            """.format(
                type(obj_id)
            )
        )


def parse_datetime(timestamp: str | datetime) -> Optional[datetime]:
    if timestamp is None or isinstance(timestamp, datetime):
        return timestamp
    elif timestamp == "":
        return None
    else:
        # dateutil parses guesses format, best bet is to use ISO8601 despite
        return dateutil.parser.parse(timestamp)


def timedelta_to_seconds(timedelta_obj: timedelta) -> float:
    if not isinstance(timedelta_obj, timedelta):
        raise TypeError(
            """expected type `datetime.timedelta` for parameter `timedelta_obj`,
                got {}""".format(
                type(timedelta_obj)
            )
        )

    return timedelta_obj.total_seconds()


def seconds_to_timedelta(seconds: float | int) -> timedelta:
    if not isinstance(seconds, (float, int)):
        raise TypeError(
            """expected type `float` or `int` for parameter `seconds`,
                got {}""".format(
                type(seconds)
            )
        )
    return timedelta(seconds=seconds)


def validate_keycloak_jwt(jwt_token: str) -> Dict:
    """
    Decodes and validates the JWT access token issued by Keycloak.

    Returns the decoded token info as a dict if it is valid, raises one of the following
    errors otherwise:

        - `keycloak.KeycloakGetError` : could not retrieve the public key of keycloak
        - `jose.exceptions.JWTError` : token did not validate
    """

    # try to decode the JWT, if any error is thrown, re-raise it to signal
    # to the caller that the token is invalid
    try:
        token_info = global_vars.keycloak.decode_token(jwt_token)
    except Exception:
        raise

    return token_info


def json_serialize_response(dictionary: dict) -> dict:
    """
    recursively traverse the (variably) nested dict to find any fields that
    require a transformation from its object representation into a str.
    Fields that are transformed are those whose type is an instances of `ObjectId`
    and `datetime.datetime`.
    Parse those values using the `str()` function (for ObjectId's),
    or the `.isoformat()` function (for datetimes).
    """

    for key in dictionary:
        # check for keys whose values need to be transformed
        if isinstance(dictionary[key], ObjectId):
            dictionary[key] = str(dictionary[key])
        elif isinstance(dictionary[key], datetime):
            dictionary[key] = dictionary[key].isoformat()

        # if it is a nested dict, recursively run on subdict
        # and reassemble it
        elif isinstance(dictionary[key], dict):
            dictionary[key] = json_serialize_response(dictionary[key])

        # if it is a list, there are two options:
        # either the entries in the list are ObjectIds themselves, in that
        # case transform them as str's and reassemble the list,
        # or the list contains dicts again, in which case we run recursively
        # on each of those subdicts again.
        # This can be seen as an exclusive-or, meaning mixed-lists may cause
        # strange or undesired behaviour.
        elif isinstance(dictionary[key], list):
            for elem in dictionary[key]:
                if isinstance(elem, ObjectId):
                    dictionary[key][dictionary[key].index(elem)] = str(elem)
                elif isinstance(elem, dict):
                    elem = json_serialize_response(elem)

    return dictionary


def _construct_email_header(
    recipient_name: str | None, recipient_email: str, subject: str | None
) -> EmailMessage:
    """
    Create a new `EmailMessage` object and set `From`, `To` and `Subject` fields
    according to the given parameters.
    If `recipient_name` is given, use 'Name <email>' format for the recipient,
    otherwise just use the email.
    Likewise, `subject` uses a default fallback if not given.

    Returns the `EmailMessage` object.
    """

    msg = EmailMessage()
    msg["From"] = "VE-Collab Plattform NoReply <{}>".format(global_vars.smtp_username)
    msg["To"] = (
        "{} <{}>".format(recipient_name, recipient_email)
        if recipient_name is not None
        else recipient_email
    )
    msg["Subject"] = (
        subject if subject is not None else "neue Benachrichtung auf VE-Collab"
    )

    return msg


def _exchange_username_for_display_name(username: str, db: Database) -> str | None:
    """
    Exchange a username (which could be cryptic) for a more human-readable
    display name (first & last name), if the user exists in the database and return it.
    Otherwise, return None.
    """

    profile_manager = Profiles(db)
    try:
        profile = profile_manager.get_profile(
            username, projection={"first_name": True, "last_name": True}
        )
        return "{} {}".format(profile["first_name"], profile["last_name"])
    except ProfileDoesntExistException:
        return None


def _append_msg_text(
    db: Database,
    msg: EmailMessage,
    display_name: str,
    template: Literal[
        "reminder_evaluation.html",
        "reminder_good_practise_examples.html",
        "reminder_icebreaker.html",
        "space_invitation.html",
        "space_join_request.html",
        "ve_invitation.html",
        "ve_invitation_reply.html",
    ],
    payload: Dict,
) -> None:
    """
    Depending on the chosen template, set the alternative text for the email.
    This text is displayed in case the email client does not render the html content
    and therefore functions as a fallback.

    Some templates require additional information, which is extracted from the `payload`
    and / or taken from the database, to which an open connection is passed as `db`.

    Attention: as a side effect, the `payload` is modified in place for some templates to
    ensure correct rendering not only of the alternative text, but also of the html content.
    Therefore, this function should be called before setting the html content (in `send_mail()`)
    """

    # set text according to the chosen template
    text = ""
    if template == "reminder_evaluation.html":
        with open("assets/email_templates/reminder_evaluation.txt", "r") as f:
            text = f.read()
            text = text.format(display_name, payload["material_link"])

    elif template == "reminder_good_practise_examples.html":
        with open(
            "assets/email_templates/reminder_good_practise_examples.txt", "r"
        ) as f:
            text = f.read()
            text = text.format(
                display_name, payload["material_link"], payload["designer_dashboard"]
            )

    elif template == "reminder_icebreaker.html":
        with open("assets/email_templates/reminder_icebreaker.txt", "r") as f:
            text = f.read()
            text = text.format(display_name, payload["material_link"])

    elif template == "space_invitation.html":
        sender_display_name = _exchange_username_for_display_name(
            payload["invitation_sender"], db
        )

        if sender_display_name is None:
            sender_display_name = "einem/r anderen Nutzer:in"

        payload["invitation_sender"] = sender_display_name

        with open("assets/email_templates/space_invitation.txt", "r") as f:
            text = f.read()
            text = text.format(
                recipient_name=(display_name),
                invitation_sender=(sender_display_name),
                space_name=payload["space_name"],
            )

    elif template == "space_join_request.html":

        sender_display_name = _exchange_username_for_display_name(
            payload["join_request_sender"], db
        )

        if sender_display_name is None:
            sender_display_name = "Ein/e andere/r Nutzer:in"

        payload["join_request_sender"] = sender_display_name

        with open("assets/email_templates/space_join_request.txt", "r") as f:
            text = f.read()
            text = text.format(
                recipient_name=(display_name),
                join_request_sender=(sender_display_name),
                space_name=payload["space_name"],
                space_id=payload["space_id"],
            )

    elif template == "ve_invitation.html":

        sender_display_name = _exchange_username_for_display_name(payload["from"], db)

        if sender_display_name is None:
            sender_display_name = "Ein/e andere/r Nutzer:in"
        payload["from"] = sender_display_name

        # delete plan_id and message from the payload if they are not set
        # for correct rendering in the email template
        if payload["plan_id"] is None or payload["plan_id"] == "":
            del payload["plan_id"]
        if payload["message"] is None or payload["message"] == "":
            del payload["message"]

        with open("assets/email_templates/ve_invitation.txt", "r") as f:
            text = f.read()
            text = text.format(
                recipient_name=(display_name),
                invitation_sender_name=(sender_display_name),
                message=payload["message"] if "message" in payload else "",
            )

    elif template == "ve_invitation_reply.html":

        invitation_recipient_name = _exchange_username_for_display_name(
            payload["from"], db
        )

        if invitation_recipient_name is None:
            invitation_recipient_name = "Ein/e andere/r Nutzer:in"

        payload["from"] = invitation_recipient_name

        # depending on the accepted flag, the alternative text is different
        if payload["accepted"]:
            with open(
                "assets/email_templates/ve_invitation_reply_success.txt", "r"
            ) as f:
                text = f.read()
                text = text.format(
                    recipient_name=(display_name),
                    invitation_recipient_name=invitation_recipient_name,
                )
        else:
            with open(
                "assets/email_templates/ve_invitation_reply_failure.txt", "r"
            ) as f:
                text = f.read()
                text = text.format(
                    recipient_name=(display_name),
                    invitation_recipient_name=invitation_recipient_name,
                )
    else:
        raise ValueError("Invalid template name: {}".format(template))

    # set msg text and return
    msg.set_content(text)
    return msg


def send_email(
    recipient_username: str,
    recipient_email: str,
    subject: str | None,
    template: Literal[
        "reminder_evaluation.html",
        "reminder_good_practise_examples.html",
        "reminder_icebreaker.html",
        "space_invitation.html",
        "space_join_request.html",
        "ve_invitation.html",
        "ve_invitation_reply.html",
    ],
    payload: Dict,
) -> None:
    """
    Send an Email to the recipient with the given username and email address.

    The email is constructed based on the given template, which is chosen from a
    set of predefined templates in the `assets/email_templates` directory.
    If the template does not exist, an error is logged and the function returns without
    sending an email, i.e. a valid, existing `template` is always required.

    The payload is a dictionary containing arbitrary information that is used to fill
    the placeholders in the email template. The keys in the payload are specific to the
    chosen template and are documented in the respective template files.

    Optionally a `subject` can be set for the email. If None is given, instead a generic
    default is used.

    Returns nothing
    """

    # sanity check: email template exists
    try: 
        global_vars.email_template_env.get_template(template)
    except TemplateNotFound:
        logger.error("Email template not found: {}".format(template))
        return

    # setup shenanigans
    mailserver = smtplib.SMTP(global_vars.smtp_host, global_vars.smtp_port)
    mailserver.starttls()
    mailserver.login(global_vars.smtp_username, global_vars.smtp_password)

    # set header and alternative text for the email
    with get_mongodb() as db:
        display_name = _exchange_username_for_display_name(recipient_username, db)
        if display_name is None:
            display_name = "Nutzer:in"

        msg = _construct_email_header(display_name, recipient_email, subject)

        # alt text is used in case clients dont want to render the html
        msg = _append_msg_text(db, msg, display_name, template, payload)

    # image cid's for vecollab logo and funding icons
    logo_cid = make_msgid(domain="ve-collab.org")
    logo_cid_bare = logo_cid.strip("<>")
    bmbf_cid = make_msgid(domain="ve-collab.org")
    bmbf_cid_bare = bmbf_cid.strip("<>")
    eu_cid = make_msgid(domain="ve-collab.org")
    eu_cid_bare = eu_cid.strip("<>")

    # set html mail content based on the chosen template
    template = global_vars.email_template_env.get_template(template)
    rendered = template.render(
        logo_cid=logo_cid_bare,
        bmbf_cid=bmbf_cid_bare,
        eu_cid=eu_cid_bare,
        name=display_name,
        **payload,
    )
    msg.add_alternative(rendered, subtype="html")

    # add images for pre-created cids
    with open("assets/images/logo.png", "rb") as logo:
        maintype, subtype = mimetypes.guess_type(logo.name)[0].split("/")
        msg.get_payload()[1].add_related(
            logo.read(), maintype=maintype, subtype=subtype, cid=logo_cid
        )
    with open("assets/images/bmbf_logo.png", "rb") as bmbf:
        maintype, subtype = mimetypes.guess_type(bmbf.name)[0].split("/")
        msg.get_payload()[1].add_related(
            bmbf.read(), maintype=maintype, subtype=subtype, cid=bmbf_cid
        )
    with open("assets/images/eu_funding.png", "rb") as eu:
        maintype, subtype = mimetypes.guess_type(eu.name)[0].split("/")
        msg.get_payload()[1].add_related(
            eu.read(), maintype=maintype, subtype=subtype, cid=eu_cid
        )

    mailserver.send_message(msg)

    mailserver.quit()
