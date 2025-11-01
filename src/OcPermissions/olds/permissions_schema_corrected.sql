-- File: permissions_schema.sql
-- Version: 2.2.0

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================
CREATE TABLE oc_activities (
    oc_activity_id MEDIUMINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    activity_name VARCHAR(100) NOT NULL,
    activity_description TEXT,
    available_permissions JSON DEFAULT NULL COMMENT '[{permission_key:label}, ...]',
    created_at DATETIME NOT NULL DEFAULT NOW(),
    created_by VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

-- ============================================================================
-- ROLES TABLE 
-- ============================================================================
CREATE TABLE oc_roles (
    oc_role_id MEDIUMINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    role_description TEXT,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    created_by VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

-- ============================================================================
-- ROLE PERMISSIONS
-- ============================================================================
CREATE TABLE oc_role_permissions (
    oc_role_id MEDIUMINT UNSIGNED NOT NULL,
    oc_activity_id MEDIUMINT UNSIGNED NOT NULL,
    permission VARCHAR(50) NOT NULL COMMENT '1 key in oc_activities.available_permissions',
    granted_at DATETIME NOT NULL DEFAULT NOW(),
    granted_by VARCHAR(16) NOT NULL DEFAULT 'system',
    PRIMARY KEY (oc_role_id, oc_activity_id, permission),
    FOREIGN KEY (oc_role_id) REFERENCES oc_roles(oc_role_id) ON DELETE CASCADE,
    FOREIGN KEY (oc_activity_id) REFERENCES oc_activities(oc_activity_id) ON DELETE CASCADE,
    INDEX idx_role_activity (oc_role_id, oc_activity_id)
) ENGINE=InnoDB;

-- ============================================================================
-- USER-ROLE MAPPING 
-- ============================================================================
CREATE TABLE oc_user_roles (
    user_id MEDIUMINT UNSIGNED NOT NULL,
    oc_role_id MEDIUMINT UNSIGNED NOT NULL,
    granted_at DATETIME NOT NULL DEFAULT NOW(),
    granted_by VARCHAR(16) NOT NULL DEFAULT 'system',
    PRIMARY KEY (user_id, oc_role_id),
    FOREIGN KEY (oc_role_id) REFERENCES oc_roles(oc_role_id) ON DELETE CASCADE
    -- Note: user_id FK would reference oc_users table if it exists
) ENGINE=InnoDB;



-- ============================================================================
-- USER PERMISSIONS (overrides role permissions!)
-- WARNING: When a user has ANY direct permissions for an activity,
--          ALL role permissions for that activity are IGNORED
-- ============================================================================
CREATE TABLE oc_user_permissions (
    user_id MEDIUMINT UNSIGNED NOT NULL,
    oc_activity_id MEDIUMINT UNSIGNED NOT NULL,
    permission VARCHAR(50) NOT NULL,
    granted_at DATETIME NOT NULL DEFAULT NOW(),
    granted_by VARCHAR(16) NOT NULL DEFAULT 'system',
    PRIMARY KEY (user_id, oc_activity_id, permission),
    FOREIGN KEY (oc_activity_id) REFERENCES oc_activities(oc_activity_id) ON DELETE CASCADE,
    INDEX idx_user_activity (user_id, oc_activity_id)
) ENGINE=InnoDB;

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Create roles
INSERT INTO oc_roles (role_name, role_description, created_by) VALUES
('Admin', 'System administrators with full access', 'system'),
('Manager', 'Department managers with edit access', 'system'),
('User', 'Regular users with read-only access', 'system');

-- Create activities
INSERT INTO oc_activities (activity_code, activity_name, available_permissions, created_by) VALUES
('products', 'Product Management', NULL, 'system'), -- Simple mode
('orders', 'Order Management', '["add","edit","delete","list","export"]', 'system'), -- Granular
('reports', 'Reports', '["read","export"]', 'system');

-- Grant role permissions
-- Admin role gets edit (which implies read)
INSERT INTO oc_role_permissions (oc_role_id, oc_activity_id, permission, granted_by) VALUES
(1, 1, 'edit', 'admin'),
(1, 2, 'add', 'admin'),
(1, 2, 'edit', 'admin'),
(1, 2, 'delete', 'admin'),
(1, 2, 'list', 'admin'),
(1, 2, 'export', 'admin');

-- Manager role gets edit on products
INSERT INTO oc_role_permissions (oc_role_id, oc_activity_id, permission, granted_by) VALUES
(2, 1, 'edit', 'admin'),
(2, 2, 'list', 'admin'),
(2, 2, 'add', 'admin');

-- User role gets read only
INSERT INTO oc_role_permissions (oc_role_id, oc_activity_id, permission, granted_by) VALUES
(3, 1, 'read', 'admin'),
(3, 2, 'list', 'admin');

-- Assign users to roles
INSERT INTO oc_user_roles (user_id, oc_role_id, granted_by) VALUES
(1, 1, 'system'),    -- User 1 is Admin
(2, 2, 'system'),    -- User 2 is Manager
(3, 3, 'system'),    -- User 3 is regular User
(4, 2, 'admin'),     -- User 4 is Manager
(4, 3, 'admin');     -- User 4 is also User (MULTIPLE ROLES = UNION)

-- Example of user override (confusing scenario!)
-- User 4 is in Manager role (which has 'edit' on products)
-- But we give them ONLY 'read' as direct permission
-- Result: User 4 will ONLY have 'read', NOT 'edit' (role is ignored!)
INSERT INTO oc_user_permissions (user_id, oc_activity_id, permission, granted_by) VALUES
(4, 1, 'read', 'admin');
-- ^^^ This OVERRIDES the role! User 4 now has ONLY 'read' on products

-- ============================================================================
-- EXPLANATION OF THE CONFUSING SCENARIO
-- ============================================================================

/*
SCENARIO: User has role with MORE permissions, but direct permission RESTRICTS them

User 4:
  - In "Manager" role → products: edit (implies read)
  - Direct permission → products: read (ONLY)
  
Result: User 4 has ONLY 'read' on products
  
Why? Because user permissions COMPLETELY OVERRIDE roles.
When user has ANY direct permission for an activity, roles are IGNORED.

How to make this clear in UI:
1. Show a warning icon when user has overrides
2. Display: "⚠️ Direct permissions active - roles ignored"
3. Show both:
   - "From roles: [edit, add, list]"  ← greyed out
   - "Direct permissions: [read]"     ← highlighted
4. Require confirmation when adding user permission that restricts access

Alternative approach (if too confusing):
- Don't allow user permissions that are LESS than role permissions
- Only allow user permissions to ADD more permissions
- But this loses flexibility...
*/

-- ============================================================================
-- USEFUL QUERIES
-- ============================================================================

-- See what permissions a user SHOULD have from roles
SELECT DISTINCT rp.permission
FROM oc_role_permissions rp
INNER JOIN oc_user_roles ur ON ur.oc_role_id = rp.oc_role_id
WHERE ur.user_id = 4 AND rp.oc_activity_id = 1;
-- Result for user 4: 'edit', 'read'

-- See what permissions user ACTUALLY has (including overrides)
SELECT permission FROM oc_user_permissions 
WHERE user_id = 4 AND oc_activity_id = 1;
-- Result for user 4: 'read' (only)

-- Check if user has overrides for an activity
SELECT EXISTS(
    SELECT 1 FROM oc_user_permissions 
    WHERE user_id = 4 AND oc_activity_id = 1
) as has_override;
-- Result: 1 (true) - user has override

-- Compare role permissions vs actual permissions (for admin UI)
SELECT 
    a.activity_name,
    GROUP_CONCAT(DISTINCT rp.permission ORDER BY rp.permission) as from_roles,
    GROUP_CONCAT(DISTINCT up.permission ORDER BY up.permission) as direct_permissions,
    CASE 
        WHEN up.user_id IS NOT NULL THEN 'OVERRIDE ACTIVE'
        ELSE 'Using roles'
    END as status
FROM oc_activities a
LEFT JOIN oc_role_permissions rp ON rp.oc_activity_id = a.oc_activity_id
LEFT JOIN oc_user_roles ur ON ur.oc_role_id = rp.oc_role_id AND ur.user_id = 4
LEFT JOIN oc_user_permissions up ON up.oc_activity_id = a.oc_activity_id AND up.user_id = 4
WHERE a.oc_activity_id = 1
GROUP BY a.oc_activity_id, a.activity_name, up.user_id;
