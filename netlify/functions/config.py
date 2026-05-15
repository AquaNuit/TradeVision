"""Netlify Function: GET /api/config"""
from shared import make_response

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})
    return make_response({
        "app_name": "TradeVision Pro",
        "version": "1.0.0",
        "auth_enabled": True,
        "token_expiry_minutes": 1440,
        "telegram_configured": False,
        "email_configured": False,
        "alpha_vantage_configured": False,
        "platform": "netlify",
    })
