# SCH Dialog System Documentation

A lightweight, framework-free dialog system for web pages and PWAs with a modern design and comprehensive functionality.

## Overview

The SCH Dialog System provides a complete set of dialog components and utilities without requiring any CSS or JavaScript frameworks. It features:

- **Modern Design**: Clean, professional appearance with glassmorphism effects
- **Responsive Layout**: Adapts to different screen sizes (max 90-96vw/vh)
- **Accessible**: Keyboard navigation, focus management, and ARIA support
- **Flexible**: Multiple dialog types and customization options
- **Performance**: Lightweight with smooth animations
- **Framework-Free**: Pure HTML, CSS, and JavaScript

## Quick Start

### 1. Include Files

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="base.css">
    <link rel="stylesheet" href="sch_dialog.css">
</head>
<body>
    <!-- Your content -->
    <script src="sch_dialog.js"></script>
</body>
</html>
```

### 2. Basic Usage

```javascript
// Simple alert
await schAlert("Operation completed successfully!");

// Confirmation dialog
try {
    await schConfirm("Are you sure you want to delete this item?");
    console.log("User confirmed");
} catch {
    console.log("User cancelled");
}

// Text input dialog
try {
    const result = await schTextEdit("John Doe", "Full Name", "Edit User");
    console.log("Original:", result.originalValue);
    console.log("New:", result.value);
} catch {
    console.log("Edit cancelled");
}
```

## Core Functions

### schAlert(message, title, icon, button_label, button_icon)

Displays a simple alert dialog with a single OK button.

**Parameters:**
- `message` (string): The alert message to display
- `title` (string, optional): Dialog title (default: "Aviso")
- `icon` (string, optional): UTF-8 icon for title (default: "⚠️")
- `button_label` (string, optional): Button text (default: "Ok")
- `button_icon` (string, optional): UTF-8 icon for button (default: "✓")

**Returns:** `Promise<boolean>` - Resolves to `true` when dialog is closed

**Examples:**
```javascript
// Basic alert
await schAlert("File saved successfully!");

// Custom title and icon
await schAlert("Welcome to the app!", "Welcome", "👋");

// Full customization
await schAlert("Process complete!", "Success", "✅", "Great!", "👍");
```

### schInfo(message, title, icon, button_label, button_icon)

Information dialog wrapper around `schAlert()` with info-specific defaults.

**Parameters:** Same as `schAlert()`
**Defaults:** title="Info", icon="ℹ️"

**Example:**
```javascript
await schInfo("Your session will expire in 5 minutes.");
```

### schError(message, title, icon, button_label, button_icon)

Error dialog wrapper with styled error message box and error-specific defaults.

**Parameters:** Same as `schAlert()`
**Defaults:** title="Error", icon="🔴", button_label="Entendido", button_icon="🔺"

**Example:**
```javascript
await schError("Failed to connect to server. Please try again.");
```

### schConfirm(message, title, icon, okLabel, okIcon, cancelLabel, cancelIcon)

Displays a confirmation dialog with OK/Cancel buttons.

**Parameters:**
- `message` (string): The confirmation message
- `title` (string, optional): Dialog title (default: "Confirme")
- `icon` (string, optional): UTF-8 icon for title (default: "❓")
- `okLabel` (string, optional): OK button text (default: "Si")
- `okIcon` (string, optional): UTF-8 icon for OK button (default: "✓")
- `cancelLabel` (string, optional): Cancel button text (default: "No")
- `cancelIcon` (string, optional): UTF-8 icon for Cancel button (default: "✗")

**Returns:** `Promise<boolean>` - Resolves to `true` on OK, rejects on Cancel/Close/Escape

**Examples:**
```javascript
// Basic confirmation
try {
    await schConfirm("Delete this item?");
    // User confirmed - proceed
} catch {
    // User cancelled
}

