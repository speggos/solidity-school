//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract SpaceToken is ERC20 {
    address owner;
    address treasury;
    address public icoContract;

    bool public taxTransfers = false;

    modifier onlyOwner {
        require (msg.sender == owner, "Not Owner");
        _;
    }

    constructor(address _treasury) ERC20 ("SpaceToken", "SPC") {
        require(_treasury != address(0), "Treasury not set");
        owner = msg.sender;
        treasury = _treasury;
        _mint(treasury, 500000*(10**18));
    }

    function setICOContract(address _addr) external onlyOwner {
        icoContract = _addr;
    }

    function setTax(bool _shouldTax) public onlyOwner {
        taxTransfers = _shouldTax;
    }

    function _transfer(address _from, address _to, uint256 _amount) internal override {
        if (taxTransfers && _from != treasury) {
            super._transfer(_from, _to, _amount*98/100);
            super._transfer(_from, treasury, _amount*2/100);
        } else {
           super. _transfer(_from, _to, _amount);
        }
    }

    function claimFromICO(address _addr, uint _amount) external  {
        require (msg.sender == icoContract, "Not ICO Contract");
        _transfer(treasury, _addr, _amount);
    }
}