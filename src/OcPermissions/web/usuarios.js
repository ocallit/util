/* File: usuarios.js - User management */

(function () {
    var API_URL = "./api/usuarios_api.php";

    // State: {usuarios: [...], roles: [...]}
    var state = null;
    var el = {};
    var grid;
    var tsRoles = null; // Choices instance
    var dialogMode = "new"; // "new", "edit", "view"
    var editingUsuarioId = null;
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
            grid: document.getElementById("gridUsuarios"),
            txtSearch: document.getElementById("txtSearch"),
            btnNew: document.getElementById("btnNew"),
            btnExport: document.getElementById("btnExport"),
            dlg: document.getElementById("dlgEdit"),
            dlgTitle: document.getElementById("dlgTitle"),
            editNick: document.getElementById("editNick"),
            editNombre: document.getElementById("editNombre"),
            editCel: document.getElementById("editCel"),
            editEmail: document.getElementById("editEmail"),
            editEstatus: document.getElementById("editEstatus"),
            editCaducidad: document.getElementById("editCaducidad"),
            editForzarCambio: document.getElementById("editForzarCambio"),
            editPassword: document.getElementById("editPassword"),
            btnShowPass: document.getElementById("btnShowPass"),
            selRoles: document.getElementById("selRoles"),
            editNota: document.getElementById("editNota"),
            grpPassword: document.getElementById("grpPassword"),
            rolesEditContainer: document.getElementById("rolesEditContainer"),
            rolesReadContainer: document.getElementById("rolesReadContainer"),
            rolesReadText: document.getElementById("rolesReadText"),
            viewEstatus: document.getElementById("viewEstatus"),
            viewCaducidad: document.getElementById("viewCaducidad"),
            viewForzarCambio: document.getElementById("viewForzarCambio"),
            viewNota: document.getElementById("viewNota"),
            editId: document.getElementById("editId"),
            editCreadoEl: document.getElementById("editCreadoEl"),
            editCreadoPor: document.getElementById("editCreadoPor"),
            editUltimoLogin: document.getElementById("editUltimoLogin"),
            editProximoCambioPass: document.getElementById("editProximoCambioPass"),
            editUltimoCambioPass: document.getElementById("editUltimoCambioPass"),
            editUltimoCambioEl: document.getElementById("editUltimoCambioEl"),
            editUltimoCambioPor: document.getElementById("editUltimoCambioPor")
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
                state = { usuarios: [], roles: [] };
            }
        } catch (e) {
            console.error('Error loading data:', e);
            state = { usuarios: [], roles: [] };
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
                            openDialog(cell.getRow().getData().usuario_id, "view");
                        } else if (isEditMode && e.target.closest(".btn-edit")) {
                            openDialog(cell.getRow().getData().usuario_id, "edit");
                        } else if (isEditMode && e.target.closest(".btn-delete")) {
                            onDeleteClick(cell.getRow().getData().usuario_id);
                        }
                    }
                },
                {
                    title: "Nick",
                    field: "nick",
                    sorter: "string",
                    headerFilter: "input",
                    widthGrow: 1
                },
                {
                    title: "Nombre",
                    field: "nombre",
                    sorter: "string",
                    headerFilter: "input",
                    widthGrow: 2
                },
                {
                    title: "Estatus",
                    field: "estatus",
                    sorter: "string",
                    headerFilter: "input",
                    width: 120
                },
                {
                    title: "Email",
                    field: "email",
                    sorter: "string",
                    headerFilter: "input",
                    widthGrow: 2
                },
                {
                    title: "Roles",
                    field: "roles_text",
                    sorter: "string",
                    headerFilter: "input",
                    widthGrow: 2
                }
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
                    return (data.nick || "").toLowerCase().includes(q) ||
                           (data.nombre || "").toLowerCase().includes(q) ||
                           (data.email || "").toLowerCase().includes(q) ||
                           (data.roles_text || "").toLowerCase().includes(q);
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

        if (el.btnShowPass) {
            el.btnShowPass.addEventListener('click', function() {
                el.editPassword.type = el.editPassword.type === 'password' ? 'text' : 'password';
                el.btnShowPass.textContent = el.editPassword.type === 'password' ? '👁️' : '🙈';
            });
        }
    }

    function buildRows() {
        if (!state || !state.usuarios) return [];
        return state.usuarios.map(function(user) {
            var roles = user.roles || [];
            return {
                usuario_id: user.usuario_id,
                nick: user.nick,
                nombre: user.nombre,
                estatus: user.estatus || "",
                email: user.email || "",
                cel: user.cel || "",
                nota: user.nota || "",
                password_forza_cambio: user.password_forza_cambio || "No",
                password_caducidad_dias: user.password_caducidad_dias || 90,
                password_ultimo_cambio: user.password_ultimo_cambio || "",
                ultimo_login: user.ultimo_login || null,
                creado_el: user.creado_el || "",
                creado_por: user.creado_por || "",
                ultimo_cambio_el: user.ultimo_cambio_el || "",
                ultimo_cambio_por: user.ultimo_cambio_por || "",
                roles: roles,
                roles_text: roles.map(function(r) { return r.rol; }).join(", ")
            };
        });
    }

    function refreshGrid() {
        if (grid) grid.setData(buildRows());
    }

    function openDialog(usuarioId, mode) {
        dialogMode = mode;
        editingUsuarioId = usuarioId ? parseInt(usuarioId, 10) : null;

        var user = editingUsuarioId ? findUser(editingUsuarioId) : null;
        var selectedRoleIds = user ? (user.roles || []).map(function(r) { return parseInt(r.rol_id, 10); }) : [];

        // Set title
        el.dlgTitle.textContent = mode === "new" ? "Nuevo Usuario" : (mode === "edit" ? "Editar Usuario" : "Ver Usuario");

        // Fill form
        el.editNick.value = user ? user.nick : "";
        el.editNombre.value = user ? user.nombre : "";
        el.editCel.value = user ? (user.cel || "") : "";
        el.editEmail.value = user ? (user.email || "") : "";
        el.editEstatus.value = user ? user.estatus : "Puede Login";
        el.editCaducidad.value = user ? user.password_caducidad_dias : 90;
        el.editForzarCambio.value = user ? user.password_forza_cambio : "No";
        el.editPassword.value = "";
        el.editNota.value = user ? (user.nota || "") : "";

        el.editId.textContent = user ? user.usuario_id : "Nuevo";
        el.editCreadoEl.textContent = user ? (user.creado_el || "-") : "-";
        el.editCreadoPor.textContent = user ? (user.creado_por || "-") : "-";
        el.editUltimoLogin.textContent = user ? (user.ultimo_login || "-") : "-";
        el.editUltimoCambioPass.textContent = user ? (user.password_ultimo_cambio || "-") : "-";
        el.editUltimoCambioEl.textContent = user ? (user.ultimo_cambio_el || "-") : "-";
        el.editUltimoCambioPor.textContent = user ? (user.ultimo_cambio_por || "-") : "-";
        el.editProximoCambioPass.textContent = user ? calculateExpiryDate(user.password_ultimo_cambio, user.password_caducidad_dias) : "-";

        // Set read-only state
        var isReadOnly = mode === "view";
        el.editNick.disabled = isReadOnly;
        el.editNombre.disabled = isReadOnly;
        el.editCel.disabled = isReadOnly;
        el.editEmail.disabled = isReadOnly;

        // Toggle between Input and View Elements
        if (isReadOnly) {
            el.editEstatus.style.display = 'none';
            el.editCaducidad.style.display = 'none';
            el.editForzarCambio.style.display = 'none';
            el.editNota.style.display = 'none';
            el.grpPassword.style.display = 'none';
            el.rolesEditContainer.style.display = 'none';

            el.viewEstatus.style.display = 'flex';
            el.viewCaducidad.style.display = 'flex';
            el.viewForzarCambio.style.display = 'flex';
            el.viewNota.style.display = 'flex';
            el.rolesReadContainer.style.display = 'block';

            el.viewEstatus.textContent = user ? user.estatus : "";
            el.viewCaducidad.textContent = user ? user.password_caducidad_dias : "";
            el.viewForzarCambio.textContent = user ? user.password_forza_cambio : "";
            el.viewNota.textContent = user ? (user.nota || "") : "";

            var rolesText = selectedRoleIds.map(function(rid) {
                var role = findRole(rid);
                return role ? role.rol : "";
            }).filter(function(n) { return n; }).join(", ") || "-";
            el.rolesReadText.textContent = rolesText;
        } else {
            el.editEstatus.style.display = 'block';
            el.editCaducidad.style.display = 'block';
            el.editForzarCambio.style.display = 'block';
            el.editNota.style.display = 'block';
            el.grpPassword.style.display = 'flex';
            el.rolesEditContainer.style.display = 'block';

            el.viewEstatus.style.display = 'none';
            el.viewCaducidad.style.display = 'none';
            el.viewForzarCambio.style.display = 'none';
            el.viewNota.style.display = 'none';
            el.rolesReadContainer.style.display = 'none';

            setupRolesSelect(selectedRoleIds);
        }

        // Show/hide save button
        el.dlg.querySelector('[data-action="save"]').style.display = isReadOnly ? 'none' : '';
        el.dlg.querySelector('[data-action="close"]:not(.ocdialog_close)').textContent = isReadOnly ? 'Cerrar' : 'Cancelar';

        // Show dialog
        el.dlg.showModal();
        OcDialogDrag.initialize(el.dlg);
        el.editPassword.type = 'password';
        el.btnShowPass.textContent = '👁️';
    }

    function setupRolesSelect(selectedRoleIds) {
        // Destroy previous Choices if exists
        if (tsRoles) {
            tsRoles.destroy();
            tsRoles = null;
        }

        // Clear and populate select element
        el.selRoles.innerHTML = '';
        state.roles.forEach(function(r) {
            var opt = document.createElement('option');
            opt.value = r.rol_id;
            opt.textContent = r.rol;
            opt.selected = selectedRoleIds.includes(parseInt(r.rol_id, 10));
            el.selRoles.appendChild(opt);
        });

        // Initialize Choices
        tsRoles = new Choices(el.selRoles, {
            removeItemButton: true,
            searchEnabled: true
        });
    }

    function closeDialog() {
        if (tsRoles) {
            tsRoles.destroy();
            tsRoles = null;
        }
        el.dlg.close();
    }

    async function saveDialog() {
        var nick = (el.editNick.value || "").trim();
        var nombre = (el.editNombre.value || "").trim();

        if (!nick || !nombre) {
            alert("Nick y Nombre son requeridos");
            return;
        }

        // Get selected role IDs from Choices
        var roleIds = tsRoles ? tsRoles.getValue(true).map(function(v) { return parseInt(v, 10); }) : [];

        var password = (el.editPassword.value || "").trim();

        // Validate password for new users
        if (dialogMode === "new" && !password) {
            alert("Password es requerido para nuevos usuarios");
            return;
        }

        try {
            var payload = {
                action: 'save',
                usuario_id: editingUsuarioId || 0,
                nick: nick,
                nombre: nombre,
                email: (el.editEmail.value || "").trim(),
                cel: (el.editCel.value || "").trim(),
                estatus: el.editEstatus.value,
                password_caducidad_dias: parseInt(el.editCaducidad.value) || 90,
                password_forza_cambio: el.editForzarCambio.value,
                nota: (el.editNota.value || "").trim(),
                roles: roleIds
            };

            // Only include password if it's provided
            if (password) {
                payload.password = password;
            }

            var response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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

    function onDeleteClick(usuarioId) {
        var user = findUser(usuarioId);
        if (!user) return;

        var rolesCount = (user.roles || []).length;
        OcDialog.confirm(
            "¿Eliminar el usuario \"" + user.nick + "\"?" + (rolesCount > 0 ? "\n\nTiene " + rolesCount + " rol(es) asignado(s)." : ""),
            "Confirmar Eliminación", "⚠️", "Eliminar", "🗑️", "Cancelar", "✗"
        ).then(function() {
            deleteUser(usuarioId);
        }).catch(function() {});
    }

    async function deleteUser(usuarioId) {
        try {
            var response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', usuario_id: usuarioId })
            });
            var result = await response.json();
            if (result.success) {
                state.usuarios = state.usuarios.filter(function(u) { return parseInt(u.usuario_id, 10) !== parseInt(usuarioId, 10); });
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
        var lines = [csvRow(["usuario_id", "nick", "nombre", "email", "estatus", "roles"])];
        buildRows().forEach(function(row) {
            lines.push(csvRow([row.usuario_id, row.nick, row.nombre, row.email, row.estatus, row.roles_text]));
        });
        downloadText("usuarios_" + Date.now() + ".csv", lines.join("\r\n"), "text/csv");
    }

    function findUser(usuarioId) {
        if (!state || !state.usuarios) return null;
        return state.usuarios.find(function(u) { return parseInt(u.usuario_id, 10) === parseInt(usuarioId, 10); });
    }

    function findRole(rolId) {
        if (!state || !state.roles) return null;
        return state.roles.find(function(r) { return parseInt(r.rol_id, 10) === parseInt(rolId, 10); });
    }

    function calculateExpiryDate(last, days) {
        if (!last || !days) return "No caduca";
        try {
            var d = new Date(last.replace(' ', 'T'));
            d.setDate(d.getDate() + days);
            return d.toISOString().split('T')[0];
        } catch (e) {
            return "-";
        }
    }

    function csvRow(arr) { return arr.map(csvEscape).join(","); }
    function csvEscape(v) { var s = String(v == null ? "" : v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function(c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
    function downloadText(f, t, m) { var b = new Blob([t], {type: m}), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = f; a.click(); URL.revokeObjectURL(u); }

})();
