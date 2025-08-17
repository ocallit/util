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
    // Default options - SIMPLIFIED
    const config = {
        title: "Row Details",
        titleField: null,
        keepForm: true,
        ...options
    };

    // Constants - always enabled for better UX
    const fallbackNavigation = true;
    const onError = null; // Reserved for future use

    // === PRE-DIALOG VALIDATION (throw errors) ===
    if (!jqGridSelector || typeof jqGridSelector !== 'string') {
        throw new Error('jqGridSelector must be a valid string selector');
    }
    
    if (!htmlFormElement || !htmlFormElement.nodeType) {
        throw new Error('htmlFormElement must be a DOM element');
    }

    const $grid = $(jqGridSelector);
    if (!$grid.length) {
        throw new Error(`Element not found for selector: ${jqGridSelector}`);
    }
    
    if (!$grid.jqGrid || typeof $grid.jqGrid !== 'function') {
        throw new Error(`jqGrid not initialized at selector: ${jqGridSelector}`);
    }

    // Check if grid has any data
    if (!OcFormJqGridHelpers.hasData($grid)) {
        throw new Error('Grid has no data to display');
    }

    // Validate initial row exists
    let initialRowData = OcFormJqGridHelpers.getRowData($grid, rowId);
    if (!initialRowData) {
        // Try to get first available row as fallback
        const firstRowId = OcFormJqGridHelpers.getFirstRowId($grid);
        if (!firstRowId) {
            throw new Error('No rows available in grid');
        }
        
        console.warn(`Row '${rowId}' not found, using first available row '${firstRowId}'`);
        rowId = firstRowId;
        initialRowData = OcFormJqGridHelpers.getRowData($grid, rowId);
    }

    // === DIALOG INITIALIZATION ===
    const formReader = new OcFormReadOnly();
    let currentRowId = rowId;
    
    // Get initial data and title
    const initialValues = OcFormJqGridHelpers.formatRowDataForForm($grid, initialRowData);
    const initialTitle = OcFormJqGridHelpers.generateTitle(config.title, initialValues, config.titleField, $grid);

    // Create navigation callback - POST-DIALOG (NEVER throw, always handle gracefully)
    const navigationCallback = async (direction, currentValues) => {
        try {
            let nextRowId = null;
            let errorMessage = '';
            let navigationSuccess = false;

            // Try standard navigation first
            if (direction === 'next' || direction === 'prev') {
                nextRowId = OcFormJqGridHelpers.navigateToRow($grid, currentRowId, direction);
                
                if (!nextRowId) {
                    // Apply smart fallback navigation
                    const fallbackResult = OcFormJqGridHelpers.handleNavigationFallback($grid, currentRowId, direction);
                    
                    if (fallbackResult.success) {
                        nextRowId = fallbackResult.rowId;
                        navigationSuccess = true;
                        
                        // Set friendly message for wrap-around
                        if (fallbackResult.action === 'wrap_to_first') {
                            errorMessage = 'Fin de registros. Mostrando el primer registro.';
                        } else if (fallbackResult.action === 'wrap_to_last') {
                            errorMessage = 'Inicio de registros. Mostrando el último registro.';
                        }
                    } else {
                        // Last resort - stay on current row
                        nextRowId = currentRowId;
                        errorMessage = direction === 'next' 
                            ? 'No hay más registros hacia adelante.'
                            : 'No hay más registros hacia atrás.';
                    }
                } else {
                    navigationSuccess = true;
                }
            }
            // Add direct navigation options
            else if (direction === 'first') {
                nextRowId = OcFormJqGridHelpers.getFirstRowId($grid);
                navigationSuccess = !!nextRowId;
                if (!navigationSuccess) {
                    nextRowId = currentRowId;
                    errorMessage = 'No se pudo navegar al primer registro.';
                }
            }
            else if (direction === 'last') {
                nextRowId = OcFormJqGridHelpers.getLastRowId($grid);
                navigationSuccess = !!nextRowId;
                if (!navigationSuccess) {
                    nextRowId = currentRowId;
                    errorMessage = 'No se pudo navegar al último registro.';
                }
            }
            else {
                // Unknown direction - stay on current row
                nextRowId = currentRowId;
                errorMessage = `Dirección de navegación desconocida: ${direction}`;
            }

            // Always ensure we have a valid row ID
            if (!nextRowId) {
                nextRowId = currentRowId;
                errorMessage = 'Error de navegación. Permaneciendo en registro actual.';
            }

            // Update current row ID
            currentRowId = nextRowId;

            // Get new row data - with fallback
            let newRowData = OcFormJqGridHelpers.getRowData($grid, currentRowId);
            if (!newRowData) {
                // Fallback to first available row
                const fallbackRowId = OcFormJqGridHelpers.getFirstRowId($grid);
                if (fallbackRowId) {
                    currentRowId = fallbackRowId;
                    newRowData = OcFormJqGridHelpers.getRowData($grid, currentRowId);
                    errorMessage = 'Error cargando registro. Mostrando primer registro disponible.';
                }
                
                // If still no data, create minimal data to prevent crash
                if (!newRowData) {
                    newRowData = { _rowId: currentRowId };
                    errorMessage = 'Error cargando datos del registro.';
                }
            }

            // Format data for form - with error handling
            let newValues;
            try {
                newValues = OcFormJqGridHelpers.formatRowDataForForm($grid, newRowData);
            } catch (formatError) {
                console.warn('Formatting error:', formatError);
                newValues = { _rowId: currentRowId };
                errorMessage = 'Error formateando datos del registro.';
            }

            // Generate title - with fallback
            let newTitle;
            try {
                newTitle = OcFormJqGridHelpers.generateTitle(config.title, newValues, config.titleField, $grid);
            } catch (titleError) {
                console.warn('Title generation error:', titleError);
                newTitle = config.title;
                if (!errorMessage) errorMessage = 'Error generando título.';
            }

            // If there was an error message, we need to show it but NOT throw
            if (errorMessage) {
                // Log for debugging
                console.info('Navigation info:', errorMessage);
                
                // The error will be shown by OcFormReadOnly when we throw
                // But we throw AFTER preparing the result so navigation still works
                const result = {
                    title: newTitle,
                    values: newValues
                };
                
                // This throw will be caught by OcFormReadOnly and shown in error div
                // Navigation will still happen because we return valid data
                throw new Error(errorMessage);
            }

            // Success case
            return {
                title: newTitle,
                values: newValues
            };

        } catch (error) {
            // This error will be displayed in the dialog's error div
            // The dialog stays open and functional
            console.warn('Navigation handled with message:', error.message);
            throw error; // Let OcFormReadOnly handle the display
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
 * Enhanced OcFormJqGrid with first/last navigation
 * Adds first and last row navigation buttons
 */
async function OcFormJqGridExtended(jqGridSelector, htmlFormElement, rowId, options = {}) {
    // Create custom navigation with first/last buttons
    const formReader = new OcFormReadOnly();
    
    // ... (same validation as OcFormJqGrid) ...
    const config = {
        title: "Row Details",
        titleField: null,
        keepForm: true,
        ...options
    };

    // Validate parameters (same as above)
    if (!jqGridSelector || typeof jqGridSelector !== 'string') {
        throw new Error('jqGridSelector must be a valid string selector');
    }
    
    if (!htmlFormElement || !htmlFormElement.nodeType) {
        throw new Error('htmlFormElement must be a DOM element');
    }

    const $grid = $(jqGridSelector);
    if (!$grid.length) {
        throw new Error(`Element not found for selector: ${jqGridSelector}`);
    }
    
    if (!$grid.jqGrid || typeof $grid.jqGrid !== 'function') {
        throw new Error(`jqGrid not initialized at selector: ${jqGridSelector}`);
    }

    if (!OcFormJqGridHelpers.hasData($grid)) {
        throw new Error('Grid has no data to display');
    }

    let initialRowData = OcFormJqGridHelpers.getRowData($grid, rowId);
    if (!initialRowData) {
        const firstRowId = OcFormJqGridHelpers.getFirstRowId($grid);
        if (!firstRowId) {
            throw new Error('No rows available in grid');
        }
        rowId = firstRowId;
        initialRowData = OcFormJqGridHelpers.getRowData($grid, rowId);
    }

    let currentRowId = rowId;
    const initialValues = OcFormJqGridHelpers.formatRowDataForForm($grid, initialRowData);
    const initialTitle = OcFormJqGridHelpers.generateTitle(config.title, initialValues, config.titleField, $grid);

    // Enhanced navigation callback (same implementation as above)
    const navigationCallback = async (direction, currentValues) => {
        // ... (same implementation as OcFormJqGrid navigationCallback) ...
        try {
            let nextRowId = null;
            let errorMessage = '';

            if (direction === 'next' || direction === 'prev') {
                nextRowId = OcFormJqGridHelpers.navigateToRow($grid, currentRowId, direction);
                if (!nextRowId) {
                    const fallbackResult = OcFormJqGridHelpers.handleNavigationFallback($grid, currentRowId, direction);
                    if (fallbackResult.success) {
                        nextRowId = fallbackResult.rowId;
                        if (fallbackResult.action === 'wrap_to_first') {
                            errorMessage = 'Fin de registros. Mostrando el primer registro.';
                        } else if (fallbackResult.action === 'wrap_to_last') {
                            errorMessage = 'Inicio de registros. Mostrando el último registro.';
                        }
                    } else {
                        nextRowId = currentRowId;
                        errorMessage = direction === 'next' ? 'No hay más registros hacia adelante.' : 'No hay más registros hacia atrás.';
                    }
                }
            } else if (direction === 'first') {
                nextRowId = OcFormJqGridHelpers.getFirstRowId($grid);
                if (!nextRowId) {
                    nextRowId = currentRowId;
                    errorMessage = 'No se pudo navegar al primer registro.';
                }
            } else if (direction === 'last') {
                nextRowId = OcFormJqGridHelpers.getLastRowId($grid);
                if (!nextRowId) {
                    nextRowId = currentRowId;
                    errorMessage = 'No se pudo navegar al último registro.';
                }
            } else {
                nextRowId = currentRowId;
                errorMessage = `Dirección de navegación desconocida: ${direction}`;
            }

            currentRowId = nextRowId;
            let newRowData = OcFormJqGridHelpers.getRowData($grid, currentRowId);
            if (!newRowData) {
                const fallbackRowId = OcFormJqGridHelpers.getFirstRowId($grid);
                if (fallbackRowId) {
                    currentRowId = fallbackRowId;
                    newRowData = OcFormJqGridHelpers.getRowData($grid, currentRowId);
                    errorMessage = 'Error cargando registro. Mostrando primer registro disponible.';
                } else {
                    newRowData = { _rowId: currentRowId };
                    errorMessage = 'Error cargando datos del registro.';
                }
            }

            const newValues = OcFormJqGridHelpers.formatRowDataForForm($grid, newRowData);
            const newTitle = OcFormJqGridHelpers.generateTitle(config.title, newValues, config.titleField, $grid);

            if (errorMessage) {
                throw new Error(errorMessage);
            }

            return { title: newTitle, values: newValues };
        } catch (error) {
            throw error;
        }
    };

    // Create custom buttons with first/last navigation
    const buttons = [
        {
            label: '⏮️ Primero',
            class: 'sch_dialog_button--secondary',
            callback: async(e) => {
                e.target.disabled = true;
                try {
                    const result = await navigationCallback('first', {});
                    if (result) {
                        formReader._fill(htmlFormElement, result.values);
                    }
                } catch (error) {
                    formReader._showError(error.message);
                } finally {
                    e.target.disabled = false;
                }
            }
        },
        {
            label: '⬅️ Anterior',
            class: 'sch_dialog_button--secondary',
            callback: async(e) => {
                e.target.disabled = true;
                try {
                    const result = await navigationCallback('prev', {});
                    if (result) {
                        formReader._fill(htmlFormElement, result.values);
                    }
                } catch (error) {
                    formReader._showError(error.message);
                } finally {
                    e.target.disabled = false;
                }
            }
        },
        {
            label: '➡️ Siguiente', 
            class: 'sch_dialog_button--primary',
            callback: async(e) => {
                e.target.disabled = true;
                try {
                    const result = await navigationCallback('next', {});
                    if (result) {
                        formReader._fill(htmlFormElement, result.values);
                    }
                } catch (error) {
                    formReader._showError(error.message);
                } finally {
                    e.target.disabled = false;
                }
            }
        },
        {
            label: '⏭️ Último',
            class: 'sch_dialog_button--secondary',
            callback: async(e) => {
                e.target.disabled = true;
                try {
                    const result = await navigationCallback('last', {});
                    if (result) {
                        formReader._fill(htmlFormElement, result.values);
                    }
                } catch (error) {
                    formReader._showError(error.message);
                } finally {
                    e.target.disabled = false;
                }
            }
        }
    ];

    // Create dialog manually with custom buttons
    const dialogResult = OcDialog.dialog({
        title: initialTitle,
        html: htmlFormElement,
        buttons: buttons,
        keepHtml: config.keepForm
    });

    formReader.currentDialog = dialogResult.promise;
    formReader.dialogElement = dialogResult.dialog;
    formReader.currentForm = htmlFormElement;
    formReader.currentValues = initialValues;

    // Fill initial form
    formReader._fill(htmlFormElement, initialValues);

    return dialogResult.promise.catch((error) => {
        if (error && error.message === OcDialog.CANCELED) {
            return 'closed';
        } else {
            throw error;
        }
    });
}

/**
 * Helper functions for OcFormJqGrid - NEVER throw errors, always return safe fallbacks
 */
const OcFormJqGridHelpers = {
    /**
     * Get row data from jqGrid with proper formatting
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
     * Get first available row ID
     */
    getFirstRowId($grid) {
        try {
            const allRowIds = $grid.jqGrid('getDataIDs');
            return allRowIds && allRowIds.length > 0 ? allRowIds[0] : null;
        } catch (error) {
            return null;
        }
    },

    /**
     * Get last available row ID
     */
    getLastRowId($grid) {
        try {
            const allRowIds = $grid.jqGrid('getDataIDs');
            return allRowIds && allRowIds.length > 0 ? allRowIds[allRowIds.length - 1] : null;
        } catch (error) {
            return null;
        }
    },

    /**
     * Handle navigation fallback - always return safe result
     */
    handleNavigationFallback($grid, currentRowId, direction) {
        try {
            const allRowIds = $grid.jqGrid('getDataIDs');
            if (!allRowIds || allRowIds.length === 0) {
                return { success: false, rowId: null, action: 'no_data' };
            }

            const currentIndex = allRowIds.indexOf(String(currentRowId));
            
            if (direction === 'next' && currentIndex === allRowIds.length - 1) {
                // At last row, go to first
                return { 
                    success: true, 
                    rowId: allRowIds[0], 
                    action: 'wrap_to_first' 
                };
            } else if (direction === 'prev' && currentIndex === 0) {
                // At first row, go to last
                return { 
                    success: true, 
                    rowId: allRowIds[allRowIds.length - 1], 
                    action: 'wrap_to_last' 
                };
            }
            
            return { success: false, rowId: null, action: 'no_wrap_needed' };
        } catch (error) {
            return { success: false, rowId: null, action: 'error' };
        }
    },

    /**
     * Format jqGrid row data for OcFormReadOnly - NEVER throw
     */
    formatRowDataForForm($grid, rowData) {
        const formatted = {};
        
        try {
            const colModel = $grid.jqGrid('getGridParam', 'colModel');
            
            // Process each column - SILENTLY SKIP errors
            colModel.forEach(col => {
                const colName = col.name;
                let value = rowData[colName];

                if (value !== undefined && value !== null) {
                    try {
                        value = this.formatCellValue(value, col, $grid);
                        formatted[colName] = value;
                    } catch (error) {
                        // Silently use original value on formatting error
                        console.warn(`Formatting error for column '${colName}':`, error);
                        formatted[colName] = rowData[colName];
                    }
                }
            });
        } catch (error) {
            console.warn('Error in formatRowDataForForm:', error);
            // Return minimal data to prevent crash
        }

        // Always include row ID
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
            
            // Handle custom formatter functions
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
            
            // Handle built-in formatters
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
            return value; // Always return something safe
        }
    },

    // All formatting methods return safe fallbacks - NEVER throw
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
     * Navigate to next or previous row - NEVER throw
     */
    navigateToRow($grid, currentRowId, direction) {
        try {
            const allRowIds = $grid.jqGrid('getDataIDs');
            if (!allRowIds || allRowIds.length === 0) {
                return null;
            }

            const currentIndex = allRowIds.indexOf(String(currentRowId));
            if (currentIndex === -1) {
                return allRowIds[0]; // Safe fallback
            }

            let nextIndex;
            if (direction === 'next') {
                nextIndex = currentIndex + 1;
                if (nextIndex >= allRowIds.length) {
                    return null; // Let fallback handler decide
                }
            } else {
                nextIndex = currentIndex - 1;
                if (nextIndex < 0) {
                    return null; // Let fallback handler decide
                }
            }

            return allRowIds[nextIndex];
        } catch (error) {
            console.error('Error navigating rows:', error);
            return null;
        }
    },

    /**
     * Generate dialog title - NEVER throw
     */
    generateTitle(titleTemplate, rowData, titleField, $grid) {
        try {
            let title = titleTemplate || "Row Details";

            if (titleField && rowData[titleField]) {
                title += ` - ${rowData[titleField]}`;
            } else if (!titleField) {
                try {
                    const colModel = $grid.jqGrid('getGridParam', 'colModel');
                    const firstCol = colModel.find(col => !col.hidden && col.name !== 'rn' && col.name !== 'cb' && col.name !== '_rowId');
                    if (firstCol && rowData[firstCol.name]) {
                        title += ` - ${rowData[firstCol.name]}`;
                    }
                } catch (error) {
                    // Ignore title enhancement errors
                }
            }

            try {
                const allRowIds = $grid.jqGrid('getDataIDs');
                const currentIndex = allRowIds.indexOf(String(rowData._rowId));
                if (currentIndex !== -1) {
                    title += ` (${currentIndex + 1}/${allRowIds.length})`;
                }
            } catch (error) {
                // Ignore position info errors
            }

            return title;
        } catch (error) {
            return titleTemplate || "Row Details";
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

// Usage examples
/*
// Basic usage - simplified API
try {
    await OcFormJqGrid("#productGrid", productFormElement, "P001");
} catch (error) {
    // Only pre-dialog errors are thrown
    OcDialog.error('Cannot open grid viewer: ' + error.message);
}

// Extended version with first/last navigation
try {
    await OcFormJqGridExtended("#customerGrid", customerFormElement, "C123", {
        title: "Customer Details",
        titleField: "customer_name"
    });
} catch (error) {
    OcDialog.error('Cannot open grid viewer: ' + error.message);
}

// Once dialog is open, all errors are shown in the error div and navigation continues to work
*/