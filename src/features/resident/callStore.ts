import { create } from 'zustand'

import type { CallEndReason, CallSession } from '@/features/calls/types'

interface ResidentCallState {
  /** Llamada entrante o activa (manejamos una por vez por unidad). */
  call?: CallSession
  /** Señal de fin remoto (para que el overlay desmonte el peer y muestre el cierre). */
  endSignal?: { callId: string; reason?: CallEndReason }
  /** `call.incoming`: llega una llamada nueva (reemplaza cualquier anterior). */
  setIncoming: (call: CallSession) => void
  /** `call.taken`: otro residente atendió primero → la sacamos. */
  applyTaken: (callId: string) => void
  /** `call.ended`: la llamada terminó del otro lado. */
  applyEnded: (callId: string, reason?: CallEndReason) => void
  /** Limpia el estado (tras atender/rechazar/colgar/cerrar). */
  clear: () => void
}

/** Estado de la llamada en vivo del residente, alimentado por `useResidentRealtime`. */
export const useResidentCallStore = create<ResidentCallState>((set, get) => ({
  call: undefined,
  endSignal: undefined,
  setIncoming: (call) => set({ call, endSignal: undefined }),
  applyTaken: (callId) => {
    if (get().call?.id === callId) set({ call: undefined, endSignal: undefined })
  },
  applyEnded: (callId, reason) => {
    if (get().call?.id === callId) set({ endSignal: { callId, reason } })
  },
  clear: () => set({ call: undefined, endSignal: undefined }),
}))
