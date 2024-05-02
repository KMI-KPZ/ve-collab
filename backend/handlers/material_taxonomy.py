import json

from resources.material_taxonomy import MaterialTaxonomyResource
from error_reasons import MISSING_KEY_IN_HTTP_BODY_SLUG
from handlers.base_handler import BaseHandler, auth_needed
import util


class MaterialTaxonomyHandler(BaseHandler):
    def get(self):
        with util.get_mongodb() as db:
            taxonomy = db.material_taxonomy.find_one({})
            if taxonomy is None:
                self.set_status(500)
                self.write({"success": False, "reason": "no_taxonomy_found"})
                return

            self.serialize_and_write(
                {"success": True, "taxonomy": taxonomy["taxonomy"]}
            )

    @auth_needed
    def post(self):
        """
        POST /material_taxonomy
            overwrite the existing taxonomy with a new one
            (i.e. an update has to contain the entire hierarchy)

            TODO data has to extended to contain the relevant metadata

            query params:
                None

            http body:
                the body contains the whole taxonomy that should replace
                the old one. it forms a tree structure between nodes using the `id`
                and `parent` fields. the root node has `id` 0 and is implicite,
                meaning no root node is present and regular nodes start with
                `id` 1. the `droppable` field is semantically used to determine whether
                a node should be treated as a leaf or not (if `droppable` is true,
                the node is a leaf, otherwise it is not), meaning that it
                can / should not contain any children.

                {
                    "taxonomy": [
                        {
                            "id": "<integer>",
                            "parent": "<integer>",
                            "droppable": "<boolean>",
                            "text": "<str>",
                            "data": {
                                "url": "<str>"
                            }
                        },
                        {...},
                    ]
                }

            returns:
                200 OK
                (successfully updated taxonomy)
                {"sucess": True}

                400 Bad Request
                (the http body misses a required key)
                {"success": False,
                 "reason": "missing_key_in_http_body:<missing_key>"}

                400 Bad Request
                (atleast one of the nodes in the taxonomy has an invalid structure)
                {"success": False,
                 "reason": "invalid_taxonomy_structure"}

                401 Unauthorized
                (access token is not valid)
                {"success": False,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                (you are not an admin)
                {"success": False,
                 "reason": "insufficient_permission"}
        """

        try:
            http_body = json.loads(self.request.body)
        except json.JSONDecodeError:
            self.set_status(400)
            self.write({"success": False, "reason": "json_parsing_error"})
            return

        if "taxonomy" not in http_body:
            self.set_status(400)
            self.write(
                {
                    "success": False,
                    "reason": MISSING_KEY_IN_HTTP_BODY_SLUG + "taxonomy",
                }
            )
            return

        taxonomy = http_body["taxonomy"]

        # validate structure of each node
        # TODO only if dropppable is false, data has to be present
        for node in taxonomy:
            if not all(key in node for key in ["id", "parent", "droppable", "text"]):
                self.set_status(400)
                self.write(
                    {
                        "success": False,
                        "reason": "invalid_taxonomy_structure",
                    }
                )
                return

        # abort if user is not an admin
        if not self.is_current_user_lionet_admin():
            self.set_status(403)
            self.write(
                {
                    "success": False,
                    "reason": "insufficient_permission",
                }
            )
            return

        # all checks have passed, update taxonomy
        with util.get_mongodb() as db:
            db.material_taxonomy.update_one(
                {}, {"$set": {"taxonomy": taxonomy}}, upsert=True
            )

        self.write({"success": True})


class MBRTestHandler(BaseHandler):

    def get(self):
        with util.get_mongodb() as db:
            tax = MaterialTaxonomyResource(db)
            our_taxonomy = tax.get_our_taxonomy()
            our_taxonomy_material_nodes = tax.get_our_taxonomy_material_nodes()
            access_token = tax.acquire_mein_bildungsraum_access_token()
            source_id = tax.get_mbr_source_id()
            tax.insert_or_update_metadata_to_mbr()
            our_metadata = tax.get_our_metadata_from_mbr()
            self.serialize_and_write(
                {
                    "our_taxonomy": our_taxonomy,
                    "our_taxonomy_material_nodes": our_taxonomy_material_nodes,
                    "access_token": access_token,
                    "source_id": source_id,
                    "our_metadata": our_metadata,
                }
            )

    def post(self):
        pass
