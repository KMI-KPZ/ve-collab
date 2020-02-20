import tornado
from tornado.ioloop import IOLoop, PeriodicCallback
from tornado import gen
from tornado.websocket import websocket_connect
from asyncio import Future, get_event_loop


class Client(object):
    def __init__(self, url, timeout):
        self.url = url
        self.timeout = timeout
        self.ioloop = IOLoop.current()
        self.future = None  # TODO make this a dict of futures, on each write call create a new one, put in in dict with resolve id, when message from server: resolve the future with the fitting id
        self.ws = None
        self.connect()  # TODO somehow we need to await before __init__ can return, otherwise quick calls to write() after initializing the object will fail because connection is not established yet
        # PeriodicCallback(self.keep_alive, 20000).start()

    @gen.coroutine
    def connect(self):
        print("trying to connect")
        self.ws = yield websocket_connect(self.url)
        print("connected")
        self.run()

    @gen.coroutine
    def run(self):
        while True:
            msg = yield self.ws.read_message()
            if msg is None:
                print("connection closed")
                self.ws = None
                break
            else:
                self.on_message(msg)

    def on_message(self, msg):
        json_message = tornado.escape.json_decode(msg)
        if json_message['resolve_id'] == 1:
            self.future.set_result(json_message)

    def write(self, message):
        message['resolve_id'] = 1
        self.ws.write_message(tornado.escape.json_encode(message))

        loop = get_event_loop()
        self.future = loop.create_future()

        return self.future

    def keep_alive(self):
        if self.ws is None:
            self.connect()
        else:
            self.ws.write_message("keep alive")
