"""Netlify Function: GET /api/signals/{symbol}"""
from shared import get_stock_data, score_stock, parse_qs, make_response

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})

    qs = parse_qs(event)
    symbol = qs.get("symbol", "")
    exchange = qs.get("exchange", "NSE")

    if not symbol:
        path = event.get("path", "")
        parts = path.rstrip("/").split("/")
        symbol = parts[-1] if parts else ""

    if not symbol:
        return make_response({"error": "Symbol required"}, 400)

    stock = get_stock_data(symbol.upper(), exchange)
    if stock.get("price", 0) == 0:
        return make_response({"error": f"Could not fetch data for {symbol}", "symbol": symbol})

    sc = score_stock(stock)
    return make_response({**stock, "signal": sc})
