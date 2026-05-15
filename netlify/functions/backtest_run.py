"""Netlify Function: POST /api/backtest/run"""
import random
from shared import make_response, parse_json_body

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return make_response({})

    # parse_json_body handles Netlify's base64 encoding automatically
    body = parse_json_body(event)

    symbol = body.get("symbol", "RELIANCE")
    strategy = body.get("strategy", "ema_crossover")
    capital = body.get("initial_capital", 1000000)
    pos_size = body.get("position_size_pct", 10) / 100
    sl_pct = body.get("stop_loss_pct", 2) / 100

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

    equity_curve = []
    eq = capital
    for i in range(365):
        eq += eq * (random.random() - 0.47) * 0.015
        equity_curve.append(round(eq, 2))

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

    return make_response({
        "symbol": symbol,
        "strategy": strategy,
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
    })
