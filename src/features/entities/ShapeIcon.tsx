import type { ShapeKind } from './types'

const PATHS: Record<ShapeKind, React.ReactNode> = {
  square: <rect x="4" y="4" width="16" height="16" />,
  circle: <circle cx="12" cy="12" r="9" />,
  triangle: <polygon points="12,3 21,20 3,20" />,
  diamond: <polygon points="12,2 22,12 12,22 2,12" />,
}

export function ShapeIcon({ shape, className }: { shape: ShapeKind; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {PATHS[shape]}
    </svg>
  )
}
