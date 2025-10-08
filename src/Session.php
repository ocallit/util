<?php
declare(strict_types=1);

namespace Ocallit\Util;

final class Session {
    public function __construct(
		string $path          = '/',
        int    $gcMaxLifetime = 28800, // 8h
        string $sameSite      = 'Strict', // 'Strict' | 'Lax' | 'None'
        bool   $secure        = true,  // HTTPS only in prod
        bool   $httpOnly      = true,
        ?string $domain       = null
    ) {
        if (session_status() === PHP_SESSION_NONE) {
            $this->start(
				$path,
				$gcMaxLifetime,
				$sameSite,
				$secure,
				$httpOnly,
				$domain
			);
        }
    }

    private function start(
		string $path,
        int    $gcMaxLifetime,
        string $sameSite, // 'Strict' | 'Lax' | 'None'
        bool   $secure,  // HTTPS only in prod
        bool   $httpOnly,
        ?string $domain
	): void {
        session_start([
            'use_strict_mode'        => 1,
            'use_only_cookies'       => 1,
            'cookie_secure'          => $secure,
            'cookie_httponly'        => $httpOnly,
            'cookie_samesite'        => $sameSite,
            'cookie_path'            => $path,
            'cookie_domain'          => $domain,
            'sid_length'             => 64,
            'sid_bits_per_character' => 6,
            'gc_maxlifetime'         => $gcMaxLifetime,
            'cookie_lifetime'        => 0, // session cookie
        ]);
        if(!isset($_SESSION['_flash'])) {
            $_SESSION['_flash'] = [];
        }
    }

    public function regenerate(): void {
        if(session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }
    }

    public function login(int|string $uid, array $extra = []): void {
        $_SESSION['uid'] = $uid;
        foreach($extra as $k => $v) { $_SESSION[$k] = $v; }
        $this->regenerate(); // prevent fixation
    }

    public function isLoggedIn(): bool { return isset($_SESSION['uid']); }

    public function logout(): void {
        if(session_status() !== PHP_SESSION_ACTIVE) {
            return;
        }
        $_SESSION = [];

        // Delete session cookie
        if(ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
        }

        session_destroy();
    }

    // ---- Flash API ----
    public function setFlash(string $key, mixed $value): void { $_SESSION['_flash'][$key] = $value;}

    public function getFlash(string $key, mixed $default = null): mixed {
        if(!isset($_SESSION['_flash']) || !is_array($_SESSION['_flash'])) {
            return $default;
        }
        $value = $_SESSION['_flash'][$key] ?? $default;
        unset($_SESSION['_flash'][$key]);
        return $value;
    }

    public function clearFlash(?string $key = null): void {
        if(!isset($_SESSION['_flash']) || !is_array($_SESSION['_flash'])) {
            return;
        }
        if($key === null) {
            $_SESSION['_flash'] = [];
        } else {
            unset($_SESSION['_flash'][$key]);
        }
    }

    // Call when you’re done mutating to release the lock early
    public function session_write_close(): void {
        if(session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
    }
}
