# do not change any of those values manually, they will be overridden on application startup

from keycloak import KeycloakOpenID, KeycloakAdmin
keycloak = KeycloakOpenID
keycloak_admin = KeycloakAdmin
keycloak_client_id: str = "" 
keycloak_callback_url: str = ""
domain: str = ""
port: int = 0
cookie_secret: str = ""
mongodb_host: str = ""
mongodb_port: int = 0
mongodb_username: str = ""
mongodb_password: str = ""
mongodb_db_name: str = ""