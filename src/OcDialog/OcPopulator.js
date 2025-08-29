// noinspection JSUnusedGlobalSymbols,EqualityComparisonWithCoercionJS

/**
 * OcPopulator.js
 * @version 1.0.0
 * @description Stateless utility for populating and extracting values from HTML elements based on their IDs.
 */

/**
 * OcPopulator - Stateless HTML Element Population Utility
 */
const OcPopulator = {

    /**
     * Populates HTML elements by their IDs with provided data
     * @param container
     * @param {object} data - Key-value pairs where key is the element ID and value is the content to set
     * @param {object} attributes - Optional key-value pairs for setting attributes on elements{id:{attrName: attrValue}}
     * @param {boolean} sanitizeHtml
     */
    populate(container, data = {}, attributes = {}, sanitizeHtml = true) {
        if(!container || !container.nodeType) {
            throw new Error('Container must be a valid DOM element');
        }
        if(typeof data !== 'object' || data === null) {
            throw new Error('Data must be a non-null object');
        }

        for(let id in data) {
            if(data.hasOwnProperty(id))
                try {
                    /** @var element @type {HTMLElement} */
                    let element = container.querySelector(`#${CSS.escape(id)}`);
                    if(element && element.type !== "radio") {
                        this._populateElement(element, data[id], sanitizeHtml);
                        if(attributes.hasOwnProperty(id)) {
                            this._setElementAttributes(element, attributes[id]);
                        }
                    } else {
                        // Check if it's a radio button group by name
                        const radioGroup = container.querySelectorAll(`input[name="${CSS.escape(id)}"][type="radio"]`);
                        if(radioGroup.length > 0) {
                            const hasAttributes = attributes.hasOwnProperty(id);
                            const valueToCheck = String(data[id]);
                            radioGroup.forEach(radio => {
                                radio.checked = radio.value == valueToCheck;
                                if(hasAttributes)
                                    this._setElementAttributes(element, attributes[id]);
                            });
                        }
                    }
                } catch(error) {
                    console.error(`OcPopulator: Error populating '${id}':`, error);
                }
        }
    },

    /**
     * Extracts values from HTML elements by their IDs
     * @param {HTMLElement} container - Root container to search within
     * @param {Array<string>} keys - Array of element IDs to extract
     * @param {Object} options - Extraction options
     * @returns {Object} - Object with keys mapped to their element values
     */
    getValuesByKey(container, keys = [], options = {}) {
        const {
            includeAttributes = false,
        } = options;

        if(!container || !container.nodeType) {
            throw new Error('Container must be a valid DOM element');
        }

        if(!Array.isArray(keys)) {
            throw new Error('Keys must be an array');
        }

        const values = {};

        for(const key of keys) {
            if(typeof key !== 'string') {
                console.warn(`OcPopulator: Invalid key type '${typeof key}', skipping`);
                continue;
            }

            try {
                const element = this._findElement(container, key);
                if(!element) {
                    continue;
                }
                const value = this._extractElementValue(element);

                // Only include the value if it's meaningful (not null/undefined)
                if(value !== null && value !== undefined) {
                    values[key] = value;
                }

                // Include attributes if requested
                if(includeAttributes && element.attributes.length > 0) {
                    values[`${key}_attributes`] = this._getElementAttributes(element);
                }

            } catch(error) {
                console.error(`OcPopulator: Error extracting value for '${key}':`, error);
            }
        }

        return values;
    },

    // Private methods
    _findElement(container, id) {
        let element = container.querySelector(`#${CSS.escape(id)}`);
        if(!element) {
            return container.querySelector(`input[name="${CSS.escape(id)}"][type="radio"]:checked`);
        }
        return element;
    },

    _populateElement(element, value, sanitizeHtml = true) {
        if(value === null || value === undefined) {
            value = "";
        }

        const tagName = element.tagName.toLowerCase();
        switch(tagName) {
            case 'input':
                if(element.type === 'checkbox' || element.type === 'radio')
                    element.checked = element.value == value;
                else
                    element.value = value;
                break;
            case 'textarea':
                element.value = String(value);
                break;
            case 'select':
                this._populateSelect(element, value);
                break;
            case 'img':
                element.src = String(value);
                break;
            case 'ul':
            case 'ol':
                this._populateList(element, value);
                break;
            default:
                if(sanitizeHtml) {
                    element.textContent = String(value);
                } else {
                    element.innerHTML = String(value);
                }
        }
    },

    _populateSelect(element, value) {
        element.selectedIndex = -1; // Clear selection
        if(Array.isArray(value)) {
            /** @var option @type {HTMLOptionElement} */
            for(const option of element.options) {
                if(value.some(val => option.value == val)) {
                    option.selected = true;
                }
            }
        } else {
            element.value = value;
        }
    },

    _populateList(element, value) {
        if(Array.isArray(value)) {
            element.innerHTML = value.map(item => {
                if(Array.isArray(item)) {
                    // Nested list
                    const tagName = element.tagName.toLowerCase();
                    const subItems = item.map(subItem => `<li>${this._escapeHtml(String(subItem))}</li>`).join('');
                    return `<li><${tagName}>${subItems}</${tagName}></li>`;
                } else {
                    return `<li>${this._escapeHtml(String(item))}</li>`;
                }
            }).join('');
        } else {
            element.innerHTML = this._escapeHtml(String(value));
        }
    },

    _extractElementValue(element) {
        const tagName = element.tagName.toLowerCase();
        switch(tagName) {
            case 'input':
                return this._extractInputValue(element);
            case 'textarea':
                return element.value;
            case 'select':
                return this._extractSelectValue(element);
            default:
                return element.textContent || element.innerHTML;
        }
    },

    _extractInputValue(element) {
        const type = element.type.toLowerCase();
        switch(type) {
            case 'checkbox':
                return element.checked ? element.value : "";
            case 'radio':
                return element.checked ? element.value : "";
            default:
                return element.value || "";
        }
    },

    _extractSelectValue(element) {
        if(element.multiple) {
            return Array.from(element.selectedOptions).map(option => option.value);
        } else {
            return element.value;
        }
    },

    _setElementAttributes(element, attributes) {
        for(let attrName in attributes)
            if(attributes.hasOwnProperty(attrName)) {
                const attrValue = attributes[attrName];
                if(attrName.toLowerCase().startsWith("data-")) {
                    element.dataset[this._toDatasetKey(attrName)] = attrValue;
                }
                if(attrValue === null || attrValue === undefined) {
                    element.removeAttribute(attrName);
                } else {
                    element.setAttribute(attrName, String(attrValue));
                }
            }
    },

    _toDatasetKey(dataName) {
        let key = name.toLowerCase();
        if (key.startsWith("data-")) {
            key = key.slice(5);
        }
        // 3. Convert `-x` into `X` (camelCase transformation)
        key = key.replace(/-([a-z0-9])/g, (_, chr) => chr.toUpperCase());
        // 4. Remove any characters not allowed in dataset keys
        // (dataset keys must be valid JS identifiers, except they allow leading digits)
        return key.replace(/[^a-zA-Z0-9_$]/g, "");
    },

    _getElementAttributes(element) {
        const attrs = {};
        for(const attr of element.attributes) {
            attrs[attr.name] = attr.value;
        }
        return attrs;
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for use in other modules
if(typeof module !== 'undefined' && module.exports) {
    module.exports = OcPopulator;
}