/**
 * Cloudflare Pages Function: POST /api/create-account
 *
 * Silently mints a single-use invite code via the PDS admin API, then
 * creates the account with that code injected. This prevents direct
 * unauthenticated account creation on the PDS.
 *
 * Required secret: PDS_ADMIN_PASSWORD (set in Cloudflare Pages settings)
 */

interface Env {
  PDS_ADMIN_PASSWORD: string
}

const PDS_BASE = 'https://on.chai.sh'

const ALLOWED_ORIGINS = [
  'https://chai.sh',
  'https://www.chai.sh',
  'http://localhost:19006',
  'http://localhost:8080',
  'http://localhost:3000',
]

const PDS_ERROR_MESSAGES: Record<string, string> = {
  HandleNotAvailable: 'That handle is already taken. Please choose another.',
  InvalidHandle: 'The handle you entered is not valid.',
  InvalidEmail: 'The email address you entered is not valid.',
  EmailNotAvailable: 'An account with that email address already exists.',
  InvalidPassword:
    'The password you entered is too short (minimum 8 characters).',
  InvalidInviteCode:
    'Account creation temporarily unavailable. Please try again.',
  RateLimitExceeded: 'Too many attempts. Please wait a moment and try again.',
}

function jsonResponse(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

function getAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin') || ''
  const referer = request.headers.get('Referer') || ''
  for (const allowed of ALLOWED_ORIGINS) {
    if (origin === allowed || referer.startsWith(allowed)) {
      return origin || allowed
    }
  }
  return null
}

export const onRequestPost: PagesFunction<Env> = async context => {
  const {request, env} = context

  const origin = getAllowedOrigin(request)
  if (!origin) {
    return new Response('Forbidden', {status: 403})
  }

  // Parse and validate body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return jsonResponse({error: 'Invalid request body.'}, 400, origin)
  }

  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const handle =
    typeof body.handle === 'string' ? body.handle.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(
      {error: 'Please enter a valid email address.'},
      400,
      origin,
    )
  }
  if (!handle) {
    return jsonResponse({error: 'Please enter a handle.'}, 400, origin)
  }
  if (!password || password.length < 8) {
    return jsonResponse(
      {error: 'Password must be at least 8 characters.'},
      400,
      origin,
    )
  }

  if (!env.PDS_ADMIN_PASSWORD) {
    return jsonResponse(
      {error: 'Account creation temporarily unavailable. Please try again.'},
      500,
      origin,
    )
  }

  // Mint a single-use invite code
  const adminAuth = 'Basic ' + btoa('admin:' + env.PDS_ADMIN_PASSWORD)
  let inviteCode: string
  try {
    const inviteResponse = await fetch(
      `${PDS_BASE}/xrpc/com.atproto.server.createInviteCode`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: adminAuth,
        },
        body: JSON.stringify({useCount: 1}),
      },
    )
    if (!inviteResponse.ok) {
      return jsonResponse(
        {error: 'Account creation temporarily unavailable. Please try again.'},
        500,
        origin,
      )
    }
    const inviteBody = (await inviteResponse.json()) as {code: string}
    inviteCode = inviteBody.code
  } catch {
    return jsonResponse(
      {error: 'Account creation temporarily unavailable. Please try again.'},
      500,
      origin,
    )
  }

  // Create the account with the minted invite code
  const pdsResponse = await fetch(
    `${PDS_BASE}/xrpc/com.atproto.server.createAccount`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, handle, password, inviteCode}),
    },
  )

  const pdsBody = await pdsResponse.json()

  if (!pdsResponse.ok) {
    const pdsError = (pdsBody as {error?: string}).error ?? ''
    const message =
      PDS_ERROR_MESSAGES[pdsError] ?? 'Something went wrong. Please try again.'
    return jsonResponse({error: message, pdsError}, pdsResponse.status, origin)
  }

  return jsonResponse(pdsBody, 200, origin)
}

export const onRequestOptions: PagesFunction<Env> = async context => {
  const origin = getAllowedOrigin(context.request) ?? ''
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
