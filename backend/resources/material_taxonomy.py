import requests

from pymongo.database import Database
from datetime import datetime

import global_vars


class MaterialTaxonomyResource:
    """
    to use this class, acquire a mongodb connection first via::

        with util.get_mongodb() as db:
            tax = MaterialTaxonomyResource(db)
            ...

    """

    def __init__(self, db: Database):
        """
        Initialize this class by passing a mongo `Database` object
        that holds an open connection.

        Obtain a connection e.g. via::

            with util.get_mongodb() as db:
                tax = MaterialTaxonomyResource(db)
                ...
        """

        self.db = db

        self.access_token = None

    def acquire_mein_bildungsraum_access_token(self):
        """
        Acquire an access token for the MeinBildungsraum metadata API.
        """

        res = requests.post(
            global_vars.mbr_token_endpoint,
            auth=(global_vars.mbr_client_id, global_vars.mbr_client_secret),
            data={"grant_type": "client_credentials"},
        )

        try:
            self.access_token = res.json()
        except requests.exceptions.JSONDecodeError:
            self.access_token = None
            raise

        return self.access_token

    def get_mbr_source_id(self):
        """
        get the source id of our metadata source in Mein Bildungsraum
        to be able to upload and modify new metadata
        """

        if not self.access_token:
            self.acquire_mein_bildungsraum_access_token()

        res = requests.get(
            global_vars.mbr_metadata_base_endpoint
            + "/api/core/sources/slug/"
            + global_vars.mbr_metadata_source_slug,
            headers={"Authorization": "Bearer " + self.access_token["access_token"]},
        )

        if res.status_code == 200:
            return res.json()["id"]
        elif res.status_code == 401:
            raise Exception("Unauthorized")  # TODO custom exceptions
        elif res.status_code == 404:
            raise Exception("Not found")
