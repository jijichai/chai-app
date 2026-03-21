import {useMutation} from '@tanstack/react-query'

import {CHAI_PDS_SERVICE} from '#/lib/constants'
import {logger} from '#/logger'
import {useSession} from '#/state/session'
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

      // Store in MMKV
      const did = currentAccount.did
      account.set([did, 'ensName'], ensName)
      account.set([did, 'ensVerifiedAt'], new Date().toISOString())

      return ensName
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
 * Removes the verified ENS name for the current account.
 */
export function useRemoveEnsMutation() {
  const {currentAccount} = useSession()

  return useMutation({
    mutationFn: async () => {
      if (!currentAccount?.did) {
        throw new Error('Not logged in')
      }
      account.remove([currentAccount.did, 'ensName'])
      account.remove([currentAccount.did, 'ensVerifiedAt'])
    },
  })
}
