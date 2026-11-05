import { ArrowRight, Briefcase, CalendarClock, CarTaxiFront, Clapperboard, Coins, Fuel, Gauge, Info, Landmark, Lightbulb, Moon, NotebookPen, PiggyBank, Play, Receipt, ShieldCheck, Timer, TriangleAlert, Zap, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Logo } from '../components/Layout'
import { periodRange, profitability, summarize } from '../lib/calc'
import { todayISO } from '../lib/dates'
import { eur } from '../lib/format'
import { buildSeed } from '../lib/seed'

/**
 * Vídeo conceptual (1 min). Pega aquí el enlace cuando esté grabado:
 * - YouTube (normal u "oculto"): https://youtu.be/XXXX o https://www.youtube.com/watch?v=XXXX
 * - o un archivo propio en public/, p. ej. 'video-nettime.mp4'
 * Vacío = se muestra el aviso de "próximamente".
 */
export const VIDEO_URL = ''

const APP_URL = '#/resumen'

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  return m ? m[1] : null
}

/** Marca .is-in al entrar en pantalla; las animaciones cuelgan de esa clase (y respetan prefers-reduced-motion). */
function useReveal() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>('.reveal') ?? []
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      }),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return root
}

const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
const d = (ms: number) => ({ transitionDelay: `${ms}ms` }) as CSSProperties

function Cta({ children = 'Pruébalo gratis', dark = false }: { children?: ReactNode; dark?: boolean }) {
  return (
    <a
      href={APP_URL}
      className={
        'group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold shadow-lg transition hover:-translate-y-0.5 ' +
        (dark ? 'bg-ink text-white shadow-ink/20 hover:bg-ink-soft' : 'bg-mint text-ink shadow-mint/20 hover:bg-[#98ebc0]')
      }
    >
      {children}
      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
    </a>
  )
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={'text-xs font-semibold tracking-[0.18em] uppercase ' + (light ? 'text-mint' : 'text-brand-600')}>{children}</p>
}

/* ── Comparativa ─────────────────────────────────────────────── */

const NEEDS: { icon: LucideIcon; label: string }[] = [
  { icon: Gauge, label: 'Neto por hora' },
  { icon: Zap, label: 'En segundos' },
  { icon: Landmark, label: 'Lo de Hacienda' },
  { icon: CalendarClock, label: 'Mejores turnos' },
  { icon: Coins, label: 'Sin cuotas' },
]

const TOOLS: { name: string; icon: LucideIcon | null; has: boolean[]; star?: boolean }[] = [
  { name: 'Libreta o Excel', icon: NotebookPen, has: [false, false, false, false, true] },
  { name: 'App de facturas', icon: Receipt, has: [false, true, true, false, false] },
  { name: 'Gestoría', icon: Briefcase, has: [false, false, true, false, false] },
  { name: 'NetTime', icon: null, has: [true, true, true, true, true], star: true },
]

function Ring({ value, total, dark }: { value: number; total: number; dark?: boolean }) {
  const p = (value / total) * 100
  return (
    <div className="relative size-20 sm:size-24">
      <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.2" className={dark ? 'stroke-white/10' : 'stroke-line'} />
        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.2" strokeLinecap="round" pathLength={100}
          className={'ring-fg ' + (dark ? 'stroke-mint' : value > 1 ? 'stroke-ink-3' : 'stroke-expense')} style={{ '--p': p } as CSSProperties} />
      </svg>
      <span className={'figure absolute inset-0 flex items-center justify-center text-2xl font-semibold ' + (dark ? 'text-mint' : '')}>
        {value}<span className={'text-sm ' + (dark ? 'text-white/50' : 'text-ink-3')}>/{total}</span>
      </span>
    </div>
  )
}

