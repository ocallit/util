<?php
/**
 * asignar_permisos_api.php
 * API for managing permission assignments (rol_actividad_permiso)
 * * Actions: list, toggle, save_batch
 */

declare(strict_types=1);

use Ocallit\Sqler\SqlExecutor;
use Ocallit\Sqler\QueryBuilder;

require_once __DIR__ . '/../inc/config.php';
global $SqlExecutor;

header('Content-Type: application/json; charset=utf-8');

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'list':
            echo json_encode(loadState($SqlExecutor));
            break;

        case 'toggle':
            echo json_encode(togglePermission($SqlExecutor, $input));
            break;

        case 'save_batch':
            echo json_encode(saveBatch($SqlExecutor, $input));
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
 * Load complete state for the grid
 */
function loadState(SqlExecutor $db): array
{
    $sqlComment = __FUNCTION__;

    // 1. Roles
    $roles = $db->array("SELECT /*$sqlComment*/ rol_id, rol, descripcion FROM rol ORDER BY rol");

    // 2. Activities
    $actividades = $db->array("SELECT /*$sqlComment*/ actividad_id, actividad, descripcion FROM actividad ORDER BY actividad");

    // 3. Permissions Definitions
    $actividad_permisos = $db->array("
        SELECT /*$sqlComment*/ actividad_permiso_id, actividad_id, permiso, etiqueta
        FROM actividad_permiso
        ORDER BY actividad_id, actividad_permiso_id
    ");

    // 4. Current Assignments (rol_actividad_permiso)
    // We map this to: rol_id => [actividad_permiso_id, ...]
    $asignacionesRaw = $db->array("SELECT /*$sqlComment*/ rol_id, actividad_permiso_id FROM rol_actividad_permiso");

    $asignaciones = [];
    foreach ($asignacionesRaw as $row) {
        $rId = (int)$row['rol_id'];
        $pId = (int)$row['actividad_permiso_id'];

        if (!isset($asignaciones[$rId])) {
            $asignaciones[$rId] = [];
        }
        $asignaciones[$rId][] = $pId;
    }

    return [
      'success' => true,
      'error' => null,
      'data' => [
        'roles' => $roles,
        'actividades' => $actividades,
        'actividad_permisos' => $actividad_permisos,
        'asignaciones' => (object)$asignaciones // Send as object to ensure JSON map
      ]
    ];
}

/**
 * Toggle a single permission for a role
 * Input: { rol_id, actividad_permiso_id, state (1=assign, 0=remove) }
 */
function togglePermission(SqlExecutor $db, array $input): array
{
    $rolId = (int)($input['rol_id'] ?? 0);
    $permId = (int)($input['actividad_permiso_id'] ?? 0);
    $state = (int)($input['state'] ?? 0);
    $currentUser = $_SESSION['nick'] ?? 'system';
    $sqlComment = __FUNCTION__;

    if ($rolId <= 0 || $permId <= 0) {
        return ['success' => false, 'error' => 'Datos inválidos', 'data' => null];
    }

    try {
        if ($state === 1) {
            $db->query(
              "INSERT /*$sqlComment*/ IGNORE INTO rol_actividad_permiso (rol_id, actividad_permiso_id, registrado_por) VALUES (?, ?, ?)",
              [$rolId, $permId, $currentUser]
            );
        } else {
            $db->query(
              "DELETE /*$sqlComment*/ FROM rol_actividad_permiso WHERE rol_id = ? AND actividad_permiso_id = ?",
              [$rolId, $permId]
            );
        }
        return ['success' => true, 'data' => null];
    } catch (Throwable $e) {
        return ['success' => false, 'error' => $e->getMessage(), 'data' => null];
    }
}

/**
 * Save a batch of permissions for a specific Role + Activity pair (used by Dialog)
 * Input: { rol_id, actividad_id, permisos: [id, id, ...] }
 */
function saveBatch(SqlExecutor $db, array $input): array
{
    $rolId = (int)($input['rol_id'] ?? 0);
    $actId = (int)($input['actividad_id'] ?? 0);
    $permIds = $input['permisos'] ?? []; // Array of actividad_permiso_id
    $currentUser = $_SESSION['nick'] ?? 'system';
    $sqlComment = __FUNCTION__;

    if ($rolId <= 0 || $actId <= 0) {
        return ['success' => false, 'error' => 'Rol o Actividad inválidos', 'data' => null];
    }

    $db->begin();
    try {
        // 1. Get all permission IDs associated with this Activity to scope the delete
        // We only want to delete permissions FOR THIS ACTIVITY assigned to this role
        $actPerms = $db->vector(
          "SELECT actividad_permiso_id FROM actividad_permiso WHERE actividad_id = ?",
          [$actId]
        );

        if (!empty($actPerms)) {
            // Convert to comma-separated string for IN clause (safe since we just got them from DB ints)
            $idList = implode(',', array_map('intval', $actPerms));

            // Delete existing assignments for this Role AND this Activity's permissions
            $db->query(
              "DELETE /*$sqlComment*/ FROM rol_actividad_permiso 
                 WHERE rol_id = ? AND actividad_permiso_id IN ($idList)",
              [$rolId]
            );
        }

        // 2. Insert new assignments
        if (!empty($permIds)) {
            $qb = new QueryBuilder();
            // We use a loop or manual construction because standard insert is one row usually
            // but let's just loop for simplicity in this specific context or build a bulk insert
            $values = [];
            $params = [];
            foreach ($permIds as $pid) {
                $pid = (int)$pid;
                // Double check this permission actually belongs to the activity (security check)
                if (in_array($pid, $actPerms)) {
                    $values[] = "(?, ?, ?)";
                    $params[] = $rolId;
                    $params[] = $pid;
                    $params[] = $currentUser;
                }
            }

            if (!empty($values)) {
                $sql = "INSERT /*$sqlComment*/ INTO rol_actividad_permiso (rol_id, actividad_permiso_id, registrado_por) VALUES " . implode(', ', $values);
                $db->query($sql, $params);
            }
        }

        $db->commit();
        return ['success' => true, 'data' => null];

    } catch (Throwable $e) {
        $db->rollBack();
        return ['success' => false, 'error' => $e->getMessage(), 'data' => null];
    }
}
