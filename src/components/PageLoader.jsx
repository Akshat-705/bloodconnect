import React from 'react'

export default function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-crimson-100 dark:border-neutral-700 border-t-crimson-500 rounded-full animate-spin" />
        <p className="text-sm text-neutral-400 font-medium">Loading…</p>
      </div>
    </div>
  )
}
