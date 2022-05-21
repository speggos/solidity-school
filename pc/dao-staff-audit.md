https://github.com/0xMacro/student.name/tree/f9d9b24bfa37d2a183533a4854bd10960c5f3df5/crowdfund

Audited By: brianwatroba

# General Comments

It's great that you're revisiting your DAO project to address some of the audit feedback. I see you made changes to fix the main high vulnerability: the re-entrancy attack. This is key: it was the the largest security risk in the original submission. Congrats on fixing all of your vulnerabilities!

That said, the remaining feedback from the first audit went unaddressed, so I'm including it below here for transparency.

If you have any questions or I can help explain anything better, please reach out.

# Design Exercise

N/A

# Issues

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

The arbitray function call in `execute` should be calling a public function in `CollectorDAO` that will get the price of the NFT from a NFTMarketplace and then call the function to buy the NFT. It should ensure that the price of the NFT is less than the max price the DAO is willing to pay for it.

Your contract calls an external contract based on your tests, but no checks are done on the price and it is only using one NftMarketplace. There are more than one NftMarketplace, and it should be passed as part the the proposal calldata.

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
| Vulnerability              | -     |
| Unanswered design exercise | -     |
| Insufficient tests         | 1     |
| Technical mistake          | 2     |

Total: 4

Good job!
