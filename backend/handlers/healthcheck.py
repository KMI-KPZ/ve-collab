import tornado.web


class HealthCheckHandler(tornado.web.RequestHandler):
    """
    can be used as a health check to determine if the platform is running
    """

    def get(self):
        """
        GET /health
        """

        self.set_status(200)
        self.write({"status": 200, "success": True})
