import { useEffect, useState } from 'react'
import { FormHost } from './components/Forms'
import { Layout, ROUTES, type Route } from './components/Layout'
import { Toasts } from './components/ui'
import Impuestos from './pages/Impuestos'
import Jornadas from './pages/Jornadas'
import Movimientos from './pages/Movimientos'
import Objetivo from './pages/Objetivo'
import Rentabilidad from './pages/Rentabilidad'
import Resumen from './pages/Resumen'
import { StoreProvider } from './store'

const PAGES: Record<Route, () => React.JSX.Element> = {
  resumen: Resumen,
  movimientos: Movimientos,
  jornadas: Jornadas,
  impuestos: Impuestos,
  rentabilidad: Rentabilidad,
  objetivo: Objetivo,
}

function routeFromHash(): Route {
  const id = window.location.hash.replace(/^#\/?/, '')
  return ROUTES.some((r) => r.id === id) ? (id as Route) : 'resumen'
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)

  useEffect(() => {
    const onHash = () => {
      const next = routeFromHash()
      setRoute(next)
      window.scrollTo({ top: 0 })
      const label = ROUTES.find((r) => r.id === next)?.label
      document.title = `${label} · NetTime`
    }
    window.addEventListener('hashchange', onHash)
    document.title = `${ROUTES.find((r) => r.id === route)?.label} · NetTime`
    return () => window.removeEventListener('hashchange', onHash)
  }, [route])

  const Page = PAGES[route]
  return (
    <StoreProvider>
      <Layout route={route}>
        <Page />
      </Layout>
      <FormHost />
      <Toasts />
    </StoreProvider>
  )
}
