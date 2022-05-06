//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SpaceToken.sol";

contract Pool is ERC20 {

    uint public ethBalance;
    uint public spcBalance;

    address public router;
    address immutable owner;
    address immutable spc;

    constructor(address _spc) ERC20("SpaceTokenLP", "SPCLP") {
        owner = msg.sender;
        spc = _spc;
    }

    modifier onlyRouter() {
        require (msg.sender == router, "Only Router");
        _;
    }

    function setRouter(address _router) external {
        require(msg.sender == owner, "Not owner");
        SpaceToken(spc).approve(_router, 2**256-1);
        router = _router;
    }

    function updateBalances() public {
        ethBalance = address(this).balance;
        spcBalance = SpaceToken(spc).balanceOf(address(this));
    }

    function mintTokens(address to, uint amount) payable external onlyRouter {
        _mint(to, amount);
    }

    function burnTokens(address from, uint amount) payable external onlyRouter {
        _burn(from, amount);
    }

    //TODO remove after making another external function
    receive() external payable {}

}