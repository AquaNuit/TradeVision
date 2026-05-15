"""Netlify Function: GET /api/auth/token-info"""
from shared import make_response

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})
    return make_response({
        "auth_type": "JWT (JSON Web Token)",
        "storage": "Serverless (admin-only on cloud)",
        "token_expiry_minutes": 1440,
        "default_credentials": {"username": "admin", "password": "tradevision2026 (change in .env)"},
        "endpoints": {
            "login": "POST /api/auth/login",
            "register": "POST /api/auth/register (local only)",
            "me": "GET /api/auth/me",
        },
    })
