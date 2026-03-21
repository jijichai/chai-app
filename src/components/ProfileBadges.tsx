import {View} from 'react-native'

import {useProfileShadow} from '#/state/cache/profile-shadow'
import {atoms as a, type ViewStyleProp} from '#/alf'
import {BotBadge, BotBadgeButton, isBotAccount} from '#/components/BotBadge'
import {useSimpleVerificationState} from '#/components/verification'
import {VerificationCheck} from '#/components/verification/VerificationCheck'
import {VerificationCheckButton} from '#/components/verification/VerificationCheckButton'
import {EnsBadge} from '#/features/ens/components/EnsBadge'
import {EnsBadgeButton} from '#/features/ens/components/EnsBadgeButton'
import {useDisplayHandle} from '#/features/ens/useDisplayHandle'
import type * as bsky from '#/types/bsky'

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const verificationIconSizes: Record<Size, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 22,
} as const

const botIconSizes: Record<Size, number> = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 19,
  xl: 23,
} as const

const ensIconSizes: Record<Size, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 22,
} as const

export function ProfileBadges({
  profile,
  interactive = false,
  size,
  style,
}: ViewStyleProp & {
  profile: bsky.profile.AnyProfileView
  interactive?: boolean
  size: Size
}) {
  const shadowed = useProfileShadow(profile)
  const verification = useSimpleVerificationState({profile})
  const displayHandle = useDisplayHandle(shadowed)
  const hasEns = displayHandle.endsWith('.eth')

  // if nothing to show, don't render the container at all
  if (!verification.showBadge && !isBotAccount(shadowed) && !hasEns) return null

  const isOnTheSmallSide = size === 'xs' || size === 'sm'

  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        isOnTheSmallSide ? a.gap_2xs : a.gap_xs,
        style,
      ]}>
      {interactive ? (
        <>
          <VerificationCheckButton
            profile={shadowed}
            width={verificationIconSizes[size]}
          />
          <BotBadgeButton profile={shadowed} width={botIconSizes[size]} />
          {hasEns && (
            <EnsBadgeButton
              ensName={displayHandle}
              width={ensIconSizes[size]}
            />
          )}
        </>
      ) : (
        <>
          {verification.showBadge && (
            <VerificationCheck
              verifier={verification.role === 'verifier'}
              width={verificationIconSizes[size]}
            />
          )}
          <BotBadge profile={shadowed} width={botIconSizes[size]} />
          {hasEns && <EnsBadge width={ensIconSizes[size]} />}
        </>
      )}
    </View>
  )
}
