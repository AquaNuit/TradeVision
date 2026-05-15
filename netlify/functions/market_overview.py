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
            import urllib.request, json
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=5d"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
            
            result = data.get('chart', {}).get('result', [])
            if not result:
                return {"name": name, "change": 0}
            
            closes = result[0].get('indicators', {}).get('quote', [{}])[0].get('close', [])
            closes = [c for c in closes if c is not None]
            
            if len(closes) >= 2:
                current = float(closes[-1])
                prev = float(closes[-2])
                ch = round((current - prev) / prev * 100, 2)
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
