import { Moon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { crossesMidnight, effectiveMinutes, round2, validateShiftTimes } from '../lib/calc'
import { addDays, isValidISO, isValidTime, type ISODate } from '../lib/dates'
import { dateMed, eur, hoursLabel, parseAmount } from '../lib/format'
import { EXPENSE_CATEGORIES, INCOME_SOURCES, SHIFT_ACTIVITIES, VAT_RATES, type Movement, type Shift } from '../lib/types'
import { useStore, type FormRequest } from '../store'
import { Button, Dialog, Field, cx, describedBy, inputCls } from './ui'

/** Modo presentación: ilumina el campo que se está rellenando. */
function spotField(id: string | null) {
  document.querySelectorAll('.auto-field').forEach((el) => el.classList.remove('auto-field'))
  if (id) document.getElementById(id)?.classList.add('auto-field')
}

/** Modo presentación: explica qué se está rellenando. */
function AutoNote({ text, className }: { text: string; className?: string }) {
  if (!text) return null
  return (
    <p key={text} aria-live="polite" className={cx('animate-fade-up rounded-lg bg-mint/20 px-3 py-2 text-sm font-medium text-ink', className)}>
      {text}
    </p>
  )
}

const toInput = (n: number) => String(n).replace('.', ',')

function validDate(date: string, today: ISODate): string | undefined {
  if (!isValidISO(date)) return 'Indica una fecha válida.'
  if (date > today) return 'La fecha no puede ser posterior a hoy.'
  if (date < '2020-01-01') return 'La fecha es demasiado antigua para esta demo.'
}

function amountError(raw: string, label: string): string | undefined {
  const n = parseAmount(raw)
  if (raw.trim() === '') return `Indica ${label}.`
  if (n === null) return 'Usa un número con hasta dos decimales, por ejemplo 45,80.'
  if (n <= 0) return 'El importe debe ser mayor que 0.'
  if (n > 100_000) return 'El importe parece demasiado alto. Revísalo.'
}

const shiftLabel = (s: Shift) => `${dateMed(s.date)} · ${s.start}–${s.end}`

// ───────────── Movimiento ─────────────

function MovementForm({ req }: { req: Extract<FormRequest, { type: 'movement' }> }) {
  const { data, today, saveMovement, closeForm, notify } = useStore()
  const editing = req.movement
  const kind = editing?.kind ?? req.kind
  const isInc = kind === 'income'
  const uid = useId()
  const f = (n: string) => `${uid}-${n}`

  const [date, setDate] = useState(editing?.date ?? req.date ?? today)
  const [concept, setConcept] = useState(editing?.concept ?? '')
  const [source, setSource] = useState(editing?.kind === 'income' ? editing.source : INCOME_SOURCES[0])
  const [category, setCategory] = useState(editing?.kind === 'expense' ? editing.category : EXPENSE_CATEGORIES[0])
  const [amount, setAmount] = useState(editing ? toInput(editing.kind === 'income' ? editing.base : editing.amount) : '')
  const [vatRate, setVatRate] = useState(editing?.kind === 'income' ? editing.vatRate : 10)
  const [shiftId, setShiftId] = useState<string>(editing?.shiftId ?? req.shiftId ?? '')
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})

  // Modo presentación: escribe el formulario en directo y guarda al terminar
  const auto = req.autoplay
  const [note, setNote] = useState('')
  const finished = useRef(false)
  const finish = () => {
    if (!auto || finished.current) return
    finished.current = true
    spotField(null)
    saveMovement(
      isInc
        ? { id: auto.id, kind: 'income', date, concept: auto.concept, source: auto.source ?? INCOME_SOURCES[0], base: auto.amount, vatRate: 10, shiftId: auto.shiftId ?? null }
        : { id: auto.id, kind: 'expense', date, concept: auto.concept, category: auto.category ?? EXPENSE_CATEGORIES[0], amount: auto.amount, shiftId: auto.shiftId ?? null },
    )
    notify(isInc ? 'Ingreso añadido.' : 'Gasto añadido.')
    closeForm()
    req.onDone?.()
  }
  const finishRef = useRef(finish)
  finishRef.current = finish
  useEffect(() => {
    if (!auto) return
    const timers: number[] = []
    let t = 700
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    const say = (id: string | null, text: string) => at(t, () => { spotField(id); setNote(text) })
    if (auto.source) setSource(auto.source)
    if (auto.category) setCategory(auto.category)
    say(f(isInc ? 'source' : 'category'), isInc ? 'Fuente: de dónde viene el dinero.' : 'Categoría: así sabe en qué se le va el dinero.')
    t += 1600
    say(f('concept'), 'Concepto: una descripción corta para reconocerlo luego.')
    t += 600
    for (let k = 1; k <= auto.concept.length; k++) at((t += 70), () => setConcept(auto.concept.slice(0, k)))
    const amt = auto.amount.toFixed(2).replace('.', ',')
    t += 900
    say(f('amount'), isInc ? 'Importe sin IVA: el IVA se calcula aparte, porque no es suyo.' : 'Importe pagado, tal cual sale en el tique.')
    t += 600
    for (let k = 1; k <= amt.length; k++) at((t += 170), () => setAmount(amt.slice(0, k)))
    t += isInc ? 2600 : 1600
    say(null, 'Guardando…')
    at((t += 900), () => finishRef.current())
    return () => {
      timers.forEach(clearTimeout)
      spotField(null)
    }
  }, [auto])
  const close = () => (auto ? finish() : closeForm())

  // Jornadas compatibles: mismo día, o el día anterior si cruzó medianoche
  const shifts = useMemo(
    () => data.shifts.filter((s) => s.date === date || (s.date === addDays(date, -1) && crossesMidnight(s))),
    [data.shifts, date],
  )
  const selectedShift = shifts.some((s) => s.id === shiftId) ? shiftId : ''

  const base = parseAmount(amount)
  const vatPreview = isInc && base !== null ? round2((base * vatRate) / 100) : 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs = {
      date: validDate(date, today),
      concept: !concept.trim() ? 'Escribe un concepto.' : concept.trim().length > 80 ? 'Máximo 80 caracteres.' : undefined,
      amount: amountError(amount, isInc ? 'el importe base' : 'el importe pagado'),
    }
    setErrors(errs)
    const first = Object.entries(errs).find(([, v]) => v)
    if (first) {
      document.getElementById(f(first[0]))?.focus()
      return
    }
    const common = { id: editing?.id, date, concept: concept.trim(), shiftId: selectedShift || null }
    const value = round2(parseAmount(amount)!)
    saveMovement(
      isInc
        ? { ...common, kind: 'income', source, base: value, vatRate }
        : { ...common, kind: 'expense', category, amount: value },
    )
    notify(editing ? 'Cambios guardados. Los totales ya están actualizados.' : isInc ? 'Ingreso añadido. Revisa cómo cambian el disponible y la reserva.' : 'Gasto añadido. Los totales ya están actualizados.')
    closeForm()
  }

  const title = editing ? (isInc ? 'Editar ingreso' : 'Editar gasto') : isInc ? 'Añadir ingreso' : 'Añadir gasto'

  return (
    <Dialog
      open
      onClose={close}
      title={title}
      footer={
        <>
          <Button onClick={close} disabled={!!auto}>Cancelar</Button>
          <Button variant="primary" type="submit" form={f('form')} disabled={!!auto}>{editing ? 'Guardar cambios' : title}</Button>
        </>
      }
    >
      <form id={f('form')} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {auto && <AutoNote text={note} className="sm:col-span-2" />}
        <Field id={f('date')} label="Fecha" error={errors.date}>
          <input id={f('date')} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls(errors.date)} aria-invalid={!!errors.date} aria-describedby={describedBy(f('date'), errors.date)} />
        </Field>
        {isInc ? (
          <Field id={f('source')} label="Fuente">
            <select id={f('source')} value={source} onChange={(e) => setSource(e.target.value)} className={inputCls()}>
              {INCOME_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        ) : (
          <Field id={f('category')} label="Categoría">
            <select id={f('category')} value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls()}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field id={f('concept')} label="Concepto" error={errors.concept}>
            <input id={f('concept')} value={concept} onChange={(e) => setConcept(e.target.value)} maxLength={80} placeholder={isInc ? 'Ej.: Carreras por aplicación' : 'Ej.: Repostaje gasóleo'} className={inputCls(errors.concept)} aria-invalid={!!errors.concept} aria-describedby={describedBy(f('concept'), errors.concept)} autoComplete="off" />
          </Field>
        </div>
        <Field id={f('amount')} label={isInc ? 'Importe base (sin IVA)' : 'Importe pagado'} error={errors.amount} hint="En euros. Ej.: 45,80">
          <div className="relative">
            <input id={f('amount')} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={cx(inputCls(errors.amount), 'num pr-8')} aria-invalid={!!errors.amount} aria-describedby={describedBy(f('amount'), errors.amount, 'hint')} autoComplete="off" />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-3" aria-hidden>€</span>
          </div>
        </Field>
        {isInc ? (
          <Field id={f('vat')} label="IVA repercutido (ejemplo)" hint="El taxi suele aplicar el 10 %. Configurable.">
            <select id={f('vat')} value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className={inputCls()} aria-describedby={`${f('vat')}-hint`}>
              {VAT_RATES.map((r) => <option key={r} value={r}>{r} %</option>)}
            </select>
          </Field>
        ) : <div className="hidden sm:block" />}
        {isInc && base !== null && base > 0 && (
          <p className="num rounded-lg bg-income-50 px-3 py-2 text-sm text-income-700 sm:col-span-2">
            Base {eur(base)} + IVA {eur(vatPreview)} = <strong>{eur(base + vatPreview)}</strong> cobrados. El IVA va a la reserva fiscal, no al disponible.
          </p>
        )}
        <div className="sm:col-span-2">
          <Field id={f('shift')} label="Jornada asociada (opcional)" hint={shifts.length ? 'Sirve para comparar días y horarios. Un movimiento solo puede estar en una jornada.' : 'No hay jornadas registradas en esa fecha.'}>
            <select id={f('shift')} value={selectedShift} onChange={(e) => setShiftId(e.target.value)} className={inputCls()} disabled={!shifts.length} aria-describedby={`${f('shift')}-hint`}>
              <option value="">Sin asociar</option>
              {shifts.map((s) => <option key={s.id} value={s.id}>{shiftLabel(s)}</option>)}
            </select>
          </Field>
        </div>
      </form>
    </Dialog>
  )
}

