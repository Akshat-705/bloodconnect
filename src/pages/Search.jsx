import React, { useState, useEffect, useMemo } from 'react'
import DonorCard from '../components/DonorCard'
import { SkeletonCard } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'

const ALL_DONORS = [
  { id: 'd1', name: 'John Smith', bloodType: 'O+', location: 'Downtown Medical', distance: '2.3 km', distanceNum: 2.3, available: true, lastDonation: '2 months ago', rating: 4.8, reviewCount: 12 },
  { id: 'd2', name: 'Sarah Johnson', bloodType: 'A+', location: 'City Hospital', distance: '3.1 km', distanceNum: 3.1, available: true, lastDonation: '3 months ago', rating: 4.9, reviewCount: 8 },
  { id: 'd3', name: 'Mike Davis', bloodType: 'B+', location: 'Central Clinic', distance: '4.5 km', distanceNum: 4.5, available: false, lastDonation: '1 month ago', rating: 4.5, reviewCount: 5 },
  { id: 'd4', name: 'Emily Wilson', bloodType: 'AB+', location: 'North Hospital', distance: '5.2 km', distanceNum: 5.2, available: true, lastDonation: '4 months ago', rating: 5.0, reviewCount: 3 },
  { id: 'd5', name: 'Carlos Rivera', bloodType: 'O-', location: 'West Clinic', distance: '1.8 km', distanceNum: 1.8, available: true, lastDonation: '3 months ago', rating: 4.7, reviewCount: 9 },
  { id: 'd6', name: 'Priya Sharma', bloodType: 'A-', location: 'East Medical', distance: '6.0 km', distanceNum: 6.0, available: false, lastDonation: '5 months ago', rating: 4.6, reviewCount: 7 },
  { id: 'd7', name: 'James Lee', bloodType: 'B-', location: 'South Hospital', distance: '7.3 km', distanceNum: 7.3, available: true, lastDonation: '2 months ago', rating: 4.3, reviewCount: 4 },
  { id: 'd8', name: 'Aisha Hassan', bloodType: 'AB-', location: 'Central Park Clinic', distance: '3.9 km', distanceNum: 3.9, available: true, lastDonation: '6 months ago', rating: 4.9, reviewCount: 11 },
]

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

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1400)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    let result = [...ALL_DONORS]
    if (query) result = result.filter(d => d.name.toLowerCase().includes(query.toLowerCase()) || d.location.toLowerCase().includes(query.toLowerCase()))
    if (bloodType !== 'All') result = result.filter(d => d.bloodType === bloodType)
    if (availableOnly) result = result.filter(d => d.available)
    if (distance === '< 2 km') result = result.filter(d => d.distanceNum < 2)
    else if (distance === '< 5 km') result = result.filter(d => d.distanceNum < 5)
    else if (distance === '< 10 km') result = result.filter(d => d.distanceNum < 10)

    if (sortBy === 'distance') result.sort((a, b) => a.distanceNum - b.distanceNum)
    else if (sortBy === 'rating') result.sort((a, b) => b.rating - a.rating)
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))

    return result
  }, [query, bloodType, distance, availableOnly, sortBy])

  const reset = () => { setQuery(''); setBloodType('All'); setDistance('All'); setAvailableOnly(false) }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="section-tag mb-4">Donor Search</div>
        <h1 className="font-display font-bold text-4xl mb-2">Find Blood Donors</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Search from our verified network of {ALL_DONORS.length}+ donors near you.</p>
      </div>

      {/* Search bar */}
      <div className="card p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
            <input
              className="input-field pl-10"
              placeholder="Search by name or location…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 600) }} className="btn-primary px-6">
            Search
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          {/* Blood type */}
          <div className="flex flex-wrap gap-1.5">
            {BLOOD_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setBloodType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${bloodType === t ? 'bg-crimson-500 text-white shadow-crimson' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-crimson-50 dark:hover:bg-crimson-900/20'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />

          {/* Distance */}
          <select
            value={distance}
            onChange={e => setDistance(e.target.value)}
            className="input-field w-auto text-xs py-2 px-3"
          >
            {DISTANCES.map(d => <option key={d}>{d}</option>)}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="input-field w-auto text-xs py-2 px-3"
          >
            {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{`Sort: ${s.label}`}</option>)}
          </select>

          {/* Available toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
            <span className="text-sm text-neutral-600 dark:text-neutral-300">Available only</span>
            <div
              onClick={() => setAvailableOnly(o => !o)}
              className={`w-11 h-6 rounded-full relative transition-colors ${availableOnly ? 'bg-crimson-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${availableOnly ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {loading ? 'Searching…' : `${filtered.length} donor${filtered.length !== 1 ? 's' : ''} found`}
        </p>
        {(query || bloodType !== 'All' || distance !== 'All' || availableOnly) && (
          <button onClick={reset} className="text-sm text-crimson-500 font-semibold hover:underline">Clear filters</button>
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
          title="No donors found"
          description="Try adjusting your filters or search query. More donors join every day!"
          action={<button onClick={reset} className="btn-primary">Clear Filters</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((donor, i) => (
            <div key={donor.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <DonorCard donor={donor} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
