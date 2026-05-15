/**
 * TradeVision Pro — Backtesting Page
 */
const BacktestPage = {
    results: null,

    async render() {
        return `
        <div class="animate-fadeIn">
            <h2 style="font-size:var(--text-2xl);font-weight:700;margin-bottom:4px;">Strategy Backtesting</h2>
            <p class="text-sm text-secondary" style="margin-bottom:20px;">Test your trading strategies against historical data</p>

            <div class="backtest-config">
                <div class="card">
                    <div class="card-title" style="margin-bottom:16px;"><i data-lucide="settings-2" style="width:16px;height:16px"></i> Strategy Configuration</div>
                    <div class="backtest-form">
                        <div class="form-group">
                            <label class="form-label">Symbol</label>
                            <input type="text" class="form-input" id="bt-symbol" value="RELIANCE" placeholder="e.g., RELIANCE">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Strategy</label>
                            <select class="form-input" id="bt-strategy">
                                <option value="ema_crossover">EMA Crossover (20/50)</option>
                                <option value="rsi_reversal">RSI Reversal</option>
                                <option value="macd_signal">MACD Signal Cross</option>
                                <option value="bollinger_bounce">Bollinger Band Bounce</option>
                                <option value="supertrend">Supertrend Follow</option>
                                <option value="vwap_cross">VWAP Crossover</option>
                            </select>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" class="form-input" id="bt-start" value="2025-01-01">
                            </div>
                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="date" class="form-input" id="bt-end" value="2026-05-14">
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                            <div class="form-group">
                                <label class="form-label">Initial Capital</label>
                                <input type="number" class="form-input" id="bt-capital" value="1000000" placeholder="₹">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Position Size (%)</label>
                                <input type="number" class="form-input" id="bt-position" value="10" min="1" max="100">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Stop Loss (%)</label>
                            <input type="number" class="form-input" id="bt-stoploss" value="2" step="0.5">
                        </div>
                        <button class="btn btn-primary btn-lg" id="run-backtest-btn" style="margin-top:8px;">
                            <i data-lucide="play" style="width:16px;height:16px"></i> Run Backtest
                        </button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-title" style="margin-bottom:16px;"><i data-lucide="info" style="width:16px;height:16px"></i> Strategy Guide</div>
                    <div style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.8;">
                        <p><strong style="color:var(--text-primary);">EMA Crossover:</strong> Buy when EMA20 crosses above EMA50, sell on opposite cross.</p>
                        <p style="margin-top:12px;"><strong style="color:var(--text-primary);">RSI Reversal:</strong> Buy when RSI drops below 30, sell when RSI exceeds 70.</p>
                        <p style="margin-top:12px;"><strong style="color:var(--text-primary);">MACD Signal:</strong> Buy on bullish MACD crossover, sell on bearish.</p>
                        <p style="margin-top:12px;"><strong style="color:var(--text-primary);">Bollinger Bounce:</strong> Buy at lower band, sell at upper band.</p>
                        <p style="margin-top:12px;"><strong style="color:var(--text-primary);">Supertrend:</strong> Follow supertrend direction for entry/exit.</p>
                        <p style="margin-top:12px;"><strong style="color:var(--text-primary);">VWAP Cross:</strong> Buy above VWAP, sell below VWAP.</p>
                    </div>
                </div>
            </div>

            <!-- Results -->
            <div id="backtest-results-section" style="${this.results ? '' : 'display:none;'}">
                <div class="backtest-results" id="bt-metrics"></div>
                <div class="card" style="margin-top:16px;">
                    <div class="card-title" style="margin-bottom:12px;"><i data-lucide="trending-up" style="width:16px;height:16px"></i> Equity Curve</div>
                    <div id="equity-chart" style="height:350px;"></div>
                </div>
                <div class="card" style="margin-top:16px;">
                    <div class="card-title" style="margin-bottom:12px;">Trade Log</div>
                    <div id="bt-trade-log" style="max-height:300px;overflow-y:auto;"></div>
                </div>
            </div>
        </div>`;
    },

    runBacktest() {
        const capital = parseInt(document.getElementById('bt-capital')?.value || 1000000);
        const posSize = parseInt(document.getElementById('bt-position')?.value || 10) / 100;
        const stopLoss = parseFloat(document.getElementById('bt-stoploss')?.value || 2) / 100;
        const strategy = document.getElementById('bt-strategy')?.value || 'ema_crossover';

        // Simulate backtest
        const totalTrades = Utils.randInt(30, 80);
        const winRate = Utils.rand(40, 72);
        const wins = Math.floor(totalTrades * winRate / 100);
        const losses = totalTrades - wins;
        const avgWin = capital * posSize * Utils.rand(0.02, 0.08);
        const avgLoss = capital * posSize * Utils.rand(0.01, 0.04);
        const totalProfit = wins * avgWin - losses * avgLoss;
        const profitFactor = (wins * avgWin) / (losses * avgLoss || 1);
        const maxDrawdown = Utils.rand(5, 20);
        const sharpeRatio = Utils.rand(0.5, 2.5);
        const finalCapital = capital + totalProfit;

        this.results = { totalTrades, winRate, wins, losses, totalProfit, profitFactor, maxDrawdown, sharpeRatio, finalCapital, capital };

        // Show results
        document.getElementById('backtest-results-section').style.display = '';
        document.getElementById('bt-metrics').innerHTML = `
            <div class="stat-card"><div class="stat-label">Win Rate</div><div class="stat-value text-bull">${winRate.toFixed(1)}%</div><div class="text-xs text-secondary">${wins}W / ${losses}L</div></div>
            <div class="stat-card"><div class="stat-label">Total P&L</div><div class="stat-value ${totalProfit>=0?'text-bull':'text-bear'}">${Utils.formatCurrency(totalProfit)}</div><div class="text-xs text-secondary">${(totalProfit/capital*100).toFixed(1)}% return</div></div>
            <div class="stat-card"><div class="stat-label">Profit Factor</div><div class="stat-value">${profitFactor.toFixed(2)}</div><div class="text-xs text-secondary">Sharpe: ${sharpeRatio.toFixed(2)}</div></div>
            <div class="stat-card"><div class="stat-label">Max Drawdown</div><div class="stat-value text-bear">${maxDrawdown.toFixed(1)}%</div><div class="text-xs text-secondary">Peak to trough</div></div>`;

        // Equity curve
        const eqData = [];
        let eq = capital;
        for (let i = 0; i < 365; i++) {
            eq += eq * (Math.random() - 0.47) * 0.015;
            eqData.push({ time: new Date(Date.now() - (365 - i) * 86400000).toISOString().split('T')[0], value: Math.round(eq) });
        }
        Charts.createLineChart('equity-chart', eqData, { height: 350, color: '#6C63FF', area: true });

        // Trade log
        const trades = [];
        for (let i = 0; i < Math.min(20, totalTrades); i++) {
            const isWin = Math.random() < winRate / 100;
            trades.push(`<div class="mover-item"><span class="mover-rank">${i+1}</span><span class="mover-symbol">${isWin ? 'WIN' : 'LOSS'}</span><span class="mover-price font-mono">${Utils.formatCurrency(isWin ? avgWin : -avgLoss)}</span><span class="mover-change ${isWin ? 'up' : 'down'}">${isWin ? '+' : ''}${((isWin ? avgWin : -avgLoss) / capital * 100).toFixed(2)}%</span></div>`);
        }
        document.getElementById('bt-trade-log').innerHTML = `<div class="movers-list">${trades.join('')}</div>`;
        lucide.createIcons();
    },

    afterRender() {
        document.getElementById('run-backtest-btn')?.addEventListener('click', () => this.runBacktest());
        if (this.results) this.runBacktest();
        lucide.createIcons();
    },
};
