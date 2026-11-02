import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, getToken, setToken } from '../services/donorApi'

const AppContext = createContext(null)

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
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
  const [authLoading, setAuthLoading] = useState(true)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  // Restore session on load if a token was saved from a previous visit.
  useEffect(() => {
    const token = getToken()
    if (!token) { setAuthLoading(false); return }
    authApi.me()
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null)) // token expired/invalid — clear it silently
      .finally(() => setAuthLoading(false))
  }, [])

  const toggleDarkMode = useCallback(() => setDarkMode(d => !d), [])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString()
    setToasts(ts => [...ts, { id, message, type }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  // Throws on failure so the AuthModal can show the real server-side error
  // (wrong password, duplicate email, weak password, account locked, etc).
  const login = useCallback(async (email, password) => {
    try {
      const res = await authApi.login(email, password)
      setToken(res.token)
      setUser(res.user || res.donor)
      addToast('Welcome back!', 'success')
      return { success: true, user: res.user || res.donor }
    } catch (err) {
      addToast(err.message || 'Login failed', 'error')
      return { success: false, error: err.message }
    }
  }, [addToast])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    addToast('Logged out successfully.', 'info')
  }, [addToast])

  const register = useCallback(async (data) => {
    try {
      const res = await authApi.register(data)
      setToken(res.token)
      setUser(res.user || res.donor)
      addToast('Account created! Welcome to BloodConnect.', 'success')
      return { success: true, user: res.user || res.donor }
    } catch (err) {
      addToast(err.message || 'Registration failed', 'error')
      return { success: false, error: err.message }
    }
  }, [addToast])

  const markAllRead = useCallback(() => {
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
  }, [])

  const markRead = useCallback((id) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(u => u ? { ...u, ...updates } : u) // optimistic update
    authApi.updateProfile(updates).then(
      ({ user }) => setUser(user), // reconcile with server's saved values
      async () => {
        addToast('Could not save your changes. Please try again.', 'error')
        try { const { user } = await authApi.me(); setUser(user) } catch { /* keep optimistic state */ }
      }
    )
  }, [addToast])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <AppContext.Provider value={{
      darkMode, toggleDarkMode,
      user, authLoading, login, logout, register, updateUser,
      notifications, unreadCount, markAllRead, markRead,
      toasts, addToast,
    }}>
      {children}
    </AppContext.Provider>
  )
}
