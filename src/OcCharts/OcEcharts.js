/**
 *  OcEcharts/OcEcharts.js
 *  @version 3.1.0 - Clean version without mock fetch
 */

class OcEcharts {

    TABLEINFO_COL_FIRST_DATE = 1;
    TABLEINFO_COL_FIRST_VALUE = 2;
    TABLEINFO_COL_FIRST_VISIBLE = 3;
    TABLEINFO_COL_TOOLTIP = 4;
    TABLEINFO_COL_LAST_VISIBLE = 5;
    TABLEINFO_COL_LAST_DATE = 6;
    TABLEINFO_COL_LAST_VALUE = 7;

    constructor(containerSelector, apiUrl, initialParams = {}) {
        this.chart = null;
        this.chartContainer = document.querySelector(containerSelector);
        this.apiUrl = apiUrl;

        // Store current parameters for API calls - no defaults, just what caller provides
        this.currentParams = {...initialParams};

        this.seriesConfig = {};

        // Remove the setupFetchOverride call - let the HTML handle mocking
        this._initializeChart();

        // Load initial data
        this._loadInitialData();
    }

    /** Initialize the ECharts instance and set initial loading state */
    _initializeChart() {
        if(this.chart)
            this.chart.dispose();
        this.chart = echarts.init(this.chartContainer);

        // Set loading state
        this.chart.showLoading({
            text: 'Cargando datos...',
            color: '#00008b',
            textColor: '#212529',
            maskColor: 'rgba(255, 255, 255, 0.8)'
        });
    }

