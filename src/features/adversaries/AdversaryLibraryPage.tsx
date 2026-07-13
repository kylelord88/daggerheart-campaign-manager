import { useState, type FormEvent } from 'react'
import { useCampaign } from '../../context/CampaignContext'
import { useAdversaryLibrary, useSaveAdversary, useDeleteAdversary, type AdversaryLibraryEntry } from './useAdversaryLibrary'
import { StatBlockDisplay, StatBlockFieldsEditor } from './StatBlockEditor'
import type { CombatantStatBlock } from '../sessions/useSessionExtras'

const UNTIERED = 'untiered'

function groupByTier(adversaries: AdversaryLibraryEntry[]): Array<[string | number, AdversaryLibraryEntry[]]> {
  const groups = new Map<string | number, AdversaryLibraryEntry[]>()
  for (const a of [...adversaries].sort((x, y) => x.name.localeCompare(y.name))) {
    const key = a.stat_block.tier ?? UNTIERED
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(a)
  }
  return Array.from(groups.entries()).sort((a, b) => {
    if (a[0] === UNTIERED) return 1
    if (b[0] === UNTIERED) return -1
    return Number(a[0]) - Number(b[0])
  })
}

function AdversaryForm({
  campaignId,
  existing,
  onDone,
}: {
  campaignId: string
  existing: AdversaryLibraryEntry | null
  onDone: () => void
}) {
  const saveAdversary = useSaveAdversary()
  const [name, setName] = useState(existing?.name ?? '')
  const [maxHp, setMaxHp] = useState(existing?.max_hp != null ? String(existing.max_hp) : '')
  const [maxStress, setMaxStress] = useState(existing?.max_stress != null ? String(existing.max_stress) : '')
  const [block, setBlock] = useState<CombatantStatBlock>(existing?.stat_block ?? {})

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await saveAdversary.mutateAsync({
      id: existing?.id ?? null,
      campaignId,
      name: name.trim(),
      maxHp: maxHp === '' ? null : Number(maxHp),
      maxStress: maxStress === '' ? null : Number(maxStress),
      statBlock: block,
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="stat-block-form">
      <div className="add-combatant-form-row">
        <input type="text" autoFocus placeholder="Name (e.g. Bog Assassin)" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="inline-number-label">
          Max HP <input type="number" min={0} value={maxHp} onChange={(e) => setMaxHp(e.target.value)} />
        </label>
        <label className="inline-number-label">
          Max Stress <input type="number" min={0} value={maxStress} onChange={(e) => setMaxStress(e.target.value)} />
        </label>
      </div>

      <StatBlockFieldsEditor block={block} onChange={setBlock} />

      <div className="add-combatant-form-row">
        <button type="submit" className="btn btn-primary" disabled={saveAdversary.isPending}>
          {saveAdversary.isPending ? 'Saving…' : 'Save Adversary'}
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function AdversaryCard({ adversary, campaignId }: { adversary: AdversaryLibraryEntry; campaignId: string }) {
  const deleteAdversary = useDeleteAdversary()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="encounter-card">
        <AdversaryForm campaignId={campaignId} existing={adversary} onDone={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <div className="encounter-card">
      <div className="encounter-card-head">
        <h3>{adversary.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <span className="caps">
            {adversary.max_hp ?? '—'} HP · {adversary.max_stress ?? '—'} Stress
          </span>
          <button
            type="button"
            className="remove-combatant"
            title="Delete"
            onClick={() => {
              if (window.confirm(`Delete "${adversary.name}"?`)) deleteAdversary.mutate({ id: adversary.id, campaignId })
            }}
          >
            &times;
          </button>
        </div>
      </div>
      <StatBlockDisplay block={adversary.stat_block ?? {}} onEdit={() => setEditing(true)} />
    </div>
  )
}

export function AdversaryLibraryPage() {
  const { campaign, isLoading: campaignLoading } = useCampaign()
  const { data: adversaries, isLoading } = useAdversaryLibrary(campaign?.id)
  const [adding, setAdding] = useState(false)

  if (campaignLoading || isLoading) return <div className="page-loading">Loading…</div>
  if (!campaign) return null

  return (
    <div className="entity-list-page">
      <div className="entity-list-header">
        <h1>
          Adversaries <span className="entity-list-count">· {adversaries?.length ?? 0}</span>
        </h1>
        {!adding && (
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            + New Adversary
          </button>
        )}
      </div>
      <p className="subsection-hint">
        Reusable adversary stat blocks — build one here, then pull it straight into any encounter (as many copies as
        you need) instead of retyping it every session.
      </p>

      {adding && (
        <div className="encounter-card">
          <AdversaryForm campaignId={campaign.id} existing={null} onDone={() => setAdding(false)} />
        </div>
      )}

      {!adversaries?.length && !adding && <p className="empty-state">No adversaries in the library yet.</p>}

      {groupByTier(adversaries ?? []).map(([tier, group]) => (
        <div key={tier} className="subsection">
          <h2>{tier === UNTIERED ? 'No Tier Set' : `Tier ${tier}`}</h2>
          {group.map((a) => (
            <AdversaryCard key={a.id} adversary={a} campaignId={campaign.id} />
          ))}
        </div>
      ))}
    </div>
  )
}
