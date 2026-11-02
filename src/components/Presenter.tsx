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
  final?: boolean
}

const STEPS: Step[] = [
  { title: 'Este es Pablo, taxista en Madrid', caption: 'Sabe lo que factura por hora. Lo que no sabe es cuánto le queda de verdad.', route: 'resumen', highlight: 'hero', actions: 0 },
  { title: 'Acaba el turno y apunta lo cobrado', caption: 'Registrar un ingreso le lleva segundos.', route: 'resumen', highlight: 'hero', actions: 1, animate: 'inc' },
  { title: 'Ha repostado: apunta el gasto', caption: 'Cada gasto se descuenta al momento de lo que le queda.', route: 'resumen', highlight: 'hero', actions: 2, animate: 'gas' },
  { title: 'Registra su jornada', caption: 'Con las horas, NetTime calcula cuánto le queda por cada hora trabajada.', route: 'resumen', highlight: 'hero', actions: 3, animate: 'shift' },
  { title: '¿Cuánto apartar para Hacienda?', caption: 'IVA cobrado más reserva de IRPF: la hucha le dice cuánto le falta.', route: 'impuestos', highlight: 'hucha', actions: 3 },
  { title: '¿Cuándo le compensa trabajar?', caption: 'Comparando sus propias jornadas, sin predicciones inventadas.', route: 'rentabilidad', highlight: 'insights', actions: 3 },
  { title: 'Lo que ganas, de verdad.', caption: 'Mirad vuestro correo: tenéis la demo para usarla cuando queráis.', route: 'resumen', actions: 3, final: true },
]

function findVisible(name: string): HTMLElement | null {
  return [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)].find((el) => el.getClientRects().length > 0) ?? null
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
          <h2 className="mt-8 text-[2.6rem] leading-[1.05] font-semibold sm:text-[4.2rem]">Lo que ganas,<br /><span className="text-mint">de verdad.</span></h2>
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
      if (window.location.hash === '#/presentar') start()
    }
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [start])

  const exit = useCallback(() => {
    setBusy(false)
    exitPresentation()
    go('resumen')
  }, [exitPresentation])

  const next = useCallback(() => {
    if (busy || step >= STEPS.length - 1) return
    const target = STEPS[step + 1]
    go(target.route)
    if (target.animate) {
      setBusy(true)
      setStep(step + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      const onDone = () => setBusy(false)
      // Pequeña pausa para que el público vea la pantalla antes de que se abra el formulario
      window.setTimeout(() => {
        if (target.animate === 'inc') openForm({ type: 'movement', kind: 'income', date: today, autoplay: INC, onDone })
        else if (target.animate === 'gas') openForm({ type: 'movement', kind: 'expense', date: today, autoplay: GAS, onDone })
        else openForm({ type: 'shift', autoplay: { ...SHIFT, date: today, movementIds: [INC.id, GAS.id] }, onDone })
      }, 450)
    } else {
      replaceData(replay(base, target.actions, today))
      setStep(step + 1)
    }
  }, [busy, step, openForm, today, replaceData, base])

  const prev = useCallback(() => {
    if (step === 0) return
    if (busy) {
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

  // Resaltar la zona de la que se habla
  useEffect(() => {
    if (!presenting || busy || !current.highlight) return
    let el: HTMLElement | null = null
    const t = window.setTimeout(() => {
      el = findVisible(current.highlight!)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('present-glow')
    }, 380)
    return () => {
      window.clearTimeout(t)
      el?.classList.remove('present-glow')
    }
  }, [presenting, busy, current, step])

  if (!presenting) return null

  return (
    <>
      {current.final && <FinalSlide />}
      <div role="region" aria-label="Modo presentación" className="fixed inset-x-3 bottom-20 z-[56] flex justify-center lg:bottom-6">
        <div className="flex w-full max-w-3xl animate-fade-up items-center gap-3 rounded-2xl bg-ink/95 py-3 pr-3 pl-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur sm:gap-4 sm:pl-5">
          <span className="figure hidden shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold sm:block" aria-hidden>
            {step + 1}<span className="text-white/50">/{STEPS.length}</span>
          </span>
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="truncate font-display text-[15px] font-semibold sm:text-base">{current.title}</p>
            <p className="line-clamp-2 text-xs text-white/65 sm:text-[13px]">{busy ? 'Registrando en directo…' : current.caption}</p>
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
    start: () => {
      if (window.location.hash === '#/presentar') window.dispatchEvent(new HashChangeEvent('hashchange'))
      else window.location.hash = '#/presentar'
    },
  }
}
