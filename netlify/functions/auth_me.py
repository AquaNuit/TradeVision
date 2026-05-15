"""Netlify Function: GET /api/auth/me"""
from shared import make_response, ADMIN_USERNAME, ADMIN_EMAIL

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})
    # In serverless mode, return admin info if any token is present
    headers = event.get("headers") or {}
    auth = headers.get("authorization", headers.get("Authorization", ""))
    if not auth:
        return make_response({"detail": "Not authenticated"}, 401)
    return make_response({
        "username": ADMIN_USERNAME,
        "email": ADMIN_EMAIL,
        "full_name": "Admin",
        "role": "admin",
    })
