/**
 * TradeVision Pro — Chart Components
 * Lightweight Charts integration for interactive trading charts
 */
const Charts = {
    instances: new Map(),

    /** Create a candlestick chart */
    createCandleChart(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;
        container.innerHTML = '';

        const chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: options.height || 400,
            layout: { background: { type: 'solid', color: '#14151F' }, textColor: '#A0A3BD', fontSize: 11, fontFamily: 'Inter, sans-serif' },
            grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal, vertLine: { color: 'rgba(108,99,255,0.4)', style: 2, width: 1 }, horzLine: { color: 'rgba(108,99,255,0.4)', style: 2, width: 1 } },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
            timeScale: { borderColor: 'rgba(255,255,255,0.06)', timeVisible: true },
            handleScroll: true, handleScale: true,
        });

        const candleSeries = chart.addCandlestickSeries({
            upColor: '#00E676', downColor: '#FF3D3D',
            borderUpColor: '#00E676', borderDownColor: '#FF3D3D',
            wickUpColor: '#00E676', wickDownColor: '#FF3D3D',
        });
        candleSeries.setData(data);

        // Add volume
        const volumeSeries = chart.addHistogramSeries({
            color: '#6C63FF', priceFormat: { type: 'volume' },
            priceScaleId: '', scaleMargins: { top: 0.85, bottom: 0 },
        });
        volumeSeries.setData(data.map(d => ({
            time: d.time, value: d.volume,
            color: d.close >= d.open ? 'rgba(0,230,118,0.3)' : 'rgba(255,61,61,0.3)',
        })));

        chart.timeScale().fitContent();

        // Responsive
        const resizeObserver = new ResizeObserver(() => {
            chart.applyOptions({ width: container.clientWidth });
        });
        resizeObserver.observe(container);

        this.instances.set(containerId, { chart, candleSeries, volumeSeries, resizeObserver });
        return chart;
    },

    /** Create a line chart (for equity curves, etc.) */
    createLineChart(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;
        container.innerHTML = '';

        const chart = LightweightCharts.createChart(container, {
            width: container.clientWidth, height: options.height || 300,
            layout: { background: { type: 'solid', color: '#14151F' }, textColor: '#A0A3BD', fontSize: 11, fontFamily: 'Inter, sans-serif' },
            grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
            timeScale: { borderColor: 'rgba(255,255,255,0.06)' },
        });

        const lineSeries = chart.addLineSeries({
            color: options.color || '#6C63FF', lineWidth: 2,
            lastValueVisible: true, priceLineVisible: false,
        });
        lineSeries.setData(data);

        if (options.area) {
            const areaSeries = chart.addAreaSeries({
                topColor: options.areaTopColor || 'rgba(108,99,255,0.3)',
                bottomColor: 'rgba(108,99,255,0.0)',
                lineColor: options.color || '#6C63FF', lineWidth: 2,
            });
            areaSeries.setData(data);
        }

        chart.timeScale().fitContent();
        const resizeObserver = new ResizeObserver(() => chart.applyOptions({ width: container.clientWidth }));
        resizeObserver.observe(container);
        this.instances.set(containerId, { chart, lineSeries, resizeObserver });
        return chart;
    },

    /** Create mini sparkline */
    createSparkline(containerId, data, color = '#6C63FF') {
        const container = document.getElementById(containerId);
        if (!container) return null;
        container.innerHTML = '';

        const chart = LightweightCharts.createChart(container, {
            width: container.clientWidth, height: 40,
            layout: { background: { type: 'solid', color: 'transparent' }, textColor: 'transparent' },
            grid: { vertLines: { visible: false }, horzLines: { visible: false } },
            rightPriceScale: { visible: false }, timeScale: { visible: false },
            handleScroll: false, handleScale: false, crosshair: { mode: 0 },
        });

        const series = chart.addAreaSeries({
            topColor: color.replace(')', ',0.3)').replace('rgb', 'rgba'),
            bottomColor: 'transparent', lineColor: color, lineWidth: 1.5,
            crosshairMarkerVisible: false,
        });
        series.setData(data);
        chart.timeScale().fitContent();
        return chart;
    },

    /** Destroy a chart instance */
    destroy(containerId) {
        const instance = this.instances.get(containerId);
        if (instance) {
            instance.resizeObserver?.disconnect();
            instance.chart?.remove();
            this.instances.delete(containerId);
        }
    },

    /** Destroy all */
    destroyAll() {
        this.instances.forEach((_, id) => this.destroy(id));
    },
};
