import mock_platform


async def request_role(username):
    return mock_platform.check_permission(username)


async def is_admin(username):
    return await request_role(username) == "admin"


async def is_platform_admin(username):
    return await request_role(username) == "admin"
