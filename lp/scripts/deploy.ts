// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { getDefaultProvider, Wallet } from "ethers";
import { ethers } from "hardhat";
import { env } from "process";
import { SpaceToken } from "../typechain";

async function main() {
  //@ts-ignore
  const deployer = new ethers.Wallet(`${DEV_PRIVATE_KEY}`, getDefaultProvider());

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

    const SPC = await ethers.getContractFactory("SpaceToken");
    const spc = await SPC.deploy("0xc17a940D94F549a9A236E13602d25e2eb6EFEac1");
    await spc.deployed();
    console.log("spc: " + spc.address);

    const Pool = await ethers.getContractFactory("Pool");
    const pool = await Pool.deploy(spc.address);
    await pool.deployed();
    console.log("pool: " + pool.address);

    const Router = await ethers.getContractFactory("Router");
    const router = await Router.deploy(spc.address, pool.address);
    await router.deployed();
    console.log("router: " + router.address);

    const ICO = await ethers.getContractFactory("ICO");
    const ico = await ICO.deploy(spc.address, router.address);
    await ico.deployed()
    console.log("ico: " + ico.address);

    pool.setRouter(router.address);
    await spc.approve(await router.address, ethers.constants.MaxInt256);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});