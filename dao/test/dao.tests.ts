import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Address } from "cluster";
import { BigNumber, Signer } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { DAO, DAO__factory } from "../typechain";
import { NftMarketplace__factory } from "../typechain/factories/NftMarketplace__factory";
import { NftMarketplace } from "../typechain/NftMarketplace";

const nftInterfaceAbi = require('../artifacts/contracts/NFTMarketplace.sol/NftMarketplace.json').abi;

function toEther(val: number) {
  return ethers.utils.parseEther(val.toString());
}

const NFTID = 123;
const NFTPrice = toEther(42);

describe("DAO", async () => {
  let DAO: DAO__factory;
  let dao: DAO;

  let NFTMARKETPLACE: any;
  let nft: NftMarketplace;
  let nftInterface: any;

  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let cindy: SignerWithAddress;

  // Declare 10 other signers, to vote on stuffs;
  let a: SignerWithAddress,b: SignerWithAddress,c: SignerWithAddress,d: SignerWithAddress,e: SignerWithAddress;
  let f: SignerWithAddress,g: SignerWithAddress,h: SignerWithAddress,i: SignerWithAddress,j: SignerWithAddress;
  let k: SignerWithAddress,l: SignerWithAddress,m: SignerWithAddress,n: SignerWithAddress,o: SignerWithAddress;
  let p: SignerWithAddress;

  beforeEach(async () => {
    DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy();
    await dao.deployed();

    NFTMARKETPLACE = await ethers.getContractFactory("NftMarketplace");
    nft = await NFTMARKETPLACE.deploy();
    await nft.deployed();

    nftInterface = new ethers.utils.Interface(nftInterfaceAbi);

    [deployer, alice, bob, cindy, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p] = await ethers.getSigners();

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

  describe.only("Proposals", async()=> {
    let targets: string[];
    let values: BigNumber[];
    let calldatas: string[];
    let desc: string;
    let desc2: string;

    beforeEach(async() => {
      // a and b are not members
      await dao.connect(deployer).buyMembership({value: toEther(1)});
      await dao.connect(alice).buyMembership({value: toEther(1)});
      await dao.connect(bob).buyMembership({value: toEther(1)});
      await dao.connect(cindy).buyMembership({value: toEther(1)});
      await dao.connect(c).buyMembership({value: toEther(1)});
      await dao.connect(d).buyMembership({value: toEther(1)});
      await dao.connect(e).buyMembership({value: toEther(1)});
      await dao.connect(f).buyMembership({value: toEther(1)});

      targets = [nft.address];
      values = [toEther(42)];
      desc = "Description1";
      desc2 = "Description2";

      const callVars = ethers.utils.defaultAbiCoder.encode(["uint256"], [NFTID]);
      calldatas = [nftInterface.encodeFunctionData("buy(uint256)", [callVars])];
    });

    it("Allows multiple proposals to be created and voted on", async() => {
      const txReceiptUnresolved = await dao.propose(targets, values, calldatas, desc);
      let { events } = await txReceiptUnresolved.wait();
      // @ts-ignore
      const proposalId1 = events[0].args[0];

      expect ( (await dao.proposals(proposalId1)).votesFor).to.equal(1);
      await dao.connect(alice).vote(proposalId1, true);
      expect ( (await dao.proposals(proposalId1)).votesFor).to.equal(2);

      const txReceiptUnresolved2 = await dao.propose(targets, values, calldatas, desc2);
      let tx2 = await txReceiptUnresolved2.wait();
      // @ts-ignore
      const proposalId2 = tx2.events[0].args[0];

      expect ( (await dao.proposals(proposalId2)).votesFor).to.equal(1);
      await dao.connect(alice).vote(proposalId2, true);
      expect ( (await dao.proposals(proposalId2)).votesFor).to.equal(2);

    });

    it("Does not allow two of the same proposal to be created", async() => {
      await dao.propose(targets, values, calldatas, desc);
      await expect(dao.propose(targets, values, calldatas, desc)).to.revertedWith("Proposal already exists");
    });

    it("Emits an event when a proposal is created", async() => {
      await expect(await dao.propose(targets, values, calldatas, desc)).to.emit(dao, "ProposalCreated");
    });

    it("Allows proposals to be voted on", async() => {
      const txReceiptUnresolved = await dao.propose(targets, values, calldatas, desc);
      let { events } = await txReceiptUnresolved.wait();
      // @ts-ignore
      const proposalId = events[0].args[0];

      expect ( (await dao.proposals(proposalId)).votesFor).to.equal(1);
      await dao.connect(alice).vote(proposalId, true);
      expect ( (await dao.proposals(proposalId)).votesFor).to.equal(2);
      await dao.connect(bob).vote(proposalId, true);
      expect ( (await dao.proposals(proposalId)).votesFor).to.equal(3);
      await dao.connect(cindy).vote(proposalId, true);
      expect ( (await dao.proposals(proposalId)).votesFor).to.equal(4);
      expect ( (await dao.proposals(proposalId)).votesAgainst).to.equal(0);
      await dao.connect(c).vote(proposalId, false);
      expect ( (await dao.proposals(proposalId)).votesAgainst).to.equal(1);

    });

    it("Does not allow a member to vote twice on a proposal", async() => {
      const txReceiptUnresolved = await dao.propose(targets, values, calldatas, desc);
      let { events } = await txReceiptUnresolved.wait();
      // @ts-ignore
      const proposalId = events[0].args[0];
      await dao.connect(alice).vote(proposalId, true);
      await expect(dao.connect(alice).vote(proposalId, false)).to.revertedWith("Already voted");
    });

    it("Does not allow non-members to vote or create proposals", async() => {
      const txReceiptUnresolved = await dao.propose(targets, values, calldatas, desc);
      let { events } = await txReceiptUnresolved.wait();
      // @ts-ignore
      const proposalId = events[0].args[0];

      await expect(dao.connect(a).vote(proposalId, true)).to.revertedWith("Not a member");
      await expect(dao.connect(b).propose(targets, values, calldatas, desc)).to.revertedWith("Not a member");
    });

    it("Does not allow proposals to be created with unequal or empty array sizes", async() => {
      await expect(dao.propose(targets, [], calldatas, desc)).to.revertedWith("Invalid proposal length");
      await expect(dao.propose([], [], [], desc)).to.revertedWith("Empty proposal");
    });

    it("Does not allow non-proposed proposals to be voted on", async() => {
      await expect(dao.connect(alice).vote("0", true)).to.revertedWith("Not proposed");
    });


    describe("Execute", async() => {

      let proposalId: any;

      beforeEach(async() => {
        const txReceiptUnresolved = await dao.propose(targets, values, calldatas, desc);
        let { events } = await txReceiptUnresolved.wait();
        // @ts-ignore
        proposalId = events[0].args[0];
      })

      it("Does not allow non-proposed proposals to be executed", async() => {
        await expect(dao.connect(alice).execute(targets, values, calldatas, desc2)).to.revertedWith("Not proposed");
      });

      it("Does not allow proposals with < 25% of members voting for to be executed", async() => {
        await expect(dao.execute(targets, values, calldatas, desc)).to.revertedWith("Quorum not reached");
        await dao.connect(alice).vote(proposalId, true);
        await expect(dao.execute(targets, values, calldatas, desc)).to.revertedWith("Quorum not reached");
      });
      
      it("Allows proposals with 25% of members voting for to be executed", async() => {
        await dao.connect(alice).vote(proposalId, true);
        await dao.connect(bob).vote(proposalId, true);
        //await dao.execute(targets, values, calldatas, desc);
      });

      //it("Does not allow proposals to be executed multiple times", async() => {

     // })

     //it("Emits an event when executing")
    })


  });
});
