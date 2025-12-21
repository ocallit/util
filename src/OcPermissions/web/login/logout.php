<?php
use ocallit\Util\Session;

require_once 'config/config.php';
global $gSession;
$gSession->logout();
?><!DOCTYPE html>
<html lang="es-MX">
<head>
    <?php include_once 'components/head/head.php'; ?>
    <title>Cerrar Sesión - Diso Wedding</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f9f9f9;
        }

        .logout-container {
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

        .message {
            font-size: 1.5rem;
            margin-bottom: 2rem;
            color: #333;
        }

        .login-link {
            display: inline-block;
            background-color: var(--diso);
            color: white;
            text-decoration: none;
            border-radius: 4px;
            padding: 0.75rem 1.5rem;
            font-size: 1rem;
            transition: background-color 0.3s;
        }

        .login-link:hover {
            background-color: var(--diso_dark);
        }
    </style>
</head>
<body>
    <div class="logout-container">
        <img src="logos/diso_wedding_logotipo.png" alt="Diso Wedding Logo" class="logo">

        <div class="message">Hasta luego</div>

        <a href="login.php" class="login-link">Volver a iniciar sesión</a>
    </div>
</body>
</html>