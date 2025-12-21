
/*
// Somewhere after the table is created:
swapRolesActivitiesAndSort(myTabulatorInstance, {
    rolesField: "roles",
    activitiesField: "activities",
    sortDir: "asc",   // or "desc"
});
duda use movableColumns: true, // Enable column reordering true will cause to the column to be placed after the target column, a value of false will result in the column being placed before the target
 */
/**
 * Swap "Roles" and "Activities" columns and sort by the left-most of them.
 *
 * @param {Tabulator} table          Tabulator 6.x instance
 * @param {object}    opts
 * @param {string}    [opts.rolesField="roles"]      field name for Roles column
 * @param {string}    [opts.activitiesField="activities"] field name for Activities column
 * @param {string}    [opts.sortDir="asc"]           "asc" or "desc"
 */
function swapRolesActivitiesAndSort(table, opts = {}) {
    const rolesField      = opts.rolesField      || "roles";
    const activitiesField = opts.activitiesField || "activities";
    const sortDir         = opts.sortDir         || "asc";

    // Helper: find column by field first, else by title ("Roles"/"Activities")
    function findColumn(fieldName, titleFallback) {
        let col = table.getColumn(fieldName); // by field
        if (col) return col;

        const cols = table.getColumns(); // visible data columns in current order :contentReference[oaicite:2]{index=2}
        return cols.find(c => {
            const def = c.getDefinition();
            return def && def.title === titleFallback;
        }) || null;
    }

    const rolesCol      = findColumn(rolesField, "Roles");
    const activitiesCol = findColumn(activitiesField, "Activities");

    if (!rolesCol || !activitiesCol) {
        console.warn("swapRolesActivitiesAndSort: could not find both Roles and Activities columns");
        return;
    }

    // Current order indexes
    let cols = table.getColumns();
    const rolesIndex      = cols.indexOf(rolesCol);
    const activitiesIndex = cols.indexOf(activitiesCol);

    if (rolesIndex === -1 || activitiesIndex === -1) {
        console.warn("swapRolesActivitiesAndSort: columns not found in visible column list");
        return;
    }

    // Swap them: move the one currently on the left to after the one on the right
    if (rolesIndex < activitiesIndex) {
        // Roles is left-most -> move Roles AFTER Activities
        table.moveColumn(rolesCol, activitiesCol, true);
    } else if (activitiesIndex < rolesIndex) {
        // Activities is left-most -> move Activities AFTER Roles
        table.moveColumn(activitiesCol, rolesCol, true);
    } else {
        // same index? weird, but nothing to do
    }

    // After the move, recompute order to know which is now left-most:
    cols = table.getColumns();
    const newRolesIndex      = cols.indexOf(rolesCol);
    const newActivitiesIndex = cols.indexOf(activitiesCol);

    const leftMostCol =
        newRolesIndex < newActivitiesIndex ? rolesCol : activitiesCol;

    const sortField = leftMostCol.getField();
    if (!sortField) {
        console.warn("swapRolesActivitiesAndSort: left-most column has no field to sort on");
        return;
    }

    // Sort by the first (left-most) of the two columns after swap
    table.setSort(sortField, sortDir);
}
