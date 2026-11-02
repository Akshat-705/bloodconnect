import React, { useState, useRef, useCallback, useEffect } from 'react'
import { donorApi, donationApi, certificateApi, TRACKING_STAGES, stageColor, stageProgress, formatDate, trackingApi, logsApi } from '../services/donorApi'
import { useApp } from '../context/AppContext'
import BloodCompatibilityMatrix from '../components/BloodCompatibilityMatrix'
import { useNavigate } from 'react-router-dom'

// ─── Sub-components ─────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

function Badge({ stage }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${stageColor(stage)}`}>
      {TRACKING_STAGES.find(s => s.key === stage)?.icon} {stage}
    </span>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 sm:w-40 shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 dark:text-white ${mono ? 'font-mono font-bold tracking-wider' : ''}`}>{value || '—'}</span>
    </div>
  )
}

function printCertificate(cert) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent('https://bloodconnect.org/verify?id=' + cert.certificateId)}`
  const printWindow = window.open('', '_blank', 'width=900,height=650')
  if (!printWindow) return alert('Please allow popups to download/print your certificate.')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>BloodConnect Certificate - ${cert.certificateId}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: 'Georgia', serif; margin: 0; padding: 15px; background: #fff; color: #1a1a1a; }
          .cert-border { border: 8px double #dc2626; padding: 25px 35px; text-align: center; position: relative; background: #fffdfd; border-radius: 12px; }
          .header { text-transform: uppercase; font-size: 13px; letter-spacing: 3px; color: #991b1b; font-weight: bold; margin-bottom: 6px; font-family: sans-serif; }
          .title { font-size: 32px; color: #b91c1c; font-weight: bold; margin: 8px 0; font-family: 'Times New Roman', serif; }
          .subtitle { font-size: 13px; color: #666; font-style: italic; margin-bottom: 20px; }
          .cert-body { font-size: 17px; line-height: 1.8; max-width: 720px; margin: 0 auto 25px; }
          .donor-name { font-size: 26px; color: #b91c1c; font-weight: bold; text-decoration: underline; }
          .details-box { display: flex; justify-content: center; gap: 30px; margin: 15px 0; font-family: sans-serif; font-size: 13px; }
          .detail-item { background: #fef2f2; padding: 8px 16px; border-radius: 6px; border: 1px solid #fee2e2; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 35px; padding: 0 30px; }
          .signature { text-align: center; width: 180px; border-top: 2px solid #333; padding-top: 5px; font-size: 12px; font-family: sans-serif; }
          .qr-box { text-align: center; font-size: 10px; font-family: monospace; color: #555; }
          .qr-box img { width: 90px; height: 90px; border: 1px solid #ddd; padding: 2px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="cert-border">
          <div class="header">🩸 National Blood Transfusion & Donor Network</div>
          <div class="title">Certificate of Appreciation</div>
          <div class="subtitle">This official certificate is proudly presented to</div>
          <div class="cert-body">
            <span class="donor-name">${cert.donorName || 'Voluntary Donor'}</span><br/>
            for voluntarily donating <strong style="color: #b91c1c;">${cert.units || '450ml'}</strong> of life-saving
            <strong style="color: #b91c1c;">${cert.bloodType || 'Blood'}</strong> at <strong>${cert.donationCenter || 'Certified Blood Bank'}</strong>.
            Your selfless act has directly contributed to saving up to three precious human lives.
          </div>
          <div class="details-box">
            <div class="detail-item"><strong>Certificate ID:</strong> ${cert.certificateId}</div>
            <div class="detail-item"><strong>Blood Group:</strong> ${cert.bloodType}</div>
            <div class="detail-item"><strong>Date:</strong> ${new Date(cert.issuedAt || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
          </div>
          <div class="footer">
            <div class="signature">
              <strong>Medical Officer</strong><br/>
              Regional Transfusion Center
            </div>
            <div class="qr-box">
              <img src="${qrUrl}" alt="QR" /><br/>
              <span>Scan to Verify</span>
            </div>
            <div class="signature">
              <strong>Director of Operations</strong><br/>
              BloodConnect Network
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

function CertCard({ cert }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('https://bloodconnect.org/verify?id=' + cert.certificateId)}`

  return (
    <div className="relative border-2 border-dashed border-crimson-300 dark:border-crimson-700 rounded-2xl p-6 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-gray-900 overflow-hidden">
      <div className="absolute top-3 right-3 text-4xl opacity-10">🩸</div>
      <div className="text-center mb-4">
        <div className="text-2xl mb-1">🏅</div>
        <h3 className="font-display font-bold text-lg text-crimson-600 dark:text-crimson-400">Blood Donation Certificate</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">BloodConnect Official Certificate</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 my-3 p-3 bg-white/70 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800">
        <img src={qrUrl} alt="QR Code" className="w-16 h-16 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 shrink-0" />
        <div className="text-xs space-y-1 text-center sm:text-left">
          <p className="font-bold text-neutral-800 dark:text-neutral-200">Scannable Verification QR</p>
          <p className="font-mono text-[11px] text-neutral-500 break-all">{cert.verificationHash || 'CERT-HASH-VERIFIED'}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ Digitally Signed & Authenticated</p>
        </div>
      </div>

      <div className="space-y-0.5">
        <InfoRow label="Certificate ID" value={cert.certificateId} mono />
        <InfoRow label="Donor" value={cert.donorName} />
        <InfoRow label="Blood Type" value={cert.bloodType} />
        <InfoRow label="Units" value={cert.units} />
        <InfoRow label="Center" value={cert.donationCenter} />
        <InfoRow label="Issued" value={formatDate(cert.issuedAt)} />
      </div>

      <div className="mt-5 flex justify-center">
        <button
          onClick={() => printCertificate(cert)}
          className="btn-primary py-2 px-5 text-xs flex items-center justify-center gap-2 shadow-sm"
        >
          🖨️ Download / Print Certificate (PDF)
        </button>
      </div>
    </div>
  )
}

