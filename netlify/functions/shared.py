"""
TradeVision Pro — Shared Serverless Utilities
Reusable helpers for all Netlify Functions.
Contains: market data fetching, indicator calculation, AI scoring, auth.
This is the same logic from the backend, re-packaged for serverless.

NOTE: This file has no `handler` function — Netlify will NOT deploy it
as a function. It is a support module imported by the actual functions.
"""
import json
import time
import base64
import hashlib
import secrets
import random
from datetime import datetime, timedelta, timezone
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np


# ─────────────────────────────────────────────
# In-memory cache (per function invocation)
# ─────────────────────────────────────────────
_cache = {}
_CACHE_TTL = 60

def _get_cached(key):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < _CACHE_TTL:
            return data
    return None

def _set_cached(key, data):
    _cache[key] = (data, time.time())


# ─────────────────────────────────────────────
# Body Parsing (handles Netlify base64 encoding)
# ─────────────────────────────────────────────
def decode_body(event):
    """Decode the request body, handling Netlify's base64 encoding."""
    body = event.get("body", "") or ""
    if event.get("isBase64Encoded") and body:
        try:
            body = base64.b64decode(body).decode("utf-8")
        except Exception:
            pass
    return body


def parse_json_body(event):
    """Parse JSON body from event, handling base64 encoding."""
    body = decode_body(event)
    if not body:
        return {}
    try:
        return json.loads(body)
    except Exception:
        return {}


def parse_form_body(event):
    """Parse form-urlencoded body from event, handling base64 encoding."""
    body = decode_body(event)
    if not body:
        return {}
    from urllib.parse import parse_qs
    params = parse_qs(body)
    # parse_qs returns lists, flatten to single values
    return {k: v[0] if v else "" for k, v in params.items()}


# ─────────────────────────────────────────────
# Symbol Resolution
# ─────────────────────────────────────────────
def resolve_symbol(symbol, exchange):
    symbol = symbol.upper().strip()
    if exchange in ("NSE", "BSE"):
        suffix = ".NS" if exchange == "NSE" else ".BO"
        if not symbol.endswith((".NS", ".BO")):
            return f"{symbol}{suffix}"
    return symbol


# ─────────────────────────────────────────────
# Technical Indicator Calculations
# ─────────────────────────────────────────────
def calc_rsi(prices, period=14):
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


def calc_ema(prices, period):
    if len(prices) < period:
        return round(float(prices[-1]), 2) if len(prices) > 0 else 0
    k = 2 / (period + 1)
    ema = float(np.mean(prices[:period]))
    for p in prices[period:]:
        ema = float(p) * k + ema * (1 - k)
    return round(ema, 2)


def calc_macd(prices):
    if len(prices) < 26:
        return {"value": 0, "signal": 0, "histogram": 0}
    ema12 = calc_ema(prices, 12)
    ema26 = calc_ema(prices, 26)
    macd_val = round(ema12 - ema26, 3)
    signal = round(macd_val * 0.8, 3)
    return {"value": macd_val, "signal": signal, "histogram": round(macd_val - signal, 3)}


def calc_bollinger(prices, period=20):
    if len(prices) < period:
        mid = float(prices[-1]) if len(prices) > 0 else 0
        return {"upper": round(mid * 1.02, 2), "middle": round(mid, 2), "lower": round(mid * 0.98, 2)}
    recent = prices[-period:]
    mid = float(np.mean(recent))
    std = float(np.std(recent))
    return {"upper": round(mid + 2 * std, 2), "middle": round(mid, 2), "lower": round(mid - 2 * std, 2)}


def calc_atr(highs, lows, closes, period=14):
    if len(highs) < period + 1:
        return round(float(highs[-1] - lows[-1]) if len(highs) > 0 else 0, 2)
    trs = []
    for i in range(1, len(highs)):
        tr = max(float(highs[i] - lows[i]), abs(float(highs[i] - closes[i - 1])), abs(float(lows[i] - closes[i - 1])))
        trs.append(tr)
    return round(float(np.mean(trs[-period:])), 2)


