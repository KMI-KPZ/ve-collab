"""
move the files of the legacy flat file repository of spaces (the embedded
`files` array of each space) into the hierarchical file share (`space_files`
collection, see `resources.network.space_files.SpaceFiles`):

- manually uploaded files become regular files in the root folder
- the attachments of the space's posts (except reposts, which only reference
  the files of their original post) are mirrored into the post files folder,
  linked to their post, just like new posts do it
- legacy post file entries whose post doesn't exist anymore become regular
  files in the root folder, so that they can still be managed (or deleted)
- afterwards the `files` array is removed from the space

The gridfs files themselves are not touched, only referenced. Names that
already exist in a folder get a numeric suffix. The migration is idempotent:
files that are already part of the file share are skipped, and a space whose
`files` array is gone is considered done, so an interrupted run can simply be
started again.

run once after deploying the file share, inside the backend container:

    docker exec backend python3 -m migrations.space_files

or natively from the backend directory:

    python3 -m migrations.space_files
"""

import logging
from typing import Dict

import gridfs
from pymongo.database import Database

from exceptions import FileAlreadyInRepoError, FileDoesntExistError
from migrations import connect
from resources.network.space_files import SpaceFiles
import util

logger = logging.getLogger(__name__)


def migrate(db: Database) -> Dict[str, int]:
    """
    run the migration on the given database and return how many files were
    imported (`imported`), mirrored as post files (`post_files`) or skipped
    because they are missing in gridfs (`missing`), and how many spaces were
    migrated (`spaces`)
    """

    space_files = SpaceFiles(db)
    fs = gridfs.GridFS(db)
    stats = {"spaces": 0, "imported": 0, "post_files": 0, "missing": 0}

    for space in db.spaces.find(
        {"files": {"$exists": True}}, projection={"files": True}
    ):
        space_id = space["_id"]

        # attachments of the space's posts, the posts collection is the source
        # of truth for them (including the post they belong to)
        post_file_ids = set()
        for post in db.posts.find(
            {"space": space_id, "files.0": {"$exists": True}, "isRepost": {"$ne": True}},
            projection={"author": True, "files": True},
        ):
            for file_obj in post["files"]:
                file_id = util.parse_object_id(file_obj["file_id"])
                post_file_ids.add(file_id)
                try:
                    space_files.add_post_file(
                        space_id,
                        file_obj.get("author") or post["author"],
                        file_id,
                        file_obj.get("file_name") or str(file_id),
                        post["_id"],
                    )
                    stats["post_files"] += 1
                except FileAlreadyInRepoError:
                    pass
                except FileDoesntExistError:
                    stats["missing"] += 1
                    logger.warning(
                        "file %s of post %s is missing in gridfs, skipped",
                        file_id,
                        post["_id"],
                    )

        # manually uploaded files (and post files without a post anymore)
        for legacy_file in space.get("files") or []:
            file_id = util.parse_object_id(legacy_file["file_id"])
            if file_id in post_file_ids:
                continue
            if not fs.exists(file_id):
                stats["missing"] += 1
                logger.warning(
                    "file %s of space %s is missing in gridfs, skipped",
                    file_id,
                    space_id,
                )
                continue
            try:
                space_files.import_file(
                    space_id,
                    legacy_file.get("author") or "system",
                    file_id,
                    legacy_file.get("file_name") or str(file_id),
                )
                stats["imported"] += 1
            except FileAlreadyInRepoError:
                pass

        db.spaces.update_one({"_id": space_id}, {"$unset": {"files": ""}})
        stats["spaces"] += 1

    return stats


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    with connect() as db:
        # make sure the unique name index exists, even if the backend wasn't
        # started with the file share yet
        SpaceFiles.create_indexes(db)
        stats = migrate(db)
    logger.info(
        "migrated %d spaces: %d files imported into the root folders, "
        "%d post files mirrored, %d files missing in gridfs",
        stats["spaces"],
        stats["imported"],
        stats["post_files"],
        stats["missing"],
    )
