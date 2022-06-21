from bson.objectid import ObjectId
import dateutil
import tornado.escape

from handlers.base_handler import BaseHandler, auth_needed

class TaskHandler(BaseHandler):

    @auth_needed
    def get(self):
        """
        GET /tasks
            returns:
                200 OK
                {"tasks": [{task1}, {task2}, ...]}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        task_cursor = self.db.tasks.find({})

        tasks = []
        for task in task_cursor:
            task["_id"] = str(task["_id"])
            if task["deadline"] is not None:
                task["deadline"] = task["deadline"].isoformat()
            tasks.append(task)

        self.set_status(200)
        self.write({"tasks": tasks})

    @auth_needed
    def post(self):
        """
        POST /tasks
            add a new task or update existing one

            http_body:
            {
                "task_id" : <string>,                       # optional, if set, updates the existing task, if not set creates one
                "headline": <string>,
                "text": <string>,
                "status": <"todo"/"doing"/"done">,
                "assigned": [<string1>, <string2>, ...],    # optional
                "deadline": <iso8601 string>,               # optional
            }

            returns:
                200 OK
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "missing_key_in_http_body"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        http_body = tornado.escape.json_decode(self.request.body)

        # parse values or set defaults
        if "deadline" in http_body:  # parse time string into datetime object
            http_body["deadline"] = dateutil.parser.parse(http_body["deadline"])
        else:
            http_body["deadline"] = None

        if "assigned" not in http_body:
            http_body["assigned"] = []

        if "task_id" in http_body:
            http_body["task_id"] = ObjectId(http_body["task_id"])
        else:
            http_body["task_id"] = ObjectId()

        if all(key in http_body for key in ("task_id", "headline", "text", "deadline", "status", "assigned")):
            self.db.tasks.update_one(
                {"_id": http_body["task_id"]},
                {"$set":
                    {
                        "headline": http_body["headline"],
                        "text": http_body["text"],
                        "deadline": http_body["deadline"],
                        "status": http_body["status"],
                        "assigned": http_body["assigned"]
                    },
                "$setOnInsert":
                    {
                        "creator": self.current_user.username
                    }
                },
                upsert=True
            )

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})
        else:
            self.set_status(400)
            self.write({"status": 400,
                        "reason": "missing_key_in_http_body"})
