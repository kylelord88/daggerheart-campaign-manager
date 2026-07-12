import { useState, type ChangeEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'

interface ImageUploadFieldProps {
  value: unknown
  onChange: (url: string | null) => void
  campaignId: string | undefined
  /** Storage path segment to group uploads by, e.g. the entity table name */
  folder: string
  /** Set false when the page already shows its own preview of this image elsewhere (e.g. a hero banner) */
  showPreview?: boolean
}

export function ImageUploadField({ value, onChange, campaignId, folder, showPreview = true }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const url = (value as string) || null

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !campaignId) return
    setError(null)
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${campaignId}/${folder}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('media').upload(path, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="image-upload-field">
      {url ? (
        <div className="image-upload-current">
          {showPreview && <img src={url} alt="" className="image-upload-preview" />}
          <button type="button" className="image-upload-remove" onClick={() => onChange(null)} aria-label="Remove image">
            ×
          </button>
        </div>
      ) : (
        <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
      )}
      {uploading && <p className="image-upload-status">Uploading…</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
