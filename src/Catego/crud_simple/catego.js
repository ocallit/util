/**
    ocWidgetCatego
    File: /catego/catego.js
    Version: 1.2.0
*/

const ocWidgetCatego = {
// Permission checking methods
    getPermissions(widget) {
        return {
            crud: (widget.dataset.oc_catego_permissions_crud || 'true').toLowerCase().trim() === 'true',
            assign: (widget.dataset.oc_catego_permissions_assign || 'R/O').toUpperCase().trim(), // 'R/O', 'Add', 'R/W'
        };
    },

    isReadOnly(widget) {
        const permissions = this.getPermissions(widget);
        return permissions.assign === 'R/O';
    },

    canAddCategories(widget) {
        const permissions = this.getPermissions(widget);
        return permissions.assign === 'ADD' || permissions.assign === 'R/W';
    },

    canRemoveAllCategories(widget) {
        const permissions = this.getPermissions(widget);
        return permissions.assign === 'R/W';
    },

    canRemoveCategory(widget, categoryItem) {
        const permissions = this.getPermissions(widget);
        if (permissions.assign === 'R/W') return true;
        if (permissions.assign !== 'Add') return false;

        // For 'Add' permission, check if category was added today
        const addedDate = categoryItem.dataset.oc_catego_added_date;
        if (!addedDate) return false;

        const today = new Date().toISOString().split('T')[0];
        return addedDate === today;
    },

// Update the init method to apply permissions
    init(widget) {
        if (!widget) return false;
        if (widget.dataset.oc_catego_Init === "1") return false;

        this.removeListeners(widget);
        this.addListeners(widget);

        // Apply permissions before initializing
        this.applyPermissions(widget);

        // Initialize SortableJS for drag and drop (if not read-only)
        if (!this.isReadOnly(widget)) {
            this.initializeSortable(widget);
        }

        // Initialize widget from linked select (if exists)
        this.initializeFromLinkedSelect(widget);

        this.updateCounters(widget);
        this.updateMoveAllButtons(widget);

        widget.dataset.oc_catego_Init = "1";
        return true;
    },

// Apply permissions to widget UI
    applyPermissions(widget) {
        const permissions = this.getPermissions(widget);
console.log("________ permissions", permissions)
        // Hide/disable CRUD button
        const crudButton = widget.querySelector('.oc_catego_crud-button');
        if (crudButton) {
            if (!permissions.crud) {
                crudButton.style.display = 'none';
            }
        }

        // Apply assignment permissions
        if (permissions.assign === 'R/O') {
            this.makeReadOnly(widget);
        } else {
            this.updateMoveButtons(widget);
        }
    },

// Make widget read-only
    makeReadOnly(widget) {
        widget.classList.add('oc_catego--readonly');

        // Disable all arrow buttons
        const arrowButtons = widget.querySelectorAll('.oc_catego_arrow-button');
        arrowButtons.forEach(button => {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
        });

        // Disable move-all buttons
        const moveAllButtons = widget.querySelectorAll('.oc_catego_move-all-button');
        moveAllButtons.forEach(button => {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
        });

        // Disable drag handles
        const dragHandles = widget.querySelectorAll('.oc_catego_drag-handle');
        dragHandles.forEach(handle => {
            handle.style.opacity = '0.5';
            handle.style.cursor = 'not-allowed';
        });
    },

// Update move buttons based on permissions
    updateMoveButtons(widget) {
        const permissions = this.getPermissions(widget);

        if (permissions.assign === 'Add') {
            // For 'aAdd' permission, update individual remove buttons
            const selectedItems = widget.querySelectorAll('.oc_catego_si .oc_catego_item');
            selectedItems.forEach(item => {
                const button = item.querySelector('.oc_catego_arrow-button');
                if (button && !this.canRemoveCategory(widget, item)) {
                    button.disabled = true;
                    button.style.opacity = '0.5';
                    button.style.cursor = 'not-allowed';
                    button.title = 'Solo se pueden remover categorías agregadas hoy';
                }
            });

            // Disable "Remove All" button for 'Add' permission
            const removeAllButton = widget.querySelector('.oc_catego_column--selected .oc_catego_move-all-button');
            if (removeAllButton) {
                removeAllButton.disabled = true;
                removeAllButton.style.opacity = '0.5';
                removeAllButton.title = 'No se pueden remover todas las categorías con permisos limitados';
            }
        }
    },

    initAll() {
        const widgets = document.querySelectorAll('.oc_catego');
        let initialized = 0;
        widgets.forEach(widget => {
            if (this.init(widget)) initialized++;
        });
        return initialized;
    },

    destroy(widget) {
        if (!widget || widget.dataset.oc_catego_Init !== "1") return false;

        this.removeListeners(widget);
        this.destroySortable(widget);
        delete widget.dataset.oc_catego_Init;
        return true;
    },

    destroyAll() {
        const widgets = document.querySelectorAll('[data-oc_catego_init="1"]');
        let destroyed = 0;
        widgets.forEach(widget => {
            if (this.destroy(widget)) destroyed++;
        });
        return destroyed;
    },

    /**
     * Initialize SortableJS for drag and drop functionality
     */
    initializeSortable(widget) {
        const siList = widget.querySelector('.oc_catego_si');
        const availableList = widget.querySelector('.oc_catego_disponibles');

        if (!siList || !availableList) return;

        // Shared configuration for both lists
        const sortableConfig = {
            group: 'categories', // Same group allows dragging between lists
            handle: '.oc_catego_drag-handle', // Only drag by the handle
            animation: 150,
            ghostClass: 'oc_catego_sortable-ghost',
            chosenClass: 'oc_catego_sortable-chosen',
            dragClass: 'oc_catego_sortable-drag',

            // Safari compatibility settings
            forceFallback: false,
            fallbackTolerance: 3,
            delayOnTouchOnly: true,
            delay: 100,
            touchStartThreshold: 10,
            swapThreshold: 0.65,

            onStart: (evt) => {
                // Add visual feedback when dragging starts
                evt.item.classList.add('oc_catego_dragging');
            },

            onEnd: (evt) => {
                // Remove visual feedback
                evt.item.classList.remove('oc_catego_dragging');

                // Update button state based on new location
                this.updateItemButtonAfterDrop(evt.item, evt.to);

                // Trigger widget state change
                this.onWidgetStateChanged(widget);
            }
        };

        // Initialize SortableJS on both lists
        const siSortable = new Sortable(siList, sortableConfig);
        const availableSortable = new Sortable(availableList, sortableConfig);

        // Store references for cleanup
        widget.dataset.oc_catego_SiSortable = 'initialized';
        widget.dataset.oc_catego_AvailableSortable = 'initialized';
        widget._siSortable = siSortable;
        widget._availableSortable = availableSortable;
    },

    /**
     * Destroy SortableJS instances
     */
    destroySortable(widget) {
        if (widget._siSortable) {
            widget._siSortable.destroy();
            delete widget._siSortable;
        }
        if (widget._availableSortable) {
            widget._availableSortable.destroy();
            delete widget._availableSortable;
        }
        delete widget.dataset.oc_catego_SiSortable;
        delete widget.dataset.oc_catego_AvailableSortable;
    },

    /**
     * Update item button state after drag and drop
     */
    updateItemButtonAfterDrop(item, targetList) {
        const button = item.querySelector('.oc_catego_arrow-button');
        if (!button) return;

        const isInSelectedList = targetList.classList.contains('oc_catego_si');

        if (isInSelectedList) {
            // Item is now in "selected" list
            button.innerHTML = '→';
            button.className = 'oc_catego_arrow-button oc_catego_arrow-button--right';
            button.setAttribute('onclick', "ocWidgetCatego.moveCategory(this, 'right')");
            button.setAttribute('title', 'Remover categoría');
        } else {
            // Item is now in "available" list
            button.innerHTML = '←';
            button.className = 'oc_catego_arrow-button oc_catego_arrow-button--left';
            button.setAttribute('onclick', "ocWidgetCatego.moveCategory(this, 'left')");
            button.setAttribute('title', 'Asignar categoría');
        }
    },

    addListeners(widget) {
        const searchInput = widget.querySelector('.oc_catego_search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleInput);
            searchInput.addEventListener('keydown', this.handleKeydown);
        }
    },

    removeListeners(widget) {
        const searchInput = widget.querySelector('.oc_catego_search-input');
        if (searchInput) {
            searchInput.removeEventListener('input', this.handleInput);
            searchInput.removeEventListener('keydown', this.handleKeydown);
        }
    },

    handleInput: function(event) {
        const widget = event.target.closest('.oc_catego');
        if (widget) {
            ocWidgetCatego.filterCategories(widget, event.target.value);
        }
    },

    handleKeydown: function(event) {
        if (event.key === 'Escape') {
            const widget = event.target.closest('.oc_catego');
            if (widget) {
                event.target.value = '';
                ocWidgetCatego.filterCategories(widget, '');
            }
        }
    },

    /**
     * Initialize widget from linked select element
     * This reads the select options and populates the widget lists
     */
    initializeFromLinkedSelect(widget) {
        const selectId = widget.dataset.oc_catego_linked_select;
        if (!selectId) return;

        const selectElement = document.getElementById(selectId);
        if (!selectElement) return;

        // Get all options from select
        const allOptions = Array.from(selectElement.options);
        const selectedValues = Array.from(selectElement.selectedOptions).map(option => option.value);

        // Clear existing widget content
        const siList = widget.querySelector('.oc_catego_si');
        const availableList = widget.querySelector('.oc_catego_disponibles');
        if (!siList || !availableList) return;

        siList.innerHTML = '';
        availableList.innerHTML = '';
        // Populate widget from select options
        allOptions.forEach(option => {
            if (!option.value) return; // Skip empty value options

            const isSelected = selectedValues.includes(option.value);
            const targetList = isSelected ? siList : availableList;

            const categoryItem = this.createCategoryItem(option.value, option.textContent, isSelected);
            targetList.appendChild(categoryItem);
        });
    },

    onWidgetStateChanged: function(widget) {
        this.syncWidgetSelectedToSelect(widget);
        this.updateCounters(widget);
        this.updateMoveAllButtons(widget);
        this.clearSearchAfterMovement(widget);
    },

    syncWidgetSelectedToSelect: function(widget) {
        const selectId = widget.dataset.oc_catego_linked_select;
        if (!selectId) return;
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;
        const options = selectEl.options;
        const selectedIds = this.getValue(widget);
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            opt.selected = selectedIds.includes(opt.value);
        }
    },

    syncSelectSelectedToWidget: function(widget) {
        const selectId = widget.dataset.oc_catego_linked_select;
        if (!selectId) return;
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;
        const selected = new Set();
        const unselected = new Set();

        for (let opt of selectEl.options) {
            (opt.selected ? selected : unselected).add(opt.value);
        }

        const siList = widget.querySelector('.oc_catego_si');
        const disponiblesList = widget.querySelector('.oc_catego_disponibles');
        const items = widget.querySelectorAll('.oc_catego_item');

        for (let item of items) {
            const id = item.getAttribute('data-category-id');
            if (selected.has(id)) {
                siList.appendChild(item);
            } else if (unselected.has(id)) {
                disponiblesList.appendChild(item);
            }
        }
        this.updateCounters(widget);
        this.updateMoveAllButtons(widget);
        this.clearSearchAfterMovement(widget);
    },

    /**
     * Get all category items from widget (both selected and available)
     */
    getAllCategoryItems(widget) {
        const allItems = widget.querySelectorAll('.oc_catego_item');
        return Array.from(allItems).map(item => ({
            id: item.dataset.categoryId,
            label: item.querySelector('.oc_catego_name')?.textContent || ''
        })).filter(item => item.id);
    },

    /**
     * Create a category item element
     */
    createCategoryItem(id, label, isSelected = false) {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'oc_catego_item';
        categoryItem.dataset.categoryId = id;

        const arrowDirection = isSelected ? 'right' : 'left';
        const arrowClass = isSelected ? 'oc_catego_arrow-button--right' : 'oc_catego_arrow-button--left';
        const arrowSymbol = isSelected ? '→' : '←';
        const arrowTitle = isSelected ? 'Remover categoría' : 'Asignar categoría';
        const moveDirection = isSelected ? 'right' : 'left';

        categoryItem.innerHTML = `
            <div class="oc_catego_drag-handle">⇔</div>
            <div class="oc_catego_name">${this.escapeHtml(label)}</div>
            <button 
                class="oc_catego_arrow-button ${arrowClass}" 
                type="button"
                onclick="ocWidgetCatego.moveCategory(this, '${moveDirection}')"
                title="${arrowTitle}"
            >
                ${arrowSymbol}
            </button>
        `;

        return categoryItem;
    },

    /**
     * Update widget with new categories from CRUD operations
     */
    updateWidgetCategories(widget, newCategories) {
        if (!widget || !Array.isArray(newCategories)) return;

        console.log('🔄 Updating widget with new categories:', newCategories);

        // Get current selected categories
        const currentSelected = this.getValue(widget);

        // Get widget lists
        const siList = widget.querySelector('.oc_catego_si');
        const availableList = widget.querySelector('.oc_catego_disponibles');

        if (!siList || !availableList) return;

        // Destroy existing sortable instances
        this.destroySortable(widget);

        // Clear both lists
        siList.innerHTML = '';
        availableList.innerHTML = '';

        // Rebuild with new categories
        newCategories.forEach(category => {
            const isSelected = currentSelected.includes(category.id);
            const targetList = isSelected ? siList : availableList;

            const categoryItem = this.createCategoryItem(category.id, category.label, isSelected);
            targetList.appendChild(categoryItem);
        });

        // Reinitialize sortable
        this.initializeSortable(widget);

        // Update counters and sync
        this.updateCounters(widget);
        this.updateMoveAllButtons(widget);

        console.log('✅ oc_catego updated successfully');
    },

    clearSearch(button) {
        try {
            const input = button.previousElementSibling;
            const widget = button.closest('.oc_catego');
            if (input && widget) {
                input.value = '';
                input.focus();
                this.filterCategories(widget, '');
            }
        } catch (error) {
            console.warn('Error clearing search:', error);
        }
    },

    moveCategory(button, direction) {
        const categoryItem = button.closest('.oc_catego_item');
        const widget = categoryItem.closest('.oc_catego');
        if (!widget || !categoryItem) return;

        // Check permissions before moving
        if (this.isReadOnly(widget)) {
            return; // Silently ignore in read-only mode
        }

        if (direction === 'right') { // Removing from selected
            if (!this.canRemoveCategory(widget, categoryItem)) {
                schAlert('No tiene permisos para quitar esta categoría');
                return;
            }
        } else { // Adding to selected
            if (!this.canAddCategories(widget)) {
                schAlert('No tiene permisos para agregar categorías');
                return;
            }

            // Mark as added today for 'Add' permission tracking
            const today = new Date().toISOString().split('T')[0];
            categoryItem.dataset.oc_catego_added_date = today;
        }

        let targetList;
        if (direction === 'left') {
            targetList = widget.querySelector('.oc_catego_si');
            button.innerHTML = '→';
            button.className = 'oc_catego_arrow-button oc_catego_arrow-button--right';
            button.setAttribute('onclick', "ocWidgetCatego.moveCategory(this, 'right')");
            button.setAttribute('title', 'Remover categoría');
        } else {
            targetList = widget.querySelector('.oc_catego_disponibles');
            button.innerHTML = '←';
            button.className = 'oc_catego_arrow-button oc_catego_arrow-button--left';
            button.setAttribute('onclick', "ocWidgetCatego.moveCategory(this, 'left')");
            button.setAttribute('title', 'Asignar categoría');
        }

        categoryItem.style.transform = 'scale(0.8)';
        categoryItem.style.opacity = '0.5';

        setTimeout(() => {
            targetList.appendChild(categoryItem);
            categoryItem.style.transform = '';
            categoryItem.style.opacity = '';
            this.onWidgetStateChanged(widget);
        }, 150);
    },

    moveAllCategories(button, direction) {
        const widget = button.closest('.oc_catego');
        const column = button.closest('.oc_catego_column');
        if (!widget || !column) return;

        // Check permissions
        if (this.isReadOnly(widget)) {
            return;
        }

        if (direction === 'right' && !this.canRemoveAllCategories(widget)) {
            schAlert('No tiene permisos para quitar todas las categorías');
            return;
        }

        if (direction === 'left' && !this.canAddCategories(widget)) {
            schAlert('No tiene permisos para agregar categorías');
            return;
        }

        const currentList = column.querySelector('.oc_catego_list');
        const items = Array.from(currentList.querySelectorAll('.oc_catego_item'));
        if (items.length === 0) return;

        const targetList = direction === 'left'
            ? widget.querySelector('.oc_catego_si')
            : widget.querySelector('.oc_catego_disponibles');

        items.forEach((item, index) => {
            setTimeout(() => {
                item.style.transform = 'scale(0.8)';
                item.style.opacity = '0.5';

                setTimeout(() => {
                    const arrowButton = item.querySelector('.oc_catego_arrow-button');
                    if (direction === 'left') {
                        arrowButton.innerHTML = '→';
                        arrowButton.className = 'oc_catego_arrow-button oc_catego_arrow-button--right';
                        arrowButton.setAttribute('onclick', "ocWidgetCatego.moveCategory(this, 'right')");
                        arrowButton.setAttribute('title', 'Remover categoría');
                    } else {
                        arrowButton.innerHTML = '←';
                        arrowButton.className = 'oc_catego_arrow-button oc_catego_arrow-button--left';
                        arrowButton.setAttribute('onclick', "ocWidgetCatego.moveCategory(this, 'left')");
                        arrowButton.setAttribute('title', 'Asignar categoría');
                    }

                    targetList.appendChild(item);
                    item.style.transform = '';
                    item.style.opacity = '';

                    if (index === items.length - 1) {
                        this.onWidgetStateChanged(widget);
                    }
                }, 100);
            }, index * 50);
        });
    },

    updateCounters(widget) {
        const siList = widget.querySelector('.oc_catego_si');
        const availableList = widget.querySelector('.oc_catego_disponibles');

        if (!siList || !availableList) return;

        const siCount = siList.children.length;
        const availableCount = availableList.children.length;

        const siFooter = widget.querySelector('.oc_catego_column--selected .oc_catego_column-count');
        const availableFooter = widget.querySelector('.oc_catego_column--available .oc_catego_column-count');

        if (siFooter) siFooter.textContent = `${siCount} categoría${siCount !== 1 ? 's' : ''}`;
        if (availableFooter) availableFooter.textContent = `${availableCount} categoría${availableCount !== 1 ? 's' : ''}`;
    },

    updateMoveAllButtons(widget) {
        const siList = widget.querySelector('.oc_catego_si');
        const availableList = widget.querySelector('.oc_catego_disponibles');

        const siButton = widget.querySelector('.oc_catego_column--selected .oc_catego_move-all-button');
        const availableButton = widget.querySelector('.oc_catego_column--available .oc_catego_move-all-button');

        if (siButton && siList) {
            siButton.disabled = siList.children.length === 0;
        }

        if (availableButton && availableList) {
            availableButton.disabled = availableList.children.length === 0;
        }
    },

    filterCategories(widget, searchTerm) {
        const categoryItems = widget.querySelectorAll('.oc_catego_item');
        const term = searchTerm.toLowerCase();

        categoryItems.forEach(item => {
            const nameElement = item.querySelector('.oc_catego_name');
            if (!nameElement) return;

            const categoryName = nameElement.textContent.toLowerCase();
            const isVisible = categoryName.includes(term);

            item.style.display = isVisible ? 'flex' : 'none';

            if (isVisible && term) {
                const originalText = nameElement.textContent;
                const highlightedText = originalText.replace(
                    new RegExp(`(${term})`, 'gi'),
                    '<mark style="background: var(--color-warning-bg); color: var(--color-text);">$1</mark>'
                );
                nameElement.innerHTML = highlightedText;
            } else {
                nameElement.innerHTML = nameElement.textContent;
            }
        });

        this.updateVisibleCounters(widget);
    },

    updateVisibleCounters(widget) {
        const siList = widget.querySelector('.oc_catego_si');
        const availableList = widget.querySelector('.oc_catego_disponibles');

        if (!siList || !availableList) return;

        const siVisible = Array.from(siList.children).filter(item => item.style.display !== 'none').length;
        const availableVisible = Array.from(availableList.children).filter(item => item.style.display !== 'none').length;

        const siFooter = widget.querySelector('.oc_catego_column--selected .oc_catego_column-count');
        const availableFooter = widget.querySelector('.oc_catego_column--available .oc_catego_column-count');

        if (siFooter) {
            const totalSi = siList.children.length;
            siFooter.textContent = `${siVisible} categoría${siVisible !== 1 ? 's' : ''} visible${siVisible !== totalSi ? ` de ${totalSi}` : ''}`;
        }

        if (availableFooter) {
            const totalAvailable = availableList.children.length;
            availableFooter.textContent = `${availableVisible} categoría${availableVisible !== 1 ? 's' : ''} visible${availableVisible !== totalAvailable ? ` de ${totalAvailable}` : ''}`;
        }
    },

    openCRUD: function(entityType, button) {
        const widget = button.closest('.oc_catego');
        if (!widget) {
            console.warn('oc_catego not found for CRUD operation');
            return;
        }

        // Check CRUD permissions
        const permissions = this.getPermissions(widget);
        if (!permissions.crud) {
            console.warn('CRUD operations not permitted for this widget');
            return;
        }

        // Get API URL from widget data attribute
        const apiUrl = widget.dataset.oc_catego_api;
        if (!apiUrl) {
            console.warn('API URL not found in widget data attributes');
            schAlert('Error: API URL no configurada en el widget');
            return;
        }

        // Check if CRUD dialog system is available
        if (typeof ocCategoCRUD === 'undefined') {
            console.warn('CRUD dialog system not loaded');
            schAlert('Categorías no disponible.\nIncluya el archivo catego_crud.js');
            return;
        }

        // Open CRUD dialog with widget context
        ocCategoCRUD.openDialog(entityType, apiUrl, widget);
    },

    clearSearchAfterMovement(widget) {
        const searchInput = widget.querySelector('.oc_catego_search-input');
        if (searchInput && searchInput.value.trim() !== '') {
            searchInput.value = '';
            this.filterCategories(widget, '');
        }
    },

    getValue(widget) {
        if (!widget) return [];

        const siList = widget.querySelector('.oc_catego_si');
        if (!siList) return [];

        const items = Array.from(siList.querySelectorAll('.oc_catego_item'));
        return items.map(item => item.dataset.categoryId).filter(Boolean);
    },

    setValue(widget, categoryIds) {
        if (!widget || !Array.isArray(categoryIds)) {
            return false;
        }

        const siList = widget.querySelector('.oc_catego_si');
        const availableList = widget.querySelector('.oc_catego_disponibles');

        if (!siList || !availableList) return false;

        const allItems = [
            ...Array.from(siList.querySelectorAll('.oc_catego_item')),
            ...Array.from(availableList.querySelectorAll('.oc_catego_item'))
        ];

        allItems.forEach(item => {
            const categoryId = item.dataset.categoryId;
            const shouldBeSelected = categoryIds.includes(categoryId);
            const isCurrentlySelected = item.closest('.oc_catego_si') !== null;

            if (shouldBeSelected && !isCurrentlySelected) {
                this.updateItemButton(item, 'selected');
                siList.appendChild(item);
            } else if (!shouldBeSelected && isCurrentlySelected) {
                this.updateItemButton(item, 'available');
                availableList.appendChild(item);
            }
        });
        this.updateCounters(widget);
        this.updateMoveAllButtons(widget);
        this.clearSearchAfterMovement(widget);
        return true;
    },

    updateItemButton(item, state) {
        const button = item.querySelector('.oc_catego_arrow-button');
        if (!button) return;

        if (state === 'selected') {
            button.innerHTML = '→';
            button.className = 'oc_catego_arrow-button oc_catego_arrow-button--right';
            button.setAttribute('onclick', "ocWidgetCatego.moveCategory(this, 'right')");
            button.setAttribute('title', 'Remover categoría');
        } else {
            button.innerHTML = '←';
            button.className = 'oc_catego_arrow-button oc_catego_arrow-button--left';
            button.setAttribute('onclick', "ocWidgetCatego.moveCategory(this, 'left')");
            button.setAttribute('title', 'Asignar categoría');
        }
    },

    clear(widget) {
        return this.setValue(widget, []);
    },

    getWidgetBySelectId(selectId) {
        return document.querySelector(`[data-oc_catego_linked_select="${selectId}"]`);
    },

    getValueBySelectId(selectId) {
        const widget = this.getWidgetBySelectId(selectId);
        return widget ? this.getValue(widget) : [];
    },

    createWidget(container, options = {}) {
        const widget = typeof container === 'string' ? document.querySelector(container) : container;
        if (widget) {
            return this.init(widget);
        }
        return false;
    },

    /**
     * Utility function to escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ocWidgetCatego.initAll());
} else {
    ocWidgetCatego.initAll();
}
console.log("___________oc_catego installed");