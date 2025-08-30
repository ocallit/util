
/**
 * Stateless utility object for filling forms with data
 * Extracted from OcFormReadOnly for reusability
 */
const OcHtmlUtil = {
    /**
     * Fills form with values - main public method
     * @param {Element} form - DOM element containing the form
     * @param {Object|Array} values - Object mapping selectors to values or array format
     */
    fill(form, values) {
        if(typeof values === "undefined" || values == null) {
            return;
        }

        // Convert object to array format if needed
        let valueArray;
        if(Array.isArray(values)) {
            valueArray = values;
        } else if(typeof values === "object") {
            valueArray = Object.entries(values).map(([key, value]) => ({id: key, value: value}));
        } else {
            return;
        }

        for(const item of valueArray) {
            if(typeof item.id !== "string") {
                continue;
            }

            let selector = CSS.escape(item.id);
            let newValue = item.value ?? null;

            let element = form.querySelector("#" + selector);
            if(!element) {
                let radioToCheck = form.querySelector(`input[name="${selector}"][type="radio"][value="${newValue}"]`);
                if(radioToCheck) {
                    radioToCheck.checked = true;
                    continue;
                }
                continue;
            }

            if(newValue !== null) {
                switch(element.tagName.toLowerCase()) {
                    case 'input':
                        if(element.type === 'checkbox' || element.type === 'radio')
                            element.checked = element.value == newValue;
                        else
                            element.value = newValue;
                        break;
                    case 'textarea':
                        element.value = newValue;
                        break;
                    case 'select':
                        this.fillSelectElement(element, newValue);
                        break;
                    case 'ul':
                    case 'ol':
                        this.fillListElement(element, newValue);
                        break;
                    default:
                        element.innerHTML = newValue;
                }
            }

            if(typeof item.attributes === "object" && item.attributes !== null) {
                this.setElementAttributes(element, item.attributes);
            }
        }
    },

    /**
     * Fills select element with value(s)
     * @param {Element} element - Select element
     * @param {*} value - Value or array of values to select
     */
    fillSelectElement(element, value) {
        element.selectedIndex = -1;
        if(Array.isArray(value)) {
            for(const option of element.options) {
                if(value.some(val => option.value == val)) {
                    option.selected = true;
                }
            }
        } else {
            element.value = value;
        }
    },

    /**
     * Fills list elements (ul, ol) with support for nested arrays
     * @param {Element} element - List element (ul or ol)
     * @param {Array|string} value - Array of items or HTML string
     */
    fillListElement(element, value) {
        if (Array.isArray(value)) {
            const listItems = value.map(item => {
                // Handle ul and ol tags with nested array support
                if (Array.isArray(item)) {
                    // Create nested sub-list
                    const tagName = element.tagName.toLowerCase(); // ul or ol
                    const subItems = item.map(subItem => `<li>${subItem}</li>`).join('');
                    return `<li><${tagName}>${subItems}</${tagName}></li>`;
                } else {
                    return `<li>${item}</li>`;
                }
            }).join('');
            element.innerHTML = listItems;
        } else {
            element.innerHTML = value || '';
        }
    },

    /**
     * Sets attributes on an element
     * @param {Element} element - DOM element
     * @param {Object} attributes - Object with attribute name/value pairs
     */
    setElementAttributes(element, attributes) {
        Object.entries(attributes).forEach(([attrName, attrValue]) => {
            if (attrValue === null || attrValue === undefined) {
                element.removeAttribute(attrName);
            } else {
                element.setAttribute(attrName, attrValue);
            }
        });
    }
};

// Export for module systems or make globally available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OcHtmlUtil;
} else {
    window.OcHtmlUtil = OcHtmlUtil;
}
