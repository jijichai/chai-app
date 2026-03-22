import {useMutation, useQueryClient} from '@tanstack/react-query'

import {CHAI_PDS_SERVICE} from '#/lib/constants'
import {logger} from '#/logger'
import {ENS_RECORDS_RQKEY} from '#/state/queries/ensRecords'
import {useAgent, useSession} from '#/state/session'
import {account} from '#/storage'

export class EnsResolutionError extends Error {
  constructor(ensName: string) {
    super(`Could not resolve ENS name: ${ensName}`)
    this.name = 'EnsResolutionError'
  }
}

export class EnsDidMismatchError extends Error {
  resolvedDid: string
  constructor(resolvedDid: string) {
    super('ENS name resolves to a different DID')
    this.name = 'EnsDidMismatchError'
    this.resolvedDid = resolvedDid
  }
}

/**
 * Mutation hook for verifying ENS name ownership.
 *
 * Calls the Chai PDS resolveHandle endpoint directly (bypasses appview proxy)
 * to resolve the .eth name to a DID, then compares it to the current user's
 * DID. On success, stores the verified ENS name in MMKV account storage.
 */
export function useVerifyEnsMutation() {
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ensName}: {ensName: string}) => {
      if (!currentAccount?.did) {
        throw new Error('Not logged in')
      }

      const url = new URL(
        '/xrpc/com.atproto.identity.resolveHandle',
        CHAI_PDS_SERVICE,
      )
      url.searchParams.set('handle', ensName)

      const res = await fetch(url.toString())

      if (!res.ok) {
        throw new EnsResolutionError(ensName)
      }

      const data = (await res.json()) as {did: string}

      if (!data.did) {
        throw new EnsResolutionError(ensName)
      }

      if (data.did !== currentAccount.did) {
        throw new EnsDidMismatchError(data.did)
      }

      const now = new Date().toISOString()

      // Write to PDS as sh.chai.n.ens record
      await agent.com.atproto.repo.putRecord({
        repo: currentAccount.did,
        collection: 'sh.chai.n.ens',
        rkey: ensName.toLowerCase(),
        record: {
          $type: 'sh.chai.n.ens',
          ensName,
          verifiedAt: now,
          createdAt: now,
        },
      })

      // Also store in MMKV as fallback during migration period
      const did = currentAccount.did
      account.set([did, 'ensName'], ensName)
      account.set([did, 'ensVerifiedAt'], now)

      return ensName
    },
    onSuccess: () => {
      if (currentAccount) {
        void queryClient.invalidateQueries({
          queryKey: ENS_RECORDS_RQKEY(currentAccount.did),
        })
      }
    },
    onError(error) {
      if (
        error instanceof EnsResolutionError ||
        error instanceof EnsDidMismatchError
      ) {
        // Expected errors — don't log to Sentry
        return
      }
      logger.error('ENS verification failed', {safeMessage: error.message})
    },
  })
}

/**
 * Removes a verified ENS name for the current account.
 * Deletes the PDS record and clears MMKV for backward compat.
 */
export function useRemoveEnsMutation() {
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ensName: string) => {
      if (!currentAccount?.did) {
        throw new Error('Not logged in')
      }

      // Delete from PDS
      await agent.com.atproto.repo.deleteRecord({
        repo: currentAccount.did,
        collection: 'sh.chai.n.ens',
        rkey: ensName.toLowerCase(),
      })

      // Also clear MMKV for backward compat
      account.remove([currentAccount.did, 'ensName'])
      account.remove([currentAccount.did, 'ensVerifiedAt'])
    },
    onSuccess: () => {
      if (currentAccount) {
        void queryClient.invalidateQueries({
          queryKey: ENS_RECORDS_RQKEY(currentAccount.did),
        })
      }
    },
    onError: error => {
      logger.error('Failed to remove ENS record', {safeMessage: error})
    },
  })
}
