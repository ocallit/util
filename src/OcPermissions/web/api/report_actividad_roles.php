<?php
/**
 * report_actividad_roles.php
 * Report: Actividad → Permisos → Roles
 * Shows all activities, their permissions, and which roles have each permission
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/config.php';

use Ocallit\SqlEr\SqlEr;

$db = SqlEr::getInstance();

// Get all activities with their permissions and assigned roles
$actividades = $db->query("
    SELECT
        a.actividad_id,
        a.actividad,
        a.descripcion
    FROM actividad a
    ORDER BY a.actividad
") ?: [];

// For each activity, get permissions with their roles
foreach ($actividades as &$act) {
    $act['permisos'] = $db->query("
        SELECT
            ap.actividad_permiso_id,
            ap.permiso,
            ap.etiqueta,
            GROUP_CONCAT(r.rol ORDER BY r.rol SEPARATOR ', ') as roles
        FROM actividad_permiso ap
        LEFT JOIN rol_actividad_permiso rap ON ap.actividad_permiso_id = rap.actividad_permiso_id
        LEFT JOIN rol r ON rap.rol_id = r.rol_id
        WHERE ap.actividad_id = ?
        GROUP BY ap.actividad_permiso_id, ap.permiso, ap.etiqueta
        ORDER BY ap.etiqueta
    ", [$act['actividad_id']]) ?: [];
}
unset($act);

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Actividades › Permisos › Roles</title>
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

        .activities {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 10px;
        }

        .act {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        .act-head {
            background: #1e40af;
            color: #fff;
            padding: 6px 10px;
            font-weight: 600;
            font-size: 0.9rem;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .perms {
            display: flex;
            flex-direction: column;
        }

        .perm-row {
            display: flex;
            padding: 5px 10px;
            border-bottom: 1px solid #eee;
            gap: 8px;
            flex-wrap: wrap;
            align-items: baseline;
        }

        .perm-row:last-child { border-bottom: none; }

        .perm-label {
            color: #333;
            font-size: 0.85rem;
            min-width: 80px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .perm-roles {
            flex: 1;
            word-wrap: break-word;
            overflow-wrap: break-word;
            color: #1e40af;
            font-weight: 600;
        }

        .no-role {
            color: #bbb;
            font-size: 0.85rem;
            font-weight: 400;
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

            .activities {
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
            }

            .perm-roles {
                color: #000;
            }
        }
    </style>
</head>
<body>

<h1>Actividades › Permisos › Roles</h1>

<div class="activities">
<?php foreach ($actividades as $act): ?>
    <div class="act">
        <div class="act-head"><?= htmlspecialchars($act['actividad']) ?></div>
        <?php if (empty($act['permisos'])): ?>
            <div class="empty">Sin permisos definidos</div>
        <?php else: ?>
            <div class="perms">
            <?php foreach ($act['permisos'] as $perm): ?>
                <div class="perm-row">
                    <span class="perm-label"><?= htmlspecialchars($perm['etiqueta']) ?></span>
                    <span class="perm-roles">
                        <?php if ($perm['roles']): ?>
                            <?= htmlspecialchars($perm['roles']) ?>
                        <?php else: ?>
                            <span class="no-role">—</span>
                        <?php endif; ?>
                    </span>
                </div>
            <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
<?php endforeach; ?>

<?php if (empty($actividades)): ?>
    <div class="empty">No hay actividades definidas</div>
<?php endif; ?>
</div>

</body>
</html>
