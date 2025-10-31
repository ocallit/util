// Stateless Dialog Drag System - No global state, no memory leaks
var DialogItDrag = {
    // Initialize drag for a single dialog
    initialize(dialog) {
        if (!dialog || dialog.hasAttribute('data-sch-drag-enabled')) return;

        dialog.setAttribute('data-sch-drag-enabled', 'true');
        dialog.addEventListener('mousedown', DialogItDrag.handleMouseDown);
        dialog.addEventListener('touchstart', DialogItDrag.handleTouchStart, { passive: false });
    },

    // Cleanup drag for a single dialog
    cleanup(dialog) {
        if (!dialog) return;

        dialog.removeAttribute('data-sch-drag-enabled');
        dialog.removeEventListener('mousedown', DialogItDrag.handleMouseDown);
        dialog.removeEventListener('touchstart', DialogItDrag.handleTouchStart);

        // Clear any stored drag state
        delete dialog._schDragState;
    },

    handleMouseDown(e) {
        DialogItDrag.startDrag(e, e.clientX, e.clientY);
    },

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            DialogItDrag.startDrag(e, touch.clientX, touch.clientY);
        }
    },

    startDrag(e, clientX, clientY) {
        const header = e.target.closest('.ocdialog_header');
        if (!header) return;

        if (e.target.closest('.ocdialog_close, button, input, select, textarea, a')) {
            return;
        }

        const dialog = header.closest('.ocdialog');
        if (!dialog) return;

        e.preventDefault();
        e.stopPropagation();

        const rect = dialog.getBoundingClientRect();

        // Store drag state on the dialog element itself
        dialog._schDragState = {
            isDragging: true,
            startX: clientX,
            startY: clientY,
            startLeft: rect.left,
            startTop: rect.top,
            header: header
        };

        dialog.classList.add('ocdialog_dragging');
        header.classList.add('ocdialog_dragging');

        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        if (!dialog.style.left || !dialog.style.top) {
            dialog.style.left = rect.left + 'px';
            dialog.style.top = rect.top + 'px';
            dialog.style.position = 'fixed';
            dialog.style.margin = '0';
        }

        // Add document listeners with bound context
        document.addEventListener('mousemove', DialogItDrag.createBoundHandler(dialog, 'handleMouseMove'));
        document.addEventListener('touchmove', DialogItDrag.createBoundHandler(dialog, 'handleTouchMove'), { passive: false });
        document.addEventListener('mouseup', DialogItDrag.createBoundHandler(dialog, 'handleMouseUp'));
        document.addEventListener('touchend', DialogItDrag.createBoundHandler(dialog, 'handleTouchEnd'));
        document.addEventListener('mouseleave', DialogItDrag.createBoundHandler(dialog, 'handleMouseUp'));
    },

    createBoundHandler(dialog, method) {
        return function(e) {
            DialogItDrag[method](e, dialog);
        };
    },

    handleMouseMove(e, dialog) {
        DialogItDrag.updateDrag(e.clientX, e.clientY, dialog);
    },

    handleTouchMove(e, dialog) {
        if (dialog._schDragState?.isDragging && e.touches.length === 1) {
            e.preventDefault();
            const touch = e.touches[0];
            DialogItDrag.updateDrag(touch.clientX, touch.clientY, dialog);
        }
    },

    updateDrag(clientX, clientY, dialog) {
        const dragState = dialog._schDragState;
        if (!dragState?.isDragging) return;

        const deltaX = clientX - dragState.startX;
        const deltaY = clientY - dragState.startY;
        const newLeft = dragState.startLeft + deltaX;
        const newTop = dragState.startTop + deltaY;

        const padding = 20;
        const maxLeft = window.innerWidth - dialog.offsetWidth - padding;
        const maxTop = window.innerHeight - dialog.offsetHeight - padding;

        const constrainedLeft = Math.max(padding, Math.min(newLeft, maxLeft));
        const constrainedTop = Math.max(padding, Math.min(newTop, maxTop));

        dialog.style.left = constrainedLeft + 'px';
        dialog.style.top = constrainedTop + 'px';
    },

    handleMouseUp(e, dialog) {
        DialogItDrag.endDrag(dialog);
    },

    handleTouchEnd(e, dialog) {
        DialogItDrag.endDrag(dialog);
    },

    endDrag(dialog) {
        const dragState = dialog._schDragState;
        if (!dragState?.isDragging) return;

        dialog.classList.remove('ocdialog_dragging');
        dragState.header.classList.remove('ocdialog_dragging');

        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';

        // Remove document listeners
        document.removeEventListener('mousemove', DialogItDrag.createBoundHandler(dialog, 'handleMouseMove'));
        document.removeEventListener('touchmove', DialogItDrag.createBoundHandler(dialog, 'handleTouchMove'));
        document.removeEventListener('mouseup', DialogItDrag.createBoundHandler(dialog, 'handleMouseUp'));
        document.removeEventListener('touchend', DialogItDrag.createBoundHandler(dialog, 'handleTouchEnd'));
        document.removeEventListener('mouseleave', DialogItDrag.createBoundHandler(dialog, 'handleMouseUp'));

        // Clear drag state
        delete dialog._schDragState;
    },

    centerDialog(dialog) {
        if (!dialog) return;

        const rect = dialog.getBoundingClientRect();
        const left = (window.innerWidth - rect.width) / 2;
        const top = (window.innerHeight - rect.height) / 2;

        dialog.style.position = 'fixed';
        dialog.style.left = left + 'px';
        dialog.style.top = top + 'px';
        dialog.style.margin = '0';
    }
};
