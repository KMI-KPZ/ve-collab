"""
bring the comments of all posts into their current shape (see
`resources.network.post.Posts`):

- comments are written in the same rich text editor as posts, so their text is
  HTML now. Older comments are plain text, so their text gets HTML escaped
  (line breaks become `<br>`), which renders exactly the same text as before
- comments can be liked, so every comment gets an empty `likers` list

A comment that already has `likers` is considered migrated (comments written
after the deployment are created with it, and their text is HTML already), so
the migration is idempotent.

run once inside the backend container:

    docker exec backend python3 -m migrations.post_comments

or natively from the backend directory:

    python3 -m migrations.post_comments
"""

import html
import logging

from pymongo import UpdateOne
from pymongo.database import Database

from migrations import connect

logger = logging.getLogger(__name__)

BATCH_SIZE = 500


def plain_text_to_html(text: str) -> str:
    """
    escape the plain `text` of a legacy comment, so that rendering it as HTML
    shows exactly the same text as before
    """

    return html.escape(text, quote=False).replace("\r\n", "\n").replace("\n", "<br>")


def migrate(db: Database) -> int:
    """
    run the migration on the given database and return the number of
    migrated comments. Idempotent, a second run migrates nothing.
    """

    migrated = 0
    operations = []

    for post in db.posts.find(
        {"comments": {"$elemMatch": {"likers": {"$exists": False}}}},
        projection={
            "comments._id": True,
            "comments.text": True,
            "comments.likers": True,
        },
    ):
        for comment in post["comments"]:
            if "likers" in comment:
                continue

            # the array filter only matches unmigrated comments, so a comment
            # is never escaped twice, even if the post shows up again
            operations.append(
                UpdateOne(
                    {"_id": post["_id"]},
                    {
                        "$set": {
                            "comments.$[comment].text": plain_text_to_html(
                                comment["text"]
                            ),
                            "comments.$[comment].likers": [],
                        }
                    },
                    array_filters=[
                        {
                            "comment._id": comment["_id"],
                            "comment.likers": {"$exists": False},
                        }
                    ],
                )
            )

        if len(operations) >= BATCH_SIZE:
            migrated += db.posts.bulk_write(operations, ordered=False).modified_count
            operations = []

    if operations:
        migrated += db.posts.bulk_write(operations, ordered=False).modified_count

    return migrated


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    with connect() as db:
        migrated = migrate(db)
    logger.info("migrated %d comments (HTML text, likers)", migrated)
