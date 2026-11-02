import { Lightbulb, Moon, Sun, Sunrise } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { Badge, Card, CardTitle, EmptyState, Help, PageHeader, cx } from '../components/ui'
import { DAY_PARTS, DAY_PART_RANGES, MIN_OBS, WEEKDAYS, WEEKDAYS_SHORT, profitability, type Group, type Reliability } from '../lib/calc'
import { decimalHours, eur, eur0 } from '../lib/format'
import { useStore } from '../store'

const RELIABILITY: Record<Reliability, { label: string; tone: 'neutral' | 'warn' | 'ok' }> = {
  insuficiente: { label: 'Historial insuficiente', tone: 'neutral' },
  orientativo: { label: 'Resultado orientativo', tone: 'warn' },
  suficiente: { label: `${MIN_OBS} o más jornadas`, tone: 'ok' },
}

const PART_ICON = { mañana: Sunrise, tarde: Sun, noche: Moon }

function WeekTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const g = payload[0].payload as Group & { full: string }
  return (
    <div className="num rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{g.full}</p>
      {g.marginPerHour === null ? <p className="text-ink-2">Sin jornadas registradas</p> : (
        <>
          <p>Margen operativo por hora: <strong>{eur(g.marginPerHour)}/h</strong></p>
          <p className="text-ink-2">{g.shifts} {g.shifts === 1 ? 'jornada' : 'jornadas'} · {decimalHours(g.hours)} · margen {eur(g.margin)}</p>
          {g.reliability === 'orientativo' && <p className="mt-1 text-amber-800">Resultado orientativo: menos de {MIN_OBS} jornadas.</p>}
        </>
      )}
    </div>
  )
}

