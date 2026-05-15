/**
 * TradeVision Pro — Settings Page
 * Shows local token info, API key management, and configuration.
 */
const SettingsPage = {
    render() {
        const user = Auth.getUser();
        const token = Auth.getToken();
        const tokenPreview = token ? token.substring(0, 20) + '...' + token.substring(token.length - 10) : 'Not logged in';

        return `
        <div class="animate-fadeIn">
            <h2 style="font-size:var(--text-2xl);font-weight:700;margin-bottom:20px;">Settings</h2>
            <div class="settings-grid">
                <div class="card" style="padding:12px;">
                    <div class="settings-nav">
                        <div class="settings-nav-item active" onclick="this.parentElement.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.remove('active'));this.classList.add('active');">General</div>
                        <div class="settings-nav-item" onclick="this.parentElement.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.remove('active'));this.classList.add('active');">Authentication</div>
                        <div class="settings-nav-item" onclick="this.parentElement.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.remove('active'));this.classList.add('active');">API Keys</div>
                        <div class="settings-nav-item" onclick="this.parentElement.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.remove('active'));this.classList.add('active');">Notifications</div>
                        <div class="settings-nav-item" onclick="this.parentElement.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.remove('active'));this.classList.add('active');">Account</div>
                    </div>
                </div>
                <div>
                    <!-- Auth & Token Section -->
                    <div class="card" style="margin-bottom:16px;">
                        <div class="settings-section">
                            <div class="settings-section-title" style="display:flex;align-items:center;gap:8px;">
                                <i data-lucide="shield-check" style="width:18px;height:18px;color:var(--primary-500);"></i>
                                Local Authentication
                            </div>
                            <div style="background:var(--bg-tertiary);border-radius:var(--radius-lg);padding:16px;margin-bottom:16px;">
                                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                                    <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--primary-500),var(--accent-500));display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px;">
                                        ${user ? (user.full_name || user.username).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                                    </div>
                                    <div>
                                        <div class="font-semibold">${user ? (user.full_name || user.username) : 'Not logged in'}</div>
                                        <div class="text-xs text-tertiary">${user ? user.email : ''} • ${user ? user.role : ''}</div>
                                    </div>
                                    <span class="badge badge-buy" style="margin-left:auto;">Authenticated</span>
                                </div>
                            </div>

                            <div class="settings-row">
                                <div class="settings-row-info">
                                    <div class="settings-row-label">JWT Token</div>
                                    <div class="settings-row-desc">Your local authentication token (stored in browser)</div>
                                </div>
                                <div style="display:flex;gap:8px;align-items:center;">
                                    <code style="font-size:11px;color:var(--text-tertiary);background:var(--bg-tertiary);padding:4px 8px;border-radius:4px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;">${tokenPreview}</code>
                                    <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText(Auth.getToken());Utils.toast('Copied','Token copied to clipboard','success')">Copy</button>
                                </div>
                            </div>
                            <div class="settings-row">
                                <div class="settings-row-info">
                                    <div class="settings-row-label">Token Type</div>
                                    <div class="settings-row-desc">How your token is generated and stored</div>
                                </div>
                                <span class="text-sm text-secondary">JWT (HS256) — Local Only</span>
                            </div>
                            <div class="settings-row">
                                <div class="settings-row-info">
                                    <div class="settings-row-label">Token Expiry</div>
                                    <div class="settings-row-desc">Token auto-renews on refresh</div>
                                </div>
                                <span class="text-sm text-secondary">24 hours</span>
                            </div>
                            <div class="settings-row">
                                <div class="settings-row-info">
                                    <div class="settings-row-label">Refresh Token</div>
                                    <div class="settings-row-desc">Generate a new token with current session</div>
                                </div>
                                <button class="btn btn-primary btn-sm" id="refresh-token-btn">
                                    <i data-lucide="refresh-cw" style="width:12px;height:12px;"></i> Refresh
                                </button>
                            </div>
                            <div class="settings-row" style="border-bottom:none;">
                                <div class="settings-row-info">
                                    <div class="settings-row-label" style="color:var(--bear);">Logout</div>
                                    <div class="settings-row-desc">Clear token and sign out</div>
                                </div>
                                <button class="btn btn-danger btn-sm" onclick="Auth.logout()">
                                    <i data-lucide="log-out" style="width:12px;height:12px;"></i> Sign Out
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- General Settings -->
                    <div class="card" style="margin-bottom:16px;">
                        <div class="settings-section">
                            <div class="settings-section-title">General Settings</div>
                            <div class="settings-row">
                                <div class="settings-row-info"><div class="settings-row-label">Default Exchange</div><div class="settings-row-desc">Primary exchange for scanning and analysis</div></div>
                                <select class="form-input" style="min-width:150px;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);">
                                    <option>NSE</option><option>BSE</option><option>NASDAQ</option><option>Crypto</option><option>Forex</option>
                                </select>
                            </div>
                            <div class="settings-row">
                                <div class="settings-row-info"><div class="settings-row-label">Default Timeframe</div><div class="settings-row-desc">Default chart timeframe</div></div>
                                <select class="form-input" style="min-width:150px;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);">
                                    <option>1D</option><option>4H</option><option>1H</option><option>15m</option><option>5m</option>
                                </select>
                            </div>
                            <div class="settings-row">
                                <div class="settings-row-info"><div class="settings-row-label">Auto-refresh Data</div><div class="settings-row-desc">Automatically refresh market data</div></div>
                                <div class="toggle active" onclick="this.classList.toggle('active')"></div>
                            </div>
                            <div class="settings-row" style="border-bottom:none;">
                                <div class="settings-row-info"><div class="settings-row-label">Sound Alerts</div><div class="settings-row-desc">Play sound when alerts trigger</div></div>
                                <div class="toggle" onclick="this.classList.toggle('active')"></div>
                            </div>
                        </div>
                    </div>

                    <!-- API Keys -->
                    <div class="card" style="margin-bottom:16px;">
                        <div class="settings-section">
                            <div class="settings-section-title" style="display:flex;align-items:center;gap:8px;">
                                <i data-lucide="key" style="width:18px;height:18px;color:var(--warning-500);"></i>
                                API Keys <span class="text-xs text-tertiary font-normal">(stored in backend/.env)</span>
                            </div>
                            <div style="background:rgba(108,99,255,0.08);border:1px solid rgba(108,99,255,0.2);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:16px;">
                                <div class="text-sm" style="color:var(--primary-500);font-weight:500;margin-bottom:4px;">🔒 All keys stored locally</div>
                                <div class="text-xs text-secondary">API keys are saved in <code style="background:var(--bg-tertiary);padding:1px 4px;border-radius:3px;">backend/.env</code> file on your machine. Never sent to any external server.</div>
                            </div>
                            <div class="settings-row">
                                <div class="settings-row-info"><div class="settings-row-label">Alpha Vantage API Key</div><div class="settings-row-desc">Free key from <a href="https://www.alphavantage.co/support/#api-key" target="_blank" style="color:var(--primary-500);">alphavantage.co</a></div></div>
                                <input type="password" class="form-input" id="setting-av-key" placeholder="Enter API key" style="min-width:220px;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);">
                            </div>
                            <div class="settings-row">
                                <div class="settings-row-info"><div class="settings-row-label">Telegram Bot Token</div><div class="settings-row-desc">Create via <a href="https://t.me/BotFather" target="_blank" style="color:var(--primary-500);">@BotFather</a> on Telegram</div></div>
                                <input type="password" class="form-input" id="setting-tg-token" placeholder="Enter bot token" style="min-width:220px;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);">
                            </div>
                            <div class="settings-row" style="border-bottom:none;">
                                <div class="settings-row-info"><div class="settings-row-label">Telegram Chat ID</div><div class="settings-row-desc">Get via <a href="https://t.me/userinfobot" target="_blank" style="color:var(--primary-500);">@userinfobot</a></div></div>
                                <input type="text" class="form-input" id="setting-tg-chatid" placeholder="Enter chat ID" style="min-width:220px;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);">
                            </div>
                        </div>
                    </div>

                    <!-- API Documentation -->
                    <div class="card">
                        <div class="settings-section" style="margin-bottom:0;">
                            <div class="settings-section-title" style="display:flex;align-items:center;gap:8px;">
                                <i data-lucide="book-open" style="width:18px;height:18px;color:var(--info-500);"></i>
                                API Documentation
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                <a href="/api/docs" target="_blank" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg-tertiary);border-radius:var(--radius-md);border:1px solid var(--border-subtle);transition:all 0.2s;cursor:pointer;text-decoration:none;" onmouseover="this.style.borderColor='var(--primary-500)'" onmouseout="this.style.borderColor='var(--border-subtle)'">
                                    <i data-lucide="code-2" style="width:20px;height:20px;color:var(--primary-500);"></i>
                                    <div><div class="text-sm font-semibold">Swagger UI</div><div class="text-xs text-tertiary">Interactive API docs</div></div>
                                </a>
                                <a href="/api/redoc" target="_blank" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg-tertiary);border-radius:var(--radius-md);border:1px solid var(--border-subtle);transition:all 0.2s;cursor:pointer;text-decoration:none;" onmouseover="this.style.borderColor='var(--accent-500)'" onmouseout="this.style.borderColor='var(--border-subtle)'">
                                    <i data-lucide="file-text" style="width:20px;height:20px;color:var(--accent-500);"></i>
                                    <div><div class="text-sm font-semibold">ReDoc</div><div class="text-xs text-tertiary">Formatted API reference</div></div>
                                </a>
                            </div>
                            <div style="margin-top:16px;padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md);font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);line-height:1.8;">
                                <div style="color:var(--text-tertiary);margin-bottom:4px;"># Quick API test with your token:</div>
                                <div>curl -H "Authorization: Bearer &lt;your-token&gt;" \\</div>
                                <div style="padding-left:20px;">http://localhost:8000/api/auth/me</div>
                            </div>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
                        <button class="btn btn-ghost">Reset Defaults</button>
                        <button class="btn btn-primary" onclick="Utils.toast('Settings Saved','Your settings have been updated','success')">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>`;
    },

    afterRender() {
        // Refresh token button
        document.getElementById('refresh-token-btn')?.addEventListener('click', async () => {
            try {
                const res = await Auth.authFetch(`${CONFIG.API.BACKEND_URL}/auth/refresh`, { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    Auth._save(data.access_token, data.user);
                    Utils.toast('Token Refreshed', 'New token generated successfully', 'success');
                    Router.navigate('settings');
                }
            } catch(e) {
                Utils.toast('Error', e.message, 'error');
            }
        });
        lucide.createIcons();
    },
};
