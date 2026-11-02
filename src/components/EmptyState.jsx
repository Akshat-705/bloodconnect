import React from 'react'

export default function EmptyState({ icon = '🔍', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="text-6xl mb-4 opacity-60">{icon}</div>
      <h3 className="font-display font-bold text-xl text-neutral-700 dark:text-neutral-300 mb-2">{title}</h3>
      {description && <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm leading-relaxed mb-6">{description}</p>}
      {action}
    </div>
  )
}
