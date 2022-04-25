//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract DAO {

    mapping (address => bool) public members;

    function buyMembership() external payable {
        require (msg.value == 1 ether, "Not 1ETH");
        require (members[msg.sender] == false, "Already member");
        members[msg.sender] = true;
    }

}
