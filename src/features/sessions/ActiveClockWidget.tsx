import { useCampaign } from '../../context/CampaignContext'
import { useActiveCountdown, useActiveCountdownRealtime, useUpdateCountdown } from './useSessionExtras'
import { QUICK_STEPS } from './SessionClocksTab'

// Global floating widget: shows the one clock a GM has turned on, fixed in the
// bottom-left corner on EVERY campaign page. Everyone sees it (RLS makes an
// active clock visible to all members regardless of session publish state);
// only the GM gets step controls so Kyle can run the countdown from any page
// without navigating back to the session. Renders nothing when no clock is on.
export function ActiveClockWidget() {
  const { campaign, isGm } = useCampaign()
  const { data: clock } = useActiveCountdown(campaign?.id)
  useActiveCountdownRealtime(campaign?.id)
  const updateCountdown = useUpdateCountdown()

  if (!clock) return null

  const step = (delta: number) => {
    const next = Math.max(0, clock.value + delta)
    if (next === clock.value) return
    updateCountdown.mutate({ id: clock.id, sessionId: clock.session_id, patch: { value: next } })
  }

  const done = clock.value === 0

  return (
    <aside className={`active-clock-widget${done ? ' clock-done' : ''}`} aria-label="Active clock">
      <div className="active-clock-body">
        {isGm && (
          <button type="button" className="step" onClick={() => step(-1)} disabled={clock.value === 0} aria-label="Tick down">
            &minus;
          </button>
        )}
        <div className="active-clock-readout">
          <span className="active-clock-name caps">{clock.name}</span>
          <span className="active-clock-value">{clock.value}</span>
          {done && <span className="active-clock-done caps">Complete</span>}
        </div>
        {isGm && (
          <button type="button" className="step" onClick={() => step(1)} aria-label="Tick up">
            +
          </button>
        )}
      </div>
      {isGm && (
        <div className="active-clock-quick">
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
    </aside>
  )
}
