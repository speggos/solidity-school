// ----------------------------------------------------------------------------
// REQUIRED: Instructions
// ----------------------------------------------------------------------------
/*
  Please note that:

    - The tests provided are about ~90% complete.
    - IMPORTANT:
      - We've intentionally left out some tests that would reveal potential
        vulnerabilities you'll need to identify, solve for, AND TEST FOR!

      - Failing to address these vulnerabilities will leave your contracts
        exposed to hacks, and will certainly result in extra points being
        added to your micro-audit report! (Extra points are _bad_.)

  Your job (in this file):

    - DO NOT delete or change the test names for the tests provided
    - DO complete the testing logic inside each tests' callback function
    - DO add additional tests to test how you're securing your smart contracts
         against potential vulnerabilties you identify as you work through the
         project.

    - You will also find several places where "FILL_ME_IN" has been left for
      you. In those places, delete the "FILL_ME_IN" text, and replace with
      whatever is appropriate.
*/
// ----------------------------------------------------------------------------

// @ts-nocheck

import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Project, ProjectFactory, ProjectFactory__factory } from "../typechain";
import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";
import { Sign } from "crypto";

const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");
const TEN_ETHER: BigNumber = ethers.utils.parseEther("10");
const TWENTY_ETHER: BigNumber = ethers.utils.parseEther("20");


// Bump the timestamp by a specific amount of seconds
const timeTravel = async (seconds: number) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

// Or, set the time to be a specific amount (in seconds past epoch time)
const setBlockTimeTo = async (seconds: number) => {
  await network.provider.send("evm_setNextBlockTimestamp", [seconds]);
  await network.provider.send("evm_mine");
};
// ----------------------------------------------------------------------------

