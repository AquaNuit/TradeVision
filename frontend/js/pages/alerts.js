/**
 * TradeVision Pro — Alerts Page
 */
const AlertsPage = {
    alerts: JSON.parse(localStorage.getItem('tv_alerts') || 'null') || [
        { id: '1', symbol: 'RELIANCE', type: 'breakout', title: 'Breakout Alert', desc: 'RELIANCE broke above ₹2,850 resistance with 2.3x volume', time: new Date(Date.now() - 300000).toISOString(), active: true },
        { id: '2', symbol: 'TCS', type: 'volume', title: 'Volume Spike', desc: 'TCS volume surged 3.1x above average at ₹4,120', time: new Date(Date.now() - 900000).toISOString(), active: true },
        { id: '3', symbol: 'INFY', type: 'reversal', title: 'Trend Reversal', desc: 'INFY RSI crossed above 30 from oversold territory', time: new Date(Date.now() - 1800000).toISOString(), active: true },
        { id: '4', symbol: 'HDFCBANK', type: 'price', title: 'Price Target Hit', desc: 'HDFCBANK reached target 1 at ₹1,695', time: new Date(Date.now() - 3600000).toISOString(), active: false },
        { id: '5', symbol: 'TATAMOTORS', type: 'breakout', title: 'Breakout Alert', desc: 'TATAMOTORS crossed above EMA 200 at ₹985', time: new Date(Date.now() - 7200000).toISOString(), active: true },
    ],

    render() {
        const active = this.alerts.filter(a => a.active);
        const inactive = this.alerts.filter(a => !a.active);

        return `
        <div class="animate-fadeIn">
            <div class="alerts-header">
                <div>
                    <h2 style="font-size:var(--text-2xl);font-weight:700;margin-bottom:4px;">Alerts Center</h2>
                    <p class="text-sm text-secondary">${active.length} active alerts</p>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-primary" id="create-alert-btn"><i data-lucide="plus" style="width:14px;height:14px"></i> New Alert</button>
                    <button class="btn btn-ghost" id="clear-all-alerts"><i data-lucide="trash-2" style="width:14px;height:14px"></i> Clear All</button>
                </div>
            </div>

            <!-- Alert Config Card -->
            <div class="card" style="margin-bottom:20px;" id="alert-config-card" style="display:none;">
                <div class="card-title" style="margin-bottom:16px;">Create New Alert</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end;">
                    <div class="form-group">
                        <label class="form-label">Symbol</label>
                        <input type="text" class="form-input" id="alert-symbol" placeholder="e.g., RELIANCE">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Condition</label>
                        <select class="form-input" id="alert-condition">
                            <option value="breakout">Breakout above resistance</option>
                            <option value="breakdown">Breakdown below support</option>
                            <option value="volume">Volume spike (2x+)</option>
                            <option value="rsi_oversold">RSI below 30</option>
                            <option value="rsi_overbought">RSI above 70</option>
                            <option value="macd_cross">MACD crossover</option>
                            <option value="price_above">Price above target</option>
                            <option value="price_below">Price below target</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Channel</label>
                        <select class="form-input" id="alert-channel">
                            <option value="browser">Browser Notification</option>
                            <option value="email">Email</option>
                            <option value="telegram">Telegram</option>
                        </select>
                    </div>
                    <button class="btn btn-success" id="save-alert-btn"><i data-lucide="check" style="width:14px;height:14px"></i> Save</button>
                </div>
            </div>

            <!-- Notification Settings -->
            <div class="card" style="margin-bottom:20px;">
                <div class="card-title" style="margin-bottom:12px;"><i data-lucide="settings" style="width:16px;height:16px"></i> Notification Channels</div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md);">
                        <div style="display:flex;align-items:center;gap:10px;"><i data-lucide="globe" style="width:18px;height:18px;color:var(--primary-500)"></i><div><div class="text-sm font-medium">Browser</div><div class="text-xs text-tertiary">Push notifications</div></div></div>
                        <div class="toggle active" id="toggle-browser" onclick="this.classList.toggle('active')"></div>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md);">
                        <div style="display:flex;align-items:center;gap:10px;"><i data-lucide="mail" style="width:18px;height:18px;color:var(--info-500)"></i><div><div class="text-sm font-medium">Email</div><div class="text-xs text-tertiary">Configure in settings</div></div></div>
                        <div class="toggle" id="toggle-email" onclick="this.classList.toggle('active')"></div>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md);">
                        <div style="display:flex;align-items:center;gap:10px;"><i data-lucide="send" style="width:18px;height:18px;color:var(--info-400)"></i><div><div class="text-sm font-medium">Telegram</div><div class="text-xs text-tertiary">Bot integration</div></div></div>
                        <div class="toggle" id="toggle-telegram" onclick="this.classList.toggle('active')"></div>
                    </div>
                </div>
            </div>

            <!-- Active Alerts -->
            <div class="card" style="margin-bottom:16px;">
                <div class="card-header">
                    <span class="card-title"><i data-lucide="bell-ring" style="width:16px;height:16px"></i> Active Alerts</span>
                    <span class="badge badge-buy">${active.length}</span>
                </div>
                <div class="alert-list">
                    ${active.map(a => this.renderAlert(a)).join('')}
                    ${active.length === 0 ? '<div class="empty-state" style="padding:30px;"><div class="text-sm text-tertiary">No active alerts</div></div>' : ''}
                </div>
            </div>

            <!-- History -->
            <div class="card">
                <div class="card-header">
                    <span class="card-title" style="color:var(--text-tertiary);"><i data-lucide="history" style="width:16px;height:16px"></i> Alert History</span>
                </div>
                <div class="alert-list">
                    ${inactive.map(a => this.renderAlert(a)).join('')}
                    ${inactive.length === 0 ? '<div class="text-sm text-tertiary" style="padding:16px;">No history</div>' : ''}
                </div>
            </div>
        </div>`;
    },

    renderAlert(a) {
        return `
        <div class="alert-item ${a.active ? '' : 'style="opacity:0.5;"'}">
            <div class="alert-type-icon ${a.type}"><i data-lucide="${a.type==='breakout'?'arrow-up-right':a.type==='volume'?'bar-chart-3':a.type==='reversal'?'refresh-cw':'target'}" style="width:18px;height:18px"></i></div>
            <div class="alert-content">
                <div class="alert-title">${a.title} — ${a.symbol}</div>
                <div class="alert-desc">${a.desc}</div>
            </div>
            <span class="alert-time">${Utils.timeAgo(a.time)}</span>
            <div class="alert-actions">
                <button class="btn btn-ghost btn-sm" onclick="AlertsPage.toggleAlert('${a.id}')">${a.active ? 'Dismiss' : 'Reactivate'}</button>
            </div>
        </div>`;
    },

    toggleAlert(id) {
        const alert = this.alerts.find(a => a.id === id);
        if (alert) { alert.active = !alert.active; localStorage.setItem('tv_alerts', JSON.stringify(this.alerts)); Router.navigate('alerts'); }
    },

    afterRender() {
        document.getElementById('create-alert-btn')?.addEventListener('click', () => {
            const card = document.getElementById('alert-config-card');
            card.style.display = card.style.display === 'none' ? '' : 'none';
        });
        document.getElementById('save-alert-btn')?.addEventListener('click', () => {
            const symbol = document.getElementById('alert-symbol')?.value?.toUpperCase();
            const condition = document.getElementById('alert-condition')?.value;
            if (symbol) {
                this.alerts.unshift({ id: Utils.uid(), symbol, type: condition.includes('volume')?'volume':condition.includes('rsi')?'reversal':'breakout', title: `${condition} Alert`, desc: `${symbol} — ${condition} condition monitored`, time: new Date().toISOString(), active: true });
                localStorage.setItem('tv_alerts', JSON.stringify(this.alerts));
                Utils.toast('Alert Created', `Monitoring ${symbol} for ${condition}`, 'success');
                Router.navigate('alerts');
            }
        });
        document.getElementById('clear-all-alerts')?.addEventListener('click', () => {
            this.alerts = []; localStorage.setItem('tv_alerts', JSON.stringify(this.alerts));
            Router.navigate('alerts');
        });
        lucide.createIcons();
    },
};
