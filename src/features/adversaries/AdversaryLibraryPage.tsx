import { useState, type FormEvent } from 'react'
import { useCampaign } from '../../context/CampaignContext'
import { useAdversaryLibrary, useSaveAdversary, useDeleteAdversary, type AdversaryLibraryEntry } from './useAdversaryLibrary'
import { StatBlockDisplay, StatBlockFieldsEditor } from './StatBlockEditor'
import { TierAdversaryPicker } from './TierAdversaryPicker'
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
  prefillFrom,
  isHomebrew,
  onDone,
}: {
  campaignId: string
  existing: AdversaryLibraryEntry | null
  /** Creating a new entry seeded from this one's fields (not editing it in place). */
  prefillFrom?: AdversaryLibraryEntry | null
  /** Only relevant when creating (existing is null). */
  isHomebrew?: boolean
  onDone: () => void
}) {
  const saveAdversary = useSaveAdversary()
  const source = existing ?? prefillFrom ?? null
  const [name, setName] = useState(source?.name ?? '')
  const [maxHp, setMaxHp] = useState(source?.max_hp != null ? String(source.max_hp) : '')
  const [maxStress, setMaxStress] = useState(source?.max_stress != null ? String(source.max_stress) : '')
  const [block, setBlock] = useState<CombatantStatBlock>(source?.stat_block ?? {})

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
      isHomebrew,
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

function TierGroupedList({ adversaries, campaignId }: { adversaries: AdversaryLibraryEntry[]; campaignId: string }) {
  return (
    <>
      {groupByTier(adversaries).map(([tier, group]) => (
        <div key={tier} className="subsection">
          <h2>{tier === UNTIERED ? 'No Tier Set' : `Tier ${tier}`}</h2>
          {group.map((a) => (
            <AdversaryCard key={a.id} adversary={a} campaignId={campaignId} />
          ))}
        </div>
      ))}
    </>
  )
}

function NewHomebrewFlow({
  campaignId,
  library,
  onDone,
}: {
  campaignId: string
  library: AdversaryLibraryEntry[]
  onDone: () => void
}) {
  const [mode, setMode] = useState<'choose' | 'scratch' | 'clone-pick' | 'clone-form'>('choose')
  const [sourceId, setSourceId] = useState('')
  const source = library.find((a) => a.id === sourceId) ?? null

  if (mode === 'choose') {
    return (
      <div className="encounter-card">
        <p className="subsection-hint" style={{ margin: '0 0 1rem' }}>
          Start from scratch, or base this on an existing adversary?
        </p>
        <div className="add-combatant-form-row">
          <button type="button" className="btn btn-primary" onClick={() => setMode('scratch')}>
            From Scratch
          </button>
          <button type="button" className="btn" onClick={() => setMode('clone-pick')}>
            Base on Existing Adversary
          </button>
          <button type="button" onClick={onDone}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'clone-pick') {
    return (
      <div className="encounter-card">
        <div className="add-combatant-form-row">
          <TierAdversaryPicker library={library} value={sourceId} onChange={setSourceId} />
          <button type="button" className="btn btn-primary" disabled={!sourceId} onClick={() => setMode('clone-form')}>
            Use as Base
          </button>
          <button type="button" onClick={onDone}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="encounter-card">
      <AdversaryForm
        campaignId={campaignId}
        existing={null}
        prefillFrom={mode === 'clone-form' ? source : null}
        isHomebrew
        onDone={onDone}
      />
    </div>
  )
}

export function AdversaryLibraryPage() {
  const { campaign, isLoading: campaignLoading } = useCampaign()
  const { data: adversaries, isLoading } = useAdversaryLibrary(campaign?.id)
  const [tab, setTab] = useState<'library' | 'homebrew'>('library')
  const [adding, setAdding] = useState(false)

  if (campaignLoading || isLoading) return <div className="page-loading">Loading…</div>
  if (!campaign) return null

  const library = (adversaries ?? []).filter((a) => !a.is_homebrew)
  const homebrew = (adversaries ?? []).filter((a) => a.is_homebrew)
  const currentList = tab === 'library' ? library : homebrew

  const switchTab = (next: typeof tab) => {
    setTab(next)
    setAdding(false)
  }

  return (
    <div className="entity-list-page">
      <div className="entity-list-header">
        <h1>
          Adversaries <span className="entity-list-count">· {currentList.length}</span>
        </h1>
        {!adding && (
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            {tab === 'library' ? '+ New Adversary' : '+ New Homebrew Adversary'}
          </button>
        )}
      </div>

      <div className="tabbar">
        <button type="button" className={tab === 'library' ? 'tab active' : 'tab'} onClick={() => switchTab('library')}>
          Library <span className="caps">· {library.length}</span>
        </button>
        <button type="button" className={tab === 'homebrew' ? 'tab active' : 'tab'} onClick={() => switchTab('homebrew')}>
          Homebrew <span className="caps">· {homebrew.length}</span>
        </button>
      </div>

      <p className="subsection-hint">
        {tab === 'library'
          ? 'Reusable adversary stat blocks — build one here, then pull it straight into any encounter (as many copies as you need) instead of retyping it every session.'
          : "Your own custom adversaries, kept separate from the core library but selectable in encounters the same way — build one from scratch or base it on an existing adversary."}
      </p>

      {adding && tab === 'library' && (
        <div className="encounter-card">
          <AdversaryForm campaignId={campaign.id} existing={null} onDone={() => setAdding(false)} />
        </div>
      )}
      {adding && tab === 'homebrew' && (
        <NewHomebrewFlow campaignId={campaign.id} library={adversaries ?? []} onDone={() => setAdding(false)} />
      )}

      {!currentList.length && !adding && (
        <p className="empty-state">{tab === 'library' ? 'No adversaries in the library yet.' : 'No homebrew adversaries yet.'}</p>
      )}

      <TierGroupedList adversaries={currentList} campaignId={campaign.id} />
    </div>
  )
}
