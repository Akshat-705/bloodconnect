import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 4000

// ─── In-memory DB (replace with MongoDB/PostgreSQL in production) ───────────
const db = {
  donors: new Map(),
  donations: new Map(),
  certificates: new Map(),
  tracking: new Map(),
  auditLogs: [],
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }))
app.use(express.json())

const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

// ─── ID Generators ────────────────────────────────────────────────────────────
function generateDonorId() {
  const prefix = 'DID'
  const year = new Date().getFullYear().toString().slice(-2)
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `${prefix}-${year}-${rand}`
}

function generateDonationId() {
  const prefix = 'DON'
  const ts = Date.now().toString(36).toUpperCase()
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `${prefix}-${ts}-${rand}`
}

function generateTrackingId() {
  const prefix = 'TRK'
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `${prefix}-${rand}`
}

function generateCertificateId() {
  const prefix = 'CERT'
  const rand = crypto.randomBytes(5).toString('hex').toUpperCase()
  return `${prefix}-${rand}`
}

function generateVerificationHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16).toUpperCase()
}

// ─── Audit Logger ─────────────────────────────────────────────────────────────
function log(action, entityId, entityType, details, actor = 'system') {
  db.auditLogs.unshift({
    id: uuidv4(),
    action,
    entityId,
    entityType,
    details,
    actor,
    timestamp: new Date().toISOString(),
  })
  if (db.auditLogs.length > 500) db.auditLogs.pop()
}

// ─── Blood Tracking Stages ────────────────────────────────────────────────────
const TRACKING_STAGES = [
  'Registered',
  'Collected',
  'Testing',
  'Approved',
  'Stored',
  'Assigned',
  'Dispatched',
  'Delivered',
]

// ─── API: Health ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ─── API: Donor Registration & Identity ──────────────────────────────────────

/** POST /api/donors/register */
app.post('/api/donors/register', (req, res) => {
  const { name, email, bloodType, phone, dob, address } = req.body
  if (!name || !email || !bloodType) {
    return res.status(400).json({ error: 'name, email, and bloodType are required' })
  }

  // Check duplicate email
  for (const d of db.donors.values()) {
    if (d.email === email) return res.status(409).json({ error: 'Email already registered', donorId: d.donorId })
  }

  const id = uuidv4()
  const donorId = generateDonorId()
  const donor = {
    id,
    donorId,
    name,
    email,
    bloodType,
    phone: phone || '',
    dob: dob || '',
    address: address || '',
    totalDonations: 0,
    createdAt: new Date().toISOString(),
    isVerified: true,
    status: 'active',
  }

  db.donors.set(id, donor)
  log('DONOR_REGISTERED', id, 'donor', { donorId, email, name }, email)
  res.status(201).json({ donor, message: 'Donor identity created successfully' })
})

/** GET /api/donors/by-email/:email */
app.get('/api/donors/by-email/:email', (req, res) => {
  const donor = [...db.donors.values()].find(d => d.email === decodeURIComponent(req.params.email))
  if (!donor) return res.status(404).json({ error: 'Donor not found' })
  res.json({ donor })
})

/** GET /api/donors/:donorId */
app.get('/api/donors/:donorId', (req, res) => {
  const donor = [...db.donors.values()].find(d => d.donorId === req.params.donorId)
  if (!donor) return res.status(404).json({ error: 'Donor not found' })
  res.json({ donor })
})

/** GET /api/donors */
app.get('/api/donors', (req, res) => {
  const list = [...db.donors.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ donors: list, total: list.length })
})

// ─── API: Donations ───────────────────────────────────────────────────────────

