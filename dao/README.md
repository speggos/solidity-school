# Voting system description

The voting system is fairly simple, fulfiling specs with little extra functionality added
- Each account can only buy a single membership for 1ETH
- Only members can create proposals
- Members can vote for or against a proposal
- Proposals can only be voted on for 7 days
- When a proposal has sufficient votes (25% of total members have voted (calculated at runtime of execute) with more For votes than Against), anybody can execute the proposal
- An executed proposal runs call() with the predefined targets, values, and calldata, on code of arbitrary length. All calls must succeed, or the entire transaction is reverted
- Proposals must exist for at least 4 days before they can be executed. This is to prevent flashloan-style execution of arbitrary malicious code. Further protection is needed from these types of attacks, but this would at least give members time to rally the troops and buy more votes.

Some tradeoffs of this strategy:
- Accounts only being able to buy a single membership makes this DAO useful for a very small percentage of users. Most users will want to invest more or less than 1ETH, and change their investment over time
- Also, with gas fees, multiple iterations of voting can add up to a substantial percent of a user's initial investment
- However, with a member per account only, the DAO is whale-reistant (whales may still buy multiple accounts, a problem with all daos)
- Members voting for/against proposals isn't needed - only "for" are truly required. However, DAO members may want to voice dissatisfaction towards a proposal
- Only members being able to create proposals is a defence against spam by non-members. A 1ETH membership barrier isn't very high, but it's something. An implementation allowing higher ETH contributions could institute an ETH minimum (changeable) to create a proposal
- Proposals having a 7 day limit prevent attacks where a proposal with a large value may not pass initially, but after the NFT price decreases substantially a member buys the NFT for a low price and gets the vote to pass
- There is the potential for a proposal to contain malicious code (selfdestruct, for example). I leave it to members to not vote for these
- Anybody can execute a successful proposal. This is intentional - if somebody is nice enough to pay for the gas, let them. I could implement a reward system for passing proposals, in which case I would probably limit it to members only
- I could allow users to change their vote, however since I don't store who voted in which direction, I'd need to write more data to the blockchain (or do some funky encoding) each vote, increasing the storage calls and therefore the gas costs for everybody.
- If many members become inactive, it may become impossible to get anything passed. Some inactivity function could exist to remove members not participating, or reducing their voting power / influence over quorum
- Since users at present cannot withdraw funds, a flashloan style attack is not possible
- As stated, the 4 day wait period would stop from immediate flashloan style attacks, at the expense of being able to quickly purchase NFTs. Honestly, this is not the best solution. We could also implement a sort of weighting for older members of the DAO to have more say in it, but that would just kick the can down the road. If I had more time, I'd implement the veToken system


# Design Exercises

- Per project specs there is no vote delegation; it's not possible for Alice to delegate her voting power to Bob, so that when Bob votes he does so with the voting power of both himself and Alice in a single transaction. This means for someone's vote to count, that person must sign and broadcast their own transaction every time. How would you design your contract to allow for non-transitive vote delegation?

We could create non-transitive voting power by a linked list of sorts, where my member mapping mapped to a struct instead:
```
mapping (address => Member)members

struct Member {
    delegatedTo: address,
    delegatedBy: address[],
    votingPower: uint,
    ...
}

function delegateTo(address) {
    // Set address to your delegatedTo value. Add your address to the other person's delegatedBy address, and adds to their voting power
    // Does not allow people with delegatedBy nonempty to delegate. Does not allow people with delegatedTo to be delegated to
}
```
There is a griefing attack where somebody can delegate to people which stops them from delegating to somebody else.

We could alsot just let people delegating to somebody else still vote, which lets them use the power of all the people delegating into them, but still lets their votes be used by somebody else. This is also a strange setup, since they're delegating to somebody else for a reason.


- What are some problems with implementing transitive vote delegation on-chain? (Transitive means: If A delegates to B, and B delegates to C, then C gains voting power from both A and B, while B has no voting power).

There are potentials for loops in this scenario, and it would be NP-hard to verify there's no loops when delegating (gas inefficient). A loop would be bad but not breaking - anybody in the could vote with the power of the whole loop
It allows a griefing attack where people who trust somebody else to vote for them, isntead delegate to somebody untrusted, where the original person has no input in the vetting of the new person delegated to
This leads to a greater centralization of voting power, which is generally a bad thing





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
