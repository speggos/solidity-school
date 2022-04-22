import { ethers } from "ethers"
import ICOJSON from '../../artifacts/contracts/ICO.sol/ICO.json';
import SpaceTokenJSON from '../../artifacts/contracts/SpaceToken.sol/SpaceToken.json';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const icoAddr = '0x1965eB72a7d906a9bb86B15fa9203a933C63359c';
const icoContract = new ethers.Contract(icoAddr, ICOJSON.abi, provider);

const tokenAddr = '0xee5c7450d1999426efE59D576781A48c0f7aFcc9';
const tokenContract = new ethers.Contract(tokenAddr, SpaceTokenJSON.abi, provider);


// Read on-chain data when clicking a button
// getGreeting.addEventListener('click', async () => {
//   greetingMsg.innerText = await contract.greet()
// })

// For playing around with in the browser
window.ethers = ethers
window.provider = provider
window.signer = signer
window.contract = icoContract;


// Kick things off
go()

provider.on("block", n => console.log("New block", n));

async function go() {
  await connectToMetamask();
  document.getElementById("ico_spc_left").innerHTML = ethers.utils.formatEther(await contract.investors(signer.getAddress())) * 5 ;
}

const btn = document.getElementById("btn");
btn.addEventListener("click", async () => {
    try {
        const result = await (icoContract.connect(signer)).invest({value: ethers.utils.parseEther(document.getElementById("val").value)});
        console.log('res', result);
    } catch(err) {
        document.getElementById("errors").innerHTML = err.message;
    }

});

const phase = document.getElementById("phase");
phase.addEventListener("click", async () => {
    try {
        const result = await (icoContract.connect(signer)).progressPhase();
        console.log('res', result);
    } catch(err) {
        console.log(err);
        document.getElementById("errors").innerHTML = err.message;
    }

});

async function connectToMetamask() {
  try {
    console.log("Signed in", await signer.getAddress())
  }
  catch(err) {
    console.log("Not signed in")
    await provider.send("eth_requestAccounts", [])
  }
}