import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";
import { ICO, SpaceToken } from "../typechain";

const ONE_ETHER = ethers.utils.parseEther("1");
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
  })

  describe("Token", () => {
    it("Has the name 'SpaceToken'", async () => {
      expect(await token.name()).to.equal("SpaceToken");
    });

    it("Has the symbol 'SPC'", async () => {
      expect(await token.symbol()).to.equal("SPC");
    });

    it("Allows owner to toggle taxTransfers",async() => {
      expect(await token.taxTransfers()).to.be.false;
      await token.setTax(true);
      expect(await token.taxTransfers()).to.be.true;
      await token.setTax(false);
      expect(await token.taxTransfers()).to.be.false;
    });

    it("Does not allow non-owner to toggle taxTransfers", async() => {
      await expect(token.connect(alice).setTax(true)).to.revertedWith("Not Owner")
    });

    it("Mints 500,000 tokens and gives it to the treasury upon deployment", async() => {
      expect(await token.balanceOf(treasury.address)).to.equal(toEther(500000));
    });

    it("Sets the correct ICO contract", async() => {
      expect(await token.icoContract()).to.equal(ethers.constants.AddressZero);
      await token.setICOContract(ico.address);

      expect(await token.icoContract()).to.equal(ico.address);
    });

    it("Doesn't let non-owners set ICO Contract or tax", async() => {
      await expect(token.connect(alice).setTax(false)).to.revertedWith("Not Owner");
      await expect(token.connect(alice).setICOContract(ico.address)).to.revertedWith("Not Owner");
    });
  });

  describe("Token Claim", () => {
    beforeEach(async() => {
      await token.setICOContract(ico.address);

      await ico.addToWhitelist(a.address);
      await ico.addToWhitelist(b.address);
      await ico.addToWhitelist(c.address);
      await ico.addToWhitelist(d.address);
      await ico.addToWhitelist(e.address);

      await ico.connect(a).invest({value: toEther(10)});
      await ico.connect(d).invest({value: toEther(10)});
      await ico.progressPhase();
      await ico.connect(e).invest({value: toEther(10)});
      await ico.connect(a).invest({value: toEther(10)});
      await ico.connect(b).invest({value: toEther(10)});
      await ico.progressPhase();
      await ico.connect(a).invest({value: toEther(10)});
      await ico.connect(b).invest({value: toEther(10)});
      await ico.connect(c).invest({value: toEther(10)});    
    });

    it("Lets users claim tokens from donations during each phase", async() => {
      expect(await token.balanceOf(a.address)).to.equal(0);
      expect(await token.balanceOf(b.address)).to.equal(0);
      expect(await token.balanceOf(c.address)).to.equal(0);

      await ico.connect(a).claimTokens();
      await ico.connect(b).claimTokens();
      await ico.connect(c).claimTokens();
      await ico.connect(d).claimTokens();
      await ico.connect(e).claimTokens();

      expect(await token.balanceOf(a.address)).to.equal(toEther(5*30));
      expect(await token.balanceOf(b.address)).to.equal(toEther(5*20));
      expect(await token.balanceOf(c.address)).to.equal(toEther(5*10));
      expect(await token.balanceOf(d.address)).to.equal(toEther(5*10));
      expect(await token.balanceOf(e.address)).to.equal(toEther(5*10));

      expect(await token.balanceOf(treasury.address)).to.equal(toEther(500000-80*5));
    });

    it("Does not let non-investors claim tokens", async() => {
      await expect(ico.connect(bob).claimTokens()).to.revertedWith("Did not invest");
    });

    it("Emits a Claimed event when an investor claims tokens", async() => {
      await expect(ico.connect(a).claimTokens()).to.emit(ico, "Claimed");

    })

    it("Does not allow tokens to be claimed from an ICO contract from a different owner than Token", async() => {
      let attackICOUndeployed = await ethers.getContractFactory("ICO", alice);
      //@ts-ignore
      let attackICO = await attackICOUndeployed.deploy(token.address);
      await attackICO.deployed();

      await attackICO.connect(alice).addToWhitelist(bob.address);
      await attackICO.connect(alice).progressPhase();
      await attackICO.connect(alice).progressPhase();

      await attackICO.connect(bob).invest({value: toEther(10)});

      await expect(attackICO.connect(bob).claimTokens()).to.revertedWith("Mint unsuccessful");
      await expect(await token.balanceOf(bob.address)).to.equal(0);
    });

    it("Does not tax ICO claims", async() => {
      await token.setTax(true);
      await ico.connect(a).claimTokens();
      expect(await token.balanceOf(a.address)).to.equal(toEther(30*5));
      await ico.connect(b).claimTokens();
      expect(await token.balanceOf(b.address)).to.equal(toEther(20*5));
      await token.setTax(false);
      await ico.connect(c).claimTokens();
      expect(await token.balanceOf(c.address)).to.equal(toEther(10*5));
    })

    it("Taxes token transfers at 2% when turned on", async() => {
      await token.setTax(true);
      await ico.connect(a).claimTokens();
      expect(await token.balanceOf(a.address)).to.equal(toEther(30*5));

      await token.connect(a).transfer(alice.address, toEther(30*5));
      expect(await token.balanceOf(alice.address)).to.equal(toEther(30*.98*5));
      expect(await token.balanceOf(treasury.address)).to.equal(toEther(500000-30*.98*5));
      expect(await token.balanceOf(a.address)).to.equal(0);
    })
  })

  describe("Phases", () => {
    it("Should initialize with Phase.SEED", async () => {
      expect(await ico.currentPhase()).to.equal(0);
    });
    it("Allows contract creator to change phases", async () => {
      await ico.connect(deployer).progressPhase();
      expect(await ico.currentPhase()).to.equal(1);
      await ico.connect(deployer).progressPhase();
      expect(await ico.currentPhase()).to.equal(2);
    });
    it("Does not allow non-creator to progress phases", async () => {
      await expect (ico.connect(alice).progressPhase()).to.revertedWith("Not Owner")
    });
    it("Does not allow progression past Phase.OPEN", async () => {
      await ico.connect(deployer).progressPhase();
      await ico.connect(deployer).progressPhase();

      await expect(ico.connect(deployer).progressPhase()).to.revertedWith("Already Open");
    });
    it("Emits a NextPhase event when phase changes", async() => {
      await expect(ico.connect(deployer).progressPhase()).to.emit(ico, "NextPhase");
      await expect(ico.connect(deployer).progressPhase()).to.emit(ico, "NextPhase");
    })
  });

  describe("Pause", () => {
    it("Deploys with paused = false", async () => {
       expect(await ico.paused()).to.be.false;
    });

    it("Allows owner to pause and unpause", async () => {
      ico.setPause(true);
      expect(await ico.paused()).to.be.true;
      ico.setPause(false);
      expect(await ico.paused()).to.be.false;
      ico.setPause(true);
      expect(await ico.paused()).to.be.true;
    });

    it("Doest not allow non-creator to pause/unpause", async () => {
      await expect(ico.connect(alice).setPause(false)).to.revertedWith("Not Owner");
      await expect(ico.connect(bob).setPause(true)).to.revertedWith("Not Owner");
    })

    it("Emits an event when paused and unpaused", async () => {
      await expect(ico.connect(deployer).setPause(false)).to.emit(ico, "Pause");
      await expect(ico.connect(deployer).setPause(true)).to.emit(ico, "Pause");
    })
  });

  describe("Whitelist", () => {
    it("Defaults to whitelisted being false", async () => {
      expect(await ico.whitelist(deployer.address)).to.be.false;
      expect(await ico.whitelist(alice.address)).to.be.false;
      expect(await ico.whitelist(bob.address)).to.be.false;
    });

    it("Allows owner to add names to the whitelist", async () => {
      await ico.addToWhitelist(alice.address);
      expect(await ico.whitelist(alice.address)).to.be.true;
      expect(await ico.whitelist(bob.address)).to.be.false;
      await ico.addToWhitelist(bob.address);
      expect(await ico.whitelist(bob.address)).to.be.true;
      await ico.addToWhitelist(deployer.address);
      expect(await ico.whitelist(deployer.address)).to.be.true;
    })
    
    it("Does not allow non-owners to add to the whitelist", async () => {
      await expect(ico.connect(alice).addToWhitelist(bob.address)).to.revertedWith("Not Owner");
    })
  });

  describe("Invest", async () => {

    beforeEach(async () => {
      const whitelistAddresses = [alice,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p]

      for (let i=0; i<whitelistAddresses.length;i++) {
        await ico.addToWhitelist(whitelistAddresses[i].address);
      }

      await token.setICOContract(ico.address);
    });

    describe("Generic Invest tests", async() => {
      it("Does not allow investments of 0 ether", async () => {
        await expect(ico.connect(alice).invest({value: toEther(0)})).to.revertedWith("Must invest ether");
      });

      it("Does not allow investments when ico is paused", async () => {
        await ico.setPause(true);
        await expect(ico.connect(alice).invest({value: toEther(10)})).to.revertedWith("Paused");

        await ico.setPause(false);
        await expect(await ico.connect(alice).invest({value: toEther(10)})).to.be.ok;

        await ico.progressPhase();
        await ico.setPause(true);
        await expect(ico.connect(alice).invest({value: toEther(10)})).to.revertedWith("Paused");

        await ico.progressPhase();
        await expect(ico.connect(alice).invest({value: toEther(10)})).to.revertedWith("Paused");
      });

      it("Emits an investment event when a user invests", async() => {
        await expect(ico.connect(alice).invest({value: toEther(100)})).to.emit(ico, "Invested");
      });

      it("Doesn't let investors claim tokens before OPEN phase", async() => {
        await ico.connect(alice).invest({value: toEther(100)});
        await expect(ico.connect(alice).claimTokens()).to.revertedWith("Not Open");
        await ico.progressPhase();
        await expect(ico.connect(alice).claimTokens()).to.revertedWith("Not Open");
        await ico.progressPhase();
        await expect(await ico.connect(alice).claimTokens()).to.be.ok;
        expect(await token.balanceOf(alice.address)).to.equal(toEther(100*5));
        expect(await token.balanceOf(treasury.address)).to.equal(toEther(500000-100*5));
      });

    })

    describe("Seed", async () => {
      it("Allows whitelisted investors to invest", async () => {
        await ico.connect(alice).invest({value: toEther(10)})
        expect(await ico.investors(alice.address)).to.be.equal(toEther(10));
      });

      it("Allows whitelisted investors to invest multiple times", async () => {
        await ico.connect(alice).invest({value: toEther(100)})
        expect(await ico.investors(alice.address)).to.be.equal(toEther(100));
        await ico.connect(alice).invest({value: toEther(150)})
        expect(await ico.investors(alice.address)).to.be.equal(toEther(250));
        await ico.connect(alice).invest({value: toEther(1000)})
        expect(await ico.investors(alice.address)).to.be.equal(toEther(1250));
      });

      it("Does not allow investors to exceed the personal contribution limit", async () => {
        await ico.connect(alice).invest({value: toEther(1200)});
        await expect(ico.connect(alice).invest({value: toEther(301)})).to.revertedWith("Investment too high");
      });

      it("Does not allow non-whitelisted investors invest", async () => {
        await expect(ico.connect(bob).invest({value: toEther(1200)})).to.revertedWith("Not Whitelisted");
        await ico.connect(alice).invest({value: toEther(1000)})
        await expect(ico.connect(bob).invest({value: toEther(1200)})).to.revertedWith("Not Whitelisted");
      });

      it("Does not allow investors to exceed the phase individual contribution limit", async () => {
        ico.addToWhitelist(bob.address);
        await ico.connect(alice).invest({value: toEther(1200)});
        await expect(ico.connect(alice).invest({value: toEther(301)})).to.revertedWith("Investment too high");
      });

      it("Does not allow investors to exceed the total phase contribution limit", async () => {
        const whitelistAddresses = [alice,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p]
       
        for (let i=0; i<10; i++) {
          await ico.connect(whitelistAddresses[i]).invest({value: toEther(1500)});
        }

        await expect(ico.connect(j).invest({value: toEther(1)})).to.revertedWith("Round Funded");
        await expect(ico.connect(alice).invest({value: toEther(1)})).to.revertedWith("Investment too high");
      });
    });

    describe("General", async () => {

      it("Does not allow individuals to exceed individual contribution amount", async () => {
        await ico.progressPhase();
        await expect(ico.connect(alice).invest({value: toEther(1001)})).to.revertedWith("Investment too high");
      });

      it("Allows investors to invest in General after Seed phase fully funded", async () => {
        const investors = [alice,a,b,c,d,e,f,g,h,i];

        for (let i=0; i<10; i++) {
          await ico.connect(investors[i]).invest({value: toEther(1500)});
        }
        expect(await ico.totalInvestment()).to.equal(toEther(15000));

        await ico.progressPhase();

        await ico.connect(j).invest({value: toEther(1000)});
        expect(await ico.totalInvestment()).to.equal(toEther(16000));
      });

      it("Does not allow investors investing >1000ETH in seed round to invest in general", async () => {
        await ico.connect(alice).invest({value: toEther(1200)});

        await ico.progressPhase();
        await expect(ico.connect(alice).invest({value: toEther(100)})).to.revertedWith("Investment too high");
      });

      it("Allows users to contribute in both phases, as long as user does not go above general phase individual limit", async () => {
        await ico.connect(b).invest({value: toEther(800)});
        await ico.progressPhase();

        expect(await ico.investors(b.address)).to.equal(toEther(800));

        await expect(ico.connect(b).invest({value: toEther(300)})).to.revertedWith("Investment too high");
        await ico.connect(b).invest({value: toEther(100)});
        expect(await ico.investors(b.address)).to.equal(toEther(900));
      });

      it("Allows non-whitelisted addresses to invest in General phase", async() => {
        await ico.progressPhase();
        await ico.connect(bob).invest({value: toEther(800)});
        expect(await ico.investors(bob.address)).to.equal(toEther(800));
      });

    });

    describe("Open", async() => {
      it ("Allows nonwhitelisted and whitelisted addresses to invest", async() => {
        await ico.progressPhase();
        await ico.progressPhase();

        await ico.connect(c).invest({value: toEther(800)});
        expect(await ico.investors(c.address)).to.equal(toEther(800));

        await ico.connect(d).invest({value: toEther(800)});
        expect(await ico.investors(d.address)).to.equal(toEther(800));

        expect(await ico.totalInvestment()).to.equal(toEther(1600))
      })

      it ("Allows investments <1000, 1000 < X < 1500, and >1500 ETH", async() => {
        await ico.progressPhase();
        await ico.progressPhase();

        await ico.connect(e).invest({value: toEther(800)});
        expect(await ico.investors(e.address)).to.equal(toEther(800));

        await ico.connect(e).invest({value: toEther(1200)});
        expect(await ico.investors(e.address)).to.equal(toEther(2000));

        await ico.connect(e).invest({value: toEther(2000)});
        expect(await ico.investors(e.address)).to.equal(toEther(4000));      
      });

      it("Allows users investing in Seed, and investors in General, to invest any amount in Open phase", async() => {
        await ico.connect(f).invest({value: toEther(500)});

        await ico.progressPhase();

        await ico.connect(g).invest({value: toEther(800)});
        await ico.connect(f).invest({value: toEther(500)});

        await ico.progressPhase();
        expect(await ico.investors(f.address)).to.equal(toEther(1000));      
        expect(await ico.investors(g.address)).to.equal(toEther(800));      

        await ico.connect(g).invest({value: toEther(3000)});
        await ico.connect(f).invest({value: toEther(3000)});     
        
        expect(await ico.investors(f.address)).to.equal(toEther(4000));      
        expect(await ico.investors(g.address)).to.equal(toEther(3800));   
      });

      it("Does not allow investors to exceed 30000ETH total investment", async()=> {
        await ico.progressPhase();
        await ico.progressPhase();

        const investors = [b,c,d,e,f,g,h,i,j,k,l,m];

        for (let i=0; i<12; i++) {
          await ico.connect( investors[i]).invest({value: toEther(2500)});
        }
        await expect(ico.connect(n).invest({value: toEther(1000)})).to.revertedWith("ICO Funded");
      });
    })
  })
});
