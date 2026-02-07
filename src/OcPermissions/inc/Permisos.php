<?php
/** @noinspection PhpUnused */

/** @noinspection PhpRedundantOptionalArgumentInspection */

namespace ocallit\Util\OcPermissions;

class Permisos {
    protected SqlExecutor $sqlExecutor;

    public function has(string $actividad, string $permiso, string &$rolGrants = "", int|string $userId = ""):bool {
        $method = __METHOD__;
        $rolGrants = $this->sqlExecutor->singleValue("
        SELECT /*$method*/ r.rol
        FROM rol_usuario ru
            JOIN rol_actividad_permiso rap  USING(rol_id)
            JOIN rol r USING(rol_id)    
            JOIN actividad_permiso ap USING(actividad_permiso_id)
            JOIN actividad a USING(actividad_id)
        WHERE  a.actividad = ? AND ap.permiso = ? AND ru.usuario_id = ?
        LIMIT 1",[$actividad, $permiso, $userId]);
        return !empty($rolGrants);
    }

    public function hasThrows(string $actividad, string $permiso, string &$rolGrants = "", int|string $userId = ""):void {
        if (!$this->has($actividad, $permiso, $rolGrants, $userId)) {
            throw new Exception("Permiso denegado: no tiene '$permiso' en '$actividad'.");
        }
    }

    /**
     * @param string $actividad
     * @param int|string $userId
     * @return array [ // values are role_id
     *      'P' => ['RO'=>12, 'AUTHORIZE'=>9],
     *      'F' => ['cost'=>['NONE'=>9,'INSERT'=>11]]
     *      ]
     */
    public function permissions(string $actividad, int|string $userId = ""):array {
        return [];
    }

    public function permissionsForField(string $actividad, string $campo, bool $explain = false, int|string $userId = ""):array {
        return $this->permissions($actividad, $campo, $explain, $userId)[$campo] ?? [];
    }

    /**
     * @param int|string $userId
     * @return array<int, array{rol_id: int, rol: string, descripcion: string}> indexed by rol_id, sorted by rol anme
     */
    public function getRoles(int|string $userId = ""):array {
        $method = __METHOD__;
        return $this->sqlExecutor->arrayKeyed(
          "SELECT /*$method*/ r.rol_id, r.rol, r.descripcion
                FROM rol r
                JOIN rol_usuario ru ON r.rol_id = ru.rol_id
                WHERE ru.usuario_id = ?
                ORDER BY r.rol", "rol_id",
         [$this->getUserId($userId)]
        );
    }

    public function permissionsAvailable(string $actividad):array {
        $method = __METHOD__;
        return $this->sqlExecutor->keyValue("
            SELECT /*$method*/ ap.permiso, ap.etiqueta
            FROM actividad a
            JOIN actividad_permiso ap ON a.actividad_id = ap.actividad_id
            WHERE a.actividad = ?        
            ORDER BY ap.etiqueta", [$actividad]);
    }

    // region: Utils

    protected function ta(string $permiso):array {
        switch(strtoupper($permiso)) {
            case 'INSERT':
            case 'UPDATE':
            case 'DELETE':
                return [$permiso, "RW"];
            case 'READ':
            case 'LIST':
                return [$permiso, "RO"];
            default:
                return [$permiso];
        }
    }

    protected function getUserId(int|string $userId):int|string {
        return $userId;
    }

    // endregion: Utils
}