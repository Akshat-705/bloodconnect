import React, { useEffect, useRef, useState } from 'react'

export default function DonorMap({ donors = [], hospitals = [], userLocation, showDonors = true, showHospitals = true }) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const userMarkerRef = useRef(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  // Default fallback center: New Delhi, India
  const defaultCenter = [28.6139, 77.2090]
  const centerLat = userLocation?.lat || defaultCenter[0]
  const centerLng = userLocation?.lng || defaultCenter[1]

  // 1. Load Leaflet script and stylesheet dynamically from CDN
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true)
      return
    }

    // Stylesheet
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
    link.crossOrigin = ''
    document.head.appendChild(link)

    // Script
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
    script.crossOrigin = ''
    script.onload = () => {
      setLeafletLoaded(true)
    }
    document.head.appendChild(script)

    // Inject CSS for pulsing blue dot
    const style = document.createElement('style')
    style.innerHTML = `
      @keyframes pulse-blue {
        0% { transform: scale(0.6); opacity: 0.6; }
        100% { transform: scale(2.0); opacity: 0; }
      }
      .leaflet-v-popup {
        font-family: sans-serif;
      }
    `
    document.head.appendChild(style)

    return () => {
      // Keep styling and script loaded globally
    }
  }, [])

  // 2. Initialize Map Instance and update Markers when Leaflet loads and donors change
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return

    const L = window.L
    
    // Avoid double initialization of Leaflet map instance
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([centerLat, centerLng], 12)
      
      // Use premium Voyager tile style matching light/dark modes
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current)
    }

    const map = mapInstanceRef.current

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }

    // Custom Red and Gray SVG Markers for Donor states
    const createSvgIcon = (color) => {
      return L.divIcon({
        className: 'custom-leaflet-icon',
        html: `<div style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="30" height="30" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.35));">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    }

    // GPS blue locator dot representing User
    const createUserIcon = () => {
      return L.divIcon({
        className: 'user-leaflet-icon',
        html: `<div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; position: relative;">
          <span style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: #3b82f6; opacity: 0.45; transform: scale(1); animation: pulse-blue 2s infinite;"></span>
          <span style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background-color: #3b82f6; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></span>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }

    // Custom Blue SVG Marker for Hospitals with medical cross
    const createHospitalIcon = () => {
      return L.divIcon({
        className: 'hospital-leaflet-icon',
        html: `<div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.35));">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#2563eb"/>
            <path d="M11 6h2v2h2v2h-2v2h-2v-2H9V8h2V6z" fill="#ffffff"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      })
    }

    const donorIcon = createSvgIcon('#ef4444') // Red for active donors
    const unavailableIcon = createSvgIcon('#9ca3af') // Gray for unavailable
    const hospitalIcon = createHospitalIcon()

    const bounds = L.latLngBounds()

    // 3. Plot User live location if available
    if (userLocation) {
      const uMarker = L.marker([userLocation.lat, userLocation.lng], { icon: createUserIcon() })
        .bindPopup('<div style="font-family: sans-serif; font-size: 12px; font-weight: bold; color: #3b82f6;">📍 You are here</div>')
        .addTo(map)
      userMarkerRef.current = uMarker
      bounds.extend([userLocation.lat, userLocation.lng])
    }

    // 4. Plot Donors
    if (showDonors && Array.isArray(donors)) {
      donors.forEach((donor, index) => {
        // Distribute coordinates around user coordinates based on distanceNum
        const angle = (index * 2 * Math.PI) / (donors.length || 1)
        const radius = (donor.distanceNum || 3) * 0.009
        const lat = donor.lat || (centerLat + Math.sin(angle) * radius)
        const lng = donor.lng || (centerLng + Math.cos(angle) * radius)

        const markerColor = donor.available ? donorIcon : unavailableIcon
        const popupHtml = `
          <div style="font-family: sans-serif; min-width: 140px; padding: 2px;">
            <p style="margin: 0; font-weight: bold; color: #dc2626; font-size: 14px;">${donor.name}</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; font-weight: 600;">Blood Type: <span style="background-color: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 4px;">${donor.bloodType}</span></p>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #4b5563;">📍 ${donor.location} (${donor.distance || 'nearby'})</p>
            <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: bold; color: ${donor.available ? '#10b981' : '#6b7280'};">
              ${donor.available ? '🟢 Available' : '⚪ Unavailable'}
            </p>
          </div>
        `

        const marker = L.marker([lat, lng], { icon: markerColor })
          .bindPopup(popupHtml)
          .addTo(map)
        
        markersRef.current.push(marker)
        bounds.extend([lat, lng])
      })
    }

    // 5. Plot Hospital Blood Banks
    if (showHospitals && Array.isArray(hospitals)) {
      hospitals.forEach((h) => {
        const lat = h.coordinates?.lat
        const lng = h.coordinates?.lng
        if (!lat || !lng) return

        const stockBadges = Object.entries(h.inventory || {})
          .filter(([_, q]) => q > 0)
          .slice(0, 4)
          .map(([g, q]) => `<span style="background:#eff6ff;color:#1d4ed8;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700;border:1px solid #bfdbfe;">${g}: ${q}u</span>`)
          .join(' ')

        const popupHtml = `
          <div style="font-family: sans-serif; min-width: 190px; padding: 2px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
              <p style="margin: 0; font-weight: bold; color: #1d4ed8; font-size: 13px;">🏥 ${h.name}</p>
              <span style="font-size:9px;background:#e0e7ff;color:#3730a3;padding:1px 5px;border-radius:3px;font-weight:600;">${h.category || 'Hospital'}</span>
            </div>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #4b5563;">📍 ${h.address || h.city}</p>
            ${stockBadges ? `<div style="display:flex;flex-wrap:wrap;gap:3px;margin:6px 0;">${stockBadges}</div>` : ''}
            ${h.emergencyHelpline ? `
              <a href="tel:${h.emergencyHelpline}" style="display:inline-block;margin-top:6px;width:100%;text-align:center;background:#2563eb;color:#fff;font-size:11px;font-weight:bold;padding:5px 0;border-radius:6px;text-decoration:none;">
                📞 Call Helpline
              </a>
            ` : ''}
          </div>
        `

        const marker = L.marker([lat, lng], { icon: hospitalIcon })
          .bindPopup(popupHtml)
          .addTo(map)

        markersRef.current.push(marker)
        bounds.extend([lat, lng])
      })
    }

    // Fit map bounds to view all markers automatically
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }

  }, [leafletLoaded, donors, hospitals, userLocation, showDonors, showHospitals])

  return (
    <div className="relative w-full h-[350px] rounded-2xl overflow-hidden shadow-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 z-[1]">
      {!leafletLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-400">
          <span className="inline-block w-8 h-8 border-2 border-crimson-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">Loading interactive map…</p>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  )
}
