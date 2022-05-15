# Design Exercises:

Consider and write down the positive and negative tradeoffs of the following configurations for a multisig wallet. In particular, consider how each configuration handles the common failure modes of wallet security.
1-of-N:
+ Very quick to sent transactions from the account
+ Somebody will probably always be online
+ Very hard to lose all keys
- Anybody can "go rogue" and take control of the account
- Anybody who has their keys taken loses access to the whole wallet

This use case is not very good, since it leaves the attack vector so much larger. Could be useful if one key is doing to be stored cold and never touched unless the first key is lost

M-of-N (where M: such that 1 < M < N):
+ Security of the group, multiple people need to sign off on anything
+ One rogue actor cannot control the wallet
+ An attacker must gain access to multiple accounts
- Decisions made slower, cannot act quickly unless M people are online and agree
- If M members decide to team up, can effectively control everything

This is the best use case of the multisig wallet. 

N-of-N:
+ Totally secure, everybody needs to be on board
+ No amount of collusion can make the keys all vote in one direction unless they agree
+ Attack surface is large
- If one key is lost or compromised, entire wallet is lost
- Cannot adapt to situations at all

This use case is horrible. Never reccommend. Any single wallet being lost is a single point of failure

# Addresses on Rinkeby

Gnosis: https://gnosis-safe.io/app/rin:0x2Ba31969190FC59B674d054CA112230EeC06E09E/home

Deployer wallet: 0xc17a940D94F549a9A236E13602d25e2eb6EFEac1
spc: 0xEbA2b0C242d51f036A888474c2f0052Ab05331e8
pool: 0xd3bB99Ca4b79e3CB46b2213e5d1EF352D7f32889
router: 0x10066cd4724d1Cbe061F7573424fdcbDe12D4e2A
ico: 0xe5643B3291f483F5114091ccbF93CE96B86E2c9F

# Design Exercise

To add extra rewards to liquidity providers, we'd want to first make sure the amount of time and quantity of liquidity are recorded for the user. This can be accomplished in a few ways, I'll go through one on-chain, and one off-chain:
1. On-chain:
Create two mappings, address => pendingRewards, and address => Struct {uint timestampOfLastTransaction, uint liquidityAtLastTransaction}

Then, whenever a user either removes some liquidity, or claims rewards, pendingRewards are distributed and reset to 0, timestampOfLastTransaction set to current block, and liquidityAtLastTransaction set to current liquidity of the address. This has some gas costs attached, but isn't too bad.

2. Off-chain:
We could simply store events emitted by the blockchain, and poll an oracle offchain which tallies user's liquidity and time providing liquidity. Then, when we need to get information about user's liquidity history, simply poll an oracle onchain to get the data

Of the two solutions, I like the on-chain solution because it doesn't cost too much gas. It also keeps information paired together, and lets people audit all aspects of the code in one place.

Then, we would need to add the distribution mechanism. We could create another ERC20 token which the router contract can interact with and mint for free to users. Based on time-weighted liquidity amounts by liquidity providers, we would have accurate numbers for how many tokens to distribute, based on some distribution schedule.



# Advanced Sample Hardhat Project

This project demonstrates an advanced Hardhat use case, integrating other tools commonly used alongside Hardhat in the ecosystem.

The project comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts. It also comes with a variety of other tools, preconfigured to work with the project code.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.ts
TS_NODE_FILES=true npx ts-node scripts/deploy.ts
npx eslint '**/*.{js,ts}'
npx eslint '**/*.{js,ts}' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

# Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.ts
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

# Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).
