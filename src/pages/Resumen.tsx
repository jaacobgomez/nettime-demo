import { CalendarClock, Minus, Plus, Receipt } from 'lucide-react'
import { useMemo } from 'react'
import { Area, Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { MovementLine, Stat, Swatch } from '../components/bits'
import { Counter } from '../components/Counter'
import { Button, Card, CardTitle, EmptyState, Help, PageHeader, PeriodSelector, cx } from '../components/ui'
import { PERIOD_LABELS, dailySeries, inRange, periodRange, summarize, type DailyPoint, type Summary } from '../lib/calc'
import { cap, dateMed, dateShort, eur, eur0, hoursLabel } from '../lib/format'
import { useStore } from '../store'

const C = { income: '#2f6fde', expense: '#e5484d', margin: '#1f9d6b', grid: '#ebe8e1', axis: '#636b67' }

export function QuickActions() {
  const { openForm } = useStore()
  return (
    <div data-tour="actions" className="flex flex-wrap gap-2">
      <Button variant="primary" onClick={() => openForm({ type: 'movement', kind: 'income' })}>
        <Plus className="size-4" aria-hidden /> Añadir ingreso
      </Button>
      <Button onClick={() => openForm({ type: 'movement', kind: 'expense' })}>
        <Minus className="size-4" aria-hidden /> Añadir gasto
      </Button>
      <Button onClick={() => openForm({ type: 'shift' })}>
        <CalendarClock className="size-4" aria-hidden /> Registrar jornada
      </Button>
    </div>
  )
}

function Hero({ s, label }: { s: Summary; label: string }) {
  const neg = s.available < 0
  const billed = s.billedPerHour
  const kept = s.availablePerHour
  const scale = billed && billed > 0 ? billed : 1
  return (
    <section data-tour="hero" aria-labelledby="hero-title" className="grid-paper relative overflow-hidden rounded-2xl bg-ink p-6 text-white sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div>
          <h2 id="hero-title" className="font-sans text-sm font-medium text-white/65">Disponible estimado · {label.toLowerCase()}</h2>
          <p className={cx('figure mt-2 text-[2.9rem] leading-none font-semibold sm:text-[4rem]', neg ? 'text-[#ff9a9d]' : 'text-mint')}><Counter value={s.available} format={eur} /></p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/75">
            {s.keptPer100 === null
              ? 'Aún no hay ingresos en este periodo.'
              : neg
                ? 'Los gastos y la cuota superan a lo que has facturado en este periodo.'
                : <>De cada <strong className="text-white">100 €</strong> que facturas, te quedan <strong className="figure text-mint"><Counter value={s.keptPer100} format={(n) => `${Math.round(n)} €`} /></strong>.</>}
          </p>
        </div>

        <div className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10 sm:p-5">
          {billed === null || kept === null ? (
            <p className="text-sm text-white/70">Sin horas registradas. Registra una jornada para ver cuánto ganas por hora.</p>
          ) : (
            <dl className="space-y-4">
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="flex items-center gap-2 text-sm text-white/70"><Swatch tone="income" /> Facturas por hora</dt>
                  <dd className="figure text-xl font-semibold"><Counter value={billed} format={eur} /></dd>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-white/10"><div className="h-full w-full rounded-full bg-income" /></div>
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="flex items-center gap-2 text-sm text-white/70"><Swatch tone="margin" /> Te quedan por hora</dt>
                  <dd className={cx('figure text-[1.9rem] leading-none font-semibold', kept < 0 ? 'text-[#ff9a9d]' : 'text-mint')}><Counter value={kept} format={eur} /></dd>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-mint transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, (kept / scale) * 100))}%` }} />
                </div>
              </div>
              <p className="text-xs text-white/55">{hoursLabel(s.hours)} trabajadas en {s.shiftCount} {s.shiftCount === 1 ? 'jornada' : 'jornadas'}. Facturado sin IVA.</p>
            </dl>
          )}
        </div>
      </div>
    </section>
  )
}

function Breakdown({ s }: { s: Summary }) {
  const max = Math.max(s.incomeBase, s.expenses + s.quota + s.irpfReserve, 1)
  const rows = [
    { label: 'Ingresos sin IVA', value: s.incomeBase, sign: '', color: 'bg-income' },
    { label: 'Gastos registrados', value: s.expenses, sign: '−', color: 'bg-expense' },
    { label: `Cuota imputada · ${s.quotaDays} ${s.quotaDays === 1 ? 'día' : 'días'}`, value: s.quota, sign: '−', color: 'bg-quota' },
    { label: 'Reserva IRPF orientativa', value: s.irpfReserve, sign: '−', color: 'bg-reserve' },
  ]
  const negative = s.available < 0
  return (
    <div>
      <ul className="space-y-3.5">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink-2">{r.label}</span>
              <span className="figure font-semibold text-ink">{r.sign}{eur(r.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-canvas">
              <div className={cx('h-full rounded-full transition-[width] duration-700 ease-out', r.color)} style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
        <li className="border-t border-line pt-3.5">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="font-semibold text-ink">= Disponible estimado</span>
            <span className={cx('figure text-xl font-semibold', negative ? 'text-expense-700' : 'text-brand-700')}>{eur(s.available)}</span>
          </div>
          <div className="h-2 rounded-full bg-canvas">
            <div className={cx('h-full rounded-full transition-[width] duration-700 ease-out', negative ? 'bg-expense' : 'bg-margin')} style={{ width: `${(Math.abs(s.available) / max) * 100}%` }} />
          </div>
          {negative && <p className="mt-1 text-xs font-medium text-expense-700">Resultado negativo en este periodo.</p>}
        </li>
      </ul>
      <p className="num mt-4 text-[13px] text-ink-2">
        Además has cobrado <strong className="text-ink">{eur(s.vatCollected)}</strong> de IVA: no es tuyo y va directo a la hucha de impuestos.
      </p>
      <Help summary="¿Qué se descuenta?">
        <p><strong>Ingresos sin IVA − gastos</strong> = margen operativo.</p>
        <p>Se resta la <strong>cuota de autónomos</strong> repartida por días (solo hasta hoy) y una <strong>reserva orientativa de IRPF</strong>, un porcentaje que eliges sobre lo que queda.</p>
        <p>El IVA nunca se suma, así que no se descuenta dos veces. La demo no recupera IVA soportado ni decide qué gastos son deducibles.</p>
      </Help>
    </div>
  )
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as DailyPoint
  return (
    <div className="num min-w-48 rounded-xl bg-ink px-3.5 py-3 text-xs text-white shadow-xl">
      <p className="mb-2 font-display text-sm font-semibold">{cap(dateMed(p.date))}</p>
      <p className="flex items-center gap-2"><Swatch tone="income" />Ingresos sin IVA <strong className="ml-auto pl-3">{eur(p.income)}</strong></p>
      <p className="mt-1 flex items-center gap-2"><Swatch tone="expense" />Gastos <strong className="ml-auto pl-3">{eur(p.expenses)}</strong></p>
      <p className="mt-1 flex items-center gap-2"><Swatch tone="margin" />Margen operativo <strong className="ml-auto pl-3">{eur(p.margin)}</strong></p>
      <p className="mt-2 text-white/60">{p.hours > 0 ? `${hoursLabel(p.hours)} trabajadas` : 'Sin jornada registrada'}</p>
    </div>
  )
}

function DailyChart({ points }: { points: DailyPoint[] }) {
  if (!points.some((p) => p.income || p.expenses)) {
    return (
      <EmptyState icon={<Receipt className="size-5" aria-hidden />} title="Sin movimientos en este periodo">
        Añade un ingreso o un gasto, o consulta otro periodo.
      </EmptyState>
    )
  }
  return (
    <div className="h-64 sm:h-72" role="img" aria-label={`Gráfico de ingresos, gastos y margen operativo por día. ${points.length} días.`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <defs>
            <linearGradient id="margen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.margin} stopOpacity={0.32} />
              <stop offset="100%" stopColor={C.margin} stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="date" tickFormatter={dateShort} tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={{ stroke: C.grid }} minTickGap={18} />
          <YAxis tickFormatter={(v: number) => eur0(v)} tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={false} width={62} />
          <Tooltip content={ChartTooltip} cursor={{ fill: 'rgba(16,24,20,0.04)' }} />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} formatter={(v) => <span style={{ color: '#4b5450' }}>{v}</span>} />
          <Area dataKey="margin" name="Margen operativo" type="monotone" fill="url(#margen)" stroke={C.margin} strokeWidth={2} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
          <Bar dataKey="income" name="Ingresos sin IVA" fill={C.income} radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="expenses" name="Gastos" fill={C.expense} radius={[4, 4, 0, 0]} maxBarSize={18} />
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
    () => data.movements.filter((m) => inRange(m.date, range)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 5),
    [data.movements, range],
  )
  const pendingAll = Math.max(0, all.taxReserve - data.settings.setAside)
  const firstName = data.settings.name.split(' ')[0] || 'autónomo'

  return (
    <>
      <PageHeader title={`Hola, ${firstName}`} subtitle="Esto es lo que te queda después de gastos, cuota e impuestos." actions={<QuickActions />} />
      <div className="mb-5"><PeriodSelector /></div>

      <div className="stagger space-y-4">
        <Hero s={s} label={PERIOD_LABELS[period]} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Ingresos sin IVA" tone="income" value={<Counter value={s.incomeBase} format={eur} />} sub={`+ ${eur(s.vatCollected)} de IVA cobrado`} />
          <Stat label="Gastos" tone="expense" value={<Counter value={s.expenses} format={eur} />} sub="Lo que has pagado" />
          <Stat label="Margen operativo" tone="margin" value={<Counter value={s.operatingMargin} format={eur} />} sub="Ingresos sin IVA − gastos" />
          <Stat label="Horas trabajadas" value={s.hours > 0 ? hoursLabel(s.hours) : <span className="text-lg text-ink-3">Sin horas registradas</span>} sub={`${s.shiftCount} ${s.shiftCount === 1 ? 'jornada' : 'jornadas'}`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3" aria-labelledby="evol">
            <CardTitle id="evol">Evolución diaria</CardTitle>
            <DailyChart points={points} />
          </Card>
          <Card className="lg:col-span-2" aria-labelledby="desglose">
            <div data-tour="breakdown">
              <CardTitle id="desglose">De lo que facturas a lo que te queda</CardTitle>
              <Breakdown s={s} />
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-2" aria-labelledby="reserva">
            <CardTitle id="reserva" aside={<a href="#/impuestos" className="text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">Ver hucha</a>}>
              Para Hacienda en este periodo
            </CardTitle>
            <dl className="num space-y-2.5 text-[15px]">
              <div className="flex justify-between gap-2"><dt className="text-ink-2">IVA cobrado</dt><dd className="figure">{eur(s.vatCollected)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-2">Reserva IRPF ({data.settings.irpfPct} %)</dt><dd className="figure">{eur(s.irpfReserve)}</dd></div>
              <div className="flex items-baseline justify-between gap-2 border-t border-line pt-2.5"><dt className="flex items-center gap-2 font-semibold"><Swatch tone="reserve" />Total a reservar</dt><dd className="figure text-xl font-semibold">{eur(s.taxReserve)}</dd></div>
              <div className="flex justify-between gap-2 text-ink-3"><dt>Cuota de autónomos (aparte)</dt><dd className="figure">{eur(s.quota)}</dd></div>
            </dl>
            <p className="mt-4 rounded-lg bg-reserve-50 px-3 py-2.5 text-[13px] text-ink-2">
              En tu hucha llevas <strong className="text-ink">{eur(data.settings.setAside)}</strong> de {eur(all.taxReserve)}.{' '}
              {pendingAll > 0 ? <>Te faltan <strong className="text-ink">{eur(pendingAll)}</strong>.</> : <strong className="text-ink">Vas al día.</strong>}
            </p>
          </Card>

          <Card className="lg:col-span-3" aria-labelledby="ultimos">
            <CardTitle id="ultimos" aside={<a href="#/movimientos" className="text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">Ver todos</a>}>
              Últimos movimientos
            </CardTitle>
            {recent.length === 0 ? (
              <EmptyState icon={<Receipt className="size-5" aria-hidden />} title="Sin movimientos en este periodo" />
            ) : (
              <ul className="-my-1 divide-y divide-line">{recent.map((m) => <MovementLine key={m.id} m={m} />)}</ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
