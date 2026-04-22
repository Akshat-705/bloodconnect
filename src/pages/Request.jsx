import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

function validate(form) {
  const e = {}
  if (!form.patientName.trim()) e.patientName = 'Patient name is required'
  if (!form.bloodType) e.bloodType = 'Select blood type'
  if (!form.hospital.trim()) e.hospital = 'Hospital is required'
  if (!form.contact.trim()) e.contact = 'Contact is required'
  else if (!/^\+?[\d\s\-()]{7,}$/.test(form.contact)) e.contact = 'Invalid phone number'
  if (!form.units || isNaN(form.units) || Number(form.units) < 1) e.units = 'Enter a valid number of units'
  return e
}

export default function Request() {
  const { addToast } = useApp()
  const [form, setForm] = useState({ patientName: '', bloodType: '', hospital: '', contact: '', units: '', requiredBy: '', notes: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(er => ({ ...er, [k]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setLoading(false)
    setSubmitted(true)
    addToast('Blood request submitted successfully!', 'success')
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="card p-12 animate-slide-up">
          <div className="text-7xl mb-5">🩺</div>
          <h2 className="font-display font-bold text-3xl text-crimson-600 mb-3">Request Submitted!</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-2">Your blood request for <strong className="text-crimson-500">{form.bloodType}</strong> has been submitted and is now visible to compatible donors.</p>
          <p className="text-sm text-neutral-400 mb-8">We'll notify you at <strong>{form.contact}</strong> when a donor responds.</p>
          <button onClick={() => { setSubmitted(false); setForm({ patientName: '', bloodType: '', hospital: '', contact: '', units: '', requiredBy: '', notes: '' }) }} className="btn-primary">
            Submit Another Request
          </button>
        </div>
      </div>
    )
  }

  const fieldErr = (k) => errors[k] && <p className="text-xs text-crimson-500 mt-1.5">{errors[k]}</p>

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <div className="section-tag mb-4">Blood Request</div>
        <h1 className="font-display font-bold text-4xl mb-2">Request Blood</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Fill in the details below. Matching donors will be notified automatically.</p>
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold mb-2">Patient Name <span className="text-crimson-500">*</span></label>
              <input className="input-field" placeholder="Full name" value={form.patientName} onChange={set('patientName')} />
              {fieldErr('patientName')}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Hospital <span className="text-crimson-500">*</span></label>
              <input className="input-field" placeholder="Hospital name" value={form.hospital} onChange={set('hospital')} />
              {fieldErr('hospital')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Blood Type Required <span className="text-crimson-500">*</span></label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setForm(f => ({ ...f, bloodType: t })); setErrors(er => ({ ...er, bloodType: undefined })) }}
                  className={`py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${form.bloodType === t ? 'border-crimson-500 bg-crimson-500 text-white shadow-crimson' : 'border-neutral-200 dark:border-neutral-700 hover:border-crimson-300'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {fieldErr('bloodType')}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold mb-2">Units Needed <span className="text-crimson-500">*</span></label>
              <input className="input-field" type="number" min="1" max="20" placeholder="e.g. 2" value={form.units} onChange={set('units')} />
              {fieldErr('units')}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Required By</label>
              <input className="input-field" type="date" value={form.requiredBy} onChange={set('requiredBy')} min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Contact Number <span className="text-crimson-500">*</span></label>
            <input className="input-field" type="tel" placeholder="+1 555 000 0000" value={form.contact} onChange={set('contact')} />
            {fieldErr('contact')}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Additional Notes</label>
            <textarea className="input-field resize-none" rows={3} placeholder="Medical condition, special requirements, ward number…" value={form.notes} onChange={set('notes')} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary py-4 text-base mt-2 justify-center">
            {loading
              ? <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</>
              : '💉 Submit Blood Request'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
