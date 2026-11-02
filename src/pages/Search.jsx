import React, { useState, useEffect, useMemo } from 'react'
import DonorCard from '../components/DonorCard'
import { SkeletonCard } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import BloodCompatibilityMatrix from '../components/BloodCompatibilityMatrix'
import DonorMap from '../components/DonorMap'
import { donorApi, hospitalApi } from '../services/donorApi'
import { getCompatibleDonors } from '../utils/bloodCompatibility'

const ALL_DONORS = []

const BLOOD_TYPES = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const DISTANCES = ['All', '< 2 km', '< 5 km', '< 10 km']
const SORT_OPTIONS = [
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' },
  { value: 'name', label: 'Name' },
]

export default function Search() {
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [bloodType, setBloodType] = useState('All')
  const [distance, setDistance] = useState('All')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [sortBy, setSortBy] = useState('distance')

  // Smart Compatibility & Live Database states
  const [smartMatch, setSmartMatch] = useState(true)
  const [showMatrix, setShowMatrix] = useState(false)
  const [dbDonors, setDbDonors] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [showMap, setShowMap] = useState(true)
  const [showDonors, setShowDonors] = useState(true)
  const [showHospitals, setShowHospitals] = useState(true)

  // Load hospitals from MongoDB backend
  useEffect(() => {
    let active = true
    hospitalApi.getAll()
      .then((res) => {
        if (active && res && Array.isArray(res.hospitals)) setHospitals(res.hospitals)
      })
      .catch((err) => console.warn('Could not fetch hospitals:', err.message))
    return () => { active = false }
  }, [])

  // Load real registered donors from MongoDB backend
  useEffect(() => {
    let active = true
    donorApi.getAll()
      .then((res) => {
        if (!active) return
        if (res && Array.isArray(res.donors)) {
          const formatted = res.donors
            .filter((d) => !d.role || d.role === 'donor')
            .map((d) => ({
              id: d.id || d.donorId,
              name: d.name || 'Verified Member',
              bloodType: d.bloodType || 'O+',
              location: d.address || d.location || 'Local Registered Center',
              distance: '1.2 km',
              distanceNum: 1.2,
              available: d.isAvailable !== false,
              lastDonation: 'Recent record',
              rating: 5.0,
              reviewCount: 4,
              isDbUser: true,
            }))
          setDbDonors(formatted)
        }
      })
      .catch((err) => console.warn('Could not fetch DB donors:', err.message))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  // Combined pool: MongoDB registered users + curated demo donors
  const pool = useMemo(() => {
    // Prevent duplicate IDs
    const seen = new Set()
    const merged = []
    for (const d of [...dbDonors, ...ALL_DONORS]) {
      if (!seen.has(d.id)) {
        seen.add(d.id)
        merged.push(d)
      }
    }
    return merged
  }, [dbDonors])

  const filtered = useMemo(() => {
    let result = [...pool]

    if (query) {
      const q = query.toLowerCase()
      result = result.filter(d => d.name.toLowerCase().includes(q) || d.location.toLowerCase().includes(q))
    }

    // Blood type & Smart biological matching
    if (bloodType !== 'All') {
      if (smartMatch) {
        const compatibleTypes = getCompatibleDonors(bloodType)
        result = result
          .filter(d => compatibleTypes.includes(d.bloodType))
          .map(d => {
            let badge = null
            if (d.bloodType === bloodType) {
              badge = { type: 'exact', label: 'Exact Match', icon: '✓' }
            } else if (d.bloodType === 'O-') {
              badge = { type: 'universal', label: 'Universal Donor', icon: '🌟' }
            } else {
              badge = { type: 'compatible', label: `Safe Match (${d.bloodType})`, icon: '🧬' }
            }
            return { ...d, compatibilityBadge: badge }
          })
      } else {
        result = result
          .filter(d => d.bloodType === bloodType)
          .map(d => ({
            ...d,
            compatibilityBadge: { type: 'exact', label: 'Exact Match', icon: '✓' },
          }))
      }
    } else {
      result = result.map(d => ({ ...d, compatibilityBadge: null }))
    }

    if (availableOnly) result = result.filter(d => d.available)
    if (distance === '< 2 km') result = result.filter(d => d.distanceNum < 2)
    else if (distance === '< 5 km') result = result.filter(d => d.distanceNum < 5)
    else if (distance === '< 10 km') result = result.filter(d => d.distanceNum < 10)

    if (sortBy === 'distance') result.sort((a, b) => a.distanceNum - b.distanceNum)
    else if (sortBy === 'rating') result.sort((a, b) => b.rating - a.rating)
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))

    return result
  }, [pool, query, bloodType, smartMatch, distance, availableOnly, sortBy])

  const reset = () => {
    setQuery('')
    setBloodType('All')
    setDistance('All')
    setAvailableOnly(false)
    setSmartMatch(true)
  }

  const handleApplyMatrixFilter = (group) => {
    setBloodType(group)
    setSmartMatch(true)
    setShowMatrix(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="section-tag mb-3">Verified Donor Network</div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-neutral-900 dark:text-white mb-2">
            Find Blood Donors
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base max-w-xl">
            Search from our verified network of {pool.length}+ donors near you. Use smart compatibility matching to locate biologically safe blood types.
          </p>
        </div>

        {/* Action Toggle for Compatibility Matrix */}
        <button
          onClick={() => setShowMatrix(prev => !prev)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all border shadow-sm ${
            showMatrix
              ? 'bg-crimson-600 text-white border-crimson-700 shadow-crimson'
              : 'bg-white dark:bg-neutral-800 text-crimson-600 dark:text-crimson-400 border-crimson-200 dark:border-crimson-900/60 hover:bg-crimson-50 dark:hover:bg-crimson-950/30'
          }`}
        >
          <span className="text-base">🧬</span>
          {showMatrix ? 'Hide Compatibility Matchmaker' : 'Open Compatibility Matchmaker'}
        </button>
      </div>

      {/* Expandable Blood Compatibility Matrix */}
      {showMatrix && (
        <div className="mb-8 animate-fade-in">
          <BloodCompatibilityMatrix
            selectedBloodType={bloodType}
            onSelectBloodType={(grp) => setBloodType(grp)}
            onApplyFilter={handleApplyMatrixFilter}
          />
        </div>
      )}

      {/* Search bar */}
      <div className="card p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
            <input
              className="input-field pl-10"
              placeholder="Search by name, hospital, or city…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 400) }}
            className="btn-primary px-6"
          >
            Search
          </button>
        </div>
      </div>

      {/* Filters & Compatibility Controls */}
      <div className="card p-5 mb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Blood type pills */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs font-bold text-neutral-400 mr-1 uppercase">Blood:</span>
            {BLOOD_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setBloodType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  bloodType === t
                    ? 'bg-crimson-500 text-white shadow-crimson'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-crimson-50 dark:hover:bg-crimson-900/20'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 hidden lg:block" />

          {/* Distance Filter */}
          <select
            value={distance}
            onChange={e => setDistance(e.target.value)}
            className="input-field w-auto text-xs py-2 px-3"
          >
            {DISTANCES.map(d => <option key={d}>{d}</option>)}
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="input-field w-auto text-xs py-2 px-3"
          >
            {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{`Sort: ${s.label}`}</option>)}
          </select>

          {/* Available toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none sm:ml-auto">
            <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">Available only</span>
            <div
              onClick={() => setAvailableOnly(o => !o)}
              className={`w-10 h-5.5 rounded-full relative transition-colors ${availableOnly ? 'bg-crimson-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
            >
              <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${availableOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>
        </div>

        {/* Smart Compatibility Sub-bar (Active when a blood type is selected) */}
        {bloodType !== 'All' && (
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                Transfusion Matching Mode:
              </span>
              <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-700/60">
                <button
                  onClick={() => setSmartMatch(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    smartMatch
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
                  }`}
                >
                  <span>🧬</span> Smart Bio-Match (All Safe Donors)
                </button>
                <button
                  onClick={() => setSmartMatch(false)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    !smartMatch
                      ? 'bg-crimson-500 text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
                  }`}
                >
                  <span>🎯</span> Exact Group Only ({bloodType})
                </button>
              </div>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {smartMatch ? (
                <>
                  Compatible with <strong>{bloodType}</strong>:{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {getCompatibleDonors(bloodType).join(', ')}
                  </span>
                </>
              ) : (
                <>Showing strictly <strong>{bloodType}</strong> donors</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Interactive Live Map View (Donors & Hospital Blood Banks) */}
      <div className="card p-4 sm:p-5 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-neutral-900 dark:text-white">
                Live Donor & Hospital Map
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Visual geo-distribution of active donors and certified hospital blood banks
              </p>
            </div>
          </div>

          {/* Map Layer Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowDonors(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                showDonors
                  ? 'bg-crimson-500 text-white border-crimson-600 shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 opacity-60'
              }`}
            >
              <span>📍</span> Donors ({filtered.length})
            </button>

            <button
              onClick={() => setShowHospitals(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                showHospitals
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 opacity-60'
              }`}
            >
              <span>🏥</span> Hospital Blood Banks ({hospitals.length})
            </button>

            <button
              onClick={() => setShowMap(v => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
            >
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          </div>
        </div>

        {showMap && (
          <DonorMap
            donors={filtered}
            hospitals={hospitals}
            showDonors={showDonors}
            showHospitals={showHospitals}
          />
        )}
      </div>

      {/* Results summary header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {loading ? (
            'Searching verified donor pool…'
          ) : (
            <>
              <strong>{filtered.length}</strong> donor{filtered.length !== 1 ? 's' : ''} available{' '}
              {bloodType !== 'All' && (
                <span>
                  ({smartMatch ? `medically safe for ${bloodType}` : `exact ${bloodType} only`})
                </span>
              )}
            </>
          )}
        </p>
        {(query || bloodType !== 'All' || distance !== 'All' || availableOnly) && (
          <button onClick={reset} className="text-sm text-crimson-500 font-semibold hover:underline">
            Clear all filters
          </button>
        )}
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No matching donors found"
          description="Try turning on Smart Biological Match or broadening your distance filters. New donors register daily!"
          action={<button onClick={reset} className="btn-primary">Clear Filters</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((donor, i) => (
            <div key={donor.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
              <DonorCard donor={donor} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
