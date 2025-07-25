/** ocCategoCRUD - Refactored for Multiple Widget Support
 *  file: ocCategoCRUD.js
 *  version: 2.0.0
 */
const ocCategoCRUD = {
    version: '2.0.1',
    // API endpoint
    apiUrl: 'catego/ajax.php',

    // Utility: Get widget from any event target
    getWidgetFromEvent(element) {
        return element.closest('.oc_catego') ||
            document.querySelector(`[data-oc_catego="${element.closest('[data-id]')?.dataset.categoryType}"]`);
    },

    // Get state from dialog (widget-agnostic)
    getState(widget) {
        const dialog = document.getElementById('oc_catego_crud_dialog');
        return {
            widget: widget, // Include widget reference in state
            categoryType: dialog.dataset.categoryType || '',
            title: dialog.dataset.title || '',
            categories: JSON.parse(dialog.dataset.categories || '[]'),
            isLoading: dialog.dataset.loading === 'true'
        };
    },

    // Set categories data
    setCategories(widget, categories) {
        const dialog = document.getElementById('oc_catego_crud_dialog');
        dialog.dataset.categories = JSON.stringify(categories);
    },

    // Set loading state
    setLoading(widget, loading) {
        const dialog = document.getElementById('oc_catego_crud_dialog');
        dialog.dataset.loading = loading.toString();
    },

    // Open the main administration dialog
    openDialog(categoryType, title,  widget = null) {
        console.log('🚀 Opening CRUD dialog for:', categoryType, title);

        const dialog = document.getElementById('oc_catego_crud_dialog');
        const titleElement = document.getElementById('oc_catego_crud_title');

        // Set dialog properties (including widget reference)
        dialog.dataset.categoryType = categoryType;
        dialog.dataset.title = title;
        dialog.dataset.categories = '[]';
        dialog.dataset.loading = 'false';
        dialog.dataset.widgetId = widget?.id || `temp_${Date.now()}`; // Store widget identifier

        titleElement.textContent = `Categorías para: ${title}`;

        // Clear search and error
        this.clearSearch(widget);
        this.hideError(widget);

        // Load categories only once
        this.loadCategories(widget);

        dialog.showModal();
    },

    // Close the main dialog with optional widget update
    closeDialog(buttonOrWidget, updateWidget = true) {
        const dialog = document.getElementById('oc_catego_crud_dialog');
        const widget = document.getElementById(dialog.dataset.widgetId);
        console.log('🔄 DECIDO SI UPDATEAR', widget);
        updateWidget =true;
        if (updateWidget && widget) {
            console.log('🔄 Updating widget after CRUD dialog close');
            this.updateWidgetFromCRUD(buttonOrWidget);
        }

        dialog.close();
        delete dialog.dataset.widgetId; // Clear reference
    },

    // Update widget with latest categories from CRUD - FIXED VERSION
    updateWidgetFromCRUD(widget) {
        console.log("**** updateWidgetFromCRUD called!!!")
        if (!widget) {
            const dialog = document.getElementById('oc_catego_crud_dialog');
            const widgetId = dialog.dataset.widgetId;
            widget = document.getElementById(widgetId) || document.querySelector(`[data-oc_catego]`);
        }

        if (!widget) {
            console.warn('No widget reference available for update');
            return;
        }

        const state = this.getState(widget);
        const categories = state.categories;

        if (!Array.isArray(categories) || categories.length === 0) {
            console.warn('No categories available to update widget');
            return;
        }

        console.log('📋 Updating widget with categories:', categories);

        // Get current selected values before update (from both widget and select)
        const currentSelectedFromWidget = OcCategoWidget.getValue(widget);

        // Also check the linked select to ensure consistency
        const selectId = widget.dataset.oc_catego_linked_select;
        let currentSelectedFromSelect = [];
        if (selectId) {
            const selectElement = document.getElementById(selectId);
            if (selectElement) {
                currentSelectedFromSelect = Array.from(selectElement.selectedOptions).map(opt => opt.value);
            }
        }

        // Use the union of both selections to ensure nothing is lost
        const allCurrentSelected = [...new Set([...currentSelectedFromWidget, ...currentSelectedFromSelect])];
        console.log('💾 Current selected values (combined):', allCurrentSelected);

        // Convert categories to widget format
        const widgetCategories = categories.map(cat => ({
            id: cat.oc_category_id.toString(),
            label: cat.category
        }));

        // Create a map for quick lookup of new category labels
        const categoryLabelMap = new Map();
        widgetCategories.forEach(cat => {
            categoryLabelMap.set(cat.id, cat.label);
        });

        // Filter out deleted categories from selection
        const validCategoryIds = widgetCategories.map(cat => cat.id);
        const validSelectedValues = allCurrentSelected.filter(id => validCategoryIds.includes(id));

        if (validSelectedValues.length !== allCurrentSelected.length) {
            const deletedCount = allCurrentSelected.length - validSelectedValues.length;
            console.log(`⚠️ ${deletedCount} selected categories were deleted, updating selection`);
        }

        // Update the widget with new categories
        OcCategoWidget.updateWidgetCategories(widget, widgetCategories);

        // Restore valid selections to widget
        OcCategoWidget.setValue(widget, validSelectedValues);

        // Update linked select element
        if (selectId) {
            this.updateLinkedSelect(selectId, widgetCategories, validSelectedValues);
        }

        // Ensure widget state is consistent
        OcCategoWidget.updateCounters(widget);
        OcCategoWidget.updateMoveAllButtons(widget);

        console.log('✅ Widget and select update completed');

        return {
            totalCategories: categories.length,
            selectedCategories: validSelectedValues.length,
            deletedFromSelection: allCurrentSelected.length - validSelectedValues.length
        };
    },

    // Update linked select element with new categories
    updateLinkedSelect(selectId, categories, selectedValues) {
        const selectElement = document.getElementById(selectId);
        if (!selectElement) {
            console.warn('Linked select element not found:', selectId);
            return;
        }

        console.log('🔄 Updating linked select:', selectId);

        // Clear existing options
        selectElement.innerHTML = '';

        // Add new options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.label;
            option.selected = selectedValues.includes(category.id);
            selectElement.appendChild(option);
        });

        console.log('✅ Linked select updated');
    },

    // Load categories from server (only called once)
    async loadCategories(widget) {
        const state = this.getState(widget);

        // Prevent double loading
        if (state.isLoading) {
            return;
        }

        this.setLoading(widget, true);
        const listElement = document.getElementById('oc_catego_crud_list');

        listElement.innerHTML = '<div class="oc_catego_crud_loading">Cargando categorías...</div>';

        try {
            const formData = new FormData();
            formData.append('action', 'list');
            formData.append('category_type', state.categoryType);

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.setCategories(widget, result.data);
                this.renderFilteredCategories(widget);
                this.updateWidgetFromCRUD(widget);
                console.log('📋 Categories loaded:', result.data.length);
            } else {
                this.showError(widget, result.error || 'Error al cargar las categorías');
            }
        } catch (error) {
            this.showError(widget, 'Error de conexión al cargar las categorías');
            console.error('Error loading categories:', error);
        } finally {
            this.setLoading(widget, false);
        }
    },

    // Local search and render (no server call)
    renderFilteredCategories(widget) {
        const state = this.getState(widget);
        const listElement = document.getElementById('oc_catego_crud_list');
        const searchTerm = document.getElementById('oc_catego_crud_search').value.toLowerCase();

        // Filter categories locally
        const filteredCategories = state.categories.filter(cat =>
            cat.category.toLowerCase().includes(searchTerm)
        );

        if (filteredCategories.length === 0) {
            listElement.innerHTML = `
                <div class="oc_catego_crud_empty_message">
                    ${searchTerm ? 'No se encontraron categorías que coincidan con la búsqueda' : 'No hay categorías registradas'}
                </div>
            `;
            return;
        }

        listElement.innerHTML = filteredCategories.map(category =>
            this.renderCategoryItem(widget, category)
        ).join('');
    },

    // Render individual category item
    renderCategoryItem(widget, category) {
        const infoText = this.getCategoryInfo(category);

        return `
            <div class="oc_catego_crud_category_item" data-id="${category.oc_category_id}">
            <div class="oc_catego_crud_category_actions">
                    <button class="oc_catego_crud_btn oc_catego_crud_btn_edit" 
                            onclick="ocCategoCRUD.editCategory(this, ${category.oc_category_id}, '${this.escapeHtml(category.category)}')">
                        Editar
                    </button>
                    <button class="oc_catego_crud_btn oc_catego_crud_btn_delete" 
                            onclick="ocCategoCRUD.confirmDelete(this, ${category.oc_category_id}, '${this.escapeHtml(category.category)}')">
                        Eliminar
                    </button>
                </div>
                <div class="oc_catego_crud_category_content">
                    <div class="oc_catego_crud_category_name">${this.escapeHtml(category.category)}</div>
                    ${infoText ? `<div class="oc_catego_crud_category_info">${infoText}</div>` : ''}
                </div>
                
            </div>
        `;
    },

    // Get category info summary
    getCategoryInfo(category) {
        if (!category.category_data || Object.keys(category.category_data).length === 0) {
            return '';
        }

        const info = Object.entries(category.category_data)
            .map(([key, value]) => `${key}: ${value}`)
            .join(' | ');

        return info.length > 100 ? info.substring(0, 100) + '...' : info;
    },

    // Setup search functionality
    setupSearch() {
        const searchInput = document.getElementById('oc_catego_crud_search');
        let searchTimeout;

        searchInput.addEventListener('input', (event) => {
            // Get widget from dialog dataset or from current context
            const dialog = document.getElementById('oc_catego_crud_dialog');
            const widgetId = dialog.dataset.widgetId;
            const widget = document.getElementById(widgetId) ||
                document.querySelector(`[data-oc_catego]`); // Fallback

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.renderFilteredCategories(widget); // Local search only
            }, 100); // Faster response for local search
        });
    },

    // Clear search
    clearSearch(widget) {
        document.getElementById('oc_catego_crud_search').value = '';
        this.renderFilteredCategories(widget);
    },

    editCategory(buttonElement, categoryId, currentName) {
        const widget = this.getWidgetFromEvent(buttonElement);
        const state = this.getState(widget);
        this.editCategoryInline(widget, categoryId, currentName);
    },

    // Extract category_data from form result
    extractCategoryData(formResult) {
        const reservedFields = ['category_type', 'oc_category_id', 'category'];
        const categoryData = {};

        for (const [key, value] of Object.entries(formResult)) {
            if (!reservedFields.includes(key) && value !== null && value !== undefined && value !== '') {
                categoryData[key] = value;
            }
        }

        return categoryData;
    },

    // Update category in local data
    updateCategoryInLocalData(widget, formResult) {
        const state = this.getState(widget);
        const categories = state.categories;
        const categoryIndex = categories.findIndex(cat => cat.oc_category_id == formResult.oc_category_id);

        if (categoryIndex !== -1) {
            categories[categoryIndex].category = formResult.category;
            categories[categoryIndex].category_data = this.extractCategoryData(formResult);
            this.setCategories(widget, categories);
        }
    },

    // Inline editing (original method)
    editCategoryInline(widget, categoryId, currentName) {
        const categoryItem = document.querySelector(`[data-id="${categoryId}"]`);
        const contentDiv = categoryItem.querySelector('.oc_catego_crud_category_content');
        const actionsDiv = categoryItem.querySelector('.oc_catego_crud_category_actions');

        // Hide actions
        actionsDiv.style.display = 'none';

        // Replace content with edit form
        contentDiv.innerHTML = `
            <div class="oc_catego_crud_edit_container">
                <div class="oc_catego_crud_input_container">
                    <input type="text" 
                           class="oc_catego_crud_edit_input" 
                           value="${this.escapeHtml(currentName)}"
                           onkeypress="if(event.key==='Enter') ocCategoCRUD.saveInlineCategory(this, ${categoryId})"
                           onkeydown="if(event.key==='Escape') ocCategoCRUD.cancelEdit(this, ${categoryId}, '${this.escapeHtml(currentName)}')">
                    <button class="oc_catego_crud_input_clear" onclick="this.previousElementSibling.value=''" aria-label="Limpiar búsqueda">&times;</button>
                </div>
                <div class="oc_catego_crud_edit_actions">
                    <button class="oc_catego_crud_btn oc_catego_crud_btn_save" 
                            onclick="ocCategoCRUD.saveInlineCategory(this, ${categoryId})">
                        Guardar
                    </button>
                    <button class="oc_catego_crud_btn oc_catego_crud_btn_cancel" 
                            onclick="ocCategoCRUD.cancelEdit(this, ${categoryId}, '${this.escapeHtml(currentName)}')">
                        Cancelar
                    </button>
                </div>
            </div>
        `;

        // Focus and select the input
        const input = contentDiv.querySelector('.oc_catego_crud_edit_input');
        input.focus();
        input.select();
    },

    // Save inline category changes
    async saveInlineCategory(buttonElement, categoryId) {
        const widget = this.getWidgetFromEvent(buttonElement);
        const categoryItem = document.querySelector(`[data-id="${categoryId}"]`);
        const input = categoryItem.querySelector('.oc_catego_crud_edit_input');
        const newName = input.value.trim();

        if (!newName) {
            this.showValidationDialog('El nombre de la categoría no puede estar vacío');
            input.focus();
            return;
        }

        const state = this.getState(widget);

        try {
            const formData = new FormData();
            formData.append('action', 'upsert');
            formData.append('category_type', state.categoryType);
            formData.append('category', newName);
            formData.append('oc_category_id', categoryId);

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Update the category in local data
                const categories = state.categories;
                const categoryIndex = categories.findIndex(cat => cat.oc_category_id == categoryId);
                if (categoryIndex !== -1) {
                    categories[categoryIndex].category = newName;
                    this.setCategories(widget, categories);
                }

                // Update only this row (no full reload)
                this.updateCategoryRow(widget, categoryId, newName);
                this.updateWidgetFromCRUD(widget);
                console.log('✅ Category updated:', newName);

            } else {
                this.showError(widget, result.error || 'Error al guardar la categoría');
                input.focus();
            }
        } catch (error) {
            this.showError(widget, 'Error de conexión al guardar la categoría');
            input.focus();
            console.error('Error saving category:', error);
        }
    },

    // Update single category row after save
    updateCategoryRow(widget, categoryId, categoryName) {
        const state = this.getState(widget);
        const category = state.categories.find(cat => cat.oc_category_id == categoryId);
        if (!category) return;

        const categoryItem = document.querySelector(`[data-id="${categoryId}"]`);
        const contentDiv = categoryItem.querySelector('.oc_catego_crud_category_content');
        const actionsDiv = categoryItem.querySelector('.oc_catego_crud_category_actions');

        const infoText = this.getCategoryInfo(category);

        // Restore original content with updated name
        contentDiv.innerHTML = `
            <div class="oc_catego_crud_category_name">${this.escapeHtml(categoryName)}</div>
            ${infoText ? `<div class="oc_catego_crud_category_info">${infoText}</div>` : ''}
        `;

        // Show actions
        actionsDiv.style.display = 'flex';
    },

    // Cancel edit
    cancelEdit(buttonElement, categoryId, originalName) {
        const categoryItem = document.querySelector(`[data-id="${categoryId}"]`);
        const contentDiv = categoryItem.querySelector('.oc_catego_crud_category_content');
        const actionsDiv = categoryItem.querySelector('.oc_catego_crud_category_actions');

        // Restore original content
        contentDiv.innerHTML = `
            <div class="oc_catego_crud_category_name">${this.escapeHtml(originalName)}</div>
        `;

        // Show actions
        actionsDiv.style.display = 'flex';
    },

    /* region: Delete Category */

    confirmDelete(buttonElement, categoryId, categoryName) {
        schConfirmBorrar(
            '¿Está seguro de <b>borrar</b> la categoría: <b>' + categoryName + '</b>?',
             'Confirme Eliminar la Categoría'
        ).then(confirmed => {
            if (confirmed) {
                this.deleteCategory(buttonElement, categoryId, categoryName)
                    .catch(error => {
                        // Show feedback if deletion fails
                        //this.showError('No se pudo eliminar la categoría. Está en uso o ocurrió un error.');
                        console.error('Error deleting category:', error);
                    });
            }
        });
    },

    // Delete category (remove single row)
    async deleteCategory(buttonElement, categoryId, categoryName) {
        const widget = this.getWidgetFromEvent(buttonElement);
        const state = this.getState(widget);

        try {
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('category_type', state.categoryType);
            formData.append('oc_category_id', categoryId);

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {


                // Remove from local data
                const categories = state.categories.filter(cat => cat.oc_category_id != categoryId);
                this.setCategories(widget, categories);

                // Remove the row from DOM (no full reload)
                const categoryItem = document.querySelector(`[data-id="${categoryId}"]`);
                if (categoryItem) {
                    categoryItem.remove();
                }

                // Check if list is now empty
                const listElement = document.getElementById('oc_catego_crud_list');
                if (listElement.children.length === 0) {
                    const searchTerm = document.getElementById('oc_catego_crud_search').value.toLowerCase();
                    listElement.innerHTML = `
                        <div class="oc_catego_crud_empty_message">
                            ${searchTerm ? 'No se encontraron categorías que coincidan con la búsqueda' : 'No hay categorías registradas'}
                        </div>
                    `;
                }
                this.showError("");
                this.updateWidgetFromCRUD(widget);
                console.log('🗑️ Category deleted:', categoryId);

            } else {
                this.showError(widget, result.error || 'Error al eliminar la categoría: ' + categoryName);
            }
        } catch (error) {
            this.showError(widget, 'Error de conexión al eliminar la categoría: ' + categoryName);
            console.error('Error deleting category:', error);
        }
    },

    /* endregion: Delete Category */

    // Add new category
    addCategory(buttonElement) {
        const widget = this.getWidgetFromEvent(buttonElement);
        const state = this.getState(widget);
        this.showInputDialog(widget);
    },

    // Show input dialog for new category
    showInputDialog(widget) {
        const state = this.getState(widget);
        const inputDialog = document.getElementById('oc_catego_crud_input_dialog');
        const titleElement = document.getElementById('oc_catego_crud_input_title');
        const input = document.getElementById('oc_catego_crud_input_dialog_input');
        const saveBtn = document.getElementById('oc_catego_crud_input_save_btn');

        titleElement.textContent = `Nueva ${state.title.slice(0, -1)}`; // Remove 's' from plural
        input.value = '';
        this.hideInputError();

        saveBtn.onclick = () => this.saveNewCategory(widget);

        inputDialog.showModal();
        input.focus();
    },

    // Close input dialog
    closeInputDialog() {
        const inputDialog = document.getElementById('oc_catego_crud_input_dialog');
        inputDialog.close();
    },

    // Clear input dialog
    clearInputDialog() {
        const input = document.getElementById('oc_catego_crud_input_dialog_input');
        input.value = '';
        input.focus();
    },

    // Save new category (add to list without reload)
    async saveNewCategory(widget) {
        const state = this.getState(widget);
        const input = document.getElementById('oc_catego_crud_input_dialog_input');
        const categoryName = input.value.trim();

        if (!categoryName) {
            this.showInputError('El nombre de la categoría no puede estar vacío');
            input.focus();
            return;
        }

        try {
            const formData = new FormData();
            formData.append('action', 'upsert');
            formData.append('category_type', state.categoryType);
            formData.append('category', categoryName);

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Add to local data
                const newCategory = {
                    oc_category_id: result.data.oc_category_id,
                    category: categoryName,
                    category_data: result.data.category_data || {},
                    alta_db: new Date().toISOString().slice(0, 19).replace('T', ' ')
                };

                const categories = [...state.categories, newCategory];
                this.setCategories(widget, categories);

                this.closeInputDialog();

                // Re-render with new category (maintains search filter)
                this.renderFilteredCategories(widget);
                this.updateWidgetFromCRUD(widget);
                console.log('✅ New category created:', categoryName);

            } else {
                this.showInputError(result.error || 'Error al crear la categoría');
                input.focus();
            }
        } catch (error) {
            this.showInputError('Error de conexión al crear la categoría');
            input.focus();
            console.error('Error creating category:', error);
        }
    },

    showValidationDialog(message) {
        // Create a temporary validation dialog
        const validationDialog = document.createElement('dialog');
        validationDialog.className = 'sch_dialog sch_dialog--small';
        validationDialog.innerHTML = `
            <div class="sch_dialog_header">
                <h2 class="sch_dialog_title">Error de validación</h2>
                <button class="sch_dialog_close" onclick="this.closest('dialog').close(); this.closest('dialog').remove();">&times;</button>
            </div>
            <div class="sch_dialog_content">
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; color: var(--color-warning); margin-bottom: 16px;">⚠️</div>
                    <div style="font-size: 16px; color: var(--color-text);">${this.escapeHtml(message)}</div>
                </div>
            </div>
            <div class="sch_dialog_footer">
                <button class="sch_dialog_button sch_dialog_button--primary" onclick="this.closest('dialog').close(); this.closest('dialog').remove();">
                    Entendido
                </button>
            </div>
        `;

        document.body.appendChild(validationDialog);
        validationDialog.showModal();

        // Auto-remove after close
        validationDialog.addEventListener('close', () => {
            setTimeout(() => {
                if (validationDialog.parentNode) {
                    validationDialog.remove();
                }
            }, 100);
        });
    },

    // Error handling
    showError(widget, message) {
        const errorElement = document.getElementById('oc_catego_crud_error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    },

    hideError(widget) {
        const errorElement = document.getElementById('oc_catego_crud_error');
        errorElement.style.display = 'none';
    },

    showInputError(message) {
        const errorElement = document.getElementById('oc_catego_crud_input_error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    },

    hideInputError() {
        const errorElement = document.getElementById('oc_catego_crud_input_error');
        errorElement.style.display = 'none';
    },

    // Utility function to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Initialize the component
    init() {
        // Setup search functionality
        this.setupSearch();

        // Setup add button - Use event delegation to avoid widget parameter issue
        document.addEventListener('click', (e) => {
            if (e.target.id === 'oc_catego_crud_add_btn') {
                this.addCategory(e.target);
            }
        });

        // Setup Enter key for input dialog
        const inputDialogInput = document.getElementById('oc_catego_crud_input_dialog_input');
        if (inputDialogInput) {
            inputDialogInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    // Get widget from dialog context
                    const dialog = document.getElementById('oc_catego_crud_dialog');
                    const widgetId = dialog.dataset.widgetId;
                    const widget = document.getElementById(widgetId) ||
                        document.querySelector(`[data-oc_catego]`);
                    this.saveNewCategory(widget);
                }
            });

            // Setup Escape key for input dialog
            inputDialogInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeInputDialog();
                }
            });
        }

        console.log('✅ ocCategoCRUD.js: ocCategoCRUD.init(): initialized', this.version);
    }

};
