import {BrowserProvider, Contract, type Eip1193Provider} from 'ethers'

import {logger} from '#/logger'

const SELF_AGENT_API = 'https://app.ai.self.xyz/api'

export type CeloNetwork = 'celo' | 'celoSepolia'

export const CELO_NETWORKS: Record<
  CeloNetwork,
  {
    apiNetworkParam: 'mainnet' | 'testnet'
    explorerBaseUrl: string
    chainId: number
  }
> = {
  celo: {
    apiNetworkParam: 'mainnet',
    explorerBaseUrl: 'https://celoscan.io',
    chainId: 42220,
  },
  celoSepolia: {
    apiNetworkParam: 'testnet',
    explorerBaseUrl: 'https://sepolia.celoscan.io',
    chainId: 11142220,
  },
}

// ERC-8004 Identity Registry contracts
export const ERC8004_REGISTRIES: Record<CeloNetwork, string> = {
  celo: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  celoSepolia: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
}

const ERC8004_ABI = ['function register(string agentURI) returns (uint256)']

// ERC-721 Transfer event topic: Transfer(address,address,uint256)
const TRANSFER_EVENT_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

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
 * Start an agent registration flow.
 * If walletAddress is provided, uses "linked" mode to tie the NFT to the user's wallet.
 * Otherwise falls back to "wallet-free" mode.
 */
export async function startRegistration(
  did: string,
  walletAddress?: string,
  network: CeloNetwork = 'celoSepolia',
): Promise<RegistrationSession> {
  const networkParam = CELO_NETWORKS[network].apiNetworkParam
  const body = walletAddress
    ? {mode: 'linked', network: networkParam, humanAddress: walletAddress}
    : {mode: 'wallet-free', network: networkParam, userDefinedData: did}

  const res = await fetch(`${SELF_AGENT_API}/agent/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
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
export function getAgentExplorerUrl(
  agentId: string,
  network: CeloNetwork = 'celoSepolia',
): string {
  const baseUrl = CELO_NETWORKS[network].explorerBaseUrl
  return `${baseUrl}/address/${encodeURIComponent(agentId)}#nfttransfers`
}

/**
 * Build a data URI containing agent metadata for the ERC-8004 registry.
 */
export function buildAgentMetadataURI(opts: {
  did: string
  handle: string
  agentAddress: string
  chainId: number
}): string {
  const metadata = {
    type: 'Agent',
    name: opts.handle,
    description: 'AT Protocol agent verified via Chai',
    endpoints: [
      {type: 'did', url: opts.did},
      {type: 'wallet', address: opts.agentAddress, chainId: opts.chainId},
    ],
  }
  return `data:application/json;base64,${btoa(JSON.stringify(metadata))}`
}

/**
 * Register an agent in the ERC-8004 Identity Registry.
 * Returns the minted token ID.
 */
export async function registerIn8004Registry(
  walletProvider: Eip1193Provider | unknown,
  agentURI: string,
  network: CeloNetwork,
): Promise<string> {
  const provider = new BrowserProvider(walletProvider as Eip1193Provider)
  const signer = await provider.getSigner()
  const registry = new Contract(
    ERC8004_REGISTRIES[network],
    ERC8004_ABI,
    signer,
  )
  const tx = await registry.register(agentURI)
  const receipt = await tx.wait()

  // Extract tokenId from the ERC-721 Transfer event
  const transferLog = receipt?.logs.find(
    (log: {topics: string[]}) => log.topics[0] === TRANSFER_EVENT_TOPIC,
  )
  if (transferLog && transferLog.topics.length >= 4) {
    return BigInt(transferLog.topics[3]).toString()
  }
  return ''
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
