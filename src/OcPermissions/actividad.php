<!DOCTYPE html>
<html lang="es">
<head>
    <!-- File: actividad.html -->
    <!-- Path: /actividad/actividad.html -->
    <!-- Version: 1.0.0 -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Actividades y Permisos</title>
    
    <!-- Base CSS -->
    <link rel="stylesheet" href="./base.css">
    
    <!-- Tabulator CSS -->
    <link href="https://unpkg.com/tabulator-tables@6.3.1/dist/css/tabulator.min.css" rel="stylesheet">
    
    <!-- OcDialog CSS -->
    <link rel="stylesheet" href="../OcDialog/OcDialog.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="./actividad.css">
</head>
<body>
    <header class="sch_header">
        <h1>Usuarios, Roles y Permisos: Actividades</h1>
    </header>
    <?= renderNav() ?>

    <!-- Main Content -->
    <main class="ocActividad_main_container">
        <!-- Toolbar -->
        <div class="ocActividad_toolbar">
            <div class="ocActividad_toolbar_left">
                <h2 class="ocActividad_title">Actividades y Permisos</h2>
            </div>
            <div class="ocActividad_toolbar_right">
                <button class="sch_button sch_button--save ocActividad_add_button" id="ocActividad_add_button" style="display: none;">➕ Nueva Actividad</button>
                <!-- Mode Toggle -->
                <div class="ocActividad_mode_toggle">
                    <label class="ocActividad_toggle_label">
                        <input type="checkbox" class="ocActividad_mode_checkbox" id="ocActividad_mode_toggle">
                        <span class="ocActividad_toggle_slider"></span>
                        <span class="ocActividad_toggle_text">Modo Edición</span>
                    </label>
                </div>
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
                                    <button class="ocActividad_macro_button" data-macro="wr_nada" title="Agrega: R/W Editar, R/O Consultar, Nada Nada">
                                        W/R/Nada
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


    <script src="../OcDialog/OcDialog.js"></script>
    <script src="../OcDialog/OcDialogDrag.js"></script>
    <script src="https://unpkg.com/tabulator-tables@6.3.1/dist/js/tabulator.min.js"></script>
    <script src="./actividad.js"></script>
</body>
</html>
