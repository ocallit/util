// File: OcCategoUI.js
// Version: 2.0.0 - Migrated to OcDialog modal system

/**
 * OcCategoUI - A stateless widget for editing Tom Select options
 * Each instance is independent with no central management
 */
class OcCategoUI {
    constructor(selectElement, options = {}) {
        this.selectElement = selectElement;
        catalogId: "",
        this.dialogId = null;
        this.currentOptions = new Map();
        this.editingValue = null;
        this.wrapperDiv = null;
        this.dialogContent = null;
        this.dialogElements = {};
        this.dialogElement = null;
        this.activeDialogPromise = null;
        this.dialogEventsBound = false;

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
        this.buildDialogContent();
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
        editButton.className = 'OcCategoUI_editButton OcCategoUI_state-default OcCategoUI_corner-all';
        editButton.innerHTML = '✏️';
        editButton.title = 'Editar Categorias';

        // Add button to wrapper
        this.wrapperDiv.appendChild(editButton);

        editButton.addEventListener('click', () => {
            this.openDialog();
        });
    }
    createCopyButton() {
        const editButton = document.createElement('button');
        editButton.id = this.editButtonId;
        editButton.type = 'button';
        editButton.className = 'OcCategoUI_editButton OcCategoUI_state-default OcCategoUI_corner-all';
        editButton.innerHTML = '&forall;';
        editButton.title = 'Copiar';

        // Add button to wrapper
        this.wrapperDiv.appendChild(editButton);

        editButton.addEventListener('click', () => {
            // this.openDialog();
        });
    }

    buildDialogContent() {
        if (this.dialogContent) {
            return;
        }

        const container = document.createElement('div');
        container.id = this.dialogId;
        container.className = 'OcCategoUI_dialog OcCategoUI_widget';
        container.innerHTML = `
            <div class="OcCategoUI_dialogContent OcCategoUI_widget-content">
                <div class="OcCategoUI_searchToolbar OcCategoUI_widget-header OcCategoUI_corner-all">
                    <input type="text" id="${this.dialogId}_search" class="OcCategoUI_searchInput OcCategoUI_widget-content OcCategoUI_corner-all" placeholder="🔍 Buscar ...">
                    <button type="button" id="${this.dialogId}_searchClear" class="OcCategoUI_searchClear OcCategoUI_state-default OcCategoUI_corner-all">×</button>
                </div>
                <div class="OcCategoUI_optionsList OcCategoUI_widget-content" id="${this.dialogId}_list"></div>
                <div class="OcCategoUI_toolbar">
                    <button type="button" id="${this.dialogId}_addBtn" class="OcCategoUI_addButton OcCategoUI_state-default OcCategoUI_corner-all">Nueva Categoría</button>
                </div>
                <div class="OcCategoUI_addForm OcCategoUI_state-highlight OcCategoUI_corner-all" id="${this.dialogId}_addForm" style="display: none;">
                    <input type="text" id="${this.dialogId}_newText" class="OcCategoUI_addInput OcCategoUI_widget-content OcCategoUI_corner-all" placeholder="Categoría...">
                    <div class="OcCategoUI_addActions">
                        <button type="button" id="${this.dialogId}_saveNew" class="OcCategoUI_saveBtn OcCategoUI_state-default OcCategoUI_corner-all">✓</button>
                        <button type="button" id="${this.dialogId}_cancelNew" class="OcCategoUI_cancelBtn OcCategoUI_state-default OcCategoUI_corner-all">✗</button>
                    </div>
                </div>
            </div>`;

        this.dialogContent = container;
        this.dialogElements = {
            root: container,
            searchInput: container.querySelector(`#${this.dialogId}_search`),
            searchClear: container.querySelector(`#${this.dialogId}_searchClear`),
            list: container.querySelector(`#${this.dialogId}_list`),
            addBtn: container.querySelector(`#${this.dialogId}_addBtn`),
            addForm: container.querySelector(`#${this.dialogId}_addForm`),
            newText: container.querySelector(`#${this.dialogId}_newText`),
            saveNew: container.querySelector(`#${this.dialogId}_saveNew`),
            cancelNew: container.querySelector(`#${this.dialogId}_cancelNew`)
        };

        this.bindDialogEvents();
    }

