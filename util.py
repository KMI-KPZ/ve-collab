from socket_client import get_socket_instance


async def request_role(username):
    client = await get_socket_instance()
    result = await client.write({"type": "check_permission",
                                 "username": username})

    return result["role"]


async def is_admin(username):
    return (await request_role(username) == "admin")
