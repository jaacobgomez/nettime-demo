import { ArrowLeft, ArrowRight, Mail, X } from 'lucide-react'
import QRCode from 'qrcode'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildSeed } from '../lib/seed'
import type { AppData, PeriodKey } from '../lib/types'
import type { ISODate } from '../lib/dates'
import { useStore } from '../store'
import { Logo } from './Layout'
import { cx } from './ui'

export const DEMO_URL = 'https://jaacobgomez.github.io/nettime-demo/'

// Registros que se crean en directo durante la presentación (ids fijos: avanzar y retroceder es reproducible)
const INC = { id: 'p-ingreso', concept: 'Carreras del turno de mañana', amount: 186.4, source: 'Calle y paradas' }
const GAS = { id: 'p-gasto', concept: 'Repostaje gasóleo', amount: 48.9, category: 'Combustible' }
const SHIFT = { id: 'p-jornada', start: '06:00', end: '14:00', breakMin: 30, activity: 'Taxi · servicio general' }

/** Punto de partida: los datos de ejemplo sin nada registrado hoy. */
function baseData(today: ISODate): AppData {
  const seed = buildSeed(today)
  return {
    ...seed,
    shifts: seed.shifts.filter((s) => s.date !== today),
    movements: seed.movements.filter((m) => m.date !== today),
  }
}

/** Estado tras aplicar las n primeras acciones del guion, sin animación. */
function replay(base: AppData, n: number, today: ISODate): AppData {
  let d = base
  if (n >= 1) d = { ...d, movements: [{ id: INC.id, kind: 'income', date: today, concept: INC.concept, source: INC.source, base: INC.amount, vatRate: 10, shiftId: null }, ...d.movements] }
  if (n >= 2) d = { ...d, movements: [{ id: GAS.id, kind: 'expense', date: today, concept: GAS.concept, category: GAS.category, amount: GAS.amount, shiftId: null }, ...d.movements] }
  if (n >= 3) {
    d = {
      ...d,
      shifts: [{ id: SHIFT.id, date: today, start: SHIFT.start, end: SHIFT.end, breakMin: SHIFT.breakMin, activity: SHIFT.activity }, ...d.shifts],
      movements: d.movements.map((m) => (m.id === INC.id || m.id === GAS.id ? { ...m, shiftId: SHIFT.id } : m)),
    }
  }
  return d
}

type Step = {
  title: string
  caption: string
  route: 'resumen' | 'impuestos' | 'rentabilidad'
  highlight?: string
  /** Acciones del guion aplicadas al terminar el paso */
  actions: number
  animate?: 'inc' | 'gas' | 'shift'
  /** Texto tras registrar en directo: qué ha cambiado en pantalla */
  after?: string
  final?: boolean
}

const STEPS: Step[] = [
  { title: 'Este es Pablo, taxista en Madrid', caption: 'Arriba, en grande, lo que de verdad le queda: lo facturado menos gastos, cuota de autónomos y reserva de IRPF. Debajo, cuánto es por cada hora.', route: 'resumen', highlight: 'hero', actions: 0 },
  { title: 'Acaba el turno y apunta lo cobrado', caption: 'Pulsa «Añadir ingreso». Solo hace falta el concepto y el importe.', after: 'Ingreso guardado: el disponible sube, pero solo la parte que es suya. El IVA y el IRPF van aparte.', route: 'resumen', highlight: 'hero', actions: 1, animate: 'inc' },
  { title: 'Ha repostado: apunta el gasto', caption: 'Pulsa «Añadir gasto» y elige la categoría.', after: 'Gasto guardado: se descuenta al momento de lo que le queda.', route: 'resumen', highlight: 'hero', actions: 2, animate: 'gas' },
  { title: 'Registra su jornada', caption: 'Pulsa «Registrar jornada»: horas, descanso y los movimientos de ese turno.', after: 'Con las horas trabajadas, NetTime ya sabe cuánto le queda por cada hora.', route: 'resumen', highlight: 'hero', actions: 3, animate: 'shift' },
  { title: '¿Cuánto apartar para Hacienda?', caption: 'La hucha suma el IVA cobrado y la reserva de IRPF, y le dice cuánto le falta por apartar.', route: 'impuestos', highlight: 'hucha', actions: 3 },
  { title: '¿Cuándo le compensa trabajar?', caption: 'Compara sus propias jornadas por día y franja horaria. Sin predicciones inventadas: solo sus datos.', route: 'rentabilidad', highlight: 'insights', actions: 3 },
  { title: 'Deja de trabajar a ciegas.', caption: 'Mirad vuestro correo: tenéis la demo para usarla cuando queráis.', route: 'resumen', actions: 3, final: true },
]

