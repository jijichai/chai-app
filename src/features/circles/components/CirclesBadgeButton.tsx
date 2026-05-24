import {View} from 'react-native'

import {CIRCLES_ORANGE} from '#/lib/constants'
import {atoms as a} from '#/alf'
import {Button} from '#/components/Button'
import {useDialogControl} from '#/components/Dialog'
import {VerifiedCheck} from '#/components/icons/VerifiedCheck'
import {CirclesInfoDialog} from '#/features/circles/components/CirclesInfoDialog'
import {type CirclesBindResult} from '#/features/circles/verifyCirclesBind'

export function CirclesBadgeButton({
  bind,
  width,
}: {
  bind: CirclesBindResult
  width: number
}) {
  const control = useDialogControl()

  return (
    <>
      <Button
        label={`Linked Circles account: ${bind.address}`}
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
            <VerifiedCheck width={width} fill={CIRCLES_ORANGE} />
          </View>
        )}
      </Button>
      <CirclesInfoDialog control={control} bind={bind} />
    </>
  )
}