# ─────────────────────────────────────────────
# Stock Data Fetching
# ─────────────────────────────────────────────
def get_stock_data(symbol, exchange="NSE"):
    cache_key = f"{symbol}:{exchange}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    yf_symbol = resolve_symbol(symbol, exchange)
    try:
        import yfinance as yf
        ticker = yf.Ticker(yf_symbol)
        hist = ticker.history(period="3mo", interval="1d")
        if hist.empty:
            raise ValueError(f"No data for {yf_symbol}")

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

        rsi = calc_rsi(closes)
        macd = calc_macd(closes)
        ema20 = calc_ema(closes, 20)
        ema50 = calc_ema(closes, 50)
        ema200 = calc_ema(closes, 200) if len(closes) >= 200 else calc_ema(closes, min(len(closes), 50))
        bb = calc_bollinger(closes)
        atr = calc_atr(highs, lows, closes)
        vwap = round(float(np.sum(closes[-20:] * hist["Volume"].values[-20:].astype(float)) / max(np.sum(hist["Volume"].values[-20:].astype(float)), 1)), 2) if len(closes) >= 20 else price
        vol_ratio = round(volume / max(avg_vol, 1), 2)
        supertrend = "UP" if price > ema20 and macd["histogram"] > 0 else "DOWN"
        currency = "₹" if exchange in ("NSE", "BSE") else "$"

        try:
            info = ticker.fast_info
            market_cap = int(getattr(info, "market_cap", 0) or 0)
            pe = round(float(getattr(info, "pe_ratio", 0) or 0), 1)
        except Exception:
            market_cap = 0
            pe = 0

        result = {
            "symbol": symbol.upper(), "exchange": exchange, "currency": currency,
            "price": price, "open": round(float(latest["Open"]), 2),
            "high": round(float(latest["High"]), 2), "low": round(float(latest["Low"]), 2),
            "prevClose": prev_close, "change": change, "changePercent": change_pct,
            "volume": volume, "avgVolume": avg_vol, "marketCap": market_cap, "pe": pe,
            "indicators": {
                "rsi": rsi, "macd": macd,
                "ema": {"ema20": ema20, "ema50": ema50, "ema200": ema200},
                "vwap": vwap, "atr": atr, "bollingerBands": bb,
                "supertrend": supertrend, "volumeRatio": vol_ratio,
            },
            "source": "yahoo_finance", "timestamp": datetime.utcnow().isoformat(),
        }
        _set_cached(cache_key, result)
        return result

    except Exception as e:
        print(f"[Serverless] Error fetching {yf_symbol}: {e}")
        return {
            "symbol": symbol.upper(), "exchange": exchange,
            "error": str(e), "price": 0, "change": 0, "changePercent": 0, "source": "error",
        }


def get_stocks_parallel(symbols, exchange="NSE", max_workers=10):
    """Fetch multiple stocks in parallel using ThreadPoolExecutor.
    Critical for Netlify — sequential fetching would exceed the 26s timeout."""
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(get_stock_data, sym, exchange): sym for sym in symbols}
        for future in as_completed(futures):
            try:
                data = future.result(timeout=15)
                if data.get("price", 0) > 0:
                    results.append(data)
            except Exception:
                pass
    return results


def get_historical_candles(symbol, exchange="NSE", period="6mo", interval="1d"):
    cache_key = f"candles:{symbol}:{exchange}:{period}:{interval}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    yf_symbol = resolve_symbol(symbol, exchange)
    try:
        import yfinance as yf
        ticker = yf.Ticker(yf_symbol)
        hist = ticker.history(period=period, interval=interval)
        if hist.empty:
            return []
        candles = []
        for idx, row in hist.iterrows():
            candles.append({
                "time": int(idx.timestamp()), "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2), "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2), "volume": int(row["Volume"]),
            })
        _set_cached(cache_key, candles)
        return candles
    except Exception as e:
        print(f"[Serverless] Error fetching candles for {yf_symbol}: {e}")
        return []