/** Botón que se "pulsa" antes de abrir cada formulario */
const BUTTON = { inc: 'add-income', gas: 'add-expense', shift: 'add-shift' } as const
/** Tiempo que se ve el botón iluminado antes de abrir el formulario */
const PRESS_MS = 1800

const PRESENTER_KEY = 'nettime-presentador'

/** El botón de presentar solo aparece en navegadores que hayan entrado una vez por #/presentar. */
export function isPresenterDevice() {
  try {
    return localStorage.getItem(PRESENTER_KEY) === '1'
  } catch {
    return false
  }
}

function findVisible(name: string): HTMLElement | null {
  return [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)].find((el) => el.getClientRects().length > 0) ?? null
}

type Rect = { top: number; left: number; width: number; height: number }
const PAD = 6

/** Oscurece la pantalla y deja a la vista la zona de la que se habla, como en el tutorial. */
function Spotlight({ target }: { target: string | null }) {
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    setRect(null)
    if (!target) return
    let el: HTMLElement | null = null
    let ro: ResizeObserver | null = null
    const measure = () => {
      if (!el) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
    }
    // Pausa breve: la ruta puede acabar de cambiar y el elemento aún no estar montado
    const t = window.setTimeout(() => {
      el = findVisible(target)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      ro = new ResizeObserver(measure)
      ro.observe(el)
      measure()
    }, 350)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(t)
      ro?.disconnect()
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [target])

  if (!rect) return null
  return (
    <div
      className="pointer-events-none fixed z-[54] animate-fade-up rounded-2xl ring-[3px] ring-mint transition-all duration-500 ease-out"
      style={{ ...rect, boxShadow: '0 0 0 9999px rgb(16 24 20 / 0.6), 0 0 0 10px rgb(126 226 173 / 0.25)' }}
      aria-hidden
    />
  )
}

