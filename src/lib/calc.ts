// Módulo de cálculo único. Todas las pantallas sacan sus cifras de aquí.
import {
  addDays, daysInMonth, eachDay, endOfMonth, minutesOf, startOfMonth, startOfWeek, weekdayMon0,
  type ISODate,
} from './dates'
import type { AppData, Expense, Income, Movement, PeriodKey, Shift } from './types'

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const isIncome = (m: Movement): m is Income => m.kind === 'income'
export const isExpense = (m: Movement): m is Expense => m.kind === 'expense'

export const vatOf = (m: Income) => round2((m.base * m.vatRate) / 100)

/** Lo que mueve el movimiento en el resultado: base para ingresos, importe pagado para gastos. */
export const netAmount = (m: Movement) => (isIncome(m) ? m.base : m.amount)

// ───────────── Jornadas ─────────────

export const crossesMidnight = (s: Pick<Shift, 'start' | 'end'>) => minutesOf(s.end) <= minutesOf(s.start)

export function grossMinutes(s: Pick<Shift, 'start' | 'end'>): number {
  const diff = minutesOf(s.end) - minutesOf(s.start)
  return diff > 0 ? diff : diff + 1440
}

export function effectiveMinutes(s: Pick<Shift, 'start' | 'end' | 'breakMin'>): number {
  return Math.max(0, grossMinutes(s) - s.breakMin)
}

export const effectiveHours = (s: Pick<Shift, 'start' | 'end' | 'breakMin'>) => effectiveMinutes(s) / 60

export type ShiftErrors = Partial<Record<'date' | 'start' | 'end' | 'breakMin' | 'activity', string>>

export function validateShiftTimes(start: string, end: string, breakMin: number): ShiftErrors {
  const e: ShiftErrors = {}
  if (start === end) e.end = 'La hora de fin no puede ser igual a la de inicio.'
  else {
    const gross = grossMinutes({ start, end })
    if (gross > 16 * 60) e.end = 'La jornada supera las 16 horas. Revisa la hora de fin.'
    if (!Number.isInteger(breakMin) || breakMin < 0) e.breakMin = 'Indica los minutos de descanso (0 o más).'
    else if (breakMin >= gross) e.breakMin = 'El descanso no puede ocupar toda la jornada.'
  }
  return e
}

export type DayPart = 'mañana' | 'tarde' | 'noche'
export const DAY_PARTS: DayPart[] = ['mañana', 'tarde', 'noche']
export const DAY_PART_RANGES: Record<DayPart, string> = {
  mañana: '05:00–13:59',
  tarde: '14:00–20:59',
  noche: '21:00–04:59',
}

/** Franja según la hora de inicio de la jornada. */
export function dayPartOf(start: string): DayPart {
  const h = Math.floor(minutesOf(start) / 60)
  if (h >= 5 && h < 14) return 'mañana'
  if (h >= 14 && h < 21) return 'tarde'
  return 'noche'
}

// ───────────── Periodos ─────────────

export type Range = { from: ISODate; to: ISODate }

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  week: 'Esta semana',
  month: 'Este mes',
  all: 'Todo el historial',
}

function recordDates(data: AppData): ISODate[] {
  return [...data.movements.map((m) => m.date), ...data.shifts.map((s) => s.date)]
}

export function periodRange(key: PeriodKey, today: ISODate, data: AppData): Range {
  if (key === 'week') {
    const from = startOfWeek(today)
    return { from, to: addDays(from, 6) }
  }
  if (key === 'month') return { from: startOfMonth(today), to: endOfMonth(today) }
  const dates = recordDates(data)
  if (dates.length === 0) return { from: today, to: today }
  const min = dates.reduce((a, b) => (a < b ? a : b))
  const max = dates.reduce((a, b) => (a > b ? a : b))
  return { from: min < today ? min : today, to: max > today ? max : today }
}

export const inRange = (d: ISODate, r: Range) => d >= r.from && d <= r.to

/**
 * Último día que cuenta para imputar cuota: hoy, o el último registro del periodo si es
 * posterior. Así un mes a medias no carga la cuota de días que aún no han pasado.
 */
export function imputationEnd(data: AppData, r: Range, today: ISODate): ISODate | null {
  let end = today
  for (const d of recordDates(data)) if (inRange(d, r) && d > end) end = d
  if (end > r.to) end = r.to
  return end < r.from ? null : end
}

/** Cuota diaria según los días de cada mes, sumada sobre los días del periodo. */
export function imputedQuota(monthlyQuota: number, from: ISODate, to: ISODate | null): number {
  if (to === null || to < from || monthlyQuota <= 0) return 0
  let total = 0
  for (const d of eachDay(from, to)) total += monthlyQuota / daysInMonth(d)
  return round2(total)
}

