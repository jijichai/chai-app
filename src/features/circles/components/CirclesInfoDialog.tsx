import {Linking, View} from 'react-native'

import {CIRCLES_ORANGE} from '#/lib/constants'
import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {VerifiedCheck} from '#/components/icons/VerifiedCheck'
import {Text} from '#/components/Typography'
import {type CirclesBindResult} from '#/features/circles/verifyCirclesBind'

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function CirclesInfoDialog({
  control,
  bind,
}: {
  control: Dialog.DialogControlProps
  bind: CirclesBindResult
}) {
  const t = useTheme()
  const explorerUrl = `https://gnosisscan.io/address/${bind.address}`

  return (
    <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
      <Dialog.ScrollableInner
        label="Linked Circles account"
        style={[web({maxWidth: 360})]}>
        <View style={[a.align_center, a.pb_md]}>
          <VerifiedCheck width={48} fill={CIRCLES_ORANGE} />
        </View>
        <View style={[a.align_center]}>
          <Text
            style={[
              a.text_lg,
              a.font_bold,
              a.text_center,
              a.pb_sm,
              t.atoms.text,
            ]}>
            Linked to Circles
          </Text>
          <Text
            style={[
              a.leading_snug,
              a.text_center,
              a.pb_md,
              a.text_md,
              t.atoms.text_contrast_high,
              {maxWidth: 320},
            ]}>
            This account has cryptographically linked itself to a Circles
            identity on Gnosis Chain.
          </Text>
          <Text
            style={[
              a.leading_snug,
              a.text_center,
              a.pb_xl,
              a.text_sm,
              t.atoms.text_contrast_medium,
            ]}>
            Safe address {shortAddress(bind.address)}
          </Text>
        </View>
        <View style={[a.w_full, a.gap_sm]}>
          <Button
            label="View on Gnosisscan"
            onPress={() => Linking.openURL(explorerUrl)}
            color="secondary"
            size="large">
            <ButtonText>View on Gnosisscan</ButtonText>
          </Button>
          <Button
            label="Okay"
            onPress={() => control.close()}
            color="primary"
            size="large">
            <ButtonText>Okay</ButtonText>
          </Button>
        </View>
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}
