/**
 * Equipo NetTime (portada y cierre del modo presentación).
 * Fotos: cada una en public/equipo/ con el nombre de `foto` (cuadrada, ~600 px). Si falta, se ven las iniciales.
 */
export const TEAM: { name: string; role: string; foto: string }[] = [
  { name: 'Alejandro Castellanos', role: 'Product Owner · Diseño', foto: 'alejandro.jpg' },
  { name: 'Jacob Gómez', role: 'Scrum Master · Front-end', foto: 'jacob.jpg' },
  { name: 'Manuel Albizu', role: 'Full-stack', foto: 'manuel.jpg' },
  { name: 'Marc Estellers', role: 'Full-stack', foto: 'marc.jpg' },
  { name: 'Pablo Franco', role: 'Front-end · Pruebas', foto: 'pablo.jpg' },
]

export const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('')
