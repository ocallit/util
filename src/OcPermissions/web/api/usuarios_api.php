<?php
/**
 * usuarios_api.php
 * API for managing users (usuario) and their role assignments (rol_usuario)
 *
 * Actions: list, save, delete
 *
 * usuarios_api.php - Actions:
 * ActionReceivesReturnslist{action: 'list'}{success, data: {usuarios: [...], roles: [...]}}save{action: 'save', usuario_id?, nick, nombre, email, cel, estatus, password_caducidad_dias, password_forza_cambio, nota, password?, roles: [id,...]}{success, data: {usuarios, roles}}delete{action: 'delete', usuario_id}{success, error, data: null}
 *
 */

declare(strict_types=1);
use Ocallit\Sqler\SqlExecutor;
use Ocallit\Sqler\QueryBuilder;
use ocallit\Util\Pwder;

require_once __DIR__ . '/../inc/config.php';
require_once __DIR__ . '/../../inc/Pwder.php';
global $SqlExecutor;


header('Content-Type: application/json; charset=utf-8');

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'list':
            echo json_encode(listUsuarios($SqlExecutor));
            break;

        case 'save':
            echo json_encode(saveUsuario($SqlExecutor, $input));
            break;

        case 'delete':
            $id = (int)($input['usuario_id'] ?? 0);
            echo json_encode(deleteUsuario($SqlExecutor, $id));
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
 * List all users with their assigned roles, plus all available roles
 * Returns: {success, error, data: {usuarios: [{usuario_id, nick, nombre, ..., roles: [...]}], roles: [...]}}
 */
