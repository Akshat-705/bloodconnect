import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

function validate(form) {
  const e = {}
  if (!form.name.trim()) e.name = 'Your name is required'
  if (!form.email.trim()) e.email = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address'
  if (!form.subject) e.subject = 'Please select a subject'
  if (!form.message.trim()) e.message = 'Message is required'
  else if (form.message.trim().length < 20) e.message = 'Please write at least 20 characters'
  return e
}

const SUBJECTS = [
  { value: '', label: 'Select a subject…' },
  { value: 'general', label: 'General Inquiry' },
  { value: 'donor', label: 'Donor Registration Help' },
  { value: 'emergency', label: 'Emergency Support' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'partnership', label: 'Partnership / Hospital' },
  { value: 'other', label: 'Other' },
]

const INFO_CARDS = [
  { icon: '📧', title: 'Email Us', value: 'support@bloodconnect.app', sub: 'We reply within 24 hours' },
  { icon: '📞', title: 'Emergency Hotline', value: '+1 800 BLOOD-01', sub: '24/7 for critical cases' },
  { icon: '📍', title: 'Headquarters', value: 'New York, NY 10001', sub: '123 Health Avenue, Suite 400' },
]

export default function Contact() {
  const { addToast } = useApp()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
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
    await new Promise(r => setTimeout(r, 1400))
    setLoading(false)
    setSent(true)
    addToast('Message sent! We\'ll be in touch shortly.', 'success')
  }

  const fieldErr = (k) => errors[k] && <p className="text-xs text-crimson-500 mt-1.5">{errors[k]}</p>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-14">
        <div className="section-tag mx-auto mb-4">Contact Us</div>
        <h1 className="font-display font-bold text-5xl mb-4">Get in Touch</h1>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto">Have questions, need emergency support, or want to partner with us? We're here to help.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-10 items-start">
        {/* Info column */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {INFO_CARDS.map((c, i) => (
            <div key={i} className="card p-5 flex items-start gap-4 hover:-translate-y-0.5 transition-transform animate-fade-in" style={{ animationDelay: `${i*0.1}s` }}>
              <div className="w-10 h-10 rounded-xl bg-crimson-50 dark:bg-crimson-900/30 flex items-center justify-center text-xl shrink-0">{c.icon}</div>
              <div>
                <p className="font-semibold text-sm">{c.title}</p>
                <p className="text-crimson-600 dark:text-crimson-400 font-medium text-sm mt-0.5">{c.value}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{c.sub}</p>
              </div>
            </div>
          ))}

          {/* FAQ teaser */}
          <div className="card p-5 bg-gradient-to-br from-crimson-500 to-crimson-700 text-white mt-2">
            <h3 className="font-display font-bold text-lg mb-2">Frequent Questions</h3>
            <ul className="text-sm text-crimson-100 space-y-1.5">
              {['How do I register as a donor?', 'Who can donate blood?', 'Is my data safe?'].map(q => (
                <li key={q} className="flex items-center gap-2">
                  <span className="text-crimson-300">→</span> {q}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form column */}
        <div className="lg:col-span-3">
          {sent ? (
            <div className="card p-12 text-center animate-slide-up">
              <div className="text-6xl mb-4">📬</div>
              <h2 className="font-display font-bold text-2xl mb-2 text-crimson-600">Message Sent!</h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">Thank you, <strong>{form.name}</strong>! We'll respond to <strong>{form.email}</strong> within 24 hours.</p>
              <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }) }} className="btn-secondary">
                Send Another Message
              </button>
            </div>
          ) : (
            <div className="card p-8 animate-slide-up">
              <h2 className="font-display font-bold text-2xl mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Your Name <span className="text-crimson-500">*</span></label>
                    <input className="input-field" placeholder="Alex Smith" value={form.name} onChange={set('name')} />
                    {fieldErr('name')}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Email Address <span className="text-crimson-500">*</span></label>
                    <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
                    {fieldErr('email')}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Subject <span className="text-crimson-500">*</span></label>
                  <select className="input-field" value={form.subject} onChange={set('subject')}>
                    {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {fieldErr('subject')}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Message <span className="text-crimson-500">*</span></label>
                  <textarea
                    className="input-field resize-none"
                    rows={6}
                    placeholder="Tell us how we can help…"
                    value={form.message}
                    onChange={set('message')}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {fieldErr('message') || <span />}
                    <span className={`text-xs ${form.message.length < 20 ? 'text-neutral-400' : 'text-green-500'}`}>
                      {form.message.length} / 20 min
                    </span>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary py-4 text-base justify-center">
                  {loading
                    ? <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
                    : '✉️ Send Message'
                  }
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
