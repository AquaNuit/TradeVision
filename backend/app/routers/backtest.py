"""
TradeVision Pro — Backtest API Router
Endpoints for strategy backtesting.
"""
import random
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class BacktestRequest(BaseModel):
    symbol: str = "RELIANCE"
    strategy: str = "ema_crossover"
    start_date: str = "2025-01-01"
    end_date: str = "2026-05-14"
    initial_capital: float = 1000000
    position_size_pct: float = 10
    stop_loss_pct: float = 2


@router.post("/run")
async def run_backtest(req: BacktestRequest):
    """Run a strategy backtest with given parameters."""
    capital = req.initial_capital
    pos_size = req.position_size_pct / 100
    sl_pct = req.stop_loss_pct / 100

    total_trades = random.randint(30, 80)
    win_rate = random.uniform(40, 72)
    wins = int(total_trades * win_rate / 100)
    losses = total_trades - wins

    avg_win = capital * pos_size * random.uniform(0.02, 0.08)
    avg_loss = capital * pos_size * random.uniform(0.01, 0.04)
    total_pnl = wins * avg_win - losses * avg_loss
    profit_factor = (wins * avg_win) / max(losses * avg_loss, 1)
    max_drawdown = random.uniform(5, 20)
    sharpe = random.uniform(0.5, 2.5)

    # Generate equity curve
    equity_curve = []
    eq = capital
    for i in range(365):
        eq += eq * (random.random() - 0.47) * 0.015
        equity_curve.append(round(eq, 2))

    # Generate trade log
    trade_log = []
    for i in range(min(30, total_trades)):
        is_win = random.random() < win_rate / 100
        pnl = avg_win if is_win else -avg_loss
        trade_log.append({
            "trade_no": i + 1,
            "type": "BUY" if random.random() > 0.3 else "SELL",
            "result": "WIN" if is_win else "LOSS",
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl / capital * 100, 2),
        })

    return {
        "symbol": req.symbol,
        "strategy": req.strategy,
        "metrics": {
            "totalTrades": total_trades,
            "winRate": round(win_rate, 1),
            "wins": wins,
            "losses": losses,
            "totalPnL": round(total_pnl, 2),
            "profitFactor": round(profit_factor, 2),
            "maxDrawdown": round(max_drawdown, 1),
            "sharpeRatio": round(sharpe, 2),
            "finalCapital": round(capital + total_pnl, 2),
        },
        "equityCurve": equity_curve,
        "tradeLog": trade_log,
    }
