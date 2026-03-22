import {useEffect} from 'react'
import {useQueryClient} from '@tanstack/react-query'

import {ENS_RECORDS_RQKEY} from '#/state/queries/ensRecords'
import {useAgent, useSession} from '#/state/session'
import {account} from '#/storage'

/**
 * One-time migration hook that moves ENS data from device-local MMKV storage
 * to PDS records under sh.chai.n.ens. On success, clears the MMKV keys.
 * Silently retries on next app launch if PDS write fails.
 *
 * Call this from a component that mounts early for authenticated users.
 */
export function useEnsMMKVMigration() {
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()
  const did = currentAccount?.did

  useEffect(() => {
    if (!did) return

    const mmkvEnsName = account.get([did, 'ensName'])
    if (!mmkvEnsName) return

    const mmkvVerifiedAt = account.get([did, 'ensVerifiedAt'])

    async function migrate() {
      try {
        await agent.com.atproto.repo.putRecord({
          repo: did!,
          collection: 'sh.chai.n.ens',
          rkey: mmkvEnsName!.toLowerCase(),
          record: {
            $type: 'sh.chai.n.ens',
            ensName: mmkvEnsName,
            verifiedAt: mmkvVerifiedAt ?? new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        })

        // Migration succeeded — clear MMKV
        account.remove([did!, 'ensName'])
        account.remove([did!, 'ensVerifiedAt'])

        void queryClient.invalidateQueries({
          queryKey: ENS_RECORDS_RQKEY(did!),
        })
      } catch {
        // Silent failure — will retry on next app launch
      }
    }

    migrate()
  }, [did, agent, queryClient])
}
