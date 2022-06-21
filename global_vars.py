# do not change any of those values manually, they will be overridden on application startup

from keycloak import KeycloakOpenID
keycloak = KeycloakOpenID  # only as dummies for IDE function suggestions (correct classes with params will be set from main.py when executing the platform)
platform_host: str = ""
platform_port: int = 0
mongodb_host: str = ""
mongodb_port: int = 0
mongodb_username: str = ""
mongodb_password: str = ""
wiki_url: str = "",
wiki_username: str = "",
wiki_password: str = "",
routing_table: dict = {}