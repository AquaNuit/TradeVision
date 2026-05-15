"""Netlify Function: POST /api/auth/refresh"""
from shared import create_access_token, make_response, ADMIN_USERNAME, ADMIN_EMAIL

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})

    # In serverless mode, if any Authorization header is present, issue a new token
    headers = event.get("headers") or {}
    auth = headers.get("authorization", headers.get("Authorization", ""))
    if not auth:
        return make_response({"detail": "Not authenticated. Login first."}, 401)

    token = create_access_token({"sub": ADMIN_USERNAME, "role": "admin"})
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
