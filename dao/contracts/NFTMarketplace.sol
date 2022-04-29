//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract NftMarketplace {
    // NFT ID => Purchased. set to purchased when bought
    mapping(uint256 => bool) public purchasedNFTs;

    // function getPrice(address nftContract, uint256 nftId)
    function getPrice(address nftContract, uint256 nftId)
        external pure
        returns (uint256)
    {
        return 42;
    }

    // function buy(address nftContract, uint256 nftId)
    function buy(uint256 nftId) external payable {
        console.log('here');
        console.log(nftId);
        purchasedNFTs[nftId] = true;
    }
}