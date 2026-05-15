"""Netlify Function: GET /api/market/stock/{symbol}"""
from shared import get_stock_data, parse_qs, make_response

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})

    qs = parse_qs(event)
    # Symbol comes from the redirect splat or query param
    symbol = qs.get("symbol", "")
    exchange = qs.get("exchange", "NSE")

    if not symbol:
        # Try path
        path = event.get("path", "")
        parts = path.rstrip("/").split("/")
        symbol = parts[-1] if parts else ""

    if not symbol:
        return make_response({"error": "Symbol required"}, 400)

    return make_response(get_stock_data(symbol.upper(), exchange))
