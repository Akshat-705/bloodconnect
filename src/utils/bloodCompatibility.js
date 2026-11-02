/**
 * Biological Blood Group Compatibility & Matching Engine
 * Used for emergency SOS matching, donor cross-matching, and patient guidance.
 */

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

/**
 * Biological Red Blood Cell Recipient Compatibility:
 * Key = Recipient Blood Type, Value = List of Compatible Donor Blood Types
 */
export const COMPATIBLE_DONORS = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
}

/**
 * Biological Red Blood Cell Donor Compatibility:
 * Key = Donor Blood Type, Value = List of Compatible Recipient Blood Types
 */
export const COMPATIBLE_RECIPIENTS = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
}

/** Population distribution & rarity notes */
export const BLOOD_RARITY = {
  'O+': { percent: '38%', label: 'Most Common', universal: false },
  'A+': { percent: '34%', label: 'Very Common', universal: false },
  'B+': { percent: '9%', label: 'Common', universal: false },
  'O-': { percent: '7%', label: 'High Demand • Universal Red Cell Donor', universal: true },
  'A-': { percent: '6%', label: 'Rare', universal: false },
  'AB+': { percent: '3%', label: 'Universal Recipient', universal: true },
  'B-': { percent: '2%', label: 'Very Rare', universal: false },
  'AB-': { percent: '1%', label: 'Extremely Rare', universal: false },
}

/**
 * Biological RBC Antigens Present
 */
export const BLOOD_ANTIGENS = {
  'O-': { antigens: 'None', abDescription: 'No A, B, or Rh(D) antigens on red blood cells' },
  'O+': { antigens: 'Rh(D)', abDescription: 'Only Rh(D) antigen present (no A or B)' },
  'A-': { antigens: 'A', abDescription: 'A antigen present (Rh negative)' },
  'A+': { antigens: 'A, Rh(D)', abDescription: 'A and Rh(D) antigens present' },
  'B-': { antigens: 'B', abDescription: 'B antigen present (Rh negative)' },
  'B+': { antigens: 'B, Rh(D)', abDescription: 'B and Rh(D) antigens present' },
  'AB-': { antigens: 'A, B', abDescription: 'Both A and B antigens present (Rh negative)' },
  'AB+': { antigens: 'A, B, Rh(D)', abDescription: 'All major antigens present (A, B, and Rh)' },
}

/**
 * Biological Plasma Antibodies Present
 */
export const BLOOD_ANTIBODIES = {
  'O-': { antibodies: 'Anti-A, Anti-B', note: 'Can only receive O- red blood cells' },
  'O+': { antibodies: 'Anti-A, Anti-B', note: 'Can receive O+ and O- red blood cells' },
  'A-': { antibodies: 'Anti-B', note: 'Will destroy donor cells with B antigens' },
  'A+': { antibodies: 'Anti-B', note: 'Will destroy donor cells with B antigens' },
  'B-': { antibodies: 'Anti-A', note: 'Will destroy donor cells with A antigens' },
  'B+': { antibodies: 'Anti-A', note: 'Will destroy donor cells with A antigens' },
  'AB-': { antibodies: 'None', note: 'Universal recipient for Rh-negative red cells' },
  'AB+': { antibodies: 'None', note: 'Universal Recipient: can safely receive red blood cells of any type' },
}

/**
 * Returns all donor types that can safely donate to a patient of `recipientType`.
 */
export function getCompatibleDonors(recipientType) {
  if (!recipientType) return []
  const norm = recipientType.toUpperCase().trim()
  return COMPATIBLE_DONORS[norm] || [norm]
}

/**
 * Checks if a specific donor can donate to a specific recipient.
 */
export function isCompatible(donorType, recipientType) {
  if (!donorType || !recipientType) return false
  const donors = getCompatibleDonors(recipientType)
  return donors.includes(donorType.toUpperCase().trim())
}

/**
 * Clinical simulation: Detailed cross-match analysis between donor and recipient.
 */
export function checkCrossMatch(donorType, recipientType) {
  if (!donorType || !recipientType) {
    return {
      compatible: false,
      status: 'unknown',
      headline: 'Select Blood Groups',
      details: 'Please select both donor and recipient blood types to verify transfusion safety.',
      badgeColor: 'gray',
      icon: '❓',
    }
  }

  const d = donorType.toUpperCase().trim()
  const r = recipientType.toUpperCase().trim()
  const compatible = isCompatible(d, r)

  if (compatible) {
    if (d === 'O-') {
      return {
        compatible: true,
        status: 'universal',
        headline: 'Safe Transfusion (Universal Donor)',
        details: `Donor O- red blood cells lack A, B, and Rh antigens, eliminating antibody agglutination risks for ${r} recipient.`,
        badgeColor: 'emerald',
        icon: '🌟',
      }
    }
    if (r === 'AB+') {
      return {
        compatible: true,
        status: 'universal-recipient',
        headline: 'Safe Transfusion (Universal Recipient)',
        details: `Recipient AB+ plasma lacks Anti-A and Anti-B antibodies, safely tolerating ${d} donor red blood cells.`,
        badgeColor: 'emerald',
        icon: '✅',
      }
    }
    if (d === r) {
      return {
        compatible: true,
        status: 'exact',
        headline: 'Safe Transfusion (Identical Blood Match)',
        details: `Donor and recipient are both ${d}. Complete immunological match for ABO and Rh factor.`,
        badgeColor: 'emerald',
        icon: '✅',
      }
    }
    return {
      compatible: true,
      status: 'compatible',
      headline: 'Safe Transfusion (Cross-Group Compatible)',
      details: `Donor ${d} red blood cells do not express antigens that trigger antibodies in ${r} plasma.`,
      badgeColor: 'emerald',
      icon: '✅',
    }
  }

  // Incompatible
  let conflictReason = `Recipient ${r} has antibodies against donor ${d} antigens.`
  if ((d.startsWith('A') || d.startsWith('AB')) && (r.startsWith('B') || r.startsWith('O'))) {
    conflictReason = `Recipient ${r} plasma contains Anti-A antibodies, causing acute intravascular hemolysis of ${d} donor cells.`
  } else if ((d.startsWith('B') || d.startsWith('AB')) && (r.startsWith('A') || r.startsWith('O'))) {
    conflictReason = `Recipient ${r} plasma contains Anti-B antibodies, causing acute intravascular hemolysis of ${d} donor cells.`
  } else if (d.endsWith('+') && r.endsWith('-')) {
    conflictReason = `Rh incompatibility: Rh-positive donor ${d} into Rh-negative recipient ${r} triggers anti-D antibody sensitization and hemolytic reaction.`
  }

  return {
    compatible: false,
    status: 'incompatible',
    headline: 'Incompatible — High Risk of Hemolysis',
    details: `${conflictReason} Red blood cell transfusion must NOT proceed without specialized medical protocols.`,
    badgeColor: 'red',
    icon: '⛔',
  }
}
