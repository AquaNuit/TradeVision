/**
 * TradeVision Pro — Trade Signals Page
 */
const SignalsPage = {
    async render() {
        const signalData = await API.getSignals('all', 'all');
        const signals = (signalData.signals || []).map(s => ({ ...s.signal, symbol: s.symbol, exchange: s.exchange }));

        const buySignals = signals.filter(s => s.action === 'BUY').length;
        const sellSignals = signals.filter(s => s.action === 'SELL').length;

        return `
        <div class="animate-fadeIn">
            <div class="signals-header">
                <div>
                    <h2 style="font-size:var(--text-2xl);font-weight:700;margin-bottom:4px;">AI Trade Signals</h2>
                    <p class="text-sm text-secondary">AI-powered signals updated every 2 minutes</p>
                </div>
                <div style="display:flex;gap:12px;">
                    <div class="stat-card" style="padding:10px 16px;min-width:100px;text-align:center;">
                        <div class="text-xs text-tertiary">BUY</div>
                        <div class="text-xl font-bold text-bull">${buySignals}</div>
                    </div>
                    <div class="stat-card" style="padding:10px 16px;min-width:100px;text-align:center;">
                        <div class="text-xs text-tertiary">SELL</div>
                        <div class="text-xl font-bold text-bear">${sellSignals}</div>
                    </div>
                    <div class="stat-card" style="padding:10px 16px;min-width:100px;text-align:center;">
                        <div class="text-xs text-tertiary">TOTAL</div>
                        <div class="text-xl font-bold">${signals.length}</div>
                    </div>
                </div>
            </div>

            <div class="signal-cards">
                ${signals.map(sig => {
                    const actionClass = sig.action.toLowerCase();
                    const confColor = sig.confidence === 'High' ? 'var(--bull)' : sig.confidence === 'Medium' ? 'var(--warning-500)' : 'var(--bear)';
                    return `
                    <div class="signal-card ${actionClass} animate-fadeInUp">
                        <div class="signal-top">
                            <div class="signal-symbol-info">
                                <div class="signal-symbol">${sig.symbol}</div>
                                <div class="signal-exchange">${sig.exchange} • ${new Date().toLocaleTimeString()}</div>
                            </div>
                            <span class="signal-action ${actionClass}">${sig.action}</span>
                        </div>

                        <div class="signal-score-section">
                            ${Utils.scoreRingSVG(sig.tradeScore, 56, 4)}
                            <div class="signal-score-details">
                                <div class="signal-score-label">Trade Score</div>
                                <div style="font-size:var(--text-md);font-weight:600;">${sig.tradeScore}/100</div>
                                <div class="signal-confidence">
                                    <span class="signal-confidence-dot" style="background:${confColor}"></span>
                                    <span class="text-xs" style="color:${confColor}">${sig.confidence} Confidence</span>
                                    <span class="text-xs text-tertiary">• Risk: ${sig.riskLevel}</span>
                                </div>
                            </div>
                        </div>

                        <div class="signal-levels">
                            <div class="signal-level">
                                <div class="signal-level-label">Entry</div>
                                <div class="signal-level-value">₹${sig.entryPrice.toLocaleString()}</div>
                            </div>
                            <div class="signal-level">
                                <div class="signal-level-label">Stop Loss</div>
                                <div class="signal-level-value text-bear">₹${sig.stopLoss.toLocaleString()}</div>
                            </div>
                            <div class="signal-level">
                                <div class="signal-level-label">Target 1</div>
                                <div class="signal-level-value text-bull">₹${sig.target1.toLocaleString()}</div>
                            </div>
                            <div class="signal-level">
                                <div class="signal-level-label">R:R Ratio</div>
                                <div class="signal-level-value" style="color:var(--primary-500)">${sig.riskRewardRatio}:1</div>
                            </div>
                        </div>

                        <div class="signal-indicators">
                            ${sig.matchedIndicators.map(ind => `<span class="signal-indicator-tag">${ind}</span>`).join('')}
                        </div>

                        <div class="signal-reasoning">${sig.reasoning.replace(/\n/g, '<br>')}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    },

    afterRender() {
        lucide.createIcons();
    },
};
