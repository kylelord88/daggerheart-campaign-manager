import { useState, type FormEvent } from 'react'
import { useReferenceOptions } from '../entities/useEntity'
import {
  useSessionEncounters,
  useCreateEncounter,
  useDeleteEncounter,
  useAddCombatant,
  useUpdateCombatantStat,
  useUpdateGroupStatBlock,
  useRemoveCombatant,
  useSessionRollTables,
  useCreateRollTable,
  useDeleteRollTable,
  useAddRollEntry,
  useRemoveRollEntry,
  useToggleRollEntryUsed,
  useResetRollTableUsed,
  getStatBlock,
  type EncounterWithCombatants,
  type RollTableWithEntries,
  type CombatantStatBlock,
} from './useSessionExtras'
import { useAdversaryLibrary } from '../adversaries/useAdversaryLibrary'
import { TierAdversaryPicker } from '../adversaries/TierAdversaryPicker'
import { StatBlockDisplay, StatBlockFieldsEditor } from '../adversaries/StatBlockEditor'
import type { EncounterCombatant } from '../../types/database'

// Boxes filled = HP/Stress marked (i.e. lost), matching Daggerheart's actual
// tabletop tracker sheets - current_hp/current_stress still store the
// remaining amount internally, so this is just marked = max - current.
function StatTrack({
  label,
  current,
  max,
  variant,
  onChange,
}: {
  label: string
  current: number
  max: number
  variant: 'hp' | 'stress'
  onChange: (next: number) => void
}) {
  const marked = Math.max(0, Math.min(max, max - current))
  return (
    <div className={`stat-track stat-track-${variant}`}>
      <span className="stat-track-label caps">
        {label} ({max})
      </span>
      <button type="button" className="step" onClick={() => onChange(Math.min(max, current + 1))} aria-label={`${label} unmark`}>
        &minus;
      </button>
      <div className="stat-track-boxes">
        {max > 0 ? (
          Array.from({ length: max }, (_, i) => <span key={i} className={`stat-box${i < marked ? ' filled' : ''}`} />)
        ) : (
          <span className="stat-track-empty">—</span>
        )}
      </div>
      <button type="button" className="step" onClick={() => onChange(Math.max(0, current - 1))} aria-label={`${label} mark`}>
        +
      </button>
    </div>
  )
}

// "Bog Assassin 1" / "Bog Assassin 2" -> "Bog Assassin" - groups auto-added
// via quantity (or a matching pair typed by hand) so they can share one
// stat block display instead of repeating it per copy.
function baseCombatantName(name: string): string {
  return name.replace(/\s+\d+$/, '')
}

// Groups combatants sharing a base name and side, in first-appearance order.
function groupCombatants(combatants: EncounterCombatant[]): EncounterCombatant[][] {
  const groups: EncounterCombatant[][] = []
  const indexByKey = new Map<string, number>()
  for (const c of combatants) {
    const key = `${baseCombatantName(c.display_name)}::${c.is_adversary}`
    const idx = indexByKey.get(key)
    if (idx === undefined) {
      indexByKey.set(key, groups.length)
      groups.push([c])
    } else {
      groups[idx].push(c)
    }
  }
  return groups
}

