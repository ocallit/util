<?php
/**
 * BaseAPI - Base class for all API endpoints
 * Handles authentication, authorization, request parsing, and response formatting
 * 
 * PHP 8.4
 */

declare(strict_types=1);

namespace API;

use Ocallit\SqlEr\SqlExecutor;
use Ocallit\SqlEr\QueryBuilder;
use Exception;

abstract class BaseAPI {
    protected SqlExecutor $sql;
    protected QueryBuilder $qb;
    protected array $request;
    protected ?array $user = null;
    protected array $config;
    
    /**
     * Constructor
     * @param SqlExecutor $sql Database executor
     * @param array $config Configuration from config.php
     */
    public function __construct(SqlExecutor $sql, array $config) {
        $this->sql = $sql;
        $this->qb = new QueryBuilder();
        $this->config = $config;
        
        // Set JSON response headers
        header('Content-Type: application/json; charset=utf-8');
        
        // CORS headers if needed
        if (isset($config['cors']['enabled']) && $config['cors']['enabled']) {
            header('Access-Control-Allow-Origin: ' . ($config['cors']['origin'] ?? '*'));
            header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
            
            if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
                http_response_code(200);
                exit;
            }
        }
    }
    
    /**
     * Main entry point - handles the request
     */
    public function handle(): void {
        try {
            // Parse request
            $this->parseRequest();
            
            // Authenticate user
            $this->authenticate();
            
            // Check rate limiting
            $this->checkRateLimit();
            
            // Route to action
            $action = $this->request['action'] ?? '';
            $this->route($action);
            
        } catch (Exception $e) {
            $this->sendError($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Parse incoming request
     */
    protected function parseRequest(): void {
        $input = file_get_contents('php://input');
        $this->request = json_decode($input, true) ?? [];
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON in request body', 400);
        }
    }
    
    /**
     * Authenticate the user
     * Override this method to implement custom authentication
     */
    protected function authenticate(): void {
        // Check for token in Authorization header
        $headers = getallheaders();
        $token = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        
        // Remove "Bearer " prefix if present
        $token = preg_replace('/^Bearer\s+/', '', $token);
        
        if (empty($token)) {
            throw new Exception('Authentication token required', 401);
        }
        
        // Validate token and get user
        $this->user = $this->validateToken($token);
        
        if (!$this->user) {
            throw new Exception('Invalid or expired token', 401);
        }
    }
    
    /**
     * Validate authentication token
     * This should be implemented according to your auth system
     * 
     * @param string $token Authentication token
     * @return array|null User data or null if invalid
     */
    protected function validateToken(string $token): ?array {
        // Example implementation - replace with your actual token validation
        // This could check JWT, session tokens, API keys, etc.
        
        $user = $this->sql->row(
            "SELECT u.*, 
                    GROUP_CONCAT(DISTINCT r.rol_id) as rol_ids,
                    GROUP_CONCAT(DISTINCT r.rol) as roles
             FROM usuario u
             LEFT JOIN rol_usuario ru ON u.usuario_id = ru.usuario_id
             LEFT JOIN rol r ON ru.rol_id = r.rol_id
             WHERE u.auth_token = ? 
             AND u.estatus = 'Puede Login'
             AND (u.token_expiry IS NULL OR u.token_expiry > NOW())
             GROUP BY u.usuario_id",
            [$token]
        );
        
        if (empty($user)) {
            return null;
        }
        
        // Parse roles
        $user['rol_ids'] = !empty($user['rol_ids']) ? explode(',', $user['rol_ids']) : [];
        $user['roles'] = !empty($user['roles']) ? explode(',', $user['roles']) : [];
        
        return $user;
    }
    
    /**
     * Check if user has permission
     * 
     * @param string $permission Permission code (e.g., 'usuarios.editar')
     * @return bool
     */
    protected function hasPermission(string $permission): bool {
        if (empty($this->user)) {
            return false;
        }
        
        // Check if user has the permission through any of their roles
        $count = $this->sql->firstValue(
            "SELECT COUNT(*)
             FROM rol_usuario ru
             JOIN rol_actividad_permiso rap ON ru.rol_id = rap.rol_id
             JOIN actividad_permiso ap ON rap.actividad_permiso_id = ap.actividad_permiso_id
             WHERE ru.usuario_id = ?
             AND ap.permiso = ?",
            [$this->user['usuario_id'], $permission]
        );
        
        return $count > 0;
    }
    
    /**
     * Require specific permission or throw exception
     * 
     * @param string $permission Permission code
     * @throws Exception
     */
    protected function requirePermission(string $permission): void {
        if (!$this->hasPermission($permission)) {
            throw new Exception('Insufficient permissions', 403);
        }
    }
    
    /**
     * Check rate limiting to prevent DOS attacks
     */
    protected function checkRateLimit(): void {
        if (!isset($this->config['rate_limit']['enabled']) || !$this->config['rate_limit']['enabled']) {
            return;
        }
        
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $endpoint = $_SERVER['REQUEST_URI'] ?? 'unknown';
        $key = md5($ip . $endpoint);
        $limit = $this->config['rate_limit']['requests_per_minute'] ?? 60;
        
        // Check request count in last minute
        $count = $this->sql->firstValue(
            "SELECT COUNT(*) 
             FROM api_rate_limit 
             WHERE limit_key = ? 
             AND request_time > DATE_SUB(NOW(), INTERVAL 1 MINUTE)",
            [$key]
        );
        
        if ($count >= $limit) {
            throw new Exception('Rate limit exceeded. Please try again later.', 429);
        }
        
        // Log this request
        $this->sql->query(
            "INSERT INTO api_rate_limit (limit_key, ip_address, endpoint, request_time) 
             VALUES (?, ?, ?, NOW())",
            [$key, $ip, $endpoint]
        );
        
        // Clean up old entries (older than 1 minute)
        $this->sql->query(
            "DELETE FROM api_rate_limit 
             WHERE request_time < DATE_SUB(NOW(), INTERVAL 1 MINUTE)"
        );
    }
    
    /**
     * Route to appropriate action handler
     * Must be implemented by child classes
     * 
     * @param string $action Action name
     */
    abstract protected function route(string $action): void;
    
    /**
     * Send success response
     * 
     * @param mixed $data Response data
     * @param string|null $message Optional success message
     */
    protected function sendSuccess(mixed $data = null, ?string $message = null): void {
        $response = [
            'success' => true,
            'error' => null,
            'data' => $data
        ];
        
        if ($message !== null) {
            $response['message'] = $message;
        }
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    
    /**
     * Send error response
     * 
     * @param string $message Error message
     * @param int $code HTTP status code
     */
    protected function sendError(string $message, int $code = 400): void {
        http_response_code($code);
        
        echo json_encode([
            'success' => false,
            'error' => $message,
            'data' => null
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    
    /**
     * Validate required fields in request
     * 
     * @param array $fields Required field names
     * @throws Exception
     */
    protected function requireFields(array $fields): void {
        foreach ($fields as $field) {
            if (!isset($this->request[$field])) {
                throw new Exception("Required field missing: {$field}", 400);
            }
        }
    }
    
    /**
     * Sanitize string input
     * 
     * @param string $value Input value
     * @return string Sanitized value
     */
    protected function sanitizeString(string $value): string {
        return trim(strip_tags($value));
    }
    
    /**
     * Get current user nick for audit trail
     * 
     * @return string User nick or 'system'
     */
    protected function getCurrentUserNick(): string {
        return $this->user['nick'] ?? 'system';
    }
}
