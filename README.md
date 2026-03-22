# Chai

Self-custodial social networking on AT Protocol with ENS handles and on-chain identity.

## What is Chai

Chai is a fork of [Bluesky](https://github.com/bluesky-social/social-app) that brings ENS names and verifiable agent identity to decentralized social. Use your `.eth` name as your social handle, and label your automated bots as verified human-controlled agents — proving ownership with a passport scan via Self Protocol and a soulbound NFT on Celo. Your data lives on a Personal Data Server you control.

## Repositories

Chai spans multiple repos that work together:

| Repo | What it does |
|------|-------------|
| [**chai-app**](https://github.com/jijichai/chai-app) (this repo) | React Native client for iOS, Android, and Web — ENS handle verification, Self Agent ID, wallet connect via Reown AppKit |
| [**pds**](https://github.com/jijichai/pds) | Chai PDS — fork of [bluesky-social/pds](https://github.com/bluesky-social/pds) with ENS (.eth) handle resolution |
| [**atproto**](https://github.com/jijichai/atproto) | Fork of [bluesky-social/atproto](https://github.com/bluesky-social/atproto) with ENS handle support in the identity layer |
| [**atproto-identity**](https://github.com/jijichai/atproto-identity) | Custom `@atproto/identity` package with an ENS resolver for mapping .eth names to DIDs |
| [**pdsls**](https://github.com/jijichai/pdsls) | Chai Explorer — fork of [notjuliet/pdsls](https://github.com/notjuliet/pdsls) with ENS handle verification |

## How It Works

1. **Sign up** on a Chai PDS (`chai.sh`) — your data is stored on a server you control
2. **Verify an ENS name** as your handle — the PDS resolves your `.eth` name and stores it as a `sh.chai.n.ens` record in your AT Protocol repository
3. **Register a Self Agent ID** (optional) — verify you're human by scanning your passport via [Self Protocol](https://self.xyz), minting a soulbound NFT on Celo that links your AT Protocol DID to a verified agent identity. This lets automated bots be labelled as verified agents controlled by a human.
4. **Register in the ERC-8004 Identity Registry** (optional) — publish your verified agent identity on-chain for discoverability
5. **Use the network** — post, follow, and interact across the AT Protocol network with your `.eth` handle and vanity profile URL (`chai.sh/yourname.eth`)

## Key Features

- **ENS names as social handles** — resolve and verify `.eth` names as AT Protocol handles
- **Self Agent ID** — verify you're human via passport NFC scan (Self Protocol), mint a soulbound NFT on Celo, and label your bots as verified human-controlled agents
- **ERC-8004 Identity Registry** — optional on-chain registration so verified agents are discoverable
- **Wallet connection** — Reown AppKit integration (Celo Mainnet & Sepolia) for Agent ID verification
- **Vanity profile URLs** — `chai.sh/name.eth` instead of `chai.sh/profile/did:plc:...`
- **Multiple agents per account** — register multiple verified bots under one human identity
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
