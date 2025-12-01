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
        'url' => '../index.php',
        'label' => 'Inicio',
        'icon_regular' => 'fa-regular fa-house-chimney',
        'icon_solid' => 'fa-solid fa-house-chimney',
        'title' => 'Ir a la página principal',
      ],
      'usuarios' => [
        'url' => './usuarios.php',
        'label' => 'Usuarios',
        'icon_regular' => 'fa-regular fa-users',
        'icon_solid' => 'fa-solid fa-users',
        'title' => 'Usuarios y sus roles',
      ],
      'roles' => [
        'url' => './roles.php',
        'label' => 'Roles',
        'icon_regular' => 'fa-regular fa-user-group',
        'icon_solid' => 'fa-solid fa-user-group',
        'title' => 'Grupos de usuarios (ej. Administrador)',
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
        'title' => 'Que se puede hacer en el sistema',
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
    $script = <<<'JS'
/**
 * Setup navigation title bar functionality safely.
 * This wrapper checks the document's readyState to ensure the function
 * runs even if the DOMContentLoaded event has already fired.
 */
function runNavSetupSafely() {
    try {
        const titleBar = document.getElementById('nav-menu-hint');
        if (!titleBar) {
            console.warn('SCH Nav Titles: Could not find the title bar element (#nav-menu-hint).');
            return;
        }

        const navLinks = document.querySelectorAll('.sch_nav a');
        let currentTitle = '';

        // --- 1. Find and Set Initial Active Title ---
        navLinks.forEach(link => {
            // Check if the link itself is the active one (as defined in nav.php)
            if (link.classList.contains('sch_nav_active')) {
                 currentTitle = link.getAttribute('title');
            }
        });

        // Set the initial active title in blue
        if (currentTitle) {
            titleBar.innerHTML = `<span class="sch_text_primary">${currentTitle}</span>`;
            titleBar.style.opacity = 1;
        } else {
             titleBar.textContent = 'Seleccione una opción del menú.';
             titleBar.style.opacity = 1;
        }

        // --- 2. Setup Hover Listeners ---
        navLinks.forEach(link => {
            const linkTitle = link.getAttribute('title');
            if (linkTitle) {
                
                // On Mouse Over: Show the hovered title
                link.addEventListener('mouseover', () => {
                    // Temporarily store the active title before overriding it
                    // Use a temporary data attribute on the bar to hold the current content
                    titleBar.dataset.activeHtml = titleBar.innerHTML; 
                    
                    // Display the hovered title (plain text)
                    titleBar.textContent = linkTitle;
                });

                // On Mouse Out: Revert to the active title
                link.addEventListener('mouseout', () => {
                    // Restore the stored active title (which includes the <span> and class)
                    if (titleBar.dataset.activeHtml) {
                       titleBar.innerHTML = titleBar.dataset.activeHtml;
                    }
                });
            }
        });

    } catch (e) {
        // Essential requirement: catch any error and log it to the console
        console.error('SCH Nav Titles Error (Caught):', e.message, 'Details:', e);
    }
}

/**
 * The Battle-Proof Wrapper: Check and execute.
 */
function setupNavTitles() {
    // Check if the DOM is already loaded (complete/interactive)
    if (document.readyState === 'loading') {
        // If not loaded yet, wait for the DOMContentLoaded event
        document.addEventListener('DOMContentLoaded', runNavSetupSafely);
    } else {
        // If already loaded ('interactive' or 'complete'), run immediately
        runNavSetupSafely();
    }
}

// Execute the wrapper function
setupNavTitles();
JS;
    $help = '<div id="nav-menu-hint"></div>';
    return $html . " </ul></nav>$help<script>$script</script>";
}
