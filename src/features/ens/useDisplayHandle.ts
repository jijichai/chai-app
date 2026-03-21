import {useSession} from '#/state/session'
import {account, useStorage} from '#/storage'

type ProfileLike = {did: string; handle: string}

/**
 * Returns the display handle for a profile. If the profile belongs to the
 * current user and they have a verified ENS name, returns the ENS name.
 * Otherwise returns the profile's standard AT Protocol handle.
 *
 * This is a display-only override — the underlying handle is unchanged.
 */
export function useDisplayHandle(profile: ProfileLike): string {
  const {currentAccount} = useSession()
  const did = currentAccount?.did ?? ''
  const [ensName] = useStorage(account, [did, 'ensName'])

  if (did && did === profile.did && ensName) {
    return ensName
  }

  return profile.handle
}
