export interface DiceRollResult {
  total: number
  rolls: number[]
  modifier: number
}

// Parses "1d12+4", "3d6+18", "2d6-2", "1d20" - the notation used throughout
// Daggerheart adversary stat blocks (attack/damage dice, feature costs).
export function rollFormula(formula: string): DiceRollResult | null {
  const match = formula.trim().match(/^(\d+)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?$/i)
  if (!match) return null
  const count = Number(match[1])
  const sides = Number(match[2])
  if (count < 1 || count > 100 || sides < 2) return null
  const sign = match[3] === '-' ? -1 : 1
  const modifier = match[4] ? sign * Number(match[4]) : 0
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides))
  const total = rolls.reduce((a, b) => a + b, 0) + modifier
  return { total, rolls, modifier }
}

// "+3" / "-1" / "3" -> "1d20+3" / "1d20-1" / "1d20+3"
export function attackRollFormula(attackModifier: string): string {
  const trimmed = attackModifier.trim()
  if (!trimmed) return '1d20'
  const sign = trimmed.startsWith('-') ? '-' : '+'
  const digits = trimmed.replace(/^[+-]/, '')
  return `1d20${sign}${digits}`
}

export function formatRollResult(result: DiceRollResult): string {
  const rollsPart = result.rolls.join(' + ')
  const modPart = result.modifier ? (result.modifier > 0 ? ` + ${result.modifier}` : ` - ${Math.abs(result.modifier)}`) : ''
  return `${rollsPart}${modPart}`
}
