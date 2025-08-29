/**
 * On html5 Dialogs
 * - z-Index magic: Browser automatically handles stacking via "top layer", Last opened dialog appears on top automatically
 * - "By default, HTML5 dialogs opened with showModal() are automatically centered both horizontally and vertically every time they open."
 */

/**
 *
 * @type {string}
 */
const SCH_DIALOG_CANCELED = 'DIALOG_CANCELED';
function sch_dialog_init() {
    // Close only .sch_dialog dialogs with Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const openDialog = document.querySelector('dialog.sch_dialog[open]');
            if (openDialog) {
                openDialog.close();
            }
        }
    });
    console.log('✅ sch_dialog_ini: initialized');
}

function schDialog({title = "", html, buttons = []}) {
    const dialog = document.createElement('dialog');
    dialog.className = 'sch_dialog sch_dialog_grow_content';
    dialog.innerHTML = `
        <div class="sch_dialog_header">
            <div class="sch_dialog_title"></div>
            <button class="sch_dialog_close" type="button">&times;</button>
        </div>
        <div class="sch_dialog_content"></div>
        <div class="sch_dialog_footer"></div>`;
    if(typeof title === 'string')
        dialog.querySelector('.sch_dialog_title').innerHTML = title;
    else
        dialog.querySelector('.sch_dialog_title').replaceChildren(title);
    if(typeof html === 'string')
        dialog.querySelector('.sch_dialog_content').innerHTML = html;
    else
        dialog.querySelector('.sch_dialog_content').replaceChildren(html);
    if(buttons.length) {

    } else {
        dialog.querySelector('.sch_dialog_footer').remove();
    }

    document.body.appendChild(dialog);
    OcDialogDrag.initialize(dialog);
    dialog.showModal();
}

/**
 * SCH Alert Function - Simple alert dialog using SCH Dialog System
 * Displays a modal alert dialog with customizable message, title, icon and button
 *
 * @param {string} message - The alert message to display
 * @param {string} title - Dialog title (default: "Aviso")
 * @param {string} icon - UTF-8 icon to display in title (default: "⚠️")
 * @param {string} button_label - Button text (default: "Ok")
 * @param {string} button_icon - UTF-8 icon for button (default: "✓")
 *
 * @returns {Promise<boolean>} - Resolves to true when dialog is closed
 */