/** POST /api/donations/create */
app.post('/api/donations/create', (req, res) => {
  const { donorId, bloodType, units, donationCenter, notes } = req.body
  if (!donorId || !bloodType) return res.status(400).json({ error: 'donorId and bloodType required' })

  const donor = [...db.donors.values()].find(d => d.donorId === donorId)
  if (!donor) return res.status(404).json({ error: 'Donor not found. Please register first.' })

  const id = uuidv4()
  const donationId = generateDonationId()
  const trackingId = generateTrackingId()
  const certificateId = generateCertificateId()

  const donation = {
    id,
    donationId,
    trackingId,
    certificateId,
    donorId,
    donorName: donor.name,
    bloodType,
    units: units || '450ml',
    donationCenter: donationCenter || 'BloodConnect Center',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    status: 'Registered',
  }

  // Blood tracking record
  const tracking = {
    id: uuidv4(),
    trackingId,
    donationId,
    donorId,
    bloodType,
    currentStage: 'Registered',
    stages: [
      {
        stage: 'Registered',
        status: 'completed',
        timestamp: new Date().toISOString(),
        note: 'Donation registered in system',
        actor: donor.name,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Certificate record
  const verificationHash = generateVerificationHash({ certificateId, donationId, donorId, bloodType })
  const certificate = {
    id: uuidv4(),
    certificateId,
    donationId,
    donorId,
    donorName: donor.name,
    bloodType,
    units: units || '450ml',
    donationCenter: donationCenter || 'BloodConnect Center',
    issuedAt: new Date().toISOString(),
    verificationHash,
    isValid: true,
  }

  db.donations.set(id, donation)
  db.tracking.set(trackingId, tracking)
  db.certificates.set(certificateId, certificate)

  // Update donor stats
  donor.totalDonations += 1
  donor.lastDonation = new Date().toISOString()
  db.donors.set(donor.id, donor)

  log('DONATION_CREATED', id, 'donation', { donationId, trackingId, certificateId }, donorId)

  res.status(201).json({ donation, tracking, certificate, message: 'Donation recorded successfully' })
})

/** GET /api/donations/by-donor/:donorId */
app.get('/api/donations/by-donor/:donorId', (req, res) => {
  const donations = [...db.donations.values()]
    .filter(d => d.donorId === req.params.donorId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ donations })
})

// ─── API: Blood Tracking ──────────────────────────────────────────────────────

/** GET /api/track/:trackingId */
app.get('/api/track/:trackingId', (req, res) => {
  const tracking = db.tracking.get(req.params.trackingId)
  if (!tracking) return res.status(404).json({ error: 'Tracking ID not found' })
  res.json({ tracking })
})

/** POST /api/track/:trackingId/update */
app.post('/api/track/:trackingId/update', (req, res) => {
  const { stage, note, actor = 'Hospital/Admin' } = req.body
  const tracking = db.tracking.get(req.params.trackingId)
  if (!tracking) return res.status(404).json({ error: 'Tracking record not found' })

  const stageIdx = TRACKING_STAGES.indexOf(stage)
  if (stageIdx === -1) return res.status(400).json({ error: 'Invalid stage', validStages: TRACKING_STAGES })

  const currentIdx = TRACKING_STAGES.indexOf(tracking.currentStage)
  if (stageIdx <= currentIdx) return res.status(400).json({ error: 'Cannot move to a previous or same stage' })

  // Fill in skipped stages as auto-completed
  for (let i = currentIdx + 1; i <= stageIdx; i++) {
    const alreadyExists = tracking.stages.find(s => s.stage === TRACKING_STAGES[i])
    if (!alreadyExists) {
      tracking.stages.push({
        stage: TRACKING_STAGES[i],
        status: i === stageIdx ? 'completed' : 'completed',
        timestamp: new Date().toISOString(),
        note: i === stageIdx ? (note || '') : `Auto-progressed to ${TRACKING_STAGES[i]}`,
        actor,
      })
    }
  }

  tracking.currentStage = stage
  tracking.updatedAt = new Date().toISOString()
  db.tracking.set(req.params.trackingId, tracking)

  // Sync donation status
  const donation = [...db.donations.values()].find(d => d.trackingId === req.params.trackingId)
  if (donation) {
    donation.status = stage
    db.donations.set(donation.id, donation)
  }

  log('TRACKING_UPDATED', req.params.trackingId, 'tracking', { from: TRACKING_STAGES[currentIdx], to: stage, note }, actor)

  res.json({ tracking, message: `Status updated to ${stage}` })
})

/** GET /api/track (list all - admin) */
app.get('/api/track', (req, res) => {
  const list = [...db.tracking.values()].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  res.json({ trackingRecords: list, total: list.length })
})

// ─── API: Certificate ─────────────────────────────────────────────────────────

/** GET /api/certificates/:certificateId */
app.get('/api/certificates/:certificateId', (req, res) => {
  const cert = db.certificates.get(req.params.certificateId)
  if (!cert) return res.status(404).json({ error: 'Certificate not found' })
  res.json({ certificate: cert })
})

/** POST /api/certificates/verify */
app.post('/api/certificates/verify', (req, res) => {
  const { certificateId, verificationHash } = req.body
  const cert = db.certificates.get(certificateId)
  if (!cert) return res.status(404).json({ verified: false, error: 'Certificate not found' })
  const valid = cert.verificationHash === verificationHash && cert.isValid
  log('CERTIFICATE_VERIFIED', certificateId, 'certificate', { result: valid }, 'api')
  res.json({ verified: valid, certificate: valid ? cert : null })
})

/** POST /api/certificates/scan - Upload & parse certificate image/PDF */
app.post('/api/certificates/scan', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  // Simulate OCR extraction — in production, integrate Tesseract.js or Google Vision
  // For demo, we parse the certificate ID from filename or mock it
  const simulatedExtraction = {
    certificateId: req.body.certificateId || null,
    donorId: req.body.donorId || null,
    raw: `Scanned file: ${req.file.filename}`,
  }

  log('CERTIFICATE_SCANNED', req.file.filename, 'certificate', simulatedExtraction, 'scan-api')

  // If certificateId provided, try to fetch identity
  if (simulatedExtraction.certificateId) {
    const cert = db.certificates.get(simulatedExtraction.certificateId)
    if (cert) {
      const donor = [...db.donors.values()].find(d => d.donorId === cert.donorId)
      return res.json({
        action: 'fetched',
        certificate: cert,
        donor: donor || null,
        message: 'Identity fetched from certificate',
      })
    }
  }

  // Certificate not found → return info to create identity
  res.json({
    action: 'create',
    extractedData: simulatedExtraction,
    message: 'Certificate not found. Please register to create a new identity.',
  })
})

// ─── API: Audit Logs ──────────────────────────────────────────────────────────

/** GET /api/logs */
app.get('/api/logs', (req, res) => {
  const { entityId, entityType, limit = 50 } = req.query
  let logs = db.auditLogs
  if (entityId) logs = logs.filter(l => l.entityId === entityId)
  if (entityType) logs = logs.filter(l => l.entityType === entityType)
  res.json({ logs: logs.slice(0, Number(limit)), total: logs.length })
})

// ─── Seed Demo Data ───────────────────────────────────────────────────────────
function seedDemoData() {
  const donorId1 = generateDonorId()
  const dId1 = uuidv4()
  const donor1 = {
    id: dId1, donorId: donorId1, name: 'Alex Rivera',
    email: 'alex@example.com', bloodType: 'O+', phone: '+1 555 123 4567',
    dob: '1990-05-15', address: 'New York, NY', totalDonations: 3,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    isVerified: true, status: 'active',
    lastDonation: new Date(Date.now() - 30 * 86400000).toISOString(),
  }
  db.donors.set(dId1, donor1)

  // Create a donation + tracking + cert for demo
  const donId = uuidv4()
  const donationId = generateDonationId()
  const trackingId = generateTrackingId()
  const certificateId = generateCertificateId()
  const vHash = generateVerificationHash({ certificateId, donationId, donorId: donorId1, bloodType: 'O+' })

  const donation = {
    id: donId, donationId, trackingId, certificateId, donorId: donorId1,
    donorName: donor1.name, bloodType: 'O+', units: '450ml',
    donationCenter: 'City Hospital', notes: 'Demo donation',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), status: 'Stored',
  }

  const tracking = {
    id: uuidv4(), trackingId, donationId, donorId: donorId1, bloodType: 'O+',
    currentStage: 'Stored',
    stages: [
      { stage: 'Registered', status: 'completed', timestamp: new Date(Date.now() - 30 * 86400000).toISOString(), note: 'Donation registered', actor: 'Alex Rivera' },
      { stage: 'Collected', status: 'completed', timestamp: new Date(Date.now() - 29 * 86400000).toISOString(), note: 'Blood collected at City Hospital', actor: 'Dr. Smith' },
      { stage: 'Testing', status: 'completed', timestamp: new Date(Date.now() - 28 * 86400000).toISOString(), note: 'Lab tests initiated', actor: 'Lab Team' },
      { stage: 'Approved', status: 'completed', timestamp: new Date(Date.now() - 26 * 86400000).toISOString(), note: 'All tests cleared', actor: 'Dr. Smith' },
      { stage: 'Stored', status: 'completed', timestamp: new Date(Date.now() - 25 * 86400000).toISOString(), note: 'Stored in blood bank at -4°C', actor: 'Blood Bank' },
    ],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  }

  const certificate = {
    id: uuidv4(), certificateId, donationId, donorId: donorId1,
    donorName: donor1.name, bloodType: 'O+', units: '450ml',
    donationCenter: 'City Hospital',
    issuedAt: new Date(Date.now() - 29 * 86400000).toISOString(),
    verificationHash: vHash, isValid: true,
  }

  db.donations.set(donId, donation)
  db.tracking.set(trackingId, tracking)
  db.certificates.set(certificateId, certificate)

  console.log(`\n✅ Demo seeded:`)
  console.log(`   Donor ID:      ${donorId1}`)
  console.log(`   Tracking ID:   ${trackingId}`)
  console.log(`   Certificate:   ${certificateId}`)
  console.log(`   Verify Hash:   ${vHash}\n`)
}

seedDemoData()

app.listen(PORT, () => {
  console.log(`🩸 BloodConnect API running on http://localhost:${PORT}`)
})

export default app
