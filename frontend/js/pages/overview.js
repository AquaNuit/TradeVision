/**
 * TradeVision Pro — Market Overview Page
 */
const OverviewPage = {
    async render() {
        const overview = await API.getMarketOverview();
        const movers = await API.getMovers('NSE');
        const gainers = (movers.gainers || []).slice(0, 6);
        const losers = (movers.losers || []).slice(0, 6);

        return `
        <div class="animate-fadeIn">
            <!-- Index Cards -->
            <div class="overview-grid">
                ${overview.indices.map((idx, i) => `
                <div class="stat-card animate-fadeInUp stagger-${i+1}">
                    <div class="stat-label">${idx.symbol}</div>
                    <div class="stat-value">${idx.value.toLocaleString('en-IN', {maximumFractionDigits:2})}</div>
                    <span class="stat-change ${Utils.trendClass(idx.change)}">${Utils.formatPercent(idx.change)}</span>
                    <div class="stat-icon ${idx.change >= 0 ? 'green' : 'red'}">
                        <i data-lucide="${idx.change >= 0 ? 'trending-up' : 'trending-down'}" style="width:20px;height:20px"></i>
                    </div>
                </div>`).join('')}
            </div>

            <!-- Charts Row -->
            <div class="overview-charts">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title"><i data-lucide="candlestick-chart" style="width:16px;height:16px"></i> NIFTY 50 Chart</span>
                        <div class="tabs" id="chart-timeframe-tabs">
                            <span class="tab active" data-tf="1D">1D</span>
                            <span class="tab" data-tf="1W">1W</span>
                            <span class="tab" data-tf="1M">1M</span>
                            <span class="tab" data-tf="3M">3M</span>
                        </div>
                    </div>
                    <div id="overview-main-chart" style="height:380px;"></div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <span class="card-title"><i data-lucide="pie-chart" style="width:16px;height:16px"></i> Market Breadth</span>
                    </div>
                    <div style="padding:12px 0;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
                            <div style="text-align:center"><div class="text-2xl font-bold text-bull">${overview.advanceDecline.advances}</div><div class="text-xs text-secondary">Advances</div></div>
                            <div style="text-align:center"><div class="text-2xl font-bold text-bear">${overview.advanceDecline.declines}</div><div class="text-xs text-secondary">Declines</div></div>
                            <div style="text-align:center"><div class="text-2xl font-bold" style="color:var(--text-tertiary)">${overview.advanceDecline.unchanged}</div><div class="text-xs text-secondary">Unchanged</div></div>
                        </div>
                        <div style="height:8px;border-radius:4px;overflow:hidden;display:flex;gap:2px;margin-bottom:24px;">
                            <div style="flex:${overview.advanceDecline.advances};background:var(--bull);border-radius:4px;"></div>
                            <div style="flex:${overview.advanceDecline.unchanged};background:var(--text-tertiary);border-radius:4px;"></div>
                            <div style="flex:${overview.advanceDecline.declines};background:var(--bear);border-radius:4px;"></div>
                        </div>
                        <div class="card-title" style="margin-bottom:12px;font-size:var(--text-sm);">Sector Performance</div>
                        <div class="sector-list">
                            ${overview.sectors.map(s => `
                            <div class="sector-item">
                                <span class="sector-name">${s.name}</span>
                                <div class="sector-bar"><div class="sector-bar-fill" style="width:${Math.min(100, Math.abs(s.change) * 15)}%;background:${s.change >= 0 ? 'var(--bull)' : 'var(--bear)'}"></div></div>
                                <span class="text-sm font-mono ${s.change >= 0 ? 'text-bull' : 'text-bear'}">${Utils.formatPercent(s.change)}</span>
                            </div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Row -->
            <div class="overview-bottom">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title"><i data-lucide="trophy" style="width:16px;height:16px"></i> Top Gainers</span>
                        <span class="badge badge-buy">NSE</span>
                    </div>
                    <div class="movers-list">
                        ${gainers.map((s, i) => `
                        <div class="mover-item" onclick="Router.navigate('analysis', '${s.symbol}')">
                            <span class="mover-rank">${i + 1}</span>
                            <span class="mover-symbol">${s.symbol}</span>
                            <span class="mover-price font-mono">₹${s.price.toLocaleString()}</span>
                            <span class="mover-change up">${Utils.formatPercent(s.changePercent)}</span>
                        </div>`).join('')}
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <span class="card-title"><i data-lucide="trending-down" style="width:16px;height:16px"></i> Top Losers</span>
                        <span class="badge badge-sell">NSE</span>
                    </div>
                    <div class="movers-list">
                        ${losers.map((s, i) => `
                        <div class="mover-item" onclick="Router.navigate('analysis', '${s.symbol}')">
                            <span class="mover-rank">${i + 1}</span>
                            <span class="mover-symbol">${s.symbol}</span>
                            <span class="mover-price font-mono">₹${s.price.toLocaleString()}</span>
                            <span class="mover-change down">${Utils.formatPercent(s.changePercent)}</span>
                        </div>`).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    },

    async afterRender() {
        // Render initial chart
        const loadChart = async (period) => {
            let candleData = await API.getCandleData('^NSEI', 'NSE', period);
            if (!candleData || candleData.length === 0) {
                candleData = API.generateCandleData(90);
            }
            Charts.createCandleChart('overview-main-chart', candleData, { height: 380 });
        };
        await loadChart('6mo'); // Default 1D view uses 6mo of data

        // Timeframe tabs
        document.querySelectorAll('#chart-timeframe-tabs .tab').forEach(tab => {
            tab.addEventListener('click', async () => {
                document.querySelectorAll('#chart-timeframe-tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tf = tab.dataset.tf;
                // Map frontend timeframe to yfinance period/interval
                let period = '6mo';
                if (tf === '1W') period = '2y';
                if (tf === '1M') period = '5y';
                if (tf === '3M') period = '10y';
                
                await loadChart(period);
            });
        });

        lucide.createIcons();
    },
};
