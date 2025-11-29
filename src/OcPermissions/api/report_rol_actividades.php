<?php
/**
 * report_rol_actividades.php
 * Report: Rol → Actividad → Permisos
 * Shows all roles, their activities, and which permissions they have on each
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

use Ocallit\SqlEr\SqlEr;

$db = SqlEr::getInstance();

// Get all roles
$roles = $db->query("
    SELECT 
        r.rol_id,
        r.rol,
        r.descripcion
    FROM rol r
    ORDER BY r.rol
") ?: [];

// For each role, get activities with their permissions
foreach ($roles as &$rol) {
    $rol['actividades'] = $db->query("
        SELECT 
            a.actividad_id,
            a.actividad,
            GROUP_CONCAT(ap.etiqueta ORDER BY ap.etiqueta SEPARATOR ', ') as permisos
        FROM rol_actividad_permiso rap
        JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
        JOIN actividad a ON ap.actividad_id = a.actividad_id
        WHERE rap.rol_id = ?
        GROUP BY a.actividad_id, a.actividad
        ORDER BY a.actividad
    ", [$rol['rol_id']]) ?: [];
}
unset($rol);

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roles › Actividades › Permisos</title>
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

        .roles {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 10px;
        }

        .rol {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        .rol-head {
            background: #059669;
            color: #fff;
            padding: 6px 10px;
            font-weight: 600;
            font-size: 0.9rem;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .acts {
            display: flex;
            flex-direction: column;
        }

        .act-row {
            display: flex;
            padding: 5px 10px;
            border-bottom: 1px solid #eee;
            gap: 8px;
            flex-wrap: wrap;
            align-items: baseline;
        }

        .act-row:last-child { border-bottom: none; }

        .act-name {
            color: #1e40af;
            font-weight: 600;
            font-size: 0.85rem;
            min-width: 100px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .act-perms {
            flex: 1;
            word-wrap: break-word;
            overflow-wrap: break-word;
            color: #555;
            font-size: 0.85rem;
        }

        .empty {
            padding: 10px;
            color: #aaa;
            text-align: center;
            font-size: 0.8rem;
        }

        @media print {
            body {
                background: #fff;
                padding: 0;
                font-size: 11px;
            }

            h1 { color: #000; }

            .roles {
                display: block;
            }

            .rol {
                break-inside: avoid;
                page-break-inside: avoid;
                margin-bottom: 10px;
                border: 1px solid #999;
            }

            .rol-head {
                background: #fff !important;
                color: #000 !important;
                border-bottom: 2px solid #000;
            }

            .act-name {
                color: #000;
            }
        }
    </style>
</head>
<body>

<h1>Roles › Actividades › Permisos</h1>

<div class="roles">
<?php foreach ($roles as $rol): ?>
    <div class="rol">
        <div class="rol-head"><?= htmlspecialchars($rol['rol']) ?></div>
        <?php if (empty($rol['actividades'])): ?>
            <div class="empty">Sin permisos asignados</div>
        <?php else: ?>
            <div class="acts">
            <?php foreach ($rol['actividades'] as $act): ?>
                <div class="act-row">
                    <span class="act-name"><?= htmlspecialchars($act['actividad']) ?></span>
                    <span class="act-perms"><?= htmlspecialchars($act['permisos']) ?></span>
                </div>
            <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
<?php endforeach; ?>

<?php if (empty($roles)): ?>
    <div class="empty">No hay roles definidos</div>
<?php endif; ?>
</div>

</body>
</html>
