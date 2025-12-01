<?php
/**
 * roles_api.php
 * API for managing roles (rol) and their user assignments (rol_usuario)
 *
 * Actions: list, save, delete
 *
 * roles_api.php - Actions:
 * ActionReceivesReturnslist{action: 'list'}{success, data: {roles: [...], usuarios: [...]}}save{action: 'save', rol_id?, rol, descripcion, usuarios: [id,...]}{success, data: {roles, usuarios}}delete{action: 'delete', rol_id}{success, error, data: null}
 *
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
            echo json_encode(listRoles($SqlExecutor));
            break;

        case 'save':
            echo json_encode(saveRole($SqlExecutor, $input));
            break;

        case 'delete':
            $id = (int)($input['rol_id'] ?? 0);
            echo json_encode(deleteRole($SqlExecutor, $id));
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
 * List all roles with their assigned users, plus all available users
 * Returns: {success, error, data: {roles: [{rol_id, rol, descripcion, registrado_el, registrado_por, usuarios: [...]}], usuarios: [...]}}
 */
function listRoles(SqlExecutor $db): array
{
    $sqlComment = __FUNCTION__;

    // Get all roles
    $roles = $db->array("
        SELECT /*$sqlComment*/
            rol_id, rol, descripcion, registrado_el, registrado_por
        FROM rol
        ORDER BY rol
    ");

    // Get all user assignments with user details
    $assignments = $db->array("
        SELECT /*$sqlComment*/
            ru.rol_id, ru.usuario_id, u.nick, u.nombre
        FROM rol_usuario ru
        INNER JOIN usuario u ON ru.usuario_id = u.usuario_id
        ORDER BY ru.rol_id, u.nick
    ");

    // Group assignments by rol_id
    $usersByRole = [];
    foreach ($assignments as $row) {
        $rolId = $row['rol_id'];
        if (!isset($usersByRole[$rolId])) {
            $usersByRole[$rolId] = [];
        }
        $usersByRole[$rolId][] = [
            'usuario_id' => (int)$row['usuario_id'],
            'nick' => $row['nick'],
            'nombre' => $row['nombre']
        ];
    }

    // Attach usuarios array to each role
    foreach ($roles as &$role) {
        $rolId = $role['rol_id'];
        $role['usuarios'] = $usersByRole[$rolId] ?? [];
    }

    // Get all available users (for the dropdown)
    $usuarios = $db->array("
        SELECT /*$sqlComment*/
            usuario_id, nick, nombre
        FROM usuario
        ORDER BY nick
    ");

    return [
        'success' => true,
        'error' => null,
        'data' => [
            'roles' => $roles,
            'usuarios' => $usuarios
        ]
    ];
}

/**
 * Save (create or update) a single role with its user assignments
 * Receives: {action, rol_id?, rol, descripcion, usuarios: [usuario_id, ...]}
 * Returns: {success, error, data: {roles, usuarios}}
 */
function saveRole(SqlExecutor $db, array $input): array
{
    $rol_id = isset($input['rol_id']) ? (int)$input['rol_id'] : 0;
    $rol = sTrim($input['rol'] ?? '');
    $descripcion = trim($input['descripcion'] ?? '');
    $usuarios = $input['usuarios'] ?? [];

    if ($rol === '') {
        return ['success' => false, 'error' => 'El campo rol es obligatorio', 'data' => null];
    }

    $currentUser = $_SESSION['nick'] ?? 'system';
    $sqlComment = __FUNCTION__;
    $sqlBuilder = new QueryBuilder();

    $db->begin();

    try {
        // Insert or update the role
        if ($rol_id > 0) {
            // Update existing role
            $update = $sqlBuilder->update(
                'rol',
                ['rol' => $rol, 'descripcion' => $descripcion],
                ['rol_id' => $rol_id],
                "/*$sqlComment*/"
            );
            $db->query($update['query'], $update['parameters']);
        } else {
            // Insert new role
            $insert = $sqlBuilder->insert(
                'rol',
                [
                    'rol' => $rol,
                    'descripcion' => $descripcion,
                    'registrado_por' => $currentUser
                ],
                comment: "/*$sqlComment*/"
            );
            $db->query($insert['query'], $insert['parameters']);
            $rol_id = (int)$db->last_insert_id();
        }

        // Sync user assignments for this role
        // Delete users not in the incoming list
        if (!empty($usuarios)) {
            $placeholders = implode(',', array_fill(0, count($usuarios), '?'));
            $params = array_merge([$rol_id], $usuarios);
            $db->query(
                "DELETE /*$sqlComment*/ FROM rol_usuario WHERE rol_id = ? AND usuario_id NOT IN ($placeholders)",
                $params
            );
        } else {
            // No users, delete all assignments for this role
            $db->query("DELETE /*$sqlComment*/ FROM rol_usuario WHERE rol_id = ?", [$rol_id]);
        }

        // Insert new user assignments (ignore duplicates)
        foreach ($usuarios as $usuario_id) {
            $usuario_id = (int)$usuario_id;
            if ($usuario_id <= 0) continue;

            $db->query(
                "INSERT /*$sqlComment*/ IGNORE INTO rol_usuario (rol_id, usuario_id, registrado_por) VALUES (?, ?, ?)",
                [$rol_id, $usuario_id, $currentUser]
            );
        }

        $db->commit();

        // Return updated list
        return listRoles($db);

    } catch (Throwable $e) {
        $db->rollBack();
        
        if ($db->is_last_error_duplicate_key()) {
            return ['success' => false, 'error' => "Ya existe otro rol '$rol'", 'data' => null];
        }
        
        return ['success' => false, 'error' => $e->getMessage(), 'data' => null];
    }
}

/**
 * Delete a single role (user assignments cascade via FK or are deleted here)
 * Receives: {action, rol_id}
 * Returns: {success, error, data: null}
 */
function deleteRole(SqlExecutor $db, int $id): array
{
    if ($id <= 0) {
        return ['success' => false, 'error' => 'ID de rol inválido', 'data' => null];
    }

    $sqlComment = __FUNCTION__;

    // Delete user assignments first (in case no FK cascade)
    $db->query("DELETE /*$sqlComment*/ FROM rol_usuario WHERE rol_id = ?", [$id]);

    // Delete the role
    $db->query("DELETE /*$sqlComment*/ FROM rol WHERE rol_id = ?", [$id]);

    return ['success' => true, 'error' => null, 'data' => null];
}
