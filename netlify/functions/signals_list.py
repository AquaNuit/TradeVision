"""Netlify Function: GET /api/signals/"""
from shared import get_stocks_parallel, score_stock, parse_qs, make_response, NSE_STOCKS, BSE_STOCKS

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})

    qs = parse_qs(event)
    exchange = qs.get("exchange", "all")
    action = qs.get("action", "all")

    # Parallel fetch — critical for Netlify's 26s timeout
    all_stocks = []
    if exchange in ("all", "NSE"):
        all_stocks.extend(get_stocks_parallel(NSE_STOCKS, "NSE", max_workers=10))
    if exchange in ("all", "BSE"):
        all_stocks.extend(get_stocks_parallel(BSE_STOCKS, "BSE", max_workers=10))

    # Only keep stocks with indicator data
    all_stocks = [s for s in all_stocks if "indicators" in s]

    signals = []
    for stock in all_stocks:
        sc = score_stock(stock)
        if sc["action"] != "WAIT" or action == "all":
            signals.append({**stock, "signal": sc})

    if action in ("BUY", "SELL"):
        signals = [s for s in signals if s["signal"]["action"] == action]

    signals.sort(key=lambda x: x["signal"]["tradeScore"], reverse=True)
    return make_response({
        "count": len(signals),
        "buyCount": sum(1 for s in signals if s["signal"]["action"] == "BUY"),
        "sellCount": sum(1 for s in signals if s["signal"]["action"] == "SELL"),
        "signals": signals[:20],
    })
