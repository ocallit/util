<?php
/**
 * actividad_api.php
 * API for managing activities (actividad) and their permissions (actividad_permiso)
 * 
 * Actions: list, save, delete
 */

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

use Ocallit\SqlEr\SqlEr;

header('Content-Type: application/json; charset=utf-8');

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? '';

    $db = SqlEr::getInstance();

    switch ($action) {
        case 'list':
            echo json_encode(listActividades($db));
            break;

        case 'save':
            echo json_encode(saveActividad($db, $input));
            break;

        case 'delete':
            $id = (int)($input['actividad_id'] ?? 0);
            echo json_encode(deleteActividad($db, $id));
            break;

        default:
            echo json_encode([
                'success' => false,
                'error' => 'Acción desconocida: ' . $action,
                'data' => null
            ]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'data' => null
    ]);
}

/**
 * List all activities with their permissions
 * Returns: {success, error, data: [{actividad_id, actividad, descripcion, registrado_el, registrado_por, permisos: [...]}]}
 */
function listActividades(SqlEr $db): array
{
    $actividades = $db->query("
        SELECT actividad_id, actividad, descripcion, registrado_el, registrado_por
        FROM actividad
        ORDER BY actividad
    ");

    if ($actividades === false) {
        return ['success' => false, 'error' => 'Error al consultar actividades', 'data' => null];
    }

    foreach ($actividades as &$act) {
        $act['permisos'] = $db->query("
            SELECT actividad_permiso_id, permiso, etiqueta
            FROM actividad_permiso
            WHERE actividad_id = ?
            ORDER BY actividad_permiso_id
        ", [$act['actividad_id']]) ?: [];
    }
    unset($act);

    return ['success' => true, 'error' => null, 'data' => $actividades];
}

/**
 * Save (create or update) activity with permissions
 * Receives: {action, actividad_id?, actividad, descripcion, permisos: [{actividad_permiso_id?, permiso, etiqueta}]}
 * Returns: {success, error, data: actividad}
 */
function saveActividad(SqlEr $db, array $input): array
{
    $actividad_id = isset($input['actividad_id']) ? (int)$input['actividad_id'] : 0;
    $actividad = trim($input['actividad'] ?? '');
    $descripcion = trim($input['descripcion'] ?? '');
    $permisos = $input['permisos'] ?? [];

    if ($actividad === '') {
        return ['success' => false, 'error' => 'El campo actividad es obligatorio', 'data' => null];
    }

    $currentUser = $_SESSION['nick'] ?? 'system';

    $db->beginTransaction();

    try {
        if ($actividad_id > 0) {
            // Update existing
            $db->update('actividad', [
                'actividad' => $actividad,
                'descripcion' => $descripcion
            ], 'actividad_id = ?', [$actividad_id]);
        } else {
            // Insert new
            $db->insert('actividad', [
                'actividad' => $actividad,
                'descripcion' => $descripcion,
                'registrado_por' => $currentUser
            ]);
            $actividad_id = (int)$db->lastInsertId();
        }

        // Get current permission IDs for this activity
        $existingPerms = $db->query("
            SELECT actividad_permiso_id FROM actividad_permiso WHERE actividad_id = ?
        ", [$actividad_id]) ?: [];
        $existingIds = array_column($existingPerms, 'actividad_permiso_id');

        // Track which IDs are being kept/updated
        $keptIds = [];

        foreach ($permisos as $perm) {
            $permiso = trim($perm['permiso'] ?? '');
            $etiqueta = trim($perm['etiqueta'] ?? '');

            if ($permiso === '' || $etiqueta === '') {
                continue;
            }

            $permId = isset($perm['actividad_permiso_id']) ? (int)$perm['actividad_permiso_id'] : 0;

            if ($permId > 0 && in_array($permId, $existingIds, true)) {
                // Update existing permission
                $db->update('actividad_permiso', [
                    'permiso' => $permiso,
                    'etiqueta' => $etiqueta
                ], 'actividad_permiso_id = ?', [$permId]);
                $keptIds[] = $permId;
            } else {
                // Insert new permission
                $db->insert('actividad_permiso', [
                    'actividad_id' => $actividad_id,
                    'permiso' => $permiso,
                    'etiqueta' => $etiqueta,
                    'registrado_por' => $currentUser
                ]);
            }
        }

        // Delete permissions that were removed
        $toDelete = array_diff($existingIds, $keptIds);
        if (!empty($toDelete)) {
            $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
            $db->execute("DELETE FROM actividad_permiso WHERE actividad_permiso_id IN ($placeholders)", array_values($toDelete));
        }

        $db->commit();

        // Return updated activity with permisos
        $saved = $db->queryRow("
            SELECT actividad_id, actividad, descripcion, registrado_el, registrado_por
            FROM actividad WHERE actividad_id = ?
        ", [$actividad_id]);

        $saved['permisos'] = $db->query("
            SELECT actividad_permiso_id, permiso, etiqueta
            FROM actividad_permiso
            WHERE actividad_id = ?
            ORDER BY actividad_permiso_id
        ", [$actividad_id]) ?: [];

        return ['success' => true, 'error' => null, 'data' => $saved];

    } catch (Throwable $e) {
        $db->rollBack();
        return ['success' => false, 'error' => $e->getMessage(), 'data' => null];
    }
}

/**
 * Delete activity (permissions cascade via FK)
 * Receives: {action, actividad_id}
 * Returns: {success, error, data: null}
 */
function deleteActividad(SqlEr $db, int $id): array
{
    if ($id <= 0) {
        return ['success' => false, 'error' => 'ID de actividad inválido', 'data' => null];
    }

    $exists = $db->queryValue("SELECT actividad_id FROM actividad WHERE actividad_id = ?", [$id]);
    if (!$exists) {
        return ['success' => false, 'error' => 'Actividad no encontrada', 'data' => null];
    }

    $db->execute("DELETE FROM actividad WHERE actividad_id = ?", [$id]);

    return ['success' => true, 'error' => null, 'data' => null];
}
