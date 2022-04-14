//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "./Project.sol";
import "hardhat/console.sol";

contract ProjectFactory {
    Project[] public projects;

    event ProjectCreated(address project, uint goal, address creator);

    function create(uint _goal) external {

        Project project = new Project(_goal, msg.sender);
        projects.push(project);

        emit ProjectCreated(address(project), _goal, msg.sender);
    }

    function getProjects() external view returns (Project[] memory) {
        return projects;
    }
}
