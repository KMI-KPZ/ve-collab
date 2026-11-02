"""
one-off database migrations. Each migration is a module that is run once from
the backend directory after deploying the version that introduced it, e.g.
inside the running backend container:

    docker exec backend python3 -m migrations.<name>

Every migration is idempotent, so running it again does no harm. See
`db_migration_log.md` for which change requires which migration.
"""

from contextlib import AbstractContextManager
import os

from dotenv import load_dotenv
from pymongo.database import Database

import global_vars
import util


def connect() -> AbstractContextManager[Database]:
    """
    configure the MongoDB connection from the environment the same way `main.py`
    does (natively, a `.env` file in the backend directory is read as well) and
    return `util.get_mongodb()`. Only MongoDB is set up, so migrations don't
    depend on any other service (Keycloak, Elasticsearch, ...) being reachable.
    """

    load_dotenv()
    global_vars.mongodb_host = os.getenv("MONGODB_HOST", "localhost")
    global_vars.mongodb_port = int(os.getenv("MONGODB_PORT", "27017"))
    global_vars.mongodb_username = os.getenv("MONGODB_USERNAME")
    global_vars.mongodb_password = os.getenv("MONGODB_PASSWORD")
    global_vars.mongodb_db_name = os.getenv("MONGODB_DB_NAME", "ve_collab")

    return util.get_mongodb()
