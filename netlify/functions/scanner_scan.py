"""Netlify Function: GET /api/scanner/scan"""
from shared import get_stocks_parallel, score_stock, parse_qs, make_response, NSE_STOCKS, BSE_STOCKS

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})

    qs = parse_qs(event)
    exchange = qs.get("exchange", "NSE")
    rsi_min = float(qs["rsi_min"]) if qs.get("rsi_min") else None
    rsi_max = float(qs["rsi_max"]) if qs.get("rsi_max") else None
    macd = qs.get("macd")
    volume = qs.get("volume")
    supertrend = qs.get("supertrend")

    universe = BSE_STOCKS if exchange == "BSE" else NSE_STOCKS
    ex = exchange if exchange in ("NSE", "BSE") else "NSE"

    # Parallel fetch — critical for Netlify's 26s timeout
    stocks = get_stocks_parallel(universe, ex, max_workers=10)

    # Only keep stocks that have indicator data
    stocks = [s for s in stocks if "indicators" in s]

    # Apply filters
    filtered = []
    for stock in stocks:
        ind = stock["indicators"]
        if rsi_min is not None and ind["rsi"] < rsi_min:
            continue
        if rsi_max is not None and ind["rsi"] > rsi_max:
            continue
        if macd == "bullish" and ind["macd"]["histogram"] <= 0:
            continue
        if macd == "bearish" and ind["macd"]["histogram"] >= 0:
            continue
        if volume == "above_avg" and ind["volumeRatio"] < 1.2:
            continue
        if volume == "spike" and ind["volumeRatio"] < 2.0:
            continue
        if supertrend and ind["supertrend"] != supertrend:
            continue
        filtered.append(stock)

    results = []
    for stock in filtered:
        sc = score_stock(stock)
        results.append({**stock, "aiScore": sc})

    results.sort(key=lambda x: x["aiScore"]["tradeScore"], reverse=True)
    return make_response({"count": len(results), "results": results})
