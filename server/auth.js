import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
const INSECURE_FALLBACK_SECRET = 'dev-only-insecure-secret-DO-NOT-USE-IN-PRODUCTION'

if (!JWT_SECRET) {
  console.warn(
    '\n⚠️  WARNING: JWT_SECRET is not set in server/.env — using an insecure ' +
    'development fallback. Tokens signed with this key are NOT safe for ' +
    'production. Set JWT_SECRET to a long random string before deploying.\n'
  )
}

const SECRET = JWT_SECRET || INSECURE_FALLBACK_SECRET
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '7d'
const SALT_ROUNDS = 12

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, SALT_ROUNDS)
}

export function verifyPassword(plain, hash) {
  if (!hash) return false
  return bcrypt.compareSync(plain, hash)
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, donorId: user.donorId }, SECRET, {
    expiresIn: TOKEN_TTL,
  })
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET) // throws if invalid/expired
}

/** Requires a valid Bearer token. Attaches req.auth = { sub, role, donorId }. */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    req.auth = verifyToken(token)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' })
  }
}

/** Attaches req.auth if a valid token is present, but never blocks the request. */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (token) {
    try {
      req.auth = verifyToken(token)
    } catch {
      /* ignore invalid token on optional routes */
    }
  }
  next()
}

/** Restricts a route to one or more roles. Use after `authenticate`. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' })
    }
    next()
  }
}

// ─── Basic password strength check ─────────────────────────────────────────
export function passwordIssues(password) {
  const issues = []
  if (!password || password.length < 6) issues.push('at least 6 characters')
  return issues
}
