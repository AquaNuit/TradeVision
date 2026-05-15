/**
 * TradeVision Pro — TradingView Widgets
 */
const TVWidgets = {
    /** Embed TradingView advanced chart */
    embedChart(containerId, symbol = 'NSE:RELIANCE', options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        new TradingView.widget({
            container_id: containerId,
            symbol: symbol,
            interval: options.interval || 'D',
            timezone: 'Asia/Kolkata',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#14151F',
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            save_image: false,
            width: '100%',
            height: options.height || 500,
            backgroundColor: '#14151F',
            gridColor: 'rgba(255,255,255,0.04)',
        });
    },

    /** Embed ticker tape */
    embedTickerTape(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = `
            <div class="tradingview-widget-container">
                <div class="tradingview-widget-container__widget"></div>
            </div>`;
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
        script.async = true;
        script.textContent = JSON.stringify({
            symbols: [
                { proName: 'NSE:NIFTY', title: 'NIFTY 50' },
                { proName: 'BSE:SENSEX', title: 'SENSEX' },
                { proName: 'NASDAQ:AAPL', title: 'Apple' },
                { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
                { proName: 'FX:EURUSD', title: 'EUR/USD' },
            ],
            showSymbolLogo: true, colorTheme: 'dark', isTransparent: true, displayMode: 'adaptive',
        });
        container.querySelector('.tradingview-widget-container').appendChild(script);
    },

    /** Embed market overview widget */
    embedMarketOverview(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = `<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div>`;
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
        script.async = true;
        script.textContent = JSON.stringify({
            colorTheme: 'dark', dateRange: '1D', showChart: true, locale: 'en',
            width: '100%', height: '100%', largeChartUrl: '',
            isTransparent: true, showSymbolLogo: true, showFloatingTooltip: true,
            tabs: [
                { title: 'Indices', symbols: [
                    { s: 'NSE:NIFTY', d: 'NIFTY 50' }, { s: 'BSE:SENSEX', d: 'SENSEX' },
                    { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' }, { s: 'FOREXCOM:NSXUSD', d: 'NASDAQ' },
                ]},
                { title: 'Crypto', symbols: [
                    { s: 'BITSTAMP:BTCUSD', d: 'Bitcoin' }, { s: 'BITSTAMP:ETHUSD', d: 'Ethereum' },
                ]},
            ],
        });
        container.querySelector('.tradingview-widget-container').appendChild(script);
    },

    /** Embed heatmap */
    embedHeatmap(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = `<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div>`;
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
        script.async = true;
        script.textContent = JSON.stringify({
            exchanges: ['NSE'], dataSource: 'SENSEX', grouping: 'sector',
            blockSize: 'market_cap_basic', blockColor: 'change',
            locale: 'en', symbolUrl: '', colorTheme: 'dark',
            hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true,
            hasSymbolTooltip: true, width: '100%', height: '100%',
        });
        container.querySelector('.tradingview-widget-container').appendChild(script);
    },
};
