// Datos de ejemplo relativos a la fecha de inicio de la demo. Generador determinista:
// la misma fecha produce siempre los mismos registros.
import { round2 } from './calc'
import { addDays, daysInMonth, eachDay, weekdayMon0, type ISODate } from './dates'
import type { AppData, Movement, Settings, Shift } from './types'

export const DEFAULT_SETTINGS: Settings = {
  name: 'Pablo Álvarez',
  activity: 'Taxi en Madrid · autónomo sin empleados',
  monthlyQuota: 310,
  irpfPct: 15,
  monthlyGoal: 2200,
  setAside: 900,
}

const WEEKS = 7

type Plan = { start: string; end: string; breakMin: number; rate: number; activity: string }

/** Plantilla semanal: alterna turnos para que haya mañana, tarde y noche. */
function planFor(weekday: number, week: number): Plan | null {
  const general = 'Taxi · servicio general'
  switch (weekday) {
    case 0: return { start: '06:30', end: '14:30', breakMin: 30, rate: 20, activity: general }
    case 1: return { start: '06:00', end: '14:00', breakMin: 30, rate: 27, activity: 'Taxi · aeropuerto y estaciones' }
    case 2: return { start: '15:00', end: '21:30', breakMin: 20, rate: 18, activity: general }
    case 3: return week % 2 === 0
      ? { start: '07:00', end: '15:00', breakMin: 30, rate: 21, activity: general }
      : { start: '14:30', end: '22:00', breakMin: 30, rate: 19, activity: general }
    case 4: return { start: '21:00', end: '04:00', breakMin: 30, rate: 25, activity: general }
    case 5: return { start: '22:00', end: '05:00', breakMin: 30, rate: 24, activity: general }
    default: return week % 2 === 1 ? { start: '16:00', end: '22:00', breakMin: 15, rate: 16, activity: general } : null
  }
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hoursOf(p: Plan) {
  const [sh, sm] = p.start.split(':').map(Number)
  const [eh, em] = p.end.split(':').map(Number)
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) mins += 1440
  return (mins - p.breakMin) / 60
}

export function buildSeed(today: ISODate): AppData {
  const rand = mulberry32(Number(today.replaceAll('-', '')))
  const between = (a: number, b: number) => a + rand() * (b - a)
  const shifts: Shift[] = []
  const movements: Movement[] = []
  let n = 0
  const id = (p: string) => `${p}-${++n}`

  const first = addDays(today, -WEEKS * 7 + 1)
  eachDay(first, today).forEach((date, i) => {
    const week = Math.floor(i / 7)
    const plan = planFor(weekdayMon0(date), week)
    if (!plan) return
    const shift: Shift = { id: id('j'), date, start: plan.start, end: plan.end, breakMin: plan.breakMin, activity: plan.activity }
    shifts.push(shift)

    const total = hoursOf(plan) * plan.rate * between(0.88, 1.12)
    const appShare = between(0.28, 0.42)
    const concerted = rand() < 0.2 ? round2(between(35, 60)) : 0
    const app = round2(total * appShare)
    const street = round2(total - app - concerted)
    const night = plan.start >= '21:00'
    movements.push({ id: id('m'), kind: 'income', date, concept: night ? 'Servicios nocturnos de calle' : 'Servicios de calle y paradas', source: 'Calle y paradas', base: street, vatRate: 10, shiftId: shift.id })
    movements.push({ id: id('m'), kind: 'income', date, concept: 'Carreras por aplicación', source: 'Aplicación de reservas', base: app, vatRate: 10, shiftId: shift.id })
    if (concerted) movements.push({ id: id('m'), kind: 'income', date, concept: 'Traslado concertado a empresa', source: 'Servicio concertado', base: concerted, vatRate: 10, shiftId: shift.id })
    if (rand() < 0.45) movements.push({ id: id('m'), kind: 'expense', date, concept: 'Repostaje gasóleo', category: 'Combustible', amount: round2(between(42, 68)), shiftId: shift.id })
    if (rand() < 0.15) movements.push({ id: id('m'), kind: 'expense', date, concept: 'Lavado del vehículo', category: 'Limpieza', amount: 12, shiftId: shift.id })
  })

  // Gastos fijos sin jornada asociada
  for (const date of eachDay(first, today)) {
    const day = Number(date.slice(8))
    if (day === 1) movements.push({ id: id('m'), kind: 'expense', date, concept: 'Gestoría mensual', category: 'Otros', amount: 45, shiftId: null })
    if (day === 5) movements.push({ id: id('m'), kind: 'expense', date, concept: 'Seguro del vehículo (mensualidad)', category: 'Seguro', amount: 118.4, shiftId: null })
    if (day === Math.min(10, daysInMonth(date))) movements.push({ id: id('m'), kind: 'expense', date, concept: 'Tarifa móvil y datos', category: 'Teléfono', amount: 24.9, shiftId: null })
  }
  movements.push({ id: id('m'), kind: 'expense', date: addDays(today, -26), concept: 'Cambio de aceite y filtros', category: 'Mantenimiento', amount: 186.5, shiftId: null })

  movements.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return { movements, shifts, settings: { ...DEFAULT_SETTINGS }, seededOn: today }
}
