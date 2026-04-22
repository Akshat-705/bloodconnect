import React from 'react'
import { useApp } from '../context/AppContext'

const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }

export default function NotificationPanel({ onClose }) {
  const { notifications, markAllRead, markRead, unreadCount } = useApp()

  return (
    <div className="absolute top-full right-0 mt-2 w-80 card overflow-hidden animate-slide-up shadow-xl z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <h3 className="font-semibold text-sm">Notifications</h3>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-crimson-500 font-semibold hover:underline">Mark all read</button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">
            <div className="text-3xl mb-2">🔕</div>No notifications
          </div>
        ) : notifications.map(n => (
          <div
            key={n.id}
            className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${!n.read ? 'bg-crimson-50/40 dark:bg-crimson-900/10' : ''}`}
            onClick={() => markRead(n.id)}
          >
            <span className="text-base mt-0.5 shrink-0">{icons[n.type]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-snug">{n.title}</p>
                {!n.read && <span className="w-2 h-2 bg-crimson-500 rounded-full mt-1 shrink-0" />}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">{n.message}</p>
              <p className="text-[10px] text-neutral-400 mt-1">{n.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
