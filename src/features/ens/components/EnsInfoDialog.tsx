import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Ens_Stroke2_Corner0_Rounded as EnsIcon} from '#/components/icons/Ens'
import {Text} from '#/components/Typography'

const ENS_COLOR = '#627EEA'

export function EnsInfoDialog({
  control,
  ensName,
}: {
  control: Dialog.DialogControlProps
  ensName: string
}) {
  const {t: l} = useLingui()
  const t = useTheme()

  return (
    <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
      <Dialog.ScrollableInner
        label={l`Verified ENS name`}
        style={[web({maxWidth: 320})]}>
        <View style={[a.align_center, a.pb_md]}>
          <EnsIcon width={48} fill={ENS_COLOR} />
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
            {ensName}
          </Text>
          <Text
            style={[
              a.leading_snug,
              a.text_center,
              a.pb_xl,
              a.text_md,
              t.atoms.text_contrast_high,
              {maxWidth: 300},
            ]}>
            <Trans>
              This user has verified ownership of this ENS name by setting an
              on-chain record that links to their account.
            </Trans>
          </Text>
        </View>
        <View style={[a.w_full]}>
          <Button
            label={l`Okay`}
            onPress={() => control.close()}
            color="primary"
            size="large">
            <ButtonText>
              <Trans>Okay</Trans>
            </ButtonText>
          </Button>
        </View>
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}
