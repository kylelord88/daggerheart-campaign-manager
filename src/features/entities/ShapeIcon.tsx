import type { ShapeKind } from './types'

const PATHS: Record<ShapeKind, React.ReactNode> = {
  square: <rect x="4" y="4" width="16" height="16" />,
  circle: <circle cx="12" cy="12" r="9" />,
  triangle: <polygon points="12,3 21,20 3,20" />,
  diamond: <polygon points="12,2 22,12 12,22 2,12" />,
  // House silhouette, for settlements/buildings.
  settlement: <path d="M12 2 22 11 22 22 2 22 2 11Z" />,
  // Stacked-fir treeline, for wilderness/open country.
  wilderness: <path d="M12 2 18 12 14 12 18 20 6 20 10 12 6 12Z" />,
  // Planted flag, for landmarks/points of interest.
  landmark: <path d="M6 2v20h2v-8h10l-3-4 3-4H8V2Z" />,
  // Dark arched entrance, for dungeons.
  dungeon: <path d="M4 22V12a8 8 0 0 1 16 0v10h-3v-9a5 5 0 0 0-10 0v9Z" />,
}

export function ShapeIcon({ shape, className }: { shape: ShapeKind; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {PATHS[shape]}
    </svg>
  )
}
