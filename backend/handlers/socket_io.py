import global_vars

@global_vars.socket_io.event
async def connect(sid, environment, auth):
    print("connected")
    print(sid)
    print(environment)
    print(auth)


@global_vars.socket_io.event
async def disconnect(sid):
    session = await global_vars.socket_io.get_session(sid)
    print(session)
    print("disconnect ", sid)


@global_vars.socket_io.event
async def authenticate(sid, data):
    print(sid)
    print(data)
    await global_vars.socket_io.save_session(sid, {"token": data})

@global_vars.socket_io.event
async def bla(sid, data):
    token = await global_vars.socket_io.get_session(sid)
    print(token)
    print("BLABLABLABALAALBALBALBABL")