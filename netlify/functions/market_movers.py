import json
import time
import base64
import random
import urllib.request
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

# Cache
_cache = {}
_CACHE_TTL = 60

def _get_cached(key):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < _CACHE_TTL: return data
    return None

def _set_cached(key, data):
    _cache[key] = (data, time.time())

# Body parsing
def decode_body(event):
    body = event.get("body", "") or ""
    if event.get("isBase64Encoded") and body:
        try: body = base64.b64decode(body).decode("utf-8")
        except: pass
    return body

def parse_json_body(event):
    try: return json.loads(decode_body(event) or "{}")
    except: return {}

def parse_form_body(event):
    body = decode_body(event)
    if not body: return {}
    from urllib.parse import parse_qs
    params = parse_qs(body)
    return {k: v[0] if v else "" for k, v in params.items()}

def resolve_symbol(symbol, exchange):
    symbol = symbol.upper().strip()
    if exchange in ("NSE", "BSE"):
        suffix = ".NS" if exchange == "NSE" else ".BO"
        if not symbol.endswith((".NS", ".BO")): return f"{symbol}{suffix}"
    return symbol

# Pure Python Indicators
def calc_rsi(prices, period=14):
    if len(prices) < period + 1: return 50.0
    gains, losses = [], []
    for i in range(1, len(prices)):
        delta = prices[i] - prices[i-1]
        gains.append(delta if delta > 0 else 0)
        losses.append(-delta if delta < 0 else 0)
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0: return 100.0
    return round(100 - 100 / (1 + avg_gain / avg_loss), 2)

def calc_ema(prices, period):
    if len(prices) < period: return round(float(prices[-1]), 2) if prices else 0
    k = 2 / (period + 1)
    ema = sum(prices[:period]) / period
    for p in prices[period:]:
        ema = p * k + ema * (1 - k)
    return round(ema, 2)

def calc_macd(prices):
    if len(prices) < 26: return {"value": 0, "signal": 0, "histogram": 0}
    ema12 = calc_ema(prices, 12)
    ema26 = calc_ema(prices, 26)
    macd_val = round(ema12 - ema26, 3)
    signal = round(macd_val * 0.8, 3)
    return {"value": macd_val, "signal": signal, "histogram": round(macd_val - signal, 3)}

def calc_bollinger(prices, period=20):
    if len(prices) < period:
        mid = float(prices[-1]) if prices else 0
        return {"upper": round(mid * 1.02, 2), "middle": round(mid, 2), "lower": round(mid * 0.98, 2)}
    recent = prices[-period:]
    mid = sum(recent) / period
    variance = sum((x - mid) ** 2 for x in recent) / period
    std = variance ** 0.5
    return {"upper": round(mid + 2 * std, 2), "middle": round(mid, 2), "lower": round(mid - 2 * std, 2)}

def calc_atr(highs, lows, closes, period=14):
    if len(highs) < period + 1:
        return round(float(highs[-1] - lows[-1]) if highs else 0, 2)
    trs = []
    for i in range(1, len(highs)):
        tr = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
        trs.append(tr)
    return round(sum(trs[-period:]) / period, 2)

# API Fetcher
def fetch_yahoo_chart(yf_symbol, period="3mo", interval="1d"):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yf_symbol}?interval={interval}&range={period}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=8) as res:
            data = json.loads(res.read().decode('utf-8'))
        result = data.get('chart', {}).get('result', [])
        if not result: return None
        return result[0]
    except Exception as e:
        print(f"Error fetching {yf_symbol}: {e}")
        return None

