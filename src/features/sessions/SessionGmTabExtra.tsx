import { useState, type FormEvent } from 'react'
import { useReferenceOptions } from '../entities/useEntity'
import {
  useSessionEncounters,
  useCreateEncounter,
  useDeleteEncounter,
  useAddCombatant,
  useUpdateCombatantStat,
  useUpdateCombatantStatBlock,
  useRemoveCombatant,
  useSessionRollTables,
  useCreateRollTable,
  useDeleteRollTable,
  useAddRollEntry,
  useRemoveRollEntry,
  getStatBlock,
  hasStatBlock,
  type EncounterWithCombatants,
  type RollTableWithEntries,
  type CombatantStatBlock,
  type StatBlockFeature,
} from './useSessionExtras'
import { rollFormula, attackRollFormula, formatRollResult } from './dice'
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

function DiceRollButton({ formula, label }: { formula: string; label: string }) {
  const [result, setResult] = useState<ReturnType<typeof rollFormula> | null>(null)
  const parsed = rollFormula(formula)

  return (
    <span className="dice-roll">
      <button
        type="button"
        className="btn dice-roll-btn"
        disabled={!parsed}
        title={parsed ? formula : `Can't parse "${formula}" - expected e.g. 1d12+4`}
        onClick={() => setResult(rollFormula(formula))}
      >
        &#127922; {label}
      </button>
      {result && (
        <span className="dice-roll-result">
          <b>{result.total}</b> <span className="dice-roll-breakdown">({formatRollResult(result)})</span>
        </span>
      )}
    </span>
  )
}