def get_index_data():
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

    def _fetch_index(idx):
        import yfinance as yf
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
                return None
            return {"symbol": idx["name"], "value": round(current, 2), "change": change_pct}
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(_fetch_index, idx) for idx in indices]
        for future in as_completed(futures):
            try:
                result = future.result(timeout=10)
                if result:
                    results.append(result)
            except Exception:
                pass

    _set_cached(cache_key, results)
    return results


# ─────────────────────────────────────────────
# AI Scorer (same logic as backend ai_scorer.py)
# ─────────────────────────────────────────────
def score_stock(stock):
    if "indicators" not in stock or stock.get("price", 0) == 0:
        return {"tradeScore": 0, "confidence": "Low", "riskLevel": "High", "action": "WAIT",
                "entryPrice": 0, "stopLoss": 0, "target1": 0, "target2": 0, "target3": 0,
                "riskRewardRatio": 0, "reasoning": "Insufficient data", "matchedIndicators": [], "smcConcepts": [],
                "scores": {"technical": {"score": 0, "max": 30, "details": []},
                           "priceAction": {"score": 0, "max": 25, "details": []},
                           "smartMoney": {"score": 0, "max": 20, "details": []},
                           "marketContext": {"score": 0, "max": 15, "details": []},
                           "risk": {"score": 0, "max": 10, "details": []}}}

    ind = stock["indicators"]
    rsi = ind.get("rsi", 50)
    macd = ind.get("macd", {})
    ema = ind.get("ema", {})
    price = stock["price"]
    change_pct = stock.get("changePercent", 0)
    atr = ind.get("atr", price * 0.02)

    # Technical score (max 30)
    tech_score = 0
    tech_details = []
    if 40 <= rsi <= 60: tech_score += 5; tech_details.append("RSI in optimal range")
    elif rsi < 30: tech_score += 4; tech_details.append("RSI oversold — potential bounce")
    elif rsi > 70: tech_score += 2; tech_details.append("RSI overbought — caution")
    else: tech_score += 3; tech_details.append(f"RSI at {rsi}")

    if macd.get("histogram", 0) > 0 and macd.get("value", 0) > macd.get("signal", 0):
        tech_score += 5; tech_details.append("MACD bullish crossover")
    elif macd.get("histogram", 0) > 0: tech_score += 3; tech_details.append("MACD positive momentum")
    else: tech_score += 1; tech_details.append("MACD bearish")

    if price > ema.get("ema20", 0) and ema.get("ema20", 0) > ema.get("ema50", 0):
        tech_score += 5; tech_details.append("Price above EMA20")
    elif price > ema.get("ema20", 0): tech_score += 3; tech_details.append("Price above EMA20")
    else: tech_score += 1; tech_details.append("Below key EMAs")

    if price > ind.get("vwap", 0): tech_score += 5; tech_details.append("Trading above VWAP")
    else: tech_score += 2; tech_details.append("Below VWAP")

    vol_ratio = ind.get("volumeRatio", 1)
    if vol_ratio > 2: tech_score += 5; tech_details.append("Strong volume surge")
    elif vol_ratio > 1.2: tech_score += 3; tech_details.append("Above average volume")
    else: tech_score += 1; tech_details.append("Low volume")

    tech_score = min(30, tech_score)

    # Price action (max 25)
    pa_score = 5
    patterns = []
    if change_pct > 2 and vol_ratio > 1.5: pa_score += 10; patterns.append("Breakout")
    elif change_pct > 1: pa_score += 6; patterns.append("Trend Continuation")
    if change_pct > 3: patterns.append("Volume Spike")
    pa_score = min(25, pa_score)

    # Smart money (max 20)
    smc_score = 5
    smc_concepts = []
    if vol_ratio > 2: smc_score += 7; smc_concepts.append("Order Block")
    if abs(change_pct) > 2: smc_score += 6; smc_concepts.append("Break of Structure")
    if price > ema.get("ema200", 0): smc_score += 4; smc_concepts.append("Institutional Bias Bullish")
    smc_score = min(20, smc_score)

    # Context (max 15)
    ctx_score = 5
    if change_pct > 1: ctx_score += 5
    elif change_pct > 0: ctx_score += 3
    else: ctx_score += 1
    ctx_score = min(15, ctx_score)

    # Risk (max 10)
    atr_pct = atr / price * 100 if price > 0 else 5
    risk_score = 5 if atr_pct < 2 else (3 if atr_pct < 4 else 1)
    if 1 < vol_ratio < 3: risk_score += 5
    else: risk_score += 2
    risk_score = min(10, risk_score)
    risk_level = "Low" if risk_score >= 8 else ("Medium" if risk_score >= 5 else "High")

    total = min(100, tech_score + pa_score + smc_score + ctx_score + risk_score)
    confidence = "High" if total >= 75 else ("Medium" if total >= 50 else "Low")

    if total >= 70 and change_pct > 0 and macd.get("histogram", 0) > 0: action = "BUY"
    elif total < 35 or (rsi > 75 and macd.get("histogram", 0) < 0): action = "SELL"
    else: action = "WAIT"

    entry = round(price, 2)
    stop_loss = round(price - atr * 1.5, 2)
    target1 = round(price + atr * 2, 2)
    target2 = round(price + atr * 3.5, 2)
    target3 = round(price + atr * 5, 2)
    rr_ratio = round((atr * 2) / (atr * 1.5), 2) if atr > 0 else 0

    reasoning = []
    if action == "BUY":
        reasoning.append(f"{stock['symbol']} shows strong bullish momentum with score {total}/100.")
    elif action == "SELL":
        reasoning.append(f"{stock['symbol']} is showing weakness. Consider reducing exposure.")
    else:
        reasoning.append(f"{stock['symbol']} is consolidating. Wait for clearer signals.")
    for d in tech_details[:4]:
        reasoning.append(f"• {d}")

    return {
        "tradeScore": total, "confidence": confidence, "riskLevel": risk_level, "action": action,
        "entryPrice": entry, "stopLoss": stop_loss,
        "target1": target1, "target2": target2, "target3": target3,
        "riskRewardRatio": rr_ratio, "reasoning": "\n".join(reasoning),
        "matchedIndicators": patterns[:5], "smcConcepts": smc_concepts,
        "scores": {
            "technical": {"score": tech_score, "max": 30, "details": tech_details},
            "priceAction": {"score": pa_score, "max": 25, "details": patterns[:1]},
            "smartMoney": {"score": smc_score, "max": 20, "details": smc_concepts},
            "marketContext": {"score": ctx_score, "max": 15, "details": [f"Market change: {change_pct}%"]},
            "risk": {"score": risk_score, "max": 10, "details": [f"Risk level: {risk_level}"]},
        },
    }


