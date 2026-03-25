const Store = require('electron-store');
const fetch = require('node-fetch');
const config = require('./config');

const store = new Store({ name: 'time-agent-auth' });

/**
 * Login to Django backend and store JWT tokens.
 * @param {string} tenantSlug
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, error?: string, user?: object}>}
 */
async function login(tenantSlug, email, password) {
  try {
    const res = await fetch(`${config.API_BASE}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenantSlug,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data.detail || data.error || 'Login failed';
      return { success: false, error: msg };
    }

    const accessToken = data.access || data.data?.access;
    const refreshTokenVal = data.refresh || data.data?.refresh;

    if (!accessToken) {
      return { success: false, error: 'No access token in response' };
    }

    store.set('access_token', accessToken);
    store.set('refresh_token', refreshTokenVal || '');
    store.set('tenant_slug', tenantSlug);
    store.set('login_time', Date.now());

    const payload = decodeJwtPayload(accessToken);
    if (payload) {
      store.set('user_id', payload.user_id || payload.sub || '');
      store.set('employee_id', payload.employee_id || '');
      store.set('email', payload.email || email);
      store.set('token_exp', (payload.exp || 0) * 1000);
    }

    return { success: true, user: payload };
  } catch (err) {
    return { success: false, error: err.message || 'Network error' };
  }
}

/**
 * Refresh the JWT access token using the stored refresh token.
 * @returns {Promise<boolean>}
 */
async function refreshToken() {
  const refresh = store.get('refresh_token');
  const tenantSlug = store.get('tenant_slug');

  if (!refresh) return false;

  try {
    const res = await fetch(`${config.API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenantSlug || '',
      },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    const newAccess = data.access || data.data?.access;

    if (!newAccess) return false;

    store.set('access_token', newAccess);

    if (data.refresh || data.data?.refresh) {
      store.set('refresh_token', data.refresh || data.data.refresh);
    }

    const payload = decodeJwtPayload(newAccess);
    if (payload) {
      store.set('token_exp', (payload.exp || 0) * 1000);
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get authorization headers for API requests.
 * Automatically refreshes token if expired.
 * @returns {Promise<object>}
 */
async function getAuthHeaders() {
  const exp = store.get('token_exp', 0);
  const now = Date.now();

  // Refresh if token expires within 60 seconds
  if (exp && now > exp - 60000) {
    await refreshToken();
  }

  const token = store.get('access_token', '');
  const tenantSlug = store.get('tenant_slug', '');

  return {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Slug': tenantSlug,
    'Content-Type': 'application/json',
  };
}

/**
 * Check if user is currently logged in with a valid token.
 * @returns {boolean}
 */
function isLoggedIn() {
  const token = store.get('access_token');
  if (!token) return false;

  const exp = store.get('token_exp', 0);
  // Consider logged in if token exists; refresh will handle expiry
  return !!token && (!exp || Date.now() < exp + 300000);
}

/**
 * Clear stored auth data (logout).
 */
function logout() {
  store.delete('access_token');
  store.delete('refresh_token');
  store.delete('tenant_slug');
  store.delete('user_id');
  store.delete('employee_id');
  store.delete('email');
  store.delete('token_exp');
  store.delete('login_time');
}

/**
 * Get stored user info.
 * @returns {object}
 */
function getUserInfo() {
  return {
    userId: store.get('user_id', ''),
    employeeId: store.get('employee_id', ''),
    email: store.get('email', ''),
    tenantSlug: store.get('tenant_slug', ''),
  };
}

/**
 * Decode the payload of a JWT token (without verification).
 * @param {string} token
 * @returns {object|null}
 */
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

module.exports = {
  login,
  refreshToken,
  getAuthHeaders,
  isLoggedIn,
  logout,
  getUserInfo,
};
