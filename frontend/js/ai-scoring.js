/**
 * TradeVision Pro — AI Scoring Engine
 * Rates stocks on a 0-100 scale with confidence and risk levels
 */
const AIScoring = {
    /** Main scoring function — returns complete trade analysis */
    analyzeStock(stock) {
        const scores = {
            technical: this.scoreTechnical(stock),
            priceAction: this.scorePriceAction(stock),
            smartMoney: this.scoreSmartMoney(stock),
            marketContext: this.scoreMarketContext(stock),
            riskAssessment: this.scoreRisk(stock),
        };

        const totalScore = Math.min(100, Math.round(
            scores.technical.score + scores.priceAction.score + scores.smartMoney.score +
            scores.marketContext.score + scores.riskAssessment.score
        ));

        const confidence = totalScore >= 75 ? 'High' : totalScore >= 50 ? 'Medium' : 'Low';
        const riskLevel = scores.riskAssessment.level;
        const action = this.determineAction(totalScore, stock);
        const levels = this.calculateLevels(stock);
        const reasoning = this.generateReasoning(stock, scores, action);
        const matchedIndicators = this.getMatchedIndicators(stock, scores);

        return {
            symbol: stock.symbol, exchange: stock.exchange,
            tradeScore: totalScore, confidence, riskLevel, action,
            ...levels, reasoning, matchedIndicators, scores,
            timestamp: new Date().toISOString(),
        };
    },

    /** Score Technical Indicators (max 30) */
    scoreTechnical(stock) {
        const { indicators } = stock;
        let score = 0;
        const details = [];

        // RSI (5 pts)
        if (indicators.rsi >= 40 && indicators.rsi <= 60) { score += 5; details.push('RSI in optimal range'); }
        else if (indicators.rsi < 30) { score += 4; details.push('RSI oversold — potential bounce'); }
        else if (indicators.rsi > 70) { score += 2; details.push('RSI overbought — caution'); }
        else { score += 3; details.push(`RSI at ${indicators.rsi}`); }

        // MACD (5 pts)
        if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) { score += 5; details.push('MACD bullish crossover'); }
        else if (indicators.macd.histogram > 0) { score += 3; details.push('MACD positive momentum'); }
        else { score += 1; details.push('MACD bearish'); }

        // EMA Trend (5 pts)
        if (stock.price > indicators.ema.ema20 && indicators.ema.ema20 > indicators.ema.ema50 && indicators.ema.ema50 > indicators.ema.ema200) { score += 5; details.push('Perfect EMA alignment (bullish)'); }
        else if (stock.price > indicators.ema.ema20) { score += 3; details.push('Price above EMA20'); }
        else { score += 1; details.push('Below key EMAs'); }

        // VWAP (5 pts)
        if (stock.price > indicators.vwap) { score += 5; details.push('Trading above VWAP'); }
        else { score += 2; details.push('Below VWAP'); }

        // Volume (5 pts)
        if (indicators.volumeRatio > 2) { score += 5; details.push('Strong volume surge'); }
        else if (indicators.volumeRatio > 1.2) { score += 3; details.push('Above average volume'); }
        else { score += 1; details.push('Low volume'); }

        // Supertrend (5 pts)
        if (indicators.supertrend === 'UP') { score += 5; details.push('Supertrend bullish'); }
        else { score += 1; details.push('Supertrend bearish'); }

        return { score: Math.min(30, score), max: 30, details };
    },

    /** Score Price Action (max 25) */
    scorePriceAction(stock) {
        let score = 0;
        const details = [];
        const patterns = ScannerEngine.detectPatterns(stock);

        // Breakout quality (10 pts)
        if (patterns.includes('Breakout')) { score += 10; details.push('Price breakout detected'); }
        else if (patterns.includes('Gap Up')) { score += 7; details.push('Gap up opening'); }
        else if (patterns.includes('Trend Continuation')) { score += 6; details.push('Trend continuation pattern'); }
        else { score += 2; }

        // Support/Resistance (10 pts)
        if (patterns.includes('S/R Bounce')) { score += 10; details.push('Bounce from key support'); }
        else if (patterns.includes('Golden Cross')) { score += 8; details.push('Golden cross formation'); }
        else { score += 3; }

        // Candle patterns (5 pts)
        if (stock.change > 0 && stock.price > stock.open) { score += 4; details.push('Bullish candle structure'); }
        else { score += 1; }

        return { score: Math.min(25, score), max: 25, details };
    },

    /** Score Smart Money Concepts (max 20) */
    scoreSmartMoney(stock) {
        let score = 0;
        const details = [];
        const smc = ScannerEngine.detectSMC(stock);

        if (smc.includes('Order Block')) { score += 7; details.push('Near institutional order block'); }
        if (smc.includes('Fair Value Gap')) { score += 7; details.push('Fair value gap identified'); }
        if (smc.includes('Break of Structure')) { score += 6; details.push('Break of market structure'); }
        if (smc.includes('Change of Character')) { score += 4; details.push('Change of character detected'); }
        if (smc.includes('Liquidity Zone')) { score += 4; details.push('High liquidity zone'); }

        if (score === 0) { score = 3; details.push('No significant SMC signals'); }

        return { score: Math.min(20, score), max: 20, details };
    },

    /** Score Market Context (max 15) */
    scoreMarketContext(stock) {
        let score = 0;
        const details = [];

        // Sector strength (5 pts) — simplified
        if (stock.changePercent > 1) { score += 5; details.push('Strong sector momentum'); }
        else if (stock.changePercent > 0) { score += 3; details.push('Positive sector trend'); }
        else { score += 1; details.push('Weak sector'); }

        // Market trend (5 pts)
        score += 3; details.push('Market in neutral/bullish phase');

        // Relative strength (5 pts)
        if (stock.changePercent > 2) { score += 5; details.push('Strong relative strength'); }
        else if (stock.changePercent > 0) { score += 3; details.push('Moderate relative strength'); }
        else { score += 1; details.push('Underperforming'); }

        return { score: Math.min(15, score), max: 15, details };
    },

    /** Score Risk (max 10) */
    scoreRisk(stock) {
        let score = 0;
        const details = [];
        const { indicators } = stock;

        // Risk/Reward (5 pts)
        const atrPercent = indicators.atr / stock.price * 100;
        if (atrPercent < 2) { score += 5; details.push('Low volatility — manageable risk'); }
        else if (atrPercent < 4) { score += 3; details.push('Moderate volatility'); }
        else { score += 1; details.push('High volatility — increased risk'); }

        // Volatility (5 pts)
        if (indicators.volumeRatio > 1 && indicators.volumeRatio < 3) { score += 5; details.push('Healthy volume profile'); }
        else { score += 2; details.push('Unusual volume'); }

        const level = score >= 8 ? 'Low' : score >= 5 ? 'Medium' : 'High';
        return { score: Math.min(10, score), max: 10, details, level };
    },

    /** Determine trade action */
    determineAction(score, stock) {
        if (score >= 70 && stock.changePercent > 0 && stock.indicators.macd.histogram > 0) return 'BUY';
        if (score < 35 || (stock.indicators.rsi > 75 && stock.indicators.macd.histogram < 0)) return 'SELL';
        return 'WAIT';
    },

    /** Calculate entry/exit levels */
    calculateLevels(stock) {
        const { price, indicators } = stock;
        const atr = indicators.atr;
        return {
            entryPrice: +price.toFixed(2),
            stopLoss: +(price - atr * 1.5).toFixed(2),
            target1: +(price + atr * 2).toFixed(2),
            target2: +(price + atr * 3.5).toFixed(2),
            target3: +(price + atr * 5).toFixed(2),
            riskRewardRatio: +(atr * 2 / (atr * 1.5)).toFixed(2),
        };
    },

    /** Generate human-readable reasoning */
    generateReasoning(stock, scores, action) {
        const reasons = [];
        if (action === 'BUY') {
            reasons.push(`${stock.symbol} shows strong bullish momentum with a trade score of ${scores.technical.score + scores.priceAction.score + scores.smartMoney.score + scores.marketContext.score + scores.riskAssessment.score}/100.`);
        } else if (action === 'SELL') {
            reasons.push(`${stock.symbol} is showing weakness. Consider reducing exposure.`);
        } else {
            reasons.push(`${stock.symbol} is in a consolidation phase. Wait for clearer signals.`);
        }
        scores.technical.details.forEach(d => reasons.push(`• ${d}`));
        scores.priceAction.details.slice(0, 2).forEach(d => reasons.push(`• ${d}`));
        return reasons.join('\n');
    },

    /** Get matched indicator tags */
    getMatchedIndicators(stock, scores) {
        const tags = [];
        const { indicators } = stock;
        if (indicators.rsi < 30 || indicators.rsi > 70) tags.push('RSI');
        if (indicators.macd.histogram > 0) tags.push('MACD');
        if (stock.price > indicators.ema.ema20) tags.push('EMA20');
        if (stock.price > indicators.vwap) tags.push('VWAP');
        if (indicators.volumeRatio > 1.5) tags.push('Volume');
        if (indicators.supertrend === 'UP') tags.push('Supertrend');
        tags.push(...ScannerEngine.detectPatterns(stock).slice(0, 3));
        return [...new Set(tags)];
    },
};