function TrackTimeline({ tracking }) {
  const progress = stageProgress(tracking.currentStage)
  const completedKeys = new Set(tracking.stages.map(s => s.stage))

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-crimson-500 to-crimson-400 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {TRACKING_STAGES.map((s, idx) => {
          const stageData = tracking.stages.find(st => st.stage === s.key)
          const isCompleted = completedKeys.has(s.key)
          const isCurrent = tracking.currentStage === s.key
          const isPending = !isCompleted

          return (
            <div key={s.key} className="flex gap-4">
              {/* Left: connector */}
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 border-2 transition-all ${
                  isCompleted
                    ? 'bg-crimson-500 border-crimson-500 text-white shadow-crimson'
                    : isCurrent
                    ? 'bg-white dark:bg-gray-900 border-crimson-400 text-crimson-500 animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                }`}>
                  {isCompleted ? '✓' : s.icon}
                </div>
                {idx < TRACKING_STAGES.length - 1 && (
                  <div className={`w-0.5 h-8 mt-1 ${isCompleted ? 'bg-crimson-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
              {/* Right: content */}
              <div className={`pb-6 flex-1 ${idx === TRACKING_STAGES.length - 1 ? 'pb-0' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold text-sm ${isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {s.key}
                  </span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-crimson-100 text-crimson-600 dark:bg-crimson-900/30 dark:text-crimson-400 uppercase tracking-wide">
                      Current
                    </span>
                  )}
                </div>
                {stageData ? (
                  <div className="mt-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stageData.note}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatDate(stageData.timestamp)} · {stageData.actor}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5 italic">{s.desc}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab: Register Identity ──────────────────────────────────────────────────
function RegisterTab({ onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', bloodType: '', phone: '', dob: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { addToast } = useApp()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name || !form.email || !form.bloodType) {
      setError('Name, email, and blood type are required.')
      return
    }
    setLoading(true); setError('')
    try {
      const res = await donorApi.register(form)
      addToast(`Donor ID created: ${res.donor.donorId}`, 'success')
      onSuccess(res.donor)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 border-l-4 border-crimson-500">
        <div className="flex gap-3">
          <span className="text-2xl">🆔</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Create Your Donor Identity</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Register once. Get a unique Donor ID, Donation Tracking ID, and official certificate after each donation.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" placeholder="Your full name" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="label">Email Address *</label>
            <input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Password (optional — set now to sign in)</label>
            <input className="input" type="password" placeholder="Create a password (min 6 chars)" value={form.password} onChange={set('password')} />
          </div>
          <div>
            <label className="label">Blood Type *</label>
            <select className="input" value={form.bloodType} onChange={set('bloodType')}>
              <option value="">Select blood type</option>
              {['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input className="input" type="date" value={form.dob} onChange={set('dob')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address / City</label>
            <input className="input" placeholder="City, State" value={form.address} onChange={set('address')} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <span>⚠️</span>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full py-3 text-base"
        >
          {loading ? <><Spinner /> Creating Identity…</> : '🆔 Create Donor Identity'}
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Record Donation ─────────────────────────────────────────────────────
function DonateTab({ donor, onSuccess }) {
  const [form, setForm] = useState({ donorId: donor?.donorId || '', bloodType: donor?.bloodType || '', units: '450ml', donationCenter: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const { addToast } = useApp()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.donorId || !form.bloodType) { setError('Donor ID and Blood Type required.'); return }
    setLoading(true); setError('')
    try {
      const res = await donationApi.create(form)
      setResult(res)
      addToast(`Donation recorded! Tracking ID: ${res.tracking.trackingId}`, 'success')
      if (onSuccess) onSuccess(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <span className="text-3xl">🎉</span>
          <div>
            <p className="font-bold text-green-700 dark:text-green-400">Donation Recorded Successfully!</p>
            <p className="text-sm text-green-600 dark:text-green-300">Your blood will save lives. Thank you!</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: 'Donation ID', value: result.donation.donationId, icon: '🔖' },
            { label: 'Tracking ID', value: result.tracking.trackingId, icon: '📍' },
            { label: 'Certificate ID', value: result.certificate.certificateId, icon: '🏅' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card p-4 text-center hover-lift">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className="font-mono font-bold text-xs text-crimson-600 dark:text-crimson-400 break-all">{value}</p>
            </div>
          ))}
        </div>

        <CertCard cert={result.certificate} />

        <button onClick={() => setResult(null)} className="btn-secondary w-full">Record Another Donation</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 border-l-4 border-red-500">
        <div className="flex gap-3">
          <span className="text-2xl">🩸</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Record a New Donation</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Enter your Donor ID to record a donation. You'll receive a Tracking ID and Certificate automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Donor ID *</label>
            <input className="input font-mono" placeholder="DID-XX-XXXXXX" value={form.donorId} onChange={set('donorId')} />
          </div>
          <div>
            <label className="label">Blood Type *</label>
            <select className="input" value={form.bloodType} onChange={set('bloodType')}>
              <option value="">Select blood type</option>
              {['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Units Donated</label>
            <select className="input" value={form.units} onChange={set('units')}>
              <option>450ml</option><option>350ml</option><option>500ml</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Donation Center / Hospital</label>
            <input className="input" placeholder="e.g. City Hospital, Chandigarh" value={form.donationCenter} onChange={set('donationCenter')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes (optional)</label>
            <textarea className="input resize-none" rows={2} placeholder="Any notes…" value={form.notes} onChange={set('notes')} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <span>⚠️</span>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button onClick={submit} disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? <><Spinner /> Recording…</> : '🩸 Record Donation & Generate IDs'}
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Track Blood ─────────────────────────────────────────────────────────
function TrackTab() {
  const [trackingId, setTrackingId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tracking, setTracking] = useState(null)

  const search = async () => {
    if (!trackingId.trim()) { setError('Enter a Tracking ID'); return }
    setLoading(true); setError('')
    try {
      const res = await trackingApi.get(trackingId.trim().toUpperCase())
      setTracking(res.tracking)
    } catch (err) {
      setError(err.message)
      setTracking(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 border-l-4 border-blue-500">
        <div className="flex gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Track Your Blood Donation</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Enter your Tracking ID to follow your donation from collection to delivery.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <label className="label">Tracking ID</label>
        <div className="flex gap-2">
          <input
            className="input font-mono flex-1"
            placeholder="TRK-XXXXXXXX"
            value={trackingId}
            onChange={e => setTrackingId(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button onClick={search} disabled={loading} className="btn-primary px-5">
            {loading ? <Spinner /> : '🔍'}
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <span>⚠️</span>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {tracking && (
        <div className="card p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tracking ID</p>
              <p className="font-mono font-bold text-crimson-600 dark:text-crimson-400">{tracking.trackingId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Blood Type</p>
              <span className="inline-block px-3 py-1 rounded-full bg-crimson-100 dark:bg-crimson-900/30 text-crimson-700 dark:text-crimson-300 font-bold text-sm">
                {tracking.bloodType}
              </span>
            </div>
            <Badge stage={tracking.currentStage} />
          </div>
          <TrackTimeline tracking={tracking} />
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-4 text-right">
            Last updated: {formatDate(tracking.updatedAt)}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Certificate Scanner ─────────────────────────────────────────────────
function ScanTab({ onIdentityFound }) {
  const fileRef = useRef()
  const [file, setFile] = useState(null)
  const [certIdInput, setCertIdInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [verifyHash, setVerifyHash] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const { addToast } = useApp()

  const handleFile = (e) => {
    setFile(e.target.files[0])
    setResult(null); setError('')
  }

  const scan = async () => {
    if (!file && !certIdInput) { setError('Upload a file or enter a Certificate ID.'); return }
    setLoading(true); setError('')
    try {
      let res
      if (file) {
        res = await certificateApi.scan(file, certIdInput ? { certificateId: certIdInput } : {})
      } else {
        // Just fetch by ID
        const cert = await certificateApi.get(certIdInput.trim())
        res = { action: 'fetched', certificate: cert.certificate, message: 'Certificate found.' }
      }
      setResult(res)
      if (res.action === 'fetched' && res.donor) {
        addToast('Identity found from certificate!', 'success')
        onIdentityFound?.(res.donor)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verify = async () => {
    if (!certIdInput || !verifyHash) { setError('Enter Certificate ID and verification hash.'); return }
    setVerifying(true); setError('')
    try {
      const res = await certificateApi.verify(certIdInput.trim(), verifyHash.trim())
      setVerifyResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 border-l-4 border-purple-500">
        <div className="flex gap-3">
          <span className="text-2xl">🔍</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Scan / Verify Certificate</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Upload a certificate image to scan, or enter a Certificate ID to fetch identity. If found, your profile is loaded. If not, register to create one.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        {/* File Upload */}
        <div>
          <label className="label">Upload Certificate (Image / PDF)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-crimson-400 transition-colors"
          >
            {file ? (
              <div>
                <p className="text-2xl mb-1">📄</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <>
                <p className="text-3xl mb-2">📁</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload or drag & drop</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 10MB</p>
              </>
            )}
            <input ref={fileRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.pdf" onChange={handleFile} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">or enter manually</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        <div>
          <label className="label">Certificate ID</label>
          <input
            className="input font-mono"
            placeholder="CERT-XXXXXXXXXX"
            value={certIdInput}
            onChange={e => setCertIdInput(e.target.value.toUpperCase())}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <span>⚠️</span><p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button onClick={scan} disabled={loading} className="btn-primary w-full">
          {loading ? <><Spinner /> Scanning…</> : '🔍 Scan & Fetch Identity'}
        </button>

        {result && (
          <div className={`p-4 rounded-xl border ${result.action === 'fetched' ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span>{result.action === 'fetched' ? '✅' : '⚠️'}</span>
              <p className="font-semibold text-sm">{result.action === 'fetched' ? 'Identity Found!' : 'Not Found – Please Register'}</p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{result.message}</p>
            {result.certificate && <CertCard cert={result.certificate} />}
          </div>
        )}
      </div>

      {/* Verification Panel */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span>🛡️</span> Verify Certificate Authenticity
        </h3>
        <div>
          <label className="label">Verification Hash</label>
          <input
            className="input font-mono"
            placeholder="16-char hash from your certificate"
            value={verifyHash}
            onChange={e => setVerifyHash(e.target.value.toUpperCase())}
          />
        </div>
        <button onClick={verify} disabled={verifying} className="btn-secondary w-full">
          {verifying ? <><Spinner /> Verifying…</> : '🛡️ Verify Hash'}
        </button>
        {verifyResult && (
          <div className={`p-4 rounded-xl border text-center ${verifyResult.verified ? 'bg-green-50 dark:bg-green-900/20 border-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-300'}`}>
            <p className="text-2xl mb-1">{verifyResult.verified ? '✅' : '❌'}</p>
            <p className="font-bold text-sm">{verifyResult.verified ? 'Certificate is Authentic' : 'Certificate NOT Valid'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Admin Panel ─────────────────────────────────────────────────────────
function AdminTab() {
  const { user, login } = useApp()
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const authed = user?.role === 'admin'
  const [trackingId, setTrackingId] = useState('')
  const [tracking, setTracking] = useState(null)
  const [stage, setStage] = useState('')
  const [note, setNote] = useState('')
  const [actor, setActor] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [logs, setLogs] = useState([])
  const { addToast } = useApp()

  const fetchTracking = async () => {
    if (!trackingId) return
    setFetching(true); setError(''); setTracking(null)
    try {
      const res = await trackingApi.get(trackingId.trim().toUpperCase())
      setTracking(res.tracking)
      setStage('')
    } catch (err) {
      setError(err.message)
    } finally {
      setFetching(false)
    }
  }

  const updateStatus = async () => {
    if (!stage) { setError('Select a stage'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await trackingApi.update(tracking.trackingId, { stage, note, actor: actor || 'Admin Panel' })
      setTracking(res.tracking)
      setSuccess(`Updated to: ${stage}`)
      addToast(res.message, 'success')
      setNote(''); setStage('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      const res = await logsApi.get({ limit: 20 })
      setLogs(res.logs)
    } catch {}
  }

  useEffect(() => {
    if (authed) fetchLogs()
  }, [authed])

  if (!authed) {
    const handleAdminLogin = async (e) => {
      e.preventDefault()
      setLoginError('')
      setLoggingIn(true)
      try {
        await login(loginForm.email, loginForm.password)
        // `login` sets the user in context; if that account isn't an admin,
        // the panel below will show a "not authorized" message instead.
      } catch (err) {
        setLoginError(err.message || 'Login failed')
      } finally {
        setLoggingIn(false)
      }
    }

    return (
      <div className="max-w-sm mx-auto">
        <div className="card p-8 text-center space-y-5">
          <div className="text-5xl">🏥</div>
          <h3 className="font-display font-bold text-xl">Admin / Hospital Panel</h3>
          {user ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You're signed in as <strong>{user.email}</strong>, but this account doesn't have admin access.
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Sign in with an admin account to access this panel.</p>
          )}
          {!user && (
            <form onSubmit={handleAdminLogin} className="space-y-3 text-left">
              <input
                className="input"
                type="email"
                placeholder="Admin email"
                value={loginForm.email}
                onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                required
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                required
              />
              <button type="submit" disabled={loggingIn} className="btn-primary w-full">
                {loggingIn ? <Spinner /> : '🔓 Sign In'}
              </button>
              <p className="text-xs text-gray-400 text-center">Demo admin: admin@bloodconnect.org / AdminPass123</p>
            </form>
          )}
          {loginError && <p className="text-sm text-red-500">{loginError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 border-l-4 border-orange-500 flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <span className="text-2xl">🏥</span>
          <div>
            <p className="font-semibold">Admin / Hospital Panel</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Update blood tracking status securely</p>
          </div>
        </div>
        <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold">✓ Authenticated</span>
      </div>

      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Update Tracking Status</h3>
        <div className="flex gap-2">
          <input
            className="input font-mono flex-1"
            placeholder="TRK-XXXXXXXX"
            value={trackingId}
            onChange={e => setTrackingId(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && fetchTracking()}
          />
          <button onClick={fetchTracking} disabled={fetching} className="btn-secondary px-4">
            {fetching ? <Spinner /> : 'Fetch'}
          </button>
        </div>

        {tracking && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div><p className="text-xs text-gray-500">Donor</p><p className="text-sm font-semibold">{tracking.donorId}</p></div>
              <div><p className="text-xs text-gray-500">Blood</p><p className="text-sm font-bold text-crimson-600 dark:text-crimson-400">{tracking.bloodType}</p></div>
              <div><p className="text-xs text-gray-500">Current Stage</p><Badge stage={tracking.currentStage} /></div>
            </div>

            <div>
              <label className="label">Move to Stage</label>
              <select className="input" value={stage} onChange={e => setStage(e.target.value)}>
                <option value="">Select next stage…</option>
                {TRACKING_STAGES.map(s => (
                  <option key={s.key} value={s.key}>{s.icon} {s.key}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Update Note</label>
              <input className="input" placeholder="e.g. Tests cleared, moving to blood bank…" value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div>
              <label className="label">Actor (Your Name / Dept)</label>
              <input className="input" placeholder="Dr. Sharma / Blood Bank Team" value={actor} onChange={e => setActor(e.target.value)} />
            </div>

            {error && <div className="flex gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"><span>⚠️</span><p className="text-sm text-red-500">{error}</p></div>}
            {success && <div className="flex gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"><span>✅</span><p className="text-sm text-green-600">{success}</p></div>}

            <button onClick={updateStatus} disabled={loading} className="btn-primary w-full">
              {loading ? <><Spinner /> Updating…</> : '📤 Update Status'}
            </button>

            <div className="mt-2">
              <TrackTimeline tracking={tracking} />
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">📋 Audit Logs</h3>
          <button onClick={fetchLogs} className="btn-ghost text-xs py-1 px-3">Refresh</button>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No logs yet. Actions will appear here.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {logs.map(l => (
              <div key={l.id} className="flex gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="w-2 h-2 rounded-full bg-crimson-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{l.action}</span>
                    <span className="text-xs text-gray-400">{l.entityType}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono truncate">{l.entityId}</p>
                  <p className="text-[11px] text-gray-400">{formatDate(l.timestamp)} · {l.actor}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'register', label: 'Register', icon: '🆔' },
  { key: 'donate', label: 'Donate', icon: '🩸' },
  { key: 'track', label: 'Track', icon: '📍' },
  { key: 'scan', label: 'Scan / Verify', icon: '🔍' },
  { key: 'match', label: 'Matchmaker', icon: '🧬' },
  { key: 'admin', label: 'Admin', icon: '🏥' },
]

export default function DonorHub() {
  const [activeTab, setActiveTab] = useState('register')
  const [registeredDonor, setRegisteredDonor] = useState(null)
  const navigate = useNavigate()

  const handleRegisterSuccess = useCallback((donor) => {
    setRegisteredDonor(donor)
    setActiveTab('donate')
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crimson-100 dark:bg-crimson-900/30 text-crimson-600 dark:text-crimson-400 text-xs font-bold uppercase tracking-wide mb-4">
          🩸 Donor Identity System
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-gray-900 dark:text-white mb-3">
          BloodConnect <span className="text-gradient">Donor Hub</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base max-w-xl mx-auto">
          Register your identity, record donations, track your blood from collection to delivery, and verify certificates — all in one place.
        </p>
      </div>

      {/* If registered, show quick ID card */}
      {registeredDonor && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-crimson-50 to-red-50 dark:from-crimson-900/20 dark:to-red-900/10 border border-crimson-200 dark:border-crimson-800 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Logged in as</p>
            <p className="font-bold text-gray-900 dark:text-white">{registeredDonor.name}</p>
            <p className="font-mono text-xs text-crimson-600 dark:text-crimson-400">{registeredDonor.donorId}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-crimson-100 dark:bg-crimson-900/30 text-crimson-600 text-xs font-bold">
              {registeredDonor.bloodType}
            </span>
            <button onClick={() => setRegisteredDonor(null)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
          </div>
        </div>
      )}

      {/* Tab Nav */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === key
                ? 'bg-white dark:bg-gray-900 text-crimson-600 dark:text-crimson-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="hidden sm:inline">{icon}</span>
            <span className="text-xs sm:text-sm">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-slide-up">
        {activeTab === 'register' && <RegisterTab onSuccess={handleRegisterSuccess} />}
        {activeTab === 'donate' && <DonateTab donor={registeredDonor} onSuccess={() => {}} />}
        {activeTab === 'track' && <TrackTab />}
        {activeTab === 'scan' && <ScanTab onIdentityFound={(d) => { setRegisteredDonor(d); setActiveTab('donate') }} />}
        {activeTab === 'match' && (
          <div className="space-y-4">
            <BloodCompatibilityMatrix
              selectedBloodType={registeredDonor?.bloodType || 'O+'}
              onApplyFilter={(grp) => navigate(`/search`)}
            />
          </div>
        )}
        {activeTab === 'admin' && <AdminTab />}
      </div>
    </div>
  )
}
