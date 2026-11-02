import { ArrowDownRight, ArrowUpRight, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { isIncome, vatOf } from '../lib/calc'
import { dateMed, eur } from '../lib/format'
import type { Movement } from '../lib/types'
import { IconButton, cx } from './ui'

export function Stat({ label, value, sub, tone = 'neutral', icon, help }: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'neutral' | 'income' | 'expense' | 'brand' | 'reserve'
  icon?: ReactNode
  help?: string
}) {
  const bar = { neutral: 'bg-line', income: 'bg-income', expense: 'bg-expense', brand: 'bg-brand-600', reserve: 'bg-reserve' }[tone]
  return (
    <div className={cx('relative min-w-0 overflow-hidden rounded-2xl border bg-white p-4', tone === 'brand' ? 'border-brand-100 ring-1 ring-brand-100' : 'border-line')}>
      <span className={cx('absolute inset-y-0 left-0 w-1', bar)} aria-hidden />
      <div className="flex items-center gap-1.5 text-sm text-ink-2" title={help}>
        {icon}
        <span>{label}</span>
      </div>
      <div className={cx('num mt-1.5 truncate text-[1.6rem] leading-tight font-semibold tracking-tight', tone === 'brand' ? 'text-brand-700' : 'text-ink')}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-3">{sub}</div>}
    </div>
  )
}

export function KindTag({ m }: { m: Movement }) {
  const inc = isIncome(m)
  return (
    <span className={cx('inline-flex items-center gap-1 text-xs font-medium', inc ? 'text-brand-700' : 'text-orange-800')}>
      {inc ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
      {inc ? 'Ingreso' : 'Gasto'}
    </span>
  )
}

export function Amount({ m, className }: { m: Movement; className?: string }) {
  const inc = isIncome(m)
  return (
    <span className={cx('num font-semibold whitespace-nowrap', inc ? 'text-brand-700' : 'text-ink', className)}>
      {inc ? '+' : '−'}{eur(inc ? m.base : m.amount)}
    </span>
  )
}

export function VatNote({ m }: { m: Movement }) {
  if (!isIncome(m) || m.vatRate === 0) return null
  return <span className="num text-xs text-ink-3">+ {eur(vatOf(m))} IVA ({m.vatRate} %)</span>
}

export function MovementLine({ m, onEdit, onDelete }: { m: Movement; onEdit?: () => void; onDelete?: () => void }) {
  const inc = isIncome(m)
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-full', inc ? 'bg-brand-50 text-brand-700' : 'bg-orange-50 text-orange-700')} aria-hidden>
        {inc ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{m.concept}</p>
        <p className="truncate text-xs text-ink-3">
          {dateMed(m.date)} · <span className="sr-only">{inc ? 'Ingreso' : 'Gasto'}, </span>{inc ? m.source : m.category}
        </p>
      </div>
      <div className="flex flex-col items-end">
        <Amount m={m} className="text-sm" />
        <VatNote m={m} />
      </div>
      {(onEdit || onDelete) && (
        <div className="flex">
          {onEdit && <IconButton label={`Editar ${m.concept}`} onClick={onEdit}><Pencil className="size-4" aria-hidden /></IconButton>}
          {onDelete && <IconButton label={`Eliminar ${m.concept}`} onClick={onDelete}><Trash2 className="size-4" aria-hidden /></IconButton>}
        </div>
      )}
    </li>
  )
}

/** Barra de progreso con texto: nunca depende solo del color. */
export function Progress({ value, label, tone = 'brand' }: { value: number; label: string; tone?: 'brand' | 'reserve' }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v)}
        className="h-3 overflow-hidden rounded-full bg-canvas ring-1 ring-line ring-inset"
      >
        <div className={cx('h-full rounded-full transition-[width] duration-500', tone === 'brand' ? 'bg-brand-600' : 'bg-reserve')} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}
