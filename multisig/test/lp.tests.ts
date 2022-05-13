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
    await spc.approve(await router.address, ethers.constants.MaxInt256);
    await spc.connect(alice).approve(await router.address, ethers.constants.MaxInt256);

  });
  describe.only("General Tests", async() => {
    beforeEach(async() => {
      console.log((await ethers.getSigners())[0]);
  
      await ico.progressPhase();
      await ico.progressPhase();
      await ico.connect(a).invest({value: toEther(30000)});
      await spc.setICOContract(ico.address);
    }); 
    it("Deploys a contract", async() => {
      expect(await spc.icoContract()).to.equal(ico.address);
    });
    it("Allows ICO funds to be withdrawn by deployer", async() => {
      await expect(ico.withdrawIcoProceeds(ethers.constants.AddressZero)).to.be.ok;
      expect(await provider.getBalance(ethers.constants.AddressZero)).to.equal(toEther(30000));
    });
  });

  describe("Add Liquidity", async() => {
    beforeEach(async () => {
      await spc.connect(alice).approve(await router.address, ethers.constants.MaxInt256);
      
      await spc.connect(treasury).transfer(deployer.address, toEther(1000));
      await spc.connect(treasury).transfer(alice.address, toEther(1000));
    });
    it("Requires allowance to spend SPC tokens when adding liquidity", async() => {
      await expect(router.connect(bob).addLiquidity(toEther(5))).to.revertedWith("Not enough allowance");
      await expect(router.connect(alice).addLiquidity(toEther(5))).to.be.ok;
    });
    it("Allows liquidity to be added", async() => {
      expect(await pool.totalSupply()).to.equal(0);
      await router.addLiquidity(toEther(5), {value: toEther(1)});
      expect(await pool.totalSupply()).to.equal( sqrt(toEther(5).mul(toEther(1))));
      expect(await spc.balanceOf(pool.address)).to.equal( toEther(5));
      expect(await provider.getBalance(pool.address)).to.equal( toEther(1));
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
  describe("RemoveLiquidity", async() => {
    beforeEach(async() => {
      await spc.connect(alice).approve(await router.address, ethers.constants.MaxInt256);
      
      await spc.connect(treasury).transfer(deployer.address, toEther(1000));
      await spc.connect(treasury).transfer(alice.address, toEther(1000));
      expect(await pool.totalSupply()).to.equal(0);
      await router.connect(alice).addLiquidity(toEther(10), {value: toEther(2)});
      expect(await pool.balanceOf(alice.address)).to.equal(sqrt(toEther(10).mul(toEther(2))));
    });
    it("Withdraws the correct amount of liquidity", async() => {
      await router.connect(alice).removeLiquidity(sqrt(toEther(5).mul(toEther(1))));
      expect(await pool.balanceOf(alice.address)).to.equal(sqrt(toEther(5).mul(toEther(1))));
      expect(await pool.totalSupply()).to.equal(sqrt(toEther(5).mul(toEther(1))));
      await router.connect(alice).removeLiquidity(sqrt(toEther(5).mul(toEther(1))));
      expect(await pool.balanceOf(alice.address)).to.equal(0);
      expect(await pool.totalSupply()).to.equal(0);
    });
    it("Does not allow non-lp holders to withdraw", async() => {
      await expect(router.connect(bob).removeLiquidity(1)).to.revertedWith("ERC20: burn");
    });
    it("Does not allow users to withdraw 0", async() => {
      await expect(router.connect(alice).removeLiquidity(0)).to.revertedWith("Must remove >0");
    });
    it("Withdraws the correct amount of funds when users brute force funds into the contract", async() => {
      expect(await provider.getBalance(pool.address)).to.equal(toEther(2));
      await bob.sendTransaction({to: pool.address, value: toEther(2)});
      expect(await provider.getBalance(pool.address)).to.equal(toEther(4));
      expect(await spc.balanceOf(pool.address)).to.equal(toEther(10));
      await router.connect(alice).removeLiquidity( sqrt(toEther(5).mul(toEther(1))) );
      expect(await provider.getBalance(pool.address)).to.equal(toEther(2));
      expect(await spc.balanceOf(pool.address)).to.equal(toEther(5));    
    });
    it("Emits a LiquidityRemoved event", async() => {
      expect(await router.addLiquidity(toEther(5), {value: toEther(1)})).to.emit(router, "LiquidityRemoved");
    });
    it("Returns the correct amount of ETH and SPC to the owner", async() => {
      const aliceSpcBefore = await spc.balanceOf(alice.address);

      await router.connect(alice).removeLiquidity(sqrt(toEther(5).mul(toEther(1))));
      expect(await spc.balanceOf(pool.address)).to.equal( toEther(5));
      expect(await provider.getBalance(pool.address)).to.equal( toEther(1));
      expect(await spc.balanceOf(alice.address)).to.equal(aliceSpcBefore.add(toEther(5)));

      await router.connect(alice).removeLiquidity(sqrt(toEther(5).mul(toEther(1))));
      expect(await spc.balanceOf(pool.address)).to.equal( 0 );
      expect(await provider.getBalance(pool.address)).to.equal( 0 );
      expect(await spc.balanceOf(alice.address)).to.equal(aliceSpcBefore.add(toEther(10)));
    });
  });
  describe("Swap", async() => {
    const k: BigNumber = ethers.BigNumber.from(BigInt(2*10*Math.pow(10,37)));
    beforeEach(async() => {            
      await spc.connect(treasury).transfer(deployer.address, toEther(1000));
      await spc.connect(treasury).transfer(alice.address, toEther(1000));

      await expect(router.connect(alice).swap(toEther(10), 0)).to.revertedWith("No liquidity in pool");
      await expect(router.connect(alice).swap(0, 0, {value: toEther(10)})).to.revertedWith("No liquidity in pool");

      await router.addLiquidity(toEther(10), {value: toEther(2)});
    });
    it("Requires allowance to spend SPC tokens when swapping", async() => {
      await expect(router.connect(bob).swap(toEther(5), 0)).to.revertedWith("Not enough allowance");
    });
    it("Allows multiple swaps for SPC->ETH and ETH->SPC at the correct amount including tax", async() => {
      const aliceSpcBefore = await spc.balanceOf(alice.address);
      await router.connect(alice).swap(toEther(1), 0);

      expect(await spc.balanceOf(alice.address)).to.equal(aliceSpcBefore.sub(toEther(1)));
      expect(await spc.balanceOf(pool.address)).to.equal(toEther(11));
      expect(await provider.getBalance(pool.address)).to.equal(ethers.BigNumber.from("1836547291092745638"));

      await router.connect(alice).swap(0, 0, {value: toEther(0.2)});
      const spcBack = ethers.BigNumber.from("980060320036873379");
      expect(await spc.balanceOf(alice.address)).to.equal(aliceSpcBefore.sub(toEther(1)).add(spcBack));
      expect(await spc.balanceOf(pool.address)).to.equal(toEther(11).sub(spcBack));
      expect(await provider.getBalance(pool.address)).to.equal(ethers.BigNumber.from("1836547291092745638").add(toEther(0.2)));
    });
    it("Emits a swap event", async() => {
      await expect(await router.connect(alice).swap(toEther(1), 0)).to.emit(router, "Swapped");
    });
    it("Does not allow swapping ETH and SPC in the same transaction", async() => {
      await expect(router.connect(alice).swap(toEther(1), toEther(0.01), {value: toEther(0.1)})).to.revertedWith("Must supply only spc OR eth");
    });
    it("Reverts transactions that are above slippage", async() => {
      await expect( router.connect(alice).swap(toEther(10), toEther(2))).to.revertedWith("Too much slippage");
    });
  })
});