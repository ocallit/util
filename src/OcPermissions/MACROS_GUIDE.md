# Guía Rápida: Macro Buttons

## ¿Qué son los Macro Buttons?

Los macro buttons son botones especiales en el diálogo de edición que permiten agregar rápidamente conjuntos predefinidos de permisos comunes, ahorrando tiempo al configurar actividades.

## Ubicación

Los macro buttons se encuentran en la sección de "Permisos" del diálogo de edición, justo arriba de la lista de permisos y al lado del botón "➕ Agregar".

## Macros Disponibles

### 1. W/R/Nada
**Descripción**: Agrega un conjunto de permisos de lectura/escritura típico

**Permisos que agrega**:
- `{actividad}.rw` → **Editar** (Read/Write)
- `{actividad}.ro` → **Consultar** (Read Only)
- `{actividad}.nada` → **Nada** (Sin acceso)

**Ejemplo**: Si la actividad se llama "usuarios", agrega:
- `usuarios.rw` → Editar
- `usuarios.ro` → Consultar
- `usuarios.nada` → Nada

---

### 2. CRUD
**Descripción**: Agrega el conjunto completo de operaciones CRUD (Create, Read, Update, Delete)

**Permisos que agrega**:
- `{actividad}.crear` → **Crear**
- `{actividad}.leer` → **Leer**
- `{actividad}.actualizar` → **Actualizar**
- `{actividad}.eliminar` → **Eliminar**

**Ejemplo**: Si la actividad se llama "reportes", agrega:
- `reportes.crear` → Crear
- `reportes.leer` → Leer
- `reportes.actualizar` → Actualizar
- `reportes.eliminar` → Eliminar

---

### 3. Ver/Editar
**Descripción**: Agrega el conjunto básico de permisos de visualización y edición

**Permisos que agrega**:
- `{actividad}.ver` → **Ver**
- `{actividad}.editar` → **Editar**

**Ejemplo**: Si la actividad se llama "configuracion", agrega:
- `configuracion.ver` → Ver
- `configuracion.editar` → Editar

---

## Cómo Usar los Macros

### Paso 1: Nombrar la Actividad
Primero escribe el nombre de la actividad en el campo "Actividad". Los macros usarán este nombre como prefijo para los permisos.

### Paso 2: Click en el Macro
Haz click en el macro button que desees. Los permisos se agregarán automáticamente a la lista.

### Paso 3: Personalizar (Opcional)
Puedes modificar los permisos agregados:
- Cambiar el nombre del permiso interno
- Cambiar la etiqueta que verá el usuario
- Eliminar permisos que no necesites
- Agregar permisos adicionales manualmente

## Ventajas de Usar Macros

✅ **Velocidad**: Agrega múltiples permisos con un solo click
✅ **Consistencia**: Nomenclatura uniforme en todo el sistema
✅ **Menos errores**: Reduce errores de tipeo en nombres de permisos
✅ **Flexibilidad**: Puedes modificar los permisos después de agregarlos

## Ejemplo Completo

**Escenario**: Configurar permisos para una actividad de "Facturación"

1. Crear nueva actividad
2. Escribir "facturacion" en el campo Actividad
3. Click en el macro "CRUD"
4. El sistema agrega automáticamente:
   - `facturacion.crear` → Crear
   - `facturacion.leer` → Leer
   - `facturacion.actualizar` → Actualizar
   - `facturacion.eliminar` → Eliminar
5. Opcionalmente, agregar permisos adicionales como:
   - `facturacion.exportar` → Exportar (agregado manualmente)
6. Guardar

## Notas Importantes

- **Prefijo Automático**: Los macros usan el nombre de la actividad (en minúsculas) como prefijo
- **Sin Duplicados**: Si un permiso ya existe, el macro lo agregará de todos modos (puedes eliminar duplicados manualmente)
- **Nomenclatura Estándar**: Los permisos siguen el formato `{actividad}.{accion}`
- **Longitud Máxima**: Recuerda que tanto el permiso como la etiqueta tienen un máximo de 16 caracteres

## Tips de Uso

💡 **Tip 1**: Usa nombres cortos para la actividad si planeas usar macros (ej: "usr" en lugar de "usuarios")

💡 **Tip 2**: Puedes combinar macros. Por ejemplo, usar "Ver/Editar" y luego agregar permisos manualmente

💡 **Tip 3**: Modifica las etiquetas para que sean más descriptivas para tus usuarios finales

💡 **Tip 4**: En modo solo lectura, los macro buttons están ocultos