def get_stock_data(symbol, exchange="NSE"):
    cache_key = f"{symbol}:{exchange}"
    cached = _get_cached(cache_key)
    if cached: return cached

    yf_symbol = resolve_symbol(symbol, exchange)
    chart = fetch_yahoo_chart(yf_symbol)
    if not chart:
        return {"symbol": symbol.upper(), "exchange": exchange, "error": "No data", "price": 0, "change": 0, "changePercent": 0, "source": "error"}

    try:
        timestamps = chart.get('timestamp', [])
        quote = chart['indicators']['quote'][0]
        closes = [c for c in quote.get('close', []) if c is not None]
        highs = [h for h in quote.get('high', []) if h is not None]
        lows = [l for l in quote.get('low', []) if l is not None]
        opens = [o for o in quote.get('open', []) if o is not None]
        volumes = [v for v in quote.get('volume', []) if v is not None]

        if not closes: raise ValueError("No valid close prices")

        price = round(closes[-1], 2)
        prev_close = round(closes[-2], 2) if len(closes) > 1 else price
        change = round(price - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close != 0 else 0
        volume = volumes[-1] if volumes else 0
        avg_vol = int(sum(volumes[-20:]) / 20) if len(volumes) >= 20 else volume

        rsi = calc_rsi(closes)
        macd = calc_macd(closes)
        ema20 = calc_ema(closes, 20)
        ema50 = calc_ema(closes, 50)
        ema200 = calc_ema(closes, 200) if len(closes) >= 200 else calc_ema(closes, min(len(closes), 50))
        bb = calc_bollinger(closes)
        atr = calc_atr(highs, lows, closes)
        
        # VWAP approx
        vwap = price
        if len(closes) >= 20 and len(volumes) >= 20:
            vol_sum = sum(volumes[-20:])
            vwap = round(sum(closes[i] * volumes[i] for i in range(-20, 0)) / vol_sum, 2) if vol_sum else price
            
        vol_ratio = round(volume / max(avg_vol, 1), 2)
        supertrend = "UP" if price > ema20 and macd["histogram"] > 0 else "DOWN"
        currency = "â‚¹" if exchange in ("NSE", "BSE") else "$"

        # Fetch fast info
        market_cap, pe = 0, 0
        try:
            url_info = f"https://query1.finance.yahoo.com/v10/finance/quoteModules?symbol={yf_symbol}&modules=summaryDetail"
            req_info = urllib.request.Request(url_info, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req_info, timeout=4) as res_info:
                data_info = json.loads(res_info.read().decode('utf-8'))
            sd = data_info['quoteSummary']['result'][0]['summaryDetail']
            market_cap = sd.get('marketCap', {}).get('raw', 0)
            pe = round(sd.get('trailingPE', {}).get('raw', 0), 1)
        except: pass

        result = {
            "symbol": symbol.upper(), "exchange": exchange, "currency": currency,
            "price": price, "open": round(opens[-1], 2) if opens else price,
            "high": round(highs[-1], 2) if highs else price, "low": round(lows[-1], 2) if lows else price,
            "prevClose": prev_close, "change": change, "changePercent": change_pct,
            "volume": volume, "avgVolume": avg_vol, "marketCap": market_cap, "pe": pe,
            "indicators": {
                "rsi": rsi, "macd": macd,
                "ema": {"ema20": ema20, "ema50": ema50, "ema200": ema200},
                "vwap": vwap, "atr": atr, "bollingerBands": bb,
                "supertrend": supertrend, "volumeRatio": vol_ratio,
            },
            "source": "yahoo_api", "timestamp": datetime.utcnow().isoformat(),
        }
        _set_cached(cache_key, result)
        return result
    except Exception as e:
        print(f"Error parsing data for {symbol}: {e}")
        return {"symbol": symbol.upper(), "exchange": exchange, "error": str(e), "price": 0, "change": 0, "changePercent": 0, "source": "error"}

def get_stocks_parallel(symbols, exchange="NSE", max_workers=10):
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(get_stock_data, sym, exchange): sym for sym in symbols}
        for future in as_completed(futures):
            try:
                data = future.result(timeout=15)
                if data.get("price", 0) > 0: results.append(data)
            except: pass
    return results

def get_historical_candles(symbol, exchange="NSE", period="6mo", interval="1d"):
    cache_key = f"candles:{symbol}:{exchange}:{period}:{interval}"
    cached = _get_cached(cache_key)
    if cached: return cached

    yf_symbol = resolve_symbol(symbol, exchange)
    chart = fetch_yahoo_chart(yf_symbol, period, interval)
    if not chart: return []

    try:
        timestamps = chart.get('timestamp', [])
        quote = chart['indicators']['quote'][0]
        candles = []
        for i in range(len(timestamps)):
            if quote['close'][i] is None: continue
            candles.append({
                "time": timestamps[i],
                "open": round(quote['open'][i], 2),
                "high": round(quote['high'][i], 2),
                "low": round(quote['low'][i], 2),
                "close": round(quote['close'][i], 2),
                "volume": quote['volume'][i] or 0
            })
        _set_cached(cache_key, candles)
        return candles
    except Exception as e:
        print(f"Error parsing candles for {yf_symbol}: {e}")
        return []

def get_index_data():
    cache_key = "indices"
    cached = _get_cached(cache_key)
    if cached: return cached

    indices = [
        {"symbol": "^NSEI", "name": "NIFTY 50"},
        {"symbol": "^BSESN", "name": "SENSEX"},
        {"symbol": "^NSEBANK", "name": "BANK NIFTY"},
        {"symbol": "^CNXIT", "name": "NIFTY IT"},
    ]
    results = []

    def _fetch_index(idx):
        chart = fetch_yahoo_chart(idx["symbol"], "5d", "1d")
        if not chart: return None
        try:
            closes = [c for c in chart['indicators']['quote'][0]['close'] if c is not None]
            if len(closes) >= 2:
                current, prev = closes[-1], closes[-2]
                change_pct = round((current - prev) / prev * 100, 2)
            elif len(closes) == 1:
                current, change_pct = closes[-1], 0
            else: return None
            return {"symbol": idx["name"], "value": round(current, 2), "change": change_pct}
        except: return None

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(_fetch_index, idx) for idx in indices]
        for future in as_completed(futures):
            try:
                res = future.result(timeout=10)
                if res: results.append(res)
            except: pass
    _set_cached(cache_key, results)
    return results

