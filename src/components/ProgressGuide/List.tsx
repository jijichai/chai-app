import {useEffect} from 'react'
import {type StyleProp, View, type ViewStyle} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useProfileFollowsQuery} from '#/state/queries/profile-follows'
import {useOnboardingSuggestedStarterPacksQuery} from '#/state/queries/useOnboardingSuggestedStarterPacksQuery'
import {useSession} from '#/state/session'
import {
  useProgressGuide,
  useProgressGuideControls,
} from '#/state/shell/progress-guide'
import {StarterPackCard} from '#/screens/Search/components/StarterPackCard'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {TimesLarge_Stroke2_Corner0_Rounded as Times} from '#/components/icons/Times'
import {Text} from '#/components/Typography'
import {ProgressGuideTask} from './Task'

const TOTAL_AVATARS = 10

export function ProgressGuideList({style}: {style?: StyleProp<ViewStyle>}) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const followProgressGuide = useProgressGuide('follow-10')
  const followAndLikeProgressGuide = useProgressGuide('like-10-and-follow-7')
  const guide = followProgressGuide || followAndLikeProgressGuide
  const {endProgressGuide} = useProgressGuideControls()
  const {data: follows} = useProfileFollowsQuery(currentAccount?.did, {
    limit: TOTAL_AVATARS,
  })
  const {data: starterPackData} = useOnboardingSuggestedStarterPacksQuery({
    enabled: guide?.guide === 'follow-10',
  })

  const actualFollowsCount = follows?.pages?.[0]?.follows?.length ?? 0

  // Clear stale guide if user already follows 10+ people
  const shouldEndGuide =
    guide?.guide === 'follow-10' && actualFollowsCount >= TOTAL_AVATARS
  useEffect(() => {
    if (shouldEndGuide) {
      endProgressGuide()
    }
  }, [shouldEndGuide, endProgressGuide])

  if (shouldEndGuide) {
    return null
  }

  const starterPack = starterPackData?.starterPacks?.[0]

  if (guide) {
    return (
      <View
        style={[
          a.flex_col,
          a.gap_md,
          a.rounded_md,
          t.atoms.bg_contrast_50,
          a.p_lg,
          style,
        ]}>
        <View style={[a.flex_row, a.align_center, a.justify_between]}>
          <Text style={[t.atoms.text, a.font_semi_bold, a.text_md]}>
            <Trans>Follow 10 people to get started</Trans>
          </Text>
          <Button
            variant="ghost"
            size="tiny"
            color="secondary"
            shape="round"
            label={_(msg`Dismiss getting started guide`)}
            onPress={endProgressGuide}
            style={[a.bg_transparent, {marginTop: -6, marginRight: -6}]}>
            <ButtonIcon icon={Times} size="xs" />
          </Button>
        </View>
        {guide.guide === 'follow-10' && starterPack && (
          <StarterPackCard view={starterPack} />
        )}
        {guide.guide === 'like-10-and-follow-7' && (
          <>
            <ProgressGuideTask
              current={guide.numLikes + 1}
              total={10 + 1}
              title={_(msg`Like 10 posts`)}
              subtitle={_(msg`Teach our algorithm what you like`)}
            />
            <ProgressGuideTask
              current={guide.numFollows + 1}
              total={7 + 1}
              title={_(msg`Follow 7 accounts`)}
              subtitle={_(msg`Chai is better with friends!`)}
            />
          </>
        )}
      </View>
    )
  }
  return null
}