function StatBlockForm({
  ids,
  sessionId,
  initial,
  onDone,
}: {
  ids: string[]
  sessionId: string
  initial: CombatantStatBlock
  onDone: () => void
}) {
  const updateStatBlock = useUpdateGroupStatBlock()
  const [block, setBlock] = useState<CombatantStatBlock>(initial)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await updateStatBlock.mutateAsync({ ids, sessionId, statBlock: block })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="stat-block-form">
      <StatBlockFieldsEditor block={block} onChange={setBlock} />

      <div className="add-combatant-form-row">
        <button type="submit" className="btn btn-primary" disabled={updateStatBlock.isPending}>
          {updateStatBlock.isPending ? 'Saving…' : 'Save Stat Block'}
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function CombatantInstanceRow({ combatant, sessionId }: { combatant: EncounterCombatant; sessionId: string }) {
  const updateStat = useUpdateCombatantStat()
  const removeCombatant = useRemoveCombatant()

  return (
    <div className="combatant-instance">
      <div className="combatant-instance-head">
        <span className={`combatant-side ${combatant.is_adversary ? 'adversary' : 'ally'}`}>&#9670;</span>
        <span className="combatant-name">{combatant.display_name}</span>
        <button
          type="button"
          className="remove-combatant"
          title="Remove"
          onClick={() => removeCombatant.mutate({ id: combatant.id, sessionId })}
        >
          &times;
        </button>
      </div>
      <StatTrack
        label="HP"
        variant="hp"
        current={combatant.current_hp ?? 0}
        max={combatant.max_hp ?? 0}
        onChange={(next) => updateStat.mutate({ id: combatant.id, sessionId, field: 'current_hp', value: next })}
      />
      <StatTrack
        label="Stress"
        variant="stress"
        current={combatant.current_stress ?? 0}
        max={combatant.max_stress ?? 0}
        onChange={(next) => updateStat.mutate({ id: combatant.id, sessionId, field: 'current_stress', value: next })}
      />
    </div>
  )
}

// Quick-glance reference for which damage threshold marks how much HP -
// shown once per group (the thresholds live on the shared stat block, not
// per instance) right above the HP/Stress trackers they apply to.
function ThresholdBar({ major, severe }: { major?: number; severe?: number }) {
  if (major == null && severe == null) return null
  return (
    <div className="threshold-bar">
      <div className="threshold-chip">
        <span className="threshold-chip-label caps">Minor</span>
        <span className="threshold-chip-sub">Mark 1 HP</span>
      </div>
      <span className="threshold-arrow">&#8594;</span>
      <div className="threshold-chip">
        <span className="threshold-chip-label caps">Major {major ?? '—'}+</span>
        <span className="threshold-chip-sub">Mark 2 HP</span>
      </div>
      <span className="threshold-arrow">&#8594;</span>
      <div className="threshold-chip">
        <span className="threshold-chip-label caps">Severe {severe ?? '—'}+</span>
        <span className="threshold-chip-sub">Mark 3 HP</span>
      </div>
    </div>
  )
}

function CombatantGroup({ members, sessionId }: { members: EncounterCombatant[]; sessionId: string }) {
  const [editingStatBlock, setEditingStatBlock] = useState(false)
  const statBlock = getStatBlock(members[0])
  const ids = members.map((m) => m.id)

  return (
    <div className="combatant-block">
      {members.length > 1 && (
        <div className="combatant-group-head">
          {baseCombatantName(members[0].display_name)} <span className="sub">×{members.length}</span>
        </div>
      )}
      <ThresholdBar major={statBlock.majorThreshold} severe={statBlock.severeThreshold} />
      {members.map((c) => (
        <CombatantInstanceRow key={c.id} combatant={c} sessionId={sessionId} />
      ))}

      {editingStatBlock ? (
        <StatBlockForm ids={ids} sessionId={sessionId} initial={statBlock} onDone={() => setEditingStatBlock(false)} />
      ) : (
        <StatBlockDisplay block={statBlock} onEdit={() => setEditingStatBlock(true)} />
      )}
    </div>
  )
}

function AddCombatantForm({
  encounterId,
  sessionId,
  campaignId,
  sortOrder,
  onDone,
}: {
  encounterId: string
  sessionId: string
  campaignId: string
  sortOrder: number
  onDone: () => void
}) {
  const { data: characters } = useReferenceOptions({ table: 'characters', labelField: 'name' }, campaignId)
  const { data: library } = useAdversaryLibrary(campaignId)
  const addCombatant = useAddCombatant()
  const [source, setSource] = useState<'freeform' | 'character' | 'library'>('freeform')
  const [name, setName] = useState('')
  const [characterId, setCharacterId] = useState('')
  const [libraryId, setLibraryId] = useState('')
  const [isAdversary, setIsAdversary] = useState(true)
  const [maxHp, setMaxHp] = useState('6')
  const [maxStress, setMaxStress] = useState('0')
  const [quantity, setQuantity] = useState('1')

  const libraryEntry = library?.find((a) => a.id === libraryId)

  const handleSourceChange = (next: typeof source) => {
    setSource(next)
    if (next === 'library') setIsAdversary(true)
  }

  const handleLibraryChange = (id: string) => {
    setLibraryId(id)
    const entry = library?.find((a) => a.id === id)
    if (entry) {
      setMaxHp(entry.max_hp != null ? String(entry.max_hp) : '')
      setMaxStress(entry.max_stress != null ? String(entry.max_stress) : '')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const baseName =
      source === 'character'
        ? characters?.find((c) => c.id === characterId)?.label
        : source === 'library'
          ? libraryEntry?.name
          : name.trim()
    if (!baseName) return
    await addCombatant.mutateAsync({
      sessionId,
      encounterId,
      campaignId,
      baseName,
      quantity: source === 'character' ? 1 : Number(quantity) || 1,
      characterId: source === 'character' ? characterId || null : null,
      isAdversary,
      maxHp: maxHp === '' ? null : Number(maxHp),
      maxStress: maxStress === '' ? null : Number(maxStress),
      sortOrder,
      statBlock: source === 'library' ? libraryEntry?.stat_block : undefined,
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="add-combatant-form">
      <div className="add-combatant-form-row">
        <select value={source} onChange={(e) => handleSourceChange(e.target.value as typeof source)}>
          <option value="freeform">Freeform name</option>
          <option value="character">Existing character</option>
          <option value="library">From adversary library</option>
        </select>
        {source === 'freeform' && (
          <input type="text" autoFocus placeholder="e.g. Bog Assassin" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        {source === 'character' && (
          <select value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
            <option value="">— choose a character —</option>
            {characters?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}
        {source === 'library' && <TierAdversaryPicker library={library ?? []} value={libraryId} onChange={handleLibraryChange} />}
        {source !== 'library' && (
          <select value={isAdversary ? 'adversary' : 'ally'} onChange={(e) => setIsAdversary(e.target.value === 'adversary')}>
            <option value="adversary">Adversary</option>
            <option value="ally">Ally</option>
          </select>
        )}
      </div>
      <div className="add-combatant-form-row">
        <label className="inline-number-label">
          Max HP <input type="number" min={0} value={maxHp} onChange={(e) => setMaxHp(e.target.value)} />
        </label>
        <label className="inline-number-label">
          Max Stress <input type="number" min={0} value={maxStress} onChange={(e) => setMaxStress(e.target.value)} />
        </label>
        {source !== 'character' && (
          <label className="inline-number-label">
            Quantity <input type="number" min={1} max={20} style={{ width: '3.5rem' }} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
        )}
        <button type="submit" className="btn btn-primary" disabled={addCombatant.isPending}>
          Add
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function EncounterCard({ encounter, sessionId }: { encounter: EncounterWithCombatants; sessionId: string }) {
  const deleteEncounter = useDeleteEncounter()
  const [addingCombatant, setAddingCombatant] = useState(false)

  return (
    <div className="encounter-card">
      <div className="encounter-card-head">
        <h3>{encounter.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <span className="caps">
            {encounter.encounter_combatants.length} combatant{encounter.encounter_combatants.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="remove-combatant"
            title="Delete encounter"
            onClick={() => {
              if (window.confirm(`Delete "${encounter.name}"?`)) deleteEncounter.mutate({ id: encounter.id, sessionId })
            }}
          >
            &times;
          </button>
        </div>
      </div>

      {groupCombatants(encounter.encounter_combatants).map((group) => (
        <CombatantGroup key={group[0].id} members={group} sessionId={sessionId} />
      ))}

      <div className="encounter-card-foot">
        {addingCombatant ? (
          <AddCombatantForm
            encounterId={encounter.id}
            sessionId={sessionId}
            campaignId={encounter.campaign_id}
            sortOrder={encounter.encounter_combatants.length}
            onDone={() => setAddingCombatant(false)}
          />
        ) : (
          <button type="button" className="add-combatant-link" onClick={() => setAddingCombatant(true)}>
            + Add combatant
          </button>
        )}
      </div>
    </div>
  )
}

function EncountersSection({ sessionId, campaignId }: { sessionId: string; campaignId: string }) {
  const { data: encounters, isLoading } = useSessionEncounters(sessionId)
  const createEncounter = useCreateEncounter()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await createEncounter.mutateAsync({ sessionId, campaignId, name: name.trim() })
    setName('')
    setAdding(false)
  }

  return (
    <div className="subsection">
      <div className="subsection-head">
        <h2>Encounters</h2>
        {adding ? (
          <form onSubmit={handleCreate} className="inline-new-form">
            <input type="text" autoFocus placeholder="Encounter name" value={name} onChange={(e) => setName(e.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={createEncounter.isPending}>
              Create
            </button>
            <button type="button" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" className="subtle-add-btn" onClick={() => setAdding(true)}>
            + New Encounter
          </button>
        )}
      </div>
      <p className="subsection-hint">
        Live HP/Stress tracking for a fight tied to this session. Add adversaries (and party members, if you want them
        here too) and adjust as the table plays it out.
      </p>

      {isLoading && <p className="empty-state">Loading…</p>}
      {!isLoading && !encounters?.length && <p className="empty-state">No encounters yet.</p>}
      {encounters?.map((encounter) => (
        <EncounterCard key={encounter.id} encounter={encounter} sessionId={sessionId} />
      ))}
    </div>
  )
}

function AddRollEntryForm({
  rollTableId,
  sessionId,
  campaignId,
  sortOrder,
  onDone,
}: {
  rollTableId: string
  sessionId: string
  campaignId: string
  sortOrder: number
  onDone: () => void
}) {
  const addEntry = useAddRollEntry()
  const [rollLabel, setRollLabel] = useState('')
  const [resultText, setResultText] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!rollLabel.trim() || !resultText.trim()) return
    await addEntry.mutateAsync({ sessionId, rollTableId, campaignId, rollLabel: rollLabel.trim(), resultText: resultText.trim(), sortOrder })
    setRollLabel('')
    setResultText('')
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="add-combatant-form">
      <div className="add-combatant-form-row">
        <input type="text" autoFocus placeholder="Roll (e.g. 1, 2-3)" style={{ maxWidth: '8rem' }} value={rollLabel} onChange={(e) => setRollLabel(e.target.value)} />
        <input type="text" placeholder="Result" value={resultText} onChange={(e) => setResultText(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={addEntry.isPending}>
          Add
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function RollTableCard({ table, sessionId }: { table: RollTableWithEntries; sessionId: string }) {
  const deleteTable = useDeleteRollTable()
  const removeEntry = useRemoveRollEntry()
  const toggleUsed = useToggleRollEntryUsed()
  const resetUsed = useResetRollTableUsed()
  const [addingEntry, setAddingEntry] = useState(false)
  const [rolledId, setRolledId] = useState<string | null>(null)

  const entries = table.session_roll_table_entries
  const rolled = entries.find((e) => e.id === rolledId)
  const available = entries.filter((e) => !e.is_used)
  const allUsed = entries.length > 0 && available.length === 0

  const handleRoll = () => {
    if (!available.length) return
    const pick = available[Math.floor(Math.random() * available.length)]
    setRolledId(pick.id)
  }

  return (
    <div className="roll-table-card">
      <div className="roll-table-head">
        <h3>{table.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {table.dice_label && <span className="die">{table.dice_label}</span>}
          <button type="button" className="btn roll-btn" onClick={handleRoll} disabled={!available.length}>
            &#127922; Roll
          </button>
          <button
            type="button"
            className="btn"
            title="Clear used marks on every entry"
            onClick={() => resetUsed.mutate({ rollTableId: table.id, sessionId })}
          >
            Reset
          </button>
          <button
            type="button"
            className="remove-combatant"
            title="Delete table"
            onClick={() => {
              if (window.confirm(`Delete "${table.name}"?`)) deleteTable.mutate({ id: table.id, sessionId })
            }}
          >
            &times;
          </button>
        </div>
      </div>

      {allUsed && <p className="empty-state">All entries used — reset to roll again.</p>}

      {entries.map((entry) => (
        <div key={entry.id} className={`roll-entry ${entry.id === rolledId ? 'hit' : ''} ${entry.is_used ? 'used' : ''}`}>
          <span className="num">{entry.roll_label}</span>
          <span>{entry.result_text}</span>
          <label className="roll-entry-used-toggle" title="Mark used">
            <input
              type="checkbox"
              checked={entry.is_used}
              onChange={(e) => toggleUsed.mutate({ id: entry.id, isUsed: e.target.checked, sessionId })}
            />
          </label>
          <button type="button" className="remove-combatant" title="Remove" onClick={() => removeEntry.mutate({ id: entry.id, sessionId })}>
            &times;
          </button>
        </div>
      ))}

      {rolled && (
        <div className="roll-result-callout show">
          <b>Rolled {rolled.roll_label}:</b> {rolled.result_text}
          {!rolled.is_used && (
            <button
              type="button"
              className="add-combatant-link"
              style={{ marginLeft: '0.8rem' }}
              onClick={() => toggleUsed.mutate({ id: rolled.id, isUsed: true, sessionId })}
            >
              Mark used
            </button>
          )}
        </div>
      )}

      <div className="encounter-card-foot">
        {addingEntry ? (
          <AddRollEntryForm
            rollTableId={table.id}
            sessionId={sessionId}
            campaignId={table.campaign_id}
            sortOrder={entries.length}
            onDone={() => setAddingEntry(false)}
          />
        ) : (
          <button type="button" className="add-combatant-link" onClick={() => setAddingEntry(true)}>
            + Add entry
          </button>
        )}
      </div>
    </div>
  )
}

function RollTablesSection({ sessionId, campaignId }: { sessionId: string; campaignId: string }) {
  const { data: tables, isLoading } = useSessionRollTables(sessionId)
  const createTable = useCreateRollTable()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [diceLabel, setDiceLabel] = useState('d6')

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await createTable.mutateAsync({ sessionId, campaignId, name: name.trim(), diceLabel: diceLabel.trim() })
    setName('')
    setDiceLabel('d6')
    setAdding(false)
  }

  return (
    <div className="subsection">
      <div className="subsection-head">
        <h2>Roll Tables</h2>
        {adding ? (
          <form onSubmit={handleCreate} className="inline-new-form">
            <input type="text" autoFocus placeholder="Table name" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="text" placeholder="d6" style={{ maxWidth: '4rem' }} value={diceLabel} onChange={(e) => setDiceLabel(e.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={createTable.isPending}>
              Create
            </button>
            <button type="button" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" className="subtle-add-btn" onClick={() => setAdding(true)}>
            + New Table
          </button>
        )}
      </div>
      <p className="subsection-hint">
        Quick reference tables for this session — hazards, complications, whatever you'd otherwise be flipping to a
        notebook page for. Roll for real, or press Roll for a pick.
      </p>

      {isLoading && <p className="empty-state">Loading…</p>}
      {!isLoading && !tables?.length && <p className="empty-state">No roll tables yet.</p>}
      {tables?.map((table) => (
        <RollTableCard key={table.id} table={table} sessionId={sessionId} />
      ))}
    </div>
  )
}

// Thin adapters matching the generic {entityId, campaignId} extraTabs
// signature - each is now its own top-level tab (see SESSION_CONFIG),
// not nested inside GM Notes.
export function EncountersTab({ entityId, campaignId }: { entityId: string; campaignId: string }) {
  return <EncountersSection sessionId={entityId} campaignId={campaignId} />
}

export function RollTablesTab({ entityId, campaignId }: { entityId: string; campaignId: string }) {
  return <RollTablesSection sessionId={entityId} campaignId={campaignId} />
}
