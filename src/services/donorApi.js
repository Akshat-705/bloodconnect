// BloodConnect Donor Identity & Tracking API Service
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const TOKEN_KEY = 'bloodconnect_token'

// ─── Session token storage ─────────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token')
}
export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('token')
  }
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}, { auth = false } = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? authHeaders() : {}),
        ...options.headers,
      },
      ...options,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  } catch (err) {
    throw new Error(err.message || 'Network error. Is the server running?')
  }
}

// ─── Authentication (real accounts: bcrypt + JWT) ──────────────────────────
export const authApi = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email, code, password) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, password }) }),
  me: () => request('/auth/me', {}, { auth: true }),
  updateProfile: (payload) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }, { auth: true }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }, { auth: true }),
}

// ─── Donors ──────────────────────────────────────────────────────────────────
export const donorApi = {
  register: (payload) => request('/donors/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email, password) => request('/donors/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email) => request('/donors/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email, code, password) =>
    request('/donors/reset-password', { method: 'POST', body: JSON.stringify({ email, code, password }) }),
  getById: (donorId) => request(`/donors/${donorId}`),
  getByEmail: (email) => request(`/donors/by-email/${encodeURIComponent(email)}`),
  getAll: () => request('/donors'),
}

// ─── Donations ────────────────────────────────────────────────────────────────
export const donationApi = {
  create: (payload) => request('/donations/create', { method: 'POST', body: JSON.stringify(payload) }),
  getByDonor: (donorId) => request(`/donations/by-donor/${donorId}`),
}

// ─── Tracking ─────────────────────────────────────────────────────────────────
export const trackingApi = {
  get: (trackingId) => request(`/track/${trackingId}`),
  update: (trackingId, payload) =>
    request(`/track/${trackingId}/update`, { method: 'POST', body: JSON.stringify(payload) }, { auth: true }),
  getAll: () => request('/track', {}, { auth: true }),
}

// ─── Certificates ─────────────────────────────────────────────────────────────
export const certificateApi = {
  get: (certId) => request(`/certificates/${certId}`),
  verify: (certificateId, verificationHash) =>
    request('/certificates/verify', { method: 'POST', body: JSON.stringify({ certificateId, verificationHash }) }),
  scan: async (file, extras = {}) => {
    const form = new FormData()
    form.append('file', file)
    Object.entries(extras).forEach(([k, v]) => form.append(k, v))
    const res = await fetch(`${BASE_URL}/certificates/scan`, { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Scan failed')
    return data
  },
}

// ─── Audit Logs & Admin ───────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => request('/admin/stats', {}, { auth: true }),
  getUsers: () => request('/admin/users', {}, { auth: true }),
  updateUser: (id, payload) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, { auth: true }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }, { auth: true }),
}

export const hospitalApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/hospitals${qs ? '?' + qs : ''}`)
  },
  create: (payload) => request('/hospitals', { method: 'POST', body: JSON.stringify(payload) }, { auth: true }),
  updateInventory: (id, payload) => request(`/hospitals/${id}/inventory`, { method: 'PATCH', body: JSON.stringify(payload) }, { auth: true }),
  toggleVerify: (id) => request(`/hospitals/${id}/verify`, { method: 'PATCH' }, { auth: true }),
  delete: (id) => request(`/hospitals/${id}`, { method: 'DELETE' }, { auth: true }),
}

export const logsApi = {
  get: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/logs?${qs}`, {}, { auth: true })
  },
}

// ─── Emergency SOS ───────────────────────────────────────────────────────────
export const emergencyApi = {
  create: (payload) => request('/emergency/create', { method: 'POST', body: JSON.stringify(payload) }),
  getActive: () => request('/emergency/active'),
  respond: (alertId, payload) =>
    request(`/emergency/${alertId}/respond`, { method: 'POST', body: JSON.stringify(payload) }),
  resolve: (alertId) => request(`/emergency/${alertId}/resolve`, { method: 'POST' }),
}

// ─── Utilities ────────────────────────────────────────────────────────────────
export const TRACKING_STAGES = [
  { key: 'Registered', icon: '📋', color: 'blue', desc: 'Donation registered in the system' },
  { key: 'Collected', icon: '🩸', color: 'red', desc: 'Blood collected from donor' },
  { key: 'Testing', icon: '🔬', color: 'purple', desc: 'Undergoing lab screening & tests' },
  { key: 'Approved', icon: '✅', color: 'green', desc: 'Tests cleared, quality approved' },
  { key: 'Stored', icon: '🏦', color: 'teal', desc: 'Stored safely in blood bank' },
  { key: 'Assigned', icon: '📌', color: 'orange', desc: 'Assigned to a recipient' },
  { key: 'Dispatched', icon: '🚑', color: 'yellow', desc: 'In transit to hospital' },
  { key: 'Delivered', icon: '💉', color: 'emerald', desc: 'Delivered and used successfully' },
]

export function stageColor(stage) {
  const map = {
    Registered: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    Collected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    Testing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    Approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    Stored: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    Assigned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    Dispatched: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    Delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  }
  return map[stage] || 'bg-gray-100 text-gray-700'
}

export function stageProgress(currentStage) {
  const idx = TRACKING_STAGES.findIndex(s => s.key === currentStage)
  return idx === -1 ? 0 : Math.round(((idx + 1) / TRACKING_STAGES.length) * 100)
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium', timeStyle: 'short',
  })
}
