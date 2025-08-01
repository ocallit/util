class OcSelectCRUD {
    constructor( linkedSelect, apiUrl, categoryType, title, onChange ) {
        this.linkedSelect = linkedSelect;
        this.apiUrl = apiUrl;
        this.categoryType = categoryType;
        this.title = title;
        this.onChange = onChange;
    }

    open() {
        const options = Array.from(this.linkedSelect.options).map(opt => ({
            id: opt.value,
            label: opt.textContent
        }));

        const contentHTML = `
            <div class="oc_catego_crud_search_container">
                <input type="text" class="oc_catego_crud_search_input" placeholder="Buscar categoría...">
                <button class="oc_catego_crud_search_clear">×</button>
            </div>
            <button class="oc_catego_crud_btn oc_catego_crud_btn_add">Add New Category</button>
            <div class="oc_catego_crud_categories_list">
                ${options.map(opt => `
                <div class="oc_catego_crud_category_item" style="display:flex;flex-direction: row;flex-wrap: wrap;gap: 1em;justify-content: flex-start;align-items: flex-start" data-id="${opt.id}">
                    <div class="oc_catego_crud_category_actions">
                        <button type="button" class="oc_catego_crud_btn oc_catego_crud_btn_edit">🖊</button>
                        <button type="button" class="oc_catego_crud_btn oc_catego_crud_btn_delete">🗑️</button>
                    </div>
                    <span class="oc_catego_crud_category_name">${opt.label}</span>
                </div>`).join('')}
            </div>
        `;
        const divElement = document.createElement("div");
        divElement.innerHTML = contentHTML;
        divElement.querySelector('.oc_catego_crud_btn_add').onclick = () => this._showEditDialog('');
        divElement.querySelectorAll('.oc_catego_crud_btn_edit').forEach(btn => btn.onclick = e => {
            const item = e.target.closest('.oc_catego_crud_category_item');
            this._showEditDialog(item.dataset.id, item.querySelector('.oc_catego_crud_category_name').textContent);
        });
        divElement.querySelectorAll('.oc_catego_crud_btn_delete').forEach(btn => btn.onclick = e => {
            const item = e.target.closest('.oc_catego_crud_category_item');
            this._deleteCategory(item.dataset.id, item);
        });


        function normalize(str) {
            return str
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();
        }

        function handleSearchInput() {
            const search = normalize(searchInput.value);
            items.forEach(item => {
                const name = normalize(item.querySelector('.oc_catego_crud_category_name').textContent);
                item.style.display = name.includes(search) ? 'flex' : 'none';
            });
        }

        function handleClearClick() {
            searchInput.value = '';
            items.forEach(item => item.style.display = 'flex');
            searchInput.focus();
        }

        const searchInput = divElement.querySelector('.oc_catego_crud_search_input');
        const clearBtn = divElement.querySelector('.oc_catego_crud_search_clear');
        const items = divElement.querySelectorAll('.oc_catego_crud_category_item');

        searchInput.addEventListener('input', handleSearchInput);
        clearBtn.addEventListener('click', handleClearClick);

        divElement._cleanup = function() {
            searchInput.removeEventListener('input', handleSearchInput);
            clearBtn.removeEventListener('click', handleClearClick);
        };
        schDialog({title:"Categorías de Productos", html:divElement});
    }

    _showEditDialog(id, currentLabel = '') {
        const isEdit = id !== '';
        const contentHTML = `
	<div style="width:30ch">
	    <input name="label" placeholder="Categoría" type="text" value="${currentLabel}" style="width:95%"><button type="button" tabindex="-1" class="clear-btn" onclick="clear_btn(this)">&times;</button>
		<div class="symbols-container">
			<div class="symbols-row">
				<span>🧩</span><span>💡</span>
				<span>🆕</span>
				<span>🧭</span>
				<span>✅</span><span>✓</span><span>❌</span><span>✗</span><span>⚠️</span><span>ℹ️</span>
				<span>↑</span><span>↓</span>
				<span>★</span><span>☀</span>
				<span>❤</span><span>⚡</span><span>📍</span><span>📌</span><span>📎</span><span>✨</span>
				<span>💬</span><span>🚀</span>
			</div>
			<div class="symbols-scroll_tip">&#8597;</div>
		</div>
	</div>
`;

        schForm({
            title: isEdit ? '✎ Editar Categoría' : 'Nueva Categoría ✎',
            formContent: contentHTML,
            onSave: (formData) => {
                const label = formData.label.trim();
                if (!label) return Promise.reject('Label is empty');
                this._saveCategory(id, label);
                return Promise.resolve();
            },
            saveLabel: '✔ Guardar',
            cancelLabel: '✖ Cancelar'
        });
        symbolRowInit()
    }

    _saveCategory(id, label) {
        const action = id ? 'update' : 'insert';

        fetch(`${this.apiUrl}?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, label, categoryType: this.categoryType })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (action === 'insert') {
                        const option = new Option(data.label, data.id);
                        this.linkedSelect.add(option);
                    } else {
                        const option = this.linkedSelect.querySelector(`option[value="${id}"]`);
                        if (option) option.textContent = data.label;
                    }

                } else {
                    schError(data.message);
                }
            });
    }

    _deleteCategory(id, itemElement) {
        const categoryName = itemElement.querySelector('.oc_catego_crud_category_name').textContent;
        schConfirmBorrar(`Borrar la categoría "${categoryName}"?`, "Confirme Eliminar").then( r  => {
            fetch(`${this.apiUrl}?action=delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, categoryType: this.categoryType })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const option = this.linkedSelect.querySelector(`option[value="${id}"]`);
                        if (option) option.remove();
                        itemElement.remove();
                        this.onChange(data, this.linkedSelect);
                    } else {
                        alert(data.message);
                    }
                });
        });
    }
}
originalFetch = fetch;
function fetch(url, options) {
    return new Promise(resolve => {
        const body = options && options.body ? JSON.parse(options.body) : {};
        resolve({
            json: () => Promise.resolve({
                success: true,
                label: body.label || "the label sent",
                id: body.id || String(Math.floor(Math.random() * 999) + 1)
            })
        });
    });
}