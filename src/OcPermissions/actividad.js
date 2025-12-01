// File: actividad.js
// Path: /actividad/actividad.js
// Version: 1.0.0

/**
 * Main manager class for Actividad interface
 */
class ocActividadManager {
    constructor() {
        this.apiUrl = './api/actividad_api.php';
        // Read mode from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.isEditMode = urlParams.get('mode') === 'edit';
        this.table = null;
        this.currentEditingActivity = null;

        // this.setupFetchOverride();
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupTabulator();
        this.setupDialogs();
        this.setupAddButton();
        this.setupSearch();
        this.setupExport();
    }

    /**
     * Setup fetch override for mock API responses
     */
    setupFetchOverride() {
        const originalFetch = window.fetch;
        const self = this;

        window.fetch = function(url, options) {
            // Only intercept our API calls
            if (url.includes('actividad_api.php')) {
                return self.mockAPIResponse(url, options);
            }
            return originalFetch(url, options);
        };
    }

    /**
     * Mock API response handler
     */
    async mockAPIResponse(url, options) {
        const body = options?.body ? JSON.parse(options.body) : {};
        const action = body.action || '';

        console.log('Mock API Call:', action, body);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));

        let response;

        switch (action) {
            case 'list':
                response = this.mockList();
                break;
            case 'get':
                response = this.mockGet(body.actividad_id);
                break;
            case 'save':
                response = this.mockSave(body);
                break;
            case 'delete':
                response = this.mockDelete(body.actividad_id);
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
            json: () => Promise.resolve(response)
        };
    }

    /**
     * Mock list all activities
     */
    mockList() {
        const mockData = [
            {
                actividad_id: 1,
                actividad: 'Gestión de Usuarios',
                descripcion: 'Módulo para administrar usuarios del sistema',
                registrado_el: '2025-01-15 10:30:00',
                registrado_por: 'admin',
                permisos: [
                    { actividad_permiso_id: 1, permiso: 'usuarios.ver', etiqueta: 'Ver Usuarios' },
                    { actividad_permiso_id: 2, permiso: 'usuarios.crear', etiqueta: 'Crear Usuarios' },
                    { actividad_permiso_id: 3, permiso: 'usuarios.editar', etiqueta: 'Editar Usuarios' },
                    { actividad_permiso_id: 4, permiso: 'usuarios.eliminar', etiqueta: 'Eliminar Usuarios' }
                ]
            },
            {
                actividad_id: 2,
                actividad: 'Gestión de Roles',
                descripcion: 'Módulo para administrar roles y permisos',
                registrado_el: '2025-01-15 11:00:00',
                registrado_por: 'admin',
                permisos: [
                    { actividad_permiso_id: 5, permiso: 'roles.ver', etiqueta: 'Ver Roles' },
                    { actividad_permiso_id: 6, permiso: 'roles.crear', etiqueta: 'Crear Roles' },
                    { actividad_permiso_id: 7, permiso: 'roles.editar', etiqueta: 'Editar Roles' }
                ]
            },
            {
                actividad_id: 3,
                actividad: 'Reportes',
                descripcion: 'Módulo para generar y visualizar reportes del sistema',
                registrado_el: '2025-01-16 09:15:00',
                registrado_por: 'system',
                permisos: [
                    { actividad_permiso_id: 8, permiso: 'reportes.ver', etiqueta: 'Ver Reportes' },
                    { actividad_permiso_id: 9, permiso: 'reportes.generar', etiqueta: 'Generar Reportes' },
                    { actividad_permiso_id: 10, permiso: 'reportes.exportar', etiqueta: 'Exportar Reportes' }
                ]
            },
            {
                actividad_id: 4,
                actividad: 'Configuración',
                descripcion: 'Módulo de configuración general del sistema',
                registrado_el: '2025-01-16 14:30:00',
                registrado_por: 'admin',
                permisos: [
                    { actividad_permiso_id: 11, permiso: 'config.ver', etiqueta: 'Ver Configuración' },
                    { actividad_permiso_id: 12, permiso: 'config.editar', etiqueta: 'Editar Configuración' }
                ]
            }
        ];

        // Store mock data for other operations
        if (!window.mockActividades) {
            window.mockActividades = mockData;
        }

        return {
            success: true,
            error: null,
            data: window.mockActividades
        };
    }

    /**
     * Mock get single activity
     */
    mockGet(actividad_id) {
        const activity = window.mockActividades?.find(a => a.actividad_id === parseInt(actividad_id));

        if (activity) {
            return {
                success: true,
                error: null,
                data: activity
            };
        } else {
            return {
                success: false,
                error: 'Actividad no encontrada',
                data: null
            };
        }
    }

    /**
     * Mock save (create or update)
     */
    mockSave(data) {
        if (!window.mockActividades) {
            window.mockActividades = [];
        }

        if (data.actividad_id) {
            // Update existing
            const index = window.mockActividades.findIndex(a => a.actividad_id === parseInt(data.actividad_id));
            if (index !== -1) {
                window.mockActividades[index] = {
                    ...window.mockActividades[index],
                    actividad: data.actividad,
                    descripcion: data.descripcion,
                    permisos: data.permisos || window.mockActividades[index].permisos
                };

                return {
                    success: true,
                    error: null,
                    data: window.mockActividades[index]
                };
            }
        } else {
            // Create new
            const newId = Math.max(...window.mockActividades.map(a => a.actividad_id), 0) + 1;
            const newActivity = {
                actividad_id: newId,
                actividad: data.actividad,
                descripcion: data.descripcion,
                registrado_el: new Date().toISOString().slice(0, 19).replace('T', ' '),
                registrado_por: 'current_user',
                permisos: data.permisos || []
            };

            window.mockActividades.push(newActivity);

            return {
                success: true,
                error: null,
                data: newActivity
            };
        }

        return {
            success: false,
            error: 'Error al guardar',
            data: null
        };
    }

    /**
     * Mock delete activity
     */
    mockDelete(actividad_id) {
        if (!window.mockActividades) {
            return {
                success: false,
                error: 'No hay datos',
                data: null
            };
        }

        const index = window.mockActividades.findIndex(a => a.actividad_id === parseInt(actividad_id));
        if (index !== -1) {
            window.mockActividades.splice(index, 1);
            return {
                success: true,
                error: null,
                data: { actividad_id: actividad_id }
            };
        }

        return {
            success: false,
            error: 'Actividad no encontrada',
            data: null
        };
    }

    // Mode is now controlled via URL parameter (?mode=edit)
    // No toggle setup needed - page reload handles mode change

    /**
     * Setup Tabulator grid
     */
    setupTabulator() {
        const self = this;

        this.table = new Tabulator("#ocActividad_tabulator_grid", {
            layout: "fitColumns",
            responsiveLayout: "hide",
            placeholder: "No hay actividades registradas",
            pagination: true,
            paginationSize: 10,
            paginationSizeSelector: [5, 10, 20, 50],
            movableColumns: false,
            columns: [
                {
                    title: "#",
                    formatter: "rownum",
                    width: 50,
                    hozAlign: "center",
                    headerSort: false
                },
                {
                    title: "Acciones",
                    width: 120,
                    hozAlign: "center",
                    headerSort: false,
                    formatter: (cell) => {
                        let buttons = `
                            <button class="ocActividad_action_button ocActividad_action_view" title="Ver">👁️</button>
                        `;

                        // Edit/Delete buttons are only visible in edit mode
                        if (self.isEditMode) {
                            buttons += `
                                <button class="ocActividad_action_button ocActividad_action_edit" title="Editar">✏️</button>
                                <button class="ocActividad_action_button ocActividad_action_delete" title="Eliminar">🗑️</button>
                            `;
                        }
                        return `<div class="ocActividad_actions_cell">${buttons}</div>`;
                    },
                    cellClick: (e, cell) => {
                        const target = e.target;
                        const rowData = cell.getRow().getData();

                        if (target.classList.contains('ocActividad_action_view')) {
                            // Always allow viewing
                            self.openEditDialog(rowData, true); // true = read-only
                        } else if (self.isEditMode) {
                            // Only allow edit/delete if in edit mode
                            if (target.classList.contains('ocActividad_action_edit')) {
                                self.openEditDialog(rowData, false); // false = not read-only
                            } else if (target.classList.contains('ocActividad_action_delete')) {
                                self.openDeleteDialog(rowData);
                            }
                        }
                    }
                },
                {
                    title: "Actividad",
                    field: "actividad",
                    minWidth: 180,
                    headerFilter: "input",
                    headerFilterPlaceholder: "Buscar...",

                },
                {
                    title: "Descripción",
                    field: "descripcion",
                    minWidth: 250,
                    headerFilter: "input",
                    headerFilterPlaceholder: "Buscar...",
                    formatter: (cell) => {
                        const value = cell.getValue();
                        if (!value) return '<span style="color: var(--color-text-muted);">Sin descripción</span>';
                        return value.length > 100 ? value.substring(0, 100) + '...' : value;
                    },
                    tooltip: (cell) => cell.getValue()
                },
                {
                    title: "Permisos",
                    field: "permisos",
                    minWidth: 200,
                    formatter: (cell) => {
                        const permisos = cell.getValue();
                        if (!permisos || permisos.length === 0) {
                            return '<span style="color: var(--color-text-muted);">Sin permisos</span>';
                        }
                        // API returns array of {actividad_permiso_id, permiso, etiqueta}
                        const etiquetas = permisos.map(p => p.etiqueta).join(', ');
                        return `<span class="ocActividad_permissions_text" title="${etiquetas}">${etiquetas}</span>`;
                    },
                },
                {
                    title: "Registrado",
                    field: "registrado_el",
                    width: 120,
                    sorter: "string",
                    formatter: (cell) => {
                        const value = cell.getValue();
                        if (!value) return '';
                        // Extract only Y-m-d from Y-m-d H:i:s
                        return value.substring(0, 10);
                    }
                },
                {
                    title: "Por",
                    field: "registrado_por",
                    width: 100,
                    headerFilter: "input"
                },
                {
                    title: "ID",
                    field: "actividad_id",
                    width: 50,
                    hozAlign: "center",
                    formatter: (cell) => {
                        return `<span class="ocActividad_id_cell">${cell.getValue()}</span>`;
                    }
                }
            ]
        });

        // Load initial data
        this.loadData();
    }

    /**
     * Load data from API
     */
    async loadData() {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list' })
            });
            const result = await response.json();
            if (result.success) {
                this.table.setData(result.data);
            } else {
                this.showError('Error al cargar datos: ' + result.error);
            }
        } catch (error) {
            this.showError('Error de conexión: ' + error.message);
        }
    }

    /**
     * Setup dialogs
     */
    setupDialogs() {
        this.editDialog = new ocActividadEditDialog(this);


        // Initialize OcDialogDrag for both dialogs
        OcDialogDrag.initialize(document.getElementById('ocActividad_edit_dialog'));
        OcDialogDrag.initialize(document.getElementById('ocActividad_delete_dialog'));
    }

    /**
     * Setup add button
     */
    setupAddButton() {
        const addButton = document.getElementById('ocActividad_add_button');
        if (addButton) {
            addButton.addEventListener('click', () => {
                this.openEditDialog(null);
            });
        }
    }

    /**
     * Setup search functionality
     */
    setupSearch() {
        const searchInput = document.getElementById('txtSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const query = searchInput.value.trim().toLowerCase();
                if (!query) {
                    this.table.clearFilter(true);
                    return;
                }
                this.table.setFilter((data) => {
                    return (data.actividad || '').toLowerCase().includes(query) ||
                        (data.descripcion || '').toLowerCase().includes(query) ||
                        (data.registrado_por || '').toLowerCase().includes(query) ||
                        (data.permisos || []).some(p =>
                            (p.permiso || '').toLowerCase().includes(query) ||
                            (p.etiqueta || '').toLowerCase().includes(query)
                        );
                });
            });
        }
    }

    /**
     * Setup export to CSV functionality
     */
    setupExport() {
        const exportButton = document.getElementById('btnExport');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportCSV();
            });
        }
    }

    /**
     * Export grid data to CSV
     */
    exportCSV() {
        const data = this.table.getData();
        const rows = [
            ['actividad_id', 'actividad', 'descripcion', 'permisos', 'registrado_el', 'registrado_por']
        ];

        data.forEach(row => {
            const permisos = (row.permisos || [])
                .map(p => p.etiqueta || p.permiso)
                .join('; ');

            rows.push([
                row.actividad_id,
                row.actividad,
                row.descripcion || '',
                permisos,
                row.registrado_el || '',
                row.registrado_por || ''
            ]);
        });

        const csvContent = rows.map(row =>
            row.map(cell => {
                const value = String(cell == null ? '' : cell);
                return /[",\r\n]/.test(value)
                    ? '"' + value.replace(/"/g, '""') + '"'
                    : value;
            }).join(',')
        ).join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'actividades_' + Date.now() + '.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Open edit dialog
     */
    /**
     * Open edit dialog
     */
    openEditDialog(activityData, readOnly = false) {
        this.editDialog.open(activityData, readOnly);
    }

    /**
     * Open delete dialog
     */
    /**
     * Open delete dialog
     */
    async openDeleteDialog(activityData) {
        // Build the custom message content using existing CSS classes
        const messageHtml = `
            <p class="ocActividad_delete_message">¿Está seguro que desea eliminar esta actividad?</p>
            <div class="ocActividad_delete_info">
                <div class="ocActividad_delete_info_row">
                    <span class="ocActividad_delete_info_label">ID:</span>
                    <span class="ocActividad_delete_info_value">${activityData.actividad_id}</span>
                </div>
                <div class="ocActividad_delete_info_row">
                    <span class="ocActividad_delete_info_label">Actividad:</span>
                    <span class="ocActividad_delete_info_value">${activityData.actividad}</span>
                </div>
            </div>
        `;

        try {
            // Use OcDialog.confirmDelete
            // It returns a promise that resolves on OK, and rejects on Cancel
            await OcDialog.confirmDelete(messageHtml);

            // If we get here, the user clicked "Eliminar"
            // The deleteActivity method will handle showing success/error
            await this.deleteActivity(activityData.actividad_id);

        } catch (error) {
            // User clicked "Cancelar" or pressed ESC.
            // OcDialog.js rejects with an Error(OcDialog.CANCELED), so we can safely ignore it.
            if (error && error.message !== OcDialog.CANCELED) {
                console.error("Error during delete confirmation:", error);
            }
        }
    }

    /**
     * Save activity
     */
    async saveActivity(activityData) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save',
                    ...activityData
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Actividad guardada correctamente');
                await this.loadData();
                return true;
            } else {
                this.showError('Error al guardar: ' + result.error);
                return false;
            }
        } catch (error) {
            this.showError('Error de conexión: ' + error.message);
            return false;
        }
    }

    /**
     * Delete activity
     */
    async deleteActivity(actividad_id) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    actividad_id: actividad_id
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Actividad eliminada correctamente');
                await this.loadData();
                return true;
            } else {
                this.showError('Error al eliminar: ' + result.error);
                return false;
            }
        } catch (error) {
            this.showError('Error de conexión: ' + error.message);
            return false;
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {OcDialog.info(message, "Éxito", "✓");}

    /**
     * Show error message
     */
    showError(message) {OcDialog.error(message);}

}

