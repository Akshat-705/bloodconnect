import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Link } from 'react-router-dom'

const ALL_BADGES = [
  { id: 'first_donation', name: 'First Drop', icon: '💧', desc: 'Completed first donation', color: '#2196F3' },
  { id: 'regular_donor', name: 'Regular', icon: '🔄', desc: 'Donated 5 times', color: '#4CAF50' },
  { id: 'hero', name: 'Hero', icon: '🦸', desc: 'Donated 10 times', color: '#9C27B0' },
  { id: 'lifesaver', name: 'Lifesaver', icon: '🚁', desc: 'Donated 20 times', color: '#FF5722' },
  { id: 'emergency', name: 'Emergency', icon: '🚨', desc: 'Emergency responder', color: '#E53935' },
  { id: 'silver_donor', name: 'Silver', icon: '🥈', desc: 'Top 50 donor', color: '#C0C0C0' },
  { id: 'champion', name: 'Champion', icon: '🏆', desc: 'Donated 50 times', color: '#E53935' },
  { id: 'gold_donor', name: 'Gold', icon: '🥇', desc: 'Top 10 donor', color: '#FFD700' },
]

const HISTORY = [
  { date: 'Jan 15, 2024', location: 'City Hospital', units: '450ml', type: 'Whole Blood' },
  { date: 'Oct 20, 2023', location: 'Central Clinic', units: '450ml', type: 'Whole Blood' },
  { date: 'Jul 5, 2023', location: 'Downtown Medical', units: '450ml', type: 'Whole Blood' },
]

export default function Profile() {
  const { user, updateUser, logout, addToast } = useApp()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="card p-12 animate-slide-up">
          <div className="text-6xl mb-5">🔒</div>
          <h2 className="font-display font-bold text-2xl mb-3">Login Required</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8">Please sign in to view your profile, track donations, and earn badges.</p>
          <Link to="/" className="btn-primary px-8 py-3">Go to Home</Link>
        </div>
      </div>
    )
  }

  const startEdit = () => { setEditForm({ name: user.name, phone: user.phone, location: user.location }); setEditing(true) }

  const saveEdit = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    updateUser(editForm)
    setEditing(false)
    setSaving(false)
    addToast('Profile updated!', 'success')
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'badges', label: `Badges (${user.badges?.length || 0})` },
    { id: 'history', label: 'History' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header card */}
      <div className="card p-8 mb-6 animate-slide-up">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-crimson-400 to-crimson-600 flex items-center justify-center text-white text-3xl font-display font-bold shadow-crimson-lg">
              {user.name[0]}
            </div>
            {user.isAvailable && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white dark:border-neutral-900" title="Available" />
            )}
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                className="input-field text-lg font-bold mb-1 max-w-xs"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            ) : (
              <h1 className="font-display font-bold text-2xl">{user.name}</h1>
            )}
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2.5 py-1 rounded-full bg-crimson-50 dark:bg-crimson-900/30 text-crimson-600 dark:text-crimson-400 text-xs font-semibold">{user.bloodType}</span>
              <span className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-semibold capitalize">{user.role}</span>
              {user.rank && <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-xs font-semibold">Rank #{user.rank}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {editing ? (
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="btn-primary py-2 px-4 text-sm">
                  {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-ghost py-2 px-4 text-sm">Cancel</button>
              </div>
            ) : (
              <button onClick={startEdit} className="btn-secondary py-2 px-4 text-sm">✏️ Edit</button>
            )}
            <button onClick={logout} className="btn-ghost py-2 px-4 text-sm text-neutral-500">Logout</button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Donations', value: user.totalDonations },
          { label: 'Points', value: (user.points || 0).toLocaleString() },
          { label: 'Badges', value: user.badges?.length || 0 },
          { label: 'Last Donation', value: user.lastDonation },
        ].map((s, i) => (
          <div key={i} className="stat-card p-4 animate-fade-in" style={{ animationDelay: `${i*0.08}s` }}>
            <div className="font-display font-bold text-2xl text-crimson-600 dark:text-crimson-400">{s.value}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Availability toggle (donors only) */}
      {user.role === 'donor' && (
        <div className="card p-5 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Availability Status</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{user.isAvailable ? 'You are visible to recipients and can be contacted.' : 'You are hidden from searches.'}</p>
          </div>
          <div
            onClick={() => { updateUser({ isAvailable: !user.isAvailable }); addToast(user.isAvailable ? 'You are now unavailable.' : 'You are now available!', 'info') }}
            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${user.isAvailable ? 'bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${user.isAvailable ? 'translate-x-7' : 'translate-x-1'}`} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-xl">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-white dark:bg-neutral-900 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="card p-6 animate-fade-in">
          <h3 className="font-semibold mb-5 text-base">Contact Information</h3>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Phone', value: editing ? (
                <input className="input-field text-sm py-2" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              ) : user.phone },
              { label: 'Location', value: editing ? (
                <input className="input-field text-sm py-2" value={editForm.location || ''} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />
              ) : user.location },
              { label: 'Email', value: user.email },
            ].map((field, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider w-20 shrink-0">{field.label}</span>
                <span className="text-sm text-neutral-700 dark:text-neutral-200 flex-1">{field.value || '—'}</span>
              </div>
            ))}
          </div>

          {/* Points progress */}
          {user.role === 'donor' && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Points Progress</span>
                <span className="text-xs text-neutral-400">{user.points || 0} / 5000</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-crimson-400 to-crimson-600 rounded-full transition-all duration-700 shadow-crimson"
                  style={{ width: `${Math.min(((user.points || 0) / 5000) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-neutral-400 mt-1.5">{5000 - (user.points || 0)} points until Champion status</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
          {ALL_BADGES.map(badge => {
            const unlocked = user.badges?.includes(badge.id)
            return (
              <div key={badge.id} className={`card p-4 text-center transition-all ${unlocked ? 'hover:scale-105' : 'opacity-40 grayscale'}`}>
                <div className="text-4xl mb-2" style={{ filter: unlocked ? `drop-shadow(0 0 8px ${badge.color})` : 'none' }}>{badge.icon}</div>
                <p className="font-semibold text-xs" style={{ color: unlocked ? badge.color : undefined }}>{badge.name}</p>
                <p className="text-[10px] text-neutral-400 mt-1">{badge.desc}</p>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card p-6 animate-fade-in">
          {user.role !== 'donor' || user.totalDonations === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              <div className="text-4xl mb-3">🩸</div>
              <p className="text-sm">No donation history yet.</p>
              {user.role === 'donor' && <Link to="/donor-hub" className="btn-primary mt-4 text-sm px-6 inline-flex">Go to Donor Hub</Link>}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {HISTORY.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                  <div>
                    <p className="font-semibold text-sm">{h.location}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{h.date} · {h.type}</p>
                  </div>
                  <span className="font-bold text-crimson-500 text-sm">{h.units}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
