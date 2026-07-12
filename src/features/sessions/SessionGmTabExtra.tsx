import { useState, type FormEvent } from 'react'
import { useReferenceOptions } from '../entities/useEntity'
import {
  useSessionEncounters,
  useCreateEncounter,
  useDeleteEncounter,
  useAddCombatant,
  useUpdateCombatantStat,
  useRemoveCombatant,
  useSessionRollTables,
  useCreateRollTable,
  useDeleteRollTable,
  useAddRollEntry,
  useRemoveRollEntry,
  type EncounterWithCombatants,
  type RollTableWithEntries,
} from './useSessionExtras'
import type { EncounterCombatant } from '../../types/database'

function statClass(current: number, max: number) {
  if (max === 0) return 'ok'
  if (current <= 0) return 'crit'
  if (current / max <= 0.5) return 'warn'
  return 'ok'
}

function StatTrack({
  label,
  current,
  max,
  onChange,
}: {
  label: string
  current: number
  max: number
  onChange: (next: number) => void
}) {
  const cls = statClass(current, max)
  return (
    <div className="stat-track">
      <div className="stepper">
        <button type="button" className="step" onClick={() => onChange(Math.max(0, current - 1))} aria-label={`${label} minus`}>
          &minus;
        </button>
        <span className={`fig ${cls}`}>
          <b>{current}</b>/{max}
        </span>
        <button type="button" className="step" onClick={() => onChange(Math.min(max, current + 1))} aria-label={`${label} plus`}>
          +
        </button>
      </div>
      <div className="stat-bar">
        <div className="stat-bar-fill" style={{ width: max ? `${(current / max) * 100}%` : '0%' }} />
      </div>
    </div>
  )
}

function CombatantRow({ combatant, sessionId }: { combatant: EncounterCombatant; sessionId: string }) {
  const updateStat = useUpdateCombatantStat()
  const removeCombatant = useRemoveCombatant()
  const maxHp = combatant.max_hp ?? 0
  const maxStress = combatant.max_stress ?? 0

  return (
    <div className="combatant-row">
      <span className={`combatant-side ${combatant.is_adversary ? 'adversary' : 'ally'}`}>&#9670;</span>
      <span className="combatant-name">
        {combatant.display_name}
        <span className="sub">{combatant.is_adversary ? 'Adversary' : 'Ally'}</span>
      </span>
      <StatTrack
        label="HP"
        current={combatant.current_hp ?? 0}
        max={maxHp}
        onChange={(next) => updateStat.mutate({ id: combatant.id, sessionId, field: 'current_hp', value: next })}
      />
      <StatTrack
        label="Stress"
        current={combatant.current_stress ?? 0}
        max={maxStress}
        onChange={(next) => updateStat.mutate({ id: combatant.id, sessionId, field: 'current_stress', value: next })}
      />
      <button
        type="button"
        className="remove-combatant"
        title="Remove"
        onClick={() => removeCombatant.mutate({ id: combatant.id, sessionId })}
      >
        &times;
      </button>
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
  const addCombatant = useAddCombatant()
  const [source, setSource] = useState<'freeform' | 'character'>('freeform')
  const [name, setName] = useState('')
  const [characterId, setCharacterId] = useState('')
  const [isAdversary, setIsAdversary] = useState(true)
  const [maxHp, setMaxHp] = useState('6')
  const [maxStress, setMaxStress] = useState('0')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const displayName = source === 'character' ? characters?.find((c) => c.id === characterId)?.label : name.trim()
    if (!displayName) return
    await addCombatant.mutateAsync({
      sessionId,
      encounterId,
      campaignId,
      displayName,
      characterId: source === 'character' ? characterId || null : null,
      isAdversary,
      maxHp: maxHp === '' ? null : Number(maxHp),
      maxStress: maxStress === '' ? null : Number(maxStress),
      sortOrder,
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="add-combatant-form">
      <div className="add-combatant-form-row">
        <select value={source} onChange={(e) => setSource(e.target.value as 'freeform' | 'character')}>
          <option value="freeform">Freeform name</option>
          <option value="character">Existing character</option>
        </select>
        {source === 'freeform' ? (
          <input type="text" autoFocus placeholder="e.g. Bog Assassin" value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          <select value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
            <option value="">— choose a character —</option>
            {characters?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}
        <select value={isAdversary ? 'adversary' : 'ally'} onChange={(e) => setIsAdversary(e.target.value === 'adversary')}>
          <option value="adversary">Adversary</option>
          <option value="ally">Ally</option>
        </select>
      </div>
      <div className="add-combatant-form-row">
        <label className="inline-number-label">
          Max HP <input type="number" min={0} value={maxHp} onChange={(e) => setMaxHp(e.target.value)} />
        </label>
        <label className="inline-number-label">
          Max Stress <input type="number" min={0} value={maxStress} onChange={(e) => setMaxStress(e.target.value)} />
        </label>
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

      {encounter.encounter_combatants.map((c) => (
        <CombatantRow key={c.id} combatant={c} sessionId={sessionId} />
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
  const [addingEntry, setAddingEntry] = useState(false)
  const [rolledId, setRolledId] = useState<string | null>(null)

  const entries = table.session_roll_table_entries
  const rolled = entries.find((e) => e.id === rolledId)

  const handleRoll = () => {
    if (!entries.length) return
    const pick = entries[Math.floor(Math.random() * entries.length)]
    setRolledId(pick.id)
  }

  return (
    <div className="roll-table-card">
      <div className="roll-table-head">
        <h3>{table.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {table.dice_label && <span className="die">{table.dice_label}</span>}
          <button type="button" className="btn roll-btn" onClick={handleRoll} disabled={!entries.length}>
            &#127922; Roll
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

      {entries.map((entry) => (
        <div key={entry.id} className={`roll-entry ${entry.id === rolledId ? 'hit' : ''}`}>
          <span className="num">{entry.roll_label}</span>
          <span>{entry.result_text}</span>
          <button type="button" className="remove-combatant" title="Remove" onClick={() => removeEntry.mutate({ id: entry.id, sessionId })}>
            &times;
          </button>
        </div>
      ))}

      {rolled && (
        <div className="roll-result-callout show">
          <b>Rolled {rolled.roll_label}:</b> {rolled.result_text}
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

export function SessionGmTabExtra({ entityId, campaignId }: { entityId: string; campaignId: string }) {
  return (
    <>
      <EncountersSection sessionId={entityId} campaignId={campaignId} />
      <RollTablesSection sessionId={entityId} campaignId={campaignId} />
    </>
  )
}
