/**
 * TradeVision Pro — Client-side Router
 */
const Router = {
    pages: {
        overview: { title: 'Market Overview', module: () => OverviewPage },
        scanner: { title: 'Live Scanner', module: () => ScannerPage },
        signals: { title: 'Trade Signals', module: () => SignalsPage },
        watchlist: { title: 'Watchlist', module: () => WatchlistPage },
        analysis: { title: 'AI Analysis', module: () => AnalysisPage },
        backtest: { title: 'Backtesting', module: () => BacktestPage },
        alerts: { title: 'Alerts Center', module: () => AlertsPage },
        settings: { title: 'Settings', module: () => SettingsPage },
    },
    currentPage: 'overview',

    async navigate(page, param) {
        if (!this.pages[page]) page = 'overview';
        this.currentPage = page;

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update title
        document.getElementById('page-title').textContent = this.pages[page].title;
        document.title = `${this.pages[page].title} — TradeVision Pro`;

        // Clean up charts
        Charts.destroyAll();

        // Render page
        const container = document.getElementById('page-container');
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:300px;"><div class="skeleton" style="width:60px;height:60px;border-radius:50%;"></div></div>';

        try {
            const module = this.pages[page].module();
            const html = await module.render(param);
            container.innerHTML = html;

            // After render hooks
            if (module.afterRender) {
                await module.afterRender(param);
            }
        } catch (err) {
            console.error(`Error rendering page ${page}:`, err);
            container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error Loading Page</div><div class="empty-state-text">${err.message}</div></div>`;
        }

        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('mobile-open');

        // Scroll to top
        container.scrollTo(0, 0);
    },
};
