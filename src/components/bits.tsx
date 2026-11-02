import { ArrowDownRight, ArrowUpRight, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { isIncome, vatOf } from '../lib/calc'
import { dateMed, eur } from '../lib/format'
import type { Movement } from '../lib/types'
import { IconButton, cx } from './ui'

export type Tone = 'neutral' | 'income' | 'expense' | 'margin' | 'reserve'

const SWATCH: Record<Tone, string> = {
  neutral: 'bg-ink-3',
  income: 'bg-income',
  expense: 'bg-expense',
  margin: 'bg-margin',
  reserve: 'bg-reserve',
}

/** Muestra de color de la serie: la misma que en los gráficos, así sirve de leyenda. */
export function Swatch({ tone, className }: { tone: Tone; className?: string }) {
  return <span className={cx('inline-block size-2.5 shrink-0 rounded-[3px]', SWATCH[tone], className)} aria-hidden />
}

export function Stat({ label, value, sub, tone = 'neutral' }: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: Tone
}) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-white px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-2">
        <Swatch tone={tone} />
        <span className="truncate">{label}</span>
      </div>
      <div className="figure mt-2 truncate text-[1.65rem] leading-none font-semibold text-ink sm:text-[1.85rem]">{value}</div>
      {sub && <div className="mt-2 text-[13px] leading-snug text-ink-3">{sub}</div>}
    </div>
  )
}

export function KindTag({ m }: { m: Movement }) {
  const inc = isIncome(m)
  return (
    <span className={cx('inline-flex items-center gap-1 text-xs font-semibold', inc ? 'text-income-700' : 'text-expense-700')}>
      {inc ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
      {inc ? 'Ingreso' : 'Gasto'}
    </span>
  )
}

export function Amount({ m, className }: { m: Movement; className?: string }) {
  const inc = isIncome(m)
  return (
    <span className={cx('figure font-semibold whitespace-nowrap', inc ? 'text-income-700' : 'text-expense-700', className)}>
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
    <li className="flex items-center gap-3 py-3">
      <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-full', inc ? 'bg-income-50 text-income-700' : 'bg-expense-50 text-expense-700')} aria-hidden>
        {inc ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink">{m.concept}</p>
        <p className="truncate text-xs text-ink-3">
          {dateMed(m.date)} · <span className="sr-only">{inc ? 'Ingreso' : 'Gasto'}, </span>{inc ? m.source : m.category}
        </p>
      </div>
      <div className="flex flex-col items-end">
        <Amount m={m} className="text-[15px]" />
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
export function Progress({ value, label, tone = 'margin' }: { value: number; label: string; tone?: 'margin' | 'reserve' }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className="h-3 overflow-hidden rounded-full bg-canvas ring-1 ring-line ring-inset"
    >
      <div className={cx('h-full rounded-full transition-[width] duration-700 ease-out', tone === 'margin' ? 'bg-margin' : 'bg-reserve')} style={{ width: `${v}%` }} />
    </div>
  )
}
