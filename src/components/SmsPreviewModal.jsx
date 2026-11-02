import React from 'react'

/**
 * SmsPreviewModal: Renders a smartphone lock-screen notification mockup
 * to show testers exactly what urgent SMS/WhatsApp alert donors receive.
 */
export default function SmsPreviewModal({ alert, onClose }) {
  if (!alert) return null

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[36px] bg-neutral-900 border-4 border-neutral-700 shadow-2xl p-4 text-white animate-slide-up relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Smartphone top notch & speaker */}
        <div className="flex justify-center mb-4">
          <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neutral-800" />
            <div className="w-8 h-1.5 rounded-full bg-neutral-800" />
          </div>
        </div>

        {/* Lock screen time */}
        <div className="text-center mb-6">
          <p className="text-4xl font-bold tracking-tight">{currentTime}</p>
          <p className="text-xs text-neutral-400 mt-1">Emergency Donor Alert Broadcast</p>
        </div>

        {/* Notification Card: WhatsApp / SMS */}
        <div className="bg-neutral-800/90 border border-neutral-700/80 rounded-2xl p-4 shadow-lg mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🩸</span>
              <strong className="text-white font-semibold">BloodConnect SOS</strong>
            </div>
            <span>Now</span>
          </div>

          <div className="space-y-1">
            <p className="font-bold text-sm text-crimson-400">
              🚨 CRITICAL: {alert.bloodType} Blood Needed Immediately!
            </p>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Patient at <strong>{alert.hospital}</strong> urgently requires <strong>{alert.unitsNeeded || 1} unit(s)</strong> of {alert.bloodType} blood.
            </p>
            <p className="text-[11px] text-neutral-400 pt-1">
              📍 Within 10 km of your location • Tap to accept and save a life.
            </p>
          </div>

          {/* Action buttons inside notification */}
          <div className="flex gap-2 pt-2 border-t border-neutral-700/60 text-center">
            <div className="flex-1 py-1.5 rounded-lg bg-crimson-600 text-white text-xs font-bold shadow">
              I Can Donate Now
            </div>
            <div className="flex-1 py-1.5 rounded-lg bg-neutral-700 text-neutral-300 text-xs font-medium">
              Unavailable
            </div>
          </div>
        </div>

        {/* Informative note */}
        <p className="text-[11px] text-neutral-400 text-center mb-4">
          📱 In production, this notification is dispatched to nearby donors via SMS and WhatsApp Cloud API.
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition-colors"
        >
          Close Preview
        </button>
      </div>
    </div>
  )
}
