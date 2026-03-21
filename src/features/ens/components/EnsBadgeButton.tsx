import {View} from 'react-native'

import {atoms as a} from '#/alf'
import {Button} from '#/components/Button'
import {useDialogControl} from '#/components/Dialog'
import {Ens_Stroke2_Corner0_Rounded as EnsIcon} from '#/components/icons/Ens'
import {EnsInfoDialog} from '#/features/ens/components/EnsInfoDialog'

const ENS_COLOR = '#627EEA'

export function EnsBadgeButton({
  ensName,
  width,
}: {
  ensName: string
  width: number
}) {
  const control = useDialogControl()

  return (
    <>
      <Button
        label={`Verified ENS name: ${ensName}`}
        hitSlop={20}
        onPress={evt => {
          evt.preventDefault()
          control.open()
        }}>
        {({hovered}) => (
          <View
            style={[
              a.justify_end,
              a.align_end,
              a.transition_transform,
              {
                width: width,
                height: width,
                transform: [{scale: hovered ? 1.1 : 1}],
              },
            ]}>
            <EnsIcon width={width} fill={ENS_COLOR} />
          </View>
        )}
      </Button>
      <EnsInfoDialog control={control} ensName={ensName} />
    </>
  )
}
