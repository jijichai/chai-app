import {useQuery} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const PINNED_STARTER_PACK_URI =
  'at://xtools.at/app.bsky.graph.starterpack/3lbfpe6jrku2f'

export const createOnboardingSuggestedStarterPacksQueryKey = (
  interests?: string[],
) => ['onboarding-suggested-starter-packs', interests?.join(',')]

export function useOnboardingSuggestedStarterPacksQuery({
  enabled,
  overrideInterests,
}: {
  enabled?: boolean
  overrideInterests?: string[]
}) {
  const agent = useAgent()

  return useQuery({
    enabled: enabled !== false,
    staleTime: STALE.MINUTES.THREE,
    queryKey: createOnboardingSuggestedStarterPacksQueryKey(overrideInterests),
    queryFn: async () => {
      const {data} = await agent.app.bsky.graph.getStarterPack({
        starterPack: PINNED_STARTER_PACK_URI,
      })
      return {starterPacks: [data.starterPack]}
    },
  })
}
