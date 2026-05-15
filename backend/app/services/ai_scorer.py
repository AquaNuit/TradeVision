"""
TradeVision Pro — AI Scoring Service
Rates stocks on a 0-100 scale with confidence and risk assessment.
Scoring model breakdown:
  - Technical Indicators: 30 pts
  - Price Action: 25 pts
  - Smart Money Concepts: 20 pts
  - Market Context: 15 pts
  - Risk Assessment: 10 pts
"""
from app.services.technical_analysis import TechnicalAnalysis


class AIScorer:
    """AI-based scoring model for trade decisions."""

    @staticmethod
    def score_stock(stock: dict) -> dict:
        """Analyze and score a stock on 0-100 scale."""
        ind = stock["indicators"]

        # --- Technical Score (max 30) ---
        tech_score = 0
        tech_details = []

        # RSI (5 pts)
        if 40 <= ind["rsi"] <= 60:
            tech_score += 5
            tech_details.append("RSI in optimal range")
        elif ind["rsi"] < 30:
            tech_score += 4
            tech_details.append("RSI oversold — potential bounce")
        elif ind["rsi"] > 70:
            tech_score += 2
            tech_details.append("RSI overbought — caution")
        else:
            tech_score += 3

        # MACD (5 pts)
        if ind["macd"]["histogram"] > 0 and ind["macd"]["value"] > ind["macd"]["signal"]:
            tech_score += 5
            tech_details.append("MACD bullish crossover")
        elif ind["macd"]["histogram"] > 0:
            tech_score += 3
            tech_details.append("MACD positive momentum")
        else:
            tech_score += 1

        # EMA alignment (5 pts)
        price = stock["price"]
        if (price > ind["ema"]["ema20"] > ind["ema"]["ema50"] > ind["ema"]["ema200"]):
            tech_score += 5
            tech_details.append("Perfect EMA alignment (bullish)")
        elif price > ind["ema"]["ema20"]:
            tech_score += 3
            tech_details.append("Price above EMA20")
        else:
            tech_score += 1

        # VWAP (5 pts)
        if price > ind["vwap"]:
            tech_score += 5
            tech_details.append("Trading above VWAP")
        else:
            tech_score += 2

        # Volume (5 pts)
        if ind["volumeRatio"] > 2:
            tech_score += 5
            tech_details.append("Strong volume surge")
        elif ind["volumeRatio"] > 1.2:
            tech_score += 3
        else:
            tech_score += 1

        # Supertrend (5 pts)
        if ind["supertrend"] == "UP":
            tech_score += 5
            tech_details.append("Supertrend bullish")
        else:
            tech_score += 1

        tech_score = min(30, tech_score)

        # --- Price Action Score (max 25) ---
        pa_score = 0
        patterns = TechnicalAnalysis.detect_patterns(stock)
        if "Breakout" in patterns:
            pa_score += 10
        elif "Volume Spike" in patterns:
            pa_score += 7
        else:
            pa_score += 3

        if "Bullish Reversal" in patterns:
            pa_score += 10
        elif "S/R Bounce" in patterns:
            pa_score += 8
        else:
            pa_score += 3

        if stock["change"] > 0:
            pa_score += 4
        else:
            pa_score += 1

        pa_score = min(25, pa_score)

        # --- Smart Money (max 20) ---
        smc_score = 0
        smc_concepts = []

        if abs(price - ind["ema"]["ema200"]) / price < 0.015 and ind["volumeRatio"] > 1.5:
            smc_score += 7
            smc_concepts.append("Order Block")

        bb_width = (ind["bollingerBands"]["upper"] - ind["bollingerBands"]["lower"]) / price
        if bb_width > 0.06:
            smc_score += 7
            smc_concepts.append("Fair Value Gap")

        if price > ind["bollingerBands"]["upper"] or price < ind["bollingerBands"]["lower"]:
            smc_score += 6
            smc_concepts.append("Break of Structure")

        if smc_score == 0:
            smc_score = 3
        smc_score = min(20, smc_score)

        # --- Market Context (max 15) ---
        ctx_score = 0
        if stock["changePercent"] > 1:
            ctx_score += 5
        elif stock["changePercent"] > 0:
            ctx_score += 3
        else:
            ctx_score += 1
        ctx_score += 3  # Market neutral
        if stock["changePercent"] > 2:
            ctx_score += 5
        elif stock["changePercent"] > 0:
            ctx_score += 3
        else:
            ctx_score += 1
        ctx_score = min(15, ctx_score)

        # --- Risk (max 10) ---
        risk_score = 0
        atr_pct = ind["atr"] / price * 100
        if atr_pct < 2:
            risk_score += 5
        elif atr_pct < 4:
            risk_score += 3
        else:
            risk_score += 1
        if 1 < ind["volumeRatio"] < 3:
            risk_score += 5
        else:
            risk_score += 2
        risk_score = min(10, risk_score)
        risk_level = "Low" if risk_score >= 8 else "Medium" if risk_score >= 5 else "High"

        # --- Total ---
        total = min(100, tech_score + pa_score + smc_score + ctx_score + risk_score)
        confidence = "High" if total >= 75 else "Medium" if total >= 50 else "Low"

        # Determine action
        if total >= 70 and stock["changePercent"] > 0 and ind["macd"]["histogram"] > 0:
            action = "BUY"
        elif total < 35 or (ind["rsi"] > 75 and ind["macd"]["histogram"] < 0):
            action = "SELL"
        else:
            action = "WAIT"

        # Trade levels
        atr = ind["atr"]
        entry = round(price, 2)
        stop_loss = round(price - atr * 1.5, 2)
        target1 = round(price + atr * 2, 2)
        target2 = round(price + atr * 3.5, 2)
        target3 = round(price + atr * 5, 2)
        rr_ratio = round(atr * 2 / (atr * 1.5), 2) if atr > 0 else 0

        # Reasoning
        reasoning = []
        if action == "BUY":
            reasoning.append(f"{stock['symbol']} shows strong bullish momentum with score {total}/100.")
        elif action == "SELL":
            reasoning.append(f"{stock['symbol']} is showing weakness. Consider reducing exposure.")
        else:
            reasoning.append(f"{stock['symbol']} is consolidating. Wait for clearer signals.")
        reasoning.extend(tech_details[:3])

        return {
            "tradeScore": total,
            "confidence": confidence,
            "riskLevel": risk_level,
            "action": action,
            "entryPrice": entry,
            "stopLoss": stop_loss,
            "target1": target1,
            "target2": target2,
            "target3": target3,
            "riskRewardRatio": rr_ratio,
            "reasoning": "\n".join(reasoning),
            "matchedIndicators": patterns[:5],
            "smcConcepts": smc_concepts,
            "scores": {
                "technical": {"score": tech_score, "max": 30, "details": tech_details},
                "priceAction": {"score": pa_score, "max": 25, "details": patterns[:1]},
                "smartMoney": {"score": smc_score, "max": 20, "details": smc_concepts},
                "marketContext": {"score": ctx_score, "max": 15, "details": [f"Market change: {stock['changePercent']}%"]},
                "risk": {"score": risk_score, "max": 10, "details": [f"Risk level: {risk_level}"]},
            },
        }
