import React, { useState } from 'react'

/**
 * DonorResponseCard: Displays a donor who accepted the emergency alert,
 * including their blood group, estimated arrival time, distance, and action triggers.
 */
export default function DonorResponseCard({ donor, onConfirmArrival }) {
  const [called, setCalled] = useState(false)
  const [arrived, setArrived] = useState(donor.status === 'Arrived')

  const handleCall = () => {
    setCalled(true)
    setTimeout(() => setCalled(false), 3000)
  }

  const handleArrival = () => {
    setArrived(true)
    onConfirmArrival?.(donor)
  }

  return (
    <div className="card p-4 transition-all duration-300 border-l-4 border-crimson-500 hover:shadow-md animate-slide-up flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Donor Bio & Blood Group */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-crimson-100 dark:bg-crimson-900/30 text-crimson-600 dark:text-crimson-400 flex flex-col items-center justify-center font-bold font-display shadow-sm">
          <span className="text-sm leading-none">{donor.bloodType}</span>
          <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70">Donor</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-900 dark:text-white text-base">{donor.donorName}</h4>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {arrived ? 'At Hospital' : donor.status || 'En Route'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            📍 {donor.distance || '3.5 km away'} • ⏱️ ETA: <strong className="text-crimson-600 dark:text-crimson-400">{donor.eta || '15 mins'}</strong>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={handleCall}
          className={`btn-secondary text-xs py-2 px-3 flex-1 sm:flex-initial flex items-center justify-center gap-1.5 transition-colors ${
            called ? 'bg-green-50 text-green-600 border-green-300' : ''
          }`}
          title="Simulate calling donor"
        >
          <span>{called ? '📞 Calling…' : '📞 Call'}</span>
        </button>

        {!arrived ? (
          <button
            onClick={handleArrival}
            className="btn-primary text-xs py-2 px-3 flex-1 sm:flex-initial flex items-center justify-center gap-1"
          >
            <span>✓ Confirm Arrival</span>
          </button>
        ) : (
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            ✓ Unit Donating
          </span>
        )}
      </div>
    </div>
  )
}
