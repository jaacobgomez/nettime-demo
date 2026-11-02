import { beforeEach, describe, expect, it } from 'vitest'
import {
  dailySeries, dayPartOf, effectiveHours, goalProgress, imputedQuota, periodRange, profitability, shiftStats, summarize,
  unassignedMovements, validateShiftTimes,
} from './calc'
import { addDays, daysInMonth, startOfWeek } from './dates'
import { buildSeed, DEFAULT_SETTINGS } from './seed'
import { load, save, STORAGE_KEY } from './storage'
import type { AppData } from './types'

const TODAY = '2026-11-02'

function empty(): AppData {
  return { movements: [], shifts: [], settings: { ...DEFAULT_SETTINGS }, seededOn: TODAY }
}

describe('jornadas', () => {
  it('cuenta las horas de una jornada que cruza medianoche', () => {
    expect(effectiveHours({ start: '21:00', end: '04:00', breakMin: 30 })).toBe(6.5)
    expect(effectiveHours({ start: '23:30', end: '00:15', breakMin: 0 })).toBe(0.75)
  })
  it('rechaza duraciones nulas o incoherentes', () => {
    expect(validateShiftTimes('08:00', '08:00', 0).end).toBeDefined()
    expect(validateShiftTimes('08:00', '09:00', 60).breakMin).toBeDefined()
    expect(validateShiftTimes('06:00', '23:30', 0).end).toBeDefined()
    expect(validateShiftTimes('22:00', '05:00', 30)).toEqual({})
  })
  it('agrupa por franja de inicio', () => {
    expect(dayPartOf('06:00')).toBe('mañana')
    expect(dayPartOf('14:00')).toBe('tarde')
    expect(dayPartOf('21:00')).toBe('noche')
    expect(dayPartOf('02:00')).toBe('noche')
  })
})

describe('cuota imputada', () => {
  it('reparte la cuota por los días de cada mes', () => {
    expect(imputedQuota(300, '2026-11-01', '2026-11-30')).toBe(300)
    expect(imputedQuota(310, '2026-10-01', '2026-10-31')).toBe(310)
    // Semana partida entre octubre (31 días) y noviembre (30 días)
    const week = imputedQuota(310, '2026-10-26', '2026-11-01')
    expect(week).toBeCloseTo((310 / 31) * 6 + 310 / 30, 2)
  })
  it('las semanas de un mes suman la cuota del mes', () => {
    let total = 0
    for (let d = '2026-02-01'; d <= '2026-02-28'; d = addDays(d, 7)) total += imputedQuota(280, d, addDays(d, 6))
    expect(total).toBeCloseTo(280, 1)
    expect(daysInMonth('2028-02-10')).toBe(29)
  })
})

describe('resumen', () => {
  it('calcula disponible sin restar el IVA dos veces', () => {
    const data = empty()
    data.settings = { ...data.settings, monthlyQuota: 300, irpfPct: 20 }
    data.movements = [
      { id: 'a', kind: 'income', date: '2026-11-01', concept: 'x', source: 's', base: 1000, vatRate: 10, shiftId: null },
      { id: 'b', kind: 'expense', date: '2026-11-01', concept: 'y', category: 'Combustible', amount: 200, shiftId: null },
    ]
    const s = summarize(data, { from: '2026-11-01', to: '2026-11-30' }, '2026-11-30')
    expect(s.incomeBase).toBe(1000)
    expect(s.vatCollected).toBe(100)
    expect(s.operatingMargin).toBe(800)
    expect(s.quota).toBe(300)
    expect(s.irpfReserve).toBe(100) // 20 % de (800 - 300)
    expect(s.available).toBe(400)
    expect(s.taxReserve).toBe(200)
    expect(s.availablePerHour).toBeNull()
  })
  it('no aplica IRPF a resultados negativos', () => {
    const data = empty()
    data.movements = [{ id: 'b', kind: 'expense', date: TODAY, concept: 'y', category: 'Otros', amount: 500, shiftId: null }]
    data.shifts = [{ id: 'j', date: TODAY, start: '08:00', end: '10:00', breakMin: 0, activity: 'x' }]
    const s = summarize(data, { from: TODAY, to: TODAY }, TODAY)
    expect(s.irpfReserve).toBe(0)
    expect(s.available).toBeLessThan(0)
    expect(Number.isFinite(s.availablePerHour!)).toBe(true)
  })
  it('un periodo sin registros no produce NaN', () => {
    const s = summarize(empty(), periodRange('week', TODAY, empty()), TODAY)
    expect(s.hours).toBe(0)
    expect(s.availablePerHour).toBeNull()
    for (const v of [s.incomeBase, s.available, s.quota, s.irpfReserve]) expect(Number.isNaN(v)).toBe(false)
  })
  it('no imputa cuota de días futuros sin registros', () => {
    const s = summarize(empty(), periodRange('month', TODAY, empty()), TODAY)
    expect(s.quotaDays).toBe(2)
    expect(dailySeries(empty(), periodRange('week', TODAY, empty()), TODAY)).toHaveLength(1)
  })
})

