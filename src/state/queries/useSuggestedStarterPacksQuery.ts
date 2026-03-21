import {useQuery} from '@tanstack/react-query'

import {
  aggregateUserInterests,
  createBskyTopicsHeader,
} from '#/lib/api/feed/utils'
import {getContentLanguages} from '#/state/preferences/languages'
import {STALE} from '#/state/queries'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {useAgent} from '#/state/session'

const PINNED_STARTER_PACK_URI =
  'at://xtools.at/app.bsky.graph.starterpack/3lbfpe6jrku2f'

export const createSuggestedStarterPacksQueryKey = (interests?: string[]) => [
  'suggested-starter-packs',
  interests?.join(','),
]

export function useSuggestedStarterPacksQuery({
  enabled,
  overrideInterests,
}: {
  enabled?: boolean
  overrideInterests?: string[]
}) {
  const agent = useAgent()
  const {data: preferences} = usePreferencesQuery()
  const contentLangs = getContentLanguages().join(',')

  return useQuery({
    enabled: !!preferences && enabled !== false,
    staleTime: STALE.MINUTES.THREE,
    queryKey: createSuggestedStarterPacksQueryKey(overrideInterests),
    queryFn: async () => {
      const [{data}, pinnedResult] = await Promise.all([
        agent.app.bsky.unspecced.getSuggestedStarterPacks(undefined, {
          headers: {
            ...createBskyTopicsHeader(
              overrideInterests
                ? overrideInterests.join(',')
                : aggregateUserInterests(preferences),
            ),
            'Accept-Language': contentLangs,
          },
        }),
        agent.app.bsky.graph
          .getStarterPack({starterPack: PINNED_STARTER_PACK_URI})
          .catch(() => undefined),
      ])

      if (pinnedResult?.data.starterPack) {
        const pinned = pinnedResult.data.starterPack
        data.starterPacks = [
          pinned,
          ...data.starterPacks.filter(sp => sp.uri !== pinned.uri),
        ]
      }

      return data
    },
  })
}
