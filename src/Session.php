<?php

/*
@usage
require_once 'Session.php';
$session = new Session();
if (!$session->isLoggedIn()) {
    header("Location: login.php"); 
    exit;
}

*/

class Session {

    public function __construct(string $cookiePath = '/', int $lifetimeSeconds = 30* 60 * 60) {
        if(session_status() == PHP_SESSION_NONE) {
            $this->startSecureSession($cookiePath,$lifetimeSeconds);
        }
    }

    protected function startSecureSession(string $cookiePath, int $lifetimeSeconds): void {
        ini_set('session.gc_maxlifetime', $lifetimeSeconds);
        ini_set('session.cookie_lifetime', $lifetimeSeconds);
        ini_set('session.gc_probability', 1);
        ini_set('session.gc_divisor', 1000);
        $session_options = [
          'cookie_secure' => TRUE, // Send cookie only over HTTPS
          'cookie_httponly' => TRUE, // Prevent JavaScript access to cookie
          'use_strict_mode' => TRUE, // Prevent session fixation
          'cookie_samesite' => 'Strict', // Prevent CSRF attacks
          'cookie_lifetime' => $lifetimeSeconds,
        ];

        $session_options['cookie_path'] = $cookiePath; // Explicitly set path to root
        $session_options['sid_length'] = 128; // Increase session ID length
        $session_options['sid_bits_per_character'] = 6; // Use more bits per character in session ID

        session_start($session_options);
        $_SESSION['_path'] = $cookiePath; // Store the path in session
    }

    public function isLoggedIn(): bool {return !empty( $_SESSION[($_SESSION['_path'] ?? "") . "\t" . 'loggedin']); }

    public function login(array $sessionVars = []): void {
        $_SESSION[$_SESSION['_path'] . "\t" . 'loggedin'] = TRUE;
        foreach($sessionVars as $key => $value)
            $_SESSION[$key] = $value;
        session_regenerate_id(TRUE); // Regenerate session ID after login
    }

    public function logout(): void {
        $_SESSION = [];
        session_destroy();
    }

    public function setFlash(string $key, $value): void {$_SESSION['_flash'][$key] = $value; }

    public function getFlash(string $key, $default = null) {
        $value = $_SESSION['_flash'][$key] ?? $default;
        $this->removeFlash($key);
        return $value;
    }

    public function removeFlash(string $key): void {unset($_SESSION['_flash'][$key]); }
}
