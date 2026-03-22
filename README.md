# Chai

Self-custodial social networking on AT Protocol with ENS handles and on-chain identity.

## What is Chai

Chai is a fork of [Bluesky](https://github.com/bluesky-social/social-app) that brings ENS names and verifiable identity to decentralized social. Use your `.eth` name as your social handle, verify your humanity with a passport scan via Self Protocol, and mint a soulbound NFT on Celo as cryptographic proof — all while your data lives on a Personal Data Server you control.

## Repositories

Chai spans multiple repos that work together:

| Repo | What it does |
|------|-------------|
| [**chai-app**](https://github.com/jijichai/chai-app) (this repo) | React Native client for iOS, Android, and Web — ENS handle verification, Self Agent ID, wallet connect via Reown AppKit |
| [**pds**](https://github.com/jijichai/pds) | Chai PDS — fork of bluesky-social/pds with ENS (.eth) handle resolution |
| [**atproto**](https://github.com/jijichai/atproto) | Fork of bluesky-social/atproto with ENS handle support in the identity layer |
| [**atproto-identity**](https://github.com/jijichai/atproto-identity) | Custom `@atproto/identity` package with an ENS resolver for mapping .eth names to DIDs |
| [**pdsls**](https://github.com/jijichai/pdsls) | Chai Explorer — AT Protocol data explorer with ENS handle verification |

## How It Works

1. **Sign up** on a Chai PDS (`chai.sh`) — your data is stored on a server you control
2. **Verify an ENS name** as your handle — the PDS resolves your `.eth` name and stores it as a `sh.chai.n.ens` record in your AT Protocol repository
3. **Verify your identity** (optional) — scan your passport via [Self Protocol](https://self.xyz) to prove you're human
4. **Mint a soulbound NFT** on Celo — your Self Agent ID verification is stored on-chain and linked to your AT Protocol DID via a `sh.chai.n.agent` record
5. **Register in the ERC-8004 Identity Registry** (optional) — publish your verified agent identity on-chain
6. **Use the network** — post, follow, and interact across the AT Protocol network with your `.eth` handle and vanity profile URL (`chai.sh/yourname.eth`)

## Key Features

- **ENS names as social handles** — resolve and verify `.eth` names as AT Protocol handles
- **Self Agent ID** — passport NFC verification via Self Protocol, minted as a soulbound NFT on Celo
- **ERC-8004 Identity Registry** — optional on-chain registration of verified agent identity
- **Wallet connection** — Reown AppKit integration supporting Celo Mainnet and Sepolia
- **Vanity profile URLs** — `chai.sh/name.eth` instead of `chai.sh/profile/did:plc:...`
- **Multiple agents per account** — verify and store multiple Self Agent IDs
- **Custom AT Protocol records** — `sh.chai.n.ens` for ENS names, `sh.chai.n.agent` for agent verification data

## Tech Stack

- **Client:** React Native, Expo, TypeScript
- **Protocol:** AT Protocol (atproto)
- **Identity:** ENS, Self Protocol, ERC-8004
- **Chain:** Celo (Mainnet & Sepolia)
- **Wallet:** Reown AppKit
- **Infra:** Cloudflare, custom PDS

## Development

```bash
yarn install       # Install dependencies
yarn start         # Start Expo dev server
yarn web           # Start web version
yarn ios           # Run on iOS
yarn android       # Run on Android
```

See [docs/build.md](./docs/build.md) for full build instructions.

## Credits

Forked from [Bluesky Social](https://github.com/bluesky-social/social-app).

## License

MIT — see [LICENSE](./LICENSE).
