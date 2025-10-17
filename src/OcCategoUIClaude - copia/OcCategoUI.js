// File: OcCategoUI.js
// Version: 1.7.1 - Fixed multi-instance support

/**
 * OcCategoUI - A stateless widget for editing Tom Select options
 * Each instance is independent with no central management
 */
class OcCategoUI {
    constructor(selectElement, options = {}) {
        this.selectElement = selectElement;
        this.dialogId = null;
        this.currentOptions = new Map();
        this.editingValue = null;
        this.wrapperDiv = null;

        // Default options
        this.options = {
            apiUrl: './api/categories.php',
            dialogTitle: 'Editar Categorias',
            confirmDelete: true,
            ...options
        };

        this.init();
    }

    init() {
        // Generate unique IDs for this instance
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        this.dialogId = `OcCategoUI_dialog_${timestamp}_${random}`;
        this.editButtonId = `OcCategoUI_editBtn_${timestamp}_${random}`;

        // Create wrapper FIRST (before Tom Select)
        this.createWrapperEarly();

        // Initialize Tom Select if not already initialized
        if (!this.selectElement.tomselect) {
            const isMultiple = this.selectElement.hasAttribute('multiple');

            const preSelectedValues = Array.from(this.selectElement.querySelectorAll('option[selected]'))
                .map(opt => opt.value);

            new TomSelect(this.selectElement, {
                plugins: isMultiple ? ['remove_button'] : [],
                create: false,
                sortField: { field: 'text', direction: 'asc' },
                maxItems: isMultiple ? null : 1,
                items: preSelectedValues
            });
        }

        // Read current options from select element
        this.loadOptionsFromSelect();

        // Create edit button inside wrapper
        this.createEditButton();
        this.createCopyButton();

        // Create dialog
        this.createDialog();
    }

    getTomSelectInstance() {
        return this.selectElement.tomselect || null;
    }

    createWrapperEarly() {
        // Create wrapper div
        this.wrapperDiv = document.createElement('div');
        this.wrapperDiv.className = 'OcCategoUI_wrapper';

        // Insert wrapper BEFORE the select element
        this.selectElement.parentNode.insertBefore(this.wrapperDiv, this.selectElement);

        // Move select INTO wrapper
        this.wrapperDiv.appendChild(this.selectElement);
    }

    loadOptionsFromSelect() {
        this.currentOptions.clear();

        const options = this.selectElement.querySelectorAll('option');

        options.forEach(option => {
            if (option.value) {
                console.log("option to add", option.value, option.textContent);
                this.currentOptions.set(option.value, {
                    value: option.value,
                    text: option.textContent,
                    selected: option.selected
                });
            }
        });
    }

