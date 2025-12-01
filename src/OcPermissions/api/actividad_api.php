<?php
/**
 * actividad_api.php
 * API for managing activities (actividad) and their permissions (actividad_permiso)
 *
 * Actions: list, save, delete
 */

declare(strict_types=1);
use Ocallit\Sqler\SqlExecutor;
use Ocallit\Sqler\QueryBuilder;


require_once __DIR__ . '/../inc/config.php';
global $SqlExecutor;

header('Content-Type: application/json; charset=utf-8');

try {
    $input = json_decode(file_get_contents('php://input'), TRUE) ?? [];
    $action = $input['action'] ?? '';

    switch($action) {
        case 'list':
            echo json_encode(listActividades($SqlExecutor));
            break;

        case 'save':
            echo json_encode(saveActividad($SqlExecutor, $input));
            break;

        case 'delete':
            $id = (int)($input['actividad_id'] ?? 0);
            echo json_encode(deleteActividad($SqlExecutor, $id));
            break;

        default:
            echo json_encode([
              'success' => FALSE,
              'error' => 'Acción desconocida: ' . $action,
              'data' => NULL,
            ]);
    }
} catch(Throwable $e) {
    http_response_code(500);
    echo json_encode([
      'success' => FALSE,
      'error' => $e->getMessage(),
      'data' => NULL,
    ]);
}

/**
 * List all activities with their permissions
 * Returns: {success, data: [{actividad_id, actividad, descripcion, registrado_el, registrado_por, permisos: [...]}]}
 */
function listActividades(SqlExecutor $db): array {
    $sqlComment = __FUNCTION__;
    // Get all activities
    $actividades = $db->array("
        SELECT /*$sqlComment*/ 
            actividad_id, actividad, descripcion, registrado_el, registrado_por
        FROM actividad
        ORDER BY actividad;
    ");

    // Get all permissions grouped by actividad_id
    $permisosRows = $db->array("
        SELECT /*$sqlComment*/ 
            actividad_permiso_id, actividad_id, permiso, etiqueta
        FROM actividad_permiso
        ORDER BY actividad_id, etiqueta;
    ");

    // Group permissions by actividad_id
    $permisosByActividad = [];
    foreach ($permisosRows as $row) {
        $actId = $row['actividad_id'];
        if (!isset($permisosByActividad[$actId])) {
            $permisosByActividad[$actId] = [];
        }
        $permisosByActividad[$actId][] = [
          'actividad_permiso_id' => (int)$row['actividad_permiso_id'],
          'permiso' => $row['permiso'],
          'etiqueta' => $row['etiqueta']
        ];
    }

    // Attach permissions array to each activity
    foreach ($actividades as &$actividad) {
        $actId = $actividad['actividad_id'];
        $actividad['permisos'] = $permisosByActividad[$actId] ?? [];
    }

    return ['success' => TRUE, 'data' => $actividades];
}

/**
 * Save (create or update) activity with permissions
 * Receives: {action, actividad_id?, actividad, descripcion, permisos: [{actividad_permiso_id?, permiso, etiqueta}]}
 * Returns: {success, error, data: actividad}
 */
function saveActividad(SqlExecutor $db, array $input): array {
    $actividad_id = isset($input['actividad_id']) ? (int)$input['actividad_id'] : 0;
    $actividad =  sTrim($input['actividad'] ?? '');
    $descripcion = trim($input['descripcion'] ?? '');
    $permisos = $input['permisos'] ?? [];

    if($actividad === '') {
        return ['success' => FALSE, 'error' => 'El campo actividad es obligatorio', 'data' => NULL];
    }

    $currentNick = $_SESSION['nick'] ?? 'system';
    $sqlComment = __METHOD__;
    $sqlBuilder = new QueryBuilder();
    $db->begin();

    try {
        try {
            if($actividad_id > 0) {
                $update = $sqlBuilder->update(
                  "actividad",
                   ['actividad' => $actividad,'descripcion' => $descripcion,],
                  ["actividad_id" => $actividad_id],
//                  "/*$sqlComment*/"
                );
                $db->query($update['query'], $update['parameters']);
            } else {
                $insert = $sqlBuilder->insert(
                  "actividad",
                  ['actividad' => $actividad,'descripcion' => $descripcion, 'registrado_por'=>$currentNick],
             //     comment: "/*$sqlComment*/"
                );
                $db->query($insert['query'], $insert['parameters']);
                $actividad_id = (int)$db->last_insert_id();
            }
        } catch(Throwable $e) {
            if($db->is_last_error_duplicate_key()) {
                return ['success' => FALSE, 'error' => "Ya existe otra actividad '$actividad'", 'data' => NULL];
            }
            return ['success' => FALSE, 'error' => "Error al guardar en la base de datos: " . $e->getMessage(), 'data' => NULL];
        }

        $where = $sqlBuilder->where(
          ["actividad_id"=>$actividad_id, "permiso" => array_column($permisos, 'permiso')],
        " AND NOT "
        );
        $db->query("DELETE /*$sqlComment*/ FROM actividad_permiso WHERE $where[query]", $where['parameters']);

        $values = [];
        $parameters = [];
        foreach($permisos as $perm) {
            $permiso = trim($perm['permiso'] ?? '');
            $etiqueta = trim($perm['etiqueta'] ?? '');
            if($permiso === '' || $etiqueta === '') {
                continue;
            }
            $values[] = "(?,?,?,?)";
            $parameters[] = $actividad_id;
            $parameters[] = $permiso;
            $parameters[] = $etiqueta;
            $parameters[] = $currentNick;
        }
        if(!empty($values)) {
            $insert =
              "INSERT /*$sqlComment*/ 
              INTO actividad_permiso(actividad_id, permiso, etiqueta, registrado_por) 
              VALUES " . implode(",", $values) .
              " ON DUPLICATE KEY UPDATE permiso=VALUES(permiso), etiqueta=VALUES(etiqueta)";
            $db->query($insert, $parameters);
        }

        $db->commit();
        return listActividades($db);

    } catch(Throwable $e) {
        $db->rollBack();
        return ['success' => FALSE, 'error' => $e->getMessage(), 'data' => NULL, "ins"=>$insert ?? "", "p" => $parameters ?? "" ];
    }
}

/**
 * Delete activity (permissions cascade via FK)
 * Receives: {action, actividad_id}
 * Returns: {success, error, data: null}
 */
function deleteActividad(SqlExecutor $db, int $id): array {
    if($id <= 0) {
        return ['success' => FALSE, 'error' => 'ID de actividad inválido', 'data' => NULL];
    }
    $db->query("DELETE FROM actividad WHERE actividad_id = ?", [$id]);
    return ['success' => TRUE, 'error' => NULL, 'data' => NULL];
}
