import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { donorApi } from '../services/donorApi'

function validate(data, mode) {
  const errors = {}
  if (!data.email?.trim()) errors.email = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = 'Invalid email address'

  if (mode !== 'forgot') {
    if (!data.password?.trim()) errors.password = 'Password is required'
    else if (data.password.length < 6) errors.password = 'Minimum 6 characters'
  }

  if (mode === 'register') {
    if (!data.name?.trim()) errors.name = 'Name is required'
    if (!data.bloodType) errors.bloodType = 'Select your blood type'
    if (!data.phone?.trim()) errors.phone = 'Phone is required'
  }

  if (mode === 'reset') {
    if (!data.code?.trim()) {
      errors.code = 'Verification code is required'
    } else if (data.code.trim().length !== 6) {
      errors.code = 'Enter a valid 6-digit code'
    }
  }

  return errors
}

export default function AuthModal({ mode, onClose, onSwitch }) {
  const { login, register, addToast } = useApp()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    bloodType: '',
    phone: '',
    role: 'donor',
    code: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((errs) => ({ ...errs, [k]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(form, mode)
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setLoading(true)
    setErrors({})

    try {
      if (mode === 'login') {
        const res = await login(form.email, form.password)
        if (res && res.success === false) {
          setErrors({ form: res.error || 'Invalid email or password' })
        } else {
          setSuccess(true)
          setTimeout(onClose, 800)
        }
      } else if (mode === 'register') {
        const res = await register({
          name: form.name,
          email: form.email,
          password: form.password,
          bloodType: form.bloodType,
          phone: form.phone,
          role: form.role,
        })
        if (res && res.success === false) {
          setErrors({ form: res.error || 'Registration failed' })
        } else {
          setSuccess(true)
          setTimeout(onClose, 800)
        }
      } else if (mode === 'forgot') {
        await donorApi.forgotPassword(form.email)
        addToast('Verification code sent to your Gmail inbox!', 'success')
        onSwitch('reset')
      } else if (mode === 'reset') {
        await donorApi.resetPassword(form.email, form.code, form.password)
        addToast('Password reset successfully! Please sign in with your new password.', 'success')
        setForm((f) => ({ ...f, password: '', code: '' }))
        onSwitch('login')
      }
    } catch (err) {
      setErrors({ form: err.message || 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const err = (k) => errors[k] && <p className="text-xs text-crimson-500 mt-1">{errors[k]}</p>

  const getHeaders = () => {
    switch (mode) {
      case 'login':
        return {
          title: 'Welcome Back',
          sub: 'Sign in to your account',
        }
      case 'register':
        return {
          title: 'Join BloodConnect',
          sub: 'Create your donor profile',
        }
      case 'forgot':
        return {
          title: 'Forgot Password?',
          sub: 'Enter your email to receive a 6-digit verification code in Gmail',
        }
      case 'reset':
        return {
          title: 'Reset Password',
          sub: 'Enter the 6-digit code from your Gmail and your new password',
        }
      default:
        return { title: 'Auth', sub: '' }
    }
  }

  const headers = getHeaders()

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-8 animate-slide-up overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="font-display font-bold text-2xl text-crimson-600">
              {mode === 'login' ? 'Welcome back!' : 'Account created!'}
            </h3>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-bold text-2xl text-crimson-600">{headers.title}</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{headers.sub}</p>
              </div>
              <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 rounded-full text-lg">
                ✕
              </button>
            </div>

            {errors.form && (
              <div className="text-sm text-crimson-600 bg-crimson-50 dark:bg-crimson-900/20 border border-crimson-200 dark:border-crimson-800 rounded-lg px-3 py-2 mb-4">
                {errors.form}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              {mode === 'register' && (
                <>
                  {/* Role selector */}
                  <div className="grid grid-cols-2 gap-3">
                    {['donor', 'recipient'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, role: r }))}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          form.role === r
                            ? 'border-crimson-500 bg-crimson-50 dark:bg-crimson-900/20'
                            : 'border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        <div className="text-2xl mb-1">{r === 'donor' ? '🩸' : '🏥'}</div>
                        <div className="text-sm font-semibold capitalize">{r}</div>
                      </button>
                    ))}
                  </div>

                  <div>
                    <input
                      className="input-field"
                      placeholder="Full name"
                      value={form.name}
                      onChange={set('name')}
                    />
                    {err('name')}
                  </div>
                </>
              )}

              <div>
                <input
                  className="input-field"
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={set('email')}
                  readOnly={mode === 'reset'}
                  disabled={mode === 'reset'}
                />
                {err('email')}
              </div>

              {mode === 'reset' && (
                <div>
                  <input
                    className="input-field font-mono text-center tracking-widest text-lg"
                    type="text"
                    maxLength={6}
                    placeholder="6-digit Code"
                    value={form.code}
                    onChange={set('code')}
                  />
                  {err('code')}
                </div>
              )}

              {mode !== 'forgot' && (
                <div>
                  <input
                    className="input-field"
                    type="password"
                    placeholder={mode === 'reset' ? 'New Password (min 6 chars)' : 'Password'}
                    value={form.password}
                    onChange={set('password')}
                  />
                  {err('password')}
                </div>
              )}

              {mode === 'login' && (
                <div className="text-right -mt-2">
                  <button
                    type="button"
                    onClick={() => onSwitch('forgot')}
                    className="text-xs text-crimson-500 hover:underline font-semibold"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === 'register' && (
                <>
                  <div>
                    <select
                      className="input-field"
                      value={form.bloodType}
                      onChange={set('bloodType')}
                    >
                      <option value="">Blood type</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    {err('bloodType')}
                  </div>
                  <div>
                    <input
                      className="input-field"
                      type="tel"
                      placeholder="Phone number"
                      value={form.phone}
                      onChange={set('phone')}
                    />
                    {err('phone')}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 mt-2 text-base"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  'Sign In'
                ) : mode === 'register' ? (
                  'Create Account'
                ) : mode === 'forgot' ? (
                  'Send Reset Code'
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            {mode === 'login' && (
              <p className="text-xs text-center text-neutral-400 dark:text-neutral-500 mt-1">
                Demo donor: alex@example.com / Password123 · Demo admin: admin@bloodconnect.org / AdminPass123
              </p>
            )}

            <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 mt-5">
              {mode === 'login' && (
                <>
                  Don't have an account?{' '}
                  <button
                    className="text-crimson-500 font-semibold hover:underline"
                    onClick={() => onSwitch('register')}
                  >
                    Register here
                  </button>
                </>
              )}
              {mode === 'register' && (
                <>
                  Already have an account?{' '}
                  <button
                    className="text-crimson-500 font-semibold hover:underline"
                    onClick={() => onSwitch('login')}
                  >
                    Sign in
                  </button>
                </>
              )}
              {(mode === 'forgot' || mode === 'reset') && (
                <>
                  Remembered your password?{' '}
                  <button
                    className="text-crimson-500 font-semibold hover:underline"
                    onClick={() => onSwitch('login')}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