function Compare() {
  return (
    <>
      <ul className="reveal mx-auto flex max-w-3xl flex-wrap justify-center gap-2" aria-label="Lo que necesita un autónomo">
        {NEEDS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2 rounded-full bg-canvas px-3.5 py-2 text-sm font-medium ring-1 ring-line">
            <Icon className="size-4 text-brand-600" aria-hidden /> {label}
          </li>
        ))}
      </ul>
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TOOLS.map(({ name, icon: Icon, has, star }, i) => {
          const n = has.filter(Boolean).length
          return (
            <article key={name} style={d(i * 110)}
              className={'reveal flex flex-col items-center rounded-3xl px-3 py-6 text-center transition sm:p-6 ' +
                (star ? 'grid-paper bg-ink text-white shadow-2xl shadow-brand-700/25 ring-2 ring-mint lg:-translate-y-3 lg:scale-105' : 'bg-white ring-1 ring-line')}>
              <div className={'flex h-10 items-center justify-center ' + (star ? '' : 'text-ink-3')}>
                {Icon ? <Icon className="size-7" aria-hidden /> : <Logo size={26} />}
              </div>
              <h3 className={'mt-3 text-[15px] font-semibold ' + (star ? 'sr-only' : '')}>{name}</h3>
              <div className="mt-4"><Ring value={n} total={has.length} dark={star} /></div>
              <ul className="mt-5 flex gap-1 sm:gap-1.5" aria-label={`${name}: cubre ${n} de ${has.length}`}>
                {NEEDS.map(({ icon: NIcon, label }, j) => (
                  <li key={label} title={`${label}: ${has[j] ? 'sí' : 'no'}`}
                    className={'flex size-[22px] items-center justify-center rounded-md sm:size-8 sm:rounded-lg ' +
                      (has[j] ? (star ? 'bg-mint text-ink' : 'bg-brand-50 text-brand-700') : (star ? 'bg-white/5 text-white/20' : 'bg-canvas text-line-strong'))}>
                    <NIcon className="size-3 sm:size-4" aria-hidden />
                    <span className="sr-only">{label}: {has[j] ? 'sí' : 'no'}</span>
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </>
  )
}

/* ── Historia de Pablo ────────────────────────────────────────── */

/** Ilustraciones de la historia: public/historia/problema.jpg y solucion.jpg (16:10). Si faltan, no se muestran. */
function StoryImg({ file, alt }: { file: string; alt: string }) {
  const [ok, setOk] = useState(true)
  if (!ok) return null
  return (
    <div className="-mx-7 -mt-7 mb-7 aspect-[16/10] overflow-hidden sm:-mx-9 sm:-mt-9 sm:mb-8">
      <img src={`${import.meta.env.BASE_URL}historia/${file}`} alt={alt} loading="lazy" onError={() => setOk(false)}
        className="size-full object-cover transition duration-700 group-hover:scale-105" />
    </div>
  )
}

function Story({ kept }: { kept: number }) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="reveal flex flex-col items-center text-center">
        <span className="mb-5 flex size-20 items-center justify-center rounded-full bg-ink text-mint shadow-xl ring-4 ring-white">
          <CarTaxiFront className="size-9" aria-hidden />
        </span>
        <Eyebrow>La historia de Pablo</Eyebrow>
        <h2 className="mt-4 text-4xl leading-tight font-semibold sm:text-5xl">Diez horas al volante.<br /><span className="text-brand-600">¿Y cuánto es suyo?</span></h2>
        <p className="mt-4 text-ink-2">Pablo, taxista autónomo en Madrid · personaje de ejemplo</p>
      </div>

      <div className="relative mt-14 grid gap-5 md:grid-cols-2 md:gap-10">
        <span aria-hidden className="absolute top-1/2 left-1/2 z-10 hidden size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand-600 shadow-lg ring-1 ring-line md:flex">
          <ArrowRight className="size-5" />
        </span>

        <article className="reveal group overflow-hidden rounded-3xl bg-white p-7 shadow-sm ring-1 ring-line sm:p-9">
          <StoryImg file="problema.jpg" alt="Pablo, de noche en su taxi, preocupado mirando el dinero del día" />
          <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-expense-700 uppercase">
            <span className="flex size-9 items-center justify-center rounded-xl bg-expense-50"><TriangleAlert className="size-5" aria-hidden /></span>
            El problema
          </p>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">
            Cobra <strong className="text-ink">180 €</strong> en diez horas, pero aún faltan gasolina, autónomos y Hacienda.
            ¿Le <strong className="text-ink">compensa</strong>?
          </p>
        </article>

        <article className="reveal group grid-paper overflow-hidden rounded-3xl bg-ink p-7 text-white shadow-2xl shadow-brand-700/20 ring-2 ring-mint sm:p-9" style={d(150)}>
          <StoryImg file="solucion.jpg" alt="Pablo, tranquilo, mirando en el móvil lo que le queda por hora" />
          <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-mint uppercase">
            <span className="flex size-9 items-center justify-center rounded-xl bg-mint/15"><Lightbulb className="size-5" aria-hidden /></span>
            La solución
          </p>
          <p className="mt-5 text-lg leading-relaxed text-white/80">
            Apunta el turno en segundos y ve lo que le queda: <strong className="figure text-mint">{eur(kept)} por hora</strong>.{' '}
            <strong className="text-white">Trabaja mejor, no más.</strong>
          </p>
        </article>
      </div>
    </div>
  )
}

/* ── Equipo ──────────────────────────────────────────────────── */

/**
 * Fotos: deja cada una en public/equipo/ con el nombre de `foto` (cuadrada, ~600 px).
 * Si falta, se ven las iniciales.
 */
const TEAM: { name: string; role: string; foto: string }[] = [
  { name: 'Alejandro Castellanos', role: 'Product Owner · Diseño', foto: 'alejandro.jpg' },
  { name: 'Jacob Gómez', role: 'Scrum Master · Front-end', foto: 'jacob.jpg' },
  { name: 'Manuel Albizu', role: 'Full-stack', foto: 'manuel.jpg' },
  { name: 'Marc Estellers', role: 'Full-stack', foto: 'marc.jpg' },
  { name: 'Pablo Franco', role: 'Front-end · Pruebas', foto: 'pablo.jpg' },
]

function Member({ name, role, foto, i }: { name: string; role: string; foto: string; i: number }) {
  const [noPhoto, setNoPhoto] = useState(false)
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <li className="reveal group flex flex-col items-center text-center" style={d(i * 90)}>
      <div className="relative size-32 overflow-hidden rounded-full bg-ink ring-4 ring-white shadow-lg transition group-hover:-translate-y-1 group-hover:shadow-xl sm:size-36">
        {noPhoto ? (
          <span className="grid-paper flex size-full items-center justify-center font-display text-3xl font-semibold text-mint">{initials}</span>
        ) : (
          <img src={`${import.meta.env.BASE_URL}equipo/${foto}`} alt={`Foto de ${name}`} loading="lazy" onError={() => setNoPhoto(true)} className="size-full object-cover" />
        )}
      </div>
      <h3 className="mt-5 text-lg font-semibold">{name}</h3>
      <p className="mt-1 text-sm font-medium text-brand-600">{role}</p>
    </li>
  )
}

/* ── Vídeo ───────────────────────────────────────────────────── */

function Video() {
  const yt = VIDEO_URL ? youtubeId(VIDEO_URL) : null
  if (yt) {
    return (
      <iframe
        className="aspect-video w-full"
        src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0`}
        title="NetTime en 1 minuto: la historia de Pablo"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        loading="lazy"
      />
    )
  }
  if (VIDEO_URL) {
    return <video className="aspect-video w-full bg-ink" src={VIDEO_URL} controls preload="metadata" playsInline />
  }
  return (
    <div className="grid-paper relative flex aspect-video w-full flex-col items-center justify-center gap-4 bg-ink p-6 text-center text-white">
      <span className="pulse-ring flex size-20 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
        <Clapperboard className="size-8 text-mint" aria-hidden />
      </span>
      <p className="font-display text-xl font-semibold sm:text-2xl">Próximamente</p>
    </div>
  )
}

/* ── Página ──────────────────────────────────────────────────── */

export default function Landing() {
  const root = useReveal()

  // Cifras del cliente de ejemplo: las mismas que verás en la demo
  const ex = useMemo(() => {
    const today = todayISO()
    const seed = buildSeed(today)
    const s = summarize(seed, periodRange('all', today, seed), today)
    const billed = s.billedPerHour ?? 0
    const kept = s.availablePerHour ?? 0
    const base = s.incomeBase || 1
    const per = (n: number) => Math.round((n / base) * 100)
    const expenses = per(s.expenses)
    const quota = per(s.quota)
    const irpf = per(s.irpfReserve)
    const days = profitability(seed).byWeekday.map((g) => ({ label: g.label.slice(0, 1), full: g.label, v: g.marginPerHour ?? 0 }))
    const maxDay = Math.max(1, ...days.map((x) => x.v))
    return {
      billed, kept,
      pct: billed > 0 ? Math.max(8, Math.min(100, (kept / billed) * 100)) : 0,
      steps: [
        { label: 'Factura', value: 100, from: 0, tone: 'bg-income', icon: Timer },
        { label: 'Gastos', value: -expenses, from: 100 - expenses, tone: 'bg-expense', icon: Fuel },
        { label: 'Autónomos', value: -quota, from: 100 - expenses - quota, tone: 'bg-quota', icon: Receipt, hint: 'Cuota mensual de autónomos (Seguridad Social), repartida entre lo que factura.' },
        { label: 'IRPF', value: -irpf, from: 100 - expenses - quota - irpf, tone: 'bg-reserve', icon: Landmark },
        { label: 'Le queda', value: 100 - expenses - quota - irpf, from: 0, tone: 'bg-mint', icon: PiggyBank },
      ],
      days: days.map((x) => ({ ...x, h: Math.max(6, (x.v / maxDay) * 100), best: x.v === maxDay })),
    }
  }, [])

  useEffect(() => {
    document.title = 'NetTime · Deja de trabajar a ciegas'
  }, [])

  return (
    <div ref={root} className="landing overflow-x-clip bg-canvas text-ink">
      {/* Cabecera */}
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-full bg-ink/80 px-4 py-2.5 text-white ring-1 ring-white/10 backdrop-blur-md sm:mx-4 lg:mx-auto">
          <a href="#/" aria-label="NetTime, inicio" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <Logo size={26} />
          </a>
          <nav className="flex items-center gap-1 text-sm">
            <button type="button" onClick={() => goTo('problema')} className="hidden rounded-full px-3 py-1.5 text-white/75 hover:text-white sm:block">El problema</button>
            <button type="button" onClick={() => goTo('solucion')} className="hidden rounded-full px-3 py-1.5 text-white/75 hover:text-white sm:block">Cómo te ayuda</button>
            <button type="button" onClick={() => goTo('video')} className="hidden rounded-full px-3 py-1.5 text-white/75 hover:text-white sm:block">Vídeo</button>
            <button type="button" onClick={() => goTo('equipo')} className="hidden rounded-full px-3 py-1.5 text-white/75 hover:text-white sm:block">Equipo</button>
            <a href={APP_URL} className="ml-1 rounded-full bg-mint px-4 py-1.5 font-semibold text-ink hover:bg-[#98ebc0]">Probar</a>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="grid-paper relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden bg-ink pt-28 pb-24 text-white">
          <div aria-hidden className="parallax-slow pointer-events-none absolute -top-40 -right-40 -z-10 size-[38rem] rounded-full bg-mint/15 blur-3xl" />
          <div aria-hidden className="parallax-fast pointer-events-none absolute -bottom-48 -left-32 -z-10 size-[30rem] rounded-full bg-income/20 blur-3xl" />
          <div aria-hidden className="float-y pointer-events-none absolute top-1/3 left-[8%] -z-10 hidden size-3 rounded-full bg-mint/70 lg:block" />
          <div aria-hidden className="float-y-delay pointer-events-none absolute right-[12%] bottom-1/4 -z-10 hidden size-2 rounded-full bg-white/50 lg:block" />

          <div className="mx-auto grid w-full max-w-6xl items-center gap-16 px-5 lg:grid-cols-[1.15fr_1fr]">
            <div className="reveal">
              <Eyebrow light>Taxi · VTC · Transporte · Oficios</Eyebrow>
              <h1 className="mt-5 text-[2.9rem] leading-[1.02] font-semibold sm:text-6xl lg:text-7xl">
                Deja de trabajar<br /><span className="text-mint">a ciegas</span>
              </h1>
              <p className="mt-6 max-w-md text-xl leading-relaxed text-white/75">Tu neto real por hora, en segundos.</p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Cta />
                <button type="button" onClick={() => goTo('video')} className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-medium text-white/85 ring-1 ring-white/20 transition hover:bg-white/5 hover:text-white">
                  <Play className="size-4" aria-hidden /> Ver la historia
                </button>
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/55">
                <li className="flex items-center gap-1.5"><Coins className="size-4" aria-hidden /> Gratis</li>
                <li className="flex items-center gap-1.5"><Zap className="size-4" aria-hidden /> Sin registro</li>
                <li className="flex items-center gap-1.5"><ShieldCheck className="size-4" aria-hidden /> Datos en tu móvil</li>
              </ul>
            </div>

            {/* Tarjeta: cree que gana vs le queda */}
            <div className="reveal group/card relative" style={d(150)}>
              <div aria-hidden className="absolute inset-0 hidden translate-x-5 translate-y-5 sm:block rounded-3xl bg-white/[0.03] ring-1 ring-white/10" />
              <div aria-hidden className="absolute inset-0 hidden translate-x-10 translate-y-10 sm:block rounded-3xl bg-white/[0.02] ring-1 ring-white/5" />
              <div className="relative isolate z-0">
                <div className="tilt relative rounded-3xl bg-ink-soft p-6 ring-1 ring-white/15 sm:p-8">
                  <p className="text-sm text-white/60">Pablo, taxista · ejemplo</p>
                  <dl className="mt-6 space-y-6">
                    <div>
                      <div className="flex items-baseline justify-between"><dt className="text-white/70">Cree que gana</dt><dd className="figure text-2xl font-semibold">{eur(ex.billed)}/h</dd></div>
                      <div className="mt-2 h-3 rounded-full bg-white/10"><div className="grow-x h-full w-full rounded-full bg-income" style={d(400)} /></div>
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between"><dt className="text-white/70">Le queda</dt><dd className="figure text-4xl font-semibold text-mint">{eur(ex.kept)}/h</dd></div>
                      <div className="mt-2 h-3 rounded-full bg-white/10"><div className="grow-x h-full rounded-full bg-mint" style={{ width: `${ex.pct}%`, ...d(900) }} /></div>
                    </div>
                  </dl>
                </div>
              </div>
              <span aria-hidden className="badge-pop badge-left absolute -top-6 -left-5 z-20 hidden items-center gap-2 rounded-full bg-expense px-3.5 py-2 text-sm font-semibold text-white shadow-xl sm:flex"><Fuel className="size-4" /> −25 € gastos</span>
              <span aria-hidden className="badge-pop badge-right absolute -right-4 -bottom-5 z-20 hidden items-center gap-2 rounded-full bg-reserve px-3.5 py-2 text-sm font-semibold text-white shadow-xl sm:flex"><Landmark className="size-4" /> −10 € IRPF</span>
            </div>
          </div>

          <button type="button" onClick={() => goTo('problema')} aria-label="Bajar al problema" className="scroll-cue absolute bottom-6 hidden sm:block left-1/2 -translate-x-1/2 text-white/50 hover:text-white">
            <span className="block h-9 w-5 rounded-full ring-1 ring-current"><span className="mx-auto mt-2 block h-2 w-0.5 rounded-full bg-current" /></span>
          </button>
        </section>

        {/* PROBLEMA */}
        <section id="problema" className="relative scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-5">
            <div className="reveal text-center">
              <Eyebrow>El problema</Eyebrow>
              <h2 className="mt-4 text-4xl leading-tight font-semibold sm:text-6xl">Facturar no es ganar.</h2>
            </div>

            {/* Tres momentos */}
            <ol className="mx-auto mt-14 grid max-w-4xl grid-cols-3 gap-3 sm:gap-6">
              {[
                { icon: Moon, t: '23:00', s: '180 € cobrados', tone: 'bg-income-50 text-income-700' },
                { icon: Fuel, t: 'Mañana', s: 'Gastos y autónomos', tone: 'bg-expense-50 text-expense-700' },
                { icon: Landmark, t: 'Trimestre', s: 'Hacienda', tone: 'bg-reserve-50 text-reserve' },
              ].map(({ icon: Icon, t, s, tone }, i) => (
                <li key={t} className="reveal relative flex flex-col items-center text-center" style={d(i * 140)}>
                  {i < 2 && <span aria-hidden className="grow-x absolute top-9 left-[calc(50%+2.75rem)] hidden h-0.5 w-[calc(100%-5.5rem+1.5rem)] bg-line-strong sm:block" style={d(300 + i * 140)} />}
                  <span className={'flex size-[4.5rem] items-center justify-center rounded-2xl shadow-sm ' + tone}><Icon className="size-8" aria-hidden /></span>
                  <p className="mt-4 font-display text-lg font-semibold sm:text-xl">{t}</p>
                  <p className="text-sm text-ink-2 sm:text-base">{s}</p>
                </li>
              ))}
            </ol>

            {/* Cascada: de 100 € a lo que queda */}
            <div className="reveal mx-auto mt-16 max-w-4xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-line sm:p-10">
              <p className="text-center font-display text-lg font-semibold sm:text-xl">De cada <span className="text-income">100 €</span> que factura Pablo…</p>
              <div className="mt-8 space-y-3">
                {ex.steps.map(({ label, value, from, tone, icon: Icon, hint }: { label: string; value: number; from: number; tone: string; icon: LucideIcon; hint?: string }, i) => {
                  const w = Math.abs(value)
                  const last = i === ex.steps.length - 1
                  return (
                    <div key={label} className={'grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3 sm:grid-cols-[8rem_1fr_4.5rem] ' + (last ? 'mt-5 border-t border-line pt-5' : '')}>
                      <span className={'flex items-center gap-2 text-sm font-medium sm:text-[15px] ' + (last ? 'font-semibold text-brand-700' : 'text-ink-2')}>
                        <Icon className="size-4 shrink-0" aria-hidden /> {label}
                        {hint && (
                          <span className="group relative inline-flex">
                            <button type="button" aria-label={hint} className="rounded-full text-ink-3 outline-none hover:text-ink focus-visible:text-ink">
                              <Info className="size-3.5" aria-hidden />
                            </button>
                            <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs leading-snug font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                              {hint}
                            </span>
                          </span>
                        )}
                      </span>
                      <div className="relative h-7 rounded-md bg-canvas sm:h-8">
                        <div className={'grow-x absolute inset-y-0 rounded-md ' + tone} style={{ left: `${from}%`, width: `${w}%`, ...d(250 + i * 220) }} />
                      </div>
                      <span className={'figure text-right font-semibold ' + (last ? 'text-2xl text-brand-600' : 'text-ink-2')}>
                        {value < 0 ? '−' : ''}{w} €
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <p className="reveal mt-12 text-center font-display text-2xl font-semibold text-ink-2 sm:text-3xl">«¿Me compensa?»</p>
          </div>
        </section>

        {/* QUÉ FALLA EN LO QUE YA EXISTE */}
        <section className="bg-white py-24 sm:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="reveal mx-auto mb-10 max-w-2xl text-center">
              <Eyebrow>Lo que ya existe</Eyebrow>
              <h2 className="mt-4 text-3xl leading-tight font-semibold sm:text-5xl">Cuentan lo que facturas.<br /><span className="text-brand-600">No lo que ganas.</span></h2>
            </div>
            <Compare />
          </div>
        </section>

        {/* SOLUCIÓN */}
        <section id="solucion" className="relative isolate scroll-mt-20 overflow-hidden py-24 sm:py-32">
          <div aria-hidden className="parallax-slow pointer-events-none absolute top-10 -left-40 -z-10 size-[32rem] rounded-full bg-brand-100/70 blur-3xl" />
          <div aria-hidden className="parallax-fast pointer-events-none absolute -right-40 bottom-0 -z-10 size-[28rem] rounded-full bg-reserve-50 blur-3xl" />
          <div className="mx-auto max-w-6xl px-5">
            <div className="reveal mx-auto max-w-2xl text-center">
              <Eyebrow>Cómo te ayuda</Eyebrow>
              <h2 className="mt-4 text-4xl leading-tight font-semibold sm:text-5xl">Apuntas. Ves. Decides.</h2>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {/* 1 · Neto por hora */}
              <article className="reveal group flex flex-col overflow-hidden rounded-3xl bg-white/85 shadow-sm ring-1 ring-line backdrop-blur transition hover:-translate-y-1 hover:shadow-xl">
                <div className="grid-paper flex h-56 items-center justify-center bg-ink">
                  <div className="w-36 rounded-[1.6rem] bg-ink-soft p-2 ring-1 ring-white/15 shadow-2xl transition group-hover:-rotate-2">
                    <div className="rounded-[1.2rem] bg-canvas px-3 pt-4 pb-5 text-center">
                      <Logo size={14} wordmark={false} className="text-ink" />
                      <p className="mt-2 text-[10px] text-ink-3">Te quedan</p>
                      <p className="figure text-2xl font-semibold text-brand-600">{eur(ex.kept)}</p>
                      <p className="text-[10px] text-ink-3">por hora</p>
                      <div className="mt-3 h-1.5 rounded-full bg-line"><div className="grow-x h-full rounded-full bg-mint" style={{ width: `${ex.pct}%`, ...d(400) }} /></div>
                    </div>
                  </div>
                </div>
                <div className="p-6"><h3 className="text-xl font-semibold">Tu neto por hora</h3><p className="mt-1 text-ink-2">Al cerrar el turno.</p></div>
              </article>

              {/* 2 · Hucha */}
              <article className="reveal group flex flex-col overflow-hidden rounded-3xl bg-white/85 shadow-sm ring-1 ring-line backdrop-blur transition hover:-translate-y-1 hover:shadow-xl" style={d(110)}>
                <div className="flex h-56 items-end justify-center gap-5 bg-reserve-50 pb-8">
                  {[{ l: 'IVA', h: 70 }, { l: 'IRPF', h: 45 }].map(({ l, h }, i) => (
                    <div key={l} className="flex flex-col items-center gap-2">
                      <div className="relative h-32 w-16 overflow-hidden rounded-b-2xl rounded-t-lg border-2 border-reserve/40 bg-white">
                        <div className="grow-y absolute inset-x-0 bottom-0 bg-reserve/80" style={{ height: `${h}%`, ...d(400 + i * 250) }} />
                      </div>
                      <span className="text-xs font-semibold text-reserve">{l}</span>
                    </div>
                  ))}
                  <PiggyBank className="mb-6 size-14 text-reserve transition group-hover:-translate-y-1" aria-hidden />
                </div>
                <div className="p-6"><h3 className="text-xl font-semibold">Hacienda, apartada</h3><p className="mt-1 text-ink-2">Cada día, sin sustos.</p></div>
              </article>

              {/* 3 · Mejores turnos */}
              <article className="reveal group flex flex-col overflow-hidden rounded-3xl bg-white/85 shadow-sm ring-1 ring-line backdrop-blur transition hover:-translate-y-1 hover:shadow-xl" style={d(220)}>
                <div className="flex h-56 items-end justify-center gap-2.5 bg-income-50 px-6 pb-7">
                  {ex.days.map(({ label, full, h, best }, i) => (
                    <div key={full} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={full}>
                      <div className="flex w-full flex-1 items-end">
                        <div className={'grow-y w-full rounded-t-md ' + (best ? 'bg-brand-500' : 'bg-income/35')} style={{ height: `${h}%`, ...d(300 + i * 80) }} />
                      </div>
                      <span className={'text-xs font-semibold ' + (best ? 'text-brand-700' : 'text-ink-3')}>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="p-6"><h3 className="text-xl font-semibold">Tus mejores turnos</h3><p className="mt-1 text-ink-2">Trabaja cuando más rinde.</p></div>
              </article>
            </div>
          </div>
        </section>

        {/* HISTORIA DE PABLO */}
        <section id="historia" className="relative isolate scroll-mt-20 overflow-hidden bg-white py-24 sm:py-32">
          <div aria-hidden className="parallax-slow pointer-events-none absolute -top-32 right-0 -z-10 size-[26rem] rounded-full bg-expense-50 blur-3xl" />
          <div aria-hidden className="parallax-fast pointer-events-none absolute bottom-0 -left-32 -z-10 size-[26rem] rounded-full bg-brand-100/70 blur-3xl" />
          <div className="px-5"><Story kept={ex.kept} /></div>
        </section>

        {/* VÍDEO */}
        <section id="video" className="grid-paper relative scroll-mt-20 bg-ink py-24 text-white sm:py-32">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <div className="reveal">
              <Eyebrow light>En 1 minuto</Eyebrow>
              <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">Un turno de Pablo, antes y después.</h2>
            </div>
            <div className="reveal mt-10 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/15">
              <Video />
            </div>
          </div>
        </section>

        {/* EQUIPO */}
        <section id="equipo" className="scroll-mt-20 bg-white py-24 sm:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="reveal mx-auto max-w-2xl text-center">
              <Eyebrow>El equipo</Eyebrow>
              <h2 className="mt-4 text-4xl leading-tight font-semibold sm:text-5xl">Quién está detrás.</h2>
            </div>
            <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5 [&>li:last-child]:col-span-2 sm:[&>li:last-child]:col-span-1">
              {TEAM.map((m, i) => <Member key={m.name} {...m} i={i} />)}
            </ul>
          </div>
        </section>

        {/* LLAMADA A LA ACCIÓN */}
        <section className="relative isolate overflow-hidden py-24 sm:py-32">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_100%,var(--color-brand-100),transparent_70%)]" />
          <div className="reveal mx-auto max-w-3xl px-5 text-center">
            <Timer className="mx-auto size-10 text-brand-600" aria-hidden />
            <h2 className="mt-5 text-4xl leading-tight font-semibold sm:text-5xl">¿Cuánto te quedó ayer por hora?</h2>
            <p className="mx-auto mt-4 text-lg text-ink-2">Apunta tu última jornada. Menos de 2 minutos.</p>
            <div className="mt-9 flex justify-center"><Cta dark>Calcular mi neto por hora</Cta></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo size={24} className="text-ink" />
          <p>Cifras orientativas: no sustituye a tu gestoría. Equipo NetTime · U-TAD · 2026.</p>
        </div>
      </footer>
    </div>
  )
}
