# Crowdfundr Audit by mathewmeconry

## **[H-1]** Infinite NFTs can be minted

On lines 43 - 51, Project.sol has the following code:

```solidity
while (
    val >= 1 ether || (contributors[msg.sender] >= 1 ether && firstPass)
) {
    _mint(msg.sender, nftsMinted);
    nftsMinted++;
    if (val < 1 ether) break;
    val -= 1 ether;
    firstPass = false;
}
```

After a contributor contributed his first 1 ETH the second check of this loop is always true.  
This allows the contributor to mint an unlimited number of NFTs by doing the following attack steps:

- Contribute 1 ETH
- Call `contribute` in a loop with the min contribution of 0.01 ETH

Consider:  
Round the total contribution to the nearest ether and compare it to total amount of NFTs created for this contributor

```solidity
uint totalContributions = contributors[msg.sender];
uint flooredContributions = (totalContributions - (totalContributions % 1 ether)) / 1 ether;
while(nftsMintedForContributor[msg.sender] < flooredContributions) {
    _safeMint(msg.sender, nftsMinted);
    nftsMinted++;
    nftsMintedForContributor[msg.sender]++;
}
```

## **[H-2]** Creator cannot claim all funds

In the function `creatorClaim` on line 60 in Project.sol, the function has 1 parameter called `_amountInEther`.
This is expeced to be a number representing a full eth. Because solidity does not have floating numbers, a creator cannot claim the whole contribution amount:

- The project goal is 1 ETH
- Total contributions are 1.5 ETH (The last contributor exceed the goal)
- The creator can only claim 1 ETH

Consider: handle all funds in Wei instead of Ether.

## **[H-3]** Incorrect calculation for NFT minting

On lines 43 - 51, Project.sol has the following code:

```solidity
while (
    val >= 1 ether || (contributors[msg.sender] >= 1 ether && firstPass)
) {
    _mint(msg.sender, nftsMinted);
    nftsMinted++;
    if (val < 1 ether) break;
    val -= 1 ether;
    firstPass = false;
}
```

The first round works as expected and mints and NFT if the contribution is greater than 1 ether.
But afterwards the code doesn't take the total amount contributed into the check if the contributor should receive another NFT.
According to the spec this should happen:

- Contributor contributes 1 ETH and gets 1 NFT
- Contributor contributes 0.5 ETH and gets 0 NFT
- Contributor contributes 0.5 ETH and gets 1 NFT (Because the total amount of contribution exceeds 2 ETH)

Consider:  
Round the total contribution to the nearest ether and compare it to total amount of NFTs created for this contributor

```solidity
uint totalContributions = contributors[msg.sender];
uint flooredContributions = (totalContributions - (totalContributions % 1 ether)) / 1 ether;
while(nftsMintedForContributor[msg.sender] < flooredContributions) {
    _safeMint(msg.sender, nftsMinted);
    nftsMinted++;
    nftsMintedForContributor[msg.sender]++;
}
```

## **[M-1]** Goal is in handled in ETH and not Wei

The goal is expected to be in ETH and not Wei.  
This causes the following issues:

- A creator can only define goal for a full ETH. A goal of 1.5 ETH is not possible.
- A creator could try to define a goal in Wei and the goal would be huge. Missing comments increase the risk of this happening.

Consider: handle all funds in Wei instead of Ether.

## **[L-1]** Contributions allowed when project is cancelled

The `contribute` function in Project.sol is laking the check if the project is cancelled.  
This allows everybody to still contribute to the project after it has been cancelled and haven't run for more than 30 days.

Consider: add a check if the project is cancelled: `require(!cancelled, "Project has been cancelled")`

## **[L-2]** Use of `_mint` instead of `_safeMint`

On line 46 in Project.sol `_mint` gets called instead of `_safeMint`.  
`_safeMint` checks if the recipient is able to receive ERC721 tokens.

Consider: Change the call `_safeMint`. Be aware of a possible reentrancy attack after this change.

## **[Q-1]** Project can be created with 0 goal

On line 13 in ProjectFactory.sol there is a goal check:

```solidity
require (_goal > 0, "Goal must be >0");
```

