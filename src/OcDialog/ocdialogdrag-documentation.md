# OcDialogDrag.js - Stateless Dialog Drag System

A lightweight, memory-leak-free JavaScript library for adding drag & drop behavior to dialog elements. No global state, no dependencies, pure vanilla JavaScript.

## Features

- ✅ **Stateless Design** - No global variables or persistent state
- ✅ **Memory Leak Prevention** - Proper cleanup of event listeners
- ✅ **Touch & Mouse Support** - Works on desktop and mobile devices
- ✅ **Viewport Constraints** - Prevents dialogs from being dragged off-screen
- ✅ **Selective Dragging** - Only headers act as drag handles
- ✅ **Button Protection** - Buttons and inputs don't trigger drag

## Quick Start

### HTML Structure
Your dialog must have a header with the class `sch_dialog_header` or similar:

```html
<dialog class="my-dialog">
    <div class="my-dialog-content">
        <div class="my-header sch_dialog_header">
            <h2>Dialog Title</h2>
            <button class="close-btn">×</button>
        </div>
        <div class="my-content">
            Dialog content here
        </div>
    </div>
</dialog>
```

### JavaScript Usage

```javascript
// Initialize drag behavior
const dialogContent = document.querySelector('.my-dialog-content');
OcDialogDrag.initialize(dialogContent);

// Clean up when done (prevents memory leaks)
OcDialogDrag.cleanup(dialogContent);
```

## API Reference

### Methods

#### `OcDialogDrag.initialize(dialog)`
Enables drag behavior for a dialog element.

**Parameters:**
- `dialog` (HTMLElement) - The dialog container element to make draggable

**Returns:** `void`

**Example:**
```javascript
const dialog = document.querySelector('.my-dialog-content');
OcDialogDrag.initialize(dialog);
```

#### `OcDialogDrag.cleanup(dialog)`
Removes drag behavior and cleans up event listeners.

**Parameters:**
- `dialog` (HTMLElement) - The dialog element to clean up

**Returns:** `void`

**Example:**
```javascript
OcDialogDrag.cleanup(dialog);
```

#### `OcDialogDrag.centerDialog(dialog)`
Centers a dialog in the viewport.

**Parameters:**
- `dialog` (HTMLElement) - The dialog element to center

**Returns:** `void`

**Example:**
```javascript
OcDialogDrag.centerDialog(dialog);
```

## CSS Classes Expected

The drag system looks for specific CSS class patterns:

### Required Classes
- **`.sch_dialog_header`** - The draggable header element
- **`.sch_dialog_close`** - Close button (drag is disabled on these)

### Applied Classes During Drag
- **`.sch_dialog_dragging`** - Applied to both dialog and header during drag

### Example CSS
```css
/* Base dialog styles */
.my-dialog-content {
    position: fixed;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

/* Header should indicate it's draggable */
.sch_dialog_header {
    cursor: grab;
    padding: 16px;
    border-bottom: 1px solid #eee;
}

/* During drag state */
.sch_dialog_dragging {
    user-select: none;
    -webkit-user-select: none;
}

.sch_dialog_header.sch_dialog_dragging {
    cursor: grabbing !important;
}
```

## Implementation Examples

### Basic Dialog with Drag
```javascript
class MyDialog {
    constructor() {
        this.dialog = null;
    }

    create() {
        this.dialog = document.createElement('dialog');
        this.dialog.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-header sch_dialog_header">
                    <h2>My Dialog</h2>
                    <button class="sch_dialog_close">×</button>
                </div>
                <div class="dialog-body">
                    Content goes here
                </div>
            </div>
        `;
        
        document.body.appendChild(this.dialog);
        
        // Enable drag
        const content = this.dialog.querySelector('.dialog-content');
        OcDialogDrag.initialize(content);
    }

    destroy() {
        if (this.dialog) {
            // Clean up drag behavior first
            const content = this.dialog.querySelector('.dialog-content');
            OcDialogDrag.cleanup(content);
            
            // Remove from DOM
            this.dialog.remove();
            this.dialog = null;
        }
    }
}
```

### React Component Example
```jsx
import { useEffect, useRef } from 'react';

