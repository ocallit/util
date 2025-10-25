// File: OcCategoUI.js
// Version: 2.1.1 - Corrected: Restored missing JS logic functions
// Original Version: 2.0.0 - Migrated to OcDialog modal system

/**
 * OcCategoUI - A stateless widget for editing Tom Select options
 * Each instance is independent with no central management
 * @TODO 👁️ a list/clasificame
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
            readOnly: false,
            ...options
        };

        this.init();
    }

    init() {
        if (this.selectElement.hasAttribute('data-occategoui-ro')) {
            this.options.readOnly = true;
        }
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

    /**
     * MODIFIED: Creates the flexRowDyanimic wrapper for the TomSelect element
     */
    createWrapperEarly() {
        // Create wrapper div
        this.wrapperDiv = document.createElement('div');
        this.wrapperDiv.className = 'OcCategoUI_wrapper flexRowDyanimic';

        // Create the growable div for TomSelect
        const tomSelectContainer = document.createElement('div');
        // This div will be the :first-child, so it will grow

        // Insert wrapper BEFORE the select element
        this.selectElement.parentNode.insertBefore(this.wrapperDiv, this.selectElement);

        // Move select INTO the growable div
        tomSelectContainer.appendChild(this.selectElement);

        // Add the growable div to the wrapper
        this.wrapperDiv.appendChild(tomSelectContainer);
    }

    /**
     * MODIFIED: Adds buttons into a fixed-width container
     */
    getButtonContainer() {
        // Find or create the fixed-size container for buttons
        let buttonContainer = this.wrapperDiv.querySelector('.OcCategoUI_buttonContainer');
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            // This div will be :not(:first-child), so it will be fixed-width
            buttonContainer.className = 'OcCategoUI_buttonContainer';
            this.wrapperDiv.appendChild(buttonContainer);
        }
        return buttonContainer;
    }

    createEditButton() {
        const buttonContainer = this.getButtonContainer();

        const editButton = document.createElement('button');
        editButton.id = this.editButtonId;
        editButton.type = 'button';
        editButton.className = 'OcCategoUI_button--icon'; // Use new CSS class
        editButton.innerHTML = this.options.readOnly ? '📖' : '✏️';
        editButton.title = 'Editar Categorias';

        buttonContainer.appendChild(editButton);

        editButton.addEventListener('click', () => {
            this.openDialog();
        });
    }

    createCopyButton() {
        const buttonContainer = this.getButtonContainer();

        const copyButton = document.createElement('button');
        copyButton.id = this.copyButtonId;
        copyButton.type = 'button';
        copyButton.className = 'OcCategoUI_button--icon'; // Use new CSS class
        copyButton.innerHTML = '⎘'; // Using a simpler copy icon
        copyButton.title = 'Copiar';

        buttonContainer.appendChild(copyButton);

        copyButton.addEventListener('click', (e) => {
            // This is just a placeholder, the real copy button is on the dialog
            // You could implement a "copy selected" here if you wanted.
            this.copyOptionsToClipboard(e.currentTarget);
        });
    }

    // ===================================================================
    // RESTORED: All JS helper functions are back
    // ===================================================================

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
                error: 'Es un dato requerido'
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
                    error: `Ya existe "${trimmedText}" como: "${option.text}"`
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

    // ===================================================================
    // END of restored functions
    // ===================================================================


    /**
     * MODIFIED: Rebuilds the dialog content using the new flexbox classes
     */
    buildDialogContent() {
        if (this.dialogContent) {
            return;
        }

        const container = document.createElement('div');
        container.id = this.dialogId;
        // This is now the main flex column
        container.className = 'OcCategoUI_dialog flexColumnFlexible';

        container.innerHTML = `
           
            <div class="OcCategoUI_searchToolbar flexRowDyanimic">
                <div> 
                    <input type="text" id="${this.dialogId}_search" placeholder="🔍 Buscar ..." enterkeyhint="search">
                </div>
                <div> 
                    <button type="button" id="${this.dialogId}_searchClear" class="OcCategoUI_button--icon" style="display: none;">×</button>
                </div>
            </div>

            <div class="OcCategoUI_optionsList" id="${this.dialogId}_list">
                <!-- List items will be injected here by renderOptionsList -->
            </div>

            ${!this.options.readOnly ? `
                
                <div class="OcCategoUI_toolbar">
                    <button type="button" id="${this.dialogId}_addBtn" class="OcCategoUI_button--fullWidth">Nueva Categoría</button>
                </div>

                
                <div class="OcCategoUI_addForm flexRowDyanimic" id="${this.dialogId}_addForm" style="display: none;">
                    <div> 
                        <input type="text" id="${this.dialogId}_newText" placeholder="Categoría..." enterkeyhint="done">
                    </div>
                    <div> 
                        <button type="button" id="${this.dialogId}_saveNew" class="OcCategoUI_button--icon" title="Save">✓</button>
                        <button type="button" id="${this.dialogId}_cancelNew" class="OcCategoUI_button--icon" title="Cancel">✗</button>
                    </div>
                </div>` : ''}
        `;

        this.dialogContent = container;

        // Element cache is now flat, no need for complex selectors
        if(this.options.readOnly) {
            this.dialogElements = {
                root: container,
                searchInput: container.querySelector(`#${this.dialogId}_search`),
                searchClear: container.querySelector(`#${this.dialogId}_searchClear`),
                list: container.querySelector(`#${this.dialogId}_list`),
            };
        } else {
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
        }

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

    /**
     * MODIFIED: Renders list items using the flexRowDyanimic pattern
     */
    renderOptionsList() {
        if (!this.dialogElements.list) {
            return;
        }

        const listContainer = this.dialogElements.list;
        let html = '';

        // Sort options alphabetically by text before rendering
        const sortedOptions = [...this.currentOptions.values()].sort((a, b) => {
            return a.text.localeCompare(b.text, undefined, { numeric: true, sensitivity: 'base' });
        });

        sortedOptions.forEach((option) => {
            const escapedValue = this.escapeHtml(option.value);
            const escapedText = this.escapeHtml(option.text);

            html += `
                <div class="OcCategoUI_optionItem" data-value="${escapedValue}">
                    <div class="OcCategoUI_optionDisplay flexRowDyanimic" data-mode="view">
                        <div> 
                            <span class="OcCategoUI_optionText">${escapedText}</span>
                        </div>
                        ${!this.options.readOnly ? `
                            <div> 
                                <button type="button" class="OcCategoUI_button--icon OcCategoUI_editBtn" data-value="${escapedValue}" title="Edit">✏️</button>
                                <button type="button" class="OcCategoUI_button--icon OcCategoUI_deleteBtn" data-value="${escapedValue}" title="Delete">🗑️</button>
                            </div>
                        ` : ''}
                    </div>

                ${!this.options.readOnly ? `
                    <div class="OcCategoUI_optionEdit flexRowDyanimic" data-mode="edit" style="display: none;">
                        <div> 
                            <input type="text" class="OcCategoUI_inlineInput" value="${escapedText}" data-original-value="${escapedText}" enterkeyhint="done">
                        </div>
                        <div> 
                            <button type="button" class="OcCategoUI_button--icon OcCategoUI_saveBtn" data-value="${escapedValue}" title="Save">✓</button>
                            <button type="button" class="OcCategoUI_button--icon OcCategoUI_cancelBtn" data-value="${escapedValue}" title="Cancel">✗</button>
                        </div>
                    </div>
                    ` : ''}

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
                const value = e.currentTarget.getAttribute('data-value');
                this.startInlineEdit(value);
            });
        });

        // Delete buttons
        listContainer.querySelectorAll('.OcCategoUI_deleteBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.currentTarget.getAttribute('data-value');
                this.deleteOption(value);
            });
        });

        // Save buttons (inline edit)
        listContainer.querySelectorAll('.OcCategoUI_saveBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.currentTarget.getAttribute('data-value');
                this.saveInlineEdit(value);
            });
        });

        // Cancel buttons (inline edit)
        listContainer.querySelectorAll('.OcCategoUI_cancelBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.currentTarget.getAttribute('data-value');
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
        editMode.style.display = 'flex'; // This is 'flex' now, not 'block'

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

        displayMode.style.display = 'flex'; // This is 'flex' now
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
        displayModes.forEach(display => display.style.display = 'flex'); // This is 'flex' now

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
            item.style.display = matches ? 'block' : 'none'; // 'block' is fine for the item container
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

        this.dialogElements.addForm.style.display = 'flex'; // This is 'flex' now
        const input = this.dialogElements.newText;
        input.value = '';
        input.focus();
    }

    hideAllForms() {
        if (this.dialogElements.addForm) {
            this.dialogElements.addForm.style.display = 'none';
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
                    this.showAlert('Error: ' + (response.error || 'No pude editarla'));
                }
            },
            error: () => {
                this.showAlert('No pude contactar al servidor. ¿Sirve el internet?');
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
                    this.showAlert('Error: ' + (response.error || 'Error al dar de alta'));
                }
            },
            error: () => {
                this.showAlert('No pude contactar al servidor. ¿Sirve el internet?');
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
     * Helper for the main-page copy button
     */
    async copyOptionsToClipboard(button) {
        try {
            const tomSelect = this.getTomSelectInstance();
            if (!tomSelect) return;

            const selectedItems = tomSelect.items || [];
            if (selectedItems.length === 0) return;

            const names = selectedItems.map(value => {
                return (tomSelect.options[value] || {}).text || '';
            }).filter(Boolean);

            const payload = names.join('\n');
            if (!payload) return;

            // Use clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(payload);
            } else {
                // Fallback for older browsers/http
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
            const prev = button.innerHTML;
            button.innerHTML = '✔';
            setTimeout(() => (button.innerHTML = '⎘'), 800);

        } catch (e) {
            console.error('Copy failed', e);
        }
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
        if (element.dataset.occategouiCatalogid) {
            options.catalogId = element.dataset.occategouiCatalogid;
        }

        new OcCategoUI(element, options);
    });
});