/**
 * Edit Dialog Manager
 */
class ocActividadEditDialog {
    constructor(manager) {
        this.manager = manager;
        this.dialog = document.getElementById('ocActividad_edit_dialog');
        this.currentActivity = null;
        this.isReadOnly = false;
        this.permissionsCounter = 0;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close button
        document.getElementById('ocActividad_close_edit_dialog').addEventListener('click', () => {
            this.close();
        });

        // Cancel button
        document.getElementById('ocActividad_cancel_edit').addEventListener('click', () => {
            this.close();
        });

        // Save button
        document.getElementById('ocActividad_save_edit').addEventListener('click', () => {
            this.save();
        });

        // Add permission button
        document.getElementById('ocActividad_add_permission').addEventListener('click', () => {
            this.addPermission();
        });

        // Macro buttons
        document.querySelectorAll('.ocActividad_macro_button').forEach(button => {
            button.addEventListener('click', (e) => {
                const macro = e.target.dataset.macro;
                this.applyMacro(macro);
            });
        });

        // Close on Escape key
        this.dialog.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault(); // Prevent default escape behavior
                this.close();
            }
        });
    }

    open(activityData, readOnly = false) {
        this.currentActivity = activityData;
        this.isReadOnly = readOnly;
        this.permissionsCounter = 0;

        // Update dialog title
        const title = activityData
            ? (readOnly ? 'Ver Actividad' : 'Editar Actividad')
            : 'Nueva Actividad';
        document.getElementById('ocActividad_dialog_title').textContent = title;

        // Populate form
        if (activityData) {
            document.getElementById('ocActividad_edit_id').textContent = activityData.actividad_id || '';
            document.getElementById('ocActividad_edit_actividad').value = activityData.actividad || '';
            document.getElementById('ocActividad_edit_descripcion').value = activityData.descripcion || '';

            // Format registrado_el to show only date
            const registradoEl = activityData.registrado_el ? activityData.registrado_el.substring(0, 10) : '-';
            document.getElementById('ocActividad_edit_registrado_el').textContent = registradoEl;
            document.getElementById('ocActividad_edit_registrado_por').textContent = activityData.registrado_por || '-';

            // Load permissions
            this.loadPermissions(activityData.permisos || []);
        } else {
            // Clear form for new activity
            document.getElementById('ocActividad_edit_id').textContent = 'Nuevo';
            document.getElementById('ocActividad_edit_actividad').value = '';
            document.getElementById('ocActividad_edit_descripcion').value = '';
            document.getElementById('ocActividad_edit_registrado_el').textContent = '-';
            document.getElementById('ocActividad_edit_registrado_por').textContent = '-';

            this.loadPermissions([]);
        }

        // Set read-only state
        this.setReadOnlyState(readOnly);

        // Show dialog
        this.dialog.showModal();
        OcDialogDrag.centerDialog(this.dialog);
    }

    close() {
        this.dialog.close();
    }

    setReadOnlyState(readOnly) {
        const inputs = this.dialog.querySelectorAll('.ocActividad_input:not(.ocActividad_input_readonly), .ocActividad_textarea, .ocActividad_permission_input');
        inputs.forEach(input => {
            input.readOnly = readOnly;

        });

        // Hide/show buttons
        document.getElementById('ocActividad_save_edit').style.display = readOnly ? 'none' : 'block';
        document.getElementById('ocActividad_add_permission').style.display = readOnly ? 'none' : 'inline-block';

        // Hide/show macro buttons
        document.querySelectorAll('.ocActividad_macro_button').forEach(btn => {
            btn.style.display = readOnly ? 'none' : 'inline-block';
        });

        const removeButtons = this.dialog.querySelectorAll('.ocActividad_remove_permission');
        removeButtons.forEach(btn => {
            btn.style.display = readOnly ? 'none' : 'flex';
        });
    }

    /**
     * Apply predefined permission macros
     */
    applyMacro(macroType) {
        if (this.isReadOnly) return;

        const actividadName = document.getElementById('ocActividad_edit_actividad').value.trim().toLowerCase();
        const basePrefix = actividadName || 'actividad';

        let permissionsToAdd = [];

        switch (macroType) {
            case 'WR_RO':
                permissionsToAdd = [
                    { permiso: `RW`, etiqueta: 'Editar' },
                    { permiso: `RO`, etiqueta: 'Consultar' },
                ];
                break;

            case 'crud':
                permissionsToAdd = [
                    { permiso: `Listar`, etiqueta: 'Listar' },
                    { permiso: `RO`, etiqueta: 'Consultar' },
                    { permiso: `Crear`, etiqueta: 'Crear' },
                    { permiso: `Editar`, etiqueta: 'Editar' },
                    { permiso: `Eliminar`, etiqueta: 'Eliminar' }
                ];
                break;

            case 'si_no':
                permissionsToAdd = [
                    { permiso: 'Si', etiqueta: 'Si' },
                    { permiso: 'No', etiqueta: 'No' }
                ];
                break;
        }

        // Add all permissions from the macro
        permissionsToAdd.forEach(permission => {
            this.addPermission(permission);
        });
    }

    loadPermissions(permissions) {
        const container = document.getElementById('ocActividad_permissions_list');
        container.innerHTML = '';

        if (permissions.length === 0) {
            container.innerHTML = '<div class="ocActividad_empty_state"><p class="ocActividad_empty_state_text">No hay permisos definidos para esta actividad</p></div>';
        } else {
            permissions.forEach(permission => {
                this.addPermissionToDOM(permission);
            });
        }
    }

    addPermission(permissionData = null) {
        const permission = permissionData || {
            actividad_permiso_id: null,
            permiso: '',
            etiqueta: ''
        };

        this.addPermissionToDOM(permission);
    }

    addPermissionToDOM(permission) {
        const container = document.getElementById('ocActividad_permissions_list');

        // Remove empty state if exists
        const emptyState = container.querySelector('.ocActividad_empty_state');
        if (emptyState) {
            emptyState.remove();
        }

        const permissionId = permission.actividad_permiso_id || `new_${this.permissionsCounter++}`;

        const permissionDiv = document.createElement('div');
        permissionDiv.className = 'ocActividad_permission_item';
        permissionDiv.dataset.permissionId = permissionId;

        const displayId = permission.actividad_permiso_id || 'N';

        permissionDiv.innerHTML = `
            <div class="ocActividad_permission_id">${displayId}</div>
            
            <div class="ocActividad_permission_input_group">
                <label class="ocActividad_permission_label">Permiso:</label>
                <input type="text" 
                       class="ocActividad_permission_input" 
                       data-field="permiso" 
                       value="${permission.permiso || ''}" 
                       placeholder="ej: usuarios.ver"
                       maxlength="16"
                       style="width: 16ch;">
            </div>
            
            <div class="ocActividad_permission_input_group">
                <label class="ocActividad_permission_label">Etiqueta:</label>
                <input type="text" 
                       class="ocActividad_permission_input" 
                       data-field="etiqueta" 
                       value="${permission.etiqueta || ''}" 
                       placeholder="ej: Ver Usuarios"
                       maxlength="16"
                       style="width: 32ch;">
            </div>
            <button class="ocActividad_remove_permission" title="Eliminar permiso">✖</button>
        `;

        // Add remove listener
        const removeBtn = permissionDiv.querySelector('.ocActividad_remove_permission');
        removeBtn.addEventListener('click', () => {
            permissionDiv.remove();

            // Show empty state if no permissions left
            const remainingPermissions = container.querySelectorAll('.ocActividad_permission_item');
            if (remainingPermissions.length === 0) {
                container.innerHTML = '<div class="ocActividad_empty_state"><p class="ocActividad_empty_state_text">No hay permisos definidos para esta actividad</p></div>';
            }
        });

        container.appendChild(permissionDiv);
    }

    getPermissionsData() {
        const permissionItems = document.querySelectorAll('.ocActividad_permission_item');
        const permissions = [];

        permissionItems.forEach(item => {
            const permisoInput = item.querySelector('[data-field="permiso"]');
            const etiquetaInput = item.querySelector('[data-field="etiqueta"]');
            const permissionId = item.dataset.permissionId;

            const permiso = permisoInput.value.trim();
            const etiqueta = etiquetaInput.value.trim();

            if (permiso && etiqueta) {
                const permission = {
                    permiso: permiso,
                    etiqueta: etiqueta
                };

                // Include ID only if it's not a new permission
                if (permissionId && !permissionId.startsWith('new_')) {
                    permission.actividad_permiso_id = parseInt(permissionId);
                }

                permissions.push(permission);
            }
        });

        return permissions;
    }

    async save() {
        // Validate required fields
        const actividad = document.getElementById('ocActividad_edit_actividad').value.trim();

        if (!actividad) {
            this.manager.showError('El campo Actividad es obligatorio');
            return;
        }

        // Collect form data
        const activityData = {
            actividad: actividad,
            descripcion: document.getElementById('ocActividad_edit_descripcion').value.trim(),
            permisos: this.getPermissionsData()
        };

        // Add ID if editing
        if (this.currentActivity?.actividad_id) {
            activityData.actividad_id = this.currentActivity.actividad_id;
        }

        // Save
        const success = await this.manager.saveActivity(activityData);

        if (success) {
            this.close();
        }
    }
}


// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.actividadManager = new ocActividadManager();
});