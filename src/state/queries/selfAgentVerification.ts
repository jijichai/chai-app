import {useQuery} from '@tanstack/react-query'

import {
  checkRegistrationStatus,
  type RegistrationStatus,
} from '#/lib/selfAgentId'
import {STALE} from '#/state/queries'

const RQKEY_ROOT = 'self-agent-registration-status'
export const RQKEY = (sessionToken: string) => [RQKEY_ROOT, sessionToken]

/**
 * Polls the Self Agent ID registration status for a given session token.
 * Refetches every 3 seconds while pending, stops once completed or failed.
 */
export function useSelfAgentRegistrationStatusQuery({
  sessionToken,
  enabled = true,
}: {
  sessionToken: string | undefined
  enabled?: boolean
}) {
  return useQuery<RegistrationStatus>({
    queryKey: RQKEY(sessionToken ?? ''),
    queryFn: () => checkRegistrationStatus(sessionToken!),
    staleTime: STALE.SECONDS.FIFTEEN,
    enabled: !!sessionToken && enabled,
    refetchInterval: query => {
      if (query.state.data?.status === 'pending') {
        return 3000 // poll every 3s while waiting for QR scan
      }
      return false // stop polling once completed or failed
    },
  })
}
