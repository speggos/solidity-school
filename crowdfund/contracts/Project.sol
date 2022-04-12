//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

/*
- The smart contract is reusable; multiple projects can be registered and accept ETH concurrently.
  - Specifically, you should use the factory contract pattern.
- The goal is a preset amount of ETH.
  - This cannot be changed after a project gets created.
- Regarding contributing:
  - The contribute amount must be at least 0.01 ETH.
  - There is no upper limit.
  - Anyone can contribute to the project, including the creator.
  - One address can contribute as many times as they like.
  - No one can withdraw their funds until the project either fails or gets cancelled.
- Regarding contributer badges:
  - An address receives a badge if their total contribution is at least 1 ETH.
  - One address can receive multiple badges, but should only receive 1 badge per 1 ETH.
  - Each project should use its own NFT contract.
- If the project is not fully funded within 30 days:
  - The project goal is considered to have failed.
  - No one can contribute anymore.
  - Supporters get their money back.
  - Contributor badges are left alone. They should still be tradable.
- Once a project becomes fully funded:
  - No one else can contribute (however, the last contribution can go over the goal).
  - The creator can withdraw any amount of contributed funds.
- The creator can choose to cancel their project before the 30 days are over, which has the same effect as a project failing.

*/

contract Project {
    uint public goal;
    uint public contributed;
    address public creator;
    uint public creationTime;
    bool projectCancelled = false;
    mapping (address => uint) public contributors;

    event ProjectGoalPassed();

    // Like constructor. Initialize the contract with the goal
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
