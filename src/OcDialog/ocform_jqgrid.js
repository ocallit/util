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

    // === PRE-DIALOG VALIDATION (throw errors only for real problems) ===
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

    // Check if grid has any data - if not, show friendly message and return
    if (!OcFormJqGridHelpers.hasData($grid)) {
        await OcDialog.alert("No hay datos para mostrar", "Sin datos", "ℹ️");
        return 'no_data';
    }

    // Validate initial row exists
    let initialRowData = OcFormJqGridHelpers.getRowData($grid, rowId);
    if (!initialRowData) {
        // Try to get first available row as fallback
        const firstRowId = OcFormJqGridHelpers.getFirstRowId($grid);
        if (!firstRowId) {
            await OcDialog.alert("No hay registros disponibles", "Sin datos", "ℹ️");
            return 'no_data';
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

    // Create navigation callback - NO THROWING, use events and error display
    const navigationCallback = async (direction, currentValues) => {
        let nextRowId = null;
        let infoMessage = '';
        let errorMessage = '';
        let navigationSuccess = false;

        try {
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
                            infoMessage = 'Fin de registros. Mostrando el primer registro.';
                        } else if (fallbackResult.action === 'wrap_to_last') {
                            infoMessage = 'Inicio de registros. Mostrando el último registro.';
                        }
                    } else {
                        // Stay on current row
                        nextRowId = currentRowId;
                        infoMessage = direction === 'next' 
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
                    infoMessage = 'No se pudo navegar al primer registro.';
                }
            }
            else if (direction === 'last') {
                nextRowId = OcFormJqGridHelpers.getLastRowId($grid);
                navigationSuccess = !!nextRowId;
                if (!navigationSuccess) {
                    nextRowId = currentRowId;
                    infoMessage = 'No se pudo navegar al último registro.';
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
                
                // Trigger error event
                OcFormJqGridHelpers.triggerError('format_error', {
                    direction,
                    rowId: currentRowId,
                    error: formatError
                }, htmlFormElement);
            }

            // Generate title - with fallback
            let newTitle;
            try {
                newTitle = OcFormJqGridHelpers.generateTitle(config.title, newValues, config.titleField, $grid);
            } catch (titleError) {
                console.warn('Title generation error:', titleError);
                newTitle = config.title;
                if (!errorMessage) errorMessage = 'Error generando título.';
                
                // Trigger error event
                OcFormJqGridHelpers.triggerError('title_error', {
                    direction,
                    rowId: currentRowId,
                    error: titleError
                }, htmlFormElement);
            }

            // Handle messages - show info/error but DON'T throw
            if (errorMessage) {
                console.error('Navigation error:', errorMessage);
                
                // Trigger error event for listeners
                OcFormJqGridHelpers.triggerError('navigation_error', {
                    direction,
                    rowId: currentRowId,
                    message: errorMessage
                }, htmlFormElement);
                
                // Show error in dialog UI
                OcFormJqGridHelpers.showErrorInDialog(errorMessage, formReader);
                
            } else if (infoMessage) {
                console.info('Navigation info:', infoMessage);
                
                // Trigger info event for listeners
                OcFormJqGridHelpers.triggerInfo('navigation_info', {
                    direction,
                    rowId: currentRowId,
                    message: infoMessage
                }, htmlFormElement);
                
                // Show info in dialog UI briefly
                OcFormJqGridHelpers.showInfoInDialog(infoMessage, formReader);
            }

            // Always return valid result - NEVER throw
            return {
                title: newTitle,
                values: newValues
            };

        } catch (error) {
            // Last resort error handling - log and trigger event but DON'T throw
            console.error('Unexpected navigation error:', error);
            
            // Trigger error event
            OcFormJqGridHelpers.triggerError('unexpected_error', {
                direction,
                rowId: currentRowId,
                error
            }, htmlFormElement);
            
            // Show generic error
            OcFormJqGridHelpers.showErrorInDialog('Error inesperado durante la navegación.', formReader);
            
            // Return current state to keep dialog functional
            return {
                title: OcFormJqGridHelpers.generateTitle(config.title, { _rowId: currentRowId }, config.titleField, $grid),
                values: { _rowId: currentRowId }
            };
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
    const config = {
        title: "Row Details",
        titleField: null,
        keepForm: true,
        ...options
    };

    // Validate parameters (same as above but with friendly no-data handling)
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

    // Friendly no-data handling
    if (!OcFormJqGridHelpers.hasData($grid)) {
        await OcDialog.alert("No hay datos para mostrar", "Sin datos", "ℹ️");
        return 'no_data';
    }

    let initialRowData = OcFormJqGridHelpers.getRowData($grid, rowId);
    if (!initialRowData) {
        const firstRowId = OcFormJqGridHelpers.getFirstRowId($grid);
        if (!firstRowId) {
            await OcDialog.alert("No hay registros disponibles", "Sin datos", "ℹ️");
            return 'no_data';
        }
        rowId = firstRowId;
        initialRowData = OcFormJqGridHelpers.getRowData($grid, rowId);
    }

    const formReader = new OcFormReadOnly();
    let currentRowId = rowId;
    const initialValues = OcFormJqGridHelpers.formatRowDataForForm($grid, initialRowData);
    const initialTitle = OcFormJqGridHelpers.generateTitle(config.title, initialValues, config.titleField, $grid);

    // Navigation handler that handles all directions
    const handleNavigation = async (direction, button) => {
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '⏳ Cargando...';
        
        try {
            let nextRowId = null;
            let infoMessage = '';
            let errorMessage = '';

            // Determine next row based on direction
            if (direction === 'next' || direction === 'prev') {
                nextRowId = OcFormJqGridHelpers.navigateToRow($grid, currentRowId, direction);
                if (!nextRowId) {
                    const fallbackResult = OcFormJqGridHelpers.handleNavigationFallback($grid, currentRowId, direction);
                    if (fallbackResult.success) {
                        nextRowId = fallbackResult.rowId;
                        if (fallbackResult.action === 'wrap_to_first') {
                            infoMessage = 'Fin de registros. Mostrando el primer registro.';
                        } else if (fallbackResult.action === 'wrap_to_last') {
                            infoMessage = 'Inicio de registros. Mostrando el último registro.';
                        }
                    } else {
                        nextRowId = currentRowId;
                        infoMessage = direction === 'next' ? 'No hay más registros hacia adelante.' : 'No hay más registros hacia atrás.';
                    }
                }
            } else if (direction === 'first') {
                nextRowId = OcFormJqGridHelpers.getFirstRowId($grid);
                if (!nextRowId) {
                    nextRowId = currentRowId;
                    infoMessage = 'No se pudo navegar al primer registro.';
                }
            } else if (direction === 'last') {
                nextRowId = OcFormJqGridHelpers.getLastRowId($grid);
                if (!nextRowId) {
                    nextRowId = currentRowId;
                    infoMessage = 'No se pudo navegar al último registro.';
                }
            }

            // Update current row
            currentRowId = nextRowId;
            
            // Get and format new data
            const newRowData = OcFormJqGridHelpers.getRowData($grid, currentRowId);
            if (newRowData) {
                const newValues = OcFormJqGridHelpers.formatRowDataForForm($grid, newRowData);
                const newTitle = OcFormJqGridHelpers.generateTitle(config.title, newValues, config.titleField, $grid);
                
                // Update form
                formReader._fill(htmlFormElement, newValues);
                
                // Update dialog title if possible
                const titleElement = formReader.dialogElement?.querySelector('.ocdialog_title');
                if (titleElement) {
                    titleElement.innerHTML = newTitle;
                }
                
                // Show info message if any
                if (infoMessage) {
                    OcFormJqGridHelpers.showInfoInDialog(infoMessage, formReader);
                    
                    // Trigger info event
                    OcFormJqGridHelpers.triggerInfo('navigation_info', {
                        direction,
                        rowId: currentRowId,
                        message: infoMessage
                    }, htmlFormElement);
                }
            } else {
                errorMessage = 'Error cargando datos del registro.';
                OcFormJqGridHelpers.showErrorInDialog(errorMessage, formReader);
                
                // Trigger error event
                OcFormJqGridHelpers.triggerError('data_load_error', {
                    direction,
                    rowId: currentRowId,
                    message: errorMessage
                }, htmlFormElement);
            }
            
        } catch (error) {
            // Handle any unexpected errors without throwing
            console.error('Navigation error:', error);
            
            OcFormJqGridHelpers.showErrorInDialog('Error durante la navegación.', formReader);
            
            // Trigger error event
            OcFormJqGridHelpers.triggerError('navigation_exception', {
                direction,
                rowId: currentRowId,
                error
            }, htmlFormElement);
            
        } finally {
            // Always restore button state
            button.innerHTML = originalText;
            button.disabled = false;
        }
    };

    // Create custom buttons with first/last navigation
    const buttons = [
        {
            label: '⏮️ Primero',
            class: 'ocdialog_button--secondary',
            callback: (e) => handleNavigation('first', e.target)
        },
        {
            label: '⬅️ Anterior',
            class: 'ocdialog_button--secondary',
            callback: (e) => handleNavigation('prev', e.target)
        },
        {
            label: '➡️ Siguiente', 
            class: 'ocdialog_button--primary',
            callback: (e) => handleNavigation('next', e.target)
        },
        {
            label: '⏭️ Último',
            class: 'ocdialog_button--secondary',
            callback: (e) => handleNavigation('last', e.target)
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
     * Trigger error event on the form element
     */
    triggerError(errorType, errorData, element) {
        try {
            const event = new CustomEvent('ocFormJqGridError', {
                detail: {
                    type: errorType,
                    data: errorData,
                    timestamp: new Date().toISOString()
                }
            });
            element.dispatchEvent(event);
        } catch (error) {
            console.warn('Error triggering error event:', error);
        }
    },

    /**
     * Trigger info event on the form element
     */
    triggerInfo(infoType, infoData, element) {
        try {
            const event = new CustomEvent('ocFormJqGridInfo', {
                detail: {
                    type: infoType,
                    data: infoData,
                    timestamp: new Date().toISOString()
                }
            });
            element.dispatchEvent(event);
        } catch (error) {
            console.warn('Error triggering info event:', error);
        }
    },

    /**
     * Show error message in dialog error div
     */
    showErrorInDialog(message, formReader) {
        try {
            if (formReader && formReader.dialogElement) {
                const errorDiv = formReader.dialogElement.querySelector('.sch_errors');
                if (errorDiv) {
                    errorDiv.innerHTML = `
                        <button type="button" class="sch_errors_close" onclick="this.parentElement.classList.add('sch_hidden')">&times;</button>
                        ${message}
                    `;
                    errorDiv.classList.remove('sch_hidden');
                    
                    // Auto-hide after 4 seconds
                    setTimeout(() => {
                        if (errorDiv) {
                            errorDiv.classList.add('sch_hidden');
                        }
                    }, 4000);
                }
            }
        } catch (error) {
            console.warn('Error showing error in dialog:', error);
        }
    },

    /**
     * Show info message in dialog (brief display)
     */
    showInfoInDialog(message, formReader) {
        try {
            if (formReader && formReader.dialogElement) {
                const errorDiv = formReader.dialogElement.querySelector('.sch_errors');
                if (errorDiv) {
                    // Use info styling
                    errorDiv.innerHTML = `
                        <button type="button" class="sch_errors_close" onclick="this.parentElement.classList.add('sch_hidden')">&times;</button>
                        ${message}
                    `;
                    errorDiv.style.backgroundColor = 'var(--color-secondary-bg, #e3f2fd)';
                    errorDiv.style.color = 'var(--color-secondary, #1976d2)';
                    errorDiv.style.borderColor = 'var(--color-secondary, #1976d2)';
                    errorDiv.classList.remove('sch_hidden');
                    
                    // Auto-hide after 2 seconds
                    setTimeout(() => {
                        if (errorDiv) {
                            errorDiv.classList.add('sch_hidden');
                            // Reset to error styling
                            errorDiv.style.backgroundColor = '';
                            errorDiv.style.color = '';
                            errorDiv.style.borderColor = '';
                        }
                    }, 2000);
                }
            }
        } catch (error) {
            console.warn('Error showing info in dialog:', error);
        }
    },

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
                return { 
                    success: true, 
                    rowId: allRowIds[0], 
                    action: 'wrap_to_first' 
                };
            } else if (direction === 'prev' && currentIndex === 0) {
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
                return allRowIds[0];
            }

            let nextIndex;
            if (direction === 'next') {
                nextIndex = currentIndex + 1;
                if (nextIndex >= allRowIds.length) {
                    return null;
                }
            } else {
                nextIndex = currentIndex - 1;
                if (nextIndex < 0) {
                    return null;
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

// Usage examples with event listeners
/*
// Basic usage - graceful no-data handling
try {
    const result = await OcFormJqGrid("#productGrid", productFormElement, "P001");
    if (result === 'no_data') {
        console.log('User was informed about no data');
    }
} catch (error) {
    // Only real errors (missing grid, invalid params) are thrown
    OcDialog.error('Cannot initialize grid viewer: ' + error.message);
}

// Extended version with all navigation buttons
try {
    const result = await OcFormJqGridExtended("#customerGrid", customerFormElement, "C123");
    if (result === 'no_data') {
        console.log('No data available');
    }
} catch (error) {
    OcDialog.error('Cannot initialize grid viewer: ' + error.message);
}

// Add event listeners for errors and info (optional)
customerFormElement.addEventListener('ocFormJqGridError', (event) => {
    console.log('Grid navigation error:', event.detail);
    // Custom error handling - maybe send to analytics
    // event.detail = { type, data: { direction, rowId, message/error }, timestamp }
});

customerFormElement.addEventListener('ocFormJqGridInfo', (event) => {
    console.log('Grid navigation info:', event.detail);
    // Custom info handling - maybe show toast notification
    // event.detail = { type, data: { direction, rowId, message }, timestamp }
});

// Example HTML form structure (missing fields are silently skipped)
/*
<div class="customer-details">
    <div class="field">
        <label>Customer Name:</label>
        <div id="customer_name"></div>
    </div>
    <div class="field">
        <label>Email:</label>
        <div id="email"></div>
    </div>
    <div class="field">
        <label>Phone:</label>
        <div id="phone"></div>
    </div>
    <!-- Even if grid has more columns, only these fields will be populated -->
</div>
*/

// Example jqGrid column with custom formatter (fully supported)
/*
{
    name: 'status',
    formatter: function(cellvalue, options, rowObject) {
        switch(cellvalue) {
            case 'A': return '<span style="color: green; font-weight: bold;">✓ Active</span>';
            case 'I': return '<span style="color: red;">✗ Inactive</span>';
            case 'P': return '<span style="color: orange;">⏸ Pending</span>';
            default: return cellvalue;
        }
    }
}
*/