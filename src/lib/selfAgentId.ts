import {logger} from '#/logger'

const SELF_AGENT_API = 'https://app.ai.self.xyz/api'

export interface SelfVerification {
  verified: boolean
  agentId: string // the agent's public key or identifier
  proofUrl: string // URL to view the soulbound NFT on-chain
  registeredAt: string // ISO timestamp
}

export interface RegistrationSession {
  sessionToken: string
  deepLink: string // opens Self app directly (mobile)
  scanUrl: string // web page with QR code for scanning
  qrImageBase64: string // base64-encoded PNG of the QR code
}

export type RegistrationStatus =
  | {status: 'pending'}
  | {status: 'completed'; agentId: string}
  | {status: 'failed'; error: string}

/**
 * Start a wallet-free agent registration flow.
 * Returns a session token and QR code URL for the user to scan with the Self app.
 */
export async function startRegistration(): Promise<RegistrationSession> {
  const res = await fetch(`${SELF_AGENT_API}/agent/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      mode: 'wallet-free',
      network: 'testnet',
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    logger.error('Self Agent ID: registration request failed', {
      status: res.status,
      body: text,
    })
    throw new Error(`Registration failed: ${res.status}`)
  }

  const data = (await res.json()) as {
    sessionToken: string
    deepLink?: string
    scanUrl?: string
    qrImageBase64?: string
  }
  return {
    sessionToken: data.sessionToken,
    deepLink: data.deepLink ?? '',
    scanUrl: data.scanUrl ?? '',
    qrImageBase64: data.qrImageBase64 ?? '',
  }
}

/**
 * Poll the registration status for a given session token.
 */
export async function checkRegistrationStatus(
  sessionToken: string,
): Promise<RegistrationStatus> {
  const res = await fetch(`${SELF_AGENT_API}/agent/register/status`, {
    headers: {Authorization: `Bearer ${sessionToken}`},
  })

  if (!res.ok) {
    logger.error('Self Agent ID: status check failed', {status: res.status})
    return {status: 'failed', error: `Status check failed: ${res.status}`}
  }

  const data = (await res.json()) as {
    stage?: string
    agentAddress?: string
    error?: string
  }

  if (data.stage === 'completed' || data.stage === 'registered') {
    return {
      status: 'completed',
      agentId: data.agentAddress ?? '',
    }
  }

  if (data.stage === 'failed' || data.stage === 'expired' || data.error) {
    return {
      status: 'failed',
      error: data.error ?? `Registration ${data.stage ?? 'failed'}`,
    }
  }

  // qr-ready, proof-pending, etc. are all "pending" from the UI's perspective
  return {status: 'pending'}
}

/**
 * Get the block explorer URL for the agent's on-chain proof (Celo Sepolia testnet).
 */
export function getAgentExplorerUrl(agentId: string): string {
  return `https://sepolia.celoscan.io/address/${encodeURIComponent(agentId)}#nfttransfers`
}

/**
 * Deregister an agent (burns the soulbound NFT). This is irreversible.
 */
export async function deregisterAgent(
  sessionToken: string,
): Promise<{sessionToken: string}> {
  const res = await fetch(`${SELF_AGENT_API}/agent/deregister`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({sessionToken}),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    logger.error('Self Agent ID: deregistration failed', {
      status: res.status,
      body: text,
    })
    throw new Error(`Deregistration failed: ${res.status}`)
  }

  return res.json()
}
