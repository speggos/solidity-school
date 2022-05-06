https://github.com/ShipyardDAO/student.speggos/commit/21b3c87a7d72df00fdb6a10965822efba9c5c750
Audited by: Ganzai

## **[L-1]** Rounding/Logic

On line 168 require(memberCount / (proposal.votesFor + proposal.votesAgainst) < 100 / QUORUM_PERCENT, "Quorum not reached")
Membercount is a uint so rounding will happen: 9 / 2 + 0 = (4.5) = 4 < 4., seems a bit dangerous.
This logic also has an edge case issue:

- 4 members one vote wont make quorum: 4 / 1 + 0 = 4 < 4, should be <= otherwise exactly 25% is not counted.

Consider avoiding division all together: memberCount < 4 \* (proposal.votesFor + proposal.votesAgainst)

## **[L-2]** Unnecessary check/double work

On line 170: checking for a proposalId that was calculated by the contract on line 163.

**[Q-1]** Replace require() with revert() statements

Consider replacing require conditions with custom errors for more efficient contract execution.

**[Q-2]** Unused modifier

On line 43 the modifier notPastDeadline is empty and never used.
