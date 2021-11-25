from handlers.base_handler import BaseHandler


class SpaceHandler(BaseHandler):
    """
    handle existing and creation of new spaces
    """

    def get(self, slug):
        """
        GET /spaceadministration/list
        return:
            200 OK,
            {"spaces": [space1, space2,...]}

            401 Unauthorized
            {"status": 401,
             "reason": "no_logged_in_user"}
        """

        if self.current_user:
            if slug == "list":
                result = self.db.spaces.find({})

                spaces = []
                for space in result:
                    space['_id'] = str(space['_id'])
                    spaces.append(space)

                self.write({"spaces": spaces})
        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

    def post(self, slug):
        """
        POST /spaceadministration/create
            query param:
                "name" : space name to create, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                409 Conflict
                {"status": 409,
                 "reason": "space_name_already_exists"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

        POST /spaceadministration/join
            (currently authed user joins space)
            query param:
                "name" : space name of which space to join, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            space_name = self.get_argument("name")

            if slug == "create":  # create new space
                members = [self.current_user.username]

                # only create space if no other space with the same name exists
                existing_spaces = []
                for existing_space in self.db.spaces.find(projection={"name": True, "_id": False}):
                    existing_spaces.append(existing_space["name"])
                if space_name not in existing_spaces:
                    space = {"name": space_name,
                             "members": members}
                    self.db.spaces.insert_one(space)

                    # automatically create a new start page in the wiki for the space
                    self.wiki.create_page(space_name + ":start", "auto-generated landing page")

                    self.set_status(200)
                    self.write({'status': 200,
                                'success': True})
                else:
                    self.set_status(409)
                    self.write({"status": 409,
                                "reason": "space_name_already_exists"})

            elif slug == "join":  # add current user to space members
                self.db.spaces.update_one(
                    {"name": space_name},  # filter
                    {
                        "$addToSet": {"members": self.current_user.username}
                    }
                )

                self.set_status(200)
                self.write({'status': 200,
                            'success': True})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})

    def delete(self, slug):
        """
        DELETE /spaceadministration/leave
            (currently authed user leaves space)
            query param:
                "name" : space name to leave from, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

        DELETE /spaceadministration/delete_space
            (space will be deleted)
            query param:
                "name" : space name of which space to delete, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}
        """

        if self.current_user:
            space_name = self.get_argument("name")

            if slug == "leave":
                # TODO when group admin is implemented: block leaving if user is the only admin, he has to transfer this role first before being able to leave
                self.db.spaces.update_one(
                    {"name": space_name},
                    {
                        "$pull": {"members": self.current_user.username}
                    }
                )
                self.set_status(200)
                self.write({'status': 200,
                            'success': True})

            elif slug == "delete_space":
                self.db.spaces.delete_one({"name": space_name})

                self.set_status(200)
                self.write({'status': 200,
                            'success': True})

        else:
            self.set_status(401)
            self.write({"status": 401,
                        "reason": "no_logged_in_user"})
