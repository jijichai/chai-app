import {ethers} from 'ethers'

export type CirclesBindRecord = {
  $type?: 'io.gnosis.circles.bind'
  signatureType: string
  address: Uint8Array | {$bytes: string}
  signature: Uint8Array | {$bytes: string}
  siwe: {
    domain: string
    address: string
    statement: string
    uri: string
    version: string
    chainId: number
    nonce: string
    issuedAt: string
  }
}

export type CirclesBindResult = {
  valid: boolean
  address: string
  issuedAt: string
  chainId: number
}

const EIP1271_MAGIC = '0x1626ba7e'

function asHex(bytes: Uint8Array | {$bytes: string}): string {
  if (bytes instanceof Uint8Array) {
    return '0x' + Buffer.from(bytes).toString('hex')
  }
  if (bytes && typeof bytes === 'object' && '$bytes' in bytes) {
    const padded = bytes.$bytes + '='.repeat((-bytes.$bytes.length % 4 + 4) % 4)
    return '0x' + Buffer.from(padded, 'base64').toString('hex')
  }
  throw new Error('unsupported bytes encoding')
}

function buildSiweMessage(siwe: CirclesBindRecord['siwe']): string {
  return (
    `${siwe.domain} wants you to sign in with your Ethereum account:\n` +
    `${siwe.address}\n\n` +
    `${siwe.statement}\n\n` +
    `URI: ${siwe.uri}\n` +
    `Version: ${siwe.version}\n` +
    `Chain ID: ${siwe.chainId}\n` +
    `Nonce: ${siwe.nonce}\n` +
    `Issued At: ${siwe.issuedAt}`
  )
}

export function checkStaticInvariants(
  record: CirclesBindRecord,
  opts: {expectedDid: string},
): {addressHex: string; sigHex: string; message: string; hash: string} {
  if (record.signatureType !== 'eip-1271') {
    throw new Error(`unsupported signatureType: ${record.signatureType}`)
  }
  const addressHex = ethers.getAddress(asHex(record.address))
  const siweAddress = ethers.getAddress(record.siwe.address)
  if (addressHex !== siweAddress) {
    throw new Error('record.address does not match record.siwe.address')
  }
  if (!record.siwe.statement.includes(opts.expectedDid)) {
    throw new Error('siwe.statement does not reference the expected DID')
  }
  const message = buildSiweMessage(record.siwe)
  const hash = ethers.hashMessage(message)
  const sigHex = asHex(record.signature)
  return {addressHex, sigHex, message, hash}
}

export type IsValidSignatureFn = (
  address: string,
  hash: string,
  signature: string,
) => Promise<string>

export async function verifyCirclesBind(
  record: CirclesBindRecord,
  opts: {expectedDid: string; isValidSignature: IsValidSignatureFn},
): Promise<CirclesBindResult> {
  const {addressHex, sigHex, hash} = checkStaticInvariants(record, {
    expectedDid: opts.expectedDid,
  })
  const ret = await opts.isValidSignature(addressHex, hash, sigHex)
  return {
    valid: ret.toLowerCase() === EIP1271_MAGIC,
    address: addressHex,
    issuedAt: record.siwe.issuedAt,
    chainId: record.siwe.chainId,
  }
}

export function makeEip1271Verifier(rpcUrl: string): IsValidSignatureFn {
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
    staticNetwork: true,
  })
  const abi = [
    'function isValidSignature(bytes32 _hash, bytes _signature) view returns (bytes4)',
  ]
  return async (address, hash, signature) => {
    const c = new ethers.Contract(address, abi, provider)
    return await c.isValidSignature(hash, signature)
  }
}
