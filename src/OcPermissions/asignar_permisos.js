/* File: asignar_permisos.js */

(function () {
    var API_URL = "./api/asignar_permisos_api.php";

    // GLOBAL DATA CONTAINER
    var gAsignar = {
        roles: [],
        actividades: [],
        actividad_permisos: [],
        asignaciones: {},
        rowPairs: []
    };

    var el = {};
    var grid;
    var tsRol, tsAct;
    var isEditMode = new URLSearchParams(window.location.search).get("mode") == "edit";

    var columnVisibility = {
        rolPuede: true,
        sinPermiso: true,
        actividadTiene: true
    };

    document.addEventListener("DOMContentLoaded", function() {
        initElements();
        loadData().then(function() {
            initRowPairs();
            initGrid();
            initEventHandlers();

            if(el.cbRol) el.cbRol.addEventListener('change', function(e) { columnVisibility.rolPuede = e.target.checked; updateCols(); });
            if(el.cbSin) el.cbSin.addEventListener('change', function(e) { columnVisibility.sinPermiso = e.target.checked; updateCols(); });
            if(el.cbAll) el.cbAll.addEventListener('change', function(e) { if(!isEditMode) { columnVisibility.actividadTiene = e.target.checked; updateCols(); } });
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
            cbRol: document.getElementById("cbRol"),
            cbSin: document.getElementById("cbSin"),
            cbAll: document.getElementById("cbAll")
        };
    }

    function updateCols() {
        if (!grid) return;
        try {
            if(columnVisibility.rolPuede) grid.showColumn("rolPuedeText"); else grid.hideColumn("rolPuedeText");
            if(columnVisibility.sinPermiso) grid.showColumn("sinPermisoText"); else grid.hideColumn("sinPermisoText");
            if(isEditMode || columnVisibility.actividadTiene) grid.showColumn("actTieneText"); else grid.hideColumn("actTieneText");
        } catch(e) {}
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
                // 1. Store API arrays directly in gAsignar
                gAsignar.roles = result.data.roles || [];
                gAsignar.actividades = result.data.actividades || [];
                gAsignar.actividad_permisos = result.data.actividad_permisos || [];

                // 2. Convert Assignments Array -> Set for .has() check
                var rawAsign = result.data.asignaciones || {};
                var asignacionesSets = {};
                Object.keys(rawAsign).forEach(function(rKey) {
                    // Map to Number to ensure Set lookups work against IDs
                    asignacionesSets[rKey] = new Set(rawAsign[rKey].map(Number));
                });
                gAsignar.asignaciones = asignacionesSets;

                // 3. Initialize rowPairs to empty (will fill in initRowPairs)
                gAsignar.rowPairs = [];

            } else {
                alert("Error cargando datos: " + (result.error || "Desconocido"));
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión");
        }
    }

    function initRowPairs() {
        gAsignar.rowPairs = [];
        var processed = new Set();

        // Iterate assignments to build existing pairs
        Object.keys(gAsignar.asignaciones).forEach(function(rKey) {
            var rolId = rKey; // key is string, but == handles it
            var permSet = gAsignar.asignaciones[rKey];

            permSet.forEach(function(pid) {
                var p = gAsignar.actividad_permisos.find(function(ap){ return ap.actividad_permiso_id == pid; });
                if (p) {
                    var key = rolId + "-" + p.actividad_id;
                    if (!processed.has(key)) {
                        gAsignar.rowPairs.push({ rol_id: rolId, actividad_id: p.actividad_id });
                        processed.add(key);
                    }
                }
            });
        });
    }

    function initGrid() {
        if (!el.grid) return;

        grid = new Tabulator(el.grid, {
            data: buildRows(),
            layout: "fitColumns",
            height: "calc(70vh)",
            index: "_rowKey",
            columns: [
                { title: "#", formatter: "rownum", width: 50, hozAlign: "center", headerSort: false },
                {
                    title: "Rol",
                    field: "rol",
                    headerFilter: "input",
                    formatter: function (cell) {
                        return '<span class="info-badge" data-kind="rol" title="Ver descripción">i</span>' +
                            '<span class="rol-text">' + escapeHtml(cell.getValue()) + '</span>';
                    },
                    cellClick: function (e, cell) {
                        if (e.target.closest(".info-badge")) {
                            var rid = cell.getRow().getData().rol_id;
                            var role = findRol(rid); // Uses gAsignar
                            if(role) openInfo("Rol: " + role.rol, role.descripcion);
                        }
                    }
                },
                {
                    title: "Actividad",
                    field: "actividad",
                    headerFilter: "input",
                    formatter: function (cell) {
                        return '<span class="info-badge" data-kind="actividad" title="Ver descripción">i</span>' +
                            '<span class="actividad-text">' + escapeHtml(cell.getValue()) + '</span>';
                    },
                    cellClick: function (e, cell) {
                        if (e.target.closest(".info-badge")) {
                            var aid = cell.getRow().getData().actividad_id;
                            var act = findActividad(aid); // Uses gAsignar
                            if(act) openInfo("Actividad: " + act.actividad, act.descripcion);
                        }
                    }
                },
                {
                    title: "Rol Puede",
                    field: "rolPuedeText",
                    headerFilter: "input",
                    widthGrow: 2,
                    cssClass: "cell-chips",
                    formatter: function (cell) {
                        var d = cell.getRow().getData();
                        if (!isEditMode) return d.rolPuedeText;

                        return (d.rolPuede || []).map(function(lbl, i) {
                            return createChip(lbl, d.rolPermIds[i], d.rol_id, d.actividad_id, true);
                        }).join("");
                    }
                },
                {
                    title: "Sin Permiso",
                    field: "sinPermisoText",
                    headerFilter: "input",
                    widthGrow: 2,
                    cssClass: "cell-chips",
                    formatter: function (cell) {
                        var d = cell.getRow().getData();
                        if (!isEditMode) return d.sinPermisoText;

                        return (d.actTieneMissing || []).map(function(lbl, i) {
                            return createChip(lbl, d.actTieneMissingIds[i], d.rol_id, d.actividad_id, false);
                        }).join("");
                    }
                },
                {
                    title: "Permisos de la actividad",
                    field: "actTieneText",
                    headerFilter: "input",
                    widthGrow: 3,
                    cssClass: "cell-chips",
                    formatter: function (cell) {
                        var d = cell.getRow().getData();
                        if (!isEditMode) {
                            return (d.actTieneAllSorted || []).map(function(p) {
                                return p.isAssigned ? "<strong>"+escapeHtml(p.label)+"</strong>" : escapeHtml(p.label);
                            }).join(", ");
                        }
                        return (d.actTieneAllSorted || []).map(function(p) {
                            return createChip(p.label, p.apid, d.rol_id, d.actividad_id, p.isAssigned);
                        }).join("");
                    }
                }
            ]
        });

        grid.on("tableBuilt", function() { updateCols(); });
    }

    // --- Core Logic using gAsignar and Loose Equality (==) ---

    function findRol(id) {
        return gAsignar.roles.find(function(r) { return r.rol_id == id; });
    }

    function findActividad(id) {
        return gAsignar.actividades.find(function(a) { return a.actividad_id == id; });
    }

    function getPermsByActividad(id) {
        return gAsignar.actividad_permisos.filter(function(p) { return p.actividad_id == id; });
    }

    function buildRows() {
        var rows = [];
        // Ensure rowPairs exists to avoid "slice undefined" error
        var pairs = (gAsignar.rowPairs || []).slice();

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
            var assignedSet = gAsignar.asignaciones[role.rol_id] || new Set();

            var rolPuede = [];
            var rolPermIds = [];
            var actTieneMissing = [];
            var actTieneMissingIds = [];
            var actTieneAllSorted = [];

            allPerms.forEach(function(perm) {
                var pid = parseInt(perm.actividad_permiso_id, 10);
                var isAssigned = assignedSet.has(pid); // Works because we converted to Set(Number) in loadData

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

    // --- Actions & Events ---

    function createChip(label, apid, rolId, actId, isAssigned) {
        var cls = isAssigned ? "perm-assigned" : "perm-unassigned";
        var val = isAssigned ? "1" : "0";
        return '<span class="perm-toggle '+cls+'" data-assigned="'+val+'" data-rol-id="'+rolId+'" data-act-id="'+actId+'" data-apid="'+apid+'">' + escapeHtml(label) + '</span>';
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

        // Chip Toggle
        el.grid.addEventListener("click", function(e) {
            var chip = e.target.closest(".perm-toggle");
            if (chip && isEditMode) {
                var rolId = chip.dataset.rolId;
                var actId = chip.dataset.actId;
                var apid = parseInt(chip.dataset.apid); // Parse to match Set(Number)
                var isAssigned = chip.dataset.assigned == "1";

                chip.classList.add("chip--pending");
                var newState = isAssigned ? 0 : 1;

                fetch(API_URL, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ action: 'toggle', rol_id: rolId, actividad_permiso_id: apid, state: newState })
                }).then(function(r){ return r.json(); }).then(function(res){
                    chip.classList.remove("chip--pending");
                    if(res.success) {
                        // Update gAsignar set
                        if(!gAsignar.asignaciones[rolId]) gAsignar.asignaciones[rolId] = new Set();
                        if(newState) gAsignar.asignaciones[rolId].add(apid);
                        else gAsignar.asignaciones[rolId].delete(apid);

                        // Ensure pair exists
                        var exists = gAsignar.rowPairs.some(function(p){ return p.rol_id == rolId && p.actividad_id == actId; });
                        if(!exists) gAsignar.rowPairs.push({rol_id: rolId, actividad_id: actId});

                        grid.setData(buildRows());
                    } else {
                        alert("Error: " + res.error);
                    }
                });
            }
        });

        if (el.btnNew && isEditMode) el.btnNew.addEventListener("click", openDialogNew);
        if (el.btnExport) el.btnExport.addEventListener("click", function() { grid.download("csv", "permisos.csv"); });

        if(el.dlg) {
            el.dlg.querySelector('[data-action="save"]').addEventListener("click", saveDialog);
            el.dlg.querySelectorAll('[data-action="close"]').forEach(function(b){ b.addEventListener("click", function(){ el.dlg.close(); }); });
        }
        if(el.dlgInfo) {
            el.dlgInfo.querySelectorAll('[data-action="close-info"]').forEach(function(b){ b.addEventListener("click", function(){ el.dlgInfo.close(); }); });
        }
        if(el.permSearch) {
            el.permSearch.addEventListener("input", function() {
                var q = el.permSearch.value.toLowerCase();
                el.permList.querySelectorAll("li").forEach(function(li){
                    li.style.display = li.textContent.toLowerCase().includes(q) ? "" : "none";
                });
            });
        }
    }

    function openDialogNew() {
        el.dlgTitle.textContent = "Asignar permisos";
        el.permSearch.value = "";
        el.permList.innerHTML = "";

        if(tsRol) tsRol.destroy();
        if(tsAct) tsAct.destroy();

        var rOpts = gAsignar.roles.map(function(r){ return {value:r.rol_id, text:r.rol}; });
        var aOpts = gAsignar.actividades.map(function(a){ return {value:a.actividad_id, text:a.actividad}; });

        tsRol = new TomSelect(el.selRol, {options: rOpts, maxItems:1, placeholder:"Seleccione rol..."});
        tsAct = new TomSelect(el.selAct, {options: aOpts, maxItems:1, placeholder:"Seleccione actividad..."});

        function rebuild() {
            var rid = tsRol.getValue(); var aid = tsAct.getValue();
            if(!rid || !aid) { el.permList.innerHTML = ""; return; }
            var all = getPermsByActividad(aid);
            var assignedSet = gAsignar.asignaciones[rid] || new Set();

            var html = "";
            all.forEach(function(p){
                var pid = parseInt(p.actividad_permiso_id);
                var chk = assignedSet.has(pid) ? "checked" : "";
                html += '<li class="ocAsignar_perm_item"><label style="display:flex;gap:8px;width:100%"><input type="checkbox" '+chk+' data-id="'+pid+'"/><div><strong>'+escapeHtml(p.etiqueta)+'</strong> <span class="ocAsignar_perm_code">('+escapeHtml(p.permiso)+')</span></div></label></li>';
            });
            el.permList.innerHTML = html;
        }

        tsRol.on("change", rebuild);
        tsAct.on("change", rebuild);
        el.dlg.showModal();
    }

    function saveDialog() {
        var rid = tsRol.getValue(); var aid = tsAct.getValue();
        if(!rid || !aid) { alert("Seleccione Rol y Actividad"); return; }

        var ids = [];
        el.permList.querySelectorAll('input:checked').forEach(function(cb){ ids.push(parseInt(cb.dataset.id)); });

        fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'save_batch', rol_id: rid, actividad_id: aid, permisos: ids })
        }).then(function(r){ return r.json(); }).then(function(res){
            if(res.success) {
                var all = getPermsByActividad(aid);
                if(!gAsignar.asignaciones[rid]) gAsignar.asignaciones[rid] = new Set();

                // Remove existing for this activity
                all.forEach(function(p){ gAsignar.asignaciones[rid].delete(parseInt(p.actividad_permiso_id)); });
                // Add new
                ids.forEach(function(id){ gAsignar.asignaciones[rid].add(id); });

                var exists = gAsignar.rowPairs.some(function(p){ return p.rol_id == rid && p.actividad_id == aid; });
                if(!exists) gAsignar.rowPairs.push({rol_id: rid, actividad_id: aid});

                grid.setData(buildRows());
                el.dlg.close();
            } else {
                alert("Error: " + res.error);
            }
        });
    }

    function openInfo(title, text) {
        el.dlgInfoTitle.textContent = title;
        el.dlgInfoText.textContent = text || "";
        el.dlgInfo.showModal();
    }

    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function(c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }

})();