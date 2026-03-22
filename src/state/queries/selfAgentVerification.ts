import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  checkRegistrationStatus,
  type RegistrationStatus,
} from '#/lib/selfAgentId'
import {logger} from '#/logger'
import {STALE} from '#/state/queries'
import {useAgent, useSession} from '#/state/session'

const COLLECTION = 'sh.chai.n.agent'
const RKEY = 'self'

// --- PDS record type ---

export interface SelfAgentRecord {
  $type: 'sh.chai.n.agent'
  agentId: string
  chain: 'celo' | 'celoSepolia'
  verified: boolean
  proofUrl: string
  registeredAt: string
  createdAt: string
}

// --- Query keys ---

const REGISTRATION_STATUS_RQKEY_ROOT = 'self-agent-registration-status'
export const REGISTRATION_STATUS_RQKEY = (sessionToken: string) => [
  REGISTRATION_STATUS_RQKEY_ROOT,
  sessionToken,
]

const AGENT_RECORD_RQKEY_ROOT = 'sh.chai.n.agent'
export const AGENT_RECORD_RQKEY = (did: string) => [
  AGENT_RECORD_RQKEY_ROOT,
  did,
]

// --- Registration status polling ---

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
    queryKey: REGISTRATION_STATUS_RQKEY(sessionToken ?? ''),
    queryFn: () => checkRegistrationStatus(sessionToken!),
    staleTime: STALE.SECONDS.FIFTEEN,
    enabled: !!sessionToken && enabled,
    refetchInterval: query => {
      if (query.state.data?.status === 'pending') {
        return 3000
      }
      return false
    },
  })
}

// --- PDS record read/write ---

/**
 * Read a user's sh.chai.n.agent record from the PDS.
 * Works for any DID — own profile or another user's.
 */
export function useSelfAgentRecordQuery({did}: {did: string | undefined}) {
  const agent = useAgent()
  return useQuery<SelfAgentRecord | null>({
    queryKey: AGENT_RECORD_RQKEY(did ?? ''),
    queryFn: async () => {
      try {
        const res = await agent.com.atproto.repo.getRecord({
          repo: did!,
          collection: COLLECTION,
          rkey: RKEY,
        })
        return res.data.value as unknown as SelfAgentRecord
      } catch {
        // Record doesn't exist — not verified
        return null
      }
    },
    enabled: !!did,
    staleTime: STALE.HOURS.ONE,
  })
}

/**
 * Write the sh.chai.n.agent record to the current user's PDS repo.
 */
export function usePutSelfAgentRecordMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (record: Omit<SelfAgentRecord, '$type'>) => {
      if (!currentAccount) throw new Error('Not signed in')
      return agent.com.atproto.repo.putRecord({
        repo: currentAccount.did,
        collection: COLLECTION,
        rkey: RKEY,
        record: {
          $type: COLLECTION,
          ...record,
        },
      })
    },
    onSuccess: () => {
      if (currentAccount) {
        void queryClient.invalidateQueries({
          queryKey: AGENT_RECORD_RQKEY(currentAccount.did),
        })
      }
    },
    onError: error => {
      logger.error('Failed to write sh.chai.n.agent record', {
        safeMessage: error,
      })
    },
  })
}

/**
 * Delete the sh.chai.n.agent record from the current user's PDS repo.
 */
export function useDeleteSelfAgentRecordMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!currentAccount) throw new Error('Not signed in')
      return agent.com.atproto.repo.deleteRecord({
        repo: currentAccount.did,
        collection: COLLECTION,
        rkey: RKEY,
      })
    },
    onSuccess: () => {
      if (currentAccount) {
        queryClient.setQueryData(AGENT_RECORD_RQKEY(currentAccount.did), null)
      }
    },
    onError: error => {
      logger.error('Failed to delete sh.chai.n.agent record', {
        safeMessage: error,
      })
    },
  })
}
