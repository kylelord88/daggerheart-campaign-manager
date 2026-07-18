import { useState, type FormEvent } from 'react'
import { useCampaign } from '../../context/CampaignContext'
import {
  useSessionCountdowns,
  useSessionCountdownsRealtime,
  useCreateCountdown,
  useUpdateCountdown,
  useDeleteCountdown,
  type SessionCountdown,
} from './useSessionExtras'

// Quick-step buttons matching Kyle's homebrew travel countdown: the clock
// ticks toward 0 on player duality-roll successes and back up on failures.
const QUICK_STEPS: Array<{ delta: number; label: string; title: string }> = [
  { delta: -3, label: 'Crit −3', title: 'Critical success: −3' },
  { delta: -2, label: 'Hope −2', title: 'Success with Hope: −2' },
  { delta: -1, label: 'Fear −1', title: 'Success with Fear: −1' },
  { delta: +1, label: 'Fail +1', title: 'Failure with Fear: +1 (plus an obstacle)' },
]

function ClockEditForm({ clock, onDone }: { clock: SessionCountdown; onDone: () => void }) {
  const updateCountdown = useUpdateCountdown()
  const [name, setName] = useState(clock.name)
  const [value, setValue] = useState(String(clock.value))
  const [startValue, setStartValue] = useState(String(clock.start_value))
  const [note, setNote] = useState(clock.note ?? '')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await updateCountdown.mutateAsync({
      id: clock.id,
      sessionId: clock.session_id,
      patch: {
        name: name.trim(),
        value: Math.max(0, Number(value) || 0),
        start_value: Math.max(0, Number(startValue) || 0),
        note: note.trim() || null,
      },
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="add-combatant-form clock-edit-form">
      <div className="add-combatant-form-row">
        <input type="text" autoFocus placeholder="Clock name" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="inline-number-label">
          Value <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <label className="inline-number-label">
          Started at <input type="number" min={0} value={startValue} onChange={(e) => setStartValue(e.target.value)} />
        </label>
      </div>
      <div className="add-combatant-form-row">
        <input type="text" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={updateCountdown.isPending}>
          {updateCountdown.isPending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function ClockCard({ clock, isGm }: { clock: SessionCountdown; isGm: boolean }) {
  const updateCountdown = useUpdateCountdown()
  const deleteCountdown = useDeleteCountdown()
  const [editing, setEditing] = useState(false)

  const step = (delta: number) => {
    const next = Math.max(0, clock.value + delta)
    if (next === clock.value) return
    updateCountdown.mutate({ id: clock.id, sessionId: clock.session_id, patch: { value: next } })
  }

  const done = clock.value === 0

  return (
    <div className={`clock-card${done ? ' clock-done' : ''}`}>
      <div className="clock-card-head">
        <h3>{clock.name}</h3>
        {isGm && (
          <div className="clock-head-actions">
            <button type="button" className="add-combatant-link" onClick={() => setEditing((v) => !v)}>
              Edit
            </button>
            <button
              type="button"
              className="remove-combatant"
              title="Delete clock"
              onClick={() => {
                if (window.confirm(`Delete "${clock.name}"?`)) {
                  deleteCountdown.mutate({ id: clock.id, sessionId: clock.session_id })
                }
              }}
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {clock.note && <p className="clock-note">{clock.note}</p>}

      <div className="clock-value-row">
        {isGm && (
          <button type="button" className="step" onClick={() => step(-1)} disabled={clock.value === 0} aria-label="Tick down">
            &minus;
          </button>
        )}
        <div className="clock-value-readout">
          <span className="clock-value">{clock.value}</span>
          <span className="clock-start caps">{done ? 'Complete' : `started at ${clock.start_value}`}</span>
        </div>
        {isGm && (
          <button type="button" className="step" onClick={() => step(1)} aria-label="Tick up">
            +
          </button>
        )}
      </div>

      {isGm && (
        <div className="clock-quick-btns">
          {QUICK_STEPS.map((q) => (
            <button
              key={q.label}
              type="button"
              title={q.title}
              disabled={q.delta < 0 && clock.value === 0}
              onClick={() => step(q.delta)}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {isGm && editing && <ClockEditForm clock={clock} onDone={() => setEditing(false)} />}
    </div>
  )
}

function ClocksSection({ sessionId, campaignId }: { sessionId: string; campaignId: string }) {
  const { isGm } = useCampaign()
  const { data: clocks, isLoading } = useSessionCountdowns(sessionId)
  useSessionCountdownsRealtime(sessionId)
  const createCountdown = useCreateCountdown()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [startValue, setStartValue] = useState('6')

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await createCountdown.mutateAsync({
      sessionId,
      campaignId,
      name: name.trim(),
      startValue: Math.max(0, Number(startValue) || 0),
      note: null,
      sortOrder: clocks?.length ?? 0,
    })
    setName('')
    setStartValue('6')
    setAdding(false)
  }

  return (
    <div className="subsection">
      <div className="subsection-head">
        <h2>Clocks</h2>
        {isGm &&
          (adding ? (
            <form onSubmit={handleCreate} className="inline-new-form">
              <input type="text" autoFocus placeholder="Clock name" value={name} onChange={(e) => setName(e.target.value)} />
              <input
                type="number"
                min={0}
                title="Starting value"
                style={{ maxWidth: '4.5rem' }}
                value={startValue}
                onChange={(e) => setStartValue(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={createCountdown.isPending}>
                Create
              </button>
              <button type="button" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <button type="button" className="subtle-add-btn" onClick={() => setAdding(true)}>
              + New Clock
            </button>
          ))}
      </div>
      <p className="subsection-hint">
        {isGm
          ? 'Countdown trackers everyone can watch live — e.g. a travel countdown stepped by duality rolls (Crit −3, Success with Hope −2, with Fear −1, Failure with Fear +1 and an obstacle). Only you can change them.'
          : 'Countdowns the GM is tracking this session — they update live as the table plays.'}
      </p>

      {isLoading && <p className="empty-state">Loading…</p>}
      {!isLoading && !clocks?.length && <p className="empty-state">No clocks yet.</p>}
      {clocks?.map((clock) => (
        <ClockCard key={clock.id} clock={clock} isGm={isGm} />
      ))}
    </div>
  )
}

// Adapter matching the generic {entityId, campaignId} extraTabs signature.
// Registered with gmOnly: false — players see this tab read-only.
export function ClocksTab({ entityId, campaignId }: { entityId: string; campaignId: string }) {
  return <ClocksSection sessionId={entityId} campaignId={campaignId} />
}
