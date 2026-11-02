import React from 'react'

/**
 * EmergencyRadar: Displays an animated radar sweep, target compatibility groups,
 * and live progress of blood units committed.
 */
export default function EmergencyRadar({
  alert,
  compatibleTypes = [],
  unitsNeeded = 1,
  unitsCommitted = 0,
}) {
  const percent = Math.min(Math.round((unitsCommitted / unitsNeeded) * 100), 100)
  const isFulfilled = unitsCommitted >= unitsNeeded

  return (
    <div className="card p-6 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white border border-neutral-800 shadow-2xl relative overflow-hidden">
      {/* Background radar grid effect */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
        {/* Animated Radar Pulse Circle */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-crimson-500/30 animate-ping opacity-75" />
          <div className="absolute inset-2 rounded-full border border-crimson-500/40 animate-pulse" />
          <div className="absolute inset-6 rounded-full border border-crimson-500/60" />
          <div className="absolute inset-10 rounded-full bg-crimson-500/10" />
          
          {/* Radar rotating sweep line */}
          <div className="absolute inset-0 rounded-full border border-crimson-500/80 [background:conic-gradient(from_0deg,transparent_0_300deg,rgba(239,68,68,0.4)_360deg)] animate-spin [animation-duration:3s]" />

          {/* Center SOS Beacon */}
          <div className="relative z-10 w-12 h-12 rounded-full bg-crimson-600 text-white flex flex-col items-center justify-center font-bold text-xs shadow-lg shadow-crimson-600/50">
            <span>🚨</span>
            <span className="text-[9px] tracking-wider uppercase">SOS</span>
          </div>
        </div>

        {/* Radar Details & Mission Stats */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-crimson-500/20 text-crimson-400 border border-crimson-500/40 animate-pulse">
              ● LIVE BROADCAST ACTIVE
            </span>
            <span className="text-xs text-neutral-400">Radius: <strong>10 km</strong></span>
            <span className="text-xs text-neutral-400">Target: <strong className="text-crimson-400">{alert?.bloodType || '—'}</strong></span>
          </div>

          <p className="text-sm text-neutral-300">
            Emergency broadcast dispatched to all compatible donor groups within radius:
          </p>

          {/* Compatible Blood Types Badges */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1">
            <span className="text-xs text-neutral-400 mr-1 font-medium">Compatible Donors:</span>
            {compatibleTypes.map((type) => (
              <span
                key={type}
                className="px-2 py-0.5 rounded-md text-xs font-bold bg-neutral-800 text-neutral-200 border border-neutral-700"
              >
                {type}
              </span>
            ))}
          </div>

          {/* Units Required vs Committed Progress Bar */}
          <div className="pt-2">
            <div className="flex justify-between text-xs text-neutral-400 mb-1 font-medium">
              <span>Units Committed: <strong className="text-white">{unitsCommitted} of {unitsNeeded} units</strong></span>
              <span className={isFulfilled ? 'text-green-400 font-bold' : 'text-crimson-400'}>
                {isFulfilled ? '✓ Requirement Met!' : `${percent}% fulfilled`}
              </span>
            </div>
            <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isFulfilled
                    ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                    : 'bg-gradient-to-r from-crimson-600 to-red-400'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
