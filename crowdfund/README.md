# Design Exercises

1. Smart contracts have a hard limit of 24kb. Crowdfundr hands out an NFT to everyone who contributes. However, consider how Kickstarter has multiple contribution tiers. How would you design your contract to support this, without creating three separate NFT contracts?

Cool, so we want to give people different NFTs based on how much they contribute.

Since the ERC721 contract only really maps token IDs to addresses, there isn't data to be stored there. This is for the best, since data stored on the blockchain is very expensive.

The standard way to do this would be to add a URI for the NFT project and store the metadata of the NFT there. We would specify (probably in JSON) the tier:
{
    tier: 1 | 2 | 3
}

When minting in the Project contract, we would have an if statement:
if (msg.value > tier1Min) {
    // tier 3
} else if (msg.value > tier2Min) {
    // tier 2
} else {
    // tier 1
}

We'd want to incldude a createWithTier(uint goal, uint[] tiers) function in our ProjectFactory which would be passed the different tier minimums. This would create a project with tiers. We could either alter the current Project contract to dynamically try assigning tiers, or create a slightly different contract (main difference being the contribute() method). Would also want some tests to make sure to add tests to make sure the uints in the tiers array are ordered.

There's also an option to specify tiers in the contract (the question doesn't say the NFTs need to be different); We could have three mappings (address => bool), one for each tier, which we add people to each time somebody mints.
if (contributors[msg.sender] > tier1Min) {
    tier1Contributors[msg.sender] = true
}

This solution is suboptimal because it's storing data on the blockchain which could be inferred outside of the blockchain.

We could also encode the IDs of the NFTs in such a way to specify the contributor's tier (the ID could be a hash, and we change the leading bit, for example). This solution also isn't very good, I'd much prefer sequential IDs on the NFTs.




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
npx prettier '**/*.{json,sol,md,ts}' --check
npx prettier '**/*.{json,sol,md,ts}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

# Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/sample-script.ts
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

# Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).
