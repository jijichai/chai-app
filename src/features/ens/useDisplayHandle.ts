import {useEnsRecordsQuery} from '#/state/queries/ensRecords'

type ProfileLike = {did: string; handle: string}

/**
 * Returns the display handle for a profile. If the profile has verified ENS
 * names stored on their PDS, returns the first (primary) ENS name.
 * Otherwise returns the profile's standard AT Protocol handle.
 *
 * This is a display-only override — the underlying handle is unchanged.
 * Works for any user's profile since PDS records are publicly readable.
 */
export function useDisplayHandle(profile: ProfileLike): string {
  const {data: ensRecords} = useEnsRecordsQuery({did: profile.did})

  // Pick the most recently verified ENS name
  const primaryEns = ensRecords
    ?.slice()
    .sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt))[0]?.ensName

  if (primaryEns) {
    return primaryEns
  }

  return profile.handle
}
