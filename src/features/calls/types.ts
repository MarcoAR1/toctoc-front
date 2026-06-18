import type { components } from '@/api/schema'

/** Sesión de llamada en vivo (WebRTC) hacia una unidad. */
export type CallSession = components['schemas']['CallSession']
export type CallMedia = components['schemas']['CallMedia']
export type CallStatus = components['schemas']['CallStatus']
export type CallEndReason = components['schemas']['CallEndReason']
export type VisitorCallToken = components['schemas']['VisitorCallToken']

/**
 * Payloads de los eventos de señalización por socket (room `user:{userId}` /
 * `user:visitor:{ringId}`). El servidor sólo retransmite SDP + estado; el medio va peer-to-peer.
 */

/** `call.incoming` (a los residentes): la sesión completa, con el `offer` del que llama. */
export type CallIncomingEvent = CallSession

/** `call.accepted` (al que llama): un residente atendió, con su SDP answer. */
export interface CallAcceptedEvent {
  callId: string
  answeredBy: string
  answer: string
  call: CallSession
}

/** `call.declined` (al que llama): un residente rechazó. */
export interface CallDeclinedEvent {
  callId: string
  by: string
}

/** `call.taken` (a los demás residentes): otro residente atendió primero. */
export interface CallTakenEvent {
  callId: string
}

/** `call.ended` (al peer / residentes / quien llama): la llamada terminó. */
export interface CallEndedEvent {
  callId: string
  reason?: CallEndReason
  by: string
}
