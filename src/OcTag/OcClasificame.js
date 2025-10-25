/**
 * OcClasificame - A standalone component for multi-column item assignment.
 *
 * Replaces the jQuery UI widget 'clasificame.js' with a modern class that
 * integrates with OcDialog and SortableJS.
 *
 * Dependencies:
 * - OcDialog.js (for launching)
 * - Sortable.min.js (for drag-and-drop)
 * - OcClasificame.css (for styling)
 */
class OcClasificame {

    /**
     * @param {HTMLElement} element - The root element to build the component in.
     * @param {Object} options - Configuration options.
     */
    constructor(element, options = {}) {
        this.element = element;
        this.sortables = []; // To store Sortable instances for later cleanup
        this.options = this._mergeOptions(options); // Initial merge

        // Map internal names to provided option keys
        this.valueId = this.options.valueId;
        this.valueDisplay = this.options.valueDisplay;
        this.valueColumnKey = this.options.valueColumnKey;

        this._buildHtml(); // Build HTML structure FIRST

        // **FIX**: Validate and finalize 'nadaKey' AFTER HTML is built
        this._finalizeNadaKey();

        this._bindGlobalEvents(); // Bind events AFTER HTML is built

        if (this.options.values) {
            this.setValues(this.options.values);
        }

        if (!this.options.editable) {
            this.readonly();
        }
    }

    /**
     * Default options for the component.
     * @private
     */
    _defaultOptions() {
        return {
            classifications: [
                { clasificaId: 'No', label: 'No', title: 'No', userSortable: true },
                { clasificaId: 'Si', label: 'Si', title: 'Si', userSortable: true }
            ],
            valueId: 'id',
            valueDisplay: 'label',
            valueColumnKey: 'column',
            nada: undefined, // Start with undefined, will be finalized after build
            liButtons: true,
            title: 'Clasificar Items',
            label_sort: 'items',
            values: [],
            editable: true,
            sortableOptions: {
                group: `oc-clasificame-${Date.now()}`, // Unique group for this instance
                animation: 150,
                ghostClass: 'oc-clasificame-ghost', // Ghost class
                forceFallback: true, // Needed for better compatibility
                onEnd: (evt) => this._onDragEnd(evt)
            }
        };
    }

    /**
     * Merges user options with defaults. Does NOT validate 'nada' yet.
     * @param {Object} userOptions
     * @returns {Object} Merged options
     * @private
     */
    _mergeOptions(userOptions) {
        const defaults = this._defaultOptions();
        // Deep merge sortableOptions first
        const sortableOptions = { ...defaults.sortableOptions, ...(userOptions.sortableOptions || {}) };
        // Merge the rest
        const options = { ...defaults, ...userOptions };
        options.sortableOptions = sortableOptions; // Assign merged sortable options back

        // If user didn't provide 'nada', try to set it based on the first classification.
        // Final validation happens in _finalizeNadaKey after HTML exists.
        if (options.nada === undefined && options.classifications.length > 0) {
            options.nada = options.classifications[0].clasificaId;
        }

        return options;
    }

    /**
     * Validates the 'nada' key after the HTML structure exists.
     * @private
     */
    _finalizeNadaKey() {
        const allLists = this.element.querySelectorAll('.OcClasificame_itemList');
        const firstListKey = allLists.length > 0 ? allLists[0].dataset.clasificakey : undefined;

        // Ensure nadaKey is a string for lookup, default to first list key if necessary
        let nadaKey = this.options.nada !== undefined ? String(this.options.nada) : firstListKey;

        // Check if the determined nadaKey actually corresponds to a list element
        const nadaListExists = nadaKey !== undefined && this.element.querySelector(`.OcClasificame_itemList[data-clasificakey="${nadaKey}"]`);

        if (!nadaListExists) {
            console.warn(`OcClasificame: Specified or initial default 'nada' key "${this.options.nada}" does not match any column. Falling back to the first column key: "${firstListKey}".`);
            nadaKey = firstListKey; // Use the first actual list key as the final fallback
        }

        // Store the validated or fallbacked nadaKey back into options
        this.options.nada = nadaKey; // Guaranteed to be a valid key or undefined if no lists exist

        // console.log(`OcClasificame: Final 'nadaKey' set to: "${this.options.nada}"`);
    }


