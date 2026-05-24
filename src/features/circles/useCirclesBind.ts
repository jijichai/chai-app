import {useQuery} from '@tanstack/react-query'

import {CHAI_GNOSIS_RPC} from '#/lib/constants'
import {logger} from '#/logger'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'
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

export function useCirclesBindQuery({did}: {did: string | undefined}) {
  const agent = useAgent()
  return useQuery<CirclesBindResult | null>({
    queryKey: CIRCLES_BIND_RQKEY(did ?? ''),
    queryFn: async () => {
      if (!did) return null
      const res = await agent.com.atproto.repo
        .getRecord({repo: did, collection: COLLECTION, rkey: RKEY})
        .catch(() => null)
      if (!res?.data?.value) return null
      try {
        return await verifyCirclesBind(res.data.value as CirclesBindRecord, {
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
