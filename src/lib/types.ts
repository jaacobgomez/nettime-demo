import type { ISODate } from './dates'

export const INCOME_SOURCES = ['Calle y paradas', 'Aplicación de reservas', 'Servicio concertado'] as const
export const EXPENSE_CATEGORIES = ['Combustible', 'Mantenimiento', 'Seguro', 'Teléfono', 'Limpieza', 'Otros'] as const
export const SHIFT_ACTIVITIES = ['Taxi · servicio general', 'Taxi · aeropuerto y estaciones', 'Servicio concertado'] as const
/** Fuente cuyos ingresos pagan comisión a la app (Uber, Cabify…). */
export const APP_SOURCE = 'Aplicación de reservas'

export type Income = {
  id: string
  kind: 'income'
  date: ISODate
  concept: string
  source: string
  /** Importe base, sin IVA */
  base: number
  /** Porcentaje de IVA repercutido (de ejemplo) */
  vatRate: number
  shiftId: string | null
}

export type Expense = {
  id: string
  kind: 'expense'
  date: ISODate
  concept: string
  category: string
  /** Importe pagado */
  amount: number
  shiftId: string | null
}

export type Movement = Income | Expense

export type Shift = {
  id: string
  date: ISODate
  start: string // "HH:MM"
  end: string // "HH:MM"; si es menor o igual que start, termina al día siguiente
  breakMin: number
  activity: string
}

export type Settings = {
  name: string
  activity: string
  /** Cuota mensual de autónomos, introducida por el usuario */
  monthlyQuota: number
  /** Porcentaje orientativo de reserva para IRPF */
  irpfPct: number
  /** Objetivo mensual de disponible estimado */
  monthlyGoal: number
  /** Lo que el usuario dice haber apartado ya en su hucha */
  setAside: number
  /** IVA que aplica a sus ingresos (el taxi, 10 %) */
  vatPct: number
  /** Gastos fijos al mes: seguro, emisora, gestoría… (se reparten por días, como la cuota) */
  fixedMonthly: number
  /** Comisión de las apps de reservas, en % sobre lo cobrado por la app */
  appFeePct: number
}

export type AppData = {
  movements: Movement[]
  shifts: Shift[]
  settings: Settings
  /** Fecha en que se generaron los datos de ejemplo */
  seededOn: ISODate
}

export type PeriodKey = 'week' | 'month' | 'all'
