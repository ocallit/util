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
$toggleUrl = $isEditMode ? './actividad.php' : './actividad.php?mode=edit';
$toggleText = !$isEditMode ? '✏️ Edita' : '👁️Consulta';
$bodyClass = $isEditMode ? '' : 'ocActividad_readonly';
?><!DOCTYPE html>
<html lang="es">
<head>
    <!-- File: actividad.html -->
    <!-- Path: /actividad/actividad.html -->
    <!-- Version: 1.0.0 -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://kit.fontawesome.com/ad59c40b12.js" crossorigin="anonymous"></script>
    <title>Actividad</title>
    <link rel="stylesheet" href="./base.css">
    <link href="https://unpkg.com/tabulator-tables@6.3.1/dist/css/tabulator.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../OcDialog/OcDialog.css">
    <style>
        /* Toolbar styles matching usuarios.css */
        .ocActividad_main_container {
            padding: 10px;
            max-width: 100%;
        }

        .ocActividad_toolbar {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 10px;
            padding: 10px;
            background: var(--color-surface, #fff);
            border-radius: 6px;
            border: 1px solid var(--color-border, #d0d5dd);
            box-shadow: var(--elevation-1, 0 1px 2px rgba(0,0,0,0.05));
        }

        .ocActividad_toolbar_left,
        .ocActividad_toolbar_right {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .ocActividad_input {
            border: 1px solid var(--color-border, #d0d5dd);
            background: var(--color-surface, #fff);
            color: var(--color-text, #111827);
            border-radius: 4px;
            padding: 6px 8px;
            box-sizing: border-box;
            font-size: 0.95rem;
            height: 2.2em;
        }

        .ocActividad_grid_container {
            border: 1px solid var(--color-border, #d0d5dd);
            border-radius: 6px;
            box-shadow: var(--elevation-1, 0 1px 2px rgba(16,24,40,.06));
            overflow: clip;
        }

        /* Action buttons in grid */
        .ocActividad_actions_cell {
            display: flex;
            gap: 4px;
            justify-content: center;
        }

        .ocActividad_action_button {
            padding: 4px 8px;
            margin: 0 2px;
            border-radius: 4px;
            border: 1px solid var(--color-border, #d0d5dd);
            background: var(--color-surface, #fff);
            color: var(--color-text, #111827);
            cursor: pointer;
            font-size: 14px;
        }

        .ocActividad_action_button:hover {
            filter: brightness(.97);
        }

        .ocActividad_action_delete {
            color: var(--color-fail, #dc3545);
            border-color: var(--color-fail, #dc3545);
        }

        .ocActividad_action_view {
            color: var(--color-info, #17a2b8);
            border-color: var(--color-info, #17a2b8);
        }

        /* Section styles for dialog */
        .ocActividad_section {
            background: var(--color-surface, #fff);
            border: 1px solid var(--color-border, #d0d5dd);
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 8px;
        }

        .ocActividad_form_row {
            display: flex;
            flex-direction: column;
            margin-bottom: 8px;
        }

        .ocActividad_form_row--inline {
            flex-direction: row;
            align-items: center;
            gap: 8px;
        }

        .ocActividad_form_row--inline .ocActividad_label {
            margin-bottom: 0;
            flex-shrink: 0;
        }

        .ocActividad_form_row--inline .ocActividad_input {
            flex: 1;
        }

        .ocActividad_label {
            font-weight: 600;
            color: var(--color-text);
            margin-bottom: 4px;
            font-size: 0.9rem;
        }

        .ocActividad_textarea {
            border: 1px solid var(--color-border, #d0d5dd);
            background: var(--color-surface, #fff);
            color: var(--color-text, #111827);
            border-radius: 4px;
            padding: 6px 8px;
            width: 100%;
            resize: vertical;
            font-family: inherit;
            box-sizing: border-box;
        }

        .ocActividad_info_row {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin: 0;
            padding: 6px 8px;
            background: var(--color-neutral-bg);
            border-radius: 3px;
            font-size: 0.85rem;
        }

        .ocActividad_info_item {
            color: var(--color-text-light);
        }

        .ocActividad_info_item strong {
            color: var(--color-text);
            margin-right: 4px;
        }

        .ocActividad_section_header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            flex-wrap: wrap;
            gap: 8px;
        }

        .ocActividad_section_title {
            margin: 0;
            color: var(--color-secondary);
            font-size: 0.95rem;
            font-weight: 600;
        }

        .ocActividad_permission_actions {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }

        .ocActividad_macro_buttons {
            display: flex;
            gap: 4px;
        }

        .ocActividad_macro_button {
            padding: 4px 8px;
            border: 1px solid var(--color-border, #d0d5dd);
            background: var(--color-surface, #fff);
            color: var(--color-text);
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
        }

        .ocActividad_macro_button:hover {
            background: var(--color-secondary-bg, #f8f9fa);
        }

        .ocActividad_permissions_container {
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-height: 300px;
            overflow-y: auto;
            padding: 8px;
            background: var(--color-neutral-bg, #f9fafb);
            border-radius: 4px;
        }

        .ocActividad_grow_shrink {
            flex: 1 1 auto;
            overflow: hidden;
        }
    </style>
</head>
<body class="<?= $bodyClass ?>">
<?= renderNav() ?>
<main class="ocActividad_main_container">
    <!-- Toolbar -->
    <div class="ocActividad_toolbar">
        <div class="ocActividad_toolbar_left" style="vertical-align: top">
            <h2 style="margin:0;padding:0 1em 0 0;color:var(--color-primary)">Actividades</h2>
            <div>
            <label for="txtSearch">Buscar:</label><br>
            <input id="txtSearch" class="ocActividad_input" type="search" placeholder="filtrar..." style="width: 30ch;" />
            </div>
        </div>
        <div class="ocActividad_toolbar_right">
            <?php if($isEditMode): ?>
                <button class="sch_button sch_button--save ocActividad_add_button" id="ocActividad_add_button">➕ Nueva Actividad</button>
            <?php endif; ?>
            <button id="btnExport" class="sch_button sch_button--execute" title="Exportar CSV">⬇️ Exportar CSV</button>
            <?php if($puedeEditar) { ?>
                <a href="<?= $toggleUrl ?>" ><?=$toggleText?></a>
            <?php } ?>
        </div>
    </div>
    <!-- Tabulator Grid Container -->
    <div class="ocActividad_grid_container">
        <div id="ocActividad_tabulator_grid"></div>
    </div>
</main>

<!-- Edit Activity Dialog -->
<dialog id="ocActividad_edit_dialog"  class="ocdialog ocdialog_grow_content">
    <div class="ocdialog_header" >
        <h2 class="ocdialog_title" id="ocActividad_dialog_title">Editar Actividad</h2>
        <button class="ocdialog_close" id="ocActividad_close_edit_dialog">&times;</button>
    </div>

    <div class="ocdialog_content">
        <div class="ocdialog_flex_column">

            <section class="ocActividad_section ocdialog_flex_fixed">
                <div class="ocActividad_form_row ocActividad_form_row--inline">
                    <label for="ocActividad_edit_actividad" class="ocActividad_label">Actividad:</label>
                    <input type="text" class="ocActividad_input" id="ocActividad_edit_actividad" maxlength="64" required>
                </div>

                <div class="ocActividad_form_row">
                    <label class="ocActividad_label">Descripción:</label>
                    <textarea class="ocActividad_textarea" id="ocActividad_edit_descripcion" rows="2"></textarea>
                </div>

                <div class="ocActividad_info_row">
                            <span class="ocActividad_info_item">
                                <strong>ID:</strong> <span id="ocActividad_edit_id">Nuevo</span>
                            </span>
                    <span class="ocActividad_info_item">
                                <strong>Registrado el:</strong> <span id="ocActividad_edit_registrado_el">-</span>
                            </span>
                    <span class="ocActividad_info_item">
                                <strong>Por:</strong> <span id="ocActividad_edit_registrado_por">-</span>
                            </span>
                </div>
            </section>

            <section class="ocActividad_section ocActividad_grow_shrink">
                <div class="ocActividad_section_header">
                    <h3 class="ocActividad_section_title">Permisos</h3>
                    <div class="ocActividad_permission_actions">
                        <div class="ocActividad_macro_buttons">
                            <button class="ocActividad_macro_button" data-macro="WR_RO" title="Agrega: Editar, Consultar">
                                Editar/Consultar
                            </button>
                            <button class="ocActividad_macro_button" data-macro="crud" title="Agrega: crear, leer, actualizar, eliminar">
                                A/B/C
                            </button>
                            <button class="ocActividad_macro_button" data-macro="si_no" title="Agrega: Si, No">
                                Si/No
                            </button>
                        </div>
                        <button class="sch_button sch_button--save ocActividad_add_permission_button" id="ocActividad_add_permission">
                            ➕ Agregar
                        </button>
                    </div>
                </div>

                <div class="ocActividad_permissions_container" id="ocActividad_permissions_list">
                </div>
            </section>

        </div> </div>

    <div class="ocdialog_footer">
        <button class="ocdialog_button ocdialog_button--secondary" id="ocActividad_cancel_edit">Cancelar</button>
        <button class="ocdialog_button ocdialog_button--success" id="ocActividad_save_edit">Guardar</button>
    </div>
    </div>
</dialog>

<script src="https://unpkg.com/tabulator-tables@6.3.1/dist/js/tabulator.min.js"></script>
<script src="../OcDialog/OcDialog.js"></script>
<script src="../OcDialog/OcDialogDrag.js"></script>
<script src="./actividad.js"></script>
</body>
</html>