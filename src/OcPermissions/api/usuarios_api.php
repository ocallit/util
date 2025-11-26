<?php
/**
 * usuarios_api.php
 * API for managing users (usuario) and their role assignments (rol_usuario)
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
 * Load complete state: usuarios, roles, rol_usuario
 * Returns: {success, error, data: {usuarios: [...], roles: [...], rol_usuario: [...]}}
 */
function loadState(SqlEr $db): array
{
    $usuarios = $db->query("
        SELECT usuario_id, nick, estatus, nota, nombre, email, cel,
               password_forza_cambio, password_caducidad_dias, password_ultimo_cambio,
               ultimo_login, creado_el, creado_por, ultimo_cambio_el, ultimo_cambio_por
        FROM usuario
        ORDER BY nick
    ") ?: [];

    $roles = $db->query("
        SELECT rol_id, rol
        FROM rol
        ORDER BY rol
    ") ?: [];

    $rol_usuario = $db->query("
        SELECT rol_id, usuario_id
        FROM rol_usuario
    ") ?: [];

    return [
        'success' => true,
        'error' => null,
        'data' => [
            'usuarios' => $usuarios,
            'roles' => $roles,
            'rol_usuario' => $rol_usuario
        ]
    ];
}

/**
 * Save complete state (bulk update)
 * Receives: {action, data: {usuarios: [...], roles: [...], rol_usuario: [...]}}
 * Returns: {success, error, data: state}
 */
function saveState(SqlEr $db, array $data): array
{
    $usuarios = $data['usuarios'] ?? [];
    $rol_usuario = $data['rol_usuario'] ?? [];

    $currentUser = $_SESSION['nick'] ?? 'system';
    $now = date('Y-m-d H:i:s');

    $db->beginTransaction();

    try {
        // Get existing user IDs
        $existingUsers = $db->query("SELECT usuario_id FROM usuario") ?: [];
        $existingIds = array_map('intval', array_column($existingUsers, 'usuario_id'));
        $incomingIds = array_filter(array_map('intval', array_column($usuarios, 'usuario_id')));

        // Delete only users that were actually removed
        $toDelete = array_diff($existingIds, $incomingIds);
        foreach ($toDelete as $delId) {
            $db->execute("DELETE FROM usuario WHERE usuario_id = ?", [$delId]);
        }

        // Upsert users
        foreach ($usuarios as $u) {
            $usuario_id = (int)($u['usuario_id'] ?? 0);

            if ($usuario_id > 0 && in_array($usuario_id, $existingIds, true)) {
                // Update existing - only update fields that JS sends
                $db->update('usuario', [
                    'nick' => $u['nick'] ?? '',
                    'nombre' => $u['nombre'] ?? '',
                    'email' => $u['email'] ?? '',
                    'cel' => $u['cel'] ?? '',
                    'estatus' => $u['estatus'] ?? 'Puede Login',
                    'nota' => $u['nota'] ?? '',
                    'password_forza_cambio' => $u['password_forza_cambio'] ?? 'No',
                    'password_caducidad_dias' => (int)($u['password_caducidad_dias'] ?? 90),
                    'ultimo_cambio_el' => $now,
                    'ultimo_cambio_por' => $currentUser
                ], 'usuario_id = ?', [$usuario_id]);
            } elseif ($usuario_id > 0) {
                // Insert new with specific ID
                $db->insert('usuario', [
                    'usuario_id' => $usuario_id,
                    'nick' => $u['nick'] ?? '',
                    'nombre' => $u['nombre'] ?? '',
                    'email' => $u['email'] ?? '',
                    'cel' => $u['cel'] ?? '',
                    'estatus' => $u['estatus'] ?? 'Puede Login',
                    'nota' => $u['nota'] ?? '',
                    'password_forza_cambio' => $u['password_forza_cambio'] ?? 'No',
                    'password_caducidad_dias' => (int)($u['password_caducidad_dias'] ?? 90),
                    'password_ultimo_cambio' => $u['password_ultimo_cambio'] ?? $now,
                    'ultimo_login' => $u['ultimo_login'] ?? null,
                    'creado_el' => $u['creado_el'] ?? $now,
                    'creado_por' => $u['creado_por'] ?? $currentUser,
                    'ultimo_cambio_el' => $now,
                    'ultimo_cambio_por' => $currentUser
                ]);
            }
        }

        // Sync rol_usuario: get existing, compare, add/remove differences
        $existingRU = $db->query("SELECT rol_id, usuario_id FROM rol_usuario") ?: [];
        $existingRUKeys = [];
        foreach ($existingRU as $ru) {
            $existingRUKeys[$ru['rol_id'] . '-' . $ru['usuario_id']] = true;
        }

        $incomingRUKeys = [];
        foreach ($rol_usuario as $ru) {
            $key = (int)$ru['rol_id'] . '-' . (int)$ru['usuario_id'];
            $incomingRUKeys[$key] = $ru;
        }

        // Delete removed assignments
        foreach ($existingRUKeys as $key => $v) {
            if (!isset($incomingRUKeys[$key])) {
                [$rolId, $usuarioId] = explode('-', $key);
                $db->execute("DELETE FROM rol_usuario WHERE rol_id = ? AND usuario_id = ?", [(int)$rolId, (int)$usuarioId]);
            }
        }

        // Insert new assignments
        foreach ($incomingRUKeys as $key => $ru) {
            if (!isset($existingRUKeys[$key])) {
                $db->insert('rol_usuario', [
                    'rol_id' => (int)$ru['rol_id'],
                    'usuario_id' => (int)$ru['usuario_id'],
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
