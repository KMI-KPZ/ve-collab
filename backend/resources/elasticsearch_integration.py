from typing import Optional
from bson import ObjectId
import json
import requests

from tornado.options import options

import global_vars
import util


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
        # for the recursion base case: str remains as str
        if isinstance(doc, str):
            result_str = doc
        # ObjectIds also get returned as str representation
        elif isinstance(doc, ObjectId):
            result_str = str(doc)
        # ints and floats get returned as str representation
        elif isinstance(doc, int):
            result_str = str(doc)
        elif isinstance(doc, float):
            result_str = str(doc)
        # lists get flattened, if values are str, they remain str,
        # dicts or nested lists get flattened recursively
        elif isinstance(doc, list):
            for elem in doc:
                result_str = " ".join(
                    [result_str, self._dict_or_list_values_to_str(elem)]
                )
        # dicts get flattened, i.e. only values of base entries are kept and
        # concatenated into the single string, keys are lost.
        # if dict values are lists or nested dicts, the are flattened recursively
        elif isinstance(doc, dict):
            for value in doc.values():
                result_str = " ".join(
                    [result_str, self._dict_or_list_values_to_str(value)]
                )
        # last fallback, any object gets flattened according to its __dict__
        elif isinstance(doc, object):
            result_str = " ".join(
                [result_str, self._dict_or_list_values_to_str(doc.__dict__)]
            )

        return result_str.strip()

    def on_insert(self, _id: str | ObjectId, document: dict, collection: str) -> None:
        """
        Replicate a new document to Elasticsearch.
        `_id` is the MongoDB ObjectId of the `document`, which in turn is the corresponding
        MongoDB record that should be replicated.
        `collection` is the same collection that the `document` is stored in inside MongoDB.
        """

        # catch test mode
        if options.test_admin or options.test_user:
            collection = "test"

        if isinstance(_id, ObjectId):
            _id = str(_id)

        # flatten all nested attributes into a single string
        for key, value in document.items():
            if isinstance(value, (dict, list)):
                document[key] = self._dict_or_list_values_to_str(value)

        # elasticsearch has pain with meta fields being inside documents
        if "_id" in document:
            del document["_id"]

        # apparently elasticsearch also has pain with empty date fields...
        if "birthday" in document:
            del document["birthday"]

        try:
            requests.put(
                "{}/{}/_doc/{}".format(
                    global_vars.elasticsearch_base_url, collection, _id
                ),
                json=util.json_serialize_response(document),
                auth=(
                    global_vars.elasticsearch_username,
                    global_vars.elasticsearch_password,
                ),
            )
        except Exception as e:
            print(e)

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

        # catch test mode
        if options.test_admin or options.test_user:
            collection = "test"

        if isinstance(_id, ObjectId):
            _id = str(_id)

        requests.delete(
            "{}/{}/_doc/{}".format(global_vars.elasticsearch_base_url, collection, _id),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
        )

    def search_profile_match(
        self,
        profile: dict,
        query_expertise: Optional[str],
        query_lang: Optional[str],
        size: Optional[int] = 10,
        offset: Optional[int] = 0
    ) -> list[dict]:
        """
        Search for a matching partner to `profile` in Elasticsearch.

        `profile` is a dictionary containing the profile information of the user

        `query_expertise` set must query of expertises
        `query_lang` set must query of languages
        `size` is the number of results to return, default 10
        `offset` is the number of results to skip (used for pagination), default 0
        """

        if size is None:
            size = 10
        if offset is None:
            offset = 0

        # TODO assert expected keys in profile

        # flatten all nested attributes into a single string to
        # match documents in Elasticsearch, effectively resulting
        # in an OR match on all strings in the specified fields
        # between the supplied profile and the documents in Elasticsearch
        for key, value in profile.items():
            if isinstance(value, (dict, list)):
                profile[key] = self._dict_or_list_values_to_str(value)

        should_query = [
            {
                "match": {
                    "bio": {"query": profile["bio"], "fuzziness": "AUTO"},
                }
            },
            {
                "match": {
                    "experience": {
                        "query": profile["experience"],
                        "fuzziness": "AUTO",
                    },
                }
            },
            {
                "match": {
                    "expertise": {
                        "query": profile["expertise"],
                        "fuzziness": "AUTO",
                        "boost": 1.5,
                    },
                }
            },
            {
                "match": {
                    "languages": {
                        "query": profile["languages"],
                        "fuzziness": "AUTO",
                    },
                }
            },
            {
                "match": {
                    "ve_interests": {
                        "query": profile["ve_interests"],
                        "fuzziness": "AUTO",
                        "boost": 2,
                    },
                }
            },
            {
                "match": {
                    "ve_goals": {
                        "query": profile["ve_goals"],
                        "fuzziness": "AUTO",
                        "boost": 2,
                    },
                }
            },
            {
                "match": {
                    "preferred_format": {
                        "query": profile["preferred_format"],
                        "fuzziness": "AUTO",
                    },
                }
            },
            {
                "match": {
                    "research_tags": {
                        "query": profile["research_tags"],
                        "fuzziness": "AUTO",
                    },
                }
            },
            {
                "match": {
                    "courses": {
                        "query": json.dumps(profile["courses"]),
                        "fuzziness": "AUTO",
                    },
                }
            },
        ]

        must_query = []

        if query_expertise and query_expertise != "":
            must_query.append({
                "match": {
                    "expertise": {
                        "query": query_expertise,
                        "fuzziness": "AUTO"
                    }
                }
            })

        if query_lang and query_lang != "":
            must_query.append({
                "match": {
                    "languages": {
                        "query": query_lang,
                        "fuzziness": "AUTO"
                    }
                }
            })

        if not must_query:
            must_query = []

        query = {
            "from": offset,
            "size": size,
            "query": {
                "bool": {
                    # exclude the user itself from the search results
                    "must_not": [
                        {"match": {"username": profile["username"]}}
                    ],
                    "filter": [
                        {"match": {"excluded_from_matching": False}},
                    ],
                    "must": must_query,
                    "should": should_query,
                    "minimum_should_match": 0
                }
            },
        }

        response = requests.post(
            "{}/{}/_search?".format(global_vars.elasticsearch_base_url, "profiles"),
            auth=(
                global_vars.elasticsearch_username,
                global_vars.elasticsearch_password,
            ),
            json=query,
        )

        # import pprint
        # pprint.pprint(response.json())
        # print(len(response.json()["hits"]["hits"]))

        return response.json()["hits"]["hits"]
