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

namespace ocallit\Util;

class Session {
    protected string $sessionName;
    public function __construct(string $sessionName = '', int $lifetimeSeconds = 30* 60 * 60) {
        $this->sessionName = $sessionName;
        if(session_status() == PHP_SESSION_NONE) {
            $this->start($lifetimeSeconds);
        }
    }

    protected function start(int $lifetimeSeconds): void {
        ini_set('session.gc_maxlifetime', $lifetimeSeconds);
        ini_set('session.cookie_lifetime', $lifetimeSeconds);
        ini_set('session.gc_probability', 1);
        ini_set('session.gc_divisor', 1000);
        $session_options = [
          'cookie_secure' => $this->isHTTPS(), // Send cookie only over HTTPS
          'cookie_httponly' => TRUE, // Prevent JavaScript access to cookie
          'use_strict_mode' => TRUE, // Prevent session fixation
          'cookie_samesite' => 'Strict', // Prevent CSRF attacks
          'cookie_lifetime' => $lifetimeSeconds,
        ];
		if(!empty($this->sessionName))
			session_name($this->sessionName);
        session_start($session_options);
        $_SESSION['_session_name'] = $this->sessionName; // Store the path in session
    }

    protected function isHTTPS():bool {
        return
          ($_SERVER['HTTPS'] ?? "") === "on" ||
          ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? "") === 'https' ||
          ($_SERVER['HTTP_X_FORWARDED_SSL'] ?? "") === 'on' || ($_SERVER['SERVER_PORT'] ?? "") === '443';
    }
    public function isLoggedIn(): bool {return !empty( $_SESSION[$this->sessionName . "\t" . 'loggedin']); }

    public function login(array $sessionVars = []): void {
        $_SESSION[$this->sessionName . "\t" . 'loggedin'] = TRUE;
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
