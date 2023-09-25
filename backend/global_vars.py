# do not change any of those values manually, they will be overridden on application startup

from typing import Dict
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
socket_io = socketio.AsyncServer
username_sid_map: Dict[str, str] = {}
