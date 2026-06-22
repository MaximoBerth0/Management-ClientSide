/**
 * Global Configuration & Base API Client
 */

// Base URL variable 
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000' 
    : 'https://'; 

/**
 * Drop the local session and send the user back to the login page.
 * Used when there is no valid way to recover the session (e.g. the refresh
 * token is also dead).
 */
function forceLogin() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
        // root-absolute so it resolves from any depth (e.g. /views/*)
        window.location.href = '/index.html';
    }
}

/**
 * Exchange the refresh token for a fresh token pair (POST /auth/refresh).
 *
 * Concurrent 401s (several requests firing at once) are coalesced into a
 * single network call via `refreshPromise`, so we never hit /auth/refresh
 * multiple times in parallel and race the token rotation.
 *
 * @returns {Promise<boolean>} true if a new access token was stored.
 */
let refreshPromise = null;
function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return Promise.resolve(false);

    if (!refreshPromise) {
        refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        })
            .then(async (response) => {
                if (!response.ok) return false; // refresh token expired/revoked
                const tokens = await response.json();
                localStorage.setItem('access_token', tokens.access_token);
                localStorage.setItem('refresh_token', tokens.refresh_token);
                // the rotated token may carry updated roles -> re-resolve UI gating
                applyRoleVisibility();
                return true;
            })
            .catch(() => false)
            .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
}

/**
 * Authenticated HTTP Client Wrapper
 * Automatically appends the JWT bearer token and content-type headers.
 * It is like a "messenger" that the entire app uses to request things from the server
 *
 * On a 401 (expired/invalid access token) it transparently refreshes the
 * session once and replays the request, so a routine token expiry never
 * interrupts the user. Only a failed refresh forces a re-login. A 403
 * (authenticated but not permitted) is surfaced as an error and never
 * touches the session.
 *
 * @param {string} endpoint - The API path (e.g., '/api/v1/inventory')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @param {boolean} _isRetry - internal: marks the post-refresh replay to stop recursion
 */
async function apiRequest(endpoint, options = {}, _isRetry = false) {
    const url = `${API_BASE_URL}${endpoint}`;

    // Initialize headers object safely
    options.headers = options.headers || {};

    // Set Default Content-Type to JSON if sending a body and it's not FormData
    if (options.body && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }

    // Inject JWT access token if it exists in localStorage
    const token = localStorage.getItem('access_token');
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, options);

        // Handle HTTP regular error codes
        if (!response.ok) {
            // 401 -> the access token is likely expired. Try a one-time refresh
            // and replay the request before giving up on the session. The
            // refresh endpoint itself is excluded to avoid an infinite loop.
            if (response.status === 401 && !_isRetry && endpoint !== '/auth/refresh') {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    return apiRequest(endpoint, options, true);
                }
                // refresh token is dead too -> nothing left but to re-login
                forceLogin();
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Request failed with status ${response.status}`);
        }

        // Return JSON payload if content exists
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        }

        return null;
    } catch (error) {
        console.error(`[API Error] ${options.method || 'GET'} to ${endpoint}:`, error.message);
        throw error;
    }
}

/**
 * Role helpers (read from the access token)
 * The backend embeds the user's roles as a `roles` claim in the JWT access
 * token. These helpers decode that claim client-side so the UI can gate
 * content. this is for UI gating only, the backend still enforces
 * access via permissions, so a tampered token grants nothing.
 */

// Canonical role names — mirror of SYSTEM_ROLES in management/app/core/constants.
const ROLES = Object.freeze({
    ADMIN: 'admin',
    EMPLOYEE: 'employee',
    CLIENT: 'client',
});

// Decode a base64url JWT segment into an object (no signature check).
function decodeJwtPayload(token) {
    try {
        let part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        part += '='.repeat((4 - (part.length % 4)) % 4); // restore padding
        return JSON.parse(atob(part));
    } catch {
        return null;
    }
}

// Roles of the currently logged-in user, e.g. ['admin']. Empty if no session.
function getRoles() {
    const token = localStorage.getItem('access_token');
    if (!token) return [];
    const payload = decodeJwtPayload(token);
    return payload && Array.isArray(payload.roles) ? payload.roles : [];
}

// True if the user holds at least one of the given roles.
function hasAnyRole(...roles) {
    const mine = getRoles();
    return roles.some((role) => mine.includes(role));
}

/**
 * Reveal/hide elements tagged with `data-roles="admin,manager"`.
 * Gated elements are hidden by default (see the inline CSS in each page head)
 * and only revealed once their role matches — so nothing flashes before the
 * role is known. Elements without `data-roles` are unaffected.
 */
function applyRoleVisibility(root = document) {
    const mine = getRoles();
    root.querySelectorAll('[data-roles]').forEach((el) => {
        const allowed = el.dataset.roles
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean);
        el.classList.toggle('role-ok', allowed.some((r) => mine.includes(r)));
    });
}

// Resolve role-gated content on every page as soon as the DOM is ready.
document.addEventListener('DOMContentLoaded', () => applyRoleVisibility());