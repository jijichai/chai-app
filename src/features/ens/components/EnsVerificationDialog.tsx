import {useState} from 'react'
import {View} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

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
import {
  EnsDidMismatchError,
  EnsResolutionError,
  useRemoveEnsMutation,
  useVerifyEnsMutation,
} from '#/features/ens/useVerifyEns'
import {account, useStorage} from '#/storage'

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

  const [ensName] = useStorage(account, [did, 'ensName'])

  if (ensName) {
    return <VerifiedState control={control} ensName={ensName} />
  }

  return <VerifyState control={control} />
}

function VerifiedState({
  control,
  ensName,
}: {
  control: DialogContextProps
  ensName: string
}) {
  const {_} = useLingui()
  const t = useTheme()
  const {mutate: removeEns, isPending} = useRemoveEnsMutation()

  return (
    <Dialog.ScrollableInner label={_(msg`ENS Name`)}>
      <Dialog.Header>
        <Dialog.HeaderText>
          <Trans>ENS Name</Trans>
        </Dialog.HeaderText>
      </Dialog.Header>

      <View style={[a.align_center, a.py_lg]}>
        <EnsIcon width={48} fill={ENS_COLOR} />
        <Text style={[a.text_lg, a.font_bold, a.pt_md, t.atoms.text]}>
          {ensName}
        </Text>
        <Text
          style={[
            a.text_sm,
            a.pt_xs,
            t.atoms.text_contrast_medium,
            a.text_center,
          ]}>
          <Trans>Your verified ENS name is displayed throughout the app.</Trans>
        </Text>
      </View>

      <View style={[a.gap_sm]}>
        <Button
          label={_(msg`Remove ENS name`)}
          onPress={() => {
            removeEns(undefined, {
              onSuccess: () => {
                control.close()
              },
            })
          }}
          color="negative"
          size="large"
          disabled={isPending}>
          <ButtonText>
            <Trans>Remove</Trans>
          </ButtonText>
          {isPending && <ButtonIcon icon={Loader} />}
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

function VerifyState({control}: {control: DialogContextProps}) {
  const {_} = useLingui()
  const t = useTheme()
  const {currentAccount} = useSession()
  const did = currentAccount?.did ?? ''

  const [inputValue, setInputValue] = useState('')
  const [copied, setCopied] = useState(false)
  const {mutate: verifyEns, isPending, error, reset} = useVerifyEnsMutation()

  const ensName = inputValue.trim().toLowerCase()
  const isValid = ensName.endsWith('.eth') && ensName.length > 4

  const errorMessage = error
    ? error instanceof EnsResolutionError
      ? _(
          msg`Could not resolve this ENS name. Make sure it exists and has an _atproto text record set.`,
        )
      : error instanceof EnsDidMismatchError
        ? _(
            msg`This ENS name resolves to a different account. Make sure the _atproto text record contains your DID.`,
          )
        : _(msg`Something went wrong. Please try again.`)
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
    <Dialog.ScrollableInner label={_(msg`Verify ENS Name`)}>
      <Dialog.Header>
        <Dialog.HeaderText>
          <Trans>Verify ENS Name</Trans>
        </Dialog.HeaderText>
      </Dialog.Header>

      <View style={[a.gap_lg, a.pt_md]}>
        <Text style={[a.text_md, a.leading_snug, t.atoms.text]}>
          <Trans>
            Link your .eth ENS name to display it as your handle throughout the
            app.
          </Trans>
        </Text>

        <View style={[a.gap_sm]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text_contrast_high]}>
            <Trans>Setup instructions</Trans>
          </Text>
          <View
            style={[a.gap_xs, a.p_md, a.rounded_md, t.atoms.bg_contrast_25]}>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              <Trans>1. Go to app.ens.domains and connect your wallet</Trans>
            </Text>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              <Trans>2. Select your .eth name</Trans>
            </Text>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              <Trans>3. Go to the Records tab</Trans>
            </Text>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              <Trans>4. Add a Text Record with key: _atproto</Trans>
            </Text>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              <Trans>5. Set the value to your DID (below)</Trans>
            </Text>
            <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
              <Trans>6. Save and confirm the transaction</Trans>
            </Text>
          </View>
        </View>

        <View style={[a.gap_xs]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text_contrast_high]}>
            <Trans>Your DID (copy this value)</Trans>
          </Text>
          <Button
            label={_(msg`Copy DID`)}
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
          <TextField.LabelText>
            <Trans>ENS name</Trans>
          </TextField.LabelText>
          <TextField.Root>
            <TextField.Icon icon={EnsIcon} />
            <TextField.Input
              label={_(msg`Enter your .eth name`)}
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
            label={_(msg`Verify`)}
            onPress={handleVerify}
            color="primary"
            size="large"
            disabled={!isValid || isPending}>
            <ButtonText>
              <Trans>Verify</Trans>
            </ButtonText>
            {isPending && <ButtonIcon icon={Loader} />}
          </Button>
          <Button
            label={_(msg`Cancel`)}
            onPress={() => control.close()}
            color="secondary"
            size="large">
            <ButtonText>
              <Trans>Cancel</Trans>
            </ButtonText>
          </Button>
        </View>
      </View>

      <Dialog.Close />
    </Dialog.ScrollableInner>
  )
}
