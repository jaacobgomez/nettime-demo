import { ArrowRight, CalendarClock, Check, Clapperboard, Fuel, Landmark, PiggyBank, Play, ShieldCheck, Smartphone, Timer, X } from 'lucide-react'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Logo } from '../components/Layout'
import { periodRange, summarize } from '../lib/calc'
import { todayISO } from '../lib/dates'
import { eur } from '../lib/format'
import { buildSeed } from '../lib/seed'

/**
 * Vídeo conceptual (1 min). Pega aquí el enlace cuando esté grabado:
 * - YouTube (normal o "oculto"): https://youtu.be/XXXX o https://www.youtube.com/watch?v=XXXX
 * - o un archivo propio en public/, p. ej. 'video-nettime.mp4'
 * Vacío = se muestra el aviso de "próximamente".
 */
export const VIDEO_URL = ''

const APP_URL = '#/resumen'

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  return m ? m[1] : null
}

/** Aparición suave al entrar en pantalla (respeta prefers-reduced-motion vía CSS). */
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
      <span className="flex size-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
        <Clapperboard className="size-7 text-mint" aria-hidden />
      </span>
      <p className="font-display text-xl font-semibold sm:text-2xl">La historia de Pablo, en 1 minuto</p>
      <p className="max-w-sm text-sm text-white/65">Estamos terminando el vídeo. Mientras tanto, prueba la demo con una jornada tuya.</p>
    </div>
  )
}

