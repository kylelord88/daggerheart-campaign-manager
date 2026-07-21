import { useEffect, useRef, useState, type ReactNode } from 'react'

interface NavDropdownProps {
  label: string
  /** Highlight the trigger itself, e.g. when one of the panel's links is the active route. */
  isActive?: boolean
  /** Panel hangs off the right edge of the trigger instead of the left — for menus near the nav's right end. */
  align?: 'left' | 'right'
  children: ReactNode
}

// Nav dropdown grouping related links (World / GM Tools / Account). Two
// independent ways in, both driving the same `visible` flag below:
//  - Click/keyboard: `isOpen`, toggled by the trigger <button> (a real
//    button, so Enter/Space "click" it for free) and closed on outside
//    mousedown or Escape — same pattern as GlobalSearchBox.
//  - Hover (desktop only): `hoverOpen`, set on mouseenter of the whole
//    container (trigger + panel together, so moving from one to the other
//    never even fires a leave) and cleared via a short setTimeout on
//    mouseleave — the timeout is what gives a diagonal cursor move from the
//    trigger down into the panel room to land before it closes. Gated
//    behind a `(hover: hover) and (pointer: fine)` matchMedia check so touch
//    doesn't get a hover-flash-that-doesn't-really-open-anything: touch
//    devices only ever get the click path (moot anyway below 720px, where
//    CampaignLayout swaps this whole nav for the hamburger MobileNav).
// The panel is always mounted (not conditionally rendered on `visible`) so
// its visibility is just a CSS class (`is-open`) toggle in index.css —
// that's what lets hover and click/keyboard drive the exact same element
// without fighting each other, and keeps aria-expanded/tab-order consistent
// regardless of which path opened it.
export function NavDropdown({ label, isActive, align = 'left', children }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoverOpen, setHoverOpen] = useState(false)
  const [supportsHover, setSupportsHover] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<number | undefined>(undefined)

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== undefined) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = undefined
    }
  }

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    setSupportsHover(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setSupportsHover(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => clearCloseTimer, [])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // A mouse-driven click on the trigger necessarily hovers it first,
        // so hoverOpen is very likely also true here — clear it (and its
        // pending close timer) synchronously too, otherwise the panel can
        // stay visible for up to the hover grace period after this "closes" it.
        clearCloseTimer()
        setIsOpen(false)
        setHoverOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (!containerRef.current?.contains(document.activeElement)) return
      clearCloseTimer()
      setIsOpen(false)
      setHoverOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const handleMouseEnter = () => {
    clearCloseTimer()
    setHoverOpen(true)
  }
  const handleMouseLeave = () => {
    clearCloseTimer()
    // ~200ms grace period: long enough for a diagonal move from the trigger
    // down into the panel (there's a visual gap between them) to land
    // before this fires, short enough that it doesn't feel sticky.
    closeTimerRef.current = window.setTimeout(() => setHoverOpen(false), 200)
  }

  const visible = isOpen || hoverOpen

  const handlePanelClick = () => {
    clearCloseTimer()
    setIsOpen(false)
    setHoverOpen(false)
  }

  return (
    <div
      className="nav-dropdown"
      ref={containerRef}
      onMouseEnter={supportsHover ? handleMouseEnter : undefined}
      onMouseLeave={supportsHover ? handleMouseLeave : undefined}
    >
      <button
        type="button"
        ref={triggerRef}
        className={`nav-dropdown-trigger${isActive ? ' active' : ''}`}
        aria-haspopup="true"
        aria-expanded={visible}
        onClick={() => setIsOpen((v) => !v)}
      >
        {label}
        <span className="nav-dropdown-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {/* Closing on click covers both NavLinks (navigation) and plain
          buttons (e.g. Sign Out) inside the panel without needing a
          per-item handler. */}
      <div
        className={`nav-dropdown-panel${align === 'right' ? ' align-right' : ''}${visible ? ' is-open' : ''}`}
        onClick={handlePanelClick}
      >
        {children}
      </div>
    </div>
  )
}
