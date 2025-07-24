

# One-liner "copy" for the widget:

"Effortlessly manage and assign categories to your entities with dynamic drag-and-drop and intuitive CRUD capabilities."

# Good description of the widget's intent (for prompt):

"The widget is a two-column, drag-and-drop interface for assigning categories to entities (e.g., products, clients). The left column displays currently assigned categories, and the right column shows available categories. Users can move categories between lists, and the widget synchronizes its state with a hidden HTML <select multiple> element for form submission. It includes search/filter functionality and buttons for managing categories (add, edit, delete) via a modal dialog system. Categories can have customizable properties defined by administrators, which are then displayed and editable for backend users at the record level."

## Good description of the mock fetch (for prompt):

"The provided JavaScript includes a mock fetch implementation that intercepts requests to catego/ajax.php. This mock API simulates backend interactions for listing, adding, updating (upserting), and deleting categories. It maintains in-memory mock data for different category_types (e.g., 'clientes', 'productos', 'servicios') and returns JSON responses mimicking a real server, including oc_category_id, category, and category_data (which can contain properties_meta or specific record-level property values). For upsert operations, it expects category_type, category, and optionally oc_category_id and category_data_json (for property definitions) or individual property fields (for external forms)."


# To Do


1. checar document ready pattern (*.html/*.php del front end)
2. Consider supporting a “disabled” state to lock interaction from external state (catego.js)
3. Consider supporting read only (catego.js)
4. add .oc_catego_crud_categories_list::-webkit-scrollbar (categ.css)
5. catego_crud.html duda ❗Dialog open methods (ocCategoCRUD.openDialog(...)) could support a widget ref instead of just categoryType, to fully integrate?
-- ----------
We want to have "categorize entity" widget , and make it better step by step
## Restrictions
- it is only for the browser or PWA
- there may be more than 1 widget in the page
- javscript ES6 early, no frameworks
- css, no frameworks
- html5 avoid shadow dom
- Aim for reasonable backwards compatibility but include the problematic IOS, Mac, and Safari with IOS or Mac
- use Sortable.js and the provided css and javascript files
- take advantage of Sortable.js functions, methods and properties as well as the provided css and javascript files
- do not refractor nor change existing code unless asked to or needed for the requested task
- simple, direct easy to read, easy to mantain code
- do not add id's to the widget element's if really needed ask me
- add the javascript for the widget in the widget's class or object
- prefix any css with oc_catego_ and addit to the .css file
- the backend chan easily send html strucure required with the data-xxx set
- all data- write the keys in lower case with _ (underscore). DO NOT USE UPPER CASE NOR - (middle hyphen) to fulfill coding standards
- only code the backend when asked to
- the backend is in php 8.4 no framworks! use the provided libraries

## Development steps

### Phase 1

(see catego.html) This widget will have a 
1. frontend using a nice interface with Sortable.js when editing the entity the user can select the categories that belong to this record. the widget stores the selection in a hidden multiselect and the save form is as before.
2. the widget takes the possible values from the linked select


### Phase 2

(see oc_catego_crud_html.html) The user, with permission controlled by the backend, can do create, update, delete the possible categories
it starts testing and thinking on phase 3 that is data to show the user on a given category and phase 4 that will be an input when assigning the client with that category

## Study,understand the code and the phases
- Provide feedback and a code review






