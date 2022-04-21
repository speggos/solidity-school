https://github.com/ShipyardDAO/student.speggos/tree/42762df0861058a9c14d5cd9c73a1f074946ed0a/crowdfund

Audited By: Gary

# General Comments

Good first project! 

However, I think you were confused about the store value of "goal".  When the creator sets the goal, the amount 
passed in as a parameter to `ProjectFactory.create` should be 1**18, since the goal is valued in ETH.

values are represented like: 
assert(1 wei == 1);
assert(1 gwei == 1e9);
assert(1 ether == 1e18);

For instance: goal of 10 ETH would be stored as 10000000000000000000  (18 trailing zeros).  All the other uint256 variables would be
stored similarly.   Thus in your tests, the goal of 10 ETH should have been expressed like:   

                                await projectFactory.create(ethers.utils.parseEther("10");

If you would have done this, you could remove all the division or multiplication by 10 ** 18, in your Project.sol 
For example   

              require(contributed / 10 ** 18, < goal, "Funding goal already reached");     can be rewritten as
              require(contributed < goal, "Funding goal already reached");


I have identified several code quality issues.  Please follow the recommendations for your next projects. Your code quality will
 improve and eventually become rock solid!

# Design Exercise

I like how you really thought about the possible options in considering how to implement multiple contribution tiers.  You put in
some effort in thinking about the solutions.  Even though you did not prefer the last option with encoding the ID of the NFT, it might
be a good option.  To make the tokenId unique per tier, in short you could do bit manipulation on the ID. Shift the bits to the left
by 2 positions, and replace the last two bits with a tier indicator.  Then you could add functions in the contract to properly 
identify the tokenID to the appropriate tier.  

# Issues

**[H-1]** Owner can steal money 
  (This is a FYI as no points have been added.   The Crowdfundr specs was not completely clear on the cancel function)

In `cancelProject()`, you are allowing the creator to cancel a project even after the project is fully funded. This opens up the 
vulnerability of creator taking all the money and not being heard from again.   

Consider this scenario.  The project is fully funded within the first 30 days and the creator withdraws some or even all of the ETH
in the project. The creator could then cancel the project before 30 days is up.  As a result, the contributors will not be able to 
get all their ETH back (per the cancel/project failure requirement) because some or all the ETH has been emptied out of the project. 
 
If you did allow the project to be canceled within the first 30 days and the project is fully funded, you would need to ensure that
the creator has not withdrawn any ETH.  
 
**[L-1]** Using `transfer()` to send ETH  instead of `call()`

Your contract uses the `transfer()` function to send ETH. Although this will work it is no longer the recommended approach.
 `transfer()` limits the gas sent with the transfer call and has the potential to fail due to rising gas costs. `call()` is currently
 the best practice way to send ETH.

For a full breakdown of why, check out [this resource](https://consensys.net/diligence/blog/2019/09/stop-using-soliditys-transfer-now/)
 
For example: instead of using

```
payable(someAddress).transfer(amount);
```

The alternative, admittedly somewhat clumsy looking, recommendation is:

```
(bool success,) = payable(someAddress).call{value:amount}("");
require(success, "transfer failed"
```

Consider replacing your `transfer()` functions with `call()` to send ETH.

**[L-2]** Creator can cancel twice 

A creator can call cancel to emit the ProjectCancelled event multiple times. This may cause a discrepancy for offchain applications 
that attempt to read when a project got cancelled.

Consider adding a check to see if the project has already been cancelled.

**[L-3]** Use of _mint instead of _safeMint

In line 46 of Project.sol, NFT's are minted to users with the `ERC721._mint`  function. However, this function does not check if the 
`_to` address is able to handle/receive ERC721 tokens, which would not be the case if the msg.sender was a contract that does not
 implement the equivalent of the 
[IERC721Receiver](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/IERC721Receiver.sol) 
interface.

Consider using `_safeMint()` instead of `_mint()` to ensure receiving 
addresses can handle ERC721 tokens.

**[Technical-Mistake-1]** NFT award logic not based on cumulative ETH contributed (2 points) 

An user should be awarded an NFT badge for every 1 ETH contributed. This should account for cumulative contributions--meaning ETH
contributed across multiple transactions. For instance, if an user donates 0.9 ETH in one transaction and 0.1 ETH in a subsequent 
transaction, they should be awarded an NFT.

However,  in your contract, your logic is incorrect.  Consider this scenario;
   1.   1 ETH contributed   -   1 NFT will be minted because on line 44, val = 1     (This is correct)
   2. .01 ETH contributed   -   another NFT will be minted which is incorrect.  val < 1 ETH but contributions(msg.sender) would be
      1.01 ETH on line 44. 
      The contributor could keep on contributing .01 ETH and receive an NFT each time.        


**[Q-1]**  Unneccessary getter function

`ProjectFactory.sol` Since projects (line 8) is public there is no need for the getter at line 20 . In solidity - If you have public 
state variables in your contract, the compiler will create getter functions for these automatically. Therefore, if you have already 
defined public state variables, you don't have to write getter functions explicitly for those variables. It isn't recommended to write 
getter functions for public state variables. However, for `public` state variable of array type there is an exception.  You can then 
only retrieve single elements of the array via the generated getter function. This mechanism exists to avoid high gas costs when 
returning an entire array. If would have been ok to code the getter function with an index parameter like:

                    function getProjects(uint _projectId)) external view returns (Project) {
                        return projects[_projectId];

**[Q-3]** Needless setting of storage variables initial values

This is not needed (and wastes gas) because every variable type has a 
default value it gets set to upon declaration. 

For example:
```
address a;  // will be initialized to the 0 address (address(0))
uint256b;  // will be initialized to 0
bool c;     // will be initialized to false
```
Consider not setting initial values for storage variables that would
otherwise be equal to their default values.

**[Q-4]** Use immutable variables

There are a number of variables (goal and creator) set in the constructor that don't change. These can be made immutable.
 See https://docs.soliditylang.org/en/v0.8.12/contracts.html#constant-and-immutable-state-variables

FYI 

Unchanged variables should be marked constant or immutable

Contracts that includes storage variables that are not updated by any functions
and do not change can save gas and improve readability
by marking these variables as either `constant` or `immutable`.

What's the difference? In both cases, the variables cannot be modified after 
the contract has been constructed. For `constant` variables, the value has to 
be fixed at compile-time, while for `immutable`, it can still be assigned at 
construction time.

Compared to regular state variables, the gas costs of `constant` and `immutable` 
variables are much lower. For a `constant` variable, the expression assigned to 
it is copied to all the places where it is accessed and also re-evaluated 
each time. This allows for local optimizations. `Immutable` variables are 
evaluated once at construction time and their value is copied to all the 
places in the code where they are accessed. For these values, 32 bytes are 
reserved, even if they would fit in fewer bytes. Due to this, `constant` values 
can sometimes be cheaper than `immutable` values.

Consider marking unchanged storage variables as either `constant` or `immutable`.

**[Q-5]** Modifiers should be used if reference in more than one function

Modifiers are useful because they reduce code redundancy. You should use modifiers if you are checking for the same condition in
multiple functions

Consider adding a modifier for `msg.sender == creator` and `block.timestamp - creationTime) < 30 days`

**[Q-6]** Use constants

Instead of 10**18 - you can create a constant variable for this, then reference it in the functions.  

**[Q-7]** Preventing contributions on the 30th day after creations

Requirement stated that the project needed to be funded within 30 days.  This would include the 30th day.
Consider changing the require statement on line 32-34 in Project.sol to:

                           require((block.timestamp - creationTime) <= 30 days,
                           ">30 days has passed"

**[Q-8]** State variables of contracts are not stored in storage in a compact way causing more gas usage. 

In order to allow the EVM to optimize gas usage, ensure that you to order your storage variables such that they can
be packed tightly. ie. Keep your uint256 variables together.  You declare uint256 variables, then an address, then another uint256 
followed by bool, and back to a uint256 variable.  

see: https://docs.soliditylang.org/en/v0.8.11/internals/layout_in_storage.html


**[Q-9]** Project state not queryable

You do a great job designing your contracts for gas efficiency and compactness/readability. You manage project "state" (active/failed)
via require checks in each function instead of a storage variable, which cuts down on gas costs and contract size.

That said, this approach makes it difficult for a front end or outside user to query the status of a contract: "is this Project
 active? Can I contribute to it?".

Consider using an enum data type to represent your contract status (active/failed/cancelled). You could pair the enum with a public 
view function that returns the correct enum based on the logic checks that you include in each of your functions. This way you can use 
the same base logic in each function to determine contract state, as well as query contract state externally. Other approaches also 
work, this is just a suggestion!

**[Q-10]** Use NatSpec format for comments

Solidity contracts can use a special form of comments to provide rich 
documentation for functions, return variables and more. This special form is 
named the Ethereum Natural Language Specification Format (NatSpec).

It is recommended that Solidity contracts are fully annotated using NatSpec 
for all public interfaces (everything in the ABI).

Using NatSpec will make your contracts more familiar for others audit, as well
as making your contracts look more standard.

For more info on NatSpec, check out [this guide](https://docs.soliditylang.org/en/develop/natspec-format.html).

Consider annotating your contract code via the NatSpec comment standard.


# Nitpicks

- If you were to deploy this you would want to eventually delete the import "hardhat/console.sol";


# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | - |
| Vulnerability              | 3 |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | 2 |

Total: 5

Good job! 
