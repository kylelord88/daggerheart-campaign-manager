import { useState } from 'react'
import { rollFormula, attackRollFormula, formatRollResult } from '../sessions/dice'
import type { CombatantStatBlock, StatBlockFeature } from '../sessions/useSessionExtras'

// Shared by the encounter combatant stat block editor and the Adversary
// Library entry editor, so a stat block looks/behaves identically whether
// it's attached to a live combatant or sitting in the library waiting to be
// copied onto one.

export function emptyFeature(): StatBlockFeature {
  return { id: crypto.randomUUID(), name: '', type: 'Action', description: '' }
}

export function DiceRollButton({ formula, label }: { formula: string; label: string }) {
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

export function StatBlockDisplay({ block, onEdit }: { block: CombatantStatBlock; onEdit: () => void }) {
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

export function StatBlockFieldsEditor({
  block,
  onChange,
}: {
  block: CombatantStatBlock
  onChange: (updater: (prev: CombatantStatBlock) => CombatantStatBlock) => void
}) {
  const set = <K extends keyof CombatantStatBlock>(key: K, value: CombatantStatBlock[K]) =>
    onChange((prev) => ({ ...prev, [key]: value }))

  const updateFeature = (id: string, patch: Partial<StatBlockFeature>) =>
    onChange((prev) => ({
      ...prev,
      features: prev.features?.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))

  return (
    <>
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
              onClick={() => onChange((prev) => ({ ...prev, features: prev.features?.filter((x) => x.id !== f.id) }))}
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
          onClick={() => onChange((prev) => ({ ...prev, features: [...(prev.features ?? []), emptyFeature()] }))}
        >
          + Add feature
        </button>
      </div>
    </>
  )
}
