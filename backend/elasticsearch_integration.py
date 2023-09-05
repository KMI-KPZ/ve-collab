from bson import ObjectId
import json
import requests

import global_vars


class ElasticsearchConnector:
    """
    Replicator from MongoDB to Elasticsearch to enable better
    full-text and fuzzy search than the native MongoDB text search.
    """

    def __init__(self):
        pass

    def _dict_or_list_values_to_str(self, doc: dict | list) -> str:
        """
        concatenates all values of a dict or list into a single string,
        if the values are lists or dicts, they are flattened and only
        the values are appended (dict keys are lost).

        Any combination of nested dicts and lists is supported, e.g.:
        ["a", "b", {"c": "d", "e": "f"}, ["g", "h", {"i": "j"}]]
        will be transformed into:
        "a b d f g h j"

        This function is used as a helper to flatten out nested objects before
        they are inserted into the elasticsearch index, because that way the
        search algorithms only deal with text, which they are optimized for.
        """

        result_str = ""
        if isinstance(doc, str):
            result_str = doc
        if isinstance(doc, list):
            for elem in doc:
                result_str = " ".join(
                    [result_str, self._dict_or_list_values_to_str(elem)]
                )
        if isinstance(doc, dict):
            for value in doc.values():
                if isinstance(value, list):
                    for elem in value:
                        if isinstance(elem, dict):
                            result_str = " ".join(
                                [result_str, self._dict_or_list_values_to_str(elem)]
                            )
                        elif isinstance(elem, str):
                            result_str = " ".join([result_str, str(elem)])
                        elif isinstance(elem, object):
                            result_str = " ".join(
                                [
                                    result_str,
                                    self._dict_or_list_values_to_str(elem.__dict__),
                                ]
                            )
                elif isinstance(value, dict):
                    result_str = " ".join(
                        [result_str, self._dict_or_list_values_to_str(value)]
                    )
                elif isinstance(value, str):
                    result_str = " ".join([result_str, str(value)])
                elif isinstance(value, object):
                    result_str = " ".join(
                        [result_str, self._dict_or_list_values_to_str(value.__dict__)]
                    )

        return result_str.strip()

    def on_insert(self, _id: str | ObjectId, document: dict, collection: str) -> None:
        """
        Replicate a new document to Elasticsearch.
        `_id` is the MongoDB ObjectId of the `document`, which in turn is the corresponding
        MongoDB record that should be replicated.
        `collection` is the same collection that the `document` is stored in inside MongoDB.
        """

        if isinstance(_id, ObjectId):
            _id = str(_id)

        # flatten all nested attributes into a single string
        for key, value in document.items():
            if isinstance(value, (dict, list)):
                document[key] = self._dict_or_list_values_to_str(value)
        print(document)

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

    def search_profile_match(self, profile: dict) -> list[dict]:
        """
        Search for a matching partner to `profile` in Elasticsearch.
        """

        # TODO assert expected keys in profile

        # flatten all nested attributes into a single string to
        # match documents in Elasticsearch, effectively resulting
        # in an OR match on all strings in the specified fields
        # between the supplied profile and the documents in Elasticsearch
        for key, value in profile.items():
            if isinstance(value, (dict, list)):
                profile[key] = self._dict_or_list_values_to_str(value)

        query = {
            "query": {
                "bool": {
                    # exclude the user itself from the search results
                    "must_not": [
                        {"match": {"username": {"query": profile["username"]}}},
                    ],
                    "should": [
                        {
                            "match": {
                                "bio": {"query": profile["bio"]},
                            }
                        },
                        {
                            "match": {
                                "experience": {"query": profile["experience"]},
                            }
                        },
                        {
                            "match": {
                                "expertise": {"query": profile["expertise"]},
                            }
                        },
                        {
                            "match": {
                                "languages": {"query": profile["languages"]},
                            }
                        },
                        {
                            "match": {
                                "ve_interests": {"query": profile["ve_interests"]},
                            }
                        },
                        {
                            "match": {
                                "ve_goals": {"query": profile["ve_goals"]},
                            }
                        },
                        {
                            "match": {
                                "preferred_formats": {
                                    "query": profile["preferred_formats"]
                                },
                            }
                        },
                        {
                            "match": {
                                "research_tags": {"query": profile["research_tags"]},
                            }
                        },
                        {
                            "match": {
                                "courses": {"query": json.dumps(profile["courses"])},
                            }
                        },
                    ],
                }
            }
        }

        response = requests.post(
            "{}/{}/_search?".format(global_vars.elasticsearch_base_url, "profiles"),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
            json=query,
        )

        import pprint

        pprint.pprint(response.json())

        return response.json()["hits"]["hits"]

