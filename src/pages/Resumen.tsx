import { CalendarClock, Clock, Minus, Plus, Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { Stat, MovementLine } from '../components/bits'
import { Button, Card, CardTitle, EmptyState, Help, PageHeader, PeriodSelector, cx } from '../components/ui'
import { PERIOD_LABELS, dailySeries, inRange, periodRange, summarize, type DailyPoint, type Summary } from '../lib/calc'
import { cap, dateMed, dateShort, eur, eur0, hoursLabel, perHour } from '../lib/format'
import { useStore } from '../store'

export function QuickActions() {
  const { openForm } = useStore()
  return (
    <>
      <Button variant="primary" onClick={() => openForm({ type: 'movement', kind: 'income' })}>
        <Plus className="size-4" aria-hidden /> Añadir ingreso
      </Button>
      <Button onClick={() => openForm({ type: 'movement', kind: 'expense' })}>
        <Minus className="size-4" aria-hidden /> Añadir gasto
      </Button>
      <Button onClick={() => openForm({ type: 'shift' })}>
        <CalendarClock className="size-4" aria-hidden /> Registrar jornada
      </Button>
    </>
  )
}

function Breakdown({ s }: { s: Summary }) {
  const max = Math.max(s.incomeBase, s.expenses + s.quota + s.irpfReserve, 1)
  const rows = [
    { label: 'Ingresos sin IVA', value: s.incomeBase, sign: '', color: 'bg-income' },
    { label: 'Gastos registrados', value: s.expenses, sign: '−', color: 'bg-expense' },
    { label: `Cuota imputada (${s.quotaDays} ${s.quotaDays === 1 ? 'día' : 'días'})`, value: s.quota, sign: '−', color: 'bg-quota' },
    { label: 'Reserva orientativa IRPF', value: s.irpfReserve, sign: '−', color: 'bg-reserve' },
  ]
  const negative = s.available < 0
  return (
    <div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink-2">{r.label}</span>
              <span className="num font-medium text-ink">{r.sign}{eur(r.value)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-canvas">
              <div className={cx('h-full rounded-full transition-[width] duration-500', r.color)} style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
        <li className="border-t border-line pt-3">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="font-semibold text-ink">= Disponible estimado</span>
            <span className={cx('num text-lg font-semibold', negative ? 'text-red-700' : 'text-brand-700')}>{eur(s.available)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-canvas">
            <div
              className={cx('h-full rounded-full transition-[width] duration-500', negative ? 'bg-red-600' : 'bg-brand-600')}
              style={{ width: `${(Math.abs(s.available) / max) * 100}%` }}
            />
          </div>
          {negative && <p className="mt-1 text-xs font-medium text-red-700">Resultado negativo: los gastos y la cuota superan a los ingresos del periodo.</p>}
        </li>
      </ul>
      <p className="num mt-4 rounded-lg bg-canvas px-3 py-2 text-xs text-ink-2">
        Además has cobrado <strong className="text-ink">{eur(s.vatCollected)}</strong> de IVA. No es tuyo: no entra en los ingresos y va directo a la reserva fiscal.
      </p>
      <Help summary="¿Qué se descuenta para el disponible?">
        <p><strong>Ingresos sin IVA</strong> (las bases que registras) <strong>− gastos</strong> = margen operativo.</p>
        <p>Al margen se le resta la <strong>cuota de autónomos imputada</strong>: tu cuota mensual repartida por días según los días de cada mes, solo hasta hoy.</p>
        <p>Después, la <strong>reserva orientativa para IRPF</strong>: un porcentaje que tú eliges sobre lo que queda, si es positivo.</p>
        <p>El IVA cobrado nunca se suma, así que no se descuenta dos veces. Esta demo no recupera IVA soportado ni decide qué gastos son deducibles.</p>
      </Help>
    </div>
  )
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as DailyPoint
  return (
    <div className="num rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{cap(dateMed(p.date))}</p>
      <p className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-income" aria-hidden />Ingresos sin IVA: <strong className="ml-auto">{eur(p.income)}</strong></p>
      <p className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-expense" aria-hidden />Gastos: <strong className="ml-auto">{eur(p.expenses)}</strong></p>
      <p className="flex items-center gap-2"><span className="h-0.5 w-2.5 bg-ink" aria-hidden />Margen operativo: <strong className="ml-auto">{eur(p.margin)}</strong></p>
      <p className="mt-1 text-ink-3">{p.hours > 0 ? `${hoursLabel(p.hours)} trabajadas` : 'Sin jornada registrada'}</p>
    </div>
  )
}

function DailyChart({ points }: { points: DailyPoint[] }) {
  const hasData = points.some((p) => p.income || p.expenses)
  if (!hasData) {
    return (
      <EmptyState icon={<Receipt className="size-5" aria-hidden />} title="Sin movimientos en este periodo">
        Añade un ingreso o un gasto, o consulta otro periodo.
      </EmptyState>
    )
  }
  return (
    <div className="h-64 sm:h-72" role="img" aria-label={`Gráfico de ingresos, gastos y margen por día. ${points.length} días.`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="#e8ecea" />
          <XAxis dataKey="date" tickFormatter={dateShort} tick={{ fontSize: 11, fill: '#637170' }} tickLine={false} axisLine={{ stroke: '#e2e7e5' }} minTickGap={16} />
          <YAxis tickFormatter={(v: number) => eur0(v)} tick={{ fontSize: 11, fill: '#637170' }} tickLine={false} axisLine={false} width={64} />
          <Tooltip content={ChartTooltip} cursor={{ fill: 'rgba(15,148,136,0.06)' }} />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} formatter={(v) => <span style={{ color: '#4a5754' }}>{v}</span>} />
          <Bar dataKey="income" name="Ingresos sin IVA" fill="#0f9488" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expenses" name="Gastos" fill="#dd6a30" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Line dataKey="margin" name="Margen operativo" type="monotone" stroke="#14201d" strokeWidth={2} dot={points.length <= 10 ? { r: 3 } : false} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Resumen() {
  const { data, today, period } = useStore()
  const range = useMemo(() => periodRange(period, today, data), [period, today, data])
  const s = useMemo(() => summarize(data, range, today), [data, range, today])
  const points = useMemo(() => dailySeries(data, range, today), [data, range, today])
  const all = useMemo(() => summarize(data, periodRange('all', today, data), today), [data, today])
  const recent = useMemo(
    () => data.movements.filter((m) => inRange(m.date, range)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 6),
    [data.movements, range],
  )
  const pendingAll = Math.max(0, all.taxReserve - data.settings.setAside)
  const firstName = data.settings.name.split(' ')[0] || 'autónomo'

  return (
    <>
      <PageHeader title={`Hola, ${firstName}`} subtitle="Lo que ganas, de verdad: después de gastos, cuota e impuestos." actions={<QuickActions />} />

      <div className="mb-5"><PeriodSelector /></div>

      <h2 className="sr-only">Cifras de {PERIOD_LABELS[period].toLowerCase()}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos sin IVA" tone="income" icon={<TrendingUp className="size-4" aria-hidden />} value={eur(s.incomeBase)} sub={`+ ${eur(s.vatCollected)} de IVA cobrado`} />
        <Stat label="Gastos" tone="expense" icon={<TrendingDown className="size-4" aria-hidden />} value={eur(s.expenses)} sub={`Margen operativo: ${eur(s.operatingMargin)}`} />
        <Stat label="Disponible estimado" tone="brand" icon={<Wallet className="size-4" aria-hidden />} value={eur(s.available)} sub="Tras gastos, cuota y reserva IRPF" />
        <Stat
          label="Disponible por hora"
          tone="brand"
          icon={<Clock className="size-4" aria-hidden />}
          value={s.availablePerHour === null ? <span className="text-lg text-ink-3">Sin horas registradas</span> : perHour(s.availablePerHour)}
          sub={s.hours > 0 ? `${hoursLabel(s.hours)} trabajadas · ${s.shiftCount} ${s.shiftCount === 1 ? 'jornada' : 'jornadas'}` : 'Registra una jornada para calcularlo'}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" aria-labelledby="evol">
          <CardTitle id="evol">Evolución diaria</CardTitle>
          <DailyChart points={points} />
        </Card>
        <Card className="lg:col-span-2" aria-labelledby="desglose">
          <CardTitle id="desglose">De lo que facturas a lo que te queda</CardTitle>
          <Breakdown s={s} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2" aria-labelledby="reserva">
          <CardTitle id="reserva" aside={<a href="#/impuestos" className="text-sm font-medium text-brand-700 hover:underline">Ver hucha</a>}>
            Reserva fiscal del periodo
          </CardTitle>
          <dl className="num space-y-2 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-ink-2">IVA cobrado</dt><dd>{eur(s.vatCollected)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-ink-2">Reserva IRPF ({data.settings.irpfPct} %)</dt><dd>{eur(s.irpfReserve)}</dd></div>
            <div className="flex justify-between gap-2 border-t border-line pt-2 text-base font-semibold"><dt>Total a reservar</dt><dd className="text-reserve">{eur(s.taxReserve)}</dd></div>
            <div className="flex justify-between gap-2 text-ink-3"><dt>Cuota de autónomos (aparte)</dt><dd>{eur(s.quota)}</dd></div>
          </dl>
          <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-xs text-ink-2">
            En todo el historial llevas apartados {eur(data.settings.setAside)} de {eur(all.taxReserve)}.{' '}
            {pendingAll > 0 ? <>Te faltan <strong className="text-ink">{eur(pendingAll)}</strong>.</> : <strong className="text-ink">Vas al día.</strong>}
          </p>
        </Card>

        <Card className="lg:col-span-3" aria-labelledby="ultimos">
          <CardTitle id="ultimos" aside={<a href="#/movimientos" className="text-sm font-medium text-brand-700 hover:underline">Ver todos</a>}>
            Últimos movimientos
          </CardTitle>
          {recent.length === 0 ? (
            <EmptyState icon={<Receipt className="size-5" aria-hidden />} title="Sin movimientos en este periodo" />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((m) => <MovementLine key={m.id} m={m} />)}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