// ───────────── Resumen de un periodo ─────────────

export type Summary = {
  range: Range
  quotaDays: number
  incomeBase: number
  vatCollected: number
  expenses: number
  operatingMargin: number
  quota: number
  irpfReserve: number
  available: number
  taxReserve: number
  minutes: number
  hours: number
  shiftCount: number
  movementCount: number
  /** null cuando no hay horas registradas */
  availablePerHour: number | null
  marginPerHour: number | null
  /** Ingresos sin IVA por hora trabajada: lo que "parece" que ganas */
  billedPerHour: number | null
  /** De cada 100 € facturados sin IVA, cuántos quedan disponibles */
  keptPer100: number | null
}

export function summarize(data: AppData, r: Range, today: ISODate): Summary {
  const movs = data.movements.filter((m) => inRange(m.date, r))
  const shifts = data.shifts.filter((s) => inRange(s.date, r))

  const incomeBase = round2(movs.filter(isIncome).reduce((a, m) => a + m.base, 0))
  const vatCollected = round2(movs.filter(isIncome).reduce((a, m) => a + vatOf(m), 0))
  const expenses = round2(movs.filter(isExpense).reduce((a, m) => a + m.amount, 0))
  const operatingMargin = round2(incomeBase - expenses)

  const end = imputationEnd(data, r, today)
  const quota = imputedQuota(data.settings.monthlyQuota, r.from, end)
  const quotaDays = end === null ? 0 : eachDay(r.from, end).length

  const irpfBase = Math.max(0, operatingMargin - quota)
  const irpfReserve = round2((irpfBase * data.settings.irpfPct) / 100)
  const available = round2(operatingMargin - quota - irpfReserve)

  const minutes = shifts.reduce((a, s) => a + effectiveMinutes(s), 0)
  const hours = minutes / 60

  return {
    range: r,
    quotaDays,
    incomeBase,
    vatCollected,
    expenses,
    operatingMargin,
    quota,
    irpfReserve,
    available,
    taxReserve: round2(vatCollected + irpfReserve),
    minutes,
    hours,
    shiftCount: shifts.length,
    movementCount: movs.length,
    availablePerHour: minutes > 0 ? round2(available / hours) : null,
    marginPerHour: minutes > 0 ? round2(operatingMargin / hours) : null,
    billedPerHour: minutes > 0 ? round2(incomeBase / hours) : null,
    keptPer100: incomeBase > 0 ? Math.round((available / incomeBase) * 100) : null,
  }
}

export type DailyPoint = {
  date: ISODate
  income: number
  expenses: number
  margin: number
  hours: number
}

export function dailySeries(data: AppData, r: Range, today: ISODate): DailyPoint[] {
  const end = imputationEnd(data, r, today)
  if (end === null) return []
  const map = new Map<ISODate, DailyPoint>()
  for (const d of eachDay(r.from, end)) map.set(d, { date: d, income: 0, expenses: 0, margin: 0, hours: 0 })
  for (const m of data.movements) {
    const p = map.get(m.date)
    if (!p) continue
    if (isIncome(m)) p.income += m.base
    else p.expenses += m.amount
  }
  for (const s of data.shifts) {
    const p = map.get(s.date)
    if (p) p.hours += effectiveHours(s)
  }
  return [...map.values()].map((p) => ({
    ...p,
    income: round2(p.income),
    expenses: round2(p.expenses),
    margin: round2(p.income - p.expenses),
    hours: Math.round(p.hours * 100) / 100,
  }))
}

// ───────────── Jornadas con sus movimientos ─────────────

export type ShiftStats = {
  shift: Shift
  hours: number
  incomeBase: number
  expenses: number
  margin: number
  movementCount: number
  marginPerHour: number | null
}

export function shiftStats(data: AppData): Map<string, ShiftStats> {
  const out = new Map<string, ShiftStats>()
  for (const s of data.shifts) {
    out.set(s.id, { shift: s, hours: effectiveHours(s), incomeBase: 0, expenses: 0, margin: 0, movementCount: 0, marginPerHour: null })
  }
  for (const m of data.movements) {
    const st = m.shiftId ? out.get(m.shiftId) : undefined
    if (!st) continue
    st.movementCount++
    if (isIncome(m)) st.incomeBase += m.base
    else st.expenses += m.amount
  }
  for (const st of out.values()) {
    st.incomeBase = round2(st.incomeBase)
    st.expenses = round2(st.expenses)
    st.margin = round2(st.incomeBase - st.expenses)
    st.marginPerHour = st.hours > 0 ? round2(st.margin / st.hours) : null
  }
  return out
}

/** Movimientos sin jornada (o cuya jornada ya no existe). */
export function unassignedMovements(data: AppData): Movement[] {
  const ids = new Set(data.shifts.map((s) => s.id))
  return data.movements.filter((m) => !m.shiftId || !ids.has(m.shiftId))
}

