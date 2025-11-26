<?php
/**
 * asignar_permisos_api.php
 * API for managing permission assignments to roles (rol_actividad_permiso)
 * 
 * Actions: load, save
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
        case 'load':
            echo json_encode(loadState($db));
            break;

        case 'save':
            echo json_encode(saveState($db, $input['data'] ?? []));
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
 * Load complete state: roles, actividades, actividad_permisos, asignaciones, rowPairs
 * Returns: {success, error, data: {roles, actividades, actividad_permisos, asignaciones, rowPairs}}
 */
function loadState(SqlEr $db): array
{
    $roles = $db->query("
        SELECT rol_id, rol, descripcion
        FROM rol
        ORDER BY rol
    ") ?: [];

    $actividades = $db->query("
        SELECT actividad_id, actividad, descripcion
        FROM actividad
        ORDER BY actividad
    ") ?: [];

    $actividad_permisos = $db->query("
        SELECT actividad_permiso_id, actividad_id, permiso, etiqueta
        FROM actividad_permiso
        ORDER BY actividad_id, actividad_permiso_id
    ") ?: [];

    // Build asignaciones map: rol_id => [actividad_permiso_id, ...]
    $asignacionesRaw = $db->query("
        SELECT rol_id, actividad_permiso_id
        FROM rol_actividad_permiso
    ") ?: [];

    $asignaciones = [];
    foreach ($asignacionesRaw as $a) {
        $rolId = (int)$a['rol_id'];
        if (!isset($asignaciones[$rolId])) {
            $asignaciones[$rolId] = [];
        }
        $asignaciones[$rolId][] = (int)$a['actividad_permiso_id'];
    }

    // Build rowPairs from existing assignments (unique rol_id + actividad_id combinations)
    $rowPairs = [];
    $seen = [];

    // Map actividad_permiso_id => actividad_id
    $permToActividad = [];
    foreach ($actividad_permisos as $ap) {
        $permToActividad[(int)$ap['actividad_permiso_id']] = (int)$ap['actividad_id'];
    }

    foreach ($asignacionesRaw as $a) {
        $rolId = (int)$a['rol_id'];
        $permId = (int)$a['actividad_permiso_id'];
        $actId = $permToActividad[$permId] ?? 0;

        if ($actId > 0) {
            $key = $rolId . '-' . $actId;
            if (!isset($seen[$key])) {
                $rowPairs[] = ['rol_id' => $rolId, 'actividad_id' => $actId];
                $seen[$key] = true;
            }
        }
    }

    return [
        'success' => true,
        'error' => null,
        'data' => [
            'roles' => $roles,
            'actividades' => $actividades,
            'actividad_permisos' => $actividad_permisos,
            'asignaciones' => (object)$asignaciones, // Cast to object so empty becomes {} not []
            'rowPairs' => $rowPairs
        ]
    ];
}

/**
 * Save complete state (bulk update)
 * Receives: {action, data: {roles, actividades, actividad_permisos, asignaciones, rowPairs}}
 * Returns: {success, error, data: state}
 * 
 * Note: JS serializes Sets as arrays, so asignaciones comes as {rol_id: [perm_ids...]}
 */
function saveState(SqlEr $db, array $data): array
{
    $asignaciones = $data['asignaciones'] ?? [];
    $currentUser = $_SESSION['nick'] ?? 'system';

    $db->beginTransaction();

    try {
        // Build set of incoming assignments: "rol_id-permiso_id" => true
        $incomingKeys = [];
        foreach ($asignaciones as $rolId => $permIds) {
            $rolId = (int)$rolId;
            if (is_array($permIds)) {
                foreach ($permIds as $permId) {
                    $permId = (int)$permId;
                    if ($permId > 0) {
                        $incomingKeys[$rolId . '-' . $permId] = ['rol_id' => $rolId, 'actividad_permiso_id' => $permId];
                    }
                }
            }
        }

        // Get existing assignments
        $existingRaw = $db->query("SELECT rol_id, actividad_permiso_id FROM rol_actividad_permiso") ?: [];
        $existingKeys = [];
        foreach ($existingRaw as $row) {
            $existingKeys[$row['rol_id'] . '-' . $row['actividad_permiso_id']] = true;
        }

        // Delete removed assignments
        foreach ($existingKeys as $key => $v) {
            if (!isset($incomingKeys[$key])) {
                [$rolId, $permId] = explode('-', $key);
                $db->execute(
                    "DELETE FROM rol_actividad_permiso WHERE rol_id = ? AND actividad_permiso_id = ?",
                    [(int)$rolId, (int)$permId]
                );
            }
        }

        // Insert new assignments
        foreach ($incomingKeys as $key => $data) {
            if (!isset($existingKeys[$key])) {
                $db->insert('rol_actividad_permiso', [
                    'rol_id' => $data['rol_id'],
                    'actividad_permiso_id' => $data['actividad_permiso_id'],
                    'registrado_por' => $currentUser
                ]);
            }
        }

        $db->commit();

        return loadState($db);

    } catch (Throwable $e) {
        $db->rollBack();
        return ['success' => false, 'error' => $e->getMessage(), 'data' => null];
    }
}
