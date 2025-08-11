// File:OcDialog/OcDialog.js
// Version: 2.0.0

/**
 * OcDialog - Unified Dialog System
 * Provides a clean, organized interface for all dialog functionality
 */
var OcDialog = {
    // Constants
    CANCELED: 'DIALOG_CANCELED',

    /**
     * Generic dialog creator
     * @param {Object} params - Dialog configuration
     * @param {string|Element} params.title - Dialog title (string or DOM element)
     * @param {string|Element} params.html - Dialog content (string or DOM element)
     * @param {Array} params.buttons - Button configuration array
     * buttons: [{label:"button label", callback:function, class:"css class to add", promise_resolve:true}, ...]
     * @param {bool} keepHtml on true the html received is not removed from the DOM
     * @returns {Promise} - Promise that resolves on buttons with promise_resolve=true, rejects on close/escape
     */
    dialog({title = "", html, buttons = [], keepHtml = false}) {
        const dialog = document.createElement('dialog');
        const promise = new Promise((resolve, reject) => {

            dialog.className = 'sch_dialog sch_dialog_grow_content';
            dialog.innerHTML = `
                <div class="sch_dialog_header">
                    <div class="sch_dialog_title"></div>
                    <button class="sch_dialog_close" type="button">&times;</button>
                </div>
                <div class="sch_dialog_content">
                    <div class="sch_errors sch_hidden"><button type="button" class="sch_errors_close">&times;</button></div>
                    <form class="sch_form_tag" enctype="multipart/form-data" method="DIALOG"></form>
                </div>
                <div class="sch_dialog_footer"></div>`;
            // Set title
            if(typeof title === 'string')
                dialog.querySelector('.sch_dialog_title').innerHTML = title;
            else
                dialog.querySelector('.sch_dialog_title').replaceChildren(title);

            // Set content
            if(typeof html === 'string')
                dialog.querySelector('.sch_dialog_content').innerHTML = html;
            else
                dialog.querySelector('.sch_dialog_content').replaceChildren(html);


            // Handle buttons
            const footer = dialog.querySelector('.sch_dialog_footer');
            const buttonHandlers = []; // Store handlers for cleanup

            if(buttons.length) {
                buttons.forEach((buttonConfig, index) => {
                    const button = document.createElement('button');
                    button.type = 'button';

                    // Set button class - first button gets primary if no class specified
                    let buttonClass = 'sch_dialog_button';
                    if (buttonConfig.class) {
                        buttonClass += ` ${buttonConfig.class}`;
                    } else if (index === 0) {
                        buttonClass += ' sch_dialog_button--primary';
                    }
                    button.className = buttonClass;

                    button.innerHTML = buttonConfig.label || `Button ${index + 1}`;

                    // Create named function to avoid memory leak
                    function handleButtonClick(e) {
                        // Call callback if provided
                        if (typeof buttonConfig.callback === 'function') {
                            buttonConfig.callback(e);
                        }

                    }

                    button.addEventListener('click', handleButtonClick);
                    buttonHandlers.push({button, handler: handleButtonClick});
                    footer.appendChild(button);
                });
            } else {
                footer.remove();
            }

            // Handle close button click
            function handleClose() {
                dialog.close();
                cleanup(false);
            }

            // Handle ESC key for this specific dialog
            function handleKeydown(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    dialog.close();
                    cleanup(false);
                }
            }

            // Cleanup function
            function cleanup(shouldResolve = false, data = null) {
                closeButton.removeEventListener('click', handleClose);
                dialog.removeEventListener('keydown', handleKeydown);
                dialog.removeEventListener('close', handleDialogClose);

                // Remove button event listeners to prevent memory leaks
                buttonHandlers.forEach(({button, handler}) => {
                    button.removeEventListener('click', handler);
                });
                // Handle content preservation
                if(typeof keepContent === 'undefined') keepContent = false;
                if (keepContent && typeof html !== 'string') {
                    // Move content back to body with display:none before removing dialog
                    html.style.display = 'none';
                    document.body.appendChild(html);
                }

                // OcDialogDrag.cleanup(dialog);
                dialog.remove();

                if (shouldResolve) {
                    resolve(data);
                } else {
                    reject(new Error(OcDialog.CANCELED));
                }
            }

            // Handle dialog close event (ESC, backdrop click, programmatic close)
            function handleDialogClose() {
                cleanup(false);
            }

            document.body.appendChild(dialog);

            const closeButton = dialog.querySelector('.sch_dialog_close');
            closeButton.addEventListener('click', handleClose);
            dialog.addEventListener('keydown', handleKeydown);
            dialog.addEventListener('close', handleDialogClose);

            // OcDialogDrag.initialize(dialog);
            dialog.showModal();

            // Don't focus any button - let dialog remain unfocused
        });
        return { promise, dialog };
    },

    /**
     * Generic dialog creator
     * @param {Object} params - Dialog configuration
     * @param {string|Element} params.title - Dialog title (string or DOM element)
     * @param {string|Element} params.html - Dialog content (string or DOM element)
     * @param {Array} params.buttons - Button configuration array
     * buttons: [{label:"button label", callback:function, class:"css class to add", promise_resolve:true}, ...]
     * @param {bool} keepHtml on true the html received is not removed from the DOM
     * @returns {Promise} - Promise that resolves on buttons with promise_resolve=true, rejects on close/escape
     */
    dialogAuto({title = "", html, buttons = [], keepHtml = false}) {
        return new Promise((resolve, reject) => {
            const dialog = document.createElement('dialog');
            dialog.className = 'sch_dialog sch_dialog_grow_content';
            dialog.innerHTML = `
                <div class="sch_dialog_header">
                    <div class="sch_dialog_title"></div>
                    <button class="sch_dialog_close" type="button">&times;</button>
                </div>
                <div class="sch_dialog_content">
                    <div class="sch_errors sch_hidden"><button type="button" class="sch_errors_close">&times;</button></div>
                    <form class="sch_form_tag" enctype="multipart/form-data" method="DIALOG"></form>
                </div>
                <div class="sch_dialog_footer"></div>`;

            // Set title
            if(typeof title === 'string')
                dialog.querySelector('.sch_dialog_title').innerHTML = title;
            else
                dialog.querySelector('.sch_dialog_title').replaceChildren(title);

            // Set content
            if(typeof html === 'string')
                dialog.querySelector('.sch_dialog_content').innerHTML = html;
            else
                dialog.querySelector('.sch_dialog_content').replaceChildren(html);

            // Handle buttons
            const footer = dialog.querySelector('.sch_dialog_footer');
            const buttonHandlers = []; // Store handlers for cleanup

            if(buttons.length) {
                buttons.forEach((buttonConfig, index) => {
                    const button = document.createElement('button');
                    button.type = 'button';

                    // Set button class - first button gets primary if no class specified
                    let buttonClass = 'sch_dialog_button';
                    if (buttonConfig.class) {
                        buttonClass += ` ${buttonConfig.class}`;
                    } else if (index === 0) {
                        buttonClass += ' sch_dialog_button--primary';
                    }
                    button.className = buttonClass;

                    button.innerHTML = buttonConfig.label || `Button ${index + 1}`;

                    // Create named function to avoid memory leak
                    function handleButtonClick(e) {
                        // Call callback if provided
                        if (typeof buttonConfig.callback === 'function') {
                            buttonConfig.callback(e);
                        }

                        // Handle promise resolution
                        if (buttonConfig.promise_resolve === true) {
                            // If there's a form, collect form data
                            const form = dialog.querySelector('form');
                            let formData = {};
                            if (form) {
                                formData = Object.fromEntries(new FormData(form).entries());
                            }
                            dialog.close();
                            cleanup(true, formData);
                        } else {
                            dialog.close();
                            cleanup(false);
                        }
                    }

                    button.addEventListener('click', handleButtonClick);
                    buttonHandlers.push({button, handler: handleButtonClick});
                    footer.appendChild(button);
                });
            } else {
                footer.remove();
            }

            // Handle close button click
            function handleClose() {
                dialog.close();
                cleanup(false);
            }

            // Handle ESC key for this specific dialog
            function handleKeydown(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    dialog.close();
                    cleanup(false);
                }
            }

            // Cleanup function
            function cleanup(shouldResolve = false, data = null) {
                closeButton.removeEventListener('click', handleClose);
                dialog.removeEventListener('keydown', handleKeydown);
                dialog.removeEventListener('close', handleDialogClose);

                // Remove button event listeners to prevent memory leaks
                buttonHandlers.forEach(({button, handler}) => {
                    button.removeEventListener('click', handler);
                });
                // Handle content preservation
                if(typeof keepContent === 'undefined') keepContent = false;
                if (keepContent && typeof html !== 'string') {
                    // Move content back to body with display:none before removing dialog
                    html.style.display = 'none';
                    document.body.appendChild(html);
                }

                // OcDialogDrag.cleanup(dialog);
                dialog.remove();

                if (shouldResolve) {
                    resolve(data);
                } else {
                    reject(new Error(OcDialog.CANCELED));
                }
            }

            // Handle dialog close event (ESC, backdrop click, programmatic close)
            function handleDialogClose() {
                cleanup(false);
            }

            document.body.appendChild(dialog);

            const closeButton = dialog.querySelector('.sch_dialog_close');
            closeButton.addEventListener('click', handleClose);
            dialog.addEventListener('keydown', handleKeydown);
            dialog.addEventListener('close', handleDialogClose);

            // OcDialogDrag.initialize(dialog);
            dialog.showModal();

            // Don't focus any button - let dialog remain unfocused
        });
    },

    /**
     * Simple alert dialog
     * @param {string} message - Alert message
     * @param {string} title - Dialog title
     * @param {string} icon - UTF-8 icon
     * @param {string} buttonLabel - Button text
     * @param {string} buttonIcon - Button icon
     * @returns {Promise<boolean>} - Resolves to true when closed
     */
    alert(message, title = "Aviso", icon = "⚠️", buttonLabel = "Ok", buttonIcon = "✓") {
        return new Promise((resolve) => {
            const dialog = document.createElement('dialog');
            dialog.className = 'sch_dialog sch_dialog_grow_content';
            dialog.innerHTML = `
                <div class="sch_dialog_header">
                    <h2 class="sch_dialog_title">
                        ${icon ? `<span style="margin-right: 8px;">${icon}</span>` : ''}${title}
                    </h2>
                    <button class="sch_dialog_close" type="button">&times;</button>
                </div>
                <div class="sch_dialog_content">
                    <p style="margin: 0; font-size: 16px; line-height: 1.5; color: var(--color-text);">
                        ${message}
                    </p>
                </div>
                <div class="sch_dialog_footer">
                    <button class="sch_dialog_button sch_dialog_button--primary" type="button">
                        ${buttonIcon ? `<span style="margin-right: 6px;">${buttonIcon}</span>` : ''}${buttonLabel}
                    </button>
                </div>
            `;

            document.body.appendChild(dialog);

            function cleanup() {
                closeButton.removeEventListener('click', handleButtonClose);
                okButton.removeEventListener('click', handleButtonClose);
                dialog.removeEventListener('close', handleButtonClose);
                // OcDialogDrag.cleanup(dialog);
                dialog.remove();
                resolve(true);
            }

            function handleButtonClose() {dialog.close();}

            const closeButton = dialog.querySelector('.sch_dialog_close');
            const okButton = dialog.querySelector('.sch_dialog_button--primary');

            closeButton.addEventListener('click', handleButtonClose);
            okButton.addEventListener('click', handleButtonClose);
            dialog.addEventListener('close', cleanup);

            // OcDialogDrag.initialize(dialog);
            dialog.showModal();
            okButton.focus();
        });
    },

    /**
     * Information dialog (wrapper around alert)
     * @param {string} message - Information message
     * @param {string} title - Dialog title
     * @param {string} icon - UTF-8 icon
     * @param {string} buttonLabel - Button text
     * @param {string} buttonIcon - Button icon
     * @returns {Promise<boolean>} - Resolves to true when closed
     */
    info(message, title = "Info", icon = "ℹ️", buttonLabel = "Ok", buttonIcon = "✓") {
        return this.alert(message, title, icon, buttonLabel, buttonIcon);
    },

    /**
     * Error dialog (wrapper around alert with error styling)
     * @param {string} message - Error message
     * @param {string} title - Dialog title
     * @param {string} icon - UTF-8 icon
     * @param {string} buttonLabel - Button text
     * @param {string} buttonIcon - Button icon
     * @returns {Promise<boolean>} - Resolves to true when closed
     */
    error(message, title = "Error", icon = "🔴", buttonLabel = "Entendido", buttonIcon = "🔺") {
        const errorWrappedMessage = `
            <div style="
                background: var(--color-fail-bg); 
                border: 1px solid var(--color-fail); 
                border-radius: 6px; 
                padding: 16px; 
                color: var(--color-fail);
                font-weight: 500;
                line-height: 1.5;
            ">
                ${message}
            </div>
        `;
        return this.alert(errorWrappedMessage, title, icon, buttonLabel, buttonIcon);
    },

    /**
     * Confirmation dialog
     * @param {string} message - Confirmation message
     * @param {string} title - Dialog title
     * @param {string} icon - UTF-8 icon
     * @param {string} okLabel - OK button text
     * @param {string} okIcon - OK button icon
     * @param {string} cancelLabel - Cancel button text
     * @param {string} cancelIcon - Cancel button icon
     * @returns {Promise<boolean>} - Resolves to true on OK, rejects on Cancel
     */
    confirm(message, title = "Confirme", icon = "❓", okLabel = "Si", okIcon = "✓", cancelLabel = "No", cancelIcon = "✗") {
        return new Promise((resolve, reject) => {
            const dialog = document.createElement('dialog');
            dialog.className = 'sch_dialog sch_dialog_grow_content';

            dialog.innerHTML = `
                <div class="sch_dialog_header">
                    <h2 class="sch_dialog_title">
                        ${icon ? `<span style="margin-right: 8px;">${icon}</span>` : ''}${title}
                    </h2>
                    <button class="sch_dialog_close" type="button">&times;</button>
                </div>
                <div class="sch_dialog_content">
                    <p style="margin: 0; font-size: 16px; line-height: 1.5; color: var(--color-text);">
                        ${message}
                    </p>
                </div>
                <div class="sch_dialog_footer">
                    <button class="sch_dialog_button sch_dialog_button--secondary" type="button" data-action="cancel">
                        ${cancelIcon ? `<span style="margin-right: 6px;">${cancelIcon}</span>` : ''}${cancelLabel}
                    </button>
                    <button class="sch_dialog_button sch_dialog_button--primary" type="button" data-action="ok">
                        ${okIcon ? `<span style="margin-right: 6px;">${okIcon}</span>` : ''}${okLabel}
                    </button>
                </div>
            `;

            document.body.appendChild(dialog);

            function cleanup(shouldResolve = false) {
                closeButton.removeEventListener('click', handleCancel);
                okButton.removeEventListener('click', handleOk);
                cancelButton.removeEventListener('click', handleCancel);
                dialog.removeEventListener('close', handleCancel);
                // OcDialogDrag.cleanup(dialog);
                dialog.remove();

                if (shouldResolve) {
                    resolve(true);
                } else {
                    reject(false);
                }
            }

            function handleOk() {
                dialog.close();
                cleanup(true);
            }

            function handleCancel() {
                dialog.close();
                cleanup(false);
            }

            const closeButton = dialog.querySelector('.sch_dialog_close');
            const okButton = dialog.querySelector('[data-action="ok"]');
            const cancelButton = dialog.querySelector('[data-action="cancel"]');

            closeButton.addEventListener('click', handleCancel);
            okButton.addEventListener('click', handleOk);
            cancelButton.addEventListener('click', handleCancel);
            dialog.addEventListener('close', handleCancel);

            // OcDialogDrag.initialize(dialog);
            dialog.showModal();
            okButton.focus();
        });
    },

    /**
     * Delete confirmation dialog (wrapper around confirm)
     * @param {string} message - Delete confirmation message
     * @param {string} title - Dialog title
     * @param {string} icon - UTF-8 icon
     * @param {string} okLabel - Delete button text
     * @param {string} okIcon - Delete button icon
     * @param {string} cancelLabel - Cancel button text
     * @param {string} cancelIcon - Cancel button icon
     * @returns {Promise<boolean>} - Resolves to true on delete confirmation
     */
    confirmDelete(message, title = "Confirme Borrar", icon = "🗑️", okLabel = "Eliminar", okIcon = "🗑️", cancelLabel = "Cancelar", cancelIcon = "✗") {
        return this.confirm(message, title, icon, okLabel, okIcon, cancelLabel, cancelIcon);
    },

    /**
     * Text editing dialog
     * @param {string} value - Initial value
     * @param {string} label - Input label
     * @param {string} title - Dialog title
     * @param {string} icon - UTF-8 icon
     * @param {string} saveLabel - Save button text
     * @param {string} saveIcon - Save button icon
     * @param {string} cancelLabel - Cancel button text
     * @param {string} cancelIcon - Cancel button icon
     * @param {string} type - Input type
     * @param {Object} inputAttrs - Additional input attributes
     * @returns {Promise<Object>} - Resolves with {originalValue, value}
     */
    textEdit(value = "", label = "Valor", title = "Editar", icon = "✏️", saveLabel = "Guardar", saveIcon = "💾", cancelLabel = "Cancelar", cancelIcon = "✗", type = "text", inputAttrs = {}) {
        return new Promise((resolve, reject) => {
            const originalValue = value;

            const setAttributes = (element, attributes) => {
                Object.entries(attributes).forEach(([key, val]) => {
                    if (val !== null && val !== undefined) {
                        element.setAttribute(key, String(val));
                    }
                });
                return element;
            };

            const dialog = document.createElement('dialog');
            dialog.className = 'sch_dialog sch_dialog_grow_content';
            dialog.innerHTML = `
                <div class="sch_dialog_header">
                    <h2 class="sch_dialog_title">
                        ${icon ? `<span style="margin-right: 8px;">${icon}</span>` : ''}${title}
                    </h2>
                    <button class="sch_dialog_close" type="button">&times;</button>
                </div>
                <div class="sch_dialog_content">
                    <div class="sch_form_group">
                        <label class="sch_form_label">${label}<br>
                        <input class="sch_form_input"> 
                        <button type="button" 
                            class="sch_input_clear" 
                            role="button"
                            aria-label="Borrar la captura"
                            title="Borrar la captura">&times;</button>
                        </label>
                    </div>
                </div>
                <div class="sch_dialog_footer">
                    <button class="sch_dialog_button sch_dialog_button--secondary" type="button" data-action="cancel">
                        ${cancelIcon ? `<span style="margin-right: 6px;">${cancelIcon}</span>` : ''}${cancelLabel}
                    </button>
                    <button class="sch_dialog_button sch_dialog_button--primary" type="button" data-action="save">
                        ${saveIcon ? `<span style="margin-right: 6px;">${saveIcon}</span>` : ''}${saveLabel}
                    </button>
                </div>
            `;

            document.body.appendChild(dialog);

            const inputField = dialog.querySelector('input');
            setAttributes(inputField, {
                type: type,
                value: value,
                ...inputAttrs
            });

            const clearButton = dialog.querySelector('.sch_input_clear');
            clearButton.addEventListener('click', handleClearClick);

            function cleanup(shouldResolve = false, inputValue = null) {
                closeButton.removeEventListener('click', handleCancel);
                saveButton.removeEventListener('click', handleSave);
                cancelButton.removeEventListener('click', handleCancel);
                inputField.removeEventListener('keydown', handleKeydown);
                clearButton.removeEventListener('click', handleClearClick);
                dialog.removeEventListener('close', handleCancel);
                // OcDialogDrag.cleanup(dialog);
                dialog.remove();

                if (shouldResolve) {
                    resolve(inputValue);
                } else {
                    reject(null);
                }
            }

            function handleClearClick() {
                inputField.value = '';
                inputField.focus();
                clearButton.setAttribute('aria-label', `Input cleared. ${label} field is now empty.`);
                setTimeout(() => {
                    clearButton.setAttribute('aria-label', 'Clear input field');
                }, 2000);
            }

            function handleSave() {
                const value = inputField.value;
                dialog.close();
                cleanup(true, {
                    originalValue: originalValue,
                    value: value
                });
            }

            function handleCancel() {
                dialog.close();
                cleanup(false);
            }

            function handleKeydown(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSave();
                }
            }

            const closeButton = dialog.querySelector('.sch_dialog_close');
            const saveButton = dialog.querySelector('[data-action="save"]');
            const cancelButton = dialog.querySelector('[data-action="cancel"]');

            closeButton.addEventListener('click', handleCancel);
            saveButton.addEventListener('click', handleSave);
            cancelButton.addEventListener('click', handleCancel);
            inputField.addEventListener('keydown', handleKeydown);
            dialog.addEventListener('close', handleCancel);

            // OcDialogDrag.initialize(dialog);
            dialog.showModal();
            inputField.focus();
            inputField.select();
        });
    },

    /**
     * Form dialog
     * @param {Object} params - Form configuration
     * @returns {Promise<Object>} - Resolves with form data or rejects on cancel
     */
    form(params) {
        const {
            title = '✎ Edita',
            formContent = '',
            onValidate,
            onSave,
            saveLabel = '💾 Guardar',
            cancelLabel = '❌ Cancelar'
        } = params;

        return new Promise((resolve, reject) => {
            const dialog = document.createElement('dialog');
            dialog.className = 'sch_dialog sch_dialog_grow_content';
            dialog.innerHTML = `
            <div class="sch_dialog_header">
                <div class="sch_dialog_title"></div>
                <button class="sch_dialog_close" type="button">&times;</button>
            </div>
            <div class="sch_dialog_content"><div class="sch_errors sch_hidden"></div><form class="sch_form_tag" enctype="multipart/form-data" method="DIALOG"></form></div>
            <div class="sch_dialog_footer">
                <button class="sch_dialog_button sch_dialog_button--primary" type="button">${saveLabel}</button>
                <button class="sch_dialog_button sch_dialog_button--secondary" type="button">${cancelLabel}</button>
            </div>`;

            if(typeof title === 'string')
                dialog.querySelector('.sch_dialog_title').innerHTML = title;
            else
                dialog.querySelector('.sch_dialog_title').replaceChildren(title);

            if(typeof formContent === 'string')
                dialog.querySelector('.sch_form_tag').innerHTML = formContent;
            else
                dialog.querySelector('.sch_form_tag').replaceChildren(formContent);

            document.body.appendChild(dialog);
            const form = dialog.querySelector('.sch_form_tag');
            const saveBtn = dialog.querySelector('.sch_dialog_button--primary');
            const cancelBtn = dialog.querySelector('.sch_dialog_button--secondary');
            const closeBtn = dialog.querySelector('.sch_dialog_close');
            const serverErrors = dialog.querySelector('.sch_errors');

            function cleanup() {
                saveBtn.removeEventListener('click', onSaveClick);
                cancelBtn.removeEventListener('click', onCancel);
                closeBtn.removeEventListener('click', onCancel);
                // OcDialogDrag.cleanup(dialog);
                dialog.close();
                dialog.remove();
            }

            function onSaveClick(e) {
                saveBtn.disabled = true;
                e.preventDefault();
                if(!form.checkValidity()) {
                    form.reportValidity();
                    saveBtn.disabled = false;
                    return;
                }
                const formData = Object.fromEntries(new FormData(form).entries());
                if(typeof onValidate === "function" && !onValidate(formData)) {
                    saveBtn.disabled = false;
                    return;
                }

                Promise.resolve(onSave(formData))
                    .then(() => {
                        cleanup();
                        resolve(formData);
                    })
                    .catch(err => {
                        serverErrors.textContent = typeof err === 'string' ? err : 'An error occurred.';
                        serverErrors.style.display = 'block';
                        saveBtn.disabled = false;
                    });
            }

            function onCancel(e) {
                e.preventDefault();
                cleanup();
                reject(new Error(OcDialog.CANCELED));
            }

            saveBtn.addEventListener('click', onSaveClick);
            cancelBtn.addEventListener('click', onCancel);
            closeBtn.addEventListener('click', onCancel);
            // OcDialogDrag.initialize(dialog);
            dialog.showModal();
        });
    },

    // Utility functions
    utils: {
        clearButton(btn) {
            try {
                var input = btn.previousElementSibling;
                input.value = '';
                input.focus();
            } catch(er) {}
        },

        symbolRowInit() {
            //@TODO no debe ser document.
            document.querySelectorAll('.symbols-row').forEach(row => {
                row.removeEventListener('click', OcDialog.utils.symbolRowClick);
                row.addEventListener('click', OcDialog.utils.symbolRowClick);
            });
        },

        symbolRowClick(event) {
            function previousInput(el) {
                while(el) {
                    el = el.previousElementSibling;
                    if(el && el.tagName === 'INPUT') return el;
                }
                return null;
            }

            if(event.target.tagName !== 'SPAN') return;
            event.preventDefault();
            event.stopPropagation();
            const symbol = event.target.innerHTML;
            const input = previousInput(event.currentTarget.parentElement);
            if(input) {
                input.value += symbol;
                input.focus();
            }
        }
    }
};



// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        OcDialog.utils.symbolRowInit();
    });
} else {
    OcDialog.utils.symbolRowInit();
}
