import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { PERIOD_LABELS, periodRange } from '../lib/calc'
import { rangeLabel } from '../lib/format'
import type { PeriodKey } from '../lib/types'
import { useStore } from '../store'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

// ───────────── Botones ─────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-soft',
  secondary: 'bg-white text-ink border border-line-strong/70 hover:border-ink/40',
  ghost: 'text-ink-2 hover:bg-black/5',
  danger: 'bg-expense-700 text-white hover:bg-expense',
}

export function Button({
  variant = 'secondary', size = 'md', className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-[background-color,border-color,transform] active:scale-[0.98] disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-11 px-4 text-[15px]',
        VARIANTS[variant],
        className,
      )}
    />
  )
}

export function IconButton({ label, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx('inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-black/5', className)}
    >
      {children}
    </button>
  )
}

// ───────────── Superficies ─────────────

export function Card({ className, children, as: Tag = 'section', ...rest }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article'; 'aria-labelledby'?: string }) {
  return (
    <Tag {...rest} className={cx('rounded-xl border border-line bg-white p-4 sm:p-6', className)}>
      {children}
    </Tag>
  )
}

export function CardTitle({ id, children, aside }: { id?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-lg font-semibold text-ink">{children}</h2>
      {aside}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.9rem] leading-tight font-semibold text-ink sm:text-[2.3rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'income' | 'expense' | 'warn' | 'ok'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-canvas text-ink-2 border-line',
    income: 'bg-income-50 text-income-700 border-income/20',
    expense: 'bg-expense-50 text-expense-700 border-expense/20',
    warn: 'bg-amber-50 text-amber-900 border-amber-200',
    ok: 'bg-brand-50 text-brand-700 border-brand-100',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', tones[tone])}>{children}</span>
}

export function Help({ summary = '¿Cómo se calcula?', children }: { summary?: string; children: ReactNode }) {
  return (
    <details className="group mt-3 rounded-lg bg-canvas px-3 py-2 text-sm text-ink-2">
      <summary className="flex items-center gap-1.5 font-medium text-ink marker:content-none">
        <Info className="size-4" aria-hidden />
        {summary}
      </summary>
      <div className="mt-2 space-y-1.5 leading-relaxed">{children}</div>
    </details>
  )
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-3 rounded-full bg-canvas p-3 text-ink-3">{icon}</div>
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-2">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ───────────── Formularios ─────────────

export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: string; id: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-3">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 flex items-center gap-1 text-xs font-medium text-expense-700">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

export const inputCls = (error?: string) =>
  cx(
    'h-11 w-full min-w-0 rounded-lg border bg-white px-3 text-[15px] text-ink placeholder:text-ink-3',
    'focus:border-income focus:ring-2 focus:ring-income/15 focus:outline-none',
    error ? 'border-expense-700' : 'border-line-strong/70',
  )

export const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined

// ───────────── Diálogo ─────────────

export function Dialog({ open, onClose, title, children, footer, size = 'md' }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!open || !d) return
    const opener = document.activeElement as HTMLElement | null
    if (!d.open) d.showModal()
    return () => {
      if (d.open) d.close()
      // Devolver el foco a quien abrió el diálogo (o al contenido si ya no existe)
      const target = opener && document.contains(opener) && opener !== document.body ? opener : document.getElementById('contenido')
      target?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      className={cx(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl bg-white p-0 text-ink shadow-xl',
        size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-2xl' : 'max-w-xl',
      )}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          <IconButton label="Cerrar" onClick={onClose}><X className="size-5" aria-hidden /></IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3">{footer}</div>}
      </div>
    </dialog>
  )
}

export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onClose, tone = 'danger' }: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  tone?: 'danger' | 'primary'
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onClose} autoFocus>Cancelar</Button>
          <Button variant={tone} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-ink-2">{children}</div>
    </Dialog>
  )
}

// ───────────── Periodo ─────────────

export function PeriodSelector() {
  const { period, setPeriod, today, data } = useStore()
  const r = periodRange(period, today, data)
  const keys: PeriodKey[] = ['week', 'month', 'all']
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div role="group" aria-label="Periodo" data-tour="period" className="inline-flex rounded-full border border-line-strong/60 bg-white p-1">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={period === k}
            onClick={() => setPeriod(k)}
            className={cx(
              'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
              period === k ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink',
            )}
          >
            {PERIOD_LABELS[k]}
          </button>
        ))}
      </div>
      <p className="text-sm text-ink-2" aria-live="polite">
        <span className="sr-only">Periodo consultado: </span>
        {rangeLabel(r.from, r.to)}
      </p>
    </div>
  )
}

// ───────────── Avisos ─────────────

export function Toasts() {
  const { toasts, dismiss } = useStore()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-20 z-50 flex flex-col items-center gap-2 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-xl',
            t.tone === 'error' ? 'bg-expense-700 text-white' : 'bg-ink text-white',
          )}
        >
          {t.tone === 'error' ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden />}
          <span className="flex-1">{t.text}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="-m-1 rounded p-1 hover:bg-white/10">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}
