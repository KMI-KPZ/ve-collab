from error_reasons import USER_NOT_ADMIN
from import_personas import (
    aggregate_persona_profile,
    ensure_persona_profle_exists,
    parse_personas,
)
from handlers.base_handler import BaseHandler


class ImportDummyPersonasHandler(BaseHandler):

    def get(self):
        # quick and dirty protection against unauthorized access,
        # TODO only for development, restrict to admin users via frontend
        # proxy to the request with access_token
        passcode = self.get_argument("passcode", None)
        if passcode != "aQuhoih230!.asd": 
            self.set_status(403)
            self.write({"success": False, "reason": USER_NOT_ADMIN})
            return
        
        personas = parse_personas()

        for persona in personas:
            ensure_persona_profle_exists(persona)
            aggregate_persona_profile(persona)

        self.write({"success": True})
