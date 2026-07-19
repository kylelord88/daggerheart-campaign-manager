import { useState, type FormEvent } from 'react'
import { useCampaign } from '../../context/CampaignContext'
import {
  useEnvironmentLibrary,
  useSaveEnvironment,
  useDeleteEnvironment,
  ENV_TYPES,
  type EnvironmentLibraryEntry,
} from './useEnvironmentLibrary'
import {
  EnvironmentStatBlockDisplay,
  EnvironmentFieldsEditor,
  toEditableFeatures,
  stripFeatureKeys,
  type EditableFeature,
} from './EnvironmentStatBlock'
import { TierEnvironmentPicker } from './TierEnvironmentPicker'

function groupByTier(envs: EnvironmentLibraryEntry[]): Array<[number, EnvironmentLibraryEntry[]]> {
  const groups = new Map<number, EnvironmentLibraryEntry[]>()
  for (const e of [...envs].sort((x, y) => x.name.localeCompare(y.name))) {
    if (!groups.has(e.tier)) groups.set(e.tier, [])
    groups.get(e.tier)!.push(e)
  }
  return Array.from(groups.entries()).sort((a, b) => a[0] - b[0])
}

// Splits a textarea into a trimmed, non-empty list (one entry per line).
function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function EnvironmentForm({
  campaignId,
  existing,
  prefillFrom,
  isHomebrew,
  onDone,
}: {
  campaignId: string
  existing: EnvironmentLibraryEntry | null
  /** Creating a new entry seeded from this one's fields (not editing in place). */
  prefillFrom?: EnvironmentLibraryEntry | null
  isHomebrew?: boolean
  onDone: () => void
}) {
  const saveEnvironment = useSaveEnvironment()
  const source = existing ?? prefillFrom ?? null
  const [name, setName] = useState(source?.name ?? '')
  const [tier, setTier] = useState(source?.tier != null ? String(source.tier) : '1')
  const [envType, setEnvType] = useState(source?.env_type ?? ENV_TYPES[0])
  const [difficulty, setDifficulty] = useState(source?.difficulty != null ? String(source.difficulty) : '')
  const [difficultyNote, setDifficultyNote] = useState(source?.difficulty_note ?? '')
  const [description, setDescription] = useState(source?.stat_block?.description ?? '')
  const [impulsesText, setImpulsesText] = useState((source?.stat_block?.impulses ?? []).join('\n'))
  const [adversariesText, setAdversariesText] = useState((source?.stat_block?.potential_adversaries ?? []).join('\n'))
  const [features, setFeatures] = useState<EditableFeature[]>(toEditableFeatures(source?.stat_block?.features ?? []))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await saveEnvironment.mutateAsync({
      id: existing?.id ?? null,
      campaignId,
      name: name.trim(),
      tier: Number(tier) || 1,
      envType,
      difficulty: difficulty === '' ? null : Number(difficulty),
      difficultyNote: difficultyNote.trim() || null,
      statBlock: {
        description: description.trim(),
        impulses: linesToList(impulsesText),
        potential_adversaries: linesToList(adversariesText),
        features: stripFeatureKeys(features),
      },
      isHomebrew,
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="stat-block-form">
      <div className="add-combatant-form-row">
        <input type="text" autoFocus placeholder="Name (e.g. Cliffside Ascent)" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="inline-number-label">
          Tier <input type="number" min={1} max={4} style={{ width: '3.5rem' }} value={tier} onChange={(e) => setTier(e.target.value)} />
        </label>
        <label className="inline-number-label">
          Type
          <select value={envType} onChange={(e) => setEnvType(e.target.value)}>
            {ENV_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="add-combatant-form-row">
        <label className="inline-number-label">
          Difficulty <input type="number" style={{ width: '4rem' }} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
        </label>
        <label className="inline-number-label" style={{ flex: 1 }}>
          Difficulty note
          <input
            type="text"
            placeholder='Leave blank if numeric; e.g. "Special (see Relative Strength)"'
            value={difficultyNote}
            onChange={(e) => setDifficultyNote(e.target.value)}
          />
        </label>
      </div>

      <EnvironmentFieldsEditor
        block={{ description, impulsesText, adversariesText }}
        features={features}
        onChangeBlock={(patch) => {
          if (patch.description !== undefined) setDescription(patch.description)
          if (patch.impulsesText !== undefined) setImpulsesText(patch.impulsesText)
          if (patch.adversariesText !== undefined) setAdversariesText(patch.adversariesText)
        }}
        onChangeFeatures={setFeatures}
      />

      <div className="add-combatant-form-row">
        <button type="submit" className="btn btn-primary" disabled={saveEnvironment.isPending}>
          {saveEnvironment.isPending ? 'Saving…' : 'Save Environment'}
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function EnvironmentCard({ env, campaignId }: { env: EnvironmentLibraryEntry; campaignId: string }) {
  const deleteEnvironment = useDeleteEnvironment()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="encounter-card">
        <EnvironmentForm campaignId={campaignId} existing={env} onDone={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <div className="encounter-card">
      <div className="env-card-actions">
        <button
          type="button"
          className="remove-combatant"
          title="Delete"
          onClick={() => {
            if (window.confirm(`Delete "${env.name}"?`)) deleteEnvironment.mutate({ id: env.id, campaignId })
          }}
        >
          &times;
        </button>
      </div>
      <EnvironmentStatBlockDisplay env={env} onEdit={() => setEditing(true)} />
    </div>
  )
}

function TierGroupedList({ envs, campaignId }: { envs: EnvironmentLibraryEntry[]; campaignId: string }) {
  return (
    <>
      {groupByTier(envs).map(([tier, group]) => (
        <div key={tier} className="subsection">
          <h2>Tier {tier}</h2>
          {group.map((e) => (
            <EnvironmentCard key={e.id} env={e} campaignId={campaignId} />
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
  library: EnvironmentLibraryEntry[]
  onDone: () => void
}) {
  const [mode, setMode] = useState<'choose' | 'scratch' | 'clone-pick' | 'clone-form'>('choose')
  const [sourceId, setSourceId] = useState('')
  const source = library.find((e) => e.id === sourceId) ?? null

  if (mode === 'choose') {
    return (
      <div className="encounter-card">
        <p className="subsection-hint" style={{ margin: '0 0 1rem' }}>
          Start from scratch, or base this on an existing environment?
        </p>
        <div className="add-combatant-form-row">
          <button type="button" className="btn btn-primary" onClick={() => setMode('scratch')}>
            From Scratch
          </button>
          <button type="button" className="btn" onClick={() => setMode('clone-pick')}>
            Base on Existing Environment
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
          <TierEnvironmentPicker library={library} value={sourceId} onChange={setSourceId} />
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
      <EnvironmentForm
        campaignId={campaignId}
        existing={null}
        prefillFrom={mode === 'clone-form' ? source : null}
        isHomebrew
        onDone={onDone}
      />
    </div>
  )
}

export function EnvironmentLibraryPage() {
  const { campaign, isLoading: campaignLoading } = useCampaign()
  const { data: environments, isLoading } = useEnvironmentLibrary(campaign?.id)
  const [tab, setTab] = useState<'library' | 'homebrew'>('library')
  const [adding, setAdding] = useState(false)

  if (campaignLoading || isLoading) return <div className="page-loading">Loading…</div>
  if (!campaign) return null

  const library = (environments ?? []).filter((e) => !e.is_homebrew)
  const homebrew = (environments ?? []).filter((e) => e.is_homebrew)
  const currentList = tab === 'library' ? library : homebrew

  const switchTab = (next: typeof tab) => {
    setTab(next)
    setAdding(false)
  }

  return (
    <div className="entity-list-page">
      <div className="entity-list-header">
        <h1>
          Environments <span className="entity-list-count">· {currentList.length}</span>
        </h1>
        {!adding && (
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            {tab === 'library' ? '+ New Environment' : '+ New Homebrew Environment'}
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
          ? 'Reusable environment stat blocks — the scene, not the monster. Build the location/situation once here (impulses, features, potential adversaries), then attach it to any session instead of retyping it.'
          : 'Your own custom environments, kept separate from the core library but usable the same way — build one from scratch or base it on an existing environment.'}
      </p>

      {adding && tab === 'library' && (
        <div className="encounter-card">
          <EnvironmentForm campaignId={campaign.id} existing={null} onDone={() => setAdding(false)} />
        </div>
      )}
      {adding && tab === 'homebrew' && (
        <NewHomebrewFlow campaignId={campaign.id} library={environments ?? []} onDone={() => setAdding(false)} />
      )}

      {!currentList.length && !adding && (
        <p className="empty-state">{tab === 'library' ? 'No environments in the library yet.' : 'No homebrew environments yet.'}</p>
      )}

      <TierGroupedList envs={currentList} campaignId={campaign.id} />
    </div>
  )
}
