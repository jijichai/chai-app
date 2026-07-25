import {useWindowDimensions, View} from 'react-native'

import {useProfileShadow} from '#/state/cache/profile-shadow'
import {atoms as a, useAlf, type ViewStyleProp} from '#/alf'
import {BotBadge, BotBadgeButton, isBotAccount} from '#/components/BotBadge'
import {useSimpleVerificationState} from '#/components/verification'
import {VerificationCheck} from '#/components/verification/VerificationCheck'
import {VerificationCheckButton} from '#/components/verification/VerificationCheckButton'
import {CirclesBadge} from '#/features/circles/components/CirclesBadge'
import {CirclesBadgeButton} from '#/features/circles/components/CirclesBadgeButton'
import {useCirclesBindQuery} from '#/features/circles/useCirclesBind'
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

const circlesIconSizes: Record<Size, number> = {
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
  const {data: circlesBind} = useCirclesBindQuery({did: shadowed.did})
  const hasCircles = circlesBind?.valid === true
  const {fontScale: nativeScaleMultiplier} = useWindowDimensions()
  const {
    fonts: {scaleMultiplier: alfScaleMultiplier},
  } = useAlf()

  // if nothing to show, don't render the container at all
  if (
    !verification.showBadge &&
    !isBotAccount(shadowed) &&
    !hasEns &&
    !hasCircles
  )
    return null

  const isOnTheSmallSide = size === 'xs' || size === 'sm'

  const verificationIconWidth =
    verificationIconSizes[size] * nativeScaleMultiplier * alfScaleMultiplier
  const botIconWidth =
    botIconSizes[size] * nativeScaleMultiplier * alfScaleMultiplier

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
            width={verificationIconWidth}
          />
          {hasCircles && (
            <CirclesBadgeButton
              bind={circlesBind!}
              width={circlesIconSizes[size]}
            />
          )}
          <BotBadgeButton profile={shadowed} width={botIconWidth} />
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
              width={verificationIconWidth}
            />
          )}
          {hasCircles && <CirclesBadge width={circlesIconSizes[size]} />}
          <BotBadge profile={shadowed} width={botIconWidth} />
          {hasEns && <EnsBadge width={ensIconSizes[size]} />}
        </>
      )}
    </View>
  )
}
