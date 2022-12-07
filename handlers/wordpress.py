import json
import requests

import global_vars
from handlers.base_handler import auth_needed, BaseHandler


class WordpressCollectionHandler(BaseHandler):
    @auth_needed
    def get(self):
        """
        GET /wordpress/posts
        """

        wp_response = requests.get(global_vars.wordpress_url + "/wp-json/wp/v2/posts/")
        wp_posts = json.loads(wp_response.content)

        self.write({"success": True, "wordpress_posts": wp_posts})


class WordpressPostHandler(BaseHandler):
    @auth_needed
    def get(self, post_id):
        """
        GET /wordpress/posts/<id>
        """
        wp_response = requests.get(global_vars.wordpress_url + "/wp-json/wp/v2/posts/{}".format(str(post_id)))
        wp_post = json.loads(wp_response.content)

        if "code" in wp_post:
            self.set_status(404)
            self.write({"success": False, "reason": wp_post["code"]})
            return

        self.write({"success": True, "wp_post": wp_post})
