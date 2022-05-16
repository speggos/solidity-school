https://github.com/0xMacro/student.speggos/tree/ec1ed36471f7e0dbae28fbf8fc6912f810a254cd/lp

The following is a micro audit of git commit ec1ed36471f7e0dbae28fbf8fc6912f810a254cd by thev

Audited By: Vince

# General Comments

1. Great work! The code is neat and well organized. The test suite is detailed and well-written. Unfortunately there is a technical mistake, but despite that the contract does what it was meant to do but with a vulnerability. There can be a little bit more comments on the code, but it's something to get used to. Checkout Natspec: https://docs.soliditylang.org/en/v0.8.9/natspec-format.html

# Design Exercise

Great work on the proposals and the considerations are well estabilished and show a good understanding of the tradeoffs involved implementing the rewards mechanism on-chain vs off-chain!

# Issues

**[Technical Mistake]** Pool's swap function does not account for feeOnTransfer tokens such as SPC

In your `swap`, `addLiquidity` and `removeLiquidity` functions you do not handle the case where the 2% fee on transfer tax is turned on for SPC. Your code assumes the `amount` argument in the `ERC20.transfer*` function will be equal to the amount actual received by the recipient. For a specific example, see these lines of your `addLiquidity` function:

```
Pool p = Pool(pool);

uint ethSent = msg.value;
uint poolEthBalance = pool.balance;
uint poolSpcBalance = SpaceToken(spc).balanceOf(pool);
uint lpSupply = p.totalSupply();
uint tokensToMint;

if (lpSupply == 0) {
    tokensToMint = sqrt(spcSent * ethSent);
} else {
    uint ethOptimalAmount = ethSent*lpSupply/poolEthBalance;
    uint spcOptimalAmount = spcSent*lpSupply/poolSpcBalance;
    tokensToMint = ethOptimalAmount < spcOptimalAmount ? ethOptimalAmount : spcOptimalAmount;
}

require(tokensToMint > 0, "Insufficient liquidity added");
SpaceToken(spc).transferFrom(msg.sender, pool, spcSent);
```

You are determining `tokensToMint` based on the the amount they specified in the function argument, which will not be equal to the amount received if the 2% tax is turned on.

**[H-1]** Router.sol#removeLiquidity() allows for reentrancy.

```
function removeLiquidity(uint amountToBurn) external {
    require(amountToBurn>0, "Must remove >0");
    Pool p = Pool(pool);

    uint poolEthBalance = pool.balance;
    uint poolSpcBalance = SpaceToken(spc).balanceOf(pool);
    uint lpSupply = p.totalSupply();

    uint ethToReturn;
    uint spcToReturn;

    ethToReturn = amountToBurn * poolEthBalance / lpSupply;
    spcToReturn = amountToBurn * poolSpcBalance / lpSupply ;

    emit LiquidityRemoved(msg.sender, ethToReturn, spcToReturn);

    p.burnTokens(msg.sender, amountToBurn, ethToReturn);
    SpaceToken(spc).transferFrom(pool, msg.sender, spcToReturn);
}


function burnTokens(address from, uint amount, uint ethToReturn) external onlyRouter {
    _burn(from, amount);
    (bool success, ) = from.call{value: ethToReturn}("");
    require (success, "BurnTokens failed to send");
}
```

The implementation of removeLiquidity allows for re-entracy, notice burnTokens sends ETH to an address, if this address is a malicious contract it can call other external functions on the contract which currently uses the wrong SpaceToken balance.

Try to run the code manually annotating the various variables.
For example say the current pool balance is 100 ETH and 20 SPC.
Say account Attacker has deposited 50ETH and 10SPC, and it has received 22,361 LP Tokens.
Now the Attacker calls removeLiquidity, notice removeLiquidity calls burnToken and burnTokens calls `from.call{value: ethToReturn}("")` so now the Attacker will get the chance execute some code, as it has received ether, before the call SpaceToken(spc).transferFrom(pool, msg.sender, spcToReturn); is called, which will update the pool SPC balance but only as a last step.

Given the following execution:
 ____________________ ____________________ ____________________ ____________________ ____________________ ____________________
| method             | poolEthBalance     | poolSpcBalance     | lpSupply           | ethToReturn        | spcToReturn        |
|--------------------|--------------------|--------------------|--------------------|--------------------|--------------------|
| removeLiquidity(11)| 100 ETH            | 20 SPC             | 44.7214 LP         | 24.5967 ETH        | 4.9193 SPC         |
|--------------------|--------------------|--------------------|--------------------|--------------------|--------------------|
| removeLiquidity(11)| 75.4033 ETH        | 20 SPC             | 33.7214 LP         | 24.5967 ETH        | 6.5240 SPC         |
|--------------------|--------------------|--------------------|--------------------|--------------------|--------------------|
| finalState         | 50.8066 ETH        | 8.5567 SPC         | 22.7214 LP         | 49.1934 ETH        | 11.4433  SPC       |
 -------------------- -------------------- -------------------- -------------------- -------------------- --------------------

Notice how the Attacker has already received more SPC than the amount it put in it, de facto stealing the assets from others.
You can see the problem here is poolSpcBalance never get to update to the correct value.

Consider: lock the public external methods with a reentrancy guard.


**[L-2]** `require` statements in Router.addLiquidity():25 and Router.swap():80 should use '>=' instead of '>'
Here are the lines of code:
        
        require(SpaceToken(spc).allowance(msg.sender, address(this)) > spcSent, "Not enough allowance");
        require(SpaceToken(spc).allowance(msg.sender, address(this)) > spcIn, "Not enough allowance");

In both cases the require statement should have '>=' instead of '>', the contract should be able to spend the exact money that he's allowed to spend. Think about a case where the allowance is exactly 100, your transaction to addLiquidity or swap will fail if you try to send or swap exactly 100 even when you think you've allowed the contract to spend that much.
Also the require on line 88 isn't necessary as OZ ERC20 `transferFrom` would check for allowance for you.


**[Q-1]** _Interfaces vs. contract imports_

Your Router.sol contract imports your Pool.sol and SpaceToken.sol contracts. This copies the contracts into the code of your router contract greatly increasing contract size and relative deployment costs.

Consider using interfaces for these contracts.



# Nitpicks
- consider using the explicit types for state variable over the address if you plan to use it to interact with the contract, it would make code readability much better
- Remember to remove references to hardhat/console.sol when doing mainnet projects material

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | -     |
| Vulnerability              | 4     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | 2     |

Total: 6
Good job!
