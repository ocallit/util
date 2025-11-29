/* File: asignar_permisos.js */
var gAsignar = {};
(function () {
    var API_URL = "./api/asignar_permisos_api.php";

    // State
    var state = {
        roles: [],
        actividades: [],
        actividad_permisos: [],
        asignaciones: {},
        rowPairs: []
    };

    var el = {};
    var grid;
    var tsRol, tsAct;
    var isEditMode = new URLSearchParams(window.location.search).get("mode") === "edit";

    // Default column visibility
    var columnVisibility = {
        rolPuede: true,
        sinPermiso: true,
        actividadTiene: true
    };

    // Initialize
    document.addEventListener("DOMContentLoaded", function() {
        initElements();
        loadData().then(function() {
            initRowPairsFromAsignaciones();
            initGrid();
            initEventHandlers();
            initColumnVisibilityListeners();
        });
    });

    function initElements() {
        el = {
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
            dlgInfoText:  document.getElementById("dlgInfoText"),
            // Checkboxes
            cbRol: document.getElementById("cbRol"),
            cbSin: document.getElementById("cbSin"),
            cbAll: document.getElementById("cbAll")
        };
    }

    // --- CORE VISIBILITY FUNCTION (Defined early to prevent ReferenceError) ---
    function updateColumnVisibility() {
        if (!grid) return;

        if (columnVisibility.rolPuede) grid.showColumn("rolPuedeText");
        else grid.hideColumn("rolPuedeText");

        if (columnVisibility.sinPermiso) grid.showColumn("sinPermisoText");
        else grid.hideColumn("sinPermisoText");

        // In Edit mode, 'actTieneText' is always shown. In View mode, it toggles.
        if (isEditMode || columnVisibility.actividadTiene) grid.showColumn("actTieneText");
        else grid.hideColumn("actTieneText");
    }

    function initColumnVisibilityListeners() {
        if (el.cbRol) el.cbRol.addEventListener('change', function(e) {
            columnVisibility.rolPuede = e.target.checked;
            updateColumnVisibility();
        });

        if (el.cbSin) el.cbSin.addEventListener('change', function(e) {
            columnVisibility.sinPermiso = e.target.checked;
            updateColumnVisibility();
        });

        if (el.cbAll) el.cbAll.addEventListener('change', function(e) {
            if (!isEditMode) {
                columnVisibility.actividadTiene = e.target.checked;
                updateColumnVisibility();
            }
        });
    }

    async function loadData() {
        try {
            var response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list' })
            });
            var result = await response.json();

            if (result.success && result.data) {
                gAsignar.roles = result.data.roles || [];
                gAsignar.actividades = result.data.actividades || [];
                gAsignar.actividad_permisos = result.data.actividad_permisos || [];
                gAsignar.asignaciones = result.data.asignaciones || {};
                var rawAsign = result.data.asignaciones || {};
                var asignacionesSets = {};

                var rawAsign = result.data.asignaciones || {};
                var asignacionesSets = {};
                Object.keys(rawAsign).forEach(function(rKey) {
                    // Convert [1, 2] -> Set(1, 2)
                    asignacionesSets[rKey] = new Set(rawAsign[rKey].map(Number));
                });
                state.asignaciones = asignacionesSets;



                state = {
                    roles: result.data.roles || [],
                    actividades: result.data.actividades || [],
                    actividad_permisos: result.data.actividad_permisos || [],
                    asignaciones: asignacionesSets,
                    rowPairs: []
                };
            } else {
                console.error('Error loading data:', result.error);
                alert('Error cargando datos: ' + (result.error || 'Desconocido'));
            }
        } catch (e) {
            console.error('Error loading data:', e);
            alert('Error de conexión al cargar datos.');
        }
    }

    function initRowPairsFromAsignaciones() {
        state.rowPairs = [];
        var processed = new Set();

        Object.keys(state.asignaciones).forEach(function(rKey) {
            var rolId = parseInt(rKey, 10);
            var permSet = state.asignaciones[rolId];

            permSet.forEach(function(permId) {
                var permDef = state.actividad_permisos.find(function(ap) {
                    return parseInt(ap.actividad_permiso_id, 10) === permId;
                });

                if (permDef) {
                    var actId = parseInt(permDef.actividad_id, 10);
                    var key = rolId + "-" + actId;
                    if (!processed.has(key)) {
                        state.rowPairs.push({ rol_id: rolId, actividad_id: actId });
                        processed.add(key);
                    }
                }
            });
        });
    }

    function initGrid() {
        if (!el.grid || typeof Tabulator === "undefined") return;

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
                        // Step 2: Use gAsignar for lookup
                        if (e.target.closest(".info-badge")) {
                            var rid = cell.getRow().getData().rol_id;
                            var role = gAsignar.roles.find(function(r){ return r.rol_id == rid; });
                            if(role) openInfo("Rol: " + role.rol, role.descripcion);
                        }
                    }
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
                        // Step 2: Use gAsignar for lookup
                        if (e.target.closest(".info-badge")) {
                            var aid = cell.getRow().getData().actividad_id;
                            var act = gAsignar.actividades.find(function(a){ return a.actividad_id == aid; });
                            if(act) openInfo("Actividad: " + act.actividad, act.descripcion);
                        }
                    }
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
                        if (!isEditMode) {
                            return d.rolPuede ? escapeHtml(d.rolPuede.join(", ")) : "";
                        }

                        if (!d.rolPuede || d.rolPuede.length === 0) return "";
                        var html = "";
                        for (var i = 0; i < d.rolPuede.length; i++) {
                            var label = d.rolPuede[i];
                            var apid = d.rolPermIds[i];
                            html += createChipHtml(label, apid, d.rol_id, d.actividad_id, true);
                        }
                        return html;
                    }
                },

                {
                    title: "Sin Permiso",
                    field: "sinPermisoText",
                    sorter: "string",
                    headerFilter: "input",
                    widthGrow: 2,
                    cssClass: "cell-chips",
                    formatter: function (cell) {
                        var d = cell.getRow().getData();
                        if (!d.actTieneMissing || d.actTieneMissing.length === 0) return "";

                        if (!isEditMode) {
                            return escapeHtml(d.actTieneMissing.join(", "));
                        }

                        var html = "";
                        for (var i = 0; i < d.actTieneMissing.length; i++) {
                            var label = d.actTieneMissing[i];
                            var apid = d.actTieneMissingIds[i];
                            html += createChipHtml(label, apid, d.rol_id, d.actividad_id, false);
                        }
                        return html;
                    }
                },

                {
                    title: "Permisos de la actividad",
                    field: "actTieneText",
                    sorter: "string",
                    headerFilter: "input",
                    widthGrow: 3,
                    cssClass: "cell-chips",
                    formatter: function (cell) {
                        var d = cell.getRow().getData();
                        if (!d.actTieneAllSorted) return "";

                        if (!isEditMode) {
                            return d.actTieneAllSorted.map(function(p) {
                                return p.isAssigned
                                    ? "<strong>" + escapeHtml(p.label) + "</strong>"
                                    : escapeHtml(p.label);
                            }).join(", ");
                        }

                        var html = "";
                        for (var i = 0; i < d.actTieneAllSorted.length; i++) {
                            var p = d.actTieneAllSorted[i];
                            html += createChipHtml(p.label, p.apid, d.rol_id, d.actividad_id, p.isAssigned);
                        }
                        return html;
                    }
                }
            ]
        });

        // Apply visibility rules immediately
        updateColumnVisibility();
    }

    function createChipHtml(label, apid, rolId, actId, isAssigned) {
        var cssClass = isAssigned ? "perm-assigned" : "perm-unassigned";
        var assignedVal = isAssigned ? "1" : "0";
        return '<span class="perm-toggle ' + cssClass + '" data-assigned="' + assignedVal + '" ' +
            'data-rol-id="' + rolId + '" data-act-id="' + actId + '" ' +
            'data-apid="' + apid + '">' + escapeHtml(label) + '</span>';
    }

    // --- Actions ---

    function handleChipClick(chip) {
        var rolId = parseInt(chip.getAttribute("data-rol-id"), 10);
        var actId = parseInt(chip.getAttribute("data-act-id"), 10);
        var apid = parseInt(chip.getAttribute("data-apid"), 10);
        var currentlyAssigned = chip.getAttribute("data-assigned") === "1";

        chip.classList.add("chip--pending");

        var newState = currentlyAssigned ? 0 : 1;

        apiToggle(rolId, apid, newState)
            .then(function(success) {
                chip.classList.remove("chip--pending");
                if (success) {
                    updateLocalState(rolId, apid, newState === 1);
                    ensureRowPair(rolId, actId);
                    refreshGrid();
                }
            });
    }

    async function apiToggle(rolId, permId, state) {
        try {
            var response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'toggle',
                    rol_id: rolId,
                    actividad_permiso_id: permId,
                    state: state
                })
            });
            var res = await response.json();
            if (!res.success) {
                alert('Error: ' + res.error);
                return false;
            }
            return true;
        } catch(e) {
            console.error(e);
            alert('Error de red');
            return false;
        }
    }

    function updateLocalState(rolId, permId, isAdded) {
        if (!state.asignaciones[rolId]) {
            state.asignaciones[rolId] = new Set();
        }
        if (isAdded) {
            state.asignaciones[rolId].add(permId);
        } else {
            state.asignaciones[rolId].delete(permId);
        }
    }

    function ensureRowPair(rolId, actId) {
        var exists = state.rowPairs.some(function(p) {
            return p.rol_id === rolId && p.actividad_id === actId;
        });
        if (!exists) {
            state.rowPairs.push({ rol_id: rolId, actividad_id: actId });
        }
    }

    // --- Dialogs (New / Batch) ---

    function openDialogNew() {
        el.dlgTitle.textContent = "Asignar permisos";

        el.permSearch.value = "";
        el.permList.innerHTML = "";

        setupSelects();

        tsRol.clear();
        tsAct.clear();

        tsRol.off("change");
        tsAct.off("change");
        tsRol.on("change", rebuildPermListFromSelects);
        tsAct.on("change", rebuildPermListFromSelects);

        el.dlg.showModal();
    }

    function setupSelects() {
        if (tsRol) tsRol.destroy();
        if (tsAct) tsAct.destroy();

        var rolesOpts = state.roles.map(function(r) { return {value: r.rol_id, text: r.rol}; });
        var actsOpts = state.actividades.map(function(a) { return {value: a.actividad_id, text: a.actividad}; });

        tsRol = new TomSelect(el.selRol, { options: rolesOpts, maxItems: 1, placeholder: "Seleccione rol..." });
        tsAct = new TomSelect(el.selAct, { options: actsOpts, maxItems: 1, placeholder: "Seleccione actividad..." });
    }

    function rebuildPermListFromSelects() {
        var rVal = tsRol.getValue();
        var aVal = tsAct.getValue();

        if (!rVal || !aVal) {
            el.permList.innerHTML = "";
            return;
        }

        var rolId = parseInt(rVal, 10);
        var actId = parseInt(aVal, 10);

        var allPerms = getPermsByActividad(actId);
        var assignedSet = state.asignaciones[rolId] || new Set();

        var html = "";
        allPerms.forEach(function(p) {
            var checked = assignedSet.has(parseInt(p.actividad_permiso_id, 10)) ? "checked" : "";
            html +=
                '<li class="ocAsignar_perm_item">' +
                '<label style="display:flex; gap:8px; align-items:center; cursor:pointer; width:100%">' +
                '<input type="checkbox" ' + checked + ' data-id="' + p.actividad_permiso_id + '"/>' +
                '<div>' +
                '<strong>' + escapeHtml(p.etiqueta) + '</strong> ' +
                '<span class="ocAsignar_perm_code">(' + escapeHtml(p.permiso) + ')</span>' +
                '</div>' +
                '</label>' +
                '</li>';
        });
        el.permList.innerHTML = html;
    }

    async function saveDialog() {
        var rVal = tsRol.getValue();
        var aVal = tsAct.getValue();

        if (!rVal || !aVal) {
            alert("Debe seleccionar Rol y Actividad");
            return;
        }

        var rolId = parseInt(rVal, 10);
        var actId = parseInt(aVal, 10);

        var checks = el.permList.querySelectorAll('input[type="checkbox"]');
        var selectedIds = [];
        checks.forEach(function(chk) {
            if (chk.checked) selectedIds.push(parseInt(chk.getAttribute('data-id'), 10));
        });

        try {
            var response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_batch',
                    rol_id: rolId,
                    actividad_id: actId,
                    permisos: selectedIds
                })
            });
            var res = await response.json();

            if (res.success) {
                var actPerms = getPermsByActividad(actId);
                var actPermIds = actPerms.map(function(p) { return parseInt(p.actividad_permiso_id, 10); });

                if (!state.asignaciones[rolId]) state.asignaciones[rolId] = new Set();

                actPermIds.forEach(function(pid) { state.asignaciones[rolId].delete(pid); });
                selectedIds.forEach(function(pid) { state.asignaciones[rolId].add(pid); });

                ensureRowPair(rolId, actId);
                refreshGrid();
                el.dlg.close();
            } else {
                alert('Error: ' + res.error);
            }
        } catch(e) {
            console.error(e);
            alert('Error al guardar');
        }
    }

    // --- Helpers ---

    function buildRows() {
        var rows = [];
        var pairs = state.rowPairs.slice();

        pairs.sort(function(a, b) {
            var rA = findRol(a.rol_id);
            var rB = findRol(b.rol_id);
            var nameA = rA ? rA.rol : "";
            var nameB = rB ? rB.rol : "";
            var cmp = nameA.localeCompare(nameB);
            if (cmp !== 0) return cmp;

            var acA = findActividad(a.actividad_id);
            var acB = findActividad(b.actividad_id);
            return (acA ? acA.actividad : "").localeCompare(acB ? acB.actividad : "");
        });

        pairs.forEach(function(p) {
            var role = findRol(p.rol_id);
            var act = findActividad(p.actividad_id);
            if (!role || !act) return;

            var allPerms = getPermsByActividad(act.actividad_id);
            var assignedSet = state.asignaciones[role.rol_id] || new Set();

            var rolPuede = [];
            var rolPermIds = [];
            var actTieneMissing = [];
            var actTieneMissingIds = [];
            var actTieneAllSorted = [];

            allPerms.forEach(function(perm) {
                var pid = parseInt(perm.actividad_permiso_id, 10);
                var isAssigned = assignedSet.has(pid);

                actTieneAllSorted.push({
                    label: perm.etiqueta,
                    apid: pid,
                    isAssigned: isAssigned
                });

                if (isAssigned) {
                    rolPuede.push(perm.etiqueta);
                    rolPermIds.push(pid);
                } else {
                    actTieneMissing.push(perm.etiqueta);
                    actTieneMissingIds.push(pid);
                }
            });

            actTieneAllSorted.sort(function(a, b) { return a.label.localeCompare(b.label); });
            rolPuede.sort();
            actTieneMissing.sort();

            rows.push({
                _rowKey: role.rol_id + "-" + act.actividad_id,
                rol_id: role.rol_id,
                rol: role.rol,
                actividad_id: act.actividad_id,
                actividad: act.actividad,

                rolPuede: rolPuede,
                rolPermIds: rolPermIds,
                rolPuedeText: rolPuede.join(", "),

                actTieneMissing: actTieneMissing,
                actTieneMissingIds: actTieneMissingIds,
                sinPermisoText: actTieneMissing.join(", "),

                actTieneAllSorted: actTieneAllSorted,
                actTieneText: actTieneAllSorted.map(function(x) { return x.label; }).join(", ")
            });
        });

        return rows;
    }

    function buildRowsMal() {
        if (!gAsignar.rowPairs) gAsignar.rowPairs = [];

        var rows = [];
        var pairs = gAsignar.rowPairs.slice();

        // Sort: Role then Activity
        pairs.sort(function(a, b) {
            var rA = gAsignar.roles.find(function(x){ return x.rol_id == a.rol_id; });
            var rB = gAsignar.roles.find(function(x){ return x.rol_id == b.rol_id; });
            var nameA = rA ? rA.rol : "";
            var nameB = rB ? rB.rol : "";
            return nameA.localeCompare(nameB);
        });

        pairs.forEach(function(p) {
            var role = gAsignar.roles.find(function(x){ return x.rol_id == p.rol_id; });
            var act = gAsignar.actividades.find(function(x){ return x.actividad_id == p.actividad_id; });

            if (!role || !act) {
                console.warn("Missing role or act for pair", p);
                return;
            }

            // Find definitions
            var allPerms = gAsignar.actividad_permisos.filter(function(x){ return x.actividad_id == act.actividad_id; });
            // Find assignments
            var assignedIds = gAsignar.asignaciones[role.rol_id] || [];

            console.log(`Processing Row: Role=${role.rol} (${role.rol_id}), Act=${act.actividad} (${act.actividad_id}), AssignedCount=${assignedIds.length}`);

            var row = {
                _rowKey: role.rol_id + "-" + act.actividad_id,
                rol_id: role.rol_id,
                rol: role.rol,
                actividad_id: act.actividad_id,
                actividad: act.actividad,
                rolPuede: [], rolPermIds: [],
                actTieneMissing: [], actTieneMissingIds: [],
                actTieneAllSorted: []
            };

            allPerms.forEach(function(perm) {
                var pid = perm.actividad_permiso_id;
                // Use loose equality via SOME
                var isAssigned = false;
                if(Array.isArray(assignedIds)) {
                    isAssigned = assignedIds.some(function(aid) { return aid == pid; });
                }

                row.actTieneAllSorted.push({ label: perm.etiqueta, apid: pid, isAssigned: isAssigned });

                if (isAssigned) {
                    row.rolPuede.push(perm.etiqueta);
                    row.rolPermIds.push(pid);
                } else {
                    row.actTieneMissing.push(perm.etiqueta);
                    row.actTieneMissingIds.push(pid);
                }
            });

            row.actTieneAllSorted.sort(function(a,b){ return a.label.localeCompare(b.label); });
            row.rolPuede.sort();
            row.actTieneMissing.sort();

            row.rolPuedeText = row.rolPuede.join(", ");
            row.sinPermisoText = row.actTieneMissing.join(", ");
            row.actTieneText = row.actTieneAllSorted.map(function(x){ return x.label; }).join(", ");

            rows.push(row);
        });
        return rows;
    }


    function findRol(id) { return state.roles.find(function(r) { return parseInt(r.rol_id) === id; }); }
    function findActividad(id) { return state.actividades.find(function(a) { return parseInt(a.actividad_id) === id; }); }
    function getPermsByActividad(id) {
        return state.actividad_permisos.filter(function(p) { return parseInt(p.actividad_id) === id; });
    }

    function refreshGrid() {
        if (grid) grid.setData(buildRows());
    }

    function initEventHandlers() {
        if (el.txtSearch) {
            el.txtSearch.addEventListener("input", function() {
                var val = el.txtSearch.value.toLowerCase();
                grid.setFilter(function(data) {
                    return (data.rol.toLowerCase().includes(val) ||
                        data.actividad.toLowerCase().includes(val) ||
                        data.actTieneText.toLowerCase().includes(val));
                });
            });
        }

        if (el.btnNew && isEditMode) el.btnNew.addEventListener("click", openDialogNew);
        if (el.btnExport) el.btnExport.addEventListener("click", function() { grid.download("csv", "permisos.csv"); });

        el.grid.addEventListener("click", function(e) {
            var chip = e.target.closest(".perm-toggle");
            if (chip && isEditMode) handleChipClick(chip);
        });

        if (el.dlg) {
            var saveBtn = el.dlg.querySelector('[data-action="save"]');
            var closeBtns = el.dlg.querySelectorAll('[data-action="close"]');
            if (saveBtn) saveBtn.addEventListener("click", saveDialog);
            closeBtns.forEach(function(b) { b.addEventListener("click", function() { el.dlg.close(); }); });
        }

        if (el.dlgInfo) {
            el.dlgInfo.querySelectorAll('[data-action="close-info"]').forEach(function(b) {
                b.addEventListener("click", function() { el.dlgInfo.close(); });
            });
        }

        if (el.permSearch) {
            el.permSearch.addEventListener("input", function() {
                var q = el.permSearch.value.toLowerCase();
                el.permList.querySelectorAll("li").forEach(function(li) {
                    li.style.display = li.textContent.toLowerCase().includes(q) ? "" : "none";
                });
            });
        }
    }

    function onRolCellClick(e, cell) {
        var d = cell.getRow().getData();
        var r = findRol(d.rol_id);
        openInfo(r.rol, r.descripcion);
    }

    function onActividadCellClick(e, cell) {
        var d = cell.getRow().getData();
        var a = findActividad(d.actividad_id);
        openInfo(a.actividad, a.descripcion);
    }

    function openInfo(title, text) {
        el.dlgInfoTitle.textContent = title;
        el.dlgInfoText.textContent = text || "Sin descripción";
        el.dlgInfo.showModal();
    }

    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function(c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }

})();