    /** Load initial configuration and chart data on first load */
    async _loadInitialData() {
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
                    ...this.currentParams
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
            this._showError('Error al cargar los datos iniciales');
        }
    }

    // Main method to update chart with new parameters
    async updateChart(newParams = {}) {
        // Replace current parameters with exactly what user sent
        this.currentParams = {...newParams};

        this._showLoading(true);

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    action: 'get_chart_data',
                    ...this.currentParams
                })
            });

            const data = await response.json();

            if(data.success) {
                this._renderChart(data.data);
            } else {
                this._showError(data.error || 'Error al obtener los datos');
            }
        } catch(error) {
            console.error('Error updating chart:', error);
            this._showError('Error de conexión al servidor');
        } finally {
            this._showLoading(false);
        }
    }

    /** region: Datos Interactivos */

    addData(serverData) {
        // Get current chart options
        const oldOption = this.chart.getOption();

        // Initialize or get existing xAxis data
        const xAxisData = oldOption.xAxis[0].data || [];

        // Process each series from server data
        const seriesUpdates = oldOption.series.map(oldSeries => {
            const seriesName = oldSeries.name;

            // Skip if server didn't send data for this series
            if(!serverData[seriesName] || serverData[seriesName].length === 0) {
                return oldSeries;
            }

            // Get the new data point ([xValue, yValue])
            const [newX, newY] = serverData[seriesName][0];
            const seriesData = oldSeries.data || [];

            // Check if xValue exists in xAxis
            const xIndex = xAxisData.indexOf(newX);

            if(xIndex === -1) {
                // New xValue - append to xAxis and series data
                xAxisData.push(newX);
                seriesData.push(newY);
            } else {
                // Existing xValue - update the yValue at this position
                seriesData[xIndex] = newY;
            }

            return {
                ...oldSeries,
                data: seriesData
            };
        });

        // Update chart with minimal changes
        try {
            this.chart.setOption({
                xAxis: {data: xAxisData},
                series: seriesUpdates
            }, {
                notMerge: false,  // This is the default - means merge with existing options
                lazyUpdate: true  // Better performance for frequent updates
            });
        } catch(e) {
            console.error("OcEcharts.addData", e);
        }
    }

    /** endregion: Datos Interactivos */

    /** Paint, Render the complete ECharts configuration with series, axes, tooltips and toolbar */
    _renderChart(data) {

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
                // yyyy-mm-dd es sin timezone misma fecha en cualquier timezone
                data: points.map(point => [this.parseLocalDate(point[0]), point[1]]),
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
                    return this._formatTooltip(params, data);
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
                left: 60,    // Fixed pixel value instead of percentage - enough for Y-axis labels
                right: 80,   // Fixed pixel value - enough for right Y-axis if present
                bottom: 80,  // Fixed pixel value - enough for dataZoom slider + X-axis labels
                top: 65,     // Fixed pixel value - enough for title + legend
                containLabel: false // Changed to false since we're using fixed margins
            },
            xAxis: {
                type: 'time',
                boundaryGap: false,
                axisLabel: {
                    rotate: 90,
                    formatter: function(value) {
                        return OcEcharts.formatDate(new Date(value));
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
                    filterMode: 'none',
                    bottom: 15
                },
                {
                    type: 'inside'
                }
            ],
            series: series
        };

        try {
            this.chart.setOption(option, true);
        } catch(e) {
            console.error("OcEcharts._renderChart", e);
            return;
        }

        // Set up event listener for dataZoom to update subtitle with visible date range
        this.chart.off('dataZoom');
        this.chart.on('dataZoom', (params) => {
            this._updateVisibleDateRange();
        });
        this.chart.off('updateAxisPointer');
        this._updateVisibleDateRange();
        this._tableInfoAddSeries(data);
    }

    /** Update the subtitle to show the currently visible date range based on zoom level */
    _updateVisibleDateRange() {
        if(!this.chart) return;

        const option = this.chart.getOption();
        if(!option.series || option.series.length === 0) return;

        const dataZoom = option.dataZoom[0];

        // Get all data points from live ECharts data to calculate visible range
        const allDates = [];
        option.series.forEach(series => {
            const seriesData = series.data || [];
            seriesData.forEach(dataPoint => {
                if(Array.isArray(dataPoint) && dataPoint.length >= 2) {
                    allDates.push(dataPoint[0]); // dataPoint[0] is already a timestamp
                }
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

        const subtitle = `${OcEcharts.formatDate(visibleStart)} - ${OcEcharts.formatDate(visibleEnd)}`;

        // Update subtitle
        try {
            this.chart.setOption({
                title: [
                    {},
                    {
                        text: subtitle
                    }
                ]
            });
        } catch(e) {
            console.error("OcEcharts._updateVidibleDateRange", e);
        }
        this._updateTableVisibleRange();
    }

    /** Format tooltip content with tables, totals, and proper styling for hover display */
    _formatTooltip(params, data) {
        if(!params || params.length === 0) return '';
        this._tableInfoDisplaySelectedValues(params);
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

    /** Show or hide loading spinner and ECharts loading overlay */
    _showLoading(show) {
        if(show) {
            this.chart.showLoading({
                text: 'Actualizando gráfico...',
                color: '#00008b',
                textColor: '#212529',
                maskColor: 'rgba(255, 255, 255, 0.8)'
            });
        } else {
            this.chart.hideLoading();
        }
    }

    /** Display error message in the loading area */
    _showError(message) {
        alert(message)
    }


    /** region: TableInfo */

    _echarts_lastValueTableHideShowSeries(params) {
        const tableBody = document.querySelector('#ocechart_tableinfo tbody');
        try {
            let allSeriesVisible = document.getElementById("lastValueAll").checked;
            let selected = typeof parmas === 'undefined' ? this.chart.getOption().legend[0].selected : params.selected;
            for(let seriesName in selected)
                if(selected.hasOwnProperty(seriesName)) {
                    let row = tableBody.querySelector(`tr[data-ocseries='${seriesName}']`);
                    if(row)
                        row.style.display = allSeriesVisible || selected[seriesName] ? '' : 'none';
                }
        } catch(er) {
            console.log("echarts_lastValueTableHideShowSeries error", er);
        }
    }

    /** Method to populate the table with initial and latest series data */
    _tableInfoAddSeries(data) {
        const option = this.chart.getOption();
        if(typeof option === 'undefined')
            return;
        const tableBody = document.querySelector('#ocechart_tableinfo tbody');
        if(!tableBody) {
            console.warn('Table with id "ocechart_tableinfo" not found.', 'no table info done');
            return;
        }
        tableBody.innerHTML = ''; // Clear existing rows

        const allSeriesData = this.getAllData();
        const firstDate = this.formatLocalDate(option.xAxis[0].min);
        const lastDate = this.formatLocalDate(option.xAxis[0].max);

        for(const seriesName in allSeriesData) {
            const seriesPoints = allSeriesData[seriesName];

            // Get initial data point
            const firstPoint = seriesPoints[0] ?? [];
            const initialDate = firstPoint[0] ?? '';
            const initialValue = firstPoint ? new Intl.NumberFormat('es-MX').format(firstPoint[1]) : '';

            // Get latest data point
            const lastPoint = seriesPoints.length ? seriesPoints[seriesPoints.length - 1] : [];
            const latestDate = lastPoint[0] ?? '';
            const latestValue = lastPoint ? new Intl.NumberFormat('es-MX').format(lastPoint[1]) : '';

            const row = tableBody.insertRow();
            row.dataset.ocseries = seriesName;

            // Cell for series name with color indicator
            const seriesCell = row.insertCell(0);
            const color = this.seriesConfig[seriesName]?.color || '#000000';
            seriesCell.innerHTML = `
                    <span style="display:inline-block;border-radius:50%;width:10px;height:10px;background-color:${color};margin-right:5px;"></span>
                    <span>${seriesName}</span>
                `;

            // Cells for initial data
            row.insertCell(this.TABLEINFO_COL_FIRST_DATE).textContent = initialDate;
            row.insertCell(this.TABLEINFO_COL_FIRST_VALUE).textContent = initialValue;


            row.insertCell(this.TABLEINFO_COL_FIRST_VISIBLE).textContent = '';
            row.insertCell(this.TABLEINFO_COL_TOOLTIP).textContent = '';
            row.insertCell(this.TABLEINFO_COL_LAST_VISIBLE).textContent = '';


            // Cells for latest data
            row.insertCell(this.TABLEINFO_COL_LAST_DATE).textContent = latestDate;
            row.insertCell(this.TABLEINFO_COL_LAST_VALUE).textContent = latestValue;
        }
        this._updateTableVisibleRange();
    }

    _updateTableVisibleRange() {
        const tableBody = document.querySelector('#ocechart_tableinfo tbody');
        if(!tableBody) return;

        const firstLastVisible = this.getFirstLastVisibleValues();
        if(!firstLastVisible) return;

        Array.from(tableBody.rows).forEach(row => {
            const seriesName = row.dataset.ocseries;
            const seriesData = firstLastVisible[seriesName];

            if(seriesData) {
                // Update First Visible column
                row.cells[this.TABLEINFO_COL_FIRST_VISIBLE].textContent = seriesData.first ?
                    new Intl.NumberFormat('es-MX').format(seriesData.first.value) : '';

                // Update Last Visible column
                row.cells[this.TABLEINFO_COL_LAST_VISIBLE].textContent = seriesData.last ?
                    new Intl.NumberFormat('es-MX').format(seriesData.last.value) : '';

                // Update the date labels in the header if available
                if(seriesData.first && seriesData.last) {
                    const header = tableBody.parentNode.querySelector('th:nth-child(' + this.TABLEINFO_COL_FIRST_VISIBLE + ')');
                    if(header) header.textContent = this.formatLocalDate(seriesData.first.timestamp);

                    const lastHeader = tableBody.parentNode.querySelector('th:nth-child(' + this.TABLEINFO_COL_LAST_VISIBLE + ')');
                    if(lastHeader) lastHeader.textContent = this.formatLocalDate(seriesData.last.timestamp);
                }
            } else {
                row.cells[this.TABLEINFO_COL_FIRST_VISIBLE].textContent = '';
                row.cells[this.TABLEINFO_COL_LAST_VISIBLE].textContent = '';
            }
        });
    }

    /** Method to update the tooltip-related cells in the infotable */
    _tableInfoDisplaySelectedValues(params) {
        if(!params || params.length === 0)
            return;
        const tableBody = document.querySelector('#ocechart_tableinfo tbody');
        if(!tableBody) return;

        // First, clear the tooltip-related columns and remove highlight for ALL rows
        Array.from(tableBody.rows).forEach(row => {
            row.classList.remove('ocecharts_highlight_tablnifo');
            row.cells[this.TABLEINFO_COL_TOOLTIP].textContent = ''; // Clear Tooltip Value
        });

        document.getElementById("ocechart_tableinfo_pointer").innerText = OcEcharts.formatDate(params[0].axisValue);
        params.forEach(param => {
            const seriesName = param.seriesName;
            const value = parseFloat(param.value[1]);
            const formattedValue = new Intl.NumberFormat('es-MX').format(value);

            const row = tableBody.querySelector(`tr[data-ocseries="${seriesName}"]`);
            if(row) {
                row.classList.add('ocecharts_highlight_tablnifo');
                row.cells[this.TABLEINFO_COL_TOOLTIP].textContent = formattedValue;
            }
        });
    }

    /** endregion: TableInfo */

    /* region: Get Series Values **/

    getDataAtDate(targetDate) {
        if(!this.chart) {
            return null;
        }

        const option = this.chart.getOption();
        if(!option.series || option.series.length === 0) {
            return null;
        }

        const result = {};
        // Convert target date to local timestamp for comparison
        const targetTime = this.parseLocalDate(targetDate);

        option.series.forEach(series => {
            const seriesName = series.name;
            const seriesData = series.data || [];

            const point = seriesData.find(dataPoint => {
                if(Array.isArray(dataPoint) && dataPoint.length >= 2) {
                    // dataPoint[0] is already a local timestamp from ECharts
                    return dataPoint[0] === targetTime;
                }
                return false;
            });

            if(point) {
                result[seriesName] = point[1];
            }
        });

        return Object.keys(result).length > 0 ? result : null;
    }

    getDataAtDateClosest(targetDate) {
        if(!this.chart) {
            return null;
        }

        const option = this.chart.getOption();
        if(!option.series || option.series.length === 0) {
            return null;
        }

        const result = {};
        // Convert target date to local timestamp for comparison
        const targetTime = this.parseLocalDate(targetDate);

        option.series.forEach(series => {
            const seriesName = series.name;
            const seriesData = series.data || [];
            let closestPoint = null;
            let minDiff = Infinity;

            seriesData.forEach(dataPoint => {
                if(Array.isArray(dataPoint) && dataPoint.length >= 2) {
                    // dataPoint[0] is already a local timestamp from ECharts
                    const pointTime = dataPoint[0];
                    const diff = Math.abs(pointTime - targetTime);

                    if(diff < minDiff) {
                        minDiff = diff;
                        closestPoint = dataPoint;
                    }
                }
            });

            if(closestPoint) {
                result[seriesName] = closestPoint[1];
            }
        });

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

    getRowData() {
        if(!this.chart) {
            return {};
        }

        const option = this.chart.getOption();
        if(!option.series || option.series.length === 0) {
            return {};
        }

    }

    seriesToGrid(echartsData) {
        // Step 1: Collect all unique dates (x values)
        const allDates = new Set();

        // Get all dates from all series
        Object.values(echartsData).forEach(seriesData => {
            seriesData.forEach(([date]) => {
                allDates.add(date);
            });
        });

        // Convert to sorted array
        const x = Array.from(allDates).sort();

        // Step 2: Convert each series to row format
        const data = Object.entries(echartsData).map(([serieName, serieData]) => {
            // Create row object with serie name
            const row = {serie: serieName};

            // Convert array of [date, value] pairs to object properties
            serieData.forEach(([date, value]) => {
                row[date] = value;
            });

            return row;
        });

        return {x, data};
    }

    getAllData() {
        if(!this.chart) {
            return {};
        }

        const option = this.chart.getOption();
        if(typeof option === 'undefined')
            return {}
        if(!option.series || option.series.length === 0) {
            return {};
        }

        const result = {};

        option.series.forEach(series => {
            const seriesName = series.name;
            const seriesData = series.data || [];
            // Convert ECharts timestamps back to birthday-style date strings
            result[seriesName] = seriesData.map(point => {
                if(Array.isArray(point) && point.length >= 2) {
                    // Convert timestamp back to YYYY-MM-DD using formatLocalDate
                    const dateStr = this.formatLocalDate(point[0]);
                    return [dateStr, point[1]];
                }
                return point;
            });
        });

        return result;
    }

    /** Get the first and last visible data points for each series */
    getFirstLastVisibleValues() {
        if(!this.chart) {
            return {};
        }

        const option = this.chart.getOption();
        if(!option.series || option.series.length === 0) {
            return {};
        }

        const dataZoom = option.dataZoom[0];
        const startPercent = dataZoom.start || 0;
        const endPercent = dataZoom.end || 100;

        const result = {};

        option.series.forEach(series => {
            const seriesName = series.name;
            const seriesData = series.data || [];

            if(seriesData.length === 0) return;

            // Sort data by timestamp to ensure correct order
            const sortedData = [...seriesData].sort((a, b) => a[0] - b[0]);

            // Calculate visible range indices
            const totalPoints = sortedData.length;
            const startIndex = Math.floor((startPercent / 100) * totalPoints);
            const endIndex = Math.ceil((endPercent / 100) * totalPoints) - 1;

            // Get visible data slice
            const visibleData = sortedData.slice(startIndex, endIndex + 1);

            if(visibleData.length > 0) {
                const firstVisible = visibleData[0];
                const lastVisible = visibleData[visibleData.length - 1];

                result[seriesName] = {
                    first: {
                        date: this.formatLocalDate(firstVisible[0]),
                        value: firstVisible[1],
                        timestamp: firstVisible[0]
                    },
                    last: {
                        date: this.formatLocalDate(lastVisible[0]),
                        value: lastVisible[1],
                        timestamp: lastVisible[0]
                    },
                    visibleCount: visibleData.length
                };
            }
        });

        return result;
    }

    /* endregion: Get Series Values **/


    /** region: DateUtils */
    /**
     * Convert YYYY-MM-DD to local timestamp (no timezone shift)
     * This preserves the exact date regardless of user's timezone
     */
    parseLocalDate(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).getTime(); // Local timezone
    }

    /**
     * Convert local timestamp back to YYYY-MM-DD
     * This preserves the exact date that was originally sent
     */
    formatLocalDate(timestamp) {
        return OcEcharts.formatDate(new Date(timestamp));
    }

    static formatDate(date) {
        try {
            if(typeof date === 'undefined' || date === null) return;
            if(typeof date === "string") return date;
            if(typeof date === 'number') date = new Date(date)
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
        } catch(er) {
            console.log("rr date", date)
            console.log("rr", err)
            return "ERRRIR"
        }
    }

    /** endregion: DateUtils */

}

// Export for use in other modules
if(typeof module !== 'undefined' && module.exports) {
    module.exports = OcEcharts;
}
