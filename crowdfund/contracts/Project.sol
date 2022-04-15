//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";

contract Project is ERC721 {
    uint public goal;
    uint public contributed;
    address public creator;
    uint public creationTime;
    bool projectCancelled = false;
    bool projectSuccess = false;
    uint public nftsMinted = 0;
    mapping (address => uint) public contributors;

    event Contribution(address contributor, uint amount);
    event ProjectSuccess(uint totalContribution);
    event CreatorClaim(uint amountInEther);
    event RefundIssued(address contributor, uint amount);
    event ProjectCancelled();

    constructor (uint _goal, address _creator) ERC721("ProjectNFT", "PNFT") {
        goal = _goal;
        creator = _creator;
        creationTime = block.timestamp;
    }

    function contribute() external payable {
        require (msg.value >= 0.01 ether, "Minimum contribution is 0.01 ETH");
        require (contributed / 10**18 < goal, "Funding goal already reached");
        require ((block.timestamp - creationTime) < 30 days, ">30 days has passed");
        
        uint val = msg.value;
        contributors[msg.sender] += val;
        contributed += val;

        bool firstPass = true;

        while (val >= 1 ether || (contributors[msg.sender] >= 1 ether && firstPass)  ) {
            _mint(msg.sender, nftsMinted);
            nftsMinted++;
            if (val < 1 ether) break;
            val-= 1 ether;
            firstPass = false;
        }

        if (contributed > goal * 10**18) {
            projectSuccess = true;
            emit ProjectSuccess(contributed);
        }

        emit Contribution(msg.sender, msg.value);
    }

    function creatorClaim(uint _amountInEther) external {
        require (msg.sender == creator, "Only project creator can claim");
        require (contributed/ 10**18 > goal || projectSuccess, "Project funding goal not reached");
        require (_amountInEther * 10**18 <= contributed, "Cannot claim more than contributed");
        require (!projectCancelled, "Project cancelled. Cannot claim");

        payable(msg.sender).transfer(_amountInEther * 10**18);
        contributed -= _amountInEther * 10**18;

        emit CreatorClaim(_amountInEther);
    }

    function withdrawFromFailedProject() external {
        require (contributors[msg.sender] > 0, "You did not contribute");
        require ((block.timestamp - creationTime) > 30 days || projectCancelled , "30 days have not passed");
        require (goal > contributed / 10**18 || projectCancelled, "Project succeeded. Not claimable");

        uint _contributedAmount = contributors[msg.sender];

        contributors[msg.sender] = 0;
        payable(msg.sender).transfer(_contributedAmount);

        emit RefundIssued(msg.sender, _contributedAmount);
    }

    function cancelProject() external {
        require (msg.sender == creator, "Only creator can cancel");
        require ((block.timestamp - creationTime) < 30 days, "Cannot cancel after 30 days");
        projectCancelled = true;

        emit ProjectCancelled();
    }

    function getContributors(address _addr) public view returns (uint) {
        return contributors[_addr];
    }
}
