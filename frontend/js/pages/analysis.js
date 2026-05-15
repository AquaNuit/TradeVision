/**
 * TradeVision Pro — AI Analysis Page
 */
const AnalysisPage = {
    currentSymbol: 'RELIANCE',

    async render(symbol) {
        if (symbol) this.currentSymbol = symbol.toUpperCase().trim();
        const data = await API.fetchAPI(`/signals/${this.currentSymbol}?exchange=NSE`);
        
        if (!data || data.error) {
            return `<div class="card" style="text-align:center;padding:40px;">
                <i data-lucide="alert-circle" style="width:48px;height:48px;color:var(--warning-500);margin:0 auto 16px;"></i>
                <h3 class="text-xl font-bold">Stock Not Found</h3>
                <p class="text-secondary" style="margin-top:8px;">Could not fetch data for ${this.currentSymbol}</p>
                <button class="btn btn-primary" style="margin-top:20px;" onclick="Router.navigate('overview')">Back to Overview</button>
            </div>`;
        }

        const stock = data;
        const analysis = data.signal;
        const patterns = analysis.matchedIndicators || [];
        const smc = []; // Handled by backend now
        const ind = stock.indicators;

        const actionClass = analysis.action.toLowerCase();
        const confColor = analysis.confidence === 'High' ? 'var(--bull)' : analysis.confidence === 'Medium' ? 'var(--warning-500)' : 'var(--bear)';

        return `
        <div class="animate-fadeIn">
            <!-- Search -->
            <div class="card" style="margin-bottom:20px;">
                <div style="display:flex;gap:12px;align-items:center;">
                    <i data-lucide="brain" style="width:24px;height:24px;color:var(--primary-500)"></i>
                    <input type="text" id="analysis-symbol-input" class="analysis-search-input" placeholder="Enter stock symbol (e.g., RELIANCE, AAPL, BTC)" value="${this.currentSymbol}" style="margin:0;">
                    <button class="btn btn-primary" id="analyze-btn"><i data-lucide="sparkles" style="width:14px;height:14px"></i> Analyze</button>
                </div>
            </div>

            <!-- Top Summary -->
            <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div style="font-size:var(--text-2xl);font-weight:800;">${stock.symbol}</div>
                            <div class="text-sm text-tertiary">${stock.exchange} • Real-time Analysis</div>
                        </div>
                        <span class="signal-action ${actionClass}" style="font-size:var(--text-md);padding:6px 20px;">${analysis.action}</span>
                    </div>
                    <div style="display:flex;gap:24px;align-items:center;margin-bottom:16px;">
                        <div>
                            <div class="text-3xl font-bold font-mono">₹${stock.price.toLocaleString()}</div>
                            <div class="${stock.changePercent>=0?'text-bull':'text-bear'} font-mono text-md">${Utils.formatPercent(stock.changePercent)} (₹${stock.change.toFixed(2)})</div>
                        </div>
                        ${Utils.scoreRingSVG(analysis.tradeScore, 80, 5)}
                        <div>
                            <div class="text-xs text-tertiary">AI TRADE SCORE</div>
                            <div class="text-xl font-bold">${analysis.tradeScore}/100</div>
                            <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
                                <span class="signal-confidence-dot" style="background:${confColor};width:8px;height:8px;border-radius:50%;display:inline-block;"></span>
                                <span class="text-sm" style="color:${confColor}">${analysis.confidence} Confidence</span>
                            </div>
                        </div>
                    </div>
                    <!-- Chart -->
                    <div id="analysis-chart" style="height:350px;"></div>
                </div>

                <!-- Score Breakdown -->
                <div class="card">
                    <div class="card-title" style="margin-bottom:16px;">Score Breakdown</div>
                    ${Object.entries(analysis.scores).map(([key, data]) => {
                        const score = typeof data === 'object' ? data.score : data;
                        const max = typeof data === 'object' ? data.max : (key === 'technical' ? 30 : key === 'priceAction' ? 25 : key === 'smartMoney' ? 20 : key === 'marketContext' ? 15 : 10);
                        const detail = typeof data === 'object' && data.details && data.details.length > 0 ? data.details[0] : '';
                        return `
                        <div style="margin-bottom:16px;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                                <span class="text-sm font-medium">${key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span class="text-sm font-mono font-semibold">${score}/${max}</span>
                            </div>
                            <div style="height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden;">
                                <div style="height:100%;width:${(score/max)*100}%;background:${score/max>0.7?'var(--bull)':score/max>0.4?'var(--warning-500)':'var(--bear)'};border-radius:3px;transition:width 0.8s ease;"></div>
                            </div>
                            <div class="text-xs text-tertiary" style="margin-top:4px;">${detail}</div>
                        </div>`;
                    }).join('')}

                    <!-- Trade Levels -->
                    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border-subtle);">
                        <div class="card-title" style="margin-bottom:12px;">Trade Levels</div>
                        <div class="signal-levels">
                            <div class="signal-level"><div class="signal-level-label">Entry</div><div class="signal-level-value">₹${analysis.entryPrice}</div></div>
                            <div class="signal-level"><div class="signal-level-label">Stop Loss</div><div class="signal-level-value text-bear">₹${analysis.stopLoss}</div></div>
                            <div class="signal-level"><div class="signal-level-label">Target 1</div><div class="signal-level-value text-bull">₹${analysis.target1}</div></div>
                            <div class="signal-level"><div class="signal-level-label">Target 2</div><div class="signal-level-value text-bull">₹${analysis.target2}</div></div>
                        </div>
                        <div style="text-align:center;margin-top:8px;">
                            <span class="text-sm text-tertiary">R:R Ratio: </span>
                            <span class="text-md font-bold" style="color:var(--primary-500)">${analysis.riskRewardRatio}:1</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Technical Indicators & Patterns -->
            <div class="analysis-grid" style="margin-bottom:20px;">
                <div class="card">
                    <div class="card-title" style="margin-bottom:12px;"><i data-lucide="activity" style="width:16px;height:16px"></i> Technical Indicators</div>
                    <div class="indicator-list">
                        <div class="indicator-row"><span class="indicator-name">RSI (14)</span><span class="indicator-value">${ind.rsi}</span><span class="indicator-signal ${ind.rsi<30?'bullish':ind.rsi>70?'bearish':'neutral'}">${ind.rsi<30?'Oversold':ind.rsi>70?'Overbought':'Neutral'}</span></div>
                        <div class="indicator-row"><span class="indicator-name">MACD</span><span class="indicator-value">${ind.macd.value}</span><span class="indicator-signal ${ind.macd.histogram>0?'bullish':'bearish'}">${ind.macd.histogram>0?'Bullish':'Bearish'}</span></div>
                        <div class="indicator-row"><span class="indicator-name">EMA 20</span><span class="indicator-value">₹${ind.ema.ema20}</span><span class="indicator-signal ${stock.price>ind.ema.ema20?'bullish':'bearish'}">${stock.price>ind.ema.ema20?'Above':'Below'}</span></div>
                        <div class="indicator-row"><span class="indicator-name">EMA 50</span><span class="indicator-value">₹${ind.ema.ema50}</span><span class="indicator-signal ${stock.price>ind.ema.ema50?'bullish':'bearish'}">${stock.price>ind.ema.ema50?'Above':'Below'}</span></div>
                        <div class="indicator-row"><span class="indicator-name">EMA 200</span><span class="indicator-value">₹${ind.ema.ema200}</span><span class="indicator-signal ${stock.price>ind.ema.ema200?'bullish':'bearish'}">${stock.price>ind.ema.ema200?'Above':'Below'}</span></div>
                        <div class="indicator-row"><span class="indicator-name">VWAP</span><span class="indicator-value">₹${ind.vwap}</span><span class="indicator-signal ${stock.price>ind.vwap?'bullish':'bearish'}">${stock.price>ind.vwap?'Above':'Below'}</span></div>
                        <div class="indicator-row"><span class="indicator-name">Supertrend</span><span class="indicator-value">${ind.supertrend}</span><span class="indicator-signal ${ind.supertrend==='UP'?'bullish':'bearish'}">${ind.supertrend==='UP'?'Bullish':'Bearish'}</span></div>
                        <div class="indicator-row"><span class="indicator-name">ATR</span><span class="indicator-value">₹${ind.atr}</span><span class="indicator-signal neutral">Volatility</span></div>
                        <div class="indicator-row"><span class="indicator-name">BB Upper</span><span class="indicator-value">₹${ind.bollingerBands.upper}</span><span class="indicator-signal ${stock.price>ind.bollingerBands.upper?'bearish':'neutral'}">${stock.price>ind.bollingerBands.upper?'Above':'Within'}</span></div>
                        <div class="indicator-row"><span class="indicator-name">Vol Ratio</span><span class="indicator-value">${ind.volumeRatio}x</span><span class="indicator-signal ${ind.volumeRatio>1.5?'bullish':'neutral'}">${ind.volumeRatio>1.5?'High':'Normal'}</span></div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-title" style="margin-bottom:12px;"><i data-lucide="shapes" style="width:16px;height:16px"></i> Patterns & Smart Money</div>
                    <div style="margin-bottom:16px;">
                        <div class="text-xs text-tertiary" style="margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Price Action Patterns</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;">
                            ${patterns.length ? patterns.map(p => `<span class="signal-indicator-tag">${p}</span>`).join('') : '<span class="text-sm text-tertiary">No patterns detected</span>'}
                        </div>
                    </div>
                    <div style="margin-bottom:16px;">
                        <div class="text-xs text-tertiary" style="margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Smart Money Concepts</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;">
                            ${smc.length ? smc.map(s => `<span class="badge badge-info">${s}</span>`).join('') : '<span class="text-sm text-tertiary">No SMC signals</span>'}
                        </div>
                    </div>
                    <div style="padding-top:16px;border-top:1px solid var(--border-subtle);">
                        <div class="text-xs text-tertiary" style="margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">AI Reasoning</div>
                        <div class="signal-reasoning">${analysis.reasoning.replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    async afterRender() {
        let candleData = await API.getCandleData(this.currentSymbol, 'NSE', '6mo');
        if (!candleData || candleData.length === 0) {
            candleData = API.generateCandleData(120);
        }
        Charts.createCandleChart('analysis-chart', candleData, { height: 350 });

        document.getElementById('analyze-btn')?.addEventListener('click', () => {
            const val = document.getElementById('analysis-symbol-input')?.value;
            if (val) { this.currentSymbol = val.toUpperCase().trim(); Router.navigate('analysis'); }
        });
        document.getElementById('analysis-symbol-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('analyze-btn')?.click();
        });
        lucide.createIcons();
    },
};
