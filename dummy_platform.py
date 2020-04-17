import sys
import asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import tornado.ioloop
import tornado.websocket


dummy_users = {
    "test_user1": {
        "user_id": 1,
        "username": "test_user1",
        "email": "test_user1@mail.com"
    },
    "test_user2": {
        "user_id": 2,
        "username": "test_user2",
        "email": "test_user2@mail.com"
    },
    "test_user3": {
        "user_id": 3,
        "username": "test_user3",
        "email": "test_user3@mail.com"
    }
}


class WebsocketHandler(tornado.websocket.WebSocketHandler):

    connections = set()

    def open(self):
        print("client connected")
        self.connections.add(self)

    async def on_message(self, message):
        json_message = tornado.escape.json_decode(message)
        print("got message:")
        print(json_message)

        if json_message['type'] == "get_user":
            username = json_message['username']
            global dummy_users
            if username in dummy_users:
                self.write_message({"type": "get_user_response",
                                    "user": dummy_users[username],
                                    "resolve_id": json_message['resolve_id']})

        elif json_message['type'] == "get_user_list":
            self.write_message({"type": "get_user_list_response",
                                "users": dummy_users,
                                "resolve_id": json_message['resolve_id']})

        elif json_message['type'] == "check_permission":  # dummy platform always returns admin permissions
            self.write_message({"type": "check_permission_response",
                                "username": json_message["username"],
                                "role": "admin",
                                "resolve_id": json_message['resolve_id']})

    def on_close(self):
        self.connections.remove(self)


def make_app():
    return tornado.web.Application([
        (r"/websocket", WebsocketHandler)
    ])


async def main():
    app = make_app()
    server = tornado.httpserver.HTTPServer(app)
    server.listen(88810)

    shutdown_event = tornado.locks.Event()
    await shutdown_event.wait()

if __name__ == '__main__':
    tornado.ioloop.IOLoop.current().run_sync(main)
