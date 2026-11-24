import { CircleCheck, PiggyBank, TriangleAlert } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { Progress, Stat } from '../components/bits'
import { Button, Card, CardTitle, Field, PageHeader, PeriodSelector, cx, describedBy, inputCls } from '../components/ui'
import { periodRange, round2, summarize } from '../lib/calc'
import { eur, parseAmount } from '../lib/format'
import { useStore } from '../store'

type Key = 'vat' | 'irpf' | 'quota' | 'fixed' | 'app'
const FIELDS: { key: Key; label: string; hint: string; max: number; unit: string }[] = [
  { key: 'fixed', label: 'Gastos fijos al mes (€)', hint: 'Seguro, emisora, gestoría… Se reparten por días', max: 10_000, unit: '€' },
  { key: 'app', label: 'Comisión de apps (%)', hint: 'Uber, Cabify… sobre lo cobrado por la app', max: 50, unit: '%' },
  { key: 'quota', label: 'Cuota mensual de autónomos (€)', hint: 'La que pagas tú; no se calcula tramo', max: 2000, unit: '€' },
  { key: 'irpf', label: 'Reserva orientativa IRPF (%)', hint: 'Supuesto de demostración', max: 60, unit: '%' },
  { key: 'vat', label: 'IVA de tus servicios (%)', hint: 'El taxi suele aplicar el 10 %', max: 21, unit: '%' },
]

export function PctForm() {
  const { data, updateSettings, notify } = useStore()
  const uid = useId()
  const st = data.settings
  const str = (n: number) => String(n).replace('.', ',')
  const [v, setV] = useState<Record<Key, string>>({
    vat: str(st.vatPct), irpf: str(st.irpfPct), quota: str(st.monthlyQuota), fixed: str(st.fixedMonthly), app: str(st.appFeePct),
  })
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n: Partial<Record<Key, number>> = {}
    const errs: Partial<Record<Key, string>> = {}
    for (const fd of FIELDS) {
      const raw = v[fd.key].trim()
      const x = raw === '' || raw === '0' ? 0 : parseAmount(raw)
      if (x === null || x > fd.max) errs[fd.key] = `Indica un valor entre 0 y ${fd.max.toLocaleString('es-ES')} ${fd.unit}.`
      else n[fd.key] = x
    }
    setErrors(errs)
    const first = FIELDS.find((fd) => errs[fd.key])
    if (first) {
      document.getElementById(`${uid}-${first.key}`)?.focus()
      return
    }
    // El IVA nuevo se aplica a lo que apuntes desde ahora; lo ya guardado conserva el suyo
    updateSettings({ vatPct: n.vat!, irpfPct: n.irpf!, monthlyQuota: n.quota!, fixedMonthly: round2(n.fixed!), appFeePct: n.app! })
    notify('Ajustes guardados. Las cifras se han recalculado.')
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map((fd) => (
        <Field key={fd.key} id={`${uid}-${fd.key}`} label={fd.label} error={errors[fd.key]} hint={fd.hint}>
          <input id={`${uid}-${fd.key}`} inputMode="decimal" value={v[fd.key]} onChange={(e) => setV((o) => ({ ...o, [fd.key]: e.target.value }))} className={cx(inputCls(errors[fd.key]), 'num')} aria-invalid={!!errors[fd.key]} aria-describedby={describedBy(`${uid}-${fd.key}`, errors[fd.key], 'h')} />
        </Field>
      ))}
      <Button type="submit" variant="primary" className="sm:col-span-2 sm:justify-self-start">Guardar ajustes</Button>
    </form>
  )
}

function SetAsideForm({ current }: { current: number }) {
  const { updateSettings, notify } = useStore()
  const uid = useId()
  const [val, setVal] = useState(String(current).replace('.', ','))
  const [error, setError] = useState<string>()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = val.trim() === '0' ? 0 : parseAmount(val)
    if (n === null || n > 1_000_000) {
      setError('Indica una cantidad en euros, por ejemplo 900 o 1.250,50.')
      return
    }
    setError(undefined)
    updateSettings({ setAside: round2(n) })
    notify('Hucha actualizada.')
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-start gap-2">
      <div className="min-w-0 flex-1">
        <Field id={`${uid}-set`} label="Ya he apartado (€)" error={error}>
          <input id={`${uid}-set`} inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} className={cx(inputCls(error), 'num')} aria-invalid={!!error} aria-describedby={describedBy(`${uid}-set`, error)} />
        </Field>
      </div>
      <Button type="submit" className="mt-6">Guardar</Button>
    </form>
  )
}

