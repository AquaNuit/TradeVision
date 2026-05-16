/**
 * TradeVision Pro — Configuration
 */
const CONFIG = {
    APP_NAME: 'TradeVision Pro',
    VERSION: '1.0.0',

    // Local auth (Netlify static deploy — JWT minted in browser, no server required)
    AUTH: {
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'tradevision2026',
        ADMIN_EMAIL: 'admin@tradevision.local',
        SECRET_KEY: '67a100130a4345992e8584aa28fcce3e7e747bae4ca1d1cf7a1cc3aabfee56fa',
        TOKEN_EXPIRE_SECONDS: 86400,
    },

    // API Keys — replace with your own for production
    API: {
        YAHOO_FINANCE: 'https://query1.finance.yahoo.com/v8/finance',
        ALPHA_VANTAGE_KEY: 'demo', // Replace with real key
        ALPHA_VANTAGE_URL: 'https://www.alphavantage.co/query',
        // Auto-detect: use relative path on Netlify (same-origin), localhost when running locally
        BACKEND_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:8000/api'
            : '/api',
    },

    // Supported exchanges
    EXCHANGES: {
        NSE: { name: 'NSE', suffix: '.NS', currency: '₹', flag: '🇮🇳' },
        BSE: { name: 'BSE', suffix: '.BO', currency: '₹', flag: '🇮🇳' },
    },

    // Default stocks for different markets
    STOCK_UNIVERSE: {
        NSE: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'LT', 'AXISBANK', 'BAJFINANCE', 'MARUTI', 'TATAMOTORS', 'SUNPHARMA', 'TITAN', 'WIPRO', 'HCLTECH', 'ADANIENT'],
        BSE: ['BSE', 'CDSL', 'ANGELONE', 'MCX', 'IEX', 'CAMS', 'UTIAMC', 'NAM-INDIA', 'HDFCAMC', 'ABSLAMC'],
    },

    // Scanner presets
    SCANNER_PRESETS: {
        'Bullish Breakout': { rsi_min: 50, rsi_max: 70, macd: 'bullish', volume: 'above_avg', ema_trend: 'up' },
        'Bearish Breakdown': { rsi_min: 30, rsi_max: 50, macd: 'bearish', volume: 'above_avg', ema_trend: 'down' },
        'Oversold Bounce': { rsi_min: 20, rsi_max: 35, macd: 'any', volume: 'any', ema_trend: 'any' },
        'Overbought Short': { rsi_min: 70, rsi_max: 90, macd: 'any', volume: 'any', ema_trend: 'any' },
        'Volume Spike': { rsi_min: 0, rsi_max: 100, macd: 'any', volume: 'spike', ema_trend: 'any' },
        'Golden Cross': { rsi_min: 0, rsi_max: 100, macd: 'any', volume: 'any', ema_trend: 'golden_cross' },
        'Death Cross': { rsi_min: 0, rsi_max: 100, macd: 'any', volume: 'any', ema_trend: 'death_cross' },
    },

    // Timeframes
    TIMEFRAMES: ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M'],

    // Refresh intervals
    REFRESH: {
        TICKER: 30000,     // 30s
        SCANNER: 60000,    // 60s
        SIGNALS: 120000,   // 2min
        OVERVIEW: 60000,   // 60s
    },
};