function StatBlockDisplay({ block, onEdit }: { block: CombatantStatBlock; onEdit: () => void }) {
  return (
    <div className="stat-block">
      <div className="stat-block-top">
        <div className="stat-block-facts">
          {block.tier !== undefined && block.tier !== null && (
            <span>
              <b>Tier {block.tier}</b>
              {block.role ? ` · ${block.role}` : ''}
            </span>
          )}
          {block.difficulty !== undefined && block.difficulty !== null && (
            <span>
              <b>Difficulty:</b> {block.difficulty}
            </span>
          )}
          {(block.majorThreshold || block.severeThreshold) && (
            <span>
              <b>Thresholds:</b> {block.majorThreshold ?? '—'} / {block.severeThreshold ?? '—'}
            </span>
          )}
        </div>
        <button type="button" className="stat-block-edit-link" onClick={onEdit}>
          Edit
        </button>
      </div>

      {block.attackModifier && (
        <div className="stat-block-row">
          <span>
            <b>Attack:</b> {block.attackModifier}
            {block.weaponName && ` · ${block.weaponName}`}
            {block.weaponRange && ` (${block.weaponRange})`}
            {block.weaponDice && ` · ${block.weaponDice}${block.weaponDamageType ? ' ' + block.weaponDamageType : ''}`}
          </span>
          <span className="stat-block-rolls">
            <DiceRollButton formula={attackRollFormula(block.attackModifier)} label="Attack" />
            {block.weaponDice && <DiceRollButton formula={block.weaponDice} label="Damage" />}
          </span>
        </div>
      )}

      {block.experience && (
        <div className="stat-block-row">
          <b>Experience:</b> {block.experience}
        </div>
      )}
      {block.motivesTactics && (
        <div className="stat-block-row">
          <b>Motives &amp; Tactics:</b> {block.motivesTactics}
        </div>
      )}

      {Boolean(block.features?.length) && (
        <div className="stat-block-features">
          <h4 className="caps">Features</h4>
          {block.features!.map((f) => (
            <div key={f.id} className="stat-block-feature">
              <div className="stat-block-feature-head">
                <span>
                  <b>{f.name}</b> <span className="stat-block-feature-type caps">{f.type}</span>
                  {f.cost && <span className="stat-block-feature-cost"> · {f.cost}</span>}
                </span>
                {f.dice && <DiceRollButton formula={f.dice} label={f.dice} />}
              </div>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      )}

      {block.summons && (
        <div className="stat-block-row">
          <b>Summons:</b> {block.summons}
        </div>
      )}
    </div>
  )
}

function emptyFeature(): StatBlockFeature {
  return { id: crypto.randomUUID(), name: '', type: 'Action', description: '' }
}

function StatBlockForm({
  combatantId,
  sessionId,
  initial,
  onDone,
}: {
  combatantId: string
  sessionId: string
  initial: CombatantStatBlock
  onDone: () => void
}) {
  const updateStatBlock = useUpdateCombatantStatBlock()
  const [block, setBlock] = useState<CombatantStatBlock>(initial)

  const set = <K extends keyof CombatantStatBlock>(key: K, value: CombatantStatBlock[K]) =>
    setBlock((prev) => ({ ...prev, [key]: value }))

  const updateFeature = (id: string, patch: Partial<StatBlockFeature>) =>
    setBlock((prev) => ({
      ...prev,
      features: prev.features?.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await updateStatBlock.mutateAsync({ id: combatantId, sessionId, statBlock: block })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="stat-block-form">
      <div className="stat-block-form-row">
        <label className="inline-number-label">
          Tier <input type="number" min={1} max={4} value={block.tier ?? ''} onChange={(e) => set('tier', e.target.value ? Number(e.target.value) : undefined)} />
        </label>
        <label className="inline-number-label">
          Role
          <input type="text" placeholder="Leader, Standard, Minion…" value={block.role ?? ''} onChange={(e) => set('role', e.target.value)} />
        </label>
        <label className="inline-number-label">
          Difficulty <input type="number" value={block.difficulty ?? ''} onChange={(e) => set('difficulty', e.target.value ? Number(e.target.value) : undefined)} />
        </label>
      </div>

      <div className="stat-block-form-row">
        <label className="inline-number-label">
          Attack <input type="text" placeholder="+3" style={{ width: '3.5rem' }} value={block.attackModifier ?? ''} onChange={(e) => set('attackModifier', e.target.value)} />
        </label>
        <label className="inline-number-label">
          Weapon <input type="text" placeholder="Javelin" value={block.weaponName ?? ''} onChange={(e) => set('weaponName', e.target.value)} />
        </label>
        <label className="inline-number-label">
          Range <input type="text" placeholder="Close" style={{ width: '5.5rem' }} value={block.weaponRange ?? ''} onChange={(e) => set('weaponRange', e.target.value)} />
        </label>
        <label className="inline-number-label">
          Dice <input type="text" placeholder="1d12+4" style={{ width: '5rem' }} value={block.weaponDice ?? ''} onChange={(e) => set('weaponDice', e.target.value)} />
        </label>
        <label className="inline-number-label">
          Type <input type="text" placeholder="phy" style={{ width: '3.5rem' }} value={block.weaponDamageType ?? ''} onChange={(e) => set('weaponDamageType', e.target.value)} />
        </label>
      </div>

      <div className="stat-block-form-row">
        <label className="inline-number-label">
          Major Threshold <input type="number" value={block.majorThreshold ?? ''} onChange={(e) => set('majorThreshold', e.target.value ? Number(e.target.value) : undefined)} />
        </label>
        <label className="inline-number-label">
          Severe Threshold <input type="number" value={block.severeThreshold ?? ''} onChange={(e) => set('severeThreshold', e.target.value ? Number(e.target.value) : undefined)} />
        </label>
      </div>

      <label className="form-field">
        <span>Experience</span>
        <input type="text" placeholder="Local Knowledge +2" value={block.experience ?? ''} onChange={(e) => set('experience', e.target.value)} />
      </label>
      <label className="form-field">
        <span>Motives &amp; Tactics</span>
        <input type="text" placeholder="Bully, Command, Profit, Reinforce" value={block.motivesTactics ?? ''} onChange={(e) => set('motivesTactics', e.target.value)} />
      </label>
      <label className="form-field">
        <span>Summons</span>
        <input type="text" placeholder="Jagged Knife Lackey x3" value={block.summons ?? ''} onChange={(e) => set('summons', e.target.value)} />
      </label>

      <div className="stat-block-features-editor">
        <span className="form-field-label-standalone caps">Features</span>
        {block.features?.map((f) => (
          <div key={f.id} className="stat-block-feature-form-row">
            <input type="text" placeholder="Name" value={f.name} onChange={(e) => updateFeature(f.id, { name: e.target.value })} />
            <select value={f.type} onChange={(e) => updateFeature(f.id, { type: e.target.value as StatBlockFeature['type'] })}>
              <option value="Action">Action</option>
              <option value="Reaction">Reaction</option>
              <option value="Passive">Passive</option>
            </select>
            <input type="text" placeholder="Cost (e.g. Mark a Stress)" value={f.cost ?? ''} onChange={(e) => updateFeature(f.id, { cost: e.target.value })} />
            <input type="text" placeholder="Dice (optional)" style={{ width: '5.5rem' }} value={f.dice ?? ''} onChange={(e) => updateFeature(f.id, { dice: e.target.value })} />
            <button
              type="button"
              className="remove-combatant"
              onClick={() => setBlock((prev) => ({ ...prev, features: prev.features?.filter((x) => x.id !== f.id) }))}
            >
              &times;
            </button>
            <textarea
              className="stat-block-feature-desc"
              placeholder="Description"
              rows={2}
              value={f.description}
              onChange={(e) => updateFeature(f.id, { description: e.target.value })}
            />
          </div>
        ))}
        <button
          type="button"
          className="add-combatant-link"
          onClick={() => setBlock((prev) => ({ ...prev, features: [...(prev.features ?? []), emptyFeature()] }))}
        >
          + Add feature
        </button>
      </div>

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

function CombatantRow({ combatant, sessionId }: { combatant: EncounterCombatant; sessionId: string }) {
  const updateStat = useUpdateCombatantStat()
  const removeCombatant = useRemoveCombatant()
  const maxHp = combatant.max_hp ?? 0
  const maxStress = combatant.max_stress ?? 0
  const statBlock = getStatBlock(combatant)
  const filled = hasStatBlock(statBlock)
  const [expanded, setExpanded] = useState(false)
  const [editingStatBlock, setEditingStatBlock] = useState(false)

  return (
    <div className="combatant-block">
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

      <button type="button" className="stat-block-toggle" onClick={() => setExpanded((v) => !v)}>
        {expanded ? '▾' : '▸'} {filled ? 'Stat Block' : 'Add Stat Block'}
      </button>

      {expanded &&
        (editingStatBlock || !filled ? (
          <StatBlockForm
            combatantId={combatant.id}
            sessionId={sessionId}
            initial={statBlock}
            onDone={() => setEditingStatBlock(false)}
          />
        ) : (
          <StatBlockDisplay block={statBlock} onEdit={() => setEditingStatBlock(true)} />
        ))}
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
