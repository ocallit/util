<?php
use ocallit\Util\Pwder;
use Ocallit\Sqler\SqlExecutor;

require_once __DIR__ . '/../inc/config.php';
require_once __DIR__ . '/../inc/Pwder.php';
global $gSqlExecutor;

$error = '';
$success = '';
$token = $_GET['token'] ?? '';

if (empty($token)) {
    die("Token inválido.");
}

// Verify token
$query = "SELECT usuario_id, reset_token_expira FROM usuario WHERE reset_token = ? AND estatus = 'Puede Login'";
$user = $gSqlExecutor->row($query, [$token]);

if (!$user) {
    $error = 'El enlace de recuperación es inválido o ya ha sido utilizado.';
} elseif (strtotime($user['reset_token_expira']) < time()) {
    $error = 'El enlace de recuperación ha expirado.';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($error)) {
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';

    if (empty($password) || empty($confirm_password)) {
        $error = 'Por favor ingrese y confirme su nueva contraseña.';
    } elseif ($password !== $confirm_password) {
        $error = 'Las contraseñas no coinciden.';
    } elseif (strlen($password) < 6) { // Enforce a minimum length policy
        $error = 'La contraseña debe tener al menos 6 caracteres.';
    } else {
        // Update password
        $pwder = new Pwder($gSqlExecutor, 'usuario', 'usuario_id', 'password');
        if ($pwder->update($user['usuario_id'], $password)) {
            // Clear token
            $gSqlExecutor->query("UPDATE usuario SET reset_token = NULL, reset_token_expira = NULL WHERE usuario_id = ?", [$user['usuario_id']]);
            $success = 'Contraseña actualizada correctamente. Ahora puedes iniciar sesión.';
        } else {
            $error = 'Error al actualizar la contraseña.';
        }
    }
}
?><!DOCTYPE html>
<html lang="es-MX">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer Contraseña</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f9f9f9;
            font-family: sans-serif;
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

        .login-button {
            background-color: #007bff;
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
            background-color: #0056b3;
        }

        .error-message {
            color: #d32f2f;
            margin-bottom: 1rem;
            font-weight: bold;
        }

        .success-message {
            color: #2e7d32;
            margin-bottom: 1rem;
            font-weight: bold;
        }

        .back-link {
            display: block;
            margin-top: 1rem;
            color: #666;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <!-- <img src="../logos/logo.png" alt="Logo" class="logo"> -->
        <h1>Restablecer Contraseña</h1>

        <?php if (!empty($error)): ?>
            <div class="error-message"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <?php if (!empty($success)): ?>
            <div class="success-message"><?php echo htmlspecialchars($success); ?></div>
            <a href="login.php" class="login-button" style="display:inline-block; text-decoration:none; box-sizing: border-box;">Iniciar Sesión</a>
        <?php elseif (!empty($error) && (strpos($error, 'inválido') !== false || strpos($error, 'expirado') !== false)): ?>
             <a href="login.php" class="back-link">Volver al inicio de sesión</a>
        <?php else: ?>

        <form method="post" action="reset_password.php?token=<?php echo htmlspecialchars($token); ?>">
            <div class="form-group">
                <label for="password">Nueva Contraseña</label>
                <input type="password" id="password" name="password" required>
            </div>

            <div class="form-group">
                <label for="confirm_password">Confirmar Contraseña</label>
                <input type="password" id="confirm_password" name="confirm_password" required>
            </div>

            <button type="submit" class="login-button">Cambiar Contraseña</button>
        </form>
        <?php endif; ?>
    </div>
</body>
</html>