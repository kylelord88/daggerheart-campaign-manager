import { useEffect, useRef, useState, type ReactNode } from 'react'

interface MobileNavProps {
  children: ReactNode
}

// Hamburger nav that replaces .campaign-nav-links entirely below 720px
// (see the mobile block at the end of index.css) — phones don't have real
// hover, so the desktop nav's hover-to-open dropdowns don't apply here at
// all; this is a plain click-to-open/close vertical list instead. Mirrors
// the same outside-mousedown/Escape close pattern already used by
// GlobalSearchBox and NavDropdown in this same nav bar.
//
// `.mobile-nav` is `display: contents` in CSS (see index.css) so this
// wrapper only exists as a DOM node for the outside-click ref — the toggle
// button and panel lay out as ordinary flex items of .campaign-nav.
export function MobileNav({ children }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setIsOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div className="mobile-nav" ref={containerRef}>
      <button
        type="button"
        ref={toggleRef}
        className="mobile-nav-toggle"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span aria-hidden="true">{isOpen ? '✕' : '☰'}</span>
      </button>
      {isOpen && (
        // Closing on click covers both NavLinks (navigation) and plain
        // buttons (e.g. Sign Out) inside the panel without a per-item handler.
        <div className="mobile-nav-panel" onClick={() => setIsOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}
