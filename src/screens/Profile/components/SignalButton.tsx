import {Linking, View} from 'react-native'
import {Image} from 'expo-image'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useSignalUsername} from '#/state/preferences'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {ArrowTopRight_Stroke2_Corner0_Rounded as ArrowTopRightIcon} from '#/components/icons/Arrow'
import {Text} from '#/components/Typography'
import type * as bsky from '#/types/bsky'

export function SignalButton({
  profile,
}: {
  profile: bsky.profile.AnyProfileView
}) {
  const {currentAccount} = useSession()
  const signalUsername = useSignalUsername()

  const isMe = currentAccount?.did === profile.did

  if (isMe && signalUsername) {
    return <SignalSelfButton />
  }

  // For other users, we don't show Signal button since it's stored locally
  // and we can't know other users' Signal usernames
  if (!isMe) {
    return null
  }

  return null
}

function SignalSelfButton() {
  const t = useTheme()
  const {_} = useLingui()
  const signalUsername = useSignalUsername()
  const selfInfoControl = Dialog.useDialogControl()

  if (!signalUsername) {
    return null
  }

  const signalUrl = `https://signal.me/#u/${signalUsername}`

  return (
    <>
      <Button
        label={_(msg`Your Signal messenger link`)}
        onPress={() => selfInfoControl.open()}
        style={[
          t.atoms.bg_contrast_50,
          a.rounded_full,
          a.self_start,
          a.flex_row,
          a.align_center,
          {padding: 6, paddingRight: 10},
        ]}>
        <SignalLogo size="small" />
        <Text style={[a.text_sm, a.font_medium, a.ml_xs]}>
          <Trans>Signal</Trans>
        </Text>
      </Button>

      <Dialog.Outer
        control={selfInfoControl}
        nativeOptions={{preventExpansion: true}}>
        <Dialog.Handle />
        <Dialog.ScrollableInner label={_(msg`Signal Messenger`)}>
          <View style={[a.flex_row, a.align_center, {gap: 6}]}>
            <SignalLogo size="large" />
            <Text style={[a.text_2xl, a.font_bold]}>
              <Trans>Signal Messenger</Trans>
            </Text>
          </View>

          <Text style={[a.text_md, a.leading_snug, a.mt_sm]}>
            <Trans>
              This button lets others know they can message you on Signal. Your
              Signal username is set to "{signalUsername}". You can change or
              remove it from Settings &gt; Account &gt; Messenger.
            </Trans>
          </Text>

          <View style={[a.mt_2xl, a.gap_md]}>
            <Button
              label={_(msg`Open in Signal`)}
              size="large"
              color="primary"
              onPress={() => {
                selfInfoControl.close(() => {
                  void Linking.openURL(signalUrl)
                })
              }}>
              <ButtonText>
                <Trans>Open in Signal</Trans>
              </ButtonText>
            </Button>
            <Button
              label={_(msg`Got it`)}
              size="large"
              color="secondary"
              onPress={() => selfInfoControl.close()}>
              <ButtonText>
                <Trans>Got it</Trans>
              </ButtonText>
            </Button>
          </View>
        </Dialog.ScrollableInner>
      </Dialog.Outer>
    </>
  )
}

export function SignalOtherButton({signalUsername}: {signalUsername: string}) {
  const t = useTheme()
  const {_} = useLingui()

  const signalUrl = `https://signal.me/#u/${signalUsername}`

  return (
    <Button
      label={_(msg`Message on Signal`)}
      onPress={() => {
        void Linking.openURL(signalUrl)
      }}
      style={[
        t.atoms.bg_contrast_50,
        a.rounded_full,
        a.self_start,
        a.flex_row,
        a.align_center,
        {padding: 6, paddingRight: 10},
      ]}>
      <SignalLogo size="small" />
      <Text style={[a.text_sm, a.font_medium, a.ml_xs]}>
        <Trans>Signal</Trans>
      </Text>
      <ArrowTopRightIcon style={[t.atoms.text, a.mx_2xs]} width={14} />
    </Button>
  )
}

const signalLogoUltramarine = require('../../../../assets/icons/Signal-Logo-Ultramarine.svg')
const signalLogoWhite = require('../../../../assets/icons/Signal-Logo-White.svg')

function SignalLogo({size}: {size: 'small' | 'large'}) {
  const t = useTheme()
  const isDark = t.scheme === 'dark'

  return (
    <Image
      source={isDark ? signalLogoWhite : signalLogoUltramarine}
      accessibilityIgnoresInvertColors={false}
      contentFit="contain"
      style={
        size === 'large' ? {width: 32, height: 32} : {width: 16, height: 16}
      }
    />
  )
}
