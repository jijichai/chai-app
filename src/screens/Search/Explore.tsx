import {useCallback, useMemo, useRef, useState} from 'react'
import {View, type ViewabilityConfig} from 'react-native'
import {type AppBskyActorDefs} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useQueryClient} from '@tanstack/react-query'

import {CHAI_DISCOVER_LIST_URI} from '#/lib/constants'
import {cleanError} from '#/lib/strings/errors'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {RQKEY_ALL, useAllListMembersQuery} from '#/state/queries/list-members'
import {List} from '#/view/com/util/List'
import {atoms as a, native, platform, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfo} from '#/components/icons/CircleInfo'
import {type Props as SVGIconProps} from '#/components/icons/common'
import {UserCircle_Stroke2_Corner0_Rounded as Person} from '#/components/icons/UserCircle'
import * as ProfileCard from '#/components/ProfileCard'
import {Text} from '#/components/Typography'
import {type Metrics, useAnalytics} from '#/analytics'
import {ExploreScreenLiveEventFeedsBanner} from '#/features/liveEvents/components/ExploreScreenLiveEventFeedsBanner'
import * as ModuleHeader from './components/ModuleHeader'
import {SuggestedProfileCard} from './modules/ExploreSuggestedAccounts'

type ExploreScreenItems =
  | {
      type: 'topBorder'
      key: string
    }
  | {
      type: 'header'
      key: string
      title: string
      icon: React.ComponentType<SVGIconProps>
      searchButton?: {
        label: string
        metricsTag: Metrics['explore:module:searchButtonPress']['module']
        tab: 'user' | 'profile' | 'feed'
      }
    }
  | {
      type: 'profile'
      key: string
      profile: AppBskyActorDefs.ProfileView
    }
  | {
      type: 'profileEmpty'
      key: 'profileEmpty'
    }
  | {
      type: 'profilePlaceholder'
      key: string
    }
  | {
      type: 'error'
      key: string
      message: string
      error: string
    }
  | {
      type: 'liveEventFeedsBanner'
      key: string
    }

