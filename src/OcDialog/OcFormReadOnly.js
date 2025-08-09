/**
 * OcFormReadOnly - Navigation Dialog System
 * Creates a read-only form dialog with prev/next navigation
 */
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
    async show(title, form, values, navigationCallback) {
        if (this.currentDialog) {
            throw new Error('An OcFormReadOnly dialog is already open. Close it first or use a different instance.');
        }

        // Validate parameters
        if (typeof title !== 'string') {
            throw new Error('Title must be a string');
        }
        if (!form || !form.nodeType) {
            throw new Error('Form must be a DOM element');
        }
        if (!values || typeof values !== 'object') {
            throw new Error('Values must be an object');
        }
        if (typeof navigationCallback !== 'function') {
            throw new Error('Navigation callback must be a function');
        }

        // Store references
        this.currentForm = form.cloneNode(true);
        this.currentValues = { ...values };
        this.navigationCallback = navigationCallback;

        // Make form read-only
        this._makeFormReadOnly(this.currentForm);

        // Fill form with initial values
        this._fillForm(this.currentForm, this.currentValues);

        return new Promise((resolve, reject) => {
            this.currentDialog = OcDialog.dialog({
                title: title,
                html: this.currentForm,
                buttons: [
                    {
                        label: '⬅️ Anterior',
                        class: 'sch_dialog_button--secondary',
                        callback: async (e) => {
                            await this._handleNavigation('prev', e.target);
                        }
                    },
                    {
                        label: '➡️ Siguiente', 
                        class: 'sch_dialog_button--primary',
                        callback: async (e) => {
                            await this._handleNavigation('next', e.target);
                        }
                    },
                    {
                        label: '❌ Cerrar',
                        class: 'sch_dialog_button--outline',
                        callback: () => {
                            // Just close the dialog, let the catch handler deal with cleanup
                        },
                        promise_resolve: false
                    }
                ]
            });

            // Handle dialog close/cancel - all closures are treated the same
            this.currentDialog.catch((error) => {
                this._cleanup();
                // Check if this is the standard dialog cancellation or a real error
                if (error && error.message === OcDialog.CANCELED) {
                    resolve('closed'); // All dialog closures resolve with 'closed'
                } else {
                    // This is a real JavaScript error - reject the promise
                    reject(error);
                }
            });
        });
    }

    /**
     * Makes all form elements read-only
     * @private
     */
    _makeFormReadOnly(form) {
        // Find all input, textarea, and select elements
        const formElements = form.querySelectorAll('input, textarea, select, button[type="submit"], button[type="button"]');
        
        formElements.forEach(element => {
            switch (element.tagName.toLowerCase()) {
                case 'input':
                    if (element.type !== 'hidden') {
                        element.setAttribute('readonly', 'readonly');
                        element.setAttribute('tabindex', '-1');
                    }
                    break;
                case 'textarea':
                    element.setAttribute('readonly', 'readonly');
                    element.setAttribute('tabindex', '-1');
                    break;
                case 'select':
                    element.setAttribute('disabled', 'disabled');
                    element.setAttribute('tabindex', '-1');
                    break;
                case 'button':
                    element.setAttribute('disabled', 'disabled');
                    element.setAttribute('tabindex', '-1');
                    break;
            }
        });

        // Also disable any other interactive elements
        const interactiveElements = form.querySelectorAll('a, [onclick], [onchange], [onsubmit]');
        interactiveElements.forEach(element => {
            element.style.pointerEvents = 'none';
            element.setAttribute('tabindex', '-1');
        });
    }

    /**
     * Fills form elements with values based on selectors
     * @private
     */
    _fillForm(form, values) {
        Object.entries(values).forEach(([selector, content]) => {
            try {
                const elements = form.querySelectorAll(selector);
                elements.forEach(element => {
                    if (typeof content === 'string') {
                        // Handle different element types
                        switch (element.tagName.toLowerCase()) {
                            case 'input':
                                if (element.type === 'checkbox' || element.type === 'radio') {
                                    element.checked = content === 'true' || content === '1' || content === 'checked';
                                } else {
                                    element.value = content;
                                }
                                break;
                            case 'textarea':
                                element.value = content;
                                break;
                            case 'select':
                                element.value = content;
                                break;
                            default:
                                // For other elements, set innerHTML
                                element.innerHTML = content;
                                break;
                        }
                    } else if (content && content.nodeType) {
                        // If content is a DOM node
                        element.replaceChildren(content);
                    }
                });
            } catch (error) {
                console.warn(`Failed to fill element with selector "${selector}":`, error);
            }
        });
    }

    /**
     * Handles navigation button clicks
     * @private
     */
    async _handleNavigation(direction, button) {
        if (this.isNavigating) {
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
            const result = await this.navigationCallback(direction, { ...this.currentValues });

            if (result && typeof result === 'object') {
                const { title: newTitle, values: newValues } = result;

                if (newTitle && typeof newTitle === 'string') {
                    // Update dialog title
                    const titleElement = document.querySelector('.sch_dialog_title');
                    if (titleElement) {
                        titleElement.innerHTML = newTitle;
                    }
                }

                if (newValues && typeof newValues === 'object') {
                    // Update current values and refill form
                    this.currentValues = { ...newValues };
                    this._fillForm(this.currentForm, this.currentValues);
                }
            }

        } catch (error) {
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
        if (errorContainer) {
            errorContainer.innerHTML = `
                <button type="button" class="sch_errors_close" onclick="this.parentElement.classList.add('sch_hidden')">&times;</button>
                ${message}
            `;
            errorContainer.classList.remove('sch_hidden');
            
            // Auto-hide error after 5 seconds
            setTimeout(() => {
                if (errorContainer) {
                    errorContainer.classList.add('sch_hidden');
                }
            }, 5000);
        } else {
            // Fallback to alert if error container not found
            OcDialog.error(message);
        }
    }

    /**
     * Cleans up references and state
     * @private
     */
    _cleanup() {
        this.currentDialog = null;
        this.currentForm = null;
        this.currentValues = null;
        this.navigationCallback = null;
        this.isNavigating = false;
    }

    /**
     * Checks if a dialog is currently open
     * @returns {boolean}
     */
    isOpen() {
        return this.currentDialog !== null;
    }

    /**
     * Closes the current dialog if open
     */
    close() {
        if (this.currentDialog) {
            // The dialog close will trigger cleanup through the promise chain
            const dialogElement = document.querySelector('.sch_dialog[open]');
            if (dialogElement) {
                dialogElement.close();
            }
        }
    }
}

// Create a singleton instance for global use
const ocFormReadOnly = new OcFormReadOnly();

// Export both the class and singleton for different use cases
window.OcFormReadOnly = OcFormReadOnly;
window.ocFormReadOnly = ocFormReadOnly;