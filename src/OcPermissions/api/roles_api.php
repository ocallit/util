<?php
/**
 * roles_api.php
 * API for managing roles (rol) and their user assignments (rol_usuario)
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
 * Load complete state: roles, usuarios, rol_usuario
 * Returns: {success, error, data: {roles, usuarios, rol_usuario}}
 */
function loadState(SqlEr $db): array
{
    $roles = $db->query("
        SELECT rol_id, rol, descripcion, registrado_el, registrado_por
        FROM rol
        ORDER BY rol
    ") ?: [];

    $usuarios = $db->query("
        SELECT usuario_id, nick, nombre
        FROM usuario
        ORDER BY nick
    ") ?: [];

    $rol_usuario = $db->query("
        SELECT rol_id, usuario_id
        FROM rol_usuario
    ") ?: [];

    return [
        'success' => true,
        'error' => null,
        'data' => [
            'roles' => $roles,
            'usuarios' => $usuarios,
            'rol_usuario' => $rol_usuario
        ]
    ];
}

/**
 * Save complete state
 * Receives: {action, data: {roles, usuarios, rol_usuario}}
 * Returns: {success, error, data: state}
 */
function saveState(SqlEr $db, array $data): array
{
    $roles = $data['roles'] ?? [];
    $rol_usuario = $data['rol_usuario'] ?? [];

    $currentUser = $_SESSION['nick'] ?? 'system';

    $db->beginTransaction();

    try {
        // Get existing role IDs
        $existingRoles = $db->query("SELECT rol_id FROM rol") ?: [];
        $existingIds = array_map('intval', array_column($existingRoles, 'rol_id'));
        $incomingIds = array_filter(array_map('intval', array_column($roles, 'rol_id')));

        // Delete only roles that were actually removed
        $toDelete = array_diff($existingIds, $incomingIds);
        foreach ($toDelete as $delId) {
            $db->execute("DELETE FROM rol WHERE rol_id = ?", [$delId]);
        }

        // Upsert roles
        foreach ($roles as $r) {
            $rol_id = (int)($r['rol_id'] ?? 0);

            if ($rol_id > 0 && in_array($rol_id, $existingIds, true)) {
                // Update existing
                $db->update('rol', [
                    'rol' => $r['rol'] ?? '',
                    'descripcion' => $r['descripcion'] ?? ''
                ], 'rol_id = ?', [$rol_id]);
            } elseif ($rol_id > 0) {
                // Insert new with specific ID
                $db->insert('rol', [
                    'rol_id' => $rol_id,
                    'rol' => $r['rol'] ?? '',
                    'descripcion' => $r['descripcion'] ?? '',
                    'registrado_el' => $r['registrado_el'] ?? date('Y-m-d H:i:s'),
                    'registrado_por' => $r['registrado_por'] ?? $currentUser
                ]);
            }
        }

        // Sync rol_usuario: compare existing vs incoming, add/remove differences only
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
