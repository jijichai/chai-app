export {Features} from '#/analytics/features/types'

export type FeatureFetchStrategy = 'prefer-low-latency' | 'prefer-fresh-gates'

export const init = Promise.resolve()

export async function refresh(_opts: {strategy: FeatureFetchStrategy}) {}

export function setAttributes(_metadata: unknown) {}
