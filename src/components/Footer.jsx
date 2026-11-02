import React from 'react'
import { Link } from 'react-router-dom'

const cols = [
  { title: 'Platform', links: [{ label: 'Home', to: '/' }, { label: 'Search Donors', to: '/search' }, { label: 'Emergency', to: '/emergency' }, { label: 'Request Blood', to: '/request' }, { label: 'Donor Hub', to: '/donor-hub' }] },
  { title: 'Company', links: [{ label: 'About Us', to: '/about' }, { label: 'Contact', to: '/contact' }, { label: 'Our Mission', to: '/about' }] },
  { title: 'Legal', links: [{ label: 'Privacy Policy', to: '/contact' }, { label: 'Terms of Service', to: '/contact' }, { label: 'Cookie Policy', to: '/contact' }] },
]

export default function Footer() {
  return (
    <footer className="bg-neutral-900 dark:bg-black text-neutral-400 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-crimson-500 flex items-center justify-center">
                <span className="text-white text-lg">🩸</span>
              </div>
              <span className="font-display font-bold text-xl text-white">BloodConnect</span>
            </Link>
            <p className="text-sm leading-relaxed">Connecting blood donors with recipients in real time. Every donation saves up to three lives.</p>
            <div className="flex gap-3 mt-5">
              {['🐦','💼','📘'].map((s, i) => (
                <button key={i} className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-crimson-500/20 flex items-center justify-center text-base transition-colors">{s}</button>
              ))}
            </div>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{col.title}</h4>
              <ul className="flex flex-col gap-2">
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm hover:text-crimson-400 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-neutral-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">© {new Date().getFullYear()} BloodConnect. All rights reserved.</p>
          <p className="text-xs flex items-center gap-1.5">Made with <span className="text-crimson-500">❤️</span> to save lives</p>
        </div>
      </div>
    </footer>
  )
}
