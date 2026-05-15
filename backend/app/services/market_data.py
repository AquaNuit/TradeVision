"""
TradeVision Pro — Live Market Data Service
Fetches REAL stock data from Yahoo Finance via yfinance.
Includes in-memory caching to avoid rate limits.
"""
import time
import math
import traceback
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import yfinance as yf

# ── In-memory cache ──
_cache = {}
_CACHE_TTL = 60  # seconds — stock data cached for 60s


def _get_cached(key: str):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < _CACHE_TTL:
            return data
    return None


def _set_cached(key: str, data):
    _cache[key] = (data, time.time())


# ── Symbol Mapping ──
def _resolve_symbol(symbol: str, exchange: str) -> str:
    """Convert our symbol format to Yahoo Finance format."""
    symbol = symbol.upper().strip()
    if exchange in ("NSE", "BSE"):
        suffix = ".NS" if exchange == "NSE" else ".BO"
        if not symbol.endswith((".NS", ".BO")):
            return f"{symbol}{suffix}"
    elif exchange == "CRYPTO":
        if not symbol.endswith("-USD"):
            return f"{symbol}-USD"
    elif exchange == "FOREX":
        if not symbol.endswith("=X"):
            return f"{symbol}=X"
    return symbol


# ── Technical Indicator Calculations ──
def _calc_rsi(prices, period=14):
    if len(prices) < period + 1:
        return 50.0
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.mean(gains[-period:])
    avg_loss = np.mean(losses[-period:])
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - 100 / (1 + rs), 2)


def _calc_ema(prices, period):
    if len(prices) < period:
        return round(float(prices[-1]), 2) if len(prices) > 0 else 0
    k = 2 / (period + 1)
    ema = float(np.mean(prices[:period]))
    for p in prices[period:]:
        ema = float(p) * k + ema * (1 - k)
    return round(ema, 2)


def _calc_macd(prices):
    if len(prices) < 26:
        return {"value": 0, "signal": 0, "histogram": 0}
    ema12 = _calc_ema(prices, 12)
    ema26 = _calc_ema(prices, 26)
    macd_val = round(ema12 - ema26, 3)
    signal = round(macd_val * 0.8, 3)  # Simplified signal approximation
    return {"value": macd_val, "signal": signal, "histogram": round(macd_val - signal, 3)}


def _calc_bollinger(prices, period=20):
    if len(prices) < period:
        mid = float(prices[-1]) if len(prices) > 0 else 0
        return {"upper": round(mid * 1.02, 2), "middle": round(mid, 2), "lower": round(mid * 0.98, 2)}
    recent = prices[-period:]
    mid = float(np.mean(recent))
    std = float(np.std(recent))
    return {
        "upper": round(mid + 2 * std, 2),
        "middle": round(mid, 2),
        "lower": round(mid - 2 * std, 2),
    }


def _calc_atr(highs, lows, closes, period=14):
    if len(highs) < period + 1:
        return round(float(highs[-1] - lows[-1]) if len(highs) > 0 else 0, 2)
    trs = []
    for i in range(1, len(highs)):
        tr = max(
            float(highs[i] - lows[i]),
            abs(float(highs[i] - closes[i - 1])),
            abs(float(lows[i] - closes[i - 1])),
        )
        trs.append(tr)
    return round(float(np.mean(trs[-period:])), 2)


