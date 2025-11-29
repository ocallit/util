<?php
    require_once("./nav.php");
    $isEditMode = isset($_GET['mode']) && $_GET['mode'] === 'edit';
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
    <link rel="stylesheet" href="./actividad.css">
</head>
<body class="<?= $bodyClass ?>">
    <header class="sch_header"><h1>Usuarios, Roles y Permisos: Actividades</h1></header>
    <?= renderNav() ?>
    <main class="ocActividad_main_container">
        <!-- Toolbar -->
        <div class="ocActividad_toolbar">
            <div class="ocActividad_toolbar_left">
                <h2 class="ocActividad_title">Actividades y Permisos</h2>
            </div>
            <div class="ocActividad_toolbar_right">
                <?php if($isEditMode): ?>
                <button class="sch_button sch_button--save ocActividad_add_button" id="ocActividad_add_button">➕ Nueva Actividad</button>
                <?php endif; ?>
                <!-- Mode Toggle Link -->
                <a href="<?= $toggleUrl ?>" id="ocActividad_mode_toggle"><?=$toggleText?></a>
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