    /**
     * Builds the component's inner HTML structure.
     * @private
     */
    _buildHtml() {
        this.element.innerHTML = ''; // Clear existing
        this.element.className = 'OcClasificame_dialog flexColumnFlexible';

        // 1. Create Global Search
        this.element.appendChild(this._createGlobalSearch());

        // 2. Create Columns Container
        const columnsContainer = document.createElement('div');
        columnsContainer.className = 'OcClasificame_columnsContainer';
        this.element.appendChild(columnsContainer);

        // 3. Create Each Column
        const numClassifications = this.options.classifications.length;
        this.options.classifications.forEach((b, index) => {
            const clasificaIdStr = String(b.clasificaId);
            const label = b.label || clasificaIdStr.replaceAll('_', ' ');
            const title = b.title || label;
            const indicaUserSortable = b.userSortable ? '<span title="Se pueden reordenar con drag & drop">↕</span>' : '';

            const column = document.createElement('div');
            column.className = 'OcClasificame_column flexColumnFlexible';
            column.dataset.clasificaContainer = clasificaIdStr;

            // Determine previous and next keys for arrow buttons
            const prevIndex = (index - 1 + numClassifications) % numClassifications;
            const nextIndex = (index + 1) % numClassifications;
            const prevKey = String(this.options.classifications[prevIndex].clasificaId);
            const nextKey = String(this.options.classifications[nextIndex].clasificaId);
            const prevTitle = this.options.classifications[prevIndex].title || prevKey;
            const nextTitle = this.options.classifications[nextIndex].title || nextKey;

            // **MODIFICATION**: Move arrows into the Item Count div
            column.innerHTML = `
                <div class="OcClasificame_columnHeader" data-clasificaTitle="${clasificaIdStr}">
                    <h3>${title}</h3>
                    <div class="OcClasificame_columnActions">
                        ${indicaUserSortable}
                        <span title="Pasar todos los visibles a ${title}"
                              data-clasificakey="${clasificaIdStr}"
                              class="OcClasificame_allTo">↴</span>
                    </div>
                </div>
                <ul class="OcClasificame_itemList"
                    data-clasificame-index="${index}"
                    data-clasificakey="${clasificaIdStr}">
                </ul>
                <div class="OcClasificame_itemCount" data-label-registro="${this.options.label_sort.replace(' ', '_')}">
                    <!-- Arrows are now inside item count -->
                    ${index > 0 ? `
                        <button type="button" class="OcClasificame_moveAllBtn OcClasificame_moveAllBtn--prev"
                                data-current-key="${clasificaIdStr}"
                                data-target-key="${prevKey}"
                                title="Mover visibles a ${prevTitle}">&larr;</button>
                    ` : '<span class="OcClasificame_moveAllBtn--placeholder"></span>' }

                    <span class="OcClasificame_itemCountText">Mostrando: <span>0</span> ${this.options.label_sort}</span>

                     ${index < numClassifications - 1 ? `
                        <button type="button" class="OcClasificame_moveAllBtn OcClasificame_moveAllBtn--next"
                                data-current-key="${clasificaIdStr}"
                                data-target-key="${nextKey}"
                                title="Mover visibles a ${nextTitle}">&rarr;</button>
                     ` : '<span class="OcClasificame_moveAllBtn--placeholder"></span>' }
                </div>
            `;
            columnsContainer.appendChild(column);

            // Initialize SortableJS
            const list = column.querySelector('.OcClasificame_itemList');
            const sortableOpts = { ...this.options.sortableOptions };

            this.sortables.push(new Sortable(list, sortableOpts));
        });
    }

