// File: OcCatego.js
// Path: /OcCatego.js
// Version: 2.0.0
// OcCatego.js - CRUD Categoria with dynamic dialog creation (no HTML IDs needed)

class OcCatego {
    static instanceCounter = 0;

    constructor(selectElement, categoriaDe, recordId, title="Categoría", apiUrl = "./api/catego.php", modo="Add/Edit/Delete") {
        this.selectElement = selectElement;
        this.categoriaDe = categoriaDe;
        this.recordId = recordId;
        this.title = title;
        this.apiUrl = apiUrl;
        this.canAdd = modo.toLowerCase().includes("add");
        this.canEdit = modo.toLowerCase().includes("edit");
        this.canDelete = modo.toLowerCase().includes("delete");

        // No need for unique ID anymore since we create/destroy dynamically
        this.instanceId = ++OcCatego.instanceCounter;

        this.categories = [];
        this.editingId = null;
        this.originalValue = '';

        // Dialog elements will be created dynamically
        this.dialog = null;
        this.confirmDialog = null;
        this.searchInput = null;
        this.searchClear = null;
        this.addButton = null;
        this.list = null;
        this.errorDiv = null;
    }

    async open() {
        if (this.dialog && this.dialog.open) {
            // Dialog already open
            return;
        }

        this._createDialog();
        this._bindEvents();

        // Clear search box and messages before opening
        this.searchInput.value = '';
        this.clearError();
        this._updateSearchClear();
        this._updateAddButton();

        if (typeof this.dialog.showModal === 'function') {
            this.dialog.showModal();
        } else {
            // Very old browsers fallback
            this.dialog.setAttribute('open', '');
        }

        this.searchInput.focus();
        this._loadFromSelect();
    }

    async close() {
        if (this.editingId && this.hasChanges()) {
            if (!await this.confirmChanges('Hay cambios los guardo?')) return;
        }

        if (this.dialog && this.dialog.open) {
            if (typeof this.dialog.close === 'function') {
                this.dialog.close();
            } else {
                this.dialog.removeAttribute('open');
            }
        }

        this.clearEdit();
        this._destroyDialog();
    }

