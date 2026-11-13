"""
sanitize the HTML of all stored posts, reposts and comments with
`util.sanitize_html()`, just like new and edited texts are sanitized before
they are stored:

- the `text` of all posts (a repost carries a copy of its original post's text)
- the `repostText` of all reposts
- the `text` of all comments that are HTML already. Comments without `likers`
  are legacy plain text that `migrations.post_comments` HTML escapes, so they
  are skipped here; both migrations can run in any order

Only texts that change are written, and only if they didn't change in the
meantime, so concurrent edits are never overwritten.

run once inside the backend container:

    docker exec backend python3 -m migrations.sanitize_post_texts

or natively from the backend directory:

    python3 -m migrations.sanitize_post_texts
"""

import logging

from pymongo import UpdateOne
from pymongo.database import Database

from migrations import connect
import util

logger = logging.getLogger(__name__)

BATCH_SIZE = 500


def migrate(db: Database) -> int:
    """
    run the migration on the given database and return the number of
    sanitized texts. Idempotent, a second run sanitizes nothing.
    """

    sanitized = 0
    operations = []

    for post in db.posts.find(
        {},
        projection={
            "text": True,
            "repostText": True,
            "comments._id": True,
            "comments.text": True,
            "comments.likers": True,
        },
    ):
        for field in ("text", "repostText"):
            value = post.get(field)
            if not isinstance(value, str):
                continue

            clean = util.sanitize_html(value)
            if clean != value:
                operations.append(
                    UpdateOne(
                        {"_id": post["_id"], field: value},
                        {"$set": {field: clean}},
                    )
                )

        for comment in post.get("comments", []):
            # legacy plain text, see above
            if "likers" not in comment:
                continue

            clean = util.sanitize_html(comment["text"])
            if clean != comment["text"]:
                operations.append(
                    UpdateOne(
                        {"_id": post["_id"]},
                        {"$set": {"comments.$[comment].text": clean}},
                        array_filters=[
                            {
                                "comment._id": comment["_id"],
                                "comment.text": comment["text"],
                            }
                        ],
                    )
                )

        if len(operations) >= BATCH_SIZE:
            sanitized += db.posts.bulk_write(operations, ordered=False).modified_count
            operations = []

    if operations:
        sanitized += db.posts.bulk_write(operations, ordered=False).modified_count

    return sanitized


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    with connect() as db:
        sanitized = migrate(db)
    logger.info("sanitized %d texts of posts, reposts and comments", sanitized)
