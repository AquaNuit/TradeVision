"""Netlify Function: GET /api/market/candles/{symbol}"""
from shared import get_historical_candles, parse_qs, make_response

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})

    qs = parse_qs(event)
    symbol = qs.get("symbol", "")
    exchange = qs.get("exchange", "NSE")
    period = qs.get("period", "6mo")
    interval = qs.get("interval", "1d")

    if not symbol:
        path = event.get("path", "")
        parts = path.rstrip("/").split("/")
        symbol = parts[-1] if parts else ""

    if not symbol:
        return make_response({"error": "Symbol required"}, 400)

    candles = get_historical_candles(symbol.upper(), exchange, period, interval)
    return make_response({"symbol": symbol.upper(), "exchange": exchange, "candles": candles})
