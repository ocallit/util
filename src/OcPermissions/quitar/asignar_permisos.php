<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roles Permisos</title>

    <link rel="stylesheet" href="./base.css" />
    <link rel="stylesheet" href="https://unpkg.com/tabulator-tables@6.3.1/dist/css/tabulator.min.css" />
    <link rel="stylesheet" href="../OcDialog/OcDialog.css" />
    <link rel="stylesheet" href="./asignar_permisos.css" />
</head>
<body>
<header class="sch_header">
    <h1>Asignar Permisos a Roles</h1>
</header>

<nav class="sch_nav">
    <ul>
        <li><a href="./index.html">Inicio</a></li>
        <li><a href="./actividad.html">Actividades</a></li>
        <li><a class="ocAsignar_nav_active" href="./asignar_permisos.html">Asignar Permisos</a></li>
        <li><a href="./roles.html">Roles</a></li>
        <li><a href="./usuarios.html">Usuarios</a></li>
    </ul>
</nav>

<main class="asig_container">
    <div class="asig_toolbar">
        <div class="asig_left">
            <label>Buscar:
                <input id="txtSearch" class="asig_input" type="search" placeholder="filtrar…" />
            </label>
        </div>
        <div class="asig_right">
            <button id="btnExport" class="sch_button sch_button--execute" title="Exportar CSV">⬇️ Exportar CSV</button>
        </div>
    </div>

    <div id="gridAssign"></div>
</main>

<!-- Info dialog (descripciones de rol/actividad) -->
<dialog id="dlgInfo" class="ocdialog" style="max-width:520px;">
    <div class="ocdialog_header">
        <h3 class="ocdialog_title" id="dlgInfoTitle">Información</h3>
        <button class="ocdialog_close" data-action="close-info" type="button" aria-label="Cerrar">&times;</button>
    </div>
    <div class="ocdialog_content">
        <p id="dlgInfoText" class="ocAsignar_hint" style="white-space:pre-wrap;margin:0;"></p>
    </div>
    <div class="ocdialog_footer">
        <button class="ocdialog_button" data-action="close-info" type="button">Cerrar</button>
    </div>
</dialog>

<script src="https://unpkg.com/tabulator-tables@6.3.1/dist/js/tabulator.min.js"></script>
<script src="../OcDialog/OcDialog.js"></script>
<script src="../OcDialog/OcDialogDrag.js"></script>
<script src="./asignar_permisos_all.js"></script>
<script>
    document.addEventListener("DOMContentLoaded", function () {
        if (window.AsignarPermisosShared) {
            AsignarPermisosShared.initReadOnly();
        }
    });
</script>
</body>
</html>
