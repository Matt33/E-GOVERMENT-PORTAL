/**
 * Scholarship frontend auth — Keycloak token (direct grant), localStorage, role check.
 * Token is used for API calls; backend validates JWT and roles.
 */
(function () {
  const STORAGE_TOKEN = 'egov_token';
  const STORAGE_USER = 'egov_user';

  const KEYCLOAK_REALM = 'egov-portal';
  const KEYCLOAK_CLIENT = 'id-renewal-api';

  function keycloakBaseUrl() {
    return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? window.location.protocol + '//' + window.location.hostname + ':8080'
      : (window.location.origin.replace(/:\d+$/, '') + ':8080');
  }

  function keycloakTokenUrl() {
    return keycloakBaseUrl() + '/realms/' + KEYCLOAK_REALM + '/protocol/openid-connect/token';
  }

  /**
   * Resolve backend API base.
   * - When frontend is on :8888, backend is expected on :3000.
   * - Fallback to same-origin if already served by backend.
   */
  function apiBaseUrl() {
    var port = window.location.port;
    var host = window.location.hostname;
    var protocol = window.location.protocol;
    if (port === '8888') {
      return protocol + '//' + host + ':3000';
    }
    return window.location.origin;
  }

  /** Open local portal registration page. */
  function openRegistration() {
    const currentPath = window.location.pathname || '';
    const registerPath = currentPath.includes('/pages/')
      ? './register.html'
      : './pages/register.html';
    window.location.href = registerPath;
  }

  function decodeJwtPayload(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload;
    } catch (_) {
      return null;
    }
  }

  window.EgovAuth = {
    getTokenUrl: keycloakTokenUrl,
    openRegistration: openRegistration,

    async login(username, password) {
      const res = await fetch(apiBaseUrl() + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Login failed (invalid credentials or server error)');
      }

      const data = await res.json();
      const payload = decodeJwtPayload(data.access_token);
      const user = {
        sub: payload?.sub,
        username: payload?.preferred_username || username,
        roles: payload?.realm_access?.roles || [],
      };
      localStorage.setItem(STORAGE_TOKEN, data.access_token);
      localStorage.setItem(STORAGE_USER, JSON.stringify(user));
      return user;
    },

    logout() {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
      localStorage.removeItem('egov_scholarship_token');
      localStorage.removeItem('egov_scholarship_user');
    },

    getToken() {
      return localStorage.getItem(STORAGE_TOKEN);
    },

    getStoredUser() {
      const raw = localStorage.getItem(STORAGE_USER);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (_) {
        return null;
      }
    },

    hasRole(role) {
      const user = this.getStoredUser();
      return user && user.roles && user.roles.includes(role);
    },

    isOfficerOrAdmin() {
      return this.hasRole('officer') || this.hasRole('admin');
    },

    apiFetch(path, options = {}) {
      const token = this.getToken();
      const headers = { ...options.headers, 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const normalizedPath = path.startsWith('/') ? path : '/' + path;
      return fetch(apiBaseUrl() + normalizedPath, { ...options, headers });
    },
  };
})();
