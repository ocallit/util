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
$toggleUrl = $isEditMode ? './asignar_permisos.php' : './asignar_permisos.php?mode=edit';
$toggleText = $isEditMode ? '👁️ Consultar' : '✏️ Editar';
$bodyClass = $isEditMode ? '' : 'asig_readonly';
?><!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Asignar Permisos</title>
    <script src="https://kit.fontawesome.com/ad59c40b12.js" crossorigin="anonymous"></script>

    <link rel="stylesheet" href="./base.css" />
    <link rel="stylesheet" href="https://unpkg.com/tabulator-tables@6.3.1/dist/css/tabulator.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/css/tom-select.css" />
    <link rel="stylesheet" href="../OcDialog/OcDialog.css" />
    <link rel="stylesheet" href="asignar_permisos.css" />
    <link rel="stylesheet" href="chip.css" />
</head>
<body class="<?= $bodyClass ?>">
<?= renderNav() ?>

<main class="asig_container">
    <div class="asig_toolbar">
        <div class="asig_left">
            <h2 style="margin:0;padding:0 1em 0 0;color:var(--color-primary)">Permisos</h2>
            <div>
            <label>Buscar:<br>
                <input id="txtSearch" class="asig_input" type="search" placeholder="filtrar..." />
            </label>
            </div>
        </div>

        <div class="asig_column_visibility">
            <span style="font-weight:600;margin-right:8px;">Ver:</span>
            <label><input type="checkbox" id="cbRol" checked> Rol Puede</label>
            <label style="margin-left:8px;"><input type="checkbox" id="cbSin" checked> Sin Permiso</label>
            <label style="margin-left:8px;">
                <input type="checkbox" id="cbAll" checked <?= $isEditMode ? 'disabled' : '' ?>>
                Todos
            </label>
        </div>

        <div class="asig_right">
            <?php if($isEditMode): ?>
                <button id="btnNew" class="sch_button sch_button--save" title="Dar permisos en una Actividad a un Rol">➕ Dar Permiso</button>
            <?php endif; ?>
            <button id="btnExport" class="sch_button sch_button--execute" title="Exportar CSV">⬇️ CSV</button>
            <?php if($puedeEditar) { ?>
                <a href="<?= $toggleUrl ?>" ><?=$toggleText?></a>
            <?php } ?>
        </div>
    </div>

    <div id="gridAssign"></div>
</main>

<dialog id="dlgAssign" class="ocdialog ocdialog_grow_content" style="width:720px;max-width:96vw;height:80vh;">
    <div class="ocdialog_header">
        <h2 class="ocdialog_title" id="dlgTitle">Asignar permisos</h2>
        <button class="ocdialog_close" data-action="close" type="button" aria-label="Cerrar">&times;</button>
    </div>

    <div class="ocdialog_content">
        <div class="ocdialog_flex_column">
            <section class="ocAsignar_section ocdialog_flex_fixed">
                <div class="asig_left" style="margin-bottom:8px; display:flex; gap:10px; flex-wrap:wrap;">
                    <div class="fixed-select" style="flex:1; min-width:200px;">
                        <label for="selRol"><strong>Rol:</strong></label>
                        <select id="selRol"></select>
                    </div>

                    <div class="fixed-select" style="flex:1; min-width:200px;">
                        <label for="selAct"><strong>Actividad:</strong></label>
                        <select id="selAct"></select>
                    </div>
                </div>
                <div>
                    <input id="permSearch" class="asig_input" placeholder="Buscar permiso en la lista..." style="width:100%; box-sizing:border-box;" />
                </div>
            </section>

            <section class="ocAsignar_section ocdialog_flex_grow" style="overflow-y:auto;">
                <ul id="permList" class="ocAsignar_perm_list" role="listbox"></ul>
            </section>
        </div>
    </div>

    <div class="ocdialog_footer">
        <button class="ocdialog_button ocdialog_button--secondary" data-action="close" type="button">Cancelar</button>
        <button class="ocdialog_button ocdialog_button--success"  data-action="save"  type="button">Guardar</button>
    </div>
</dialog>

<dialog id="dlgInfo" class="ocdialog" style="max-width:520px;">
    <div class="ocdialog_header">
        <h3 class="ocdialog_title" id="dlgInfoTitle">Información</h3>
        <button class="ocdialog_close" data-action="close-info" type="button">&times;</button>
    </div>
    <div class="ocdialog_content">
        <p id="dlgInfoText" class="ocAsignar_hint" style="white-space:pre-wrap;margin:0; padding:10px;"></p>
    </div>
    <div class="ocdialog_footer">
        <button class="ocdialog_button" data-action="close-info" type="button">Cerrar</button>
    </div>
</dialog>

<script src="https://unpkg.com/tabulator-tables@6.3.1/dist/js/tabulator.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/js/tom-select.complete.min.js"></script>
<script src="../OcDialog/OcDialog.js"></script>
<script src="../OcDialog/OcDialogDrag.js"></script>
<script src="./asignar_permisos.js"></script>

</body>
</html>