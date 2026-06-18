const DATE_TIME_FMT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** Formatea una fecha ISO a 'dd mmm hh:mm' (es-AR). Devuelve '' si no hay fecha. */
export function formatDateTime(iso?: string): string {
  return iso ? DATE_TIME_FMT.format(new Date(iso)) : ''
}
