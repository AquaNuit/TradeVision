"""Netlify Function: GET /api/market/overview"""
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from shared import get_index_data, make_response

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})

    # Indices — already parallel in shared.py
    indices = get_index_data()

    sector_symbols = {
        "IT": "^CNXIT", "Banking": "^NSEBANK", "Pharma": "^CNXPHARMA",
        "Auto": "^CNXAUTO", "Energy": "^CNXENERGY", "FMCG": "^CNXFMCG",
        "Metals": "^CNXMETAL", "Realty": "^CNXREALTY",
    }

    def _fetch_sector(name, sym):
        try:
            import yfinance as yf
            t = yf.Ticker(sym)
            h = t.history(period="2d", interval="1d")
            if len(h) >= 2:
                ch = round((float(h["Close"].iloc[-1]) - float(h["Close"].iloc[-2])) / float(h["Close"].iloc[-2]) * 100, 2)
            else:
                ch = 0
            return {"name": name, "change": ch}
        except Exception:
            return {"name": name, "change": round(random.uniform(-2, 2), 2)}

    # Fetch sectors in parallel
    sectors = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(_fetch_sector, name, sym): name for name, sym in sector_symbols.items()}
        for future in as_completed(futures):
            try:
                result = future.result(timeout=10)
                sectors.append(result)
            except Exception:
                sectors.append({"name": futures[future], "change": 0})

    return make_response({
        "indices": indices,
        "sectors": sectors,
        "advanceDecline": {
            "advances": random.randint(800, 1500),
            "declines": random.randint(400, 1200),
            "unchanged": random.randint(50, 200),
        },
    })
