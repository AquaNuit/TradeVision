"""
TradeVision Pro — Technical Analysis Service
Generates realistic stock data with comprehensive technical indicators.
"""
import random
import math
from datetime import datetime


class TechnicalAnalysis:
    """Core technical analysis calculations and data generation."""

    @staticmethod
    def generate_stock_data(symbol: str, exchange: str = "NSE") -> dict:
        """Generate comprehensive stock data with technical indicators."""
        seed = sum(ord(c) for c in symbol)
        random.seed(seed + datetime.now().minute)

        # Base price by exchange
        if exchange == "CRYPTO":
            base_price = random.uniform(100, 70000)
            currency = "$"
        elif exchange == "FOREX":
            base_price = random.uniform(0.5, 150)
            currency = ""
        elif exchange in ("NSE", "BSE"):
            base_price = random.uniform(100, 5000)
            currency = "₹"
        else:
            base_price = random.uniform(50, 500)
            currency = "$"

        change_pct = (random.random() - 0.45) * 8
        price = base_price * (1 + change_pct / 100)
        volume = random.randint(100000, 50000000)
        avg_volume = int(volume * random.uniform(0.6, 1.4))

        # Technical Indicators
        rsi = random.randint(20, 80)
        macd_value = round((random.random() - 0.5) * 4, 3)
        macd_signal = round(macd_value + (random.random() - 0.5) * 1.5, 3)
        macd_histogram = round(macd_value - macd_signal, 3)

        ema20 = round(price * (1 + (random.random() - 0.5) * 0.03), 2)
        ema50 = round(price * (1 + (random.random() - 0.5) * 0.06), 2)
        ema200 = round(price * (1 + (random.random() - 0.5) * 0.12), 2)
        vwap = round(price * (1 + (random.random() - 0.5) * 0.02), 2)
        atr = round(price * random.uniform(0.01, 0.04), 2)

        bb_upper = round(price + atr * 2, 2)
        bb_lower = round(price - atr * 2, 2)
        supertrend = "UP" if random.random() > 0.5 else "DOWN"
        volume_ratio = round(volume / max(avg_volume, 1), 2)

        random.seed()  # Reset seed

        return {
            "symbol": symbol,
            "exchange": exchange,
            "currency": currency,
            "price": round(price, 2),
            "change": round(price - base_price, 2),
            "changePercent": round(change_pct, 2),
            "open": round(price * (1 - random.random() * 0.02), 2),
            "high": round(price * (1 + random.random() * 0.03), 2),
            "low": round(price * (1 - random.random() * 0.03), 2),
            "prevClose": round(base_price, 2),
            "volume": volume,
            "avgVolume": avg_volume,
            "marketCap": int(price * random.uniform(1e6, 1e9)),
            "pe": round(random.uniform(8, 60), 1),
            "indicators": {
                "rsi": rsi,
                "macd": {
                    "value": macd_value,
                    "signal": macd_signal,
                    "histogram": macd_histogram,
                },
                "ema": {"ema20": ema20, "ema50": ema50, "ema200": ema200},
                "vwap": vwap,
                "atr": atr,
                "bollingerBands": {
                    "upper": bb_upper,
                    "middle": round(price, 2),
                    "lower": bb_lower,
                },
                "supertrend": supertrend,
                "volumeRatio": volume_ratio,
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def calc_rsi(prices: list, period: int = 14) -> float:
        """Calculate RSI from price series."""
        if len(prices) < period + 1:
            return 50.0
        gains, losses = 0.0, 0.0
        for i in range(1, period + 1):
            diff = prices[i] - prices[i - 1]
            if diff > 0:
                gains += diff
            else:
                losses -= diff
        avg_gain = gains / period
        avg_loss = losses / period
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return round(100 - 100 / (1 + rs), 2)

    @staticmethod
    def calc_ema(prices: list, period: int) -> float:
        """Calculate EMA from price series."""
        if len(prices) < period:
            return prices[-1] if prices else 0
        k = 2 / (period + 1)
        ema = sum(prices[:period]) / period
        for p in prices[period:]:
            ema = p * k + ema * (1 - k)
        return round(ema, 2)

    @staticmethod
    def detect_patterns(stock: dict) -> list:
        """Detect price action patterns."""
        patterns = []
        price = stock["price"]
        ind = stock["indicators"]

        if price > ind["bollingerBands"]["upper"]:
            patterns.append("Breakout")
        if price < ind["bollingerBands"]["lower"]:
            patterns.append("Breakdown")
        if ind["volumeRatio"] > 2:
            patterns.append("Volume Spike")
        if abs(price - ind["ema"]["ema200"]) / price < 0.01:
            patterns.append("S/R Bounce")
        if ind["rsi"] < 30 and ind["macd"]["histogram"] > 0:
            patterns.append("Bullish Reversal")
        if ind["rsi"] > 70 and ind["macd"]["histogram"] < 0:
            patterns.append("Bearish Reversal")

        return patterns
