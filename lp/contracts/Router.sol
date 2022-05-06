//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./SpaceToken.sol";
import "./Pool.sol";

contract Router {

    address payable immutable public pool;
    address immutable spc;

    event LiquidityAdded(address indexed sender, uint ethAmount, uint spcAmount);
    event LiquidityRemoved(address indexed sender, uint ethAmount, uint spcAmount);

    constructor(address _spc, address payable _pool) {
        spc = _spc;
        pool = _pool;
    }

    /// @dev Specify spc amount to add, send eth in the transaction. Check on the frontend what ratio to use, 
    function addLiquidity(uint spcSent) payable external {
        Pool p = Pool(pool);
        uint ethSent = msg.value;
        uint poolEthBalance = p.ethBalance();
        uint poolSpcBalance = p.spcBalance();
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
        p.mintTokens{value: msg.value}(msg.sender, tokensToMint);
        p.updateBalances();
        emit LiquidityAdded(msg.sender, ethSent, spcSent);
    }

    function removeLiquidity() external {

    }

    function swap() external {

    }

    /// @dev Calculate square root
    function sqrt(uint x) private pure returns (uint y) {
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}