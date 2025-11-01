/* File: asignar_permisos.js */
/* Vanilla JS — Tabulator + Tom Select + native <dialog>. No jQuery. */

(function () {
    var LS_KEY = "asignarPermisos.singleGrid.v1";

    // -------------------- Sample Data (replace with backend later) --------------------
    var SAMPLE = {
        roles: [
            { rol_id: 1, rol: "Administrador", descripcion: "Acceso completo" },
            { rol_id: 2, rol: "Operador", descripcion: "Opera pedidos" },
            { rol_id: 3, rol: "Analista", descripcion: "Lee reportes" }
        ],
        actividades: [
            { actividad_id: 10, actividad: "pedidos", descripcion: "Gestión de pedidos" },
            { actividad_id: 11, actividad: "productos", descripcion: "Catálogo" },
            { actividad_id: 12, actividad: "reportes", descripcion: "Reportes y KPIs" }
        ],
        actividad_permisos: [
            // pedidos
            { actividad_permiso_id: 1001, actividad_id: 10, permiso: "crear", etiqueta: "Crear" },
            { actividad_permiso_id: 1002, actividad_id: 10, permiso: "leer", etiqueta: "Leer" },
            { actividad_permiso_id: 1003, actividad_id: 10, permiso: "actualizar", etiqueta: "Actualizar" },
            { actividad_permiso_id: 1004, actividad_id: 10, permiso: "eliminar", etiqueta: "Eliminar" },
            // productos
            { actividad_permiso_id: 1101, actividad_id: 11, permiso: "leer", etiqueta: "Ver" },
            { actividad_permiso_id: 1102, actividad_id: 11, permiso: "actualizar", etiqueta: "Editar" },
            { actividad_permiso_id: 1103, actividad_id: 11, permiso: "publicar", etiqueta: "Publicar" },
            // reportes
            { actividad_permiso_id: 1201, actividad_id: 12, permiso: "leer", etiqueta: "Ver" },
            { actividad_permiso_id: 1202, actividad_id: 12, permiso: "exportar", etiqueta: "Exportar" }
        ],
        // asignaciones: Map<rol_id, Set<actividad_permiso_id>>
        asignaciones: {
            1: new Set([1001, 1002, 1003, 1004, 1101, 1102, 1103, 1201, 1202]), // Admin
            2: new Set([1002, 1003, 1101, 1201]), // Operador
            3: new Set([1201]) // Analista
        }
    };

    // -------------------- State & DOM --------------------
    var state = loadState() || SAMPLE;
    reviveSets();

    var el = {
        grid: document.getElementById("gridAssign"),
        txtSearch: document.getElementById("txtSearch"),
        btnNew: document.getElementById("btnNew"),
        btnImport: document.getElementById("btnImport"),
        btnExport: document.getElementById("btnExport"),
        btnReset: document.getElementById("btnReset"),
        // dialog
        dlg: document.getElementById("dlgAssign"),
        dlgTitle: document.getElementById("dlgTitle"),
        selRol: document.getElementById("selRol"),
        selAct: document.getElementById("selAct"),
        permSearch: document.getElementById("permSearch"),
        permList: document.getElementById("permList")
    };

    var grid;
    var tableReady = false;
    var tsRol, tsAct; // Tom Select instances
    var dialogMode = "new"; // "new" | "edit"
    var dialogPair = { rol_id: null, actividad_id: null }; // for edit mode

    // -------------------- Helpers (data) --------------------
    function reviveSets() {
        var keys = Object.keys(state.asignaciones || {});
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (!(state.asignaciones[k] instanceof Set)) {
                state.asignaciones[k] = new Set(state.asignaciones[k]);
            }
        }
    }

    function getPermsByActividad(actividad_id) {
        return state.actividad_permisos.filter(function (p) {
            return p.actividad_id === actividad_id;
        });
    }

    function getAssignedSetForRole(rol_id) {
        return state.asignaciones[rol_id] || new Set();
    }

    function getAssignedPermsForRoleActividad(rol_id, actividad_id) {
        var set = getAssignedSetForRole(rol_id);
        var all = getPermsByActividad(actividad_id).map(function (p) {
            return p.actividad_permiso_id;
        });
        var out = [];
        for (var i = 0; i < all.length; i++) {
            var id = all[i];
            if (set.has(id)) out.push(id);
        }
        return out; // array of actividad_permiso_id
    }

    function labelForPermId(id) {
        var p = state.actividad_permisos.find(function (x) {
            return x.actividad_permiso_id === id;
        });
        return p ? p.etiqueta : String(id);
    }

    // Build rows only for (rol, actividad) pairs that have at least one assigned permiso
    function buildRows() {
        var rows = [];
        for (var r = 0; r < state.roles.length; r++) {
            var role = state.roles[r];
            var set = getAssignedSetForRole(role.rol_id);
            if (!set || set.size === 0) continue;

            for (var a = 0; a < state.actividades.length; a++) {
                var act = state.actividades[a];
                var assignedIds = getAssignedPermsForRoleActividad(role.rol_id, act.actividad_id);
                if (assignedIds.length === 0) continue; // "If never assigned, no row"

                var allPerms = getPermsByActividad(act.actividad_id);
                var assignedLabels = assignedIds.map(labelForPermId);

                // For "Actividad tiene": split assigned/missing
                var actTieneAssigned = [];
                var actTieneMissing = [];
                for (var j = 0; j < allPerms.length; j++) {
                    var p = allPerms[j];
                    if (set.has(p.actividad_permiso_id)) {
                        actTieneAssigned.push(p.etiqueta);
                    } else {
                        actTieneMissing.push(p.etiqueta);
                    }
                }

                rows.push({
                    _rowKey: role.rol_id + "-" + act.actividad_id,
                    rol_id: role.rol_id,
                    rol: role.rol,
                    actividad_id: act.actividad_id,
                    actividad: act.actividad,
                    rolPuede: assignedLabels.slice(),
                    rolPuedeText: assignedLabels.join(", "),
                    actTieneAssigned: actTieneAssigned.slice(),
                    actTieneMissing: actTieneMissing.slice(),
                    actTieneText: actTieneAssigned.concat(actTieneMissing).join(", ")
                });
            }
        }
        return rows;
    }

    // -------------------- Grid --------------------
    grid = new Tabulator(el.grid, {
        data: buildRows(), // initial data
        layout: "fitColumns",
        reactiveData: false,
        height: "calc(70vh)",
        index: "_rowKey",
        columns: [
            { title: "#", formatter: "rownum", width: 50, hozAlign: "center", headerSort: false },
            {
                title: "Acciones",
                field: "_actions",
                width: 140,
                headerSort: false,
                headerHozAlign: "center",
                formatter: function (cell) {
                    var d = cell.getRow().getData();
                    var key = d._rowKey;
                    return (
                        '<button class="btn-icon" data-cmd="edit" data-key="' +
                        key +
                        '">✏️ Editar</button> ' +
                        '<button class="btn-icon" data-cmd="del" data-key="' +
                        key +
                        '">🗑️ Borrar</button>'
                    );
                }
            },
            { title: "Rol", field: "rol", sorter: "string", headerFilter: "input", widthGrow: 1 },
            { title: "Actividad", field: "actividad", sorter: "string", headerFilter: "input", widthGrow: 1 },
            {
                title: "Rol Puede",
                field: "rolPuedeText",
                sorter: "string",
                headerFilter: "input",
                widthGrow: 2,
                cssClass: "cell-chips",
                formatter: function (cell) {
                    var d = cell.getRow().getData();
                    if (!d.rolPuede || d.rolPuede.length === 0) return "";
                    var html = "";
                    for (var i = 0; i < d.rolPuede.length; i++) {
                        html += '<span class="chip ok">' + escapeHtml(d.rolPuede[i]) + "</span>";
                    }
                    return html;
                }
            },
            {
                title: "Actividad tiene",
                field: "actTieneText",
                sorter: "string",
                headerFilter: "input",
                widthGrow: 3,
                cssClass: "cell-chips",
                formatter: function (cell) {
                    var d = cell.getRow().getData();
                    var html = "";
                    for (var i = 0; i < d.actTieneAssigned.length; i++) {
                        html += '<span class="chip ok">' + escapeHtml(d.actTieneAssigned[i]) + "</span>";
                    }
                    for (var j = 0; j < d.actTieneMissing.length; j++) {
                        html += '<span class="chip missing">' + escapeHtml(d.actTieneMissing[j]) + "</span>";
                    }
                    return html;
                }
            }
        ]
    });

    grid.on("tableBuilt", function () {
        tableReady = true;
    });

    // Global search
    el.txtSearch.addEventListener("input", function () {
        var q = (el.txtSearch.value || "").trim().toLowerCase();
        if (!q) {
            grid.clearFilter(true);
            return;
        }
        grid.setFilter(function (data) {
            var hay =
                (data.rol || "").toLowerCase().indexOf(q) >= 0 ||
                (data.actividad || "").toLowerCase().indexOf(q) >= 0 ||
                (data.rolPuedeText || "").toLowerCase().indexOf(q) >= 0 ||
                (data.actTieneText || "").toLowerCase().indexOf(q) >= 0;
            return hay;
        });
    });

    // Actions (edit / delete)
    el.grid.addEventListener("click", function (ev) {
        var btn = ev.target.closest("button[data-cmd]");
        if (!btn) return;
        var cmd = btn.getAttribute("data-cmd");
        var key = btn.getAttribute("data-key"); // format "rolId-actividadId"
        if (!key) return;
        var parts = key.split("-");
        var rol_id = Number(parts[0]);
        var actividad_id = Number(parts[1]);

        if (cmd === "edit") {
            openDialogEdit(rol_id, actividad_id);
        } else if (cmd === "del") {
            if (confirm("Quitar todos los permisos de este Rol en esta Actividad?")) {
                removeAllForPair(rol_id, actividad_id);
                persist();
                refreshGrid();
            }
        }
    });

    function removeAllForPair(rol_id, actividad_id) {
        var set = getAssignedSetForRole(rol_id);
        var all = getPermsByActividad(actividad_id);
        for (var i = 0; i < all.length; i++) {
            set.delete(all[i].actividad_permiso_id);
        }
        state.asignaciones[rol_id] = set;
    }

    // -------------------- Toolbar Buttons --------------------
    el.btnNew.addEventListener("click", function () {
        openDialogNew();
    });

    el.btnExport.addEventListener("click", function () {
        var json = exportState();
        downloadText("asignaciones_" + Date.now() + ".json", json);
    });

    el.btnImport.addEventListener("click", async function () {
        var text = await pickFileAsText();
        if (!text) return;
        try {
            var obj = JSON.parse(text);
            if (obj && obj.asignaciones) {
                var keys = Object.keys(obj.asignaciones);
                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i];
                    obj.asignaciones[k] = new Set(obj.asignaciones[k]);
                }
            }
            Object.assign(state, obj);
            persist();
            refreshGrid(true);
            alert("Importado");
        } catch (e) {
            console.error(e);
            alert("JSON inválido");
        }
    });

    el.btnReset.addEventListener("click", function () {
        if (confirm("Esto borrará los datos locales. ¿Continuar?")) {
            localStorage.removeItem(LS_KEY);
            location.reload();
        }
    });

    // -------------------- Dialog (New / Edit) --------------------
    // Init Tom Select once
    tsRol = new TomSelect(el.selRol, {
        maxItems: 1,
        persist: false,
        options: state.roles.map(function (r) {
            return { value: String(r.rol_id), text: r.rol };
        })
    });

    tsAct = new TomSelect(el.selAct, {
        maxItems: 1,
        persist: false,
        options: state.actividades.map(function (a) {
            return { value: String(a.actividad_id), text: a.actividad };
        })
    });

    el.permSearch.addEventListener("input", function () {
        var q = (el.permSearch.value || "").trim().toLowerCase();
        var items = el.permList.children;
        for (var i = 0; i < items.length; i++) {
            var li = items[i];
            var txt = (li.textContent || "").toLowerCase();
            li.style.display = txt.indexOf(q) >= 0 ? "" : "none";
        }
    });

    // Dialog footer buttons
    el.dlg.querySelector('[data-action="close"]').onclick = function () {
        closeDialog();
    };
    el.dlg.querySelector('[data-action="save"]').onclick = function () {
        saveDialog();
    };

    function openDialogNew() {
        dialogMode = "new";
        dialogPair.rol_id = null;
        dialogPair.actividad_id = null;

        el.dlgTitle.textContent = "Nuevo";
        tsRol.clear(true);
        tsAct.clear(true);
        tsRol.enable();
        tsAct.enable();

        el.permSearch.value = "";
        el.permList.innerHTML = ""; // waits until both selects chosen

        // When user selects rol/actividad, build list
        tsRol.off("change");
        tsAct.off("change");
        tsRol.on("change", rebuildPermListFromDialogSelects);
        tsAct.on("change", rebuildPermListFromDialogSelects);

        openDialog();
    }

    function openDialogEdit(rol_id, actividad_id) {
        dialogMode = "edit";
        dialogPair.rol_id = rol_id;
        dialogPair.actividad_id = actividad_id;

        el.dlgTitle.textContent = "Editar";
        tsRol.setValue(String(rol_id), true);
        tsAct.setValue(String(actividad_id), true);
        tsRol.disable();
        tsAct.disable();

        el.permSearch.value = "";
        buildPermList(actividad_id, getAssignedPermsForRoleActividad(rol_id, actividad_id));

        // In edit we don't need change handlers on selects
        tsRol.off("change");
        tsAct.off("change");

        openDialog();
    }

    function rebuildPermListFromDialogSelects() {
        var rid = tsRol.getValue();
        var aid = tsAct.getValue();
        if (!rid || !aid) {
            el.permList.innerHTML = "";
            return;
        }
        var rol_id = Number(rid);
        var actividad_id = Number(aid);
        var assigned = getAssignedPermsForRoleActividad(rol_id, actividad_id);
        buildPermList(actividad_id, assigned);
    }

    function buildPermList(actividad_id, assignedIdsArray) {
        var assignedSet = new Set(assignedIdsArray || []);
        var perms = getPermsByActividad(actividad_id);
        var html = "";
        for (var i = 0; i < perms.length; i++) {
            var p = perms[i];
            var checked = assignedSet.has(p.actividad_permiso_id) ? "checked" : "";
            html +=
                '<li class="ocAsignar_perm_item" data-id="' +
                p.actividad_permiso_id +
                '">' +
                '<label style="display:flex; gap:8px; align-items:flex-start; cursor:pointer;">' +
                '<input type="checkbox" ' +
                checked +
                ' data-id="' +
                p.actividad_permiso_id +
                '"/>' +
                "<div>" +
                "<div><strong>" +
                escapeHtml(p.etiqueta) +
                "</strong> <span class=\"ocAsignar_perm_code\">(" +
                escapeHtml(p.permiso) +
                ")</span></div>" +
                '<div class="ocAsignar_hint">ID: ' +
                p.actividad_permiso_id +
                "</div>" +
                "</div>" +
                "</label>" +
                "</li>";
        }
        el.permList.innerHTML = html;
    }

    function openDialog() {
        try {
            el.dlg.showModal();
        } catch (e) {
            el.dlg.setAttribute("open", "");
        }
    }
    function closeDialog() {
        try {
            el.dlg.close();
        } catch (e) {
            el.dlg.removeAttribute("open");
        }
    }

    function saveDialog() {
        // Determine pair
        var rid = dialogMode === "edit" ? String(dialogPair.rol_id) : tsRol.getValue();
        var aid = dialogMode === "edit" ? String(dialogPair.actividad_id) : tsAct.getValue();
        if (!rid || !aid) {
            alert("Seleccione Rol y Actividad");
            return;
        }
        var rol_id = Number(rid);
        var actividad_id = Number(aid);

        // Gather checked
        var checks = el.permList.querySelectorAll('input[type="checkbox"][data-id]');
        var nextIds = [];
        for (var i = 0; i < checks.length; i++) {
            var ch = checks[i];
            if (ch.checked) nextIds.push(Number(ch.getAttribute("data-id")));
        }

        // Update set for role (only for this activity)
        var set = getAssignedSetForRole(rol_id);
        var allIds = getPermsByActividad(actividad_id).map(function (p) {
            return p.actividad_permiso_id;
        });

        // Remove all for this activity
        for (var j = 0; j < allIds.length; j++) set.delete(allIds[j]);
        // Add chosen
        for (var k = 0; k < nextIds.length; k++) set.add(nextIds[k]);

        state.asignaciones[rol_id] = set;
        persist();
        refreshGrid();
        closeDialog();
    }

    // -------------------- Persistence --------------------
    function persist() {
        var serializable = JSON.parse(
            JSON.stringify(state, function (k, v) {
                return v instanceof Set ? Array.from(v) : v;
            })
        );
        localStorage.setItem(LS_KEY, JSON.stringify(serializable));
    }

    function loadState() {
        try {
            var text = localStorage.getItem(LS_KEY);
            if (!text) return null;
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    }

    function exportState() {
        return JSON.stringify(
            JSON.parse(
                JSON.stringify(state, function (k, v) {
                    return v instanceof Set ? Array.from(v) : v;
                })
            ),
            null,
            2
        );
    }

    // -------------------- Utilities --------------------
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function downloadText(filename, text) {
        var blob = new Blob([text], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function pickFileAsText() {
        return new Promise(function (resolve) {
            var input = document.createElement("input");
            input.type = "file";
            input.accept = ".json,application/json";
            input.onchange = async function () {
                var file = input.files && input.files[0];
                if (!file) return resolve(null);
                var text = await file.text();
                resolve(text);
            };
            input.click();
        });
    }

    function refreshGrid() {
        if (!tableReady) return; // avoid calling setData before built
        grid.setData(buildRows());
    }

    // No final refreshAll() call needed; initial data is in the constructor.
})();
