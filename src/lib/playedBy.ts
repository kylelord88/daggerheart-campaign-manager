// Shared "Played By" resolution for a character linked to a player
// (characters.player_user_id), used on both the character detail view
// (EntityFormPage's PlayerValueView) and the Dashboard's Party section.
//
// Precedence:
//   1. campaign_members.display_name for the linked player, if set
//   2. characters.played_by_override (a GM-set fallback label), if set
//   3. the linked player's email - GM view only, so the GM can still see
//      who's linked even when nothing else is set
//   4. null (nothing shown)
export interface PlayedByInputs {
  displayName?: string | null
  override?: string | null
  email?: string | null
  isGm: boolean
}

export function resolvePlayedBy({ displayName, override, email, isGm }: PlayedByInputs): string | null {
  if (displayName) return displayName
  if (override) return override
  if (isGm && email) return email
  return null
}
