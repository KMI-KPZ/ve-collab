"""
add the `files` attribute (an empty list) to all chat messages that were sent
before files could be sent along with messages, so that every message carries
it (see `resources.network.chat.Chat`). Messages that already have files keep
them.

run once directly after deploying the chat files, inside the backend container:

    docker exec backend python3 -m migrations.chat_message_files

or natively from the backend directory:

    python3 -m migrations.chat_message_files
"""

import logging

from pymongo.database import Database

from migrations import connect

logger = logging.getLogger(__name__)


def migrate(db: Database) -> int:
    """
    run the migration on the given database and return the number of
    migrated chatrooms. Idempotent, a second run migrates nothing.
    """

    result = db.chatrooms.update_many(
        {"messages": {"$elemMatch": {"files": {"$exists": False}}}},
        {"$set": {"messages.$[message].files": []}},
        array_filters=[{"message.files": {"$exists": False}}],
    )

    return result.modified_count


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    with connect() as db:
        migrated = migrate(db)
    logger.info("added the files attribute to the messages of %d chatrooms", migrated)
