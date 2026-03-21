import {ComAtprotoTempCheckHandleAvailability} from '@atproto/api'
import {useQuery} from '@tanstack/react-query'

import {
  BSKY_SERVICE,
  BSKY_SERVICE_DID,
  PUBLIC_BSKY_SERVICE,
} from '#/lib/constants'
import {useDebouncedValue} from '#/lib/hooks/useDebouncedValue'
import {createFullHandle} from '#/lib/strings/handles'
import {useAnalytics} from '#/analytics'
import * as bsky from '#/types/bsky'
import {Agent} from '../session/agent'

export const RQKEY_handleAvailability = (
  handle: string,
  domain: string,
  serviceDid: string,
) => ['handle-availability', {handle, domain, serviceDid}]

export function useHandleAvailabilityQuery(
  {
    username,
    serviceDomain,
    serviceDid,
    serviceUrl,
    enabled,
    birthDate,
    email,
  }: {
    username: string
    serviceDomain: string
    serviceDid: string
    serviceUrl: string
    enabled: boolean
    birthDate?: string
    email?: string
  },
  debounceDelayMs = 500,
) {
  const ax = useAnalytics()
  const name = username.trim()
  const debouncedHandle = useDebouncedValue(name, debounceDelayMs)

  return {
    debouncedUsername: debouncedHandle,
    enabled: enabled && name === debouncedHandle,
    query: useQuery({
      enabled: enabled && name === debouncedHandle,
      queryKey: RQKEY_handleAvailability(
        debouncedHandle,
        serviceDomain,
        serviceDid,
      ),
      queryFn: async () => {
        const handle = createFullHandle(name, serviceDomain)
        const res = await checkHandleAvailability(handle, serviceDid, {
          email,
          birthDate,
          serviceUrl,
        })
        if (res.available) {
          ax.metric('signup:handleAvailable', {typeahead: true})
        } else {
          ax.metric('signup:handleTaken', {typeahead: true})
        }
        return res
      },
    }),
  }
}

export async function checkHandleAvailability(
  handle: string,
  serviceDid: string,
  {
    email,
    birthDate,
    serviceUrl,
  }: {
    email?: string
    birthDate?: string
    serviceUrl?: string
  },
) {
  if (serviceDid === BSKY_SERVICE_DID) {
    const agent = new Agent(null, {service: BSKY_SERVICE})
    // entryway has a special API for handle availability
    const {data} = await agent.com.atproto.temp.checkHandleAvailability({
      handle,
      birthDate,
      email,
    })

    if (
      bsky.dangerousIsType<ComAtprotoTempCheckHandleAvailability.ResultAvailable>(
        data.result,
        ComAtprotoTempCheckHandleAvailability.isResultAvailable,
      )
    ) {
      return {available: true} as const
    } else if (
      bsky.dangerousIsType<ComAtprotoTempCheckHandleAvailability.ResultUnavailable>(
        data.result,
        ComAtprotoTempCheckHandleAvailability.isResultUnavailable,
      )
    ) {
      return {
        available: false,
        suggestions: data.result.suggestions,
      } as const
    } else {
      throw new Error(
        `Unexpected result of \`checkHandleAvailability\`: ${JSON.stringify(data.result)}`,
      )
    }
  } else {
    // For non-bsky.social PDSes, resolve the handle against the PDS itself
    // since public.api.bsky.app won't know about handles on other PDSes
    const resolveService = serviceUrl || PUBLIC_BSKY_SERVICE
    const agent = new Agent(null, {service: resolveService})
    try {
      const res = await agent.resolveHandle({
        handle,
      })

      if (res.data.did) {
        return {available: false} as const
      }
    } catch {}
    return {available: true} as const
  }
}
