import { CalendarClock, CalendarPlus, Link2Off, Moon, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MovementLine, Stat } from '../components/bits'
import { Badge, Button, Card, CardTitle, ConfirmDialog, EmptyState, Help, IconButton, PageHeader, PeriodSelector } from '../components/ui'
import { PERIOD_LABELS, crossesMidnight, dayPartOf, inRange, periodRange, shiftStats, unassignedMovements } from '../lib/calc'
import { cap, dateMed, eur, hoursLabel, perHour } from '../lib/format'
import type { Shift } from '../lib/types'
import { useStore } from '../store'

export default function Jornadas() {
  const { data, today, period, openForm, deleteShift, notify } = useStore()
  const [toDelete, setToDelete] = useState<Shift | null>(null)
  const [showAll, setShowAll] = useState(false)

  const range = useMemo(() => periodRange(period, today, data), [period, today, data])
  const stats = useMemo(() => shiftStats(data), [data])
  const list = useMemo(
    () => [...stats.values()].filter((s) => inRange(s.shift.date, range)).sort((a, b) => (a.shift.date + a.shift.start < b.shift.date + b.shift.start ? 1 : -1)),
    [stats, range],
  )
  const loose = useMemo(() => unassignedMovements(data).filter((m) => inRange(m.date, range)).sort((a, b) => (a.date < b.date ? 1 : -1)), [data, range])

  const hours = list.reduce((a, s) => a + s.hours, 0)
  const margin = list.reduce((a, s) => a + s.margin, 0)
  const empty = list.filter((s) => s.movementCount === 0).length

  return (
    <>
      <PageHeader
        title="Jornadas y horas"
        subtitle="Cuánto trabajas y qué rinde cada jornada."
        actions={<Button variant="primary" onClick={() => openForm({ type: 'shift' })}><CalendarPlus className="size-4" aria-hidden /> Registrar jornada</Button>}
      />
      <div className="mb-4"><PeriodSelector /></div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Horas trabajadas" value={hoursLabel(hours)} sub="Horas efectivas, sin descansos" />
        <Stat label="Jornadas" value={list.length} sub={empty ? `${empty} sin movimientos asociados` : 'Todas con movimientos'} />
        <div className="col-span-2 lg:col-span-1">
          <Stat label="Margen operativo por hora" tone="brand" value={hours > 0 ? perHour(margin / hours) : <span className="text-lg text-ink-3">Sin horas registradas</span>} sub="De los movimientos asociados a jornadas" />
        </div>
      </div>

      <Card className="!p-0" aria-labelledby="lista-jornadas">
        <h2 id="lista-jornadas" className="sr-only">Jornadas de {PERIOD_LABELS[period].toLowerCase()}</h2>
        {list.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="size-5" aria-hidden />}
            title="No hay jornadas en este periodo"
            action={<Button variant="primary" onClick={() => openForm({ type: 'shift' })}>Registrar jornada</Button>}
          >
            Registra inicio, fin y descanso para calcular tus horas efectivas.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {list.map(({ shift: s, hours: h, incomeBase, expenses, marginPerHour, movementCount }) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap">
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{cap(dateMed(s.date))}</p>
                    <span className="num text-sm text-ink-2">{s.start}–{s.end}</span>
                    {crossesMidnight(s) && <Badge><Moon className="size-3" aria-hidden /> Termina al día siguiente</Badge>}
                  </div>
                  <p className="text-xs text-ink-3">
                    {s.activity} · {dayPartOf(s.start)} · {hoursLabel(h)} efectivas{s.breakMin ? ` (descanso ${s.breakMin} min)` : ''}
                  </p>
                </div>
                <div className="num flex-1 text-sm sm:flex-none sm:text-right">
                  {movementCount === 0 ? (
                    <span className="text-ink-3">Sin movimientos asociados</span>
                  ) : (
                    <>
                      <p><span className="text-brand-700">+{eur(incomeBase)}</span>{expenses > 0 && <span className="text-ink-2"> · −{eur(expenses)}</span>}</p>
                      <p className="text-xs text-ink-3">{perHour(marginPerHour)} de margen</p>
                    </>
                  )}
                </div>
                <div className="flex shrink-0">
                  <IconButton label={`Editar jornada del ${dateMed(s.date)}`} onClick={() => openForm({ type: 'shift', shift: s })}><Pencil className="size-4" aria-hidden /></IconButton>
                  <IconButton label={`Eliminar jornada del ${dateMed(s.date)}`} onClick={() => setToDelete(s)}><Trash2 className="size-4" aria-hidden /></IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4" aria-labelledby="sueltos">
        <CardTitle id="sueltos">Movimientos sin asociar · {loose.length}</CardTitle>
        <p className="text-sm text-ink-2">
          Cuentan en el resumen y en la reserva fiscal, pero no en la comparativa de días y horarios, porque no pertenecen a ninguna jornada.
          Suelen ser gastos fijos como el seguro, el teléfono o la gestoría.
        </p>
        {loose.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-3"><Link2Off className="size-4" aria-hidden /> Todos los movimientos del periodo están asociados.</p>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-line">
              {(showAll ? loose : loose.slice(0, 5)).map((m) => (
                <MovementLine key={m.id} m={m} onEdit={() => openForm({ type: 'movement', kind: m.kind, movement: m })} />
              ))}
            </ul>
            {loose.length > 5 && (
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? 'Mostrar menos' : `Mostrar los ${loose.length}`}
              </Button>
            )}
          </>
        )}
        <Help summary="¿Cómo se asocian?">
          <p>Al registrar o editar una jornada, marca los movimientos de ese día (y del siguiente si termina después de medianoche). También puedes elegir la jornada desde el formulario de cada movimiento.</p>
          <p>Cada movimiento solo puede estar en una jornada, así que nunca se cuenta dos veces. Si borras una jornada, sus movimientos se conservan y pasan a estar sin asociar.</p>
        </Help>
      </Card>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return
          deleteShift(toDelete.id)
          notify('Jornada eliminada. Sus movimientos se conservan sin asociar.')
        }}
        title="¿Eliminar esta jornada?"
        confirmLabel="Eliminar jornada"
      >
        {toDelete && <p>Jornada del {dateMed(toDelete.date)}, {toDelete.start}–{toDelete.end}. Sus ingresos y gastos no se borran: quedan sin asociar.</p>}
      </ConfirmDialog>
    </>
  )
}