export default function Rentabilidad() {
  const { data } = useStore()
  const p = useMemo(() => profitability(data), [data])

  const chart = p.byWeekday.map((g, i) => ({ ...g, short: WEEKDAYS_SHORT[i], full: WEEKDAYS[i], value: g.marginPerHour ?? 0 }))
  const solidRates = p.byWeekday.filter((g) => g.reliability === 'suficiente' && g.marginPerHour !== null).map((g) => g.marginPerHour!)
  const bestRate = solidRates.length ? Math.max(...solidRates) : null
  const avg = p.considered.length ? p.considered.reduce((a, s) => a + s.margin, 0) / p.considered.reduce((a, s) => a + s.hours, 0) : null

  const comboMap = new Map(p.byCombo.map((g) => [g.key, g]))
  const solidCombos = p.byCombo.filter((g) => g.reliability === 'suficiente')
  const bestCombo = solidCombos.length >= 2 ? solidCombos.reduce((a, b) => (b.marginPerHour! > a.marginPerHour! ? b : a)) : null

  return (
    <>
      <PageHeader
        title="Rentabilidad por días y horarios"
        subtitle={<>Cuándo te compensa trabajar, según <strong>todo tu historial</strong>: {p.considered.length} jornadas comparables.</>}
      />

      {p.considered.length === 0 ? (
        <Card><EmptyState icon={<Lightbulb className="size-5" aria-hidden />} title="Historial insuficiente">Registra jornadas y asocia sus ingresos para comparar días y horarios.</EmptyState></Card>
      ) : (
        <>
          <Card aria-labelledby="hallazgos" data-tour="insights" className="grid-paper mb-4 !border-ink !bg-ink text-white">
            <CardTitle id="hallazgos"><span className="inline-flex items-center gap-2"><Lightbulb className="size-5 text-mint" aria-hidden /> <span className="text-white">Lo que dicen tus registros</span></span></CardTitle>
            {p.insights.length === 0 ? (
              <p className="text-sm text-white/70">Historial insuficiente: hacen falta al menos {MIN_OBS} jornadas por grupo para destacar una conclusión.</p>
            ) : (
              <ul className="space-y-2.5 text-[15px] leading-relaxed text-white/90">
                {p.insights.map((t) => <li key={t} className="flex gap-2"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-mint" aria-hidden />{t}</li>)}
              </ul>
            )}
            <p className="mt-4 text-xs text-white/55">Son datos de tu pasado, no una predicción. Solo se destacan grupos con {MIN_OBS} o más jornadas.</p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3" aria-labelledby="por-dia">
              <CardTitle id="por-dia">Margen operativo por hora, por día de la semana</CardTitle>
              <div className="h-64" role="img" aria-label="Gráfico de barras del margen operativo por hora de cada día de la semana. La tabla siguiente tiene los mismos datos.">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#ebe8e1" />
                    <XAxis dataKey="short" tick={{ fontSize: 12, fill: '#4a5754' }} tickLine={false} axisLine={{ stroke: '#e2e7e5' }} />
                    <YAxis tickFormatter={(v: number) => eur0(v)} tick={{ fontSize: 11, fill: '#637170' }} tickLine={false} axisLine={false} width={56} />
                    <Tooltip content={WeekTooltip} cursor={{ fill: 'rgba(16,24,20,0.04)' }} />
                    {avg !== null && <ReferenceLine y={avg} stroke="#101814" strokeDasharray="4 4" />}
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
                      {chart.map((g) => (
                        <Cell
                          key={g.key}
                          fill={g.reliability === 'suficiente' ? '#1f9d6b' : '#d9d6ce'}
                          fillOpacity={g.reliability === 'suficiente' ? (g.marginPerHour === bestRate ? 0.95 : 0.42) : 1}
                          stroke={g.reliability === 'orientativo' ? '#8d928e' : g.reliability === 'suficiente' ? '#1f9d6b' : undefined}
                          strokeDasharray={g.reliability === 'orientativo' ? '3 3' : undefined}
                        />
                      ))}
                      <LabelList dataKey="shifts" position="top" formatter={(v) => (Number(v) > 0 ? `${v} j.` : 'sin datos')} style={{ fontSize: 11, fill: '#637170' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-ink-3">Sobre cada barra, el número de jornadas (j.).{avg !== null && ` Línea discontinua: tu media, ${eur(avg)}/h.`} La barra más intensa es el mejor día; las grises con borde discontinuo tienen menos de {MIN_OBS} jornadas (resultado orientativo).</p>
              <details className="mt-3 text-sm">
                <summary className="font-medium text-ink">Ver los datos en tabla</summary>
                <table className="num mt-2 w-full text-left text-sm">
                  <thead><tr className="text-xs text-ink-3"><th className="py-1 font-medium">Día</th><th className="py-1 font-medium">Jornadas</th><th className="py-1 font-medium">Horas</th><th className="py-1 text-right font-medium">Margen/hora</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {p.byWeekday.map((g) => (
                      <tr key={g.key}><td className="py-1.5">{g.label}</td><td>{g.shifts}</td><td>{decimalHours(g.hours)}</td><td className="text-right">{g.marginPerHour === null ? '—' : `${eur(g.marginPerHour)}/h`}</td></tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </Card>

            <Card className="lg:col-span-2" aria-labelledby="franjas">
              <CardTitle id="franjas">Por franja de inicio</CardTitle>
              <ul className="space-y-3">
                {p.byDayPart.map((g) => {
                  const Icon = PART_ICON[g.key as keyof typeof PART_ICON]
                  const r = RELIABILITY[g.reliability]
                  return (
                    <li key={g.key} className="rounded-xl border border-line p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-canvas p-2 text-ink-2"><Icon className="size-4" aria-hidden /></span>
                          <div>
                            <p className="font-medium">{g.label}</p>
                            <p className="num text-xs text-ink-3">{DAY_PART_RANGES[g.key as keyof typeof DAY_PART_RANGES]}</p>
                          </div>
                        </div>
                        <p className="num text-right text-lg font-semibold">{g.marginPerHour === null ? '—' : `${eur(g.marginPerHour)}/h`}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-2">
                        <span className="num">{g.shifts} jornadas · {decimalHours(g.hours)}</span>
                        <Badge tone={r.tone}>{r.label}</Badge>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>

          <Card className="mt-4" aria-labelledby="combo">
            <CardTitle id="combo">Día y franja</CardTitle>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="num w-full min-w-[460px] text-sm">
                <caption className="sr-only">Margen operativo por hora según día y franja de inicio</caption>
                <thead>
                  <tr className="text-left text-xs text-ink-3">
                    <th scope="col" className="py-2 font-medium">Día</th>
                    {DAY_PARTS.map((d) => <th key={d} scope="col" className="py-2 font-medium capitalize">{d}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {WEEKDAYS.map((wd, i) => (
                    <tr key={wd}>
                      <th scope="row" className="py-2 pr-2 text-left font-medium">{wd}</th>
                      {DAY_PARTS.map((d) => {
                        const g = comboMap.get(`${i}-${d}`)
                        const best = g && bestCombo && g.key === bestCombo.key
                        return (
                          <td key={d} className="py-1.5 pr-2">
                            {!g ? <span className="text-ink-3">—</span> : (
                              <span className={cx('inline-flex flex-col rounded-lg px-2 py-1', best ? 'bg-margin text-white' : g.reliability === 'suficiente' ? 'bg-brand-50' : '')}>
                                <span className="font-semibold">{eur(g.marginPerHour!)}/h{best && ' · mejor'}</span>
                                <span className={cx('text-xs', best ? 'text-white/80' : 'text-ink-3')}>
                                  {g.shifts} j.{g.reliability === 'orientativo' && ' · orientativo'}
                                </span>
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Help summary="Criterio de la comparativa">
              <p><strong>Margen operativo por hora</strong> = (ingresos sin IVA − gastos asociados a la jornada) ÷ horas efectivas. No descuenta cuota ni IRPF, para comparar jornadas en igualdad.</p>
              <p>Cada jornada cuenta entera en la franja en la que <strong>empieza</strong> (mañana {DAY_PART_RANGES.mañana}, tarde {DAY_PART_RANGES.tarde}, noche {DAY_PART_RANGES.noche}). No se reparten ingresos entre horas sueltas porque no hay datos para hacerlo con precisión.</p>
              <p>Entran las jornadas con al menos un movimiento asociado.{p.excluded > 0 && ` Ahora mismo quedan fuera ${p.excluded} jornadas sin movimientos.`} Los gastos fijos sin jornada (seguro, teléfono…) no se reparten.</p>
              <p>Con menos de {MIN_OBS} jornadas un grupo se marca como «Resultado orientativo» y no se destaca.</p>
            </Help>
          </Card>
        </>
      )}
    </>
  )
}
