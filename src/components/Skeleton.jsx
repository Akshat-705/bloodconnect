import React from 'react'

export function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/5" />
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-3/5" />
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-2/5" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <div className="flex-1 h-9 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
        <div className="w-16 h-9 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="card p-6 text-center animate-pulse">
      <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mx-auto mb-2" />
      <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 mx-auto" />
    </div>
  )
}
