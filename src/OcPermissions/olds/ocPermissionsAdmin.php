<?php
// File: ocPermissionsAdmin.php
// Path: /inc/ocPermissionsAdmin.php
// Version: 3.0.0 - Admin Manager (No Cache)

/**
 * ADMIN PERMISSIONS MANAGER
 * 
 * For managing permissions in admin interface
 * NO CACHE - always fresh data
 * 
 * Separate from runtime checker to avoid cache complexity
 */
class ocPermissionsAdmin {
    
    protected $sqlExecutor;
    protected $currentUserNick;
    
    public function __construct($sqlExecutor, string $currentUserNick = 'system') {
        $this->sqlExecutor = $sqlExecutor;
        $this->currentUserNick = $currentUserNick;
    }
    
    /**
     * Grant permission to user
     * 
     * @param int $userId User ID
     * @param int $activityId Activity ID (use constants)
     * @param string $permission Permission to grant
     * @return bool Success
     */
    public function grantUser(int $userId, int $activityId, string $permission): bool {
        try {
            $this->sqlExecutor->query(
                "INSERT INTO oc_user_permissions (user_id, oc_activity_id, permission, granted_by)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE granted_at = NOW(), granted_by = VALUES(granted_by)",
                [$userId, $activityId, $permission, $this->currentUserNick]
            );
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Revoke permission from user
     * 
     * @param int $userId User ID
     * @param int $activityId Activity ID
     * @param string $permission Permission to revoke
     * @return bool Success
     */
    public function revokeUser(int $userId, int $activityId, string $permission): bool {
        try {
            $this->sqlExecutor->query(
                "DELETE FROM oc_user_permissions 
                 WHERE user_id = ? AND oc_activity_id = ? AND permission = ?",
                [$userId, $activityId, $permission]
            );
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Grant permission to role
     * 
     * @param int $roleId Role ID
     * @param int $activityId Activity ID
     * @param string $permission Permission to grant
     * @return bool Success
     */
    public function grantRole(int $roleId, int $activityId, string $permission): bool {
        try {
            $this->sqlExecutor->query(
                "INSERT INTO oc_role_permissions (oc_role_id, oc_activity_id, permission, granted_by)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE granted_at = NOW(), granted_by = VALUES(granted_by)",
                [$roleId, $activityId, $permission, $this->currentUserNick]
            );
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Revoke permission from role
     * 
     * @param int $roleId Role ID
     * @param int $activityId Activity ID
     * @param string $permission Permission to revoke
     * @return bool Success
     */
    public function revokeRole(int $roleId, int $activityId, string $permission): bool {
        try {
            $this->sqlExecutor->query(
                "DELETE FROM oc_role_permissions 
                 WHERE oc_role_id = ? AND oc_activity_id = ? AND permission = ?",
                [$roleId, $activityId, $permission]
            );
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Get all permissions for user on activity (NO CACHE - fresh data)
     * 
     * @param int $userId User ID
     * @param int $activityId Activity ID
     * @return array ['actual' => [...], 'from_roles' => [...], 'has_override' => bool]
     */
    public function getDetail(int $userId, int $activityId): array {
        // Check user-specific permissions
        $userPerms = $this->sqlExecutor->array(
            "SELECT permission FROM oc_user_permissions 
             WHERE user_id = ? AND oc_activity_id = ?",
            [$userId, $activityId]
        );
        
        $hasOverride = !empty($userPerms);
        
        // Get role permissions (regardless of override)
        $rolePerms = $this->sqlExecutor->array(
            "SELECT DISTINCT rp.permission 
             FROM oc_role_permissions rp
             INNER JOIN oc_user_roles ur ON ur.oc_role_id = rp.oc_role_id
             WHERE ur.user_id = ? AND rp.oc_activity_id = ?",
            [$userId, $activityId]
        );
        
        // Actual permissions
        $actual = $hasOverride 
            ? array_column($userPerms, 'permission')
            : array_column($rolePerms, 'permission');
        
        return [
            'actual' => $actual,
            'from_roles' => array_column($rolePerms, 'permission'),
            'has_override' => $hasOverride
        ];
    }
    
    /**
     * Clear all user overrides for an activity
     * 
     * @param int $userId User ID
     * @param int $activityId Activity ID
     * @return bool Success
     */
    public function clearUserOverrides(int $userId, int $activityId): bool {
        try {
            $this->sqlExecutor->query(
                "DELETE FROM oc_user_permissions 
                 WHERE user_id = ? AND oc_activity_id = ?",
                [$userId, $activityId]
            );
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Assign user to role
     * 
     * @param int $userId User ID
     * @param int $roleId Role ID
     * @return bool Success
     */
    public function assignRole(int $userId, int $roleId): bool {
        try {
            $this->sqlExecutor->query(
                "INSERT INTO oc_user_roles (user_id, oc_role_id, granted_by)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE granted_at = NOW(), granted_by = VALUES(granted_by)",
                [$userId, $roleId, $this->currentUserNick]
            );
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Remove user from role
     * 
     * @param int $userId User ID
     * @param int $roleId Role ID
     * @return bool Success
     */
    public function removeRole(int $userId, int $roleId): bool {
        try {
            $this->sqlExecutor->query(
                "DELETE FROM oc_user_roles WHERE user_id = ? AND oc_role_id = ?",
                [$userId, $roleId]
            );
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
}
