// noinspection EqualityComparisonWithCoercionJS

// OcCatego.js - CRUD Categoria with dynamic dialog creation

class OcCatego {
    version = '2.0.0';

    constructor(selectElement, categoriaDe, recordId, title = "Categoría", apiUrl = "./api/catego.php", modo = "Add/Edit/Delete") {
        this.selectElement = selectElement;
        if(selectElement)
            this.ocSelectUtil = new OcSelectUtil(selectElement);
        this.categoriaDe = categoriaDe;
        this.recordId = recordId;

        this.title = title;
        this.apiUrl = apiUrl;
        this.canAdd = modo.toLowerCase().includes("add");
        this.canEdit = modo.toLowerCase().includes("edit");
        this.canDelete = modo.toLowerCase().includes("delete");

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
        if(this.dialog && this.dialog.open) {
            // Dialog already open
            return;
        }

        this._createDialog();
        this._bindEvents();

        // Clear search box and messages before opening
        this.searchInput.value = '';
        this._clearError();
        this._updateSearchClear();
        this._updateAddButton();

        if(typeof this.dialog.showModal === 'function') {
            this.dialog.showModal();
        } else {
            // Very old browsers fallback
            this.dialog.setAttribute('open', '');
        }

        this.searchInput.focus();
        this._loadFromSelect();
    }

    async close() {
        if(this.editingId && this._hasChanges()) {
            if(!await this._confirmChanges('Hay cambios los guardo?')) return;
        }

        if(this.dialog && this.dialog.open) {
            if(typeof this.dialog.close === 'function') {
                this.dialog.close();
            } else {
                this.dialog.removeAttribute('open');
            }
        }

        this._clearEdit();
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

        // OcDialogDrag.initialize(this.dialog);
        // OcDialogDrag.initialize(this.confirmDialog);

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
        if(this.dialog) {
            this.dialog.remove();
            this.dialog = null;
        }
        if(this.confirmDialog) {
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
            if(e.key === 'Escape' && this.dialog && this.dialog.open) {
                if(this.confirmDialog && this.confirmDialog.open) {
                    e.stopPropagation();
                    return;
                }
                // Check if we're in an input field - if so, let _handleKeyDown handle it
                const activeElement = document.activeElement;
                const isInInput = activeElement &&
                    (activeElement.classList.contains('ocCatego-category-input') ||
                        activeElement.classList.contains('ocCatego-search-input'));

                // Only close dialog if NOT in an input field
                if(!isInInput) {
                    e.stopPropagation();
                    e.preventDefault();
                    this.close();
                }
            }
        };
        document.addEventListener('keydown', this._escapeHandler);
    }

    _unbindEvents() {
        if(this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeHandler = null;
        }
    }

    _handleInput(e) {
        if(e.target.classList.contains('ocCatego-search-input')) {
            this.filter();
        } else if(e.target.classList.contains('ocCatego-category-input')) {
            const id = this._getEditingIdFromInput(e.target);
            if(id) this._markModified();
        }
    }

    _handleClick(e) {
        // Handle backdrop clicks
        if(e.target === this.dialog) {
            e.stopPropagation();
            return;
        }

        const action = e.target.dataset.action;
        if(!action) return;

        switch(action) {
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
                this._clearSearch();
                break;
            case 'add':
                this._add();
                break;
            case 'edit':
                this._edit(parseInt(e.target.dataset.id));
                break;
            case 'delete':
                this._confirmDelete(parseInt(e.target.dataset.id));
                break;
            case 'save':
                this._save(parseInt(e.target.dataset.id));
                break;
            case 'cancel':
                this._cancelEdit(false);
                break;
        }
    }

    _handleConfirmClick(e) {
        const action = e.target.dataset.action;
        if(action === 'confirm-cancel' || action === 'confirm-close') {
            this.confirmDialog.close();
            this.confirmDialog.classList.remove('ocCatego-active');
        }
    }