describe('datos de ejemplo', () => {
  const data = buildSeed(TODAY)
  it('son deterministas y relativos a la fecha', () => {
    expect(buildSeed(TODAY)).toEqual(data)
    expect(data.shifts.some((s) => s.date === TODAY)).toBe(true)
  })
  it('las cifras del historial cuadran con la suma de los periodos', () => {
    const all = summarize(data, periodRange('all', TODAY, data), TODAY)
    const series = dailySeries(data, periodRange('all', TODAY, data), TODAY)
    const sum = series.reduce((a, p) => a + p.income, 0)
    expect(sum).toBeCloseTo(all.incomeBase, 1)
    expect(all.availablePerHour).toBeGreaterThan(0)
  })
  it('cada movimiento pertenece como mucho a una jornada y se listan los sueltos', () => {
    const stats = shiftStats(data)
    const assigned = [...stats.values()].reduce((a, s) => a + s.movementCount, 0)
    expect(assigned + unassignedMovements(data).length).toBe(data.movements.length)
  })
  it('la comparativa destaca solo grupos con jornadas suficientes', () => {
    const p = profitability(data)
    expect(p.insights.length).toBeGreaterThan(0)
    expect(p.insights[0]).toContain('martes')
    expect(p.byDayPart.every((g) => g.shifts > 0)).toBe(true)
  })
  it('estima horas para el objetivo solo con rendimiento positivo', () => {
    const month = summarize(data, periodRange('month', TODAY, data), TODAY)
    const g = goalProgress(month, 2400)
    expect(g.hoursNeeded).toBeGreaterThan(0)
    expect(goalProgress({ ...month, availablePerHour: null }, 2400).hoursNeeded).toBeNull()
    expect(goalProgress({ ...month, availablePerHour: -3 }, 2400).hoursNeeded).toBeNull()
  })
  it('la semana empieza en lunes', () => {
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02')
  })
})

describe('persistencia', () => {
  const mem = new Map<string, string>()
  beforeEach(() => {
    mem.clear()
    globalThis.localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
      key: () => null,
      length: 0,
    } as Storage
  })
  it('guarda y recupera', () => {
    const data = buildSeed(TODAY)
    data.settings.monthlyGoal = 3000
    save(data)
    const r = load('2026-12-01')
    expect(r.status).toBe('saved')
    expect(r.data.settings.monthlyGoal).toBe(3000)
  })
  it('recupera de datos dañados', () => {
    mem.set(STORAGE_KEY, '{roto')
    expect(load(TODAY).status).toBe('recovered')
    mem.set(STORAGE_KEY, JSON.stringify({ version: 1, data: { movements: 'x' } }))
    expect(load(TODAY).status).toBe('recovered')
  })
})
