import {useEffect, useState} from 'react'
import {ActivityIndicator, Image, Linking, Pressable, View} from 'react-native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {
  getAgentExplorerUrl,
  type RegistrationSession,
  startRegistration,
} from '#/lib/selfAgentId'
import {useWalletConnect} from '#/lib/useWalletConnect'
import {logger} from '#/logger'
import {
  type SelfAgentRecord,
  useDeleteSelfAgentRecordMutation,
  usePutSelfAgentRecordMutation,
  useSelfAgentRecordsQuery,
  useSelfAgentRegistrationStatusQuery,
} from '#/state/queries/selfAgentVerification'
import {useSession} from '#/state/session'
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
  const {currentAccount} = useSession()
  const {data: agents, isLoading} = useSelfAgentRecordsQuery({
    did: currentAccount?.did,
  })

  const hasAgents = agents && agents.length > 0

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
        {isLoading ? null : (
          <View style={[a.gap_xl]}>
            {hasAgents && <AgentList agents={agents} />}
            <AddAgentSection />
          </View>
        )}
      </Layout.Content>
    </Layout.Screen>
  )
}

function AgentList({agents}: {agents: SelfAgentRecord[]}) {
  const t = useTheme()

  return (
    <View style={[a.p_xl, a.pb_0, a.gap_lg]}>
      <View style={[a.align_center, a.pt_sm]}>
        <ShieldCheckIcon width={40} fill={t.palette.positive_600} />
      </View>
      <Text style={[a.text_2xl, a.font_bold, a.text_center]}>
        {agents.length === 1
          ? 'Agent verified'
          : `${agents.length} agents verified`}
      </Text>

      {agents.map(agent => (
        <AgentCard key={agent.agentId} record={agent} />
      ))}
    </View>
  )
}

function AgentCard({record}: {record: SelfAgentRecord}) {
  const t = useTheme()
  const deleteRecord = useDeleteSelfAgentRecordMutation()
  const removeControl = Dialog.useDialogControl()

  const registeredDate = new Date(record.registeredAt)
  const formattedDate = registeredDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const shortAgentId = `${record.agentId.slice(0, 6)}...${record.agentId.slice(-4)}`

  return (
    <View
      style={[
        a.p_md,
        a.rounded_md,
        a.border,
        t.atoms.border_contrast_low,
        t.atoms.bg_contrast_50,
        a.gap_sm,
      ]}>
      <View style={[a.flex_row, a.align_center, a.justify_between]}>
        <View style={[a.gap_2xs]}>
          <Text style={[a.text_sm, a.font_bold]}>Agent {shortAgentId}</Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            Verified on {formattedDate}
          </Text>
          {record.walletAddress && (
            <Text
              style={[
                a.text_xs,
                t.atoms.text_contrast_medium,
                {fontFamily: 'monospace'},
              ]}>
              Wallet: {record.walletAddress.slice(0, 6)}...
              {record.walletAddress.slice(-4)}
            </Text>
          )}
        </View>
        <ShieldCheckIcon width={20} fill={t.palette.positive_600} />
      </View>

      <View style={[a.flex_row, a.gap_sm]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View on-chain proof"
          accessibilityHint="Opens the block explorer showing the soulbound NFT"
          onPress={() => {
            void Linking.openURL(record.proofUrl)
          }}
          style={[a.flex_1]}>
          <Text
            style={[a.text_sm, a.text_center, {color: t.palette.primary_500}]}>
            View proof
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove this agent"
          accessibilityHint="Removes this agent verification from your account"
          onPress={() => removeControl.open()}
          style={[a.flex_1]}>
          <Text
            style={[a.text_sm, a.text_center, {color: t.palette.negative_500}]}>
            Remove
          </Text>
        </Pressable>
      </View>

      <Dialog.Outer
        control={removeControl}
        nativeOptions={{preventExpansion: true}}>
        <Dialog.ScrollableInner
          label="Remove agent"
          style={[web({maxWidth: 400})]}>
          <Dialog.Header>
            <Dialog.HeaderText>Remove agent {shortAgentId}?</Dialog.HeaderText>
          </Dialog.Header>
          <Text style={[a.text_md, a.leading_snug, a.pb_lg]}>
            This will remove this agent from your account. The on-chain NFT will
            remain. You can re-verify at any time.
          </Text>
          <View style={[a.gap_sm]}>
            <Button
              label="Remove"
              onPress={() => {
                removeControl.close(() => {
                  deleteRecord.mutate(record.agentId)
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

function AddAgentSection() {
  const t = useTheme()
  const {currentAccount} = useSession()
  const {openWalletModal, walletAddress, isWalletConnected} = useWalletConnect()
  const putRecord = usePutSelfAgentRecordMutation()
  const [session, setSession] = useState<RegistrationSession>()
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string>()

  const {data: status} = useSelfAgentRegistrationStatusQuery({
    sessionToken: session?.sessionToken,
    enabled: !!session,
  })

  // When registration completes, write the record to PDS
  useEffect(() => {
    if (status?.status === 'completed' && status.agentId) {
      const agentId = status.agentId
      setSession(undefined)
      putRecord.mutate({
        agentId,
        chain: 'celoSepolia',
        verified: true,
        proofUrl: getAgentExplorerUrl(walletAddress ?? agentId),
        walletAddress: walletAddress ?? undefined,
        registeredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    }
  }, [status, putRecord, walletAddress])

  const onStartVerification = async () => {
    setIsStarting(true)
    setError(undefined)
    try {
      const result = await startRegistration(
        currentAccount?.did ?? '',
        walletAddress ?? undefined,
      )
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

  // Verification in progress
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

        {IS_NATIVE && session.deepLink ? (
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

  // Wallet connected — ready to add agent
  if (isWalletConnected && walletAddress) {
    return (
      <View style={[a.p_xl, a.gap_lg]}>
        <View
          style={[a.w_full, a.border_t, t.atoms.border_contrast_low, a.pt_lg]}
        />
        <Text style={[a.text_lg, a.font_bold]}>Add another agent</Text>
        <View style={[a.gap_xs]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            Wallet connected:
          </Text>
          <Text
            style={[
              a.text_xs,
              t.atoms.text_contrast_medium,
              {fontFamily: 'monospace'},
            ]}>
            {walletAddress}
          </Text>
        </View>

        <Button
          label="Add new agent"
          onPress={() => void onStartVerification()}
          color="primary"
          size="large"
          disabled={isStarting}>
          <ButtonText>
            {isStarting ? 'Starting...' : 'Add new agent'}
          </ButtonText>
        </Button>

        <Button
          label="Change wallet"
          onPress={() => openWalletModal()}
          color="secondary"
          size="large">
          <ButtonText>Change wallet</ButtonText>
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

  // Connect wallet first
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
          Connect your wallet to link your on-chain identity, then verify with
          Self Protocol using your passport.
        </Text>
      </View>

      <View style={[a.gap_sm, a.py_sm]}>
        <Text style={[a.text_lg, a.font_bold]}>How it works</Text>
        <StepItem
          number={1}
          text="Connect your wallet (MetaMask, Rainbow, etc.)"
        />
        <StepItem
          number={2}
          text="Scan your passport with the Self app (NFC)"
        />
        <StepItem
          number={3}
          text="A soulbound NFT is minted on Celo linking your wallet to a proof-of-human"
        />
        <StepItem
          number={4}
          text="Your DID and wallet address are stored on your PDS for bidirectional verification"
        />
      </View>

      <Button
        label="Connect Wallet"
        onPress={() => openWalletModal()}
        color="primary"
        size="large">
        <ButtonText>Connect Wallet</ButtonText>
      </Button>
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
