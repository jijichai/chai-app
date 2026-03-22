import {useAppKit, useAppKitAccount} from '@reown/appkit/react'

export function useWalletConnect() {
  const {open} = useAppKit()
  const {address, isConnected} = useAppKitAccount()

  return {
    openWalletModal: () => open(),
    walletAddress: address,
    isWalletConnected: isConnected,
  }
}