export function Explore({
  focusSearchInput,
}: {
  focusSearchInput: (tab: 'user' | 'profile' | 'feed') => void
  headerHeight: number
}) {
  const ax = useAnalytics()
  const {_} = useLingui()
  const t = useTheme()
  const moderationOpts = useModerationOpts()

  const {
    data: listMembers,
    isLoading: isLoadingMembers,
    error: membersError,
    isRefetching: isRefetchingMembers,
  } = useAllListMembersQuery(CHAI_DISCOVER_LIST_URI)

  const qc = useQueryClient()
  const [isPTR, setIsPTR] = useState(false)
  const onPTR = useCallback(async () => {
    setIsPTR(true)
    await qc.resetQueries({
      queryKey: RQKEY_ALL(CHAI_DISCOVER_LIST_URI),
    })
    setIsPTR(false)
  }, [qc])

  const topBorder = useMemo(
    () =>
      ({
        type: 'topBorder',
        key: 'top-border',
      }) as const,
    [],
  )

  const suggestedFollowsModule = useMemo(() => {
    const i: ExploreScreenItems[] = []
    i.push({
      type: 'header',
      key: 'suggested-accounts-header',
      title: _(msg`Discover Chai`),
      icon: Person,
      searchButton: {
        label: _(msg`Search for more accounts`),
        metricsTag: 'suggestedAccounts',
        tab: 'user',
      },
    })

    if (isLoadingMembers || isRefetchingMembers) {
      i.push({type: 'profilePlaceholder', key: 'profilePlaceholder'})
    } else if (membersError) {
      i.push({
        type: 'error',
        key: 'membersError',
        message: _(msg`Failed to load suggested accounts`),
        error: cleanError(membersError),
      })
    } else if (listMembers && listMembers.length > 0 && moderationOpts) {
      const seen = new Set<string>()
      for (const item of listMembers) {
        const profile = item.subject
        if (!seen.has(profile.did) && !profile.viewer?.following) {
          seen.add(profile.did)
          i.push({
            type: 'profile',
            key: profile.did,
            profile,
          })
        }
      }
      if (i.length === 1) {
        // Only the header, no profiles after filtering
        i.push({
          type: 'profileEmpty',
          key: 'profileEmpty',
        })
      }
    } else {
      i.push({
        type: 'profileEmpty',
        key: 'profileEmpty',
      })
    }
    return i
  }, [
    _,
    moderationOpts,
    listMembers,
    isLoadingMembers,
    isRefetchingMembers,
    membersError,
  ])

  const items = useMemo<ExploreScreenItems[]>(() => {
    const i: ExploreScreenItems[] = []
    i.push(topBorder)
    i.push({type: 'liveEventFeedsBanner', key: 'liveEventFeedsBanner'})
    i.push(...suggestedFollowsModule)
    return i
  }, [topBorder, suggestedFollowsModule])

  const renderItem = useCallback(
    ({item, index}: {item: ExploreScreenItems; index: number}) => {
      switch (item.type) {
        case 'topBorder':
          return (
            <View style={[a.w_full, t.atoms.border_contrast_low, a.border_t]} />
          )
        case 'header': {
          return (
            <ModuleHeader.Container>
              <ModuleHeader.Icon icon={item.icon} />
              <ModuleHeader.TitleText>{item.title}</ModuleHeader.TitleText>
              {item.searchButton && (
                <ModuleHeader.SearchButton
                  {...item.searchButton}
                  onPress={() =>
                    focusSearchInput(item.searchButton?.tab || 'user')
                  }
                />
              )}
            </ModuleHeader.Container>
          )
        }
        case 'profile': {
          return (
            <SuggestedProfileCard
              profile={item.profile}
              moderationOpts={moderationOpts!}
              position={index}
            />
          )
        }
        case 'profileEmpty': {
          return (
            <View style={[a.px_lg, a.pb_lg]}>
              <Admonition>
                <Trans>No results.</Trans>
              </Admonition>
            </View>
          )
        }
        case 'profilePlaceholder': {
          return (
            <>
              {Array.from({length: 3}).map((__, i) => (
                <View
                  style={[
                    a.px_lg,
                    a.py_lg,
                    a.border_t,
                    t.atoms.border_contrast_low,
                  ]}
                  key={i}>
                  <ProfileCard.Outer>
                    <ProfileCard.Header>
                      <ProfileCard.AvatarPlaceholder />
                      <ProfileCard.NameAndHandlePlaceholder />
                    </ProfileCard.Header>
                    <ProfileCard.DescriptionPlaceholder numberOfLines={2} />
                  </ProfileCard.Outer>
                </View>
              ))}
            </>
          )
        }
        case 'error': {
          return (
            <View
              style={[
                a.border_t,
                a.pt_md,
                a.px_md,
                t.atoms.border_contrast_low,
              ]}>
              <View
                style={[
                  a.flex_row,
                  a.gap_md,
                  a.p_lg,
                  a.rounded_sm,
                  t.atoms.bg_contrast_25,
                ]}>
                <CircleInfo size="md" fill={t.palette.negative_400} />
                <View style={[a.flex_1, a.gap_sm]}>
                  <Text style={[a.font_semi_bold, a.leading_snug]}>
                    {item.message}
                  </Text>
                  <Text
                    style={[
                      a.italic,
                      a.leading_snug,
                      t.atoms.text_contrast_medium,
                    ]}>
                    {item.error}
                  </Text>
                </View>
              </View>
            </View>
          )
        }
        case 'liveEventFeedsBanner': {
          return <ExploreScreenLiveEventFeedsBanner />
        }
      }
    },
    [
      t.atoms.border_contrast_low,
      t.atoms.bg_contrast_25,
      t.atoms.text_contrast_medium,
      t.palette.negative_400,
      focusSearchInput,
      moderationOpts,
      _,
    ],
  )

  const stickyHeaderIndices = useMemo(
    () =>
      items.reduce(
        (acc, curr) =>
          curr.type === 'topBorder' ? acc.concat(items.indexOf(curr)) : acc,
        [] as number[],
      ),
    [items],
  )

  const seenProfilesRef = useRef<Set<string>>(new Set())
  const onItemSeen = useCallback(
    (item: ExploreScreenItems) => {
      if (item.type === 'profile') {
        if (!seenProfilesRef.current.has(item.profile.did)) {
          seenProfilesRef.current.add(item.profile.did)
          const position = suggestedFollowsModule.findIndex(
            i => i.type === 'profile' && i.profile.did === item.profile.did,
          )
          ax.metric('suggestedUser:seen', {
            logContext: 'Explore',
            recId: undefined,
            position: position !== -1 ? position - 1 : 0,
            suggestedDid: item.profile.did,
            category: null,
          })
        }
      }
    },
    [ax, suggestedFollowsModule],
  )

  const handleOnRefresh = () => {
    void onPTR()
  }

  return (
    <List
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      desktopFixedHeight
      contentContainerStyle={{paddingBottom: 100}}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      stickyHeaderIndices={native(stickyHeaderIndices)}
      viewabilityConfig={viewabilityConfig}
      onItemSeen={onItemSeen}
      initialNumToRender={10}
      windowSize={platform({android: 11})}
      maxToRenderPerBatch={platform({android: 10, ios: 20})}
      updateCellsBatchingPeriod={50}
      refreshing={isPTR}
      onRefresh={handleOnRefresh}
    />
  )
}

function keyExtractor(item: ExploreScreenItems) {
  return item.key
}

const viewabilityConfig: ViewabilityConfig = {
  itemVisiblePercentThreshold: 100,
}