function DraggableDialog({ isOpen, onClose, children }) {
    const dialogRef = useRef(null);
    const contentRef = useRef(null);

    useEffect(() => {
        if (isOpen && contentRef.current) {
            // Enable drag when dialog opens
            OcDialogDrag.initialize(contentRef.current);
            OcDialogDrag.centerDialog(contentRef.current);
        }

        return () => {
            // Cleanup when component unmounts or dialog closes
            if (contentRef.current) {
                OcDialogDrag.cleanup(contentRef.current);
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <dialog ref={dialogRef} open>
            <div ref={contentRef} className="dialog-content">
                <div className="dialog-header sch_dialog_header">
                    <h2>Draggable Dialog</h2>
                    <button 
                        className="sch_dialog_close" 
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>
                <div className="dialog-body">
                    {children}
                </div>
            </div>
        </dialog>
    );
}
```

### Multiple Dialogs
```javascript
class DialogManager {
    constructor() {
        this.dialogs = new Set();
    }

    createDialog(config) {
        const dialog = this.buildDialog(config);
        const content = dialog.querySelector('.dialog-content');
        
        // Enable drag
        OcDialogDrag.initialize(content);
        OcDialogDrag.centerDialog(content);
        
        // Track for cleanup
        this.dialogs.add({ element: dialog, content });
        
        return dialog;
    }

    destroyAll() {
        this.dialogs.forEach(({ element, content }) => {
            OcDialogDrag.cleanup(content);
            element.remove();
        });
        this.dialogs.clear();
    }
}
```

## Behavior Details

### Drag Constraints
- **Viewport Boundaries:** Dialogs cannot be dragged outside viewport (20px padding)
- **Header Only:** Only elements with `sch_dialog_header` class act as drag handles
- **Button Protection:** Clicks on buttons, inputs, selects, textareas, and links don't trigger drag

### Touch Support
- **Single Touch:** Only single-touch gestures trigger drag
- **Touch Threshold:** Prevents accidental drags on touch devices
- **Passive Events:** Optimized for smooth touch performance

### Memory Management
- **No Global State:** Each dialog maintains its own drag state
- **Automatic Cleanup:** Event listeners are properly removed
- **Garbage Collection:** No circular references or memory leaks

## Browser Compatibility

- **Modern Browsers:** Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile Support:** iOS Safari, Chrome Mobile, Samsung Internet
- **Touch Events:** Full support for touch-enabled devices

## Troubleshooting

### Common Issues

#### Drag Not Working
```javascript
// Check if header class is correct
const header = dialog.querySelector('.sch_dialog_header');
if (!header) {
    console.error('No .sch_dialog_header found');
}

// Ensure dialog is initialized
OcDialogDrag.initialize(dialog);
```

#### Memory Leaks
```javascript
// Always cleanup when removing dialogs
function removeDialog(dialog) {
    const content = dialog.querySelector('.dialog-content');
    OcDialogDrag.cleanup(content); // ← Don't forget this!
    dialog.remove();
}
```

#### Drag Handle Not Visible
```css
.sch_dialog_header {
    cursor: grab; /* Show grab cursor */
}

.sch_dialog_header.sch_dialog_dragging {
    cursor: grabbing !important; /* Show grabbing cursor */
}
```

### Performance Tips

1. **Initialize Only When Needed:** Don't initialize drag for dialogs that don't need it
2. **Cleanup Properly:** Always call `cleanup()` when removing dialogs
3. **Avoid Nested Draggables:** Don't nest draggable elements inside each other
4. **CSS Transitions:** Disable transitions during drag for smoother movement

## Integration with Popular UI Libraries

### Bootstrap Modals
```javascript
$('#myModal').on('shown.bs.modal', function() {
    const content = this.querySelector('.modal-content');
    OcDialogDrag.initialize(content);
});

$('#myModal').on('hidden.bs.modal', function() {
    const content = this.querySelector('.modal-content');
    OcDialogDrag.cleanup(content);
});
```

### Material-UI Dialogs
```jsx
// Add to Dialog component
useEffect(() => {
    const content = dialogRef.current?.querySelector('.MuiPaper-root');
    if (open && content) {
        OcDialogDrag.initialize(content);
    }
    return () => content && OcDialogDrag.cleanup(content);
}, [open]);
```

## Best Practices

1. **Always Cleanup:** Call `cleanup()` when removing dialogs
2. **Use Semantic HTML:** Proper dialog structure improves accessibility
3. **Test Touch Devices:** Verify behavior on mobile/tablet devices
4. **CSS Cursors:** Provide visual feedback with appropriate cursors
5. **Error Handling:** Check for required elements before initializing

## License & Credits

This is a utility library designed for internal project use. The stateless design ensures compatibility with modern JavaScript frameworks while maintaining performance and preventing memory leaks.