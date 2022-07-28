import { ethers } from "ethers";
import { RELAYER_PK as EOA_PK, RPC_URL } from "../constants";

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(EOA_PK, provider);

const getTransaction = async () => {
  const txRequest = {
    to: "0x6f2f050bee10c66EE29B798C6550d0733fE8cDab",
    from: signer.address,
    gasLimit: ethers.utils.hexlify(100_000),
    data: "0x",
    value: ethers.utils.hexlify(ethers.utils.parseEther("1")),
    type: 2,
    chainId: 2828,
    nonce: await provider.getTransactionCount(signer.address),
  };

  const populatedTransaction = await signer.populateTransaction(txRequest);

  const ethersSignature = await signer.signTransaction(populatedTransaction);
  const calculatedTransactionHash = ethers.utils.keccak256(ethersSignature);

  console.log("Calculated Transaction Hash", calculatedTransactionHash);

  const transaction = await signer.sendTransaction(txRequest);

  console.log("Actual Transaction Hash", transaction.hash);

  console.log(
    "Success?",
    calculatedTransactionHash === transaction.hash ? "✅" : "❌"
  );
};

getTransaction();
