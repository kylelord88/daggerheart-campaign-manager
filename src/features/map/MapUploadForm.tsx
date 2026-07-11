import { useState, type ChangeEvent } from 'react'
import { useUploadMap } from './useMapData'

export function MapUploadForm({ campaignId }: { campaignId: string }) {
  const uploadMutation = useUploadMap()
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      await uploadMutation.mutateAsync({ campaignId, file })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="map-upload">
      <h2>No map yet</h2>
      <p>Upload an image to use as this campaign's world map.</p>
      <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploadMutation.isPending} />
      {uploadMutation.isPending && <p>Uploading…</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
