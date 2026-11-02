import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import { connectDB, User, Donation, Tracking, Certificate, AuditLog, EmergencyAlert, Hospital } from './db.js'
import { sendResetCodeEmail, sendWelcomeEmail } from './email.js'
import {
  hashPassword,
  verifyPassword,
  signToken,
  authenticate,
  optionalAuth,
  requireRole,
  passwordIssues,
} from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 4000

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((o) => o.trim())

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. Postman, mobile apps, curl)
      if (!origin) return callback(null, true)
      // Allow configured origins or any localhost/127.0.0.1 port in dev
      if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true)
      }
      return callback(null, true)
    },
    credentials: true,
  })
)
app.use(express.json())

const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

// Slow down brute-force attempts against auth endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
})

// ─── ID Generators ────────────────────────────────────────────────────────────
function generateDonorId() {
  const year = new Date().getFullYear().toString().slice(-2)
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `DID-${year}-${rand}`
}
function generateDonationId() {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `DON-${ts}-${rand}`
}
function generateTrackingId() {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `TRK-${rand}`
}
function generateCertificateId() {
  return `CERT-${crypto.randomBytes(5).toString('hex').toUpperCase()}`
}
function generateAlertId() {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `SOS-${rand}`
}
function generateVerificationHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16).toUpperCase()
}

