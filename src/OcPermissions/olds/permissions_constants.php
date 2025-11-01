<?php
// File: permissions_constants.php
// Path: /inc/permissions_constants.php
// Version: 3.0.0 - Activity ID Constants

/**
 * ACTIVITY ID CONSTANTS
 * 
 * Define these based on your oc_activities table
 * Update after adding new activities
 */

// Option 1: Define constants
define('ACTIVITY_PRODUCTS', 1);
define('ACTIVITY_ORDERS', 2);
define('ACTIVITY_REPORTS', 3);
define('ACTIVITY_CUSTOMERS', 4);
define('ACTIVITY_ADMIN', 5);

// Option 2: Class constants (preferred - namespaced)
class Activities {
    const PRODUCTS = 1;
    const ORDERS = 2;
    const REPORTS = 3;
    const CUSTOMERS = 4;
    const ADMIN = 5;
}

// Option 3: Enum (PHP 8.1+)
/*
enum Activity: int {
    case PRODUCTS = 1;
    case ORDERS = 2;
    case REPORTS = 3;
    case CUSTOMERS = 4;
    case ADMIN = 5;
}
*/

/**
 * How to sync with database:
 * 
 * SELECT oc_activity_id, activity_name
 * FROM oc_activities 
 * ORDER BY oc_activity_id;
 * 
 * Then update constants above
 */
