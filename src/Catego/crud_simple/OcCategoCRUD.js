/**
 */

const OcCategoCRUD = {
    selectorWidget: null,
    linkedSelect: null,
    apiUrl: null,
    categoryType: null,

    init() {
        const dialog = document.getElementById('oc_catego_crud_dialog');
        if(!dialog.showModal) {
            dialogPolyfill.registerDialog(dialog);
        }
        const addBtn = document.getElementById('oc_catego_crud_add_btn');
        if(addBtn)
            addBtn.addEventListener('click', OcCategoCRUD._addCategory);
        const searchButton = document.getElementById('oc_catego_crud_search');
        if(searchButton)
            searchButton.addEventListener('input', OcCategoCRUD._searchCategories);
    },

    open(selectorWidget, opener = null) {
        this.selectorWidget = selectorWidget;
        this.linkedSelect = document.getElementById(selectorWidget.dataset.oc_catego_linked_select);
        this.apiUrl = selectorWidget.dataset.oc_catego_api_url;
        this.categoryType = selectorWidget.dataset.oc_catego;
        this._renderCategoryListFromSelect();
        document.getElementById('oc_catego_crud_dialog').showModal();
    },

    close() {
        const dialog = document.getElementById('oc_catego_crud_dialog');
        dialog.close();
        document.getElementById('oc_catego_crud_search').value = "";
        this.selectorWidget = null;
        this.linkedSelect = null;
        this.apiUrl = null;
        this.categoryType = null;
    },

    _showError(message) {
        const errorDiv = document.getElementById('oc_catego_crud_error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    },

    /** region: search categories */
    _searchCategories() {
        console.log("do search ")
        const normalize = s => s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const search = normalize(document.getElementById('oc_catego_crud_search').value);
        const listContainer = document.getElementById('oc_catego_crud_list');
        if(!listContainer) return;
        const items = listContainer.querySelectorAll('.oc_catego_crud_category_item');
        items.forEach(item => {
            const nameElement = item.querySelector('.oc_catego_crud_category_name');
            if(!nameElement) return;
            const name = normalize(nameElement.textContent);
            item.style.display = search.length === 0 || name.includes(search) ? '' : 'none';
        });
    },

    _searchClear() {
        document.getElementById('oc_catego_crud_search').value = '';
        this._renderCategoryListFromSelect();
    },
    /** endregion: search categories */

    _renderCategoryListFromSelect() {
        const list = document.getElementById('oc_catego_crud_list');
        const filter = document.getElementById('oc_catego_crud_search').value.toLowerCase();

        const options = [...this.linkedSelect.options];
        const visibleOptions = options.filter(opt => opt.textContent.toLowerCase().includes(filter));

        if(!visibleOptions.length) {
            list.innerHTML = '<div class="oc_catego_crud_empty_message">No hay categorías</div>';
            return;
        }

        list.innerHTML = '';
        for(const opt of visibleOptions) {
            const div = document.createElement('div');
            div.className = 'oc_catego_crud_category_item';
            div.innerHTML = `
                <div class="oc_catego_crud_category_actions">
                    <button class="oc_catego_crud_btn oc_catego_crud_btn_edit" onclick="OcCategoCRUD._beginEdit(this, '${opt.value}', '${opt.textContent.replace(/'/g, '\\&#39;')}')">✏️</button>
                    <button class="oc_catego_crud_btn oc_catego_crud_btn_delete" onclick="OcCategoCRUD._deleteCategory('${opt.value}', '${opt.textContent}')">🗑️</button>
                </div>
                <div class="oc_catego_crud_category_name">${opt.textContent}</div>
                `;
            list.appendChild(div);
        }
    },

    _addCategory() {
        const title = 'Nueva Categoría';
        const placeholder = 'Nombre de la categoría...';

        schTextEdit("", "Nueva Categoría", "Nueva Categoría").then(result => {

            if(result===null)
                return;

            const name = result.value.trim();

            if(!name) return;
            console.log("manda a formdata",  OcCategoCRUD.apiUrl)
            const formData = new URLSearchParams();
            formData.append('action', 'insert');
            formData.append('category_type', OcCategoCRUD.categoryType);
            formData.append('category', name);
            console.log(" ________OcCategoCRUD.apiUrl=", OcCategoCRUD.apiUrl)
            fetch(OcCategoCRUD.apiUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: formData.toString()
            })
                .then(r => r.json())
                .then(json => {
                    console.log("**************** _addCategory json=", json)
                    if(json.success) {
                        console.log("en susccces")
                        const newOption = document.createElement('option');
                        newOption.value = json.data.oc_category_id;
                        newOption.textContent = json.data.category;
                        newOption.selected = false;
                        // Add the required creation date attribute
                        const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
                        newOption.setAttribute('data-oc_catego_asignado_el', today);
                        console.log("appended OcCategoCRUD.linkedSelect", OcCategoCRUD.linkedSelect)
                        console.log(" newOption", newOption)
                        if(OcCategoCRUD.linkedSelect) {
                            OcCategoCRUD.linkedSelect.appendChild(newOption);
                            // OcCategoWidget.syncFromSelect(OcCategoCRUD.selectorWidget, OcCategoCRUD.linkedSelect);
                            OcCategoWidget.initializeFromLinkedSelect(OcCategoCRUD.selectorWidget);
                            OcCategoCRUD._renderCategoryListFromSelect();
                        }
                    } else {
                        schAlert('❌ Error', json.error || 'Error desconocido al crear categoría');
                    }
                })
                .catch(err => {
                    console.error('Error creating category:', err);
                    schAlert('❌ Error', 'Error de red o servidor al crear categoría.');
                });
        }).catch(() => {
            // User cancelled — no action
        });
    },

    _beginEdit(button, categoryId, currentName) {
        const item = button.closest('.oc_catego_crud_category_item');
        if(!item) return;

        item.innerHTML = `
            <div class="oc_catego_crud_edit_container">
                <input class="oc_catego_crud_edit_input" value="${currentName}" />
                <div class="oc_catego_crud_edit_actions">
                    <button class="oc_catego_crud_btn_save" onclick="OcCategoCRUD._saveCategory(this, '${categoryId}')">Guardar</button>
                    <button class="oc_catego_crud_btn_cancel" onclick="OcCategoCRUD._renderCategoryListFromSelect()">Cancelar</button>
                </div>
            </div>`;
    },

    _saveCategory(button, categoryId = null) {
        const item = button.closest('.oc_catego_crud_category_item');
        const input = item.querySelector('input');
        const name = input.value.trim();
        if(!name) return alert('Nombre requerido');

        const form = new URLSearchParams();
        form.set('action', 'upsert');
        form.set('category_type', this.categoryType);
        form.set('category', name);
        if(categoryId) form.set('oc_category_id', categoryId);

        fetch(this.apiUrl, {
            method: 'POST',
            body: form
        })
            .then(res => res.json())
            .then(json => {
                if(!json.success) throw new Error(json.error || 'Error al guardar');
                this._updateCategories();
            })
            .catch(err => alert(err.message));
    },

    _deleteCategory(categoryId, categoryName) {
        const message = `¿Está seguro que desea eliminar la categoría «${categoryName}»?`;

        schConfirmBorrar(message).then(() => {
            const formData = new URLSearchParams();
            formData.append('action', 'delete');
            formData.append('category_type', OcCategoCRUD.categoryType);
            formData.append('oc_category_id', categoryId);

            fetch(OcCategoCRUD.apiUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: formData.toString()
            })
                .then(r => r.json())
                .then(json => {
                    if(json.success) {
                        // 🔧 Remove option from <select>
                        if(OcCategoCRUD.linkedSelect) {
                            const option = OcCategoCRUD.linkedSelect.querySelector(`option[value="${categoryId}"]`);
                            if(option) option.remove();
                            OcCategoWidget.initializeFromLinkedSelect(OcCategoCRUD.selectorWidget, OcCategoCRUD.linkedSelect);
                        }
                        // 🔁 Refresh CRUD list
                        OcCategoCRUD._renderCategoryListFromSelect();
                    } else {
                        schAlert('❌ Error', json.error || 'Error desconocido al eliminar categoría');
                    }
                })
                .catch(err => {
                    console.error('Error deleting category:', err);
                    schAlert('❌ Error', 'Error de red o servidor al eliminar categoría.');
                });
        }).catch(() => {
            // User canceled — do nothing
        });
    },


    _updateCategories() {
        OcCategoWidget.syncFromSelect(OcCategoCRUD.linkedSelect)
        OcCategoCRUD._renderCategoryListFromSelect()
    }

};

// Auto-init
if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => OcCategoCRUD.init());
} else {
    OcCategoCRUD.init();
}
