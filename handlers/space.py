from tornado.options import options

from base64 import b64encode
import os
import re

from acl import get_acl
from handlers.base_handler import BaseHandler, auth_needed


class SpaceHandler(BaseHandler):
    """
    handle existing and creation of new spaces
    """

    @auth_needed
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

        if slug == "list":
            result = self.db.spaces.find({})

            spaces = []
            for space in result:
                space['_id'] = str(space['_id'])
                spaces.append(space)

            self.write({"spaces": spaces})

        else:
            self.set_status(404)

    @auth_needed
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
                 "reason": "insufficient_permission"}

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

        POST /spaceadministration/add_admin
            (add given user to space admin list (only space admin or global admin can do that))
            query param:
                "name" : space name of which space to join, mandatory argument
                "user": the username which to add as a space admin, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "reason": "insufficient_permission"}

        POST /spaceadministration/space_picture
            (update space picture)
            query param:
                "name" : space name of which space to update space picture, mandatory argument

            returns:
                200 OK,
                {"status": 200,
                 "success": True}

                400 Bad Request
                {"status": 400,
                 "reason": "space_doesnt_exist"}

                401 Unauthorized
                {"status": 401,
                 "reason": "no_logged_in_user"}

                403 Forbidden
                {"status": 403,
                 "reason": "insufficient_permission"}
        """

        space_name = self.get_argument("name")

        if slug == "create":  # create new space
            # check if the user has permission
            acl = get_acl().global_acl
            if not acl.ask(self.get_current_user_role(), "create_space"):
                self.set_status(403)
                self.write({"status": 403,
                            "reason": "insufficient_permission"})
                return

            members = [self.current_user.username]

            # only create space if no other space with the same name exists
            existing_spaces = []
            for existing_space in self.db.spaces.find(projection={"name": True, "_id": False}):
                existing_spaces.append(existing_space["name"])
            if space_name not in existing_spaces:
                space = {"name": space_name,
                         "members": members,
                         "admins": [self.current_user.username]}
                self.db.spaces.insert_one(space)

                # create default acl entry for all different roles
                acl = get_acl().space_acl
                acl.insert_admin(space_name)
                roles = self.db.roles.distinct("role")
                for role in roles:
                    if role != "admin":
                        acl.insert_default(role, space_name)

                # automatically create a new start page in the wiki for the space
                if not options.no_wiki:
                    #self.wiki.create_page(space_name + ":start", "auto-generated landing page")
                    pass
                self.set_status(200)
                self.write({'status': 200,
                            'success': True})
            else:
                self.set_status(409)
                self.write({"status": 409,
                            "reason": "space_name_already_exists"})

        elif slug == "join":  # add current user to space members
            # ask for permission if the role is allowed to join
            # TODO implement invitation system for the cases where role has no join rights
            acl = get_acl().space_acl
            if not acl.ask(self.get_current_user_role(), space_name, "join_space"):
                self.set_status(403)
                self.write({"status": 403,
                            "reason": "insufficient_permission"})
                return

            self.db.spaces.update_one(
                {"name": space_name},  # filter
                {
                    "$addToSet": {"members": self.current_user.username}
                }
            )

            self.set_status(200)
            self.write({'status': 200,
                        'success': True})

        elif slug == "add_admin":
            username = self.get_argument("user")

            space = self.db.spaces.find_one({"name": space_name})
            if not space:
                self.set_status(400)
                self.write({'status': 400,
                            'reason': "space_doesnt_exist"})
                return

            if (self.current_user.username in space["admins"]) or (self.get_current_user_role() == "admin"):
                # user is either space admin or global admin and therefore is allowed to add space admin
                self.db.spaces.update_one(
                    {"name": space_name},  # filter
                    {
                        "$addToSet": {"admins": username}
                    }
                )

                self.set_status(200)
                self.write({'status': 200,
                            'success': True})
            else:
                self.set_status(403)
                self.write({"status": 403,
                            "reason": "insufficient_permission"})
                return

        elif slug == "space_picture":

            space = self.db.spaces.find_one({"name": space_name})
            if not space:
                self.set_status(400)
                self.write({'status': 400,
                            'reason': "space_doesnt_exist"})
                return

            if "space_pic" in self.request.files:
                print("in file handling")
                space_pic_obj = self.request.files["space_pic"][0]

                # save file
                file_ext = os.path.splitext(space_pic_obj["filename"])[1]
                new_file_name = b64encode(os.urandom(32)).decode("utf-8")
                new_file_name = re.sub('[^0-9a-zäöüßA-ZÄÖÜ]+', '_', new_file_name).lower() + file_ext
                print(new_file_name)

                with open(self.upload_dir + new_file_name, "wb") as fp:
                    fp.write(space_pic_obj["body"])

            if new_file_name:
                self.db.spaces.update_one(
                    {"name": space_name},
                    {"$set":
                        {
                            "space_pic": new_file_name

                        }
                    },
                    upsert=True
                )
            else:
                self.db.spaces.update_one(
                    {"name": space_name},
                    {"$set":
                        {
                            "space_pic": new_file_name

                        }
                    },
                    upsert=True
                )

            self.set_status(200)
            self.write({"status": 200,
                        "success": True})

        else:
            self.set_status(404)

    @auth_needed
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
            self.set_status(404)
