"""Netlify Function: GET /api/market/movers"""
from shared import get_stocks_parallel, parse_qs, make_response, NSE_STOCKS, BSE_STOCKS

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})

    qs = parse_qs(event)
    exchange = qs.get("exchange", "NSE")
    limit = int(qs.get("limit", "10"))

    universe = BSE_STOCKS if exchange == "BSE" else NSE_STOCKS
    ex = exchange if exchange in ("NSE", "BSE") else "NSE"

    # Parallel fetch — critical for Netlify's 26s timeout
    stocks = get_stocks_parallel(universe, ex, max_workers=10)

    stocks_sorted = sorted(stocks, key=lambda x: x.get("changePercent", 0), reverse=True)
    return make_response({
        "gainers": stocks_sorted[:limit],
        "losers": stocks_sorted[-limit:][::-1],
    })
