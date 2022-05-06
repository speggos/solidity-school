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

const ONE = ethers.BigNumber.from(1);
const TWO = ethers.BigNumber.from(2);
/// @dev Calculate square root
function sqrt(value: BigNumber) {
  let x = ethers.BigNumber.from(value);
  let z = x.add(ONE).div(TWO);
  let y = x;
  while (z.sub(y).isNegative()) {
      y = z;
      z = x.div(z).add(z).div(TWO);
  }
  return y;
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
  describe("General Tests", async() => {
    beforeEach(async() => {
      await ico.progressPhase();
      await ico.progressPhase();
      await ico.connect(a).invest({value: toEther(30000)});
      await spc.setICOContract(ico.address);
    }); 
    it("Deploys a contract", async() => {
      expect(await spc.icoContract()).to.equal(ico.address);
    });
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
    it("Allows ICO funds to be added to the LP pool by deployer", async() => {
      await expect(ico.addToLpPool()).to.be.ok;
      expect(await pool.balanceOf(ico.address)).to.equal( sqrt(toEther(30000).mul(toEther(150000))));
    });
  });

  describe("Add Liquidity", async() => {
    beforeEach(async () => {
      await spc.approve(await router.address, ethers.constants.MaxInt256);
      await spc.connect(alice).approve(await router.address, ethers.constants.MaxInt256);
      
      await spc.connect(treasury).transfer(deployer.address, toEther(1000))
      await spc.connect(treasury).transfer(alice.address, toEther(1000))
    })
    it("Allows liquidity to be added", async() => {
      expect(await pool.totalSupply()).to.equal(0);
      await router.addLiquidity(toEther(5), {value: toEther(1)});
      expect(await pool.totalSupply()).to.equal( sqrt(toEther(5).mul(toEther(1))));
    });
    it("Does not allow users to supply zero eth or spc", async() => {
      await expect(router.addLiquidity(toEther(5),{value: 0})).to.revertedWith("Insufficient liquidity added");
      await expect(router.addLiquidity(toEther(0),{value: 1})).to.revertedWith("Insufficient liquidity added");
      await expect(router.addLiquidity(toEther(0),{value: 0})).to.revertedWith("Insufficient liquidity added");
    });
    it("Calculates the correct liquidity to add with multiple add liquidity events", async() => {
      await router.addLiquidity(toEther(5), {value: toEther(1)});
      await router.addLiquidity(toEther(5), {value: toEther(1)});
      expect(await pool.totalSupply()).to.equal( sqrt(toEther(10).mul(toEther(2))) );
      await router.addLiquidity(toEther(1), {value: toEther(0.2)});
      expect(await pool.totalSupply()).to.equal( sqrt(toEther(11).mul(toEther(2.2))).sub(1) );
      await router.connect(alice).addLiquidity(toEther(1), {value: toEther(0.2)});
      expect(await pool.totalSupply()).to.equal( sqrt(toEther(12).mul(toEther(2.4))).sub(1) );
      expect(await pool.balanceOf(deployer.address)).to.equal(sqrt(toEther(11).mul(toEther(2.2))).sub(1));
      expect(await pool.balanceOf(alice.address)).to.equal( sqrt(toEther(12).mul(toEther(2.4))).sub(sqrt(toEther(11).mul(toEther(2.2)))));
    });
    it("Gives the minimum number of tokens when user sends tokens in the incorrect ratio", async() => {
      await router.addLiquidity(toEther(5), {value: toEther(1)});
      await router.addLiquidity(toEther(10), {value: toEther(1)});
      expect(await pool.totalSupply()).to.equal( sqrt(toEther(10).mul(toEther(2))));
      await router.addLiquidity(toEther(7.5), {value: toEther(5)});
      expect(await pool.totalSupply()).to.equal( sqrt(toEther(15).mul(toEther(3))).sub(1));
    });
    it("Gives the correct number of LP Tokens to multiple users", async() => {
      await router.addLiquidity(toEther(5), {value: toEther(1)});
      await router.connect(alice).addLiquidity(toEther(5), {value: toEther(1)});
      expect(await pool.balanceOf(deployer.address)).to.equal(sqrt(toEther(5).mul(toEther(1))));
      expect(await pool.balanceOf(alice.address)).to.equal(sqrt(toEther(5).mul(toEther(1))));
      await router.connect(alice).addLiquidity(toEther(5), {value: toEther(1)});
      expect(await pool.balanceOf(alice.address)).to.equal(sqrt(toEther(10).mul(toEther(2))));
    });
    it("Emits a LiquidityAdded event", async() => {
      expect(await router.addLiquidity(toEther(5), {value: toEther(1)})).to.emit(router, "LiquidityAdded");
    });
  });
});