function schAlert(message, title = "Aviso", icon = "⚠️", button_label = "Ok", button_icon = "✓") {
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
                    ${button_icon ? `<span style="margin-right: 6px;">${button_icon}</span>` : ''}${button_label}
                </button>
            </div>
        `;

        document.body.appendChild(dialog);

        // Function to clean up and resolve
        function cleanup() {
            // Remove event listeners
            closeButton.removeEventListener('click', handleClose);
            okButton.removeEventListener('click', handleClose);
            dialog.removeEventListener('close', handleClose);

            OcDialogDrag.cleanup(dialog);
            // Remove from DOM
            dialog.remove();

            // Resolve promise
            resolve(true);
        }

        // Handle close events
        function handleClose() {
            dialog.close();
        }

        // Get buttons after dialog is created
        const closeButton = dialog.querySelector('.sch_dialog_close');
        const okButton = dialog.querySelector('.sch_dialog_button--primary');

        // Add event listeners
        closeButton.addEventListener('click', handleClose);
        okButton.addEventListener('click', handleClose);

        // Handle dialog close event (cleanup)
        dialog.addEventListener('close', cleanup);

        OcDialogDrag.initialize(dialog);
        dialog.showModal();

        // Focus the OK button for better UX
        okButton.focus();
    });
}

/**
 * SCH Info Function - Information dialog using SCH Alert System
 * Wrapper around schAlert() with information-specific defaults
 *
 * @param {string} message - The information message to display
 * @param {string} title - Dialog title (default: "Info")
 * @param {string} icon - UTF-8 icon to display in title (default: "ℹ️")
 * @param {string} button_label - Button text (default: "Ok")
 * @param {string} button_icon - UTF-8 icon for button (default: "✓")
 *
 * @returns {Promise<boolean>} - Resolves to true when dialog is closed
 */
function schInfo(message, title = "Info", icon = "ℹ️", button_label = "Ok", button_icon = "✓") {
    return schAlert(message, title, icon, button_label, button_icon);
}

/**
 * SCH Error Function - Information dialog using SCH Alert System
 * Wrapper around schAlert() with information-specific defaults
 *
 * @param {string} message - The information message to display
 * @param {string} title - Dialog title (default: "Info")
 * @param {string} icon - UTF-8 icon to display in title (default: "🔴") 🔺
 * @param {string} button_label - Button text (default: "Ok")
 * @param {string} button_icon - UTF-8 icon for button (default: "🔺")
 *
 * @returns {Promise<boolean>} - Resolves to true when dialog is closed
 */
function schError(message, title = "Error", icon = "🔴", button_label = "Entendido", button_icon = "🔺") {
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
    return schAlert(errorWrappedMessage, title, icon, button_label, button_icon);
}

/**
 * SCH Confirm Function - Confirmation dialog using SCH Dialog System
 * Displays a modal confirmation dialog with OK/Cancel buttons
 *
 * @param {string} message - The confirmation message to display
 * @param {string} title - Dialog title (default: "Confirme")
 * @param {string} icon - UTF-8 icon to display in title (default: "❓")
 * @param {string} okLabel - OK button text (default: "Si")
 * @param {string} okIcon - UTF-8 icon for OK button (default: "✓")
 * @param {string} cancelLabel - Cancel button text (default: "No")
 * @param {string} cancelIcon - UTF-8 icon for Cancel button (default: "✗")
 *
 * @returns {Promise<boolean>} - Resolves to true on OK, rejects on Cancel/Close/Escape
 */
function schConfirm(message, title = "Confirme", icon = "❓", okLabel = "Si", okIcon = "✓", cancelLabel = "No", cancelIcon = "✗") {
    return new Promise((resolve, reject) => {
        // Create unique dialog element
        const dialog = document.createElement('dialog');
        dialog.className = 'sch_dialog sch_dialog_grow_content';

        // Build dialog HTML structure
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

        // Append to body
        document.body.appendChild(dialog);

        // Function to clean up and reject (cancel/close)
        function cleanup(shouldResolve = false) {
            // Remove event listeners
            closeButton.removeEventListener('click', handleCancel);
            okButton.removeEventListener('click', handleOk);
            cancelButton.removeEventListener('click', handleCancel);
            dialog.removeEventListener('close', handleCancel);
            OcDialogDrag.cleanup(dialog);
            // Remove from DOM
            dialog.remove();

            // Resolve or reject promise
            if (shouldResolve) {
                resolve(true);
            } else {
                reject(false);
            }
        }

        // Handle OK button
        function handleOk() {
            dialog.close();
            cleanup(true); // Resolve with true
        }

        // Handle Cancel/Close events
        function handleCancel() {
            dialog.close();
            cleanup(false); // Reject with false
        }

        // Get buttons after dialog is created
        const closeButton = dialog.querySelector('.sch_dialog_close');
        const okButton = dialog.querySelector('[data-action="ok"]');
        const cancelButton = dialog.querySelector('[data-action="cancel"]');

        // Add event listeners
        closeButton.addEventListener('click', handleCancel);
        okButton.addEventListener('click', handleOk);
        cancelButton.addEventListener('click', handleCancel);

        // Handle dialog close event (Escape key, backdrop click)
        dialog.addEventListener('close', handleCancel);

        OcDialogDrag.initialize(dialog);
        dialog.showModal();

        // Focus the OK button for better UX
        okButton.focus();
    });
}

/**
 * SCH Borrar Function - Delete confirmation dialog using SCH Confirm System
 * Wrapper around schConfirm() with delete-specific defaults
 *
 * @param {string} message - The delete confirmation message to display
 * @param {string} title - Dialog title (default: "Confirme Borrar")
 * @param {string} icon - UTF-8 icon to display in title (default: "🗑️")
 * @param {string} okLabel - Delete button text (default: "Eliminar")
 * @param {string} okIcon - UTF-8 icon for delete button (default: "🗑️")
 * @param {string} cancelLabel - Cancel button text (default: "Cancelar")
 * @param {string} cancelIcon - UTF-8 icon for cancel button (default: "✗")
 *
 * @returns {Promise<boolean>} - Resolves to true on delete confirmation, rejects on cancel
 */
function schConfirmBorrar(message, title = "Confirme Borrar", icon = "🗑️", okLabel = "Eliminar", okIcon = "🗑️", cancelLabel = "Cancelar", cancelIcon = "✗") {
    return schConfirm(message, title, icon, okLabel, okIcon, cancelLabel, cancelIcon);
}

/**
 * SCH Text Edit Function - Single field text editing dialog using SCH Dialog System
 * Displays a modal text input dialog for editing a single field value
 *
 * @param {string} value - Initial value for the input field
 * @param {string} label - Label text to display above the input (default: "Valor")
 * @param {string} title - Dialog title (default: "Editar")
 * @param {string} icon - UTF-8 icon to display in title (default: "✏️")
 * @param {string} saveLabel - Save button text (default: "Guardar")
 * @param {string} saveIcon - UTF-8 icon for save button (default: "💾")
 * @param {string} cancelLabel - Cancel button text (default: "Cancelar")
 * @param {string} cancelIcon - UTF-8 icon for cancel button (default: "✗")
 * @param {string} type - Input type attribute (default: "text")
 * @param {Object} inputAttrs - Additional input attributes (default: {})
 *
 * @returns {Promise<string>} - const result = await schTextEdit(currentName, "Full Name", "Edit User Name"); console.log("Original name:", result.originalValue + " new value=" + result.value);
 */
function schTextEdit(value = "", label = "Valor", title = "Editar", icon = "✏️", saveLabel = "Guardar", saveIcon = "💾", cancelLabel = "Cancelar", cancelIcon = "✗", type = "text", inputAttrs = {}) {
    return new Promise((resolve, reject) => {
        const originalValue = value;
        // jQuery-like attribute setter using proper DOM methods
        const setAttributes = (element, attributes) => {
            Object.entries(attributes).forEach(([key, val]) => {
                if (val !== null && val !== undefined) {
                    // Use setAttribute - browser handles escaping automatically
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

        // Append to body
        document.body.appendChild(dialog);

        // Set attributes using setAttribute - browser handles any escaping automatically
        const inputField = dialog.querySelector('input');
        setAttributes(inputField, {
            type: type,
            value: value,
            ...inputAttrs
        });

        const clearButton = dialog.querySelector('.sch_input_clear');
        clearButton.addEventListener('click', handleClearClick);

        // Function to clean up and reject (cancel/close)
        function cleanup(shouldResolve = false, inputValue = null) {
            // Remove event listeners
            closeButton.removeEventListener('click', handleCancel);
            saveButton.removeEventListener('click', handleSave);
            cancelButton.removeEventListener('click', handleCancel);
            inputField.removeEventListener('keydown', handleKeydown);
            clearButton.removeEventListener('click', handleClearClick);
            dialog.removeEventListener('close', handleCancel);
            OcDialogDrag.cleanup(dialog);
            // Remove from DOM
            dialog.remove();
            console.log("cleanup manda",inputValue)
            // Resolve or reject promise
            if (shouldResolve) {
                resolve(inputValue);
            } else {
                reject(null);
            }
        }

        function handleClearClick() {
            inputField.value = '';
            inputField.focus();
            // Announce to screen readers
            clearButton.setAttribute('aria-label', `Input cleared. ${label} field is now empty.`);
            // Reset aria-label after a moment
            setTimeout(() => {
                clearButton.setAttribute('aria-label', 'Clear input field');
            }, 2000);
        }
        // Handle Save button
        function handleSave() {
            const value = inputField.value;
            dialog.close();

            cleanup(true, {
                originalValue: originalValue,
                value: value
            });
        }

        // Handle Cancel/Close events
        function handleCancel() {
            dialog.close();
            cleanup(false);
        }

        // Handle Enter and Escape keys
        function handleKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
            }
        }

        // Get elements after dialog is created
        const closeButton = dialog.querySelector('.sch_dialog_close');
        const saveButton = dialog.querySelector('[data-action="save"]');
        const cancelButton = dialog.querySelector('[data-action="cancel"]');

        // Add event listeners
        closeButton.addEventListener('click', handleCancel);
        saveButton.addEventListener('click', handleSave);
        cancelButton.addEventListener('click', handleCancel);
        inputField.addEventListener('keydown', handleKeydown);

        // Handle dialog close event (Escape key, backdrop click)
        dialog.addEventListener('close', handleCancel);

        OcDialogDrag.initialize(dialog);
        dialog.showModal();

        // Focus the input field and select all text for easy editing
        inputField.focus();
        inputField.select();
    });
}


function schForm(params) {
    const {
        title = '✎ Edita',
        formContent = '',
        onValidate,
        onSave,
        saveLabel = '💾 Guardar',
        cancelLabel = '❌ Cancelar'
    } = params

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
            OcDialogDrag.cleanup(dialog);
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
                    resolve(formData); // Resolve the promise with form data
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
            reject(new Error(SCH_DIALOG_CANCELED));
        }

        saveBtn.addEventListener('click', onSaveClick);
        cancelBtn.addEventListener('click', onCancel);
        closeBtn.addEventListener('click', onCancel);
        OcDialogDrag.initialize(dialog);
        dialog.showModal();
    });
}

/*
Example usage:

// Basic alert
schAlert("Operation completed successfully!");

// Custom title and icon
schAlert("Are you sure you want to continue?", "Confirmation", "❓");

// Full customization
schAlert("File saved successfully!", "Success", "✅", "Great!", "👍");

// Using with async/await
async function example() {
    await schAlert("Please wait while we process your request...", "Processing", "⏳", "Got it", "👌");
    console.log("User acknowledged the alert");
}

// Using with .then()
schAlert("Welcome to the application!", "Welcome", "👋", "Let's Start", "🚀")
    .then(() => {
        console.log("User clicked OK");
    });

    // Basic confirm
schConfirm("Are you sure you want to delete this item?")
    .then(() => {
        console.log("User confirmed - proceed with deletion");
    })
    .catch(() => {
        console.log("User cancelled - no action taken");
    });

// Custom confirm
schConfirm("Do you want to save changes?", "Save Changes", "💾", "Save", "💾", "Discard", "🗑️")
    .then(() => {
        console.log("User chose to save");
    })
    .catch(() => {
        console.log("User chose to discard");
    });

// Using with async/await
async function deleteItem() {
    try {
        await schConfirm("This action cannot be undone. Continue?", "Delete Item", "⚠️", "Delete", "🗑️", "Keep", "🛡️");
        // User confirmed - proceed with deletion
        console.log("Deleting item...");
    } catch {
        // User cancelled - no action
        console.log("Deletion cancelled");
    }
}

try {
const result = await schTextEdit(currentName, "Full Name", "Edit User Name"); console.log("Original name:", result.originalValue + " new value=" + result.value);
}catch (error) {
        console.log("Edit was cancelled");
    }
// Example with .then() syntax
function editDescription() {
    const currentDescription = "This is the current description";

    schTextEdit(currentDescription, "Description", "Edit Description", "📝")
        .then(result => {
            console.log("Edit completed:");
            console.log("- Original:", result.originalValue);
            console.log("- New:", result.value);
            console.log("- Changed:", result.originalValue !== result.value);

            // Destructure for cleaner code
            const { originalValue, value } = result;

            if (originalValue !== value) {
                saveDescription(value);
                showSuccessMessage(`Description updated from "${originalValue}" to "${value}"`);
            }
        })
        .catch(() => {
            console.log("Description edit was cancelled");
        });
}

*/

function clear_btn(btn) {
    try {
        var input = btn.previousElementSibling;
        input.value = '';
        input.focus();
    } catch(er) {}
}
function symbolRowInit() {
    document.querySelectorAll('.symbols-row').forEach(row => {
        row.removeEventListener('click', symbolRowClick);
        row.addEventListener('click', symbolRowClick);
    });
}
function symbolRowClick(event) {
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
if(document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', symbolRowInit);
else
    symbolRowInit();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sch_dialog_init);
} else {
    sch_dialog_init();
}

