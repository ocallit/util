
/* File: catego_enhanced_properties.js */
/* Path: /catego/catego_enhanced_properties.js */
/* Version: 1.0.0 */


const ocCategoryPropertySystem = {
    
    // Property type definitions
    PROPERTY_TYPES: {
        INTERNAL: 'internal',    // Only in CRUD dialog
        DISPLAY: 'display',      // Read-only when setting categories
        INPUT: 'input',          // Editable when setting categories  
        BOTH: 'both'            // Display + input when setting categories
    },

    /**
     * External form function with property definitions
     * @param {Object} data - Category data from CRUD
     * @returns {Promise} - Resolves with form result or 'cancel'
     */
    async externalProductFormEnhanced(data) {
        return new Promise((resolve) => {
            const dialog = document.createElement('dialog');
            dialog.className = 'sch_dialog sch_dialog--medium';
            
            dialog.innerHTML = `
                <div class="sch_dialog_header">
                    <h2 class="sch_dialog_title">${data.oc_category_id ? 'Editar' : 'Nueva'} Categoría de Producto</h2>
                    <button class="sch_dialog_close" onclick="this.closest('dialog').close()" >&times;</button>
                </div>
                <div class="sch_dialog_content">
                    <form>
                        <!-- Basic category name -->
                        <div class="sch_form_group">
                            <label class="sch_form_label">Nombre de la Categoría *</label>
                            <input type="text" name="category" class="sch_form_input" 
                                   value="${data.category || ''}" required>
                        </div>

                        <!-- Stock properties with type definitions -->
                        <div class="sch_form_group">
                            <label class="sch_form_label">Stock Mínimo * (Tipo: input)</label>
                            <input type="number" name="stock_minimo" class="sch_form_input" 
                                   value="${data.stock_minimo || 10}" min="0" required
                                   data-property-type="input" 
                                   data-property-label="Stock Mínimo">
                        </div>

                        <div class="sch_form_group">
                            <label class="sch_form_label">Stock Máximo * (Tipo: display)</label>
                            <input type="number" name="stock_maximo" class="sch_form_input" 
                                   value="${data.stock_maximo || 1000}" min="1" required
                                   data-property-type="display" 
                                   data-property-label="Stock Máximo">
                        </div>

                        <div class="sch_form_group">
                            <label class="sch_form_label">Ubicación (Tipo: both)</label>
                            <input type="text" name="ubicacion" class="sch_form_input" 
                                   value="${data.ubicacion || ''}" placeholder="Ej: A-15"
                                   data-property-type="both" 
                                   data-property-label="Ubicación en Almacén">
                        </div>

                        <div class="sch_form_group">
                            <label class="sch_form_label">Proveedor (Tipo: internal)</label>
                            <input type="text" name="proveedor_interno" class="sch_form_input" 
                                   value="${data.proveedor_interno || ''}" placeholder="Solo en CRUD"
                                   data-property-type="internal">
                        </div>

                        <input type="hidden" name="category_type" value="${data.category_type}">
                        <input type="hidden" name="oc_category_id" value="${data.oc_category_id || ''}">
                    </form>
                </div>
                <div class="sch_dialog_footer">
                    <button class="sch_dialog_button sch_dialog_button--outline" onclick="resolveEnhancedDialog('cancel')">
                        Cancelar
                    </button>
                    <button class="sch_dialog_button sch_dialog_button--success" onclick="resolveEnhancedDialog('save')">
                        Guardar
                    </button>
                </div>
            `;

            document.body.appendChild(dialog);

            function resolveEnhancedDialog(action) {
                if (action === 'save') {
                    const form = dialog.querySelector('form');
                    const formData = new FormData(form);
                    
                    // Collect form data with property definitions
                    const result = {
                        _property_definitions: {} // Special field for property metadata
                    };
                    
                    for (let [key, value] of formData.entries()) {
                        if (value) result[key] = value;
                    }
                    
                    // Extract property definitions from form elements
                    const inputs = form.querySelectorAll('[data-property-type]');
                    inputs.forEach(input => {
                        const propName = input.name;
                        const propType = input.dataset.propertyType;
                        const propLabel = input.dataset.propertyLabel || propName;
                        
                        if (propName !== 'category') { // Skip basic category field
                            result._property_definitions[propName] = {
                                type: propType,
                                label: propLabel,
                                value: input.value || ''
                            };
                        }
                    });

                    console.log('📋 Enhanced form result:', result);
                    
                    dialog.close();
                    dialog.remove();
                    resolve(result);
                } else {
                    dialog.close();
                    dialog.remove();
                    resolve('cancel');
                }
            }

            window.resolveEnhancedDialog = resolveEnhancedDialog;
            dialog.showModal();
            dialog.querySelector('input[name="category"]').focus();

            dialog.addEventListener('close', () => {
                setTimeout(() => {
                    if (dialog.parentNode) dialog.remove();
                    delete window.resolveEnhancedDialog;
                }, 100);
            });
        });
    },

    /**
     * Enhanced widget rendering with property display/input
     * Extends the existing ocWidgetCatego.createCategoryItem method
     */
    enhanceWidgetRendering() {
        // Store original method
        const originalCreateCategoryItem = ocWidgetCatego.createCategoryItem;
        
        // Override with enhanced version
        ocWidgetCatego.createCategoryItem = function(id, label, isSelected = false, categoryData = null) {
            const categoryItem = originalCreateCategoryItem.call(this, id, label, isSelected);
            
            // Add enhanced property display/input if categoryData exists
            if (categoryData && categoryData._property_definitions) {
                ocCategoryPropertySystem.addPropertyFields(categoryItem, categoryData._property_definitions, id);
            }
            
            return categoryItem;
        };
    },

    /**
     * Add property fields to category item
     * @param {HTMLElement} categoryItem - The category item element
     * @param {Object} propertyDefinitions - Property definitions from category data
     * @param {string} categoryId - Category ID for unique field names
     */
    addPropertyFields(categoryItem, propertyDefinitions, categoryId) {
        const propertyContainer = document.createElement('div');
        propertyContainer.className = 'oc_catego_property_container';
        
        Object.entries(propertyDefinitions).forEach(([propName, propDef]) => {
            if (propDef.type === 'internal') return; // Skip internal properties
            
            const propElement = this.createPropertyElement(propName, propDef, categoryId);
            if (propElement) {
                propertyContainer.appendChild(propElement);
            }
        });
        
        if (propertyContainer.children.length > 0) {
            categoryItem.appendChild(propertyContainer);
        }
    },

    /**
     * Create property element based on type
     * @param {string} propName - Property name
     * @param {Object} propDef - Property definition
     * @param {string} categoryId - Category ID for unique field names
     * @returns {HTMLElement|null} - Property element or null
     */
    createPropertyElement(propName, propDef, categoryId) {
        const { type, label, value } = propDef;
        const uniqueId = `${propName}_${categoryId}`;
        
        switch (type) {
            case 'display':
                return this.createDisplayProperty(label, value);
                
            case 'input':
                return this.createInputProperty(propName, label, value, uniqueId);
                
            case 'both':
                return this.createBothProperty(propName, label, value, uniqueId);
                
            default:
                return null;
        }
    },

    /**
     * Create read-only display property
     */
    createDisplayProperty(label, value) {
        const div = document.createElement('div');
        div.className = 'oc_catego_property oc_catego_property--display';
        div.innerHTML = `
            <span class="oc_catego_property_label">${this.escapeHtml(label)}:</span>
            <span class="oc_catego_property_value">${this.escapeHtml(value)}</span>
        `;
        return div;
    },

    /**
     * Create editable input property
     */
    createInputProperty(propName, label, value, uniqueId) {
        const div = document.createElement('div');
        div.className = 'oc_catego_property oc_catego_property--input';
        div.innerHTML = `
            <label class="oc_catego_property_label" for="${uniqueId}">${this.escapeHtml(label)}:</label>
            <input type="text" 
                   id="${uniqueId}" 
                   name="${propName}" 
                   class="oc_catego_property_input"
                   value="${this.escapeHtml(value)}"
                   placeholder="Ingrese ${this.escapeHtml(label.toLowerCase())}">
        `;
        return div;
    },

    /**
     * Create both display and input property
     */
    createBothProperty(propName, label, value, uniqueId) {
        const div = document.createElement('div');
        div.className = 'oc_catego_property oc_catego_property--both';
        div.innerHTML = `
            <div class="oc_catego_property_display">
                <span class="oc_catego_property_label">${this.escapeHtml(label)}:</span>
                <span class="oc_catego_property_value">${this.escapeHtml(value)}</span>
            </div>
            <div class="oc_catego_property_input_container">
                <label class="oc_catego_property_label" for="${uniqueId}">Nuevo ${this.escapeHtml(label)}:</label>
                <input type="text" 
                       id="${uniqueId}" 
                       name="${propName}" 
                       class="oc_catego_property_input"
                       value="${this.escapeHtml(value)}"
                       placeholder="Cambiar ${this.escapeHtml(label.toLowerCase())}">
            </div>
        `;
        return div;
    },

    /**
     * Get all property values from widget
     * @param {HTMLElement} widget - oc_catego element
     * @returns {Object} - Object with property values by category ID
     */
    getPropertyValues(widget) {
        const propertyValues = {};
        
        // Get all category items
        const categoryItems = widget.querySelectorAll('.oc_catego_item');
        
        categoryItems.forEach(item => {
            const categoryId = item.dataset.categoryId;
            const inputs = item.querySelectorAll('.oc_catego_property_input');
            
            if (inputs.length > 0) {
                propertyValues[categoryId] = {};
                inputs.forEach(input => {
                    if (input.value.trim()) {
                        propertyValues[categoryId][input.name] = input.value.trim();
                    }
                });
            }
        });
        
        return propertyValues;
    },

    /**
     * Utility function to escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Initialize the enhanced property system
     */
    init() {
        this.enhanceWidgetRendering();
        console.log('✅ Enhanced Category Property System initialized');
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ocCategoryPropertySystem.init());
} else {
    ocCategoryPropertySystem.init();
}

// Example usage in external form registration:
window.externalProductFormEnhanced = ocCategoryPropertySystem.externalProductFormEnhanced;

console.log("___________catego_enhanced_properties" +
    " installed");