The code doesn't prevent the project from being created with a 0 goal when somebody doesn't use the factory.  
For that to happen somebody would need to extract the Project.sol byte code out of the complete byte code and then use it to create a project.

Consider: Move the check into the constructor of Project.sol


## **[Q-2]** Move event emit above external function calls

On lines 74 - 76, Project.sol has the following code:

```solidity
payable(msg.sender).transfer(_amountInEther * 10**18);

emit CreatorClaim(_amountInEther);
```

This doesn't pose any thread at all but it is a good practice to do external calls as late as possible.

Consider: Move the external call to the end of the function.

## **[Q-3]** Move event emit above external function calls

On lines 93 - 95, Project.sol has the following code:

```solidity
payable(msg.sender).transfer(_contributedAmount);

emit RefundIssued(msg.sender, _contributedAmount);
```

This doesn't pose any thread at all but it is a good practice to do external calls as late as possible.

Consider: Move the external call to the end of the function.

## **[Q-4]** Missing zero-check for `_creator`

In the constructor of Project.sol there is no check if the creator is zero.  
This is a good practice to prevent a user from creating a project with a zero address.

Consider: adding a zero check for the `_creator` address: `require(_creator != address(0), "Creator must not be zero");`

## **[Q-5]** Missing NatSpec comments

It is a good practice to add NatSpec comments to the contracts and functions.  
NatSpec: [https://docs.soliditylang.org/en/v0.8.13/natspec-format.html](https://docs.soliditylang.org/en/v0.8.13/natspec-format.html)

## **[Q-6]** Use call over transfer

On lines 74 and 93 in Project.sol, `transfer` gets used to transfer funds.  
This function has a limit of 2300 gas and could fail for contracts that contributed to the project.  
`call` on the other hand allows the external contract to use all remaining gas.  
For more information read [https://consensys.net/diligence/blog/2019/09/stop-using-soliditys-transfer-now/](https://consensys.net/diligence/blog/2019/09/stop-using-soliditys-transfer-now/)

Consider: Use call instead of transfer. (Keep in mind that this opens the possiblity for a reentrancy attack)

## **[Q-7]** Use modifiers

It is good practice to use modifiers for checks that are used in multiple functions.

On lines 62 and 99 in Project.sol are the same checks if the sender is the creator:

```solidity
require(msg.sender == _creator, "...");
```

Consider:  
Create a modifiers for checks that are used mulitple times.

*Example for the creator check*

```solidity
modifier onlyCreator {
    require(msg.sender == creator, "Not creator");
    _;
}

function creatorClaim(uint256 _amountInEther) external onlyCreator {
    ...
}

function cancelProject() external onlyCreator {
    ...
}
```

## **[Q-8]** Mark `getContributors` as external

External functions use less gas when they are called compared to public functions.

Consider: Use external functions `getContributors`.

## **[Q-9]** Make use of variables

In `creatorClaim` (lines 61 - 77) in Project.sol the same calcuation (`_amountInEther * 10**18`) happens 3 times:

```solidity
function creatorClaim(uint256 _amountInEther) external {
  require(msg.sender == creator, "Only project creator can claim");
  require(
    contributed / 10**18 > goal || projectSuccess,
    "Project funding goal not reached"
  );
  require(
    _amountInEther * 10**18 <= contributed, // HERE
    "Cannot claim more than contributed"
  );
  require(!projectCancelled, "Project cancelled. Cannot claim");

  contributed -= _amountInEther * 10**18; // HERE
  payable(msg.sender).transfer(_amountInEther * 10**18); // HERE

  emit CreatorClaim(_amountInEther);
}

```

Consider:
Use a variable to store the value of `_amountInEther * 10**18`

```solidity
function creatorClaim(uint256 _amountInEther) external {
  require(msg.sender == creator, "Only project creator can claim");
  require(
    contributed / 10**18 > goal || projectSuccess,
    "Project funding goal not reached"
  );
  uint256 amountInWei = _amountInEther * 10**18;
  require(amountInWei <= contributed, "Cannot claim more than contributed");
  require(!projectCancelled, "Project cancelled. Cannot claim");

  contributed -= amountInWei;
  payable(msg.sender).transfer(amountInWei);

  emit CreatorClaim(_amountInEther);
}

```
