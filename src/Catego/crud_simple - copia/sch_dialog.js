
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

        // Show dialog
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
        dialog.className = 'sch_dialog sch_dialog--medium sch_dialog_grow_content';

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

        // Show dialog
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


// Example usage:
/*
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
*/

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sch_dialog_init);
} else {
    sch_dialog_init();
}

