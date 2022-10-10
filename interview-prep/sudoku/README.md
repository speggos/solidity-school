# Vulnerabilities

- H1: Any solution can be frontrun when calling claimReward. A MEV bot could simply outbid any correct answer in the mempool, and win. Instead, add a claim, prove pattern where a solver sends a hash of the answer to prove they know the answer, then in another transaction send the unhashed value. **Melville showed me this answer in office hour**
- H2: Reentrancy vulnerability:  challengeReward.solved is set to true at the end of claimReward(). Instead it should happen directly after checking that it has been solved, otherwise a reentrancy attack is possible
- H3: We never check that a reward hasn't been claimed. In claimReward(), we should require(!rewardChallenges[address(challenge)].solved), "Already solved")
- H4: In line 59, only the memory variable is set to Solved, which will not affect the storage. Must make it storage
- H5: You can grief and challanges by posting another challange with the same board, but a reward of close to zero. This would overwrite the previous one, and funds would forever be lost
- M1: In createReward, we allow any contract to be passed in as an "ERC20". We call "transferFrom", but that could be a malicious contract which simply returns true for that function. Not sure of the attack setup, but we're giving a contract the opportunity to call its own functions with whatever code it wants

# Gas optimizations
SudokuChallenge:
- Can set challenge as immutable, since it is only set during construction
- Could make challenge a hash of the array of integers, so it only takes up a fixed amount of storage. The validate function would also hash the input to make sure they're providing the solution to the right problem
- Validate could be external. Since we've not seen the correct implementation, I'll assume that any other optimizations here would be done

SudokuExchange:
- In line 21, reward could probably be smaller to help pack gas better
- In line 22, we should instead store the address of the ERC20
- createReward and claimReward can both be external and use calldata for their params
- In claimReward, initialize the storage variable of the challange instead of re-loading it every time
- We create a full new instance of a challange each time. Instead, make a struct out of a challenge, which can then be verified 

# Code quality issues
- Natspec should be used
- No events are emitted, making it very difficult for offchain listeners to keep up with what happens to this contract

# Basic Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```
