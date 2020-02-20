import tornado.ioloop
import tornado.websocket
import asyncio


class WebsocketHandler(tornado.websocket.WebSocketHandler):

    connections = set()

    def open(self):
        print("client connected")
        self.connections.add(self)

    async def on_message(self, message):
        json_message = tornado.escape.json_decode(message)
        print("got message:")
        print(json_message)

        await asyncio.sleep(3)

        if json_message['type'] == "get_user":
            self.write_message({"type": "get_user_response",
                                "username": "dummy_user123",
                                "email": "dummy@mail.de",
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
