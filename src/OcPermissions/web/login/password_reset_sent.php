<!DOCTYPE html>
<html lang="es-MX">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Correo Enviado</title>
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

        .success-icon {
            font-size: 3rem;
            color: #007bff;
            margin-bottom: 1rem;
        }

        .message {
            margin-bottom: 1.5rem;
            color: #333;
            line-height: 1.5;
        }

        .back-link {
            color: #007bff;
            text-decoration: none;
            font-weight: bold;
        }

        .back-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <!-- <img src="../logos/logo.png" alt="Logo" class="logo"> -->

        <div class="success-icon">✉️</div>

        <h1>Correo Enviado</h1>

        <div class="message">
            Si el correo electrónico proporcionado está registrado en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
            <br><br>
            Por favor revisa tu bandeja de entrada (y la carpeta de spam).
        </div>

        <a href="login.php" class="back-link">Volver al inicio de sesión</a>
    </div>
</body>
</html>