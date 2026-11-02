import { CircleCheck, Clock, RotateCcw, Target } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { Progress } from '../components/bits'
import { Button, Card, CardTitle, ConfirmDialog, Field, PageHeader, cx, describedBy, inputCls } from '../components/ui'
import { goalProgress, periodRange, round2, summarize } from '../lib/calc'
import { parseISO } from '../lib/dates'
import { eur, hoursLabel, perHour, parseAmount } from '../lib/format'
import { useStore } from '../store'

function SettingsForm() {
  const { data, updateSettings, notify } = useStore()
  const st = data.settings
  const uid = useId()
  const f = (n: string) => `${uid}-${n}`
  const num = (n: number) => String(n).replace('.', ',')
  const [v, setV] = useState({ name: st.name, activity: st.activity, quota: num(st.monthlyQuota), irpf: num(st.irpfPct), goal: num(st.monthlyGoal) })
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const quota = parseAmount(v.quota)
    const irpf = parseAmount(v.irpf)
    const goal = parseAmount(v.goal)
    const errs = {
      name: !v.name.trim() ? 'Escribe un nombre.' : v.name.length > 60 ? 'Máximo 60 caracteres.' : undefined,
      activity: !v.activity.trim() ? 'Describe la actividad.' : v.activity.length > 80 ? 'Máximo 80 caracteres.' : undefined,
      quota: quota === null || quota > 2000 ? 'Indica una cuota entre 0 y 2.000 €.' : undefined,
      irpf: irpf === null || irpf > 60 ? 'Indica un porcentaje entre 0 y 60.' : undefined,
      goal: goal === null || goal <= 0 || goal > 100_000 ? 'Indica un objetivo mayor que 0 €.' : undefined,
    }
    setErrors(errs)
    const first = Object.entries(errs).find(([, x]) => x)
    if (first) {
      document.getElementById(f(first[0]))?.focus()
      return
    }
    updateSettings({ name: v.name.trim(), activity: v.activity.trim(), monthlyQuota: quota!, irpfPct: irpf!, monthlyGoal: round2(goal!) })
    notify('Ajustes guardados.')
  }

  const input = (k: keyof typeof v, label: string, hint?: string, numeric = false) => (
    <Field id={f(k)} label={label} error={errors[k]} hint={hint}>
      <input
        id={f(k)}
        value={v[k]}
        onChange={set(k)}
        inputMode={numeric ? 'decimal' : undefined}
        className={cx(inputCls(errors[k]), numeric && 'num')}
        aria-invalid={!!errors[k]}
        aria-describedby={describedBy(f(k), errors[k], hint)}
        autoComplete="off"
      />
    </Field>
  )

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      {input('name', 'Nombre (perfil ficticio)')}
      {input('activity', 'Actividad')}
      {input('goal', 'Objetivo mensual de disponible (€)', 'Lo que quieres que te quede al mes', true)}
      {input('quota', 'Cuota mensual de autónomos (€)', 'Introdúcela tú: la demo no calcula tramos', true)}
      {input('irpf', 'Reserva orientativa para IRPF (%)', 'Supuesto de demostración, no un tipo oficial', true)}
      <div className="flex items-end sm:justify-end">
        <Button type="submit" variant="primary" className="w-full sm:w-auto">Guardar ajustes</Button>
      </div>
    </form>
  )
}

export default function Objetivo() {
  const { data, today, resetDemo, notify } = useStore()
  const [confirm, setConfirm] = useState(false)
  const month = useMemo(() => summarize(data, periodRange('month', today, data), today), [data, today])
  const g = goalProgress(month, data.settings.monthlyGoal)
  const monthName = parseISO(today).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <>
      <PageHeader title="Objetivo mensual y ajustes" subtitle="Marca cuánto quieres que te quede y ajusta los supuestos de la demo." />

      <Card aria-labelledby="meta" className="mb-4">
        <CardTitle id="meta"><span className="inline-flex items-center gap-2"><Target className="size-5 text-brand-600" aria-hidden /> Objetivo de {monthName}</span></CardTitle>
        <div className="num mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cx('text-3xl font-semibold tracking-tight', g.current < 0 ? 'text-red-700' : 'text-brand-700')}>{eur(g.current)}</span>
          <span className="text-ink-2">de {eur(g.goal)} de disponible estimado</span>
        </div>
        <Progress value={g.pct} label="Progreso hacia el objetivo mensual" />
        <p className="num mt-2 text-sm text-ink-2">{Math.round(g.pct)} % conseguido</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-canvas p-3">
            <p className="text-sm text-ink-2">{g.reached ? 'Objetivo' : 'Te faltan'}</p>
            <p className="num text-xl font-semibold">
              {g.reached ? <span className="inline-flex items-center gap-1.5 text-brand-700"><CircleCheck className="size-5" aria-hidden /> Conseguido</span> : eur(g.remaining)}
            </p>
          </div>
          <div className="rounded-xl bg-canvas p-3">
            <p className="flex items-center gap-1.5 text-sm text-ink-2"><Clock className="size-4" aria-hidden /> Horas estimadas restantes</p>
            {g.reached ? (
              <p className="text-xl font-semibold">0 h</p>
            ) : g.hoursNeeded !== null ? (
              <>
                <p className="num text-xl font-semibold">≈ {hoursLabel(Math.ceil(g.hoursNeeded * 4) / 4)}</p>
                <p className="text-xs text-ink-3">Al ritmo de este mes: {perHour(g.perHour)} disponibles. Orientativo.</p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-ink-3">Sin estimación</p>
                <p className="text-xs text-ink-3">
                  {g.perHour === null ? 'Sin horas registradas este mes.' : 'El rendimiento medio del mes no es positivo.'}
                </p>
              </>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-3">
          Se calcula con el disponible estimado del mes en curso hasta hoy ({month.quotaDays} días de cuota imputados) y su media por hora trabajada.
        </p>
      </Card>

      <Card aria-labelledby="ajustes">
        <CardTitle id="ajustes">Ajustes</CardTitle>
        <SettingsForm key={JSON.stringify(data.settings)} />
      </Card>

      <Card className="mt-4" aria-labelledby="datos">
        <CardTitle id="datos">Datos de la demo</CardTitle>
        <p className="text-sm text-ink-2">Todo se guarda solo en este navegador. Restablecer recupera los movimientos, jornadas y ajustes de ejemplo.</p>
        <Button className="mt-3" onClick={() => setConfirm(true)}><RotateCcw className="size-4" aria-hidden /> Restablecer demo</Button>
      </Card>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => { resetDemo(); notify('Demo restablecida con los datos de ejemplo.') }}
        title="¿Restablecer la demo?"
        confirmLabel="Restablecer"
      >
        Se borrarán los movimientos, jornadas y ajustes que hayas cambiado y se cargarán de nuevo los datos de ejemplo.
      </ConfirmDialog>
    </>
  )
}
