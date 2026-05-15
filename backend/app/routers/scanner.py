"""
TradeVision Pro — Scanner API Router
Uses LIVE data from Yahoo Finance.
"""
from typing import Optional
from fastapi import APIRouter, Query
from app.services.market_data import get_stock_data
from app.services.ai_scorer import AIScorer

router = APIRouter()

NSE_STOCKS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR",
    "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK",
    "BAJFINANCE", "MARUTI", "TATAMOTORS", "SUNPHARMA", "TITAN",
    "WIPRO", "HCLTECH", "ADANIENT",
]
BSE_STOCKS = [
    "BSE", "CDSL", "ANGELONE", "MCX", "IEX", "CAMS", "UTIAMC", "NAM-INDIA", "HDFCAMC", "ABSLAMC"
]

@router.get("/scan")
async def scan_stocks(
    exchange: str = "NSE",
    rsi_min: Optional[float] = Query(None),
    rsi_max: Optional[float] = Query(None),
    macd: Optional[str] = Query(None),
    volume: Optional[str] = Query(None),
    supertrend: Optional[str] = Query(None),
    preset: Optional[str] = Query(None),
):
    """Run scanner with LIVE technical filters."""
    universe = BSE_STOCKS if exchange == "BSE" else NSE_STOCKS
    ex = exchange if exchange in ("NSE", "BSE") else "NSE"

    stocks = []
    for sym in universe:
        data = get_stock_data(sym, ex)
        if data.get("price", 0) > 0 and "indicators" in data:
            stocks.append(data)

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

    # Add AI scores
    results = []
    for stock in filtered:
        score = AIScorer.score_stock(stock)
        results.append({**stock, "aiScore": score})

    results.sort(key=lambda x: x["aiScore"]["tradeScore"], reverse=True)
    return {"count": len(results), "results": results}