# ─────────────────────────────────────────────
# Auth Helpers
# Uses FIXED salt so the hash is stable across cold starts.
# ─────────────────────────────────────────────
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "tradevision2026"
ADMIN_EMAIL = "admin@tradevision.local"
SECRET_KEY = "67a100130a4345992e8584aa28fcce3e7e747bae4ca1d1cf7a1cc3aabfee56fa"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 1440

def authenticate_user(username, password):
    """Direct comparison — no hashing needed for a single admin account in serverless."""
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD

def create_access_token(data, expires_minutes=TOKEN_EXPIRE_MINUTES):
    from jose import jwt as jose_jwt
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jose_jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ─────────────────────────────────────────────
# Stock Universes
# ─────────────────────────────────────────────
NSE_STOCKS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR",
    "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK",
    "BAJFINANCE", "MARUTI", "TATAMOTORS", "SUNPHARMA", "TITAN",
    "WIPRO", "HCLTECH", "ADANIENT",
]
BSE_STOCKS = [
    "BSE", "CDSL", "ANGELONE", "MCX", "IEX", "CAMS", "UTIAMC", "NAM-INDIA", "HDFCAMC", "ABSLAMC"
]


# ─────────────────────────────────────────────
# Response Helper
# ─────────────────────────────────────────────
def make_response(body, status_code=200):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        "body": json.dumps(body, default=str),
    }

def parse_qs(event):
    """Parse query string parameters from the event."""
    return event.get("queryStringParameters") or {}
