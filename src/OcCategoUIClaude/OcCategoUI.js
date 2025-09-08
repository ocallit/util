// File: OcCategoUI.js
// Path: /src/js/OcCategoUI.js
// Version: 1.3.0

/**
 * OcCategoUI - A stateless widget for editing Tom Select options
 * Each instance is independent with no central management
 */
class OcCategoUI_ {
    constructor(selectElement, options = {}) {
        this.selectElement = selectElement;
        this.tomSelectInstance = null;
        this.dialogId = null;
        this.currentOptions = [];
        this.editingIndex = -1;

        // Default options
        this.options = {
            apiUrl: './api/categories.php',
            dialogTitle: 'Edit Options',
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

        // Get Tom Select instance if it exists
        this.tomSelectInstance = this.selectElement.tomselect;

        // Read current options from select element
        this.loadOptionsFromSelect();

        // Create edit button
        this.createEditButton();

        // Create dialog
        this.createDialog();
    }

    loadOptionsFromSelect() {
        this.currentOptions = [];
        const options = this.selectElement.querySelectorAll('option');

        options.forEach((option, index) => {
            if (option.value) { // Skip empty options
                this.currentOptions.push({
                    value: option.value,
                    text: option.textContent,
                    selected: option.selected,
                    index: index
                });
            }
        });
    }

    createEditButton() {
        const editButton = document.createElement('button');
        editButton.id = this.editButtonId;
        editButton.type = 'button';
        editButton.className = 'OcCategoUI_editButton';
        editButton.innerHTML = '✏️';
        editButton.title = 'Edit Options';

        // Insert button after the Tom Select wrapper
        const wrapper = this.selectElement.closest('.ts-wrapper') || this.selectElement;
        wrapper.parentNode.insertBefore(editButton, wrapper.nextSibling);

        editButton.addEventListener('click', () => {
            this.openDialog();
        });
    }

    createDialog() {
        const dialogHtml = `
            <div id="${this.dialogId}" class="OcCategoUI_dialog" title="${this.options.dialogTitle}">
                <div class="OcCategoUI_dialogContent">
                    <!-- Simple toolbar with Add button -->
                    <div class="OcCategoUI_toolbar">
                        <button type="button" id="${this.dialogId}_addBtn" class="OcCategoUI_addButton">Nuevo</button>
                    </div>
                    
                    <!-- Search toolbar -->
                    <div class="OcCategoUI_searchToolbar">
                        <input type="text" id="${this.dialogId}_search" class="OcCategoUI_searchInput" placeholder="🔍 Filter existing options...">
                        <button type="button" id="${this.dialogId}_searchClear" class="OcCategoUI_searchClear">×</button>
                    </div>
                    
                    <!-- Options list with inline editing -->
                    <div class="OcCategoUI_optionsList" id="${this.dialogId}_list">
                        <!-- Options will be populated here -->
                    </div>
                    
                    <!-- Compact add form -->
                    <div class="OcCategoUI_addForm" id="${this.dialogId}_addForm" style="display: none;">
                        <input type="text" id="${this.dialogId}_newText" class="OcCategoUI_addInput" placeholder="Enter option text...">
                        <div class="OcCategoUI_addActions">
                            <button type="button" id="${this.dialogId}_saveNew" class="OcCategoUI_saveBtn">✓</button>
                            <button type="button" id="${this.dialogId}_cancelNew" class="OcCategoUI_cancelBtn">✗</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

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
    }

    openDialog() {
        this.loadOptionsFromSelect();
        this.renderOptionsList();
        $(`#${this.dialogId}`).dialog('open');
    }

    renderOptionsList() {
        const listContainer = document.getElementById(`${this.dialogId}_list`);
        let html = '';

        this.currentOptions.forEach((option, index) => {
            html += `
                <div class="OcCategoUI_optionItem" data-index="${index}">
                    <!-- View mode -->
                    <div class="OcCategoUI_optionDisplay" data-mode="view">
                        <span class="OcCategoUI_optionText">${this.escapeHtml(option.text)}</span>
                        <div class="OcCategoUI_optionActions">
                            <button type="button" class="OcCategoUI_editBtn" data-index="${index}" title="Edit">✏️</button>
                            <button type="button" class="OcCategoUI_deleteBtn" data-index="${index}" title="Delete">🗑️</button>
                        </div>
                    </div>
                    <!-- Edit mode -->
                    <div class="OcCategoUI_optionEdit" data-mode="edit" style="display: none;">
                        <input type="text" class="OcCategoUI_inlineInput" value="${this.escapeHtml(option.text)}" data-original-value="${this.escapeHtml(option.text)}">
                        <div class="OcCategoUI_inlineActions">
                            <button type="button" class="OcCategoUI_saveBtn" data-index="${index}" title="Save">✓</button>
                            <button type="button" class="OcCategoUI_cancelBtn" data-index="${index}" title="Cancel">✗</button>
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
        const listContainer = document.getElementById(`${this.dialogId}_list`);

        // Edit buttons
        listContainer.querySelectorAll('.OcCategoUI_editBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.startInlineEdit(index);
            });
        });

        // Delete buttons
        listContainer.querySelectorAll('.OcCategoUI_deleteBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.deleteOption(index);
            });
        });

        // Save buttons (inline edit)
        listContainer.querySelectorAll('.OcCategoUI_saveBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.saveInlineEdit(index);
            });
        });

        // Cancel buttons (inline edit)
        listContainer.querySelectorAll('.OcCategoUI_cancelBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.cancelInlineEdit(index);
            });
        });

        // Enter key to save, Escape to cancel
        listContainer.querySelectorAll('.OcCategoUI_inlineInput').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const index = parseInt(e.target.closest('.OcCategoUI_optionItem').getAttribute('data-index'));
                    this.saveInlineEdit(index);
                } else if (e.key === 'Escape') {
                    const index = parseInt(e.target.closest('.OcCategoUI_optionItem').getAttribute('data-index'));
                    this.cancelInlineEdit(index);
                }
            });
        });
    }

    startInlineEdit(index) {
        // Cancel any other editing first
        this.cancelAllEditing();

        const optionItem = document.querySelector(`[data-index="${index}"]`);
        const displayMode = optionItem.querySelector('.OcCategoUI_optionDisplay');
        const editMode = optionItem.querySelector('.OcCategoUI_optionEdit');

        displayMode.style.display = 'none';
        editMode.style.display = 'flex';

        // Focus the input
        const input = editMode.querySelector('.OcCategoUI_inlineInput');
        input.focus();
        input.select();

        this.editingIndex = index;
    }

    saveInlineEdit(index) {
        const optionItem = document.querySelector(`[data-index="${index}"]`);
        const input = optionItem.querySelector('.OcCategoUI_inlineInput');
        const newText = input.value.trim();

        if (!newText) {
            alert('Text is required');
            input.focus();
            return;
        }

        const option = this.currentOptions[index];

        // Send AJAX request
        $.ajax({
            url: this.options.apiUrl,
            method: 'POST',
            data: {
                action: 'update',
                id: option.value,
                text: newText
            },
            dataType: 'json',
            success: (response) => {
                if (response.success) {
                    // Update the option in memory
                    this.currentOptions[index].text = newText;

                    // Update the select element option
                    this.updateOptionInSelect(option.value, newText);

                    // Update the display and exit edit mode
                    optionItem.querySelector('.OcCategoUI_optionText').textContent = newText;
                    this.cancelInlineEdit(index);
                } else {
                    alert('Error: ' + (response.error || 'Failed to update option'));
                }
            },
            error: () => {
                alert('Network error occurred while updating option');
            }
        });
    }

    cancelInlineEdit(index) {
        const optionItem = document.querySelector(`[data-index="${index}"]`);
        const displayMode = optionItem.querySelector('.OcCategoUI_optionDisplay');
        const editMode = optionItem.querySelector('.OcCategoUI_optionEdit');
        const input = optionItem.querySelector('.OcCategoUI_inlineInput');

        // Restore original value
        input.value = input.getAttribute('data-original-value');

        displayMode.style.display = 'flex';
        editMode.style.display = 'none';

        this.editingIndex = -1;
    }

    cancelAllEditing() {
        const editModes = document.querySelectorAll(`#${this.dialogId} .OcCategoUI_optionEdit`);
        const displayModes = document.querySelectorAll(`#${this.dialogId} .OcCategoUI_optionDisplay`);

        editModes.forEach(edit => edit.style.display = 'none');
        displayModes.forEach(display => display.style.display = 'flex');

        this.editingIndex = -1;
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

    // Non-destructive select element update methods with logging and improved Tom Select sync
    addOptionToSelect(option, markSelected = true) {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;

        if (markSelected) {
            optionElement.selected = true;
        }

        this.selectElement.appendChild(optionElement);

        if (this.tomSelectInstance) {
            // Add the new option to Tom Select without destroying it
            this.tomSelectInstance.addOption({
                value: option.value,
                text: option.text
            });
        }
    }

    removeOptionFromSelect(optionValue) {
        const optionElement = this.selectElement.querySelector(`option[value="${optionValue}"]`);
        if (optionElement) {
            optionElement.remove();
        }

        if (this.tomSelectInstance) {
            // Remove the option from Tom Select without destroying it
            this.tomSelectInstance.removeOption(optionValue);
        }
    }

    updateOptionInSelect(optionValue, newText) {
        const optionElement = this.selectElement.querySelector(`option[value="${optionValue}"]`);
        if (optionElement) {
            optionElement.textContent = newText;
        }

        if (this.tomSelectInstance) {
            // Update the option in Tom Select without destroying it
            this.tomSelectInstance.updateOption(optionValue, {
                value: optionValue,
                text: newText
            });
        }
    }

    logSelectOptions(operation) {
        const options = this.selectElement.querySelectorAll('option');
        const optionsList = Array.from(options).map(opt => ({
            value: opt.value,
            text: opt.textContent,
            selected: opt.selected
        }));
        console.log(`OcCategoUI [${operation}] - Select options:`, optionsList);
    }

    saveNewOption() {
        const text = document.getElementById(`${this.dialogId}_newText`).value.trim();

        if (!text) {
            alert('Text is required');
            return;
        }

        // Send AJAX request - server will assign the value/ID
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
                    // Server returns the assigned ID/value
                    const newValue = response.data && response.data.id ? response.data.id : Date.now().toString();

                    const newOption = {
                        value: newValue,
                        text: text,
                        selected: true,
                        index: this.currentOptions.length
                    };

                    // Add to current options
                    this.currentOptions.push(newOption);

                    // Add to select element and mark as selected
                    this.addOptionToSelect(newOption, true);

                    this.renderOptionsList();
                    this.hideAllForms();
                } else {
                    alert('Error: ' + (response.error || 'Failed to add option'));
                }
            },
            error: () => {
                alert('Network error occurred while adding option');
            }
        });
    }

