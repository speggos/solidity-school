//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


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
            super._transfer(_from, _to, _amount/100*98);
            super._transfer(_from, treasury, _amount/100*2);

        } else {
           super. _transfer(_from, _to, _amount);
        }
    }

    function claimFromICO(address _addr, uint _amount) external  {
        require (msg.sender == icoContract, "Not ICO Contract");
        _transfer(treasury, _addr, _amount);
    }
}

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
    uint constant SPCPerETH = 5;

    mapping (address => bool) public whitelist;
    mapping (address => uint) public investors;

    Phase public currentPhase = Phase.SEED;
    bool public paused = false;
    uint public totalInvestment = 0;
    address owner;
    address tokenContract;

    event Invested(address, uint);
    event Pause(bool);
    event NextPhase(Phase);
    event Claimed(address, uint);

    modifier onlyOwner {
        require (msg.sender == owner, "Not Owner");
        _;
    }

    constructor(address _tokenContract) {
        owner = msg.sender;
        tokenContract = _tokenContract;
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

        emit Claimed(msg.sender, invested * 5);

        (bool success, ) = tokenContract.call(abi.encodeWithSignature("claimFromICO(address,uint256)",msg.sender,invested*5));
        require (success, "Mint unsuccessful");
    }

    function checkEligibility() internal view {
        if (currentPhase == Phase.SEED) {
            require(whitelist[msg.sender] == true, "Not Whitelisted");
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
}