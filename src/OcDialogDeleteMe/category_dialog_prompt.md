# 🏷️ Advanced Category Management Dialog System

Please create a sophisticated, production-ready category management dialog system with the following specifications:

## 📋 Core Requirements

- **Database Integration**: MySQL table `categoria` with fields: `categoria_id`, `de` (classification type), `categoria` (name), timestamps, and audit fields
- **AJAX Operations**: Support for `action=list/add/edit/delete` with `de` parameter for classification filtering
- **Tom Select Integration**: Seamlessly update Tom Select dropdown while preserving current selections

## 🎨 User Experience Design

- **Inline Editing**: Direct text editing within the category list (no popup-within-popup)
- **Real-time Validation**: Instant feedback as users type, with visual error indicators
- **Visual State Management**: Color-coded borders for modified (yellow), new (blue), and error (red) states
- **Unsaved Changes Protection**: Warning system before closing with pending modifications

## 🔧 Advanced Features

- **Smart Text Sanitization**: Auto-trim, normalize spaces, remove line breaks/tabs
- **Duplicate Prevention**: Case and accent-insensitive duplicate detection using Unicode normalization
- **Memory Management**: Proper event listener cleanup to prevent memory leaks
- **Batch Operations**: Allow multiple edits before saving, with individual save buttons per item

## ⚡ Technical Implementation

- **Framework**: Vanilla JavaScript using existing OcDialog system
- **CSS Integration**: Use provided SCH design system with elevation shadows and color variables
- **State Management**: Maintain separate arrays for current vs. original data
- **Error Handling**: Graceful server error display with user-friendly messages

## 🧪 Development Features

- **Mock Data System**: Include test data and simulated network delays for development
- **Console Logging**: Track all Tom Select operations and server calls for debugging
- **Preview Page**: Create complete HTML demo with testing instructions
- **Production Comments**: Clear separation between mock and real implementation code

## 🎯 Validation Rules

1. **Text Normalization**: Convert multiple spaces to single, remove `\r\n\t` characters
2. **Duplicate Detection**: Prevent duplicate category names (accent/case insensitive)
3. **Empty Validation**: Require at least one non-blank character

## 🔄 Tom Select Behavior

- **Selection Preservation**: Keep currently selected categories when editing names
- **Deletion Handling**: Remove deleted categories from selection automatically
- **Option Updates**: Refresh dropdown options after each save/delete operation

## 💫 Polish Requirements

- **Smooth Animations**: CSS transitions for state changes
- **Loading States**: Visual feedback during save operations
- **Success Indicators**: Brief confirmation messages after successful operations
- **Keyboard Support**: Enter to save, Escape handling, proper focus management

## 📝 Database Schema

```sql
CREATE TABLE categoria(
    categoria_id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    de VARCHAR(32) NOT NULL COMMENT 'que clasifica: color,producto,cliente...',
    categoria VARCHAR(191) NOT NULL,
    UNIQUE KEY categoria_unica_de(de, categoria),
    alta_db DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    alta_por VARCHAR(16) NOT NULL DEFAULT 'sistema',
    ultimo_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_cambio_por VARCHAR(16) NOT NULL DEFAULT 'sistema'
)
```

## 🔌 Function Signature

```javascript
/**
 * Category Management Dialog
 * @param {HTMLElement} tom_select_element - The Tom Select element to update
 * @param {string} de - Classification type (e.g., 'color', 'producto', 'cliente')
 * @param {number} record_id - ID of the current record
 */
async function category(tom_select_element, de, record_id)
```

## 🌐 Server API Endpoints

- **List**: `action=list&de=color` → Returns `{data: [{categoria_id, categoria, de, alta_db}, ...]}`
- **Add**: `action=add&de=color&categoria=Red` → Returns `{categoria_id: 123}`
- **Edit**: `action=edit&categoria_id=123&categoria=Dark Red` → Returns success
- **Delete**: `action=delete&categoria_id=123` → Returns success

## 🧪 Testing Scenarios

1. **Edit existing category** → Type duplicate name → See real-time validation
2. **Add new category** → Clear field → See empty validation error
3. **Make changes** → Try to close → See unsaved changes warning
4. **Save changes** → Watch console for Tom Select updates
5. **Delete category** → Confirm deletion → Verify Tom Select refresh

## 🎁 Deliverables

Please build this as a complete, copy-paste ready solution with:

1. **Main JavaScript Function**: Complete `category()` function with all features
2. **HTML Preview Page**: Beautiful demo page with testing instructions
3. **Production Comments**: Clear separation between mock and real code
4. **Testing Framework**: Mock data and console logging for development
5. **Documentation**: Detailed comments explaining architecture

## 🚀 Production Deployment

Include clear instructions for:
- Replacing mock functions with real AJAX calls
- Removing test/demo code
- Integration steps with existing Tom Select elements
- Error handling best practices

---

*This prompt will recreate the entire sophisticated category management system with all its advanced features, polish, and production-ready architecture!*