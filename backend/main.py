"""
TradeVision Pro — FastAPI Backend Server
Main entry point with local JWT auth, API routing, and frontend serving.
Run with: python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
"""
import os
import sys

# Add backend directory to path for proper imports
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routers import auth, market, scanner, signals, backtest
from app.core.config import settings

app = FastAPI(
    title="TradeVision Pro API",
    description=(
        "AI-powered stock trading assistant API.\n\n"
        "**Authentication:** Use `/api/auth/login` to get a JWT token.\n"
        "Default credentials: `admin` / `tradevision2026`\n\n"
        "All data and tokens are stored locally on your machine."
    ),
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS — allow local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ──
app.include_router(auth.router, prefix="/api/auth", tags=["🔐 Authentication"])
app.include_router(market.router, prefix="/api/market", tags=["📊 Market Data"])
app.include_router(scanner.router, prefix="/api/scanner", tags=["🔍 Scanner"])
app.include_router(signals.router, prefix="/api/signals", tags=["⚡ Signals"])
app.include_router(backtest.router, prefix="/api/backtest", tags=["🧪 Backtest"])

# ── Serve Frontend ──
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="js")
    assets_dir = os.path.join(frontend_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    async def serve_frontend():
        return FileResponse(os.path.join(frontend_dir, "index.html"))


@app.get("/api/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": settings.VERSION,
        "auth": "JWT (local)",
        "docs": "/api/docs",
    }


@app.get("/api/config", tags=["System"])
async def get_public_config():
    """Get public app configuration (no secrets)."""
    return {
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "auth_enabled": True,
        "token_expiry_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "telegram_configured": bool(settings.TELEGRAM_BOT_TOKEN),
        "email_configured": bool(settings.SMTP_USER),
        "alpha_vantage_configured": settings.ALPHA_VANTAGE_KEY != "demo",
    }
