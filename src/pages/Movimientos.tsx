import { Download, Link2, Minus, Plus, Search, SearchX } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Amount, KindTag, MovementLine, VatNote } from '../components/bits'
import { Button, Card, ConfirmDialog, EmptyState, IconButton, PageHeader, PeriodSelector, inputCls } from '../components/ui'
import { Pencil, Trash2 } from 'lucide-react'
import { PERIOD_LABELS, inRange, isIncome, periodRange, round2 } from '../lib/calc'
import { dateNum, eur, movementsToCSV } from '../lib/format'
import { EXPENSE_CATEGORIES, INCOME_SOURCES, type Movement } from '../lib/types'
import { useStore } from '../store'

type KindFilter = 'all' | 'income' | 'expense'

export default function Movimientos() {
  const { data, today, period, openForm, deleteMovement, notify } = useStore()
  const uid = useId()
  const [kind, setKind] = useState<KindFilter>('all')
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const [toDelete, setToDelete] = useState<Movement | null>(null)

  const range = useMemo(() => periodRange(period, today, data), [period, today, data])
  const shiftIds = useMemo(() => new Set(data.shifts.map((s) => s.id)), [data.shifts])

  const cats = kind === 'income' ? [...INCOME_SOURCES] : kind === 'expense' ? [...EXPENSE_CATEGORIES] : [...INCOME_SOURCES, ...EXPENSE_CATEGORIES]
  const catValid = cat === '' || cats.includes(cat as never)

  const rows = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('es')
    return data.movements
      .filter((m) => inRange(m.date, range))
      .filter((m) => kind === 'all' || m.kind === kind)
      .filter((m) => !catValid || cat === '' || (isIncome(m) ? m.source : m.category) === cat)
      .filter((m) => !needle || m.concept.toLocaleLowerCase('es').includes(needle))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [data.movements, range, kind, cat, catValid, q])

  const totIn = round2(rows.filter(isIncome).reduce((a, m) => a + m.base, 0))
  const totOut = round2(rows.reduce((a, m) => a + (isIncome(m) ? 0 : m.amount), 0))
  const filtered = kind !== 'all' || (catValid && cat !== '') || q.trim() !== ''

  const exportCSV = () => {
    const blob = new Blob([movementsToCSV(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nettime-movimientos-${range.from}_${range.to}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify(`Exportados ${rows.length} movimientos a CSV.`)
  }

  const clear = () => { setKind('all'); setCat(''); setQ('') }

  return (
    <>
      <PageHeader
        title="Movimientos"
        subtitle="Ingresos y gastos en una sola lista."
        actions={
          <>
            <Button variant="primary" onClick={() => openForm({ type: 'movement', kind: 'income' })}><Plus className="size-4" aria-hidden /> Añadir ingreso</Button>
            <Button onClick={() => openForm({ type: 'movement', kind: 'expense' })}><Minus className="size-4" aria-hidden /> Añadir gasto</Button>
          </>
        }
      />
      <div className="mb-4"><PeriodSelector /></div>

      <Card className="mb-4 !p-3 sm:!p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <label htmlFor={`${uid}-q`} className="sr-only">Buscar por concepto</label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <input id={`${uid}-q`} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por concepto" className={`${inputCls()} pl-9`} />
          </div>
          <div>
            <label htmlFor={`${uid}-k`} className="sr-only">Tipo</label>
            <select id={`${uid}-k`} value={kind} onChange={(e) => { setKind(e.target.value as KindFilter); setCat('') }} className={inputCls()}>
              <option value="all">Ingresos y gastos</option>
              <option value="income">Solo ingresos</option>
              <option value="expense">Solo gastos</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-c`} className="sr-only">Fuente o categoría</label>
            <select id={`${uid}-c`} value={catValid ? cat : ''} onChange={(e) => setCat(e.target.value)} className={inputCls()}>
              <option value="">Todas las fuentes y categorías</option>
              {kind !== 'expense' && <optgroup label="Fuentes de ingreso">{INCOME_SOURCES.map((c) => <option key={c}>{c}</option>)}</optgroup>}
              {kind !== 'income' && <optgroup label="Categorías de gasto">{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</optgroup>}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
          <p className="num" aria-live="polite">
            {rows.length} {rows.length === 1 ? 'movimiento' : 'movimientos'} · {PERIOD_LABELS[period].toLowerCase()}
            {rows.length > 0 && <> · <span className="font-semibold text-income-700">+{eur(totIn)}</span> / <span className="font-semibold text-expense-700">−{eur(totOut)}</span></>}
          </p>
          <div className="flex gap-2">
            {filtered && <Button size="sm" variant="ghost" onClick={clear}>Quitar filtros</Button>}
            <Button size="sm" onClick={exportCSV} disabled={rows.length === 0}><Download className="size-4" aria-hidden /> Exportar CSV</Button>
          </div>
        </div>
      </Card>

      <Card className="!p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-5" aria-hidden />}
            title={filtered ? 'Ningún movimiento coincide con los filtros' : 'No hay movimientos en este periodo'}
            action={filtered ? <Button onClick={clear}>Quitar filtros</Button> : <Button variant="primary" onClick={() => openForm({ type: 'movement', kind: 'income' })}>Añadir ingreso</Button>}
          >
            {filtered ? 'Prueba con otra búsqueda o cambia el tipo o la categoría.' : 'Cambia de periodo o registra tu primer movimiento.'}
          </EmptyState>
        ) : (
          <>
            {/* Tabla en escritorio */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <caption className="sr-only">Movimientos de {PERIOD_LABELS[period].toLowerCase()}</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs font-medium tracking-wide text-ink-3 uppercase">
                    <th scope="col" className="px-4 py-3 font-medium">Fecha</th>
                    <th scope="col" className="px-4 py-3 font-medium">Concepto</th>
                    <th scope="col" className="px-4 py-3 font-medium">Tipo</th>
                    <th scope="col" className="px-4 py-3 font-medium">Fuente o categoría</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Importe</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((m) => (
                    <tr key={m.id} className="hover:bg-canvas/60">
                      <td className="num px-4 py-2.5 whitespace-nowrap text-ink-2">{dateNum(m.date)}</td>
                      <td className="max-w-[280px] px-4 py-2.5">
                        <span className="block truncate font-medium text-ink">{m.concept}</span>
                        {m.shiftId && shiftIds.has(m.shiftId) && (
                          <span className="inline-flex items-center gap-1 text-xs text-ink-3"><Link2 className="size-3" aria-hidden /> En una jornada</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5"><KindTag m={m} /></td>
                      <td className="px-4 py-2.5 text-ink-2">{isIncome(m) ? m.source : m.category}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Amount m={m} />
                        <div><VatNote m={m} /></div>
                      </td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap">
                        <IconButton label={`Editar ${m.concept}`} onClick={() => openForm({ type: 'movement', kind: m.kind, movement: m })}><Pencil className="size-4" aria-hidden /></IconButton>
                        <IconButton label={`Eliminar ${m.concept}`} onClick={() => setToDelete(m)}><Trash2 className="size-4" aria-hidden /></IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Lista en móvil */}
            <ul className="divide-y divide-line px-3 md:hidden">
              {rows.map((m) => (
                <MovementLine key={m.id} m={m} onEdit={() => openForm({ type: 'movement', kind: m.kind, movement: m })} onDelete={() => setToDelete(m)} />
              ))}
            </ul>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return
          deleteMovement(toDelete.id)
          notify(`${toDelete.kind === 'income' ? 'Ingreso' : 'Gasto'} eliminado. Los totales se han recalculado.`)
        }}
        title={toDelete?.kind === 'income' ? '¿Eliminar este ingreso?' : '¿Eliminar este gasto?'}
        confirmLabel="Eliminar"
      >
        {toDelete && (
          <p>
            «{toDelete.concept}» del {dateNum(toDelete.date)} por {eur(isIncome(toDelete) ? toDelete.base : toDelete.amount)}. Esta acción no se puede deshacer.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
