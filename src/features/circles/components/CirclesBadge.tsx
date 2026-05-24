import {View} from 'react-native'

import {CIRCLES_ORANGE} from '#/lib/constants'
import {VerifiedCheck} from '#/components/icons/VerifiedCheck'

export function CirclesBadge({width}: {width: number}) {
  return (
    <View>
      <VerifiedCheck width={width} fill={CIRCLES_ORANGE} />
    </View>
  )
}
