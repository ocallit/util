// File: asignar_permisos_edit.js
// Uses AsignarPermisosShared (data, helpers) and adds EDIT behaviour:
// - chips in grid
// - "Nuevo" dialog
// - calls to responder with accion=...
// Modified: Uses fetch instead of localStorage

(function (global) {
    "use strict";

    var shared = global.AsignarPermisosShared;
    if (!shared) {
        console.error("AsignarPermisosShared no está definido");
        return;
    }

    var grid;
    var el = {};
    var tsRol, tsAct;

    var AsignarPermisosEdit = {
        init: init
    };

    global.AsignarPermisosEdit = AsignarPermisosEdit;

    function init() {
        el.grid       = document.getElementById("gridAssign");
        el.txtSearch  = document.getElementById("txtSearch");
        el.btnNew     = document.getElementById("btnNew");
        el.btnExport  = document.getElementById("btnExport");
        el.dlg        = document.getElementById("dlgAssign");
        el.dlgTitle   = document.getElementById("dlgTitle");
        el.selRol     = document.getElementById("selRol");
        el.selAct     = document.getElementById("selAct");
        el.permSearch = document.getElementById("permSearch");
        el.permList   = document.getElementById("permList");
        el.dlgInfo      = document.getElementById("dlgInfo");
        el.dlgInfoTitle = document.getElementById("dlgInfoTitle");
        el.dlgInfoText  = document.getElementById("dlgInfoText");

        if (!el.grid || typeof global.Tabulator === "undefined") return;

        // Wait for state to be initialized before setting up grid
        waitForState().then(function() {
            setupGrid();
            setupEventHandlers();
        });
    }

    function waitForState() {
        return new Promise(function(resolve) {
            var checkInterval = setInterval(function() {
                if (shared.state && shared.state.roles) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
        });
    }

    function setupGrid() {
        // --- Grid en modo edición (chips, etc.) ---
        grid = new Tabulator(el.grid, {
            data: shared.buildRows(),
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
                            '<span class="rol-text">' + shared.escapeHtml(d.rol) + '</span>'
                        );
                    },
                    cellClick: function (e, cell) {
                        if (!e.target.closest(".info-badge")) return;
                        var d = cell.getRow().getData();
                        var r = shared.findRol(d.rol_id);
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
                            '<span class="actividad-text">' + shared.escapeHtml(d.actividad) + '</span>'
                        );
                    },
                    cellClick: function (e, cell) {
                        if (!e.target.closest(".info-badge")) return;
                        var d = cell.getRow().getData();
                        var a = shared.findActividad(d.actividad_id);
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
                    cssClass: "cell-chips",
                    formatter: function (cell) {
                        var d = cell.getRow().getData();
                        if (!d.rolPuede || !d.rolPermIds) return "";
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
                                shared.escapeHtml(label) +
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
                        var html = "";
                        // asignados
                        for (var i = 0; i < d.actTieneAssigned.length; i++) {
                            var labelA = d.actTieneAssigned[i];
                            var apidA  = d.actTieneAssignedIds[i];
                            html +=
                                '<span class="chip ok" ' +
                                'data-type="act" data-assigned="1" ' +
                                'data-rol-id="' + d.rol_id + '" ' +
                                'data-act-id="' + d.actividad_id + '" ' +
                                'data-apid="' + apidA + '">' +
                                shared.escapeHtml(labelA) +
                                "</span>";
                        }
                        // faltantes
                        for (var j = 0; j < d.actTieneMissing.length; j++) {
                            var labelM = d.actTieneMissing[j];
                            var apidM  = d.actTieneMissingIds[j];
                            html +=
                                '<span class="chip missing" ' +
                                'data-type="act" data-assigned="0" ' +
                                'data-rol-id="' + d.rol_id + '" ' +
                                'data-act-id="' + d.actividad_id + '" ' +
                                'data-apid="' + apidM + '">' +
                                shared.escapeHtml(labelM) +
                                "</span>";
                        }
                        return html;
                    }
                }
            ]
        });
    }

    function setupEventHandlers() {
        // --- Búsqueda global ---
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

        // --- Exportar CSV ---
        if (el.btnExport) {
            el.btnExport.addEventListener("click", function () {
                var csv = shared.buildAssignmentsCSV();
                shared.downloadText("asignaciones_" + Date.now() + ".csv", csv, "text/csv");
            });
        }

        // --- Botón Nuevo ---
        if (el.btnNew) {
            el.btnNew.addEventListener("click", function () {
                openDialogNew();
            });
        }

        // --- Click en chips ---
        if (el.grid) {
            el.grid.addEventListener("click", function (e) {
                var chip = e.target.closest(".chip");
                if (chip) handleChipClick(chip);
            });
        }

        // --- Tom Select para Rol y Actividad ---
        if (typeof TomSelect !== "undefined" && el.selRol && el.selAct) {
            var rolesOpts = shared.state.roles.map(function (r) {
                return { value: r.rol_id, text: r.rol };
            });
            var actsOpts = shared.state.actividades.map(function (a) {
                return { value: a.actividad_id, text: a.actividad };
            });

            tsRol = new TomSelect(el.selRol, {
                options: rolesOpts,
                maxItems: 1,
                create: false,
                placeholder: "Seleccione rol…"
            });

            tsAct = new TomSelect(el.selAct, {
                options: actsOpts,
                maxItems: 1,
                create: false,
                placeholder: "Seleccione actividad…"
            });
        }

        // --- Búsqueda en lista de permisos ---
        if (el.permSearch) {
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

        // --- Cerrar / Guardar diálogo ---
        var closeBtn = el.dlg.querySelector('[data-action="close"]');
        if (closeBtn) {
            closeBtn.addEventListener("click", function () {
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

        // Sortable en la lista de permisos (no afecta la lógica, sólo UX)
        if (typeof Sortable !== "undefined") {
            new Sortable(el.permList, { animation: 120 });
        }

        // Info dialog (cierres)
        if (el.dlgInfo) {
            var infoClose = document.querySelectorAll('[data-action="close-info"]');
            for (var k = 0; k < infoClose.length; k++) {
                infoClose[k].addEventListener("click", function (e) {
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

    // ---------- Chips ----------
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
            // En "Rol Puede": click => ya no lo tiene
            newAssigned = false;
        } else {
            // En "Actividad tiene": toggle
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

            var set = shared.getAssignedSetForRole(rolId);
            if (newAssigned) set.add(apid);
            else set.delete(apid);

            shared.addRowPair(rolId, actId);
            shared.persist();
            refreshGrid();
        }).catch(function (err) {
            console.error(err);
            chipEl.classList.remove("chip--pending");
            alert("No se pudo actualizar el permiso.");
        });
    }

    // ---------- Diálogo "Nuevo" / batch ----------
    function openDialogNew() {
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
        var assigned = shared.getAssignedPermsForRoleActividad(rol_id, actividad_id);
        buildPermList(actividad_id, assigned);
    }

    function buildPermList(actividad_id, assignedIdsArray) {
        var assignedSet = new Set(assignedIdsArray || []);
        var perms = shared.getPermsByActividad(actividad_id);
        var html = "";
        for (var i = 0; i < perms.length; i++) {
            var p = perms[i];
            var checked = assignedSet.has(p.actividad_permiso_id) ? "checked" : "";
            html +=
                '<li class="ocAsignar_perm_item" data-id="' + p.actividad_permiso_id + '">' +
                '<label style="display:flex; gap:8px; align-items:flex-start; cursor:pointer;">' +
                '<input type="checkbox" ' + checked + ' data-id="' + p.actividad_permiso_id + '"/>' +
                '<div>' +
                '<div><strong>' + shared.escapeHtml(p.etiqueta) + '</strong> ' +
                '<span class="ocAsignar_perm_code">(' + shared.escapeHtml(p.permiso) + ')</span>' +
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
            var set = shared.getAssignedSetForRole(rol_id);
            var allIds = shared.getPermsByActividad(actividad_id).map(function (p) {
                return p.actividad_permiso_id;
            });
            for (var j = 0; j < allIds.length; j++) set.delete(allIds[j]);
            for (var k = 0; k < nextIds.length; k++) set.add(nextIds[k]);

            shared.addRowPair(rol_id, actividad_id);
            shared.persist();
            refreshGrid();
            closeMainDialog();
        }).catch(function (err) {
            console.error(err);
            alert("No se pudo guardar los permisos.");
        });
    }

    // ---------- Responder (stub sólo front end) ----------
    function callResponder(payload) {
        // Sólo front-end ahora. Implementar llamada real más adelante.
        // payload.accion ∈ { "toggle_perm", "guardar_permiso_actividad" }
        return new Promise(function (resolve) {
            setTimeout(resolve, 120);
        });
    }

    // ---------- Info Dialog ----------
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

    // ---------- Refresh ----------
    function refreshGrid() {
        if (!grid) return;
        grid.setData(shared.buildRows());
    }

})(window);
