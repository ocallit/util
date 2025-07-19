
function sch_dialog_init() {
    // Close only .sch_dialog dialogs with Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const openDialog = document.querySelector('dialog.sch_dialog[open]');
            if (openDialog) {
                openDialog.close();
            }
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sch_dialog_init);
} else {
    sch_dialog_init();
}

console.log("___________sch_dialog installed");
