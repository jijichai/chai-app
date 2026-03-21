import {View} from 'react-native'

import {Ens_Stroke2_Corner0_Rounded as EnsIcon} from '#/components/icons/Ens'

const ENS_COLOR = '#627EEA'

export function EnsBadge({width}: {width: number}) {
  return (
    <View>
      <EnsIcon width={width} fill={ENS_COLOR} />
    </View>
  )
}
