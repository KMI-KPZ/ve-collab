from keycloak import KeycloakError

import global_vars
from logger_factory import get_logger

logger = get_logger(__name__)


def get_user(username: str) -> dict:
    # wrap keycloak requests in try/except to catch error that are not our fault here
    try:
        # refresh the token to keycloak admin portal, because it might have timed out (resulting in the following requests not succeeding)
        global_vars.keycloak_admin.refresh_token()

        # request user data from keycloak
        user_id = global_vars.keycloak_admin.get_user_id(username)
        info = global_vars.keycloak_admin.get_user(user_id)
        # keycloak returns a list of groups here, simply use first element since we rely on disjunct roles
        group_of_user = global_vars.keycloak_admin.get_user_groups(user_id)[0]
    except KeycloakError as e:
        logger.info(
            "Keycloak Error occured while trying to request user data: {}".format(e)
        )
        raise

    user_payload = {
        "id": info["id"],
        "email": info["email"],
        "username": username,
        "role": group_of_user["name"],
    }
    return {"user": user_payload}


def get_user_list() -> dict:
    # wrap keycloak requests in try/except to catch error that are not our fault here
    try:
        # refresh the token to keycloak admin portal, because it might have timed out (resulting in the following requests not succeeding)
        global_vars.keycloak_admin.refresh_token()

        # keycloak api is somewhat fiddly here, have to request groups first and afterwards members of each group separately
        user_dict = {}
        keycloak_groups_list = global_vars.keycloak_admin.get_groups()
        for group in keycloak_groups_list:
            keycloak_members_list = global_vars.keycloak_admin.get_group_members(
                group["id"]
            )
            for member in keycloak_members_list:
                user_dict[member["username"]] = {
                    "id": member["id"],
                    "username": member["username"],
                    "email": member["email"],
                    "role": group["name"],
                }
    except KeycloakError as e:
        logger.info(
            "Keycloak Error occured while trying to request user data: {}".format(e)
        )
        raise

    return {"users": user_dict}


def check_permission(username: str) -> dict:
    # wrap keycloak requests in try/except to catch error that are not our fault here
    try:
        # refresh the token to keycloak admin portal, because it might have timed out (resulting in the following requests not succeeding)
        global_vars.keycloak_admin.refresh_token()
        user_id = global_vars.keycloak_admin.get_user_id(username)
        # keycloak returns a list of groups here, simply use first element since we rely on disjunct roles
        group_of_user = global_vars.keycloak_admin.get_user_groups(user_id)[0]["name"]
    except KeycloakError as e:
        logger.info(
            "Keycloak Error occured while trying to request user data: {}".format(e)
        )
        raise

    return group_of_user