    createEditButton() {
        const editButton = document.createElement('button');
        editButton.id = this.editButtonId;
        editButton.type = 'button';
        editButton.className = 'OcCategoUI_editButton ui-state-default ui-corner-all';
        editButton.innerHTML = '✏️';
        editButton.title = 'Editar Categorias';

        // Add button to wrapper
        this.wrapperDiv.appendChild(editButton);

        // Apply jQuery UI button styling
        $(editButton).button();

        editButton.addEventListener('click', () => {
            this.openDialog();
        });
    }
    createCopyButton() {
        const editButton = document.createElement('button');
        editButton.id = this.editButtonId;
        editButton.type = 'button';
        editButton.className = 'OcCategoUI_editButton ui-state-default ui-corner-all';
        editButton.innerHTML = '&forall;';
        editButton.title = 'Copiar';

        // Add button to wrapper
        this.wrapperDiv.appendChild(editButton);

        // Apply jQuery UI button styling
        $(editButton).button();

        editButton.addEventListener('click', () => {
           // this.openDialog();
        });
    }
    createDialog() {
        const dialogHtml = `
            <div id="${this.dialogId}" class="OcCategoUI_dialog ui-widget" title="${this.options.dialogTitle}">
                <div class="OcCategoUI_dialogContent ui-widget-content">
                    <div class="OcCategoUI_searchToolbar ui-widget-header ui-corner-all">
                        <input type="text" id="${this.dialogId}_search" class="OcCategoUI_searchInput ui-widget-content ui-corner-all" placeholder="🔍 Buscar ...">
                        <button type="button" id="${this.dialogId}_searchClear" class="OcCategoUI_searchClear ui-state-default ui-corner-all">×</button>
                    </div>
                    <div class="OcCategoUI_optionsList ui-widget-content" id="${this.dialogId}_list"></div>
                    <div class="OcCategoUI_toolbar">
                        <button type="button" id="${this.dialogId}_addBtn" class="OcCategoUI_addButton ui-state-default ui-corner-all">Nueva Categoría</button>
                    </div>
                    <div class="OcCategoUI_addForm ui-state-highlight ui-corner-all" id="${this.dialogId}_addForm" style="display: none;">
                        <input type="text" id="${this.dialogId}_newText" class="OcCategoUI_addInput ui-widget-content ui-corner-all" placeholder="Categoría...">
                        <div class="OcCategoUI_addActions">
                            <button type="button" id="${this.dialogId}_saveNew" class="OcCategoUI_saveBtn ui-state-default ui-corner-all">✓</button>
                            <button type="button" id="${this.dialogId}_cancelNew" class="OcCategoUI_cancelBtn ui-state-default ui-corner-all">✗</button>
                        </div>
                    </div>
                </div>
            </div>`;

        // Append dialog to body
        document.body.insertAdjacentHTML('beforeend', dialogHtml);

        // Initialize jQuery UI dialog
        $(`#${this.dialogId}`).dialog({
            autoOpen: false,
            width: 600,
            height: 500,
            modal: true,
            resizable: true,
            close: () => {
                this.hideAllForms();
                this.cancelAllEditing();
            }
        });

        // Apply jQuery UI button styling to all buttons
        $(`#${this.dialogId}_addBtn`).button();
        $(`#${this.dialogId}_searchClear`).button();
        $(`#${this.dialogId}_saveNew`).button();
        $(`#${this.dialogId}_cancelNew`).button();

        // Bind events
        this.bindDialogEvents();
    }

