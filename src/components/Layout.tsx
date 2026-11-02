import { ArrowLeftRight, CalendarClock, ChartColumnBig, LayoutDashboard, PiggyBank, RotateCcw, Target } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useStore } from '../store'
import { ConfirmDialog, cx } from './ui'

export type Route = 'resumen' | 'movimientos' | 'jornadas' | 'impuestos' | 'rentabilidad' | 'objetivo'

export const ROUTES: { id: Route; label: string; short: string; icon: typeof LayoutDashboard }[] = [
  { id: 'resumen', label: 'Resumen', short: 'Resumen', icon: LayoutDashboard },
  { id: 'movimientos', label: 'Movimientos', short: 'Movim.', icon: ArrowLeftRight },
  { id: 'jornadas', label: 'Jornadas y horas', short: 'Jornadas', icon: CalendarClock },
  { id: 'impuestos', label: 'Reserva para impuestos', short: 'Impuestos', icon: PiggyBank },
  { id: 'rentabilidad', label: 'Días y horarios', short: 'Horarios', icon: ChartColumnBig },
  { id: 'objetivo', label: 'Objetivo y ajustes', short: 'Objetivo', icon: Target },
]

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#0f766e" />
        <circle cx="15" cy="17" r="8.5" fill="none" stroke="#fff" strokeWidth="2.4" />
        <path d="M15 12v5l3.5 2.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21.5 9.5 26 5m0 0h-3.6M26 5v3.6" fill="none" stroke="#5eead4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-ink">
          Net<span className="text-brand-600">Time</span>
        </span>
      )}
    </span>
  )
}

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const { resetDemo, notify, data } = useStore()
  const [confirm, setConfirm] = useState(false)

  const reset = () => {
    resetDemo()
    notify('Demo restablecida con los datos de ejemplo.')
  }

  const demoBadge = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium whitespace-nowrap text-amber-900 sm:px-2.5 sm:text-xs">
      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
      Modo demo · Datos de ejemplo
    </span>
  )

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <button
        type="button"
        onClick={() => document.getElementById('contenido')?.focus()}
        className="sr-only z-50 rounded bg-white px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </button>

      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-white px-4 py-5 lg:flex">
        <a href="#/resumen" className="mb-1 rounded-lg px-2" aria-label="NetTime, ir al resumen"><Logo /></a>
        <p className="mb-6 px-2 text-xs text-ink-3">Lo que ganas, de verdad.</p>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {ROUTES.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#/${id}`}
              aria-current={route === id ? 'page' : undefined}
              className={cx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                route === id ? 'bg-brand-50 text-brand-700' : 'text-ink-2 hover:bg-canvas hover:text-ink',
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
              {label}
            </a>
          ))}
        </nav>
        <div className="mt-auto space-y-3 border-t border-line pt-4">
          <div className="px-2">
            <p className="truncate text-sm font-medium text-ink">{data.settings.name}</p>
            <p className="truncate text-xs text-ink-3">{data.settings.activity}</p>
          </div>
          <button type="button" onClick={() => setConfirm(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-2 hover:bg-canvas">
            <RotateCcw className="size-4" aria-hidden />
            Restablecer demo
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Cabecera */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-white/90 px-4 py-2.5 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:px-8 lg:pt-5 lg:pb-0 lg:backdrop-blur-none">
          <a href="#/resumen" className="lg:hidden" aria-label="NetTime, ir al resumen"><Logo /></a>
          <div className="flex items-center gap-2 lg:ml-auto">
            {demoBadge}
            <button type="button" onClick={() => setConfirm(true)} className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-black/5 lg:hidden" aria-label="Restablecer demo" title="Restablecer demo">
              <RotateCcw className="size-4" aria-hidden />
            </button>
          </div>
        </header>

        <main id="contenido" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-5 pb-28 focus:outline-none sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Móvil y tableta */}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {ROUTES.map(({ id, short, label, icon: Icon }) => (
          <a
            key={id}
            href={`#/${id}`}
            aria-current={route === id ? 'page' : undefined}
            aria-label={label}
            className={cx(
              'flex min-w-0 flex-col items-center gap-0.5 px-0.5 py-2 text-[11px] font-medium',
              route === id ? 'text-brand-700' : 'text-ink-3',
            )}
          >
            <span className={cx('rounded-full px-3 py-0.5', route === id && 'bg-brand-50')}>
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="max-w-full truncate">{short}</span>
          </a>
        ))}
      </nav>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={reset}
        title="¿Restablecer la demo?"
        confirmLabel="Restablecer"
      >
        Se borrarán los movimientos, jornadas y ajustes que hayas cambiado y se cargarán de nuevo los datos de ejemplo.
      </ConfirmDialog>
    </div>
  )
}
