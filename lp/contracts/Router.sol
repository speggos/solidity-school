//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./SpaceToken.sol";
import "./Pool.sol";

contract Router {

    address payable immutable public pool;
    address immutable spc;
    uint8 constant FEE_IN_PERCENT = 1;

    event LiquidityAdded(address indexed sender, uint ethAmount, uint spcAmount);
    event LiquidityRemoved(address indexed sender, uint ethAmount, uint spcAmount);
    event Swapped(address indexed sender, uint spcIn, uint ethIn, uint returnedAmount);

    constructor(address _spc, address payable _pool) {
        spc = _spc;
        pool = _pool;
    }

    /// @dev Specify spc amount to add, send eth in the transaction. Check on the frontend what ratio to use, as it will return the minimum possible amount of spc
    function addLiquidity(uint spcSent) payable external {
        require(SpaceToken(spc).allowance(msg.sender, address(this)) > spcSent, "Not enough allowance"); 
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
        p.mintTokens{value: msg.value}(msg.sender, tokensToMint);

        emit LiquidityAdded(msg.sender, ethSent, spcSent);
    }

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

    function swap(uint spcIn, uint minOut) external payable {
        require((spcIn == 0 || msg.value == 0) && spcIn != msg.value, "Must supply only spc OR eth");
        Pool p = Pool(pool);

        uint poolEthBalance = pool.balance;
        uint poolSpcBalance = SpaceToken(spc).balanceOf(pool);

        uint k = poolEthBalance * poolSpcBalance;
        uint tokensToReturn;
        require(k != 0, "No liquidity in pool");
        if (spcIn != 0) {
            require(SpaceToken(spc).allowance(msg.sender, address(this)) > spcIn, "Not enough allowance"); 

            //Swapping SPC -> ETH
            SpaceToken(spc).transferFrom(msg.sender, pool, spcIn);
            // Account for any tax occurring from SPC token
            uint spcAfterTax = SpaceToken(spc).balanceOf(pool);
            // Add fee for the LP pool;
            tokensToReturn = poolEthBalance - k * 100 / (100-FEE_IN_PERCENT) / spcAfterTax;
            require(tokensToReturn >= minOut, "Too much slippage");
            p.returnEther(msg.sender, tokensToReturn);
        } else {
            //Swapping ETH -> SPC
            (bool success, ) = address(p).call{value: msg.value}("");
            require(success, "Transfer failed");
            tokensToReturn = poolSpcBalance - k * 100 / (100-FEE_IN_PERCENT) / (poolEthBalance + msg.value);
            require(tokensToReturn >= minOut, "Too much slippage");
            SpaceToken(spc).transferFrom(pool, msg.sender, tokensToReturn);
        }

        emit Swapped(msg.sender, spcIn, msg.value, tokensToReturn);        
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