// ───────────── Jornada ─────────────

function ShiftForm({ req }: { req: Extract<FormRequest, { type: 'shift' }> }) {
  const { data, today, saveShift, closeForm, notify } = useStore()
  const editing = req.shift
  const uid = useId()
  const f = (n: string) => `${uid}-${n}`

  const [date, setDate] = useState(editing?.date ?? today)
  const [start, setStart] = useState(editing?.start ?? '07:00')
  const [end, setEnd] = useState(editing?.end ?? '15:00')
  const [breakRaw, setBreakRaw] = useState(String(editing?.breakMin ?? 30))
  const [activity, setActivity] = useState(editing?.activity ?? SHIFT_ACTIVITIES[0])
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(editing ? data.movements.filter((m) => m.shiftId === editing.id).map((m) => m.id) : []),
  )
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})

  // Modo presentación: rellena la jornada, marca sus movimientos y guarda
  const auto = req.autoplay
  const [note, setNote] = useState('')
  const finished = useRef(false)
  const finish = () => {
    if (!auto || finished.current) return
    finished.current = true
    spotField(null)
    saveShift({ id: auto.id, date: auto.date, start: auto.start, end: auto.end, breakMin: auto.breakMin, activity: auto.activity }, auto.movementIds)
    notify('Jornada registrada. El cálculo por hora ya está actualizado.')
    closeForm()
    req.onDone?.()
  }
  const finishRef = useRef(finish)
  finishRef.current = finish
  useEffect(() => {
    if (!auto) return
    const timers: number[] = []
    let t = 700
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    const say = (id: string | null, text: string) => at(t, () => { spotField(id); setNote(text) })
    setDate(auto.date)
    setActivity(auto.activity)
    say(f('start'), 'Hora de inicio del turno.')
    at((t += 700), () => setStart(auto.start))
    t += 1000
    say(f('end'), 'Hora de fin.')
    at((t += 700), () => setEnd(auto.end))
    t += 1000
    say(f('breakMin'), 'Descanso: no cuenta como hora trabajada.')
    at((t += 700), () => setBreakRaw(String(auto.breakMin)))
    t += 1300
    auto.movementIds.forEach((id, n) => {
      say(f(`mov-${id}`), n === 0 ? 'Marca lo que cobró y gastó en este turno.' : 'Y el repostaje, que también fue en este turno.')
      at((t += 800), () => setSelected((sel) => new Set(sel).add(id)))
      t += 1000
    })
    say(null, 'Guardando…')
    at((t += 900), () => finishRef.current())
    return () => {
      timers.forEach(clearTimeout)
      spotField(null)
    }
  }, [auto])
  const close = () => (auto ? finish() : closeForm())

  const breakMin = /^\d+$/.test(breakRaw.trim()) ? Number(breakRaw) : NaN
  const timesOk = isValidTime(start) && isValidTime(end)
  const overnight = timesOk && start !== end && crossesMidnight({ start, end })
  const preview = timesOk && Number.isFinite(breakMin) && Object.keys(validateShiftTimes(start, end, breakMin)).length === 0
    ? effectiveMinutes({ start, end, breakMin }) / 60
    : null

  const candidates = useMemo(() => {
    const days = new Set([date, ...(overnight ? [addDays(date, 1)] : [])])
    return data.movements.filter((m) => days.has(m.date))
  }, [data.movements, date, overnight])

  const shiftById = useMemo(() => new Map(data.shifts.map((s) => [s.id, s])), [data.shifts])

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string | undefined> = {
      date: validDate(date, today),
      start: isValidTime(start) ? undefined : 'Indica la hora de inicio.',
      end: isValidTime(end) ? undefined : 'Indica la hora de fin.',
    }
    if (!Number.isFinite(breakMin)) errs.breakMin = 'Indica los minutos de descanso (0 o más).'
    if (timesOk && Number.isFinite(breakMin)) Object.assign(errs, validateShiftTimes(start, end, breakMin))
    setErrors(errs)
    const first = ['date', 'start', 'end', 'breakMin'].find((k) => errs[k])
    if (first) {
      document.getElementById(f(first))?.focus()
      return
    }
    const ids = candidates.filter((m) => selected.has(m.id)).map((m) => m.id)
    saveShift({ id: editing?.id, date, start, end, breakMin, activity }, ids)
    closeForm()
    if (!editing && ids.length === 0) {
      notify('Jornada registrada. Añade sus ingresos para ver el rendimiento por hora.', 'info')
    } else {
      notify(editing ? 'Jornada actualizada.' : 'Jornada registrada. El cálculo por hora ya está actualizado.')
    }
  }

  const movLabel = (m: Movement) =>
    m.kind === 'income' ? `+${eur(m.base)} · ${m.concept}` : `−${eur(m.amount)} · ${m.concept}`

  return (
    <Dialog
      open
      size="lg"
      onClose={close}
      title={editing ? 'Editar jornada' : 'Registrar jornada'}
      footer={
        <>
          <Button onClick={close} disabled={!!auto}>Cancelar</Button>
          <Button variant="primary" type="submit" form={f('form')} disabled={!!auto}>{editing ? 'Guardar cambios' : 'Registrar jornada'}</Button>
        </>
      }
    >
      <form id={f('form')} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-6">
        {auto && <AutoNote text={note} className="sm:col-span-6" />}
        <div className="sm:col-span-3">
          <Field id={f('date')} label="Fecha de inicio" error={errors.date}>
            <input id={f('date')} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls(errors.date)} aria-invalid={!!errors.date} aria-describedby={describedBy(f('date'), errors.date)} />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field id={f('activity')} label="Fuente o actividad">
            <select id={f('activity')} value={activity} onChange={(e) => setActivity(e.target.value)} className={inputCls()}>
              {SHIFT_ACTIVITIES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field id={f('start')} label="Inicio" error={errors.start}>
            <input id={f('start')} type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls(errors.start)} aria-invalid={!!errors.start} aria-describedby={describedBy(f('start'), errors.start)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field id={f('end')} label="Fin" error={errors.end}>
            <input id={f('end')} type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls(errors.end)} aria-invalid={!!errors.end} aria-describedby={describedBy(f('end'), errors.end)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field id={f('breakMin')} label="Descanso (min)" error={errors.breakMin}>
            <input id={f('breakMin')} inputMode="numeric" value={breakRaw} onChange={(e) => setBreakRaw(e.target.value)} className={cx(inputCls(errors.breakMin), 'num')} aria-invalid={!!errors.breakMin} aria-describedby={describedBy(f('breakMin'), errors.breakMin)} autoComplete="off" />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-canvas px-3 py-2 text-sm text-ink sm:col-span-6" aria-live="polite">
          <span>Horas efectivas: <strong className="num">{preview === null ? '—' : hoursLabel(preview)}</strong></span>
          {overnight && (
            <span className="inline-flex items-center gap-1"><Moon className="size-4" aria-hidden /> Termina el día siguiente</span>
          )}
        </div>

        <fieldset className="sm:col-span-6">
          <legend className="mb-1 text-sm font-medium text-ink">Movimientos de la jornada</legend>
          <p className="mb-2 text-xs text-ink-3">
            Marca los ingresos y gastos que pertenecen a esta jornada{overnight ? ' (de ese día y del siguiente)' : ''}. No se duplican: si ya estaban en otra jornada, pasan a esta.
          </p>
          {candidates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line px-3 py-4 text-sm text-ink-2">
              No hay movimientos en esa fecha. Registra la jornada y, después, añade sus ingresos y gastos eligiéndola en «Jornada asociada».
            </div>
          ) : (
            <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">
              {candidates.map((m) => {
                const other = m.shiftId && m.shiftId !== editing?.id ? shiftById.get(m.shiftId) : undefined
                return (
                  <li key={m.id}>
                    <label id={f(`mov-${m.id}`)} className="flex cursor-pointer items-start gap-3 px-3 py-2 text-sm hover:bg-canvas">
                      <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="mt-0.5 size-4 accent-ink" />
                      <span className="min-w-0 flex-1">
                        <span className="num block truncate">{movLabel(m)}</span>
                        <span className="block text-xs text-ink-3">
                          {m.kind === 'income' ? 'Ingreso' : 'Gasto'} · {dateMed(m.date)}
                          {other && ` · ahora en la jornada ${other.start}–${other.end}`}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </fieldset>
      </form>
    </Dialog>
  )
}

export function FormHost() {
  const { form } = useStore()
  if (!form) return null
  // key: reinicia el estado al abrir otro formulario
  return form.type === 'movement'
    ? <MovementForm key={`${form.kind}-${form.movement?.id ?? 'new'}-${form.date ?? ''}`} req={form} />
    : <ShiftForm key={form.shift?.id ?? 'new-shift'} req={form} />
}
