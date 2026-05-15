/**
 * TradeVision Pro — Live Scanner Page
 */
const ScannerPage = {
    currentExchange: 'NSE',
    currentPreset: null,
    filters: {},

    async render() {
        const queryFilters = this.currentPreset ? CONFIG.SCANNER_PRESETS[this.currentPreset] : this.filters;
        const scanData = await API.scanStocks(this.currentExchange, queryFilters);
        const enriched = scanData.results || [];

        return `
        <div class="animate-fadeIn">
            <!-- Controls -->
            <div class="scanner-controls">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex:1;">
                    <span class="text-sm font-semibold" style="color:var(--text-tertiary);margin-right:4px;">EXCHANGE</span>
                    <div class="tabs" id="exchange-tabs">
                        <span class="tab ${this.currentExchange==='NSE'?'active':''}" data-ex="NSE">🇮🇳 NSE</span>
                        <span class="tab ${this.currentExchange==='BSE'?'active':''}" data-ex="BSE">🇮🇳 BSE</span>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <span class="text-sm font-semibold" style="color:var(--text-tertiary);margin-right:4px;">PRESETS</span>
                    ${Object.keys(CONFIG.SCANNER_PRESETS).map(name => `
                        <button class="filter-pill ${this.currentPreset===name?'active':''}" data-preset="${name}">${name}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Filter Row -->
            <div class="scanner-controls" style="margin-bottom:20px;">
                <div class="form-group" style="min-width:130px;">
                    <label class="form-label">RSI Range</label>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <input type="number" class="form-input" id="filter-rsi-min" placeholder="Min" value="${this.filters.rsi_min||''}" style="width:60px;">
                        <span class="text-tertiary">—</span>
                        <input type="number" class="form-input" id="filter-rsi-max" placeholder="Max" value="${this.filters.rsi_max||''}" style="width:60px;">
                    </div>
                </div>
                <div class="form-group" style="min-width:120px;">
                    <label class="form-label">MACD</label>
                    <select class="custom-select form-input" id="filter-macd">
                        <option value="">Any</option>
                        <option value="bullish" ${this.filters.macd==='bullish'?'selected':''}>Bullish</option>
                        <option value="bearish" ${this.filters.macd==='bearish'?'selected':''}>Bearish</option>
                    </select>
                </div>
                <div class="form-group" style="min-width:120px;">
                    <label class="form-label">Volume</label>
                    <select class="custom-select form-input" id="filter-volume">
                        <option value="">Any</option>
                        <option value="above_avg" ${this.filters.volume==='above_avg'?'selected':''}>Above Avg</option>
                        <option value="spike" ${this.filters.volume==='spike'?'selected':''}>Spike (2x+)</option>
                    </select>
                </div>
                <div class="form-group" style="min-width:120px;">
                    <label class="form-label">Supertrend</label>
                    <select class="custom-select form-input" id="filter-supertrend">
                        <option value="">Any</option>
                        <option value="UP" ${this.filters.supertrend==='UP'?'selected':''}>Bullish</option>
                        <option value="DOWN" ${this.filters.supertrend==='DOWN'?'selected':''}>Bearish</option>
                    </select>
                </div>
                <button class="btn btn-primary" id="run-scan-btn"><i data-lucide="scan-search" style="width:14px;height:14px"></i> Scan</button>
                <button class="btn btn-ghost" id="clear-filters-btn"><i data-lucide="x" style="width:14px;height:14px"></i> Clear</button>
            </div>

            <!-- Results -->
            <div class="scanner-results">
                <div class="scanner-results-header">
                    <span class="card-title"><i data-lucide="list-filter" style="width:16px;height:16px"></i> Scanner Results</span>
                    <span class="scanner-results-count">${enriched.length} stocks found</span>
                </div>
                <div class="scanner-table-wrap">
                    <table class="data-table" id="scanner-table">
                        <thead>
                            <tr>
                                <th>Symbol</th><th>Price</th><th class="col-right">Change</th>
                                <th class="col-right">RSI</th><th>MACD</th><th>Supertrend</th>
                                <th class="col-right">Volume</th><th>Patterns</th>
                                <th class="col-right">AI Score</th><th>Signal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${enriched.map(s => `
                            <tr onclick="Router.navigate('analysis', '${s.symbol}')">
                                <td><span class="font-semibold">${s.symbol}</span><br><span class="text-xs text-tertiary">${s.exchange}</span></td>
                                <td class="col-mono">₹${s.price.toLocaleString()}</td>
                                <td class="col-right col-mono"><span class="${s.changePercent>=0?'text-bull':'text-bear'}">${Utils.formatPercent(s.changePercent)}</span></td>
                                <td class="col-right col-mono"><span class="${s.indicators.rsi<30?'text-bull':s.indicators.rsi>70?'text-bear':'text-secondary'}">${s.indicators.rsi}</span></td>
                                <td><span class="badge ${s.indicators.macd.histogram>0?'badge-buy':'badge-sell'}">${s.indicators.macd.histogram>0?'Bullish':'Bearish'}</span></td>
                                <td><span class="badge ${s.indicators.supertrend==='UP'?'badge-buy':'badge-sell'}">${s.indicators.supertrend}</span></td>
                                <td class="col-right col-mono">${Utils.formatVolume(s.volume)}<br><span class="text-xs ${s.indicators.volumeRatio>1.5?'text-bull':'text-tertiary'}">${s.indicators.volumeRatio}x</span></td>
                                <td><div style="display:flex;flex-wrap:wrap;gap:3px;">${s.patterns.slice(0,2).map(p=>`<span class="signal-indicator-tag">${p}</span>`).join('')}</div></td>
                                <td class="col-right">${Utils.scoreRingSVG(s.aiScore.tradeScore, 44, 3)}</td>
                                <td><span class="signal-action ${s.aiScore.action.toLowerCase()}">${s.aiScore.action}</span></td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    },

    afterRender() {
        // Exchange tabs
        document.querySelectorAll('#exchange-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentExchange = tab.dataset.ex;
                Router.navigate('scanner');
            });
        });
        // Preset pills
        document.querySelectorAll('[data-preset]').forEach(pill => {
            pill.addEventListener('click', () => {
                this.currentPreset = this.currentPreset === pill.dataset.preset ? null : pill.dataset.preset;
                this.filters = {};
                Router.navigate('scanner');
            });
        });
        // Scan button
        document.getElementById('run-scan-btn')?.addEventListener('click', () => {
            this.currentPreset = null;
            this.filters = {
                rsi_min: parseInt(document.getElementById('filter-rsi-min')?.value) || undefined,
                rsi_max: parseInt(document.getElementById('filter-rsi-max')?.value) || undefined,
                macd: document.getElementById('filter-macd')?.value || undefined,
                volume: document.getElementById('filter-volume')?.value || undefined,
                supertrend: document.getElementById('filter-supertrend')?.value || undefined,
            };
            Router.navigate('scanner');
        });
        // Clear
        document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
            this.currentPreset = null;
            this.filters = {};
            Router.navigate('scanner');
        });
        lucide.createIcons();
    },
};
