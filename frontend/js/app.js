/**
 * TradeVision Pro — Main Application Entry Point
 */
(function() {
    'use strict';

    /** Initialize the application */
    async function init() {
        // Wait for splash animation
        await new Promise(r => setTimeout(r, 2200));

        // Hide splash, show app
        document.getElementById('splash-loader').classList.add('hidden');
        document.getElementById('app').style.display = '';

        // Initialize Lucide icons
        lucide.createIcons();

        // Initialize auth — show login modal if not logged in
        Auth.init();

        // Bind navigation
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                Router.navigate(item.dataset.page);
            });
        });

        // Sidebar toggle
        document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        // Mobile menu
        document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('mobile-open');
        });

        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            const icon = document.querySelector('#theme-toggle i');
            if (icon) {
                icon.setAttribute('data-lucide', isLight ? 'sun' : 'moon');
                lucide.createIcons({ nodes: [document.getElementById('theme-toggle')] });
            }
        });

        // Notifications
        document.getElementById('notification-btn')?.addEventListener('click', () => {
            Utils.toast('Notifications', 'No new alerts at this time.', 'info');
        });

        // Global search
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        const searchData = [
            ...CONFIG.STOCK_UNIVERSE.NSE.map(s => ({ symbol: s, exchange: 'NSE', name: s })),
            ...CONFIG.STOCK_UNIVERSE.BSE.map(s => ({ symbol: s, exchange: 'BSE', name: s })),
        ];

        searchInput?.addEventListener('input', Utils.debounce((e) => {
            const query = e.target.value.toUpperCase().trim();
            if (!query) { searchResults.classList.remove('active'); return; }
            const matches = searchData.filter(s => s.symbol.includes(query)).slice(0, 8);
            if (matches.length) {
                searchResults.innerHTML = matches.map(m => `
                    <div class="search-result-item" data-symbol="${m.symbol}" data-exchange="${m.exchange}">
                        <span class="search-result-symbol">${m.symbol}</span>
                        <span class="search-result-name">${m.name}</span>
                        <span class="search-result-exchange">${m.exchange}</span>
                    </div>`).join('');
                searchResults.classList.add('active');

                searchResults.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        Router.navigate('analysis', item.dataset.symbol);
                        searchResults.classList.remove('active');
                        searchInput.value = '';
                    });
                });
            } else {
                searchResults.innerHTML = '<div style="padding:16px;text-align:center;" class="text-sm text-tertiary">No results found</div>';
                searchResults.classList.add('active');
            }
        }, 200));

        // Close search on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.global-search')) searchResults.classList.remove('active');
        });

        // Command palette (Ctrl/Cmd + K)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const palette = document.getElementById('command-palette');
                palette.style.display = palette.style.display === 'none' ? '' : 'none';
                if (palette.style.display !== 'none') {
                    document.getElementById('command-input')?.focus();
                }
            }
            if (e.key === 'Escape') {
                document.getElementById('command-palette').style.display = 'none';
            }
        });

        // Command palette overlay click
        document.querySelector('.command-palette-overlay')?.addEventListener('click', () => {
            document.getElementById('command-palette').style.display = 'none';
        });

        // Command palette search
        const commandInput = document.getElementById('command-input');
        const commandResults = document.getElementById('command-results');
        const commands = [
            { icon: 'layout-dashboard', label: 'Market Overview', action: () => Router.navigate('overview') },
            { icon: 'scan-search', label: 'Live Scanner', action: () => Router.navigate('scanner') },
            { icon: 'zap', label: 'Trade Signals', action: () => Router.navigate('signals') },
            { icon: 'star', label: 'Watchlist', action: () => Router.navigate('watchlist') },
            { icon: 'brain', label: 'AI Analysis', action: () => Router.navigate('analysis') },
            { icon: 'flask-conical', label: 'Backtesting', action: () => Router.navigate('backtest') },
            { icon: 'bell-ring', label: 'Alerts', action: () => Router.navigate('alerts') },
            { icon: 'settings', label: 'Settings', action: () => Router.navigate('settings') },
        ];

        function renderCommands(filter = '') {
            const filtered = filter ? commands.filter(c => c.label.toLowerCase().includes(filter.toLowerCase())) : commands;
            commandResults.innerHTML = filtered.map(c => `
                <div class="command-result-item" data-label="${c.label}">
                    <i data-lucide="${c.icon}" style="width:16px;height:16px;color:var(--text-tertiary);"></i>
                    <span class="text-sm">${c.label}</span>
                </div>`).join('');
            lucide.createIcons({ nodes: [commandResults] });
            commandResults.querySelectorAll('.command-result-item').forEach((item, i) => {
                item.addEventListener('click', () => {
                    commands.find(c => c.label === item.dataset.label)?.action();
                    document.getElementById('command-palette').style.display = 'none';
                    commandInput.value = '';
                });
            });
        }

        commandInput?.addEventListener('input', (e) => renderCommands(e.target.value));
        renderCommands();

        // Update market status
        updateMarketStatus();
        setInterval(updateMarketStatus, 60000);

        // Navigate to initial page
        Router.navigate('overview');
    }

    /** Check if markets are open */
    function updateMarketStatus() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const day = now.getDay();
        const isWeekday = day >= 1 && day <= 5;
        const nseOpen = isWeekday && ((hours === 9 && minutes >= 15) || (hours > 9 && hours < 15) || (hours === 15 && minutes <= 30));

        const dot = document.querySelector('.status-dot');
        const text = document.querySelector('.status-text');
        if (dot && text) {
            dot.className = `status-dot ${nseOpen ? 'open' : 'closed'}`;
            text.textContent = nseOpen ? 'Markets Open' : 'Markets Closed';
        }
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
