import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { DAO, DAO__factory } from "../typechain";

function toEther(val: number) {
  return ethers.utils.parseEther(val.toString());
}

describe("DAO", async () => {
  let DAO: DAO__factory;
  let dao: DAO;

  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let cindy: SignerWithAddress;

  beforeEach(async () => {
    DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy();
    await dao.deployed();

    [deployer, alice, bob, cindy] = await ethers.getSigners();
  });

  describe("General Tests", async() => {
    it("Deploys a contract", async function () {
      expect(await dao.address).to.be.ok;
    });
  });

  describe("Membership", () => {
    it("Allows users to purchase a membership", async() => {
      await dao.buyMembership({value: toEther(1)});
    });

    it("Rejects membership purchases != 1ETH", async() => {
      await expect(dao.buyMembership({value: toEther(0.9)})).to.revertedWith("Not 1ETH");
      await expect(dao.buyMembership({value: toEther(1.1)})).to.revertedWith("Not 1ETH");
      await expect(dao.buyMembership({value: toEther(0)})).to.revertedWith("Not 1ETH");
    });

    it("Does not allow members to buy a membership twice", async()=> {
      await dao.buyMembership({value: toEther(1)});
      await expect(dao.buyMembership({value: toEther(1)})).to.revertedWith("Already member");
    });

    it("Allows multiple people to buy memberships", async() => {
      await dao.buyMembership({value: toEther(1)});
      await dao.connect(alice).buyMembership({value: toEther(1)});
      await dao.connect(bob).buyMembership({value: toEther(1)});
      await dao.connect(cindy).buyMembership({value: toEther(1)});
    });
  });

  

});
