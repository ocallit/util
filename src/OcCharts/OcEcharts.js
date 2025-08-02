/**
 *  OcEcharts/OcEcharts.js
 *  @version 3.0.0
 */

class OcEcharts {
    constructor(containerSelector, apiUrl, initialParams = {}) {
        this.chart = null;
        this.chartContainer = document.querySelector(containerSelector);
        this.loading = this.chartContainer.querySelector('.ocProductSales_loading');
        this.apiUrl = apiUrl;

        // Store current parameters for API calls - no defaults, just what caller provides
        this.currentParams = {...initialParams};

        this.seriesConfig = {};
        this.currentData = {};

        this.setupFetchOverride();
        this.initializeChart();

        // Load initial data
        this.loadInitialData();
    }

    setupFetchOverride() {
        const originalFetch = window.fetch;
        window.fetch = (url, options) => {
            if(url.includes('?test=true') || url.includes('&test=true')) {
                return this.mockAPIResponse(url, options);
            }
            return originalFetch(url, options);
        };
    }

    mockAPIResponse(url, options) {
        // Parse the request body to get current parameters
        let requestParams = {};
        if(options && options.body) {
            try {
                requestParams = JSON.parse(options.body);
            } catch(e) {
                console.log('Could not parse request body:', options.body);
            }
        }

        console.log('Mock API call with params:', requestParams);

        // Mock series configuration - dynamically based on requested products
        const mockSeriesConfig = {
            "Producto Alpha (USD)": {
                "color": "#00008b",
                "yAxis": 0,
                "lineType": "solid",
                "connectNulls": true
            },
            "Producto Beta (Piezas)": {
                "color": "#4682b4",
                "yAxis": 1,
                "lineType": "solid",
                "connectNulls": false
            },
            "Producto Gamma (USD)": {
                "color": "#ff6b35",
                "yAxis": 0,
                "lineType": "solid"
            }
        };

        // Add forecast series if requested
        if(requestParams.includeForecasts !== false) {
            mockSeriesConfig["Producto Alpha Forecast (USD)"] = {
                "color": "#00008b",
                "yAxis": 0,
                "lineType": "dashed"
            };
            mockSeriesConfig["Producto Beta Forecast (Piezas)"] = {
                "color": "#4682b4",
                "yAxis": 1,
                "lineType": "dashed"
            };
            mockSeriesConfig["Producto Gamma Forecast (USD)"] = {
                "color": "#ff6b35",
                "yAxis": 0,
                "lineType": "dashed"
            };
        }

        // Mock time series data - filter by date range if specified
        const allMockData = {
            "Producto Alpha (USD)": [
                ["2024-01-01", 15000], ["2024-02-01", 18000], ["2024-03-01", null],
                ["2024-04-01", 19000], ["2024-05-01", 25000], ["2024-06-01", 28000],
                ["2024-07-01", 32000], ["2024-08-01", 29000]
            ],
            "Producto Beta (Piezas)": [
                ["2024-01-01", 1200], ["2024-02-01", 1400], ["2024-03-01", null],
                ["2024-04-01", 1500], ["2024-05-01", 1700], ["2024-06-01", 2000],
                ["2024-07-01", 2200], ["2024-08-01", 1900]
            ],
            "Producto Gamma (USD)": [
                ["2024-01-01", 8000], ["2024-02-01", 9500], ["2024-03-01", 0],
                ["2024-04-01", 10500], ["2024-05-01", 12000], ["2024-06-01", 13500],
                ["2024-07-01", 15000], ["2024-08-01", 14200]
            ],
            "Producto Alpha Forecast (USD)": [
                ["2024-09-01", 33500], ["2024-10-01", 35200], ["2024-11-01", 37800],
                ["2024-12-01", 36400], ["2025-01-01", 39100], ["2025-02-01", 41000]
            ],
            "Producto Beta Forecast (Piezas)": [
                ["2024-09-01", 2350], ["2024-10-01", 2480], ["2024-11-01", 2620],
                ["2024-12-01", 2580], ["2025-01-01", 2710], ["2025-02-01", 2850]
            ],
            "Producto Gamma Forecast (USD)": [
                ["2024-09-01", 16200], ["2024-10-01", 17100], ["2024-11-01", 18500],
                ["2024-12-01", 17800], ["2025-01-01", 19200], ["2025-02-01", 20100]
            ]
        };

        // Filter series data based on date range
        const filteredData = {};
        const dateFrom = requestParams.dateFrom ? new Date(requestParams.dateFrom) : null;
        const dateTo = requestParams.dateTo ? new Date(requestParams.dateTo) : null;

        for(const [seriesName, points] of Object.entries(allMockData)) {
            // Skip forecast series if not requested
            if(seriesName.includes('Forecast') && requestParams.includeForecasts === false) {
                continue;
            }

            // Filter by product selection if specified
            if(requestParams.products && requestParams.products.length > 0) {
                const matchesProduct = requestParams.products.some(product =>
                    seriesName.toLowerCase().includes(product.toLowerCase())
                );
                if(!matchesProduct) {
                    continue;
                }
            }

            // Filter by date range
            filteredData[seriesName] = points.filter(([dateStr, value]) => {
                const pointDate = new Date(dateStr);
                if(dateFrom && pointDate < dateFrom) return false;
                if(dateTo && pointDate > dateTo) return false;
                return true;
            });
        }

        if(url.includes('config') || url.includes('page')) {
            // Initial page configuration
            const mockResponse = {
                success: true,
                error: null,
                data: {
                    series_config: mockSeriesConfig,
                    available_products: ["Alpha", "Beta", "Gamma"],
                    available_currencies: ["USD", "EUR", "MXN"],
                    date_range: {
                        min: "2024-01-01",
                        max: "2025-02-01"
                    }
                }
            };
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });
        } else {
            // Chart data response
            const mockResponse = {
                success: true,
                error: null,
                data: {
                    series: filteredData,
                    unit_left: requestParams.currency || "USD",
                    unit_right: "Piezas",
                    period: `${dateFrom ? dateFrom.toISOString().split('T')[0] : '2024-01-01'} to ${dateTo ? dateTo.toISOString().split('T')[0] : '2025-02-01'}`,
                    applied_filters: requestParams
                }
            };
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });
        }
    }

    initializeChart() {
        this.chart = echarts.init(this.chartContainer);

        // Set loading state
        this.chart.showLoading({
            text: 'Cargando datos...',
            color: '#00008b',
            textColor: '#212529',
            maskColor: 'rgba(255, 255, 255, 0.8)'
        });
    }

    async loadInitialData() {
        try {
            // Get initial configuration from server
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    action: 'config',
                    ...this.currentParams,
                    test: true // For mock response
                })
            });

            const pageData = await response.json();

            if(pageData.success) {
                this.seriesConfig = pageData.data.series_config || {};
                console.log('Series config loaded:', this.seriesConfig);
            }

            // Load chart data with current parameters
            await this.updateChart(this.currentParams);
        } catch(error) {
            console.error('Error loading initial data:', error);
            this.showError('Error al cargar los datos iniciales');
        }
    }

    // Main method to update chart with new parameters
    async updateChart(newParams = {}) {
        // Replace current parameters with exactly what user sent
        this.currentParams = {...newParams};

        this.showLoading(true);

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    action: 'get_chart_data',
                    ...this.currentParams,
                    test: true // For mock response
                })
            });

            const data = await response.json();

            if(data.success) {
                this.currentData = data.data;
                this.renderChart(data.data);
            } else {
                this.showError(data.error || 'Error al obtener los datos');
            }
        } catch(error) {
            console.error('Error updating chart:', error);
            this.showError('Error de conexión al servidor');
        } finally {
            this.showLoading(false);
        }
    }

    // Get current parameters (useful for external components)
    getCurrentParams() {
        return {...this.currentParams};
    }

    renderChart(data) {
        const series = [];
        const colors = ['#00008b', '#4682b4', '#ff6b35', '#28a745', '#dc3545', '#ffc107', '#17a2b8'];

        // Extract product names from series names (remove units in parentheses)
        const productNames = Object.keys(data.series)
            .filter(seriesName => !seriesName.includes('Forecast'))
            .map(seriesName => {
                return seriesName.replace(/\s*\([^)]*\)$/, '');
            });
        const uniqueProductNames = [...new Set(productNames)];
        const productsTitle = uniqueProductNames.length > 0 ? uniqueProductNames.join(', ') : 'Product Sales';

        // Check which y-axes are actually used
        const usedYAxes = new Set();
        let colorIndex = 0;
        for(const [seriesName, points] of Object.entries(data.series)) {
            const config = this.seriesConfig[seriesName] || {};
            const yAxisIndex = config.yAxis || 0;
            usedYAxes.add(yAxisIndex);

            // Use color from config or fallback to default colors
            const seriesColor = config.color || colors[colorIndex % colors.length];

            // Determine line style based on lineType in config
            const lineStyle = {
                color: seriesColor,
                width: 2
            };

            // Add dash pattern if lineType is dashed
            if(config.lineType === 'dashed') {
                lineStyle.type = 'dashed';
            }

            // Handle missing data - use server config or let ECharts use its default
            const connectNulls = config.connectNulls;

            const seriesOptions = {
                name: seriesName,
                type: 'line',
                data: points.map(point => [new Date(point[0]).getTime(), point[1]]),
                showSymbol: false,
                smooth: true,
                yAxisIndex: yAxisIndex,
                lineStyle: lineStyle,
                itemStyle: {
                    color: seriesColor
                },
                emphasis: {
                    focus: 'series'
                }
            };

            // Only set connectNulls if explicitly provided by server
            if(connectNulls !== undefined) {
                seriesOptions.connectNulls = connectNulls;
            }

            series.push(seriesOptions);
            colorIndex++;
        }

        // Build y-axis configuration based on what's actually used
        const yAxisConfig = [];

        // Always include left axis (index 0)
        yAxisConfig.push({
            type: 'value',
            name: data.unit_left || 'USD',
            position: 'left',
            nameLocation: 'middle',
            nameGap: 50,
            axisLabel: {
                formatter: function(value) {
                    return new Intl.NumberFormat('es-MX').format(value);
                }
            },
            axisLine: {show: true},
            splitLine: {show: true}
        });

        // Only add right axis (index 1) if it's actually used
        if(usedYAxes.has(1)) {
            yAxisConfig.push({
                type: 'value',
                name: data.unit_right || 'Piezas',
                position: 'right',
                nameLocation: 'middle',
                nameGap: 50,
                axisLabel: {
                    formatter: function(value) {
                        return new Intl.NumberFormat('es-MX').format(value);
                    }
                },
                axisLine: {show: true},
                splitLine: {show: false}
            });
        }

        const option = {
            title: [
                {
                    text: productsTitle,
                    left: 'center',
                    textStyle: {
                        color: '#00008b',
                        fontSize: 16,
                        fontWeight: 'bold'
                    }
                },
                {
                    text: '', // Will be updated by dataZoom event
                    left: 'right',
                    top: 35,
                    textStyle: {
                        color: '#666666',
                        fontSize: 12,
                        fontWeight: 'normal'
                    }
                }
            ],
            toolbox: {
                feature: {
                    saveAsImage: {
                        show: true,
                        title: 'Save as Image',
                        name: 'ventas_mensuales_productos'
                    },
                    magicType: {
                        show: true,
                        type: ['line', 'bar'],
                        title: {
                            line: 'Switch to Line Chart',
                            bar: 'Switch to Bar Chart'
                        }
                    },
                    restore: {
                        show: true,
                        title: 'Restore'
                    }
                },
                iconStyle: {
                    borderColor: '#00008b',
                    borderWidth: 1
                },
                emphasis: {
                    iconStyle: {
                        borderColor: '#4682b4',
                        borderWidth: 2
                    }
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                formatter: (params) => {
                    return this.formatTooltip(params, data);
                }
            },
            legend: {
                data: Object.keys(data.series),
                top: 60,
                type: 'plain',
                orient: 'horizontal',
                left: 'center',
                itemGap: 20,
                textStyle: {
                    fontSize: 12
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '8%',
                top: '25%',
                containLabel: true
            },
            xAxis: {
                type: 'time',
                axisLabel: {
                    rotate: 90,
                    formatter: function(value) {
                        const date = new Date(value);
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
                    }
                }
            },
            yAxis: yAxisConfig,
            dataZoom: [
                {
                    type: 'slider',
                    show: true,
                    start: 0,
                    end: 100,
                    bottom: 15
                },
                {
                    type: 'inside'
                }
            ],
            series: series
        };

        this.chart.setOption(option, true);

        // Set up event listener for dataZoom to update subtitle with visible date range
        this.chart.off('dataZoom');
        this.chart.on('dataZoom', (params) => {
            this.updateVisibleDateRange();
        });

        // Set initial subtitle with full date range
        this.updateVisibleDateRange();
    }

    updateVisibleDateRange() {
        if(!this.chart || !this.currentData) return;

        const option = this.chart.getOption();
        const dataZoom = option.dataZoom[0];

        // Get all data points to calculate visible range
        const allDates = [];
        Object.values(this.currentData.series).forEach(points => {
            points.forEach(point => {
                allDates.push(new Date(point[0]).getTime());
            });
        });

        if(allDates.length === 0) return;

        // Sort dates and calculate visible range
        allDates.sort((a, b) => a - b);
        const totalRange = allDates[allDates.length - 1] - allDates[0];
        const startPercent = dataZoom.start || 0;
        const endPercent = dataZoom.end || 100;

        const visibleStart = allDates[0] + (totalRange * startPercent / 100);
        const visibleEnd = allDates[0] + (totalRange * endPercent / 100);

        const formatDate = (timestamp) => {
            const date = new Date(timestamp);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]}/${date.getFullYear()}`;
        };

        const subtitle = `${formatDate(visibleStart)} - ${formatDate(visibleEnd)}`;

        // Update subtitle
        this.chart.setOption({
            title: [
                {},
                {
                    text: subtitle
                }
            ]
        });
    }

    formatTooltip(params, data) {
        if(!params || params.length === 0) return '';

        const date = new Date(params[0].axisValue);
        const formattedDate = date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long'
        });

        let html = `<strong>${formattedDate}</strong><br/>`;

        // Calculate totals by unit
        const totals = {};

        // Get current chart option to check which y-axes exist
        const chartOption = this.chart.getOption();
        const hasRightAxis = chartOption.yAxis && chartOption.yAxis.length > 1;

        // Start table with tbody
        html += `<table style="border-collapse: collapse; margin-top: 8px;"><tbody>`;

        params.forEach(param => {
            const value = parseFloat(param.value[1]);

            // Get the yAxisIndex for this series
            const seriesIndex = param.seriesIndex;
            const yAxisIndex = chartOption.series[seriesIndex].yAxisIndex || 0;

            // Determine unit and indicator based on yAxisIndex and available axes
            let unit, yAxisIndicator;
            if(yAxisIndex === 1 && hasRightAxis) {
                unit = data.unit_right || 'Piezas';
                yAxisIndicator = '→';
            } else {
                unit = data.unit_left || 'USD';
                yAxisIndicator = '←';
            }

            // Add to totals
            if(!totals[unit]) {
                totals[unit] = 0;
            }
            totals[unit] += value;

            const formattedValue = new Intl.NumberFormat('es-MX').format(value);

            html += `
                <tr>
                    <td style="padding: 2px 6px;">
                        <span style="display:inline-block;border-radius:50%;width:10px;height:10px;background-color:${param.color};"></span>
                    </td>
                    <td style="padding: 2px 6px;">${param.seriesName}</td>
                    <td style="padding: 2px 6px; text-align: right; white-space: nowrap;"><strong>${formattedValue}</strong></td>
                    <td style="padding: 2px 6px; text-align: center; white-space: nowrap;">${unit}</td>
                    <td style="padding: 2px 6px; text-align: center; color: #999;">${yAxisIndicator}</td>
                </tr>
            `;
        });

        html += `</tbody>`;

        // Add totals in table footer
        const totalKeys = Object.keys(totals);
        if(totalKeys.length > 0) {
            html += `<tfoot>`;
            html += `
                <tr>
                    <td colspan="5" style="padding: 4px 6px; border-top: 1px solid #ddd;"></td>
                </tr>
            `;

            totalKeys.forEach(unit => {
                const formattedTotal = new Intl.NumberFormat('es-MX').format(totals[unit]);
                html += `
                    <tr>
                        <td style="padding: 2px 6px;">📊</td>
                        <td style="padding: 2px 6px; font-weight: bold; color: #666;">Total ${unit}:</td>
                        <td style="padding: 2px 6px; text-align: right; white-space: nowrap; font-weight: bold;"><strong>${formattedTotal}</strong></td>
                        <td style="padding: 2px 6px; text-align: center; white-space: nowrap; font-weight: bold;">${unit}</td>
                        <td style="padding: 2px 6px;"></td>
                    </tr>
                `;
            });

            html += `</tfoot>`;
        }

        html += `</table>`;

        return html;
    }

    showLoading(show) {
        if(show) {
            this.loading.style.display = 'block';
            this.chart.showLoading({
                text: 'Actualizando gráfico...',
                color: '#00008b',
                textColor: '#212529',
                maskColor: 'rgba(255, 255, 255, 0.8)'
            });
        } else {
            this.loading.style.display = 'none';
            this.chart.hideLoading();
        }
    }

    showError(message) {
        this.loading.innerHTML = `<div style="color: var(--color-fail);">❌ ${message}</div>`;
        this.loading.style.display = 'block';
    }


// Public method to refresh data (gets fresh data without disturbing user view)
    async refreshData() {
        // NO loading spinner, NO chart reset - just quietly get fresh data
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    action: 'get_chart_data',
                    ...this.currentParams,  // Send current parameters as-is
                    test: true // For mock response
                })
            });

            const data = await response.json();

            if(data.success) {
                // Update internal data
                this.currentData = data.data;

                // Update chart data WITHOUT resetting anything
                const series = [];
                const colors = ['#00008b', '#4682b4', '#ff6b35', '#28a745', '#dc3545', '#ffc107', '#17a2b8'];
                let colorIndex = 0;

                for(const [seriesName, points] of Object.entries(data.data.series)) {
                    const config = this.seriesConfig[seriesName] || {};
                    const yAxisIndex = config.yAxis || 0;
                    const seriesColor = config.color || colors[colorIndex % colors.length];

                    const lineStyle = {
                        color: seriesColor,
                        width: 2
                    };

                    if(config.lineType === 'dashed') {
                        lineStyle.type = 'dashed';
                    }

                    const connectNulls = config.connectNulls;

                    const seriesOptions = {
                        name: seriesName,
                        type: 'line',
                        data: points.map(point => [new Date(point[0]).getTime(), point[1]]),
                        showSymbol: false,
                        smooth: true,
                        yAxisIndex: yAxisIndex,
                        lineStyle: lineStyle,
                        itemStyle: {
                            color: seriesColor
                        },
                        emphasis: {
                            focus: 'series'
                        }
                    };

                    if(connectNulls !== undefined) {
                        seriesOptions.connectNulls = connectNulls;
                    }

                    series.push(seriesOptions);
                    colorIndex++;
                }

                // Update ONLY the series data, preserving zoom, title, etc.
                this.chart.setOption({
                    series: series
                }, false); // false = don't reset chart state

                console.log('Data refreshed silently');
            }
        } catch(error) {
            console.error('Error refreshing data:', error);
            // Don't show error to user - this is a background refresh
        }
    }

    // Data access methods (unchanged from original)
    getDataAtDate(targetDate) {
        if(!this.currentData || !this.currentData.series) {
            return null;
        }

        const result = {};
        const targetTime = new Date(targetDate).getTime();

        for(const [seriesName, points] of Object.entries(this.currentData.series)) {
            const point = points.find(([dateStr, value]) => {
                return new Date(dateStr).getTime() === targetTime;
            });

            if(point) {
                result[seriesName] = point[1];
            }
        }

        return Object.keys(result).length > 0 ? result : null;
    }

    getDataAtDateClosest(targetDate) {
        if(!this.currentData || !this.currentData.series) {
            return null;
        }

        const result = {};
        const targetTime = new Date(targetDate).getTime();

        for(const [seriesName, points] of Object.entries(this.currentData.series)) {
            let closestPoint = null;
            let minDiff = Infinity;

            points.forEach(([dateStr, value]) => {
                const pointTime = new Date(dateStr).getTime();
                const diff = Math.abs(pointTime - targetTime);

                if(diff < minDiff) {
                    minDiff = diff;
                    closestPoint = [dateStr, value];
                }
            });

            if(closestPoint) {
                result[seriesName] = closestPoint[1];
            }
        }

        return Object.keys(result).length > 0 ? result : null;
    }

    getDataAtMonth(monthYear) {
        let targetDate;

        if(monthYear.includes('-') && monthYear.length <= 7) {
            targetDate = monthYear + '-01';
        } else if(monthYear.includes(' ')) {
            targetDate = new Date(monthYear + ' 1').toISOString().split('T')[0];
        } else {
            targetDate = monthYear;
        }

        return this.getDataAtDate(targetDate);
    }
}

// Export for use in other modules
if(typeof module !== 'undefined' && module.exports) {
    module.exports = OcEcharts;
}
