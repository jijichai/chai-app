import {
  checkStaticInvariants,
  type CirclesBindRecord,
  verifyCirclesBind,
} from '../verifyCirclesBind'

const PAULBOES_DID = 'did:plc:wx3ekxk6h2r2tdo62mb5syfl'

const PAULBOES_RECORD: CirclesBindRecord = {
  $type: 'io.gnosis.circles.bind',
  signatureType: 'eip-1271',
  address: {$bytes: '9IVUk38YiFx/FcQyxZa1hDZIIx0'},
  signature: {
    $bytes:
      'AAAAAAAAAAAAAAAAfM/0oNTlN+0sWVE0IZ+Dpz5J5l0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAODl93tHvH0dNCUWedRKD8uczomhUTVAfm+GMH0OJgZBy3NUHKveen/T3d4dgn6WCUy8NSViTjN3r6v/U/xJJbgWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACWoMJRPXQreoqtzTxUuhhRqRqIu0luAG490spK+S3y5gh0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgib3JpZ2luIjoiaHR0cHM6Ly9jaXJjbGVzLmdub3Npcy5pbyIsImNyb3NzT3JpZ2luIjpmYWxzZQAAAAAAAAAA',
  },
  siwe: {
    uri: 'https://circles-atproto-bind.vercel.app',
    nonce: '31519a52f61e4b5a901b4586',
    domain: 'circles-atproto-bind.vercel.app',
    address: '0xf48554937f18885c7f15c432c596b5843648231D',
    chainId: 100,
    version: '1',
    issuedAt: '2026-05-23T11:58:23.607Z',
    statement:
      'Prove control of 0xf48554937f18885c7f15c432c596b5843648231D to link it to did:plc:wx3ekxk6h2r2tdo62mb5syfl',
  },
}

const EXPECTED_HASH =
  '0xcae4e9bf2091e44df46c1c8a1195377d5dcdff10789fcddce1e0a0dc3ac38453'

describe('verifyCirclesBind', () => {
  test('static invariants pass for a real paulboes record', () => {
    const r = checkStaticInvariants(PAULBOES_RECORD, {
      expectedDid: PAULBOES_DID,
    })
    expect(r.addressHex).toBe('0xf48554937f18885c7f15c432c596b5843648231D')
    expect(r.hash).toBe(EXPECTED_HASH)
  })

  test('rejects when statement does not reference the expected DID', () => {
    expect(() =>
      checkStaticInvariants(PAULBOES_RECORD, {
        expectedDid: 'did:plc:somebodyelse',
      }),
    ).toThrow(/statement/)
  })

  test('rejects when bytes-address disagrees with siwe.address', () => {
    const tampered: CirclesBindRecord = {
      ...PAULBOES_RECORD,
      address: {$bytes: 'AAAAAAAAAAAAAAAAAAAAAAAAAAA'},
    }
    expect(() =>
      checkStaticInvariants(tampered, {expectedDid: PAULBOES_DID}),
    ).toThrow(/address/)
  })

  test('rejects non-eip-1271 signatureType', () => {
    const eoa: CirclesBindRecord = {...PAULBOES_RECORD, signatureType: 'eoa'}
    expect(() =>
      checkStaticInvariants(eoa, {expectedDid: PAULBOES_DID}),
    ).toThrow(/signatureType/)
  })

  test('verifyCirclesBind reports valid when isValidSignature returns the magic value', async () => {
    const result = await verifyCirclesBind(PAULBOES_RECORD, {
      expectedDid: PAULBOES_DID,
      isValidSignature: async (address, hash, signature) => {
        expect(address).toBe('0xf48554937f18885c7f15c432c596b5843648231D')
        expect(hash).toBe(EXPECTED_HASH)
        expect(signature.startsWith('0x')).toBe(true)
        return '0x1626ba7e'
      },
    })
    expect(result.valid).toBe(true)
    expect(result.address).toBe('0xf48554937f18885c7f15c432c596b5843648231D')
    expect(result.chainId).toBe(100)
  })

  test('verifyCirclesBind reports invalid when the magic value is wrong', async () => {
    const result = await verifyCirclesBind(PAULBOES_RECORD, {
      expectedDid: PAULBOES_DID,
      isValidSignature: async () => '0xffffffff',
    })
    expect(result.valid).toBe(false)
  })

  test('accepts already-decoded Uint8Array bytes (atproto-api round-trip)', () => {
    const bytesFromB64 = (s: string) =>
      new Uint8Array(
        Buffer.from(s + '='.repeat(((-s.length % 4) + 4) % 4), 'base64'),
      )
    const decoded: CirclesBindRecord = {
      ...PAULBOES_RECORD,
      address: bytesFromB64('9IVUk38YiFx/FcQyxZa1hDZIIx0'),
      signature: bytesFromB64(
        (PAULBOES_RECORD.signature as {$bytes: string}).$bytes,
      ),
    }
    const r = checkStaticInvariants(decoded, {expectedDid: PAULBOES_DID})
    expect(r.addressHex).toBe('0xf48554937f18885c7f15c432c596b5843648231D')
    expect(r.hash).toBe(EXPECTED_HASH)
  })
})
