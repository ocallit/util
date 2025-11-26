<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roles</title>

    <link rel="stylesheet" href="./base.css" />
    <link rel="stylesheet" href="https://unpkg.com/tabulator-tables@6.3.1/dist/css/tabulator.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/css/tom-select.css" />
    <link rel="stylesheet" href="../OcDialog/OcDialog.css" />
    <link rel="stylesheet" href="roles.css" />
</head>
<body>
<header class="sch_header">
    <h1>Usuarios, Roles y Permisos: Roles, grupos de usuarios con permisos</h1>
</header>
<?= renderNav() ?>

<main class="roles_container">
    <div class="roles_toolbar">
        <div class="roles_left">
            <button id="btnNew" class="sch_button sch_button--save" style="display:none;">➕ Nuevo Rol</button>
            <label>Buscar:
                <input id="txtSearch" class="roles_input" type="search" placeholder="filtrar…" />
            </label>
        </div>
        <div class="roles_right">
            <button id="btnExport" class="sch_button sch_button--execute" title="Exportar CSV">⬇️ Exportar CSV</button>
        </div>
    </div>

    <div id="gridRoles"></div>
</main>

<!-- Dialog para editar rol -->
<dialog id="dlgEdit" class="ocdialog ocdialog_grow_content" style="width:700px;max-width:96vw;display:none;">
    <div class="ocdialog_header">
        <h2 class="ocdialog_title" id="dlgTitle">Editar Rol</h2>
        <button class="ocdialog_close" data-action="close" type="button" aria-label="Cerrar">&times;</button>
    </div>

    <div class="ocdialog_content">
        <div class="ocdialog_flex_column">
            <section class="roles_section ocdialog_flex_fixed">
                <div class="roles_form_row">
                    <label for="editRol" class="roles_label">Rol:</label>
                    <input type="text" class="roles_input" id="editRol" maxlength="64" required />
                </div>

                <div class="roles_form_row">
                    <label class="roles_label">Descripción:</label>
                    <textarea class="roles_textarea" id="editDescripcion" rows="3"></textarea>
                </div>

                <div class="roles_info_row">
                    <span class="roles_info_item">
                        <strong>ID:</strong> <span id="editId">-</span>
                    </span>
                    <span class="roles_info_item">
                        <strong>Registrado el:</strong> <span id="editRegistradoEl">-</span>
                    </span>
                    <span class="roles_info_item">
                        <strong>Por:</strong> <span id="editRegistradoPor">-</span>
                    </span>
                </div>
            </section>

            <section class="roles_section ocdialog_flex_grow">
                <div class="roles_section_header">
                    <h3 class="roles_section_title">Usuarios en este Rol</h3>
                    <div class="roles_user_actions">
                        <select id="selAddUser" placeholder="Seleccionar usuario…"></select>
                        <button class="sch_button sch_button--save" id="btnAddUser">➕ Agregar</button>
                    </div>
                </div>

                <div class="roles_users_container" id="usersList"></div>
            </section>
        </div>
    </div>

    <div class="ocdialog_footer">
        <button class="ocdialog_button ocdialog_button--secondary" data-action="close" type="button">Cancelar</button>
        <button class="ocdialog_button ocdialog_button--success" data-action="save" type="button">Guardar</button>
    </div>
</dialog>

<script src="https://unpkg.com/tabulator-tables@6.3.1/dist/js/tabulator.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/js/tom-select.complete.min.js"></script>
<script src="../OcDialog/OcDialog.js"></script>
<script src="../OcDialog/OcDialogDrag.js"></script>
<script src="./roles.js"></script>

<script>
// Show/hide buttons based on URL mode parameter
(function() {
    var params = new URLSearchParams(window.location.search);
    var isEditMode = params.get("mode") === "edit";
    var btnNew = document.getElementById("btnNew");
    var dlgEdit = document.getElementById("dlgEdit");
    if (isEditMode && btnNew) {
        btnNew.style.display = "";
    }
    if (isEditMode && dlgEdit) {
        dlgEdit.style.display = "";
    }
})();
</script>
</body>
</html>
