import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { adminApi, logsApi, hospitalApi, formatDate } from '../services/donorApi'

export default function Admin() {
  const { user, addToast } = useApp()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [logs, setLogs] = useState([])
  const [tab, setTab] = useState('users')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddHosp, setShowAddHosp] = useState(false)
  const [newHosp, setNewHosp] = useState({
    name: '',
    licenseNumber: '',
    category: 'Government',
    address: '',
    city: 'New Delhi',
    emergencyHelpline: '',
  })

  const isAdmin = user && user.role === 'admin'

  const fetchData = async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const [sRes, uRes, lRes, hRes] = await Promise.all([
        adminApi.getStats().catch(err => { console.warn('Stats load warning:', err.message); return { stats: {} } }),
        adminApi.getUsers().catch(err => {
          console.error('Users load error:', err.message)
          addToast(err.message?.includes('session') || err.message?.includes('401')
            ? 'Admin session expired. Please log out and log in again.'
            : `Could not load users: ${err.message}`, 'error')
          return { users: [] }
        }),
        logsApi.get({ limit: 30 }).catch(() => ({ logs: [] })),
        hospitalApi.getAll().catch(() => ({ hospitals: [] })),
      ])
      setStats(sRes.stats || {})
      setUsers(uRes.users || [])
      setLogs(lRes.logs || [])
      setHospitals(hRes.hospitals || [])
    } catch (err) {
      addToast(err.message || 'Error loading dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [isAdmin])

  // User Actions
  const handleToggleVerified = async (u) => {
    try {
      const res = await adminApi.updateUser(u.id, { isVerified: !u.isVerified })
      setUsers((prev) => prev.map((item) => (item.id === u.id ? res.user : item)))
      addToast(`Updated verification for ${u.name}`, 'success')
    } catch (err) {
      addToast(err.message || 'Update failed', 'error')
    }
  }

  const handleToggleStatus = async (u) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active'
    try {
      const res = await adminApi.updateUser(u.id, { status: nextStatus })
      setUsers((prev) => prev.map((item) => (item.id === u.id ? res.user : item)))
      addToast(`Status for ${u.name} set to ${nextStatus}`, 'success')
    } catch (err) {
      addToast(err.message || 'Status change failed', 'error')
    }
  }

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete account for ${u.name} (${u.email})?`)) return
    try {
      await adminApi.deleteUser(u.id)
      setUsers((prev) => prev.filter((item) => item.id !== u.id))
      addToast(`User ${u.name} removed successfully`, 'success')
    } catch (err) {
      addToast(err.message || 'Delete failed', 'error')
    }
  }

  // Hospital Actions
  const handleToggleHospVerify = async (h) => {
    try {
      const res = await hospitalApi.toggleVerify(h.id)
      setHospitals((prev) => prev.map((item) => (item.id === h.id ? res.hospital : item)))
      addToast(`Verification toggled for ${h.name}`, 'success')
    } catch (err) {
      addToast(err.message || 'Hospital update failed', 'error')
    }
  }

  const handleUpdateStock = async (h, bloodType, delta) => {
    const currentUnits = h.inventory?.get ? h.inventory.get(bloodType) : h.inventory?.[bloodType] || 0
    const newUnits = Math.max(0, currentUnits + delta)
    try {
      const res = await hospitalApi.updateInventory(h.id, { bloodType, units: newUnits })
      setHospitals((prev) => prev.map((item) => (item.id === h.id ? res.hospital : item)))
      addToast(`Updated ${h.name} ${bloodType} stock to ${newUnits} units`, 'success')
    } catch (err) {
      addToast(err.message || 'Stock update failed', 'error')
    }
  }

  const handleDeleteHospital = async (h) => {
    if (!window.confirm(`Delete partner hospital record for ${h.name}?`)) return
    try {
      await hospitalApi.delete(h.id)
      setHospitals((prev) => prev.filter((item) => item.id !== h.id))
      addToast(`Hospital ${h.name} removed`, 'success')
    } catch (err) {
      addToast(err.message || 'Delete failed', 'error')
    }
  }

  const handleAddHospitalSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await hospitalApi.create(newHosp)
      setHospitals((prev) => [res.hospital, ...prev])
      setShowAddHosp(false)
      setNewHosp({ name: '', licenseNumber: '', category: 'Government', address: '', city: 'New Delhi', emergencyHelpline: '' })
      addToast(`Hospital ${res.hospital.name} registered successfully!`, 'success')
    } catch (err) {
      addToast(err.message || 'Failed to add hospital', 'error')
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-28 text-center">
        <div className="card p-10 animate-slide-up">
          <div className="text-5xl mb-4">🛡️</div>
          <h2 className="font-display font-bold text-2xl mb-2">Admin Access Required</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-sm">
            Please log in with the administrator account (<code className="text-crimson-500">admin@bloodconnect.org</code>) to view this control panel.
          </p>
          <Link to="/" className="btn-primary">Return Home</Link>
        </div>
      </div>
    )
  }

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.bloodType || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredHospitals = hospitals.filter((h) =>
    (h.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.licenseNumber || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="section-tag mb-1">
            <span className="w-1.5 h-1.5 bg-crimson-500 rounded-full animate-pulse" />
            Administration Console
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl">Platform Control Center</h1>
        </div>
        <button onClick={fetchData} className="btn-secondary self-start sm:self-auto text-sm">
          🔄 Refresh Data
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-2xl mb-2">🩸</div>
          <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Donors</p>
          <p className="text-2xl font-bold font-display">{loading ? '…' : stats?.donors ?? 0}</p>
        </div>
        <div className="card p-5">
          <div className="text-2xl mb-2">🏥</div>
          <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Recipients</p>
          <p className="text-2xl font-bold font-display">{loading ? '…' : stats?.recipients ?? 0}</p>
        </div>
        <div className="card p-5">
          <div className="text-2xl mb-2">🏨</div>
          <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Hospitals</p>
          <p className="text-2xl font-bold font-display text-blue-600 dark:text-blue-400">{loading ? '…' : stats?.hospitals ?? hospitals.length}</p>
        </div>
        <div className="card p-5">
          <div className="text-2xl mb-2">💉</div>
          <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Donations</p>
          <p className="text-2xl font-bold font-display">{loading ? '…' : stats?.donations ?? 0}</p>
        </div>
        <div className="card p-5">
          <div className="text-2xl mb-2">🚨</div>
          <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Active SOS</p>
          <p className="text-2xl font-bold font-display text-crimson-500">{loading ? '…' : stats?.alerts ?? 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800 mb-6">
        <button
          onClick={() => setTab('users')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 transition ${
            tab === 'users' ? 'border-crimson-500 text-crimson-500' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Registered Users ({users.length})
        </button>
        <button
          onClick={() => setTab('hospitals')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 transition ${
            tab === 'hospitals' ? 'border-crimson-500 text-crimson-500' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Partner Hospitals ({hospitals.length})
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 transition ${
            tab === 'logs' ? 'border-crimson-500 text-crimson-500' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Security Audit Logs ({logs.length})
        </button>
      </div>

      {/* Tab: Users */}
      {tab === 'users' && (
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, email, or blood group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field max-w-md text-sm"
            />
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-100 dark:bg-neutral-800/60 text-xs uppercase text-neutral-500 font-bold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Blood Type</th>
                  <th className="p-3">Verified</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-neutral-400">
                      <span className="inline-block w-5 h-5 border-2 border-crimson-500 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                      Loading registered users from database…
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-neutral-400">
                      {search ? (
                        <>No users matching "{search}".</>
                      ) : (
                        <div className="space-y-2">
                          <p>No registered users loaded.</p>
                          <button onClick={fetchData} className="btn-secondary text-xs px-3 py-1.5">
                            🔄 Refresh Data
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition">
                      <td className="p-3">
                        <div className="font-semibold text-neutral-900 dark:text-white">{u.name}</div>
                        <div className="text-xs text-neutral-500">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                          u.role === 'recipient' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        }`}>
                          {u.role || 'donor'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-crimson-500">{u.bloodType || '—'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleVerified(u)}
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                            u.isVerified
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}
                        >
                          {u.isVerified ? '✓ Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                            u.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {u.status === 'active' ? '● Active' : '✕ Suspended'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Hospitals */}
      {tab === 'hospitals' && (
        <div>
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Search hospitals by name, city, or license..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field max-w-md text-sm"
            />
            <button onClick={() => setShowAddHosp(true)} className="btn-primary text-sm">
              ➕ Add Partner Hospital
            </button>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-100 dark:bg-neutral-800/60 text-xs uppercase text-neutral-500 font-bold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-3">Hospital Name</th>
                  <th className="p-3">Sector</th>
                  <th className="p-3">Helpline</th>
                  <th className="p-3">Live Blood Inventory</th>
                  <th className="p-3">Verification</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredHospitals.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-neutral-400">No partner hospitals found.</td>
                  </tr>
                ) : (
                  filteredHospitals.map((h) => {
                    const inv = h.inventory || {}
                    const getUnits = (bt) => inv.get ? inv.get(bt) : inv[bt] || 0

                    return (
                      <tr key={h.id || h.hospitalId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition">
                        <td className="p-3">
                          <div className="font-semibold text-neutral-900 dark:text-white">{h.name}</div>
                          <div className="text-xs text-neutral-500">📍 {h.address}, {h.city} • <span className="font-mono">{h.licenseNumber}</span></div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                            h.category === 'Government' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}>
                            {h.category}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs">{h.emergencyHelpline}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {['A+', 'B+', 'AB+', 'O+', 'O-'].map((bt) => {
                              const units = getUnits(bt)
                              return (
                                <div key={bt} className="inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-[11px] font-mono">
                                  <span className="font-bold">{bt}:</span>
                                  <span className={units < 3 ? 'text-red-500 font-extrabold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>{units}</span>
                                  <button onClick={() => handleUpdateStock(h, bt, 1)} className="hover:text-emerald-500 font-bold ml-0.5" title="Add 1 unit">+</button>
                                  <button onClick={() => handleUpdateStock(h, bt, -1)} className="hover:text-red-500 font-bold" title="Subtract 1 unit">-</button>
                                </div>
                              )
                            })}
                          </div>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleHospVerify(h)}
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                              h.isVerified
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                            }`}
                          >
                            {h.isVerified ? '✓ Verified' : 'Unverified'}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteHospital(h)}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Logs */}
      {tab === 'logs' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100 dark:bg-neutral-800/60 text-xs uppercase text-neutral-500 font-bold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-neutral-400">No logs found.</td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition">
                    <td className="p-3 font-mono text-xs font-semibold text-crimson-500">{l.action}</td>
                    <td className="p-3 text-xs">{l.entityType} ({l.entityId})</td>
                    <td className="p-3 text-xs text-neutral-500">{l.actor || 'system'}</td>
                    <td className="p-3 text-xs text-neutral-400">{formatDate(l.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Hospital */}
      {showAddHosp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-xl">Register Partner Hospital</h3>
              <button onClick={() => setShowAddHosp(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddHospitalSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-neutral-500 mb-1 block">Hospital Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AIIMS New Delhi"
                  value={newHosp.name}
                  onChange={(e) => setNewHosp({ ...newHosp, name: e.target.value })}
                  className="input-field text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500 mb-1 block">License Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL-BB-2024-01"
                    value={newHosp.licenseNumber}
                    onChange={(e) => setNewHosp({ ...newHosp, licenseNumber: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500 mb-1 block">Category</label>
                  <select
                    value={newHosp.category}
                    onChange={(e) => setNewHosp({ ...newHosp, category: e.target.value })}
                    className="input-field text-sm"
                  >
                    <option value="Government">Government</option>
                    <option value="Private">Private</option>
                    <option value="Charitable">Charitable</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-neutral-500 mb-1 block">Full Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ansari Nagar, Sri Aurobindo Marg"
                  value={newHosp.address}
                  onChange={(e) => setNewHosp({ ...newHosp, address: e.target.value })}
                  className="input-field text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500 mb-1 block">City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New Delhi"
                    value={newHosp.city}
                    onChange={(e) => setNewHosp({ ...newHosp, city: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500 mb-1 block">Emergency Helpline</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 11 2658 8500"
                    value={newHosp.emergencyHelpline}
                    onChange={(e) => setNewHosp({ ...newHosp, emergencyHelpline: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddHosp(false)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" className="btn-primary text-sm">Register Hospital</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
