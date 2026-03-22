// Native stub — wallet connection is web-only for now.
export function useWalletConnect() {
  return {
    openWalletModal: () => {},
    walletAddress: undefined as string | undefined,
    isWalletConnected: false,
    walletProvider: null as unknown,
  }
}
