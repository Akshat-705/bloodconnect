import React from 'react'
import { Link } from 'react-router-dom'

const team = [
  { name: 'Dr Aditya Vikash', role: 'Co-Founder & CEO', avatar: 'AV', bio: 'Emergency physician with 12 years of experience. Started BloodConnect after witnessing preventable deaths due to blood shortages.' },
  { name: 'Akshat Kumar singh', role: 'Co-Founder & CTO', avatar: 'AKS', bio: 'Former Google engineer passionate about using technology to solve healthcare challenges across underserved communities.' },
  { name: 'Kashish Kumari Keshri', role: 'Head of Operations', avatar: 'KKK', bio: 'Public health expert who built our donor verification and safety protocol systems from the ground up.' },
]

const values = [
  { icon: '❤️', title: 'Life First', desc: 'Every decision we make prioritizes saving human lives above all else.' },
  { icon: '🔒', title: 'Privacy & Safety', desc: 'Donor data is encrypted and never shared without explicit consent.' },
  { icon: '⚡', title: 'Speed Matters', desc: 'In emergencies, seconds count. Our system alerts donors within seconds.' },
  { icon: '🤝', title: 'Community', desc: 'We build trust between donors and recipients through transparency.' },
]

const milestones = [
  { year: '2023', title: 'Founded', desc: 'BloodConnect was born out of a personal tragedy experienced by our co-founder.' },
  { year: '2024', title: '1,000 Donors', desc: 'Reached our first milestone of 1,000 registered donors across 5 cities.' },
  { year: '2025', title: '5,000 Lives', desc: 'Celebrated saving our 5,000th life through the platform.' },
  { year: '2026', title: 'Going Global', desc: 'Expanded to 12 countries, with 12,000+ active donors worldwide.' },
]

export default function About() {
  return (
    <div>
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-crimson-50 to-white dark:from-crimson-900/20 dark:to-neutral-900 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="section-tag mx-auto mb-6">Our Story</div>
          <h1 className="font-display font-extrabold text-5xl sm:text-6xl mb-6">
            We Believe No One Should Die{' '}
            <span className="text-gradient">Waiting for Blood</span>
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl mx-auto">
            BloodConnect was founded in 2019 with a simple mission: use technology to connect people who need blood with those who can give it — instantly, safely, and at scale.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl">What We Stand For</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v, i) => (
            <div key={i} className="card p-6 text-center hover:-translate-y-1 transition-transform animate-fade-in" style={{ animationDelay: `${i*0.1}s` }}>
              <div className="text-4xl mb-3">{v.icon}</div>
              <h3 className="font-semibold text-base mb-2">{v.title}</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-neutral-50 dark:bg-neutral-900/50 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl">Our Journey</h2>
          </div>
          <div className="relative">
            <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-px bg-crimson-200 dark:bg-crimson-900 -translate-x-1/2" />
            <div className="flex flex-col gap-10">
              {milestones.map((m, i) => (
                <div key={i} className={`relative flex ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'} gap-8 items-start`}>
                  <div className="absolute left-6 sm:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-crimson-500 border-4 border-white dark:border-neutral-900 shadow-crimson z-10" />
                  <div className={`ml-14 sm:ml-0 sm:w-1/2 ${i % 2 === 0 ? 'sm:pr-12 sm:text-right' : 'sm:pl-12'}`}>
                    <div className="inline-block px-3 py-1 bg-crimson-500 text-white text-xs font-bold rounded-full mb-2">{m.year}</div>
                    <h3 className="font-semibold text-base mb-1">{m.title}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl">Meet the Team</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">Driven by purpose, united by mission.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {team.map((t, i) => (
            <div key={i} className="card p-6 text-center hover:-translate-y-1 transition-transform animate-fade-in" style={{ animationDelay: `${i*0.15}s` }}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-crimson-400 to-crimson-600 flex items-center justify-center text-white text-2xl font-display font-bold mx-auto mb-4 shadow-crimson">
                {t.avatar}
              </div>
              <h3 className="font-semibold text-base">{t.name}</h3>
              <p className="text-xs text-crimson-500 font-medium mt-1 mb-3">{t.role}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{t.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="card p-10">
          <h2 className="font-display font-bold text-3xl mb-3">Join Our Mission</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8">Become part of the community that's changing how the world responds to blood emergencies.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search" className="btn-primary px-8 py-3">Find Donors</Link>
            <Link to="/contact" className="btn-secondary px-8 py-3">Get in Touch</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