function listUsuarios(SqlExecutor $db): array
{
    $sqlComment = __FUNCTION__;

    // Get all users
    $usuarios = $db->array("
        SELECT /*$sqlComment*/
            usuario_id, nick, nombre, email, cel, estatus, nota,
            password_forza_cambio, password_caducidad_dias, password_ultimo_cambio,
            ultimo_login, creado_el, creado_por, ultimo_cambio_el, ultimo_cambio_por
        FROM usuario
        ORDER BY nick
    ");

    // Get all role assignments with role details
    $assignments = $db->array("
        SELECT /*$sqlComment*/
            ru.usuario_id, ru.rol_id, r.rol
        FROM rol_usuario ru
        INNER JOIN rol r ON ru.rol_id = r.rol_id
        ORDER BY ru.usuario_id, r.rol
    ");

    // Group assignments by usuario_id
    $rolesByUsuario = [];
    foreach ($assignments as $row) {
        $usuarioId = $row['usuario_id'];
        if (!isset($rolesByUsuario[$usuarioId])) {
            $rolesByUsuario[$usuarioId] = [];
        }
        $rolesByUsuario[$usuarioId][] = [
          'rol_id' => (int)$row['rol_id'],
          'rol' => $row['rol']
        ];
    }

    // Attach roles array to each user
    foreach ($usuarios as &$usuario) {
        $usuarioId = $usuario['usuario_id'];
        $usuario['roles'] = $rolesByUsuario[$usuarioId] ?? [];
    }

    // Get all available roles (for the dropdown)
    $roles = $db->array("
        SELECT /*$sqlComment*/
            rol_id, rol
        FROM rol
        ORDER BY rol
    ");

    return [
      'success' => true,
      'error' => null,
      'data' => [
        'usuarios' => $usuarios,
        'roles' => $roles
      ]
    ];
}

/**
 * Save (create or update) a single user with their role assignments
 * Receives: {action, usuario_id?, nick, nombre, email, cel, estatus, password_caducidad_dias, password_forza_cambio, nota, password?, roles: [rol_id, ...]}
 * Returns: {success, error, data: {usuarios, roles}}
 */
function saveUsuario(SqlExecutor $db, array $input): array
{
    $usuario_id = isset($input['usuario_id']) ? $input['usuario_id'] : 0;
    $nick = sTrim($input['nick'] ?? '');
    $nombre = sTrim($input['nombre'] ?? '');
    $email = sTrim($input['email'] ?? '');
    $cel = sTrim($input['cel'] ?? '');
    $estatus = sTrim($input['estatus'] ?? 'Puede Login');
    $nota = trim($input['nota'] ?? '');
    $password_forza_cambio = trim($input['password_forza_cambio'] ?? 'No');
    $password_caducidad_dias = (int)($input['password_caducidad_dias'] ?? 90);
    $password = trim($input['password'] ?? '');
    $roles = $input['roles'] ?? [];

    if ($nick === '' || $nombre === '') {
        return ['success' => false, 'error' => 'Nick y Nombre son requeridos', 'data' => null];
    }
    $pwder = new Pwder($db, 'usuario', 'usuario_id', 'password');
    $currentUser = $_SESSION['nick'] ?? 'system';
    $sqlComment = __FUNCTION__;
    $sqlBuilder = new QueryBuilder();
$respond = ["begin"];
    $db->begin();
$respond[] = "begin done";
    try {
        // Insert or update the user
        if (!empty($usuario_id)) {
            // Update existing user
            $updateData = [
                'nick' => $nick,
                'nombre' => $nombre,
                'email' => $email,
                'cel' => $cel,
                'estatus' => $estatus,
                'nota' => $nota,
                'password_forza_cambio' => $password_forza_cambio,
                'password_caducidad_dias' => $password_caducidad_dias,
                'ultimo_cambio_el' => 'NOW()',
                'ultimo_cambio_por' => $currentUser
            ];
            if ($password !== '') {
                $updateData['password_ultimo_cambio'] = 'NOW()';
            }
            $update = $sqlBuilder->update(
                'usuario',
                $updateData,
                ['usuario_id' => $usuario_id],
                "/*$sqlComment*/"
            );
            $respond[] = $update;
            $db->query($update['query'], $update['parameters']);
            if ($password !== '') {
                $pwder->update((string)$usuario_id, $password);
            }
        } else {
            // Insert new user
            if ($password === '') {
                return ['success' => false, 'error' => 'Password es requerido para nuevos usuarios', 'data' => null];
            }

            $insert = $sqlBuilder->insert(
                'usuario',
                [
                    'nick' => $nick,
                    'nombre' => $nombre,
                    'email' => $email,
                    'cel' => $cel,
                    'estatus' => $estatus,
                    'nota' => $nota,
                    'password' => 'x',
                    'password_forza_cambio' => $password_forza_cambio,
                    'password_caducidad_dias' => $password_caducidad_dias,
                    'password_ultimo_cambio' => 'NOW()',
                    'creado_por' => $currentUser,
                    'ultimo_cambio_por' => $currentUser
                ],
               // comment: "/*$sqlComment*/"
            );
            $respond[] = $insert;
            $db->query($insert['query'], $insert['parameters']);
            $usuario_id = $db->last_insert_id();
            $pwder->update((string)$usuario_id, $password);
        }

        // Sync role assignments for this user
        // Delete roles not in the incoming list
        if (!empty($roles)) {
            $placeholders = implode(',', array_fill(0, count($roles), '?'));
            $params = array_merge([$usuario_id], $roles);
            $respond[] = $params;
            $respond[] = "DELETE /*$sqlComment*/ FROM rol_usuario WHERE usuario_id = ? AND rol_id NOT IN ($placeholders)";

            $db->query(
                "DELETE /*$sqlComment*/ FROM rol_usuario WHERE usuario_id = ? AND rol_id NOT IN ($placeholders)",
                $params
            );
        } else {
            // No roles, delete all assignments for this user
            $respond[] = "DELETE /*$sqlComment*/ FROM rol_usuario WHERE usuario_id = ?";
            $db->query("DELETE /*$sqlComment*/ FROM rol_usuario WHERE usuario_id = ?", [$usuario_id]);
        }

        // Insert new role assignments that don't already exist
        foreach ($roles as $rol_id) {
            $rol_id = (int)$rol_id;
            if ($rol_id <= 0) continue;

            // Check if assignment already exists
            $exists = $db->firstValue(
                "SELECT /*$sqlComment*/ COUNT(*) FROM rol_usuario WHERE rol_id = ? AND usuario_id = ?",
                [$rol_id, $usuario_id]
            );

            // Only insert if it doesn't exist
            if (!$exists) {
                $db->query(
                    "INSERT /*$sqlComment*/ INTO rol_usuario (rol_id, usuario_id, registrado_por) VALUES (?, ?, ?)",
                    [$rol_id, $usuario_id, $currentUser]
                );
            }
        }

        $db->commit();

        // Return updated list
        return listUsuarios($db);

    } catch (Throwable $e) {
        $db->rollBack();

        if ($db->is_last_error_duplicate_key()) {
            return ['success' => false, 'error' => "Ya existe otro usuario '$nick'", 'data' => null, 'respond' => $respond];
        }

        return ['success' => false, 'error' => $e->getMessage(), 'data' => null, 'errLine'=>$e->getLine(),"f" => $e->getFile(), 'respond' => $respond];
    }
}

/**
 * Delete a single user (role assignments cascade via FK or are deleted here)
 * Receives: {action, usuario_id}
 * Returns: {success, error, data: null}
 */
function deleteUsuario(SqlExecutor $db, int $id): array
{
    if ($id <= 0) {
        return ['success' => false, 'error' => 'ID de usuario inválido', 'data' => null];
    }

    $sqlComment = __FUNCTION__;

    // Delete role assignments first (in case no FK cascade)
    $db->query("DELETE /*$sqlComment*/ FROM rol_usuario WHERE usuario_id = ?", [$id]);

    // Delete the user
    $db->query("DELETE /*$sqlComment*/ FROM usuario WHERE usuario_id = ?", [$id]);

    return ['success' => true, 'error' => null, 'data' => null];
}
