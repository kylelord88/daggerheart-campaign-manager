import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCampaign } from '../../context/CampaignContext'
import { useGlobalSearch, type SearchResult } from './useGlobalSearch'

const GROUP_ORDER: SearchResult['kind'][] = [
  'location',
  'faction',
  'divinity',
  'character',
  'quest',
  'session',
  'misc',
  'adversary',
  'environment',
  'source',
]
const MIN_CHARS = 2
const DEBOUNCE_MS = 300

// Search box mounted in the campaign nav (CampaignLayout.tsx), visible to
// every campaign member — not GM-gated, players use this too. See
// useGlobalSearch.ts for how visibility is enforced per content type.
export function GlobalSearchBox() {
  const { campaign, isGm, previewAsPlayer } = useCampaign()
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [term])

  const trimmed = debounced.trim()
  const shouldQuery = trimmed.length >= MIN_CHARS
  // previewAsPlayer is cosmetic only (the GM's own account still has real
  // access) - but every other query on this account (useActiveQuests etc. in
  // src/features/dashboard/useDashboardData.ts) hides unpublished content
  // while previewing, so search should match that instead of always showing
  // everything to a GM regardless of preview mode.
  const { data: results, isFetching } = useGlobalSearch(campaign?.id, debounced, isGm && !previewAsPlayer)

  // Close on outside click and on Escape. Outside-click uses mousedown
  // (rather than the input's onBlur) so clicking a result link inside the
  // dropdown still registers as a navigation before anything closes it.
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

  const closeAndClear = () => {
    setIsOpen(false)
    setTerm('')
    setDebounced('')
  }

  const grouped = GROUP_ORDER.map((kind) => (results ?? []).filter((r) => r.kind === kind)).filter(
    (items) => items.length > 0,
  )
  const hasAnyResults = grouped.length > 0
  const showDropdown = isOpen && term.trim().length > 0

  return (
    <div className="campaign-nav-search" ref={containerRef}>
      <input
        type="search"
        className="campaign-search-input"
        placeholder="Search campaign…"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        aria-label="Search campaign"
      />
      {showDropdown && (
        <div className="campaign-search-dropdown">
          {!shouldQuery && <p className="campaign-search-hint">Keep typing… ({MIN_CHARS}+ characters)</p>}
          {shouldQuery && isFetching && !results && <p className="campaign-search-hint">Searching…</p>}
          {shouldQuery && !isFetching && !hasAnyResults && (
            <p className="campaign-search-empty">No results for “{trimmed}”</p>
          )}
          {grouped.map((items) => (
            <div className="campaign-search-group" key={items[0].kind}>
              <div className="campaign-search-group-label">{items[0].kindLabel}</div>
              {items.map((item) => (
                <Link
                  key={`${item.kind}-${item.id}`}
                  to={item.path}
                  className="campaign-search-result"
                  onClick={closeAndClear}
                >
                  <span className="campaign-search-result-name">{item.name}</span>
                  {item.excerpt && <span className="campaign-search-result-excerpt">{item.excerpt}</span>}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
