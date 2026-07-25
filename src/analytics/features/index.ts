export {Features} from '#/analytics/features/types'

export type FeatureFetchStrategy = 'prefer-low-latency' | 'prefer-fresh-gates'

export const init = Promise.resolve()

export async function refresh(_opts: {strategy: FeatureFetchStrategy}) {}

export function setAttributes(_metadata: unknown) {}

// Stub matching GrowthBook's surface so callsites compile; all gates off.
export const features = {
  isOn: (_feature: string) => false,
  evalFeature: (_feature: string) => ({value: undefined, on: false}),
  getFeatures: () => ({}),
}
