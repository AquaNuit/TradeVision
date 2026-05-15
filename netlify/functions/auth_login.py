"""Netlify Function: POST /api/auth/login"""
from shared import (
    authenticate_user, create_access_token, make_response,
    decode_body, parse_form_body, parse_json_body,
    ADMIN_USERNAME, ADMIN_EMAIL
)

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})

    try:
        # The frontend sends application/x-www-form-urlencoded
        # Netlify may base64-encode the body — decode_body handles both cases
        body_str = decode_body(event)

        username = ""
        password = ""

        if not body_str:
            return make_response({"detail": "Missing credentials"}, 400)

        # Try form-urlencoded first (this is what the frontend sends)
        if "username=" in body_str or "password=" in body_str:
            params = parse_form_body(event)
            username = params.get("username", "")
            password = params.get("password", "")
        else:
            # Fallback: try JSON
            data = parse_json_body(event)
            username = data.get("username", "")
            password = data.get("password", "")

        if not username or not password:
            return make_response({"detail": "Username and password required"}, 400)

        if not authenticate_user(username, password):
            return make_response({"detail": "Incorrect username or password"}, 401)

        token = create_access_token({"sub": username, "role": "admin"})
        return make_response({
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 86400,
            "user": {
                "username": ADMIN_USERNAME,
                "email": ADMIN_EMAIL,
                "full_name": "Admin",
                "role": "admin",
            },
        })
    except Exception as e:
        return make_response({"detail": f"Login error: {str(e)}"}, 500)
