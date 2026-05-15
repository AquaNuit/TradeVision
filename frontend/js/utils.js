/**
 * TradeVision Pro — Utility Functions
 */
const Utils = {
    /** Format a number as currency */
    formatCurrency(value, currency = '₹', decimals = 2) {
        if (value == null || isNaN(value)) return `${currency}0.00`;
        const absVal = Math.abs(value);
        let formatted;
        if (absVal >= 1e7) formatted = (value / 1e7).toFixed(2) + 'Cr';
        else if (absVal >= 1e5) formatted = (value / 1e5).toFixed(2) + 'L';
        else formatted = value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        return `${currency}${formatted}`;
    },

    /** Format percentage */
    formatPercent(value, decimals = 2) {
        if (value == null || isNaN(value)) return '0.00%';
        return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
    },

    /** Format large numbers */
    formatVolume(value) {
        if (!value) return '0';
        if (value >= 1e7) return (value / 1e7).toFixed(2) + 'Cr';
        if (value >= 1e5) return (value / 1e5).toFixed(2) + 'L';
        if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
        return value.toString();
    },

    /** Get CSS class for positive/negative values */
    trendClass(value) {
        if (value > 0) return 'up';
        if (value < 0) return 'down';
        return 'neutral';
    },

    /** Generate score ring SVG */
    scoreRingSVG(score, size = 60, strokeWidth = 4) {
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (score / 100) * circumference;
        let color = '#FF3D3D';
        if (score >= 70) color = '#00E676';
        else if (score >= 40) color = '#FFA726';
        return `
            <div class="score-ring" style="width:${size}px;height:${size}px;">
                <svg width="${size}" height="${size}">
                    <circle class="bg-ring" cx="${size/2}" cy="${size/2}" r="${radius}"/>
                    <circle class="value-ring" cx="${size/2}" cy="${size/2}" r="${radius}" 
                        stroke="${color}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
                </svg>
                <span class="score-value" style="color:${color}">${score}</span>
            </div>`;
    },

    /** Debounce function */
    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    /** Time ago */
    timeAgo(date) {
        const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    },

    /** Generate unique ID */
    uid() { return Math.random().toString(36).substring(2, 10); },

    /** Show toast notification */
    toast(title, message, type = 'info') {
        const container = document.getElementById('toast-container');
        const iconMap = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i data-lucide="${iconMap[type]}" class="toast-icon"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <i data-lucide="x" class="toast-close" onclick="this.closest('.toast').remove()"></i>`;
        container.appendChild(toast);
        lucide.createIcons({ nodes: [toast] });
        setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 4000);
    },

    /** Simple template engine */
    html(strings, ...values) {
        return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
    },

    /** Parse exchange from symbol */
    parseSymbol(symbol) {
        if (symbol.endsWith('.NS')) return { symbol: symbol.replace('.NS', ''), exchange: 'NSE' };
        if (symbol.endsWith('.BO')) return { symbol: symbol.replace('.BO', ''), exchange: 'BSE' };
        if (symbol.endsWith('-USD')) return { symbol: symbol.replace('-USD', ''), exchange: 'CRYPTO' };
        return { symbol, exchange: 'US' };
    },

    /** Generate random number between min and max */
    rand(min, max) { return Math.random() * (max - min) + min; },
    randInt(min, max) { return Math.floor(Utils.rand(min, max + 1)); },
};