# ── Main Data Fetch ──
def get_stock_data(symbol: str, exchange: str = "NSE") -> dict:
    """Fetch real stock data with technical indicators."""
    cache_key = f"{symbol}:{exchange}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    yf_symbol = _resolve_symbol(symbol, exchange)

    try:
        ticker = yf.Ticker(yf_symbol)

        # Get historical data (60 days for indicator calculations)
        hist = ticker.history(period="3mo", interval="1d")
        if hist.empty:
            raise ValueError(f"No data for {yf_symbol}")

        # Current price data from latest row
        latest = hist.iloc[-1]
        prev = hist.iloc[-2] if len(hist) > 1 else latest

        price = round(float(latest["Close"]), 2)
        prev_close = round(float(prev["Close"]), 2)
        change = round(price - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close != 0 else 0
        volume = int(latest["Volume"])
        avg_vol = int(hist["Volume"].tail(20).mean()) if len(hist) >= 20 else volume

        closes = hist["Close"].values.astype(float)
        highs = hist["High"].values.astype(float)
        lows = hist["Low"].values.astype(float)

        # Calculate indicators
        rsi = _calc_rsi(closes)
        macd = _calc_macd(closes)
        ema20 = _calc_ema(closes, 20)
        ema50 = _calc_ema(closes, 50)
        ema200 = _calc_ema(closes, 200) if len(closes) >= 200 else _calc_ema(closes, min(len(closes), 50))
        bb = _calc_bollinger(closes)
        atr = _calc_atr(highs, lows, closes)
        vwap = round(float(np.sum(closes[-20:] * hist["Volume"].values[-20:].astype(float)) / max(np.sum(hist["Volume"].values[-20:].astype(float)), 1)), 2) if len(closes) >= 20 else price
        vol_ratio = round(volume / max(avg_vol, 1), 2)

        # Supertrend approximation
        supertrend = "UP" if price > ema20 and macd["histogram"] > 0 else "DOWN"

        # Currency
        if exchange in ("NSE", "BSE"):
            currency = "₹"
        elif exchange == "CRYPTO":
            currency = "$"
        elif exchange == "FOREX":
            currency = ""
        else:
            currency = "$"

        # Try to get market cap
        try:
            info = ticker.fast_info
            market_cap = int(getattr(info, "market_cap", 0) or 0)
            pe = round(float(getattr(info, "pe_ratio", 0) or 0), 1)
        except Exception:
            market_cap = 0
            pe = 0

        result = {
            "symbol": symbol.upper(),
            "exchange": exchange,
            "currency": currency,
            "price": price,
            "open": round(float(latest["Open"]), 2),
            "high": round(float(latest["High"]), 2),
            "low": round(float(latest["Low"]), 2),
            "prevClose": prev_close,
            "change": change,
            "changePercent": change_pct,
            "volume": volume,
            "avgVolume": avg_vol,
            "marketCap": market_cap,
            "pe": pe,
            "indicators": {
                "rsi": rsi,
                "macd": macd,
                "ema": {"ema20": ema20, "ema50": ema50, "ema200": ema200},
                "vwap": vwap,
                "atr": atr,
                "bollingerBands": bb,
                "supertrend": supertrend,
                "volumeRatio": vol_ratio,
            },
            "source": "yahoo_finance",
            "timestamp": datetime.utcnow().isoformat(),
        }

        _set_cached(cache_key, result)
        return result

    except Exception as e:
        print(f"[MarketData] Error fetching {yf_symbol}: {e}")
        traceback.print_exc()
        # Return error marker so frontend knows
        return {
            "symbol": symbol.upper(),
            "exchange": exchange,
            "error": str(e),
            "price": 0,
            "change": 0,
            "changePercent": 0,
            "source": "error",
        }


def get_historical_candles(symbol: str, exchange: str = "NSE", period: str = "6mo", interval: str = "1d") -> list:
    """Get OHLCV candle data for charting."""
    cache_key = f"candles:{symbol}:{exchange}:{period}:{interval}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    yf_symbol = _resolve_symbol(symbol, exchange)
    try:
        ticker = yf.Ticker(yf_symbol)
        hist = ticker.history(period=period, interval=interval)
        if hist.empty:
            return []

        candles = []
        for idx, row in hist.iterrows():
            ts = int(idx.timestamp())
            candles.append({
                "time": ts,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        _set_cached(cache_key, candles)
        return candles
    except Exception as e:
        print(f"[MarketData] Error fetching candles for {yf_symbol}: {e}")
        return []


def get_index_data() -> list:
    """Fetch live index data for major indices."""
    cache_key = "indices"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    indices = [
        {"symbol": "^NSEI", "name": "NIFTY 50"},
        {"symbol": "^BSESN", "name": "SENSEX"},
        {"symbol": "^NSEBANK", "name": "BANK NIFTY"},
        {"symbol": "^CNXIT", "name": "NIFTY IT"},
    ]

    results = []
    for idx in indices:
        try:
            ticker = yf.Ticker(idx["symbol"])
            hist = ticker.history(period="2d", interval="1d")
            if len(hist) >= 2:
                current = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2])
                change_pct = round((current - prev) / prev * 100, 2)
            elif len(hist) == 1:
                current = float(hist["Close"].iloc[-1])
                change_pct = 0
            else:
                continue

            results.append({
                "symbol": idx["name"],
                "value": round(current, 2),
                "change": change_pct,
            })
        except Exception as e:
            print(f"[MarketData] Error fetching index {idx['symbol']}: {e}")

    _set_cached(cache_key, results)
    return results
