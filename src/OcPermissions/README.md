# Gestión de Actividades y Permisos - Interface

## 📋 Descripción

Sistema web para gestionar actividades del sistema y sus permisos asociados. Permite operaciones CRUD completas con dos modos de operación:

- **Modo Lectura**: Visualización de datos sin capacidad de edición
- **Modo Edición**: Permite crear, editar y eliminar actividades y permisos

## 🗂️ Archivos Incluidos

1. **actividad.html** - Interfaz principal
2. **actividad.css** - Estilos personalizados (SCH Color Scheme)
3. **actividad.js** - Lógica de la aplicación con API mockeada
4. **base.css** - Estilos base del proyecto

## 🚀 Cómo Usar

### Instalación

1. Coloca todos los archivos en el mismo directorio
2. Abre `actividad.html` en un navegador web moderno

### Características Principales

#### 1. **Grid de Actividades (Tabulator)**
- Row numbers in the leftmost column
- Actions buttons (edit/delete) in the second column when in edit mode
- Shows all activities with their details
- Permissions column displays etiquetas separated by commas (clickable to edit)
- Registrado el shows only the date (Y-m-d format)
- ID column on the far right
- Filters by column
- Sorting capability
- Pagination
- IDs visible but not editable

#### 2. **Modo Edición/Lectura**
- Toggle switch en la barra superior
- **Modo Lectura**: Solo visualización
- **Modo Edición**: Habilita botones de acción

#### 3. **Gestión de Actividades**
- **Crear**: Botón "Nueva Actividad" (solo en modo edición)
- **Editar**: Click en el botón ✏️ o en el badge de permisos
- **Eliminar**: Click en el botón 🗑️ con confirmación

#### 4. **Gestión de Permisos**
- Cada actividad puede tener múltiples permisos
- **Permiso**: Nombre interno del sistema (ej: `usuarios.ver`)
- **Etiqueta**: Nombre visible para el usuario (ej: `Ver Usuarios`)
- En el grid, se muestran las etiquetas separadas por comas
- Click en las etiquetas para ver/editar todos los permisos
- Agregar/eliminar permisos dentro del diálogo de edición

#### 5. **Diálogo de Edición**
El diálogo ha sido optimizado para mayor espacio y usabilidad:

**Diseño Compacto**:
- Campos de solo lectura (ID, Fecha, Usuario) en una sola fila
- Actividad y Descripción en sus propias filas
- Más espacio vertical para la lista de permisos
- Header y footer más delgados

**Macro Buttons** - Agregan conjuntos predefinidos de permisos:
- **W/R/Nada**: Agrega 3 permisos
  - `{actividad}.rw` → Editar
  - `{actividad}.ro` → Consultar
  - `{actividad}.nada` → Nada
- **CRUD**: Agrega 4 permisos
  - `{actividad}.crear` → Crear
  - `{actividad}.leer` → Leer
  - `{actividad}.actualizar` → Actualizar
  - `{actividad}.eliminar` → Eliminar
- **Ver/Editar**: Agrega 2 permisos
  - `{actividad}.ver` → Ver
  - `{actividad}.editar` → Editar

Los macros usan el nombre de la actividad como prefijo automáticamente.

**Gestión de Permisos**:
- Lista compacta con scroll vertical cuando hay muchos permisos
- Cada permiso muestra su ID (o "N" para nuevos)
- Agregar permisos individualmente o usando macros
- Editar permisos existentes
- Eliminar permisos

## 🔌 API Mockeada

La aplicación incluye una API mockeada que intercepta las llamadas `fetch()`:

### Estructura de Request
```json
{
  "action": "list|get|save|delete",
  "actividad_id": 123,
  "actividad": "Nombre",
  "descripcion": "Descripción",
  "permisos": [
    {
      "actividad_permiso_id": 1,
      "permiso": "usuarios.ver",
      "etiqueta": "Ver Usuarios"
    }
  ]
}
```

### Estructura de Response
```json
{
  "success": true,
  "error": null,
  "data": {
    "actividad_id": 123,
    "actividad": "Gestión de Usuarios",
    "descripcion": "Módulo para administrar usuarios",
    "registrado_el": "2025-01-15 10:30:00",
    "registrado_por": "admin",
    "permisos": [...]
  }
}
```

### Acciones Disponibles

1. **list** - Obtiene todas las actividades
2. **get** - Obtiene una actividad específica
3. **save** - Crea o actualiza una actividad
4. **delete** - Elimina una actividad

## 📊 Datos de Ejemplo

La aplicación incluye 4 actividades precargadas:

1. **Gestión de Usuarios** (4 permisos)
2. **Gestión de Roles** (3 permisos)
3. **Reportes** (3 permisos)
4. **Configuración** (2 permisos)

## 🎨 Esquema de Colores (SCH)

Utiliza el esquema de colores SCH definido en `base.css`:

- **Primary**: Dark Blue (#00008b)
- **Secondary**: Steel Blue (#4682b4)
- **Success**: Green (#28a745)
- **Fail**: Red (#dc3545)
- **Info**: Teal (#17a2b8)
- **Warning**: Amber (#ffc107)

## 📱 Diseño Responsivo

- **Desktop**: Grid completo con todas las columnas
- **Tablet**: Columnas ocultas automáticamente según prioridad
- **Mobile**: 
  - Diseño vertical optimizado
  - Botones táctiles de 44px mínimo
  - Diálogos adaptados al viewport

## 🔧 Integración con Backend PHP

Para conectar con un backend real:

1. Crea el archivo `api/actividad_api.php`
2. Elimina o comenta la función `setupFetchOverride()` en `actividad.js`
3. El backend debe manejar las siguientes acciones:

```php
<?php
// api/actividad_api.php
require_once __DIR__ . '/../../config/config.php';

header('Content-Type: application/json');

$action = $_POST['action'] ?? '';

switch ($action) {
    case 'list':
        // Retornar todas las actividades con sus permisos
        break;
    case 'get':
        // Retornar una actividad específica
        break;
    case 'save':
        // Crear o actualizar actividad y sus permisos
        break;
    case 'delete':
        // Eliminar actividad y sus permisos
        break;
}
```

## 🗄️ Estructura de Base de Datos

```sql
CREATE TABLE actividad (
    actividad_id MEDIUMINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    actividad VARCHAR(64) UNIQUE NOT NULL,
    descripcion LONGTEXT,
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

CREATE TABLE actividad_permiso (
    actividad_permiso_id MEDIUMINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    actividad_id MEDIUMINT UNSIGNED NOT NULL,
    FOREIGN KEY (actividad_id) REFERENCES actividad(actividad_id) ON DELETE CASCADE,
    permiso VARCHAR(16) NOT NULL,
    UNIQUE KEY permiso_por_actividad(actividad_id, permiso),
    etiqueta VARCHAR(16) NOT NULL,
    UNIQUE KEY etiqueta_por_actividad(etiqueta, actividad_id),
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;
```

## 🔗 Enlaces de Navegación

La interfaz incluye enlaces a:
- **Inicio** (index.html)
- **Actividades** (actividad.html) - Actual
- **Asignar Permisos** (asignar_permisos.html)
- **Roles** (roles.html)
- **Usuarios** (usuarios.html)

## ⚡ Características Técnicas

### Tecnologías Utilizadas
- **HTML5**: Estructura semántica
- **CSS3**: Estilos con variables CSS y Flexbox
- **JavaScript ES6**: Clases, async/await, módulos
- **Tabulator.js 6.3.1**: Grid avanzado
- **Native Dialog API**: Modales nativos

### Convenciones de Código
- Prefijo `ocActividad` para todos los identificadores
- Sin frameworks CSS (Bootstrap, Tailwind, etc.)
- Sin frameworks JS (React, Vue, jQuery, etc.)
- Solo Tabulator.js permitido como librería externa

### Clases Principales

1. **ocActividadManager**: Gestor principal de la aplicación
2. **ocActividadEditDialog**: Maneja el diálogo de edición
3. **ocActividadDeleteDialog**: Maneja confirmación de eliminación

## 🐛 Solución de Problemas

### El diálogo no se abre
- Verifica que el navegador soporte `<dialog>` nativo
- Revisa la consola del navegador por errores

### Los datos no se guardan
- Verifica que todos los campos requeridos estén llenos
- Revisa la consola para ver las llamadas API mockeadas

### Estilos no se aplican correctamente
- Asegúrate que `base.css` esté en el mismo directorio
- Verifica que todos los archivos CSS estén cargando

## 📝 Notas Adicionales

- Los IDs son siempre visibles pero nunca editables
- Las fechas de registro se muestran en formato local (es-MX)
- Los permisos se eliminan en cascada al eliminar una actividad
- La validación básica está implementada (campos requeridos, longitud máxima)

## 🔐 Seguridad

Para producción, asegúrate de implementar:
- Validación server-side completa
- Protección CSRF
- Autenticación y autorización
- Sanitización de inputs
- Escape de outputs

## 📞 Soporte

Para preguntas o problemas:
1. Revisa este README
2. Verifica la consola del navegador
3. Consulta la documentación de Tabulator.js

---

**Versión**: 1.0.0  
**Última actualización**: 2025-10-31
