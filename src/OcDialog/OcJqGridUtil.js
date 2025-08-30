
/**
 * Helper functions for OcFormJqGrid - NEVER throw errors, always return safe fallbacks
 */
const OcJqGridUtil = {

    /**
     * Get row data from jqGrid
     */
    getRowData($grid, rowId) {
        try {
            const rowData = $grid.jqGrid('getRowData', rowId);
            if (!rowData || Object.keys(rowData).length === 0) {
                return null;
            }
            rowData._rowId = rowId;
            return rowData;
        } catch (error) {
            console.error('Error getting row data:', error);
            return null;
        }
    },

    /**
     * Get jqGrid row data formatted for form use
     * Extracts the data preparation logic from updateFormAndTitle
     *
     * @param {jQuery} $grid - jqGrid instance
     * @param {string|number} rowId - Row ID to get data for
     * @returns {Object|null} Formatted row data object or null if error/not found
     */
    getFormattedRow($grid, rowId) {
        try {
            // Step 1: Get raw row data
            const rowData = this.getRowData($grid, rowId);
            if (!rowData) {
                return null;
            }

            // Step 2: Format data for form use
            const formattedValues = this.formatRowDataForForm($grid, rowData);
            return formattedValues;

        } catch (error) {
            console.warn('Error getting formatted row data:', error);
            return null;
        }
    },

    /**
     * Get first available row ID
     */
    firstRowId($grid) {
        try {
            const allRowIds = $grid.jqGrid('getDataIDs');
            return allRowIds && allRowIds.length > 0 ? allRowIds[0] : null;
        } catch (error) {
            return null;
        }
    },

    /**
     * Navigate to next row with wrap-around to first row
     * @param {jQuery} $grid - jqGrid instance
     * @param {string|number} rowId - Current row ID
     * @returns {string|null} Next row ID or null if no data
     */
    nextRowId($grid, rowId) {
        try {
            const allRowIds = $grid.jqGrid('getDataIDs');
            if (!allRowIds || allRowIds.length === 0) {
                return null;
            }

            const currentIndex = allRowIds.indexOf(String(rowId));
            if (currentIndex === -1) {
                return allRowIds[0]; // If current row not found, return first
            }

            const nextIndex = currentIndex + 1;
            // Wrap around to first row if at the end
            if (nextIndex >= allRowIds.length) {
                return allRowIds[0];
            }

            return allRowIds[nextIndex];
        } catch (error) {
            console.error('Error navigating to next row:', error);
            return null;
        }
    },

    /**
     * Navigate to previous row with wrap-around to last row
     * @param {jQuery} $grid - jqGrid instance
     * @param {string|number} rowId - Current row ID
     * @returns {string|null} Previous row ID or null if no data
     */
    prevRowId($grid, rowId) {
        try {
            const allRowIds = $grid.jqGrid('getDataIDs');
            if (!allRowIds || allRowIds.length === 0) {
                return null;
            }

            const currentIndex = allRowIds.indexOf(String(rowId));
            if (currentIndex === -1) {
                return allRowIds[allRowIds.length - 1]; // If current row not found, return last
            }

            const prevIndex = currentIndex - 1;
            // Wrap around to last row if at the beginning
            if (prevIndex < 0) {
                return allRowIds[allRowIds.length - 1];
            }

            return allRowIds[prevIndex];
        } catch (error) {
            console.error('Error navigating to previous row:', error);
            return null;
        }
    },

    /**
     * Get last available row ID
     */
    lastRowId($grid) {
        try {
            const allRowIds = $grid.jqGrid('getDataIDs');
            return allRowIds && allRowIds.length > 0 ? allRowIds[allRowIds.length - 1] : null;
        } catch (error) {
            return null;
        }
    },


    /**
     * Format jqGrid row data for OcFormReadOnly - NEVER throw
     */
    formatRowDataForForm($grid, rowData) {
        const formatted = {};

        try {
            const colModel = $grid.jqGrid('getGridParam', 'colModel');

            colModel.forEach(col => {
                const colName = col.name;
                let value = rowData[colName];

                if (value !== undefined && value !== null) {
                    try {
                        value = this.formatCellValue(value, col, $grid);
                        formatted[colName] = value;
                    } catch (error) {
                        console.warn(`Formatting error for column '${colName}':`, error);
                        formatted[colName] = rowData[colName];
                    }
                }
            });
        } catch (error) {
            console.warn('Error in formatRowDataForForm:', error);
        }

        formatted._rowId = rowData._rowId;
        return formatted;
    },

    /**
     * Format individual cell value - NEVER throw
     */
    formatCellValue(value, colModel, $grid) {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        try {
            const formatter = colModel.formatter;

            if (typeof formatter === 'function') {
                try {
                    const options = {
                        colModel: colModel,
                        rowId: 'temp',
                        gid: $grid.attr('id')
                    };
                    return formatter(value, options, {});
                } catch (error) {
                    console.warn(`Custom formatter error for column '${colModel.name}':`, error);
                    return value;
                }
            }

            if (formatter) {
                switch (formatter) {
                    case 'date':
                        return this.formatDate(value, colModel.formatoptions);
                    case 'currency':
                    case 'number':
                        return this.formatNumber(value, colModel.formatoptions);
                    case 'checkbox':
                        return this.formatCheckbox(value);
                    case 'select':
                        return this.formatSelect(value, colModel.editoptions);
                    case 'email':
                        return this.formatEmail(value);
                    case 'link':
                        return this.formatLink(value, colModel.formatoptions);
                    default:
                        return value;
                }
            }

            return value;
        } catch (error) {
            console.warn(`Error formatting value for column '${colModel.name}':`, error);
            return value;
        }
    },

    // All formatting methods return safe fallbacks
    formatDate(value, options = {}) {
        try {
            if (!value) return '';
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;

            const format = options.newformat || options.srcformat || 'Y-m-d';
            if (format.includes('Y-m-d')) {
                return date.toISOString().split('T')[0];
            } else if (format.includes('d/m/Y')) {
                return date.toLocaleDateString('es-ES');
            }
            return date.toLocaleDateString();
        } catch (error) {
            return value;
        }
    },

    formatNumber(value, options = {}) {
        try {
            if (value === '' || value === null || value === undefined) return '';
            const num = parseFloat(value);
            if (isNaN(num)) return value;

            const decimals = options.decimalPlaces !== undefined ? options.decimalPlaces : 2;
            const decimalSeparator = options.decimalSeparator || '.';
            const thousandsSeparator = options.thousandsSeparator || ',';
            const prefix = options.prefix || '';
            const suffix = options.suffix || '';

            let formatted = num.toFixed(decimals);
            if (decimalSeparator !== '.') {
                formatted = formatted.replace('.', decimalSeparator);
            }
            if (thousandsSeparator) {
                const parts = formatted.split(decimalSeparator);
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
                formatted = parts.join(decimalSeparator);
            }
            return prefix + formatted + suffix;
        } catch (error) {
            return value;
        }
    },

    formatCheckbox(value) {
        try {
            if (typeof value === 'boolean') {
                return value ? '✓' : '✗';
            }
            const strValue = String(value).toLowerCase();
            return ['true', '1', 'yes', 'on', 'checked'].includes(strValue) ? '✓' : '✗';
        } catch (error) {
            return value;
        }
    },

    formatSelect(value, editOptions = {}) {
        try {
            if (!editOptions.value) return value;
            let valueMap = {};
            if (typeof editOptions.value === 'string') {
                editOptions.value.split(';').forEach(pair => {
                    const [key, val] = pair.split(':');
                    if (key && val) {
                        valueMap[key.trim()] = val.trim();
                    }
                });
            } else if (typeof editOptions.value === 'object') {
                valueMap = editOptions.value;
            }
            return valueMap[value] || value;
        } catch (error) {
            return value;
        }
    },

    formatEmail(value) {
        try {
            if (!value) return '';
            return `<a href="mailto:${value}">${value}</a>`;
        } catch (error) {
            return value;
        }
    },

    formatLink(value, options = {}) {
        try {
            if (!value) return '';
            const target = options.target || '_blank';
            const url = value.startsWith('http') ? value : `http://${value}`;
            return `<a href="${url}" target="${target}">${value}</a>`;
        } catch (error) {
            return value;
        }
    },

    /**
     * Check if grid has data - NEVER throw
     */
    hasData($grid) {
        try {
            const rowIds = $grid.jqGrid('getDataIDs');
            return rowIds && rowIds.length > 0;
        } catch (error) {
            return false;
        }
    }

};
