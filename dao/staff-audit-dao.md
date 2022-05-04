https://github.com/0xMacro/student.speggos/tree/21b3c87a7d72df00fdb6a10965822efba9c5c750/dao

Audited By: brianwatroba

# General Comments

1. Great work! I appreciated the detail you provided about how your DAO works, including the drawbacks. It's important to understand and communicate the tradeoffs of your design as DAOs are never perfect, and transparency to operation is key to good community expectations.

2. I like your design of having a minimum number of days for voting to prevent against "flash loan" type scenarios. This has good forsight and is implemented without tradeoffs. Great!

3. Your way of checking if a proposal has already been proposed is clever! A common issue people have is not forseeing that proposals could possibly be overwritten. I like how you initialize each new proposal's voteCount to 1, assuming that a proposer supports it. From there, you check if a proposal's voteCount is == 0 to test if it exists. Cool!

_To think about_

1. EIP-712 was optional for this project, but I encourage you to review it and consider implementing it for future projects. It's a great design pattern and lots of projects use it now!

2. There were missing tests for your bulk voting function and signature verification functionality. I strongly recommend you go back to write these tests. I know testing signatures is really hard because the feedback is opaque, it's hard to know why signatures aren't matching, but that process has a lot to teach us about how signatures work.

# Design Exercise

1. Great ideas! I like how you walk through specific implementation you'd follow, even to mapping out the struct's data structure and function pseudocode. You might consider some other "summary" storage variables that track aggregate data that would otherwise be hard to look up member my member, depending on what your DAO/DAPP needs to do.

2. Good answer. I like your point how this opens up issues of someone losing the original intention of their delegation if a vote is delegated multiple times to different people. For tracking loops, you could consider off-chain data storage/analysis where it's cheaper to save and operate on graphs.

# Issues

**[H-1]** Reentrancy risk in execute() function

Your `execute` function makes external calls before changing proposal state to `executed`, or otherwise providing a reentrancy guard.

This isn't as much of an issue for buying NFTs, because you can't buy the same NFT twice.

However, the spec states that `execute()` should also be designed for arbitrary function calls, which could include sending ETH/and or tokens, which could be exploited via reentrancy to drain the contract's funds.

Consider adding a reentrancy guard to `execute()` to prevent exploitation for arbitrary function calls.

**[Technical Mistake]** _batchVotWithSigs() cannot count "against" votes_

`batchVoteWithSigs()` does not take the `bool support` parameter like your `vote` function does. Based on an address, proposalId, and signature, the function has no way of knowing if a member voted for or against a particular proposal. The `batchVoteWithSigs()` logic assumes all valid signatures are for votes, leaving out members' ability to vote against proposals via signature.

Consider implementing `batchVoteWithSigs()` to also count "against" votes.

**[Insufficient Tests-1]** Missing testing

Tests are not provided for `batchVoteWithSigs()` function or signature verification functionality (`getSignerAddress()`, `verifySignature()`).

Consider adding testing for these core spec functionalities.

**[Unfinished-Feature-1]** Did not implement NFT-buying functionality in `CollectorDAO`

In the Project Spec it says:

"Even though this DAO has one main purpose, write your proposal system to support calling arbitrary functions, then use this to implement the NFT-buying behavior."

However, there is no function that implements the NFT-buying behavior. 

The arbitray function call in `execute` should be calling a public function in `CollectorDAO` that will get the price of the NFT from a NFTMarketplace and then call the function to buy the NFT.  It should ensure that the price of the NFT is less than the max price the DAO is willing to pay for it.  

Your contract calls an external contract based on your tests, but no checks are done on the price and it is only using one NftMarketplace.  There are more than one NftMarketplace, and it should be passed as part the the proposal calldata. 

**[Q-1]** Missing singluar `voteWithSig()` function

The spec states: "Write a function that allows any address to tally a vote cast by a DAO member using offchain-generated signatures. Then, write a function to do this in bulk."

Your `batchVoteWithSigs()` function satisfies the second portion, but your contract is missing a function that can count a single vote via off-chain signature.

Consider implementing a function that can count a single vote via off-chain signature.

**[Q-2]** uintToString() helper function and casting to string

You include a `uintToString()` function to cast `proposalId`s to a string before hashing it for signature veriifcation. This will also work with uints--there isn't necessarily a need to cast to string.

Consider removing your string casting functionality and hash proposalIds as the base uint type they are.

**[Q-3]** notPastDeadline() modifier not implemented

Your `notPastDeadline()` modifier is never used and does not contain any logic (it simply yieldes execution: `_`).

Consider removing or implementing this feature.

# Nitpicks

- Your `verifySignature()` function can be marked `pure`, it does not access storage or make external calls
- Consider combining some of your require statement logic to reduce the number of require checks. For instance, consider combining lines 130 and 131, which both check for proposal length
- Consider adding comments (preferably NATSPEC) to document your code for readers

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | 1     |
| Extra features             | -     |
| Vulnerability              | 3     |
| Unanswered design exercise | -     |
| Insufficient tests         | 1     |
| Technical mistake          | 2     |

Total: 7

Good work!
