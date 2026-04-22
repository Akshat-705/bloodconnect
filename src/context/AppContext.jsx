import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AppContext = createContext(null)

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

const MOCK_USER = {
  id: 'u1',
  name: 'Alex Rivera',
  email: 'alex@example.com',
  bloodType: 'O+',
  phone: '+1 555 123 4567',
  location: 'New York, NY',
  totalDonations: 12,
  lastDonation: '2 months ago',
  isAvailable: true,
  role: 'donor',
  points: 1200,
  badges: ['first_donation', 'regular_donor', 'hero', 'silver_donor'],
  rank: 15,
}

const INITIAL_NOTIFICATIONS = [
  { id: 'n1', title: 'Urgent: O+ Blood Needed', message: 'City Hospital requires O+ for emergency surgery.', type: 'warning', timestamp: '10 mins ago', read: false },
  { id: 'n2', title: 'Donation Drive Tomorrow', message: 'Join us at Central Park for the annual blood donation drive.', type: 'info', timestamp: '2 hours ago', read: false },
  { id: 'n3', title: 'Badge Unlocked: Hero!', message: "Congratulations! You've completed 10 donations.", type: 'success', timestamp: '1 day ago', read: true },
]

export function AppProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  const toggleDarkMode = useCallback(() => setDarkMode(d => !d), [])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString()
    setToasts(ts => [...ts, { id, message, type }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  const login = useCallback((email) => {
    const role = email.includes('admin') ? 'admin' : email.includes('recipient') ? 'recipient' : 'donor'
    setUser({ ...MOCK_USER, email, role, name: role === 'admin' ? 'Admin User' : role === 'recipient' ? 'Jane Doe' : 'Alex Rivera' })
    addToast('Welcome back!', 'success')
  }, [addToast])

  const logout = useCallback(() => {
    setUser(null)
    addToast('Logged out successfully.', 'info')
  }, [addToast])

  const register = useCallback((data) => {
    setUser({ ...MOCK_USER, ...data, totalDonations: 0, lastDonation: 'Never', points: 0, badges: [], rank: null })
    addToast('Account created! Welcome to BloodConnect.', 'success')
  }, [addToast])

  const markAllRead = useCallback(() => {
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
  }, [])

  const markRead = useCallback((id) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(u => u ? { ...u, ...updates } : u)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <AppContext.Provider value={{
      darkMode, toggleDarkMode,
      user, login, logout, register, updateUser,
      notifications, unreadCount, markAllRead, markRead,
      toasts, addToast,
    }}>
      {children}
    </AppContext.Provider>
  )
}
