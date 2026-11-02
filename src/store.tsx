import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { todayISO, type ISODate } from './lib/dates'
import { buildSeed } from './lib/seed'
import { load, newId, save, STORAGE_KEY } from './lib/storage'
import type { AppData, Movement, PeriodKey, Settings, Shift } from './lib/types'

export type Toast = { id: number; text: string; tone: 'success' | 'error' | 'info' }

/** Rellenado automático del modo presentación: escribe solo y guarda al terminar. */
export type MovementAutoplay = { id: string; concept: string; amount: number; source?: string; category?: string; shiftId?: string | null }
export type ShiftAutoplay = { id: string; date: ISODate; start: string; end: string; breakMin: number; activity: string; movementIds: string[] }

export type FormRequest =
  | { type: 'movement'; kind: 'income' | 'expense'; movement?: Movement; date?: ISODate; shiftId?: string; autoplay?: MovementAutoplay; onDone?: () => void }
  | { type: 'shift'; shift?: Shift; autoplay?: ShiftAutoplay; onDone?: () => void }

type Draft<T> = T extends unknown ? Omit<T, 'id'> & { id?: string } : never

type Store = {
  data: AppData
  today: ISODate
  period: PeriodKey
  setPeriod: (p: PeriodKey) => void
  saveMovement: (m: Draft<Movement>) => void
  deleteMovement: (id: string) => void
  saveShift: (s: Omit<Shift, 'id'> & { id?: string }, movementIds: string[]) => void
  deleteShift: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetDemo: () => void
  toasts: Toast[]
  notify: (text: string, tone?: Toast['tone']) => void
  dismiss: (id: number) => void
  tourOpen: boolean
  startTour: () => void
  endTour: () => void
  form: FormRequest | null
  openForm: (f: FormRequest) => void
  closeForm: () => void
  /** Modo presentación: los cambios no se guardan y al salir se recupera lo anterior */
  presenting: boolean
  startPresentation: () => void
  exitPresentation: () => void
  replaceData: (d: AppData) => void
}

const TOUR_KEY = 'nettime-tutorial-visto'

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => todayISO(), [])
  const initial = useMemo(() => load(today), [today])
  const [data, setData] = useState<AppData>(initial.data)
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [form, setForm] = useState<FormRequest | null>(null)
  const [tourOpen, setTourOpen] = useState(() => {
    try {
      return localStorage.getItem(TOUR_KEY) === null
    } catch {
      return false
    }
  })
  const [presenting, setPresenting] = useState(false)
  const snapshot = useRef<{ data: AppData; period: PeriodKey } | null>(null)
  const toastId = useRef(0)
  const saveFailed = useRef(false)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const notify = useCallback(
    (text: string, tone: Toast['tone'] = 'success') => {
      const id = ++toastId.current
      setToasts((t) => [...t.slice(-2), { id, text, tone }])
      window.setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  useEffect(() => {
    if (initial.status === 'recovered') notify('Los datos guardados estaban dañados. Se ha cargado la demo original.', 'error')
  }, [initial.status, notify])

  useEffect(() => {
    if (presenting) return
    const ok = save(data)
    if (!ok && !saveFailed.current) notify('No se pueden guardar los cambios en este navegador.', 'error')
    saveFailed.current = !ok
  }, [data, notify, presenting])

  // Otra pestaña ha cambiado los datos
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setData(load(today).data)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [today])

  const saveMovement: Store['saveMovement'] = useCallback((m) => {
    setData((d) => {
      if (m.id && d.movements.some((x) => x.id === m.id)) {
        return { ...d, movements: d.movements.map((x) => (x.id === m.id ? ({ ...m, id: m.id } as Movement) : x)) }
      }
      if (m.id) return { ...d, movements: [{ ...m, id: m.id } as Movement, ...d.movements] }
      return { ...d, movements: [{ ...m, id: newId('m') } as Movement, ...d.movements] }
    })
  }, [])

  const deleteMovement = useCallback((id: string) => {
    setData((d) => ({ ...d, movements: d.movements.filter((m) => m.id !== id) }))
  }, [])

  const saveShift: Store['saveShift'] = useCallback((s, movementIds) => {
    setData((d) => {
      const id = s.id ?? newId('j')
      const shift: Shift = { ...s, id }
      const exists = d.shifts.some((x) => x.id === id)
      const shifts = exists ? d.shifts.map((x) => (x.id === id ? shift : x)) : [shift, ...d.shifts]
      const chosen = new Set(movementIds)
      // Un movimiento solo puede estar en una jornada: se reasigna, nunca se duplica.
      const movements = d.movements.map((m) => {
        if (chosen.has(m.id)) return m.shiftId === id ? m : { ...m, shiftId: id }
        if (m.shiftId === id) return { ...m, shiftId: null }
        return m
      })
      return { ...d, shifts, movements }
    })
  }, [])

  const deleteShift = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      shifts: d.shifts.filter((s) => s.id !== id),
      movements: d.movements.map((m) => (m.shiftId === id ? { ...m, shiftId: null } : m)),
    }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  }, [])

  const resetDemo = useCallback(() => {
    setData(buildSeed(today))
    setPeriod('month')
  }, [today])

  const startTour = useCallback(() => {
    setForm(null)
    if (!window.location.hash.startsWith('#/resumen') && window.location.hash !== '') window.location.hash = '#/resumen'
    setTourOpen(true)
  }, [])
  const endTour = useCallback(() => {
    setTourOpen(false)
    try {
      localStorage.setItem(TOUR_KEY, '1')
    } catch {
      // sin almacenamiento: se volverá a mostrar, no pasa nada
    }
  }, [])

  const startPresentation = useCallback(() => {
    if (presenting) return
    snapshot.current = { data, period }
    setForm(null)
    setTourOpen(false)
    setPresenting(true)
  }, [data, period, presenting])
  const exitPresentation = useCallback(() => {
    const snap = snapshot.current
    setForm(null)
    setPresenting(false)
    if (snap) {
      setData(snap.data)
      setPeriod(snap.period)
    }
    snapshot.current = null
  }, [])

  const value: Store = {
    data, today, period, setPeriod, saveMovement, deleteMovement, saveShift, deleteShift, updateSettings, resetDemo,
    toasts, notify, dismiss, tourOpen, startTour, endTour, form, openForm: setForm, closeForm: () => setForm(null),
    presenting, startPresentation, exitPresentation, replaceData: setData,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fuera de StoreProvider')
  return s
}
