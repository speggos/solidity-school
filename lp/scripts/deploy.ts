// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { SpaceToken } from "../typechain";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory("SpaceToken");
  const token: SpaceToken = await Token.deploy('0x77E9ABa65D1C76F6c17dB182d53462CEb6726162');
  await token.deployed();
  console.log("Token address:", token.address);

  const ICO = await ethers.getContractFactory("ICO");
  const ico = await ICO.deploy(token.address);
  await ico.deployed();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});