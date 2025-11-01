<?php
// File: ocPermissions.php
// Path: /inc/ocPermissions.php
// Version: 3.0.0 - Simplified Runtime Checker

/**
 * RUNTIME PERMISSIONS CHECKER
 * 
 * Fast, cached permission checking for application code
 * 
 * Rules:
 * - Missing = None
 * - No implications (each permission explicit)
 * - Multiple roles = UNION
 * - User override = REPLACE
 * - Cached for performance
 */
class ocPermissions {
    
    protected $sqlExecutor;
    protected $cache = [];
    
    public function __construct($sqlExecutor) {
        $this->sqlExecutor = $sqlExecutor;
    }
    
    /**
     * Check if user has permission(s)
     * 
     * ONE SOURCE OF TRUTH - Use this method only!
     * 
     * @param int $activityId Activity ID (use constants)
     * @param string|array $permission Permission(s) to check
     * @param int $userId User ID
     * @param string $operator 'OR' (at least one) or 'AND' (must have all)
     * @return bool
     * 
     * Examples:
     *   has(ACTIVITY_PRODUCTS, 'edit', 123) → true if user has 'edit'
     *   has(ACTIVITY_PRODUCTS, ['edit', 'delete'], 123) → true if has edit OR delete
     *   has(ACTIVITY_PRODUCTS, ['edit', 'delete'], 123, 'AND') → true if has edit AND delete
     */
    public function has(int $activityId, string|array $permission, int $userId, string $operator = 'OR'): bool {
        $userPerms = $this->getPermissions($activityId, $userId);
        
        // Single permission check
        if (is_string($permission)) {
            return in_array($permission, $userPerms);
        }
        
        // Array permission check
        if ($operator === 'AND') {
            // Must have ALL permissions
            foreach ($permission as $p) {
                if (!in_array($p, $userPerms)) {
                    return false;
                }
            }
            return true;
        } else {
            // OR - at least one permission (default)
            foreach ($permission as $p) {
                if (in_array($p, $userPerms)) {
                    return true;
                }
            }
            return false;
        }
    }
    
    /**
     * Get all permissions for user on activity (cached)
     * INTERNAL USE ONLY - not for application code
     * 
     * @param int $activityId
     * @param int $userId
     * @return array
     */
    protected function getPermissions(int $activityId, int $userId): array {
        $key = "{$activityId}:{$userId}";
        
        if (isset($this->cache[$key])) {
            return $this->cache[$key];
        }
        
        // Check user-specific permissions first
        $userPerms = $this->sqlExecutor->array(
            "SELECT permission FROM oc_user_permissions 
             WHERE user_id = ? AND oc_activity_id = ?",
            [$userId, $activityId]
        );
        
        // If user has explicit permissions, use ONLY those (ignore roles)
        if (!empty($userPerms)) {
            $perms = array_column($userPerms, 'permission');
            $this->cache[$key] = $perms;
            return $perms;
        }
        
        // Otherwise get UNION of all role permissions
        $rolePerms = $this->sqlExecutor->array(
            "SELECT DISTINCT rp.permission 
             FROM oc_role_permissions rp
             INNER JOIN oc_user_roles ur ON ur.oc_role_id = rp.oc_role_id
             WHERE ur.user_id = ? AND rp.oc_activity_id = ?",
            [$userId, $activityId]
        );
        
        $perms = array_column($rolePerms, 'permission');
        $this->cache[$key] = $perms;
        return $perms;
    }
}
