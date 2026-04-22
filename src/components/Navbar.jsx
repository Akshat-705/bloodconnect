import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AuthModal from './AuthModal'
import NotificationPanel from './NotificationPanel'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Search', to: '/search' },
  { label: 'Emergency', to: '/emergency' },
  { label: 'Request', to: '/request' },
  { label: 'Donor Hub', to: '/donor-hub' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export default function Navbar() {
  const { darkMode, toggleDarkMode, user, logout, unreadCount } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModal, setAuthModal] = useState(null) // 'login' | 'register'
  const [notifOpen, setNotifOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const notifRef = useRef(null)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [navigate])

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-glass dark:shadow-glass-dark' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-crimson-500 flex items-center justify-center shadow-crimson group-hover:scale-110 transition-transform">
                <span className="text-white text-lg leading-none">🩸</span>
              </div>
              <span className="font-display font-bold text-xl text-crimson-600 dark:text-crimson-400">BloodConnect</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map(({ label, to }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-crimson-50 dark:bg-crimson-900/20 text-crimson-600 dark:text-crimson-400'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Dark mode */}
              <button
                onClick={toggleDarkMode}
                className="btn-ghost w-9 h-9 p-0 rounded-full"
                aria-label="Toggle dark mode"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(o => !o)}
                  className="btn-ghost w-9 h-9 p-0 rounded-full relative"
                  aria-label="Notifications"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-crimson-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none border-2 border-white dark:border-neutral-900">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
              </div>

              {/* Auth */}
              {user ? (
                <div className="flex items-center gap-2">
                  <Link to="/profile" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-crimson-50 dark:bg-crimson-900/30 text-crimson-600 dark:text-crimson-400 text-sm font-semibold hover:bg-crimson-100 transition-colors">
                    <span className="w-6 h-6 bg-crimson-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {user.name[0]}
                    </span>
                    {user.name.split(' ')[0]}
                  </Link>
                  <button onClick={logout} className="btn-ghost text-sm px-3 py-1.5">
                    Logout
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <button onClick={() => setAuthModal('login')} className="btn-ghost text-sm">Login</button>
                  <button onClick={() => setAuthModal('register')} className="btn-primary text-sm px-4 py-2">Register</button>
                </div>
              )}

              {/* Mobile hamburger */}
              <button
                className="lg:hidden btn-ghost w-9 h-9 p-0 rounded-full flex flex-col items-center justify-center gap-1"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Menu"
              >
                <span className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <span className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div ref={menuRef} className={`lg:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-screen' : 'max-h-0'}`}>
          <div className="glass border-t border-neutral-100 dark:border-neutral-800 px-4 py-4 flex flex-col gap-1">
            {navLinks.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-medium ${isActive ? 'bg-crimson-50 dark:bg-crimson-900/20 text-crimson-600' : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`
                }
              >
                {label}
              </NavLink>
            ))}
            {!user && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setAuthModal('login'); setMenuOpen(false) }} className="btn-secondary flex-1 py-2.5 text-sm">Login</button>
                <button onClick={() => { setAuthModal('register'); setMenuOpen(false) }} className="btn-primary flex-1 py-2.5 text-sm">Register</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={(m) => setAuthModal(m)}
        />
      )}
    </>
  )
}
