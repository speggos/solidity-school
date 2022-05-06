//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./SpaceToken.sol";
import "./Pool.sol";

contract Router {

    address immutable public pool;
    address immutable spc;

    event LiquidityAdded(address indexed sender, uint ethAmount, uint spcAmount);
    event LiquidityRemoved(address indexed sender, uint ethAmount, uint spcAmount);

    constructor(address _spc, address _pool) {
        spc = _spc;
        pool = _pool;
    }

    function addLiquidity() payable external {

    }

    function removeLiquidity() external {

    }

    function swap() external {

    }

}