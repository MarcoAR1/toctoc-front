import { useEffect, useRef } from 'react'

interface MediaViewProps {
  stream?: MediaStream
  /** El video propio se silencia para evitar eco; el remoto no. */
  muted?: boolean
  className?: string
}

/** `<video>` controlado que enchufa un `MediaStream` vía `srcObject`. */
export function MediaView({ stream, muted, className }: MediaViewProps) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el && el.srcObject !== (stream ?? null)) el.srcObject = stream ?? null
  }, [stream])
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />
}
