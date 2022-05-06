import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";
import { ICO, SpaceToken, Pool, Router, ICO__factory, SpaceToken__factory, Pool__factory, Router__factory } from "../typechain";
const provider = waffle.provider;

function toEther(n: number) {
  return ethers.utils.parseEther( n.toString() );
}

describe("ICO Assignment", function () {

  let ICO: ICO__factory
  let ico: ICO

  let SPC: SpaceToken__factory
  let spc: SpaceToken

  let Pool: Pool__factory;
  let pool: Pool;

  let Router: Router__factory;
  let router: Router;
  
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let treasury: SignerWithAddress;

  // Declare 10 other signers, to fill investment rounds;
  let a: SignerWithAddress,b: SignerWithAddress,c: SignerWithAddress,d: SignerWithAddress,e: SignerWithAddress;
  let f: SignerWithAddress,g: SignerWithAddress,h: SignerWithAddress,i: SignerWithAddress,j: SignerWithAddress;

  beforeEach(async () => {
    [deployer, alice, bob, treasury,a,b,c,d,e,f,g,h,i,j] = await ethers.getSigners();

    SPC = await ethers.getContractFactory("SpaceToken");
    spc = await SPC.deploy(treasury.address);
    await spc.deployed();

    Pool = await ethers.getContractFactory("Pool");
    pool = await Pool.deploy(spc.address);
    await pool.deployed();

    Router = await ethers.getContractFactory("Router");
    router = await Router.deploy(spc.address, pool.address);
    await router.deployed();

    ICO = await ethers.getContractFactory("ICO");
    ico = await ICO.deploy(spc.address, router.address);
    await ico.deployed()

    pool.setRouter(router.address);
  });

  describe("Withdraw", async() => {
    it("Deploys a contract", async() => {
      expect(await spc.icoContract()).to.equal(ethers.constants.AddressZero);
      await spc.setICOContract(ico.address);  
      expect(await spc.icoContract()).to.equal(ico.address);
    });

  describe.only("General Tests", async() => {
    it("Updates balances when tokens/eth are transferred", async() => {
      expect(await provider.getBalance(pool.address)).to.equal(0);
      expect(await spc.balanceOf(pool.address)).to.equal(0);
      expect(await pool.ethBalance()).to.equal(0);
      expect(await pool.spcBalance()).to.equal(0);

      await alice.sendTransaction({value: toEther(1), to: await pool.address});
      await spc.connect(treasury).transfer(pool.address, toEther(2));

      expect(await provider.getBalance(pool.address)).to.equal(toEther(1));
      expect(await spc.balanceOf(pool.address)).to.equal(toEther(2));
      expect(await pool.ethBalance()).to.equal(0);
      expect(await pool.spcBalance()).to.equal(0);

      await pool.updateBalances();

      expect(await pool.ethBalance()).to.equal(toEther(1));
      expect(await pool.spcBalance()).to.equal(toEther(2));

      await alice.sendTransaction({value: toEther(0.1), to: await pool.address});
      await spc.connect(treasury).transfer(pool.address, toEther(0.2));
      await pool.updateBalances();

      expect(await pool.ethBalance()).to.equal(toEther(1.1));
      expect(await pool.spcBalance()).to.equal(toEther(2.2));
    });
  });

  });
});