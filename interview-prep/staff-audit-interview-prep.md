https://github.com/0xMacro/student.speggos/tree/d61a4d5bbfcf8f6c7be2a0c51568974bb0a9e3f5/interview-prep

Audited By: Alex.S

# Sudoku Challenge

Below you will find the staff audit for both of the interview question solutions you submitted. For the Sudoku Exchange problem, the audit will look a little different than you're used to. Instead of issues in the code you submitted, you will find several checklists of known vulnerabilities and known gas optimizations. We've added an `[x]` next to each item if you correctly identified that item in your submission, and a `[]` if not.

## General Comments

I couldn't find any submission, I guess you didn't have time to complete this exercise.

## Issues

### High Severity Vulnerabilities

- [ ] `createReward()`'s `ERC20.transferFrom` call does not check the return value for success.

- [ ] `createReward()` allows overwriting of existing challenge reward/token/solved.

- [ ] Need to change the `.transfer` call to transfer to `msg.sender` so that it rewards the caller.

- [ ] Need to change data type from `memory` to `storage` so that it changes the storage value of the `ChallengeReward`.

- [ ] `claimReward` can be front-run. `SudokuExchange` needs to change the `claimReward` logic to use a 2-stage commit-reveal process where the first transaction commits `keccak256(msg.sender + random_salt)`, and then, after some number of a blocks, in a second transaction the actual solution is provided. The `msg.sender + random_salt` hash ensures that the second transaction cannot be front-run.

- [ ] Can be double-claimed. Need to check that it's not solved (or remove it from mapping).

- [ ] `claimReward` is vulnerable to a reentrancy attack. (It would not be if it followed checks-effects-interactions.)

### Low Severity Vulnerabilities

- [ ] `claimReward`'s `ERC20.transfer` call does not check the return value for success.

- [ ] `createReward()` allows creating an already solved challenge (`solved=true`), locking tokens.

- [ ] The `challenge` argument in `claimReward` is controlled by the user, so they could pass in a contract address with a `validate` function that always returns `true`.

### Gas Optimizations

- [ ] Turn solc gas optimizations on.
- [ ] Gas savings from shorter error strings or Solidity Custom Errors.
- [ ] Do not create new contract with every challenge, instead store within `Challenge` struct on `SudokuExchange`.
- [ ] Use `external` instead of `public` on all of `SudokuExchange.sol`'s functions.
- [ ] Remove `hardhat/console.sol`. See the NPM package [hardhat-log-remover](https://www.npmjs.com/package/hardhat-log-remover)
- [ ] Eliminate duplicate information from `ChallengeReward` struct. The `challenge` struct member on line 20 is identical to the key of `rewardChallenges` on line 30. Consider removing the `challenge` struct member.
- [ ] Use `calldata` type in `createReward` to avoid unnecessary copying.
- [ ] Remove a memory variable allocation by getting rid of `isCorrect` function variable in `claimReward`. It can be passed directly to the `require` on the next line.
- [ ] Use `calldata` data location instead of `memory` when passing ChallengeReward in `SudokuExchange.createReward`

### Code Quality Issues

- [ ] There are no tests!
- [ ] The documentation is sparse. Consider using the NatSpec format for comments, and add more variable, function, and contract comments.
- [ ] Explicitly mark the visibility of contract fields like `rewardChallenges` to be `public`.
- [ ] Add events to signify changes in the contract state.

## Score

No submission.


