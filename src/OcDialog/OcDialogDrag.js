/**
 * File: OcFormReadOnly.js
 * Path: /src/js/OcFormReadOnly.js
 * Version: 2.0.0
 * 
 * OcFormReadOnly - Navigation Dialog System
 * Creates a read-only form dialog with prev/next navigation
 * Each instance can manage one dialog at a time
 */
class OcFormReadOnly {
    constructor() {
        this.currentDialog = null;
        this.currentForm = null;
        this.currentValues = null;
        this.navigationCallback = null;
        this.isNavigating = false;
        this.originalFormParent = null;
        this.originalFormNextSibling = null;
    }

    /**
     * Shows a read-only form dialog with navigation
     * @param {string} title - Dialog title
     * @param {Element} form - DOM element containing the form
     * @param {Object} values - Object mapping selectors to HTML content
     * @param {Function} navigationCallback - Async callback for navigation (direction, currentValues)
     * @returns {Promise} - Promise that resolves when dialog is closed
     */
    async show(title, form, values, navigationCallback) {
        if(this.currentDialog) {
            throw new Error('This OcFormReadOnly instance already has a dialog open. Close it first or use a different instance.');
        }

        // Validate parameters
        if(typeof title !== 'string') {
            title = "";
        }
        if(!form || !form.nodeType) {
            throw new Error('Form must be a DOM element');
        }
        if(typeof values === 'undefined' || values == null) {
            values = {};
        }
        if(!values || typeof values !== 'object') {
            throw new Error('Values must be an object');
        }

        // Store original form location so we can return it later
        this.originalFormParent = form.parentElement;
        this.originalFormNextSibling = form.nextElementSibling;

        let buttons;
        if(typeof navigationCallback === 'function') {
            buttons = [
                {
                    label: '⬅️ Anterior',
                    class: 'sch_dialog_button--secondary',
                    callback: async(e) => {
                        await this._handleNavigation('prev', e.target);
                    }
                },
                {
                    label: '➡️ Siguiente', 
                    class: 'sch_dialog_button--primary',
                    callback: async(e) => {
                        await this._handleNavigation('next', e.target);
                    }
                }
                // NO close button in footer - let header close button handle it
            ];
        } else {
            // For view-only mode, provide a single button
            const closeLabel = typeof navigationCallback === "string" ? navigationCallback : '❌ Cerrar';
            buttons = [
                {
                    label: closeLabel,
                    class: 'sch_dialog_button--outline',
                    callback: () => {
                        // Close the specific dialog instance
                        this._closeDialog();
                    },
                    promise_resolve: false
                }
            ];
        }

        // Store references
        this.currentForm = form;
        this.currentValues = {...values};
        this.navigationCallback = navigationCallback;

        // Fill form with initial values
        this._fill(this.currentForm, this.currentValues);

        return new Promise((resolve, reject) => {
            this.currentDialog = OcDialog.dialog({
                title: title,
                html: this.currentForm,
                buttons: buttons
            });

            // Handle dialog close/cancel
            this.currentDialog.catch((error) => {
                this._cleanup();
                // Check if this is the standard dialog cancellation or a real error
                if(error && error.message === OcDialog.CANCELED) {
                    resolve('closed');
                } else {
                    // This is a real JavaScript error - reject the promise
                    reject(error);
                }
            });
        });
    }

    /**
     * Fills form with values (corrected implementation)
     * @private
     */
    _fill(form, values) {
        if(typeof values === "undefined" || values == null) {
            return;
        }
        
        // Convert object to array format if needed
        let valueArray;
        if(Array.isArray(values)) {
            valueArray = values;
        } else if(typeof values === "object") {
            valueArray = Object.entries(values).map(([key, value]) => ({id: key, value: value}));
        } else {
            return;
        }

        for(const item of valueArray) {
            if(typeof item.id !== "string") {
                continue;
            }
            
            let selector = CSS.escape(item.id);
            let newValue = item.value || null;

            let element = document.getElementById(selector);
            if(!element) {
                // Try radio button by name and value
                let radioToCheck = form.querySelector(`input[name="${selector}"][type="radio"][value="${newValue}"]`);
                if(radioToCheck) {
                    radioToCheck.checked = true;
                    continue;
                }
                continue;
            }
            
            if(newValue !== null) {
                switch(element.tagName.toLowerCase()) {
                    case 'input':
                        if(element.type === 'checkbox' || element.type === 'radio') {
                            element.checked = element.value == newValue;
                        } else {
                            element.value = newValue;
                        }
                        break;
                    case 'textarea': 
                        element.value = newValue; 
                        break;
                    case 'select': 
                        this._fillSelectElement(element, newValue); 
                        break;
                    case 'ul':
                    case 'ol':
                    case 'datalist':
                    case 'dl':
                        this._fillListElement(element, newValue);
                        break;
                    default:
                        element.innerHTML = newValue;
                }
            }
            
            if(typeof item.attributes === "object" && item.attributes !== null) {
                this._setElementAttributes(element, item.attributes);
            }
        }
    }

    /**
     * Fills select element with value(s)
     * @private
     */
    _fillSelectElement(element, value) {
        element.selectedIndex = -1;
        if(Array.isArray(value)) {
            for(const option of element.options) {
                if(value.some(val => option.value == val)) {
                    option.selected = true;
                }
            }
        } else {
            element.value = value;
        }
    }

