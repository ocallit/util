class OcSelectUtil {

    constructor(selectElement) {
        this.selectElement = selectElement;
    }

    /**
     * Add a new option to a <select>
     * @param {string} optionValue
     * @param {string} optionText
     * @param {boolean} [selected=false]
     */
    optionAdd(optionValue, optionText, selected = false) {
        const newOption = new Option(optionText, optionValue, selected, selected);
        this.selectElement.add(newOption);
    }

    /**
     * Edit the label (text) of an option in a <select> by its value
     * @param {string} optionValue
     * @param {string} newOptionText
     */
    optionEdit(optionValue, newOptionText) {
        for (let i = 0; i < this.selectElement.options.length; i++) {
            if (this.selectElement.options[i].value === optionValue) {
                this.selectElement.options[i].text = newOptionText;
                return true; // edited successfully
            }
        }
        return false; // not found
    }

    /**
     * Delete an <option> from a <select> by its value
     * @param {string} optionValue
     */
    optionDelete( optionValue) {
        for(let i = 0; i < this.selectElement.options.length; i++) {
            if(this.selectElement.options[i].value == optionValue) {
                this.selectElement.remove(i);
                return true;
            }
        }
        return false;
    }

    updateSelect(newValueText) {

        const inTheSelect = {};
        const optionElements = {}; // Keep references to DOM elements
        Array.from(this.selectElement.options).forEach(opt => {
            if(opt.value) { // Skip empty "Select..." option
                inTheSelect[opt.value] = opt.textContent;
                optionElements[opt.value] = opt;
            }
        });

        // 3. Loop through newValueText
        for (const serverValue in newValueText) {
            const serverText = newValueText[serverValue];

            if (inTheSelect.hasOwnProperty(serverValue)) {
                // Value exists in select
                if (this.normalize(inTheSelect[serverValue]) !== this.normalize(serverText)) {
                    // Case 2: same value, different text -> change only the text
                    optionElements[serverValue].textContent = serverText;
                }
                // Case 1: same value, same text -> skip (do nothing)
            } else {
                // Case 3: value doesn't exist -> add new option
                const newOption = document.createElement('option');
                newOption.value = serverValue;
                newOption.textContent = serverText;
                this.selectElement.appendChild(newOption);
            }
        }

        // 4. Loop through inTheSelect and remove if not in newValueText
        for (const selectValue in inTheSelect) {
            if (!newValueText.hasOwnProperty(selectValue)) {
                optionElements[selectValue].remove();
            }
        }
    }
    
    normalize(text) {
        return String(text ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    optionIsUnique(text, excludeValue = null) {
        const normalized = this.normalize(String(text ?? ''));
        const exclude = excludeValue == null ? null : String(excludeValue);
        // .find() short-circuits on first match
        const dup = this.optionsToObjects().find(opt => {
            const val = String(opt.value);
            if (exclude !== null && val === exclude) return false;
            return this.normalize(String(opt.label ?? '')) === normalized;
        });
        return !dup; // true => unique, false => duplicate exists
    }

    /**
     * Convert a <select> element's options into an array of {value, label, selected}
     * @returns {{value:string, label:string, selected:boolean}[]}
     */
    optionsToObjects() {
        return Array.from(this.selectElement.options).map(opt => ({
            value: opt.value,           // falls back to text if no value attribute
            label: opt.text.trim(),     // visible text
            selected: opt.selected
        }));
    }

}

// Export for use in other modules
if(typeof module !== 'undefined' && module.exports) {
    module.exports = OcSelectUtil;
}
