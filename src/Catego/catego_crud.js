

const ocCategoCRUD = {
            // API endpoint
            apiUrl: 'catego/ajax.php',
            
            // Current state (no persistent properties to allow multiple instances)
            getCurrentState() {
                const dialog = document.getElementById('oc_catego_crud_dialog');
                return {
                    categoryType: dialog.dataset.categoryType || '',
                    title: dialog.dataset.title || '',
                    formFunction: dialog.dataset.form || '',
                    categories: JSON.parse(dialog.dataset.categories || '[]'),
                    isLoading: dialog.dataset.loading === 'true'
                };
            },

            // Set categories data
            setCategories(categories) {
                const dialog = document.getElementById('oc_catego_crud_dialog');
                dialog.dataset.categories = JSON.stringify(categories);
            },

            // Set loading state
            setLoading(loading) {
                const dialog = document.getElementById('oc_catego_crud_dialog');
                dialog.dataset.loading = loading.toString();
            },

            // Open the main administration dialog
            openDialog(categoryType, title, formFunction = '') {
                const dialog = document.getElementById('oc_catego_crud_dialog');
                const titleElement = document.getElementById('oc_catego_crud_title');
                
                // Set dialog properties
                dialog.dataset.categoryType = categoryType;
                dialog.dataset.title = title;
                dialog.dataset.form = formFunction;
                dialog.dataset.categories = '[]';
                dialog.dataset.loading = 'false';
                
                titleElement.textContent = `Categorias para: ${title}`;
                
                // Clear search and error
                this.clearSearch();
                this.hideError();
                
                // Load categories only once
                this.loadCategories();
                
                dialog.showModal();
            },

            // Close the main dialog
            closeDialog() {
                const dialog = document.getElementById('oc_catego_crud_dialog');
                dialog.close();
            },

            // Load categories from server (only called once)
            async loadCategories() {
                const state = this.getCurrentState();
                
                // Prevent double loading
                if (state.isLoading) {
                    return;
                }
                
                this.setLoading(true);
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
                        this.setCategories(result.data);
                        this.renderFilteredCategories();
                    } else {
                        this.showError(result.error || 'Error al cargar las categorías');
                    }
                } catch (error) {
                    this.showError('Error de conexión al cargar las categorías');
                } finally {
                    this.setLoading(false);
                }
            },

            // Local search and render (no server call)
            renderFilteredCategories() {
                const state = this.getCurrentState();
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
                    this.renderCategoryItem(category)
                ).join('');
            },

            // Render individual category item
            renderCategoryItem(category) {
                const infoText = this.getCategoryInfo(category);
                
                return `
                    <div class="oc_catego_crud_category_item" data-id="${category.oc_category_id}">
                        <div class="oc_catego_crud_category_content">
                            <div class="oc_catego_crud_category_name">${this.escapeHtml(category.category)}</div>
                            ${infoText ? `<div class="oc_catego_crud_category_info">${infoText}</div>` : ''}
                        </div>
                        <div class="oc_catego_crud_category_actions">
                            <button class="oc_catego_crud_btn oc_catego_crud_btn_edit" 
                                    onclick="ocCategoCRUD.editCategory(${category.oc_category_id}, '${this.escapeHtml(category.category)}')">
                                Editar
                            </button>
                            <button class="oc_catego_crud_btn oc_catego_crud_btn_delete" 
                                    onclick="ocCategoCRUD.confirmDelete(${category.oc_category_id}, '${this.escapeHtml(category.category)}')">
                                Eliminar
                            </button>
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

            // Search functionality (local only)
            setupSearch() {
                const searchInput = document.getElementById('oc_catego_crud_search');
                let searchTimeout;
                
                searchInput.addEventListener('input', () => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.renderFilteredCategories(); // Local search only
                    }, 100); // Faster response for local search
                });
            },

            // Clear search
            clearSearch() {
                document.getElementById('oc_catego_crud_search').value = '';
                this.renderFilteredCategories();
            },

            // Edit category inline or with external form
            editCategory(categoryId, currentName) {
                const state = this.getCurrentState();
                
                if (state.formFunction && typeof window[state.formFunction] === 'function') {
                    // Get category data and open external form
                    const category = state.categories.find(cat => cat.oc_category_id == categoryId);
                    if (category) {
                        this.openExternalForm(category);
                    }
                } else {
                    // Use inline editing
                    this.editCategoryInline(categoryId, currentName);
                }
            },

            // Inline editing (original method)
            editCategoryInline(categoryId, currentName) {
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
                                   onkeypress="if(event.key==='Enter') ocCategoCRUD.saveInlineCategory(${categoryId})"
                                   onkeydown="if(event.key==='Escape') ocCategoCRUD.cancelEdit(${categoryId}, '${this.escapeHtml(currentName)}')">
                            <button class="oc_catego_crud_input_clear" onclick="this.previousElementSibling.value=''">&times;</button>
                        </div>
                        <div class="oc_catego_crud_edit_actions">
                            <button class="oc_catego_crud_btn oc_catego_crud_btn_save" 
                                    onclick="ocCategoCRUD.saveInlineCategory(${categoryId})">
                                Guardar
                            </button>
                            <button class="oc_catego_crud_btn oc_catego_crud_btn_cancel" 
                                    onclick="ocCategoCRUD.cancelEdit(${categoryId}, '${this.escapeHtml(currentName)}')">
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

            // Save inline category changes (renamed from saveCategory)
            async saveInlineCategory(categoryId) {
                const categoryItem = document.querySelector(`[data-id="${categoryId}"]`);
                const input = categoryItem.querySelector('.oc_catego_crud_edit_input');
                const newName = input.value.trim();
                
                if (!newName) {
                    this.showValidationDialog('El nombre de la categoría no puede estar vacío');
                    input.focus();
                    return;
                }
                
                const state = this.getCurrentState();
                
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
                            this.setCategories(categories);
                        }
                        
                        // Update only this row (no full reload)
                        this.updateCategoryRow(categoryId, newName);
                        
                    } else {
                        this.showError(result.error || 'Error al guardar la categoría');
                        input.focus();
                    }
                } catch (error) {
                    this.showError('Error de conexión al guardar la categoría');
                    input.focus();
                }
            },

            // Update single category row after save
            updateCategoryRow(categoryId, categoryName) {
                const state = this.getCurrentState();
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
            cancelEdit(categoryId, originalName) {
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

            // Confirm delete
            confirmDelete(categoryId, categoryName) {
                const confirmDialog = document.getElementById('oc_catego_crud_confirm_dialog');
                const categoryElement = document.getElementById('oc_catego_crud_confirm_category');
                const deleteBtn = document.getElementById('oc_catego_crud_confirm_delete_btn');
                
                categoryElement.textContent = categoryName;
                
                deleteBtn.onclick = () => this.deleteCategory(categoryId);
                
                confirmDialog.showModal();
            },

            // Close confirmation dialog
            closeConfirmDialog() {
                const confirmDialog = document.getElementById('oc_catego_crud_confirm_dialog');
                confirmDialog.close();
            },

            // Delete category (remove single row)
            async deleteCategory(categoryId) {
                const state = this.getCurrentState();
                
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
                        this.closeConfirmDialog();
                        
                        // Remove from local data
                        const categories = state.categories.filter(cat => cat.oc_category_id != categoryId);
                        this.setCategories(categories);
                        
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
                        
                    } else {
                        this.showError(result.error || 'Error al eliminar la categoría');
                    }
                } catch (error) {
                    this.showError('Error de conexión al eliminar la categoría');
                }
            },

            // Add new category (method 2: external dialog)
            addCategory() {
                const state = this.getCurrentState();
                
                if (state.formFunction && typeof window[state.formFunction] === 'function') {
                    // Call external dialog function
                    this.openExternalForm(null);
                } else {
                    // Show simple input dialog
                    this.showInputDialog();
                }
            },

            // Open external form dialog
            async openExternalForm(categoryData) {
                const state = this.getCurrentState();
                
                try {
                    // Prepare data for external form
                    const formData = {
                        category_type: state.categoryType,
                        oc_category_id: categoryData ? categoryData.oc_category_id : null,
                        category: categoryData ? categoryData.category : '',
                        ...(categoryData ? categoryData.category_data || {} : {})
                    };
                    
                    // Call external form function
                    const result = await window[state.formFunction](formData);
                    
                    if (result && result !== 'cancel') {
                        // Validate required fields
                        if (!result.category_type || !result.category || result.category.trim() === '') {
                            this.showValidationDialog('El formulario debe retornar category_type, category y oc_category_id');
                            return;
                        }
                        
                        // Save the data
                        await this.saveExternalFormData(result);
                    }
                    // If result is 'cancel' or null, do nothing
                    
                } catch (error) {
                    console.error('Error with external form:', error);
                    this.showError('Error al procesar el formulario personalizado');
                }
            },

            // Save data from external form
            async saveExternalFormData(formResult) {
                const state = this.getCurrentState();
                
                try {
                    // Prepare form data for server
                    const serverFormData = new FormData();
                    serverFormData.append('action', 'upsert');
                    serverFormData.append('category_type', formResult.category_type);
                    serverFormData.append('category', formResult.category.trim());
                    
                    if (formResult.oc_category_id) {
                        serverFormData.append('oc_category_id', formResult.oc_category_id);
                    }
                    
                    // Add all other fields as category_data
                    const reservedFields = ['category_type', 'oc_category_id', 'category'];
                    for (const [key, value] of Object.entries(formResult)) {
                        if (!reservedFields.includes(key) && value !== null && value !== undefined && value !== '') {
                            serverFormData.append(key, value);
                        }
                    }
                    
                    const response = await fetch(this.apiUrl, {
                        method: 'POST',
                        body: serverFormData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        if (formResult.oc_category_id) {
                            // Update existing category
                            this.updateCategoryInLocalData(formResult);
                            this.updateCategoryRow(formResult.oc_category_id, formResult.category);
                        } else {
                            // Add new category
                            const newCategory = {
                                oc_category_id: result.data.oc_category_id,
                                category: formResult.category,
                                category_data: this.extractCategoryData(formResult),
                                alta_db: new Date().toISOString().slice(0, 19).replace('T', ' ')
                            };
                            
                            const categories = [...state.categories, newCategory];
                            this.setCategories(categories);
                            this.renderFilteredCategories();
                        }
                    } else {
                        this.showError(result.error || 'Error al guardar la categoría');
                    }
                } catch (error) {
                    this.showError('Error de conexión al guardar la categoría');
                }
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
            updateCategoryInLocalData(formResult) {
                const state = this.getCurrentState();
                const categories = state.categories;
                const categoryIndex = categories.findIndex(cat => cat.oc_category_id == formResult.oc_category_id);
                
                if (categoryIndex !== -1) {
                    categories[categoryIndex].category = formResult.category;
                    categories[categoryIndex].category_data = this.extractCategoryData(formResult);
                    this.setCategories(categories);
                }
            },

            // Show enhanced input dialog with custom fields
            showEnhancedInputDialog(formConfig) {
                const state = this.getCurrentState();
                
                // Create enhanced dialog
                const enhancedDialog = document.createElement('dialog');
                enhancedDialog.id = 'oc_catego_crud_enhanced_dialog';
                enhancedDialog.className = 'sch_dialog sch_dialog--medium oc_catego_crud_enhanced_dialog';
                
                // Build form fields HTML
                let fieldsHTML = `
                    <!-- Standard category name field -->
                    <div class="sch_form_group">
                        <label class="sch_form_label" for="oc_catego_enhanced_category">Nombre de la Categoría *</label>
                        <div class="oc_catego_crud_input_container">
                            <input type="text" 
                                   id="oc_catego_enhanced_category"
                                   name="category"
                                   class="sch_form_input" 
                                   placeholder="Nombre de la categoría..."
                                   required>
                            <button type="button" class="oc_catego_crud_input_clear" onclick="this.previousElementSibling.value=''">&times;</button>
                        </div>
                    </div>
                `;
                
                // Add custom fields
                formConfig.fields.forEach((field, index) => {
                    fieldsHTML += this.generateFieldHTML(field, index);
                });
                
                enhancedDialog.innerHTML = `
                    <div class="sch_dialog_header">
                        <h2 class="sch_dialog_title">Nueva ${state.title.slice(0, -1)}</h2>
                        <button class="sch_dialog_close" onclick="ocCategoCRUD.closeEnhancedDialog()">&times;</button>
                    </div>
                    <div class="sch_dialog_content">
                        <form id="oc_catego_enhanced_form">
                            ${fieldsHTML}
                            
                            <div id="oc_catego_enhanced_error" class="oc_catego_crud_error" style="display: none;"></div>
                        </form>
                    </div>
                    <div class="sch_dialog_footer">
                        <button class="sch_dialog_button sch_dialog_button--outline" onclick="ocCategoCRUD.closeEnhancedDialog()">
                            Cancelar
                        </button>
                        <button id="oc_catego_enhanced_save_btn" class="sch_dialog_button sch_dialog_button--success">
                            Guardar
                        </button>
                    </div>
                `;
                
                document.body.appendChild(enhancedDialog);
                
                // Setup event handlers
                const saveBtn = enhancedDialog.querySelector('#oc_catego_enhanced_save_btn');
                saveBtn.onclick = () => this.saveEnhancedCategory(formConfig);
                
                // Setup Enter key submission
                const form = enhancedDialog.querySelector('#oc_catego_enhanced_form');
                form.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        this.saveEnhancedCategory(formConfig);
                    }
                });
                
                // Setup Escape key
                enhancedDialog.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.closeEnhancedDialog();
                    }
                });
                
                enhancedDialog.showModal();
                
                // Focus first input
                const firstInput = enhancedDialog.querySelector('input, select, textarea');
                if (firstInput) firstInput.focus();
            },

            // Generate HTML for a custom field
            generateFieldHTML(field, index) {
                const fieldId = `oc_catego_enhanced_field_${index}`;
                const required = field.required ? 'required' : '';
                const requiredMark = field.required ? ' *' : '';
                
                let inputHTML = '';
                
                switch (field.type) {
                    case 'number':
                        inputHTML = `
                            <input type="number" 
                                   id="${fieldId}"
                                   name="${field.name}"
                                   class="sch_form_input" 
                                   placeholder="${field.placeholder || ''}"
                                   value="${field.value || ''}"
                                   min="${field.min || ''}"
                                   max="${field.max || ''}"
                                   step="${field.step || ''}"
                                   ${required}>
                        `;
                        break;
                        
                    case 'textarea':
                        inputHTML = `
                            <textarea id="${fieldId}"
                                     name="${field.name}"
                                     class="sch_form_input sch_form_textarea" 
                                     placeholder="${field.placeholder || ''}"
                                     ${required}>${field.value || ''}</textarea>
                        `;
                        break;
                        
                    case 'select':
                        let optionsHTML = '';
                        if (Array.isArray(field.options)) {
                            // Simple array of strings
                            optionsHTML = field.options.map(opt => 
                                `<option value="${this.escapeHtml(opt)}">${this.escapeHtml(opt)}</option>`
                            ).join('');
                        } else if (field.options && typeof field.options === 'object') {
                            // Array of objects with value/text
                            optionsHTML = field.options.map(opt => 
                                `<option value="${this.escapeHtml(opt.value || opt)}" ${opt.value === field.value ? 'selected' : ''}>
                                    ${this.escapeHtml(opt.text || opt.value || opt)}
                                </option>`
                            ).join('');
                        }
                        
                        inputHTML = `
                            <select id="${fieldId}"
                                   name="${field.name}"
                                   class="sch_form_input" 
                                   ${required}>
                                <option value="">Seleccionar...</option>
                                ${optionsHTML}
                            </select>
                        `;
                        break;
                        
                    case 'text':
                    default:
                        inputHTML = `
                            <div class="oc_catego_crud_input_container">
                                <input type="text" 
                                       id="${fieldId}"
                                       name="${field.name}"
                                       class="sch_form_input" 
                                       placeholder="${field.placeholder || ''}"
                                       value="${field.value || ''}"
                                       ${required}>
                                <button type="button" class="oc_catego_crud_input_clear" onclick="this.previousElementSibling.value=''">&times;</button>
                            </div>
                        `;
                        break;
                }
                
                return `
                    <div class="sch_form_group">
                        <label class="sch_form_label" for="${fieldId}">${this.escapeHtml(field.label)}${requiredMark}</label>
                        ${inputHTML}
                    </div>
                `;
            },

            // Save enhanced category with custom fields
            async saveEnhancedCategory(formConfig) {
                const form = document.getElementById('oc_catego_enhanced_form');
                const formData = new FormData(form);
                const categoryName = formData.get('category');
                
                if (!categoryName || !categoryName.trim()) {
                    this.showEnhancedError('El nombre de la categoría es requerido');
                    return;
                }
                
                // Collect all form data
                const allData = {};
                for (let [key, value] of formData.entries()) {
                    allData[key] = value;
                }
                
                // Custom validation if provided
                if (formConfig.validate && typeof formConfig.validate === 'function') {
                    const validationError = formConfig.validate(allData);
                    if (validationError) {
                        this.showEnhancedError(validationError);
                        return;
                    }
                }
                
                const state = this.getCurrentState();
                
                try {
                    // Prepare form data for server
                    const serverFormData = new FormData();
                    serverFormData.append('action', 'upsert');
                    serverFormData.append('category_type', state.categoryType);
                    serverFormData.append('category', categoryName.trim());
                    
                    // Add custom fields to category_data
                    const customData = {};
                    for (let [key, value] of formData.entries()) {
                        if (key !== 'category' && value) {
                            customData[key] = value;
                        }
                    }
                    
                    // Add custom data as individual fields (will be collected by backend)
                    for (let [key, value] of Object.entries(customData)) {
                        serverFormData.append(key, value);
                    }
                    
                    const response = await fetch(this.apiUrl, {
                        method: 'POST',
                        body: serverFormData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Get display info from form config
                        let displayName = categoryName;
                        let displayInfo = '';
                        
                        if (formConfig.getDisplayName && typeof formConfig.getDisplayName === 'function') {
                            displayName = formConfig.getDisplayName(allData);
                        } else if (formConfig.displayName) {
                            displayName = this.interpolateTemplate(formConfig.displayName, allData);
                        }
                        
                        if (formConfig.getDisplayInfo && typeof formConfig.getDisplayInfo === 'function') {
                            displayInfo = formConfig.getDisplayInfo(allData);
                        } else if (formConfig.displayInfo) {
                            displayInfo = this.interpolateTemplate(formConfig.displayInfo, allData);
                        }
                        
                        // Add to local data
                        const newCategory = {
                            oc_category_id: result.data.oc_category_id,
                            category: displayName,
                            category_data: customData,
                            alta_db: new Date().toISOString().slice(0, 19).replace('T', ' ')
                        };
                        
                        const categories = [...state.categories, newCategory];
                        this.setCategories(categories);
                        
                        this.closeEnhancedDialog();
                        this.renderFilteredCategories();
                        
                    } else {
                        this.showEnhancedError(result.error || 'Error al crear la categoría');
                    }
                } catch (error) {
                    this.showEnhancedError('Error de conexión al crear la categoría');
                }
            },

            // Interpolate template strings like "{{categoryName}} (Max: {{maximo}})"
            interpolateTemplate(template, data) {
                return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                    return data[key] || match;
                });
            },

            // Close enhanced dialog
            closeEnhancedDialog() {
                const enhancedDialog = document.getElementById('oc_catego_crud_enhanced_dialog');
                if (enhancedDialog) {
                    enhancedDialog.close();
                    enhancedDialog.remove();
                }
            },

            // Show error in enhanced dialog
            showEnhancedError(message) {
                const errorElement = document.getElementById('oc_catego_enhanced_error');
                if (errorElement) {
                    errorElement.textContent = message;
                    errorElement.style.display = 'block';
                }
            },

            // Show input dialog for new category
            showInputDialog() {
                const state = this.getCurrentState();
                const inputDialog = document.getElementById('oc_catego_crud_input_dialog');
                const titleElement = document.getElementById('oc_catego_crud_input_title');
                const input = document.getElementById('oc_catego_crud_input_dialog_input');
                const saveBtn = document.getElementById('oc_catego_crud_input_save_btn');
                
                titleElement.textContent = `Nueva ${state.title.slice(0, -1)}`; // Remove 's' from plural
                input.value = '';
                this.hideInputError();
                
                saveBtn.onclick = () => this.saveNewCategory();
                
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
            async saveNewCategory() {
                const state = this.getCurrentState();
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
                        // Call custom form function if exists
                        if (state.formFunction && typeof window[state.formFunction] === 'function') {
                            try {
                                await window[state.formFunction](state.categoryType, result.data.oc_category_id, categoryName);
                            } catch (error) {
                                console.warn('Error calling custom form function:', error);
                            }
                        }
                        
                        // Add to local data
                        const newCategory = {
                            oc_category_id: result.data.oc_category_id,
                            category: categoryName,
                            category_data: result.data.category_data || {},
                            alta_db: new Date().toISOString().slice(0, 19).replace('T', ' ')
                        };
                        
                        const categories = [...state.categories, newCategory];
                        this.setCategories(categories);
                        
                        this.closeInputDialog();
                        
                        // Re-render with new category (maintains search filter)
                        this.renderFilteredCategories();
                        
                    } else {
                        this.showInputError(result.error || 'Error al crear la categoría');
                        input.focus();
                    }
                } catch (error) {
                    this.showInputError('Error de conexión al crear la categoría');
                    input.focus();
                }
            },

            // Show validation dialog instead of alert
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
            showError(message) {
                const errorElement = document.getElementById('oc_catego_crud_error');
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            },

            hideError() {
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
                
                // Setup add button
                const addBtn = document.getElementById('oc_catego_crud_add_btn');
                addBtn.addEventListener('click', () => this.addCategory());
                
                // Setup Enter key for input dialog
                const inputDialogInput = document.getElementById('oc_catego_crud_input_dialog_input');
                inputDialogInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.saveNewCategory();
                    }
                });
                
                // Setup Escape key for input dialog
                inputDialogInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.closeInputDialog();
                    }
                });
                

            }
        };

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',() => ocCategoCRUD.init);
} else {
    ocCategoCRUD.init();
}
