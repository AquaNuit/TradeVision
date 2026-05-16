/**
 * TradeVision Pro — Auth Client
 * Handles local JWT authentication on the frontend side.
 * Token is stored in localStorage for persistence across sessions.
 */
const Auth = {
    TOKEN_KEY: 'tv_auth_token',
    USER_KEY: 'tv_auth_user',

    /** True when using the local FastAPI backend (dev) */
    _isLocalBackend() {
        const h = window.location.hostname;
        return h === 'localhost' || h === '127.0.0.1';
    },

    _b64url(bytes) {
        const u8 = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(bytes);
        let bin = '';
        for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },

    /** Mint JWT in the browser (matches serverless / FastAPI token format) */
    async _createAccessToken(username) {
        const now = Math.floor(Date.now() / 1000);
        const exp = now + (CONFIG.AUTH.TOKEN_EXPIRE_SECONDS || 86400);
        const header = this._b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = this._b64url(JSON.stringify({ sub: username, role: 'admin', exp, iat: now }));
        const msg = `${header}.${payload}`;
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(CONFIG.AUTH.SECRET_KEY),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
        return `${msg}.${this._b64url(new Uint8Array(sig))}`;
    },

    async _loginLocal(username, password) {
        if (username !== CONFIG.AUTH.ADMIN_USERNAME || password !== CONFIG.AUTH.ADMIN_PASSWORD) {
            throw new Error('Incorrect username or password');
        }
        const token = await this._createAccessToken(username);
        const user = {
            username: CONFIG.AUTH.ADMIN_USERNAME,
            email: CONFIG.AUTH.ADMIN_EMAIL,
            full_name: 'Admin',
            role: 'admin',
        };
        this._save(token, user);
        this.updateUI();
        this.hideLoginModal();
        Utils.toast('Welcome Back!', `Logged in as ${user.username}`, 'success');
        Router.navigate('overview');
        return { access_token: token, user };
    },

    /** Resolve API URLs (pretty /api path + direct function fallback on Netlify) */
    apiUrls(path) {
        const base = CONFIG.API.BACKEND_URL.replace(/\/$/, '');
        const clean = path.replace(/^\//, '');
        const urls = [`${base}/${clean}`];
        if (!base.startsWith('http')) {
            const fn = clean.replace(/\//g, '_').replace(/-/g, '_');
            urls.push(`/.netlify/functions/${fn}`);
        }
        return urls;
    },

    async _parseJsonResponse(res) {
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/json')) {
            const text = await res.text();
            if (text.trimStart().startsWith('<')) {
                throw new Error('API returned HTML instead of JSON. Redeploy the site with the latest Netlify config.');
            }
            throw new Error(text.slice(0, 120) || `Unexpected response (${res.status})`);
        }
        return res.json();
    },

    async _postWithFallback(path, options) {
        const urls = this.apiUrls(path);
        let lastError;
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            try {
                const res = await fetch(url, options);
                const ct = (res.headers.get('content-type') || '').toLowerCase();
                if (!ct.includes('application/json')) {
                    const peek = await res.clone().text();
                    if (peek.trimStart().startsWith('<') && i < urls.length - 1) continue;
                }
                return { res, url };
            } catch (e) {
                lastError = e;
            }
        }
        throw lastError || new Error('Could not reach the API');
    },

    /** Get stored token */
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    /** Get stored user */
    getUser() {
        const raw = localStorage.getItem(this.USER_KEY);
        return raw ? JSON.parse(raw) : null;
    },

    /** Check if user is logged in */
    isLoggedIn() {
        return !!this.getToken();
    },

    /** Save auth data */
    _save(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    /** Clear auth data */
    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        this.updateUI();
        Utils.toast('Logged Out', 'You have been signed out.', 'info');
        this.showLoginModal();
    },

    /** Login with username & password */
    async login(username, password) {
        try {
            // Netlify static hosting: mint JWT locally (Python functions often unavailable)
            if (!this._isLocalBackend()) {
                return await this._loginLocal(username, password);
            }

            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const { res } = await this._postWithFallback('auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            });

            if (!res.ok) {
                const err = await this._parseJsonResponse(res);
                throw new Error(err.detail || 'Login failed');
            }

            const data = await this._parseJsonResponse(res);
            this._save(data.access_token, data.user);
            this.updateUI();
            this.hideLoginModal();
            Utils.toast('Welcome Back!', `Logged in as ${data.user.username}`, 'success');
            Router.navigate('overview');
            return data;
        } catch (e) {
            Utils.toast('Login Failed', e.message, 'error');
            throw e;
        }
    },

    /** Refresh JWT (settings page) */
    async refreshToken() {
        const user = this.getUser();
        if (!user) throw new Error('Not logged in');

        if (!this._isLocalBackend()) {
            const token = await this._createAccessToken(user.username);
            this._save(token, user);
            return { access_token: token, user };
        }

        const res = await this.authFetch(`${CONFIG.API.BACKEND_URL}/auth/refresh`, { method: 'POST' });
        if (!res.ok) throw new Error('Token refresh failed');
        const data = await res.json();
        this._save(data.access_token, data.user);
        return data;
    },

    /** Register new user */
    async register(username, email, password, fullName) {
        if (!this._isLocalBackend()) {
            throw new Error('Registration is disabled on cloud. Use admin / tradevision2026.');
        }
        try {
            const { res } = await this._postWithFallback('auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, full_name: fullName }),
            });

            if (!res.ok) {
                const err = await this._parseJsonResponse(res);
                throw new Error(err.detail || 'Registration failed');
            }

            const data = await this._parseJsonResponse(res);
            Utils.toast('Account Created!', `Welcome ${username}! You can now login.`, 'success');
            return data;
        } catch (e) {
            Utils.toast('Registration Failed', e.message, 'error');
            throw e;
        }
    },

    /** Get auth headers for API calls */
    getHeaders() {
        const token = this.getToken();
        if (!token) return {};
        return { 'Authorization': `Bearer ${token}` };
    },

    /** Authenticated fetch wrapper */
    async authFetch(url, options = {}) {
        const headers = { ...this.getHeaders(), ...(options.headers || {}) };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            this.logout();
            throw new Error('Session expired. Please login again.');
        }
        return res;
    },

    /** Update sidebar UI with auth state */
    updateUI() {
        const user = this.getUser();
        const nameEl = document.querySelector('.user-name');
        const avatarEl = document.querySelector('.user-avatar');
        const planEl = document.querySelector('.user-plan');

        if (user && nameEl) {
            nameEl.textContent = user.full_name || user.username;
            planEl.textContent = user.role === 'admin' ? 'Admin' : 'Pro Plan';
            const initials = (user.full_name || user.username).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            avatarEl.textContent = initials;
        }
    },

    /** Show login modal */
    showLoginModal() {
        let modal = document.getElementById('auth-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'auth-modal';
            modal.innerHTML = `
                <div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);">
                    <div style="background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-xl);padding:40px;width:420px;max-width:90vw;box-shadow:var(--shadow-xl);position:relative;">
                        <div style="text-align:center;margin-bottom:28px;">
                            <div style="width:56px;height:56px;margin:0 auto 16px;border-radius:50%;background:linear-gradient(135deg,rgba(108,99,255,0.15),rgba(0,230,118,0.15));border:2px solid rgba(108,99,255,0.3);display:flex;align-items:center;justify-content:center;">
                                <svg viewBox="0 0 32 32" width="28" height="28" fill="none"><path d="M4 24L10 16L16 20L22 10L28 15" stroke="url(#lg)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="28" cy="15" r="2" fill="#00E676"/><defs><linearGradient id="lg" x1="4" y1="24" x2="28" y2="10"><stop stop-color="#6C63FF"/><stop offset="1" stop-color="#00E676"/></linearGradient></defs></svg>
                            </div>
                            <h2 style="font-size:var(--text-2xl);font-weight:800;margin-bottom:4px;">TradeVision Pro</h2>
                            <p style="font-size:var(--text-sm);color:var(--text-tertiary);">Sign in to access your dashboard</p>
                        </div>
                        
                        <div id="auth-login-form">
                            <div style="margin-bottom:14px;">
                                <label style="display:block;font-size:var(--text-xs);font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Username</label>
                                <input type="text" id="auth-username" value="admin" placeholder="Enter username" style="width:100%;padding:10px 14px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);font-size:var(--text-md);color:var(--text-primary);transition:border-color 0.2s;" onfocus="this.style.borderColor='var(--primary-500)'" onblur="this.style.borderColor='var(--border-subtle)'">
                            </div>
                            <div style="margin-bottom:20px;">
                                <label style="display:block;font-size:var(--text-xs);font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Password</label>
                                <input type="password" id="auth-password" value="tradevision2026" placeholder="Enter password" style="width:100%;padding:10px 14px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);font-size:var(--text-md);color:var(--text-primary);transition:border-color 0.2s;" onfocus="this.style.borderColor='var(--primary-500)'" onblur="this.style.borderColor='var(--border-subtle)'">
                            </div>
                            <button id="auth-login-btn" style="width:100%;padding:12px;background:var(--primary-500);color:#fff;border-radius:var(--radius-md);font-size:var(--text-md);font-weight:600;cursor:pointer;transition:all 0.2s;border:none;" onmouseover="this.style.background='var(--primary-600)';this.style.boxShadow='var(--shadow-glow-primary)'" onmouseout="this.style.background='var(--primary-500)';this.style.boxShadow='none'">
                                Sign In
                            </button>
                            <div style="text-align:center;margin-top:16px;">
                                <span style="font-size:var(--text-sm);color:var(--text-tertiary);">Don't have an account? </span>
                                <a href="#" id="auth-show-register" style="font-size:var(--text-sm);color:var(--primary-500);font-weight:500;cursor:pointer;">Create one</a>
                            </div>
                        </div>

                        <div id="auth-register-form" style="display:none;">
                            <div style="margin-bottom:12px;">
                                <label style="display:block;font-size:var(--text-xs);font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Full Name</label>
                                <input type="text" id="auth-reg-name" placeholder="Your name" style="width:100%;padding:10px 14px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);font-size:var(--text-md);color:var(--text-primary);">
                            </div>
                            <div style="margin-bottom:12px;">
                                <label style="display:block;font-size:var(--text-xs);font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Username</label>
                                <input type="text" id="auth-reg-username" placeholder="Choose username" style="width:100%;padding:10px 14px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);font-size:var(--text-md);color:var(--text-primary);">
                            </div>
                            <div style="margin-bottom:12px;">
                                <label style="display:block;font-size:var(--text-xs);font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Email</label>
                                <input type="email" id="auth-reg-email" placeholder="your@email.com" style="width:100%;padding:10px 14px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);font-size:var(--text-md);color:var(--text-primary);">
                            </div>
                            <div style="margin-bottom:20px;">
                                <label style="display:block;font-size:var(--text-xs);font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Password</label>
                                <input type="password" id="auth-reg-password" placeholder="Create password" style="width:100%;padding:10px 14px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);font-size:var(--text-md);color:var(--text-primary);">
                            </div>
                            <button id="auth-register-btn" style="width:100%;padding:12px;background:var(--accent-500);color:var(--bg-primary);border-radius:var(--radius-md);font-size:var(--text-md);font-weight:600;cursor:pointer;transition:all 0.2s;border:none;">
                                Create Account
                            </button>
                            <div style="text-align:center;margin-top:16px;">
                                <span style="font-size:var(--text-sm);color:var(--text-tertiary);">Already have an account? </span>
                                <a href="#" id="auth-show-login" style="font-size:var(--text-sm);color:var(--primary-500);font-weight:500;cursor:pointer;">Sign in</a>
                            </div>
                        </div>

                        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border-subtle);text-align:center;">
                            <p style="font-size:11px;color:var(--text-tertiary);line-height:1.6;">
                                🔒 All data stays on your machine.<br>
                                Tokens are generated locally using JWT.
                            </p>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(modal);

            // Bind events
            document.getElementById('auth-login-btn').addEventListener('click', async () => {
                const btn = document.getElementById('auth-login-btn');
                const username = document.getElementById('auth-username').value.trim();
                const password = document.getElementById('auth-password').value;
                if (!username || !password) return Utils.toast('Error', 'Enter username and password', 'error');
                btn.textContent = 'Signing in...';
                btn.disabled = true;
                try { await Auth.login(username, password); }
                catch(e) { btn.textContent = 'Sign In'; btn.disabled = false; }
            });

            document.getElementById('auth-password').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') document.getElementById('auth-login-btn').click();
            });

            document.getElementById('auth-register-btn').addEventListener('click', async () => {
                const name = document.getElementById('auth-reg-name').value.trim();
                const username = document.getElementById('auth-reg-username').value.trim();
                const email = document.getElementById('auth-reg-email').value.trim();
                const password = document.getElementById('auth-reg-password').value;
                if (!username || !email || !password) return Utils.toast('Error', 'Fill all fields', 'error');
                try {
                    await Auth.register(username, email, password, name);
                    document.getElementById('auth-login-form').style.display = '';
                    document.getElementById('auth-register-form').style.display = 'none';
                    document.getElementById('auth-username').value = username;
                    document.getElementById('auth-password').value = password;
                } catch(e) {}
            });

            document.getElementById('auth-show-register').addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('auth-login-form').style.display = 'none';
                document.getElementById('auth-register-form').style.display = '';
            });

            document.getElementById('auth-show-login').addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('auth-login-form').style.display = '';
                document.getElementById('auth-register-form').style.display = 'none';
            });
        }
        modal.style.display = '';
    },

    /** Hide login modal */
    hideLoginModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.style.display = 'none';
    },

    /** Initialize auth on app start */
    init() {
        if (!this.isLoggedIn()) {
            this.showLoginModal();
        } else {
            this.updateUI();
        }
    },
};
