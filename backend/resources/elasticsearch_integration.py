from concurrent.futures import ThreadPoolExecutor
import logging
import threading
import time
from typing import Callable, Dict, Iterable, List, Optional, Tuple
from bson import ObjectId
import json
import requests

from tornado.options import options

import global_vars
import util

logger = logging.getLogger(__name__)

# (connect, read) timeouts, kept short because searches are sent from the event loop,
# which would be blocked by a hanging elasticsearch for that long
ELASTICSEARCH_TIMEOUT_SECONDS = (3, 5)
# rebuilding an index sends many documents at once, which may take longer
ELASTICSEARCH_BULK_TIMEOUT_SECONDS = (3, 60)

# lists of exact-match values (usernames) that are kept as arrays instead of being
# flattened into a single string, so that each entry can be matched on its own
KEYWORD_LIST_FIELDS = ("read_access", "write_access")

# bump this version whenever the index definitions below change, indexes with an
# older version are then rebuilt from MongoDB on the next startup
INDEX_DEFINITIONS_VERSION = 1

_INDEX_SETTINGS = {
    # there is only a single node, so replicas could never be assigned anyway
    "number_of_replicas": 0,
    # changes only have to show up in search results within half a minute,
    # which saves a lot of refreshes while plans are being edited
    "refresh_interval": "30s",
}

# only the searched fields are indexed ("dynamic": False), the remaining fields are
# still stored in the _source of the documents, but cost no indexing work
INDEX_DEFINITIONS = {
    "profiles": {
        "settings": _INDEX_SETTINGS,
        "mappings": {
            "_meta": {"version": INDEX_DEFINITIONS_VERSION},
            "dynamic": False,
            "properties": {
                "username": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword"}},
                },
                "first_name": {"type": "text"},
                "last_name": {"type": "text"},
                "bio": {"type": "text"},
                "experience": {"type": "text"},
                "expertise": {"type": "text"},
                "languages": {"type": "text"},
                "ve_interests": {"type": "text"},
                "ve_goals": {"type": "text"},
                "preferred_format": {"type": "text"},
                "research_tags": {"type": "text"},
                "courses": {"type": "text"},
                "excluded_from_matching": {"type": "boolean"},
            },
        },
    },
    "spaces": {
        "settings": _INDEX_SETTINGS,
        "mappings": {
            "_meta": {"version": INDEX_DEFINITIONS_VERSION},
            "dynamic": False,
            "properties": {
                "name": {"type": "text"},
                "space_description": {"type": "text"},
            },
        },
    },
    "plans": {
        "settings": _INDEX_SETTINGS,
        "mappings": {
            "_meta": {"version": INDEX_DEFINITIONS_VERSION},
            "dynamic": False,
            "properties": {
                "name": {"type": "text"},
                "topics": {"type": "text"},
                "abstract": {"type": "text"},
                # usernames have to match exactly, otherwise e.g. "max-mustermann"
                # would also match "max-musterfrau" in the access filter
                "author": {"type": "keyword"},
                "read_access": {"type": "keyword"},
                "write_access": {"type": "keyword"},
                "is_good_practise": {"type": "boolean"},
            },
        },
    },
}

# writes (inserts, updates, deletes) are sent from a single background thread, so that
# they don't block the event loop, while still being applied in their original order
_write_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="elasticsearch")

# every thread (event loop and write thread) keeps its own session to reuse connections
_thread_local = threading.local()


