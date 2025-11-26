<?php
    require_once("./nav.php");
?><!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Usuarios</title>

    <link rel="stylesheet" href="./base.css" />
    <link rel="stylesheet" href="https://unpkg.com/tabulator-tables@6.3.1/dist/css/tabulator.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js@10.2.0/public/assets/styles/choices.min.css" />
    <link rel="stylesheet" href="../OcDialog/OcDialog.css" />
    <link rel="stylesheet" href="./usuarios.css" />
</head>
<body>
<header class="sch_header">
    <h1>Usuarios, Roles y Permisos: Usuarios</h1>
</header>
<?= renderNav() ?>
<main class="usuarios_container">
    <div class="usuarios_toolbar">
        <div class="toolbar-search-group">
            <label for="txtSearch">Buscar:</label>
            <input id="txtSearch" class="usuarios_input" type="search" placeholder="filtrar..." style="width: 30ch;" />
        </div>
        <button id="btnNew" class="sch_button sch_button--save" style="display:none;">➕ Nuevo Usuario</button>
        <button id="btnExport" class="sch_button sch_button--execute" title="Exportar CSV">⬇️ Exportar CSV</button>
    </div>

    <div class="sch_grid_container">
        <div id="gridUsuarios"></div>
    </div>
</main>

<dialog id="dlgEdit" class="ocdialog ocdialog_grow_content" style="width:780px;max-width:96vw;">
    <div class="ocdialog_header">
        <h2 class="ocdialog_title" id="dlgTitle">Editar Usuario</h2>
        <button class="ocdialog_close" data-action="close" type="button" aria-label="Cerrar">&times;</button>
    </div>

    <div class="ocdialog_content">
        <div class="ocdialog_flex_column" style="gap: 0.3em;">

            <section id="userMainSection" class="usuarios_section ocdialog_flex_fixed" style="margin-bottom: 0;">

                <div class="usuarios_row">
                    <div class="field-group field-nick">
                        <label for="editNick" class="usuarios_label">Nick:</label>
                        <input type="text" class="usuarios_input" id="editNick" maxlength="16" required />
                    </div>
                    <div class="field-group field-name">
                        <label for="editNombre" class="usuarios_label">Nombre Completo:</label>
                        <input type="text" class="usuarios_input" id="editNombre" maxlength="128" required />
                    </div>
                </div>

                <div class="usuarios_row">
                    <div class="field-group field-cel">
                        <label for="editCel" class="usuarios_label">Celular:</label>
                        <input type="tel" class="usuarios_input" id="editCel" maxlength="16" />
                    </div>
                    <div class="field-group field-email">
                        <label for="editEmail" class="usuarios_label">Email:</label>
                        <input type="email" class="usuarios_input" id="editEmail" maxlength="320" />
                    </div>
                </div>

                <div class="usuarios_row">
                    <div class="field-group field-estatus">
                        <label class="usuarios_label">Estatus:</label>
                        <select id="editEstatus" class="usuarios_input">
                            <option value="Puede Login">Puede Login</option>
                            <option value="No Puede Login">No Puede Login</option>
                        </select>
                        <div id="viewEstatus" class="usuarios_read_text" style="display:none"></div>
                    </div>

                    <div class="field-group field-caducidad">
                        <label class="usuarios_label">Caducidad (días):</label>
                        <input type="number" class="usuarios_input" id="editCaducidad" min="0" max="999" />
                        <div id="viewCaducidad" class="usuarios_read_text" style="display:none"></div>
                    </div>

                    <div class="field-group field-force">
                        <label class="usuarios_label">Forzar Cambio:</label>
                        <select id="editForzarCambio" class="usuarios_input">
                            <option value="No">No</option>
                            <option value="Si">Si</option>
                        </select>
                        <div id="viewForzarCambio" class="usuarios_read_text" style="display:none"></div>
                    </div>

                    <div class="field-group field-password" id="grpPassword">
                        <label for="editPassword" class="usuarios_label">Nuevo Password:</label>
                        <div class="password-wrapper">
                            <input type="password" class="usuarios_input" id="editPassword" />
                            <button type="button" class="btn-show-pass" id="btnShowPass" title="Mostrar/Ocultar">👁️</button>
                        </div>
                        <div class="usuarios_helper_text">En blanco no cambia</div>
                    </div>
                </div>

                <div class="usuarios_row">
                    <div class="field-group field-full">
                        <label class="usuarios_label">Roles Asignados:</label>
                        <div id="rolesEditContainer">
                            <select id="selRoles" placeholder="Roles..." multiple></select>
                        </div>
                        <div id="rolesReadContainer" style="display:none;">
                            <span id="rolesReadText" class="usuarios_read_text">-</span>
                        </div>
                    </div>
                </div>

                <div class="usuarios_row">
                    <div class="field-group field-full">
                        <label class="usuarios_label">Nota (uso interno):</label>
                        <textarea class="usuarios_textarea" id="editNota" rows="2"></textarea>
                        <div id="viewNota" class="usuarios_read_text" style="display:none; height:auto; min-height:2.2em; align-items: flex-start; white-space: pre-wrap;"></div>
                    </div>
                </div>
            </section>

            <section class="usuarios_section ocdialog_flex_grow" style="margin-top: 0; padding-top: 0; border-top: none;">
                <div class="usuarios_info_container_flex">
                    <div class="info-block-flex">
                        <span class="info-label-flex">Último Login</span>
                        <span class="info-value-flex" id="editUltimoLogin">-</span>
                    </div>
                    <div class="info-block-flex">
                        <span class="info-label-flex">Próximo Cambio Pass</span>
                        <span class="info-value-flex" id="editProximoCambioPass">-</span>
                    </div>
                    <div class="info-block-flex">
                        <span class="info-label-flex">Últ. Cambio Pass</span>
                        <span class="info-value-flex" id="editUltimoCambioPass">-</span>
                    </div>
                    <div class="info-block-flex">
                        <span class="info-label-flex">Últ. Cambio</span>
                        <span class="info-value-flex" id="editUltimoCambioEl">-</span>
                    </div>
                    <div class="info-block-flex">
                        <span class="info-label-flex">Últ. Cambio Por</span>
                        <span class="info-value-flex" id="editUltimoCambioPor">-</span>
                    </div>
                    <div class="info-block-flex">
                        <span class="info-label-flex">Creado el</span>
                        <span class="info-value-flex" id="editCreadoEl">-</span>
                    </div>
                    <div class="info-block-flex">
                        <span class="info-label-flex">Creado Por</span>
                        <span class="info-value-flex" id="editCreadoPor">-</span>
                    </div>
                    <div class="info-block-flex">
                        <span class="info-label-flex">Usuario ID</span>
                        <span class="info-value-flex" id="editId">-</span>
                    </div>
                </div>
            </section>
        </div>
    </div>

    <div class="ocdialog_footer">
        <button class="ocdialog_button ocdialog_button--secondary" data-action="close" type="button">Cancelar</button>
        <button class="ocdialog_button ocdialog_button--success" data-action="save" type="button">Guardar</button>
    </div>
</dialog>

<script src="https://unpkg.com/tabulator-tables@6.3.1/dist/js/tabulator.min.js"></script>

<script src="https://cdn.jsdelivr.net/npm/choices.js@10.2.0/public/assets/scripts/choices.min.js"></script>
<script src="../OcDialog/OcDialog.js"></script>
<script src="../OcDialog/OcDialogDrag.js"></script>
<script src="./usuarios.js"></script>

<script>
    (function() {
        var params = new URLSearchParams(window.location.search);
        var isEditMode = params.get("mode") === "edit";
        var btnNew = document.getElementById("btnNew");
        var dlgEdit = document.getElementById("dlgEdit");
        if (isEditMode && btnNew) btnNew.style.display = "";
        if (isEditMode && dlgEdit) dlgEdit.style.display = "";
    })();
</script>
</body>
</html>