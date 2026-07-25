import {AtUri, type BskyAgent} from '@atproto/api'
import {type QueryClient, queryOptions, useQuery} from '@tanstack/react-query'

import {CHAI_PDS_SERVICE} from '#/lib/constants'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'
import {useUnstableProfileViewCache} from './profile'

const RQKEY_ROOT = 'resolved-did'
export const RQKEY = (didOrHandle: string) => [RQKEY_ROOT, didOrHandle]

const resolvedDidQueryOptions = (
  agent: BskyAgent,
  getUnstableProfile: (did: string) => {did: string} | undefined,
  didOrHandle: string | undefined,
) =>
  queryOptions({
    staleTime: STALE.HOURS.ONE,
    queryKey: RQKEY(didOrHandle ?? ''),
    queryFn: async () => {
      if (!didOrHandle) return ''
      // Just return the did if it's already one
      if (didOrHandle.startsWith('did:')) return didOrHandle

      // .eth handles need to be resolved against the Chai PDS directly,
      // since the public Bluesky API doesn't support ENS resolution.
      if (didOrHandle.endsWith('.eth')) {
        const url = new URL(
          '/xrpc/com.atproto.identity.resolveHandle',
          CHAI_PDS_SERVICE,
        )
        url.searchParams.set('handle', didOrHandle)
        const resp = await fetch(url.toString())
        if (!resp.ok) {
          throw new Error(`Failed to resolve ENS handle: ${didOrHandle}`)
        }
        const data = (await resp.json()) as {did: string}
        if (!data.did) {
          throw new Error(`Failed to resolve ENS handle: ${didOrHandle}`)
        }
        return data.did
      }

      const res = await agent.resolveHandle({handle: didOrHandle})
      return res.data.did
    },
    initialData: () => {
      // Return undefined if no did or handle
      if (!didOrHandle) return
      const profile = getUnstableProfile(didOrHandle)
      return profile?.did
    },
    enabled: !!didOrHandle,
  })

export function useResolveUriQuery(uri: string | undefined) {
  const urip = new AtUri(uri || '')
  const host = urip.host

  const agent = useAgent()
  const {getUnstableProfile} = useUnstableProfileViewCache()

  return useQuery({
    ...resolvedDidQueryOptions(agent, getUnstableProfile, host),
    select: did => ({
      did,
      uri: AtUri.make(did, urip.collection, urip.rkey).toString(),
    }),
  })
}

export function useResolveDidQuery(didOrHandle: string | undefined) {
  const agent = useAgent()
  const {getUnstableProfile} = useUnstableProfileViewCache()

  return useQuery(
    resolvedDidQueryOptions(agent, getUnstableProfile, didOrHandle),
  )
}

export function precacheResolvedUri(
  queryClient: QueryClient,
  handle: string,
  did: string,
) {
  queryClient.setQueryData<string>(RQKEY(handle), did)
}