    /**
     * Binds global search and other component-wide events.
     * @private
     */
    _bindGlobalEvents() {
        // Global Search
        const searchInput = this.element.querySelector('.OcClasificame_globalSearchInput');
        const searchClear = this.element.querySelector('.OcClasificame_globalSearchClear');

        if (searchInput && searchClear) {
            searchInput.addEventListener('input', () => {
                searchClear.style.display = searchInput.value ? 'block' : 'none';
                this._globalFind(searchInput.value);
            });
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input')); // Trigger input event to clear filter
            });
        }

        // "All To" column header buttons
        this.element.querySelectorAll('.OcClasificame_allTo').forEach(button => {
            button.addEventListener('click', (e) => {
                const toClasificaId = e.currentTarget.dataset.clasificakey;
                this.allTo(toClasificaId);
            });
        });

        // "Move All Left/Right" footer buttons
        this.element.querySelectorAll('.OcClasificame_moveAllBtn').forEach(button => {
            // Only add listener if it's actually a button
            if (button.tagName === 'BUTTON') {
                button.addEventListener('click', (e) => {
                    const currentKey = e.currentTarget.dataset.currentKey;
                    const targetKey = e.currentTarget.dataset.targetKey;
                    this._moveVisibleItems(currentKey, targetKey);
                });
            }
        });
    }


    /**
     * Creates the global search bar element.
     * @returns {HTMLElement}
     * @private
     */
    _createGlobalSearch() {
        const searchBar = document.createElement('div');
        searchBar.className = 'OcClasificame_globalSearch flexRowDyanimic';
        searchBar.innerHTML = `
            <div> <!-- growing div -->
                <input type="text" placeholder="🔎 Buscar..." class="OcClasificame_globalSearchInput" aria-label="Buscar en todas las columnas">
            </div>
            <div> <!-- fixed div -->
                <button type="button" class="OcClasificame_globalSearchClear" style="display: none;" title="Borrar búsqueda" aria-label="Borrar búsqueda">✕</button>
            </div>
        `;
        return searchBar;
    }

    /**
     * Handles the end of a drag event to re-sort the list.
     * @param {Event} evt - The SortableJS event.
     * @private
     */
    _onDragEnd(evt) {
        const list = evt.to; // The list where the item was dropped
        const item = evt.item;
        const newClasificaId = list.dataset.clasificakey; // This is a string

        if (item && newClasificaId !== undefined) {
            item.querySelectorAll('.OcClasificame_itemToolbar button').forEach(btn => {
                btn.classList.toggle('pressed', btn.dataset.clasificato === newClasificaId);
            });
        }
        this._sortMe(list);
        this._updateCounters();
    }

    /**
     * Creates the HTML for the per-item move buttons.
     * @param {string | number} clasificaId - The current classification ID of the item.
     * @returns {string} HTML string for the toolbar.
     * @private
     */
    _toolbar(clasificaId) {
        if (!this.options.liButtons || !this.options.editable) {
            return '';
        }
        const currentIdStr = String(clasificaId);

        let buttons = this.options.classifications.map(b => {
            const bIdStr = String(b.clasificaId);
            const isPressed = bIdStr === currentIdStr;
            const classPressed = isPressed ? 'pressed' : '';
            const label = b.label || bIdStr.replaceAll('_', ' ');
            const title = b.title || label;
            return `<button type="button"
                            class="${classPressed}"
                            data-clasificato="${bIdStr}"
                            title="Mover a ${title}">
                        ${label}
                    </button>`;
        }).join("");

        return `<div class="OcClasificame_itemToolbar" data-no-drag>${buttons}</div>`;
    }

    /**
     * Handles the click on a per-item move button.
     * Needs access to 'this' context.
     * @param {Event} event - The click event.
     * @private
     */
    _clickToHandler(event) {
        const button = event.target.closest('button');
        if (!button || button.classList.contains('pressed')) {
            event.stopPropagation();
            return;
        }

        const sendTo = button.dataset.clasificato; // Already a string from dataset
        if (sendTo === undefined) {
            console.error(`OcClasificame (_clickToHandler): Button is missing 'data-clasificato' attribute.`);
            return;
        }

        const liElement = button.closest('li.OcClasificame_item');
        if (!liElement) return;

        const targetList = this.element.querySelector(`.OcClasificame_itemList[data-clasificakey="${sendTo}"]`);

        if (targetList) {
            const sendToStr = String(sendTo);
            liElement.querySelectorAll('.OcClasificame_itemToolbar button').forEach(btn => {
                btn.classList.toggle('pressed', String(btn.dataset.clasificato) === sendToStr);
            });
            targetList.appendChild(liElement);
            this._sortMe(targetList);
            this._updateCounters();
        } else {
            console.error(`OcClasificame (_clickToHandler): Target list not found for key: "${sendTo}"`);
        }
    }


    /**
     * Sorts a specific list based on its userSortable setting.
     * @param {HTMLElement} listElement - The <ul> element to sort.
     * @private
     */
    _sortMe(listElement) {
        if (!listElement || !listElement.dataset.clasificameIndex) return;

        const index = parseInt(listElement.dataset.clasificameIndex, 10);
        if (isNaN(index) || index < 0 || index >= this.options.classifications.length) {
            return;
        }

        const sortType = this.options.classifications[index].userSortable;

        if (sortType === true) {
            return;
        }

        const items = Array.from(listElement.querySelectorAll(':scope > li.OcClasificame_item'));
        if (items.length < 2) return;

        let sortFn = (a, b) => {
            const textA = a.querySelector('.OcClasificame_itemLabel')?.textContent.trim().toUpperCase() || '';
            const textB = b.querySelector('.OcClasificame_itemLabel')?.textContent.trim().toUpperCase() || '';
            return textA.localeCompare(textB, undefined, { numeric: true, sensitivity: 'base' });
        };

        if (typeof sortType === 'function') {
            try {
                sortFn = (a, b) => sortType(a, b);
            } catch (e) {
                console.error("OcClasificame: Error executing custom sort function.", e);
            }
        } else if (sortType === false) {
            // Default sort is fine
        } else {
            console.warn(`OcClasificame: Invalid 'userSortable' value (${sortType}), defaulting to alphabetical sort.`);
        }

        try {
            items.sort(sortFn);
            items.forEach(item => listElement.appendChild(item));
        } catch (e) {
            console.error("OcClasificame: Error during sort execution or appending.", e);
        }
    }


    /**
     * Updates the "Mostrando: X items" counters under each column.
     * @private
     */
    _updateCounters() {
        let totalVisible = 0;
        this.element.querySelectorAll('.OcClasificame_column').forEach(column => {
            const list = column.querySelector('.OcClasificame_itemList');
            // **MODIFICATION**: Find count span within the specific text span
            const countSpan = column.querySelector('.OcClasificame_itemCountText span');
            const visibleItems = list.querySelectorAll(':scope > li.OcClasificame_item:not(.oc-clasificame-filtered)').length;

            if (countSpan) {
                countSpan.textContent = visibleItems;
            }
            totalVisible += visibleItems;
        });

        const totalSpan = this.element.querySelector('.OcClasificame_totalCount span');
        if (totalSpan) {
            totalSpan.textContent = totalVisible;
        }
    }

    /**
     * Filters items across all lists based on a search term.
     * @param {string} searchText - The text to filter by.
     * @private
     */
    _globalFind(searchText) {
        const normalizedSearch = searchText.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        this.element.querySelectorAll('li.OcClasificame_item').forEach(item => {
            const itemText = (item.dataset.searchText || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            if (itemText.includes(normalizedSearch)) {
                item.classList.remove('oc-clasificame-filtered');
            } else {
                item.classList.add('oc-clasificame-filtered');
            }
        });

        this._updateCounters();
    }

    /**
     * Moves all VISIBLE items from a source list to a target list.
     * Used by the column footer arrow buttons.
     * @param {string} fromKey - The data-clasificakey of the source list.
     * @param {string} toKey - The data-clasificakey of the target list.
     * @private
     */
    _moveVisibleItems(fromKey, toKey) {
        if (!this.options.editable) return;

        const fromList = this.element.querySelector(`.OcClasificame_itemList[data-clasificakey="${fromKey}"]`);
        const targetList = this.element.querySelector(`.OcClasificame_itemList[data-clasificakey="${toKey}"]`);

        if (!fromList || !targetList) {
            console.error(`OcClasificame (_moveVisibleItems): Could not find source or target list. From: ${fromKey}, To: ${toKey}`);
            return;
        }

        // Find visible items in the source list
        const itemsToMove = fromList.querySelectorAll(':scope > li.OcClasificame_item:not(.oc-clasificame-filtered)');

        itemsToMove.forEach(item => {
            // Update item's internal button states
            item.querySelectorAll('.OcClasificame_itemToolbar button').forEach(btn => {
                btn.classList.toggle('pressed', btn.dataset.clasificato === toKey);
            });
            // Move item
            targetList.appendChild(item);
        });

        // Only sort/count if items were moved
        if (itemsToMove.length > 0) {
            this._sortMe(targetList); // Sort the target list
            this._updateCounters(); // Update all counters
        }
    }


    // ===================================================================
    // PUBLIC API METHODS
    // ===================================================================

    /**
     * Clears all items from all columns.
     */
    clear() {
        this.element.querySelectorAll('.OcClasificame_itemList').forEach(list => {
            list.innerHTML = '';
        });
        this._updateCounters();
    }

    /**
     * Loads a new set of values, clearing old ones first.
     * @param {Array|Object} values - The new values to load.
     */
    setValues(values) {
        this.clear();
        this.addValues(values);
    }

    /**
     * Adds values to the columns without clearing existing ones.
     * @param {Array|Object} values - The values to add.
     */
    addValues(values) {
        const items = Array.isArray(values) ? values : Object.values(values);
        const allLists = this.element.querySelectorAll('.OcClasificame_itemList');
        const lastListFallback = allLists.length > 0 ? allLists[allLists.length - 1] : null;
        const nadaKey = this.options.nada; // Already validated string or undefined

        items.forEach((item, index) => {
            const id = item[this.valueId] !== undefined ? item[this.valueId] : `item_${index}`;
            const label = item[this.valueDisplay] !== undefined ? String(item[this.valueDisplay]) : String(id);
            let clasificaId = item[this.valueColumnKey] !== undefined && item[this.valueColumnKey] !== null
                ? String(item[this.valueColumnKey])
                : nadaKey;

            let targetList = null;
            let usedFallback = false;
            let attemptedId = clasificaId;

            // 1. Try finding the list based on the determined classification ID
            if (clasificaId !== undefined) {
                targetList = this.element.querySelector(`.OcClasificame_itemList[data-clasificakey="${clasificaId}"]`);
            }

            // 2. If not found, and if we didn't already try the 'nada' key, try 'nada'
            if (!targetList && nadaKey !== undefined && clasificaId !== nadaKey) {
                // console.warn(`OcClasificame: Classification ID "${attemptedId}" not found for item ${id}. Falling back to default "${nadaKey}".`);
                targetList = this.element.querySelector(`.OcClasificame_itemList[data-clasificakey="${nadaKey}"]`);
                clasificaId = nadaKey;
            }

            // 3. If STILL not found, use the last list fallback
            if (!targetList && lastListFallback) {
                const fallbackKey = lastListFallback.dataset.clasificakey;
                console.warn(`OcClasificame: Default classification "${nadaKey}" also not found or failed for item ${id}. Placing in the last available column (${fallbackKey}).`);
                targetList = lastListFallback;
                clasificaId = fallbackKey;
                usedFallback = true;
            }

            if (targetList) {
                const li = document.createElement('li');
                li.className = 'OcClasificame_item';

                let itemTitle = item.title || label;
                if (usedFallback) {
                    li.classList.add('oc-clasificame-item--fallback');
                    itemTitle = `(Fallback) ${itemTitle} [Original: ${attemptedId}, Default: ${nadaKey}]`;
                }
                li.title = itemTitle;


                li.dataset.clasificaid = id;
                li.dataset.searchText = label;

                li.innerHTML = `
                    <span class="OcClasificame_itemLabel">${label}</span>
                    ${this._toolbar(String(clasificaId))}
                `;

                const toolbar = li.querySelector('.OcClasificame_itemToolbar');
                if (toolbar) {
                    toolbar.addEventListener('click', this._clickToHandler.bind(this));
                }

                targetList.appendChild(li);
            } else {
                console.error(`OcClasificame: Could not find ANY target list for item ${id}. Item not added.`);
            }
        });

        this.element.querySelectorAll('.OcClasificame_itemList').forEach(list => this._sortMe(list));
        this._updateCounters();
    }


    /**
     * Gets the current value of the component.
     * @returns {Object} An object where keys are classification IDs and values are arrays of item IDs.
     */
    value() {
        let ret = {};
        this.element.querySelectorAll('.OcClasificame_itemList').forEach(list => {
            const clasif = list.dataset.clasificakey;
            if (clasif === undefined) return;
            ret[clasif] = [];
            list.querySelectorAll(':scope > li.OcClasificame_item:not(.oc-clasificame-filtered)').forEach(item => {
                const id = item.dataset.clasificaid;
                if (id !== undefined) {
                    ret[clasif].push(id);
                }
            });
        });
        return ret;
    }

    /**
     * Moves all visible (not filtered) items from all other columns to the target column.
     * @param {string | number} toClasificaId - The target classification ID.
     */
    allTo(toClasificaId) {
        if (!this.options.editable) {
            console.warn("OcClasificame: Cannot use allTo in read-only mode.");
            return;
        }
        const toIdStr = String(toClasificaId);
        const targetList = this.element.querySelector(`.OcClasificame_itemList[data-clasificakey="${toIdStr}"]`);

        if (!targetList) {
            console.error(`OcClasificame: Target list for allTo not found: ${toClasificaId}`);
            return;
        }

        const itemsToMove = [];
        this.element.querySelectorAll('.OcClasificame_itemList').forEach(list => {
            if (list.dataset.clasificakey !== toIdStr) {
                list.querySelectorAll(':scope > li.OcClasificame_item:not(.oc-clasificame-filtered)').forEach(item => {
                    itemsToMove.push(item);
                });
            }
        });

        itemsToMove.forEach(item => {
            item.querySelectorAll('.OcClasificame_itemToolbar button').forEach(btn => {
                btn.classList.toggle('pressed', String(btn.dataset.clasificato) === toIdStr);
            });
            targetList.appendChild(item);
        });

        if (itemsToMove.length > 0) {
            this._sortMe(targetList);
            this._updateCounters();
        }
    }

    /**
     * Moves all items (regardless of filter state) from one column to another.
     * @param {string | number} fromClasificaId - The source classification ID.
     * @param {string | number} toClasificaId - The target classification ID.
     */
    fromTo(fromClasificaId, toClasificaId) {
        if (!this.options.editable) {
            console.warn("OcClasificame: Cannot use fromTo in read-only mode.");
            return;
        }
        const fromIdStr = String(fromClasificaId);
        const toIdStr = String(toClasificaId);
        const fromList = this.element.querySelector(`.OcClasificame_itemList[data-clasificakey="${fromIdStr}"]`);
        const targetList = this.element.querySelector(`.OcClasificame_itemList[data-clasificakey="${toIdStr}"]`);


        if (fromList && targetList && fromList !== targetList) {
            const itemsToMove = Array.from(fromList.querySelectorAll(':scope > li.OcClasificame_item'));

            itemsToMove.forEach(item => {
                item.querySelectorAll('.OcClasificame_itemToolbar button').forEach(btn => {
                    btn.classList.toggle('pressed', String(btn.dataset.clasificato) === toIdStr);
                });
                targetList.appendChild(item);
            });

            if (itemsToMove.length > 0) {
                this._sortMe(targetList);
                this._updateCounters();
            }
        } else if (!fromList) {
            console.error(`OcClasificame: Source list for fromTo not found: ${fromClasificaId}`);
        } else if (!targetList) {
            console.error(`OcClasificame: Target list for fromTo not found: ${toClasificaId}`);
        }
    }


    /**
     * Restores the component to its initial set of values provided in options.
     */
    restore() {
        this.setValues(this.options.values);
    }

    /**
     * Disables drag-and-drop and hides editing controls.
     */
    readonly() {
        this.options.editable = false;
        this.element.classList.add('oc-clasificame-readonly');

        this.sortables.forEach(s => s.option('disabled', true));

        // Hide elements specific to editing
        this.element.querySelectorAll('.OcClasificame_itemToolbar, .OcClasificame_allTo, .OcClasificame_moveAllBtn').forEach(el => {
            el.style.display = 'none';
        });
        // Make placeholders visible to maintain layout if needed, or hide them too
        this.element.querySelectorAll('.OcClasificame_moveAllBtn--placeholder').forEach(el => {
            el.style.display = 'none'; // Or set visibility: hidden if you want them to occupy space
        });

        this.element.querySelectorAll('.OcClasificame_item').forEach(item => {
            item.style.cursor = 'default';
        });
    }

    /**
     * Cleans up event listeners, Sortable instances, and clears HTML.
     */
    destroy() {
        this.sortables.forEach(s => s.destroy());
        this.sortables = [];
        this.element.innerHTML = '';
        this.element.classList.remove('OcClasificame_dialog', 'flexColumnFlexible', 'oc-clasificame-readonly');
    }


    // ===================================================================
    // STATIC LAUNCHER METHOD
    // ===================================================================

    /**
     * Creates and launches a new OcClasificame instance inside an OcDialog.
     * @param {Object} options - Configuration options for OcClasificame.
     * @param {string} [okLabel="Guardar"] - Label for the primary (OK/Save) button.
     * @param {string} [cancelLabel="Cancelar"] - Label for the secondary (Cancel) button. Set to null to hide.
     * @returns {{promise: Promise, instance: OcClasificame, dialog: HTMLElement | null}}
     */
    static launch(options = {}, okLabel = "Guardar", cancelLabel = "Cancelar") {

        const container = document.createElement('div');
        container.style.height = options.height || '70vh';
        container.style.width = options.width || '80vw';
        container.style.minHeight = options.minHeight || '300px';
        container.style.minWidth = options.minWidth || '400px';
        container.style.display = 'flex';


        const instance = new OcClasificame(container, options);

        let dialogRef = null;
        let resolveDialog, rejectDialog;

        const buttons = [];
        if (okLabel) {
            buttons.push({
                label: okLabel,
                class: 'ocdialog_button--primary',
                callback: () => {
                    if (dialogRef) {
                        dialogRef.close('resolve');
                    }
                }
            });
        }


        if (cancelLabel) {
            buttons.push({
                label: cancelLabel,
                class: 'ocdialog_button--secondary',
                callback: () => {
                    if (dialogRef) {
                        dialogRef.close('cancel');
                    }
                }
            });
        }

        const promise = new Promise((resolve, reject) => {
            resolveDialog = resolve;
            rejectDialog = reject;
        });

        const { dialog, promise: dialogInternalPromise } = OcDialog.dialog({
            title: options.title || 'Clasificar',
            html: container,
            buttons: buttons,
            keepHtml: false
        });

        dialogRef = dialog;

        dialogInternalPromise.catch(() => {
            const closeReason = dialog.returnValue;

            if (closeReason === 'resolve') {
                resolveDialog(instance.value());
            } else {
                rejectDialog(new Error(OcDialog.CANCELED));
            }
            instance.destroy();
        });

        return {
            promise,
            instance,
            get dialog() { return dialogRef; }
        };
    }
}

