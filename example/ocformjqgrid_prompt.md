# Create OcFormJqGrid - jqGrid Card Reader using OcFormReadOnly

## Requirements:

Create a JavaScript function `OcFormJqGrid` that integrates jqGrid with OcFormReadOnly to display individual grid rows as navigable cards.

## Function Signature:
```javascript
async function OcFormJqGrid(jqGridSelector, htmlFormElement, rowId, options = {})
```

### Parameters:
- **`jqGridSelector`** (string) - jQuery selector for the jqGrid (e.g., "#myGrid")
- **`htmlFormElement`** (HTMLElement) - DOM element containing the form template for displaying row data
- **`rowId`** (string|number) - Initial row ID to display
- **`options`** (object) - Configuration options:
  - `title` (string) - Dialog title template (default: "Row Details")
  - `titleField` (string) - Column name to use in title (default: first visible column)
  - `keepForm` (boolean) - Whether to preserve form element (default: true)
  - `onNavigate` (function) - Custom navigation handler (optional)

## Core Functionality:

### 1. **Data Extraction from jqGrid:**
- Get formatted cell data using jqGrid's formatters
- Extract row number/position in current view
- Get column model information for proper field mapping
- Handle both local and remote data scenarios

### 2. **Form Population:**
- Map jqGrid column names to form element IDs
- Use the same ID mapping as OcFormReadOnly expects (`id="columnName"`)
- Apply proper formatting (dates, numbers, currencies, etc.)
- Handle special column types (checkboxes, select lists, custom formatters)

### 3. **Navigation Callback:**
- Implement next/previous row navigation within current grid view
- Handle filtered/searched results correctly
- Wrap around at beginning/end of grid
- Update dialog title with new row information
- Handle cases where next/previous row doesn't exist

### 4. **Integration Requirements:**
- Use the updated OcFormReadOnly class
- Handle the new OcDialog return format `{promise, dialog}`
- Provide smooth navigation without dialog close/reopen
- Support both visible and hidden columns
- Handle jqGrid pagination correctly

## Implementation Details:

### Form Template Structure:
The HTML form should contain elements with IDs matching jqGrid column names:
```html
<div class="row-card">
    <div class="field"><label>Name:</label><div id="name"></div></div>
    <div class="field"><label>Email:</label><div id="email"></div></div>
    <div class="field"><label>Date:</label><div id="created_date"></div></div>
</div>
```

### Navigation Logic:
- Get all visible row IDs from current grid state
- Find current row position in visible rows
- Navigate to next/previous position
- Handle edge cases (first/last row, filtered results)
- Update title dynamically based on row content

### Error Handling:
- Validate jqGrid exists and is initialized
- Handle missing rowId gracefully
- Provide fallback for navigation at grid boundaries
- Handle empty grids or no matching rows

## Expected Usage:
```javascript
// Basic usage
await OcFormJqGrid("#productGrid", formElement, "P001");

// With options
await OcFormJqGrid("#productGrid", formElement, "P001", {
    title: "Product Details",
    titleField: "product_name",
    onNavigate: (direction, currentRowId) => {
        console.log(`Navigating ${direction} from row ${currentRowId}`);
    }
});
```

## Deliverables:
1. Complete `OcFormJqGrid` function implementation
2. Navigation callback function for next/previous rows
3. Helper functions for jqGrid data extraction and formatting
4. Example usage with a sample jqGrid
5. Error handling for edge cases

## Context Information:

### Updated OcDialog Structure:
OcDialog.dialog() now returns an object:
```javascript
const result = OcDialog.dialog({...});
// result = {
//   promise: Promise,
//   dialog: HTMLDialogElement,
//   close: () => {},
//   updateTitle: (title) => {}
// }
```

### Updated OcFormReadOnly Usage:
```javascript
const formReader = new OcFormReadOnly();
const dialogResult = OcDialog.dialog({
    title: title,
    html: formElement,
    buttons: buttons,
    keepHtml: keepForm
});

// Store references
formReader.currentDialog = dialogResult.promise;
formReader.dialogElement = dialogResult.dialog;
```

### Navigation Button Configuration:
Buttons that should NOT close the dialog:
```javascript
buttons: [
    {
        label: '⬅️ Anterior',
        class: 'sch_dialog_button--secondary',
        callback: async(e) => {
            await handleNavigation('prev', e.target);
        }
        // NO promise_resolve or promise_reject = stays open
    },
    {
        label: '➡️ Siguiente',
        class: 'sch_dialog_button--primary', 
        callback: async(e) => {
            await handleNavigation('next', e.target);
        }
        // NO promise_resolve or promise_reject = stays open
    }
]
```

## Focus Areas:
1. **Clean jqGrid integration** - Handle jqGrid's data and formatting properly
2. **Smooth navigation** - No dialog closing/reopening during navigation
3. **Robust error handling** - Handle edge cases gracefully
4. **Reusable design** - Work with any jqGrid configuration
5. **Performance** - Efficient data extraction and form updates

Focus on clean, reusable code that works seamlessly with the existing OcFormReadOnly functionality and handles jqGrid's complexities gracefully.