import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";
import { ICO, SpaceToken } from "../typechain";

function toEther(n: number) {
  return ethers.utils.parseEther( n.toString() );
}

describe("ICO Assignment", function () {
  
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let treasury: SignerWithAddress;

  // Declare 10 other signers, to fill investment rounds;
  let a: SignerWithAddress,b: SignerWithAddress,c: SignerWithAddress,d: SignerWithAddress,e: SignerWithAddress;
  let f: SignerWithAddress,g: SignerWithAddress,h: SignerWithAddress,i: SignerWithAddress,j: SignerWithAddress;
  let k: SignerWithAddress,l: SignerWithAddress,m: SignerWithAddress,n: SignerWithAddress,o: SignerWithAddress;
  let p: SignerWithAddress

  let ICO: any
  let ico: ICO

  let Token: any
  let token: SpaceToken

  beforeEach(async () => {
    [deployer, alice, bob, treasury,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p] = await ethers.getSigners();

    Token = await ethers.getContractFactory("SpaceToken");
    token = await Token.deploy(treasury.address);
    await token.deployed();

    ICO = await ethers.getContractFactory("ICO");
    ico = await ICO.deploy(token.address);
    await ico.deployed()
  });

  describe("Withdraw", async() => {
    it("Deploys a contract", async() => {
      expect(await token.icoContract()).to.equal(ethers.constants.AddressZero);
      await token.setICOContract(ico.address);
      expect(await token.icoContract()).to.equal(ico.address);
    });

  });
});