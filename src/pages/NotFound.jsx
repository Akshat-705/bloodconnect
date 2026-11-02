import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="max-w-lg mx-auto px-4 py-32 text-center">
      <div className="animate-slide-up">
        <div className="font-display font-extrabold text-9xl text-crimson-100 dark:text-crimson-900 leading-none mb-2 select-none">404</div>
        <div className="text-5xl mb-4">🩸</div>
        <h1 className="font-display font-bold text-3xl mb-3">Page Not Found</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-8">This page seems to have gone missing. But don't worry — there are donors out there who need your help.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => navigate(-1)} className="btn-secondary px-8 py-3">← Go Back</button>
          <Link to="/" className="btn-primary px-8 py-3">Return Home</Link>
        </div>
      </div>
    </div>
  )
}
