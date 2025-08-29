/**
 * OcFormJqGrid - jqGrid Card Reader using OcFormReadOnly
 * Displays individual grid rows as navigable cards
 * 
 * @param {string} jqGridSelector - jQuery selector for the jqGrid
 * @param {HTMLElement} htmlFormElement - DOM element containing the form template
 * @param {string|number} rowId - Initial row ID to display
 * @param {Object} options - Configuration options
 * @returns {Promise} - Promise that resolves when dialog is closed
 */
async function OcFormJqGrid(jqGridSelector, htmlFormElement, rowId, options = {}) {
    // Default options
    const config = {
        title: "Row Details",
        titleField: null,
        keepForm: true,
        onNavigate: null,
        ...options
    };

    // Validate parameters
    if (!jqGridSelector || typeof jqGridSelector !== 'string') {
        throw new Error('jqGridSelector must be a valid string selector');
    }
    
    if (!htmlFormElement || !htmlFormElement.nodeType) {
        throw new Error('htmlFormElement must be a DOM element');
    }

    const $grid = $(jqGridSelector);
    if (!$grid.length || !$grid.jqGrid) {
        throw new Error(`jqGrid not found at selector: ${jqGridSelector}`);
    }

    // Validate initial row exists
    const initialRowData = OcFormJqGridHelpers.getRowData($grid, rowId);
    if (!initialRowData) {
        throw new Error(`Row with ID '${rowId}' not found in grid`);
    }

    // Initialize OcFormReadOnly instance
    const formReader = new OcFormReadOnly();
    
    // Get initial data and title
    const initialValues = OcFormJqGridHelpers.formatRowDataForForm($grid, initialRowData);
    const initialTitle = OcFormJqGridHelpers.generateTitle(config.title, initialRowData, config.titleField, $grid);

    // Create navigation callback
    const navigationCallback = async (direction, currentValues) => {
        try {
            // Call custom navigation handler if provided
            if (typeof config.onNavigate === 'function') {
                await config.onNavigate(direction, currentValues._rowId || rowId);
            }

            // Get current row ID from form data or fallback
            const currentRowId = currentValues._rowId || rowId;
            
            // Navigate to next/previous row
            const nextRowId = OcFormJqGridHelpers.navigateToRow($grid, currentRowId, direction);
            
            if (!nextRowId) {
                // No more rows in that direction
                const message = direction === 'next' ? 'No hay más registros hacia adelante' : 'No hay más registros hacia atrás';
                throw new Error(message);
            }

            // Get new row data
            const newRowData = OcFormJqGridHelpers.getRowData($grid, nextRowId);
            if (!newRowData) {
                throw new Error('Error al cargar los datos del registro');
            }

            // Format data for form
            const newValues = OcFormJqGridHelpers.formatRowDataForForm($grid, newRowData);
            const newTitle = OcFormJqGridHelpers.generateTitle(config.title, newRowData, config.titleField, $grid);

            return {
                title: newTitle,
                values: newValues
            };

        } catch (error) {
            console.error('Navigation error:', error);
            throw error;
        }
    };

    // Show the form dialog with navigation
    return await formReader.show(
        initialTitle, 
        htmlFormElement, 
        initialValues, 
        navigationCallback, 
        config.keepForm
    );
}

/**
 * Helper functions for OcFormJqGrid
 */
