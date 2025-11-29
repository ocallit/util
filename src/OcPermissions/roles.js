/* File: roles.js - Roles management (simplified) */

(function () {
    var API_URL = "./api/roles_api.php";

    // State: {roles: [...], usuarios: [...]}
    var state = null;
    var el = {};
    var grid;
    var tsUsers = null; // TomSelect instance
    var dialogMode = "new"; // "new", "edit", "view"
    var editingRolId = null;
    var isEditMode = new URLSearchParams(window.location.search).get("mode") === "edit";

    // Initialize
    document.addEventListener("DOMContentLoaded", function() {
        initElements();
        loadData().then(function() {
            initGrid();
            initEventHandlers();
        });
    });

    function initElements() {
        el = {
            grid: document.getElementById("gridRoles"),
            txtSearch: document.getElementById("txtSearch"),
            btnNew: document.getElementById("btnNew"),
            btnExport: document.getElementById("btnExport"),
            dlg: document.getElementById("dlgEdit"),
            dlgTitle: document.getElementById("dlgTitle"),
            editRol: document.getElementById("editRol"),
            editDescripcion: document.getElementById("editDescripcion"),
            editId: document.getElementById("editId"),
            editRegistradoEl: document.getElementById("editRegistradoEl"),
            editRegistradoPor: document.getElementById("editRegistradoPor"),
            selUsers: document.getElementById("selUsers"),
            usersViewList: document.getElementById("usersViewList")
        };
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
                state = result.data;
            } else {
                console.error('Error loading data:', result.error);
                state = { roles: [], usuarios: [] };
            }
        } catch (e) {
            console.error('Error loading data:', e);
            state = { roles: [], usuarios: [] };
        }
    }

    function initGrid() {
        if (!el.grid || typeof Tabulator === "undefined") return;

        grid = new Tabulator(el.grid, {
            data: buildRows(),
            layout: "fitColumns",
            height: "calc(70vh)",
            columns: [
                { title: "#", formatter: "rownum", width: 50, hozAlign: "center", headerSort: false },
                {
                    title: "Acciones",
                    field: "actions",
                    headerSort: false,
                    width: isEditMode ? 150 : 60,
                    hozAlign: "center",
                    formatter: function (cell) {
                        var buttons = '<button class="btn-icon btn-view" title="Ver">👁️</button>';
                        if (isEditMode) {
                            buttons += '<button class="btn-icon btn-edit" title="Editar">✏️</button>' +
                                '<button class="btn-icon btn-delete" title="Eliminar">🗑️</button>';
                        }
                        return buttons;
                    },
                    cellClick: function (e, cell) {
                        if (e.target.closest(".btn-view")) {
                            openDialog(cell.getRow().getData().rol_id, "view");
                        } else if (isEditMode && e.target.closest(".btn-edit")) {
                            openDialog(cell.getRow().getData().rol_id, "edit");
                        } else if (isEditMode && e.target.closest(".btn-delete")) {
                            onDeleteClick(cell.getRow().getData().rol_id);
                        }
                    }
                },
                {
                    title: "Rol",
                    field: "rol",
                    sorter: "string",
                    headerFilter: "input",
                    widthGrow: 2
                },
                {
                    title: "Descripción",
                    field: "descripcion",
                    sorter: "string",
                    headerFilter: "input",
                    widthGrow: 3
                },
                {
                    title: "Usuarios",
                    field: "usuarios_text",
                    sorter: "string",
                    headerFilter: "input",
                    widthGrow: 3,
                    formatter: function(cell) {
                        var d = cell.getRow().getData();
                        if (!d.usuarios || d.usuarios.length === 0) {
                            return '<span style="color:#999;">Sin usuarios</span>';
                        }
                        var parts = d.usuarios.map(function(u) {
                            return '<span class="user-nick-readonly" title="' + escapeHtml(u.nombre) + '">' +
                                escapeHtml(u.nick) + '</span>';
                        });
                        return parts.join(', ');
                    }
                },

            ]
        });
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
                    return (data.rol || "").toLowerCase().includes(q) ||
                           (data.descripcion || "").toLowerCase().includes(q) ||
                           (data.usuarios_text || "").toLowerCase().includes(q);
                });
            });
        }

        if (el.btnNew) {
            el.btnNew.addEventListener("click", function() {
                openDialog(null, "new");
            });
        }

        if (el.btnExport) {
            el.btnExport.addEventListener("click", exportCSV);
        }

        if (el.dlg) {
            el.dlg.querySelectorAll('[data-action="close"]').forEach(function(btn) {
                btn.addEventListener("click", closeDialog);
            });

            el.dlg.addEventListener("cancel", function (e) {
                e.preventDefault();
                closeDialog();
            });

            var saveBtn = el.dlg.querySelector('[data-action="save"]');
            if (saveBtn) {
                saveBtn.addEventListener("click", saveDialog);
            }
        }
    }

    function buildRows() {
        if (!state || !state.roles) return [];
        return state.roles.map(function(role) {
            var usuarios = role.usuarios || [];
            return {
                rol_id: role.rol_id,
                rol: role.rol,
                descripcion: role.descripcion || "",
                registrado_el: role.registrado_el || "",
                registrado_por: role.registrado_por || "",
                usuarios: usuarios,
                usuarios_text: usuarios.map(function(u) { return u.nick; }).join(", ")
            };
        });
    }

    function refreshGrid() {
        if (grid) grid.setData(buildRows());
    }

    function openDialog(rolId, mode) {
        dialogMode = mode;
        editingRolId = rolId ? parseInt(rolId, 10) : null;

        var role = editingRolId ? findRole(editingRolId) : null;
        var selectedUserIds = role ? (role.usuarios || []).map(function(u) { return parseInt(u.usuario_id, 10); }) : [];

        // Set title
        el.dlgTitle.textContent = mode === "new" ? "Nuevo Rol" : (mode === "edit" ? "Editar Rol" : "Ver Rol");

        // Fill form
        el.editRol.value = role ? role.rol : "";
        el.editDescripcion.value = role ? (role.descripcion || "") : "";
        el.editId.textContent = role ? role.rol_id : "Nuevo";
        el.editRegistradoEl.textContent = role ? (role.registrado_el || "-") : "-";
        el.editRegistradoPor.textContent = role ? (role.registrado_por || "-") : "-";

        // Set read-only state
        var isReadOnly = mode === "view";
        el.editRol.readOnly = isReadOnly;
        el.editDescripcion.readOnly = isReadOnly;

        // Show/hide controls
        el.dlg.querySelector('[data-action="save"]').style.display = isReadOnly ? 'none' : '';
        el.dlg.querySelector('[data-action="close"]:not(.ocdialog_close)').textContent = isReadOnly ? 'Cerrar' : 'Cancelar';

        // Handle users section
        if (isReadOnly) {
            // View mode: show simple list
            el.selUsers.style.display = 'none';
            el.usersViewList.style.display = '';
            renderUsersViewList(selectedUserIds);
        } else {
            // Edit mode: show TomSelect
            el.selUsers.style.display = '';
            el.usersViewList.style.display = 'none';
            setupUsersSelect(selectedUserIds);
        }

        // Show dialog
        el.dlg.showModal();
        OcDialogDrag.initialize(el.dlg);
    }

    function setupUsersSelect(selectedUserIds) {
        // Destroy previous TomSelect if exists
        if (tsUsers) {
            tsUsers.destroy();
            tsUsers = null;
        }

        // Clear and populate select element
        el.selUsers.innerHTML = '';
        state.usuarios.forEach(function(u) {
            var opt = document.createElement('option');
            opt.value = u.usuario_id;
            opt.textContent = u.nick + ' - ' + u.nombre;
            opt.selected = selectedUserIds.includes(parseInt(u.usuario_id, 10));
            el.selUsers.appendChild(opt);
        });

        // Initialize TomSelect
        tsUsers = new TomSelect(el.selUsers, {
            plugins: ['remove_button'],
            maxItems: null,
            create: false,
            placeholder: 'Seleccionar usuarios...'
        });
    }

    function renderUsersViewList(selectedUserIds) {
        if (selectedUserIds.length === 0) {
            el.usersViewList.innerHTML = '<div style="color:#999;text-align:center;padding:20px;">Sin usuarios asignados</div>';
            return;
        }

        var html = selectedUserIds.map(function(uid) {
            var user = state.usuarios.find(function(u) { return parseInt(u.usuario_id, 10) === uid; });
            if (!user) return '';
            return '<div class="user-view-item">' +
                   '<span class="user-nick" title="' + escapeHtml(user.nombre) + '">' + escapeHtml(user.nick) + '</span>' +
                   '<span class="user-nombre">' + escapeHtml(user.nombre) + '</span>' +
                   '</div>';
        }).join('');

        el.usersViewList.innerHTML = html;
    }

    function closeDialog() {
        if (tsUsers) {
            tsUsers.destroy();
            tsUsers = null;
        }
        el.dlg.close();
    }

    async function saveDialog() {
        var rolName = (el.editRol.value || "").trim();
        if (!rolName) {
            alert("El nombre del rol es requerido");
            return;
        }

        // Get selected user IDs from TomSelect
        var usuarioIds = tsUsers ? tsUsers.getValue().map(function(v) { return parseInt(v, 10); }) : [];

        try {
            var response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save',
                    rol_id: editingRolId || 0,
                    rol: rolName,
                    descripcion: (el.editDescripcion.value || "").trim(),
                    usuarios: usuarioIds
                })
            });

            var result = await response.json();
            if (result.success) {
                state = result.data;
                refreshGrid();
                closeDialog();
            } else {
                alert('Error al guardar: ' + result.error);
            }
        } catch (e) {
            console.error('Error saving:', e);
            alert('Error de conexión al guardar');
        }
    }

    function onDeleteClick(rolId) {
        var role = findRole(rolId);
        if (!role) return;

        var userCount = (role.usuarios || []).length;
        OcDialog.confirm(
            "¿Eliminar el rol \"" + role.rol + "\"?" + (userCount > 0 ? "\n\nTiene " + userCount + " usuario(s) asignado(s)." : ""),
            "Confirmar Eliminación", "⚠️", "Eliminar", "🗑️", "Cancelar", "✗"
        ).then(function() {
            deleteRole(rolId);
        }).catch(function() {});
    }

    async function deleteRole(rolId) {
        try {
            var response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', rol_id: rolId })
            });
            var result = await response.json();
            if (result.success) {
                state.roles = state.roles.filter(function(r) { return parseInt(r.rol_id, 10) !== parseInt(rolId, 10); });
                refreshGrid();
            } else {
                alert('Error al eliminar: ' + result.error);
            }
        } catch (e) {
            console.error('Error deleting:', e);
            alert('Error de conexión al eliminar');
        }
    }

    function exportCSV() {
        var lines = [csvRow(["rol_id", "rol", "descripcion", "usuarios"])];
        buildRows().forEach(function(row) {
            lines.push(csvRow([row.rol_id, row.rol, row.descripcion, row.usuarios_text]));
        });
        downloadText("roles_" + Date.now() + ".csv", lines.join("\r\n"), "text/csv");
    }

    function findRole(rolId) {
        if (!state || !state.roles) return null;
        return state.roles.find(function(r) { return parseInt(r.rol_id, 10) === parseInt(rolId, 10); });
    }

    function csvRow(arr) { return arr.map(csvEscape).join(","); }
    function csvEscape(v) { var s = String(v == null ? "" : v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function(c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
    function downloadText(f, t, m) { var b = new Blob([t], {type: m}), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = f; a.click(); URL.revokeObjectURL(u); }

})();
