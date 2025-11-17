/* File: roles.js - Roles management with mock fetch */

(function () {
    var API_URL = "./api/roles_api.php";

    var SAMPLE = {
        roles: [
            { rol_id: 1, rol: "Administrador", descripcion: "Acceso completo a todo el sistema", registrado_el: "2024-01-15 10:30:00", registrado_por: "admin" },
            { rol_id: 2, rol: "Operador", descripcion: "Opera pedidos: lectura y actualización de estado", registrado_el: "2024-01-15 10:31:00", registrado_por: "admin" },
            { rol_id: 3, rol: "Analista", descripcion: "Consulta reportes y exportaciones", registrado_el: "2024-01-15 10:32:00", registrado_por: "admin" },
            { rol_id: 4, rol: "Supervisor", descripcion: "Supervisa operaciones y genera reportes", registrado_el: "2024-02-01 09:00:00", registrado_por: "admin" }
        ],
        usuarios: [
            { usuario_id: 101, nick: "jperez", nombre: "Juan Pérez" },
            { usuario_id: 102, nick: "mgarcia", nombre: "María García" },
            { usuario_id: 103, nick: "lmartinez", nombre: "Luis Martínez" },
            { usuario_id: 104, nick: "alopez", nombre: "Ana López" },
            { usuario_id: 105, nick: "crodriguez", nombre: "Carlos Rodríguez" },
            { usuario_id: 106, nick: "shernandez", nombre: "Sara Hernández" }
        ],
        rol_usuario: [
            { rol_id: 1, usuario_id: 101 },
            { rol_id: 1, usuario_id: 102 },
            { rol_id: 2, usuario_id: 103 },
            { rol_id: 2, usuario_id: 104 },
            { rol_id: 2, usuario_id: 105 },
            { rol_id: 3, usuario_id: 106 },
            { rol_id: 4, usuario_id: 102 },
            { rol_id: 4, usuario_id: 103 }
        ]
    };

    // Fetch override
    var originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (url.includes('roles_api.php')) {
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
                if (!window.mockRolesData) {
                    window.mockRolesData = JSON.parse(JSON.stringify(SAMPLE));
                }
                response = { success: true, error: null, data: window.mockRolesData };
                break;
            case 'save':
                window.mockRolesData = JSON.parse(JSON.stringify(body.data));
                response = { success: true, error: null, data: window.mockRolesData };
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
    var grid, tsAddUser;
    var tableReady = false;
    var dialogMode = "new";
    var editingRolId = null;
    var isEditMode = getInitialModeFromUrl();

    // Initialize
    document.addEventListener("DOMContentLoaded", function() {
        initElements();
        loadState().then(function(loadedState) {
            state = loadedState || SAMPLE;
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
            selAddUser: document.getElementById("selAddUser"),
            btnAddUser: document.getElementById("btnAddUser"),
            usersList: document.getElementById("usersList")
        };
    }

    function initGrid() {
        if (!el.grid || typeof Tabulator === "undefined") return;

        grid = new Tabulator(el.grid, {
            data: buildRows(),
            layout: "fitColumns",
            reactiveData: false,
            height: "calc(70vh)",
            index: "rol_id",
            columns: [
                { title: "#", formatter: "rownum", width: 50, hozAlign: "center", headerSort: false },

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

                        var parts = [];
                        for (var i = 0; i < d.usuarios.length; i++) {
                            var u = d.usuarios[i];
                            parts.push('<span class="user-nick-readonly" title="' + escapeHtml(u.nombre) + '">' +
                                escapeHtml(u.nick) + '</span>');
                        }
                        return parts.join(', ');  // ← COMMA SEPARATED

                    }
                },

                {
                    title: "Acciones",
                    field: "actions",
                    headerSort: false,
                    width: 120,
                    hozAlign: "center",
                    visible: isEditMode,
                    formatter: function (cell) {
                        return '<button class="btn-icon btn-edit" title="Editar">✏️</button>' +
                               '<button class="btn-icon btn-delete" title="Eliminar">🗑️</button>';
                    },
                    cellClick: function (e, cell) {
                        if (e.target.closest(".btn-edit")) {
                            onEditClick(cell);
                        } else if (e.target.closest(".btn-delete")) {
                            onDeleteClick(cell);
                        }
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
                        (data.descripcion || "").toLowerCase().indexOf(q) >= 0 ||
                        (data.usuarios_text || "").toLowerCase().indexOf(q) >= 0
                    );
                });
            });
        }

        if (el.btnNew && isEditMode) {
            el.btnNew.addEventListener("click", openNewDialog);
        }

        if (el.btnExport) {
            el.btnExport.addEventListener("click", exportCSV);
        }

        if (isEditMode && el.dlg) {
            var closeBtns = el.dlg.querySelectorAll('[data-action="close"]');
            for (var i = 0; i < closeBtns.length; i++) {
                closeBtns[i].addEventListener("click", function () {
                    closeDialog();
                });
            }

            el.dlg.addEventListener("cancel", function (e) {
                e.preventDefault();
                closeDialog();
            });

            var saveBtn = el.dlg.querySelector('[data-action="save"]');
            if (saveBtn) {
                saveBtn.addEventListener("click", function () {
                    saveDialog();
                });
            }
        }

        if (isEditMode && typeof TomSelect !== "undefined" && el.selAddUser) {
            var userOpts = state.usuarios.map(function (u) {
                return { value: u.usuario_id, text: u.nick + " - " + u.nombre };
            });

            tsAddUser = new TomSelect(el.selAddUser, {
                options: userOpts,
                maxItems: 1,
                create: false,
                placeholder: "Seleccionar usuario…",
                persist: false,
                plugins: []
            });
        }

        if (el.btnAddUser && isEditMode) {
            el.btnAddUser.addEventListener("click", addUserToRole);
        }
    }

    function buildRows() {
        var rows = [];

        for (var i = 0; i < state.roles.length; i++) {
            var role = state.roles[i];
            var userIds = getUserIdsForRole(role.rol_id);
            var usuarios = [];
            var usuariosText = [];

            for (var j = 0; j < userIds.length; j++) {
                var user = findUser(userIds[j]);
                if (user) {
                    usuarios.push(user);
                    usuariosText.push(user.nick);
                }
            }

            rows.push({
                rol_id: role.rol_id,
                rol: role.rol,
                descripcion: role.descripcion || "",
                registrado_el: role.registrado_el || "",
                registrado_por: role.registrado_por || "",
                usuarios: usuarios,
                usuarios_text: usuariosText.join(", ")
            });
        }

        return rows;
    }

    function refreshGrid() {
        if (!grid) return;
        var newData = buildRows();
        grid.setData(newData);
    }

    function openNewDialog() {
        dialogMode = "new";
        editingRolId = null;
        el.dlgTitle.textContent = "Nuevo Rol";

        el.editRol.value = "";
        el.editDescripcion.value = "";
        el.editId.textContent = "Nuevo";
        el.editRegistradoEl.textContent = "-";
        el.editRegistradoPor.textContent = "-";
        
        refreshUsersList([]);
        openDialog();
    }

    function onEditClick(cell) {
        var rowData = cell.getRow().getData();
        var role = findRole(rowData.rol_id);
        if (!role) return;

        dialogMode = "edit";
        editingRolId = role.rol_id;
        el.dlgTitle.textContent = "Editar Rol";

        el.editRol.value = role.rol;
        el.editDescripcion.value = role.descripcion || "";
        el.editId.textContent = role.rol_id;
        el.editRegistradoEl.textContent = role.registrado_el || "-";
        el.editRegistradoPor.textContent = role.registrado_por || "-";
        
        var userIds = getUserIdsForRole(role.rol_id);
        refreshUsersList(userIds);
        openDialog();
    }

    function onDeleteClick(cell) {
        var rowData = cell.getRow().getData();
        var role = findRole(rowData.rol_id);
        if (!role) return;

        var userCount = getUserIdsForRole(role.rol_id).length;
        
        OcDialog.confirm(
            "¿Está seguro que desea eliminar el rol \"" + role.rol + "\"?" +
            (userCount > 0 ? "\n\nTiene " + userCount + " usuario(s) asignado(s)." : ""),
            "Confirmar Eliminación",
            "⚠️",
            "Eliminar",
            "🗑️",
            "Cancelar",
            "✗"
        ).then(function() {
            deleteRole(role.rol_id);
        }).catch(function() {
            // Cancelled
        });
    }

    function deleteRole(rol_id) {
        // Remove role
        state.roles = state.roles.filter(function(r) {
            return r.rol_id !== rol_id;
        });

        // Remove all user assignments
        state.rol_usuario = state.rol_usuario.filter(function(ru) {
            return ru.rol_id !== rol_id;
        });

        persist();
        refreshGrid();
    }

    function saveDialog() {
        var rolName = (el.editRol.value || "").trim();
        if (!rolName) {
            alert("El nombre del rol es requerido");
            return;
        }

        var descripcion = (el.editDescripcion.value || "").trim();

        if (dialogMode === "new") {
            // Check if role name exists
            var existing = state.roles.find(function(r) {
                return r.rol.toLowerCase() === rolName.toLowerCase();
            });

            if (existing) {
                // Just show the existing role
                editingRolId = existing.rol_id;
                dialogMode = "edit";
                el.dlgTitle.textContent = "Editar Rol";
                el.editId.textContent = existing.rol_id;
                el.editRegistradoEl.textContent = existing.registrado_el || "-";
                el.editRegistradoPor.textContent = existing.registrado_por || "-";
                var userIds = getUserIdsForRole(existing.rol_id);
                refreshUsersList(userIds);
                return;
            }

            // Create new role
            var maxId = 0;
            for (var i = 0; i < state.roles.length; i++) {
                if (state.roles[i].rol_id > maxId) maxId = state.roles[i].rol_id;
            }
            var newId = maxId + 1;

            var now = new Date();
            var timestamp = now.getFullYear() + "-" + 
                           pad(now.getMonth() + 1) + "-" + 
                           pad(now.getDate()) + " " + 
                           pad(now.getHours()) + ":" + 
                           pad(now.getMinutes()) + ":" + 
                           pad(now.getSeconds());

            state.roles.push({
                rol_id: newId,
                rol: rolName,
                descripcion: descripcion,
                registrado_el: timestamp,
                registrado_por: "system"
            });

            editingRolId = newId;
            el.editId.textContent = newId;
            el.editRegistradoEl.textContent = timestamp;
            el.editRegistradoPor.textContent = "system";
            dialogMode = "edit";
            el.dlgTitle.textContent = "Editar Rol";

        } else {
            // Update existing role
            var role = findRole(editingRolId);
            if (role) {
                role.rol = rolName;
                role.descripcion = descripcion;
            }
        }

        persist();
        refreshGrid();
        closeDialog();
    }

    function addUserToRole() {
        if (!editingRolId) return;

        var userId = tsAddUser ? parseInt(tsAddUser.getValue()) : null;
        if (!userId) return;

        // Check if already assigned
        var exists = state.rol_usuario.some(function(ru) {
            return ru.rol_id === editingRolId && ru.usuario_id === userId;
        });

        if (!exists) {
            state.rol_usuario.push({
                rol_id: editingRolId,
                usuario_id: userId
            });
            persist();
        }

        var userIds = getUserIdsForRole(editingRolId);
        refreshUsersList(userIds);
        
        if (tsAddUser) tsAddUser.clear();
    }

    function removeUserFromRole(usuario_id) {
        if (!editingRolId) return;

        state.rol_usuario = state.rol_usuario.filter(function(ru) {
            return !(ru.rol_id === editingRolId && ru.usuario_id === usuario_id);
        });

        persist();

        var userIds = getUserIdsForRole(editingRolId);
        refreshUsersList(userIds);
    }

    function refreshUsersList(userIds) {
        if (!el.usersList) return;

        if (userIds.length === 0) {
            el.usersList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Sin usuarios asignados</div>';
            return;
        }

        var html = "";
        for (var i = 0; i < userIds.length; i++) {
            var user = findUser(userIds[i]);
            if (!user) continue;

            html += '<div class="user-item">' +
                    '<span class="user-nick" title="' + escapeHtml(user.nombre) + '">' + 
                    escapeHtml(user.nick) + '</span>' +
                    '<span class="user-nombre">' + escapeHtml(user.nombre) + '</span>' +
                    '<button class="btn-remove-user" data-user-id="' + user.usuario_id + '">✕</button>' +
                    '</div>';
        }

        el.usersList.innerHTML = html;

        // Add event listeners to remove buttons
        var removeBtns = el.usersList.querySelectorAll('.btn-remove-user');
        for (var i = 0; i < removeBtns.length; i++) {
            removeBtns[i].addEventListener('click', function() {
                var userId = parseInt(this.dataset.userId);
                removeUserFromRole(userId);
            });
        }
    }

    function openDialog() {
        try {
            el.dlg.showModal();
        } catch (e) {
            el.dlg.setAttribute("open", "");
        }
        OcDialogDrag.initialize(el.dlg);
    }

    function closeDialog() {
        try {
            el.dlg.close();
        } catch (e) {
            el.dlg.removeAttribute("open");
        }
        
        el.editRol.value = "";
        el.editDescripcion.value = "";
        if (tsAddUser) tsAddUser.clear();
        el.usersList.innerHTML = "";
    }

    function exportCSV() {
        var lines = [];
        lines.push(csvRow(["rol_id", "rol", "descripcion", "usuarios"]));

        var data = buildRows();
        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            lines.push(csvRow([
                row.rol_id,
                row.rol,
                row.descripcion,
                row.usuarios_text
            ]));
        }

        var csv = lines.join("\r\n");
        downloadText("roles_" + Date.now() + ".csv", csv, "text/csv");
    }

    function findRole(rol_id) {
        return state.roles.find(function (r) { return r.rol_id === rol_id; });
    }

    function findUser(usuario_id) {
        return state.usuarios.find(function (u) { return u.usuario_id === usuario_id; });
    }

    function getUserIdsForRole(rol_id) {
        return state.rol_usuario
            .filter(function(ru) { return ru.rol_id === rol_id; })
            .map(function(ru) { return ru.usuario_id; });
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
        var serializable = JSON.parse(JSON.stringify(state));

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

    function pad(n) {
        return n < 10 ? "0" + n : n;
    }

    function getInitialModeFromUrl() {
        var params = new URLSearchParams(window.location.search);
        return params.get("mode") === "edit";
    }

})();
