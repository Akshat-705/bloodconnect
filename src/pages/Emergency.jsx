import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { emergencyApi } from '../services/donorApi'
import { BLOOD_GROUPS, getCompatibleDonors, BLOOD_RARITY } from '../utils/bloodCompatibility'
import EmergencyRadar from '../components/EmergencyRadar'
import DonorResponseCard from '../components/DonorResponseCard'
import SmsPreviewModal from '../components/SmsPreviewModal'

/**
 * Validation rules for Emergency Blood Request
 */
function validate(form) {
  const errors = {}
  if (!form.bloodType) errors.bloodType = 'Select a blood type'
  if (!form.hospital?.trim()) errors.hospital = 'Hospital name is required'
  if (!form.contact?.trim()) errors.contact = 'Contact number is required'
  else if (!/^\+?[\d\s\-()]{7,}$/.test(form.contact.trim())) {
    errors.contact = 'Enter a valid phone number'
  }
  if (!form.unitsNeeded || isNaN(form.unitsNeeded) || Number(form.unitsNeeded) < 1) {
    errors.unitsNeeded = 'Enter valid units (1-10)'
  }
  return errors
}

/** Sample pool of realistic donors for prototype demonstration */
const SAMPLE_DONORS = [
  { name: 'Dr. Rahul Verma', type: 'O+', distance: '2.4 km', eta: '11 mins' },
  { name: 'Priya Sharma', type: 'A+', distance: '3.8 km', eta: '16 mins' },
  { name: 'Amitabh Sen', type: 'O-', distance: '5.2 km', eta: '22 mins' },
  { name: 'Kavita Patel', type: 'B+', distance: '4.6 km', eta: '19 mins' },
  { name: 'Sunil Nair', type: 'A-', distance: '6.1 km', eta: '25 mins' },
  { name: 'Deepa Roy', type: 'AB+', distance: '3.1 km', eta: '14 mins' },
]