describe("Crowdfundr", () => {
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let cindy: SignerWithAddress;

  let ProjectFactory: ProjectFactory__factory;
  let projectFactory: ProjectFactory;

  beforeEach(async () => {
    [deployer, alice, bob, cindy] = await ethers.getSigners();

    ProjectFactory = await ethers.getContractFactory("ProjectFactory");
    projectFactory = (await ProjectFactory.deploy()) as ProjectFactory;
    await projectFactory.deployed();
  });

  describe("ProjectFactory: Additional Tests", () => {
    it("Correctly returns projects after calling getProjects()", async () => {

      expect(await projectFactory.getProjects()).to.deep.equal([]);
      expect( (await projectFactory.getProjects()).length).to.equal(0);

      await projectFactory.create( ONE_ETHER );
      expect( (await projectFactory.getProjects()).length).to.equal(1);

      await projectFactory.create(TEN_ETHER);
      expect( (await projectFactory.getProjects()).length).to.equal(2);
    });

    it("Deploys projects with a goal >0", async () => {
      await expect (projectFactory.create(ethers.utils.parseEther("0"))).to.revertedWith("Goal must be >0");
    })

  });

  describe("ProjectFactory", () => {
    it("Deploys a contract", () => {
      expect(projectFactory.address).to.be.ok;
    });

    it("Can register a single project", async () => {
      await projectFactory.create(TEN_ETHER);
      // @ts-ignore
      expect((await projectFactory.getProjects()).length).to.be.equal(1);
    });

    it("Can register multiple projects", async () => {
      await projectFactory.create(TEN_ETHER);
      await projectFactory.create(TWENTY_ETHER);

      const projects = await projectFactory.getProjects();

      expect(projects.length).to.be.equal(2);

      expect(projects[0]).to.not.be.equal(projects[1]);
    });

    it("Registers projects with the correct owner", async () => {
      await projectFactory.connect(alice).create(TEN_ETHER);

      const projects = await projectFactory.getProjects();
      const project = await ethers.getContractAt("Project", projects[0]);

      expect(await project.creator()).to.be.equal(alice.address);
      expect(await project.creator()).to.not.be.equal(bob.address);
    });

    it("Registers projects with a preset funding goal (in units of ether)", async () => {
      await projectFactory.connect(alice).create(TEN_ETHER);

      const projects = await projectFactory.getProjects();
      const project = await ethers.getContractAt("Project", projects[0]);

      expect(await project.goal()).to.equal(TEN_ETHER);
      expect(await project.goal()).to.not.equal(ONE_ETHER);
    });

    it('Emits a "ProjectCreated" event after registering a project', async () => {
      await expect(projectFactory.create(ONE_ETHER)).to.emit(
        projectFactory,
        "ProjectCreated"
      );
    });

    it("Allows multiple contracts to accept ETH simultaneously", async () => {
      await projectFactory.connect(alice).create(TEN_ETHER);
      await projectFactory.connect(bob).create(TEN_ETHER);

      const projects = await projectFactory.getProjects();
      const aliceProject = await ethers.getContractAt("Project", projects[0]);
      const bobProject = await ethers.getContractAt("Project", projects[1]);

      await aliceProject.contribute({ value: ethers.utils.parseEther("2") });
      await bobProject.contribute({ value: ethers.utils.parseEther("1") });

      expect(await aliceProject.contributed()).to.be.equal(
        ethers.utils.parseEther("2")
      );
      expect(await bobProject.contributed()).to.be.equal(
        ethers.utils.parseEther("1")
      );
    });
  });

  describe("Project: Additional Tests", () => {
    let projectAddress: string;
    let project: Project;

    beforeEach(async () => {
      const txReceiptUnresolved = await projectFactory.create(TEN_ETHER);
      const txReceipt = await txReceiptUnresolved.wait();

      projectAddress = txReceipt.events![0].args![0];
      project = await ethers.getContractAt("Project", projectAddress);
    });

    it("Awards exactly 1 NFTs upon contribution of 1 ETH", async () => {
      const txReceiptUnresolved = await project
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1") });
      const { events } = await txReceiptUnresolved.wait();

      let numTransfers = 0;
      for (let i = 0; i < events?.length; i++) {
        if (events[i].event === "Transfer") {
          numTransfers++;
        }
      }
      expect(numTransfers).to.equal(1);
    });

    it("Awards exactly 3 NFTs upon a single contribution of 3 < ETH < 4", async () => {
      const txReceiptUnresolved = await project
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("3.4") });
      const { events } = await txReceiptUnresolved.wait();

      let numTransfers = 0;
      for (let i = 0; i < events.length; i++) {
        if (events[i].event === "Transfer") {
          numTransfers++;
        }
      }
      expect(numTransfers).to.equal(3);
    });

    it("Awards the correct number of NFTs upon a transfer <1 ETH followed by a larger transfer of >2 ETH", async () => {
      let txReceiptUnresolved = await project
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("0.4") });
      let { events } = await txReceiptUnresolved.wait();

      let numTransfers = 0;
      for (let i = 0; i < events.length; i++) {
        if (events[i].event === "Transfer") {
          numTransfers++;
        }
      }

      txReceiptUnresolved = await project
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("3.4") });
      const receipt = await txReceiptUnresolved.wait();
      events = receipt.events;

      for (let i = 0; i < events.length; i++) {
        if (events[i].event === "Transfer") {
          numTransfers++;
        }
      }
      expect(numTransfers).to.equal(3);
    });

    it("Awards the correct number of NFTs upon a transfer 1<ETH<2 followed by a smaller transfer of 0.01 ETH", async () => {
      let txReceiptUnresolved = await project
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1.4") });
      let { events } = await txReceiptUnresolved.wait();

      let numTransfers = 0;
      for (let i = 0; i < events.length; i++) {
        if (events[i].event === "Transfer") {
          numTransfers++;
        }
      }

      txReceiptUnresolved = await project
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("0.01") });
      const receipt = await txReceiptUnresolved.wait();
      events = receipt.events;

      for (let i = 0; i < events.length; i++) {
        if (events[i].event === "Transfer") {
          numTransfers++;
        }
      }
      expect(numTransfers).to.equal(1);
    });

    it("Awards the correct number of NFTs upon a large contribution", async () => {
      const txReceiptUnresolved = await project
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("100.5") });
      const { events } = await txReceiptUnresolved.wait();

      let numTransfers = 0;
      for (let i = 0; i < events.length; i++) {
        if (events[i].event === "Transfer") {
          numTransfers++;
        }
      }

      expect(numTransfers).to.equal(100);
    });
  });

  describe("Project", () => {
    let projectAddress: string;
    let project: Project;

    beforeEach(async () => {
      const txReceiptUnresolved = await projectFactory.create(TEN_ETHER);
      const txReceipt = await txReceiptUnresolved.wait();

      projectAddress = txReceipt.events![0].args![0];
      project = await ethers.getContractAt("Project", projectAddress);
    });

    describe("Contributions", () => {
      describe("Contributors", () => {
        it("Allows the creator to contribute", async () => {
          await project
            .connect(deployer)
            .contribute({ value: ethers.utils.parseEther("1") });

          expect(await project.getContributors(deployer.address)).to.equal(
            ethers.utils.parseEther("1")
          );
          expect(await project.getContributors(alice.address)).to.equal(
            ethers.utils.parseEther("0")
          );
        });

        it("Allows any EOA to contribute", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("1") });
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("1.5") });

          expect(await project.getContributors(deployer.address)).to.equal(
            ethers.utils.parseEther("0")
          );
          expect(await project.getContributors(alice.address)).to.equal(
            ethers.utils.parseEther("1")
          );
          expect(await project.getContributors(bob.address)).to.equal(
            ethers.utils.parseEther("1.5")
          );
        });

        it("Allows an EOA to make many separate contributions", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("1") });

          expect(await project.getContributors(bob.address)).to.equal(
            ethers.utils.parseEther("0")
          );
          expect(await project.getContributors(alice.address)).to.equal(
            ethers.utils.parseEther("1")
          );

          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("1.5") });

          expect(await project.getContributors(alice.address)).to.equal(
            ethers.utils.parseEther("2.5")
          );
        });

        it('Emits a "Contribution" event after a contribution is made', async () => {
          await expect(
            project.contribute({ value: ethers.utils.parseEther("1") })
          )
            .to.emit(project, "Contribution")
            .withArgs(deployer.address, ethers.utils.parseEther("1"));
        });
      });

      describe("Minimum ETH Per Contribution", () => {
        it("Reverts contributions below 0.01 ETH", async () => {
          expect(
            project.contribute({ value: ethers.utils.parseEther("0.009") })
          ).to.revertedWith(
            "VM Exception while processing transaction: reverted with reason string 'Minimum contribution is 0.01 ETH'"
          );
          expect(
            project.contribute({ value: ethers.utils.parseEther("0.001") })
          ).to.revertedWith(
            "VM Exception while processing transaction: reverted with reason string 'Minimum contribution is 0.01 ETH'"
          );
        });

        it("Accepts contributions of exactly 0.01 ETH", async () => {
          expect(
            await project.contribute({ value: ethers.utils.parseEther("0.01") })
          ).to.be.ok;
        });
      });

      describe("Final Contributions", () => {
        it("Allows the final contribution to exceed the project funding goal", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("6.0") });
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("6.0") });

          await expect(await project.contributed()).to.be.equal(
            ethers.utils.parseEther("12")
          );
          await expect(await project.contributed()).to.not.equal(
            ethers.utils.parseEther("22")
          );
        });

        it("Prevents additional contributions after a project is fully funded", async () => {
          await project.contribute({ value: ethers.utils.parseEther("6.0") });
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("6.0") });

          await expect(
            project
              .connect(alice)
              .contribute({ value: ethers.utils.parseEther("6.0") })
          ).to.revertedWith("Funding goal already reached");
          await expect(
            project
              .connect(bob)
              .contribute({ value: ethers.utils.parseEther("6.0") })
          ).to.revertedWith("Funding goal already reached");
        });

        it("Prevents additional contributions after 30 days have passed since Project instance deployment", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("2.0") });
          await timeTravel(35 * SECONDS_IN_DAY);

          await expect(
            project
              .connect(bob)
              .contribute({ value: ethers.utils.parseEther("2.0") })
          ).to.revertedWith(">30 days has passed");
        });
      });
    });

    describe("Withdrawals", () => {
      describe("Project Status: Active", () => {
        it("Prevents the creator from withdrawing any funds", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("2.0") });
          await expect(
            project.connect(deployer).creatorClaim(1)
          ).to.revertedWith("Project funding goal not reached");
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("2.0") });
          await expect(project.connect(alice).creatorClaim(1)).to.revertedWith(
            "Only project creator can claim"
          );
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("2.0") });
          await expect(project.connect(bob).creatorClaim(1)).to.revertedWith(
            "Only project creator can claim"
          );
        });
      });

      describe("Project Status: Success", () => {
        it("Allows the creator to withdraw some of the contribution balance", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("6.0") });
          await expect(
            project.connect(deployer).creatorClaim(1)
          ).to.revertedWith("Project funding goal not reached");

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("6.0") });
          await expect(project.connect(deployer).creatorClaim(1)).to.be.ok;
        });

        it("Allows the creator to withdraw the entire contribution balance", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("6.0") });
          await expect(
            project.connect(deployer).creatorClaim(1)
          ).to.revertedWith("Project funding goal not reached");
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("6.0") });
          await expect(await project.connect(deployer).creatorClaim(12)).to.be
            .ok;
        });

        it("Allows the creator to make multiple withdrawals", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("12.0") });
          await expect(await project.connect(deployer).creatorClaim(8)).to.be
            .ok;
          await expect(await project.connect(deployer).creatorClaim(3)).to.be
            .ok;
          await expect(await project.connect(deployer).creatorClaim(1)).to.be
            .ok;
        });

        it("Prevents the creator from withdrawing more than the contribution balance", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("12.0") });
          await expect(
            project.connect(deployer).creatorClaim(TWENTY_ETHER)
          ).to.revertedWith("Cannot claim more than contributed");
        });

        it('Emits a "CreatorClaim" event after a withdrawal is made by the creator', async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("12.0") });
          await expect(project.connect(deployer).creatorClaim(10)).to.emit(
            project,
            "CreatorClaim"
          );
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("12.0") });
          expect(project.connect(alice).creatorClaim(1)).to.revertedWith(
            "Only project creator can claim"
          );
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("12.0") });
          expect(project.connect(bob).creatorClaim(1)).to.revertedWith(
            "Only project creator can claim"
          );
        });
      });

      describe("Project Status: Failure", () => {
        it("Prevents the creator from withdrawing any funds", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("2.0") });
          await timeTravel(35 * SECONDS_IN_DAY);

          await expect(
            project.connect(deployer).creatorClaim(2)
          ).to.revertedWith("Project funding goal not reached");
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("2.0") });
          await timeTravel(35 * SECONDS_IN_DAY);

          await expect(project.connect(alice).creatorClaim(2)).to.revertedWith(
            "Only project creator can claim"
          );
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("2.0") });
          await timeTravel(35 * SECONDS_IN_DAY);

          await expect(project.connect(bob).creatorClaim(2)).to.revertedWith(
            "Only project creator can claim"
          );
        });
      });
    });

    describe("Refunds", () => {
      it("Allows contributors to be refunded when a project fails", async () => {
        await project
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("2.0") });
        await timeTravel(35 * SECONDS_IN_DAY);

        expect(await project.connect(alice).withdrawFromFailedProject()).to.be
          .ok;
      });

      it("Prevents contributors from being refunded if a project has not failed", async () => {
        await project
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("12.0") });
        await timeTravel(35 * SECONDS_IN_DAY);

        await expect(
          project.connect(alice).withdrawFromFailedProject()
        ).to.revertedWith("Project succeeded. Not claimable");
      });

      it('Emits a "RefundIssued" event after a a contributor receives a refund', async () => {
        await project
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("2.0") });
        await timeTravel(35 * SECONDS_IN_DAY);

        await expect(
          project.connect(alice).withdrawFromFailedProject()
        ).to.emit(project, "RefundIssued");
      });
    });

    describe("Cancelations (creator-triggered project failures)", () => {
      it("Allows the creator to cancel the project if < 30 days since deployment has passed ", async () => {
        await timeTravel(15 * SECONDS_IN_DAY);
        expect(await project.connect(deployer).cancelProject()).to.be.ok;
      });

      it("Prevents the creator from canceling the project if at least 30 days have passed", async () => {
        await timeTravel(35 * SECONDS_IN_DAY);
        await expect(project.connect(deployer).cancelProject()).to.revertedWith(
          "Cannot cancel after 30 days"
        );
      });

      it('Emits a "ProjectCancelled" event after a project is cancelled by the creator', async () => {
        expect(await project.connect(deployer).cancelProject()).to.not.emit(
          project,
          "ProjectCancelled"
        );
      });
    });

    describe("NFT Contributor Badges", () => {
      it("Awards a contributor with a badge when they make a single contribution of at least 1 ETH", async () => {
        await expect(
          project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("1") })
        )
          .to.emit(project, "Transfer")
          .withArgs(ethers.constants.AddressZero, alice.address, 0);
      });

      it("Awards a contributor with a badge when they make multiple contributions to a single project that sum to at least 1 ETH", async () => {
        await expect(
          project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("0.5") })
        )
          .to.not.emit(project, "Transfer")
          .withArgs(ethers.constants.AddressZero, alice.address, 0);

        await expect(
          project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("1.3") })
        )
          .to.emit(project, "Transfer")
          .withArgs(ethers.constants.AddressZero, alice.address, 0);
      });

      it("Does not award a contributor with a badge if their total contribution to a single project sums to < 1 ETH", async () => {
        await expect(
          project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("0.5") })
        )
          .to.not.emit(project, "Transfer")
          .withArgs(ethers.constants.AddressZero, alice.address, 0);
      });

      it("Awards a contributor with a second badge when their total contribution to a single project sums to at least 2 ETH", async () => {
        await expect(
          project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("1.8") })
        )
          .to.emit(project, "Transfer")
          .withArgs(ethers.constants.AddressZero, alice.address, 0);

        await expect(
          project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("0.7") })
        )
          .to.emit(project, "Transfer")
          .withArgs(ethers.constants.AddressZero, alice.address, 1);
      });

      it("Does not award a contributor with a second badge if their total contribution to a single project is > 1 ETH but < 2 ETH", async () => {
        await expect(
          project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("0.8") })
        )
          .to.not.emit(project, "Transfer")
          .withArgs(ethers.constants.AddressZero, alice.address, 0);

        await expect(
          project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("0.7") })
        )
          .to.emit(project, "Transfer")
          .withArgs(ethers.constants.AddressZero, alice.address, 0);
      });

      it("Awards contributors with different NFTs for contributions to different projects", async () => {
        let txReceiptUnresolved = await projectFactory.create(TEN_ETHER);
        let txReceipt = await txReceiptUnresolved.wait();

        const projectAddress = txReceipt.events![0].args![0];
        const project = await ethers.getContractAt("Project", projectAddress);

        txReceiptUnresolved = await projectFactory.create(TWENTY_ETHER);
        txReceipt = await txReceiptUnresolved.wait();

        const project2Address = txReceipt.events![0].args![0];
        const project2 = await ethers.getContractAt("Project", project2Address);

        await expect(
          project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("1.2") })
        )
          .to.emit(project, "Transfer")
          .withArgs(ethers.constants.AddressZero, alice.address, 0);

        await expect(
          project2
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("1.2") })
        )
          .to.emit(project2, "Transfer")
          .withArgs(ethers.constants.AddressZero, alice.address, 0);

        expect(project2.address).to.not.equal(project.address);
      });

      it("Allows contributor badge holders to trade the NFT to another address", async () => {
        project
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("1.2") });
        await expect(
          project.connect(alice).transferFrom(alice.address, bob.address, 0)
        )
          .to.emit(project, "Transfer")
          .withArgs(alice.address, bob.address, 0);
      });

      it("Allows contributor badge holders to trade the NFT to another address even after its related project fails", async () => {
        project
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("1.2") });
        project.cancelProject();
        await expect(
          project.connect(alice).transferFrom(alice.address, bob.address, 0)
        )
          .to.emit(project, "Transfer")
          .withArgs(alice.address, bob.address, 0);
      });
    });
  });
});
