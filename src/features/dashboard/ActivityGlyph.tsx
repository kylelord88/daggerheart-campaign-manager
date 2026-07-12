import { ShapeIcon } from '../entities/ShapeIcon'
import type { ActivityKind } from './useDashboardData'

export function ActivityGlyph({ kind }: { kind: ActivityKind }) {
  switch (kind) {
    case 'location':
      return <ShapeIcon shape="square" className="activity-glyph" />
    case 'quest':
      return (
        <svg className="activity-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )
    case 'character':
      return (
        <svg className="activity-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      )
    case 'faction':
      return <ShapeIcon shape="diamond" className="activity-glyph" />
    case 'divinity':
      return <ShapeIcon shape="triangle" className="activity-glyph" />
  }
}
