// BloodConnect Donor Identity & Tracking API Service
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  } catch (err) {
    throw new Error(err.message || 'Network error. Is the server running?')
  }
}

// ─── Donors ──────────────────────────────────────────────────────────────────
export const donorApi = {
  register: (payload) => request('/donors/register', { method: 'POST', body: JSON.stringify(payload) }),
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
    request(`/track/${trackingId}/update`, { method: 'POST', body: JSON.stringify(payload) }),
  getAll: () => request('/track'),
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

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const logsApi = {
  get: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/logs?${qs}`)
  },
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