export default function Landing() {
  const root = useReveal()

  // Cifras del cliente de ejemplo (las mismas que verás en la demo)
  const ex = useMemo(() => {
    const today = todayISO()
    const seed = buildSeed(today)
    const s = summarize(seed, periodRange('all', today, seed), today)
    const billed = s.billedPerHour ?? 0
    const kept = s.availablePerHour ?? 0
    return { billed, kept, pct: billed > 0 ? Math.max(8, Math.min(100, (kept / billed) * 100)) : 0, per100: s.keptPer100 }
  }, [])

  useEffect(() => {
    document.title = 'NetTime · Lo que ganas, de verdad'
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
            <a href={APP_URL} className="ml-1 rounded-full bg-mint px-4 py-1.5 font-semibold text-ink hover:bg-[#98ebc0]">Probar</a>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="grid-paper relative isolate min-h-[100svh] overflow-hidden bg-ink pt-28 pb-20 text-white sm:pt-36">
          <div aria-hidden className="parallax-slow pointer-events-none absolute -top-40 -right-40 -z-10 size-[38rem] rounded-full bg-mint/15 blur-3xl" />
          <div aria-hidden className="parallax-fast pointer-events-none absolute -bottom-48 -left-32 -z-10 size-[30rem] rounded-full bg-income/20 blur-3xl" />
          <div aria-hidden className="float-y pointer-events-none absolute top-1/3 left-[8%] -z-10 hidden size-3 rounded-full bg-mint/70 lg:block" />
          <div aria-hidden className="float-y-delay pointer-events-none absolute right-[12%] bottom-1/4 -z-10 hidden size-2 rounded-full bg-white/50 lg:block" />

          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.15fr_1fr]">
            <div className="reveal">
              <Eyebrow light>Para autónomos del taxi, VTC, transporte y oficios</Eyebrow>
              <h1 className="mt-5 text-[2.9rem] leading-[1.02] font-semibold sm:text-6xl lg:text-7xl">
                Lo que ganas,<br /><span className="text-mint">de verdad.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
                Apunta tu jornada en segundos y descubre cuánto te queda limpio por cada hora, después de gastos, cuota e impuestos.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Cta />
                <button type="button" onClick={() => goTo('video')} className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-medium text-white/85 ring-1 ring-white/20 transition hover:bg-white/5 hover:text-white">
                  <Play className="size-4" aria-hidden /> Ver la historia de Pablo
                </button>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-white/55"><ShieldCheck className="size-4" aria-hidden /> Gratis, sin registro. Tus datos se quedan en tu móvil.</p>
            </div>

            {/* Tarjeta: facturas vs te queda */}
            <div className="reveal reveal-delay relative">
              <div className="tilt rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/15 backdrop-blur-sm sm:p-8">
                <p className="text-sm text-white/60">Pablo, taxista en Madrid · ejemplo</p>
                <dl className="mt-6 space-y-6">
                  <div>
                    <div className="flex items-baseline justify-between"><dt className="text-white/70">Lo que cree que gana</dt><dd className="figure text-2xl font-semibold">{eur(ex.billed)}/h</dd></div>
                    <div className="mt-2 h-3 rounded-full bg-white/10"><div className="bar-grow h-full w-full rounded-full bg-income" /></div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between"><dt className="text-white/70">Lo que le queda de verdad</dt><dd className="figure text-4xl font-semibold text-mint">{eur(ex.kept)}/h</dd></div>
                    <div className="mt-2 h-3 rounded-full bg-white/10"><div className="bar-grow bar-delay h-full rounded-full bg-mint" style={{ width: `${ex.pct}%` }} /></div>
                  </div>
                </dl>
                {ex.per100 !== null && (
                  <p className="mt-7 border-t border-white/10 pt-5 text-[15px] text-white/75">
                    De cada <strong className="text-white">100 €</strong> que factura, le quedan <strong className="figure text-mint">{Math.round(ex.per100)} €</strong>.
                  </p>
                )}
              </div>
            </div>
          </div>

          <button type="button" onClick={() => goTo('problema')} aria-label="Bajar al problema" className="scroll-cue absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 hover:text-white">
            <span className="block h-9 w-5 rounded-full ring-1 ring-current"><span className="mx-auto mt-2 block h-2 w-0.5 rounded-full bg-current" /></span>
          </button>
        </section>

        {/* PROBLEMA */}
        <section id="problema" className="relative scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[1fr_1.1fr]">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <div className="reveal">
                <Eyebrow>El problema</Eyebrow>
                <h2 className="mt-4 text-4xl leading-tight font-semibold sm:text-5xl">Facturar no es ganar.</h2>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-2">
                  Si trabajas por tu cuenta, el dinero entra cada día pero los gastos, la cuota e Hacienda llegan después. Al final del mes no sabes cuánto has ganado de verdad por cada hora al volante.
                </p>
              </div>
            </div>

            <ol className="space-y-5">
              {[
                { icon: Timer, t: '23:00 · Cierra el turno', d: '«Hoy he hecho 180 €. Buen día, ¿no?» Pablo cuenta lo que ha cobrado, no lo que le queda.' },
                { icon: Fuel, t: 'Al día siguiente · Los gastos', d: 'Gasolina, seguro, taller, la cuota de autónomos… Cada uno por su lado y ninguno cuadra con el turno de ayer.' },
                { icon: Landmark, t: 'Fin de trimestre · Hacienda', d: 'Llega el IVA y el IRPF de golpe. El dinero que parecía suyo no lo era, y el susto sí.' },
              ].map(({ icon: Icon, t, d }, i) => (
                <li key={t} className="reveal flex gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-line sm:p-7" style={{ transitionDelay: `${i * 90}ms` }}>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-expense-50 text-expense-700"><Icon className="size-6" aria-hidden /></span>
                  <div>
                    <h3 className="text-lg font-semibold">{t}</h3>
                    <p className="mt-1.5 leading-relaxed text-ink-2">{d}</p>
                  </div>
                </li>
              ))}
              <li className="reveal rounded-2xl bg-ink p-6 text-white sm:p-7">
                <p className="font-display text-2xl leading-snug font-semibold">«Trabajo 10 horas al día y no sé si me compensa.»</p>
                <p className="mt-2 text-sm text-white/60">La pregunta que NetTime responde con tus propias cifras.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* QUÉ FALLA EN LO QUE YA EXISTE */}
        <section className="bg-white py-24 sm:py-28">
          <div className="mx-auto max-w-5xl px-5">
            <div className="reveal max-w-2xl">
              <Eyebrow>Lo que ya existe</Eyebrow>
              <h2 className="mt-4 text-3xl leading-tight font-semibold sm:text-4xl">Las herramientas de siempre te dicen cuánto facturas. No cuánto ganas por hora.</h2>
            </div>
            <div className="reveal mt-10 overflow-x-auto rounded-2xl ring-1 ring-line">
              <table className="w-full text-left text-sm sm:text-[15px]">
                <thead className="bg-canvas text-xs text-ink-2 sm:text-sm">
                  <tr>
                    <th scope="col" className="px-3 py-4 font-medium sm:px-5"><span className="sr-only">Qué ofrece</span></th>
                    <th scope="col" className="px-2 py-4 text-center font-medium sm:px-4">Libreta o Excel</th>
                    <th scope="col" className="px-2 py-4 text-center font-medium sm:px-4">App de facturas</th>
                    <th scope="col" className="px-2 py-4 text-center font-medium sm:px-4">Gestoría</th>
                    <th scope="col" className="bg-ink px-2 py-4 text-center font-semibold text-mint sm:px-4">NetTime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    { q: 'Neto real por hora trabajada', v: [false, false, false] },
                    { q: 'Apuntar una jornada en segundos', v: [false, true, false] },
                    { q: 'Calcula lo que apartar para Hacienda', v: [false, true, true] },
                    { q: 'Qué días y turnos te rinden más', v: [false, false, false] },
                    { q: 'Sin cuotas mensuales', v: [true, false, false] },
                  ].map(({ q, v }) => (
                    <tr key={q}>
                      <th scope="row" className="px-3 py-4 font-medium sm:px-5">{q}</th>
                      {v.map((ok, i) => (
                        <td key={i} className="px-2 py-4 text-center sm:px-4">
                          {ok ? <Check className="mx-auto size-5 text-brand-600" aria-label="Sí" /> : <X className="mx-auto size-5 text-expense" aria-label="No" />}
                        </td>
                      ))}
                      <td className="bg-brand-50 px-2 py-4 text-center sm:px-4"><Check className="mx-auto size-5 text-brand-700" aria-label="Sí" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SOLUCIÓN */}
        <section id="solucion" className="relative isolate scroll-mt-20 overflow-hidden py-24 sm:py-32">
          <div aria-hidden className="parallax-slow pointer-events-none absolute top-10 -left-40 -z-10 size-[32rem] rounded-full bg-brand-100/70 blur-3xl" />
          <div aria-hidden className="parallax-fast pointer-events-none absolute -right-40 bottom-0 -z-10 size-[28rem] rounded-full bg-reserve-50 blur-3xl" />
          <div className="mx-auto max-w-6xl px-5">
            <div className="reveal max-w-2xl">
              <Eyebrow>Cómo te ayuda</Eyebrow>
              <h2 className="mt-4 text-4xl leading-tight font-semibold sm:text-5xl">Apuntas tu jornada. NetTime te dice cuánto te ha quedado.</h2>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {[
                { icon: Smartphone, tone: 'bg-brand-50 text-brand-700', t: 'Tu neto por hora, al momento', d: 'Lo que cobras, lo que gastas y tus horas. En menos de un minuto sabes cuánto te queda limpio por cada hora.' },
                { icon: PiggyBank, tone: 'bg-reserve-50 text-reserve', t: 'Hacienda ya no te pilla', d: 'NetTime aparta cada día lo que tocará pagar de IVA e IRPF. Cuando llega el trimestre, el dinero ya está ahí.' },
                { icon: CalendarClock, tone: 'bg-income-50 text-income-700', t: 'Trabaja cuando más rinde', d: 'Compara días y turnos con tus propias cifras y descubre qué horas te compensan de verdad.' },
              ].map(({ icon: Icon, tone, t, d }, i) => (
                <article key={t} className="reveal group rounded-3xl bg-white/80 p-7 shadow-sm ring-1 ring-line backdrop-blur transition hover:-translate-y-1 hover:shadow-xl" style={{ transitionDelay: `${i * 90}ms` }}>
                  <span className={'flex size-12 items-center justify-center rounded-2xl transition group-hover:scale-110 ' + tone}><Icon className="size-6" aria-hidden /></span>
                  <h3 className="mt-6 text-xl font-semibold">{t}</h3>
                  <p className="mt-2 leading-relaxed text-ink-2">{d}</p>
                </article>
              ))}
            </div>
          </div>
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

        {/* LLAMADA A LA ACCIÓN */}
        <section className="relative isolate overflow-hidden py-24 sm:py-32">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_100%,var(--color-brand-100),transparent_70%)]" />
          <div className="reveal mx-auto max-w-3xl px-5 text-center">
            <h2 className="text-4xl leading-tight font-semibold sm:text-5xl">¿Cuánto te quedó ayer por hora?</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-2">Apunta tu última jornada y descúbrelo en menos de dos minutos. Sin registro y sin dar tu correo.</p>
            <div className="mt-9 flex justify-center"><Cta dark>Calcular mi neto por hora</Cta></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo size={24} className="text-ink" />
          <p>Cifras orientativas: NetTime no sustituye a tu gestoría. Proyecto del equipo NetTime · U-TAD · 2026.</p>
        </div>
      </footer>
    </div>
  )
}
