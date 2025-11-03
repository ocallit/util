/* File: asignar_permisos.js  */

(function () {
    var LS_KEY = "asignarPermisos.singleGrid.v5";

    var SAMPLE = {
        roles: [
            { rol_id: 1, rol: "Administrador", descripcion: "Acceso completo a todo el sistema" },
            { rol_id: 2, rol: "Operador",      descripcion: "Opera pedidos: lectura y actualización de estado" },
            { rol_id: 3, rol: "Analista",      descripcion: "Consulta reportes y exportaciones" }
        ],
        actividades: [
            { actividad_id: 10, actividad: "pedidos",   descripcion: "Gestión de pedidos" },
            { actividad_id: 11, actividad: "productos", descripcion: "Catálogo de productos" },
            { actividad_id: 12, actividad: "reportes",  descripcion: "Reportes y KPIs del negocio" }
        ],
        actividad_permisos: [
            { actividad_permiso_id: 1001, actividad_id: 10, permiso: "crear",      etiqueta: "Crear" },
            { actividad_permiso_id: 1002, actividad_id: 10, permiso: "leer",       etiqueta: "Leer" },
            { actividad_permiso_id: 1003, actividad_id: 10, permiso: "actualizar", etiqueta: "Actualizar" },
            { actividad_permiso_id: 1004, actividad_id: 10, permiso: "eliminar",   etiqueta: "Eliminar" },
            { actividad_permiso_id: 1101, actividad_id: 11, permiso: "leer",       etiqueta: "Ver" },
            { actividad_permiso_id: 1102, actividad_id: 11, permiso: "actualizar", etiqueta: "Editar" },
            { actividad_permiso_id: 1103, actividad_id: 11, permiso: "publicar",   etiqueta: "Publicar" },
            { actividad_permiso_id: 1201, actividad_id: 12, permiso: "leer",       etiqueta: "Ver" },
            { actividad_permiso_id: 1202, actividad_id: 12, permiso: "exportar",   etiqueta: "Exportar" }
        ],
        // Map<rol_id, Set<actividad_permiso_id>>
        asignaciones: {
            1: new Set([1001, 1002, 1003, 1004, 1101, 1102, 1103, 1201, 1202]),
            2: new Set([1002, 1003, 1101, 1201]),
            3: new Set([1201])
        },
        // List of {rol_id, actividad_id} pairs that must have a row, even if 0 permisos:
        rowPairs: []
    };

    var state = loadState() || SAMPLE;
    reviveSets();
    initRowPairsFromAsignaciones(); // ensure rowPairs exists & is populated

    var el = {
        grid:       document.getElementById("gridAssign"),
        txtSearch:  document.getElementById("txtSearch"),
        btnNew:     document.getElementById("btnNew"),
        btnExport:  document.getElementById("btnExport"),
        dlg:        document.getElementById("dlgAssign"),
        dlgTitle:   document.getElementById("dlgTitle"),
        selRol:     document.getElementById("selRol"),
        selAct:     document.getElementById("selAct"),
        permSearch: document.getElementById("permSearch"),
        permList:   document.getElementById("permList"),
        dlgInfo:      document.getElementById("dlgInfo"),
        dlgInfoTitle: document.getElementById("dlgInfoTitle"),
        dlgInfoText:  document.getElementById("dlgInfoText")
    };

    var grid;
    var tableReady = false;
    var tsRol, tsAct;
    var dialogMode = "new";
    var dialogPair = { rol_id: null, actividad_id: null };
    var isEditMode = getInitialModeFromUrl(); // ?mode=edit

    grid = new Tabulator(el.grid, {
        data: buildRows(),
        layout: "fitColumns",
        reactiveData: false,
        height: "calc(70vh)",
        index: "_rowKey",
        columns: [
            { title: "#", formatter: "rownum", width: 50, hozAlign: "center", headerSort: false },

            {
                title: "Rol",
                field: "rol",
                sorter: "string",
                headerFilter: "input",
                widthGrow: 1,
                formatter: function (cell) {
                    var d = cell.getRow().getData();
                    return (
                        '<span class="info-badge" data-kind="rol" title="Ver descripción">i</span>' +
                        '<span class="rol-text">' + escapeHtml(d.rol) + '</span>'
                    );
                },
                cellClick: function (e, cell) {
                    if (!e.target.closest(".info-badge")) return;
                    onRolCellClick(e, cell);
                },
                formatterExport: function (cell) { return cell.getRow().getData().rol || ""; }
            },

            {
                title: "Actividad",
                field: "actividad",
                sorter: "string",
                headerFilter: "input",
                widthGrow: 1,
                formatter: function (cell) {
                    var d = cell.getRow().getData();
                    return (
                        '<span class="info-badge" data-kind="actividad" title="Ver descripción">i</span>' +
                        '<span class="actividad-text">' + escapeHtml(d.actividad) + '</span>'
                    );
                },
                cellClick: function (e, cell) {
                    if (!e.target.closest(".info-badge")) return;
                    onActividadCellClick(e, cell);
                },
                formatterExport: function (cell) { return cell.getRow().getData().actividad || ""; }
            },

            {
                title: "Rol Puede",
                field: "rolPuedeText",
                sorter: "string",
                headerFilter: "input",
                widthGrow: 2,
                cssClass: "cell-chips",
                formatter: function (cell) {
                    var d = cell.getRow().getData();
                    if (!d.rolPuede || !d.rolPermIds) return "";

                    if (!isEditMode) {
                        // READ-ONLY: plain text "Crear, Leer, Actualizar"
                        return escapeHtml(d.rolPuede.join(", "));
                    }

                    // EDIT: clickable chips (click => remove permiso)
                    var html = "";
                    for (var i = 0; i < d.rolPuede.length; i++) {
                        var label = d.rolPuede[i];
                        var apid  = d.rolPermIds[i];
                        if (!apid) continue;
                        html +=
                            '<span class="chip ok" ' +
                            'data-type="rol" data-assigned="1" ' +
                            'data-rol-id="' + d.rol_id + '" ' +
                            'data-act-id="' + d.actividad_id + '" ' +
                            'data-apid="' + apid + '">' +
                            escapeHtml(label) +
                            "</span>";
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

                    if (!isEditMode) {
                        // READ-ONLY: assigned in bold, missing normal
                        var parts = [];
                        for (var i = 0; i < d.actTieneAssigned.length; i++) {
                            parts.push("<strong>" + escapeHtml(d.actTieneAssigned[i]) + "</strong>");
                        }
                        for (var j = 0; j < d.actTieneMissing.length; j++) {
                            parts.push(escapeHtml(d.actTieneMissing[j]));
                        }
                        return parts.join(", ");
                    }

                    // EDIT: clickable chips (click => toggle)
                    var html = "";
                    // assigned
                    for (var k = 0; k < d.actTieneAssigned.length; k++) {
                        var labelA = d.actTieneAssigned[k];
                        var apidA  = d.actTieneAssignedIds[k];
                        html +=
                            '<span class="chip ok" ' +
                            'data-type="act" data-assigned="1" ' +
                            'data-rol-id="' + d.rol_id + '" ' +
                            'data-act-id="' + d.actividad_id + '" ' +
                            'data-apid="' + apidA + '">' +
                            escapeHtml(labelA) +
                            "</span>";
                    }
                    // missing
                    for (var m = 0; m < d.actTieneMissing.length; m++) {
                        var labelM = d.actTieneMissing[m];
                        var apidM  = d.actTieneMissingIds[m];
                        html +=
                            '<span class="chip missing" ' +
                            'data-type="act" data-assigned="0" ' +
                            'data-rol-id="' + d.rol_id + '" ' +
                            'data-act-id="' + d.actividad_id + '" ' +
                            'data-apid="' + apidM + '">' +
                            escapeHtml(labelM) +
                            "</span>";
                    }
                    return html;
                }
            }
        ]
    });

    grid.on("tableBuilt", function () { tableReady = true; });

    // -------------------- Grid interactions: chips only --------------------
    el.grid.addEventListener("click", function (ev) {
        if (!isEditMode) return;
        var chip = ev.target.closest(".chip");
        if (chip) handleChipClick(chip);
    });

    function handleChipClick(chip) {
        var rolId = Number(chip.getAttribute("data-rol-id"));
        var actId = Number(chip.getAttribute("data-act-id"));
        var apid  = Number(chip.getAttribute("data-apid"));
        if (!rolId || !actId || !apid) return;

        var type = chip.getAttribute("data-type") || "";
        var assignedAttr = chip.getAttribute("data-assigned");
        var currentlyAssigned = assignedAttr === "1";

        var newAssigned;
        if (type === "rol") {
            // (2) Rol Puede -> clicking removes permiso
            newAssigned = false;
        } else {
            // Actividad tiene -> toggle
            newAssigned = !currentlyAssigned;
        }

        applyPermissionToggle(chip, rolId, actId, apid, newAssigned);
    }

    // -------------------- Toolbar --------------------
    el.txtSearch.addEventListener("input", function () {
        var q = (el.txtSearch.value || "").trim().toLowerCase();
        if (!q) {
            grid.clearFilter(true);
            return;
        }
        grid.setFilter(function (data) {
            return (
                (data.rol || "").toLowerCase().indexOf(q) >= 0 ||
                (data.actividad || "").toLowerCase().indexOf(q) >= 0 ||
                (data.rolPuedeText || "").toLowerCase().indexOf(q) >= 0 ||
                (data.actTieneText || "").toLowerCase().indexOf(q) >= 0
            );
        });
    });

    el.btnNew.addEventListener("click", function () {
        if (!isEditMode) return;
        openDialogNew();
    });

    el.btnExport.addEventListener("click", function () {
        var csv = buildAssignmentsCSV();
        downloadText("asignaciones_" + Date.now() + ".csv", csv, "text/csv");
    });

    // -------------------- Edit/New dialog --------------------
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

    var closeBtns = el.dlg.querySelectorAll('[data-action="close"]');
    for (var i = 0; i < closeBtns.length; i++) {
        closeBtns[i].addEventListener("click", function (e) {
            e.preventDefault();
            closeMainDialog();
        });
    }
    el.dlg.addEventListener("cancel", function (e) {
        e.preventDefault();
        closeMainDialog();
    });

    el.dlg.querySelector('[data-action="save"]').addEventListener("click", function () {
        saveDialog();
    });

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
        el.permList.innerHTML = "";

        tsRol.off("change"); tsAct.off("change");
        tsRol.on("change", rebuildPermListFromSelects);
        tsAct.on("change", rebuildPermListFromSelects);

        openMainDialog();
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

        tsRol.off("change"); tsAct.off("change");

        openMainDialog();
    }

    function rebuildPermListFromSelects() {
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
                '<li class="ocAsignar_perm_item" data-id="' + p.actividad_permiso_id + '">' +
                '<label style="display:flex; gap:8px; align-items:flex-start; cursor:pointer;">' +
                '<input type="checkbox" ' + checked + ' data-id="' + p.actividad_permiso_id + '"/>' +
                '<div>' +
                '<div><strong>' + escapeHtml(p.etiqueta) + '</strong> ' +
                '<span class="ocAsignar_perm_code">(' + escapeHtml(p.permiso) + ')</span>' +
                '</div>' +
                '</div>' +
                '</label>' +
                '</li>';
        }
        el.permList.innerHTML = html;
    }

    function openMainDialog() {
        try { el.dlg.showModal(); } catch (e) { el.dlg.setAttribute("open", ""); }
    }
    function closeMainDialog() {
        try { el.dlg.close(); } catch (e) { el.dlg.removeAttribute("open"); }
    }

    function saveDialog() {
        var rid = dialogMode === "edit" ? String(dialogPair.rol_id) : tsRol.getValue();
        var aid = dialogMode === "edit" ? String(dialogPair.actividad_id) : tsAct.getValue();
        if (!rid || !aid) {
            alert("Seleccione Rol y Actividad");
            return;
        }
        var rol_id = Number(rid);
        var actividad_id = Number(aid);

        var checks = el.permList.querySelectorAll('input[type="checkbox"][data-id]');
        var nextIds = [];
        for (var i = 0; i < checks.length; i++) {
            var ch = checks[i];
            if (ch.checked) nextIds.push(Number(ch.getAttribute("data-id")));
        }

        callResponder({
            accion: "guardar_permiso_actividad",
            rol_id: rol_id,
            actividad_id: actividad_id,
            permisos: nextIds.slice()
        }).then(function () {
            var set = getAssignedSetForRole(rol_id);
            var allIds = getPermsByActividad(actividad_id).map(function (p) { return p.actividad_permiso_id; });
            for (var j = 0; j < allIds.length; j++) set.delete(allIds[j]);
            for (var k = 0; k < nextIds.length; k++) set.add(nextIds[k]);

            state.asignaciones[rol_id] = set;
            addRowPair(rol_id, actividad_id);        // (1) keep row even if no permisos
            persist();
            refreshGrid();
            closeMainDialog();
        }).catch(function (err) {
            console.error(err);
            alert("No se pudo guardar los permisos.");
        });
    }

    // -------------------- Inline chip + responder --------------------
    function applyPermissionToggle(chipEl, rolId, actId, apid, newAssigned) {
        chipEl.classList.add("chip--pending");

        callResponder({
            accion: "toggle_perm",
            rol_id: rolId,
            actividad_id: actId,
            actividad_permiso_id: apid,
            nuevo_estado: newAssigned ? 1 : 0
        }).then(function () {
            chipEl.classList.remove("chip--pending");

            var set = getAssignedSetForRole(rolId);
            if (newAssigned) set.add(apid);
            else set.delete(apid);

            state.asignaciones[rolId] = set;
            addRowPair(rolId, actId);               // (1) never drop the row
            persist();
            refreshGrid();
        }).catch(function (err) {
            console.error(err);
            chipEl.classList.remove("chip--pending");
            alert("No se pudo actualizar el permiso.");
        });
    }

    function callResponder(payload) {
        // Only front-end stub for now.
        // payload.accion ∈ { "toggle_perm", "guardar_permiso_actividad" }
        return new Promise(function (resolve) {
            setTimeout(resolve, 120);
        });
    }

    // -------------------- Info dialog --------------------
    function findRol(rol_id) {
        return state.roles.find(function (r) { return r.rol_id === rol_id; });
    }
    function findActividad(actividad_id) {
        return state.actividades.find(function (a) { return a.actividad_id === actividad_id; });
    }

    function onRolCellClick(e, cell) {
        var d = cell.getRow().getData();
        var r = findRol(d.rol_id);
        openInfoDialog(
            "Rol: " + (r ? r.rol : d.rol),
            r && r.descripcion ? r.descripcion : "Sin descripción"
        );
    }

    function onActividadCellClick(e, cell) {
        var d = cell.getRow().getData();
        var a = findActividad(d.actividad_id);
        openInfoDialog(
            "Actividad: " + (a ? a.actividad : d.actividad),
            a && a.descripcion ? a.descripcion : "Sin descripción"
        );
    }

    function openInfoDialog(title, text) {
        el.dlgInfoTitle.textContent = title || "Información";
        el.dlgInfoText.textContent = text || "";
        try { el.dlgInfo.showModal(); } catch (e) { el.dlgInfo.setAttribute("open", ""); }
    }

    (function bindInfoDialogClose() {
        var btns = document.querySelectorAll('[data-action="close-info"]');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener("click", function (e) {
                e.preventDefault();
                closeInfoDialog();
            });
        }
        el.dlgInfo.addEventListener("cancel", function (e) {
            e.preventDefault();
            closeInfoDialog();
        });

        function closeInfoDialog() {
            try { el.dlgInfo.close(); } catch (e) { el.dlgInfo.removeAttribute("open"); }
        }
    })();

    // -------------------- Data helpers --------------------
    function reviveSets() {
        var keys = Object.keys(state.asignaciones || {});
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (!(state.asignaciones[k] instanceof Set)) {
                state.asignaciones[k] = new Set(state.asignaciones[k]);
            }
        }
        if (!state.rowPairs) state.rowPairs = [];
    }

    function addRowPair(rol_id, actividad_id) {
        if (!state.rowPairs) state.rowPairs = [];
        for (var i = 0; i < state.rowPairs.length; i++) {
            var p = state.rowPairs[i];
            if (p.rol_id === rol_id && p.actividad_id === actividad_id) return;
        }
        state.rowPairs.push({ rol_id: rol_id, actividad_id: actividad_id });
    }

    function initRowPairsFromAsignaciones() {
        if (!state.rowPairs || state.rowPairs.length === 0) {
            state.rowPairs = [];
            var roleIds = Object.keys(state.asignaciones);
            for (var i = 0; i < roleIds.length; i++) {
                var rid = Number(roleIds[i]);
                var set = state.asignaciones[rid];
                set.forEach(function (apid) {
                    var p = state.actividad_permisos.find(function (x) { return x.actividad_permiso_id === apid; });
                    if (p) addRowPair(rid, p.actividad_id);
                });
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
        var all = getPermsByActividad(actividad_id).map(function (p) { return p.actividad_permiso_id; });
        var out = [];
        for (var i = 0; i < all.length; i++) {
            var id = all[i];
            if (set.has(id)) out.push(id);
        }
        return out;
    }

    function labelForPermId(id) {
        var p = state.actividad_permisos.find(function (x) { return x.actividad_permiso_id === id; });
        return p ? p.etiqueta : String(id);
    }

    function buildRows() {
        var rows = [];
        var pairs = (state.rowPairs || []).slice();

        // sort by rol_id then actividad_id for a stable order
        pairs.sort(function (a, b) {
            if (a.rol_id === b.rol_id) return a.actividad_id - b.actividad_id;
            return a.rol_id - b.rol_id;
        });

        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            var role = findRol(pair.rol_id);
            var act  = findActividad(pair.actividad_id);
            if (!role || !act) continue;

            var assignedIds = getAssignedPermsForRoleActividad(role.rol_id, act.actividad_id);
            var allPerms    = getPermsByActividad(act.actividad_id);
            var assignedLabels = assignedIds.map(labelForPermId);

            var actTieneAssigned    = [];
            var actTieneAssignedIds = [];
            var actTieneMissing     = [];
            var actTieneMissingIds  = [];

            for (var j = 0; j < allPerms.length; j++) {
                var p = allPerms[j];
                if (assignedIds.indexOf(p.actividad_permiso_id) !== -1) {
                    actTieneAssigned.push(p.etiqueta);
                    actTieneAssignedIds.push(p.actividad_permiso_id);
                } else {
                    actTieneMissing.push(p.etiqueta);
                    actTieneMissingIds.push(p.actividad_permiso_id);
                }
            }

            rows.push({
                _rowKey: role.rol_id + "-" + act.actividad_id,
                rol_id: role.rol_id,
                rol: role.rol,
                actividad_id: act.actividad_id,
                actividad: act.actividad,
                rolPermIds: assignedIds.slice(),
                rolPuede: assignedLabels.slice(),
                rolPuedeText: assignedLabels.join(", "),
                actTieneAssigned:    actTieneAssigned.slice(),
                actTieneAssignedIds: actTieneAssignedIds.slice(),
                actTieneMissing:     actTieneMissing.slice(),
                actTieneMissingIds:  actTieneMissingIds.slice(),
                actTieneText: actTieneAssigned.concat(actTieneMissing).join(", ")
            });
        }
        return rows;
    }

    function refreshGrid() {
        if (!tableReady) return;
        grid.setData(buildRows());
    }

    // -------------------- CSV --------------------
    function buildAssignmentsCSV() {
        var lines = [];
        lines.push(csvRow(["rol_id", "rol", "actividad_id", "actividad", "actividad_permiso_id", "permiso", "etiqueta"]));

        for (var r = 0; r < state.roles.length; r++) {
            var role = state.roles[r];
            var set = getAssignedSetForRole(role.rol_id);
            if (!set || set.size === 0) continue;

            set.forEach(function (apid) {
                var p = state.actividad_permisos.find(function (x) { return x.actividad_permiso_id === apid; });
                if (!p) return;
                var a = findActividad(p.actividad_id);
                lines.push(
                    csvRow([
                        role.rol_id,
                        role.rol,
                        a ? a.actividad_id : "",
                        a ? a.actividad : "",
                        p.actividad_permiso_id,
                        p.permiso,
                        p.etiqueta
                    ])
                );
            });
        }
        return lines.join("\r\n");
    }

    function csvRow(arr) { return arr.map(csvEscape).join(","); }
    function csvEscape(v) {
        var s = String(v == null ? "" : v);
        if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
    }

    // -------------------- Persistence & misc --------------------
    function persist() {
        var serializable = JSON.parse(JSON.stringify(state, function (k, v) {
            return v instanceof Set ? Array.from(v) : v;
        }));
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

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function downloadText(filename, text, mime) {
        var blob = new Blob([text], { type: mime || "text/plain" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function getInitialModeFromUrl() {
        try {
            var params = new URLSearchParams(window.location.search);
            var m = (params.get("mode") || "").toLowerCase();
            if (m === "edit" || m === "edicion") return true;
        } catch (e) {}
        return false;
    }

    function updateModeUI() {
        document.body.classList.toggle("mode-edit", isEditMode);
        document.body.classList.toggle("mode-read", !isEditMode);
        el.btnNew.style.display = isEditMode ? "" : "none";
    }

    updateModeUI();
})();