def score_stock(stock):
    ind = stock.get("indicators", {})
    rsi = ind.get("rsi", 50)
    macd = ind.get("macd", {"histogram": 0})
    ema = ind.get("ema", {"ema20": 0, "ema50": 0, "ema200": 0})
    price = stock.get("price", 0)
    bb = ind.get("bollingerBands", {"upper": 0, "lower": 0})
    atr = ind.get("atr", 0)

    tech_score, pa_score, smc_score, ctx_score, risk_score = 0, 0, 0, 0, 0
    tech_details, patterns, smc_concepts = [], [], []

    if 40 <= rsi <= 60: tech_score += 10; tech_details.append("RSI Neutral/Bullish")
    elif rsi < 40: tech_score += 15; tech_details.append("RSI Oversold (Value)")
    if macd["histogram"] > 0: tech_score += 15; tech_details.append("MACD Bullish")
    if price > ema["ema50"]: tech_score += 10; tech_details.append("Above EMA50")
    if price > ema["ema200"]: tech_score += 10; tech_details.append("Above EMA200")
    tech_score = min(tech_score, 30)

    if price > bb["upper"]: pa_score += 5; patterns.append("Breakout BB Upper")
    elif price < bb["lower"]: pa_score += 15; patterns.append("Rebound BB Lower")
    pa_score = min(pa_score + 10, 25)

    if ind.get("volumeRatio", 1) > 1.5:
        smc_score += 15; smc_concepts.append("Institutional Volume Spike")
    smc_score = min(smc_score + 5, 20)
    
    ctx_score = 15 if stock.get("change", 0) > 0 else 5
    risk_score = 10 if atr < price * 0.02 else 5
    risk_level = "Low" if risk_score == 10 else "High"

    total = tech_score + pa_score + smc_score + ctx_score + risk_score
    confidence = "High" if total >= 70 else "Medium" if total >= 50 else "Low"
    action = "BUY" if total >= 65 else "SELL" if total < 40 else "WAIT"

    return {
        "tradeScore": total, "confidence": confidence, "riskLevel": risk_level, "action": action,
        "entryPrice": price, "stopLoss": round(price - atr * 1.5, 2),
        "target1": round(price + atr * 2, 2), "target2": round(price + atr * 3.5, 2), "target3": round(price + atr * 5, 2),
        "riskRewardRatio": round((atr * 2) / max(atr * 1.5, 0.01), 2),
        "reasoning": "AI Analysis complete based on technical parameters.",
        "matchedIndicators": patterns[:5] or ["Standard PA"], "smcConcepts": smc_concepts or ["Retail Liquidity"],
        "scores": {"technical": {"score": tech_score, "max": 30, "details": tech_details}}
    }

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "tradevision2026"
ADMIN_EMAIL = "admin@tradevision.local"
SECRET_KEY = "67a100130a4345992e8584aa28fcce3e7e747bae4ca1d1cf7a1cc3aabfee56fa"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 1440

def authenticate_user(username, password):
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD

def base64url_encode(data):
    if isinstance(data, str):
        data = data.encode('utf-8')
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def create_access_token(data, expires_minutes=TOKEN_EXPIRE_MINUTES):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": int(expire.timestamp()), "iat": int(datetime.now(timezone.utc).timestamp())})
    
    header = {"alg": "HS256", "typ": "JWT"}
    b64_header = base64url_encode(json.dumps(header, separators=(',', ':')))
    b64_payload = base64url_encode(json.dumps(to_encode, separators=(',', ':')))
    
    msg = f"{b64_header}.{b64_payload}"
    sig = hmac.new(SECRET_KEY.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).digest()
    b64_sig = base64url_encode(sig)
    
    return f"{msg}.{b64_sig}"

NSE_STOCKS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR",
    "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK",
    "BAJFINANCE", "MARUTI", "TATAMOTORS", "SUNPHARMA", "TITAN",
    "WIPRO", "HCLTECH", "ADANIENT"
]
BSE_STOCKS = [
    "BSE", "CDSL", "ANGELONE", "MCX", "IEX", "CAMS", "UTIAMC", "NAM-INDIA", "HDFCAMC", "ABSLAMC"
]

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
    return event.get("queryStringParameters") or {}

import sys, os
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'netlify', 'functions')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'netlify', 'functions')))

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})

    qs = parse_qs(event)
    exchange = qs.get("exchange", "NSE")
    limit = int(qs.get("limit", "10"))

    universe = BSE_STOCKS if exchange == "BSE" else NSE_STOCKS
    ex = exchange if exchange in ("NSE", "BSE") else "NSE"

    # Parallel fetch ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â critical for Netlify's 26s timeout
    stocks = get_stocks_parallel(universe, ex, max_workers=10)

    stocks_sorted = sorted(stocks, key=lambda x: x.get("changePercent", 0), reverse=True)
    return make_response({
        "gainers": stocks_sorted[:limit],
        "losers": stocks_sorted[-limit:][::-1],
    })