    _normalizeString(str) {
        return str.trim().replace(/\s+/g, ' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    _createDialog() {
        // Create main dialog
        const buttonAdd = this.canAdd ? '<button class="ocCatego-add-button" data-action="add">Nueva</button>' : '';
        const searchPlaceHolder = this.canAdd ? 'Buscar o nueva categoría...' : 'Buscar categoría...';
        this.dialog = document.createElement('dialog');
        this.dialog.className = 'ocCatego-overlay';
        this.dialog.innerHTML = `
            <div class="ocCatego-dialog sch_dialog">
                <div class="ocCatego-header sch_dialog_header">
                    <h2 class="ocCatego-title">${this.title}</h2>
                    <div class="ocCatego-header-actions">
                        <button class="ocCatego-action-button" data-action="copy">Copy</button>
                        <button class="ocCatego-action-button" data-action="export">Export</button>
                        <button class="ocCatego-close" data-action="close">×</button>
                    </div>
                </div>
                
                <div class="ocCatego-search-section">
                    <div class="ocCatego-search-container">
                        <div class="ocCatego-search-input-wrapper">
                            <input class="ocCatego-search-input" placeholder="${searchPlaceHolder}">
                            <button class="ocCatego-search-clear" data-action="clear-search">×</button>
                        </div>
                        ${buttonAdd}
                    </div>
                </div>
                
                <div class="ocCatego-categories-container">
                    <div class="ocCatego-error"></div>
                    <ul class="ocCatego-categories-list"></ul>
                </div>
            </div>
        `;

        // Create confirmation dialog
        this.confirmDialog = document.createElement('dialog');
        this.confirmDialog.className = 'ocCatego-confirm-dialog';
        this.confirmDialog.innerHTML = `
            <div class="ocCatego-confirm-content ocDialog-resizable-container sch_dialog">
                <div class="ocCatego-confirm-header ocDialog-header ocDialog-header-fixed sch_dialog_header" aria-label="Dialog title">
                    <span style="color: #dc3545;">⚠ </span> 
                    <span class="title-text"></span>
                    <button class="ocCatego-close" data-action="confirm-close">×</button>
                </div>
                <div class="ocCatego-confirm-message ocDialog-content-grow"></div>
                <div class="ocCatego-confirm-actions ocDialog-footer-fixed">
                    <button class="ocCatego-confirm-button ocCatego-confirm-no" data-action="confirm-cancel">Cancel</button>
                    <button class="ocCatego-confirm-button ocCatego-confirm-yes" data-action="confirm-ok">Ok</button>
                </div>
            </div>
        `;

        // Append to DOM
        document.body.appendChild(this.dialog);
        document.body.appendChild(this.confirmDialog);

        OcDialogDrag.initialize(this.dialog);
        OcDialogDrag.initialize(this.confirmDialog);

        // Get element references (no IDs needed!)
        this.searchInput = this.dialog.querySelector('.ocCatego-search-input');
        this.searchClear = this.dialog.querySelector('.ocCatego-search-clear');
        this.addButton = this.dialog.querySelector('.ocCatego-add-button');
        this.list = this.dialog.querySelector('.ocCatego-categories-list');
        this.errorDiv = this.dialog.querySelector('.ocCatego-error');
    }

    _destroyDialog() {
        // Remove event listeners to prevent memory leaks
        this._unbindEvents();

        // Remove from DOM
        if (this.dialog) {
            this.dialog.remove();
            this.dialog = null;
        }
        if (this.confirmDialog) {
            this.confirmDialog.remove();
            this.confirmDialog = null;
        }

        // Clear references
        this.searchInput = null;
        this.searchClear = null;
        this.addButton = null;
        this.list = null;
        this.errorDiv = null;
    }

    _bindEvents() {
        // Use event delegation for better performance and cleaner code
        this.dialog.addEventListener('input', this._handleInput.bind(this));
        this.dialog.addEventListener('click', this._handleClick.bind(this));
        this.dialog.addEventListener('keydown', this._handleKeyDown.bind(this));

        this.confirmDialog.addEventListener('click', this._handleConfirmClick.bind(this));

        // escape key handler
        this._escapeHandler = (e) => {
            if (e.key === 'Escape' && this.dialog && this.dialog.open) {
                if (this.confirmDialog && this.confirmDialog.open) {
                     e.stopPropagation();
                    return;
                }
                // Check if we're in an input field - if so, let _handleKeyDown handle it
                const activeElement = document.activeElement;
                const isInInput = activeElement &&
                    (activeElement.classList.contains('ocCatego-category-input') ||
                        activeElement.classList.contains('ocCatego-search-input'));

                // Only close dialog if NOT in an input field
                if (!isInInput) {
                    e.stopPropagation();
                    e.preventDefault();
                    this.close();
                }
            }
        };
        document.addEventListener('keydown', this._escapeHandler);
    }

    _unbindEvents() {
        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeHandler = null;
        }
    }

    _handleInput(e) {
        if (e.target.classList.contains('ocCatego-search-input')) {
            this.filter();
        } else if (e.target.classList.contains('ocCatego-category-input')) {
            const id = this._getEditingIdFromInput(e.target);
            if (id) this.markModified(id);
        }
    }

    _handleClick(e) {
        // Handle backdrop clicks
        if (e.target === this.dialog) {
            e.stopPropagation();
            return;
        }

        const action = e.target.dataset.action;
        if (!action) return;

        switch (action) {
            case 'close':
                this.close();
                break;
            case 'copy':
                this.copy();
                break;
            case 'export':
                this.exportCSV();
                break;
            case 'clear-search':
                this.clearSearch();
                break;
            case 'add':
                this.add();
                break;
            case 'edit':
                this.edit(parseInt(e.target.dataset.id));
                break;
            case 'delete':
                this.confirmDelete(parseInt(e.target.dataset.id));
                break;
            case 'save':
                this.save(parseInt(e.target.dataset.id));
                break;
            case 'cancel':
                this.cancelEdit(false);
                break;
        }
    }

    _handleConfirmClick(e) {
        const action = e.target.dataset.action;
        if (action === 'confirm-cancel' || action === 'confirm-close') {
            this.confirmDialog.close();
             this.confirmDialog.classList.remove('ocCatego-active');
        }
    }