// ───────────── Rentabilidad por días y franjas ─────────────

/** Mínimo de jornadas para destacar un resultado. */
export const MIN_OBS = 3

export type Reliability = 'insuficiente' | 'orientativo' | 'suficiente'

export type Group = {
  key: string
  label: string
  shifts: number
  hours: number
  margin: number
  marginPerHour: number | null
  reliability: Reliability
}

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export const reliabilityOf = (n: number): Reliability => (n === 0 ? 'insuficiente' : n < MIN_OBS ? 'orientativo' : 'suficiente')

function group(key: string, label: string, items: ShiftStats[]): Group {
  const hours = items.reduce((a, s) => a + s.hours, 0)
  const margin = round2(items.reduce((a, s) => a + s.margin, 0))
  return {
    key,
    label,
    shifts: items.length,
    hours,
    margin,
    marginPerHour: hours > 0 ? round2(margin / hours) : null,
    reliability: reliabilityOf(items.length),
  }
}

export type Profitability = {
  /** Jornadas que entran en la comparativa (con horas y al menos un movimiento asociado) */
  considered: ShiftStats[]
  /** Jornadas registradas sin movimientos asociados: no entran */
  excluded: number
  byWeekday: Group[]
  byDayPart: Group[]
  byCombo: Group[]
  insights: string[]
}

const fmtRate = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n) + '/h'

export function profitability(data: AppData, r?: Range): Profitability {
  const stats = [...shiftStats(data).values()].filter((s) => !r || inRange(s.shift.date, r))
  const considered = stats.filter((s) => s.hours > 0 && s.movementCount > 0)
  const excluded = stats.length - considered.length

  const byWeekday = WEEKDAYS.map((label, i) =>
    group(String(i), label, considered.filter((s) => weekdayMon0(s.shift.date) === i)),
  )
  const byDayPart = DAY_PARTS.map((p) =>
    group(p, p[0].toUpperCase() + p.slice(1), considered.filter((s) => dayPartOf(s.shift.start) === p)),
  )
  const byCombo: Group[] = []
  WEEKDAYS.forEach((wd, i) =>
    DAY_PARTS.forEach((p) => {
      const items = considered.filter((s) => weekdayMon0(s.shift.date) === i && dayPartOf(s.shift.start) === p)
      if (items.length) byCombo.push(group(`${i}-${p}`, `${p === 'noche' ? 'la noche' : p === 'tarde' ? 'la tarde' : 'la mañana'} del ${wd.toLowerCase()}`, items))
    }),
  )

  const insights: string[] = []
  const solid = <T extends Group>(gs: T[]) =>
    gs.filter((g) => g.reliability === 'suficiente' && g.marginPerHour !== null).sort((a, b) => b.marginPerHour! - a.marginPerHour!)

  const combos = solid(byCombo)
  if (combos.length >= 2) {
    const best = combos[0]
    insights.push(`En tus registros, ${best.label} presenta el mayor margen operativo por hora: ${fmtRate(best.marginPerHour!)} en ${best.shifts} jornadas.`)
  }
  const parts = solid(byDayPart)
  if (parts.length >= 2) {
    const best = parts[0]
    const worst = parts[parts.length - 1]
    insights.push(`Las jornadas que empiezan por la ${best.key} rinden ${fmtRate(best.marginPerHour!)}, frente a ${fmtRate(worst.marginPerHour!)} de las que empiezan por la ${worst.key}.`)
  }
  const days = solid(byWeekday)
  if (days.length >= 2) {
    const worst = days[days.length - 1]
    insights.push(`El ${worst.label.toLowerCase()} es el día con menor margen por hora (${fmtRate(worst.marginPerHour!)} en ${worst.shifts} jornadas).`)
  }

  return { considered, excluded, byWeekday, byDayPart, byCombo, insights }
}

// ───────────── Objetivo mensual ─────────────

export type GoalProgress = {
  goal: number
  current: number
  pct: number
  remaining: number
  reached: boolean
  /** null si no hay horas o el rendimiento medio no es positivo */
  hoursNeeded: number | null
  perHour: number | null
}

export function goalProgress(month: Summary, goal: number): GoalProgress {
  const remaining = round2(Math.max(0, goal - month.available))
  const reached = goal > 0 && month.available >= goal
  const perHour = month.availablePerHour
  const hoursNeeded = !reached && perHour !== null && perHour > 0 && remaining > 0 ? remaining / perHour : null
  return {
    goal,
    current: month.available,
    pct: goal > 0 ? Math.max(0, Math.min(100, (month.available / goal) * 100)) : 0,
    remaining,
    reached,
    hoursNeeded,
    perHour,
  }
}
