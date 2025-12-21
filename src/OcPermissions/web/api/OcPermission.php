<?php
/**
 * OcPermission.php
 * Permission checking and listing for Users, Roles, Activities system
 *
 * Location: inc/OcPermission.php
 *
 * Usage:
 *   $perm = new OcPermission($db);
 *   if ($perm->puede('ventas', 'editar')) { ... }
 */

declare(strict_types=1);

namespace Ocallit\Permisos;

use Ocallit\SqlEr\SqlEr;

class OcPermission
{
    private SqlEr $db;

    public function __construct(SqlEr $db)
    {
        $this->db = $db;
    }

    /**
     * Get user ID - from param or session
     */
    private function uid(int $user_id): int
    {
        return $user_id > 0 ? $user_id : (int)($_SESSION['usuario_id'] ?? -1);
    }

    // =========================================================================
    // USER PERMISSION METHODS
    // =========================================================================

    /**
     * Can user perform permission on activity?
     */
    public function puede(string $actividad, string $permiso, int $user_id = -1): bool
    {
        $user_id = $this->uid($user_id);
        if ($user_id <= 0) return false;

        return (int)$this->db->queryValue("
            SELECT EXISTS(
                SELECT 1
                FROM rol_usuario ru
                JOIN rol_actividad_permiso rap ON ru.rol_id = rap.rol_id
                JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
                JOIN actividad a ON ap.actividad_id = a.actividad_id
                WHERE ru.usuario_id = ? AND a.actividad = ? AND ap.permiso = ?
            )
        ", [$user_id, $actividad, $permiso]) === 1;
    }

    /**
     * User's permissions on activity
     * @return array<int, string> [actividad_permiso_id => permiso]
     */
    public function permiso(string $actividad, int $user_id = -1): array
    {
        $user_id = $this->uid($user_id);
        if ($user_id <= 0) return [];

        $rows = $this->db->query("
            SELECT DISTINCT ap.actividad_permiso_id, ap.permiso
            FROM rol_usuario ru
            JOIN rol_actividad_permiso rap ON ru.rol_id = rap.rol_id
            JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
            JOIN actividad a ON ap.actividad_id = a.actividad_id
            WHERE ru.usuario_id = ? AND a.actividad = ?
            ORDER BY ap.permiso
        ", [$user_id, $actividad]) ?: [];

        return array_column($rows, 'permiso', 'actividad_permiso_id');
    }

    /**
     * Roles granting user a specific permission
     * @return array<int, string> [rol_id => rol]
     */
    public function puede_por_rol(string $actividad, string $permiso, int $user_id = -1): array
    {
        $user_id = $this->uid($user_id);
        if ($user_id <= 0) return [];

        $rows = $this->db->query("
            SELECT DISTINCT r.rol_id, r.rol
            FROM rol_usuario ru
            JOIN rol r ON ru.rol_id = r.rol_id
            JOIN rol_actividad_permiso rap ON r.rol_id = rap.rol_id
            JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
            JOIN actividad a ON ap.actividad_id = a.actividad_id
            WHERE ru.usuario_id = ? AND a.actividad = ? AND ap.permiso = ?
            ORDER BY r.rol
        ", [$user_id, $actividad, $permiso]) ?: [];

        return array_column($rows, 'rol', 'rol_id');
    }

    /**
     * User's roles with their permissions on activity
     * @return array<int, array> [rol_id => ['rol' => name, 'permisos' => [...]]]
     */
    public function permiso_por_rol(string $actividad, int $user_id = -1): array
    {
        $user_id = $this->uid($user_id);
        if ($user_id <= 0) return [];

        $rows = $this->db->query("
            SELECT r.rol_id, r.rol, ap.permiso
            FROM rol_usuario ru
            JOIN rol r ON ru.rol_id = r.rol_id
            JOIN rol_actividad_permiso rap ON r.rol_id = rap.rol_id
            JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
            JOIN actividad a ON ap.actividad_id = a.actividad_id
            WHERE ru.usuario_id = ? AND a.actividad = ?
            ORDER BY r.rol, ap.permiso
        ", [$user_id, $actividad]) ?: [];

        $result = [];
        foreach ($rows as $row) {
            $id = (int)$row['rol_id'];
            if (!isset($result[$id])) {
                $result[$id] = ['rol' => $row['rol'], 'permisos' => []];
            }
            $result[$id]['permisos'][] = $row['permiso'];
        }
        return $result;
    }

    /**
     * Roles user belongs to
     * @return array<int, string> [rol_id => rol]
     */
    public function usuarioRoles(int $user_id = -1): array
    {
        $user_id = $this->uid($user_id);
        if ($user_id <= 0) return [];

        $rows = $this->db->query("
            SELECT r.rol_id, r.rol
            FROM rol_usuario ru
            JOIN rol r ON ru.rol_id = r.rol_id
            WHERE ru.usuario_id = ?
            ORDER BY r.rol
        ", [$user_id]) ?: [];

        return array_column($rows, 'rol', 'rol_id');
    }

    /**
     * Activities user has permissions on
     * @return array<string, array> [actividad => [permiso, ...]]
     */
    public function usuarioActividades(int $user_id = -1): array
    {
        $user_id = $this->uid($user_id);
        if ($user_id <= 0) return [];

        $rows = $this->db->query("
            SELECT DISTINCT a.actividad, ap.permiso
            FROM rol_usuario ru
            JOIN rol_actividad_permiso rap ON ru.rol_id = rap.rol_id
            JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
            JOIN actividad a ON ap.actividad_id = a.actividad_id
            WHERE ru.usuario_id = ?
            ORDER BY a.actividad, ap.permiso
        ", [$user_id]) ?: [];

        $result = [];
        foreach ($rows as $row) {
            $result[$row['actividad']][] = $row['permiso'];
        }
        return $result;
    }

    // =========================================================================
    // ROL -> ACTIVIDAD METHODS
    // =========================================================================

    /**
     * Activities a role has permissions on
     * @return array<string, array> [actividad => [permiso, ...]]
     */
    public function rolActividades(int $rol_id): array
    {
        $rows = $this->db->query("
            SELECT a.actividad, ap.permiso
            FROM rol_actividad_permiso rap
            JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
            JOIN actividad a ON ap.actividad_id = a.actividad_id
            WHERE rap.rol_id = ?
            ORDER BY a.actividad, ap.permiso
        ", [$rol_id]) ?: [];

        $result = [];
        foreach ($rows as $row) {
            $result[$row['actividad']][] = $row['permiso'];
        }
        return $result;
    }

    /**
     * Role's permissions on specific activity
     * @return array<int, string> [actividad_permiso_id => permiso]
     */
    public function rolPermisos(int $rol_id, string $actividad): array
    {
        $rows = $this->db->query("
            SELECT ap.actividad_permiso_id, ap.permiso
            FROM rol_actividad_permiso rap
            JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
            JOIN actividad a ON ap.actividad_id = a.actividad_id
            WHERE rap.rol_id = ? AND a.actividad = ?
            ORDER BY ap.permiso
        ", [$rol_id, $actividad]) ?: [];

        return array_column($rows, 'permiso', 'actividad_permiso_id');
    }

    /**
     * Can role perform permission on activity?
     */
    public function rolPuede(int $rol_id, string $actividad, string $permiso): bool
    {
        return (int)$this->db->queryValue("
            SELECT EXISTS(
                SELECT 1
                FROM rol_actividad_permiso rap
                JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
                JOIN actividad a ON ap.actividad_id = a.actividad_id
                WHERE rap.rol_id = ? AND a.actividad = ? AND ap.permiso = ?
            )
        ", [$rol_id, $actividad, $permiso]) === 1;
    }

    /**
     * Users in a role
     * @return array<int, string> [usuario_id => nick]
     */
    public function rolUsuarios(int $rol_id): array
    {
        $rows = $this->db->query("
            SELECT u.usuario_id, u.nick
            FROM rol_usuario ru
            JOIN usuario u ON ru.usuario_id = u.usuario_id
            WHERE ru.rol_id = ?
            ORDER BY u.nick
        ", [$rol_id]) ?: [];

        return array_column($rows, 'nick', 'usuario_id');
    }

    // =========================================================================
    // ACTIVIDAD -> ROL METHODS
    // =========================================================================

    /**
     * Roles with permissions on activity
     * @return array<int, array> [rol_id => ['rol' => name, 'permisos' => [...]]]
     */
    public function actividadRoles(string $actividad): array
    {
        $rows = $this->db->query("
            SELECT r.rol_id, r.rol, ap.permiso
            FROM rol_actividad_permiso rap
            JOIN rol r ON rap.rol_id = r.rol_id
            JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
            JOIN actividad a ON ap.actividad_id = a.actividad_id
            WHERE a.actividad = ?
            ORDER BY r.rol, ap.permiso
        ", [$actividad]) ?: [];

        $result = [];
        foreach ($rows as $row) {
            $id = (int)$row['rol_id'];
            if (!isset($result[$id])) {
                $result[$id] = ['rol' => $row['rol'], 'permisos' => []];
            }
            $result[$id]['permisos'][] = $row['permiso'];
        }
        return $result;
    }

    /**
     * All permissions defined for activity
     * @return array<int, array> [actividad_permiso_id => ['permiso' => code, 'etiqueta' => label]]
     */
    public function actividadPermisos(string $actividad): array
    {
        $rows = $this->db->query("
            SELECT ap.actividad_permiso_id, ap.permiso, ap.etiqueta
            FROM actividad_permiso ap
            JOIN actividad a ON ap.actividad_id = a.actividad_id
            WHERE a.actividad = ?
            ORDER BY ap.permiso
        ", [$actividad]) ?: [];

        $result = [];
        foreach ($rows as $row) {
            $result[(int)$row['actividad_permiso_id']] = [
                'permiso' => $row['permiso'],
                'etiqueta' => $row['etiqueta']
            ];
        }
        return $result;
    }

    /**
     * Users with permissions on activity
     * @return array<int, array> [usuario_id => ['nick' => ..., 'permisos' => [...]]]
     */
    public function actividadUsuarios(string $actividad): array
    {
        $rows = $this->db->query("
            SELECT DISTINCT u.usuario_id, u.nick, ap.permiso
            FROM rol_usuario ru
            JOIN usuario u ON ru.usuario_id = u.usuario_id
            JOIN rol_actividad_permiso rap ON ru.rol_id = rap.rol_id
            JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
            JOIN actividad a ON ap.actividad_id = a.actividad_id
            WHERE a.actividad = ?
            ORDER BY u.nick, ap.permiso
        ", [$actividad]) ?: [];

        $result = [];
        foreach ($rows as $row) {
            $id = (int)$row['usuario_id'];
            if (!isset($result[$id])) {
                $result[$id] = ['nick' => $row['nick'], 'permisos' => []];
            }
            if (!in_array($row['permiso'], $result[$id]['permisos'], true)) {
                $result[$id]['permisos'][] = $row['permiso'];
            }
        }
        return $result;
    }
}
