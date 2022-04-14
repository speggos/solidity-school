//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";


contract Project {
    uint public goal;
    uint public contributed;
    address public creator;
    uint public creationTime;
    bool projectCancelled = false;
    mapping (address => uint) public contributors;

    event ProjectGoalPassed();

    constructor (uint _goal, address _creator) {
        goal = _goal;
        creator = _creator;
        creationTime = block.timestamp;
    }

    function contribute() external payable {
        require (msg.value >= 0.01 ether, "Minimum contribution is 0.01 ETH");
        require (contributed < goal, "Funding goal already reached");
        require ((block.timestamp - creationTime) < 30 days, ">30 days has passed");
        
        // TODO give NFT
        contributors[msg.sender] += msg.value;
        contributed += msg.value;
    }

    function creatorClaim(uint _amount) external {
        require (msg.sender == creator, "Only project's creator can claim");
        require (contributed > goal, "Project funding goal not reached");
        require (_amount <= contributed, "Cannot claim more than contributed");
        require (!projectCancelled, "Project cancelled. Cannot claim");

        payable(msg.sender).transfer(_amount);
    }

    function withdrawFromFailure() external {
        require (contributors[msg.sender] > 0, "You did not contribute");
        require ((block.timestamp - creationTime) > 30 days || projectCancelled , "30 days have not passed");
        require (goal < contributed || projectCancelled, "Project succeeded. Not claimable");

        uint _contributedAmount = contributors[msg.sender];

        contributors[msg.sender] = 0;
        payable(msg.sender).transfer(_contributedAmount);
    }

    function cancelProject() external {
        require (msg.sender == creator, "Only creator can cancel");
        require ((block.timestamp - creationTime) < 30 days, "Cannot cancel after 30 days");
        projectCancelled = true;
    }
}
