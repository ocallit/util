/**
 * Finds the active navigation link based on the current URL
 * and applies an 'nav-active' class, while also
 * swapping FontAwesome icons from 'fa-regular' to 'fa-solid'.
 */
function highlightActiveNav() {
    try {
        const currentLocation = window.location.href.split('?')[0].split('#')[0];
        const navLinks = document.querySelectorAll('nav a');

        navLinks.forEach(link => {
            const linkLocation = link.href.split('?')[0].split('#')[0];

            if(linkLocation === currentLocation) {
                link.classList.add('nav-active');

                const icon = link.querySelector('i.fa-regular');
                if(icon) {
                    icon.classList.remove('fa-regular');
                    icon.classList.add('fa-solid');
                }
            }
        });
    } catch(e) {
        // Log any errors so they don't break other scripts
        console.error("Error during active nav highlighting:", e);
    }
}

if(document.readyState === "loading") {
    // The document is still loading. We can safely add the event listener.
    document.addEventListener("DOMContentLoaded", runNavHighlighter);
} else {
    // The document is already 'interactive' or 'complete'.'DOMContentLoaded' event has ALREADY fired. run our function immediately
    runNavHighlighter();
}
