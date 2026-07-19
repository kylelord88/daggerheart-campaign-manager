import { useState } from 'react'
import type { EnvironmentLibraryEntry } from './useEnvironmentLibrary'

// Two-step Tier, then Name picker over the environment library — mirrors the
// TierAdversaryPicker. Shared by the "base a homebrew on an existing one" flow
// and the session "attach an environment" form.
export function TierEnvironmentPicker({
  library,
  value,
  onChange,
  emptyLabel = 'No environments in the library yet',
}: {
  library: EnvironmentLibraryEntry[]
  value: string
  onChange: (id: string) => void
  emptyLabel?: string
}) {
  const [tier, setTier] = useState('')

  const tiers = Array.from(new Set(library.map((e) => e.tier))).sort((a, b) => a - b)
  const options = library
    .filter((e) => String(e.tier) === tier)
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleTierChange = (next: string) => {
    setTier(next)
    onChange('')
  }

  if (!library.length) return <span className="empty-state">{emptyLabel}</span>

  return (
    <>
      <select value={tier} onChange={(e) => handleTierChange(e.target.value)}>
        <option value="">— tier —</option>
        {tiers.map((t) => (
          <option key={t} value={t}>
            Tier {t}
          </option>
        ))}
      </select>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={!tier}>
        <option value="">{tier ? '— choose an environment —' : '— pick a tier first —'}</option>
        {options.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
            {e.is_homebrew ? ' (Homebrew)' : ''}
          </option>
        ))}
      </select>
    </>
  )
}
