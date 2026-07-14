import { useState } from 'react'
import type { AdversaryLibraryEntry } from './useAdversaryLibrary'

// Two-step Tier, then Name picker over the adversary library - shared by the
// encounter "Add combatant" form and the "base a homebrew adversary on an
// existing one" flow, so both pick the same way.
export function TierAdversaryPicker({
  library,
  value,
  onChange,
  emptyLabel = 'No adversaries in the library yet',
}: {
  library: AdversaryLibraryEntry[]
  value: string
  onChange: (id: string) => void
  emptyLabel?: string
}) {
  const [tier, setTier] = useState('')

  const tiers = Array.from(new Set(library.map((a) => a.stat_block.tier).filter((t): t is number => t != null))).sort(
    (a, b) => a - b,
  )
  const options = library
    .filter((a) => String(a.stat_block.tier ?? '') === tier)
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
        <option value="">{tier ? '— choose an adversary —' : '— pick a tier first —'}</option>
        {options.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.is_homebrew ? ' (Homebrew)' : ''}
          </option>
        ))}
      </select>
    </>
  )
}