export default function Emergency() {
  const { addToast } = useApp()

  // ─── Intake Form State ──────────────────────────────────────────────────────
  const [form, setForm] = useState({
    bloodType: '',
    hospital: '',
    contact: '',
    unitsNeeded: 2,
    urgency: 'critical',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // ─── Live Mission / Command Center State ─────────────────────────────────────
  const [activeAlert, setActiveAlert] = useState(null)
  const [compatibleTypes, setCompatibleTypes] = useState([])
  const [respondedDonors, setRespondedDonors] = useState([])
  const [showSmsModal, setShowSmsModal] = useState(false)
  const [isResolved, setIsResolved] = useState(false)

  const timersRef = useRef([])

  // Clean up timers on unmount
  useEffect(() => {
    return () => timersRef.current.forEach((t) => clearTimeout(t))
  }, [])

  const setField = (field) => (e) => {
    const val = e.target.value
    setForm((prev) => ({ ...prev, [field]: val }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  // ─── Submit & Launch Emergency SOS ──────────────────────────────────────────
  const handleLaunchEmergency = async (e) => {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    try {
      const compatible = getCompatibleDonors(form.bloodType)
      setCompatibleTypes(compatible)

      // Persist emergency alert in backend & MongoDB
      const res = await emergencyApi.create({
        bloodType: form.bloodType,
        hospital: form.hospital,
        contact: form.contact,
        unitsNeeded: Number(form.unitsNeeded) || 1,
        urgency: form.urgency,
        notes: form.notes,
      })

      const alertData = res.alert || {
        alertId: `SOS-${Math.floor(100000 + Math.random() * 900000)}`,
        bloodType: form.bloodType,
        hospital: form.hospital,
        contact: form.contact,
        unitsNeeded: Number(form.unitsNeeded) || 2,
        urgency: form.urgency,
      }

      setActiveAlert(alertData)
      setRespondedDonors([])
      setIsResolved(false)
      addToast(`🚨 Emergency SOS ${alertData.alertId} broadcast dispatched!`, 'success')

      // Schedule realistic staggered donor acceptances for demonstration
      scheduleSimulatedDonors(alertData, compatible)
    } catch (err) {
      addToast(err.message || 'Failed to dispatch emergency SOS', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ─── Simulated Donor Acceptances ────────────────────────────────────────────
  const scheduleSimulatedDonors = (alertData, compatible) => {
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current = []

    // Filter sample donors compatible with patient
    const validPool = SAMPLE_DONORS.filter((d) => compatible.includes(d.type))
    const pool = validPool.length ? validPool : SAMPLE_DONORS

    // First incoming donor response at 2.5 seconds
    const t1 = setTimeout(() => {
      const d1 = pool[0] || { name: 'Dr. Rahul Verma', type: alertData.bloodType, distance: '2.8 km', eta: '12 mins' }
      addIncomingDonor(alertData.alertId, d1)
    }, 2500)

    // Second incoming donor response at 6.0 seconds
    const t2 = setTimeout(() => {
      if (pool.length > 1) {
        addIncomingDonor(alertData.alertId, pool[1])
      }
    }, 6000)

    timersRef.current.push(t1, t2)
  }

  const addIncomingDonor = async (alertId, donorObj) => {
    try {
      const responseItem = {
        donorName: donorObj.name,
        bloodType: donorObj.type,
        distance: donorObj.distance,
        eta: donorObj.eta,
        status: 'En Route',
      }
      setRespondedDonors((prev) => [...prev, responseItem])
      addToast(`🟢 ${donorObj.name} (${donorObj.type}) accepted SOS! ETA: ${donorObj.eta}`, 'info')

      // Sync with backend
      if (alertId) {
        await emergencyApi.respond(alertId, responseItem).catch(() => {})
      }
    } catch {}
  }

  // Tester manual trigger to add another donor response
  const handleSimulateMore = () => {
    const randomName = ['Vikram Singh', 'Ananya Gupta', 'Sanjay Dutt', 'Ritu Mathur'][Math.floor(Math.random() * 4)]
    const randomType = compatibleTypes[Math.floor(Math.random() * compatibleTypes.length)] || form.bloodType
    const randomDist = `${(Math.random() * 5 + 1).toFixed(1)} km`
    const randomEta = `${Math.floor(Math.random() * 15 + 8)} mins`

    addIncomingDonor(activeAlert?.alertId, {
      name: randomName,
      type: randomType,
      distance: randomDist,
      eta: randomEta,
    })
  }

  // Mark emergency as successfully resolved
  const handleResolveEmergency = async () => {
    if (activeAlert?.alertId) {
      await emergencyApi.resolve(activeAlert.alertId).catch(() => {})
    }
    setIsResolved(true)
    addToast('Emergency mission completed! Life saved.', 'success')
  }

  // Reset form for next test
  const handleReset = () => {
    timersRef.current.forEach((t) => clearTimeout(t))
    setActiveAlert(null)
    setIsResolved(false)
    setRespondedDonors([])
    setForm({ bloodType: '', hospital: '', contact: '', unitsNeeded: 2, urgency: 'critical', notes: '' })
  }

  const urgencyBadge = {
    critical: 'border-crimson-500 bg-crimson-50 dark:bg-crimson-900/20 text-crimson-600 dark:text-crimson-400',
    high: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    medium: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 1: Resolved / Life Saved Celebration View
  // ══════════════════════════════════════════════════════════════════════════
  if (isResolved) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-slide-up">
        <div className="card p-10 space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-4xl shadow-inner">
            🎉
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Mission Resolved Successfully
            </span>
            <h2 className="font-display font-bold text-3xl text-gray-900 dark:text-white mt-2">
              Life Saved!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-md mx-auto">
              The emergency request for <strong>{activeAlert?.bloodType}</strong> blood at <strong>{activeAlert?.hospital}</strong> has been fulfilled.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400">SOS ID</p>
              <p className="font-mono font-bold text-sm text-crimson-600 dark:text-crimson-400">{activeAlert?.alertId}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400">Donors Responded</p>
              <p className="font-bold text-sm text-gray-900 dark:text-white">{respondedDonors.length} Donors</p>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-400">Status</p>
              <p className="font-bold text-sm text-green-600 dark:text-green-400">100% Fulfilled</p>
            </div>
          </div>

          <div className="pt-2">
            <button onClick={handleReset} className="btn-primary w-full py-3">
              Create Another Emergency Request
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 2: Live Emergency Command Center (Active Mission View)
  // ══════════════════════════════════════════════════════════════════════════
  if (activeAlert) {
    const unitsCommitted = respondedDonors.length
    const unitsNeeded = Number(activeAlert.unitsNeeded) || 1

    return (
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 space-y-6 animate-fade-in">
        {/* Mission Status Header */}
        <div className="card p-6 border-l-4 border-crimson-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚨</span>
              <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white">
                Emergency Command Center
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Hospital: <strong>{activeAlert.hospital}</strong> • SOS ID:{' '}
              <strong className="font-mono text-crimson-600 dark:text-crimson-400">{activeAlert.alertId}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSmsModal(true)}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm"
              title="Preview SMS & WhatsApp notification"
            >
              <span>📱 View SMS Preview</span>
            </button>
            <button
              onClick={handleResolveEmergency}
              className="btn-primary text-xs py-2 px-3 bg-green-600 hover:bg-green-700 border-green-600"
            >
              ✓ Complete Mission
            </button>
          </div>
        </div>

        {/* Animated Radar & Compatibility Monitor */}
        <EmergencyRadar
          alert={activeAlert}
          compatibleTypes={compatibleTypes}
          unitsNeeded={unitsNeeded}
          unitsCommitted={unitsCommitted}
        />

        {/* Real-time Donors Responded Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <span>🩸</span> Responding Donors ({respondedDonors.length})
            </h3>
            <button
              onClick={handleSimulateMore}
              className="btn-ghost text-xs text-crimson-600 dark:text-crimson-400 font-semibold py-1 px-2.5 hover:bg-crimson-50 dark:hover:bg-crimson-900/20 rounded-lg"
              title="Click to simulate another donor acceptance"
            >
              + Simulate Another Donor
            </button>
          </div>

          {respondedDonors.length === 0 ? (
            <div className="card p-8 text-center border-dashed border-2 border-neutral-300 dark:border-neutral-700 space-y-2">
              <div className="inline-block w-6 h-6 border-2 border-crimson-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                Pinging matching donors within 10 km…
              </p>
              <p className="text-xs text-gray-400">
                Compatible donor alerts dispatched. Incoming acceptances will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {respondedDonors.map((donor, idx) => (
                <DonorResponseCard
                  key={idx}
                  donor={donor}
                  onConfirmArrival={() => addToast(`Donor ${donor.donorName} confirmed at hospital!`, 'success')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Prototype Tester Note */}
        <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between flex-wrap gap-2">
          <span>💡 <strong>Testing Tip:</strong> Click "Simulate Another Donor" to test multiple commitments, or "View SMS Preview" to inspect the mobile push notification.</span>
          <button onClick={handleReset} className="underline hover:text-crimson-500">
            Cancel & Reset
          </button>
        </div>

        {/* SMS / WhatsApp Mobile Mockup Modal */}
        {showSmsModal && (
          <SmsPreviewModal alert={activeAlert} onClose={() => setShowSmsModal(false)} />
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 3: Emergency Intake Form (Initial Form Screen)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8 animate-fade-in">
      {/* Red Alert Banner */}
      <div className="flex items-start gap-3.5 p-4 bg-crimson-50 dark:bg-crimson-900/20 border border-crimson-200 dark:border-crimson-800 rounded-2xl shadow-sm">
        <span className="text-3xl mt-0.5 animate-bounce">🚨</span>
        <div>
          <h3 className="font-bold text-crimson-700 dark:text-crimson-400 text-base">
            Emergency Blood Dispatch System
          </h3>
          <p className="text-xs text-crimson-600/90 dark:text-crimson-400/90 mt-0.5 leading-relaxed">
            Broadcasting an alert uses our biological compatibility engine to instantly target all compatible donors within a 10 km radius.
          </p>
        </div>
      </div>

      <div className="card p-8 space-y-6">
        <div>
          <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">
            Broadcast Emergency SOS
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Provide patient requirements below to trigger real-time donor dispatch.
          </p>
        </div>

        <form onSubmit={handleLaunchEmergency} noValidate className="space-y-5">
          {/* Blood Type Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
              Blood Type Needed <span className="text-crimson-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, bloodType: t }))
                    setErrors((e) => ({ ...e, bloodType: undefined }))
                  }}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all duration-150 ${
                    form.bloodType === t
                      ? 'border-crimson-500 bg-crimson-500 text-white shadow-md shadow-crimson-500/30 scale-[1.02]'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-crimson-400 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {errors.bloodType && <p className="text-xs text-crimson-500 mt-1.5">{errors.bloodType}</p>}

            {/* Live Biological Compatibility Note */}
            {form.bloodType && (
              <div className="mt-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                <span>🧬</span>
                <span>
                  <strong>{form.bloodType}</strong> can safely receive from:{' '}
                  <strong className="text-crimson-600 dark:text-crimson-400">
                    {getCompatibleDonors(form.bloodType).join(', ')}
                  </strong>{' '}
                  ({BLOOD_RARITY[form.bloodType]?.label || ''})
                </span>
              </div>
            )}
          </div>

          {/* Units Required & Urgency Level */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                Units Needed <span className="text-crimson-500">*</span>
              </label>
              <select
                className="input-field"
                value={form.unitsNeeded}
                onChange={setField('unitsNeeded')}
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num} Unit{num > 1 ? 's' : ''} ({(num * 450)}ml)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                Urgency Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {['critical', 'high', 'medium'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, urgency: lvl }))}
                    className={`py-2 rounded-lg border-2 text-xs font-bold capitalize transition-all ${
                      form.urgency === lvl
                        ? urgencyBadge[lvl] + ' shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hospital / Facility */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
              Hospital / Donation Center <span className="text-crimson-500">*</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. City Hospital, Trauma Center Block B"
              value={form.hospital}
              onChange={setField('hospital')}
            />
            {errors.hospital && <p className="text-xs text-crimson-500 mt-1">{errors.hospital}</p>}
          </div>

          {/* Contact Person / Phone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
              Emergency Contact Number <span className="text-crimson-500">*</span>
            </label>
            <input
              className="input-field"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.contact}
              onChange={setField('contact')}
            />
            {errors.contact && <p className="text-xs text-crimson-500 mt-1">{errors.contact}</p>}
          </div>

          {/* Case Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
              Clinical Notes (Optional)
            </label>
            <textarea
              className="input-field resize-none text-sm"
              rows={2}
              placeholder="e.g. Emergency bypass surgery, patient in ICU room 4…"
              value={form.notes}
              onChange={setField('notes')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-crimson-500/20"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Broadcasting to Donor Network…</span>
              </>
            ) : (
              <>
                <span>🚨</span>
                <span>Broadcast Emergency SOS Now</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
