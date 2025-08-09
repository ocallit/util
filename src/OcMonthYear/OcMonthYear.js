
class OcMonthYear {
    constructor(element, config = {}) {
        this.element = element;
        this.minYear = config.minYear || 2020;
        this.maxYear = config.maxYear || new Date().getFullYear() + 1;

        // Scoped selectors using the provided element
        this.monthSelect = this.element.querySelector('[data-month-select]');
        this.yearInput = this.element.querySelector('[data-year-input]');
        this.yearDatalist = this.element.querySelector('[data-year-datalist]');
        this.hiddenField = this.element.querySelector('[data-hidden-field]');
        this.quickButtons = this.element.querySelectorAll('[data-quick]');

        // Bind event handlers to the class instance
        this.handleMonthChange = this.handleMonthChange.bind(this);
        this.handleYearInput = this.handleYearInput.bind(this);
        this.handleYearBlur = this.handleYearBlur.bind(this);
        this.handleYearKeyDown = this.handleYearKeyDown.bind(this);
        this.handleQuickSelectClick = this.handleQuickSelectClick.bind(this);

        this.init();
    }

    init() {
        // Defensive programming: remove listeners before adding to prevent duplicates
        this.removeEventListeners();
        this.populateYearDatalist();
        this.setCurrentDate();
        this.setupEventListeners();
        this.updateHiddenField();
    }

    // Public method to destroy the instance and clean up listeners
    destroy() {
        this.removeEventListeners();
    }

    populateYearDatalist() {
        this.yearDatalist.innerHTML = '';
        for (let year = this.maxYear; year >= this.minYear; year--) {
            const option = document.createElement('option');
            option.value = year;
            this.yearDatalist.appendChild(option);
        }
    }

    setCurrentDate() {
        const now = new Date();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        const currentYear = now.getFullYear();

        this.monthSelect.value = currentMonth;
        this.yearInput.value = currentYear;
    }

    setupEventListeners() {
        this.monthSelect.addEventListener('change', this.handleMonthChange);
        this.yearInput.addEventListener('input', this.handleYearInput);
        this.yearInput.addEventListener('blur', this.handleYearBlur);
        this.yearInput.addEventListener('keydown', this.handleYearKeyDown);

        this.quickButtons.forEach(button => {
            button.addEventListener('click', this.handleQuickSelectClick);
        });
    }

    removeEventListeners() {
        this.monthSelect.removeEventListener('change', this.handleMonthChange);
        this.yearInput.removeEventListener('input', this.handleYearInput);
        this.yearInput.removeEventListener('blur', this.handleYearBlur);
        this.yearInput.removeEventListener('keydown', this.handleYearKeyDown);

        this.quickButtons.forEach(button => {
            button.removeEventListener('click', this.handleQuickSelectClick);
        });
    }

    // Named event handlers
    handleMonthChange() {
        this.updateHiddenField();
    }

    handleYearInput() {
        this.yearInput.value = this.yearInput.value.replace(/[^0-9]/g, '');

        if (this.yearInput.value.length === 4) {
            this.validateYear();
        }

        this.updateHiddenField();
    }

    handleYearBlur() {
        this.validateYear();
    }

    handleYearKeyDown(e) {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.changeYear(1);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.changeYear(-1);
        }
    }

    handleQuickSelectClick(e) {
        this.handleQuickSelect(e.target.dataset.quick);
    }

    validateYear() {
        const year = parseInt(this.yearInput.value);

        if (isNaN(year) || year < this.minYear) {
            this.yearInput.value = this.minYear;
        } else if (year > this.maxYear) {
            this.yearInput.value = this.maxYear;
        }

        this.updateHiddenField();
    }

    changeYear(delta) {
        const currentYear = parseInt(this.yearInput.value) || new Date().getFullYear();
        const newYear = currentYear + delta;

        if (newYear >= this.minYear && newYear <= this.maxYear) {
            this.yearInput.value = newYear;
            this.updateHiddenField();
        }
    }

    handleQuickSelect(type) {
        const currentMonth = parseInt(this.monthSelect.value);
        const currentYear = parseInt(this.yearInput.value) || new Date().getFullYear();

        switch(type) {
            case 'current':
                const now = new Date();
                this.monthSelect.value = String(now.getMonth() + 1).padStart(2, '0');
                this.yearInput.value = now.getFullYear();
                break;
            case 'last':
                if (currentMonth === 1) {
                    this.monthSelect.value = '12';
                    const newYear = currentYear - 1;
                    this.yearInput.value = Math.max(newYear, this.minYear);
                } else {
                    this.monthSelect.value = String(currentMonth - 1).padStart(2, '0');
                }
                break;
            case 'next':
                if (currentMonth === 12) {
                    this.monthSelect.value = '01';
                    const newYear = currentYear + 1;
                    this.yearInput.value = Math.min(newYear, this.maxYear);
                } else {
                    this.monthSelect.value = String(currentMonth + 1).padStart(2, '0');
                }
                break;
        }

        this.updateHiddenField();
    }

    updateHiddenField() {
        const month = this.monthSelect.value;
        const year = this.yearInput.value || '';
        this.hiddenField.value = `${year}-${month}`;

        const event = new CustomEvent('monthYearChanged', {
            detail: {
                id: this.element.id,
                month: month,
                monthName: this.monthSelect.options[this.monthSelect.selectedIndex].text,
                year: year,
                formatted: this.hiddenField.value,
                monthyear: this.hiddenField.value,
                field: this.hiddenField.id || null
            }
        });
        document.dispatchEvent(event);
    }
}

// --- Universal Export/Global Code ---
// This code checks if a module environment exists and handles accordingly.
if (typeof module !== 'undefined' && typeof exports !== 'undefined') {
    // Export for Node.js or bundlers like Webpack (if used outside the browser).
    module.exports = { OcMonthYear };
} else {
    // Expose the class globally on the window object for legacy scripts.
    window.OcMonthYear = OcMonthYear;
}