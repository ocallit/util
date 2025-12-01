<?php
require_once("inc/config.php");
require_once("./nav.php");
$isEditMode = isset($_GET['mode']) && $_GET['mode'] === 'edit';
global $gPuede;
if(count($gPuede) === 1)
    $isEditMode = $gPuede[0] === 'RW';
if(!in_array('RW', $gPuede)) {
    $isEditMode = false;
    $puedeEditar = false;
} else {
    $puedeEditar = true;
}
$toggleUrl = $isEditMode ? './roles.php' : './roles.php?mode=edit';
$toggleText = $isEditMode ? '👁️ Consultar' : '✏️ Editar';
$bodyClass = $isEditMode ? '' : 'roles_readonly';
?><!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roles</title>
    <script src="https://kit.fontawesome.com/ad59c40b12.js" crossorigin="anonymous"></script>
    <link rel="stylesheet" href="./base.css" />
    <link rel="stylesheet" href="https://unpkg.com/tabulator-tables@6.3.1/dist/css/tabulator.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/css/tom-select.css" />
    <link rel="stylesheet" href="../OcDialog/OcDialog.css" />
    <link rel="stylesheet" href="roles.css" />
</head>
<body class="<?= $bodyClass ?>">
<?= renderNav() ?>

<main class="roles_container">
    <div class="roles_toolbar">
        <div class="roles_left">
            <h2 style="margin:0;padding:0 1em 0 0;color:var(--color-primary)">Roles</h2>
            <div>
                <label>Buscar:</label><br>
                <input id="txtSearch" class="roles_input" type="search" placeholder="filtrar…" />
            </div>
        </div>

        <div class="roles_right">
            <?php if($puedeEditar && $isEditMode): ?>
                <button id="btnNew" class="sch_button sch_button--save">➕ Nuevo Rol</button>
            <?php endif; ?>
            <button id="btnExport" class="sch_button sch_button--execute" title="Exportar CSV">⬇️ Exportar CSV</button>
            <?php if($puedeEditar) { ?>
            <a href="<?= $toggleUrl ?>" ><?=$toggleText?></a>
            <?php } ?>
        </div>
    </div>

    <div id="gridRoles"></div>
</main>

<!-- Dialog para editar rol -->
<dialog id="dlgEdit" class="ocdialog ocdialog_grow_content" style="width:700px;height:80vh;max-width:96vw;">
    <div class="ocdialog_header">
        <h2 class="ocdialog_title" id="dlgTitle">Editar Rol</h2>
        <button class="ocdialog_close" data-action="close" type="button" aria-label="Cerrar">&times;</button>
    </div>

    <div class="ocdialog_content">
        <div class="ocdialog_flex_column">
            <section class="roles_section ocdialog_flex_fixed">
                <div class="roles_form_row roles_form_row--inline">
                    <label for="editRol" class="roles_label">Rol:</label>
                    <input type="text" class="roles_input" id="editRol" maxlength="64" required />
                </div>

                <div class="roles_form_row" style="margin-bottom:2px;">
                    <label class="roles_label">Descripción:</label>
                    <textarea class="roles_textarea" id="editDescripcion" rows="2"></textarea>
                </div>

                <div class="roles_info_row">
                    <span class="roles_info_item"><strong>ID:</strong> <span id="editId">-</span></span>
                    <span class="roles_info_item"><strong>Registrado:</strong> <span id="editRegistradoEl">-</span></span>
                    <span class="roles_info_item"><strong>Por:</strong> <span id="editRegistradoPor">-</span></span>
                </div>
            </section>

            <section class="roles_section ocdialog_flex_grow" style="padding:4px 6px;">
                <h3 class="roles_section_title">Usuarios en este Rol</h3>
                
                <!-- Edit mode: TomSelect multiple -->
                <select id="selUsers" multiple placeholder="Seleccionar usuarios..."></select>
                
                <!-- View mode: scrollable list -->
                <div id="usersViewList" class="roles_users_view_list" style="display:none;"></div>
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

</body>
</html>
