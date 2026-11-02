import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { SkeletonStat } from '../components/Skeleton'

const stats = [
  { label: 'Verified Donors', value: '12,458', icon: '🩸' },
  { label: 'Lives Saved', value: '8,234', icon: '💖' },
  { label: 'Active Requests', value: '156', icon: '🚨' },
  { label: 'Cities Covered', value: '340+', icon: '🌍' },
]

const features = [
  { icon: '🚨', title: 'Emergency Alerts', desc: 'Broadcast urgent requests to all nearby donors instantly.', to: '/emergency', color: 'from-crimson-500 to-crimson-700' },
  { icon: '🔍', title: 'Find Donors', desc: 'Search verified donors by blood type and location.', to: '/search', color: 'from-blue-500 to-blue-700' },
  { icon: '💉', title: 'Request Blood', desc: 'Submit a blood request and get matched quickly.', to: '/request', color: 'from-violet-500 to-violet-700' },
  { icon: '🆔', title: 'Donor Hub', desc: 'Register identity, track your donation, and get a verified certificate.', to: '/donor-hub', color: 'from-emerald-500 to-teal-600' },
  { icon: '🗺️', title: 'Live Map', desc: 'View real-time donor availability near you.', to: '/search', color: 'from-cyan-500 to-blue-600' },
]

const testimonials = [
  { name: 'Dr. Priya Sharma', role: 'Emergency Physician, Apollo Hospital', quote: 'BloodConnect has been a lifesaver — literally. We found a rare AB- donor in under 20 minutes during a critical surgery.', avatar: 'P' },
  { name: 'Marcus Williams', role: 'Regular Donor, 14 donations', quote: "I've donated 14 times through this platform. The experience is seamless and knowing I'm saving lives keeps me coming back.", avatar: 'M' },
  { name: 'Aisha Patel', role: 'Recipient family member', quote: 'When my brother needed blood urgently, BloodConnect connected us with 3 compatible donors within the hour. Incredible platform.', avatar: 'A' },
]

export default function Home() {
  const { user } = useApp()
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setStatsLoading(false), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-crimson-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-crimson-400/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-crimson-50 dark:bg-crimson-900/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-slide-up">
            <div className="section-tag mb-6">
              <span className="w-1.5 h-1.5 bg-crimson-500 rounded-full animate-pulse" />
              Real-time blood donor network
            </div>
            <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl leading-[1.1] tracking-tight mb-6">
              Emergency Blood,{' '}
              <span className="text-gradient">Instantly</span>{' '}
              Connected
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed mb-10 max-w-lg">
              Connect with verified blood donors in your area within minutes. Our real-time matching platform has saved over 8,000 lives and counting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/search" className="btn-primary text-base px-8 py-4 shadow-crimson-lg">
                🔍 Find Donors Now
              </Link>
              <Link to={user ? '/profile' : '/emergency'} className="btn-secondary text-base px-8 py-4">
                🚨 Emergency Alert
              </Link>
            </div>

            <div className="flex items-center gap-4 mt-10 text-sm text-neutral-500 dark:text-neutral-400">
              <div className="flex -space-x-2">
                {['S','M','A','J','K'].map((l,i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-crimson-400 to-crimson-600 border-2 border-white dark:border-neutral-900 flex items-center justify-center text-white text-xs font-bold">{l}</div>
                ))}
              </div>
              <span><strong className="text-neutral-800 dark:text-neutral-200">2,400+</strong> donors joined this week</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center animate-fade-in">
            <div className="relative">
              <div className="w-80 h-80 rounded-full bg-gradient-to-br from-crimson-100 to-crimson-200 dark:from-crimson-900/30 dark:to-crimson-800/20 flex items-center justify-center">
                <div className="w-56 h-56 rounded-full bg-gradient-to-br from-crimson-400 to-crimson-600 flex items-center justify-center shadow-crimson-lg heartbeat">
                  <span className="text-8xl">🩸</span>
                </div>
              </div>
              {/* floating badges */}
              {[
                { pos: '-top-4 -left-8', label: 'O+ Available', sub: '3 donors nearby' },
                { pos: '-bottom-4 -right-8', label: 'A- Needed', sub: 'City Hospital' },
              ].map((b, i) => (
                <div key={i} className={`absolute ${b.pos} card px-4 py-2.5 shadow-lg animate-fade-in`} style={{ animationDelay: `${(i+1)*0.4}s` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <div>
                      <p className="text-xs font-bold">{b.label}</p>
                      <p className="text-[10px] text-neutral-400">{b.sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {statsLoading
            ? Array(4).fill(0).map((_, i) => <SkeletonStat key={i} />)
            : stats.map((s, i) => (
              <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i*0.1}s` }}>
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="font-display font-bold text-3xl text-crimson-600 dark:text-crimson-400">{s.value}</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{s.label}</div>
              </div>
            ))
          }
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="section-tag mx-auto mb-4">Quick Actions</div>
          <h2 className="font-display font-bold text-4xl">Everything You Need to Save Lives</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-3 max-w-xl mx-auto">From emergency alerts to scheduled donations, BloodConnect has you covered at every step.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <Link key={i} to={f.to} className="card p-6 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in" style={{ animationDelay: `${i*0.1}s` }}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{f.desc}</p>
              <div className="mt-4 text-crimson-500 text-sm font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Get started →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-neutral-900 dark:bg-black py-20 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-crimson-900/40 text-crimson-400 text-xs font-semibold uppercase tracking-widest mb-4">
              Testimonials
            </div>
            <h2 className="font-display font-bold text-4xl text-white">Stories That Matter</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700 hover:border-crimson-500/40 transition-colors animate-fade-in" style={{ animationDelay: `${i*0.15}s` }}>
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => <span key={s} className="text-amber-400 text-sm">★</span>)}
                </div>
                <p className="text-neutral-300 text-sm leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-crimson-500 flex items-center justify-center text-white font-bold">{t.avatar}</div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-neutral-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="bg-gradient-to-br from-crimson-500 to-crimson-700 rounded-3xl p-12 shadow-crimson-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-noise opacity-30" />
          <div className="relative">
            <div className="text-5xl mb-4">💖</div>
            <h2 className="font-display font-bold text-4xl text-white mb-4">Ready to Save a Life Today?</h2>
            <p className="text-crimson-100 text-lg mb-8 max-w-xl mx-auto">Join thousands of heroes who have already registered. It only takes two minutes to sign up.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/search" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-crimson-600 font-bold text-base hover:bg-crimson-50 active:scale-95 transition-all shadow-lg">
                🔍 Find a Donor
              </Link>
              <Link to="/request" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/40 text-white font-bold text-base hover:bg-white/10 active:scale-95 transition-all">
                💉 Request Blood
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
