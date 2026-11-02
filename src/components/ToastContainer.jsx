import React from 'react'
import { useApp } from '../context/AppContext'

const bg = { success: 'bg-green-500', error: 'bg-crimson-500', warning: 'bg-amber-500', info: 'bg-blue-500' }
const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }

export default function ToastContainer() {
  const { toasts } = useApp()
  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`${bg[t.type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-sm font-medium animate-slide-up pointer-events-auto max-w-xs`}>
          <span>{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
