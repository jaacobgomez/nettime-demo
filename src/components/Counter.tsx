import { useEffect, useRef, useState } from 'react'

/** Cifra que se anima al cambiar (respeta «reducir movimiento»). */
export function Counter({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value)
  const current = useRef(value)

  useEffect(() => {
    const from = current.current
    const to = value
    if (from === to) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = to
      setShown(to)
      return
    }
    const t0 = performance.now()
    const duration = 900
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const v = from + (to - from) * (1 - Math.pow(1 - p, 3))
      current.current = p === 1 ? to : v
      setShown(current.current)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{format(shown)}</>
}
