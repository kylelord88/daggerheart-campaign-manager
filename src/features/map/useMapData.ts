import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { MapRow } from '../../types/database'

export interface PinWithLocation {
  id: string
  x: number
  y: number
  location_id: string
  locations: { name: string; slug: string; content_html: string | null }
}

export function usePrimaryMap(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['primary-map', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<MapRow | null> => {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('campaign_id', campaignId!)
        .eq('is_primary', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useMapPins(mapId: string | undefined) {
  return useQuery({
    queryKey: ['map-pins', mapId],
    enabled: Boolean(mapId),
    queryFn: async (): Promise<PinWithLocation[]> => {
      const { data, error } = await supabase
        .from('map_pins')
        .select('id, x, y, location_id, locations(name, slug, content_html)')
        .eq('map_id', mapId!)
        .not('location_id', 'is', null)
      if (error) throw error
      return data as unknown as PinWithLocation[]
    },
  })
}

// Locations in this campaign that don't have a pin on this map yet - the
// candidate list when a GM places a new pin.
export function useUnpinnedLocations(campaignId: string | undefined, mapId: string | undefined) {
  return useQuery({
    queryKey: ['unpinned-locations', campaignId, mapId],
    enabled: Boolean(campaignId && mapId),
    queryFn: async (): Promise<Array<{ id: string; name: string }>> => {
      const [{ data: locations, error: locError }, { data: pins, error: pinError }] = await Promise.all([
        supabase.from('locations').select('id, name').eq('campaign_id', campaignId!),
        supabase.from('map_pins').select('location_id').eq('map_id', mapId!).not('location_id', 'is', null),
      ])
      if (locError) throw locError
      if (pinError) throw pinError
      const pinnedIds = new Set((pins ?? []).map((p) => p.location_id as string))
      return (locations ?? []).filter((l) => !pinnedIds.has(l.id))
    },
  })
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image dimensions'))
    }
    img.src = url
  })
}

export function useUploadMap() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ campaignId, file }: { campaignId: string; file: File }) => {
      const { width, height } = await readImageDimensions(file)
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${campaignId}/primary-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage.from('maps').upload(path, file)
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('maps').getPublicUrl(path)

      const { error } = await supabase.from('maps').insert({
        campaign_id: campaignId,
        name: 'World Map',
        image_url: publicUrlData.publicUrl,
        width_px: width,
        height_px: height,
        is_primary: true,
      })
      if (error) throw error
    },
    onSuccess: (_void, variables) => {
      queryClient.invalidateQueries({ queryKey: ['primary-map', variables.campaignId] })
    },
  })
}

export function usePlacePin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      mapId,
      locationId,
      x,
      y,
    }: {
      mapId: string
      locationId: string
      x: number
      y: number
    }) => {
      const { error } = await supabase.from('map_pins').insert({ map_id: mapId, location_id: locationId, x, y })
      if (error) throw error
    },
    onSuccess: (_void, variables) => {
      queryClient.invalidateQueries({ queryKey: ['map-pins', variables.mapId] })
      queryClient.invalidateQueries({ queryKey: ['unpinned-locations'] })
    },
  })
}

export function useRemovePin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pinId }: { pinId: string; mapId: string }) => {
      const { error } = await supabase.from('map_pins').delete().eq('id', pinId)
      if (error) throw error
    },
    onSuccess: (_void, variables) => {
      queryClient.invalidateQueries({ queryKey: ['map-pins', variables.mapId] })
      queryClient.invalidateQueries({ queryKey: ['unpinned-locations'] })
    },
  })
}
