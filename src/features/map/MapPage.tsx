import { useState } from 'react'
import { useCampaign } from '../../context/CampaignContext'
import { usePrimaryMap, useUnpinnedLocations, usePlacePin, useRemovePin } from './useMapData'
import { MapUploadForm } from './MapUploadForm'
import { MapViewer } from './MapViewer'

type Mode = 'browse' | 'placing' | 'removing'

export function MapPage() {
  const { campaign, isGm, isLoading: campaignLoading } = useCampaign()
  const { data: map, isLoading: mapLoading } = usePrimaryMap(campaign?.id)
  const [mode, setMode] = useState<Mode>('browse')
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState('')

  const { data: unpinnedLocations } = useUnpinnedLocations(campaign?.id, map?.id)
  const placePinMutation = usePlacePin()
  const removePinMutation = useRemovePin()

  if (campaignLoading || mapLoading) return <div className="page-loading">Loading…</div>
  if (!campaign) return null

  if (!map) {
    return isGm ? (
      <MapUploadForm campaignId={campaign.id} />
    ) : (
      <p className="empty-state">The GM hasn't uploaded a map for this campaign yet.</p>
    )
  }

  const handlePlacePinAt = (x: number, y: number) => {
    setPendingPosition({ x, y })
  }

  const handleConfirmPlacement = async () => {
    if (!pendingPosition || !selectedLocationId) return
    await placePinMutation.mutateAsync({ mapId: map.id, locationId: selectedLocationId, ...pendingPosition })
    setPendingPosition(null)
    setSelectedLocationId('')
    setMode('browse')
  }

  const handleCancelPlacement = () => {
    setPendingPosition(null)
    setSelectedLocationId('')
  }

  const handleRemovePin = (pinId: string) => {
    if (!window.confirm('Remove this pin? (The location itself is not deleted.)')) return
    removePinMutation.mutate({ pinId, mapId: map.id })
  }

  return (
    <div className="map-page">
      <div className="map-page-header">
        <h1>{map.name}</h1>
        {isGm && (
          <div className="map-toolbar">
            <button
              className={mode === 'placing' ? 'active' : ''}
              onClick={() => {
                setMode(mode === 'placing' ? 'browse' : 'placing')
                setPendingPosition(null)
              }}
            >
              {mode === 'placing' ? 'Cancel Placing' : '+ Place Pin'}
            </button>
            <button
              className={mode === 'removing' ? 'active' : ''}
              onClick={() => setMode(mode === 'removing' ? 'browse' : 'removing')}
            >
              {mode === 'removing' ? 'Done Removing' : 'Remove Pin'}
            </button>
          </div>
        )}
      </div>

      {mode === 'placing' && !pendingPosition && (
        <p className="map-hint">Click anywhere on the map to place a pin.</p>
      )}
      {mode === 'removing' && <p className="map-hint">Click a pin to remove it.</p>}

      {pendingPosition && (
        <div className="pin-placement-panel">
          <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
            <option value="">Choose a location…</option>
            {unpinnedLocations?.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={handleConfirmPlacement} disabled={!selectedLocationId}>
            Place
          </button>
          <button onClick={handleCancelPlacement}>Cancel</button>
          {!unpinnedLocations?.length && <p className="empty-state">Every location already has a pin.</p>}
        </div>
      )}

      <div className="map-viewer-wrapper">
        <MapViewer
          map={map}
          campaignSlug={campaign.slug}
          mode={mode}
          onPlacePinAt={handlePlacePinAt}
          onRemovePin={handleRemovePin}
        />
      </div>
    </div>
  )
}
