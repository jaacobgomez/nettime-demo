# NetTime · demo (Sprint 2)

Lo que ganas, de verdad. Demo web para autónomos: ingresos, gastos, jornadas, reserva fiscal y rentabilidad por días y horarios.

## Abrirla

```bash
npm install        # solo la primera vez
npm run dev        # http://localhost:5173
```

Versión para entregar o colgar: `npm run build` genera `dist/` (rutas relativas: sirve en cualquier hosting estático, p. ej. Netlify o GitHub Pages).
Probarla compilada: `npm run preview`. Pruebas del cálculo: `npm test`.

## Estructura

- `src/lib/calc.ts` · único módulo de cálculo (todas las pantallas leen de aquí).
- `src/lib/seed.ts` · datos de ejemplo (taxista en Madrid, 7 semanas hasta hoy, deterministas).
- `src/lib/storage.ts` · localStorage versionado y recuperación si los datos están dañados.
- `src/pages/` · Resumen, Movimientos, Jornadas, Impuestos, Rentabilidad, Objetivo.

## Supuestos

- Disponible = ingresos sin IVA − gastos − cuota imputada (por días de cada mes, hasta hoy) − reserva IRPF (% sobre lo positivo).
- Reserva fiscal = IVA cobrado + reserva IRPF. La cuota va aparte.
- No se recupera IVA soportado ni se decide qué gastos son deducibles. Porcentajes editables, no oficiales.
- Comparativa de horarios: margen operativo por hora de las jornadas con movimientos asociados, agrupadas por franja de inicio. Se destaca a partir de 3 jornadas.
