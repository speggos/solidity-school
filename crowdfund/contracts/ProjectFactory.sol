//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./Project.sol";

contract ProjectFactory {
    Project[] private projects;
    address private masterContract;

    event ProjectCreated(address newProject, uint goal); // Note: you should add additional data fields in this event

    function create(uint _goal) external {
        Project newProject = new Project(_goal, msg.sender);
        projects.push(newProject);

        emit ProjectCreated(address(newProject), _goal);
    }
}
