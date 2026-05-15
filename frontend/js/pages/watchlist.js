/**
 * TradeVision Pro — Watchlist Page
 */
const WatchlistPage = {
    watchlist: JSON.parse(localStorage.getItem('tv_watchlist') || '["RELIANCE","TCS","INFY","HDFCBANK","SBIN","ITC"]'),

    saveWatchlist() {
        localStorage.setItem('tv_watchlist', JSON.stringify(this.watchlist));
    },

    addSymbol(symbol) {
        symbol = symbol.toUpperCase().trim();
        if (symbol && !this.watchlist.includes(symbol)) {
            this.watchlist.push(symbol);
            this.saveWatchlist();
            Utils.toast('Added', `${symbol} added to watchlist`, 'success');
            Router.navigate('watchlist');
        }
    },

    removeSymbol(symbol) {
        this.watchlist = this.watchlist.filter(s => s !== symbol);
        this.saveWatchlist();
        Utils.toast('Removed', `${symbol} removed from watchlist`, 'info');
        Router.navigate('watchlist');
    },

    async render() {
        const nseSymbols = this.watchlist.filter(s => CONFIG.STOCK_UNIVERSE.NSE.includes(s));
        const bseSymbols = this.watchlist.filter(s => CONFIG.STOCK_UNIVERSE.BSE.includes(s));
        const nseData = await API.getQuotes(nseSymbols, 'NSE');
        const bseData = await API.getQuotes(bseSymbols, 'BSE');
        const remaining = this.watchlist.filter(s => !nseSymbols.includes(s) && !bseSymbols.includes(s));
        const otherData = await API.getQuotes(remaining, 'NSE');
        const stocks = [...nseData, ...bseData, ...otherData];

        return `
        <div class="animate-fadeIn">
            <div class="watchlist-header">
                <div>
                    <h2 style="font-size:var(--text-2xl);font-weight:700;margin-bottom:4px;">My Watchlist</h2>
                    <p class="text-sm text-secondary">${this.watchlist.length} stocks tracked</p>
                </div>
                <div class="watchlist-add">
                    <input type="text" id="watchlist-input" placeholder="Add symbol (e.g., SBIN)" autocomplete="off">
                    <button class="btn btn-primary" id="watchlist-add-btn"><i data-lucide="plus" style="width:14px;height:14px"></i> Add</button>
                </div>
            </div>
            <div class="watchlist-table-wrap">
                <table class="data-table" id="watchlist-table">
                    <thead>
                        <tr>
                            <th>Symbol</th><th class="col-right">Price</th><th class="col-right">Change</th>
                            <th class="col-right">RSI</th><th>MACD</th><th>Supertrend</th>
                            <th class="col-right">Volume</th><th class="col-right">AI Score</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stocks.map(s => {
                            const ai = AIScoring.analyzeStock(s);
                            return `
                            <tr>
                                <td onclick="Router.navigate('analysis','${s.symbol}')" style="cursor:pointer;">
                                    <span class="font-semibold">${s.symbol}</span><br>
                                    <span class="text-xs text-tertiary">${s.exchange}</span>
                                </td>
                                <td class="col-right col-mono">₹${s.price.toLocaleString()}</td>
                                <td class="col-right col-mono"><span class="${s.changePercent>=0?'text-bull':'text-bear'}">${Utils.formatPercent(s.changePercent)}</span></td>
                                <td class="col-right col-mono">${s.indicators.rsi}</td>
                                <td><span class="badge ${s.indicators.macd.histogram>0?'badge-buy':'badge-sell'}">${s.indicators.macd.histogram>0?'Bull':'Bear'}</span></td>
                                <td><span class="badge ${s.indicators.supertrend==='UP'?'badge-buy':'badge-sell'}">${s.indicators.supertrend}</span></td>
                                <td class="col-right col-mono">${Utils.formatVolume(s.volume)}</td>
                                <td class="col-right">${Utils.scoreRingSVG(ai.tradeScore, 40, 3)}</td>
                                <td><button class="btn btn-ghost btn-sm remove-watchlist" data-symbol="${s.symbol}"><i data-lucide="trash-2" style="width:13px;height:13px"></i></button></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    afterRender() {
        document.getElementById('watchlist-add-btn')?.addEventListener('click', () => {
            const input = document.getElementById('watchlist-input');
            if (input?.value) this.addSymbol(input.value);
        });
        document.getElementById('watchlist-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('watchlist-add-btn')?.click();
        });
        document.querySelectorAll('.remove-watchlist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeSymbol(btn.dataset.symbol);
            });
        });
        lucide.createIcons();
    },
};
