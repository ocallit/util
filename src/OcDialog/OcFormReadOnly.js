
class OcFormReadOnly {
    constructor() {
        this.currentDialog = null;
        this.currentForm = null;
        this.currentValues = null;
        this.navigationCallback = null;
        this.isNavigating = false;
    }

    /**
     * Shows a read-only form dialog with navigation
     * @param {string} title - Dialog title
     * @param {Element} form - DOM element containing the form
     * @param {Object} values - Object mapping selectors to HTML content
     * @param {Function} navigationCallback - Async callback for navigation (direction, currentValues)
     * @returns {Promise} - Promise that resolves when dialog is closed
     */
    async show(title, form, values, navigationCallback, keepForm = true) {
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

        let buttons;
        if(typeof navigationCallback === 'function') {
            buttons = [
                {
                    label: '⬅️ Anterior',
                    class: 'ocdialog_button--secondary',
                    callback: async(e) => {
                        await this._handleNavigation('prev', e.target);
                    }
                },
                {
                    label: '➡️ Siguiente', 
                    class: 'ocdialog_button--primary',
                    callback: async(e) => {
                        await this._handleNavigation('next', e.target);
                    }
                }
            ];
        } else {
            buttons = [];
        }

        // Store references
        this.currentForm = form;
        this.currentValues = {...values};
        this.navigationCallback = navigationCallback;

        // Fill form with initial values
        this._fill(this.currentForm, this.currentValues);

        return new Promise((resolve, reject) => {
            const dialogResult =  OcDialog.dialog({
                title: title,
                html: this.currentForm,
                buttons: buttons,
                keepHtml: keepForm
            });
            this.currentDialog = dialogResult.promise;
            this.dialogElement = dialogResult.dialog;

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
     * Closes the current dialog if open - CORRECTED VERSION
     */
    close() {
        this.dialogElement.close();
    }

    /**
     * Checks if a dialog is currently open
     * @returns {boolean}
     */
    isOpen() {
        return this.currentDialog !== null;
    }

    /**
     * Fills form with values
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
            let newValue = item.value ?? null;

            let element = form.querySelector("#" + selector);
            if(!element) {
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
                        if(element.type === 'checkbox' || element.type === 'radio')
                            element.checked = element.value == newValue;
                        else
                            element.value = newValue;
                        break;
                    case 'textarea': 
                        element.value = newValue; 
                        break;
                    case 'select': 
                        this._fillSelectElement(element, newValue); 
                        break;
                    case 'ul':
                    case 'ol':
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
     * Fills list elements (ul, ol) with support for nested arrays
     * @private
     */
    _fillListElement(element, value) {
        if (Array.isArray(value)) {
            const listItems = value.map(item => {
                // Handle ul and ol tags with nested array support
                if (Array.isArray(item)) {
                    // Create nested sub-list
                    const tagName = element.tagName.toLowerCase(); // ul or ol
                    const subItems = item.map(subItem => `<li>${subItem}</li>`).join('');
                    return `<li><${tagName}>${subItems}</${tagName}></li>`;
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
                     // const titleElement = this.currentForm.querySelector('.ocdialog_title');
                    // if(titleElement) titleElement.innerHTML = newTitle;

                }

                if(newValues && typeof newValues === 'object') {
                    // Update current values and refill form
                    this.currentValues = {...newValues};
                    console.log("VALLING --------------", this.currentValues);
                    console.log("              ", this.currentForm);
                    this._fill(this.currentForm, this.currentValues);

                }
            }

        } catch(error) {
            console.error(error);
            console.log(":::::::::::::::::::");
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

        console.log("this.currentDialog", this.currentForm);
        const errorContainer = this.currentForm.querySelector('.ocdialog .sch_errors');
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
     * Cleans up references and restores form to original location
     * @private
     */
    _cleanup() {

        // Clear references
        // this.currentDialog = null;
        this.isNavigating = false;
    }

}

// Export for use in other modules
if(typeof module !== 'undefined' && module.exports) {
    module.exports = OcFormReadOnly;
}

