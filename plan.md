# Chai × ENSv2 — Subdomain MVP

**Scope:** when a user signs up in chai-app, mint them a subname under `chaish.eth` on Sepolia. 

This is the milestone-1 slice of the fuller [Chai × ENSv2 plan](#see-also); everything else (Privy custody, ATProto resolver, PLC wiring, provenance UI, trust-model hardening) is explicit non-goal here.

---

## Definition of done

- User completes signup in chai-app
- A subname `<label>.chaish.eth` is minted onchain from Chai's registrar signer
- Owner is a stub address (Chai-controlled or deterministic placeholder — see step 5)
- Sepolia explorer shows the new subname under `chaish.eth`
- End-to-end flow runs cleanly five times with fresh labels

Explicitly out of scope for MVP:

- Privy wallet integration (owner is a stub)
- ENS resolver in `atproto` / handle resolution changes
- PLC `alsoKnownAs` / `updateHandle` — user's ATProto handle stays as `<label>.chai.sh`
- Bidirectional verification
- Provenance UI
- Role renunciation / trust-model hardening
- Reserved-name blocklist beyond a trivial list
- ENSIP-15 normalisation (naive regex only)
- Any client-side wallet code in chai-app

---

## Current onchain state (Sepolia, 2026-07-25)

| Item | Value |
|---|---|
| Parent name | `chaish.eth` |
| Chain | Sepolia (11155111) |
| Root registry | `0xc960…9aB8` |
| `.eth` parent registry | `0xDEDB…8B67` |
| **Permissioned Registry** (chaish subregistry) | `0x89A853b224bAE596381269F61de9a637deE7Fe66` |
| **Permissioned Resolver** (canonical audited) | `0x4D5aE401CA8aeecC44699bab1e0848ee45B6F2D3` |
| **VerifiableFactory** (used to deploy the subregistry) | `0xD2a632D8a8b67c2c4398c255CbD7aF8dd7236198` |
| Owner / registrar signer | `0x34D0AaAa9e71957Ce6e6BbA5315EaACfF804F8fd` |
| Subregistry deploy tx | `0xa7702220dd87bcce0b773ccf059ab246c1839c6b62922565b7a6dad6b8bd795c` |
| chaish.eth registration tx | `0x23d1d6fa50256c7802d65582d4aae3dd897dfadc382df1b295a9876523334ce9` |
| chaish.eth expiry | 2027-07-24 |
| Registry config | **Fully Controlled** — owner holds all roles including Admin+Manager on Registrar, Renew, Set Subregistry, Upgrade, Unregister, Can Transfer |

**Trust-model debt:** Fully Controlled means Chai can transfer or unregister any subname. This is fine for MVP but invalidates any "credible exit" claim. Address before shipping trust-model messaging.

**Do not persist token IDs.** They regenerate on role changes. Reference names by label / labelhash only.

---

## Steps

### 1. Hand-mint checkpoint (do this first, no code)

- Go to ENS Explorer → chaish.eth → Subnames → Create subname
- Mint `test.chaish.eth` to any address (your own is fine)
- Confirm it appears under Subnames and resolves via ENS Explorer search
- **Nothing else starts until this passes.** If this fails, the code path won't work either.

### 2. Signer + RPC infrastructure

- Sepolia RPC: Alchemy / Infura / public endpoint (URL in env)
- Load `0x34D0…F8fd` private key from env (never committed — audit `test.env` and `.env*`)
- Fund the wallet with Sepolia ETH. Overfund now — faucets rate-limit and running dry mid-demo kills it.

### 3. Mint function

Using viem:

```ts
const hash = await walletClient.writeContract({
  address: '0x89A853b224bAE596381269F61de9a637deE7Fe66', // permissioned registry
  abi: permissionedRegistryAbi,
  functionName: 'register',
  args: [
    label,                                                     // "alice"
    ownerAddress,                                              // stub — see step 5
    '0x0000000000000000000000000000000000000000',              // no sub-subregistry
    '0x4D5aE401CA8aeecC44699bab1e0848ee45B6F2D3',              // resolver
    REGISTRATION_ROLE_BITMAP,                                  // roles granted to owner
    BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 3600),   // 1 year
  ],
})
```

Return `{ txHash, name: `${label}.chaish.eth` }`. Surface `LabelRegistered` on success. On revert (name taken, bad label), throw a typed error.

**TODO before coding:** pull the ABI from the deployed contract on Sepolia Etherscan and stash it. Confirm the exact function signature matches what the tutorial documented; ENSv2 is alpha and interfaces can drift.

### 4. Where the mint runs

Three options; pick before wiring:

| Option | Pros | Cons |
|---|---|---|
| **chai-app client-side** after signup succeeds | Fastest to demo; no other repo touched | Registrar key in browser/env = only defensible for local demo |
| **PDS server-side** after `createAccount` | Correct architecture; matches fuller plan | Requires PDS changes; that's where the "real work" lives per the full plan |
| **Standalone service** polling for new accounts or webhook-triggered | Isolates registrar key; portable | Extra moving part |

**Recommended for MVP:** client-side in chai-app with `.env`-loaded key, running locally. Move to PDS/service before any public deploy.

### 5. Owner address (stub)

Real solution is a Privy pregenerated EOA per user. For MVP, cheat:

- **Simplest:** single Chai-controlled wallet, all subnames minted to it
- **Slightly better:** deterministic per-user stub — `('0x' + keccak256(did).slice(-40))` — nobody controls the key, but each user has a unique address

Do not claim custody / self-sovereignty in the demo until Privy is wired. This is the single biggest lie the MVP could tell.

### 6. Label handling

- **Validation:** `/^[a-z0-9-]{3,20}$/` (naive; skip ENSIP-15 for MVP)
- **Reserved-name blocklist:** minimal — `admin`, `support`, `mod`, `chai`, `root`, `system`
- **Collision:** if `register()` reverts because label exists, surface user-visible error. Do not silently append suffixes.
- **Source:** for MVP, derive label from the ATProto handle prefix (e.g. `alice` from `alice.chai.sh`), or prompt user for a name explicitly at signup.

### 7. Wire into signup

- Find where chai-app calls `com.atproto.server.createAccount`
- After success, extract label + call mint function
- Mint failure should **not** block signup — log it, surface a soft warning, leave user with their `.chai.sh` handle
- Do not await mint before returning signup — kick off async, poll or listen for confirmation

### 8. Verification pass

- Fresh signup in chai-app
- Watch mint tx in devtools / logs
- Confirm subname on Sepolia explorer
- Confirm `<label>.chaish.eth` resolves via `viem`'s ENS client
- Repeat 5 times with different labels — flush out edge cases before demo

---

## Optional stretch (only after 1–8 pass)

- Handle badge in chai-app profile: show `.chaish.eth` name if minted, `.chai.sh` otherwise. This is the only chai-app UI work in the fuller plan.
- Set `atproto` text record on the subname pointing to the user's DID. Cheap; unlocks the resolver work later.

---

## Risks

| Risk | Mitigation |
|---|---|
| Registrar wallet drained | Overfund with Sepolia ETH now, monitor |
| Owner key `0x34D0…` lost or leaked | Seed backed up off-machine before any further work |
| ENSv2 alpha contract drift | Pin ABIs, watch for redeployments |
| RPC rate limits at demo time | Paid tier if any real traffic; local caching otherwise |
| Half-registered accounts (signup succeeded, mint failed) | Log + retry queue; degrade to `.chai.sh` handle |
| Fully Controlled registry contradicts trust claims | Do not make trust claims in MVP demo — save for post-hardening |

---

## Open questions

- Does the wizard-deployed UserRegistry allow renouncing the Upgrade role, or is the proxy admin baked in? (Blocks trust-model hardening later, not MVP.)
- What's the `REGISTRATION_ROLE_BITMAP` value the ENS Explorer's mint UI uses? Copy it for consistency.
- ATProto handle → ENS label mapping: derive from handle, or prompt user? Product decision.

---

## See also

- Full Chai × ENSv2 plan (four repos, full trust model, Privy custody, ATProto resolver) — this MVP is milestone 1 of that
- ENSv2 docs: https://pr-543.docs-bao.pages.dev/contracts/ensv2/overview/
- ENS Explorer: https://explorer.ens.dev
