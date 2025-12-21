<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use Ocallit\Sqler\SqlExecutor;

require_once __DIR__ . '/../inc/config.php';
global $gSqlExecutor;

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';

    if (empty($email)) {
        $error = 'Por favor ingrese su correo electrónico';
    } else {
        // Check if email exists
        $query = "SELECT usuario_id, email, nombre FROM usuario WHERE email = ? AND estatus = 'Puede Login' LIMIT 1";
        $user = $gSqlExecutor->row($query, [$email]);

        if ($user) {
            // Generate token
            $token = bin2hex(random_bytes(32));
            $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

            // Store token in DB
            $updateQuery = "UPDATE usuario SET reset_token = ?, reset_token_expira = ? WHERE usuario_id = ?";
            $gSqlExecutor->query($updateQuery, [$token, $expiry, $user['usuario_id']]);

            // Send email
            $mail = new PHPMailer(true);
            try {
                // Determine the protocol and host
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
                $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

                // Construct the reset link based on the current script location
                $path = dirname($_SERVER['PHP_SELF']); // e.g., /OcPermissions/web/login
                $resetLink = $protocol . $host . $path . "/reset_password.php?token=" . $token;

                // Server settings
                // Note: You should configure these settings in config.php or environment variables
                // For now, we assume mail() works or SMTP is configured globally/in config.
                // If using SMTP, uncomment and configure below:
                /*
                $mail->isSMTP();
                $mail->Host       = 'smtp.example.com';
                $mail->SMTPAuth   = true;
                $mail->Username   = 'user@example.com';
                $mail->Password   = 'secret';
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                $mail->Port       = 465;
                */

                $mail->setFrom('noreply@' . $host, 'Soporte Diso Wedding');
                $mail->addAddress($email, $user['nombre']);

                $mail->isHTML(true);
                $mail->Subject = 'Recuperar Contraseña';
                $mail->Body    = "Hola " . htmlspecialchars($user['nombre']) . ",<br><br>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva:<br><br><a href='" . htmlspecialchars($resetLink) . "'>" . htmlspecialchars($resetLink) . "</a><br><br>Este enlace expirará en 1 hora.<br><br>Si no solicitaste esto, puedes ignorar este correo.";
                $mail->AltBody = "Hola " . $user['nombre'] . ",\n\nHas solicitado restablecer tu contraseña. Copia y pega el siguiente enlace para crear una nueva:\n\n" . $resetLink . "\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste esto, puedes ignorar este correo.";

                $mail->send();

                header("Location: password_reset_sent.php");
                exit;
            } catch (Exception $e) {
                $error = "No se pudo enviar el correo. Error: {$mail->ErrorInfo}";
            }
        } else {
            // For security, don't reveal if user exists or not, but for now we might give a generic message
            // or we can say "If an account with that email exists, we sent a link."
            // But let's follow the standard pattern of showing success even if not found to prevent enumeration,
            // OR just show "Email no encontrado" if internal app. Assuming internal app based on context.
            // Let's go with "Si el correo existe..." for security.
             header("Location: password_reset_sent.php");
             exit;
        }
    }
}
?><!DOCTYPE html>
<html lang="es-MX">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperar Contraseña</title>
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

        .back-link {
            display: block;
            margin-top: 1rem;
            color: #666;
            text-decoration: none;
        }

        .back-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <!-- <img src="../logos/logo.png" alt="Logo" class="logo"> -->
        <h1>Recuperar Contraseña</h1>

        <?php if (!empty($error)): ?>
            <div class="error-message"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <form method="post" action="forgot_password.php">
            <div class="form-group">
                <label for="email">Correo Electrónico</label>
                <input type="email" id="email" name="email" required placeholder="ejemplo@correo.com">
            </div>

            <button type="submit" class="login-button">Enviar enlace</button>

            <a href="login.php" class="back-link">Volver al inicio de sesión</a>
        </form>
    </div>
</body>
</html>