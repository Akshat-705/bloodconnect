import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hospitalApi } from '../services/donorApi'

const BLOOD_TYPES = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const CATEGORIES = ['All', 'Government', 'Private']

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [bloodFilter, setBloodFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    hospitalApi.getAll()
      .then((res) => {
        if (active) setHospitals(res.hospitals || [])
      })
      .catch((err) => console.warn('Could not fetch hospitals:', err.message))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      (h.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (h.address || '').toLowerCase().includes(search.toLowerCase()) ||
      (h.city || '').toLowerCase().includes(search.toLowerCase())

    const matchesCategory = categoryFilter === 'All' || h.category === categoryFilter

    const getUnits = (type) => h.inventory?.get ? h.inventory.get(type) : h.inventory?.[type] || 0
    const matchesBlood = bloodFilter === 'All' || getUnits(bloodFilter) > 0

    return matchesSearch && matchesCategory && matchesBlood
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="section-tag mb-2">
          <span className="w-1.5 h-1.5 bg-crimson-500 rounded-full animate-pulse" />
          Live Hospital Network & Blood Banks
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl mb-3">
          Partner Hospital Blood Banks
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl text-sm sm:text-base leading-relaxed">
          Real-time blood stock counts verified directly from regional government and private hospital blood banks.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 sm:p-6 mb-8 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <input
          type="text"
          placeholder="Search by hospital name, area, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-md text-sm"
        />

        <div className="flex flex-wrap items-center gap-3">
          {/* Blood Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500 uppercase">Blood Group:</span>
            <select
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
              className="input-field py-1.5 px-3 text-sm font-semibold text-crimson-600 dark:text-crimson-400"
            >
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500 uppercase">Sector:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field py-1.5 px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      {loading ? (
        <div className="text-center py-20 text-neutral-400">Loading hospital blood banks…</div>
      ) : filteredHospitals.length === 0 ? (
        <div className="card p-12 text-center text-neutral-500">
          <div className="text-4xl mb-3">🏥</div>
          <p className="font-semibold text-lg">No matching hospital blood banks found.</p>
          <p className="text-sm mt-1">Try resetting your search query or blood group filter.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredHospitals.map((h) => {
            const inventory = h.inventory || {}
            const getUnits = (bt) => inventory.get ? inventory.get(bt) : inventory[bt] || 0

            return (
              <div key={h.id || h.hospitalId} className="card p-6 flex flex-col justify-between border-t-4 border-crimson-500">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display font-bold text-xl text-neutral-900 dark:text-white">
                          {h.name}
                        </h2>
                        {h.isVerified && (
                          <span className="text-emerald-500 text-sm font-bold" title="Verified Hospital Partner">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        📍 {h.address}, {h.city} • <span className="font-mono text-[11px]">Lic: {h.licenseNumber}</span>
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide shrink-0 ${
                      h.category === 'Government'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      {h.category}
                    </span>
                  </div>

                  {/* Live Blood Stock Chips */}
                  <div className="my-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
                      Live Units Available in Blood Bank:
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center">
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => {
                        const units = getUnits(bt)
                        const isSelected = bloodFilter === bt
                        const isLow = units < 3

                        return (
                          <div
                            key={bt}
                            className={`p-2 rounded-xl border text-xs transition ${
                              isSelected
                                ? 'border-crimson-500 bg-crimson-50 dark:bg-crimson-950/40'
                                : isLow
                                ? 'border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20'
                                : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40'
                            }`}
                          >
                            <div className="font-bold text-neutral-700 dark:text-neutral-200">{bt}</div>
                            <div className={`font-mono text-sm font-extrabold mt-0.5 ${isLow ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {units}
                            </div>
                            <div className="text-[9px] text-neutral-400 mt-0.5">
                              {isLow ? 'Low' : 'OK'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Actions & Hotline */}
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-neutral-500">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">24/7 Helpline: </span>
                    <a href={`tel:${h.emergencyHelpline}`} className="font-mono text-crimson-600 dark:text-crimson-400 hover:underline font-bold">
                      {h.emergencyHelpline}
                    </a>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      🗺️ Map
                    </a>
                    <a
                      href={`tel:${h.emergencyHelpline}`}
                      className="btn-primary py-1.5 px-3 text-xs"
                    >
                      📞 Call Bank
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
