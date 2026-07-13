// Where an invite-link visitor is headed while they sign in/sign up — spans
// several detours (onboarding for new users, the plain /login form) that all
// need to resume the same join afterward instead of dropping it.
const KEY = 'pendingInviteLink'

export function getPendingInviteLink(): string | null {
  return localStorage.getItem(KEY)
}

export function setPendingInviteLink(linkId: string) {
  localStorage.setItem(KEY, linkId)
}

export function clearPendingInviteLink() {
  localStorage.removeItem(KEY)
}

export function postAuthRedirectPath(): string {
  const pending = getPendingInviteLink()
  return pending ? `/join/${pending}` : '/campaigns'
}
