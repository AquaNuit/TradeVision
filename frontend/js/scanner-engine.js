/**
 * TradeVision Pro — Scanner Engine
 * Technical analysis calculations and stock filtering
 */
const ScannerEngine = {
    /** Calculate RSI */
    calcRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50;
        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
            const diff = prices[i] - prices[i - 1];
            if (diff > 0) gains += diff; else losses -= diff;
        }
        let avgGain = gains / period, avgLoss = losses / period;
        for (let i = period + 1; i < prices.length; i++) {
            const diff = prices[i] - prices[i - 1];
            avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
            avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
        }
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return +(100 - 100 / (1 + rs)).toFixed(2);
    },

    /** Calculate EMA */
    calcEMA(prices, period) {
        if (prices.length < period) return prices[prices.length - 1] || 0;
        const k = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        for (let i = period; i < prices.length; i++) ema = prices[i] * k + ema * (1 - k);
        return +ema.toFixed(2);
    },

    /** Calculate MACD */
    calcMACD(prices) {
        const ema12 = this.calcEMA(prices, 12);
        const ema26 = this.calcEMA(prices, 26);
        const macdLine = +(ema12 - ema26).toFixed(3);
        const signalLine = +(macdLine * 0.8).toFixed(3); // Simplified
        return { value: macdLine, signal: signalLine, histogram: +(macdLine - signalLine).toFixed(3) };
    },

    /** Calculate VWAP */
    calcVWAP(candles) {
        if (!candles.length) return 0;
        let cumVP = 0, cumV = 0;
        candles.forEach(c => { const tp = (c.high + c.low + c.close) / 3; cumVP += tp * c.volume; cumV += c.volume; });
        return cumV ? +(cumVP / cumV).toFixed(2) : 0;
    },

    /** Calculate Bollinger Bands */
    calcBollingerBands(prices, period = 20, multiplier = 2) {
        if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };
        const slice = prices.slice(-period);
        const middle = slice.reduce((a, b) => a + b, 0) / period;
        const stdDev = Math.sqrt(slice.reduce((s, p) => s + (p - middle) ** 2, 0) / period);
        return { upper: +(middle + multiplier * stdDev).toFixed(2), middle: +middle.toFixed(2), lower: +(middle - multiplier * stdDev).toFixed(2) };
    },

    /** Calculate ATR */
    calcATR(candles, period = 14) {
        if (candles.length < 2) return 0;
        const trs = [];
        for (let i = 1; i < candles.length; i++) {
            const tr = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close));
            trs.push(tr);
        }
        return +(trs.slice(-period).reduce((a, b) => a + b, 0) / Math.min(period, trs.length)).toFixed(2);
    },

    /** Calculate Supertrend */
    calcSupertrend(candles, period = 10, multiplier = 3) {
        const atr = this.calcATR(candles, period);
        const lastCandle = candles[candles.length - 1];
        const hl2 = (lastCandle.high + lastCandle.low) / 2;
        const upperBand = hl2 + multiplier * atr;
        const lowerBand = hl2 - multiplier * atr;
        return lastCandle.close > upperBand ? 'DOWN' : 'UP';
    },

    /** Detect price action patterns */
    detectPatterns(stock) {
        const patterns = [];
        const { price, indicators, high, low, prevClose, volume, avgVolume } = stock;

        // Breakout detection
        if (price > indicators.bollingerBands.upper) patterns.push('Breakout');
        if (price < indicators.bollingerBands.lower) patterns.push('Breakdown');

        // Volume spike
        if (indicators.volumeRatio > 2) patterns.push('Volume Spike');

        // Support/Resistance bounce
        if (Math.abs(price - indicators.ema.ema200) / price < 0.01) patterns.push('S/R Bounce');

        // Gap up/down
        if ((price - prevClose) / prevClose > 0.02) patterns.push('Gap Up');
        if ((prevClose - price) / prevClose > 0.02) patterns.push('Gap Down');

        // Moving average crossover
        if (indicators.ema.ema20 > indicators.ema.ema50 && Math.abs(indicators.ema.ema20 - indicators.ema.ema50) / indicators.ema.ema50 < 0.005) patterns.push('Golden Cross');
        if (indicators.ema.ema20 < indicators.ema.ema50 && Math.abs(indicators.ema.ema20 - indicators.ema.ema50) / indicators.ema.ema50 < 0.005) patterns.push('Death Cross');

        // Trend continuation
        if (price > indicators.ema.ema20 && indicators.ema.ema20 > indicators.ema.ema50 && indicators.rsi > 50 && indicators.rsi < 70) patterns.push('Trend Continuation');

        // Reversal
        if (indicators.rsi < 30 && indicators.macd.histogram > 0) patterns.push('Bullish Reversal');
        if (indicators.rsi > 70 && indicators.macd.histogram < 0) patterns.push('Bearish Reversal');

        return patterns;
    },

    /** Detect Smart Money Concepts */
    detectSMC(stock) {
        const concepts = [];
        const { price, indicators } = stock;

        // Order Block (simplified: price near EMA200 with volume)
        if (Math.abs(price - indicators.ema.ema200) / price < 0.015 && indicators.volumeRatio > 1.5) concepts.push('Order Block');

        // Fair Value Gap (simplified: gap between BB bands)
        const bbWidth = (indicators.bollingerBands.upper - indicators.bollingerBands.lower) / price;
        if (bbWidth > 0.06) concepts.push('Fair Value Gap');

        // Break of Structure
        if (price > indicators.bollingerBands.upper || price < indicators.bollingerBands.lower) concepts.push('Break of Structure');

        // Change of Character (RSI divergence from trend)
        if ((indicators.rsi < 35 && indicators.supertrend === 'UP') || (indicators.rsi > 65 && indicators.supertrend === 'DOWN')) concepts.push('Change of Character');

        // Liquidity Zone
        if (indicators.volumeRatio > 2.5) concepts.push('Liquidity Zone');

        return concepts;
    },

    /** Run scanner with filters */
    scan(stocks, filters = {}) {
        return stocks.filter(stock => {
            const { indicators } = stock;
            if (filters.rsi_min != null && indicators.rsi < filters.rsi_min) return false;
            if (filters.rsi_max != null && indicators.rsi > filters.rsi_max) return false;
            if (filters.macd === 'bullish' && indicators.macd.histogram <= 0) return false;
            if (filters.macd === 'bearish' && indicators.macd.histogram >= 0) return false;
            if (filters.volume === 'above_avg' && indicators.volumeRatio < 1.2) return false;
            if (filters.volume === 'spike' && indicators.volumeRatio < 2) return false;
            if (filters.supertrend === 'UP' && indicators.supertrend !== 'UP') return false;
            if (filters.supertrend === 'DOWN' && indicators.supertrend !== 'DOWN') return false;
            if (filters.ema_trend === 'up' && !(indicators.ema.ema20 > indicators.ema.ema50)) return false;
            if (filters.ema_trend === 'down' && !(indicators.ema.ema20 < indicators.ema.ema50)) return false;
            return true;
        });
    },
};