export default function Impuestos() {
  const { data, today, period } = useStore()
  const s = useMemo(() => summarize(data, periodRange(period, today, data), today), [data, period, today])
  const all = useMemo(() => summarize(data, periodRange('all', today, data), today), [data, today])
  const { setAside, irpfPct } = data.settings
  const pending = round2(all.taxReserve - setAside)
  const pct = all.taxReserve > 0 ? (setAside / all.taxReserve) * 100 : 100

  return (
    <>
      <PageHeader title="Hucha y ajustes" subtitle="Cuánto apartar para no llevarte sustos, y tus gastos fijos." />

      <p role="note" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span><strong>Estimación de demostración. No sustituye el cálculo de una asesoría.</strong> Los porcentajes son supuestos editables, no tipos oficiales.</span>
      </p>

      <div className="mb-4"><PeriodSelector /></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="IVA cobrado" tone="reserve" value={eur(s.vatCollected)} sub="Registrado en tus ingresos" />
        <Stat label={`Reserva IRPF (${irpfPct} %)`} tone="reserve" value={eur(s.irpfReserve)} sub={`Sobre ${eur(Math.max(0, s.operatingMargin - s.quota - s.fixedCosts - s.appFee))}`} />
        <Stat label="Reserva fiscal total" tone="reserve" value={eur(s.taxReserve)} sub="IVA + IRPF del periodo" />
        <Stat label="Cuota de autónomos" value={eur(s.quota)} sub={`Aparte · ${s.quotaDays} días imputados`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card aria-labelledby="hucha" data-tour="hucha">
          <CardTitle id="hucha"><span className="inline-flex items-center gap-2"><PiggyBank className="size-5 text-reserve" aria-hidden /> Hucha · todo el historial</span></CardTitle>
          <dl className="num mb-4 grid grid-cols-3 gap-2 text-sm">
            <div><dt className="text-ink-3">Calculado</dt><dd className="text-lg font-semibold">{eur(all.taxReserve)}</dd></div>
            <div><dt className="text-ink-3">Apartado</dt><dd className="text-lg font-semibold">{eur(setAside)}</dd></div>
            <div>
              <dt className="text-ink-3">{pending > 0 ? 'Pendiente' : 'De más'}</dt>
              <dd className={cx('figure text-lg font-semibold', pending > 0 ? 'text-reserve' : 'text-brand-700')}>{eur(Math.abs(pending))}</dd>
            </div>
          </dl>
          <Progress value={pct} label="Parte de la reserva ya apartada" tone="reserve" />
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
            {pending > 0
              ? <>Llevas el {Math.round(pct)} % apartado. Te faltan <strong className="num text-ink">{eur(pending)}</strong>.</>
              : <><CircleCheck className="size-4 text-margin" aria-hidden /> Tienes apartado todo lo calculado.</>}
          </p>
          <div className="mt-4 border-t border-line pt-4"><SetAsideForm key={setAside} current={setAside} /></div>
          <p className="mt-3 text-xs text-ink-3">La hucha es un seguimiento orientativo: no mueve dinero ni se conecta a ningún banco.</p>
        </Card>

        <Card aria-labelledby="metodo">
          <CardTitle id="metodo">Cómo se calcula</CardTitle>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
            <li><strong className="text-ink">IVA cobrado:</strong> la suma del IVA que has registrado en tus ingresos. Lo cobras para Hacienda, así que se aparta entero.</li>
            <li><strong className="text-ink">Margen operativo:</strong> ingresos sin IVA menos los gastos registrados.</li>
            <li><strong className="text-ink">Cuota imputada:</strong> tu cuota mensual repartida por días según los días de cada mes. Se resta, pero no forma parte de la reserva: la pagas cada mes.</li>
            <li><strong className="text-ink">Gastos fijos y comisión de apps:</strong> los fijos se reparten por días, como la cuota; la comisión es un % de lo cobrado por las apps.</li>
            <li><strong className="text-ink">Reserva IRPF:</strong> el {irpfPct} % del margen menos la cuota, los fijos y la comisión, si es positivo.</li>
            <li><strong className="text-ink">Reserva fiscal:</strong> IVA cobrado + reserva IRPF.</li>
          </ol>
          <p className="mt-3 text-xs text-ink-3">Simplificaciones: no se descuenta el IVA soportado en los gastos ni se decide qué gastos son deducibles.</p>
          <div data-tour="ajustes" className="mt-4 border-t border-line pt-4">
            <h3 id="ajustes" className="mb-3 text-sm font-semibold">Tus ajustes</h3>
            <PctForm key={[data.settings.vatPct, data.settings.irpfPct, data.settings.monthlyQuota, data.settings.fixedMonthly, data.settings.appFeePct].join('|')} />
          </div>
        </Card>
      </div>
    </>
  )
}
