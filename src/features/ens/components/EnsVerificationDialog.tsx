import {useState} from 'react'
import {View} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type EnsRecord, useEnsRecordsQuery} from '#/state/queries/ensRecords'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {type DialogContextProps} from '#/components/Dialog/types'
import * as TextField from '#/components/forms/TextField'
import {CheckThick_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {Ens_Stroke2_Corner0_Rounded as EnsIcon} from '#/components/icons/Ens'
import {SquareBehindSquare4_Stroke2_Corner0_Rounded as CopyIcon} from '#/components/icons/SquareBehindSquare4'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {useEnsMMKVMigration} from '#/features/ens/useEnsMMKVMigration'
import {
  EnsDidMismatchError,
  EnsResolutionError,
  useRemoveEnsMutation,
  useVerifyEnsMutation,
} from '#/features/ens/useVerifyEns'

const ENS_COLOR = '#627EEA'

export function EnsVerificationDialog({
  control,
}: {
  control: Dialog.DialogControlProps
}) {
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <EnsVerificationDialogInner />
    </Dialog.Outer>
  )
}

function EnsVerificationDialogInner() {
  const control = Dialog.useDialogContext()
  const {currentAccount} = useSession()
  const did = currentAccount?.did ?? ''
  const {data: ensRecords} = useEnsRecordsQuery({did})
  const [showVerify, setShowVerify] = useState(false)

  // Migrate any existing MMKV ENS data to PDS on dialog open
  useEnsMMKVMigration()

  if (ensRecords && ensRecords.length > 0 && !showVerify) {
    return (
      <VerifiedState
        control={control}
        ensRecords={ensRecords}
        onAddAnother={() => setShowVerify(true)}
      />
    )
  }

  return (
    <VerifyState
      control={control}
      onBack={
        ensRecords && ensRecords.length > 0
          ? () => setShowVerify(false)
          : undefined
      }
    />
  )
}