    _handleKeyDown(e) {
        if (e.target.classList.contains('ocCatego-category-input')) {
            if (e.key === 'Enter') {
                const id = this._getEditingIdFromInput(e.target);
                if (id) this.save(id);
            } else if (e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                this.cancelEdit(false);
            }
        } else if (e.target.classList.contains('ocCatego-search-input')) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                this.clearSearch();
            }
        }
    }

    _getEditingIdFromInput(input) {
        // Extract ID from class or data attribute instead of element ID
        const item = input.closest('.ocCatego-category-item');
        return item ? parseInt(item.dataset.categoryId) : null;
    }

    _loadFromSelect() {
        this.list.innerHTML = '<li class="ocCatego-loading">Loading...</li>';
        try {
            this.categories = this._selectToObjects();
            this.filter();
        } catch (error) {
            console.error(error);
            this.showError('Failed to load: ' + error.message);
        }
    }

    _selectToObjects() {
        return Array.from(this.selectElement.options).map(opt => ({
            id: opt.value,
            name: opt.text.trim(),
            selected: opt.selected
        }));
    }

    filter() {
        const query = this._normalizeString(this.searchInput.value);
        const filtered = this.categories.filter(cat =>
            this._normalizeString(cat.name).includes(query)
        );

        this._updateSearchClear();
        this._updateAddButton();
        this._renderCategoryList(filtered);
    }

    _renderCategoryList(categories) {
        if (categories.length === 0) {
            this.list.innerHTML = `
                <li class="ocCatego-empty-state">
                    <div class="ocCatego-empty-state-icon">${this.searchInput.value ? '🔍' : '📂'}</div>
                    <div class="ocCatego-empty-state-text">${this.searchInput.value ? 'No encontre' : 'No hay'}</div>
                </li>
            `;
            return;
        }

        this.list.innerHTML = categories.map(cat => `
            <li class="ocCatego-category-item ${this.editingId == cat.id ? 'ocCatego-editing' : ''}" data-category-id="${cat.id}">
                ${this.editingId == cat.id ? this._renderEdit(cat) : this._renderView(cat)}
            </li>
        `).join('');
    }

    _renderView(cat) {
        const dataActionEdit = this.canEdit ? `data-action="edit"` : '';
        const editButton = this.canEdit ?
            `<button class="ocCatego-action-btn ocCatego-edit-button" data-action="edit" data-id="${cat.id}">Editar</button>` : '';
        const deleteButton = this.canDelete ?
            `<button class="ocCatego-action-btn ocCatego-delete-button" data-action="delete" data-id="${cat.id}">Borrar</button>` : '';
        return `
            <div class="ocCatego-category-name" ${this.canEdit ? `${dataActionEdit} data-id="${cat.id}"` : ''}>${cat.name}</div>
            <div class="ocCatego-category-actions">
                ${editButton}
                ${deleteButton}
            </div>
        `;
    }

    _renderEdit(cat) {
        return `
            <input class="ocCatego-category-input" value="${cat.name}">
            <div class="ocCatego-category-actions">
                <button class="ocCatego-action-btn ocCatego-save-button" data-action="save" data-id="${cat.id}">Guardar</button>
                <button class="ocCatego-action-btn ocCatego-cancel-button" data-action="cancel">Cancelar</button>
            </div>
        `;
    }

    async edit(id) {
        if(!this.canEdit) return;
        if (this.editingId && this.editingId != id && this.hasChanges()) {
            if (!await this.confirmChanges('Hay cambios sin guardar. ¿Desea descartarlos?')) {
                return;
            }
        }

        const cat = this.categories.find(c => c.id == id);
        if (!cat) return;

        this.editingId = id;
        this.originalValue = cat.name;
        this.filter();

        setTimeout(() => {
            const input = this.dialog.querySelector('.ocCatego-category-input');
            if (input) {
                input.focus();
                input.select();
            }
        }, 0);
    }

    async cancelEdit(check) {
        if(check) {
            if (this.hasChanges()) {
                if (!await this.confirmChanges('Perder los cambios?')) return;
            }
        }
        this.clearEdit();
    }

    clearEdit() {
        this.editingId = null;
        this.originalValue = '';
        this.clearError();
        this.filter();
    }

    markModified(id) {
        const input = this.dialog.querySelector('.ocCatego-category-input');
        if (input) {
            input.classList.toggle('ocCatego-modified',
                this._normalizeString(input.value) !== this._normalizeString(this.originalValue));
        }
    }

    hasChanges() {
        if (!this.editingId) return false;
        const input = this.dialog.querySelector('.ocCatego-category-input');
        return input && this._normalizeString(input.value) !== this._normalizeString(this.originalValue);
    }

    async save(id) {
        if(!this.canEdit) return;
        const input = this.dialog.querySelector('.ocCatego-category-input');
        const name = input.value.trim().replace(/\s+/g, ' ');

        if (!name) {
            this.showError('Name required');
            input.focus();
            return;
        }

        try {
            const api = this.getAPI();
            const updated = await api.updateCategory(id, name);
            const index = this.categories.findIndex(c => c.id == id);
            this.categories[index] = updated;
            this.clearEdit();
            this._updateSelect();
            this.showSuccess('Updated!');
        } catch (error) {
            this.showError(error.message);
        }
    }

    async add() {
        if(!this.canAdd) return;
        const name = this.searchInput.value.trim().replace(/\s+/g, ' ');
        if (!name) return;

        try {
            const api = this.getAPI();
            const newCat = await api.addCategory(name);
            this.categories.unshift(newCat);
            this.searchInput.value = '';
            this.filter();
            this._updateSelect();
            this.showSuccess('Added!');
        } catch (error) {
            this.showError(error.message);
        }
    }

    confirmDelete(id) {
        const cat = this.categories.find(c => c.id == id);
        this.confirm('Borrar', `Borrar "${cat.name}"?`, "Si Borrar")
            .then(() => this.delete(id))
            .catch(() => { /* Cancelled */ });
    }

    async delete(id) {
        if(!this.canDelete) return;
        try {
            const api = this.getAPI();
            await api.deleteCategory(id);
            this.categories = this.categories.filter(c => c.id !== id);
            if (this.editingId == id) this.clearEdit();
            this.filter();
            this._updateSelect();
            this.showSuccess('Deleted!');
        } catch (error) {
            this.showError(error.message);
        }
    }

    _updateSearchClear() {
        this.searchClear.classList.toggle('ocCatego-visible', !!this.searchInput.value);
    }

    _updateAddButton() {
        if(!this.canAdd) return;
        const name = this._normalizeString(this.searchInput.value.trim());
        if (!name) {
            this.addButton.disabled = true;
            return;
        }
        const exists = this.categories.some(c => this._normalizeString(c.name) === name);
        this.addButton.disabled = exists;
    }

    clearSearch() {
        this.searchInput.value = '';
        this.filter();
        this.searchInput.focus();
    }

    _updateSelect() {
        const current = this.selectElement.value;
        // Clear existing options except first one
        while (this.selectElement.options.length > 1) {
            this.selectElement.removeChild(this.selectElement.lastChild);
        }

        this.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            if (option.value == current) option.selected = true;
            this.selectElement.appendChild(option);
        });
    }

    copy() {
        const text = this.categories.map(c => c.name).join('\n');
        navigator.clipboard?.writeText(text).then(() => this.showSuccess('Copied!'));
    }

    exportCSV() {
        const csv = 'Category\n' + this.categories.map(c => `"${c.name}"`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'categories.csv';
        a.click();
        URL.revokeObjectURL(url);
        this.showSuccess('Exported!');
    }

    showError(msg) {
        this.errorDiv.innerHTML = `<div class="ocCatego-error-message"><span class="ocCatego-error-icon">⚠ </span>${msg}</div>`;
    }

    showSuccess(msg) {
        this.errorDiv.innerHTML = `<div class="ocCatego-success-message"><span class="ocCatego-success-icon">✓</span>${msg}</div>`;
        setTimeout(() => this.errorDiv.innerHTML = '', 2000);
    }

    clearError() {
        this.errorDiv.innerHTML = '';
    }

    /**
     * Show confirmation dialog
     * @param {string} message - The confirmation message
     * @param {string} title - Dialog title (default: "Confirmar")
     * @param {string} primaryLabel - Primary button label (default: "Aceptar")
     * @param {string} secondaryLabel - Secondary button label (default: "Cancelar")
     * @returns {Promise<boolean>} - Resolves to true if primary button clicked, rejects if cancelled
     */
    async confirm(message, title = "Confirmar", primaryLabel = "Aceptar", secondaryLabel = "Cancelar") {
        return new Promise((resolve, reject) => {
            // Update dialog content
            this.confirmDialog.querySelector('.title-text').textContent = title;
            this.confirmDialog.querySelector('.ocCatego-confirm-message').textContent = message;

            const primaryButton = this.confirmDialog.querySelector('.ocCatego-confirm-yes');
            const secondaryButton = this.confirmDialog.querySelector('.ocCatego-confirm-no');

            // Update button labels
            primaryButton.textContent = primaryLabel;
            secondaryButton.textContent = secondaryLabel;

            // Clean up function
            const cleanup = () => {
                this.confirmDialog.close();
                // this.confirmDialog.classList.remove('ocCatego-active');
                // Remove event listeners
                primaryButton.onclick = null;
                secondaryButton.onclick = null;
                this.confirmDialog.removeEventListener('close', handleDialogClose);
            };

            // Handle primary button (Accept)
            primaryButton.onclick = () => {
                cleanup();
                resolve(true);
            };

            // Handle secondary button (Cancel)
            secondaryButton.onclick = () => {
                cleanup();
                reject(false);
            };

            // Handle dialog close (ESC key, backdrop click, etc.)
            const handleDialogClose = () => {
                cleanup();
                reject(false);
            };

            this.confirmDialog.addEventListener('close', handleDialogClose);

            // Show the confirmation dialog
            // this.confirmDialog.classList.add('ocCatego-active');
            if (typeof this.confirmDialog.showModal === 'function') {
                this.confirmDialog.showModal();
            } else {
                this.confirmDialog.setAttribute('open', '');
            }

            // Focus the secondary button (safer default)
            secondaryButton.focus();
        });
    }

    async confirmChanges(message) {
        try {
            await this.confirm(message, 'Cambios sin Guardar', 'Descartar', 'Continuar Editando');
            return true; // User chose to discard changes
        } catch {
            return false; // User chose to continue editing
        }
    }


    /**
     * Llama al servidor con el formato RPC esperado (async/await).
     * Nunca lanza; siempre devuelve { ok, message?, id?, data? }.
     */
    async rpc(accion, payload = {}) {
        if (!this.apiUrl) {
            const msg = 'apiUrl no está definido';
            showError(msg);
            console.log(msg, accion, payload);
            return { ok: false, message: msg };
        }

        try {
            const res = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ accion, ...payload })
            });

            // Si el servidor responde con 4xx/5xx, intenta leer JSON igual,
            // pero marca el error de red primero.
            let json = null;
            try {
                json = await res.json();
            } catch (e) {
                // sin JSON válido
            }

            if (!res.ok) {
                const msg = (json && json.message) ? json.message : 'Error de red al llamar al servidor';
                showError(msg);
                console.log('HTTP error', res.status, accion, payload, json);
                return { ok: false, message: msg };
            }

            if (!json || json.ok !== true) {
                const msg = (json && json.message) ? json.message : 'Error desconocido del servidor';
                showError(msg);
                console.log('RPC error', accion, payload, json);
                return { ok: false, message: msg };
            }

            return json; // { ok:true, ... }
        } catch (err) {
            const msg = 'Error de red al llamar al servidor';
            showError(msg);
            console.log(msg, accion, payload, err);
            return { ok: false, message: msg };
        }
    }


    destroy() {
        this._destroyDialog();
    }


    // Mock API for testing
    getAPI() {
        return {
            getCategories: () => Promise.resolve([
                { id: 1, name: 'Electronics' },
                { id: 2, name: 'Books' },
                { id: 3, name: 'Clothing' }
            ]),
            addCategory: (name) => {
                const normalized = this._normalizeString(name);
                if (this.categories.some(c => this._normalizeString(c.name) === normalized)) {
                    return Promise.reject(new Error('Already exists API SAYS add'));
                }
                return Promise.resolve({ id: Date.now(), name });
            },
            updateCategory: (id, name) => {
                const normalized = this._normalizeString(name);
                if (this.categories.some(c => c.id !== id && this._normalizeString(c.name) === normalized)) {
                    return Promise.reject(new Error('Already exists API SAYS update'));
                }
                return Promise.resolve({ id, name });
            },
            deleteCategory: () => Promise.resolve()
        };
    }
}
