import { useEffect, useRef, useState, type ReactNode } from 'react'

interface NavDropdownProps {
  label: string
  /** Highlight the trigger itself, e.g. when one of the panel's links is the active route. */
  isActive?: boolean
  /** Panel hangs off the right edge of the trigger instead of the left — for menus near the nav's right end. */
  align?: 'left' | 'right'
  children: ReactNode
}

// Click-to-open nav dropdown (Locations/Factions/... grouped under "World",
// GM tools grouped under "GM Tools", account actions grouped under "Account").
// Mirrors the outside-click/Escape pattern already used by GlobalSearchBox in
// this same nav bar (mousedown on the document rather than onBlur, so a
// click on a link inside the panel still registers before it closes).
export function NavDropdown({ label, isActive, align = 'left', children }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div className="nav-dropdown" ref={containerRef}>
      <button
        type="button"
        className={`nav-dropdown-trigger${isActive ? ' active' : ''}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
      >
        {label}
        <span className="nav-dropdown-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {isOpen && (
        // Closing on click covers both NavLinks (navigation) and plain
        // buttons (e.g. Sign Out) inside the panel without needing a
        // per-item handler.
        <div
          className={`nav-dropdown-panel${align === 'right' ? ' align-right' : ''}`}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}
