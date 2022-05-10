//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Router.sol";

contract ICO {

  enum Phase {
        SEED,
        GENERAL,
        OPEN
    }
    
    uint constant SEED_ALLOCAITON = 15000 ether;
    uint constant SEED_INDIVIDUAL_LIMIT = 1500 ether;
    uint constant GENERAL_INDIVIDUAL_LIMIT = 1000 ether;
    uint constant TOTAL_LIMIT = 30000 ether;
    uint constant SPC_PER_ETH = 5;

    uint public totalInvestment = 0;

    mapping (address => bool) public whitelist;
    mapping (address => uint) public investors;

    Phase public currentPhase = Phase.SEED;
    bool public paused = false;
    address owner;
    address tokenContract;
    address router;

    event Invested(address, uint);
    event Pause(bool);
    event NextPhase(Phase);
    event Claimed(address, uint);

    modifier onlyOwner {
        require (msg.sender == owner, "Not Owner");
        _;
    }

    constructor(address _tokenContract, address _router) {
        require(_tokenContract != address(0), "Token contract not set");
        owner = msg.sender;
        tokenContract = _tokenContract;
        router = _router;
    }

    function progressPhase() public onlyOwner {
        if (currentPhase == Phase.SEED) {
            currentPhase = Phase.GENERAL;
        } else if (currentPhase == Phase.GENERAL) {
            currentPhase = Phase.OPEN;
        } else {
            revert ("Already Open");
        }
        emit NextPhase(currentPhase);
    }

    function addToWhitelist(address _addr) onlyOwner external {
        whitelist[_addr] = true;
    }

    function invest() payable external {
        require(!paused, "Paused");
        require(msg.value>0, "Must invest ether");
        checkEligibility();

        emit Invested(msg.sender, msg.value);

        investors[msg.sender] += msg.value;
        totalInvestment += msg.value;
    }

    function claimTokens() external {
        require(currentPhase == Phase.OPEN, "Not Open");
        uint invested = investors[msg.sender];
        
        require(invested > 0, "Did not invest");

        investors[msg.sender] = 0;

        emit Claimed(msg.sender, invested * SPC_PER_ETH);

        (bool success, ) = tokenContract.call(abi.encodeWithSignature("claimFromICO(address,uint256)",msg.sender,invested*SPC_PER_ETH));
        require (success, "Mint unsuccessful");
    }

    function checkEligibility() internal view {
        if (currentPhase == Phase.SEED) {
            require(whitelist[msg.sender], "Not Whitelisted");
            require(investors[msg.sender] + msg.value <= SEED_INDIVIDUAL_LIMIT, "Investment too high");
            require(totalInvestment + msg.value <= SEED_ALLOCAITON, "Round Funded");
        } else if (currentPhase == Phase.GENERAL) {
            require(investors[msg.sender] + msg.value <= GENERAL_INDIVIDUAL_LIMIT, "Investment too high");
            require(totalInvestment + msg.value <= TOTAL_LIMIT, "ICO Funded");
        } else {
            require(totalInvestment + msg.value <= TOTAL_LIMIT, "ICO Funded");
        }
    }

    function setPause(bool _val) public onlyOwner {
        emit Pause(_val);
        paused = _val;
    }

    function withdrawIcoProceeds(address recipient) external onlyOwner {
        uint ethBalance = address(this).balance;
        (bool success, ) = recipient.call{value: ethBalance}("");
        require (success, "ICO: Error withdrawing proceeds");
    }
}