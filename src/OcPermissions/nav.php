<?php
/**
 * nav.php
 * Navigation component for Usuarios, Roles y Permisos system
 *
 * Usage: <?= renderNav() ?>
 */

/**
 * Render the navigation menu with active state detection
 *
 * @param string|null $currentPage Force a specific page as active (optional)
 * @return string HTML for the navigation
 */
function renderNav(?string $currentPage = NULL): string {
    if($currentPage === NULL) {
        $scriptName = basename($_SERVER['SCRIPT_NAME'] ?? '', '.php');
        $currentPage = $scriptName;
    }
    // Navigation items: key => [url, label, icon_regular, icon_solid, title]
    $navItems = [
      'index' => [
        'url' => './index.php',
        'label' => 'Inicio',
        'icon_regular' => 'fa-regular fa-house-chimney',
        'icon_solid' => 'fa-solid fa-house-chimney',
        'title' => 'Ver el panel principal y estadísticas',
      ],
      'usuarios' => [
        'url' => './usuarios.php',
        'label' => 'Usuarios',
        'icon_regular' => 'fa-regular fa-users',
        'icon_solid' => 'fa-solid fa-users',
        'title' => 'Administrar las cuentas de usuario y asignarles roles',
      ],
      'roles' => [
        'url' => './roles.php',
        'label' => 'Roles',
        'icon_regular' => 'fa-regular fa-user-group',
        'icon_solid' => 'fa-solid fa-user-group',
        'title' => 'Crear y administrar grupos de usuarios (ej. Administrador)',
      ],
      'asignar_permisos' => [
        'url' => './asignar_permisos.php',
        'label' => 'Permisos',
        'icon_regular' => 'fa-regular fa-shield-keyhole',
        'icon_solid' => 'fa-solid fa-shield-keyhole',
        'title' => 'Asignar qué acciones puede realizar cada rol en cada actividad',
      ],
      'actividad' => [
        'url' => './actividad.php',
        'label' => 'Actividades',
        'icon_regular' => 'fa-regular fa-puzzle-piece',
        'icon_solid' => 'fa-solid fa-puzzle-piece',
        'title' => '(Configuración) Definir módulos y acciones disponibles en el sistema',
      ],
    ];

    $html = "<header class='sch_header'>
            <h1 style='margin:0;padding:0;'>Usuarios y Permisos</h1>
            </header>" .
      '<nav class="sch_nav">' . PHP_EOL . '<ul>' . PHP_EOL;
    foreach($navItems as $key => $item) {
        $isActive =  str_contains($currentPage, $key);
        $activeClass = $isActive ? ' class="sch_nav_active"' : '';
        $icon = $isActive ? $item['icon_solid'] : $item['icon_regular'];

        $html .= '<li><a href="' . htmlspecialchars($item['url']) . '"' . $activeClass .
                ' title="' . htmlspecialchars($item['title']) . '">' .
                 '<i class="' . htmlspecialchars($icon) . '"></i> '.
                htmlspecialchars($item['label']) . '</a>';
    }
    return $html . ' </ul></nav>';
}
