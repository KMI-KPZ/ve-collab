"""
move the mime type of all gridfs files from the legacy top-level `contentType`
field into `metadata.content_type`.

PyMongo 4 deprecates (and PyMongo 5 removes) the `content_type` properties of
gridfs files, so new files keep their mime type in the metadata (see
`util.gridfs_put()`). Reading falls back to the legacy field
(`util.gridfs_content_type()`), so this migration is not urgent, but it has to
run before upgrading to PyMongo 5. Files that already carry a mime type in their
metadata keep it.

run inside the backend container:

    docker exec backend python3 -m migrations.gridfs_content_type

or natively from the backend directory:

    python3 -m migrations.gridfs_content_type
"""

import logging

from pymongo.database import Database

from migrations import connect
import util

logger = logging.getLogger(__name__)


def migrate(db: Database) -> int:
    """
    run the migration on the given database and return the number of
    migrated files. Idempotent, a second run migrates nothing.
    """

    result = db.fs.files.update_many(
        {"contentType": {"$exists": True}},
        [
            # make sure metadata is a document before writing into it
            {
                "$set": {
                    "metadata": {
                        "$cond": [
                            {"$eq": [{"$type": "$metadata"}, "object"]},
                            "$metadata",
                            {},
                        ]
                    }
                }
            },
            {
                "$set": {
                    "metadata.{}".format(util.GRIDFS_CONTENT_TYPE_KEY): {
                        "$ifNull": [
                            "$metadata.{}".format(util.GRIDFS_CONTENT_TYPE_KEY),
                            "$contentType",
                        ]
                    }
                }
            },
            {"$unset": "contentType"},
        ],
    )

    return result.modified_count


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    with connect() as db:
        migrated = migrate(db)
    logger.info("moved the mime type of %d gridfs files into their metadata", migrated)