function FinalSlide() {
  const [qr, setQr] = useState('')
  useEffect(() => {
    QRCode.toString(DEMO_URL, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#101814', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [])
  return (
    <div className="grid-paper fixed inset-0 z-[55] flex animate-fade-up items-center justify-center overflow-y-auto bg-ink px-6 py-10 text-white">
      <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <Logo size={64} />
          <h2 className="mt-8 text-[2.6rem] leading-[1.05] font-semibold sm:text-[4.2rem]">Deja de trabajar<br /><span className="text-mint">a ciegas.</span></h2>
          <p className="mt-6 flex items-center gap-3 text-lg text-white/80 sm:text-xl">
            <Mail className="size-6 shrink-0 text-mint" aria-hidden /> Mirad vuestro correo: tenéis la demo para probarla cuando queráis.
          </p>
          <p className="mt-2 text-white/60">¿Ideas o dudas? Respondednos al correo. Estamos abiertos a sugerencias.</p>
        </div>
        <div className="mx-auto w-full max-w-xs rounded-2xl bg-white p-5 text-center text-ink shadow-2xl">
          {qr ? <div className="aspect-square w-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label="Código QR de la demo" /> : <div className="aspect-square w-full" />}
          <p className="mt-3 text-sm font-semibold break-all">{DEMO_URL.replace('https://', '')}</p>
        </div>
      </div>
    </div>
  )
}

export function Presenter() {
  const { presenting, startPresentation, exitPresentation, replaceData, setPeriod, openForm, closeForm, form, today } = useStore()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  /** Botón iluminado justo antes de abrir un formulario */
  const [pressing, setPressing] = useState<string | null>(null)
  const pressTimer = useRef<number | undefined>(undefined)
  const base = useMemo(() => baseData(today), [today])
  const period: PeriodKey = Number(today.slice(8)) >= 7 ? 'month' : 'all'
  const current = STEPS[step]
  const startRequested = useRef(false)

  const go = (route: Step['route']) => {
    if (window.location.hash !== `#/${route}`) window.location.hash = `#/${route}`
  }

  const start = useCallback(() => {
    startPresentation()
    startRequested.current = true
  }, [startPresentation])

  // Al entrar en modo presentación: datos del guion y primer paso
  useEffect(() => {
    if (!presenting || !startRequested.current) return
    startRequested.current = false
    replaceData(replay(base, 0, today))
    setPeriod(period)
    setStep(0)
    setBusy(false)
    go('resumen')
    window.scrollTo({ top: 0 })
  }, [presenting, base, period, replaceData, setPeriod, today])

  // Enlace directo: #/presentar
  useEffect(() => {
    const check = () => {
      if (window.location.hash !== '#/presentar') return
      try {
        localStorage.setItem(PRESENTER_KEY, '1')
      } catch {
        // sin almacenamiento: el enlace sigue funcionando
      }
      start()
    }
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [start])

  const cancelPress = () => {
    window.clearTimeout(pressTimer.current)
    setPressing(null)
  }

  const exit = useCallback(() => {
    cancelPress()
    setBusy(false)
    exitPresentation()
    go('resumen')
  }, [exitPresentation])

  const next = useCallback(() => {
    if (busy || step >= STEPS.length - 1) return
    const target = STEPS[step + 1]
    go(target.route)
    if (target.animate) {
      const anim = target.animate
      setBusy(true)
      setStep(step + 1)
      // Primero se ilumina el botón que se va a pulsar, para que se vea de dónde sale el formulario
      setPressing(BUTTON[anim])
      const onDone = () => setBusy(false)
      pressTimer.current = window.setTimeout(() => {
        setPressing(null)
        if (anim === 'inc') openForm({ type: 'movement', kind: 'income', date: today, autoplay: INC, onDone })
        else if (anim === 'gas') openForm({ type: 'movement', kind: 'expense', date: today, autoplay: GAS, onDone })
        else openForm({ type: 'shift', autoplay: { ...SHIFT, date: today, movementIds: [INC.id, GAS.id] }, onDone })
      }, PRESS_MS)
    } else {
      replaceData(replay(base, target.actions, today))
      setStep(step + 1)
    }
  }, [busy, step, openForm, today, replaceData, base])

  const prev = useCallback(() => {
    if (step === 0) return
    if (busy) {
      cancelPress()
      closeForm()
      setBusy(false)
    }
    const target = STEPS[step - 1]
    replaceData(replay(base, target.actions, today))
    go(target.route)
    setStep(step - 1)
  }, [busy, step, closeForm, replaceData, base, today])

  // Mando de presentaciones y teclado: → / Av Pág / espacio avanzan; ← / Re Pág retroceden; Esc sale
  useEffect(() => {
    if (!presenting) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); next() }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); prev() }
      else if (e.key === 'Escape' && !form) { e.preventDefault(); exit() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presenting, next, prev, exit, form])

  if (!presenting) return null

  // Qué se ilumina: el botón a punto de pulsarse, nada mientras está el formulario, o la zona del paso
  const spot = pressing ?? (busy ? null : current.highlight ?? null)
  const text = busy ? (pressing ? current.caption : 'Rellenando en directo…') : current.animate ? current.after ?? current.caption : current.caption

  return (
    <>
      {current.final && <FinalSlide />}
      {!current.final && <Spotlight target={spot} />}
      <div role="region" aria-label="Modo presentación" className="fixed inset-x-3 bottom-20 z-[56] flex justify-center lg:bottom-6">
        <div className="flex w-full max-w-3xl animate-fade-up items-center gap-3 rounded-2xl bg-ink/95 py-3.5 pr-3 pl-4 text-white shadow-2xl ring-1 ring-mint/30 backdrop-blur sm:gap-4 sm:pl-5">
          <span className="figure hidden shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold sm:block" aria-hidden>
            {step + 1}<span className="text-white/50">/{STEPS.length}</span>
          </span>
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="font-display text-base font-semibold sm:text-lg">{current.title}</p>
            <p key={text} className="mt-0.5 animate-fade-up text-[13px] leading-snug text-white/80 sm:text-sm">{text}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={prev} disabled={step === 0} aria-label="Paso anterior" className="inline-flex size-10 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-30">
              <ArrowLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={busy || step === STEPS.length - 1}
              className={cx('inline-flex h-10 items-center gap-1.5 rounded-lg bg-mint px-3.5 text-sm font-semibold text-ink hover:brightness-105 disabled:opacity-40', busy && 'animate-pulse')}
            >
              <span className="hidden sm:inline">{step === STEPS.length - 1 ? 'Fin' : 'Siguiente'}</span>
              <ArrowRight className="size-4" aria-hidden />
              <span className="sr-only sm:hidden">Siguiente</span>
            </button>
            <button type="button" onClick={exit} aria-label="Salir del modo presentación" title="Salir (Esc)" className="inline-flex size-10 items-center justify-center rounded-lg text-white/80 hover:bg-white/10">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/** Botón para lanzar el modo presentación. */
export function usePresentation() {
  const { presenting } = useStore()
  return {
    presenting,
    available: isPresenterDevice(),
    start: () => {
      if (window.location.hash === '#/presentar') window.dispatchEvent(new HashChangeEvent('hashchange'))
      else window.location.hash = '#/presentar'
    },
  }
}
