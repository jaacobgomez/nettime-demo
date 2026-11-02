import { parseISO, type ISODate } from './dates'
import type { Movement } from './types'
import { isIncome, vatOf } from './calc'

const eurFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const eur0Fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const numFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 0 })

/** Evita "-0,00 €" */
const clean = (n: number) => (Math.abs(n) < 0.005 ? 0 : n)

export const eur = (n: number) => eurFmt.format(clean(n))
export const eur0 = (n: number) => eur0Fmt.format(clean(n))
export const perHour = (n: number | null) => (n === null ? 'Sin horas registradas' : `${eur(n)}/h`)

export function hoursLabel(h: number): string {
  const total = Math.round(h * 60)
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return mm ? `${hh} h ${mm} min` : `${hh} h`
}

export const decimalHours = (h: number) => `${numFmt.format(h)} h`

export const dateLong = (d: ISODate) =>
  parseISO(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
export const dateShort = (d: ISODate) =>
  parseISO(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
export const dateMed = (d: ISODate) =>
  parseISO(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const dateNum = (d: ISODate) => parseISO(d).toLocaleDateString('es-ES')

export function rangeLabel(from: ISODate, to: ISODate): string {
  const sameYear = from.slice(0, 4) === to.slice(0, 4)
  const f = parseISO(from).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
  const t = parseISO(to).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${f} – ${t}`
}

// ───────────── CSV ─────────────

const csvCell = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)
const csvNum = (n: number) => n.toFixed(2).replace('.', ',')

/** CSV con ";" y coma decimal, como lo abre Excel en España. */
export function movementsToCSV(movs: Movement[]): string {
  const header = ['Fecha', 'Tipo', 'Concepto', 'Fuente o categoría', 'Base / importe (€)', 'IVA %', 'IVA (€)', 'Total cobrado o pagado (€)']
  const rows = movs.map((m) => {
    if (isIncome(m)) {
      const vat = vatOf(m)
      return [dateNum(m.date), 'Ingreso', m.concept, m.source, csvNum(m.base), String(m.vatRate), csvNum(vat), csvNum(m.base + vat)]
    }
    return [dateNum(m.date), 'Gasto', m.concept, m.category, csvNum(m.amount), '', '', csvNum(m.amount)]
  })
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

/** Acepta "12,5", "12.50" y "1.234,56". */
export function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/\s|€/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replaceAll('.', '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  return Number(s)
}

