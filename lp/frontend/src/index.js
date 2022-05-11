import { ethers } from "ethers"
import RouterJSON from '../../artifacts/contracts/Router.sol/Router.json'
import PoolJSON from '../../artifacts/contracts/Pool.sol/Pool.json';
import IcoJSON from '../../artifacts/contracts/ICO.sol/ICO.json';


const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const routerAddr = '0x10066cd4724d1Cbe061F7573424fdcbDe12D4e2A'
const contract = new ethers.Contract(routerAddr, RouterJSON.abi, provider);

const poolAddr = '0xd3bB99Ca4b79e3CB46b2213e5d1EF352D7f32889';
const poolContract = new ethers.Contract(poolAddr, PoolJSON.abi, provider);

const icoAddr = '0xe5643B3291f483F5114091ccbF93CE96B86E2c9F';
const icoContract = new ethers.Contract(poolAddr, IcoJSON.abi, provider);

async function connectToMetamask() {
  try {
    console.log("Signed in as", await signer.getAddress())
  }
  catch(err) {
    console.log("Not signed in")
    await provider.send("eth_requestAccounts", [])
  }
}



//
// ICO
//
ico_spc_buy.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const eth = ethers.utils.parseEther(form.eth.value)
  console.log("Buying", eth, "eth")

  await connectToMetamask()
  await icoContract.connect(signer).invest({value: eth});
})


//
// LP
//
let currentSpcToEthPrice = 5

provider.on("block", n => {
  console.log("New block", n)
  // TODO: Update currentSpcToEthPrice
})

lp_deposit.eth.addEventListener('input', e => {
  lp_deposit.spc.value = +e.target.value * currentSpcToEthPrice
})

lp_deposit.spc.addEventListener('input', e => {
  lp_deposit.eth.value = +e.target.value / currentSpcToEthPrice
})

lp_deposit.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const eth = ethers.utils.parseEther(form.eth.value)
  const spc = ethers.utils.parseEther(form.spc.value)
  console.log("Depositing", eth, "eth and", spc, "spc")

  await connectToMetamask()
  await contract.connect(signer).addLiquidity(spc, {value: eth});
})

lp_withdraw.addEventListener('submit', async e => {
  e.preventDefault()
  console.log("Withdrawing 100% of LP")

  await connectToMetamask()
  await contract.connect(signer).withdraw(ethers.utils.parseEther(form.lp-withdrawn.value));
})

//
// Swap
//
let swapIn = { type: 'eth', value: 0 }
let swapOut = { type: 'spc', value: 0 }
switcher.addEventListener('click', () => {
  [swapIn, swapOut] = [swapOut, swapIn]
  swap_in_label.innerText = swapIn.type.toUpperCase()
  swap.amount_in.value = swapIn.value
  updateSwapOutLabel()
})

swap.amount_in.addEventListener('input', updateSwapOutLabel)

function updateSwapOutLabel() {
  swapOut.value = swapIn.type === 'eth'
    ? +swap.amount_in.value * currentSpcToEthPrice
    : +swap.amount_in.value / currentSpcToEthPrice

  swap_out_label.innerText = `${swapOut.value} ${swapOut.type.toUpperCase()}`
}

swap.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const amountIn = ethers.utils.parseEther(form.amount_in.value)

  console.log("Swapping", amountIn, swapIn.type, "for", swapOut.type)

  await connectToMetamask()
  await contract.connect(signer).swap(amountIn, minOut);
})

set_router.addEventListener("submit", async e => {
  e.preventDefault();
  await poolContract.connect(signer).setRouter(e);
});