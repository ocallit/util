/*! OcCategoUI.js - vanilla JS + jQuery + jQuery UI only
 *  Multiple independent instances per page. No central management.
 *  All public symbols are prefixed with OcCategoUI_.
 */
(function (global, $) {
    "use strict";

    var OcCategoUI_uid = 0;

    // Public stateless factory on window
    global.OcCategoUI_create = function (options) {
        // options: { select, editButton }
        var $select = $(options.select);
        var $button = $(options.editButton);
        if ($select.length === 0 || $button.length === 0) {
            throw new Error("OcCategoUI_create: missing select or editButton");
        }

        var id = ++OcCategoUI_uid;
        var instance = OcCategoUI_makeInstance($select, $button, id);
        $button.data("OcCategoUI_instance", instance);
        return instance.api; // expose minimal API
    };

    function OcCategoUI_makeInstance($select, $button, uid) {
        var domId = "OcCategoUI_" + uid;
        var $dialog = null;
        var $search, $list, $addText;

        // ---- helpers ----
        function _ts() {
            var el = $select[0];
            return el && el.tomselect ? el.tomselect : null;
        }
        function _getOptionsInOrder() {
            var arr = [];
            $select.find("option").each(function () {
                var $opt = $(this);
                arr.push({
                    value: String($opt.attr("value") ?? ""),
                    text: $opt.text(),
                    disabled: $opt.prop("disabled") === true
                });
            });
            return arr;
        }
        function _cssEscape(v) {
            if (global.CSS && CSS.escape) return CSS.escape(String(v));
            // minimal fallback
            return String(v).replace(/["\\\]]/g, "\\$&");
        }
        function _findOptionByValue(value) {
            return $select.find('option[value="' + _cssEscape(value) + '"]');
        }

        // ---- render list (LABEL ONLY; no value shown) ----
        function _renderList(filter) {
            var f = (filter || "").trim().toLowerCase();
            $list.html(""); // ensure fully cleared

            var options = _getOptionsInOrder(); // ALWAYS from DOM
            options.forEach(function (opt /*, idx */) {
                // search by label only (value is internal)
                if (f && opt.text.toLowerCase().indexOf(f) === -1) return;

                var $row  = $('<li class="OcCategoUI_row" />');
                var $left = $('<div class="OcCategoUI_texts" />')
                    .append($('<span class="OcCategoUI_label" />').text(opt.text));

                var $btns = $('<div class="OcCategoUI_rowBtns" />');
                var $edit = $('<button type="button">Edit</button>');
                var $del  = $('<button type="button">Delete</button>');

                // use VALUE as stable key (safe even under filtering)
                $edit.on("click", function () { _editOption(opt.value, opt.text); });
                $del.on("click",  function () {
                    if(confirm("Seguro de borrar: " + opt.text))
                        _deleteOption(opt.value);
                });

                $btns.append($edit, $del);
                $row.append($left, $btns);
                $list.append($row);
            });
        }

        function _preserveSelection() {
            var ts = _ts();
            if (ts) {
                var current = ts.getValue();
                return Array.isArray(current) ? current.slice() : (current ? [current] : []);
            }
            return $select.val() ? [].concat($select.val()) : [];
        }
        function _restoreSelection(savedValues) {
            var existing = new Set(_getOptionsInOrder().map(function (o) { return String(o.value); }));
            var keep = savedValues.filter(function (v) { return existing.has(String(v)); });
            var ts = _ts();
            if (ts) ts.setValue(keep, true); else $select.val(keep);
        }
        function _rebuildTomSelectFromDom() {
            var ts = _ts();
            if (!ts) return;
            ts.clearOptions();
            _getOptionsInOrder().forEach(function (o) { ts.addOption({ value: o.value, text: o.text }); });
            ts.refreshOptions(false);
            ts.refreshItems();
            ts.sync();
        }

        // Single, centralized UI refresh after any mutation (prevents duplicate paints)
        function _applyToDom(updateFn) {
            var saved = _preserveSelection();
            try { updateFn(); } catch (e) { console.error(e); }
            $("#mySelect")[0].tomselect.sync()
            //if ($search) _renderList($search.val()); // repaint dialog exactly once
        }

        // ---- actions (value-keyed; no index reliance) ----
        function _editOption(value, currentText) {
            // Only edit LABEL (text). Value is NOT editable and not shown.
            var $row = $('<div title="Edit option" class="OcCategoUI_editRow"/>');
            var $t = $('<input type="text" class="OcCategoUI_input" />')
                .val(currentText).attr("aria-label", "Label");
            $row.append($('<div class="OcCategoUI_srOnly">Label</div>'), $t);

            $row.dialog({
                modal: true,
                width: 420,
                buttons: [
                    {
                        text: "Save",
                        click: function () {
                            var newText = String($t.val() || "");
                            if (newText === "") { alert("Label cannot be empty"); return; }

                            _applyToDom(function () {
                                var $opt = _findOptionByValue(value);
                                if ($opt.length) $opt.text(newText);
                            });

                            $(this).dialog("close");
                        }
                    },
                    { text: "Cancel", click: function () { $(this).dialog("close"); } }
                ],
                close: function () {
                    try { $(this).dialog("destroy"); } catch (e) { console.error(e); }
                    $(this).remove();
                }
            });
        }

        function _slugifyLabel(label) {
            var s = String(label).trim().toLowerCase();
            s = s.normalize ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : s;
            s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
            if (s === "") s = "item";
            return s;
        }
        function _uniqueValueFromLabel(label) {
            var base = _slugifyLabel(label);
            var v = base, i = 2;
            while (_findOptionByValue(v).length > 0) v = base + "-" + i++;
            return v;
        }
        function _addOption(label) {
            _applyToDom(function () {
                var value = _uniqueValueFromLabel(label);
                $select.append($("<option/>").attr("value", value).text(String(label)));
            });
        }

        // Delete even if selected (no confirmation). Value-keyed.
        function _deleteOption(value) {
            _applyToDom(function () {
                var ts = _ts();
                if (ts) {
                    if (Array.isArray(ts.items) && ts.items.indexOf(String(value)) !== -1) {
                        ts.removeItem(String(value), true); // silent
                    }
                    ts.removeOption(String(value));
                }
                _findOptionByValue(value).remove();
            });
        }

        // ---- dialog lifecycle (always fresh; no cache) ----
        function _openDialog() {
            // Destroy any existing dialog to guarantee a clean slate
            if ($dialog) {
                try { $dialog.dialog("destroy"); } catch (e) { console.error(e); }
                $dialog.remove();
                $dialog = null;
            }

            $dialog = $('<div class="OcCategoUI_dialog" id="' + domId + '_dlg" title="Edit options"></div>');
            var $toolbar = $('<div class="OcCategoUI_toolbar"></div>');
            $search = $('<input type="search" class="OcCategoUI_search" placeholder="Search label...">');
            $toolbar.append($search);

            $list = $('<ul class="OcCategoUI_list" aria-label="Options list"></ul>');

            var $addRow = $('<div class="OcCategoUI_addForm"></div>');
            $addText  = $('<input type="text" class="OcCategoUI_input" placeholder="New label">');
            var $addBtn = $('<button type="button">Add</button>');
            $addBtn.on("click", function () {
                var t = String($addText.val() || "");
                if (!t) { alert("Label cannot be empty"); return; }
                _addOption(t);       // _applyToDom will repaint the list
                $addText.val("");
            });
            $addRow.append($addText, $addBtn);

            $dialog.append($toolbar, $list, $addRow);

            $search.on("input", function () { _renderList($(this).val()); });

            // First paint (fresh read from DOM)
            _renderList("");

            $dialog.dialog({
                modal: true,
                width: 560,
                closeOnEscape: true,
                create: function () { setTimeout(function () { $search.trigger("focus"); }, 0); },
                close: function () {
                    try { $dialog.dialog("destroy"); } catch (e) { console.error(e); }
                    $dialog.remove();
                    $dialog = null;
                }
            });
        }

        // Bind edit button once
        $button.off(".OcCategoUI").on("click.OcCategoUI", _openDialog);

        // Public mini-API (per instance)
        var api = {
            OcCategoUI_open: _openDialog,
            OcCategoUI_refresh: function () { if ($dialog) _renderList($search.val()); },
            OcCategoUI_destroy: function () {
                $button.off(".OcCategoUI").removeData("OcCategoUI_instance");
                if ($dialog) {
                    try { $dialog.dialog("destroy"); } catch (e) { console.error(e); }
                    $dialog.remove();
                }
            }
        };

        return { api: api };
    }

})(window, jQuery);
