import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useStore } from '../store'
import { Logo } from './Layout'
import { cx } from './ui'

type Step = { target?: string; title: string; body: string }

const STEPS: Step[] = [
  {
    title: 'Bienvenido a NetTime',
    body: 'Te enseñamos lo esencial en un minuto. Verás los datos de ejemplo de Pablo Álvarez, taxista autónomo en Madrid. Puedes tocarlo todo: nada sale de tu navegador.',
  },
  {
    target: 'hero',
    title: 'Deja de trabajar a ciegas',
    body: 'Lo que facturas por hora no es lo que te queda. Aquí ves tu disponible después de gastos, cuota de autónomos y reserva de IRPF, y cuánto es por cada hora trabajada.',
  },
  {
    target: 'period',
    title: 'Elige qué periodo mirar',
    body: 'Cambia entre esta semana, este mes o todo el historial. Todas las cifras de la pantalla se recalculan al momento.',
  },
  {
    target: 'actions',
    title: 'Registra en segundos',
    body: 'Añade un ingreso al terminar una carrera, un gasto al repostar o la jornada completa. Prueba ahora: los totales cambian al guardar.',
  },
  {
    target: 'breakdown',
    title: 'De lo que facturas a lo que te queda',
    body: 'El desglose muestra qué se lleva cada parte: gastos, cuota y reserva de IRPF. El IVA va aparte porque no es tuyo.',
  },
  {
    target: 'nav',
    title: 'Todo lo demás, aquí',
    body: 'En la hucha ves cuánto apartar para impuestos, y en «Días y horarios», cuándo te compensa trabajar según tus propios registros.',
  },
  {
    target: 'help',
    title: '¿Se te olvida algo?',
    body: 'Vuelve a abrir este tutorial cuando quieras desde aquí.',
  },
]

type Rect = { top: number; left: number; width: number; height: number }
const PAD = 8

function findTarget(name: string): HTMLElement | null {
  const all = [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)]
  return all.find((el) => el.getClientRects().length > 0) ?? null
}

