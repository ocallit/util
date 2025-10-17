# OcCategoUI Widget

A JavaScript widget for adding edit functionality to Tom Select dropdowns. Allows users to add, edit, and delete options through a jQuery UI dialog interface.

## Features

- ✅ Add, edit, and delete options from Tom Select dropdowns
- ✅ Search existing options in the edit dialog
- ✅ Preserves user selections when options are modified
- ✅ Multiple independent widgets on the same page
- ✅ AJAX communication with backend for persistence
- ✅ No central management - each widget is completely independent
- ✅ Auto-initialization via data attributes
- ✅ Manual initialization via JavaScript
- ✅ Responsive design with mobile support

## Installation

### Required Dependencies

1. **jQuery** (3.7.1+)
2. **jQuery UI** (1.13.2+) 
3. **Tom Select** (2.4.3+)

### Include Files

```html
<!-- Dependencies -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js"></script>
<link rel="stylesheet" href="https://code.jquery.com/ui/1.13.2/themes/ui-lightness/jquery-ui.css">

<link href="https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/css/tom-select.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/js/tom-select.complete.min.js"></script>

<!-- OcCategoUI -->
<link rel="stylesheet" href="OcCategoUI.css">
<script src="OcCategoUI.js"></script>
```

## Usage

### Method 1: Auto-Initialization (Recommended)

Add `data-occategoui` attribute to your select element:

```html
<select id="categories" multiple 
        data-occategoui 
        data-occategoui-title="Edit Categories" 
        data-occategoui-apiurl="./api/categories.php">
    <option value="1">Electronics</option>
    <option value="2">Clothing</option>
    <option value="3">Books</option>
</select>
```

The widget will automatically initialize when the DOM loads.

### Method 2: Manual Initialization

```javascript
// Initialize Tom Select first
const tomSelect = new TomSelect('#categories', {
    plugins: ['remove_button'],
    create: false
});

// Then create OcCategoUI widget
const widget = window.OcCategoUI_createWidget(
    document.getElementById('categories'),
    {
        apiUrl: './api/categories.php',
        dialogTitle: 'Edit Categories',
        confirmDelete: true
    }
);
```

### Method 3: Class Instantiation

```javascript
const widget = new OcCategoUI_(selectElement, {
    apiUrl: './api/categories.php',
    dialogTitle: 'Edit Categories'
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | String | `'./api/categories.php'` | Backend API endpoint |
| `dialogTitle` | String | `'Edit Options'` | Dialog window title |
| `confirmDelete` | Boolean | `true` | Show confirmation before deleting |

### Data Attributes

| Attribute | Description |
|-----------|-------------|
| `data-occategoui` | Enables auto-initialization |
| `data-occategoui-apiurl` | Sets the API URL |
| `data-occategoui-title` | Sets the dialog title |

## Backend API Requirements

Your backend API must handle three actions via POST requests:

### Add New Option

**Request:**
```javascript
{
    action: 'add',
    value: 'new_value',
    text: 'Display Text'
}
```

**Response:**
```javascript
{
    success: true,
    error: null,
    data: {
        id: 'new_id' // Optional: return new ID if different from value
    }
}
```

### Update Existing Option

**Request:**
```javascript
{
    action: 'update',
    id: 'option_value',
    text: 'Updated Display Text'
}
```

**Response:**
```javascript
{
    success: true,
    error: null,
    data: null
}
```

### Delete Option

**Request:**
```javascript
{
    action: 'delete',
    id: 'option_value'
}
```

**Response:**
```javascript
{
    success: true,
    error: null,
    data: null
}
```

### Error Response

```javascript
{
    success: false,
    error: 'Error message here',
    data: null
}
```

## PHP Backend Example

See the included `categories_api.php` for a complete PHP implementation using the project's SQL executor and query builder.

## CSS Customization

The widget uses SCH Color Scheme variables. Customize by overriding CSS variables:

```css
:root {
    --color-primary: #your-color;
    --color-secondary: #your-color;
    --color-accent: #your-color;
}
```

Or target specific classes:

```css
.OcCategoUI_editButton {
    background: #custom-color;
}

.OcCategoUI_dialog {
    font-family: 'Your Custom Font';
}
```

## Multiple Widgets

Each widget instance is completely independent:

```html
<!-- Widget 1 -->
<select id="categories" data-occategoui data-occategoui-apiurl="./api/categories.php">
    <!-- options -->
</select>

<!-- Widget 2 -->
<select id="tags" data-occategoui data-occategoui-apiurl="./api/tags.php">
    <!-- options -->
</select>

<!-- Widget 3 -->
<select id="priorities" data-occategoui data-occategoui-apiurl="./api/priorities.php">
    <!-- options -->
</select>
```

## Methods

### Public Methods

```javascript
// Destroy the widget
widget.destroy();

// Manually open dialog
widget.openDialog();
```

## Events and Callbacks

The widget preserves Tom Select selections automatically. All Tom Select events continue to work normally.

## Browser Support

- Modern browsers supporting ES6+ 
- Internet Explorer 11+ (with polyfills)
- Mobile browsers with touch support

## Troubleshooting

### Widget not appearing
- Ensure jQuery, jQuery UI, and Tom Select are loaded before OcCategoUI
- Check that SCH color variables are defined
- Verify the select element exists when initializing

### AJAX errors
- Check that your API endpoint returns proper JSON responses
- Verify CORS headers if making cross-domain requests
- Ensure your API handles the three required actions

### Tom Select not updating
- Make sure Tom Select is initialized before OcCategoUI
- The widget automatically calls `tomselect.sync()` after updates

## License

This widget follows the project's licensing terms and conventions.

## Version History

- **1.0.0** - Initial release with full CRUD functionality