// Custom labels
try {
    await schConfirm(
        "Save changes before closing?", 
        "Unsaved Changes", 
        "💾", 
        "Save", "💾", 
        "Discard", "🗑️"
    );
} catch {
    // User chose discard
}
```

### schConfirmBorrar(message, title, icon, okLabel, okIcon, cancelLabel, cancelIcon)

Delete confirmation dialog wrapper with delete-specific defaults.

**Parameters:** Same as `schConfirm()`
**Defaults:** title="Confirme Borrar", icon="🗑️", okLabel="Eliminar", okIcon="🗑️", cancelLabel="Cancelar"

**Example:**
```javascript
try {
    await schConfirmBorrar("This will permanently delete the user account.");
    // Proceed with deletion
} catch {
    // Deletion cancelled
}
```

### schTextEdit(value, label, title, icon, saveLabel, saveIcon, cancelLabel, cancelIcon, type, inputAttrs)

Single field text editing dialog with input validation and clear functionality.

**Parameters:**
- `value` (string, optional): Initial input value (default: "")
- `label` (string, optional): Label text above input (default: "Valor")
- `title` (string, optional): Dialog title (default: "Editar")
- `icon` (string, optional): UTF-8 icon for title (default: "✏️")
- `saveLabel` (string, optional): Save button text (default: "Guardar")
- `saveIcon` (string, optional): UTF-8 icon for save button (default: "💾")
- `cancelLabel` (string, optional): Cancel button text (default: "Cancelar")
- `cancelIcon` (string, optional): UTF-8 icon for cancel button (default: "✗")
- `type` (string, optional): Input type attribute (default: "text")
- `inputAttrs` (object, optional): Additional input attributes (default: {})

**Returns:** `Promise<object>` - Resolves to `{originalValue, value}` on save, rejects on cancel

**Examples:**
```javascript
// Basic text edit
try {
    const result = await schTextEdit("John", "Name", "Edit Name");
    if (result.originalValue !== result.value) {
        console.log("Name changed from", result.originalValue, "to", result.value);
    }
} catch {
    console.log("Edit cancelled");
}

// Email input with validation
try {
    const result = await schTextEdit(
        "user@example.com", 
        "Email Address", 
        "Edit Email", 
        "📧",
        "Save", "💾",
        "Cancel", "✗",
        "email",
        { placeholder: "Enter email address", required: true }
    );
} catch {
    console.log("Email edit cancelled");
}

