import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  checkRegistrationStatus,
  type RegistrationStatus,
} from '#/lib/selfAgentId'
import {logger} from '#/logger'
import {STALE} from '#/state/queries'
import {useAgent, useSession} from '#/state/session'

const COLLECTION = 'sh.chai.n.agent'

// --- PDS record type ---

export interface SelfAgentRecord {
  $type: 'sh.chai.n.agent'
  agentId: string
  chain: 'celo' | 'celoSepolia'
  verified: boolean
  proofUrl: string
  walletAddress?: string
  erc8004TokenId?: string
  registeredAt: string
  createdAt: string
}

// --- Query keys ---

const REGISTRATION_STATUS_RQKEY_ROOT = 'self-agent-registration-status'
export const REGISTRATION_STATUS_RQKEY = (sessionToken: string) => [
  REGISTRATION_STATUS_RQKEY_ROOT,
  sessionToken,
]

const AGENT_RECORDS_RQKEY_ROOT = 'sh.chai.n.agent.list'
export const AGENT_RECORDS_RQKEY = (did: string) => [
  AGENT_RECORDS_RQKEY_ROOT,
  did,
]

// --- Registration status polling ---

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

// --- PDS record operations (multi-agent) ---

/**
 * List all sh.chai.n.agent records for a user.
 * Each agent gets its own record keyed by a sanitized agentId.
 */
export function useSelfAgentRecordsQuery({did}: {did: string | undefined}) {
  const agent = useAgent()
  return useQuery<SelfAgentRecord[]>({
    queryKey: AGENT_RECORDS_RQKEY(did ?? ''),
    queryFn: async () => {
      try {
        const res = await agent.com.atproto.repo.listRecords({
          repo: did!,
          collection: COLLECTION,
          limit: 50,
        })
        return res.data.records.map(r => r.value as unknown as SelfAgentRecord)
      } catch {
        return []
      }
    },
    enabled: !!did,
    staleTime: STALE.HOURS.ONE,
  })
}

/**
 * Sanitize an agent address for use as an rkey.
 * AT Protocol rkeys must be 1-512 chars, alphanumeric + some punctuation.
 * We lowercase and remove the 0x prefix.
 */
function agentIdToRkey(agentId: string): string {
  return agentId.toLowerCase().replace(/^0x/, '')
}

/**
 * Write a new sh.chai.n.agent record, keyed by the agent address.
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
        rkey: agentIdToRkey(record.agentId),
        record: {
          $type: COLLECTION,
          ...record,
        },
      })
    },
    onSuccess: () => {
      if (currentAccount) {
        void queryClient.invalidateQueries({
          queryKey: AGENT_RECORDS_RQKEY(currentAccount.did),
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
 * Delete a specific sh.chai.n.agent record by agentId.
 */
export function useDeleteSelfAgentRecordMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (agentId: string) => {
      if (!currentAccount) throw new Error('Not signed in')
      return agent.com.atproto.repo.deleteRecord({
        repo: currentAccount.did,
        collection: COLLECTION,
        rkey: agentIdToRkey(agentId),
      })
    },
    onSuccess: () => {
      if (currentAccount) {
        void queryClient.invalidateQueries({
          queryKey: AGENT_RECORDS_RQKEY(currentAccount.did),
        })
      }
    },
    onError: error => {
      logger.error('Failed to delete sh.chai.n.agent record', {
        safeMessage: error,
      })
    },
  })
}
