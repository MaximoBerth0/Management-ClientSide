/**
 * Dashboard Sidebar Navigation
 * Switches the visible <section data-section> panel when a sidebar link is
 * clicked. Pure UI — role gating is handled by app.js (applyRoleVisibility),
 * which hides links/sections the user isn't allowed to see.
 */

document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('[data-section]');
    const drawerToggle = document.getElementById('sidebar-toggle');

    function showSection(target) {
        sections.forEach((section) => {
            section.classList.toggle('hidden', section.dataset.section !== target);
        });
        links.forEach((link) => {
            link.classList.toggle('active', link.dataset.target === target);
        });
        // collapse the drawer after navigating on mobile (no-op on lg+)
        if (drawerToggle) drawerToggle.checked = false;
    }

    links.forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            showSection(link.dataset.target);
        });
    });
});