// Number input
try {
    const result = await schTextEdit(
        "25", 
        "Age", 
        "Edit Age", 
        "🎂",
        "Save", "💾",
        "Cancel", "✗",
        "number",
        { min: 0, max: 120, step: 1 }
    );
} catch {
    console.log("Age edit cancelled");
}
```

## CSS Classes and Styling

### Dialog Base Classes

**`.sch_dialog`** - Base dialog styling with modern appearance and animations
- Rounded corners (12px)
- Multi-layered shadows for depth
- Smooth slide-in animation
- Transparent backdrop (content remains readable)

**`.sch_dialog_grow_content`** - Grid layout for resizable dialogs
- Header/content/footer structure
- Content area grows while header/footer remain fixed
- Enables proper resizing behavior

### Size Variants

**`.sch_dialog--small`** - 400px width
**`.sch_dialog--medium`** - 600px width  
**`.sch_dialog--large`** - 800px width
**`.sch_dialog--fullscreen`** - 95vw × 95vh

### Structure Classes

**`.sch_dialog_header`** - Title bar with gradient background
**`.sch_dialog_title`** - Dialog title styling
**`.sch_dialog_close`** - Close button (×) styling
**`.sch_dialog_content`** - Main content area (scrollable)
**`.sch_dialog_footer`** - Button area at bottom

### Button Classes

**`.sch_dialog_button`** - Base button styling
**`.sch_dialog_button--primary`** - Primary action button (blue)
**`.sch_dialog_button--secondary`** - Secondary action button (gray)
**`.sch_dialog_button--success`** - Success button (green)
**`.sch_dialog_button--outline`** - Outlined button style

### Form Classes

**`.sch_form_group`** - Form field container
**`.sch_form_label`** - Form field label
**`.sch_form_input`** - Text input styling with focus states
**`.sch_input_clear`** - Clear button (×) for inputs

## Advanced Usage

### Custom Dialog Creation

```javascript
// Create custom dialog manually
function createCustomDialog() {
    const dialog = document.createElement('dialog');
    dialog.className = 'sch_dialog sch_dialog--medium sch_dialog_grow_content';
    
    dialog.innerHTML = `
        <div class="sch_dialog_header">
            <h2 class="sch_dialog_title">
                <span style="margin-right: 8px;">⚙️</span>Settings
            </h2>
            <button class="sch_dialog_close" type="button">&times;</button>
        </div>
        <div class="sch_dialog_content">
            <div class="sch_form_group">
                <label class="sch_form_label">Username</label>
                <input class="sch_form_input" type="text" value="john_doe">
            </div>
            <div class="sch_form_group">
                <label class="sch_form_label">Theme</label>
                <select class="sch_form_input">
                    <option>Light</option>
                    <option>Dark</option>
                </select>
            </div>
        </div>
        <div class="sch_dialog_footer">
            <button class="sch_dialog_button sch_dialog_button--secondary">Cancel</button>
            <button class="sch_dialog_button sch_dialog_button--primary">Save</button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    dialog.showModal();
    
    // Add event listeners...
}
```

### Chaining Dialogs

```javascript
async function multiStepProcess() {
    // Step 1: Get user confirmation
    try {
        await schConfirm("Start the setup process?", "Setup", "🚀");
    } catch {
        return; // User cancelled
    }
    
    // Step 2: Get user input
    let username;
    try {
        const result = await schTextEdit("", "Username", "Create Account", "👤");
        username = result.value;
    } catch {
        await schError("Setup cancelled.");
        return;
    }
    
    // Step 3: Show success
    await schInfo(`Account created for ${username}!`, "Success", "✅");
}
```

### Error Handling Patterns

```javascript
async function saveData(data) {
    try {
        // Attempt to save
        await fetch('/api/save', { 
            method: 'POST', 
            body: JSON.stringify(data) 
        });
        
        await schInfo("Data saved successfully!", "Success", "✅");
    } catch (error) {
        await schError(`Failed to save: ${error.message}`);
    }
}

async function deleteWithConfirmation(itemId) {
    try {
        await schConfirmBorrar("This action cannot be undone.");
        
        // Proceed with deletion
        await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
        
        await schInfo("Item deleted successfully.", "Deleted", "🗑️");
    } catch {
        // User cancelled or error occurred
        console.log("Deletion cancelled or failed");
    }
}
```

## Color System

The SCH Dialog System uses CSS custom properties for theming:

### Primary Colors
- `--color-primary`: Main brand color (#00008b - dark blue)
- `--color-secondary`: Complementary color (#4682b4 - steel blue)
- `--color-tertiary`: Supporting color (#708090 - slate gray)

### Status Colors
- `--color-success`: Success actions (#28a745 - green)
- `--color-info`: Informational messages (#17a2b8 - teal)
- `--color-warning`: Caution messages (#ffc107 - amber)
- `--color-fail`: Error states (derived from usage)

### Neutral Colors
- `--color-text`: Primary text (#212529)
- `--color-text-light`: Secondary text (#6c757d)
- `--color-text-muted`: Disabled text (#adb5bd)
- `--color-surface`: Dialog background (#ffffff)
- `--color-border`: Standard borders (#dee2e6)

## Accessibility Features

### Keyboard Navigation
- **Escape**: Closes any open dialog
- **Enter**: Activates focused button (in text edit dialogs)
- **Tab**: Navigates between interactive elements

### Focus Management
- Dialogs automatically focus the primary action button
- Text inputs auto-select content for easy editing
- Focus returns to triggering element when dialog closes

### Screen Reader Support
- Proper ARIA labels on clear buttons
- Semantic HTML structure
- Descriptive button text and icons

## Browser Support

- **Modern Browsers**: Full support (Chrome 37+, Firefox 98+, Safari 15.4+)
- **Dialog Element**: Uses native `<dialog>` element with `showModal()`
- **CSS Grid**: Required for layout (IE11+ with prefixes)
- **CSS Custom Properties**: Required for theming (IE11+ with PostCSS)

## Performance Notes

- **Lightweight**: ~15KB total (CSS + JS uncompressed)
- **No Dependencies**: Framework-free implementation
- **Efficient**: Dialogs are created/destroyed on demand
- **Smooth Animations**: GPU-accelerated transforms
- **Memory Safe**: Automatic cleanup prevents memory leaks

## Common Patterns

### Form Validation
```javascript
async function editUserProfile(user) {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
        try {
            const result = await schTextEdit(
                user.name, 
                "Full Name", 
                "Edit Profile", 
                "👤"
            );
            
            if (!result.value.trim()) {
                await schError("Name cannot be empty.");
                attempts++;
                continue;
            }
            
            // Valid input - proceed
            user.name = result.value;
            await schInfo("Profile updated!", "Success", "✅");
            break;
            
        } catch {
            // User cancelled
            break;
        }
    }
    
    if (attempts >= maxAttempts) {
        await schError("Too many invalid attempts.");
    }
}
```

### Progressive Enhancement
```javascript
// Fallback for browsers without dialog support
function createDialog() {
    if (typeof HTMLDialogElement === 'function') {
        // Use SCH Dialog System
        return schAlert("Modern dialog!");
    } else {
        // Fallback to basic alert
        alert("Basic alert fallback");
        return Promise.resolve(true);
    }
}
```

This documentation covers the complete SCH Dialog System functionality. The system provides a professional, accessible dialog solution without requiring any external frameworks while maintaining modern web standards and excellent user experience.