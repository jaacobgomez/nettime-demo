import { ArrowLeftRight, CalendarClock, CircleHelp, LayoutDashboard, PiggyBank, Presentation, RotateCcw } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import markUrl from '../assets/brand/logo-mark.png'
import wordUrl from '../assets/brand/logo-word.png'
import { useStore } from '../store'
import { usePresentation } from './Presenter'
import { ConfirmDialog, cx } from './ui'

// S3: «Días y horarios» y «Objetivo» salen del MVP (backlog del Sprint 4); sus ajustes pasan a la Hucha
export type Route = 'resumen' | 'movimientos' | 'jornadas' | 'impuestos'

export const ROUTES: { id: Route; label: string; short: string; icon: typeof LayoutDashboard }[] = [
  { id: 'resumen', label: 'Resumen', short: 'Resumen', icon: LayoutDashboard },
  { id: 'movimientos', label: 'Movimientos', short: 'Movim.', icon: ArrowLeftRight },
  { id: 'jornadas', label: 'Jornadas y horas', short: 'Jornadas', icon: CalendarClock },
  { id: 'impuestos', label: 'Hucha y ajustes', short: 'Hucha', icon: PiggyBank },
]

/** Logo oficial de NetTime (símbolo + «netTime»), coloreado con currentColor. */
export function Logo({ size = 28, wordmark = true, className }: { size?: number; wordmark?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center', className)} style={{ gap: size * 0.32 }} role="img" aria-label="NetTime">
      <span className="logo-mask shrink-0" style={{ '--logo': `url(${markUrl})`, width: size, height: size } as CSSProperties} />
      {wordmark && (
        <span className="logo-mask" style={{ '--logo': `url(${wordUrl})`, height: size * 0.56, width: size * 0.56 * 4.87 } as CSSProperties} />
      )}
    </span>
  )
}

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const { resetDemo, notify, data, startTour, tourOpen } = useStore()
  const [confirm, setConfirm] = useState(false)
  const presentation = usePresentation()
  const profileName = data.settings.name.trim() || 'Tu perfil'
  const example = tourOpen || presentation.presenting
  const badge = example ? 'Modo demo · Datos de ejemplo' : 'Demo · Tus datos, solo en este navegador'
  // En el móvil, versión corta: la larga empujaba los botones fuera de la pantalla
  const badgeShort = example ? 'Datos de ejemplo' : 'Tus datos'
  const initials = profileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const reset = () => {
    resetDemo()
    notify('Datos borrados. La app está a cero.')
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <button
        type="button"
        onClick={() => document.getElementById('contenido')?.focus()}
        className="sr-only z-50 rounded bg-white px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </button>

      {/* Escritorio: barra lateral en tinta */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-ink px-4 py-6 text-white lg:flex">
        <a href="#/resumen" className="mb-1 block px-2 text-white" aria-label="NetTime, ir al resumen">
          <Logo size={30} />
        </a>
        <p className="mb-8 px-2 text-xs text-white/55">Deja de trabajar a ciegas</p>
        <nav aria-label="Principal" data-tour="nav" className="flex flex-col gap-0.5">
          {ROUTES.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#/${id}`}
              aria-current={route === id ? 'page' : undefined}
              className={cx(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors',
                route === id ? 'bg-white/10 font-semibold text-white' : 'text-white/65 hover:bg-white/5 hover:text-white',
              )}
            >
              {route === id && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-mint" aria-hidden />}
              <Icon className="size-[18px]" aria-hidden />
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-mint/90 font-display text-sm font-semibold text-ink" aria-hidden>{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profileName}</p>
              <p className="truncate text-xs text-white/55">{data.settings.activity}</p>
            </div>
          </div>
          {/* Solo para el equipo: aparece tras entrar una vez por #/presentar */}
          {presentation.available && (
            <button type="button" onClick={presentation.start} className="mb-1 flex w-full items-center gap-2 rounded-lg bg-mint/15 px-2 py-2 text-sm font-semibold text-mint hover:bg-mint/25">
              <Presentation className="size-4" aria-hidden /> Modo presentación
            </button>
          )}
          <button type="button" data-tour="help" onClick={startTour} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
            <CircleHelp className="size-4" aria-hidden /> Ver tutorial
          </button>
          <button type="button" onClick={() => setConfirm(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
            <RotateCcw className="size-4" aria-hidden /> Borrar mis datos
          </button>
          <p className="flex items-center gap-1.5 px-2 pt-2 text-[11px] text-amber-200/90">
            <span className="size-1.5 rounded-full bg-amber-300" aria-hidden /> {badge}
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Móvil y tableta: cabecera */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-ink px-4 py-3 text-white lg:hidden">
          <a href="#/resumen" aria-label="NetTime, ir al resumen" className="shrink-0 text-white"><Logo size={26} /></a>
          <div className="flex min-w-0 items-center gap-1">
            <span title={badge} className="mr-1 inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-amber-100">
              <span className="size-1.5 shrink-0 rounded-full bg-amber-300" aria-hidden /><span className="truncate">{badgeShort}</span>
            </span>
            {presentation.available && (
              <button type="button" onClick={presentation.start} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-mint hover:bg-white/10" aria-label="Modo presentación" title="Modo presentación">
                <Presentation className="size-5" aria-hidden />
              </button>
            )}
            <button type="button" data-tour="help" onClick={startTour} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10" aria-label="Ver tutorial" title="Ver tutorial">
              <CircleHelp className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => setConfirm(true)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10" aria-label="Borrar mis datos" title="Borrar mis datos">
              <RotateCcw className="size-4" aria-hidden />
            </button>
          </div>
        </header>

        <main id="contenido" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-6 pb-28 focus:outline-none sm:px-6 lg:px-10 lg:pt-9 lg:pb-14">
          {children}
        </main>
      </div>

      {/* Móvil y tableta: navegación inferior */}
      <nav aria-label="Principal" data-tour="nav" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {ROUTES.map(({ id, short, label, icon: Icon }) => (
          <a
            key={id}
            href={`#/${id}`}
            aria-current={route === id ? 'page' : undefined}
            aria-label={label}
            className={cx('flex min-w-0 flex-col items-center gap-0.5 px-0.5 py-2 text-[11px] font-medium', route === id ? 'text-ink' : 'text-ink-3')}
          >
            <span className={cx('rounded-full px-3 py-1 transition-colors', route === id && 'bg-ink text-white')}>
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="max-w-full truncate">{short}</span>
          </a>
        ))}
      </nav>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={reset} title="¿Borrar tus datos?" confirmLabel="Borrar">
        Se borrarán todos tus movimientos, jornadas y ajustes de este navegador y la app quedará a cero. Los datos de ejemplo siguen en el tutorial.
      </ConfirmDialog>
    </div>
  )
}
