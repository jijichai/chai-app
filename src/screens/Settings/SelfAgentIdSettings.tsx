import {useState} from 'react'
import {ActivityIndicator, Linking, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {getAgentExplorerUrl, startRegistration} from '#/lib/selfAgentId'
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
          <Layout.Header.TitleText>
            <Trans>Self Agent ID</Trans>
          </Layout.Header.TitleText>
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
  const {t: l} = useLingui()
  const setVerification = useSetSelfAgentVerification()
  const [sessionToken, setSessionToken] = useState<string>()
  const [qrCodeUrl, setQrCodeUrl] = useState<string>()
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string>()

  const {data: status} = useSelfAgentRegistrationStatusQuery({
    sessionToken,
    enabled: !!sessionToken,
  })

  // When registration completes, save the verification data
  if (status?.status === 'completed' && status.agentId) {
    const agentId = status.agentId
    setSessionToken(undefined)
    setVerification({
      agentId,
      verified: true,
      proofUrl: getAgentExplorerUrl(agentId),
      registeredAt: new Date().toISOString(),
    })
  }

  const onStartVerification = async () => {
    setIsStarting(true)
    setError(undefined)
    try {
      const session = await startRegistration()
      setSessionToken(session.sessionToken)
      setQrCodeUrl(session.qrCodeUrl)
    } catch (e) {
      logger.error('Self Agent ID: failed to start registration', {
        safeMessage: e,
      })
      setError(l(msg`Failed to start verification. Please try again.`))
    } finally {
      setIsStarting(false)
    }
  }

  if (sessionToken && qrCodeUrl) {
    return (
      <View style={[a.p_xl, a.gap_xl]}>
        <View style={[a.align_center, a.pt_lg]}>
          <ShieldIcon width={48} fill={t.palette.primary_500} />
        </View>
        <View style={[a.gap_sm]}>
          <Text style={[a.text_2xl, a.font_bold, a.text_center]}>
            <Trans>Scan with Self app</Trans>
          </Text>
          <Text
            style={[
              a.text_md,
              a.leading_snug,
              a.text_center,
              t.atoms.text_contrast_medium,
            ]}>
            <Trans>
              Open the Self app on your phone and scan the QR code to verify
              your identity. Your personal data stays on your device.
            </Trans>
          </Text>
        </View>

        {status?.status === 'pending' && (
          <View style={[a.align_center, a.py_xl]}>
            <ActivityIndicator size="large" color={t.palette.primary_500} />
            <Text style={[a.text_sm, a.pt_md, t.atoms.text_contrast_medium]}>
              <Trans>Waiting for verification...</Trans>
            </Text>
          </View>
        )}

        <Button
          label={l(msg`Open Self app`)}
          onPress={() => {
            void Linking.openURL(qrCodeUrl)
          }}
          color="primary"
          size="large">
          <ButtonText>
            <Trans>Open Self app</Trans>
          </ButtonText>
        </Button>

        <Button
          label={l(msg`Cancel`)}
          onPress={() => {
            setSessionToken(undefined)
            setQrCodeUrl(undefined)
          }}
          color="secondary"
          size="large">
          <ButtonText>
            <Trans>Cancel</Trans>
          </ButtonText>
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
          <Trans>Verify your identity</Trans>
        </Text>
        <Text
          style={[
            a.text_md,
            a.leading_snug,
            a.text_center,
            t.atoms.text_contrast_medium,
          ]}>
          <Trans>
            Prove that this automated account is backed by a real human using
            Self Protocol. Your personal data stays on your device — only a
            zero-knowledge proof is shared.
          </Trans>
        </Text>
      </View>

      <View style={[a.gap_md, a.py_sm]}>
        <BulletPoint text={l(msg`No personal data is stored or shared`)} />
        <BulletPoint text={l(msg`Creates a soulbound NFT on Celo as proof`)} />
        <BulletPoint text={l(msg`Other users see a "Verified owner" badge`)} />
      </View>

      <Button
        label={l(msg`Verify with Self Protocol`)}
        onPress={() => void onStartVerification()}
        color="primary"
        size="large"
        disabled={isStarting}>
        <ButtonText>
          {isStarting ? (
            <Trans>Starting...</Trans>
          ) : (
            <Trans>Verify with Self Protocol</Trans>
          )}
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
  const {t: l} = useLingui()
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
          <Trans>Owner verified</Trans>
        </Text>
        <Text style={[a.text_md, a.text_center, t.atoms.text_contrast_medium]}>
          <Trans>Verified on {formattedDate}</Trans>
        </Text>
      </View>

      <Button
        label={l(msg`View on-chain proof`)}
        onPress={() => {
          void Linking.openURL(verification.proofUrl)
        }}
        color="secondary"
        size="large">
        <ButtonText>
          <Trans>View on-chain proof</Trans>
        </ButtonText>
      </Button>

      <Button
        label={l(msg`Remove verification`)}
        onPress={() => removeControl.open()}
        color="negative"
        size="large"
        variant="outline">
        <ButtonText>
          <Trans>Remove verification</Trans>
        </ButtonText>
      </Button>

      <Dialog.Outer
        control={removeControl}
        nativeOptions={{preventExpansion: true}}>
        <Dialog.ScrollableInner
          label={l(msg`Remove verification`)}
          style={[web({maxWidth: 400})]}>
          <Dialog.Header>
            <Dialog.HeaderText>
              <Trans>Remove verification?</Trans>
            </Dialog.HeaderText>
          </Dialog.Header>
          <Text style={[a.text_md, a.leading_snug, a.pb_lg]}>
            <Trans>
              This will remove the Self Agent ID verification from your account.
              You can re-verify at any time.
            </Trans>
          </Text>
          <View style={[a.gap_sm]}>
            <Button
              label={l(msg`Remove`)}
              onPress={() => {
                removeControl.close(() => {
                  setVerification(undefined)
                })
              }}
              color="negative"
              size="large">
              <ButtonText>
                <Trans>Remove</Trans>
              </ButtonText>
            </Button>
            <Button
              label={l(msg`Cancel`)}
              onPress={() => removeControl.close()}
              color="secondary"
              size="large">
              <ButtonText>
                <Trans>Cancel</Trans>
              </ButtonText>
            </Button>
          </View>
          <Dialog.Close />
        </Dialog.ScrollableInner>
      </Dialog.Outer>
    </View>
  )
}

function BulletPoint({text}: {text: string}) {
  const t = useTheme()
  return (
    <View style={[a.flex_row, a.align_start, a.gap_sm]}>
      <View
        style={[
          {
            width: 6,
            height: 6,
            borderRadius: 3,
            marginTop: 7,
            backgroundColor: t.palette.primary_500,
          },
        ]}
      />
      <Text style={[a.text_md, a.leading_snug, a.flex_1]}>{text}</Text>
    </View>
  )
}
