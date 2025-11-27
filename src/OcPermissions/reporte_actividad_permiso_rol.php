<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Actividades y Roles</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 13px;
            background: #f5f5f5;
            color: #333;
            line-height: 1.4;
            padding: 12px;
        }

        h1 {
            font-size: 1rem;
            color: #1e40af;
            margin-bottom: 12px;
        }

        /* Grid - auto-fill, min 280px, cards grow */
        .activities {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 10px;
        }

        /* Activity Card */
        .act {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            /* No overflow:hidden - content can push */
        }

        .act-head {
            background: #1e40af;
            color: #fff;
            padding: 6px 10px;
            font-weight: 600;
            font-size: 0.9rem;
            /* Words wrap if activity name is long */
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        /* Permissions list */
        .perms {
            display: flex;
            flex-direction: column;
        }

        .perm-row {
            display: flex;
            padding: 5px 10px;
            border-bottom: 1px solid #eee;
            gap: 8px;
            /* Allow wrapping to next line if needed */
            flex-wrap: wrap;
            align-items: baseline;
        }

        .perm-row:last-child { border-bottom: none; }

        .perm-label {
            color: #333;
            font-size: 0.85rem;
            min-width: 80px;
            /* Long labels wrap */
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .perm-roles {
            flex: 1;
            /* Long role lists wrap naturally */
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .perm-roles a {
            color: #1e40af;
            font-weight: 600;
            text-decoration: none;
        }

        .no-role {
            color: #bbb;
            font-size: 0.85rem;
        }

        .empty {
            padding: 10px;
            color: #aaa;
            text-align: center;
            font-size: 0.8rem;
        }

        /* ===========================================
           PRINT / PDF STYLES
           =========================================== */
        @media print {
            body {
                background: #fff;
                padding: 0;
                font-size: 11px;
            }

            h1 {
                color: #000;
            }

            .activities {
                /* For PDF: avoid grid issues, simple block */
                display: block;
            }

            .act {
                break-inside: avoid;
                page-break-inside: avoid;
                margin-bottom: 10px;
                border: 1px solid #999;
            }

            .act-head {
                background: #fff !important;
                color: #000 !important;
                border-bottom: 2px solid #000;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .perm-roles a {
                color: #000;
            }
        }
    </style>
</head>
<body>

<h1>Actividades › Permisos › Roles</h1>

<div class="activities">

    <div class="act">
        <div class="act-head">Gestión de Usuarios</div>
        <div class="perms">
            <div class="perm-row">
                <span class="perm-label">Editar</span>
                <span class="perm-roles"><a>Administrador</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">Consultar</span>
                <span class="perm-roles"><a>Administrador</a>, <a>Supervisor</a>, <a>Soporte</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">Crear usuarios</span>
                <span class="perm-roles"><a>Administrador</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">Eliminar usuarios</span>
                <span class="perm-roles"><span class="no-role">—</span></span>
            </div>
        </div>
    </div>

    <div class="act">
        <div class="act-head">Ventas</div>
        <div class="perms">
            <div class="perm-row">
                <span class="perm-label">Realizar ventas</span>
                <span class="perm-roles"><a>Vendedor</a>, <a>Cajero</a>, <a>Supervisor</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">Cancelar ventas</span>
                <span class="perm-roles"><a>Supervisor</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">Aplicar descuentos</span>
                <span class="perm-roles"><a>Supervisor</a>, <a>Gerente</a></span>
            </div>
        </div>
    </div>

    <div class="act">
        <div class="act-head">Reportes Financieros</div>
        <div class="perms">
            <div class="perm-row">
                <span class="perm-label">Puede ver</span>
                <span class="perm-roles"><a>Contador</a>, <a>Gerente</a>, <a>Director</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">No puede ver</span>
                <span class="perm-roles"><span class="no-role">—</span></span>
            </div>
        </div>
    </div>

    <div class="act">
        <div class="act-head">Inventario y Control de Existencias en Almacén</div>
        <div class="perms">
            <div class="perm-row">
                <span class="perm-label">Ver lista de productos</span>
                <span class="perm-roles"><a>Almacenista</a>, <a>Compras</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">Registrar entrada</span>
                <span class="perm-roles"><a>Almacenista</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">Registrar salida</span>
                <span class="perm-roles"><a>Almacenista</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">Ajustar inventario</span>
                <span class="perm-roles"><a>Supervisor de Almacén</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">Inventario físico completo</span>
                <span class="perm-roles"><a>Almacenista</a>, <a>Supervisor de Almacén</a>, <a>Gerente de Operaciones</a></span>
            </div>
        </div>
    </div>

    <div class="act">
        <div class="act-head">Compras</div>
        <div class="perms">
            <div class="perm-row">
                <span class="perm-label">Solicitar compra</span>
                <span class="perm-roles"><a>Compras</a>, <a>Almacenista</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">Autorizar compra</span>
                <span class="perm-roles"><a>Gerente</a></span>
            </div>
            <div class="perm-row">
                <span class="perm-label">Recibir mercancía</span>
                <span class="perm-roles"><a>Almacenista</a></span>
            </div>
        </div>
    </div>

    <div class="act">
        <div class="act-head">Configuración del Sistema</div>
        <div class="empty">Sin permisos definidos</div>
    </div>

</div>

</body>
</html>
