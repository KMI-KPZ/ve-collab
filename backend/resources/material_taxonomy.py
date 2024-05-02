import requests
import logging

from pymongo.database import Database

from exceptions import (
    MbrAPIBadRequestError,
    MbrAPIConflictError,
    MbrAPIForbiddenError,
    MbrAPINotFoundError,
    MbrAPIUnauthorizedError,
)
import global_vars

logger = logging.getLogger(__name__)


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

    def get_our_taxonomy(self):
        """
        Get the material taxonomy from our database.
        """

        return self.db.material_taxonomy.find_one({})["taxonomy"]

    def get_our_taxonomy_material_nodes(self):
        """
        Get the material nodes of our material taxonomy from our database.
        """

        tax = self.db.material_taxonomy.find_one({})["taxonomy"]
        return [node for node in tax if not node["droppable"]]

    def append_mbr_id_to_material_node(self, mbr_id, node_id):
        """
        Append the Mein Bildungsraum id of a material node to the node data in our taxonomy.
        """

        self.db.material_taxonomy.update_one(
            {"taxonomy.id": node_id},
            {"$set": {"taxonomy.$.data.mbr_id": mbr_id}},
        )

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
            raise MbrAPIUnauthorizedError("Unauthorized", res.text)
        elif res.status_code == 404:
            raise MbrAPINotFoundError("Not found", res.text)

    def create_amb_payload(self, node, source_id: str = None):
        """
        Create an AMB-compatible payload for the given material node of our own taxonomy.
        Optionally, provide the Mein Bildungsraum sourceId to lower request load.
        """

        if not source_id:
            source_id = self.get_mbr_source_id()

        # for now return non-amb payload,
        # TODO implement AMB standard
        payload = {
            "title": node["text"],
            "description": "Lorem Ipsum test",
            "sourceId": source_id,
            "externalId": str(node["id"]),
        }

        return payload

    def sync_metadata_to_mbr(self):
        """
        Insert or update the metadata of our material taxonomy into Mein Bildungsraum.

        """

        if not self.access_token:
            self.acquire_mein_bildungsraum_access_token()
        source_id = self.get_mbr_source_id()

        our_material_nodes = self.get_our_taxonomy_material_nodes()

        for node in our_material_nodes:
            if "data" in node and "mbr_id" in node["data"]:
                # update an existing Mein Bildungsraum node
                self._mbr_update_request(node, source_id)
                logger.info("Updated node {} in Mein Bildungsraum".format(node["text"]))
            else:
                # create a new Mein Bildungsraum node
                # and sync the mbr_id back to our taxonomy
                mbr_id = self._mbr_insert_request(node, source_id)
                self.append_mbr_id_to_material_node(mbr_id, node["id"])
                logger.info(
                    "Inserted node {} into Mein Bildungsraum".format(node["text"])
                )

    def _mbr_update_request(self, node, source_id):
        """
        update request for a material node in Mein Bildungsraum.
        """

        res = requests.put(
            global_vars.mbr_metadata_base_endpoint
            + "/api/core/nodes/"
            + node["data"]["mbr_id"],
            headers={"Authorization": "Bearer " + self.access_token["access_token"]},
            json=self.create_amb_payload(node, source_id),
        )

        # error handling
        if res.status_code == 400:
            raise MbrAPIBadRequestError("Bad request", res.text)
        elif res.status_code == 403:
            raise MbrAPIForbiddenError("Forbidden", res.text)
        elif res.status_code == 404:
            raise MbrAPINotFoundError("Not found", res.text)

    def _mbr_insert_request(self, node, source_id):
        """
        insert request for a material node in Mein Bildungsraum.
        Returns the Mein Bildungsraum id of the created node.
        """

        # create a new Mein Bildungsraum node
        res = requests.post(
            global_vars.mbr_metadata_base_endpoint + "/api/core/nodes",
            headers={"Authorization": "Bearer " + self.access_token["access_token"]},
            json=self.create_amb_payload(node, source_id),
        )

        if res.status_code == 201:
            # return the MBR id of the created node as the last part of the Location header URL
            # e.g. https://some.url.org/api/core/nodes/5f7b7b7b7b7b7b7b7b7b7b7b
            # -> 5f7b7b7b7b7b7b7b7b7b7b7b
            location_header = res.headers["Location"]
            mbr_id = location_header.split("/")[-1]
            return mbr_id
        elif res.status_code == 400:
            raise MbrAPIBadRequestError("Bad request", res.text)
        elif res.status_code == 401:
            raise MbrAPIUnauthorizedError("Unauthorized", res.text)
        elif res.status_code == 403:
            raise MbrAPIForbiddenError("Forbidden", res.text)
        elif res.status_code == 409:
            raise MbrAPIConflictError("Conflict", res.text)

    def get_our_metadata_from_mbr(self):
        """
        Get the metadata of our material taxonomy from Mein Bildungsraum.
        """

        if not self.access_token:
            self.acquire_mein_bildungsraum_access_token()

        source_id = self.get_mbr_source_id()

        res = requests.get(
            global_vars.mbr_metadata_base_endpoint + "/api/core/nodes",
            headers={"Authorization": "Bearer " + self.access_token["access_token"]},
            params={"sourceId": source_id},
        )

        if res.status_code == 200:
            return res.json()
        elif res.status_code == 401:
            raise MbrAPIUnauthorizedError("Unauthorized", res.text)
