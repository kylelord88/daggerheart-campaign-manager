import { useEffect } from 'react'

interface LightboxProps {
  src: string | null
  alt?: string
  onClose: () => void
}

// Full-screen image viewer. Renders nothing when src is null, so callers can
// just always mount it and toggle src.
export function Lightbox({ src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    if (!src) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [src, onClose])

  if (!src) return null

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={alt || 'Image'}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close">
        &times;
      </button>
      {/* Stop propagation so clicking the image itself doesn't close the overlay */}
      <img src={src} alt={alt ?? ''} className="lightbox-image" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