const OcFormJqGridHelpers = {
    /**
     * Get row data from jqGrid with proper formatting
     * @param {jQuery} $grid - jqGrid jQuery object
     * @param {string|number} rowId - Row ID to retrieve
     * @returns {Object|null} - Row data or null if not found
     */
    getRowData($grid, rowId) {
        try {
            // Get raw row data
            const rowData = $grid.jqGrid('getRowData', rowId);
            if (!rowData || Object.keys(rowData).length === 0) {
                return null;
            }

            // Add the row ID to the data for tracking
            rowData._rowId = rowId;
            return rowData;
        } catch (error) {
            console.error('Error getting row data:', error);
            return null;
        }
    },

    /**
     * Format jqGrid row data for OcFormReadOnly
     * @param {jQuery} $grid - jqGrid jQuery object  
     * @param {Object} rowData - Raw row data from jqGrid
     * @returns {Object} - Formatted data for form population
     */
    formatRowDataForForm($grid, rowData) {
        const colModel = $grid.jqGrid('getGridParam', 'colModel');
        const formatted = {};

        // Process each column
        colModel.forEach(col => {
            const colName = col.name;
            let value = rowData[colName];

            if (value !== undefined && value !== null) {
                // Apply column-specific formatting
                value = this.formatCellValue(value, col);
                formatted[colName] = value;
            }
        });

        // Include row ID for navigation tracking
        formatted._rowId = rowData._rowId;

        return formatted;
    },

    /**
     * Format individual cell value based on column configuration
     * @param {*} value - Raw cell value
     * @param {Object} colModel - Column model configuration
     * @returns {*} - Formatted value
     */
    formatCellValue(value, colModel) {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        // Handle different formatters
        const formatter = colModel.formatter;
        
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
                    // Custom formatter or unknown - return as is
                    return value;
            }
        }

        return value;
    },

    /**
     * Format date values
     */
    formatDate(value, options = {}) {
        if (!value) return '';
        
        try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            
            const format = options.newformat || options.srcformat || 'Y-m-d';
            
            // Simple date formatting
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

    /**
     * Format number/currency values
     */
    formatNumber(value, options = {}) {
        if (value === '' || value === null || value === undefined) return '';
        
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        
        const decimals = options.decimalPlaces || 2;
        const decimalSeparator = options.decimalSeparator || '.';
        const thousandsSeparator = options.thousandsSeparator || ',';
        const prefix = options.prefix || '';
        const suffix = options.suffix || '';
        
        let formatted = num.toFixed(decimals);
        
        // Replace decimal separator
        if (decimalSeparator !== '.') {
            formatted = formatted.replace('.', decimalSeparator);
        }
        
        // Add thousands separator
        if (thousandsSeparator) {
            const parts = formatted.split(decimalSeparator);
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
            formatted = parts.join(decimalSeparator);
        }
        
        return prefix + formatted + suffix;
    },

    /**
     * Format checkbox values
     */
    formatCheckbox(value) {
        if (typeof value === 'boolean') {
            return value ? '✓' : '✗';
        }
        
        const strValue = String(value).toLowerCase();
        return ['true', '1', 'yes', 'on', 'checked'].includes(strValue) ? '✓' : '✗';
    },

    /**
     * Format select/dropdown values
     */
    formatSelect(value, editOptions = {}) {
        if (!editOptions.value) return value;
        
        // editOptions.value can be a string like "1:Active;2:Inactive" or object
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
    },

    /**
     * Format email values
     */
    formatEmail(value) {
        if (!value) return '';
        return `<a href="mailto:${value}">${value}</a>`;
    },

    /**
     * Format link values
     */
    formatLink(value, options = {}) {
        if (!value) return '';
        
        const target = options.target || '_blank';
        const url = value.startsWith('http') ? value : `http://${value}`;
        
        return `<a href="${url}" target="${target}">${value}</a>`;
    },

    /**
     * Navigate to next or previous row in grid
     * @param {jQuery} $grid - jqGrid jQuery object
     * @param {string|number} currentRowId - Current row ID
     * @param {string} direction - 'next' or 'prev'
     * @returns {string|null} - Next row ID or null if no more rows
     */
    navigateToRow($grid, currentRowId, direction) {
        try {
            // Get all visible row IDs (respects current filters/search)
            const allRowIds = $grid.jqGrid('getDataIDs');
            
            if (!allRowIds || allRowIds.length === 0) {
                return null;
            }

            // Find current row index
            const currentIndex = allRowIds.indexOf(String(currentRowId));
            
            if (currentIndex === -1) {
                // Current row not found, return first row
                return allRowIds[0];
            }

            // Calculate next index
            let nextIndex;
            if (direction === 'next') {
                nextIndex = currentIndex + 1;
                // Wrap around to beginning
                if (nextIndex >= allRowIds.length) {
                    nextIndex = 0;
                }
            } else { // 'prev'
                nextIndex = currentIndex - 1;
                // Wrap around to end
                if (nextIndex < 0) {
                    nextIndex = allRowIds.length - 1;
                }
            }

            return allRowIds[nextIndex];

        } catch (error) {
            console.error('Error navigating rows:', error);
            return null;
        }
    },

    /**
     * Generate dialog title based on row data and configuration
     * @param {string} titleTemplate - Title template
     * @param {Object} rowData - Row data
     * @param {string} titleField - Field to use in title
     * @param {jQuery} $grid - jqGrid jQuery object
     * @returns {string} - Generated title
     */
    generateTitle(titleTemplate, rowData, titleField, $grid) {
        let title = titleTemplate;

        // If titleField is specified, append its value
        if (titleField && rowData[titleField]) {
            title += ` - ${rowData[titleField]}`;
        } else if (!titleField) {
            // Use first visible non-hidden column
            const colModel = $grid.jqGrid('getGridParam', 'colModel');
            const firstCol = colModel.find(col => !col.hidden && col.name !== 'rn' && col.name !== 'cb');
            
            if (firstCol && rowData[firstCol.name]) {
                title += ` - ${rowData[firstCol.name]}`;
            }
        }

        // Add row position info
        const allRowIds = $grid.jqGrid('getDataIDs');
        const currentIndex = allRowIds.indexOf(String(rowData._rowId));
        
        if (currentIndex !== -1) {
            title += ` (${currentIndex + 1}/${allRowIds.length})`;
        }

        return title;
    },

    /**
     * Get column model information
     * @param {jQuery} $grid - jqGrid jQuery object
     * @returns {Array} - Column model array
     */
    getColumnModel($grid) {
        return $grid.jqGrid('getGridParam', 'colModel') || [];
    },

    /**
     * Check if grid has data
     * @param {jQuery} $grid - jqGrid jQuery object
     * @returns {boolean} - True if grid has rows
     */
    hasData($grid) {
        const rowIds = $grid.jqGrid('getDataIDs');
        return rowIds && rowIds.length > 0;
    },

    /**
     * Get grid statistics
     * @param {jQuery} $grid - jqGrid jQuery object
     * @returns {Object} - Grid statistics
     */
    getGridStats($grid) {
        const allRowIds = $grid.jqGrid('getDataIDs');
        const records = $grid.jqGrid('getGridParam', 'records');
        const page = $grid.jqGrid('getGridParam', 'page');
        const rowNum = $grid.jqGrid('getGridParam', 'rowNum');
        
        return {
            visibleRows: allRowIds ? allRowIds.length : 0,
            totalRecords: records || 0,
            currentPage: page || 1,
            rowsPerPage: rowNum || 20
        };
    }
};

// Usage examples and documentation
/*
// Basic usage
await OcFormJqGrid("#productGrid", document.getElementById('productForm'), "P001");

// With custom options
await OcFormJqGrid("#customerGrid", customerFormElement, "C123", {
    title: "Customer Details",
    titleField: "customer_name",
    keepForm: true,
    onNavigate: async (direction, rowId) => {
        console.log(`Navigating ${direction} from row ${rowId}`);
        // Custom logic here
    }
});

// Error handling
try {
    await OcFormJqGrid("#myGrid", formElement, "ROW001", {
        title: "Record Details",
        titleField: "name"
    });
} catch (error) {
    console.error('Error showing grid card:', error);
    OcDialog.error('Error loading record details: ' + error.message);
}
*/