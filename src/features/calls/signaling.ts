import { api, unwrap } from '@/api/client'
import type { CallEndReason, CallMedia, CallSession, VisitorCallToken } from './types'

/**
 * Señalización HTTP de llamadas (el cliente las invoca de forma imperativa durante el WebRTC).
 *
 * Colisión de operationId: `Accept` resuelve a la PRIMERA op `Accept` del OpenAPI (aceptar
 * invitación: body `AcceptInvitationInput`, sin `path`), no a la de calls. Forzamos el contrato
 * real de `POST /calls/{callId}/accept` con un cast acotado. `Decline`/`End`/`StartAsVisitor`/
 * `IssueVisitorToken` son únicos y quedan bien tipados.
 */

// --- Residente (callee, con JWT de sesión) ---------------------------------------------------

/** `POST /calls/{callId}/accept` — el residente atiende con su SDP answer (pasa a `active`). */
export async function acceptCall(callId: string, sdpAnswer: string): Promise<CallSession> {
  const result = await api.POST('/calls/{callId}/accept', {
    params: { path: { callId } },
    body: { sdpAnswer },
  } as unknown as never)
  return unwrap(result) as unknown as CallSession
}

/** `POST /calls/{callId}/decline` — el residente rechaza una llamada que está sonando. */
export async function declineCall(callId: string): Promise<CallSession> {
  return unwrap(await api.POST('/calls/{callId}/decline', { params: { path: { callId } } }))
}

/** `POST /calls/{callId}/end` — colgar / cancelar (residente o admin participante). */
export async function endCall(callId: string, reason?: CallEndReason): Promise<CallSession> {
  return unwrap(
    await api.POST('/calls/{callId}/end', {
      params: { path: { callId } },
      body: reason ? { reason } : {},
    }),
  )
}

// --- Visitante (caller, con token efímero por header) ----------------------------------------

/** `POST /calls/visitor-token` — token de llamada para un visitante anónimo (público). */
export async function issueVisitorToken(ringId: string): Promise<VisitorCallToken> {
  return unwrap(await api.POST('/calls/visitor-token', { body: { ringId } }))
}

/** Header de autorización con el token de visitante (el authMiddleware no pisa este header). */
function visitorAuth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` }
}

/** `POST /calls/visitor` — el visitante inicia la llamada con su offer (unidad = la del token). */
export async function startVisitorCall(
  token: string,
  media: CallMedia,
  sdpOffer: string,
): Promise<CallSession> {
  return unwrap(
    await api.POST('/calls/visitor', { body: { media, sdpOffer }, headers: visitorAuth(token) }),
  )
}

/** `POST /calls/{callId}/end` autenticado como visitante (colgar desde la puerta). */
export async function endVisitorCall(
  token: string,
  callId: string,
  reason?: CallEndReason,
): Promise<CallSession> {
  return unwrap(
    await api.POST('/calls/{callId}/end', {
      params: { path: { callId } },
      body: reason ? { reason } : {},
      headers: visitorAuth(token),
    }),
  )
}
