import axios from 'axios';

/**
 * AXIOS INSTANCE — Centralized HTTP Client
 *
 * Why a custom instance instead of bare axios?
 *
 * 1. BASE URL: Every API call automatically prepends the backend URL.
 *    Without this: axios.get('http://localhost:5000/api/portfolio')
 *    With this:    api.get('/portfolio')
 *
 * 2. JWT INTERCEPTOR: Every outgoing request automatically includes
 *    the Authorization header. Without this you'd manually add the
 *    token to every single API call.
 *
 * 3. RESPONSE INTERCEPTOR: Globally handle 401 Unauthorized (expired
 *    token) — redirect to login automatically.
 *
 * 4. SINGLE POINT OF CHANGE: If the API URL changes or auth strategy
 *    changes, update ONE file.
 *
 * Interview Q: "What is an Axios interceptor?"
 * A: An interceptor is middleware for HTTP requests/responses in Axios.
 *    Request interceptors run before the request is sent — useful for
 *    attaching headers. Response interceptors run before your .then()
 *    callback — useful for global error handling, token refresh, etc.
 *
 * Interview Q: "Where do you store the JWT on the client?"
 * A: localStorage. It persists across browser sessions (unlike
 *    sessionStorage which clears on tab close). The tradeoff is XSS
 *    vulnerability — malicious JS can read localStorage. The safer
 *    alternative is httpOnly cookies (inaccessible to JS), but that
 *    requires same-origin or CSRF protection setup. For a learning
 *    project, localStorage + careful XSS prevention is standard.
 */

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10s timeout — fail fast rather than hang
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  // Pass successful responses straight through
  (response) => response,

  (error) => {
    // 401: token expired or invalid → force logout
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
