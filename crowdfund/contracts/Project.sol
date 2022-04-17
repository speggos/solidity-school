//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";

contract Project is ERC721 {
    uint256 public goal;
    uint256 public contributed;
    address public creator;
    uint256 public creationTime;
    bool projectCancelled = false;
    bool projectSuccess = false;
    uint256 public nftsMinted = 0;
    mapping(address => uint256) public contributors;
    mapping (address => uint256) public NFTsPerContributor;

    uint constant ETH_TO_WEI = 10**18;
    uint constant MIN_CONTRIBUTION = 0.01 ether;

    event Contribution(address contributor, uint256 amount);
    event ProjectSuccess(uint256 totalContribution);
    event CreatorClaim(uint256 amount);
    event RefundIssued(address contributor, uint256 amount);
    event ProjectCancelled();

    constructor(uint256 _goal, address _creator) ERC721("ProjectNFT", "PNFT") {
        goal = _goal;
        creator = _creator;
        creationTime = block.timestamp;
    }

    function contribute() external payable {
        require(msg.value >= MIN_CONTRIBUTION, "Minimum contribution is 0.01 ETH");
        require(contributed < goal, "Funding goal already reached");
        require(
            (block.timestamp - creationTime) < 30 days,
            ">30 days has passed"
        );

        contributors[msg.sender] += msg.value;
        contributed += msg.value;

        uint supporterContributions = contributors[msg.sender];
        uint flooredContributions = (supporterContributions - (supporterContributions % 1 ether)) / 1 ether;
        while (NFTsPerContributor[msg.sender] < flooredContributions) {
            _safeMint(msg.sender, nftsMinted);
            nftsMinted++;
            NFTsPerContributor[msg.sender]++;
        }

        if (contributed > goal) {
            projectSuccess = true;
            emit ProjectSuccess(contributed);
        }

        emit Contribution(msg.sender, msg.value);
    }

    function creatorClaim(uint256 _amount) external {
        require(msg.sender == creator, "Only project creator can claim");
        require(
            contributed > goal || projectSuccess,
            "Project funding goal not reached"
        );
        require(
            _amount <= contributed,
            "Cannot claim more than contributed"
        );
        require(!projectCancelled, "Project cancelled. Cannot claim");

        contributed -= _amount;
        emit CreatorClaim(_amount);

        payable(msg.sender).transfer(_amount);    }

    function withdrawFromFailedProject() external {
        require(contributors[msg.sender] > 0, "You did not contribute");
        require(
            (block.timestamp - creationTime) > 30 days,
            "30 days have not passed"
        );
        require (!projectCancelled, "Project Cancelled");
        require(
            goal > contributed || projectCancelled,
            "Project succeeded. Not claimable"
        );

        uint256 _contributedAmount = contributors[msg.sender];

        contributors[msg.sender] = 0;
        payable(msg.sender).transfer(_contributedAmount);

        emit RefundIssued(msg.sender, _contributedAmount);
    }

    function cancelProject() external {
        require(msg.sender == creator, "Only creator can cancel");
        require(
            (block.timestamp - creationTime) < 30 days,
            "Cannot cancel after 30 days"
        );
        projectCancelled = true;

        emit ProjectCancelled();
    }

    function getContributors(address _addr) public view returns (uint256) {
        return contributors[_addr];
    }
}
