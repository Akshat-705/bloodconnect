import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bloodconnect'

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log(`🍃 Connected to MongoDB at ${MONGODB_URI}`)
  } catch (err) {
    console.error(`❌ Failed to connect to MongoDB at ${MONGODB_URI}:`, err.message)
    process.exit(1)
  }
}

// ─── User Schema ─────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuidv4(), unique: true, index: true },
    donorId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    role: { type: String, enum: ['donor', 'recipient', 'admin'], default: 'donor' },
    bloodType: { type: String, default: '' },
    phone: { type: String, default: '' },
    dob: { type: String, default: '' },
    address: { type: String, default: '' },
    location: { type: String, default: '' },
    totalDonations: { type: Number, default: 0 },
    lastDonation: { type: String, default: null },
    isVerified: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    status: { type: String, default: 'active' },
    points: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    rank: { type: Number, default: null },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: { type: String, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: String, default: null },
    resetTokens: { type: [mongoose.Schema.Types.Mixed], default: [] },
    welcomeEmailSent: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    versionKey: false,
    timestamps: false,
  }
)

// ─── Donation Schema ─────────────────────────────────────────────────────────
const donationSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuidv4(), unique: true },
    donationId: { type: String, required: true, unique: true, index: true },
    trackingId: { type: String, required: true, index: true },
    certificateId: { type: String, required: true },
    donorId: { type: String, required: true, index: true },
    donorName: { type: String, required: true },
    bloodType: { type: String, required: true },
    units: { type: String, default: '450ml' },
    donationCenter: { type: String, default: 'BloodConnect Center' },
    notes: { type: String, default: '' },
    status: { type: String, default: 'Registered' },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    versionKey: false,
  }
)

// ─── Tracking Schema ─────────────────────────────────────────────────────────
const trackingSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuidv4(), unique: true },
    trackingId: { type: String, required: true, unique: true, index: true },
    donationId: { type: String, required: true },
    donorId: { type: String, required: true, index: true },
    bloodType: { type: String, required: true },
    currentStage: { type: String, required: true },
    stages: { type: [mongoose.Schema.Types.Mixed], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    versionKey: false,
  }
)

// ─── Certificate Schema ──────────────────────────────────────────────────────
const certificateSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuidv4(), unique: true },
    certificateId: { type: String, required: true, unique: true, index: true },
    donationId: { type: String, required: true },
    donorId: { type: String, required: true },
    donorName: { type: String, required: true },
    bloodType: { type: String, required: true },
    units: { type: String, default: '450ml' },
    donationCenter: { type: String, default: 'BloodConnect Center' },
    issuedAt: { type: String, default: () => new Date().toISOString() },
    verificationHash: { type: String, required: true },
    isValid: { type: Boolean, default: true },
  },
  {
    versionKey: false,
  }
)

// ─── Audit Log Schema ────────────────────────────────────────────────────────
const auditLogSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuidv4(), unique: true },
    action: { type: String, required: true },
    entityId: { type: String, default: null, index: true },
    entityType: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    actor: { type: String, default: 'system' },
    timestamp: { type: String, default: () => new Date().toISOString() },
  },
  {
    versionKey: false,
  }
)

// ─── Emergency Alert Schema ──────────────────────────────────────────────────
const emergencyAlertSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuidv4(), unique: true },
    alertId: { type: String, required: true, unique: true, index: true },
    bloodType: { type: String, required: true },
    compatibleTypes: { type: [String], default: [] },
    hospital: { type: String, required: true },
    contact: { type: String, required: true },
    unitsNeeded: { type: Number, default: 1 },
    unitsCommitted: { type: Number, default: 0 },
    urgency: { type: String, enum: ['critical', 'high', 'medium'], default: 'high' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['active', 'fulfilled', 'cancelled'], default: 'active' },
    donorsResponded: { type: [mongoose.Schema.Types.Mixed], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    versionKey: false,
  }
)

export const User = mongoose.model('User', userSchema)
export const Donation = mongoose.model('Donation', donationSchema)
export const Tracking = mongoose.model('Tracking', trackingSchema)
export const Certificate = mongoose.model('Certificate', certificateSchema)
export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
export const EmergencyAlert = mongoose.model('EmergencyAlert', emergencyAlertSchema)

// ─── Hospital Schema ─────────────────────────────────────────────────────────
const hospitalSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuidv4(), unique: true },
    hospitalId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    category: { type: String, enum: ['Government', 'Private', 'Charitable'], default: 'Government' },
    address: { type: String, required: true },
    city: { type: String, default: 'New Delhi' },
    state: { type: String, default: 'Delhi' },
    coordinates: {
      lat: { type: Number, default: 28.6139 },
      lng: { type: Number, default: 77.2090 },
    },
    emergencyHelpline: { type: String, required: true },
    nodalOfficer: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    isVerified: { type: Boolean, default: true },
    inventory: {
      type: Map,
      of: Number,
      default: {
        'A+': 12, 'A-': 3,
        'B+': 18, 'B-': 4,
        'AB+': 8, 'AB-': 2,
        'O+': 30, 'O-': 3,
      },
    },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    versionKey: false,
  }
)

export const Hospital = mongoose.model('Hospital', hospitalSchema)

