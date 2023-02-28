import json
import requests
from typing import Dict, List

import global_vars

class Wordpress:

    def __init__(self):
        self.wordpress_url = global_vars.wordpress_url

    def get_wordpress_posts(self) -> List[Dict]:
        """
        get all wordpress posts
        """
        try:
            wp_response = requests.get(self.wordpress_url + "/wp-json/wp/v2/posts/")
        except Exception:
            # re-raise any exception that requests threw
            raise
        return json.loads(wp_response.content)

    def get_wordpress_post(self, post_id: str) -> Dict:
        """
        get a single wordpress post by specifying its id
        """

        try:
            wp_response = requests.get(global_vars.wordpress_url + "/wp-json/wp/v2/posts/{}".format(str(post_id)))
        except Exception:
            # re-raise any exception that requests threw
            raise

        wp_post = json.loads(wp_response.content)

        if "code" in wp_post:
            raise ValueError("Wordpress API returned Error: {}".format(wp_post["code"]))

        return wp_post
