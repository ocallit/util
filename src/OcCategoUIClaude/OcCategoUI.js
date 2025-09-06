// File: OcCategoUI.js
// Path: /src/js/OcCategoUI.js
// Version: 1.0.0

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
                    <div class="OcCategoUI_toolbar">
                        <input type="text" id="${this.dialogId}_search" class="OcCategoUI_searchInput" placeholder="Search options...">
                        <button type="button" id="${this.dialogId}_addBtn" class="OcCategoUI_addButton">Add New</button>
                    </div>
                    
                    <div class="OcCategoUI_optionsList" id="${this.dialogId}_list">
                        <!-- Options will be populated here -->
                    </div>
                    
                    <div class="OcCategoUI_addForm" id="${this.dialogId}_addForm" style="display: none;">
                        <h4>Add New Option</h4>
                        <div class="OcCategoUI_formGroup">
                            <label for="${this.dialogId}_newValue">Value:</label>
                            <input type="text" id="${this.dialogId}_newValue" class="OcCategoUI_input">
                        </div>
                        <div class="OcCategoUI_formGroup">
                            <label for="${this.dialogId}_newText">Text:</label>
                            <input type="text" id="${this.dialogId}_newText" class="OcCategoUI_input">
                        </div>
                        <div class="OcCategoUI_formActions">
                            <button type="button" id="${this.dialogId}_saveNew" class="OcCategoUI_saveButton">Save</button>
                            <button type="button" id="${this.dialogId}_cancelNew" class="OcCategoUI_cancelButton">Cancel</button>
                        </div>
                    </div>
                    
                    <div class="OcCategoUI_editForm" id="${this.dialogId}_editForm" style="display: none;">
                        <h4>Edit Option</h4>
                        <div class="OcCategoUI_formGroup">
                            <label for="${this.dialogId}_editValue">Value:</label>
                            <input type="text" id="${this.dialogId}_editValue" class="OcCategoUI_input" readonly>
                        </div>
                        <div class="OcCategoUI_formGroup">
                            <label for="${this.dialogId}_editText">Text:</label>
                            <input type="text" id="${this.dialogId}_editText" class="OcCategoUI_input">
                        </div>
                        <div class="OcCategoUI_formActions">
                            <button type="button" id="${this.dialogId}_saveEdit" class="OcCategoUI_saveButton">Save</button>
                            <button type="button" id="${this.dialogId}_cancelEdit" class="OcCategoUI_cancelButton">Cancel</button>
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
        
        // Edit form buttons
        $(`#${this.dialogId}_saveEdit`).on('click', () => {
            this.saveEditOption();
        });
        
        $(`#${this.dialogId}_cancelEdit`).on('click', () => {
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
                    <div class="OcCategoUI_optionInfo">
                        <span class="OcCategoUI_optionValue">${this.escapeHtml(option.value)}</span>
                        <span class="OcCategoUI_optionText">${this.escapeHtml(option.text)}</span>
                    </div>
                    <div class="OcCategoUI_optionActions">
                        <button type="button" class="OcCategoUI_editBtn" data-index="${index}">Edit</button>
                        <button type="button" class="OcCategoUI_deleteBtn" data-index="${index}">Delete</button>
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
        
        // Bind option actions
        listContainer.querySelectorAll('.OcCategoUI_editBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.editOption(index);
            });
        });
        
        listContainer.querySelectorAll('.OcCategoUI_deleteBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.deleteOption(index);
            });
        });
    }
    
    filterOptions(searchTerm) {
        const listContainer = document.getElementById(`${this.dialogId}_list`);
        const items = listContainer.querySelectorAll('.OcCategoUI_optionItem');
        
        const searchLower = searchTerm.toLowerCase();
        
        items.forEach(item => {
            const value = item.querySelector('.OcCategoUI_optionValue').textContent.toLowerCase();
            const text = item.querySelector('.OcCategoUI_optionText').textContent.toLowerCase();
            
            const matches = value.includes(searchLower) || text.includes(searchLower);
            item.style.display = matches ? 'flex' : 'none';
        });
    }
    
    showAddForm() {
        this.hideAllForms();
        document.getElementById(`${this.dialogId}_addForm`).style.display = 'block';
        // Clear form
        document.getElementById(`${this.dialogId}_newValue`).value = '';
        document.getElementById(`${this.dialogId}_newText`).value = '';
    }
    
    editOption(index) {
        this.hideAllForms();
        this.editingIndex = index;
        
        const option = this.currentOptions[index];
        document.getElementById(`${this.dialogId}_editValue`).value = option.value;
        document.getElementById(`${this.dialogId}_editText`).value = option.text;
        document.getElementById(`${this.dialogId}_editForm`).style.display = 'block';
    }
    
    hideAllForms() {
        document.getElementById(`${this.dialogId}_addForm`).style.display = 'none';
        document.getElementById(`${this.dialogId}_editForm`).style.display = 'none';
        this.editingIndex = -1;
    }
    
    saveNewOption() {
        const value = document.getElementById(`${this.dialogId}_newValue`).value.trim();
        const text = document.getElementById(`${this.dialogId}_newText`).value.trim();
        
        if (!value || !text) {
            alert('Both value and text are required');
            return;
        }
        
        // Check for duplicate values
        const exists = this.currentOptions.some(opt => opt.value === value);
        if (exists) {
            alert('An option with this value already exists');
            return;
        }
        
        // Send AJAX request
        $.ajax({
            url: this.options.apiUrl,
            method: 'POST',
            data: {
                action: 'add',
                value: value,
                text: text
            },
            dataType: 'json',
            success: (response) => {
                if (response.success) {
                    // Use the returned ID if provided, otherwise use the submitted value
                    const newValue = response.data && response.data.id ? response.data.id : value;
                    
                    // Add to current options
                    this.currentOptions.push({
                        value: newValue,
                        text: text,
                        selected: false,
                        index: this.currentOptions.length
                    });
                    
                    // Update select element and Tom Select
                    this.updateSelectElement();
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
    
    saveEditOption() {
        if (this.editingIndex === -1) return;
        
        const text = document.getElementById(`${this.dialogId}_editText`).value.trim();
        
        if (!text) {
            alert('Text is required');
            return;
        }
        
        const option = this.currentOptions[this.editingIndex];
        
        // Send AJAX request
        $.ajax({
            url: this.options.apiUrl,
            method: 'POST',
            data: {
                action: 'update',
                id: option.value,
                text: text
            },
            dataType: 'json',
            success: (response) => {
                if (response.success) {
                    // Update the option
                    this.currentOptions[this.editingIndex].text = text;
                    
                    // Update select element and Tom Select
                    this.updateSelectElement();
                    this.renderOptionsList();
                    this.hideAllForms();
                } else {
                    alert('Error: ' + (response.error || 'Failed to update option'));
                }
            },
            error: () => {
                alert('Network error occurred while updating option');
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
                    // Remove from current options
                    this.currentOptions.splice(index, 1);
                    
                    // Update select element and Tom Select
                    this.updateSelectElement();
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
    
    updateSelectElement() {
        // Store currently selected values
        const selectedValues = [];
        if (this.tomSelectInstance) {
            selectedValues.push(...this.tomSelectInstance.getValue());
        } else {
            // Fallback for regular select
            const selected = this.selectElement.querySelectorAll('option:checked');
            selected.forEach(opt => selectedValues.push(opt.value));
        }
        
        // Clear existing options
        this.selectElement.innerHTML = '';
        
        // Add updated options
        this.currentOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            
            // Restore selection state
            if (selectedValues.includes(option.value)) {
                optionElement.selected = true;
            }
            
            this.selectElement.appendChild(optionElement);
        });
        
        // Update Tom Select if it exists
        if (this.tomSelectInstance) {
            // Sync the options with Tom Select
            this.tomSelectInstance.sync();
            
            // Restore selected values
            this.tomSelectInstance.setValue(selectedValues, true);
        }
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