def _request(method: str, path: str, **kwargs) -> requests.Response:
    """
    send a request to elasticsearch, `path` being relative to its base url,
    reusing the open connections of the current thread
    """

    if not hasattr(_thread_local, "session"):
        _thread_local.session = requests.Session()

    kwargs.setdefault("timeout", ELASTICSEARCH_TIMEOUT_SECONDS)
    return _thread_local.session.request(
        method,
        "{}/{}".format(global_vars.elasticsearch_base_url, path),
        auth=(
            global_vars.elasticsearch_username,
            global_vars.elasticsearch_password,
        ),
        **kwargs,
    )


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

    def _prepare_document(self, document: dict) -> dict:
        """
        transform the MongoDB `document` (in place) into the form that is stored
        in Elasticsearch and return it.
        """

        # flatten all nested attributes into a single string
        for key, value in document.items():
            if key in KEYWORD_LIST_FIELDS:
                continue
            if isinstance(value, (dict, list)):
                document[key] = self._dict_or_list_values_to_str(value)

        # elasticsearch has pain with meta fields being inside documents
        if "_id" in document:
            del document["_id"]

        # apparently elasticsearch also has pain with empty date fields...
        if "birthday" in document:
            del document["birthday"]

        return util.json_serialize_response(document)

    def _replicate(self, method: str, path: str, body: Optional[str] = None) -> None:
        """
        send a write request to Elasticsearch from the background write thread,
        so that the event loop doesn't have to wait for it. Failures are only logged,
        since MongoDB stays the source of truth.

        In test mode, the request is sent right away instead, because the tests
        check the replicated documents immediately.
        """

        def send():
            try:
                response = _request(
                    method,
                    path,
                    data=body,
                    headers={"Content-Type": "application/json"},
                )
                # deleting a document that was never replicated is no error
                if response.status_code >= 400 and not (
                    method == "DELETE" and response.status_code == 404
                ):
                    logger.warning(
                        "elasticsearch rejected {} {}: {}".format(
                            method, path, response.text
                        )
                    )
            except Exception as e:
                logger.warning(
                    "could not replicate {} {} to elasticsearch: {}".format(
                        method, path, e
                    )
                )

        if options.test_admin or options.test_user:
            send()
        else:
            _write_executor.submit(send)

    def on_insert(self, _id: str | ObjectId, document: dict, collection: str) -> None:
        """
        Replicate a new document to Elasticsearch.
        `_id` is the MongoDB ObjectId of the `document`, which in turn is the corresponding
        MongoDB record that should be replicated.
        `collection` is the same collection that the `document` is stored in inside MongoDB.

        The document is sent in the background, so it might not be searchable right away.
        """

        # catch test mode
        if options.test_admin or options.test_user:
            collection = "test"

        if isinstance(_id, ObjectId):
            _id = str(_id)

        # serialize right away, because the caller might keep modifying the
        # document while it is waiting to be sent
        try:
            body = json.dumps(self._prepare_document(document))
        except Exception as e:
            logger.warning(
                "could not serialize document {} for elasticsearch: {}".format(_id, e)
            )
            return

        self._replicate("PUT", "{}/_doc/{}".format(collection, _id), body)

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

        self._replicate("DELETE", "{}/_doc/{}".format(collection, _id))

    def search(self, collection: str, query: dict) -> List[Dict]:
        """
        Run the search `query` against the index of `collection` and return the hits.
        """

        response = _request("POST", "{}/_search".format(collection), json=query)
        return response.json()["hits"]["hits"]

    def ensure_indexes(
        self,
        document_loaders: Dict[str, Callable[[], Iterable[Tuple[ObjectId, dict]]]],
        force_rebuild: bool = False,
    ) -> None:
        """
        Make sure that all indexes in `INDEX_DEFINITIONS` exist with their current
        definition. Indexes that are missing or outdated (or all of them, if
        `force_rebuild` is True) are (re)created and filled with the (_id, document)
        pairs that the loader of the index in `document_loaders` returns.

        This runs in the background write thread, waiting for Elasticsearch to become
        available, so it doesn't delay the startup and writes that are queued in the
        meantime are only sent once the indexes are ready.
        """

        _write_executor.submit(self._ensure_indexes, document_loaders, force_rebuild)

    def _ensure_indexes(
        self,
        document_loaders: Dict[str, Callable[[], Iterable[Tuple[ObjectId, dict]]]],
        force_rebuild: bool,
    ) -> None:
        if not self._wait_until_available():
            logger.error(
                "elasticsearch is not reachable, skipped checking its indexes"
            )
            return

        for index, definition in INDEX_DEFINITIONS.items():
            try:
                version = self._get_index_version(index)
                if force_rebuild or version != INDEX_DEFINITIONS_VERSION:
                    self._rebuild_index(index, definition, document_loaders[index]())
            except Exception:
                logger.exception(
                    "could not set up elasticsearch index {}".format(index)
                )

    def _wait_until_available(self, attempts: int = 60, delay: int = 5) -> bool:
        """
        wait until Elasticsearch responds (e.g. after both were started together),
        trying `attempts` times with `delay` seconds in between.
        Returns True if it became available, False otherwise.
        """

        for _ in range(attempts):
            # stop waiting if the application is shutting down in the meantime
            if not threading.main_thread().is_alive():
                return False

            try:
                response = _request("GET", "_cluster/health")
                if response.status_code == 200 and response.json()["status"] in (
                    "green",
                    "yellow",
                ):
                    return True
            except Exception:
                pass
            time.sleep(delay)

        return False

    def _get_index_version(self, index: str) -> Optional[int]:
        """
        Returns the `INDEX_DEFINITIONS_VERSION` that the index was created with,
        or None if the index doesn't exist or was not created from a definition.
        """

        response = _request("GET", "{}/_mapping".format(index))
        if response.status_code == 404:
            return None
        response.raise_for_status()

        return response.json()[index]["mappings"].get("_meta", {}).get("version")

    def _rebuild_index(
        self, index: str, definition: dict, documents: Iterable[Tuple[ObjectId, dict]]
    ) -> None:
        """
        drop the index, create it again from its `definition` and fill it with
        the given (_id, document) pairs.
        """

        logger.info("rebuilding elasticsearch index {}".format(index))

        _request("DELETE", "{}?ignore_unavailable=true".format(index))
        _request("PUT", index, json=definition).raise_for_status()

        lines = []
        document_count = 0
        for _id, document in documents:
            # a single document that cannot be transformed must not stop the rebuild
            try:
                document_line = json.dumps(self._prepare_document(document))
            except Exception as e:
                logger.warning(
                    "skipped document {} for elasticsearch index {}: {}".format(
                        _id, index, e
                    )
                )
                continue

            lines.append(json.dumps({"index": {"_id": str(_id)}}))
            lines.append(document_line)
            document_count += 1

            # send in chunks of 500 documents
            if len(lines) >= 1000:
                self._send_bulk(index, lines)
                lines = []
        if lines:
            self._send_bulk(index, lines)

        # make the documents searchable right away instead of after the refresh interval
        _request("POST", "{}/_refresh".format(index))

        logger.info(
            "rebuilt elasticsearch index {} with {} documents".format(
                index, document_count
            )
        )

    def _send_bulk(self, index: str, lines: List[str]) -> None:
        """
        index all documents in `lines` (pairs of action and document lines
        in the format of the bulk api) in a single request.
        """

        response = _request(
            "POST",
            "{}/_bulk".format(index),
            data="\n".join(lines) + "\n",
            headers={"Content-Type": "application/x-ndjson"},
            timeout=ELASTICSEARCH_BULK_TIMEOUT_SECONDS,
        )
        response.raise_for_status()

        if response.json()["errors"]:
            failed = [
                item["index"]
                for item in response.json()["items"]
                if "error" in item["index"]
            ]
            logger.warning(
                "{} documents could not be added to elasticsearch index {}, first error: {}".format(
                    len(failed), index, failed[0]["error"]
                )
            )

    def search_profile_match(
        self,
        profile: dict,
        query_expertise: Optional[str],
        query_lang: Optional[str],
        size: Optional[int] = 10,
        offset: Optional[int] = 0,
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
            must_query.append({"match_phrase": {"expertise": query_expertise}})

        if query_lang and query_lang != "":
            must_query.append(
                {"match": {"languages": {"query": query_lang, "fuzziness": "AUTO"}}}
            )

        if not must_query:
            must_query = []

        query = {
            "from": offset,
            "size": size,
            "query": {
                "bool": {
                    # exclude the user itself from the search results
                    "must_not": [
                        {"term": {"username.keyword": profile["username"]}}
                    ],
                    "filter": [
                        {"match": {"excluded_from_matching": False}},
                    ],
                    "must": must_query,
                    "should": should_query,
                    "minimum_should_match": 0,
                }
            },
        }

        return self.search("profiles", query)
