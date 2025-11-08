// File: asignar_permisos.js
// Shared data & helpers + READ-ONLY grid.
// Modified: Uses fetch instead of localStorage

(function (global) {
    "use strict";

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
        // Map<rol_id, Array<actividad_permiso_id>> - Arrays will be converted to Sets by reviveSets()
        asignaciones: {
            1: [1001, 1002, 1003, 1004, 1101, 1102, 1103, 1201, 1202],
            2: [1002, 1003, 1101, 1201],
            3: [1201]
        },
        // Lista de pares (rol, actividad) que deben existir como fila aunque tengan 0 permisos
        rowPairs: []
    };

    var state = null;
    var originalFetch = global.fetch;

    // ---------- Fetch Override ----------
    function setupFetchOverride() {
        global.fetch = function(url, options) {
            // Only intercept our API calls
            if (url.includes('asignar_permisos_api.php')) {
                return mockAPIResponse(url, options);
            }
            return originalFetch(url, options);
        };
    }

    async function mockAPIResponse(url, options) {
        var body = options?.body ? JSON.parse(options.body) : {};
        var action = body.action || '';

        console.log('Mock API Call:', action, body);

        // Simulate network delay
        await new Promise(function(resolve) { setTimeout(resolve, 200); });

        var response;

        switch (action) {
            case 'load':
                response = mockLoad();
                break;
            case 'save':
                response = mockSave(body.data);
                break;
            default:
                response = {
                    success: false,
                    error: 'Acción desconocida: ' + action,
                    data: null
                };
        }

        return {
            ok: response.success,
            json: function() { return Promise.resolve(response); }
        };
    }

    function mockLoad() {
        // Initialize mock data if not exists
        if (!global.mockAsignarPermisosData) {
            global.mockAsignarPermisosData = JSON.parse(JSON.stringify(SAMPLE));
        }

        return {
            success: true,
            error: null,
            data: global.mockAsignarPermisosData
        };
    }

    function mockSave(data) {
        if (!data) {
            return {
                success: false,
                error: 'No data provided',
                data: null
            };
        }

        global.mockAsignarPermisosData = JSON.parse(JSON.stringify(data));

        return {
            success: true,
            error: null,
            data: global.mockAsignarPermisosData
        };
    }

    // ---------- Helpers de estado ----------
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
            var act  = findActividad(pair.actividad_id);
            if (!role || !act) continue;

            var assignedIds   = getAssignedPermsForRoleActividad(role.rol_id, act.actividad_id);
            var allPerms      = getPermsByActividad(act.actividad_id);
            var assignedLbls  = assignedIds.map(labelForPermId);

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
                rolPuede: assignedLbls.slice(),
                rolPuedeText: assignedLbls.join(", "),
                actTieneAssigned:    actTieneAssigned.slice(),
                actTieneAssignedIds: actTieneAssignedIds.slice(),
                actTieneMissing:     actTieneMissing.slice(),
                actTieneMissingIds:  actTieneMissingIds.slice(),
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
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ---------- Wait for state helper ----------
    function waitForState() {
        return new Promise(function(resolve) {
            if (state && state.roles) {
                resolve();
            } else {
                var checkInterval = setInterval(function() {
                    if (state && state.roles) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 50);
            }
        });
    }

    // ---------- READ ONLY UI ----------
    function initReadOnly() {
        var el = {
            grid:      document.getElementById("gridAssign"),
            txtSearch: document.getElementById("txtSearch"),
            btnExport: document.getElementById("btnExport"),
            dlgInfo:      document.getElementById("dlgInfo"),
            dlgInfoTitle: document.getElementById("dlgInfoTitle"),
            dlgInfoText:  document.getElementById("dlgInfoText")
        };
        if (!el.grid || typeof global.Tabulator === "undefined") return;

        // Wait for state to be initialized before building grid
        waitForState().then(function() {
            setupReadOnlyGrid(el);
        });
    }

    function setupReadOnlyGrid(el) {
        var grid = new Tabulator(el.grid, {
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
                        var d = cell.getRow().getData();
                        var r = findRol(d.rol_id);
                        openInfoDialog(
                            "Rol: " + (r ? r.rol : d.rol),
                            r && r.descripcion ? r.descripcion : "Sin descripción"
                        );
                    },
                    formatterExport: function (cell) {
                        return cell.getRow().getData().rol || "";
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
                        if (!e.target.closest(".info-badge")) return;
                        var d = cell.getRow().getData();
                        var a = findActividad(d.actividad_id);
                        openInfoDialog(
                            "Actividad: " + (a ? a.actividad : d.actividad),
                            a && a.descripcion ? a.descripcion : "Sin descripción"
                        );
                    },
                    formatterExport: function (cell) {
                        return cell.getRow().getData().actividad || "";
                    }
                },

                {
                    title: "Rol Puede",
                    field: "rolPuedeText",
                    sorter: "string",
                    headerFilter: "input",
                    widthGrow: 2,
                    formatter: function (cell) {
                        var d = cell.getRow().getData();
                        if (!d.rolPuede || d.rolPuede.length === 0) return "";
                        return escapeHtml(d.rolPuede.join(", "));
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
                        var parts = [];
                        for (var i = 0; i < d.actTieneAssigned.length; i++) {
                            parts.push("<strong>" + escapeHtml(d.actTieneAssigned[i]) + "</strong>");
                        }
                        for (var j = 0; j < d.actTieneMissing.length; j++) {
                            parts.push(escapeHtml(d.actTieneMissing[j]));
                        }
                        return parts.join(", ");
                    }
                }
            ]
        });

        // Búsqueda global
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

        // Exportar CSV
        if (el.btnExport) {
            el.btnExport.addEventListener("click", function () {
                var csv = buildAssignmentsCSV();
                downloadText("asignaciones_" + Date.now() + ".csv", csv, "text/csv");
            });
        }

        // Info dialog
        if (el.dlgInfo) {
            var closeBtns = document.querySelectorAll('[data-action="close-info"]');
            for (var i = 0; i < closeBtns.length; i++) {
                closeBtns[i].addEventListener("click", function (e) {
                    e.preventDefault();
                    closeInfoDialog();
                });
            }
            el.dlgInfo.addEventListener("cancel", function (e) {
                e.preventDefault();
                closeInfoDialog();
            });
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
    }

    // ---------- Initialize state ----------
    async function initState() {
        var loadedState = await loadState();
        state = loadedState || SAMPLE;
        reviveSets();
        initRowPairsFromAsignaciones();
    }

    // ---------- Exponer objeto compartido ----------
    global.AsignarPermisosShared = {
        API_URL: API_URL,
        state: state,
        reviveSets: reviveSets,
        initRowPairsFromAsignaciones: initRowPairsFromAsignaciones,
        addRowPair: addRowPair,
        findRol: findRol,
        findActividad: findActividad,
        getPermsByActividad: getPermsByActividad,
        getAssignedSetForRole: getAssignedSetForRole,
        getAssignedPermsForRoleActividad: getAssignedPermsForRoleActividad,
        labelForPermId: labelForPermId,
        buildRows: buildRows,
        buildAssignmentsCSV: buildAssignmentsCSV,
        persist: persist,
        escapeHtml: escapeHtml,
        downloadText: downloadText,
        initReadOnly: initReadOnly,
        initState: initState,
        waitForState: waitForState
    };

    // Setup fetch override when script loads
    setupFetchOverride();

    // Initialize state asynchronously
    initState().then(function() {
        console.log('AsignarPermisosShared state initialized');
    });

})(window);