    bindDialogEvents() {
        if (!this.dialogContent || this.dialogEventsBound) {
            return;
        }

        const { searchInput, searchClear, addBtn, saveNew, cancelNew, newText } = this.dialogElements;

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterOptions(e.target.value);
            });
        }

        if (searchClear) {
            searchClear.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                }
                this.filterOptions('');
            });
        }

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddForm();
            });
        }

        if (saveNew) {
            saveNew.addEventListener('click', () => {
                this.saveNewOption();
            });
        }

        if (cancelNew) {
            cancelNew.addEventListener('click', () => {
                this.hideAllForms();
            });
        }

        if (newText) {
            newText.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveNewOption();
                } else if (e.key === 'Escape') {
                    this.hideAllForms();
                }
            });
        }

        this.dialogEventsBound = true;
    }

    openDialog() {
        if (this.activeDialogPromise) {
            return;
        }

        this.buildDialogContent();

        // *** BUG FIX ***
        // When OcDialog closes with keepHtml:true, it sets the content to 'display: none'.
        // We must reset this before showing the dialog again.
        if (this.dialogContent.style.display === 'none') {
            this.dialogContent.style.display = '';
        }

        this.loadOptionsFromSelect();
        this.renderOptionsList();

        if (this.dialogElements.searchInput) {
            this.filterOptions(this.dialogElements.searchInput.value || '');
        }

        if (!this.dialogContent) {
            return;
        }

        const { dialog, promise } = OcDialog.dialog({
            title: this.options.dialogTitle,
            html: this.dialogContent,
            keepHtml: true
        });

        this.dialogElement = dialog;
        this.activeDialogPromise = promise;
        this.copyButtonHeader(dialog);
        promise.catch(() => {
            // swallow cancellation
        }).finally(() => {
            this.hideAllForms();
            this.cancelAllEditing();
            this.dialogElement = null;
            this.activeDialogPromise = null;
        });

        return promise;
    }

    renderOptionsList() {
        if (!this.dialogElements.list) {
            return;
        }

        const listContainer = this.dialogElements.list;
        let html = '';

        this.currentOptions.forEach((option) => {
            const escapedValue = this.escapeHtml(option.value);
            const escapedText = this.escapeHtml(option.text);

            html += `
                <div class="OcCategoUI_optionItem OcCategoUI_widget-content OcCategoUI_corner-all" data-value="${escapedValue}">
                    <div class="OcCategoUI_optionDisplay" data-mode="view">
                        <span class="OcCategoUI_optionText">${escapedText}</span>
                        <div class="OcCategoUI_optionActions">
                            <button type="button" class="OcCategoUI_editBtn OcCategoUI_state-default OcCategoUI_corner-all" data-value="${escapedValue}" title="Edit">✏️</button>
                            <button type="button" class="OcCategoUI_deleteBtn OcCategoUI_state-default OcCategoUI_corner-all" data-value="${escapedValue}" title="Delete">🗑️</button>
                        </div>
                    </div>
                    <div class="OcCategoUI_optionEdit OcCategoUI_state-highlight OcCategoUI_corner-all" data-mode="edit" style="display: none;">
                        <input type="text" class="OcCategoUI_inlineInput OcCategoUI_widget-content OcCategoUI_corner-all" value="${escapedText}" data-original-value="${escapedText}">
                        <div class="OcCategoUI_inlineActions">
                            <button type="button" class="OcCategoUI_saveBtn OcCategoUI_state-default OcCategoUI_corner-all" data-value="${escapedValue}" title="Save">✓</button>
                            <button type="button" class="OcCategoUI_cancelBtn OcCategoUI_state-default OcCategoUI_corner-all" data-value="${escapedValue}" title="Cancel">✗</button>
                        </div>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;

        // Bind option actions
        this.bindOptionEvents();
    }

    bindOptionEvents() {
        if (!this.dialogElements.list) {
            return;
        }

        const listContainer = this.dialogElements.list;

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
        if (!this.dialogContent) {
            return;
        }

        const optionItem = this.dialogContent.querySelector(`.OcCategoUI_optionItem[data-value="${CSS.escape(value)}"]`);
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
        if (!this.dialogContent) {
            return;
        }

        const optionItem = this.dialogContent.querySelector(`.OcCategoUI_optionItem[data-value="${CSS.escape(value)}"]`);
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
        if (!this.dialogContent) {
            return;
        }

        const editModes = this.dialogContent.querySelectorAll('.OcCategoUI_optionEdit');
        const displayModes = this.dialogContent.querySelectorAll('.OcCategoUI_optionDisplay');

        editModes.forEach(edit => edit.style.display = 'none');
        displayModes.forEach(display => display.style.display = 'flex');

        this.editingValue = null;
    }

    filterOptions(searchTerm) {
        if (!this.dialogElements.list) {
            return;
        }

        const listContainer = this.dialogElements.list;
        const items = listContainer.querySelectorAll('.OcCategoUI_optionItem');

        const searchLower = (searchTerm || '').toLowerCase();

        items.forEach(item => {
            const text = item.querySelector('.OcCategoUI_optionText').textContent.toLowerCase();
            const matches = text.includes(searchLower);
            item.style.display = matches ? 'block' : 'none';
        });

        // Show/hide clear button
        if (this.dialogElements.searchClear) {
            this.dialogElements.searchClear.style.display = searchTerm ? 'block' : 'none';
        }
    }

    showAddForm() {
        this.hideAllForms();
        this.cancelAllEditing();
        if (!this.dialogElements.addForm || !this.dialogElements.newText) {
            return;
        }

        this.dialogElements.addForm.style.display = 'flex';
        const input = this.dialogElements.newText;
        input.value = '';
        input.focus();
    }

    hideAllForms() {
        if (this.dialogElements.addForm) {
            this.dialogElements.addForm.style.display = 'none';
        }
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
        if (!this.dialogContent) {
            return;
        }

        const optionItem = this.dialogContent.querySelector(`.OcCategoUI_optionItem[data-value="${CSS.escape(value)}"]`);
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
                action: 'tagUpdate',
                catalog_id: this.options.catalogId,
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
        if (!this.dialogElements.newText) {
            return;
        }

        const text = this.dialogElements.newText.value.trim();

        // Validate the new option
        const validation = this.validOption(null, text, null);
        if (!validation.valid) {
            await this.showAlert(validation.error);
            this.dialogElements.newText.focus();
            return;
        }

        $.ajax({
            url: this.options.apiUrl,
            method: 'POST',
            data: {
                action: 'tagAdd',
                catalog_id: this.options.catalogId,
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
                action: 'tagDelete',
                catalog_id: this.options.catalogId,
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
        return OcDialog.alert(this.escapeHtml(message));
    }

    showConfirm(message) {
        return OcDialog.confirmDelete(
            this.escapeHtml(message),
            'Confirmar',
            '🗑️',
            'Eliminar',
            '🗑️',
            'Cancelar',
            '✗'
        ).then(() => true).catch(() => false);
    }

    destroy() {
        if (this.wrapperDiv && this.wrapperDiv.parentNode) {
            const tsWrapper = this.wrapperDiv.querySelector('.ts-wrapper');
            if (tsWrapper) {
                this.wrapperDiv.parentNode.insertBefore(tsWrapper, this.wrapperDiv);
            }
            this.wrapperDiv.remove();
        }

        if (this.dialogElement) {
            this.dialogElement.close();
            this.dialogElement = null;
        }

        if (this.dialogContent && this.dialogContent.parentNode) {
            this.dialogContent.parentNode.removeChild(this.dialogContent);
        }

        this.dialogContent = null;
        this.dialogElements = {};
        this.dialogEventsBound = false;
    }

    /**
     * Injects a "Copy" button into the dialog title bar (left of the ✕).
     * Clicking it copies all listed categories to the clipboard, one per line.
     * @param {HTMLElement} dialogEl - The <dialog class="ocdialog"> element.
     */
    copyButtonHeader(dialogEl) {
        if (!dialogEl) return;

        const header = dialogEl.querySelector('.ocdialog_header');
        const closeBtn = dialogEl.querySelector('.ocdialog_close');
        if (!header || !closeBtn) return;

        // Avoid duplicates if dialog is reused
        if (header.querySelector('.ocdialog_copy')) return;

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'ocdialog_copy';
        copyBtn.title = 'Copiar lista';
        copyBtn.setAttribute('aria-label', 'Copiar lista');
        copyBtn.textContent = '⎘'; // simple copy glyph (can swap for another)

        copyBtn.addEventListener('click', async () => {
            try {
                // Get ALL visible category names listed in this dialog
                const names = Array.from(
                    dialogEl.querySelectorAll('.OcCategoUI_optionText')
                ).map(el => (el.textContent || '').trim())
                    .filter(Boolean);

                const payload = names.join('\n') || '';

                if (!payload) {
                    // optional: tiny feedback if empty
                    copyBtn.textContent = '⎘';
                    copyBtn.classList.add('shake'); // if you want to add a tiny CSS effect
                    setTimeout(() => copyBtn.classList.remove('shake'), 350);
                    return;
                }

                // Try async Clipboard API, fallback to a hidden textarea
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(payload);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = payload;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }

                // Tiny success tick for UX
                const prev = copyBtn.textContent;
                copyBtn.textContent = '✔';
                setTimeout(() => (copyBtn.textContent = prev), 800);
            } catch (e) {
                console.error('Copy failed', e);
            }
        });

        // Insert just BEFORE the close X
        header.insertBefore(copyBtn, closeBtn);
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
