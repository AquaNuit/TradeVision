/**
 * TradeVision Pro — API Service Layer
 * Fetches LIVE data from the backend API (which uses Yahoo Finance).
 * Falls back to generated data only if the backend is unreachable.
 */
const API = {
    cache: new Map(),
    CACHE_TTL: 30000, // 30s cache on frontend

    /** Base URL for the backend API */
    BASE: CONFIG.API.BACKEND_URL || 'http://localhost:8000/api',

    /** Fetch with cache + auth headers */
    async fetchAPI(endpoint, ttl = this.CACHE_TTL) {
        const url = `${this.BASE}${endpoint}`;
        const cached = this.cache.get(url);
        if (cached && Date.now() - cached.time < ttl) return cached.data;

        try {
            const headers = {};
            const token = Auth?.getToken?.();
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.cache.set(url, { data, time: Date.now() });
            return data;
        } catch (e) {
            console.warn(`[API] Backend fetch failed for ${endpoint}:`, e.message);
            return null;
        }
    },

    /** Get quotes for multiple symbols — LIVE */
    async getQuotes(symbols, exchange = 'NSE') {
        const results = [];
        for (const sym of symbols) {
            const data = await this.getStockDetail(sym, exchange);
            if (data && data.price > 0) results.push(data);
        }
        return results;
    },

    /** Get single stock detail — LIVE from backend */
    async getStockDetail(symbol, exchange = 'NSE') {
        const data = await this.fetchAPI(`/market/stock/${symbol}?exchange=${exchange}`);
        if (data && data.price > 0) return data;
        // Fallback to generated data if backend is down
        console.warn(`[API] Using fallback data for ${symbol}`);
        return this._generateFallback(symbol, exchange);
    },

    /** Get market overview data — LIVE */
    async getMarketOverview() {
        const data = await this.fetchAPI('/market/overview', 60000);
        if (data && data.indices) return data;
        // Fallback
        return {
            indices: [
                { symbol: 'NIFTY 50', value: 22456.80, change: 0 },
                { symbol: 'SENSEX', value: 73890.15, change: 0 },
                { symbol: 'BANK NIFTY', value: 48234.55, change: 0 },
                { symbol: 'NIFTY IT', value: 34567.20, change: 0 },
            ],
            advanceDecline: { advances: 0, declines: 0, unchanged: 0 },
            sectors: [],
        };
    },

    /** Get top movers — LIVE */
    async getMovers(exchange = 'NSE') {
        const data = await this.fetchAPI(`/market/movers?exchange=${exchange}`);
        if (data) return data;
        return { gainers: [], losers: [] };
    },

    /** Get scanner results — LIVE */
    async scanStocks(exchange = 'NSE', filters = {}) {
        let query = `exchange=${exchange}`;
        if (filters.rsi_min != null) query += `&rsi_min=${filters.rsi_min}`;
        if (filters.rsi_max != null) query += `&rsi_max=${filters.rsi_max}`;
        if (filters.macd) query += `&macd=${filters.macd}`;
        if (filters.volume) query += `&volume=${filters.volume}`;
        if (filters.supertrend) query += `&supertrend=${filters.supertrend}`;
        const data = await this.fetchAPI(`/scanner/scan?${query}`, 30000);
        if (data) return data;
        return { count: 0, results: [] };
    },

    /** Get trade signals — LIVE */
    async getSignals(exchange = 'all', action = 'all') {
        const data = await this.fetchAPI(`/signals/?exchange=${exchange}&action=${action}`, 60000);
        if (data) return data;
        return { count: 0, buyCount: 0, sellCount: 0, signals: [] };
    },

    /** Get candle data for charting — LIVE */
    async getCandleData(symbol, exchange = 'NSE', period = '6mo') {
        const data = await this.fetchAPI(`/market/candles/${symbol}?exchange=${exchange}&period=${period}`, 120000);
        if (data && data.candles && data.candles.length > 0) return data.candles;
        // Fallback
        return this.generateCandleData(90);
    },

    /** Generate fallback candle data (offline only) */
    generateCandleData(days = 90) {
        const data = [];
        let price = 1000 + Math.random() * 2000;
        const now = Date.now();
        for (let i = days; i >= 0; i--) {
            const time = new Date(now - i * 86400000);
            const open = price;
            const change = (Math.random() - 0.48) * price * 0.03;
            const close = open + change;
            const high = Math.max(open, close) + Math.random() * price * 0.015;
            const low = Math.min(open, close) - Math.random() * price * 0.015;
            data.push({
                time: time.toISOString().split('T')[0],
                open: +open.toFixed(2), high: +high.toFixed(2),
                low: +low.toFixed(2), close: +close.toFixed(2),
                volume: Utils.randInt(500000, 15000000),
            });
            price = close;
        }
        return data;
    },

    /** Fallback data generator — used only when backend is unreachable */
    _generateFallback(symbol, exchange = 'NSE') {
        const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const rng = (min, max) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min);
        const basePrice = exchange === 'BSE' ? rng(50, 5000) : rng(100, 5000);
        const changePercent = (Math.random() - 0.45) * 8;
        const price = basePrice * (1 + changePercent / 100);
        const volume = Math.floor(rng(100000, 50000000));
        const avgVolume = volume * rng(0.6, 1.4);
        const rsi = Utils.randInt(20, 80);
        const macdValue = (Math.random() - 0.5) * 4;
        const macdSignal = macdValue + (Math.random() - 0.5) * 1.5;
        const ema20 = price * (1 + (Math.random() - 0.5) * 0.03);
        const ema50 = price * (1 + (Math.random() - 0.5) * 0.06);
        const ema200 = price * (1 + (Math.random() - 0.5) * 0.12);
        const vwap = price * (1 + (Math.random() - 0.5) * 0.02);
        const atr = price * rng(0.01, 0.04);
        return {
            symbol, exchange, price: +price.toFixed(2),
            change: +(price - basePrice).toFixed(2),
            changePercent: +changePercent.toFixed(2),
            open: +(price * (1 - Math.random() * 0.02)).toFixed(2),
            high: +(price * (1 + Math.random() * 0.03)).toFixed(2),
            low: +(price * (1 - Math.random() * 0.03)).toFixed(2),
            prevClose: +basePrice.toFixed(2),
            volume, avgVolume: Math.floor(avgVolume),
            marketCap: Math.floor(price * rng(1e6, 1e9)),
            pe: +rng(8, 60).toFixed(1),
            indicators: {
                rsi, macd: { value: +macdValue.toFixed(3), signal: +macdSignal.toFixed(3), histogram: +(macdValue - macdSignal).toFixed(3) },
                ema: { ema20: +ema20.toFixed(2), ema50: +ema50.toFixed(2), ema200: +ema200.toFixed(2) },
                vwap: +vwap.toFixed(2), atr: +atr.toFixed(2),
                bollingerBands: { upper: +(price + atr * 2).toFixed(2), middle: +price.toFixed(2), lower: +(price - atr * 2).toFixed(2) },
                supertrend: Math.random() > 0.5 ? 'UP' : 'DOWN',
                volumeRatio: +(volume / avgVolume).toFixed(2),
            },
            source: 'fallback',
            timestamp: new Date().toISOString(),
        };
    },
};
