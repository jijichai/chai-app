import {useEffect, useState} from 'react'
import {ActivityIndicator, Image, Linking, View} from 'react-native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {
  getAgentExplorerUrl,
  type RegistrationSession,
  startRegistration,
} from '#/lib/selfAgentId'
import {logger} from '#/logger'
import {
  useSelfAgentVerification,
  useSetSelfAgentVerification,
} from '#/state/preferences'
import {useSelfAgentRegistrationStatusQuery} from '#/state/queries/selfAgentVerification'
import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {
  Shield_Stroke2_Corner0_Rounded as ShieldIcon,
  ShieldCheck_Stroke2_Corner0_Rounded as ShieldCheckIcon,
} from '#/components/icons/Shield'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {IS_NATIVE} from '#/env'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'SelfAgentIdSettings'
>

export function SelfAgentIdSettingsScreen({}: Props) {
  const verification = useSelfAgentVerification()

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>Self Agent ID</Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        {verification?.verified ? (
          <VerifiedState verification={verification} />
        ) : (
          <NotVerifiedState />
        )}
      </Layout.Content>
    </Layout.Screen>
  )
}

function NotVerifiedState() {
  const t = useTheme()
  const setVerification = useSetSelfAgentVerification()
  const [session, setSession] = useState<RegistrationSession>()
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string>()

  const {data: status} = useSelfAgentRegistrationStatusQuery({
    sessionToken: session?.sessionToken,
    enabled: !!session,
  })

  // When registration completes, save the verification data
  useEffect(() => {
    if (status?.status === 'completed' && status.agentId) {
      const agentId = status.agentId
      setSession(undefined)
      setVerification({
        agentId,
        verified: true,
        proofUrl: getAgentExplorerUrl(agentId),
        registeredAt: new Date().toISOString(),
      })
    }
  }, [status, setVerification])

  const onStartVerification = async () => {
    setIsStarting(true)
    setError(undefined)
    try {
      const result = await startRegistration()
      setSession(result)
    } catch (e) {
      logger.error('Self Agent ID: failed to start registration', {
        safeMessage: e,
      })
      setError('Failed to start verification. Please try again.')
    } finally {
      setIsStarting(false)
    }
  }

  if (session) {
    return (
      <View style={[a.p_xl, a.gap_lg]}>
        <View style={[a.align_center, a.pt_sm]}>
          <ShieldIcon width={40} fill={t.palette.primary_500} />
        </View>
        <View style={[a.gap_xs]}>
          <Text style={[a.text_2xl, a.font_bold, a.text_center]}>
            Verify with Self app
          </Text>
          <Text
            style={[
              a.text_md,
              a.leading_snug,
              a.text_center,
              t.atoms.text_contrast_medium,
            ]}>
            {IS_NATIVE
              ? 'Tap the button below to open the Self app, then follow the prompts to scan your passport.'
              : 'Scan the QR code below with the Self app on your phone, then follow the prompts to scan your passport.'}
          </Text>
        </View>

        <View style={[a.gap_sm, a.py_sm]}>
          <StepItem number={1} text="Open the Self app on your phone" />
          <StepItem
            number={2}
            text={
              IS_NATIVE
                ? 'Tap "Open Self app" below'
                : 'Scan the QR code below with the Self app'
            }
          />
          <StepItem
            number={3}
            text="Follow the prompts to scan your passport via NFC"
          />
          <StepItem
            number={4}
            text="Wait for the proof to be submitted on-chain"
          />
        </View>

        {/* QR code — shown on web, also on native as fallback */}
        {session.qrImageBase64 ? (
          <View style={[a.align_center]}>
            <View
              style={[
                a.rounded_md,
                a.overflow_hidden,
                {backgroundColor: 'white', padding: 12},
              ]}>
              <Image
                source={{
                  uri: session.qrImageBase64.startsWith('data:')
                    ? session.qrImageBase64
                    : `data:image/png;base64,${session.qrImageBase64}`,
                }}
                style={{width: 200, height: 200}}
                accessibilityLabel="QR code for Self app verification"
                accessibilityHint="Scan this QR code with the Self app on your phone"
                accessibilityIgnoresInvertColors
              />
            </View>
          </View>
        ) : null}

        {status?.status === 'pending' && (
          <View
            style={[a.flex_row, a.align_center, a.justify_center, a.gap_sm]}>
            <ActivityIndicator size="small" color={t.palette.primary_500} />
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              Waiting for passport scan...
            </Text>
          </View>
        )}

        {/* Deep link button — primarily for native, but useful on web too */}
        {session.deepLink ? (
          <Button
            label="Open Self app"
            onPress={() => {
              void Linking.openURL(session.deepLink)
            }}
            color="primary"
            size="large">
            <ButtonText>Open Self app</ButtonText>
          </Button>
        ) : null}

        {/* Scan URL fallback — web page with QR code hosted by Self */}
        {!session.deepLink && session.scanUrl ? (
          <Button
            label="Open verification page"
            onPress={() => {
              void Linking.openURL(session.scanUrl)
            }}
            color="primary"
            size="large">
            <ButtonText>Open verification page</ButtonText>
          </Button>
        ) : null}

        <Button
          label="Cancel"
          onPress={() => setSession(undefined)}
          color="secondary"
          size="large">
          <ButtonText>Cancel</ButtonText>
        </Button>

        {status?.status === 'failed' && (
          <Text
            style={[a.text_sm, a.text_center, {color: t.palette.negative_500}]}>
            {status.error}
          </Text>
        )}
      </View>
    )
  }

  return (
    <View style={[a.p_xl, a.gap_xl]}>
      <View style={[a.align_center, a.pt_lg]}>
        <ShieldIcon width={48} fill={t.palette.primary_500} />
      </View>
      <View style={[a.gap_sm]}>
        <Text style={[a.text_2xl, a.font_bold, a.text_center]}>
          Verify your identity
        </Text>
        <Text
          style={[
            a.text_md,
            a.leading_snug,
            a.text_center,
            t.atoms.text_contrast_medium,
          ]}>
          Prove that this automated account is backed by a real human using Self
          Protocol. You will need the Self app and a passport with an NFC chip.
        </Text>
      </View>

      <View style={[a.gap_sm, a.py_sm]}>
        <Text style={[a.text_lg, a.font_bold]}>How it works</Text>
        <StepItem
          number={1}
          text="You scan your passport with the Self app (NFC)"
        />
        <StepItem
          number={2}
          text="A zero-knowledge proof is generated on your device — no personal data leaves your phone"
        />
        <StepItem
          number={3}
          text="A soulbound NFT is minted on Celo as on-chain proof that a real human owns this account"
        />
      </View>

      <Button
        label="Verify with Self Protocol"
        onPress={() => void onStartVerification()}
        color="primary"
        size="large"
        disabled={isStarting}>
        <ButtonText>
          {isStarting ? 'Starting...' : 'Verify with Self Protocol'}
        </ButtonText>
      </Button>

      {error && (
        <Text
          style={[a.text_sm, a.text_center, {color: t.palette.negative_500}]}>
          {error}
        </Text>
      )}
    </View>
  )
}

