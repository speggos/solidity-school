//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract DAO {

    uint8 constant QUORUM_PERCENT = 25;
    uint constant MAX_PRICE = 100 ether;
    uint constant MAX_VOTE_DURATION = 7 days;
    uint constant MIN_EXECUTION_DURATION = 4 days;
    uint public memberCount = 0;


    mapping (address => bool) public members;
    mapping (uint => Proposal) public proposals;

    event ProposalCreated(uint proposalId, address creator, address[] targets, uint[] values, bytes[] calldatas, string description);
    event ProposalExecuted(uint proposalId, address executor);
    event NewMember(address member);
    event Vote(uint proposal, address voter);

    struct Proposal {
        bool executed;
        uint32 votesFor;
        uint32 votesAgainst;
        uint createdAt;
        mapping(address => bool) votes;
    }

    modifier onlyMembers() {
        require (members[msg.sender], "Not a member");
        _;
    }

    modifier canBeVotedOn(uint proposalId) {
        require(proposals[proposalId].votesFor != 0, "Not proposed");
        require(block.timestamp < proposals[proposalId].createdAt + MAX_VOTE_DURATION, "Past deadline");
        require(!proposals[proposalId].executed, "Already executed");
        _;
    }

    modifier notPastDeadline(uint proposalId) {
        _;
    }

    function getSignerAddress(bytes32 _signedMessageHash, bytes memory _sig) internal pure returns(address) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(_sig, 32))
            s := mload(add(_sig, 64))
            v := byte(0, mload(add(_sig, 96)))
        }
        return ecrecover(_signedMessageHash, v, r, s);
    }

    function verifySignature(address _signer, string memory _message, bytes calldata _sig) internal view returns(bool) {
        require (_sig.length == 65, "invalid signature length");
        bytes32 messageHash = keccak256(abi.encodePacked(_message));
        bytes32 signedMessageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));

        return getSignerAddress(signedMessageHash, _sig) == _signer;
    }

    function uintToString(uint256 value) internal pure returns (string memory) {
    
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function batchVoteWithSigs(uint proposalId, address[] calldata addresses, bytes[] calldata sigs) canBeVotedOn(proposalId) external {
        Proposal storage proposal = proposals[proposalId];
                        
        require (sigs.length == addresses.length, "Bytes.length != Addresses.length");

        for (uint i=0; i<sigs.length; i++) {
            if (verifySignature(addresses[i], uintToString(proposalId), sigs[i])) {

                require(members[addresses[i]], "Not a member");
                require(!proposal.votes[addresses[i]], "Already voted");

                emit Vote(proposalId, addresses[i]);
                proposal.votesFor++;
                proposal.votes[addresses[i]] = true;
            } else {
                revert("Invalid signature");
            }
        }
    }

    function vote(uint proposalId, bool support) external onlyMembers() canBeVotedOn(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.votes[msg.sender], "Already voted");

        emit Vote(proposalId, msg.sender);
        proposal.votes[msg.sender] = true;
        if (support) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }
    }

    function propose(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        string calldata description
    ) external onlyMembers() returns (uint) {
        require(targets.length == values.length, "Invalid proposal length");
        require(targets.length == calldatas.length, "Invalid proposal length");
        require(targets.length > 0, "Empty proposal");

        for(uint i=0; i<values.length; i++) {
            require(values[i] < MAX_PRICE, "Max bid 100ETH");
        }

        uint proposalId = hashProposal(targets, values, calldatas, keccak256(bytes(description)));
        Proposal storage proposal = proposals[proposalId];
        require(proposal.votesFor == 0, "Proposal already exists");
        emit ProposalCreated(proposalId, msg.sender, targets, values, calldatas, description);
        proposal.votes[msg.sender] = true;
        proposal.votesFor++;
        proposal.createdAt = block.timestamp;
        return proposalId;
    }

    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal pure returns (uint) {
        return uint(keccak256(abi.encode(targets,values,calldatas,descriptionHash)));
    }

    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) external {
        uint proposalId = hashProposal(targets, values, calldatas, keccak256(bytes(description)));
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.createdAt + MIN_EXECUTION_DURATION, "Must wait >=4 days");
        require(proposal.votesFor > 0, "Not proposed");
        require(!proposal.executed, "Proposal already executed");
        proposal.executed = true;
        require(memberCount / (proposal.votesFor + proposal.votesAgainst) < 100 / QUORUM_PERCENT, "Quorum not reached");
        require(proposal.votesFor > proposal.votesAgainst, "Majority voted against");
        require(proposalId == hashProposal(targets, values, calldatas, keccak256(bytes(description))), "Targets/Values/Calldata incorrect");
        for (uint i=0; i<targets.length; i++) {
            require(values[i] < MAX_PRICE, "Max value 100ETH");
            require(values[i] < address(this).balance, "Insufficient ETH");
            (bool success, ) = targets[i].call{value: values[i]}(calldatas[i]);
            require(success, "Call failed");
        }

        emit ProposalExecuted(proposalId, msg.sender);

    }

    function buyMembership() external payable {
        require (msg.value == 1 ether, "Not 1ETH");
        require (members[msg.sender] == false, "Already member");

        emit NewMember(msg.sender);
        members[msg.sender] = true;
        memberCount++;
    }
}
