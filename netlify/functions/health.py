"""Netlify Function: GET /api/health"""
from shared import make_response

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})
    return make_response({
        "status": "ok",
        "version": "1.0.0",
        "auth": "JWT (serverless)",
        "docs": "N/A (serverless deployment)",
        "platform": "netlify",
    })
