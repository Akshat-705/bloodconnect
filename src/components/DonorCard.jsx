import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function DonorCard({ donor }) {
  const { addToast, user } = useApp()
  const [contacted, setContacted] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [rating, setRating] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleContact = async () => {
    if (!user) { addToast('Please login to contact donors.', 'warning'); return }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 600))
    setContacted(true)
    addToast(`Request sent to ${donor.name}!`, 'success')
    setSubmitting(false)
  }

  const handleReview = async (e) => {
    e.preventDefault()
    if (!user) { addToast('Please login to leave a review.', 'warning'); return }
    if (!rating) { addToast('Please select a star rating.', 'warning'); return }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 600))
    setReviewed(true)
    setShowReview(false)
    addToast('Review submitted!', 'success')
    setSubmitting(false)
  }

  return (
    <div className="card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-crimson-400 to-crimson-600 flex items-center justify-center text-white text-xl font-display font-bold shrink-0 shadow-crimson">
          {donor.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base">{donor.name}</h3>
            <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${donor.available ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
              {donor.available ? 'Available' : 'Unavailable'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">🩸 <strong className="text-crimson-500">{donor.bloodType}</strong></span>
            <span>📍 {donor.location}</span>
            <span>📏 {donor.distance}</span>
            <span>🕒 {donor.lastDonation}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <span key={s} className={`text-sm ${s <= Math.round(donor.rating) ? 'text-amber-400' : 'text-neutral-200 dark:text-neutral-700'}`}>★</span>
              ))}
            </div>
            <span className="text-xs text-neutral-400">({donor.reviewCount})</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleContact}
          disabled={contacted || submitting || !donor.available}
          className="btn-primary flex-1 py-2 text-sm"
        >
          {submitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> : contacted ? '✓ Contacted' : 'Contact'}
        </button>
        {!reviewed ? (
          <button onClick={() => setShowReview(o => !o)} className="btn-secondary py-2 px-4 text-sm">
            Rate
          </button>
        ) : (
          <span className="px-4 py-2 text-sm text-green-600 font-medium">✓ Rated</span>
        )}
      </div>

      {showReview && (
        <form onSubmit={handleReview} className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex flex-col gap-3 animate-fade-in">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(s => (
              <button key={s} type="button" onClick={() => setRating(s)} className={`text-2xl transition-transform hover:scale-110 ${s <= rating ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-600'}`}>★</button>
            ))}
          </div>
          <textarea
            className="input-field resize-none text-sm"
            rows={2}
            placeholder="Share your experience…"
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary text-sm py-1.5 px-4">
              {submitting ? '…' : 'Submit'}
            </button>
            <button type="button" onClick={() => setShowReview(false)} className="btn-ghost text-sm py-1.5 px-4">Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
