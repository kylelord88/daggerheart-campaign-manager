import { MapContainer, ImageOverlay, Marker, Tooltip, useMapEvents } from 'react-leaflet'
import L, { CRS, type LatLngBoundsExpression } from 'leaflet'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { useMapPins } from './useMapData'
import type { MapRow } from '../../types/database'

const pinIcon = L.divIcon({
  className: 'map-pin-icon',
  html: '<div class="map-pin-dot"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

// Image pixel coords are top-left origin, y-down (standard). Leaflet's
// CRS.Simple is bottom-left origin, y-up (like normal map lat/lng). Every
// pin position is converted at the boundary so the rest of the app only
// ever deals in plain image pixel coordinates.
function pixelToLatLng(x: number, y: number, height: number): [number, number] {
  return [height - y, x]
}
function latLngToPixel(lat: number, lng: number, height: number): { x: number; y: number } {
  return { x: lng, y: height - lat }
}

function ClickHandler({ height, onClick }: { height: number; onClick: (x: number, y: number) => void }) {
  useMapEvents({
    click(e) {
      const { x, y } = latLngToPixel(e.latlng.lat, e.latlng.lng, height)
      onClick(x, y)
    },
  })
  return null
}

interface MapViewerProps {
  map: MapRow
  campaignSlug: string
  mode: 'browse' | 'placing' | 'removing'
  onPlacePinAt: (x: number, y: number) => void
  onRemovePin: (pinId: string) => void
}

export function MapViewer({ map, campaignSlug, mode, onPlacePinAt, onRemovePin }: MapViewerProps) {
  const navigate = useNavigate()
  const { data: pins } = useMapPins(map.id)
  const bounds: LatLngBoundsExpression = [
    [0, 0],
    [map.height_px, map.width_px],
  ]

  return (
    <MapContainer
      crs={CRS.Simple}
      bounds={bounds}
      maxBounds={bounds}
      maxBoundsViscosity={0.8}
      zoomSnap={0.25}
      zoomDelta={0.5}
      minZoom={-5}
      maxZoom={4}
      scrollWheelZoom
      // No explicit height here: MapContainer's inline `style` prop would
      // override the CSS-side flex sizing with a plain `height: 100%`, which
      // doesn't reliably resolve against an ancestor whose own height comes
      // from flex-grow (confirmed by isolated testing). Leaving it unset
      // lets the parent's default `align-items: stretch` size it instead.
      style={{ width: '100%' }}
      className={`map-viewer ${mode === 'placing' ? 'map-mode-placing' : mode === 'removing' ? 'map-mode-removing' : ''}`}
    >
      <ImageOverlay url={map.image_url} bounds={bounds} />
      {mode === 'placing' && <ClickHandler height={map.height_px} onClick={onPlacePinAt} />}
      {pins?.map((pin) => (
        <Marker
          key={pin.id}
          position={pixelToLatLng(pin.x, pin.y, map.height_px)}
          icon={pinIcon}
          eventHandlers={{
            click: () => {
              if (mode === 'removing') onRemovePin(pin.id)
              else if (mode === 'browse') navigate(`/c/${campaignSlug}/locations/${pin.locations.slug}`)
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} className="map-pin-tooltip">
            {pin.locations.hero_image_url && (
              <img className="map-pin-tooltip-thumb" src={pin.locations.hero_image_url} alt="" />
            )}
            <strong>{pin.locations.name}</strong>
            {pin.locations.content_html && (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(pin.locations.content_html) }} />
            )}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  )
}
