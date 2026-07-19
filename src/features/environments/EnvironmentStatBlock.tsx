import type {
  EnvironmentLibraryEntry,
  EnvironmentFeature,
  EnvironmentStatBlock as EnvStatBlock,
  EnvFeatureKind,
} from './useEnvironmentLibrary'

// Shared rulebook-style renderer + editor for an environment stat block, so a
// library entry and a session-attached environment read identically. Mirrors
// the adversary StatBlockDisplay/StatBlockFieldsEditor pair.

const KIND_LABEL: Record<EnvFeatureKind, string> = {
  passive: 'Passive',
  action: 'Action',
  reaction: 'Reaction',
}

function difficultyLabel(env: Pick<EnvironmentLibraryEntry, 'difficulty' | 'difficulty_note'>): string {
  if (env.difficulty_note) return env.difficulty_note
  if (env.difficulty != null) return String(env.difficulty)
  return '—'
}

// The full rulebook-entry card. `env` carries the header facts (name/tier/type/
// difficulty) that live on the row; the body comes from the stat_block.
export function EnvironmentStatBlockDisplay({
  env,
  onEdit,
}: {
  env: EnvironmentLibraryEntry
  onEdit?: () => void
}) {
  const block = env.stat_block ?? { description: '', impulses: [], potential_adversaries: [], features: [] }
  return (
    <div className="env-block">
      <div className="env-block-header">
        <div className="env-block-heading">
          <h3 className="env-block-name">{env.name}</h3>
          <div className="env-block-meta caps">
            <span>Tier {env.tier}</span>
            <span className="env-block-dot">·</span>
            <span>{env.env_type}</span>
            <span className="env-block-dot">·</span>
            <span>Difficulty {difficultyLabel(env)}</span>
          </div>
        </div>
        {onEdit && (
          <button type="button" className="stat-block-edit-link" onClick={onEdit}>
            Edit
          </button>
        )}
      </div>

      {block.description && <p className="env-block-description">{block.description}</p>}

      {Boolean(block.impulses?.length) && (
        <p className="env-block-line">
          <span className="env-block-line-label caps">Impulses</span> {block.impulses.join(', ')}
        </p>
      )}

      {Boolean(block.potential_adversaries?.length) && (
        <p className="env-block-line">
          <span className="env-block-line-label caps">Potential Adversaries</span>{' '}
          {block.potential_adversaries.join(', ')}
        </p>
      )}

      {Boolean(block.features?.length) && (
        <div className="env-block-features">
          {block.features.map((f, i) => (
            <div key={i} className={`env-feature${f.fear ? ' env-feature-is-fear' : ''}`}>
              <div className="env-feature-head">
                <span className="env-feature-name">{f.name}</span>
                <span className="env-feature-tags">
                  <span className={`env-feature-tag env-feature-tag-${f.kind} caps`}>{KIND_LABEL[f.kind]}</span>
                  {f.fear && <span className="env-feature-tag env-feature-tag-fear caps">Fear</span>}
                </span>
              </div>
              {f.text && <p className="env-feature-text">{f.text}</p>}
              {f.question && <p className="env-feature-question">{f.question}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- editor ----------------

// Local editing model: adds a stable key per feature so React inputs don't lose
// focus when features are added/removed. Stripped back to EnvironmentFeature on
// save so the stored jsonb matches the agreed shape exactly.
export interface EditableFeature extends EnvironmentFeature {
  _key: string
}

export function toEditableFeatures(features: EnvironmentFeature[]): EditableFeature[] {
  return (features ?? []).map((f) => ({ ...f, _key: crypto.randomUUID() }))
}

export function stripFeatureKeys(features: EditableFeature[]): EnvironmentFeature[] {
  return features.map((f) => ({ name: f.name, kind: f.kind, text: f.text, question: f.question, fear: f.fear }))
}

export function emptyEditableFeature(): EditableFeature {
  return { _key: crypto.randomUUID(), name: '', kind: 'action', text: '', question: '', fear: false }
}

// Editor for the stat_block body (description / impulses / potential adversaries
// / features). Header facts (name/tier/type/difficulty) are edited separately on
// the row-level form.
export function EnvironmentFieldsEditor({
  block,
  features,
  onChangeBlock,
  onChangeFeatures,
}: {
  block: Pick<EnvStatBlock, 'description'> & { impulsesText: string; adversariesText: string }
  features: EditableFeature[]
  onChangeBlock: (patch: Partial<{ description: string; impulsesText: string; adversariesText: string }>) => void
  onChangeFeatures: (next: EditableFeature[]) => void
}) {
  const updateFeature = (key: string, patch: Partial<EditableFeature>) =>
    onChangeFeatures(features.map((f) => (f._key === key ? { ...f, ...patch } : f)))

  return (
    <>
      <label className="form-field">
        <span>Description</span>
        <textarea
          rows={2}
          placeholder="A crumbling temple half-swallowed by the jungle…"
          value={block.description}
          onChange={(e) => onChangeBlock({ description: e.target.value })}
        />
      </label>

      <label className="form-field">
        <span>Impulses (one per line)</span>
        <textarea
          rows={2}
          placeholder={'Draw the curious deeper\nPunish the careless'}
          value={block.impulsesText}
          onChange={(e) => onChangeBlock({ impulsesText: e.target.value })}
        />
      </label>

      <label className="form-field">
        <span>Potential Adversaries (one per line)</span>
        <textarea
          rows={2}
          placeholder={'Cult Adept (Tier 2)\nGiant Scorpion (Tier 2)'}
          value={block.adversariesText}
          onChange={(e) => onChangeBlock({ adversariesText: e.target.value })}
        />
      </label>

      <div className="env-features-editor">
        <span className="form-field-label-standalone caps">Features</span>
        {features.map((f) => (
          <div key={f._key} className="env-feature-form">
            <div className="env-feature-form-row">
              <input
                type="text"
                placeholder="Feature name"
                value={f.name}
                onChange={(e) => updateFeature(f._key, { name: e.target.value })}
              />
              <select value={f.kind} onChange={(e) => updateFeature(f._key, { kind: e.target.value as EnvFeatureKind })}>
                <option value="passive">Passive</option>
                <option value="action">Action</option>
                <option value="reaction">Reaction</option>
              </select>
              <label className="env-feature-fear-toggle">
                <input type="checkbox" checked={f.fear} onChange={(e) => updateFeature(f._key, { fear: e.target.checked })} />
                Fear
              </label>
              <button
                type="button"
                className="remove-combatant"
                onClick={() => onChangeFeatures(features.filter((x) => x._key !== f._key))}
              >
                &times;
              </button>
            </div>
            <textarea
              className="env-feature-form-text"
              rows={2}
              placeholder="What the feature does…"
              value={f.text}
              onChange={(e) => updateFeature(f._key, { text: e.target.value })}
            />
            <input
              type="text"
              className="env-feature-form-question"
              placeholder="Prompt / question (e.g. 'What do the carvings warn of?')"
              value={f.question}
              onChange={(e) => updateFeature(f._key, { question: e.target.value })}
            />
          </div>
        ))}
        <button type="button" className="add-combatant-link" onClick={() => onChangeFeatures([...features, emptyEditableFeature()])}>
          + Add feature
        </button>
      </div>
    </>
  )
}
