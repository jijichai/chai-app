import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {logger} from '#/logger'
import {STALE} from '#/state/queries'
import {useAgent, useSession} from '#/state/session'

const COLLECTION = 'sh.chai.n.ens'

// --- PDS record type ---

export interface EnsRecord {
  $type: 'sh.chai.n.ens'
  ensName: string
  verifiedAt: string
  createdAt: string
}

// --- Query keys ---

const ENS_RECORDS_RQKEY_ROOT = 'sh.chai.n.ens.list'
export const ENS_RECORDS_RQKEY = (did: string) => [ENS_RECORDS_RQKEY_ROOT, did]

// --- Helpers ---

/**
 * Sanitize an ENS name for use as an rkey.
 * Dots are valid in AT Protocol rkeys, so we just lowercase.
 */
function ensNameToRkey(ensName: string): string {
  return ensName.toLowerCase()
}

// --- PDS record operations (multi-ENS) ---

/**
 * List all sh.chai.n.ens records for a user.
 * Each verified ENS name gets its own record keyed by the name itself.
 */
export function useEnsRecordsQuery({did}: {did: string | undefined}) {
  const agent = useAgent()
  return useQuery<EnsRecord[]>({
    queryKey: ENS_RECORDS_RQKEY(did ?? ''),
    queryFn: async () => {
      try {
        const res = await agent.com.atproto.repo.listRecords({
          repo: did!,
          collection: COLLECTION,
          limit: 50,
        })
        return res.data.records.map(r => r.value as unknown as EnsRecord)
      } catch {
        return []
      }
    },
    enabled: !!did,
    staleTime: STALE.HOURS.ONE,
  })
}

/**
 * Write a new sh.chai.n.ens record, keyed by the ENS name.
 */
export function usePutEnsRecordMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (record: Omit<EnsRecord, '$type'>) => {
      if (!currentAccount) throw new Error('Not signed in')
      return agent.com.atproto.repo.putRecord({
        repo: currentAccount.did,
        collection: COLLECTION,
        rkey: ensNameToRkey(record.ensName),
        record: {
          $type: COLLECTION,
          ...record,
        },
      })
    },
    onSuccess: () => {
      if (currentAccount) {
        void queryClient.invalidateQueries({
          queryKey: ENS_RECORDS_RQKEY(currentAccount.did),
        })
      }
    },
    onError: error => {
      logger.error('Failed to write sh.chai.n.ens record', {
        safeMessage: error,
      })
    },
  })
}

/**
 * Delete a specific sh.chai.n.ens record by ENS name.
 */
export function useDeleteEnsRecordMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ensName: string) => {
      if (!currentAccount) throw new Error('Not signed in')
      return agent.com.atproto.repo.deleteRecord({
        repo: currentAccount.did,
        collection: COLLECTION,
        rkey: ensNameToRkey(ensName),
      })
    },
    onSuccess: () => {
      if (currentAccount) {
        void queryClient.invalidateQueries({
          queryKey: ENS_RECORDS_RQKEY(currentAccount.did),
        })
      }
    },
    onError: error => {
      logger.error('Failed to delete sh.chai.n.ens record', {
        safeMessage: error,
      })
    },
  })
}
