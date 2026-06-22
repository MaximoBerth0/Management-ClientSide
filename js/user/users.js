/**
 * Users Module (admin)
 * Lists users and manages their accounts against the /users endpoints.
 * Requires the users:* permissions, so the whole section is admin-gated in
 * the dashboard markup (data-roles="admin"). The backend still enforces it.
 *
 *   GET   /users/list                     -> [UserListItemResponse]
 *   POST  /users/register                 -> create a user (201)
 *   PATCH /users/{id}/disable-account      -> { reason } required
 *   PATCH /users/{id}/enable
 */

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('users-tbody');
    if (!tableBody) return; // module markup not present on this page

    const navLink = document.querySelector('.nav-link[data-target="users"]');
    const refreshBtn = document.getElementById('users-refresh-btn');
    const createForm = document.getElementById('create-user-form');
    const createModal = document.getElementById('create-user-modal');

    let loaded = false; // lazy-load the list the first time the section is opened

    // Escape user-supplied text before injecting it into innerHTML.
    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        }[char]));
    }

    function rowSpan(message, extraClass = 'text-base-content/60') {
        tableBody.innerHTML =
            `<tr><td colspan="4" class="text-center ${extraClass}">${message}</td></tr>`;
    }

    function renderUsers(users) {
        if (!users.length) return rowSpan('No users yet.');

        tableBody.innerHTML = '';
        users.forEach((user) => {
            const statusBadge = user.is_active
                ? '<span class="badge badge-success badge-sm">Active</span>'
                : '<span class="badge badge-ghost badge-sm">Disabled</span>';
            const actionLabel = user.is_active ? 'Disable' : 'Enable';
            const actionClass = user.is_active ? 'btn-error' : 'btn-success';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${statusBadge}</td>
                <td class="text-right">
                    <button class="btn btn-xs btn-outline ${actionClass}"
                            data-action="toggle" data-id="${user.id}" data-active="${user.is_active}">
                        ${actionLabel}
                    </button>
                </td>`;
            tableBody.appendChild(row);
        });
    }

    async function loadUsers() {
        rowSpan('<span class="loading loading-spinner loading-sm"></span>');
        try {
            const users = await apiRequest('/users/list');
            renderUsers(users);
            loaded = true;
        } catch (error) {
            rowSpan(escapeHtml(error.message), 'text-error');
        }
    }

    // Enable / disable a single account (event-delegated to survive re-renders).
    tableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-action="toggle"]');
        if (!button) return;

        const userId = button.dataset.id;
        const isActive = button.dataset.active === 'true';

        try {
            if (isActive) {
                // disable-account requires a non-empty reason (1..500 chars)
                const reason = prompt('Reason for disabling this account:');
                if (reason === null) return;            // cancelled
                if (!reason.trim()) return alert('A reason is required.');
                await apiRequest(`/users/${userId}/disable-account`, {
                    method: 'PATCH',
                    body: JSON.stringify({ reason: reason.trim() }),
                });
            } else {
                await apiRequest(`/users/${userId}/enable`, { method: 'PATCH' });
            }
            await loadUsers();
        } catch (error) {
            alert(error.message || 'Could not update the account.');
        }
    });

    // Create a user via the modal form.
    createForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = createForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.classList.add('loading');

        try {
            await apiRequest('/users/register', {
                method: 'POST',
                body: JSON.stringify({
                    email: document.getElementById('cu-email').value.trim(),
                    username: document.getElementById('cu-username').value.trim(),
                    password: document.getElementById('cu-password').value,
                }),
            });
            createForm.reset();
            createModal?.close();
            await loadUsers();
        } catch (error) {
            alert(error.message || 'Could not create the user.');
        } finally {
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
        }
    });

    // Lazy-load on first open; the Refresh button reloads on demand.
    navLink?.addEventListener('click', () => { if (!loaded) loadUsers(); });
    refreshBtn?.addEventListener('click', loadUsers);
});
