import {useQuery} from '@tanstack/react-query'

import {CHAI_GNOSIS_RPC} from '#/lib/constants'
import {logger} from '#/logger'
import {STALE} from '#/state/queries'
import {
  type CirclesBindRecord,
  type CirclesBindResult,
  makeEip1271Verifier,
  verifyCirclesBind,
} from './verifyCirclesBind'

const COLLECTION = 'io.gnosis.circles.bind'
const RKEY = 'self'

const CIRCLES_BIND_RQKEY_ROOT = 'io.gnosis.circles.bind'
export const CIRCLES_BIND_RQKEY = (did: string) => [
  CIRCLES_BIND_RQKEY_ROOT,
  did,
]

const isValidSignature = makeEip1271Verifier(CHAI_GNOSIS_RPC)

const PLC_DIRECTORY = 'https://plc.directory'
const PDS_SERVICE_TYPE = 'AtprotoPersonalDataServer'

type DidDoc = {
  service?: Array<{
    id: string
    type: string
    serviceEndpoint: string
  }>
}

async function resolvePdsEndpoint(did: string): Promise<string | null> {
  let url: string
  if (did.startsWith('did:plc:')) {
    url = `${PLC_DIRECTORY}/${did}`
  } else if (did.startsWith('did:web:')) {
    const host = did.slice('did:web:'.length).replace(/:/g, '/')
    url = `https://${host}/.well-known/did.json`
  } else {
    return null
  }
  const res = await fetch(url)
  if (!res.ok) return null
  const doc = (await res.json()) as DidDoc
  const svc = doc.service?.find(s => s.type === PDS_SERVICE_TYPE)
  return svc?.serviceEndpoint?.replace(/\/$/, '') ?? null
}

async function fetchCirclesBindRecord(
  did: string,
): Promise<CirclesBindRecord | null> {
  const pds = await resolvePdsEndpoint(did)
  if (!pds) return null
  const url = new URL('/xrpc/com.atproto.repo.getRecord', pds)
  url.searchParams.set('repo', did)
  url.searchParams.set('collection', COLLECTION)
  url.searchParams.set('rkey', RKEY)
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const body = (await res.json()) as {value?: CirclesBindRecord}
  return body.value ?? null
}

export function useCirclesBindQuery({did}: {did: string | undefined}) {
  return useQuery<CirclesBindResult | null>({
    queryKey: CIRCLES_BIND_RQKEY(did ?? ''),
    queryFn: async () => {
      if (!did) return null
      const record = await fetchCirclesBindRecord(did).catch(() => null)
      if (!record) return null
      try {
        return await verifyCirclesBind(record, {
          expectedDid: did,
          isValidSignature,
        })
      } catch (err) {
        logger.warn('Circles bind verification failed', {
          safeMessage: (err as Error).message,
        })
        return null
      }
    },
    enabled: !!did,
    staleTime: STALE.HOURS.ONE,
    retry: false,
  })
}
