# do not change any of those values manually, they will be overridden on application startup

from typing import Dict
from bson import ObjectId
from keycloak import KeycloakOpenID, KeycloakAdmin
import socketio

keycloak = KeycloakOpenID
keycloak_admin = KeycloakAdmin
keycloak_base_url: str = ""
keycloak_realm: str = ""
keycloak_client_id: str = ""
keycloak_client_secret: str = ""
keycloak_admin_username: str = ""
keycloak_admin_password: str = ""
port: int = 0
cookie_secret: str = ""
wordpress_url: str = ""
mongodb_host: str = ""
mongodb_port: int = 0
mongodb_username: str = ""
mongodb_password: str = ""
mongodb_db_name: str = ""
etherpad_base_url: str = ""
etherpad_api_key: str = ""
elasticsearch_base_url: str = ""
elasticsearch_username: str = ""
elasticsearch_password: str = ""
dummy_personas_passcode: str = ""
mbr_token_endpoint: str = ""
mbr_client_id: str = ""
mbr_client_secret: str = ""
mbr_metadata_base_endpoint: str = ""
mbr_metadata_source_slug: str = ""
smtp_host: str = ""
smtp_port: int = 0
smtp_username: str = ""
smtp_password: str = ""
socket_io = socketio.AsyncServer
username_sid_map: Dict[str, str] = {} # username -> sid
plan_write_lock_map: Dict[ObjectId, Dict] = {} # plan_id -> {"username": username, "expires": datetime.datetime}
