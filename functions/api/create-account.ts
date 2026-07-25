/**
 * Cloudflare Pages Function: POST /api/create-account
 *
 * Silently mints a single-use invite code via the PDS admin API, then
 * creates the account with that code injected. On successful signup,
 * mints an ENSv2 subname `<label>.chaish.eth` on Sepolia — owner is a
 * deterministic stub derived from the DID (MVP; swap for Privy later).
 *
 * Required secrets (Cloudflare Pages settings):
 *   PDS_ADMIN_PASSWORD    - PDS admin password for invite minting
 *   REGISTRAR_MNEMONIC    - seed phrase for the ENS registrar wallet
 *   REGISTRAR_DERIVATION_INDEX (optional, default "0")
 *   SEPOLIA_RPC_URL       (optional, default public drpc)
 */

import {ethers} from 'ethers'

interface Env {
  PDS_ADMIN_PASSWORD: string
  REGISTRAR_MNEMONIC?: string
  REGISTRAR_DERIVATION_INDEX?: string
  SEPOLIA_RPC_URL?: string
}

const PDS_BASE = 'https://chai.sh'

const ENS_REGISTRY = '0x89A853b224bAE596381269F61de9a637deE7Fe66'
const ENS_RESOLVER = '0x4D5aE401CA8aeecC44699bab1e0848ee45B6F2D3'
const ENS_ROLE_BITMAP =
  '0x1111111111111111111111111111111111111111111111111111111111111111'
// chaish.eth expiry — subname expiry pinned to parent's.
const ENS_EXPIRY = 1816508677n
const DEFAULT_SEPOLIA_RPC_URL = 'https://sepolia.drpc.org'
const REGISTER_ABI = [
  'function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expires) returns (uint256 tokenId)',
]

function stubOwnerAddress(did: string): string {
  return ethers.getAddress(
    '0x' + ethers.keccak256(ethers.toUtf8Bytes(did)).slice(-40),
  )
}

async function mintSubname(
  env: Env,
  label: string,
  owner: string,
): Promise<{txHash: string; blockNumber: number}> {
  const rpcUrl = env.SEPOLIA_RPC_URL ?? DEFAULT_SEPOLIA_RPC_URL
  const path = `m/44'/60'/0'/0/${env.REGISTRAR_DERIVATION_INDEX ?? '0'}`
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const wallet = ethers.HDNodeWallet.fromPhrase(
    env.REGISTRAR_MNEMONIC!,
    undefined,
    path,
  ).connect(provider)
  const registry = new ethers.Contract(ENS_REGISTRY, REGISTER_ABI, wallet)
  const tx = await registry.register(
    label,
    owner,
    ethers.ZeroAddress,
    ENS_RESOLVER,
    ENS_ROLE_BITMAP,
    ENS_EXPIRY,
  )
  const receipt = await tx.wait()
  return {txHash: tx.hash, blockNumber: receipt.blockNumber}
}

const ALLOWED_ORIGINS = [
  'https://app.chai.sh',
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

  const {
    did,
    handle: returnedHandle,
    accessJwt,
  } = pdsBody as {
    did?: string
    handle?: string
    accessJwt?: string
  }
  const label = returnedHandle?.split('.')[0] ?? ''
  let subname: {name?: string; error?: string; [k: string]: unknown} = {}
  if (!env.REGISTRAR_MNEMONIC) {
    subname = {error: 'registrar not configured'}
  } else if (!did || !/^[a-z0-9-]{3,20}$/.test(label)) {
    subname = {error: 'label or did unusable', label, did}
  } else {
    const owner = stubOwnerAddress(did)
    try {
      const result = await mintSubname(env, label, owner)
      subname = {name: `${label}.chaish.eth`, owner, ...result}
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('mint failed', {label, did, owner, message})
      subname = {error: message}
    }
  }

  // Publish sh.chai.n.ens record so useDisplayHandle picks up the minted name.
  // Non-fatal: a failure here still leaves the user with a working account.
  if (subname.name && did && accessJwt) {
    try {
      const now = new Date().toISOString()
      const putResponse = await fetch(
        `${PDS_BASE}/xrpc/com.atproto.repo.putRecord`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessJwt}`,
          },
          body: JSON.stringify({
            repo: did,
            collection: 'sh.chai.n.ens',
            rkey: subname.name.toLowerCase(),
            record: {
              $type: 'sh.chai.n.ens',
              ensName: subname.name,
              verifiedAt: now,
              createdAt: now,
            },
          }),
        },
      )
      if (!putResponse.ok) {
        const body = await putResponse.text()
        console.error('ens record write failed', {
          did,
          ensName: subname.name,
          status: putResponse.status,
          body,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('ens record write threw', {message})
    }
  }

  return jsonResponse({...pdsBody, subname}, 200, origin)
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
