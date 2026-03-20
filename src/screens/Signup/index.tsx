import {useEffect, useReducer, useState} from 'react'
import {AppState, type AppStateStatus, View} from 'react-native'
import ReactNativeDeviceAttest from 'react-native-device-attest'
import Animated, {FadeIn} from 'react-native-reanimated'
import {AppBskyGraphStarterpack} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {FEEDBACK_FORM_URL} from '#/lib/constants'
import {logger} from '#/logger'
import {useServiceQuery} from '#/state/queries/service'
import {useStarterPackQuery} from '#/state/queries/starter-packs'
import {useActiveStarterPack} from '#/state/shell/starter-pack'
import {LoggedOutLayout} from '#/view/com/util/layouts/LoggedOutLayout'
import {SignupForm} from '#/screens/Signup/SignupForm'
import {
  initialState,
  reducer,
  SignupContext,
  useSubmitSignup,
} from '#/screens/Signup/state'
import {atoms as a, native, useBreakpoints, useTheme} from '#/alf'
import {AppLanguageDropdown} from '#/components/AppLanguageDropdown'
import {Divider} from '#/components/Divider'
import {LinearGradientBackground} from '#/components/LinearGradientBackground'
import {InlineLinkText} from '#/components/Link'
import {Text} from '#/components/Typography'
import {useAnalytics} from '#/analytics'
import {GCP_PROJECT_ID, IS_ANDROID} from '#/env'
import * as bsky from '#/types/bsky'

export function Signup({onPressBack}: {onPressBack: () => void}) {
  const ax = useAnalytics()
  const {_} = useLingui()
  const t = useTheme()
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    analytics: ax,
  })
  const {gtMobile} = useBreakpoints()
  const submit = useSubmitSignup()

  useEffect(() => {
    dispatch({
      type: 'setAnalytics',
      value: ax,
    })
  }, [ax])

  const activeStarterPack = useActiveStarterPack()
  const {
    data: starterPack,
    isFetching: isFetchingStarterPack,
    isError: isErrorStarterPack,
  } = useStarterPackQuery({
    uri: activeStarterPack?.uri,
  })

  const [isFetchedAtMount] = useState(starterPack != null)
  const showStarterPackCard =
    activeStarterPack?.uri && !isFetchingStarterPack && starterPack

  const {
    data: serviceInfo,
    isFetching,
    isError,
    refetch,
  } = useServiceQuery(state.serviceUrl)

  useEffect(() => {
    if (isFetching) {
      dispatch({type: 'setIsLoading', value: true})
    } else if (!isFetching) {
      dispatch({type: 'setIsLoading', value: false})
    }
  }, [isFetching])

  useEffect(() => {
    if (isError) {
      dispatch({type: 'setServiceDescription', value: undefined})
      dispatch({
        type: 'setError',
        value: _(
          msg`Unable to contact your service. Please check your Internet connection.`,
        ),
      })
    } else if (serviceInfo) {
      dispatch({type: 'setServiceDescription', value: serviceInfo})
      dispatch({type: 'setError', value: ''})
    }
  }, [_, serviceInfo, isError])

  useEffect(() => {
    if (state.pendingSubmit) {
      if (!state.pendingSubmit.mutableProcessed) {
        state.pendingSubmit.mutableProcessed = true
        submit(state, dispatch)
      }
    }
  }, [state, dispatch, submit])

  // Track app backgrounding during signup
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'background') {
          dispatch({type: 'incrementBackgroundCount'})
        }
      },
    )

    return () => subscription.remove()
  }, [])

  // On Android, warmup the Play Integrity API on the signup screen so it is ready by the time we get to the gate screen.
  useEffect(() => {
    if (!IS_ANDROID) {
      return
    }
    ReactNativeDeviceAttest.warmupIntegrity(GCP_PROJECT_ID).catch(err =>
      logger.error(err),
    )
  }, [])

  return (
    <Animated.View exiting={native(FadeIn.duration(90))} style={a.flex_1}>
      <SignupContext.Provider value={{state, dispatch}}>
        <LoggedOutLayout
          leadin=""
          title={_(msg`Create Account`)}
          description={_(msg`We're so excited to have you join us!`)}
          scrollable>
          <View testID="createAccount" style={a.flex_1}>
            {showStarterPackCard &&
            bsky.dangerousIsType<AppBskyGraphStarterpack.Record>(
              starterPack.record,
              AppBskyGraphStarterpack.isRecord,
            ) ? (
              <Animated.View entering={!isFetchedAtMount ? FadeIn : undefined}>
                <LinearGradientBackground
                  style={[a.mx_lg, a.p_lg, a.gap_sm, a.rounded_sm]}>
                  <Text style={[a.font_semi_bold, a.text_xl, {color: 'white'}]}>
                    {starterPack.record.name}
                  </Text>
                  <Text style={[{color: 'white'}]}>
                    {starterPack.feeds?.length ? (
                      <Trans>
                        You'll follow the suggested users and feeds once you
                        finish creating your account!
                      </Trans>
                    ) : (
                      <Trans>
                        You'll follow the suggested users once you finish
                        creating your account!
                      </Trans>
                    )}
                  </Text>
                </LinearGradientBackground>
              </Animated.View>
            ) : null}
            <View
              style={[
                a.flex_1,
                a.px_xl,
                a.pt_2xl,
                !gtMobile && {paddingBottom: 100},
              ]}>
              <SignupForm
                onPressBack={onPressBack}
                isLoadingStarterPack={
                  isFetchingStarterPack && !isErrorStarterPack
                }
                isServerError={isError}
                refetchServer={refetch}
              />

              <Divider />

              <View
                style={[
                  a.w_full,
                  a.py_lg,
                  a.flex_row,
                  a.gap_md,
                  a.align_center,
                ]}>
                <AppLanguageDropdown />
                <Text
                  style={[
                    a.flex_1,
                    t.atoms.text_contrast_medium,
                    !gtMobile && a.text_md,
                  ]}>
                  <Trans>Having trouble?</Trans>{' '}
                  <InlineLinkText
                    label={_(msg`Contact support`)}
                    to={FEEDBACK_FORM_URL({email: state.email})}
                    style={[!gtMobile && a.text_md]}>
                    <Trans>Contact support</Trans>
                  </InlineLinkText>
                </Text>
              </View>
            </View>
          </View>
        </LoggedOutLayout>
      </SignupContext.Provider>
    </Animated.View>
  )
}