function VerifiedState({
  control,
  ensRecords,
  onAddAnother,
}: {
  control: DialogContextProps
  ensRecords: EnsRecord[]
  onAddAnother: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {
    mutate: removeEns,
    isPending,
    variables: pendingName,
  } = useRemoveEnsMutation()

  return (
    <Dialog.ScrollableInner label={_(msg`ENS Names`)}>
      <Dialog.Header>
        <Dialog.HeaderText>
          <Trans>ENS Names</Trans>
        </Dialog.HeaderText>
      </Dialog.Header>

      <View style={[a.align_center, a.py_lg]}>
        <EnsIcon width={48} fill={ENS_COLOR} />
        <Text
          style={[
            a.text_sm,
            a.pt_md,
            t.atoms.text_contrast_medium,
            a.text_center,
          ]}>
          <Trans>
            Your verified ENS names are displayed throughout the app.
          </Trans>
        </Text>
      </View>

      <View style={[a.gap_sm]}>
        {ensRecords.map(record => (
          <View
            key={record.ensName}
            style={[
              a.flex_row,
              a.align_center,
              a.justify_between,
              a.p_md,
              a.rounded_md,
              t.atoms.bg_contrast_25,
            ]}>
            <Text style={[a.text_md, a.font_bold, t.atoms.text, a.flex_1]}>
              {record.ensName}
            </Text>
            <Button
              label={_(msg`Remove ${record.ensName}`)}
              onPress={() => removeEns(record.ensName)}
              color="negative"
              size="small"
              disabled={isPending}>
              <ButtonText>
                <Trans>Remove</Trans>
              </ButtonText>
              {isPending && pendingName === record.ensName && (
                <ButtonIcon icon={Loader} />
              )}
            </Button>
          </View>
        ))}
      </View>

      <View style={[a.gap_sm, a.pt_md]}>
        <Button
          label={_(msg`Verify another ENS name`)}
          onPress={onAddAnother}
          color="primary"
          size="large">
          <ButtonText>
            <Trans>Verify another</Trans>
          </ButtonText>
        </Button>
        <Button
          label={_(msg`Close`)}
          onPress={() => control.close()}
          color="secondary"
          size="large">
          <ButtonText>
            <Trans>Close</Trans>
          </ButtonText>
        </Button>
      </View>

      <Dialog.Close />
    </Dialog.ScrollableInner>
  )
}

function VerifyState({
  control,
  onBack,
}: {
  control: DialogContextProps
  onBack?: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const did = currentAccount?.did ?? ''

  const [inputValue, setInputValue] = useState('')
  const [copied, setCopied] = useState(false)
  const {mutate: verifyEns, isPending, error, reset} = useVerifyEnsMutation()

  const ensName = inputValue.trim().toLowerCase()
  const isValid = ensName.endsWith('.eth') && ensName.length > 4

  const errorMessage = error
    ? error instanceof EnsResolutionError
      ? 'Could not resolve this ENS name. Make sure it exists and has an _atproto text record set.'
      : error instanceof EnsDidMismatchError
        ? 'This ENS name resolves to a different account. Make sure the _atproto text record contains your DID.'
        : 'Something went wrong. Please try again.'
    : undefined

  const handleCopyDid = () => {
    Clipboard.setStringAsync(`did=${did}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleVerify = () => {
    reset()
    verifyEns(
      {ensName},
      {
        onSuccess: () => {
          control.close()
        },
      },
    )
  }

  return (
    <Dialog.ScrollableInner label="Verify ENS Name">
      <Dialog.Header>
        <Dialog.HeaderText>Verify ENS Name</Dialog.HeaderText>
      </Dialog.Header>

      <View style={[a.gap_lg, a.pt_md]}>
        <Text style={[a.text_md, a.leading_snug, t.atoms.text]}>
          Link your .eth ENS name to display it as your handle throughout the
          app.
        </Text>

        <View style={[a.gap_sm]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text_contrast_high]}>
            Setup instructions
          </Text>
          <View
            style={[a.gap_xs, a.p_md, a.rounded_md, t.atoms.bg_contrast_25]}>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              1. Go to app.ens.domains and connect your wallet
            </Text>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              2. Select your .eth name
            </Text>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              3. Go to the Records tab
            </Text>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              4. Add a Text Record with key: _atproto
            </Text>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              5. Set the value to your DID (below)
            </Text>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              6. Save and confirm the transaction
            </Text>
          </View>
        </View>

        <View style={[a.gap_xs]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text_contrast_high]}>
            Your DID (copy this value)
          </Text>
          <Button
            label="Copy DID"
            onPress={handleCopyDid}
            color="secondary"
            size="small"
            style={[a.justify_between]}>
            <ButtonText
              style={[a.text_xs, {fontFamily: 'monospace'}, a.flex_1]}
              numberOfLines={1}>
              did={did}
            </ButtonText>
            <ButtonIcon icon={copied ? CheckIcon : CopyIcon} />
          </Button>
        </View>

        <View style={[a.gap_xs]}>
          <TextField.LabelText>ENS name</TextField.LabelText>
          <TextField.Root>
            <TextField.Icon icon={EnsIcon} />
            <TextField.Input
              label="Enter your .eth name"
              placeholder="name.eth"
              defaultValue={inputValue}
              onChangeText={text => {
                setInputValue(text)
                if (error) reset()
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </TextField.Root>
        </View>

        {errorMessage && <Admonition type="error">{errorMessage}</Admonition>}

        <View style={[a.gap_sm]}>
          <Button
            label="Verify"
            onPress={handleVerify}
            color="primary"
            size="large"
            disabled={!isValid || isPending}>
            <ButtonText>Verify</ButtonText>
            {isPending && <ButtonIcon icon={Loader} />}
          </Button>
          <Button
            label={onBack ? _(msg`Back`) : _(msg`Cancel`)}
            onPress={() => (onBack ? onBack() : control.close())}
            color="secondary"
            size="large">
            <ButtonText>
              {onBack ? <Trans>Back</Trans> : <Trans>Cancel</Trans>}
            </ButtonText>
          </Button>
        </View>
      </View>

      <Dialog.Close />
    </Dialog.ScrollableInner>
  )
}
