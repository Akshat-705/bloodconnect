import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

function validate(form) {
  const e = {}
  if (!form.bloodType) e.bloodType = 'Select blood type'
  if (!form.hospital.trim()) e.hospital = 'Hospital name is required'
  if (!form.contact.trim()) e.contact = 'Contact number is required'
  else if (!/^\+?[\d\s\-()]{7,}$/.test(form.contact)) e.contact = 'Invalid phone number'
  return e
}

export default function Emergency() {
  const { addToast, user } = useApp()
  const [form, setForm] = useState({ bloodType: '', hospital: '', contact: '', notes: '', urgency: 'high' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(er => ({ ...er, [k]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1800))
    setLoading(false)
    setSent(true)
    addToast('Emergency alert sent to nearby donors!', 'success')
  }

  const urgencyColors = { critical: 'border-crimson-500 bg-crimson-50 dark:bg-crimson-900/20 text-crimson-600', high: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600', medium: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' }

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="card p-12 animate-slide-up">
          <div className="text-7xl mb-6">✅</div>
          <h2 className="font-display font-bold text-3xl text-green-600 mb-3">Alert Sent!</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-2">Your emergency request for <strong className="text-crimson-500">{form.bloodType}</strong> blood has been broadcast to all compatible donors within 10 km of <strong>{form.hospital}</strong>.</p>
          <p className="text-sm text-neutral-400 mb-8">Donors will contact you at <strong>{form.contact}</strong> directly.</p>
          <button onClick={() => { setSent(false); setForm({ bloodType: '', hospital: '', contact: '', notes: '', urgency: 'high' }) }} className="btn-secondary">
            Send Another Alert
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 bg-crimson-50 dark:bg-crimson-900/20 border border-crimson-200 dark:border-crimson-800 rounded-2xl mb-8 animate-fade-in">
        <span className="text-2xl mt-0.5 heartbeat">🚨</span>
        <div>
          <h3 className="font-semibold text-crimson-700 dark:text-crimson-400">Emergency Blood Request</h3>
          <p className="text-sm text-crimson-600/80 dark:text-crimson-400/80 mt-0.5">This alert will notify all available donors within a 10 km radius. Use only for genuine emergencies.</p>
        </div>
      </div>

      <div className="card p-8">
        <h1 className="font-display font-bold text-3xl mb-1">Emergency Alert</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-8">Fill in the details below. Donors will be alerted immediately.</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* Blood type */}
          <div>
            <label className="block text-sm font-semibold mb-2">Blood Type Needed <span className="text-crimson-500">*</span></label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setForm(f => ({ ...f, bloodType: t })); setErrors(er => ({ ...er, bloodType: undefined })) }}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${form.bloodType === t ? 'border-crimson-500 bg-crimson-500 text-white shadow-crimson' : 'border-neutral-200 dark:border-neutral-700 hover:border-crimson-300'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {errors.bloodType && <p className="text-xs text-crimson-500 mt-1">{errors.bloodType}</p>}
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-semibold mb-2">Urgency Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['critical', 'high', 'medium'].map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, urgency: u }))}
                  className={`py-2.5 rounded-xl border-2 font-semibold text-sm capitalize transition-all ${form.urgency === u ? urgencyColors[u] + ' border-current' : 'border-neutral-200 dark:border-neutral-700'}`}
                >
                  {u === 'critical' ? '🔴' : u === 'high' ? '🟠' : '🟡'} {u}
                </button>
              ))}
            </div>
          </div>

          {/* Hospital */}
          <div>
            <label className="block text-sm font-semibold mb-2">Hospital / Location <span className="text-crimson-500">*</span></label>
            <input className="input-field" placeholder="e.g. Apollo Hospital, Sector 22" value={form.hospital} onChange={set('hospital')} />
            {errors.hospital && <p className="text-xs text-crimson-500 mt-1">{errors.hospital}</p>}
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-semibold mb-2">Contact Number <span className="text-crimson-500">*</span></label>
            <input className="input-field" type="tel" placeholder="+1 555 000 0000" value={form.contact} onChange={set('contact')} />
            {errors.contact && <p className="text-xs text-crimson-500 mt-1">{errors.contact}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold mb-2">Additional Notes</label>
            <textarea className="input-field resize-none" rows={3} placeholder="Patient condition, units needed, any other details…" value={form.notes} onChange={set('notes')} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary py-4 text-base mt-2 justify-center">
            {loading
              ? <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending Alert…</>
              : '🚨 Send Emergency Alert'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