    /**
     * Fills list elements (ul, ol, datalist, dl)
     * @private
     */
    _fillListElement(element, value) {
        if (Array.isArray(value)) {
            const listItems = value.map(item => {
                if (element.tagName.toLowerCase() === 'dl') {
                    if (typeof item === 'object' && item.term && item.definition) {
                        return `<dt>${item.term}</dt><dd>${item.definition}</dd>`;
                    } else {
                        return `<dt>${item}</dt>`;
                    }
                } else if (element.tagName.toLowerCase() === 'datalist') {
                    return `<option value="${item}">${item}</option>`;
                } else {
                    return `<li>${item}</li>`;
                }
            }).join('');
            element.innerHTML = listItems;
        } else {
            element.innerHTML = value || '';
        }
    }

    /**
     * Sets attributes on an element
     * @private
     */
    _setElementAttributes(element, attributes) {
        Object.entries(attributes).forEach(([attrName, attrValue]) => {
            if (attrValue === null || attrValue === undefined) {
                element.removeAttribute(attrName);
            } else {
                element.setAttribute(attrName, attrValue);
            }
        });
    }

    /**
     * Handles navigation button clicks
     * @private
     */
    async _handleNavigation(direction, button) {
        if(this.isNavigating) {
            return; // Prevent multiple simultaneous navigation calls
        }

        this.isNavigating = true;
        const originalText = button.innerHTML;
        const loadingText = direction === 'prev' ? '⏳ Cargando...' : '⏳ Cargando...';

        try {
            // Show loading state
            button.innerHTML = loadingText;
            button.disabled = true;

            // Call navigation callback
            const result = await this.navigationCallback(direction, {...this.currentValues});

            if(result && typeof result === 'object') {
                const {title: newTitle, values: newValues} = result;

                if(newTitle && typeof newTitle === 'string') {
                    // Update dialog title
                    const titleElement = document.querySelector('.sch_dialog_title');
                    if(titleElement) {
                        titleElement.innerHTML = newTitle;
                    }
                }

                if(newValues && typeof newValues === 'object') {
                    // Update current values and refill form
                    this.currentValues = {...newValues};
                    this._fill(this.currentForm, this.currentValues);
                }
            }

        } catch(error) {
            // Show error message
            this._showError(typeof error === 'string' ? error : error.message || 'Error de navegación');
        } finally {
            // Restore button state
            button.innerHTML = originalText;
            button.disabled = false;
            this.isNavigating = false;
        }
    }

    /**
     * Shows an error message in the dialog
     * @private
     */
    _showError(message) {
        const errorContainer = document.querySelector('.sch_dialog .sch_errors');
        if(errorContainer) {
            errorContainer.innerHTML = `
                <button type="button" class="sch_errors_close" onclick="this.parentElement.classList.add('sch_hidden')">&times;</button>
                ${message}
            `;
            errorContainer.classList.remove('sch_hidden');

            // Auto-hide error after 5 seconds
            setTimeout(() => {
                if(errorContainer) {
                    errorContainer.classList.add('sch_hidden');
                }
            }, 5000);
        } else {
            // Fallback to alert if error container not found
            OcDialog.error(message);
        }
    }

    /**
     * Properly closes the current dialog instance
     * @private
     */
    _closeDialog() {
        if(this.currentDialog && this.currentDialog.dialogElement) {
            this.currentDialog.dialogElement.close();
        } else if(this.currentDialog) {
            // Fallback - try to find the dialog element by querying for open dialog
            const openDialog = document.querySelector('.sch_dialog[open]');
            if(openDialog) {
                openDialog.close();
            }
        }
    }

    /**
     * Cleans up references and restores form to original location
     * @private
     */
    _cleanup() {
        // Return form to its original location if we moved it
        if(this.currentForm && this.originalFormParent) {
            if(this.originalFormNextSibling) {
                this.originalFormParent.insertBefore(this.currentForm, this.originalFormNextSibling);
            } else {
                this.originalFormParent.appendChild(this.currentForm);
            }
        }

        // Clear references
        this.currentDialog = null;
        this.currentForm = null;
        this.currentValues = null;
        this.navigationCallback = null;
        this.isNavigating = false;
        this.originalFormParent = null;
        this.originalFormNextSibling = null;
    }

    /**
     * Checks if a dialog is currently open
     * @returns {boolean}
     */
    isOpen() {
        return this.currentDialog !== null;
    }

    /**
     * Closes the current dialog if open - CORRECTED VERSION
     */
    close() {
        if(this.currentDialog) {
            this._closeDialog();
        }
    }
}

// Export the class - NO singleton
// Users can create multiple instances as needed
window.OcFormReadOnly = OcFormReadOnly;

// Usage examples:
/*
// Create instance per form/feature
const invoiceFormReader = new OcFormReadOnly();
const customerFormReader = new OcFormReadOnly();

// Show invoice details
await invoiceFormReader.show("Invoice #123", invoiceForm, invoiceData, async (direction, current) => {
    const newInvoiceId = direction === 'next' ? current.id + 1 : current.id - 1;
    const response = await fetch(`./api/invoice.php?action=get&id=${newInvoiceId}`);
    const data = await response.json();
    return {
        title: `Invoice #${data.invoice_number}`,
        values: data
    };
});

// While invoice dialog is open, can still open customer details
await customerFormReader.show("Customer Details", customerForm, customerData);
*/