    bindDialogEvents() {
        // Search functionality
        $(`#${this.dialogId}_search`).on('input', (e) => {
            this.filterOptions(e.target.value);
        });

        // Clear search
        $(`#${this.dialogId}_searchClear`).on('click', () => {
            document.getElementById(`${this.dialogId}_search`).value = '';
            this.filterOptions('');
        });

        // Add button
        $(`#${this.dialogId}_addBtn`).on('click', () => {
            this.showAddForm();
        });

        // Add form buttons
        $(`#${this.dialogId}_saveNew`).on('click', () => {
            this.saveNewOption();
        });

        $(`#${this.dialogId}_cancelNew`).on('click', () => {
            this.hideAllForms();
        });

        // Enter key handling for add form
        $(`#${this.dialogId}_newText`).on('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveNewOption();
            } else if (e.key === 'Escape') {
                this.hideAllForms();
            }
        });
    }

    openDialog() {
        this.loadOptionsFromSelect();
        this.renderOptionsList();
        $(`#${this.dialogId}`).dialog('open');
    }

    renderOptionsList() {
        const listContainer = document.getElementById(`${this.dialogId}_list`);
        let html = '';

        this.currentOptions.forEach((option) => {
            console.log("renderOptionsList:", option.value, option.text);
            const escapedValue = this.escapeHtml(option.value);
            const escapedText = this.escapeHtml(option.text);

            html += `
                <div class="OcCategoUI_optionItem ui-widget-content ui-corner-all" data-value="${escapedValue}">
                    <!-- View mode -->
                    <div class="OcCategoUI_optionDisplay" data-mode="view">
                        <span class="OcCategoUI_optionText">${escapedText}</span>
                        <div class="OcCategoUI_optionActions">
                            <button type="button" class="OcCategoUI_editBtn ui-state-default ui-corner-all" data-value="${escapedValue}" title="Edit">✏️</button>
                            <button type="button" class="OcCategoUI_deleteBtn ui-state-default ui-corner-all" data-value="${escapedValue}" title="Delete">🗑️</button>
                        </div>
                    </div>
                    <!-- Edit mode -->
                    <div class="OcCategoUI_optionEdit ui-state-highlight ui-corner-all" data-mode="edit" style="display: none;">
                        <input type="text" class="OcCategoUI_inlineInput ui-widget-content ui-corner-all" value="${escapedText}" data-original-value="${escapedText}">
                        <div class="OcCategoUI_inlineActions">
                            <button type="button" class="OcCategoUI_saveBtn ui-state-default ui-corner-all" data-value="${escapedValue}" title="Save">✓</button>
                            <button type="button" class="OcCategoUI_cancelBtn ui-state-default ui-corner-all" data-value="${escapedValue}" title="Cancel">✗</button>
                        </div>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;

        // Apply jQuery UI button styling to all newly created buttons
        $(`#${this.dialogId}_list .ui-state-default`).button();

        // Bind option actions
        this.bindOptionEvents();
    }

    bindOptionEvents() {
        const listContainer = document.getElementById(`${this.dialogId}_list`);

        // Edit buttons
        listContainer.querySelectorAll('.OcCategoUI_editBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.target.getAttribute('data-value');
                this.startInlineEdit(value);
            });
        });

        // Delete buttons
        listContainer.querySelectorAll('.OcCategoUI_deleteBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.target.getAttribute('data-value');
                this.deleteOption(value);
            });
        });

        // Save buttons (inline edit)
        listContainer.querySelectorAll('.OcCategoUI_saveBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.target.getAttribute('data-value');
                this.saveInlineEdit(value);
            });
        });

        // Cancel buttons (inline edit)
        listContainer.querySelectorAll('.OcCategoUI_cancelBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.target.getAttribute('data-value');
                this.cancelInlineEdit(value);
            });
        });

        // Enter key to save, Escape to cancel
        listContainer.querySelectorAll('.OcCategoUI_inlineInput').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const value = e.target.closest('.OcCategoUI_optionItem').getAttribute('data-value');
                    this.saveInlineEdit(value);
                } else if (e.key === 'Escape') {
                    const value = e.target.closest('.OcCategoUI_optionItem').getAttribute('data-value');
                    this.cancelInlineEdit(value);
                }
            });
        });
    }

    startInlineEdit(value) {
        // Cancel any other editing first
        this.cancelAllEditing();

        // FIXED: Scope to this dialog instance
        const dialogElement = document.getElementById(this.dialogId);
        const optionItem = dialogElement.querySelector(`.OcCategoUI_optionItem[data-value="${CSS.escape(value)}"]`);
        if (!optionItem) return;

        const displayMode = optionItem.querySelector('.OcCategoUI_optionDisplay');
        const editMode = optionItem.querySelector('.OcCategoUI_optionEdit');

        displayMode.style.display = 'none';
        editMode.style.display = 'flex';

        // Focus the input
        const input = editMode.querySelector('.OcCategoUI_inlineInput');
        input.focus();
        input.select();

        this.editingValue = value;
    }

    cancelInlineEdit(value) {
        // FIXED: Scope to this dialog instance
        const dialogElement = document.getElementById(this.dialogId);
        const optionItem = dialogElement.querySelector(`.OcCategoUI_optionItem[data-value="${CSS.escape(value)}"]`);
        if (!optionItem) return;

        const displayMode = optionItem.querySelector('.OcCategoUI_optionDisplay');
        const editMode = optionItem.querySelector('.OcCategoUI_optionEdit');
        const input = optionItem.querySelector('.OcCategoUI_inlineInput');

        // Restore original value
        input.value = input.getAttribute('data-original-value');

        displayMode.style.display = 'flex';
        editMode.style.display = 'none';

        this.editingValue = null;
    }

    cancelAllEditing() {
        const editModes = document.querySelectorAll(`#${this.dialogId} .OcCategoUI_optionEdit`);
        const displayModes = document.querySelectorAll(`#${this.dialogId} .OcCategoUI_optionDisplay`);

        editModes.forEach(edit => edit.style.display = 'none');
        displayModes.forEach(display => display.style.display = 'flex');

        this.editingValue = null;
    }

    filterOptions(searchTerm) {
        const listContainer = document.getElementById(`${this.dialogId}_list`);
        const items = listContainer.querySelectorAll('.OcCategoUI_optionItem');

        const searchLower = searchTerm.toLowerCase();

        items.forEach(item => {
            const text = item.querySelector('.OcCategoUI_optionText').textContent.toLowerCase();
            const matches = text.includes(searchLower);
            item.style.display = matches ? 'block' : 'none';
        });

        // Show/hide clear button
        const clearBtn = document.getElementById(`${this.dialogId}_searchClear`);
        clearBtn.style.display = searchTerm ? 'block' : 'none';
    }

    showAddForm() {
        this.hideAllForms();
        this.cancelAllEditing();
        document.getElementById(`${this.dialogId}_addForm`).style.display = 'flex';
        // Clear and focus form
        const input = document.getElementById(`${this.dialogId}_newText`);
        input.value = '';
        input.focus();
    }

    hideAllForms() {
        document.getElementById(`${this.dialogId}_addForm`).style.display = 'none';
    }

    addOptionToSelect(option, markSelected = true) {
        // Check if option already exists in select element
        let optionElement = this.selectElement.querySelector(`option[value="${CSS.escape(option.value)}"]`);

        if (!optionElement) {
            // Only create if doesn't exist
            optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            this.selectElement.appendChild(optionElement);
        } else {
            // Update text if it already exists
            optionElement.textContent = option.text;
        }

        if (markSelected) {
            optionElement.selected = true;
        }

        // Step 2: Update Tom Select
        let tomSelectInstance = this.getTomSelectInstance();
        if (tomSelectInstance) {
            // Check if option exists in Tom Select
            if (!tomSelectInstance.options[option.value]) {
                tomSelectInstance.addOption({
                    value: option.value,
                    text: option.text
                });
            }

            if (markSelected) {
                tomSelectInstance.addItem(option.value, false);
            }
        }
    }

    removeOptionFromSelect(optionValue) {
        // Step 1: Update the underlying <select> element
        const optionElement = this.selectElement.querySelector(`option[value="${CSS.escape(optionValue)}"]`);
        if (optionElement) {
            optionElement.remove();
        }

        // Step 2: Update Tom Select directly
        let tomSelectInstance = this.getTomSelectInstance();
        if (tomSelectInstance) {
            // First remove from selection if selected
            const currentValues = tomSelectInstance.getValue();
            if (Array.isArray(currentValues) ? currentValues.includes(optionValue) : currentValues === optionValue) {
                tomSelectInstance.removeItem(optionValue, true);
            }

            // Then remove the option itself
            tomSelectInstance.removeOption(optionValue);
        }
    }

    updateOptionInSelect(optionValue, newText) {
        // Step 1: Update the underlying <select> element
        const optionElement = this.selectElement.querySelector(`option[value="${CSS.escape(optionValue)}"]`);
        if(optionElement) {
            optionElement.textContent = newText;
        }

        let tomSelectInstance = this.getTomSelectInstance();
        if(tomSelectInstance) {
            // Check if this option is currently selected
            const currentValues = tomSelectInstance.getValue();
            const isSelected = Array.isArray(currentValues)
                ? currentValues.includes(optionValue)
                : currentValues === optionValue;

            // Update the option data in Tom Select
            tomSelectInstance.updateOption(optionValue, {
                value: optionValue,
                text: newText
            });

            if(isSelected) {
                tomSelectInstance.removeItem(optionValue, true);
                tomSelectInstance.addItem(optionValue, false);
            }
        }
    }

    async saveInlineEdit(value) {
        // FIXED: Scope to this dialog instance
        const dialogElement = document.getElementById(this.dialogId);
        const optionItem = dialogElement.querySelector(`.OcCategoUI_optionItem[data-value="${CSS.escape(value)}"]`);
        if (!optionItem) return;

        const input = optionItem.querySelector('.OcCategoUI_inlineInput');
        const newText = input.value.trim();

        // Validate the new text (exclude current value from check)
        const validation = this.validOption(null, newText, value);
        if (!validation.valid) {
            await this.showAlert(validation.error);
            input.focus();
            return;
        }

        const option = this.currentOptions.get(value);
        if (!option) return;

        // Send AJAX request
        $.ajax({
            url: this.options.apiUrl,
            method: 'POST',
            data: {
                action: 'update',
                id: value,
                text: newText
            },
            dataType: 'json',
            success: (response) => {
                if (response.success) {
                    option.text = newText;
                    this.updateOptionInSelect(value, newText);
                    optionItem.querySelector('.OcCategoUI_optionText').textContent = newText;
                    this.cancelInlineEdit(value);
                } else {
                    this.showAlert('Error: ' + (response.error || 'Failed to update option'));
                }
            },
            error: () => {
                this.showAlert('Network error occurred while updating option');
            }
        });
    }

    async saveNewOption() {
        const text = document.getElementById(`${this.dialogId}_newText`).value.trim();

        // Validate the new option
        const validation = this.validOption(null, text, null);
        if (!validation.valid) {
            await this.showAlert(validation.error);
            document.getElementById(`${this.dialogId}_newText`).focus();
            return;
        }

        $.ajax({
            url: this.options.apiUrl,
            method: 'POST',
            data: {
                action: 'add',
                text: text
            },
            dataType: 'json',
            success: (response) => {
                if (response.success) {
                    const newValue = response.data && response.data.id ? response.data.id : Date.now().toString();

                    const finalValidation = this.validOption(newValue, text, null);
                    if (!finalValidation.valid) {
                        this.showAlert(finalValidation.error);
                        return;
                    }

                    const newOption = {
                        value: newValue,
                        text: text,
                        selected: true
                    };

                    this.addOptionToSelect(newOption, true);
                    this.loadOptionsFromSelect();
                    this.renderOptionsList();
                    this.hideAllForms();
                } else {
                    this.showAlert('Error: ' + (response.error || 'Failed to add option'));
                }
            },
            error: () => {
                this.showAlert('Network error occurred while adding option');
            }
        });
    }

    async deleteOption(value) {
        const option = this.currentOptions.get(value);
        if (!option) return;

        if (this.options.confirmDelete) {
            const confirmed = await this.showConfirm(`Confirme borrar: "${option.text}"?`);
            if (!confirmed) {
                return;
            }
        }

        // Send AJAX request
        $.ajax({
            url: this.options.apiUrl,
            method: 'POST',
            data: {
                action: 'delete',
                id: value
            },
            dataType: 'json',
            success: (response) => {
                if (response.success) {
                    this.removeOptionFromSelect(value);
                    this.currentOptions.delete(value);
                    this.renderOptionsList();
                } else {
                    this.showAlert('Error: ' + (response.error || 'No se pudo borrar'));
                }
            },
            error: () => {
                this.showAlert('Error al borrar, intente mas tarde');
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    validOption(value, text, excludeValue = null) {
        const trimmedText = text.trim();

        if (!trimmedText) {
            return {
                valid: false,
                error: 'Text cannot be empty'
            };
        }

        const normalizeText = (str) => {
            return str.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase().trim();
        };

        const normalizedNewText = normalizeText(trimmedText);

        for (const [optValue, option] of this.currentOptions) {
            if (excludeValue && optValue === excludeValue) {
                continue;
            }

            if (value && optValue === value) {
                return {
                    valid: false,
                    error: `Value "${value}" already exists`
                };
            }

            const normalizedExistingText = normalizeText(option.text);
            if (normalizedExistingText === normalizedNewText) {
                return {
                    valid: false,
                    error: `Text "${trimmedText}" already exists (as "${option.text}")`
                };
            }
        }

        return {
            valid: true,
            error: null
        };
    }

    showAlert(message) {
        return new Promise((resolve) => {
            const dialog = document.createElement('dialog');
            dialog.className = 'OcCategoUI_alertDialog';

            dialog.innerHTML = `
            <div class="OcCategoUI_dialogHeader">
                <h3 class="OcCategoUI_dialogTitle">Aviso</h3>
            </div>
            <div class="OcCategoUI_dialogBody">
                ${this.escapeHtml(message)}
            </div>
            <div class="OcCategoUI_dialogFooter">
                <button type="button" class="OcCategoUI_dialogButton primary">OK</button>
            </div>
        `;

            document.body.appendChild(dialog);
            dialog.style.zIndex = '10000';

            const okButton = dialog.querySelector('.OcCategoUI_dialogButton');

            const closeDialog = () => {
                dialog.close();
                dialog.remove();
                resolve();
            };

            okButton.addEventListener('click', closeDialog);

            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    closeDialog();
                }
            });

            dialog.showModal();
            okButton.focus();
        });
    }

    showConfirm(message) {
        return new Promise((resolve) => {
            const dialog = document.createElement('dialog');
            dialog.className = 'OcCategoUI_confirmDialog';

            dialog.innerHTML = `
            <div class="OcCategoUI_dialogHeader">
                <h3 class="OcCategoUI_dialogTitle">Confirmar</h3>
            </div>
            <div class="OcCategoUI_dialogBody">
                ${this.escapeHtml(message)}
            </div>
            <div class="OcCategoUI_dialogFooter">
                <button type="button" class="OcCategoUI_dialogButton" data-action="cancel">Cancelar</button>
                <button type="button" class="OcCategoUI_dialogButton danger" data-action="confirm">Confirmar</button>
            </div>
        `;

            document.body.appendChild(dialog);
            dialog.style.zIndex = '10000';

            const cancelButton = dialog.querySelector('[data-action="cancel"]');
            const confirmButton = dialog.querySelector('[data-action="confirm"]');

            const closeDialog = (confirmed) => {
                dialog.close();
                dialog.remove();
                resolve(confirmed);
            };

            cancelButton.addEventListener('click', () => closeDialog(false));
            confirmButton.addEventListener('click', () => closeDialog(true));

            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeDialog(false);
                } else if (e.key === 'Enter') {
                    closeDialog(true);
                }
            });

            dialog.showModal();
            confirmButton.focus();
        });
    }

    destroy() {
        if (this.wrapperDiv && this.wrapperDiv.parentNode) {
            const tsWrapper = this.wrapperDiv.querySelector('.ts-wrapper');
            if (tsWrapper) {
                this.wrapperDiv.parentNode.insertBefore(tsWrapper, this.wrapperDiv);
            }
            this.wrapperDiv.remove();
        }

        const dialog = $(`#${this.dialogId}`);
        if (dialog.length) {
            dialog.dialog('destroy');
            dialog.remove();
        }
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', function() {
    const elements = document.querySelectorAll('[data-occategoui]');
    elements.forEach(element => {
        const options = {};

        if (element.dataset.occategouiApiurl) {
            options.apiUrl = element.dataset.occategouiApiurl;
        }
        if (element.dataset.occategouiTitle) {
            options.dialogTitle = element.dataset.occategouiTitle;
        }

        new OcCategoUI(element, options);
    });
});