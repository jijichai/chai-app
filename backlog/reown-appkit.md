# Reown AppKit — Wallet Integration for Self Agent ID v2

## Overview

Reown AppKit (formerly WalletConnect AppKit) provides embedded wallet creation and multi-wallet connectivity. It would enable users to own their agent wallet, register with Self using `mode: "linked"`, and write their AT Protocol DID on-chain via ERC-8004 `setMetadata`.

## Why

Currently Self Agent ID uses `wallet-free` mode where Self generates and controls the agent's private key. This means:
- We can't sign on-chain transactions as the agent (no private key access)
- The DID can't be written on-chain via `setMetadata`
- The DID↔agent link only exists in the PDS record (`sh.chai.n.agent`)

With AppKit, the user owns the wallet, enabling on-chain DID storage.

## Key Features

- **Embedded wallet creation** — users sign in with email OTP, Google, Apple, X, GitHub, Discord, Facebook, or Farcaster. AppKit creates a non-custodial wallet automatically.
- **600+ wallet connections** — MetaMask, Coinbase, etc. for users who already have wallets
- **SIWX (Sign In With X)** — multichain authentication, supported on React Native
- **Smart accounts** — account abstraction for gasless transactions (user doesn't need CELO for gas)
- **React Native + Expo** — fully supported

## Packages

```bash
npx expo install @reown/appkit-react-native @reown/appkit-ethers-react-native \
  @react-native-async-storage/async-storage react-native-get-random-values \
  react-native-svg @react-native-community/netinfo @walletconnect/react-native-compat \
  react-native-safe-area-context expo-application
```

## Integration Flow

```
User taps "Verify with Self Protocol"
  → AppKit modal opens
  → User signs in (email/Google/existing wallet)
  → Embedded wallet created, address known
  → POST /api/agent/register { mode: "linked", wallet: address, network: "testnet" }
  → QR code → Self app → passport NFC scan
  → Soulbound NFT minted to user's wallet
  → User signs setMetadata tx: setMetadata(agentId, "did", "did:plc:...")
  → DID is now on-chain, fully verifiable
```

## Configuration Example

```typescript
import '@walletconnect/react-native-compat'
import { createAppKit } from '@reown/appkit-react-native'
import { EthersAdapter } from '@reown/appkit-ethers-react-native'
import { celoAlfajores, celo } from 'viem/chains'

const projectId = 'YOUR_REOWN_PROJECT_ID' // from cloud.reown.com
const ethersAdapter = new EthersAdapter()

export const appKit = createAppKit({
  projectId,
  networks: [celoAlfajores, celo],
  adapters: [ethersAdapter],
  features: {
    email: true,
    socials: ['google', 'apple', 'github'],
  },
  metadata: {
    name: 'Chai',
    description: 'Chai Social',
    url: 'https://chai.sh',
    icons: ['https://chai.sh/icon.png'],
    redirect: {
      native: 'chai://',
    },
  },
})
```

## Hooks

```typescript
import { useAppKit, useAccount } from '@reown/appkit-react-native'

const { open, disconnect } = useAppKit()
const { address, isConnected, chainId } = useAccount()
```

## ERC-8004 setMetadata

After registration, call `setMetadata` on the registry contract:

```typescript
// Registry contract on Celo Sepolia
const REGISTRY = '0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379'

const data = encodeFunctionData({
  abi: registryABI,
  functionName: 'setMetadata',
  args: [agentId, 'did', encodePacked(['string'], [did])],
})

await walletClient.sendTransaction({
  to: REGISTRY,
  data,
})
```

## Celo Support

Celo is an EVM L2 — AppKit supports it via viem chain configs (`celo`, `celoAlfajores` from `viem/chains`). Not explicitly listed in Reown docs but should work as any EVM chain.

## References

- Docs: https://docs.reown.com/appkit/overview
- React Native install: https://docs.reown.com/appkit/react-native/core/installation
- Email/social login: https://docs.reown.com/appkit/react/core/socials
- Smart accounts: https://docs.reown.com/appkit/react-native/core/smart-accounts
- LLM docs: https://docs.reown.com/llms.txt
- Celo agent skill: `evm-wallet-integration` (mentions AppKit)
