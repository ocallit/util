<?php
use ocallit\Util\Session;
use ocallit\Util\Pwder;
use Ocallit\Sqler\SqlExecutor;

require_once __DIR__ . '/../inc/config.php';
require_once __DIR__ . '/../inc/Pwder.php';
global $gSession, $gSqlExecutor;

if ($gSession->isLoggedIn()) {
    header("Location: index.php");
    exit;
}

$error = '';

// Process login form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nick = $_POST['nick'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($nick) || empty($password)) {
        $error = 'Por favor ingrese su nick y contraseña';
    } else {
        // Query the database to find the user
        $query = "SELECT usuario_id, nick, nombre FROM usuario WHERE nick = ? AND estatus  = 'Puede Login' LIMIT 1";
        $user = $gSqlExecutor->row($query, [$nick]);

        if($user) {
            $pwder = new Pwder($gSqlExecutor, 'usuario', 'usuario_id', 'password');
            if ($pwder->verify($user["usuario_id"], $password)) {
                // Login successful
                $gSession->login([
                    'nick' => $user['nick'],
                    'usuario_id' => $user['usuario_id'],
                    'nombre' => $user['nombre'],
                ]);
                header("Location: index.php");
                exit;
            } else {
                $error = 'Contraseña incorrecta';
            }
        } else {
            $error = 'Usuario no encontrado o inactivo';
        }
    }
}
?><!DOCTYPE html>
<html lang="es-MX">
<head>
    <?php include_once 'components/head/head.php'; ?>
    <title>Iniciar Sesión</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f9f9f9;
        }

        .login-container {
            width: 100%;
            max-width: 400px;
            padding: 2rem;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06);
            text-align: center;
        }

        .logo {
            max-width: 200px;
            margin-bottom: 2rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
            text-align: left;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
        }

        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
            box-sizing: border-box;
        }

        .password-container {
            position: relative;
        }

        .password-toggle {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            color: #666;
        }

        .login-button {
            background-color: var(--diso);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 0.75rem 1.5rem;
            font-size: 1rem;
            cursor: pointer;
            width: 100%;
            transition: background-color 0.3s;
        }

        .login-button:hover {
            background-color: var(--diso_dark);
        }

        .error-message {
            color: var(--diso);
            margin-bottom: 1rem;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <img src="logos/diso_wedding_logotipo.png" alt="Diso Wedding Logo" class="logo">

        <?php if (!empty($error)): ?>
            <div class="error-message"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <form method="post" action="login.php">
            <div class="form-group">
                <label for="nick">Nick</label>
                <input type="text" id="nick" name="nick" required autocomplete="username">
            </div>

            <div class="form-group">
                <label for="password">Contraseña</label>
                <div class="password-container">
                    <input type="password" id="password" name="password" required autocomplete="current-password">
                    <button type="button" class="password-toggle" aria-label="Toggle password visibility">
                        <i class="fa-solid fa-eye" id="password-toggle-icon"></i>
                    </button>
                </div>
            </div>

            <button type="submit" class="login-button">Entrar</button>

            <div style="margin-top: 1rem; text-align: center;">
                <a href="forgot_password.php" style="color: #666; text-decoration: none; font-size: 0.9rem;">¿Olvidaste tu contraseña?</a>
            </div>
        </form>
    </div>

    <script>
        // Toggle password visibility
        document.addEventListener('DOMContentLoaded', function() {
            const passwordInput = document.getElementById('password');
            const toggleButton = document.querySelector('.password-toggle');
            const toggleIcon = document.getElementById('password-toggle-icon');

            toggleButton.addEventListener('click', function() {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    toggleIcon.classList.remove('fa-eye');
                    toggleIcon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    toggleIcon.classList.remove('fa-eye-slash');
                    toggleIcon.classList.add('fa-eye');
                }
            });
        });
    </script>
</body>
</html>