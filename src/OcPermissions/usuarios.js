/* File: usuarios.js - User management with mock fetch */

(function () {
    var API_URL = "./api/usuarios_api.php";

    var SAMPLE = {
        usuarios: [
            { usuario_id: 101, nick: "jperez", nombre: "Juan Pérez", estatus: "Puede Login", email: "jperez@mail.com", cel: "5512345678", password_forza_cambio: "No", password_caducidad_dias: 90, password_ultimo_cambio: "2024-01-15 10:30:00", ultimo_login: "2025-11-17 10:00:00", creado_el: "2024-01-15 10:30:00", creado_por: "system", ultimo_cambio_el: "2024-01-15 10:30:00", ultimo_cambio_por: "system" },
            { usuario_id: 102, nick: "mgarcia", nombre: "María García", estatus: "Puede Login", email: "mgarcia@mail.com", cel: "5587654321", password_forza_cambio: "No", password_caducidad_dias: 90, password_ultimo_cambio: "2024-01-16 11:00:00", ultimo_login: "2025-11-16 09:00:00", creado_el: "2024-01-16 11:00:00", creado_por: "jperez", ultimo_cambio_el: "2024-01-16 11:00:00", ultimo_cambio_por: "jperez" },
            { usuario_id: 103, nick: "lmartinez", nombre: "Luis Martínez", estatus: "No Puede Login", email: "lmartinez@mail.com", cel: "5511223344", password_forza_cambio: "No", password_caducidad_dias: 90, password_ultimo_cambio: "2024-01-17 12:30:00", ultimo_login: null, creado_el: "2024-01-17 12:30:00", creado_por: "jperez", ultimo_cambio_el: "2024-01-17 12:30:00", ultimo_cambio_por: "jperez" }
        ],
        roles: [
            { rol_id: 1, rol: "Administrador" }, { rol_id: 2, rol: "Operador" }, { rol_id: 3, rol: "Analista" }, { rol_id: 4, rol: "Supervisor" }
        ],
        rol_usuario: [
            { rol_id: 1, usuario_id: 101 }, { rol_id: 2, usuario_id: 101 }, { rol_id: 2, usuario_id: 102 }
        ]
    };

    var originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (url.includes('usuarios_api.php')) return mockAPIResponse(url, options);
        return originalFetch(url, options);
    };

    async function mockAPIResponse(url, options) {
        var body = options?.body ? JSON.parse(options.body) : {};
        await new Promise(resolve => setTimeout(resolve, 200));
        if (!window.mockUsuariosData) window.mockUsuariosData = JSON.parse(JSON.stringify(SAMPLE));
        var response = { success: true, error: null, data: window.mockUsuariosData };
        if (body.action === 'save') window.mockUsuariosData = JSON.parse(JSON.stringify(body.data));
        return { ok: true, json: () => Promise.resolve(response) };
    }

    var state = null, el = {}, grid, tsRoles, editingUsuarioId = null;
    var isEditMode = (new URLSearchParams(window.location.search)).get("mode") === "edit";

    document.addEventListener("DOMContentLoaded", function() {
        initElements();
        loadState().then(s => { state = s || SAMPLE; initGrid(); initEventHandlers(); initTomSelect(); });
    });

    function initElements() {
        el = {
            grid: document.getElementById("gridUsuarios"), txtSearch: document.getElementById("txtSearch"),
            btnNew: document.getElementById("btnNew"), btnExport: document.getElementById("btnExport"),

            dlg: document.getElementById("dlgEdit"), dlgTitle: document.getElementById("dlgTitle"),
            btnSave: document.querySelector('#dlgEdit [data-action="save"]'),

            // Inputs
            editNick: document.getElementById("editNick"), editNombre: document.getElementById("editNombre"),
            editCel: document.getElementById("editCel"), editEmail: document.getElementById("editEmail"),
            editEstatus: document.getElementById("editEstatus"), editCaducidad: document.getElementById("editCaducidad"),
            editForzarCambio: document.getElementById("editForzarCambio"), editPassword: document.getElementById("editPassword"),
            btnShowPass: document.getElementById("btnShowPass"), selRoles: document.getElementById("selRoles"),
            editNota: document.getElementById("editNota"),

            // Groups & Containers
            grpPassword: document.getElementById("grpPassword"),
            rolesEditContainer: document.getElementById("rolesEditContainer"),
            rolesReadContainer: document.getElementById("rolesReadContainer"),
            rolesReadText: document.getElementById("rolesReadText"),

            // View Text Elements
            viewEstatus: document.getElementById("viewEstatus"),
            viewCaducidad: document.getElementById("viewCaducidad"),
            viewForzarCambio: document.getElementById("viewForzarCambio"),
            viewNota: document.getElementById("viewNota"),

            // Audit
            editId: document.getElementById("editId"), editCreadoEl: document.getElementById("editCreadoEl"),
            editCreadoPor: document.getElementById("editCreadoPor"), editUltimoLogin: document.getElementById("editUltimoLogin"),
            editProximoCambioPass: document.getElementById("editProximoCambioPass"), editUltimoCambioPass: document.getElementById("editUltimoCambioPass"),
            editUltimoCambioEl: document.getElementById("editUltimoCambioEl"), editUltimoCambioPor: document.getElementById("editUltimoCambioPor")
        };
    }

    function initGrid() {
        if (!el.grid || typeof Tabulator === "undefined") return;
        grid = new Tabulator(el.grid, {
            data: buildRows(), layout: "fitColumns", reactiveData: false, height: "calc(70vh)", index: "usuario_id",
            columns: [
                { title: "#", formatter: "rownum", width: 40, hozAlign: "center", headerSort: false },
                {
                    title: "", field: "actions", width: isEditMode ? 140 : 80, hozAlign: "center", headerSort: false,
                    formatter: () => {
                        let b = `<button class="btn-icon btn-view" title="Ver">👁️</button>`;
                        if (isEditMode) b += `<button class="btn-icon btn-edit" title="Editar">✏️</button><button class="btn-icon btn-delete" title="Eliminar">🗑️</button>`;
                        return b;
                    },
                    cellClick: (e, cell) => {
                        const t = e.target.closest("button");
                        if (!t) return;
                        const u = findUser(cell.getRow().getData().usuario_id);
                        if (t.classList.contains('btn-view')) openEditDialog(u, true);
                        else if (t.classList.contains('btn-edit')) openEditDialog(u, false);
                        else if (t.classList.contains('btn-delete')) onDeleteClick(u);
                    }
                },
                { title: "Nick", field: "nick", sorter: "string", headerFilter: "input", widthGrow: 1 },
                { title: "Nombre", field: "nombre", sorter: "string", headerFilter: "input", widthGrow: 2 },
                { title: "Estatus", field: "estatus", sorter: "string", headerFilter: "input", width: 120 },
                { title: "Email", field: "email", sorter: "string", headerFilter: "input", widthGrow: 2 },
                { title: "Roles", field: "roles_text", sorter: "string", headerFilter: "input", widthGrow: 2, formatter: c => escapeHtml(c.getValue() || "") }
            ]
        });
    }

    function initEventHandlers() {
        if(el.txtSearch) el.txtSearch.addEventListener("input", () => {
            var q = el.txtSearch.value.trim().toLowerCase();
            grid.setFilter(d => (d.nick||"").toLowerCase().includes(q) || (d.nombre||"").toLowerCase().includes(q) || (d.email||"").toLowerCase().includes(q));
        });
        if(el.btnNew) el.btnNew.addEventListener("click", openNewDialog);
        if(el.btnExport) el.btnExport.addEventListener("click", exportCSV);
        if(el.dlg) {
            el.dlg.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener("click", closeDialog));
            el.dlg.addEventListener("cancel", e => { e.preventDefault(); closeDialog(); });
            el.dlg.querySelector('[data-action="save"]').addEventListener("click", saveDialog);
        }
        if(el.btnShowPass) el.btnShowPass.addEventListener('click', () => {
            el.editPassword.type = el.editPassword.type === 'password' ? 'text' : 'password';
            el.btnShowPass.textContent = el.editPassword.type === 'password' ? '👁️' : '🙈';
        });
    }

    function initTomSelect() {
        if(typeof Choices !== "undefined" && el.selRoles) {
            tsRoles = new Choices(el.selRoles, {
                removeItemButton: true,
                searchEnabled: true,
                choices: state.roles.map(r => ({ value: r.rol_id, label: r.rol }))
            });
        }
    }

    function openNewDialog() { dialogMode = "new"; editingUsuarioId = null; openEditDialog(null, false); }

    function openEditDialog(user, readOnly) {
        // Toggle between Input and View Elements
        if (readOnly) {
            // Hide Inputs
            el.editEstatus.style.display = 'none';
            el.editCaducidad.style.display = 'none';
            el.editForzarCambio.style.display = 'none';
            el.editNota.style.display = 'none';
            el.grpPassword.style.display = 'none';
            el.rolesEditContainer.style.display = 'none';

            // Show View Elements
            el.viewEstatus.style.display = 'flex';
            el.viewCaducidad.style.display = 'flex';
            el.viewForzarCambio.style.display = 'flex';
            el.viewNota.style.display = 'flex';
            el.rolesReadContainer.style.display = 'block';

            el.btnSave.style.display = 'none';
        } else {
            // Show Inputs
            el.editEstatus.style.display = 'block';
            el.editCaducidad.style.display = 'block';
            el.editForzarCambio.style.display = 'block';
            el.editNota.style.display = 'block';
            el.grpPassword.style.display = 'flex';
            el.rolesEditContainer.style.display = 'block';

            // Hide View Elements
            el.viewEstatus.style.display = 'none';
            el.viewCaducidad.style.display = 'none';
            el.viewForzarCambio.style.display = 'none';
            el.viewNota.style.display = 'none';
            el.rolesReadContainer.style.display = 'none';

            el.btnSave.style.display = 'block';
        }

        if (user) {
            dialogMode = "edit"; editingUsuarioId = user.usuario_id; el.dlgTitle.textContent = readOnly ? "Ver Usuario" : "Editar Usuario";
            el.editNick.value = user.nick; el.editNombre.value = user.nombre; el.editCel.value = user.cel||"";
            el.editEmail.value = user.email||""; el.editEstatus.value = user.estatus;
            el.editCaducidad.value = user.password_caducidad_dias; el.editForzarCambio.value = user.password_forza_cambio;
            el.editPassword.value = ""; el.editNota.value = user.nota||"";

            // Populate View Elements
            el.viewEstatus.textContent = user.estatus;
            el.viewCaducidad.textContent = user.password_caducidad_dias;
            el.viewForzarCambio.textContent = user.password_forza_cambio;
            el.viewNota.textContent = user.nota || "";

            el.editId.textContent = user.usuario_id; el.editCreadoEl.textContent = user.creado_el||"-"; el.editCreadoPor.textContent = user.creado_por||"-";
            el.editUltimoLogin.textContent = user.ultimo_login||"-"; el.editUltimoCambioPass.textContent = user.password_ultimo_cambio||"-";
            el.editUltimoCambioEl.textContent = user.ultimo_cambio_el||"-"; el.editUltimoCambioPor.textContent = user.ultimo_cambio_por||"-";
            el.editProximoCambioPass.textContent = calculateExpiryDate(user.password_ultimo_cambio, user.password_caducidad_dias);

            var roleIds = getRoleIdsForUser(user.usuario_id);
            el.rolesReadText.textContent = roleIds.map(rid => (findRole(rid)||{}).rol).filter(n=>n).join(", ") || "-";
            if(tsRoles) { tsRoles.removeActiveItems(); tsRoles.setChoiceByValue(roleIds); }
        } else {
            dialogMode = "new"; editingUsuarioId = null; el.dlgTitle.textContent = "Nuevo Usuario";
            el.editNick.value = ""; el.editNombre.value = ""; el.editCel.value = ""; el.editEmail.value = "";
            el.editEstatus.value = "Puede Login"; el.editCaducidad.value = 90; el.editForzarCambio.value = "Si";
            el.editPassword.value = ""; el.editNota.value = "";

            ["editId","editCreadoEl","editCreadoPor","editUltimoLogin","editUltimoCambioPass","editUltimoCambioEl","editUltimoCambioPor","editProximoCambioPass"]
                .forEach(id => document.getElementById(id).textContent = "-");
            if(tsRoles) tsRoles.removeActiveItems(); el.rolesReadText.textContent = "";
        }

        [el.editNick, el.editNombre, el.editCel, el.editEmail].forEach(inp => inp.disabled = readOnly);

        try { el.dlg.showModal(); } catch(e) { el.dlg.setAttribute("open", ""); }
        OcDialogDrag.initialize(el.dlg); OcDialogDrag.centerDialog(el.dlg);
        el.editPassword.type = 'password'; el.btnShowPass.textContent = '👁️';
    }

    function saveDialog() {
        var nick = el.editNick.value.trim(), nombre = el.editNombre.value.trim();
        if (!nick || !nombre) { OcDialog.error("Nick y Nombre son requeridos."); return; }

        var formData = { nick, nombre, cel: el.editCel.value.trim(), email: el.editEmail.value.trim(), estatus: el.editEstatus.value, password_caducidad_dias: parseInt(el.editCaducidad.value)||90, password_forza_cambio: el.editForzarCambio.value, nota: el.editNota.value.trim() };
        var selectedRoleIds = tsRoles ? tsRoles.getValue(true).map(Number) : [];
        var now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        if (dialogMode === "new") {
            if (!el.editPassword.value.trim()) { OcDialog.error("Password requerido para nuevos usuarios."); return; }
            var newId = Math.max(0, ...state.usuarios.map(u => u.usuario_id)) + 1;
            state.usuarios.push({ ...formData, usuario_id: newId, creado_el: now, creado_por: "system", ultimo_cambio_el: now, ultimo_cambio_por: "system", password_ultimo_cambio: now, ultimo_login: null });
            selectedRoleIds.forEach(rid => state.rol_usuario.push({ rol_id: rid, usuario_id: newId }));
        } else {
            var user = findUser(editingUsuarioId);
            if (user) {
                Object.assign(user, formData); user.ultimo_cambio_el = now; user.ultimo_cambio_por = "system_edit";
                if (el.editPassword.value.trim()) user.password_ultimo_cambio = now;
            }
            state.rol_usuario = state.rol_usuario.filter(ru => ru.usuario_id !== editingUsuarioId);
            selectedRoleIds.forEach(rid => state.rol_usuario.push({ rol_id: rid, usuario_id: editingUsuarioId }));
        }
        persist(); refreshGrid(); closeDialog();
    }

    function onDeleteClick(user) {
        OcDialog.confirm("Eliminar " + user.nick + "?", "Confirmar").then(() => {
            state.usuarios = state.usuarios.filter(u => u.usuario_id !== user.usuario_id);
            state.rol_usuario = state.rol_usuario.filter(ru => ru.usuario_id !== user.usuario_id);
            persist(); refreshGrid();
        }).catch(()=>{});
    }

    function closeDialog() { try { el.dlg.close(); } catch(e) { el.dlg.removeAttribute("open"); } }
    function findUser(uid) { return state.usuarios.find(u => u.usuario_id === uid); }
    function findRole(rid) { return state.roles.find(r => r.rol_id === rid); }
    function getRoleIdsForUser(uid) { return state.rol_usuario.filter(ru => ru.usuario_id === uid).map(ru => ru.rol_id); }
    function buildRows() {
        return state.usuarios.map(u => {
            var rids = getRoleIdsForUser(u.usuario_id);
            var rtxt = rids.map(rid => (findRole(rid)||{}).rol).filter(n=>n).join(", ");
            return { ...u, roles_text: rtxt };
        });
    }
    function refreshGrid() { if(grid) grid.setData(buildRows()); }
    function calculateExpiryDate(last, days) { if(!last || !days) return "No caduca"; try { var d = new Date(last.replace(' ','T')); d.setDate(d.getDate()+days); return d.toISOString().split('T')[0]; } catch(e){return "-";} }
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
    function csvRow(arr) { return arr.map(v => String(v==null?"":v).replace(/"/g, '""')).map(v => /[",\r\n]/.test(v)?`"${v}"`:v).join(","); }
    function exportCSV() {
        var lines = [csvRow(["ID","Nick","Nombre","Email","Roles"])];
        buildRows().forEach(r => lines.push(csvRow([r.usuario_id, r.nick, r.nombre, r.email, r.roles_text])));
        var blob = new Blob([lines.join("\r\n")], {type:"text/csv"});
        var url = URL.createObjectURL(blob); var a = document.createElement("a"); a.href=url; a.download="usuarios.csv"; a.click(); URL.revokeObjectURL(url);
    }
    async function loadState() { try { var r = await fetch(API_URL, {method:'POST', body:JSON.stringify({action:'load'})}); return (await r.json()).data; } catch(e){return null;} }
    async function persist() { try { await fetch(API_URL, {method:'POST', body:JSON.stringify({action:'save', data:state})}); } catch(e){} }

})();