// ─── Audit Logger ─────────────────────────────────────────────────────────────
async function log(action, entityId, entityType, details, actor = 'system') {
  try {
    await AuditLog.create({
      id: uuidv4(),
      action,
      entityId: entityId ?? null,
      entityType: entityType ?? null,
      details: details ?? {},
      actor,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('AuditLog write error:', err.message)
  }
}

// ─── Serialization helpers ────────────────────────────────────────────────────
function publicUser(row) {
  if (!row) return null
  const obj = row.toObject ? row.toObject() : row
  const { passwordHash, failedLogins, lockedUntil, _id, ...safe } = obj
  return {
    ...safe,
    isVerified: !!safe.isVerified,
    isAvailable: !!safe.isAvailable,
    badges: Array.isArray(safe.badges) ? safe.badges : JSON.parse(safe.badges || '[]'),
    hasPassword: !!passwordHash,
  }
}

function serializeTracking(row) {
  if (!row) return null
  const obj = row.toObject ? row.toObject() : row
  const { _id, ...safe } = obj
  return {
    ...safe,
    stages: Array.isArray(safe.stages) ? safe.stages : JSON.parse(safe.stages || '[]'),
  }
}

function serializeDoc(row) {
  if (!row) return null
  const obj = row.toObject ? row.toObject({ flattenMaps: true }) : row
  const { _id, ...safe } = obj
  if (safe.inventory && safe.inventory instanceof Map) {
    safe.inventory = Object.fromEntries(safe.inventory)
  }
  return safe
}

const TRACKING_STAGES = [
  'Registered', 'Collected', 'Testing', 'Approved', 'Stored', 'Assigned', 'Dispatched', 'Delivered',
]

// ══════════════════════════════════════════════════════════════════════════
// API: Health
// ══════════════════════════════════════════════════════════════════════════
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ══════════════════════════════════════════════════════════════════════════
// API: Authentication (real — bcrypt password hashing + JWT sessions)
// ══════════════════════════════════════════════════════════════════════════

/** POST /api/auth/register */
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, bloodType, phone, role, dob, address } = req.body
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' })
    }
    if (!['donor', 'recipient'].includes(role)) {
      return res.status(400).json({ error: "role must be 'donor' or 'recipient'" })
    }
    const weaknesses = passwordIssues(password)
    if (weaknesses.length) {
      return res.status(400).json({ error: `Password must contain ${weaknesses.join(', ')}` })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      if (existing.passwordHash) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in.' })
      }
      // This email was previously only an in-system "donor identity". Upgrade it.
      existing.name = name.trim()
      existing.passwordHash = hashPassword(password)
      existing.role = role
      existing.bloodType = bloodType || existing.bloodType
      existing.phone = phone || existing.phone
      existing.dob = dob || existing.dob
      existing.address = address || existing.address
      if (!existing.welcomeEmailSent) {
        sendWelcomeEmail(existing.email, existing.name, existing.donorId).catch((err) =>
          console.warn('Could not send welcome email:', err.message)
        )
        existing.welcomeEmailSent = true
      }
      await existing.save()

      await log('ACCOUNT_CREATED', existing.id, 'user', { email: normalizedEmail, upgraded: true }, normalizedEmail)
      const token = signToken(existing)
      const safeUser = publicUser(existing)
      return res.status(201).json({ token, user: safeUser, donor: safeUser })
    }

    const user = await User.create({
      id: uuidv4(),
      donorId: generateDonorId(),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role,
      bloodType: bloodType || '',
      phone: phone || '',
      dob: dob || '',
      address: address || '',
      location: address || '',
      totalDonations: 0,
      lastDonation: null,
      isVerified: true,
      isAvailable: true,
      status: 'active',
      points: 0,
      badges: [],
      rank: null,
      welcomeEmailSent: true,
      createdAt: new Date().toISOString(),
    })
    await log('ACCOUNT_CREATED', user.id, 'user', { email: user.email }, user.email)

    // Send Welcome Email asynchronously
    sendWelcomeEmail(user.email, user.name, user.donorId).catch((err) =>
      console.warn('Could not send welcome email:', err.message)
    )

    const token = signToken(user)
    const safeUser = publicUser(user)
    res.status(201).json({ token, user: safeUser, donor: safeUser })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/auth/login */
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' })

    const normalizedEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })

    // Account lockout after repeated failures (basic brute-force protection).
    if (user?.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(423).json({ error: 'Account temporarily locked due to repeated failed logins. Try again later.' })
    }

    if (user && !user.passwordHash) {
      return res.status(401).json({ error: 'No password set for this account yet. Please use "Forgot password?" to set your password, or register.' })
    }

    const ok = user && verifyPassword(password, user.passwordHash)
    if (!ok) {
      if (user) {
        user.failedLogins = (user.failedLogins || 0) + 1
        user.lockedUntil = user.failedLogins >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
        await user.save()
        await log('LOGIN_FAILED', user.id, 'user', {}, normalizedEmail)
      }
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    user.failedLogins = 0
    user.lockedUntil = null
    if (!user.welcomeEmailSent) {
      sendWelcomeEmail(user.email, user.name, user.donorId).catch((err) =>
        console.warn('Could not send welcome email:', err.message)
      )
      user.welcomeEmailSent = true
    }
    await user.save()
    await log('LOGIN_SUCCESS', user.id, 'user', {}, user.email)

    const token = signToken(user)
    const safeUser = publicUser(user)
    res.json({ token, user: safeUser, donor: safeUser })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /api/auth/me */
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.auth.sub })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user: publicUser(user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** PATCH /api/auth/me — update own profile */
app.patch('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.auth.sub })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { name, phone, address, location, isAvailable, bloodType } = req.body
    if (name !== undefined) user.name = name
    if (phone !== undefined) user.phone = phone
    if (address !== undefined) user.address = address
    if (location !== undefined) user.location = location
    if (isAvailable !== undefined) user.isAvailable = !!isAvailable
    if (bloodType !== undefined) user.bloodType = bloodType

    await user.save()
    await log('PROFILE_UPDATED', user.id, 'user', { fields: Object.keys(req.body) }, user.email)
    res.json({ user: publicUser(user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/auth/change-password */
app.post('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findOne({ id: req.auth.sub })
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }
    const weaknesses = passwordIssues(newPassword)
    if (weaknesses.length) return res.status(400).json({ error: `Password must contain ${weaknesses.join(', ')}` })

    user.passwordHash = hashPassword(newPassword)
    await user.save()
    await log('PASSWORD_CHANGED', user.id, 'user', {}, user.email)
    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/donors/login — alias for donor login */
app.post('/api/donors/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' })

    const normalizedEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })

    if (user?.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(423).json({ error: 'Account temporarily locked due to repeated failed logins. Try again later.' })
    }

    if (user && !user.passwordHash) {
      return res.status(401).json({ error: 'No password set for this account yet. Please use "Forgot password?" to set your password, or register.' })
    }

    const ok = user && verifyPassword(password, user.passwordHash)
    if (!ok) {
      if (user) {
        user.failedLogins = (user.failedLogins || 0) + 1
        user.lockedUntil = user.failedLogins >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
        await user.save()
        await log('LOGIN_FAILED', user.id, 'user', {}, normalizedEmail)
      }
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    user.failedLogins = 0
    user.lockedUntil = null
    if (!user.welcomeEmailSent) {
      sendWelcomeEmail(user.email, user.name, user.donorId).catch((err) =>
        console.warn('Could not send welcome email:', err.message)
      )
      user.welcomeEmailSent = true
    }
    await user.save()
    await log('LOGIN_SUCCESS', user.id, 'user', {}, user.email)

    const token = signToken(user)
    const safeUser = publicUser(user)
    res.json({ token, user: safeUser, donor: safeUser })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/donors/forgot-password & /api/auth/forgot-password */
const handleForgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' })

    const normalizedEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return res.status(404).json({ error: 'Email address is not registered' })
    }

    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    user.resetToken = code
    user.resetTokenExpires = expires
    
    // Preserve recent unexpired codes in case multiple emails were sent
    const activeTokens = (Array.isArray(user.resetTokens) ? user.resetTokens : [])
      .filter((t) => t?.expires && new Date(t.expires) > new Date())
    activeTokens.push({ code, expires })
    user.resetTokens = activeTokens
    await user.save()

    await log('FORGOT_PASSWORD_REQUESTED', user.id, 'user', { email: normalizedEmail }, normalizedEmail)

    // Send real email via Gmail SMTP
    let emailResult = { sent: false }
    let emailError = null
    try {
      emailResult = await sendResetCodeEmail(normalizedEmail, code, user.name || 'Donor')
    } catch (e) {
      emailError = e.message
      console.warn('⚠️ SMTP Error sending to ' + normalizedEmail + ':', e.message)
    }

    if (!emailResult?.sent) {
      console.log(`\n🔑 [VERIFICATION CODE FALLBACK for ${normalizedEmail}]: ${code}\n`)
      if (process.env.NODE_ENV !== 'production') {
        return res.json({
          success: true,
          message: `Verification code generated! (Dev mode: check terminal: ${code})`,
          emailSent: false,
          devCode: code,
        })
      }
      return res.status(500).json({
        error: `Failed to send verification code to your Gmail: ${emailError || 'SMTP connection failed'}. Please verify your credentials in server/.env.`
      })
    }

    res.json({
      success: true,
      message: 'Verification code sent to your Gmail inbox!',
      emailSent: true,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
app.post('/api/donors/forgot-password', handleForgotPassword)
app.post('/api/auth/forgot-password', handleForgotPassword)

/** POST /api/donors/reset-password & /api/auth/reset-password */
const handleResetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body
    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, code, and new password are required' })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const enteredCode = code.toString().trim()
    const now = new Date()

    // Check primary token
    const primaryMatches = user.resetToken && user.resetToken.trim() === enteredCode
    const primaryNotExpired = user.resetTokenExpires && new Date(user.resetTokenExpires) > now

    // Check any active token in resetTokens array
    const arrayMatch = Array.isArray(user.resetTokens) && user.resetTokens.some(
      (t) => t?.code && t.code.toString().trim() === enteredCode && new Date(t.expires) > now
    )

    if (!primaryMatches && !arrayMatch) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your latest email.' })
    }

    if (!primaryNotExpired && !arrayMatch) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' })
    }

    const weaknesses = passwordIssues(password)
    if (weaknesses.length) {
      return res.status(400).json({ error: `Password must contain ${weaknesses.join(', ')}` })
    }

    user.passwordHash = hashPassword(password)
    user.resetToken = null
    user.resetTokenExpires = null
    user.resetTokens = []
    user.failedLogins = 0
    user.lockedUntil = null
    await user.save()

    await log('PASSWORD_RESET_SUCCESS', user.id, 'user', { email: normalizedEmail }, normalizedEmail)
    res.json({ success: true, message: 'Password has been reset successfully. You can now login.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
app.post('/api/donors/reset-password', handleResetPassword)
app.post('/api/auth/reset-password', handleResetPassword)

// ══════════════════════════════════════════════════════════════════════════
// API: Donor Identity (public lookup/creation — e.g. hospital intake desks)
// ══════════════════════════════════════════════════════════════════════════

/** POST /api/donors/register — register donor identity & credentials */
app.post('/api/donors/register', async (req, res) => {
  try {
    const { name, email, bloodType, phone, dob, address, password, role } = req.body
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'name and email are required' })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      if (password) {
        // If they already have a password and it matches, return success session
        if (existing.passwordHash && verifyPassword(password, existing.passwordHash)) {
          const token = signToken(existing)
          const safeUser = publicUser(existing)
          return res.status(200).json({ token, user: safeUser, donor: safeUser, message: 'Logged in successfully' })
        }
        // If they don't have a password yet, set it now!
        if (!existing.passwordHash) {
          const weaknesses = passwordIssues(password)
          if (weaknesses.length) {
            return res.status(400).json({ error: `Password must contain ${weaknesses.join(', ')}` })
          }
          existing.passwordHash = hashPassword(password)
          if (name) existing.name = name.trim()
          if (bloodType) existing.bloodType = bloodType
          if (phone) existing.phone = phone
          if (dob) existing.dob = dob
          if (address) { existing.address = address; existing.location = address }
          if (role) existing.role = role
          existing.failedLogins = 0
          existing.lockedUntil = null
          await existing.save()

          const token = signToken(existing)
          const safeUser = publicUser(existing)
          await log('DONOR_UPDATED', existing.id, 'donor', { donorId: existing.donorId, email: normalizedEmail, upgraded: true }, normalizedEmail)
          return res.status(200).json({ token, user: safeUser, donor: safeUser, message: 'Password saved and account updated' })
        }
        return res.status(409).json({ error: 'An account with this email already exists. Please log in.', donorId: existing.donorId })
      }
      return res.status(409).json({ error: 'Email already registered', donorId: existing.donorId })
    }

    let passwordHash = null
    if (password) {
      const weaknesses = passwordIssues(password)
      if (weaknesses.length) {
        return res.status(400).json({ error: `Password must contain ${weaknesses.join(', ')}` })
      }
      passwordHash = hashPassword(password)
    }

    const user = await User.create({
      id: uuidv4(),
      donorId: generateDonorId(),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: role || 'donor',
      bloodType: bloodType || '',
      phone: phone || '',
      dob: dob || '',
      address: address || '',
      location: address || '',
      totalDonations: 0,
      lastDonation: null,
      isVerified: true,
      isAvailable: true,
      status: 'active',
      points: 0,
      badges: [],
      welcomeEmailSent: true,
      createdAt: new Date().toISOString(),
    })
    await log('DONOR_REGISTERED', user.id, 'donor', { donorId: user.donorId, email: normalizedEmail, name: user.name }, normalizedEmail)

    // Send Welcome email asynchronously
    sendWelcomeEmail(user.email, user.name, user.donorId).catch((err) =>
      console.warn('Could not send welcome email:', err.message)
    )

    const token = signToken(user)
    const safeUser = publicUser(user)
    res.status(201).json({ token, user: safeUser, donor: safeUser, message: 'Donor registered successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/donors/by-email/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: decodeURIComponent(req.params.email).toLowerCase().trim() })
    if (!user) return res.status(404).json({ error: 'Donor not found' })
    res.json({ donor: publicUser(user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/donors/:donorId', async (req, res) => {
  try {
    const user = await User.findOne({ donorId: req.params.donorId })
    if (!user) return res.status(404).json({ error: 'Donor not found' })
    res.json({ donor: publicUser(user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/donors', async (req, res) => {
  try {
    const rows = await User.find().sort({ createdAt: -1 })
    const list = rows.map(publicUser)
    res.json({ donors: list, total: list.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// API: Donations
// ══════════════════════════════════════════════════════════════════════════

app.post('/api/donations/create', optionalAuth, async (req, res) => {
  try {
    const { donorId, bloodType, units, donationCenter, notes } = req.body
    if (!donorId || !bloodType) return res.status(400).json({ error: 'donorId and bloodType required' })

    const donor = await User.findOne({ donorId })
    if (!donor) return res.status(404).json({ error: 'Donor not found. Please register first.' })

    const id = uuidv4()
    const donationId = generateDonationId()
    const trackingId = generateTrackingId()
    const certificateId = generateCertificateId()
    const now = new Date().toISOString()

    const donation = await Donation.create({
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
      status: 'Registered',
      createdAt: now,
    })

    const stages = [
      { stage: 'Registered', status: 'completed', timestamp: now, note: 'Donation registered in system', actor: donor.name },
    ]
    const tracking = await Tracking.create({
      id: uuidv4(),
      trackingId,
      donationId,
      donorId,
      bloodType,
      currentStage: 'Registered',
      stages,
      createdAt: now,
      updatedAt: now,
    })

    const verificationHash = generateVerificationHash({ certificateId, donationId, donorId, bloodType })
    const cert = await Certificate.create({
      id: uuidv4(),
      certificateId,
      donationId,
      donorId,
      donorName: donor.name,
      bloodType,
      units: units || '450ml',
      donationCenter: donationCenter || 'BloodConnect Center',
      issuedAt: now,
      verificationHash,
      isValid: true,
    })

    await User.updateOne(
      { donorId },
      { $inc: { totalDonations: 1 }, $set: { lastDonation: now } }
    )

    await log('DONATION_CREATED', id, 'donation', { donationId, trackingId, certificateId }, donorId)

    res.status(201).json({
      donation: serializeDoc(donation),
      tracking: serializeTracking(tracking),
      certificate: serializeDoc(cert),
      message: 'Donation recorded successfully',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/donations/by-donor/:donorId', async (req, res) => {
  try {
    const donations = await Donation.find({ donorId: req.params.donorId }).sort({ createdAt: -1 })
    res.json({ donations: donations.map(serializeDoc) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// API: Blood Tracking
// ══════════════════════════════════════════════════════════════════════════

/** GET /api/track/:trackingId — public: anyone can look up a tracking status */
app.get('/api/track/:trackingId', async (req, res) => {
  try {
    const tracking = await Tracking.findOne({ trackingId: req.params.trackingId })
    if (!tracking) return res.status(404).json({ error: 'Tracking ID not found' })
    res.json({ tracking: serializeTracking(tracking) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/track/:trackingId/update — admin/hospital staff only */
app.post('/api/track/:trackingId/update', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { stage, note } = req.body
    const actor = req.body.actor || 'Admin Panel'
    const tracking = await Tracking.findOne({ trackingId: req.params.trackingId })
    if (!tracking) return res.status(404).json({ error: 'Tracking record not found' })

    const stageIdx = TRACKING_STAGES.indexOf(stage)
    if (stageIdx === -1) return res.status(400).json({ error: 'Invalid stage', validStages: TRACKING_STAGES })

    const currentIdx = TRACKING_STAGES.indexOf(tracking.currentStage)
    if (stageIdx <= currentIdx) return res.status(400).json({ error: 'Cannot move to a previous or same stage' })

    const stages = Array.isArray(tracking.stages) ? [...tracking.stages] : []
    for (let i = currentIdx + 1; i <= stageIdx; i++) {
      const alreadyExists = stages.find((s) => s.stage === TRACKING_STAGES[i])
      if (!alreadyExists) {
        stages.push({
          stage: TRACKING_STAGES[i],
          status: 'completed',
          timestamp: new Date().toISOString(),
          note: i === stageIdx ? note || '' : `Auto-progressed to ${TRACKING_STAGES[i]}`,
          actor,
        })
      }
    }
    tracking.currentStage = stage
    tracking.stages = stages
    tracking.updatedAt = new Date().toISOString()
    await tracking.save()

    await Donation.updateOne({ trackingId: req.params.trackingId }, { $set: { status: stage } })
    await log('TRACKING_UPDATED', req.params.trackingId, 'tracking', { from: TRACKING_STAGES[currentIdx], to: stage, note }, actor)

    res.json({ tracking: serializeTracking(tracking), message: `Status updated to ${stage}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /api/track — admin only: list all tracking records */
app.get('/api/track', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const rows = await Tracking.find().sort({ updatedAt: -1 })
    const list = rows.map(serializeTracking)
    res.json({ trackingRecords: list, total: list.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// API: Certificates
// ══════════════════════════════════════════════════════════════════════════

app.get('/api/certificates/:certificateId', async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certificateId: req.params.certificateId })
    if (!cert) return res.status(404).json({ error: 'Certificate not found' })
    res.json({ certificate: serializeDoc(cert) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/certificates/verify', async (req, res) => {
  try {
    const { certificateId, verificationHash } = req.body
    const cert = await Certificate.findOne({ certificateId })
    if (!cert) return res.status(404).json({ verified: false, error: 'Certificate not found' })
    const valid = cert.verificationHash === verificationHash && !!cert.isValid
    await log('CERTIFICATE_VERIFIED', certificateId, 'certificate', { result: valid }, 'api')
    res.json({ verified: valid, certificate: valid ? serializeDoc(cert) : null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/certificates/scan', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const simulatedExtraction = {
      certificateId: req.body.certificateId || null,
      donorId: req.body.donorId || null,
      raw: `Scanned file: ${req.file.filename}`,
    }
    await log('CERTIFICATE_SCANNED', req.file.filename, 'certificate', simulatedExtraction, 'scan-api')

    if (simulatedExtraction.certificateId) {
      const cert = await Certificate.findOne({ certificateId: simulatedExtraction.certificateId })
      if (cert) {
        const donor = await User.findOne({ donorId: cert.donorId })
        return res.json({
          action: 'fetched',
          certificate: serializeDoc(cert),
          donor: donor ? publicUser(donor) : null,
          message: 'Identity fetched from certificate',
        })
      }
    }

    res.json({
      action: 'create',
      extractedData: simulatedExtraction,
      message: 'Certificate not found. Please register to create a new identity.',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// API: Audit Logs — admin only
// ══════════════════════════════════════════════════════════════════════════

app.get('/api/logs', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { entityId, entityType, limit = 50 } = req.query
    const filter = {}
    if (entityId) filter.entityId = entityId
    if (entityType) filter.entityType = entityType

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ])

    res.json({ logs: logs.map(serializeDoc), total })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Admin Dashboard Endpoints ──────────────────────────────────────────────
app.get('/api/admin/stats', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [donors, recipients, donations, alerts, verified, hospitals] = await Promise.all([
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'recipient' }),
      Donation.countDocuments(),
      EmergencyAlert.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'donor', isVerified: true }),
      Hospital.countDocuments(),
    ])
    res.json({ stats: { donors, recipients, donations, alerts, verified, hospitals } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Hospital Database & Inventory API ──────────────────────────────────────
app.get('/api/hospitals', async (req, res) => {
  try {
    const { bloodType, city } = req.query
    const filter = {}
    if (city) filter.city = new RegExp(city, 'i')

    let hospitals = await Hospital.find(filter).sort({ name: 1 })
    if (bloodType) {
      hospitals = hospitals.filter((h) => {
        const units = h.inventory?.get ? h.inventory.get(bloodType) : h.inventory?.[bloodType]
        return (units || 0) > 0
      })
    }
    res.json({ hospitals: hospitals.map(serializeDoc) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/hospitals', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, licenseNumber, category, address, city, state, emergencyHelpline, coordinates, inventory } = req.body
    if (!name || !licenseNumber || !address || !emergencyHelpline) {
      return res.status(400).json({ error: 'name, licenseNumber, address, and emergencyHelpline are required' })
    }
    const hospital = await Hospital.create({
      hospitalId: `HOSP-${Date.now().toString(36).toUpperCase()}`,
      name: name.trim(),
      licenseNumber: licenseNumber.trim(),
      category: category || 'Government',
      address: address.trim(),
      city: city || 'New Delhi',
      state: state || 'Delhi',
      coordinates: coordinates || { lat: 28.6139, lng: 77.2090 },
      emergencyHelpline: emergencyHelpline.trim(),
      isVerified: true,
      inventory: inventory || { 'A+': 10, 'A-': 3, 'B+': 15, 'B-': 3, 'AB+': 8, 'AB-': 2, 'O+': 25, 'O-': 3 },
    })
    await log('HOSPITAL_REGISTERED', hospital.id, 'hospital', { name: hospital.name }, req.auth.sub)
    res.status(201).json({ hospital: serializeDoc(hospital) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/hospitals/:id/inventory', authenticate, async (req, res) => {
  try {
    const { bloodType, units } = req.body
    const hospital = await Hospital.findOne({ id: req.params.id })
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' })

    if (bloodType && units !== undefined) {
      if (hospital.inventory?.set) hospital.inventory.set(bloodType, Math.max(0, Number(units)))
      else hospital.inventory[bloodType] = Math.max(0, Number(units))
    } else if (req.body.inventory) {
      hospital.inventory = req.body.inventory
    }
    await hospital.save()
    await log('HOSPITAL_INVENTORY_UPDATED', hospital.id, 'hospital', req.body, req.auth.sub)
    res.json({ hospital: serializeDoc(hospital) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/hospitals/:id/verify', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ id: req.params.id })
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' })
    hospital.isVerified = !hospital.isVerified
    await hospital.save()
    await log('HOSPITAL_VERIFICATION_TOGGLED', hospital.id, 'hospital', { isVerified: hospital.isVerified }, req.auth.sub)
    res.json({ hospital: serializeDoc(hospital) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/hospitals/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.findOneAndDelete({ id: req.params.id })
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' })
    await log('HOSPITAL_DELETED', hospital.id, 'hospital', { name: hospital.name }, req.auth.sub)
    res.json({ success: true, message: 'Hospital removed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/admin/users', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find({}, { passwordHash: 0, resetToken: 0, resetTokens: 0 }).sort({ createdAt: -1 })
    res.json({ users: users.map(publicUser) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/admin/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { isVerified, status, role, isAvailable } = req.body
    const user = await User.findOne({ id: req.params.id })
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (isVerified !== undefined) user.isVerified = !!isVerified
    if (status !== undefined) user.status = status
    if (role !== undefined) user.role = role
    if (isAvailable !== undefined) user.isAvailable = !!isAvailable

    await user.save()
    await log('ADMIN_USER_UPDATED', user.id, 'user', req.body, req.auth.sub)
    res.json({ user: publicUser(user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/admin/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ id: req.params.id })
    if (!user) return res.status(404).json({ error: 'User not found' })
    await log('ADMIN_USER_DELETED', user.id, 'user', { email: user.email }, req.auth.sub)
    res.json({ success: true, message: 'User deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// API: Emergency SOS & Live Donor Dispatch
// ══════════════════════════════════════════════════════════════════════════

const COMPATIBILITY_MAP = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
}

/** POST /api/emergency/create — broadcast an emergency blood request */
app.post('/api/emergency/create', async (req, res) => {
  try {
    const { bloodType, hospital, contact, unitsNeeded = 1, urgency = 'high', notes = '' } = req.body
    if (!bloodType || !hospital || !contact) {
      return res.status(400).json({ error: 'bloodType, hospital, and contact are required' })
    }

    const normType = bloodType.toUpperCase().trim()
    const compatibleTypes = COMPATIBILITY_MAP[normType] || [normType]
    const alertId = generateAlertId()

    // Find real matching available donors in MongoDB
    const matchedDonors = await User.find({
      bloodType: { $in: compatibleTypes },
      role: 'donor',
      isAvailable: true,
    }).limit(10)

    const alert = await EmergencyAlert.create({
      id: uuidv4(),
      alertId,
      bloodType: normType,
      compatibleTypes,
      hospital: hospital.trim(),
      contact: contact.trim(),
      unitsNeeded: Number(unitsNeeded) || 1,
      unitsCommitted: 0,
      urgency,
      notes: notes || '',
      status: 'active',
      donorsResponded: [],
      createdAt: new Date().toISOString(),
    })

    await log('EMERGENCY_BROADCAST_SENT', alert.id, 'emergency', { alertId, bloodType: normType, compatibleCount: matchedDonors.length }, contact)

    res.status(201).json({
      alert: serializeDoc(alert),
      compatibleTypes,
      matchedDonorsCount: matchedDonors.length,
      matchedDonors: matchedDonors.map(publicUser),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /api/emergency/active — retrieve active emergency SOS alerts */
app.get('/api/emergency/active', async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find({ status: 'active' }).sort({ createdAt: -1 }).limit(20)
    res.json({ alerts: alerts.map(serializeDoc), total: alerts.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/emergency/:alertId/respond — record a donor pledge/response */
app.post('/api/emergency/:alertId/respond', async (req, res) => {
  try {
    const { donorName, bloodType, distance, eta, notes } = req.body
    const alert = await EmergencyAlert.findOne({ alertId: req.params.alertId })
    if (!alert) return res.status(404).json({ error: 'Emergency alert not found' })

    const responseItem = {
      id: uuidv4(),
      donorName: donorName || 'Anonymous Donor',
      bloodType: bloodType || alert.bloodType,
      distance: distance || '3.2 km',
      eta: eta || '15 mins',
      status: 'En Route',
      timestamp: new Date().toISOString(),
      notes: notes || '',
    }

    alert.donorsResponded.push(responseItem)
    alert.unitsCommitted = (alert.unitsCommitted || 0) + 1
    if (alert.unitsCommitted >= alert.unitsNeeded) {
      alert.status = 'fulfilled'
    }
    await alert.save()

    await log('EMERGENCY_DONOR_RESPONDED', alert.id, 'emergency', { alertId: alert.alertId, donorName: responseItem.donorName }, responseItem.donorName)

    res.json({
      alert: serializeDoc(alert),
      response: responseItem,
      message: 'Donor response registered successfully',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/emergency/:alertId/resolve — mark emergency as resolved */
app.post('/api/emergency/:alertId/resolve', async (req, res) => {
  try {
    const alert = await EmergencyAlert.findOne({ alertId: req.params.alertId })
    if (!alert) return res.status(404).json({ error: 'Emergency alert not found' })

    alert.status = 'fulfilled'
    await alert.save()

    await log('EMERGENCY_RESOLVED', alert.id, 'emergency', { alertId: alert.alertId }, 'system')
    res.json({ alert: serializeDoc(alert), message: 'Emergency marked as resolved' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Seed Demo Data (ensures demo accounts always exist) ─────────────────
async function seedDemoData() {
  try {
    const adminExists = await User.findOne({ email: 'admin@bloodconnect.org' })
    if (!adminExists) {
      await User.create({
        id: uuidv4(),
        donorId: 'DID-ADMIN-01',
        name: 'System Admin',
        email: 'admin@bloodconnect.org',
        passwordHash: hashPassword('AdminPass123'),
        role: 'admin',
        bloodType: 'O+',
        phone: '+91 9876543210',
        address: 'Headquarters',
        location: 'Headquarters',
        isVerified: true,
        isAvailable: true,
        status: 'active',
        points: 9999,
        badges: ['admin', 'verified'],
        createdAt: new Date().toISOString(),
      })
    }

    const alexExists = await User.findOne({ email: 'alex@example.com' })
    if (!alexExists) {
      const donorId1 = generateDonorId()
      const user = await User.create({
        id: uuidv4(),
        donorId: donorId1,
        name: 'Alex Rivera',
        email: 'alex@example.com',
        passwordHash: hashPassword('Password123'),
        role: 'donor',
        bloodType: 'O+',
        phone: '+1 555 123 4567',
        dob: '1990-05-15',
        address: 'New York, NY',
        location: 'New York, NY',
        totalDonations: 3,
        lastDonation: new Date(Date.now() - 30 * 86400000).toISOString(),
        isVerified: true,
        isAvailable: true,
        status: 'active',
        points: 1200,
        badges: ['first_donation', 'regular_donor', 'hero', 'silver_donor'],
        rank: 15,
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      })

      const donId = uuidv4()
      const donationId = generateDonationId()
      const trackingId = generateTrackingId()
      const certificateId = generateCertificateId()
      const vHash = generateVerificationHash({ certificateId, donationId, donorId: donorId1, bloodType: 'O+' })

      await Donation.create({
        id: donId,
        donationId,
        trackingId,
        certificateId,
        donorId: donorId1,
        donorName: user.name,
        bloodType: 'O+',
        units: '450ml',
        donationCenter: 'City Hospital',
        notes: 'Demo donation',
        status: 'Stored',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      })

      const stages = [
        { stage: 'Registered', status: 'completed', timestamp: new Date(Date.now() - 30 * 86400000).toISOString(), note: 'Donation registered', actor: 'Alex Rivera' },
        { stage: 'Collected', status: 'completed', timestamp: new Date(Date.now() - 29 * 86400000).toISOString(), note: 'Blood collected at City Hospital', actor: 'Dr. Smith' },
        { stage: 'Testing', status: 'completed', timestamp: new Date(Date.now() - 28 * 86400000).toISOString(), note: 'Lab tests initiated', actor: 'Lab Team' },
        { stage: 'Approved', status: 'completed', timestamp: new Date(Date.now() - 26 * 86400000).toISOString(), note: 'All tests cleared', actor: 'Dr. Smith' },
        { stage: 'Stored', status: 'completed', timestamp: new Date(Date.now() - 25 * 86400000).toISOString(), note: 'Stored in blood bank at -4°C', actor: 'Blood Bank' },
      ]

      await Tracking.create({
        id: uuidv4(),
        trackingId,
        donationId,
        donorId: donorId1,
        bloodType: 'O+',
        currentStage: 'Stored',
        stages,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
      })

      await Certificate.create({
        id: uuidv4(),
        certificateId,
        donationId,
        donorId: donorId1,
        donorName: user.name,
        bloodType: 'O+',
        units: '450ml',
        donationCenter: 'City Hospital',
        issuedAt: new Date(Date.now() - 29 * 86400000).toISOString(),
        verificationHash: vHash,
        isValid: true,
      })
      console.log(`\n✅ Default demo accounts created in MongoDB:`)
      console.log(`   Donor ID:      ${donorId1}`)
      console.log(`   Tracking ID:   ${trackingId}`)
      console.log(`   Certificate:   ${certificateId}`)
      console.log(`   Verify Hash:   ${vHash}`)
    }

    const hospCount = await Hospital.countDocuments()
    if (hospCount === 0) {
      await Hospital.create([
        {
          hospitalId: 'HOSP-DEL-AIIMS',
          name: 'AIIMS New Delhi — Central Blood Bank',
          licenseNumber: 'DL-BB-2024-AIIMS',
          category: 'Government',
          address: 'Ansari Nagar, Sri Aurobindo Marg, New Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          coordinates: { lat: 28.5672, lng: 77.2100 },
          emergencyHelpline: '+91 11 2658 8500',
          nodalOfficer: { name: 'Dr. Sandeep Verma', phone: '+91 9876543210', email: 'bloodbank@aiims.edu' },
          isVerified: true,
          inventory: { 'A+': 22, 'A-': 5, 'B+': 30, 'B-': 6, 'AB+': 12, 'AB-': 2, 'O+': 45, 'O-': 3 },
        },
        {
          hospitalId: 'HOSP-DEL-SFDJ',
          name: 'Safdarjung Hospital Regional Blood Center',
          licenseNumber: 'DL-BB-2023-SFDJ',
          category: 'Government',
          address: 'Ring Road, Opposite AIIMS, New Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          coordinates: { lat: 28.5700, lng: 77.2074 },
          emergencyHelpline: '+91 11 2616 5060',
          nodalOfficer: { name: 'Dr. Ritu Saxena', phone: '+91 9811122233', email: 'blood@safdarjung.gov.in' },
          isVerified: true,
          inventory: { 'A+': 16, 'A-': 4, 'B+': 20, 'B-': 3, 'AB+': 8, 'AB-': 1, 'O+': 32, 'O-': 2 },
        },
        {
          hospitalId: 'HOSP-DEL-FORTIS',
          name: 'Fortis Escorts Heart Institute Blood Bank',
          licenseNumber: 'DL-BB-2022-FORTIS',
          category: 'Private',
          address: 'Okhla Road, Sukhdev Vihar, New Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          coordinates: { lat: 28.5604, lng: 77.2798 },
          emergencyHelpline: '+91 11 4713 5000',
          nodalOfficer: { name: 'Dr. Neha Malik', phone: '+91 9899001122', email: 'bloodbank@fortishealthcare.com' },
          isVerified: true,
          inventory: { 'A+': 14, 'A-': 3, 'B+': 18, 'B-': 4, 'AB+': 6, 'AB-': 2, 'O+': 28, 'O-': 4 },
        },
        {
          hospitalId: 'HOSP-DEL-MAX',
          name: 'Max Super Speciality Hospital Blood Bank',
          licenseNumber: 'DL-BB-2023-MAX',
          category: 'Private',
          address: '1, 2 Press Enclave Road, Saket, New Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          coordinates: { lat: 28.5284, lng: 77.2120 },
          emergencyHelpline: '+91 11 2651 5050',
          nodalOfficer: { name: 'Dr. Alok Gupta', phone: '+91 9822334455', email: 'transfusion@maxhealthcare.com' },
          isVerified: true,
          inventory: { 'A+': 19, 'A-': 2, 'B+': 22, 'B-': 5, 'AB+': 9, 'AB-': 2, 'O+': 38, 'O-': 2 },
        },
      ])
      console.log('   Hospitals:     4 partner hospitals seeded with live blood inventory')
    }

    console.log(`\n✅ Default accounts ready in MongoDB:`)
    console.log(`   Donor login:   alex@example.com / Password123`)
    console.log(`   Admin login:   admin@bloodconnect.org / AdminPass123\n`)
  } catch (err) {
    console.error('Seed demo data error:', err.message)
  }
}

// ─── 404 JSON Fallback ────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
})

// ─── Initialize & Start Server ────────────────────────────────────────────────
async function start() {
  await connectDB()
  await seedDemoData()
  app.listen(PORT, () => {
    console.log(`🩸 BloodConnect API running on http://localhost:${PORT} (MongoDB persistence)`)
  })
}

start()

export default app