function VerifiedState({
  verification,
}: {
  verification: NonNullable<ReturnType<typeof useSelfAgentVerification>>
}) {
  const t = useTheme()
  const setVerification = useSetSelfAgentVerification()
  const removeControl = Dialog.useDialogControl()

  const registeredDate = new Date(verification.registeredAt)
  const formattedDate = registeredDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <View style={[a.p_xl, a.gap_xl]}>
      <View style={[a.align_center, a.pt_lg]}>
        <ShieldCheckIcon width={48} fill={t.palette.positive_600} />
      </View>
      <View style={[a.gap_sm]}>
        <Text style={[a.text_2xl, a.font_bold, a.text_center]}>
          Owner verified
        </Text>
        <Text style={[a.text_md, a.text_center, t.atoms.text_contrast_medium]}>
          Verified on {formattedDate}
        </Text>
      </View>

      <Button
        label="View on-chain proof"
        onPress={() => {
          void Linking.openURL(verification.proofUrl)
        }}
        color="secondary"
        size="large">
        <ButtonText>View on-chain proof</ButtonText>
      </Button>

      <Button
        label="Remove verification"
        onPress={() => removeControl.open()}
        color="negative"
        size="large"
        variant="outline">
        <ButtonText>Remove verification</ButtonText>
      </Button>

      <Dialog.Outer
        control={removeControl}
        nativeOptions={{preventExpansion: true}}>
        <Dialog.ScrollableInner
          label="Remove verification"
          style={[web({maxWidth: 400})]}>
          <Dialog.Header>
            <Dialog.HeaderText>Remove verification?</Dialog.HeaderText>
          </Dialog.Header>
          <Text style={[a.text_md, a.leading_snug, a.pb_lg]}>
            This will remove the Self Agent ID verification from your account.
            You can re-verify at any time.
          </Text>
          <View style={[a.gap_sm]}>
            <Button
              label="Remove"
              onPress={() => {
                removeControl.close(() => {
                  setVerification(undefined)
                })
              }}
              color="negative"
              size="large">
              <ButtonText>Remove</ButtonText>
            </Button>
            <Button
              label="Cancel"
              onPress={() => removeControl.close()}
              color="secondary"
              size="large">
              <ButtonText>Cancel</ButtonText>
            </Button>
          </View>
          <Dialog.Close />
        </Dialog.ScrollableInner>
      </Dialog.Outer>
    </View>
  )
}

function StepItem({number, text}: {number: number; text: string}) {
  const t = useTheme()
  return (
    <View style={[a.flex_row, a.align_start, a.gap_sm]}>
      <View
        style={[
          a.align_center,
          a.justify_center,
          a.rounded_full,
          {
            width: 24,
            height: 24,
            backgroundColor: t.palette.primary_500,
            marginTop: 1,
          },
        ]}>
        <Text style={[a.text_xs, a.font_bold, {color: 'white'}]}>{number}</Text>
      </View>
      <Text style={[a.text_md, a.leading_snug, a.flex_1]}>{text}</Text>
    </View>
  )
}
