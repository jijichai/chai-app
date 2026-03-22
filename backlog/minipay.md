# MiniPay — Celo Wallet Integration for Self Agent ID v2

## Overview

MiniPay is a stablecoin wallet built into the Opera Mini Android browser and available as a standalone app on iOS/Android. 10M+ activated addresses, primarily in the Global South. It's Celo-native and can sign arbitrary contract calls, including ERC-8004 `setMetadata`.

## Why

MiniPay users already have a Celo wallet. If they access chai.sh from within MiniPay's browser (or Opera Mini), we can detect it, use their wallet for Self registration with `mode: "linked"`, and write the DID on-chain — all without any additional wallet setup.

## How It Works

MiniPay injects `window.ethereum` (with `isMiniPay` flag) into web apps running inside it. Standard EVM wallet patterns work:

```typescript
// Detect MiniPay
if (window.ethereum && window.ethereum.isMiniPay) {
  // User is in MiniPay
}

// Connect wallet
const [address] = await window.ethereum.request({
  method: 'eth_requestAccounts',
  params: [],
})

// Create viem wallet client
import { createWalletClient, custom } from 'viem'
import { celoSepolia } from 'viem/chains'

const walletClient = createWalletClient({
  chain: celoSepolia,
  transport: custom(window.ethereum),
})

// Sign arbitrary contract calls (e.g., setMetadata)
import { encodeFunctionData } from 'viem'

const data = encodeFunctionData({
  abi: registryABI,
  functionName: 'setMetadata',
  args: [agentId, 'did', encodePacked(['string'], [did])],
})

await walletClient.sendTransaction({ to: REGISTRY_ADDRESS, data })
```

## Integration Flow for Chai

```
User opens chai.sh in MiniPay/Opera Mini browser
  → Detect window.ethereum.isMiniPay
  → Show "Connect MiniPay Wallet" option on Self Agent ID screen
  → eth_requestAccounts → get wallet address
  → POST /api/agent/register { mode: "linked", wallet: address, network: "testnet" }
  → QR code → Self app → passport NFC scan
  → Soulbound NFT minted to user's MiniPay wallet
  → Sign setMetadata tx to write DID on-chain
  → Done: fully on-chain DID↔agent link
```

## Limitations

- **Web only** — MiniPay is a browser-based wallet, not a React Native SDK. Apps run *inside* MiniPay as "Mini Apps". No RN integration.
- **Android-first** — Opera Mini is primarily Android. iOS standalone app exists but smaller user base.
- **Not embeddable** — unlike AppKit, you can't embed MiniPay into your app. Users must open chai.sh from within MiniPay's browser.

## Comparison with Reown AppKit

| | MiniPay | Reown AppKit |
|---|---|---|
| Wallet creation | Already have one | Creates via email/social |
| Integration model | App runs inside MiniPay | SDK embedded in our app |
| Celo support | Native | Via viem chain config |
| Contract calls | Yes (injected provider) | Yes (wagmi/ethers) |
| React Native | No | Yes |
| User base | 10M+ (Global South) | Any wallet user |
| Best for | MiniPay users on Opera | General users, any platform |

## Recommendation

Support MiniPay as an **optional detection** — if the user is in MiniPay's browser, offer wallet connection. Otherwise fall back to AppKit for embedded wallet creation. This covers both user bases.

## References

- Celo docs: https://docs.celo.org/build-on-celo/build-on-minipay/overview
- MiniPay docs: https://docs.minipay.xyz/
- Code library: https://docs.celo.org/build-on-celo/build-on-minipay/code-library
- Deeplinks: https://docs.celo.org/build-on-celo/build-on-minipay/deeplinks
- Celo agent skill: `minipay-integration`
- Setup requires: `@celo/abis`, `@celo/identity`, `viem@2`
