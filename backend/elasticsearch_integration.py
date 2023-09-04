from bson import ObjectId
import requests

import global_vars


class ElasticsearchConnector:
    """
    Replicator from MongoDB to Elasticsearch to enable better
    full-text and fuzzy search than the native MongoDB text search.
    """

    def __init__(self):
        pass

    def on_insert(self, _id: str | ObjectId, document: dict, collection: str) -> None:
        """
        Replicate a new document to Elasticsearch.
        `_id` is the MongoDB ObjectId of the `document`, which in turn is the corresponding
        MongoDB record that should be replicated.
        `collection` is the same collection that the `document` is stored in inside MongoDB.
        """

        if isinstance(_id, ObjectId):
            _id = str(_id)

        requests.put(
            "{}/{}/_doc/{}".format(global_vars.elasticsearch_base_url, collection, _id),
            json=document,
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )

    def on_update(
        self,
        _id: str | ObjectId,
        collection: str,
        update_doc: dict,
    ) -> None:
        """
        Replicate the update of a document to Elasticsearch.
        `_id` is the MongoDB ObjectId of the `update_doc`, which in turn is the corresponding
        updated MongoDB record that should be replicated.
        `collection` is the same collection that the `document` is stored in inside MongoDB.
        """

        # fully override doc by putting a new document with the same id
        self.on_insert(_id, update_doc, collection)

    def on_delete(self, _id: str | ObjectId, collection: str) -> None:
        """
        Delete the document from Elasticsearch.
        `_id` is the MongoDB ObjectId of the document that should be deleted.
        `collection` is the same collection that the document is stored in inside MongoDB.
        """

        if isinstance(_id, ObjectId):
            _id = str(_id)

        requests.delete(
            "{}/{}/_doc/{}".format(global_vars.elasticsearch_base_url, collection, _id),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )
