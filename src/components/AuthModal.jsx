import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

function validate(data, mode) {
  const errors = {}
  if (!data.email?.trim()) errors.email = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = 'Invalid email address'
  if (!data.password?.trim()) errors.password = 'Password is required'
  else if (data.password.length < 6) errors.password = 'Minimum 6 characters'
  if (mode === 'register') {
    if (!data.name?.trim()) errors.name = 'Name is required'
    if (!data.bloodType) errors.bloodType = 'Select your blood type'
    if (!data.phone?.trim()) errors.phone = 'Phone is required'
  }
  return errors
}

export default function AuthModal({ mode, onClose, onSwitch }) {
  const { login, register } = useApp()
  const [form, setForm] = useState({ name: '', email: '', password: '', bloodType: '', phone: '', role: 'donor' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(form, mode)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 900)) // simulate
    if (mode === 'login') login(form.email)
    else register({ name: form.name, email: form.email, bloodType: form.bloodType, phone: form.phone, role: form.role, location: 'New York, NY' })
    setSuccess(true)
    setTimeout(onClose, 800)
    setLoading(false)
  }

  const err = (k) => errors[k] && <p className="text-xs text-crimson-500 mt-1">{errors[k]}</p>

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="card w-full max-w-md p-8 animate-slide-up overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {success ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="font-display font-bold text-2xl text-crimson-600">{mode === 'login' ? 'Welcome back!' : 'Account created!'}</h3>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-bold text-2xl text-crimson-600">{mode === 'login' ? 'Welcome Back' : 'Join BloodConnect'}</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{mode === 'login' ? 'Sign in to your account' : 'Create your donor profile'}</p>
              </div>
              <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 rounded-full text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              {mode === 'register' && (
                <>
                  {/* Role selector */}
                  <div className="grid grid-cols-2 gap-3">
                    {['donor', 'recipient'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: r }))}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${form.role === r ? 'border-crimson-500 bg-crimson-50 dark:bg-crimson-900/20' : 'border-neutral-200 dark:border-neutral-700'}`}
                      >
                        <div className="text-2xl mb-1">{r === 'donor' ? '🩸' : '🏥'}</div>
                        <div className="text-sm font-semibold capitalize">{r}</div>
                      </button>
                    ))}
                  </div>

                  <div>
                    <input className="input-field" placeholder="Full name" value={form.name} onChange={set('name')} />
                    {err('name')}
                  </div>
                </>
              )}

              <div>
                <input className="input-field" type="email" placeholder="Email address" value={form.email} onChange={set('email')} />
                {err('email')}
              </div>

              <div>
                <input className="input-field" type="password" placeholder="Password" value={form.password} onChange={set('password')} />
                {err('password')}
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <select className="input-field" value={form.bloodType} onChange={set('bloodType')}>
                      <option value="">Blood type</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
                    </select>
                    {err('bloodType')}
                  </div>
                  <div>
                    <input className="input-field" type="tel" placeholder="Phone number" value={form.phone} onChange={set('phone')} />
                    {err('phone')}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 mt-2 text-base"
              >
                {loading ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 mt-5">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button className="text-crimson-500 font-semibold hover:underline" onClick={() => onSwitch(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Register here' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
