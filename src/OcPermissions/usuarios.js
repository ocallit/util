/* File: usuarios.js - User management with mock fetch */

(function () {
    var API_URL = "./api/usuarios_api.php";

    // Mock Data actualizado con los campos del schema
    var SAMPLE = {
        usuarios: [
            {
                usuario_id: 101, nick: "jperez", nombre: "Juan Pérez",
                estatus: "Puede Login", nota: "Usuario admin", email: "jperez@mail.com", cel: "5512345678",
                password_forza_cambio: "No", password_caducidad_dias: 90, password_ultimo_cambio: "2024-01-15 10:30:00",
                ultimo_login: "2025-11-17 10:00:00",
                creado_el: "2024-01-15 10:30:00", creado_por: "system",
                ultimo_cambio_el: "2024-01-15 10:30:00", ultimo_cambio_por: "system"
            },
            {
                usuario_id: 102, nick: "mgarcia", nombre: "María García",
                estatus: "Puede Login", nota: "", email: "mgarcia@mail.com", cel: "5587654321",
                password_forza_cambio: "No", password_caducidad_dias: 30, password_ultimo_cambio: "2025-10-30 11:00:00",
                ultimo_login: "2025-11-16 09:00:00",
                creado_el: "2024-01-16 11:00:00", creado_por: "jperez",
                ultimo_cambio_el: "2025-10-30 11:00:00", ultimo_cambio_por: "jperez"
            },
            {
                usuario_id: 103, nick: "lmartinez", nombre: "Luis Martínez",
                estatus: "No Puede Login", nota: "Usuario inactivo", email: "lmartinez@mail.com", cel: "5511223344",
                password_forza_cambio: "No", password_caducidad_dias: 0, password_ultimo_cambio: "2024-01-17 12:30:00", // 0 = no caduca
                ultimo_login: null,
                creado_el: "2024-01-17 12:30:00", creado_por: "jperez",
                ultimo_cambio_el: "2024-01-17 12:30:00", ultimo_cambio_por: "jperez"
            }
        ],
        roles: [
            { rol_id: 1, rol: "Administrador" },
            { rol_id: 2, rol: "Operador" },
            { rol_id: 3, rol: "Analista" },
            { rol_id: 4, rol: "Supervisor" }
        ],
        rol_usuario: [
            { rol_id: 1, usuario_id: 101 }, { rol_id: 2, usuario_id: 101 }, { rol_id: 3, usuario_id: 101 }, { rol_id: 4, usuario_id: 101 },
            { rol_id: 2, usuario_id: 102 },
            { rol_id: 3, usuario_id: 103 }
        ]
    };

    // --- Mock Fetch Override ---
    var originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (url.includes('usuarios_api.php')) {
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
        if (!window.mockUsuariosData) {
            window.mockUsuariosData = JSON.parse(JSON.stringify(SAMPLE));
        }

        switch (action) {
            case 'load':
                response = { success: true, error: null, data: window.mockUsuariosData };
                break;
            case 'save':
                window.mockUsuariosData = JSON.parse(JSON.stringify(body.data));
                response = { success: true, error: null, data: window.mockUsuariosData };
                break;
            default:
                response = { success: false, error: 'Unknown action', data: null };
        }

        return {
            ok: response.success,
            json: () => Promise.resolve(response)
        };
    }
    // --- Fin Mock Fetch ---

    var state = null;
    var el = {};
    var grid, tsRoles;
    var tableReady = false;
    var dialogMode = "new";
    var editingUsuarioId = null;

    function getInitialModeFromUrl() {
        var params = new URLSearchParams(window.location.search);
        return params.get("mode") === "edit";
    }
    var isEditMode = getInitialModeFromUrl();


    // Initialize
    document.addEventListener("DOMContentLoaded", function() {
        initElements();
        loadState().then(function(loadedState) {
            state = loadedState || SAMPLE;
            initGrid();
            initEventHandlers();
            initTomSelect(); // Se llama siempre
        });
    });

    function initElements() {
        el = {
            grid: document.getElementById("gridUsuarios"),
            txtSearch: document.getElementById("txtSearch"),
            btnNew: document.getElementById("btnNew"),
            btnExport: document.getElementById("btnExport"),
            // Dialog
            dlg: document.getElementById("dlgEdit"),
            dlgTitle: document.getElementById("dlgTitle"),
            btnSave: document.querySelector('#dlgEdit [data-action="save"]'),
            editNick: document.getElementById("editNick"),
            editNombre: document.getElementById("editNombre"),
            editEstatus: document.getElementById("editEstatus"),
            editCaducidad: document.getElementById("editCaducidad"),
            editPassword: document.getElementById("editPassword"),
            btnShowPass: document.getElementById("btnShowPass"),
            editForzarCambio: document.getElementById("editForzarCambio"),
            editEmail: document.getElementById("editEmail"),
            editCel: document.getElementById("editCel"),
            editNota: document.getElementById("editNota"),
            editId: document.getElementById("editId"),
            editCreadoEl: document.getElementById("editCreadoEl"),
            editCreadoPor: document.getElementById("editCreadoPor"),
            editUltimoLogin: document.getElementById("editUltimoLogin"),
            editUltimoCambioPass: document.getElementById("editUltimoCambioPass"),
            editProximoCambioPass: document.getElementById("editProximoCambioPass"), // <-- Nuevo
            editUltimoCambioEl: document.getElementById("editUltimoCambioEl"),
            editUltimoCambioPor: document.getElementById("editUltimoCambioPor"),
            selRoles: document.getElementById("selRoles")
        };
    }

    function initGrid() {
        if (!el.grid || typeof Tabulator === "undefined") return;

        grid = new Tabulator(el.grid, {
            data: buildRows(),
            layout: "fitColumns",
            reactiveData: false,
            height: "calc(70vh)",
            index: "usuario_id",
            columns: [
                { title: "#", formatter: "rownum", width: 50, hozAlign: "center", headerSort: false },

                {
                    title: "Acciones",
                    field: "actions",
                    headerSort: false,
                    width: 120,
                    hozAlign: "center",
                    formatter: function (cell) {
                        let buttons = `<button class="btn-icon btn-view" title="Ver">👁️</button>`;
                        if (isEditMode) {
                            buttons += `<button class="btn-icon btn-edit" title="Editar">✏️</button>` +
                                `<button class="btn-icon btn-delete" title="Eliminar">🗑️</button>`;
                        }
                        return buttons;
                    },
                    cellClick: function (e, cell) {
                        const target = e.target.closest("button");
                        if (!target) return;

                        const rowData = cell.getRow().getData();
                        const user = findUser(rowData.usuario_id);
                        if (!user) return;

                        if (target.classList.contains('btn-view')) {
                            openEditDialog(user, true); // true = readOnly
                        } else if (isEditMode) {
                            if (target.classList.contains('btn-edit')) {
                                openEditDialog(user, false); // false = not readOnly
                            } else if (target.classList.contains('btn-delete')) {
                                onDeleteClick(user);
                            }
                        }
                    }
                },

                { title: "Nick", field: "nick", sorter: "string", headerFilter: "input", widthGrow: 1 },
                { title: "Nombre", field: "nombre", sorter: "string", headerFilter: "input", widthGrow: 2 },
                { title: "Estatus", field: "estatus", sorter: "string", headerFilter: "input", width: 150 },
                { title: "Email", field: "email", sorter: "string", headerFilter: "input", widthGrow: 2 },
                {
                    title: "Roles",
                    field: "roles_text",
                    sorter: "string",
                    headerFilter: "input",
                    widthGrow: 3,
                    formatter: function(cell) {
                        var d = cell.getRow().getData();
                        if (!d.roles_text) {
                            return '<span style="color:#999;">Sin roles</span>';
                        }
                        return escapeHtml(d.roles_text);
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
                grid.setFilter(function (data) {
                    return (
                        (data.nick || "").toLowerCase().includes(q) ||
                        (data.nombre || "").toLowerCase().includes(q) ||
                        (data.email || "").toLowerCase().includes(q) ||
                        (data.roles_text || "").toLowerCase().includes(q)
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

        if (el.dlg) {
            el.dlg.querySelectorAll('[data-action="close"]').forEach(btn => {
                btn.addEventListener("click", closeDialog);
            });
            el.dlg.addEventListener("cancel", (e) => {
                e.preventDefault();
                closeDialog();
            });
            el.dlg.querySelector('[data-action="save"]').addEventListener("click", saveDialog);
        }

        if (el.btnShowPass) {
            el.btnShowPass.addEventListener('click', function() {
                var isPass = el.editPassword.type === 'password';
                el.editPassword.type = isPass ? 'text' : 'password';
                this.textContent = isPass ? '🙈' : '👁️';
            });
        }
    }

    function initTomSelect() {
        if (typeof TomSelect !== "undefined" && el.selRoles) {
            var roleOpts = state.roles.map(function (r) {
                return { value: r.rol_id, text: r.rol };
            });

            tsRoles = new TomSelect(el.selRoles, {
                options: roleOpts,
                create: false,
                persist: false,
                plugins: ['remove_button'],
                maxItems: null,
                dropdownParent: 'body'
            });

            tsRoles.setDisabled(true); // Deshabilitado por defecto
        }
    }

    function buildRows() {
        return state.usuarios.map(function(user) {
            var roleIds = getRoleIdsForUser(user.usuario_id);
            var roles = [];
            var rolesText = [];

            roleIds.forEach(function(rol_id) {
                var role = findRole(rol_id);
                if (role) {
                    roles.push(role);
                    rolesText.push(role.rol);
                }
            });

            return {
                ...user,
                roles: roles,
                roles_text: rolesText.join(", ")
            };
        });
    }

    function refreshGrid() {
        if (!grid) return;
        grid.setData(buildRows());
    }

    function openNewDialog() {
        dialogMode = "new";
        editingUsuarioId = null;
        openEditDialog(null, false);
    }

    function openEditDialog(user, readOnly = false) {
        if (!tsRoles) {
            console.error("TomSelect no está inicializado.");
            OcDialog.error("Error al abrir el diálogo: Componente de roles no cargado.");
            return;
        }

        if (user) {
            // Editando o Viendo
            dialogMode = "edit";
            editingUsuarioId = user.usuario_id;
            el.dlgTitle.textContent = readOnly ? "Ver Usuario" : "Editar Usuario";

            // Poblar formulario
            el.editNick.value = user.nick;
            el.editNombre.value = user.nombre;
            el.editEstatus.value = user.estatus;
            el.editCaducidad.value = user.password_caducidad_dias;
            el.editPassword.value = "";
            el.editForzarCambio.value = user.password_forza_cambio;
            el.editEmail.value = user.email || "";
            el.editCel.value = user.cel || "";
            el.editNota.value = user.nota || "";

            // Poblar info
            el.editId.textContent = user.usuario_id;
            el.editCreadoEl.textContent = user.creado_el || "-";
            el.editCreadoPor.textContent = user.creado_por || "-";
            el.editUltimoLogin.textContent = user.ultimo_login || "-";
            el.editUltimoCambioPass.textContent = user.password_ultimo_cambio || "-";
            el.editUltimoCambioEl.textContent = user.ultimo_cambio_el || "-";
            el.editUltimoCambioPor.textContent = user.ultimo_cambio_por || "-";
            el.editProximoCambioPass.textContent = calculateExpiryDate(user.password_ultimo_cambio, user.password_caducidad_dias);

            var roleIds = getRoleIdsForUser(user.usuario_id);
            tsRoles.setValue(roleIds);

        } else {
            // Nuevo
            dialogMode = "new";
            editingUsuarioId = null;
            el.dlgTitle.textContent = "Nuevo Usuario";

            // Limpiar formulario
            el.editNick.value = "";
            el.editNombre.value = "";
            el.editEstatus.value = "Puede Login";
            el.editCaducidad.value = 90;
            el.editPassword.value = "";
            el.editForzarCambio.value = "Si";
            el.editEmail.value = "";
            el.editCel.value = "";
            el.editNota.value = "";

            // Limpiar info
            el.editId.textContent = "Nuevo";
            el.editCreadoEl.textContent = "-";
            el.editCreadoPor.textContent = "-";
            el.editUltimoLogin.textContent = "-";
            el.editUltimoCambioPass.textContent = "-";
            el.editProximoCambioPass.textContent = "-";
            el.editUltimoCambioEl.textContent = "-";
            el.editUltimoCambioPor.textContent = "-";

            tsRoles.clear();
        }

        // Aplicar estado ReadOnly
        const inputs = [el.editNick, el.editNombre, el.editEstatus, el.editCaducidad, el.editPassword, el.editEmail, el.editCel, el.editNota];
        inputs.forEach(input => input.readOnly = readOnly);
        el.editForzarCambio.disabled = readOnly;
        el.btnShowPass.style.display = readOnly ? 'none' : (isEditMode ? 'block' : 'none');

        tsRoles.setDisabled(readOnly);

        el.btnSave.style.display = readOnly ? 'none' : 'block';

        openDialog();
    }

    function onDeleteClick(user) {
        if (!user) return;

        OcDialog.confirm(
            "¿Está seguro que desea eliminar al usuario <strong>" + escapeHtml(user.nick) + "</strong> (" + escapeHtml(user.nombre) + ")?",
            "Confirmar Eliminación",
            "⚠️",
            "Eliminar",
            "🗑️",
            "Cancelar",
            "✗"
        ).then(function() {
            deleteUser(user.usuario_id);
        }).catch(function(err) {
            // Cancelado
        });
    }

    function deleteUser(usuario_id) {
        state.usuarios = state.usuarios.filter(function(u) {
            return u.usuario_id !== usuario_id;
        });
        state.rol_usuario = state.rol_usuario.filter(function(ru) {
            return ru.usuario_id !== usuario_id;
        });

        persist();
        refreshGrid();
    }

    function saveDialog() {
        var nick = el.editNick.value.trim();
        var nombre = el.editNombre.value.trim();
        if (!nick || !nombre) {
            OcDialog.error("Nick y Nombre son requeridos.");
            return;
        }

        var password = el.editPassword.value.trim();
        var formData = {
            nick: nick,
            nombre: nombre,
            estatus: el.editEstatus.value,
            password_caducidad_dias: parseInt(el.editCaducidad.value) || 90,
            password_forza_cambio: el.editForzarCambio.value,
            email: el.editEmail.value.trim(),
            cel: el.editCel.value.trim(),
            nota: el.editNota.value.trim()
        };

        var selectedRoleIds = tsRoles.getValue().map(id => parseInt(id));
        var now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        if (dialogMode === "new") {
            if (!password) {
                OcDialog.error("Para un nuevo usuario, el password es requerido.");
                return;
            }

            var maxId = Math.max(0, ...state.usuarios.map(u => u.usuario_id));
            var newId = maxId + 1;

            var newUser = {
                ...formData,
                usuario_id: newId,
                // password_hash: "hashed_" + password, // No guardamos el hash en el mock
                password_ultimo_cambio: now,
                creado_el: now,
                creado_por: "system",
                ultimo_cambio_el: now,
                ultimo_cambio_por: "system",
                ultimo_login: null
            };

            state.usuarios.push(newUser);

            selectedRoleIds.forEach(function(rol_id) {
                state.rol_usuario.push({ rol_id: rol_id, usuario_id: newId });
            });

        } else {
            var user = findUser(editingUsuarioId);
            if (user) {
                Object.assign(user, formData);
                user.ultimo_cambio_el = now;
                user.ultimo_cambio_por = "system_edit";

                if (password) {
                    // user.password_hash = "hashed_" + password;
                    user.password_ultimo_cambio = now;
                }
            }

            state.rol_usuario = state.rol_usuario.filter(function(ru) {
                return ru.usuario_id !== editingUsuarioId;
            });

            selectedRoleIds.forEach(function(rol_id) {
                state.rol_usuario.push({ rol_id: rol_id, usuario_id: editingUsuarioId });
            });
        }

        persist();
        refreshGrid();
        closeDialog();
    }

    function openDialog() {
        try {
            el.dlg.showModal();
        } catch (e) {
            el.dlg.setAttribute("open", "");
        }
        OcDialogDrag.initialize(el.dlg);
        OcDialogDrag.centerDialog(el.dlg);
        // Reset password field type on open
        el.editPassword.type = 'password';
        el.btnShowPass.textContent = '👁️';
    }

    function closeDialog() {
        try {
            el.dlg.close();
        } catch (e) {
            el.dlg.removeAttribute("open");
        }
    }

    function exportCSV() {
        var lines = [];
        lines.push(csvRow(["usuario_id", "nick", "nombre", "estatus", "email", "cel", "roles"]));

        var data = buildRows();
        data.forEach(function(row) {
            lines.push(csvRow([
                row.usuario_id,
                row.nick,
                row.nombre,
                row.estatus,
                row.email,
                row.cel,
                row.roles_text
            ]));
        });

        downloadText("usuarios_" + Date.now() + ".csv", lines.join("\r\n"), "text/csv");
    }

    // --- Helpers ---
    function findUser(usuario_id) {
        return state.usuarios.find(function (u) { return u.usuario_id === usuario_id; });
    }

    function findRole(rol_id) {
        return state.roles.find(function (r) { return r.rol_id === rol_id; });
    }

    // --- ¡¡¡BUGFIX CRÍTICO!!! ---
    function getRoleIdsForUser(usuario_id) {
        return state.rol_usuario
            .filter(function(ru) { return ru.usuario_id === usuario_id; })
            .map(function(ru) { return ru.rol_id; }); // <-- Debe ser ru.rol_id
    }
    // --- FIN BUGFIX ---

    /**
     * Calcula la fecha de expiración del password
     */
    function calculateExpiryDate(lastChangeStr, days) {
        if (!lastChangeStr || !days || days <= 0) {
            return "No caduca";
        }
        try {
            var lastChangeDate = new Date(lastChangeStr.replace(' ', 'T'));
            if (isNaN(lastChangeDate)) return "-";

            lastChangeDate.setDate(lastChangeDate.getDate() + days);
            return lastChangeDate.toISOString().split('T')[0];
        } catch (e) {
            return "-";
        }
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
        try {
            var response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save',
                    data: state
                })
            });
            var result = await response.json();
            if (!result.success) console.error('Error persisting data:', result.error);
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
            if (result.success && result.data) return result.data;
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

})();