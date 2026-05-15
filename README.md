# 🚀 TradeVision Pro — AI-Powered Trading Assistant

A production-grade web-based stock trading assistant that integrates TradingView charts, AI-powered trade scoring, real-time scanning, and comprehensive technical analysis.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Python](https://img.shields.io/badge/Python-3.12+-green)
![License](https://img.shields.io/badge/license-MIT-purple)

## ✨ Features

### 📊 Market Overview Dashboard
- Live index tracking (NIFTY 50, SENSEX, BANK NIFTY, NIFTY IT)
- Market breadth (Advance/Decline ratio)
- Sector performance heatmap
- Top gainers and losers
- Interactive candlestick charts

### 🔍 Live Stock Scanner
- **Technical Indicators**: RSI, MACD, EMA (20/50/200), VWAP, Bollinger Bands, ATR, Supertrend, Volume analysis
- **Price Action Patterns**: Breakout, Breakdown, Gap Up/Down, Golden Cross, Death Cross, Trend Continuation, Reversals
- **Smart Money Concepts**: Order Blocks, Fair Value Gaps, Break of Structure, Change of Character, Liquidity Zones
- **Preset Strategies**: Bullish Breakout, Bearish Breakdown, Oversold Bounce, Volume Spike, and more
- **Multi-Exchange**: NSE, BSE, US (NASDAQ/NYSE), Crypto, Forex

### 🤖 AI Trade Scoring Engine
Rates every stock on a **0–100 scale** with:

| Component | Max Points |
|-----------|-----------|
| Technical Indicators | 30 |
| Price Action | 25 |
| Smart Money Concepts | 20 |
| Market Context | 15 |
| Risk Assessment | 10 |

Outputs: **Trade Score**, **Confidence** (High/Med/Low), **Risk Level**, **Action** (BUY/SELL/WAIT), **Entry/SL/Targets**, **R:R Ratio**, **Reasoning**

### ⚡ Trade Signals
- AI-generated buy/sell signals
- Score breakdown per signal
- Entry, stop-loss, and 3 target levels
- Risk/reward ratio
- Matched indicators and reasoning

### 📋 Watchlist
- Add/remove stocks
- Persistent (localStorage)
- Live data with AI scores

### 🧪 Strategy Backtesting
- 6 built-in strategies (EMA Crossover, RSI Reversal, MACD Signal, Bollinger Bounce, Supertrend, VWAP Cross)
- Configurable capital, position size, stop-loss
- Results: Win rate, P&L, profit factor, max drawdown, Sharpe ratio
- Equity curve visualization
- Trade log

### 🔔 Alerts Center
- Create custom alerts (breakout, volume spike, RSI levels, etc.)
- Notification channels: Browser, Email, Telegram
- Alert history

### ⚙️ Settings
- Default exchange and timeframe
- API key configuration (Alpha Vantage, Telegram)
- Auto-refresh toggle
- Sound alerts

## 🏗️ Architecture

```
Trading Tool/
├── frontend/                  # Static SPA frontend
│   ├── index.html             # Main HTML shell
│   ├── css/
│   │   ├── variables.css      # Design tokens & colors
│   │   ├── base.css           # Reset & typography
│   │   ├── layout.css         # Sidebar, topbar, grid
│   │   ├── components.css     # Cards, buttons, tables
│   │   ├── pages.css          # Page-specific styles
│   │   ├── animations.css     # Micro-animations
│   │   └── responsive.css     # Mobile breakpoints
│   └── js/
│       ├── config.js          # App configuration
│       ├── utils.js           # Utility functions
│       ├── api.js             # Data service layer
│       ├── scanner-engine.js  # Technical analysis engine
│       ├── ai-scoring.js      # AI scoring model
│       ├── router.js          # SPA client-side router
│       ├── app.js             # Main entry point
│       ├── components/
│       │   ├── charts.js      # Lightweight Charts integration
│       │   └── widgets.js     # TradingView widget helpers
│       └── pages/
│           ├── overview.js    # Market Overview page
│           ├── scanner.js     # Live Scanner page
│           ├── signals.js     # Trade Signals page
│           ├── watchlist.js   # Watchlist page
│           ├── analysis.js    # AI Analysis page
│           ├── backtest.js    # Backtesting page
│           ├── alerts.js      # Alerts page
│           └── settings.js    # Settings page
├── backend/                   # Python FastAPI backend
│   ├── main.py                # FastAPI server
│   ├── requirements.txt       # Python dependencies
│   └── app/
│       ├── core/
│       │   └── config.py      # Server configuration
│       ├── routers/
│       │   ├── market.py      # Market data endpoints
│       │   ├── scanner.py     # Scanner endpoints
│       │   ├── signals.py     # Signal endpoints
│       │   └── backtest.py    # Backtest endpoints
│       └── services/
│           ├── technical_analysis.py  # TA calculations
│           └── ai_scorer.py           # AI scoring model
├── Dockerfile                 # Docker image
├── docker-compose.yml         # Docker Compose with PostgreSQL + Redis
└── start.ps1                  # Quick start script
```

## 🚀 Quick Start

### Prerequisites
- Python 3.12+ installed

### 1. Install Dependencies
```bash
cd "Trading Tool"
pip install fastapi uvicorn pydantic pydantic-settings httpx
```

### 2. Start the Server
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Open in Browser
Navigate to **http://localhost:8000**

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build standalone
docker build -t tradevision-pro .
docker run -p 8000:8000 tradevision-pro
```

## 📡 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/market/overview` | Market indices, sectors, breadth |
| `GET` | `/api/market/movers` | Top gainers/losers |
| `GET` | `/api/market/stock/{symbol}` | Stock detail with indicators |
| `GET` | `/api/scanner/scan` | Run scanner with filters |
| `GET` | `/api/signals/` | Get AI trade signals |
| `GET` | `/api/signals/{symbol}` | Signal for specific stock |
| `POST` | `/api/backtest/run` | Run strategy backtest |

## 🔧 Configuration

Set environment variables or create a `.env` file in the `backend/` directory:

```env
ALPHA_VANTAGE_KEY=your_key_here
DATABASE_URL=postgresql://user:pass@localhost:5432/tradevision
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key
```

## 🔮 Future Improvements

- [ ] Real-time WebSocket data streaming
- [ ] PostgreSQL database integration
- [ ] Redis caching layer
- [ ] JWT authentication with Google OAuth
- [ ] Telegram bot for alerts
- [ ] Pine Script strategy examples
- [ ] Broker API integration (Zerodha Kite, Alpaca)
- [ ] News sentiment analysis
- [ ] Multi-timeframe analysis
- [ ] ML-based price prediction

## 📄 License

MIT License