    deleteOption(index) {
        const option = this.currentOptions[index];

        if (this.options.confirmDelete) {
            if (!confirm(`Are you sure you want to delete "${option.text}"?`)) {
                return;
            }
        }

        // Send AJAX request
        $.ajax({
            url: this.options.apiUrl,
            method: 'POST',
            data: {
                action: 'delete',
                id: option.value
            },
            dataType: 'json',
            success: (response) => {
                if (response.success) {
                    // Remove from select element
                    this.removeOptionFromSelect(option.value);

                    // Remove from current options
                    this.currentOptions.splice(index, 1);

                    this.renderOptionsList();
                } else {
                    alert('Error: ' + (response.error || 'Failed to delete option'));
                }
            },
            error: () => {
                alert('Network error occurred while deleting option');
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public method to destroy the widget
    destroy() {
        // Remove edit button
        const editButton = document.getElementById(this.editButtonId);
        if (editButton) {
            editButton.remove();
        }

        // Remove dialog
        const dialog = $(`#${this.dialogId}`);
        if (dialog.length) {
            dialog.dialog('destroy');
            dialog.remove();
        }
    }
}

// Convenience function to create widgets
window.OcCategoUI_createWidget = function(selectElement, options = {}) {
    return new OcCategoUI_(selectElement, options);
};

// Auto-initialize for elements with data-occategoui attribute
document.addEventListener('DOMContentLoaded', function() {
    const elements = document.querySelectorAll('[data-occategoui]');
    elements.forEach(element => {
        const options = {};

        // Read options from data attributes
        if (element.dataset.occategouiApiurl) {
            options.apiUrl = element.dataset.occategouiApiurl;
        }
        if (element.dataset.occategouiTitle) {
            options.dialogTitle = element.dataset.occategouiTitle;
        }

        new OcCategoUI_(element, options);
    });
});