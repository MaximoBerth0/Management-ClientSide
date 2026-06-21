/**
 * Global Configuration & Base API Client
 */

// 1. Dynamic Environment Base URL Setup
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000' 
    : 'https://'; 

/**
 * 2. Authenticated HTTP Client Wrapper
 * Automatically appends the JWT bearer token and content-type headers.
 * * @param {string} endpoint - The API path (e.g., '/api/v1/inventory')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 */
async function apiRequest(endpoint, options = {}) {
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
            // Handle automatic token expiration or unauthorized access
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('access_token');
                if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                    window.location.href = 'index.html';
                }
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