export function Tour() {
  const { tourOpen, endTour } = useStore()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [vw, setVw] = useState(() => window.innerWidth)
  const [vh, setVh] = useState(() => window.innerHeight)
  const card = useRef<HTMLDivElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const bodyId = useId()
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  // Al abrir: empezar desde el principio y recordar el foco
  useEffect(() => {
    if (!tourOpen) return
    opener.current = document.activeElement as HTMLElement | null
    setI(0)
    return () => {
      const el = opener.current
      if (el && document.contains(el) && el !== document.body) el.focus()
    }
  }, [tourOpen])

  const measure = useCallback(() => {
    setVw(window.innerWidth)
    setVh(window.innerHeight)
    if (!step?.target) return setRect(null)
    const el = findTarget(step.target)
    if (!el) return setRect(null)
    const r = el.getBoundingClientRect()
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
  }, [step])

  // Llevar el elemento a la vista y medir
  useLayoutEffect(() => {
    if (!tourOpen) return
    const el = step?.target ? findTarget(step.target) : null
    if (el) {
      const r = el.getBoundingClientRect()
      const fixed = getComputedStyle(el).position === 'fixed' || el.closest('aside, nav.fixed')
      if (!fixed && (r.top < 80 || r.bottom > window.innerHeight - 220)) {
        window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 96), behavior: 'instant' as ScrollBehavior })
      }
    }
    measure()
  }, [tourOpen, i, step, measure])

  useEffect(() => {
    if (!tourOpen) return
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [tourOpen, measure])

  useEffect(() => {
    if (tourOpen) primary.current?.focus()
  }, [tourOpen, i])

  if (!tourOpen) return null

  const next = () => (last ? endTour() : setI((n) => n + 1))
  const prev = () => setI((n) => Math.max(0, n - 1))

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); endTour() }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next() }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
    else if (e.key === 'Tab' && card.current) {
      // Foco atrapado dentro de la tarjeta
      const f = [...card.current.querySelectorAll<HTMLElement>('button')]
      const first = f[0]
      const lastEl = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus() }
    }
  }

  // Posición de la tarjeta: debajo del objetivo si cabe; si no, encima; en móvil, a todo el ancho
  const W = Math.min(380, vw - 24)
  let style: React.CSSProperties
  if (!rect) {
    style = { left: (vw - Math.min(440, vw - 24)) / 2, top: Math.max(24, vh / 2 - 200), width: Math.min(440, vw - 24) }
  } else {
    const below = rect.top + rect.height + 12
    const fitsBelow = below + 230 < vh
    const left = Math.min(Math.max(12, rect.left), vw - W - 12)
    style = fitsBelow ? { left, top: below, width: W } : { left, top: Math.max(12, rect.top - 12 - 230), width: W }
    // Objetivo muy alto (barra lateral): tarjeta a su derecha
    if (rect.height > vh * 0.5 && rect.left + rect.width + W + 24 < vw) {
      style = { left: rect.left + rect.width + 12, top: Math.min(Math.max(12, rect.top), vh - 260), width: W }
    }
  }

  return (
    <div className="fixed inset-0 z-[60]" onKeyDown={onKey}>
      {/* Capa oscura con hueco sobre el elemento */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-2 ring-mint transition-all duration-300 ease-out"
          style={{ ...rect, boxShadow: '0 0 0 9999px rgb(16 24 20 / 0.62)' }}
          aria-hidden
        />
      ) : (
        <div className="fixed inset-0 bg-ink/70 backdrop-blur-[2px]" aria-hidden />
      )}

      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cx('fixed animate-pop overflow-hidden rounded-2xl bg-white text-ink shadow-2xl transition-[top,left] duration-300', !rect && 'text-center')}
        style={style}
        key={i}
      >
        {!rect && (
          <div className="grid-paper flex flex-col items-center gap-2 bg-ink px-6 pt-8 pb-6 text-white">
            <Logo size={44} />
            <p className="text-sm text-white/70">Deja de trabajar a ciegas</p>
          </div>
        )}
        <div className="p-5">
          <div className={cx('mb-1 flex items-center justify-between gap-2', !rect && 'justify-center')}>
            <p className="text-xs font-medium text-ink-3">{i === 0 ? 'Tutorial' : `Paso ${i} de ${STEPS.length - 1}`}</p>
            {rect && (
              <button type="button" onClick={endTour} aria-label="Cerrar tutorial" className="-m-1 rounded-md p-1 text-ink-3 hover:bg-canvas">
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
          <h2 id={titleId} className="text-xl font-semibold">{step.title}</h2>
          <p id={bodyId} className="mt-2 text-[15px] leading-relaxed text-ink-2">{step.body}</p>

          <div className={cx('mt-4 flex items-center gap-1.5', !rect && 'justify-center')} aria-hidden>
            {STEPS.map((_, n) => (
              <span key={n} className={cx('h-1.5 rounded-full transition-all', n === i ? 'w-5 bg-ink' : 'w-1.5 bg-line-strong')} />
            ))}
          </div>

          <div className={cx('mt-5 flex items-center gap-2', rect ? 'justify-between' : 'justify-center')}>
            {i === 0 ? (
              <button type="button" onClick={endTour} className="h-10 rounded-lg px-4 text-sm font-medium text-ink-2 hover:bg-canvas">Saltar</button>
            ) : (
              <button type="button" onClick={prev} className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-ink-2 hover:bg-canvas">
                <ArrowLeft className="size-4" aria-hidden /> Atrás
              </button>
            )}
            <button ref={primary} type="button" onClick={next} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft">
              {i === 0 ? 'Empezar' : last ? 'Entendido' : 'Siguiente'}
              {!last && <ArrowRight className="size-4" aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
