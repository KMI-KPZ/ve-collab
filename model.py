class User:
    def __init__(self, username, user_id, email):
        self.username = username
        self.user_id = user_id
        self.email = email

    def to_dict(self) -> dict:
        return {"username": self.username, "user_id": self.user_id, "email": self.email}
