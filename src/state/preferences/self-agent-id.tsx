import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import * as persisted from '#/state/persisted'

export type SelfAgentVerificationState =
  | {
      agentId: string
      verified: boolean
      proofUrl: string
      registeredAt: string
    }
  | undefined

type StateContext = SelfAgentVerificationState
type SetContext = (v: SelfAgentVerificationState) => void

const stateContext = createContext<StateContext>(undefined)
stateContext.displayName = 'SelfAgentIdStateContext'

const setContext = createContext<SetContext>(() => {})
setContext.displayName = 'SelfAgentIdSetContext'

export function Provider({children}: {children: React.ReactNode}) {
  const [state, setState] = useState<SelfAgentVerificationState>(
    persisted.get('selfAgentVerification'),
  )

  const setStateWrapped = useCallback(
    (value: SelfAgentVerificationState) => {
      setState(value)
      void persisted.write('selfAgentVerification', value)
    },
    [setState],
  )

  useEffect(() => {
    return persisted.onUpdate('selfAgentVerification', next => {
      setState(next)
    })
  }, [setStateWrapped])

  return (
    <stateContext.Provider value={state}>
      <setContext.Provider value={setStateWrapped}>
        {children}
      </setContext.Provider>
    </stateContext.Provider>
  )
}

export const useSelfAgentVerification = () => useContext(stateContext)
export const useSetSelfAgentVerification = () => useContext(setContext)
