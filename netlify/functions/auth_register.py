"""Netlify Function: POST /api/auth/register — disabled on serverless (no persistent storage)"""
from shared import make_response

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})
    return make_response({
        "detail": "Registration is disabled on the cloud deployment. Use the default admin account or run locally for full registration support."
    }, 403)
