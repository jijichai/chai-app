// Web-only AppKit configuration for wallet connection.
// On native, wallet connection is not yet supported.

import {type AppKitNetwork} from '@reown/appkit/networks'
import {createAppKit} from '@reown/appkit/react'
import {EthersAdapter} from '@reown/appkit-adapter-ethers'

// Celo Mainnet
const celoMainnet: AppKitNetwork = {
  id: 42220,
  name: 'Celo',
  nativeCurrency: {name: 'CELO', symbol: 'CELO', decimals: 18},
  rpcUrls: {
    default: {http: ['https://forno.celo.org']},
  },
  blockExplorers: {
    default: {name: 'Celoscan', url: 'https://celoscan.io'},
  },
  testnet: false,
}

// Celo Sepolia testnet — Self Agent ID NFTs are minted here
const celoSepolia: AppKitNetwork = {
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: {name: 'CELO', symbol: 'CELO', decimals: 18},
  rpcUrls: {
    default: {http: ['https://forno.celo-sepolia.celo-testnet.org']},
  },
  blockExplorers: {
    default: {name: 'Celoscan', url: 'https://sepolia.celoscan.io'},
  },
  testnet: true,
}

// Project ID from https://cloud.reown.com/
const projectId = '2dfc8c9a72342a4ca8aecb374f9595bd'

export const appKit = createAppKit({
  projectId,
  networks: [celoSepolia, celoMainnet],
  defaultNetwork: celoSepolia,
  adapters: [new EthersAdapter()],
  metadata: {
    name: 'Chai',
    description: 'Chai Social',
    url: 'https://chai.sh',
    icons: ['https://chai.sh/icon.png'],
  },
  features: {
    socials: false,
    swaps: false,
    onramp: false,
  },
})