    _handleKeyDown(e) {
        if(e.target.classList.contains('ocCatego-category-input')) {
            if(e.key === 'Enter') {
                const id = this._getEditingIdFromInput(e.target);
                if(id) this._save(id);
            } else if(e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                this._cancelEdit(false);
            }
        } else if(e.target.classList.contains('ocCatego-search-input')) {
            if(e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                this._clearSearch();
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
        } catch(error) {
            console.error(error);
            this._showError('Failed to load: ' + error.message);
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
        if(categories.length === 0) {
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

    async _edit(id) {
        if(!this.canEdit) return;
        if(this.editingId && this.editingId != id && this._hasChanges()) {
            if(!await this._confirmChanges('Hay cambios sin guardar. ¿Desea descartarlos?')) {
                return;
            }
        }

        const cat = this.categories.find(c => c.id == id);
        if(!cat) return;

        this.editingId = id;
        this.originalValue = cat.name;
        this.filter();

        setTimeout(() => {
            const input = this.dialog.querySelector('.ocCatego-category-input');
            if(input) {
                input.focus();
                input.select();
            }
        }, 0);
    }

    async _cancelEdit(check) {
        if(check) {
            if(this._hasChanges()) {
                if(!await this._confirmChanges('Perder los cambios?')) return;
            }
        }
        this._clearEdit();
    }

    _clearEdit() {
        this.editingId = null;
        this.originalValue = '';
        this._clearError();
        this.filter();
    }

    _markModified() {
        const input = this.dialog.querySelector('.ocCatego-category-input');
        if(input) {
            input.classList.toggle('ocCatego-modified',
                this._normalizeString(input.value) !== this._normalizeString(this.originalValue));
        }
    }

    _hasChanges() {
        if(!this.editingId) return false;
        const input = this.dialog.querySelector('.ocCatego-category-input');
        return input && this._normalizeString(input.value) !== this._normalizeString(this.originalValue);
    }

    async _save(id) {
        if(!this.canEdit) return;

        const hasApi = this.apiUrl.length > 0;
        const hasSelect = !!this.selectElement;
        if(!hasApi && !hasSelect) {
            const msg = 'selectElement o apiUrl deben ser definidos';
            this._showError(msg);
            console.log(msg);
            return;
        }

        const input = this.dialog ? this.dialog.querySelector('.ocCatego-category-input') : null;
        const raw = input ? input.value : '';
        const label = raw.trim().replace(/\s+/g, ' ');
        if(!label) {
            const msg = 'La etiqueta es requerida.';
            this._showError(msg);
            console.log(msg);
            input && input.focus && input.focus();
            return;
        }

        const normalize= this._normalizeString(label);
        // Duplicate check only when we have a select to compare against
        if(hasSelect &&  !this.ocSelectUtil.optionIsUnique(normalize, id)) {
            const msg = 'Ya existe otra opción con la misma etiqueta.';
            this._showError(msg);
            console.log(msg, {label});
            return;
        }

        if(hasApi) {
            const res = await this._rpc('edit', {id, label});
            if(res && res.ok === true) {
                const idx = this.categories.findIndex(c => String(c.id) == id);
                if(idx >= 0) this.categories[idx] = {id: this.categories[idx].id, name: label};
            }
            if(hasSelect) {
                try {
                    this.ocSelectUtil.optionEdit(id, label);
                } catch(err) {
                    const msg = 'La operación se realizó en el servidor, pero no se pudo actualizar el select.';
                    this._showError(msg);
                    console.log(msg, {accion: 'edit', id, label, res}, err);
                }
            }
            return;
        }
        if(hasSelect) {
            this.ocSelectUtil.optionEdit(label, label);
        }
    }

    async _add() {
        if(!this.canAdd) return;

        const hasApi = this.apiUrl.length > 0;
        const hasSelect = !!this.selectElement;
        if(!hasApi && !hasSelect) {
            const msg = 'selectElement o apiUrl deben ser definidos';
            this._showError(msg);
            console.log(msg);
            return;
        }

        const label = (this.searchInput ? this.searchInput.value : '').trim().replace(/\s+/g, ' ');
        if(!label) {
            const msg = 'La etiqueta es requerida.';
            this._showError(msg);
            console.log(msg);
            return;
        }

        const normalize= this.ocSelectUtil.normalize(label);
        // Duplicate check only when we have a select to compare against
        if(hasSelect &&  !this.ocSelectUtil.optionIsUnique(normalize, "\t")) {
            const msg = 'Ya existe otra opción con la misma etiqueta.';
            this._showError(msg);
            console.log(msg, {label});
            return;
        }

        if(hasApi) {
            const res = await this._rpc('add', {label});
            if(res && res.ok === true) {
                if(hasSelect) {
                    this.ocSelectUtil.optionAdd(res.id, label, false);
                }
                this.categories.push({id: res.id, name: label});
                this.filter();
                this._showSuccess('Added!');
            }
            return;
        }
        if(hasSelect) {
            this.ocSelectUtil.optionAdd(label, label, false);
            this.categories.push({id:label, name: label});
            this.filter();
            this._showSuccess('Added!');
        }
    }

    async _delete(id) {
        if(!this.canDelete) return;

        const hasApi = this.apiUrl.length > 0;
        const hasSelect = !!this.selectElement;

        if(!hasApi && !hasSelect) {
            const msg = 'selectElement o apiUrl deben ser definidos';
            this._showError(msg);
            console.log(msg);
            return;
        }

        if(hasApi) {
            const res = await this._rpc('delete', {id});
            if(res && res.ok === true) {
                if(hasSelect)
                    try {
                        this.ocSelectUtil.optionDelete(String(id));
                    } catch(err) {
                        const msg = 'La operación se realizó en el servidor, pero no se pudo actualizar el select.';
                        this._showError(msg);
                        console.log(msg, {accion: 'delete', id, res}, err);
                    }
                this._deleteCategory(id);
                this._showSuccess('Deleted!');
            }
            return;
        }

        if(hasSelect) {
            try {
                this.ocSelectUtil.optionDelete(String(id));
                this._deleteCategory(id);
                this._showSuccess('Deleted!');
            } catch(err) {
                console.log("_delete error", err);
                const msg = 'Error al quitarla del select.';
                console.log(msg, {accion: 'delete', id}, err);
                this._showError(msg);
            }
        }
    }

    _confirmDelete(id) {
        const cat = this.categories.find(c => c.id == id);
        this._confirm('Borrar', `Borrar "${cat.name}"?`, "Si Borrar")
            .then(() => this._delete(id))
            .catch(() => { /* Cancelled */
            });
    }

    _deleteCategory(id) {
        // Find the index of the category to remove
        const indexToRemove = this.categories.findIndex(c => String(c.id) === String(id));
        // If the category is found (index is not -1), remove it
        if(indexToRemove > -1) {
            this.categories.splice(indexToRemove, 1);
        }
        const elementToRemove = this.dialog.querySelector(`LI.ocCatego-category-item[data-category-id="${id}"]`);
        console.log("elementToRemove", id)
        console.log("elementToRemove", elementToRemove)
        if(elementToRemove) {
            elementToRemove.remove();
        }
    }

    _updateSearchClear() {
        this.searchClear.classList.toggle('ocCatego-visible', !!this.searchInput.value);
    }

    _updateAddButton() {
        if(!this.canAdd) return;
        const name = this._normalizeString(this.searchInput.value.trim());
        if(!name) {
            this.addButton.disabled = true;
            return;
        }
        this.addButton.disabled = this.categories.some(c => this._normalizeString(c.name) === name);
    }

    _clearSearch() {
        this.searchInput.value = '';
        this.filter();
        this.searchInput.focus();
    }

    copy() {
        const text = this.categories.map(c => c.name).join('\n');
        navigator.clipboard?.writeText(text).then(() => this._showSuccess('Copied!'));
    }

    exportCSV() {
        const csv = 'Category\n' + this.categories.map(c => `"${c.name}"`).join('\n');
        const blob = new Blob([csv], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'categories.csv';
        a.click();
        URL.revokeObjectURL(url);
        this._showSuccess('Exported!');
    }

    _showError(msg) {
        this.errorDiv.innerHTML = `<div class="ocCatego-error-message"><span class="ocCatego-error-icon">⚠ </span>${msg}</div>`;
    }

    _showSuccess(msg) {
        this.errorDiv.innerHTML = `<div class="ocCatego-success-message"><span class="ocCatego-success-icon">✓</span>${msg}</div>`;
        setTimeout(() => {
            if(this.errorDiv)
                this.errorDiv.innerHTML = '';
        }, 2000);
    }

    _clearError() {
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
    async _confirm(message, title = "Confirmar", primaryLabel = "Aceptar", secondaryLabel = "Cancelar") {
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
            // this.confirmDialog.classList._add('ocCatego-active');
            if(typeof this.confirmDialog.showModal === 'function') {
                this.confirmDialog.showModal();
            } else {
                this.confirmDialog.setAttribute('open', '');
            }

            // Focus the secondary button (safer default)
            secondaryButton.focus();
        });
    }

    async _confirmChanges(message) {
        try {
            await this._confirm(message, 'Cambios sin Guardar', 'Descartar', 'Continuar Editando');
            return true; // User chose to discard changes
        } catch {
            return false; // User chose to continue editing
        }
    }


    /**
     * Llama al servidor con el formato RPC esperado (async/await).
     * Nunca lanza; siempre devuelve { ok, message?, id?, data? }.
     */
    async _rpc(accion, payload = {}) {
        if(!this.apiUrl) {
            const msg = 'apiUrl no está definido';
            this._showError(msg);
            console.log(msg, accion, payload);
            return {ok: false, message: msg};
        }
        payload.categoriaDe = this.categoriaDe;
        payload.recordId = this.recordId;
        try {
            const res = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'same-origin',
                body: JSON.stringify({accion, ...payload})
            });

            // Si el servidor responde con 4xx/5xx, intenta leer JSON igual,
            // pero marca el error de red primero.
            let json = null;
            try {
                json = await res.json();
            } catch(e) {
                // sin JSON válido
            }

            if(!res.ok) {
                const msg = (json && json.message) ? json.message : 'Error de red al llamar al servidor';
                this._showError(msg);
                console.log('HTTP error', res.status, accion, payload, json);
                return {ok: false, message: msg};
            }

            if(!json || json.ok !== true) {
                const msg = (json && json.message) ? json.message : 'Error desconocido del servidor';
                this._showError(msg);
                console.log('RPC error', accion, payload, json);
                return {ok: false, message: msg};
            }

            return json; // { ok:true, ... }
        } catch(err) {
            const msg = 'Error de red al llamar al servidor';
            this._showError(msg);
            console.log(msg, accion, payload, err);
            return {ok: false, message: msg};
        }
    }

    destroy() {
        this._destroyDialog();
    }

}

// Export for use in other modules
if(typeof module !== 'undefined' && module.exports) {
    module.exports = OcCatego;
}

