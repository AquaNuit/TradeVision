"""
TradeVision Pro — Signals API Router
AI signals generated from LIVE market data.
"""
from fastapi import APIRouter
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

@router.get("/")
async def get_signals(exchange: str = "all", action: str = "all"):
    """Get AI-generated trade signals from LIVE data."""
    all_stocks = []
    if exchange in ("all", "NSE"):
        for sym in NSE_STOCKS:
            data = get_stock_data(sym, "NSE")
            if data.get("price", 0) > 0 and "indicators" in data:
                all_stocks.append(data)
    if exchange in ("all", "BSE"):
        for sym in BSE_STOCKS:
            data = get_stock_data(sym, "BSE")
            if data.get("price", 0) > 0 and "indicators" in data:
                all_stocks.append(data)

    signals = []
    for stock in all_stocks:
        score = AIScorer.score_stock(stock)
        if score["action"] != "WAIT" or action == "all":
            signals.append({**stock, "signal": score})

    if action in ("BUY", "SELL"):
        signals = [s for s in signals if s["signal"]["action"] == action]

    signals.sort(key=lambda x: x["signal"]["tradeScore"], reverse=True)
    return {
        "count": len(signals),
        "buyCount": sum(1 for s in signals if s["signal"]["action"] == "BUY"),
        "sellCount": sum(1 for s in signals if s["signal"]["action"] == "SELL"),
        "signals": signals[:20],
    }


@router.get("/{symbol}")
async def get_signal_detail(symbol: str, exchange: str = "NSE"):
    """Get detailed AI signal for a specific stock using LIVE data."""
    stock = get_stock_data(symbol.upper(), exchange)
    if stock.get("price", 0) == 0:
        return {"error": f"Could not fetch data for {symbol}", "symbol": symbol}
    score = AIScorer.score_stock(stock)
    return {**stock, "signal": score}
