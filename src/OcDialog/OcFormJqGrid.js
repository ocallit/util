

class OcFormJqGrid {

    constructor(jqGridSelector, htmlFormElement, options = {}) {
        this.config = { title: "Renglón", titleField: null, keepForm: true, ...options };
        this.$grid = $(jqGridSelector);
        this.htmlFormElement = htmlFormElement;

        this.currentRowId = null;
        this.formReader = null;
        this.isDialogSetup = false;
    }

    async showRow(rowId) {
        if (!this.isDialogSetup) {
            await this._instantiateForm(); // Shows dialog automatically
        }
        return this._showDialog(rowId);
    }

    /**
     * Close the dialog if open
     */
    close() {
        if (this.dialogElement && this.isOpen()) {
            this.dialogElement.close();
        }
    }

    /**
     * Check if dialog is currently open
     * @returns {boolean}
     */
    isOpen() {
        return this.isDialogSetup && this.dialogElement &&
            this.dialogElement.hasAttribute('open');
    }

    _showDialog(rowId) {
        this.currentRowId = rowId;
        const error = this._updateFormAndTitle(rowId);
        if (!error) {
            this.currentRowId = rowId;
        }
        return error;
    }

    /**
     * Generate dialog title - NEVER throw
     */
    _generateTitle(titleTemplate, rowData, titleField, $grid) {
        try {
            let title = titleTemplate || "Row Details";

            if (titleField && rowData[titleField]) {
                title += ` - ${rowData[titleField]}`;
            } else if (!titleField) {
                try {
                    const colModel = $grid.jqGrid('getGridParam', 'colModel');
                    const firstCol = colModel.find(col => !col.hidden && col.name !== 'rn' && col.name !== 'cb' && col.name !== '_rowId');
                    if (firstCol && rowData[firstCol.name]) {
                        title += ` - ${rowData[firstCol.name]}`;
                    }
                } catch (error) {
                    // Ignore title enhancement errors
                }
            }

            try {
                const allRowIds = $grid.jqGrid('getDataIDs');
                const currentIndex = allRowIds.indexOf(String(rowData._rowId));
                if (currentIndex !== -1) {
                    title += ` (${currentIndex + 1}/${allRowIds.length})`;
                }
            } catch (error) {
                // Ignore position info errors
            }

            return title;
        } catch (error) {
            return titleTemplate || "Row Details";
        }
    }

    _updateFormAndTitle(rowId) {
        const formattedValues = OcJqGridUtil.getFormattedRow(this.$grid, rowId);
        OcHtmlUtil.fill(this.htmlFormElement, formattedValues);
        
        const generatedTitle = this._generateTitle(
            this.config.title,
            formattedValues,
            this.config.titleField,
            this.$grid
        );
        const titleElement = this.dialogElement?.querySelector('.sch_dialog_title');
        if (titleElement) {
            titleElement.innerHTML = generatedTitle;
        }

        return ""; // Success
    }
    
    async _instantiateForm() {
        const buttons = [
            {
                label: '⏮ Primero',
                class: 'sch_dialog_button--secondary',
                callback: (e) => this._handleNavigation('first', e.target)
            },
            {
                label: '◀ Anterior',
                class: 'sch_dialog_button--secondary',
                callback: (e) => this._handleNavigation('prev', e.target)
            },
            {
                label: '▶ Siguiente',
                class: 'sch_dialog_button--primary',
                callback: (e) => this._handleNavigation('next', e.target)
            },
            {
                label: '⏭ Último',
                class: 'sch_dialog_button--secondary',
                callback: (e) => this._handleNavigation('last', e.target)
            }
        ];
        const dialogResult = OcDialog.dialog({
            title: '',
            html: this.htmlFormElement,
            buttons: buttons,
            keepHtml: this.config.keepForm
        });

        // Store dialog reference for form filling
        this.dialogElement = dialogResult.dialog;
        this.dialogPromise = dialogResult.promise;

        this.isDialogSetup = true;


    }

    /**
     * Handle navigation button clicks
     * @param {string} direction - 'first', 'prev', 'next', 'last'
     * @param {HTMLElement} button - Button element that was clicked
     */
    async _handleNavigation(direction, button) {
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '⏳ Cargando...';

        let nextRowId = null;
        switch(direction.toLowerCase()) {
            case 'first': nextRowId = OcJqGridUtil.firstRowId(this.$grid); break;
            case 'last': nextRowId = OcJqGridUtil.lastRowId(this.$grid); break;
            case 'prev': nextRowId = OcJqGridUtil.prevRowId(this.$grid,this.currentRowId); break;
            case 'next':
            default:
                nextRowId = OcJqGridUtil.nextRowId(this.$grid,this.currentRowId);
        }
        this._showDialog(nextRowId);
        button.innerHTML = originalText;
        button.disabled = false;

    }

}
