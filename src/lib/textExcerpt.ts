import DOMPurify from 'dompurify'

export function htmlToExcerpt(html: string, maxLen = 140): string {
  const div = document.createElement('div')
  div.innerHTML = DOMPurify.sanitize(html)
  const text = (div.textContent ?? '').replace(/\s+/g, ' ').trim()
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text
}
