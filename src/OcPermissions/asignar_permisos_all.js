/* File: asignar_permisos_all.js - Uses fetch with mock instead of localStorage */

(function () {
    var API_URL = "./api/asignar_permisos_api.php";

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
        asignaciones: {
            1: [1001, 1002, 1003, 1004, 1101, 1102, 1103, 1201, 1202],
            2: [1002, 1003, 1101, 1201],
            3: [1201]
        },
        rowPairs: []
    };

    // Fetch override
    var originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (url.includes('asignar_permisos_api.php')) {
            return mockAPIResponse(url, options);
        }
        return originalFetch(url, options);
    };

    async function mockAPIResponse(url, options) {
        var body = options?.body ? JSON.parse(options.body) : {};
        var action = body.action || '';
        console.log('Mock API Call:', action, body);
        await new Promise(resolve => setTimeout(resolve, 200));

        var response;
        switch (action) {
            case 'load':
                if (!window.mockAsignarPermisosData) {
                    window.mockAsignarPermisosData = JSON.parse(JSON.stringify(SAMPLE));
                }
                response = { success: true, error: null, data: window.mockAsignarPermisosData };
                break;
            case 'save':
                window.mockAsignarPermisosData = JSON.parse(JSON.stringify(body.data));
                response = { success: true, error: null, data: window.mockAsignarPermisosData };
                break;
            default:
                response = { success: false, error: 'Unknown action', data: null };
        }

        return {
            ok: response.success,
            json: () => Promise.resolve(response)
        };
    }

    var state = null;
    var el = {};
    var grid, tsRol, tsAct;
    var tableReady = false;
    var dialogMode = "new";
    var dialogPair = { rol_id: null, actividad_id: null };
    var isEditMode = getInitialModeFromUrl();

    // Initialize
    document.addEventListener("DOMContentLoaded", function() {
        initElements();
        loadState().then(function(loadedState) {
            state = loadedState || SAMPLE;
            reviveSets();
            initRowPairsFromAsignaciones();
            initGrid();
            initEventHandlers();
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
            dlgInfoText:  document.getElementById("dlgInfoText")
        };
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
                        if (!isEditMode) {
                            if (!d.rolPuede || d.rolPuede.length === 0) return "";
                            return escapeHtml(d.rolPuede.join(", "));
                        }
                        if (!d.rolPuede || !d.rolPermIds) return "";
                        var html = "";
                        for (var i = 0; i < d.rolPuede.length; i++) {
                            var label = d.rolPuede[i];
                            var apid = d.rolPermIds[i];
                            if (!apid) continue;
                            html +=
                                '<span class="chip ok" data-type="rol" data-assigned="1" ' +
                                'data-rol-id="' + d.rol_id + '" data-act-id="' + d.actividad_id + '" ' +
                                'data-apid="' + apid + '">' +
                                escapeHtml(label) +
                                '</span>';
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
                            var parts = [];
                            for (var i = 0; i < d.actTieneAssigned.length; i++) {
                                parts.push("<strong>" + escapeHtml(d.actTieneAssigned[i]) + "</strong>");
                            }
                            for (var j = 0; j < d.actTieneMissing.length; j++) {
                                parts.push(escapeHtml(d.actTieneMissing[j]));
                            }
                            return parts.join(", ");
                        }
                        var html = "";
                        for (var i = 0; i < d.actTieneAssigned.length; i++) {
                            var labelA = d.actTieneAssigned[i];
                            var apidA = d.actTieneAssignedIds[i];
                            html +=
                                '<span class="chip ok" data-type="act" data-assigned="1" ' +
                                'data-rol-id="' + d.rol_id + '" data-act-id="' + d.actividad_id + '" ' +
                                'data-apid="' + apidA + '">' +
                                escapeHtml(labelA) +
                                '</span>';
                        }
                        for (var j = 0; j < d.actTieneMissing.length; j++) {
                            var labelM = d.actTieneMissing[j];
                            var apidM = d.actTieneMissingIds[j];
                            html +=
                                '<span class="chip missing" data-type="act" data-assigned="0" ' +
                                'data-rol-id="' + d.rol_id + '" data-act-id="' + d.actividad_id + '" ' +
                                'data-apid="' + apidM + '">' +
                                escapeHtml(labelM) +
                                '</span>';
                        }
                        return html;
                    }
                }
            ]
        });

        tableReady = true;
    }

    function initEventHandlers() {
        if (el.txtSearch) {
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
        }

        if (el.btnExport) {
            el.btnExport.addEventListener("click", function () {
                var csv = buildAssignmentsCSV();
                downloadText("asignaciones_" + Date.now() + ".csv", csv, "text/csv");
            });
        }

        if (el.btnNew && isEditMode) {
            el.btnNew.addEventListener("click", function () {
                openDialogNew();
            });
        }

        if (el.grid && isEditMode) {
            el.grid.addEventListener("click", function (e) {
                var chip = e.target.closest(".chip");
                if (chip) handleChipClick(chip);
            });
        }

        if (isEditMode && typeof TomSelect !== "undefined" && el.selRol && el.selAct) {
            var rolesOpts = state.roles.map(function (r) {
                return { value: r.rol_id, text: r.rol };
            });
            var actsOpts = state.actividades.map(function (a) {
                return { value: a.actividad_id, text: a.actividad };
            });

            tsRol = new TomSelect(el.selRol, {
                options: rolesOpts,
                maxItems: 1,
                create: false,
                placeholder: "Seleccione rol…",
                persist: false,
                plugins: []
            });

            tsAct = new TomSelect(el.selAct, {
                options: actsOpts,
                maxItems: 1,
                create: false,
                placeholder: "Seleccione actividad…",
                persist: false,
                plugins: []
            });
        }

        if (isEditMode && el.permSearch) {
            el.permSearch.addEventListener("input", function () {
                var q = (el.permSearch.value || "").trim().toLowerCase();
                var items = el.permList.querySelectorAll(".ocAsignar_perm_item");
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    var txt = item.textContent.toLowerCase();
                    if (!q || txt.indexOf(q) >= 0) {
                        item.style.display = "";
                    } else {
                        item.style.display = "none";
                    }
                }
            });
        }

        if (isEditMode && el.dlg) {
            var closeBtns = el.dlg.querySelectorAll('[data-action="close"]');
            for (var i = 0; i < closeBtns.length; i++) {
                closeBtns[i].addEventListener("click", function () {
                    closeMainDialog();
                });
            }

            el.dlg.addEventListener("cancel", function (e) {
                e.preventDefault();
                closeMainDialog();
            });

            var saveBtn = el.dlg.querySelector('[data-action="save"]');
            if (saveBtn) {
                saveBtn.addEventListener("click", function () {
                    saveDialog();
                });
            }

            if (typeof Sortable !== "undefined" && el.permList) {
                new Sortable(el.permList, { animation: 120 });
            }
        }

        if (el.dlgInfo) {
            var infoCloseBtns = document.querySelectorAll('[data-action="close-info"]');
            for (var k = 0; k < infoCloseBtns.length; k++) {
                infoCloseBtns[k].addEventListener("click", function (e) {
                    e.preventDefault();
                    closeInfoDialog();
                });
            }
            el.dlgInfo.addEventListener("cancel", function (e) {
                e.preventDefault();
                closeInfoDialog();
            });
        }
    }

    function handleChipClick(chip) {
        var rolId = Number(chip.getAttribute("data-rol-id"));
        var actId = Number(chip.getAttribute("data-act-id"));
        var apid = Number(chip.getAttribute("data-apid"));
        if (!rolId || !actId || !apid) return;

        var type = chip.getAttribute("data-type") || "";
        var assignedAttr = chip.getAttribute("data-assigned");
        var currentlyAssigned = assignedAttr === "1";

        var newAssigned;
        if (type === "rol") {
            newAssigned = false;
        } else {
            newAssigned = !currentlyAssigned;
        }

        applyPermissionToggle(chip, rolId, actId, apid, newAssigned);
    }

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

            addRowPair(rolId, actId);
            persist();
            refreshGrid();
        }).catch(function (err) {
            console.error(err);
            chipEl.classList.remove("chip--pending");
            alert("No se pudo actualizar el permiso.");
        });
    }

    function openDialogNew() {
        dialogMode = "new";
        el.dlgTitle.textContent = "Asignar permisos";
        tsRol.clear(true);
        tsAct.clear(true);
        tsRol.enable();
        tsAct.enable();

        el.permSearch.value = "";
        el.permList.innerHTML = "";

        tsRol.off("change");
        tsAct.off("change");
        tsRol.on("change", rebuildPermListFromSelects);
        tsAct.on("change", rebuildPermListFromSelects);

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
        try {
            el.dlg.showModal();
        } catch (e) {
            el.dlg.setAttribute("open", "");
        }
    }

    function closeMainDialog() {
        try {
            el.dlg.close();
        } catch (e) {
            el.dlg.removeAttribute("open");
        }
    }

    function saveDialog() {
        var rid = tsRol.getValue();
        var aid = tsAct.getValue();
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
            var allIds = getPermsByActividad(actividad_id).map(function (p) {
                return p.actividad_permiso_id;
            });
            for (var j = 0; j < allIds.length; j++) set.delete(allIds[j]);
            for (var k = 0; k < nextIds.length; k++) set.add(nextIds[k]);

            addRowPair(rol_id, actividad_id);
            persist();
            refreshGrid();
            closeMainDialog();
        }).catch(function (err) {
            console.error(err);
            alert("No se pudo guardar los permisos.");
        });
    }

    function callResponder(payload) {
        return new Promise(function (resolve) {
            setTimeout(resolve, 120);
        });
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
        if (!el.dlgInfo) return;
        el.dlgInfoTitle.textContent = title || "Información";
        el.dlgInfoText.textContent = text || "";
        try {
            el.dlgInfo.showModal();
        } catch (e) {
            el.dlgInfo.setAttribute("open", "");
        }
    }

    function closeInfoDialog() {
        if (!el.dlgInfo) return;
        try {
            el.dlgInfo.close();
        } catch (e) {
            el.dlgInfo.removeAttribute("open");
        }
    }

    function refreshGrid() {
        if (!grid) return;
        grid.setData(buildRows());
    }

    function reviveSets() {
        if (!state.asignaciones) state.asignaciones = {};
        var keys = Object.keys(state.asignaciones);
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
        if (state.rowPairs && state.rowPairs.length > 0) return;
        state.rowPairs = [];
        var roleIds = Object.keys(state.asignaciones || {});
        for (var i = 0; i < roleIds.length; i++) {
            var rid = Number(roleIds[i]);
            var set = state.asignaciones[rid];
            if (!set) continue;
            set.forEach(function (apid) {
                var p = state.actividad_permisos.find(function (x) {
                    return x.actividad_permiso_id === apid;
                });
                if (p) addRowPair(rid, p.actividad_id);
            });
        }
    }

    function findRol(rol_id) {
        return state.roles.find(function (r) { return r.rol_id === rol_id; });
    }

    function findActividad(actividad_id) {
        return state.actividades.find(function (a) { return a.actividad_id === actividad_id; });
    }

    function getPermsByActividad(actividad_id) {
        return state.actividad_permisos.filter(function (p) {
            return p.actividad_id === actividad_id;
        });
    }

    function getAssignedSetForRole(rol_id) {
        var set = state.asignaciones[rol_id];
        if (!set) {
            set = new Set();
            state.asignaciones[rol_id] = set;
        }
        return set;
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
        return out;
    }

    function labelForPermId(id) {
        var p = state.actividad_permisos.find(function (x) {
            return x.actividad_permiso_id === id;
        });
        return p ? p.etiqueta : String(id);
    }

    function buildRows() {
        var rows = [];
        var pairs = (state.rowPairs || []).slice();

        pairs.sort(function (a, b) {
            if (a.rol_id === b.rol_id) return a.actividad_id - b.actividad_id;
            return a.rol_id - b.rol_id;
        });

        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            var role = findRol(pair.rol_id);
            var act = findActividad(pair.actividad_id);
            if (!role || !act) continue;

            var assignedIds = getAssignedPermsForRoleActividad(role.rol_id, act.actividad_id);
            var allPerms = getPermsByActividad(act.actividad_id);
            var assignedLbls = assignedIds.map(labelForPermId);

            var actTieneAssigned = [];
            var actTieneAssignedIds = [];
            var actTieneMissing = [];
            var actTieneMissingIds = [];

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
                rolPuede: assignedLbls.slice(),
                rolPuedeText: assignedLbls.join(", "),
                actTieneAssigned: actTieneAssigned.slice(),
                actTieneAssignedIds: actTieneAssignedIds.slice(),
                actTieneMissing: actTieneMissing.slice(),
                actTieneMissingIds: actTieneMissingIds.slice(),
                actTieneText: actTieneAssigned.concat(actTieneMissing).join(", ")
            });
        }
        return rows;
    }

    function buildAssignmentsCSV() {
        var lines = [];
        lines.push(csvRow(["rol_id", "rol", "actividad_id", "actividad", "actividad_permiso_id", "permiso", "etiqueta"]));

        for (var r = 0; r < state.roles.length; r++) {
            var role = state.roles[r];
            var set = getAssignedSetForRole(role.rol_id);
            if (!set || set.size === 0) continue;

            set.forEach(function (apid) {
                var p = state.actividad_permisos.find(function (x) {
                    return x.actividad_permiso_id === apid;
                });
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

    function csvRow(arr) {
        return arr.map(csvEscape).join(",");
    }

    function csvEscape(v) {
        var s = String(v == null ? "" : v);
        if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
    }

    async function persist() {
        var serializable = JSON.parse(JSON.stringify(state, function (k, v) {
            return v instanceof Set ? Array.from(v) : v;
        }));

        try {
            var response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save',
                    data: serializable
                })
            });
            var result = await response.json();
            if (!result.success) {
                console.error('Error persisting data:', result.error);
            }
        } catch (e) {
            console.error('Error persisting data:', e);
        }
    }

    async function loadState() {
        try {
            var response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'load' })
            });
            var result = await response.json();
            if (result.success && result.data) {
                return result.data;
            }
            return null;
        } catch (e) {
            console.error('Error loading state:', e);
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
        var params = new URLSearchParams(window.location.search);
        return params.get("mode") === "edit";
    }

})();
