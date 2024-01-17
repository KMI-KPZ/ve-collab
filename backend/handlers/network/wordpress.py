from handlers.base_handler import auth_needed, BaseHandler
from resources.network.wordpress import Wordpress


class WordpressCollectionHandler(BaseHandler):
    @auth_needed
    def get(self):
        """
        GET /wordpress/posts
        """

        # wp_posts = Wordpress().get_wordpress_posts()

        # self.write(
        #    self.json_serialize_response({"success": True, "wordpress_posts": wp_posts})
        # )
        self.write(
            self.json_serialize_response({"success": True, "wordpress_posts": []})
        )


class WordpressPostHandler(BaseHandler):
    @auth_needed
    def get(self, post_id):
        """
        GET /wordpress/posts/<id>
        """

        # try:
        #    wp_post = Wordpress().get_wordpress_post(post_id)
        # except ValueError as e:
        #    self.set_status(404)
        #    self.write({"success": False, "reason": str(e)})
        #    return

        # self.write(self.json_serialize_response({"success": True, "wp_post": wp_post}))
        self.write(self.json_serialize_response({"success": True, "wp_post": {}}))
