// Persistencia versionada en localStorage con recuperación segura.
import { isValidISO, isValidTime, type ISODate } from './dates'
import { buildSeed } from './seed'
import type { AppData, Movement, Settings, Shift } from './types'

export const STORAGE_KEY = 'nettime-demo'
export const STORAGE_VERSION = 1

type Stored = { version: number; data: AppData }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function validMovement(v: unknown): v is Movement {
  if (!isRec(v) || !isStr(v.id) || !isValidISO(v.date) || !isStr(v.concept)) return false
  if (!(v.shiftId === null || isStr(v.shiftId))) return false
  if (v.kind === 'income') return isStr(v.source) && isNum(v.base) && isNum(v.vatRate)
  if (v.kind === 'expense') return isStr(v.category) && isNum(v.amount)
  return false
}

function validShift(v: unknown): v is Shift {
  return isRec(v) && isStr(v.id) && isValidISO(v.date) && isValidTime(v.start) && isValidTime(v.end) &&
    isNum(v.breakMin) && isStr(v.activity) && v.start !== v.end
}

function validSettings(v: unknown): v is Settings {
  return isRec(v) && isStr(v.name) && isStr(v.activity) && isNum(v.monthlyQuota) && isNum(v.irpfPct) &&
    isNum(v.monthlyGoal) && isNum(v.setAside)
}

export function validateData(v: unknown): v is AppData {
  return isRec(v) && Array.isArray(v.movements) && v.movements.every(validMovement) &&
    Array.isArray(v.shifts) && v.shifts.every(validShift) && validSettings(v.settings) && isValidISO(v.seededOn)
}

/** Migraciones de versiones anteriores. Hoy solo existe la v1. */
function migrate(stored: { version: number; data: unknown }): unknown {
  return stored.version === STORAGE_VERSION ? stored.data : null
}

export type LoadResult = { data: AppData; status: 'saved' | 'fresh' | 'recovered' }

export function load(today: ISODate): LoadResult {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { data: buildSeed(today), status: 'fresh' }
  }
  if (raw === null) return { data: buildSeed(today), status: 'fresh' }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isRec(parsed) && isNum(parsed.version)) {
      const data = migrate(parsed as { version: number; data: unknown })
      if (validateData(data)) return { data, status: 'saved' }
    }
  } catch {
    // JSON dañado: se recupera abajo
  }
  return { data: buildSeed(today), status: 'recovered' }
}

export function save(data: AppData): boolean {
  try {
    const stored: Stored = { version: STORAGE_VERSION, data }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

export function newId(prefix: string): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${rnd}`
}
