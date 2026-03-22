import '@walletconnect/react-native-compat'

import AsyncStorage from '@react-native-async-storage/async-storage'
import {EthersAdapter} from '@reown/appkit-ethers-react-native'
import {type AppKitNetwork, type Storage} from '@reown/appkit-react-native'
import {createAppKit} from '@reown/appkit-react-native'

// Celo Sepolia testnet (for development)
const celoSepolia: AppKitNetwork = {
  id: 44787,
  name: 'Celo Alfajores',
  chainNamespace: 'eip155',
  caipNetworkId: 'eip155:44787',
  nativeCurrency: {name: 'CELO', symbol: 'CELO', decimals: 18},
  rpcUrls: {
    default: {http: ['https://alfajores-forno.celo-testnet.org']},
  },
  blockExplorers: {
    default: {name: 'Celoscan', url: 'https://sepolia.celoscan.io'},
  },
  testnet: true,
}

// AsyncStorage-backed storage for AppKit
const appKitStorage: Storage = {
  getKeys: async () => {
    const keys = await AsyncStorage.getAllKeys()
    return keys.filter(
      k => k.startsWith('@appkit/') || k.startsWith('WALLETCONNECT'),
    )
  },
  getEntries: async () => {
    const keys = await appKitStorage.getKeys()
    const pairs = await AsyncStorage.multiGet(keys)
    return pairs.map(([k, v]) => [k, v ? JSON.parse(v) : undefined])
  },
  getItem: async (key: string) => {
    const value = await AsyncStorage.getItem(key)
    return value ? JSON.parse(value) : undefined
  },
  setItem: async (key: string, value: unknown) => {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key)
  },
}

const ethersAdapter = new EthersAdapter()

// Project ID from https://cloud.reown.com/
const projectId = process.env.EXPO_PUBLIC_REOWN_PROJECT_ID ?? ''

export const appKit = createAppKit({
  projectId,
  networks: [celoSepolia],
  defaultNetwork: celoSepolia,
  adapters: [ethersAdapter],
  storage: appKitStorage,
  metadata: {
    name: 'Chai',
    description: 'Chai Social',
    url: 'https://chai.sh',
    icons: ['https://chai.sh/icon.png'],
    redirect: {native: 'chai://'},
  },
  features: {
    socials: false,
  },
})
