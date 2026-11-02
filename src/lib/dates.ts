// Fechas de registro como cadenas locales "AAAA-MM-DD". Nunca se pasan por UTC,
// así que no hay cambios de día por zona horaria.

export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12) // mediodía: inmune a cambios de horario
}

export function isValidISO(s: unknown): s is ISODate {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return toISO(parseISO(s)) === s
}

export function todayISO(): ISODate {
  return toISO(new Date())
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function daysInMonth(s: ISODate): number {
  const d = parseISO(s)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

/** 0 = lunes … 6 = domingo */
export function weekdayMon0(s: ISODate): number {
  return (parseISO(s).getDay() + 6) % 7
}

export function startOfWeek(s: ISODate): ISODate {
  return addDays(s, -weekdayMon0(s))
}

export function startOfMonth(s: ISODate): ISODate {
  return s.slice(0, 8) + '01'
}

export function endOfMonth(s: ISODate): ISODate {
  return s.slice(0, 8) + pad(daysInMonth(s))
}

/** Días entre dos fechas, ambos incluidos. */
export function daysBetweenInclusive(from: ISODate, to: ISODate): number {
  const ms = parseISO(to).getTime() - parseISO(from).getTime()
  return Math.round(ms / 86_400_000) + 1
}

export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function isValidTime(s: unknown): s is string {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
}
