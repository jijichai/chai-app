import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import * as persisted from '#/state/persisted'

type StateContext = persisted.Schema['signalUsername']
type SetContext = (v: persisted.Schema['signalUsername']) => void

const stateContext = createContext<StateContext>(
  persisted.defaults.signalUsername,
)
stateContext.displayName = 'SignalUsernameStateContext'
const setContext = createContext<SetContext>((_: string | undefined) => {})
setContext.displayName = 'SignalUsernameSetContext'

export function Provider({children}: {children: React.ReactNode}) {
  const [state, setState] = useState(persisted.get('signalUsername'))

  const setStateWrapped = useCallback(
    (signalUsername: persisted.Schema['signalUsername']) => {
      setState(signalUsername)
      persisted.write('signalUsername', signalUsername)
    },
    [setState],
  )

  useEffect(() => {
    return persisted.onUpdate('signalUsername', nextSignalUsername => {
      setState(nextSignalUsername)
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

export const useSignalUsername = () => useContext(stateContext)
export const useSetSignalUsername = () => useContext(setContext)
