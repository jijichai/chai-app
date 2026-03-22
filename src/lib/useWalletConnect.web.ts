import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from '@reown/appkit/react'

export function useWalletConnect() {
  const {open} = useAppKit()
  const {address, isConnected} = useAppKitAccount()
  const {walletProvider} = useAppKitProvider('eip155')

  return {
    openWalletModal: () => open(),
    walletAddress: address,
    isWalletConnected: isConnected,
    walletProvider,
  }
}
