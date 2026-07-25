import {ethers} from 'ethers'

const RPC_URL = process.env.SEPOLIA_RPC_URL ?? 'https://sepolia.drpc.org'
const PK = process.env.REGISTRAR_PRIVATE_KEY
const MNEMONIC = process.env.REGISTRAR_MNEMONIC
const DERIVATION_INDEX = process.env.REGISTRAR_DERIVATION_INDEX ?? '0'

const REGISTRY = '0x89A853b224bAE596381269F61de9a637deE7Fe66'
const RESOLVER = '0x4D5aE401CA8aeecC44699bab1e0848ee45B6F2D3'
const ROLE_BITMAP =
  '0x1111111111111111111111111111111111111111111111111111111111111111'
// chaish.eth expires 2027-07-24 21:56 UTC; subname expiry pinned to parent.
const EXPIRY = 1816508677n

const abi = [
  'function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expires) returns (uint256 tokenId)',
  'event LabelRegistered(uint256 indexed tokenId, bytes32 indexed labelHash, string label, address owner, uint64 expiry, address sender)',
]

function parseArgs() {
  const args = process.argv.slice(2)
  let label
  let owner
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--label') label = args[++i]
    else if (args[i] === '--owner') owner = args[++i]
  }
  if (!label || !owner) {
    console.error(
      'Usage: node scripts/mint-subname.mjs --label <label> --owner <0x...>',
    )
    process.exit(1)
  }
  if (!/^[a-z0-9-]{3,20}$/.test(label)) {
    console.error(
      `Invalid label "${label}" — must match /^[a-z0-9-]{3,20}$/`,
    )
    process.exit(1)
  }
  if (!ethers.isAddress(owner)) {
    console.error(`Invalid owner address: ${owner}`)
    process.exit(1)
  }
  return {label, owner: ethers.getAddress(owner)}
}

function loadSigner(provider) {
  if (PK) {
    return new ethers.Wallet(PK, provider)
  }
  if (MNEMONIC) {
    const path = `m/44'/60'/0'/0/${DERIVATION_INDEX}`
    return ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, path).connect(
      provider,
    )
  }
  console.error(
    'set REGISTRAR_PRIVATE_KEY, or REGISTRAR_MNEMONIC (+ optional REGISTRAR_DERIVATION_INDEX)',
  )
  process.exit(1)
}

async function main() {
  const {label, owner} = parseArgs()

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const wallet = loadSigner(provider)
  const registry = new ethers.Contract(REGISTRY, abi, wallet)

  const name = `${label}.chaish.eth`
  console.log(`minting ${name}`)
  console.log(`  owner:    ${owner}`)
  console.log(`  registry: ${REGISTRY}`)
  console.log(`  resolver: ${RESOLVER}`)
  console.log(
    `  expiry:   ${EXPIRY} (${new Date(Number(EXPIRY) * 1000).toISOString()})`,
  )
  console.log(`  signer:   ${wallet.address}`)

  const balance = await provider.getBalance(wallet.address)
  console.log(`  balance:  ${ethers.formatEther(balance)} ETH`)
  if (balance === 0n) {
    console.error('signer has zero balance — fund it before minting')
    process.exit(1)
  }

  const tx = await registry.register(
    label,
    owner,
    ethers.ZeroAddress,
    RESOLVER,
    ROLE_BITMAP,
    EXPIRY,
  )
  console.log(`\ntx: https://sepolia.etherscan.io/tx/${tx.hash}`)

  const receipt = await tx.wait()
  console.log(`mined in block ${receipt.blockNumber}, gas ${receipt.gasUsed}`)

  const iface = new ethers.Interface(abi)
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log)
      if (parsed?.name === 'LabelRegistered') {
        console.log(`\n${name} minted`)
        console.log(`  tokenId:   ${parsed.args.tokenId}`)
        console.log(`  labelHash: ${parsed.args.labelHash}`)
        console.log(`  owner:     ${parsed.args.owner}`)
        return
      }
    } catch {}
  }
  console.warn('tx succeeded but LabelRegistered event not found')
}

main().catch(err => {
  if (err.reason) console.error(`revert: ${err.reason}`)
  else console.error(err)
  process.exit(1)
})
