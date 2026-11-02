import React, { useState } from 'react'
import {
  BLOOD_GROUPS,
  COMPATIBLE_DONORS,
  COMPATIBLE_RECIPIENTS,
  BLOOD_RARITY,
  BLOOD_ANTIGENS,
  BLOOD_ANTIBODIES,
  checkCrossMatch,
} from '../utils/bloodCompatibility'

/**
 * Interactive Blood Compatibility Calculator & Live Matchmaker
 * Features:
 *  1. Recipient Perspective ("I need blood") -> highlights safe vs unsafe donor groups
 *  2. Donor Perspective ("I want to donate") -> highlights safe recipient groups
 *  3. 1-on-1 Transfusion Safety Cross-Match Simulator
 *  4. Direct 1-click filter button to find matching donors in the system
 */
export default function BloodCompatibilityMatrix({ onSelectBloodType, selectedBloodType = 'O+', onApplyFilter }) {
  const [activeTab, setActiveTab] = useState('explorer') // 'explorer' | 'crossmatch'
  const [perspective, setPerspective] = useState('recipient') // 'recipient' | 'donor'
  const [currentGroup, setCurrentGroup] = useState(selectedBloodType !== 'All' ? selectedBloodType : 'O+')
  
  // Cross-match simulator state
  const [simDonor, setSimDonor] = useState('O-')
  const [simRecipient, setSimRecipient] = useState('A+')

  // Calculate compatibility for explorer
  const compatibleList = perspective === 'recipient'
    ? (COMPATIBLE_DONORS[currentGroup] || [])
    : (COMPATIBLE_RECIPIENTS[currentGroup] || [])

  const incompatibleList = BLOOD_GROUPS.filter(g => !compatibleList.includes(g))

  const rarity = BLOOD_RARITY[currentGroup] || { percent: 'N/A', label: 'Standard', universal: false }
  const antigens = BLOOD_ANTIGENS[currentGroup] || { antigens: 'Standard', abDescription: '' }
  const antibodies = BLOOD_ANTIBODIES[currentGroup] || { antibodies: 'Standard', note: '' }

  // Cross-match result
  const crossMatchResult = checkCrossMatch(simDonor, simRecipient)

  const handleGroupChange = (group) => {
    setCurrentGroup(group)
    if (onSelectBloodType) onSelectBloodType(group)
  }

  return (
    <div className="card overflow-hidden border border-crimson-100 dark:border-crimson-900/40 shadow-xl bg-white dark:bg-neutral-800 transition-all">
      {/* Top Header & Mode Tabs */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-crimson-600 via-rose-600 to-crimson-700 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl shadow-inner">
              🧬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-xl text-white">Biological Blood Matchmaker</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white uppercase tracking-wider">
                  Medically Verified
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Calculate red blood cell compatibility, antigen safety, and matching donors
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-black/20 backdrop-blur p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('explorer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'explorer'
                  ? 'bg-white text-crimson-700 shadow-sm'
                  : 'text-rose-100 hover:text-white'
              }`}
            >
              Interactive Explorer
            </button>
            <button
              onClick={() => setActiveTab('crossmatch')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'crossmatch'
                  ? 'bg-white text-crimson-700 shadow-sm'
                  : 'text-rose-100 hover:text-white'
              }`}
            >
              1-on-1 Cross Match
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Interactive Explorer */}
      {activeTab === 'explorer' && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Perspective Toggle & Blood Group Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-700/60">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-2">
                Select Perspective
              </label>
              <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-700/50">
                <button
                  onClick={() => setPerspective('recipient')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    perspective === 'recipient'
                      ? 'bg-white dark:bg-neutral-800 text-crimson-600 dark:text-crimson-400 shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>🏥</span> Patient Needs Blood (Recipient)
                </button>
                <button
                  onClick={() => setPerspective('donor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    perspective === 'donor'
                      ? 'bg-white dark:bg-neutral-800 text-crimson-600 dark:text-crimson-400 shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>🩸</span> I Want to Donate (Donor)
                </button>
              </div>
            </div>

            {/* Quick stats badge */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-2 rounded-xl bg-crimson-50 dark:bg-crimson-900/20 border border-crimson-200/50 dark:border-crimson-800/40 text-right">
                <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">Rarity & Prevalence</p>
                <p className="text-sm font-bold text-crimson-600 dark:text-crimson-400">
                  {rarity.percent} ({rarity.label})
                </p>
              </div>
            </div>
          </div>

          {/* Blood Type Pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {perspective === 'recipient' ? 'Select Patient Blood Group:' : 'Select Your Donor Blood Group:'}
              </span>
              <span className="text-xs font-medium text-crimson-500">
                Active: <strong>{currentGroup}</strong>
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {BLOOD_GROUPS.map((grp) => {
                const isSelected = grp === currentGroup
                return (
                  <button
                    key={grp}
                    onClick={() => handleGroupChange(grp)}
                    className={`py-2.5 px-2 rounded-xl text-center font-display font-bold text-base transition-all transform active:scale-95 ${
                      isSelected
                        ? 'bg-crimson-500 text-white shadow-crimson scale-105 ring-2 ring-crimson-400 ring-offset-2 dark:ring-offset-neutral-800'
                        : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {grp}
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">
                      {BLOOD_RARITY[grp]?.percent}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results Grid: Compatible vs Incompatible */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Safe / Compatible Box */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">✅</span>
                  <h4 className="font-semibold text-sm text-emerald-900 dark:text-emerald-200">
                    {perspective === 'recipient'
                      ? `Can Safely Receive From (${compatibleList.length} Types)`
                      : `Can Safely Donate To (${compatibleList.length} Types)`}
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Safe Transfusion
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {compatibleList.map((grp) => (
                  <div
                    key={grp}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-emerald-300 dark:border-emerald-700 shadow-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-display font-bold text-sm text-emerald-700 dark:text-emerald-300">
                      {grp}
                    </span>
                    {grp === 'O-' && (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded font-medium">
                        Universal
                      </span>
                    )}
                    {grp === currentGroup && (
                      <span className="text-[10px] bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1 py-0.2 rounded font-medium">
                        Identical
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-emerald-800 dark:text-emerald-300/80 leading-relaxed">
                {perspective === 'recipient'
                  ? `These donor red blood cells lack ABO/Rh antigens that would trigger recipient antibodies.`
                  : `Your blood does not contain target antigens that would trigger immunological hemolysis in these recipients.`}
              </p>
            </div>

            {/* Incompatible / High Risk Box */}
            <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-rose-600 dark:text-rose-400 text-lg">⛔</span>
                  <h4 className="font-semibold text-sm text-rose-900 dark:text-rose-200">
                    {perspective === 'recipient'
                      ? `Incompatible Blood Groups (${incompatibleList.length} Types)`
                      : `Cannot Donate To (${incompatibleList.length} Types)`}
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  Hazardous
                </span>
              </div>

              {incompatibleList.length === 0 ? (
                <div className="py-4 text-center">
                  <span className="text-2xl">🌟</span>
                  <p className="font-bold text-sm text-rose-800 dark:text-rose-300 mt-1">Universal Compatibility!</p>
                  <p className="text-xs text-rose-700 dark:text-rose-400/80 mt-0.5">
                    {perspective === 'recipient'
                      ? 'AB+ is the Universal Recipient and can receive any RBC type.'
                      : 'O- is the Universal Donor and can donate to all blood types.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {incompatibleList.map((grp) => (
                      <div
                        key={grp}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-rose-200 dark:border-rose-800 shadow-sm opacity-80"
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        <span className="font-display font-bold text-sm text-rose-600 dark:text-rose-400 line-through">
                          {grp}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300/80 leading-relaxed">
                    {perspective === 'recipient'
                      ? `Transfusion will cause acute hemolytic reaction due to plasma antibody agglutination.`
                      : `Recipient antibodies will immediately destroy your transfused red blood cells.`}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Biological Antigen & Antibody Panel */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-750 border border-neutral-200 dark:border-neutral-700/70">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3 flex items-center gap-1.5">
              <span>🔬</span> Biological Profile for Blood Group {currentGroup}
            </h4>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
                <span className="text-[11px] font-semibold text-neutral-400 block">Antigens on RBCs</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-white mt-0.5 block">
                  {antigens.antigens}
                </span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  {antigens.abDescription}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
                <span className="text-[11px] font-semibold text-neutral-400 block">Plasma Antibodies</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-white mt-0.5 block">
                  {antibodies.antibodies}
                </span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  {antibodies.note}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-neutral-400 block">Universal Status</span>
                  <span className="text-sm font-bold text-crimson-600 dark:text-crimson-400 mt-0.5 block">
                    {currentGroup === 'O-'
                      ? 'Universal Red Cell Donor'
                      : currentGroup === 'AB+'
                      ? 'Universal Recipient'
                      : currentGroup === 'AB-'
                      ? 'Universal Plasma Donor'
                      : 'Standard Matched Group'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-neutral-500">
                  <span>Frequency:</span>
                  <strong className="text-neutral-700 dark:text-neutral-300">{rarity.percent}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button: Trigger Live Search Filter */}
          {onApplyFilter && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Filter donor list to all medically compatible groups for <strong>{currentGroup}</strong> ({compatibleList.join(', ')}).
              </p>
              <button
                onClick={() => onApplyFilter(currentGroup, compatibleList)}
                className="btn-primary py-2.5 px-5 text-sm font-semibold flex items-center gap-2 whitespace-nowrap shadow-crimson w-full sm:w-auto justify-center"
              >
                <span>🔍</span> Find Compatible Donors ({compatibleList.length} Types)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: 1-on-1 Transfusion Safety Simulator (Cross-Match) */}
      {activeTab === 'crossmatch' && (
        <div className="p-5 sm:p-6 space-y-6">
          <div className="text-center max-w-lg mx-auto mb-2">
            <h4 className="font-display font-bold text-lg text-neutral-900 dark:text-white">
              Direct Transfusion Cross-Match Simulator
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Select any donor and patient group to verify immunological compatibility before initiating blood transfer.
            </p>
          </div>

          {/* Selectors Grid */}
          <div className="grid md:grid-cols-3 items-center gap-4">
            {/* Donor Blood Selector */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-750 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Donor Blood
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-crimson-100 dark:bg-crimson-900/40 text-crimson-600 dark:text-crimson-400">
                  Donating
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {BLOOD_GROUPS.map((g) => (
                  <button
                    key={`d-${g}`}
                    onClick={() => setSimDonor(g)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      simDonor === g
                        ? 'bg-crimson-500 text-white shadow-sm'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Middle Transfer Direction Indicator */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md transition-all ${
                crossMatchResult.compatible
                  ? 'bg-emerald-500 text-white shadow-emerald-500/30 animate-pulse'
                  : 'bg-rose-500 text-white shadow-rose-500/30'
              }`}>
                {crossMatchResult.compatible ? '➜' : '✕'}
              </div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mt-2">
                Transfusion Flow
              </span>
            </div>

            {/* Recipient Blood Selector */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-750 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Patient Blood
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  Receiving
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {BLOOD_GROUPS.map((g) => (
                  <button
                    key={`r-${g}`}
                    onClick={() => setSimRecipient(g)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      simRecipient === g
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Verdict Banner */}
          <div className={`p-5 rounded-2xl border transition-all ${
            crossMatchResult.compatible
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0 mt-0.5">{crossMatchResult.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-base">
                    {crossMatchResult.headline}
                  </h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                    crossMatchResult.compatible
                      ? 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-200/80 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                  }`}>
                    {crossMatchResult.compatible ? 'Approved' : 'Prohibited'}
                  </span>
                </div>
                <p className="text-xs mt-1.5 leading-relaxed opacity-90">
                  {crossMatchResult.details}
                </p>
                <div className="mt-3 pt-3 border-t border-current/10 flex flex-wrap gap-4 text-xs font-mono">
                  <span>Donor: <strong>{simDonor}</strong></span>
                  <span>Recipient: <strong>{simRecipient}</strong></span>
                  <span>Verdict: <strong>{crossMatchResult.compatible ? 'COMPATIBLE' : 'INCOMPATIBLE'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
